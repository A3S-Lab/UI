import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { assertCompiled, type FormDocument, type FormPlan, type JsonObject } from '../src/core';
import {
  createFormSignatureSchema,
  createSignatureNodeRegistry,
  FormDesigner,
  FormRenderer,
  type FormSignatureCapture,
  type FormSignatureOpenRequest,
  type FormSignatureReference,
  type FormSignatureRemoveRequest,
  type FormSignatureSaveRequest,
  type FormSignatureService,
  isFormSignatureReference,
  SIGNATURE_WIDGET,
} from '../src/react';

interface PendingSave {
  request: FormSignatureSaveRequest;
  resolve: (reference: FormSignatureReference) => void;
  reject: (error: unknown) => void;
}

function signatureReference(
  id = 'signature-1',
  method: FormSignatureReference['method'] = 'drawn',
): FormSignatureReference {
  return {
    id,
    method,
    signedAt: '2026-08-09T09:30:00.000Z',
  };
}

function signatureDocument(
  options: {
    captureMode?: 'drawn' | 'typed' | 'drawn-or-typed';
    locale?: string;
    required?: boolean;
  } = {},
): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: '签署确认', locale: options.locale ?? 'zh-CN' },
    schema: {
      type: 'object',
      properties: {
        approval: createFormSignatureSchema({ required: options.required }),
      },
      required: options.required ? ['approval'] : [],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['approval'] },
        {
          id: 'approval',
          kind: 'field',
          label: '审批签名',
          description: '签署前请核对审批内容',
          schemaPath: '/properties/approval',
          widget: SIGNATURE_WIDGET,
          customProps: {
            captureMode: options.captureMode ?? 'drawn-or-typed',
            penColor: 'ink',
          },
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

function createPlan(document = signatureDocument()): FormPlan {
  return assertCompiled(document, { capabilities: { widgets: [SIGNATURE_WIDGET] } });
}

function createService(overrides: Partial<FormSignatureService> = {}) {
  const saves: PendingSave[] = [];
  const removals: FormSignatureRemoveRequest[] = [];
  const opens: FormSignatureOpenRequest[] = [];
  const service: FormSignatureService = {
    save: (request) =>
      new Promise((resolve, reject) => {
        saves.push({ request, resolve, reject });
      }),
    remove: async (request) => {
      removals.push(request);
    },
    open: async (request) => {
      opens.push(request);
    },
    ...overrides,
  };
  return { service, saves, removals, opens };
}

function Harness({
  service,
  document = signatureDocument(),
  initialValue = { approval: [] },
  readOnly = false,
  getErrorMessage,
}: {
  service: FormSignatureService;
  document?: FormDocument;
  initialValue?: JsonObject;
  readOnly?: boolean;
  getErrorMessage?: Parameters<typeof createSignatureNodeRegistry>[0]['getErrorMessage'];
}) {
  const plan = useMemo(() => createPlan(document), [document]);
  const registry = useMemo(
    () => createSignatureNodeRegistry({ service, getErrorMessage }),
    [getErrorMessage, service],
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
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

describe('signature value contract', () => {
  it('creates a closed single-reference schema', () => {
    expect(createFormSignatureSchema()).toEqual(
      expect.objectContaining({ type: 'array', minItems: 0, maxItems: 1, uniqueItems: true }),
    );
    expect(createFormSignatureSchema({ required: true })).toEqual(
      expect.objectContaining({ minItems: 1, maxItems: 1 }),
    );
    expect(createFormSignatureSchema().items).toEqual(
      expect.objectContaining({
        type: 'object',
        required: ['id', 'method', 'signedAt'],
        additionalProperties: false,
      }),
    );
  });

  it('rejects malformed or expanded references', () => {
    const valid = signatureReference();
    expect(isFormSignatureReference(valid)).toBe(true);
    const invalid: unknown[] = [
      null,
      [],
      'signature',
      { ...valid, previewUrl: 'blob:secret' },
      { id: valid.id, method: valid.method },
      { ...valid, id: '' },
      { ...valid, id: 'x'.repeat(513) },
      { ...valid, method: 'image' },
      { ...valid, signedAt: 'yesterday' },
      { ...valid, signedAt: '2026-08-09' },
    ];
    for (const candidate of invalid) expect(isFormSignatureReference(candidate)).toBe(false);
  });
});

describe('official signature extension', () => {
  it('saves typed capture through the host without serializing the signer name', async () => {
    const { service, saves } = createService();
    render(<Harness service={service} />);

    fireEvent.click(screen.getByRole('tab', { name: '键入签名' }));
    fireEvent.change(screen.getByLabelText('签署姓名'), { target: { value: ' 王小明 ' } });
    const saveButton = screen.getByRole('button', { name: '保存签名' });
    expect(saveButton.classList.contains('btn')).toBe(true);
    expect(saveButton.getAttribute('data-variant')).toBe('primary');
    fireEvent.click(saveButton);

    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].request.capture).toEqual({ method: 'typed', text: '王小明' });
    expect(saves[0].request.valuePath).toBe('approval');
    expect(saves[0].request.rowIndices).toEqual([]);
    expect(saves[0].request.node.id).toBe('approval');
    expect(saves[0].request.previous).toBeUndefined();

    await act(async () => saves[0].resolve(signatureReference('typed-1', 'typed')));
    await waitFor(() => expect(screen.getByTestId('value').textContent).toContain('typed-1'));
    expect(screen.getByTestId('value').textContent).not.toContain('王小明');
    expect(screen.getByText('签名已保存')).toBeTruthy();
  });

  it('captures bounded normalized pointer strokes', async () => {
    const { service, saves } = createService();
    render(<Harness service={service} document={signatureDocument({ captureMode: 'drawn' })} />);

    const pad = screen.getByRole('img', { name: '手写签名区域' });
    Object.defineProperty(pad, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        right: 410,
        bottom: 180,
        width: 400,
        height: 160,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(pad, { pointerId: 7, button: 0, clientX: 50, clientY: 60 });
    fireEvent.pointerMove(pad, { pointerId: 7, clientX: 210, clientY: 100, pressure: 0.7 });
    fireEvent.pointerUp(pad, { pointerId: 7, clientX: 370, clientY: 140 });
    fireEvent.click(screen.getByRole('button', { name: '保存签名' }));

    await waitFor(() => expect(saves).toHaveLength(1));
    const capture = saves[0].request.capture;
    expect(capture.method).toBe('drawn');
    const drawn = capture as Extract<FormSignatureCapture, { method: 'drawn' }>;
    expect(drawn.strokes).toHaveLength(1);
    expect(drawn.strokes[0].points.length).toBeGreaterThanOrEqual(2);
    for (const point of drawn.strokes[0].points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
      expect(point.pressure).toBeGreaterThanOrEqual(0);
      expect(point.pressure).toBeLessThanOrEqual(1);
    }
  });

  it('preserves capture for retry and aborts an in-flight save on unmount', async () => {
    const { service, saves } = createService();
    const view = render(
      <Harness service={service} getErrorMessage={() => '保存失败，检查连接后重试。'} />,
    );

    fireEvent.click(screen.getByRole('tab', { name: '键入签名' }));
    fireEvent.change(screen.getByLabelText('签署姓名'), { target: { value: 'Lin' } });
    fireEvent.click(screen.getByRole('button', { name: '保存签名' }));
    await waitFor(() => expect(saves).toHaveLength(1));
    await act(async () => saves[0].reject(new Error('secret host detail')));
    expect((await screen.findByRole('alert')).textContent).toContain('保存失败，检查连接后重试。');

    fireEvent.click(screen.getByRole('button', { name: '重试保存签名' }));
    await waitFor(() => expect(saves).toHaveLength(2));
    expect(saves[1].request.capture).toEqual({ method: 'typed', text: 'Lin' });
    view.unmount();
    expect(saves[1].request.signal.aborted).toBe(true);
  });

  it('opens, replaces, and removes a saved reference through the host service', async () => {
    const { service, saves, opens, removals } = createService();
    render(<Harness service={service} initialValue={{ approval: [signatureReference('old')] }} />);

    fireEvent.click(screen.getByRole('button', { name: '查看签名' }));
    await waitFor(() => expect(opens).toHaveLength(1));
    expect(opens[0].signature.id).toBe('old');

    fireEvent.click(screen.getByRole('button', { name: '重新签名' }));
    fireEvent.click(screen.getByRole('tab', { name: '键入签名' }));
    fireEvent.change(screen.getByLabelText('签署姓名'), { target: { value: 'Replacement' } });
    fireEvent.click(screen.getByRole('button', { name: '保存签名' }));
    await waitFor(() => expect(saves).toHaveLength(1));
    expect(saves[0].request.previous?.id).toBe('old');
    expect(screen.getByTestId('value').textContent).toContain('old');
    await act(async () => saves[0].resolve(signatureReference('new', 'typed')));
    await waitFor(() => expect(screen.getByTestId('value').textContent).toContain('new'));

    fireEvent.click(screen.getByRole('button', { name: '删除签名' }));
    await waitFor(() => expect(removals).toHaveLength(1));
    expect(removals[0].signature.id).toBe('new');
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('{"approval":[]}'));
  });

  it('keeps read-only signatures viewable without exposing mutation controls', () => {
    const { service } = createService();
    render(
      <Harness service={service} initialValue={{ approval: [signatureReference()] }} readOnly />,
    );

    expect(screen.getByRole('button', { name: '查看签名' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '重新签名' })).toBeNull();
    expect(screen.queryByRole('button', { name: '删除签名' })).toBeNull();
  });

  it('adds the signature field and exposes its inspector in Designer', async () => {
    const { service } = createService();
    const registry = createSignatureNodeRegistry({ service });
    const initial: FormDocument = {
      kind: 'a3s.form',
      apiVersion: 'a3s.dev/form/v1alpha1',
      revision: 1,
      metadata: { title: 'Designer', locale: 'zh-CN' },
      schema: { type: 'object', properties: {}, additionalProperties: false },
      ui: { root: 'root', nodes: [{ id: 'root', kind: 'root', children: [] }] },
      rules: [],
      dataSources: [],
      actions: [],
    };

    function DesignerHarness() {
      const [document, setDocument] = useState(initial);
      return (
        <>
          <FormDesigner document={document} onChange={setDocument} nodeRegistry={registry} />
          <output data-testid="document">{JSON.stringify(document)}</output>
        </>
      );
    }

    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加签名字段' }));
    expect(await screen.findByRole('region', { name: '签名设置' })).toBeTruthy();
    expect(screen.getByLabelText('签名方式')).toBeTruthy();
    expect(screen.getByLabelText('笔迹颜色')).toBeTruthy();
    expect(screen.getByTestId('document').textContent).toContain(SIGNATURE_WIDGET);
    expect(screen.getByTestId('document').textContent).toContain('"maxItems":1');
  });
});
