import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { assertCompiled, type FormDocument, type JsonObject } from '../src/core';
import {
  type CreateSignatureNodeRegistryOptions,
  createFormSignatureSchema,
  createSignatureNodeRegistry,
  FormRenderer,
  type FormSignatureReference,
  type FormSignatureSaveRequest,
  type FormSignatureService,
  SIGNATURE_WIDGET,
} from '../src/react';
import {
  boundedTypedSignature,
  FORM_SIGNATURE_LIMITS,
  type FormSignatureStroke,
  formSignatureReferenceKey,
  normalizeSignatureCaptureMode,
  normalizeSignaturePenColor,
  signaturePointCount,
} from '../src/react/signature-contract';
import { SignaturePad } from '../src/react/signature-pad';

function reference(
  id = 'stored-signature',
  method: FormSignatureReference['method'] = 'drawn',
): FormSignatureReference {
  return { id, method, signedAt: '2026-08-09T09:30:00.000Z' };
}

function documentFor(
  options: {
    locale?: string;
    captureMode?: unknown;
    penColor?: unknown;
    required?: boolean;
    omitCopy?: boolean;
  } = {},
): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: 'Signature edges', locale: options.locale ?? 'zh-CN' },
    schema: {
      type: 'object',
      properties: { signature: createFormSignatureSchema({ required: options.required }) },
      required: options.required ? ['signature'] : [],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['signature'] },
        {
          id: 'signature',
          kind: 'field',
          label: options.omitCopy ? undefined : '签署',
          description: options.omitCopy ? undefined : '确认当前内容',
          schemaPath: '/properties/signature',
          widget: SIGNATURE_WIDGET,
          customProps: {
            captureMode: options.captureMode as never,
            penColor: options.penColor as never,
          },
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

function Harness({
  service,
  document = documentFor(),
  initialValue = { signature: [] },
  readOnly = false,
  messages,
  getErrorMessage,
}: {
  service: FormSignatureService;
  document?: FormDocument;
  initialValue?: JsonObject;
  readOnly?: boolean;
  messages?: CreateSignatureNodeRegistryOptions['messages'];
  getErrorMessage?: CreateSignatureNodeRegistryOptions['getErrorMessage'];
}) {
  const registry = useMemo(
    () => createSignatureNodeRegistry({ service, messages, getErrorMessage }),
    [getErrorMessage, messages, service],
  );
  const plan = useMemo(
    () => assertCompiled(document, { capabilities: { widgets: Object.keys(registry) } }),
    [document, registry],
  );
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <FormRenderer
        plan={plan}
        value={value}
        onChange={setValue}
        nodeRegistry={registry}
        readOnly={readOnly}
      />
      <button
        type="button"
        onClick={() => setValue({ signature: [reference('external', 'typed')] })}
      >
        Replace host value
      </button>
      <output data-testid="edge-value">{JSON.stringify(value)}</output>
    </>
  );
}

async function enterTypedSignature(name = 'Signer') {
  const tab = screen.queryByRole('tab', { name: /键入签名|Type signature/ });
  if (tab) fireEvent.click(tab);
  fireEvent.change(screen.getByLabelText(/签署姓名|Signing name/), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: /保存签名|Save signature/ }));
}

describe('signature contract edges', () => {
  it('normalizes settings, keys, typed bounds, and point totals', () => {
    expect(normalizeSignatureCaptureMode('drawn')).toBe('drawn');
    expect(normalizeSignatureCaptureMode('typed')).toBe('typed');
    expect(normalizeSignatureCaptureMode('drawn-or-typed')).toBe('drawn-or-typed');
    expect(normalizeSignatureCaptureMode('invalid')).toBe('drawn-or-typed');
    expect(normalizeSignaturePenColor('blue')).toBe('blue');
    expect(normalizeSignaturePenColor('red')).toBe('ink');
    expect(formSignatureReferenceKey(undefined)).toBe('');
    expect(formSignatureReferenceKey(reference())).toContain('stored-signature');
    expect(boundedTypedSignature(`  ${'x'.repeat(200)}  `)).toHaveLength(
      FORM_SIGNATURE_LIMITS.maxTypedLength,
    );
    expect(signaturePointCount([{ points: [] }, { points: [{ x: 0, y: 0, pressure: 0.5 }] }])).toBe(
      1,
    );
  });

  it('renders registry design fallbacks for required typed signatures', () => {
    const registry = createSignatureNodeRegistry({
      service: { save: async () => reference(), remove: async () => undefined },
    });
    const Design = registry[SIGNATURE_WIDGET].design;
    if (!Design) throw new Error('Signature design component is missing.');
    render(
      <Design
        node={{
          id: 'signature',
          kind: 'field',
          schemaPath: '/properties/signature',
          widget: SIGNATURE_WIDGET,
          customProps: { captureMode: 'typed', penColor: 'blue' },
        }}
        schema={createFormSignatureSchema({ required: true })}
        required
      />,
    );
    expect(screen.getByText('签名')).toBeTruthy();
    expect(screen.getByText('必填')).toBeTruthy();
    expect(screen.getByText('由宿主保存签署记录')).toBeTruthy();
    expect(screen.getByText('键入姓名')).toBeTruthy();
  });
});

describe('signature hardening states', () => {
  it('fails closed for malformed controlled values and supports an empty read-only state', () => {
    const service: FormSignatureService = {
      save: async () => reference(),
      remove: async () => undefined,
    };
    const invalid = render(
      <Harness
        service={service}
        initialValue={{ signature: [{ id: 'leaked', token: 'secret' }] }}
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('签名引用无效');
    invalid.unmount();

    const nullValue = render(<Harness service={service} initialValue={{ signature: null }} />);
    expect(screen.getByRole('img', { name: '手写签名区域' })).toBeTruthy();
    nullValue.unmount();

    render(<Harness service={service} readOnly />);
    expect(screen.getByText('当前没有可查看的签名。')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '保存签名' })).toBeNull();
  });

  it('uses English defaults, fallback copy, function overrides, and raw time fallback', () => {
    const service: FormSignatureService = {
      save: async () => reference(),
      remove: async () => undefined,
    };
    render(
      <Harness
        service={service}
        document={documentFor({
          locale: 'invalid_locale',
          captureMode: 'typed',
          penColor: 'blue',
          required: true,
          omitCopy: true,
        })}
        initialValue={{ signature: [reference('english', 'typed')] }}
        messages={() => ({ savedMeta: '{method} / {unknown} / {time}' })}
      />,
    );

    expect(screen.getByText('Signature saved')).toBeTruthy();
    expect(screen.getByText('Required')).toBeTruthy();
    expect(screen.getByText(/Type signature \/ \{unknown\} \/ 2026-08-09/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'View signature' })).toBeNull();
  });

  it('reports invalid host references and keeps the typed capture available', async () => {
    const service: FormSignatureService = {
      save: async () => ({ id: '', method: 'typed', signedAt: 'invalid' }),
      remove: async () => undefined,
    };
    render(<Harness service={service} document={documentFor({ captureMode: 'typed' })} />);
    await enterTypedSignature('Retained signer');
    expect((await screen.findByRole('alert')).textContent).toContain('签名引用无效');
    expect((screen.getByLabelText('签署姓名') as HTMLInputElement).value).toBe('Retained signer');
  });

  it('maps save, remove, and open failures without exposing host errors', async () => {
    const saveFailure = render(
      <Harness
        service={{
          save: async () => {
            throw new Error('secret save stack');
          },
          remove: async () => undefined,
        }}
        document={documentFor({ captureMode: 'typed' })}
        getErrorMessage={() => {
          throw new Error('unsafe mapper');
        }}
      />,
    );
    await enterTypedSignature();
    expect((await screen.findByRole('alert')).textContent).toContain('签名没有保存');
    expect(screen.getByRole('alert').textContent).not.toContain('secret');
    saveFailure.unmount();

    const removeFailure = render(
      <Harness
        service={{
          save: async () => reference(),
          remove: async () => {
            throw new Error('secret remove stack');
          },
        }}
        initialValue={{ signature: [reference()] }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '删除签名' }));
    expect((await screen.findByRole('alert')).textContent).toContain('签名没有删除');
    removeFailure.unmount();

    render(
      <Harness
        service={{
          save: async () => reference(),
          remove: async () => undefined,
          open: async () => {
            throw new Error('secret preview URL');
          },
        }}
        initialValue={{ signature: [reference()] }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '查看签名' }));
    expect((await screen.findByRole('alert')).textContent).toContain('签名无法打开');
  });

  it('cancels an in-flight save without discarding capture', async () => {
    const requests: FormSignatureSaveRequest[] = [];
    const resolvers: ((reference: FormSignatureReference) => void)[] = [];
    const service: FormSignatureService = {
      save: (request) => {
        requests.push(request);
        return new Promise((resolve) => resolvers.push(resolve));
      },
      remove: async () => undefined,
    };
    const view = render(
      <Harness service={service} document={documentFor({ captureMode: 'typed' })} />,
    );
    await enterTypedSignature('Keep me');
    await waitFor(() => expect(requests).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: '取消保存签名' }));
    expect(requests[0].signal.aborted).toBe(true);
    expect((screen.getByLabelText('签署姓名') as HTMLInputElement).value).toBe('Keep me');
    await act(async () => resolvers[0](reference('ignored-after-cancel')));
    expect(screen.getByTestId('edge-value').textContent).not.toContain('ignored-after-cancel');
    fireEvent.click(screen.getByRole('button', { name: '保存签名' }));
    await waitFor(() => expect(requests).toHaveLength(2));
    view.unmount();
    expect(requests[1].signal.aborted).toBe(true);
  });

  it('rejects stale save and removal completions after a host replacement', async () => {
    let resolveSave: ((value: FormSignatureReference) => void) | undefined;
    const saveService: FormSignatureService = {
      save: () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
      remove: async () => undefined,
    };
    const saveView = render(
      <Harness service={saveService} document={documentFor({ captureMode: 'typed' })} />,
    );
    await enterTypedSignature();
    await waitFor(() => expect(resolveSave).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Replace host value' }));
    await act(async () => resolveSave?.(reference('late-save')));
    expect((await screen.findByRole('alert')).textContent).toContain('宿主已更新签名');
    expect(screen.getByTestId('edge-value').textContent).toContain('external');
    expect(screen.getByTestId('edge-value').textContent).not.toContain('late-save');
    saveView.unmount();

    let resolveRemove: (() => void) | undefined;
    const removeService: FormSignatureService = {
      save: async () => reference(),
      remove: () =>
        new Promise((resolve) => {
          resolveRemove = resolve;
        }),
    };
    render(
      <Harness service={removeService} initialValue={{ signature: [reference('original')] }} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '删除签名' }));
    await waitFor(() => expect(resolveRemove).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Replace host value' }));
    await act(async () => resolveRemove?.());
    expect((await screen.findByRole('alert')).textContent).toContain('宿主已更新签名');
    expect(screen.getByTestId('edge-value').textContent).toContain('external');
  });

  it('cancels replacement editing and restores the saved reference view', () => {
    const service: FormSignatureService = {
      save: async () => reference(),
      remove: async () => undefined,
    };
    render(<Harness service={service} initialValue={{ signature: [reference()] }} />);
    fireEvent.click(screen.getByRole('button', { name: '重新签名' }));
    fireEvent.click(screen.getByRole('tab', { name: '键入签名' }));
    fireEvent.change(screen.getByLabelText('签署姓名'), { target: { value: 'Discarded' } });
    fireEvent.click(screen.getByRole('button', { name: '取消签名修改' }));
    expect(screen.getByText('签名已保存')).toBeTruthy();
    expect(screen.queryByDisplayValue('Discarded')).toBeNull();
  });
});

describe('signature pad input boundaries', () => {
  function PadHarness({
    initial = [],
    disabled = false,
  }: {
    initial?: readonly FormSignatureStroke[];
    disabled?: boolean;
  }) {
    const [strokes, setStrokes] = useState(initial);
    return (
      <>
        <SignaturePad
          strokes={strokes}
          onChange={setStrokes}
          onUndo={() => setStrokes((current) => current.slice(0, -1))}
          disabled={disabled}
          label="Test signature pad"
          penColor="blue"
        />
        <output data-testid="pad-value">{JSON.stringify(strokes)}</output>
      </>
    );
  }

  it('supports keyboard undo, pointer cancellation, and disabled input', () => {
    const stroke = { points: [{ x: 0.2, y: 0.3, pressure: 0.5 }] };
    const view = render(<PadHarness initial={[stroke]} />);
    const pad = screen.getByRole('img', { name: 'Test signature pad' });
    fireEvent.keyDown(pad, { key: 'ArrowLeft' });
    expect(screen.getByTestId('pad-value').textContent).toContain('0.2');
    fireEvent.keyDown(pad, { key: 'Delete' });
    expect(screen.getByTestId('pad-value').textContent).toBe('[]');

    fireEvent.pointerDown(pad, { pointerId: 1, button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerCancel(pad, { pointerId: 1 });
    expect(screen.getByTestId('pad-value').textContent).toBe('[]');
    fireEvent.pointerUp(pad, { pointerId: 77, clientX: 30, clientY: 30 });
    fireEvent.pointerCancel(pad, { pointerId: 77 });
    fireEvent.pointerMove(pad, { pointerId: 99, clientX: 30, clientY: 30 });
    expect(screen.getByTestId('pad-value').textContent).toBe('[]');
    view.unmount();

    render(<PadHarness disabled />);
    const disabledPad = screen.getByRole('img', { name: 'Test signature pad' });
    fireEvent.pointerDown(disabledPad, { pointerId: 2, button: 0, clientX: 20, clientY: 20 });
    fireEvent.keyDown(disabledPad, { key: 'Delete' });
    expect(screen.getByTestId('pad-value').textContent).toBe('[]');
  });

  it('ignores non-primary mouse input and caps strokes and points', () => {
    const fullStrokes = Array.from({ length: FORM_SIGNATURE_LIMITS.maxStrokes }, (_, index) => ({
      points: [{ x: index / FORM_SIGNATURE_LIMITS.maxStrokes, y: 0.5, pressure: 0.5 }],
    }));
    const full = render(<PadHarness initial={fullStrokes} />);
    const fullPad = screen.getByRole('img', { name: 'Test signature pad' });
    fireEvent.pointerDown(fullPad, {
      pointerId: 3,
      pointerType: 'mouse',
      button: 2,
      clientX: 40,
      clientY: 40,
    });
    fireEvent.pointerDown(fullPad, {
      pointerId: 3,
      pointerType: 'mouse',
      button: 0,
      clientX: 40,
      clientY: 40,
    });
    expect(JSON.parse(screen.getByTestId('pad-value').textContent ?? '[]')).toHaveLength(
      FORM_SIGNATURE_LIMITS.maxStrokes,
    );
    full.unmount();

    const almostFull = [
      {
        points: Array.from({ length: FORM_SIGNATURE_LIMITS.maxPoints - 1 }, () => ({
          x: 0.1,
          y: 0.1,
          pressure: 0.5,
        })),
      },
    ];
    render(<PadHarness initial={almostFull} />);
    const pad = screen.getByRole('img', { name: 'Test signature pad' });
    fireEvent.pointerDown(pad, { pointerId: 4, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(pad, { pointerId: 4, clientX: 80, clientY: 80 });
    fireEvent.pointerUp(pad, { pointerId: 4, clientX: 90, clientY: 90 });
    const strokes = JSON.parse(screen.getByTestId('pad-value').textContent ?? '[]');
    expect(signaturePointCount(strokes)).toBe(FORM_SIGNATURE_LIMITS.maxPoints);
  });

  it('accepts fallback pointer identities and coalesced samples', () => {
    const emptyStroke = render(<PadHarness initial={[{ points: [] }]} />);
    expect(
      screen.getByRole('img', { name: 'Test signature pad' }).querySelector('path'),
    ).toBeTruthy();
    emptyStroke.unmount();

    render(<PadHarness />);
    const pad = screen.getByRole('img', { name: 'Test signature pad' });
    Object.defineProperty(pad, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    });
    const down = new Event('pointerdown', { bubbles: true });
    Object.defineProperties(down, {
      button: { value: 0 },
      pointerType: { value: 'touch' },
      clientX: { value: 10 },
      clientY: { value: 10 },
      pressure: { value: 0.4 },
    });
    fireEvent(pad, down);

    const move = new Event('pointermove', { bubbles: true });
    Object.defineProperties(move, {
      clientX: { value: 20 },
      clientY: { value: 20 },
      pressure: { value: 0.5 },
      getCoalescedEvents: {
        value: () => [
          { clientX: 20, clientY: 20, pressure: 0.5 },
          { clientX: 30, clientY: 30, pressure: 0.6 },
        ],
      },
    });
    fireEvent(pad, move);

    const up = new Event('pointerup', { bubbles: true });
    Object.defineProperties(up, {
      clientX: { value: 40 },
      clientY: { value: 40 },
      pressure: { value: 0.5 },
    });
    fireEvent(pad, up);
    const value = JSON.parse(screen.getByTestId('pad-value').textContent ?? '[]');
    expect(value[0].points.length).toBeGreaterThanOrEqual(3);
  });
});
