import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { assertCompiled, type FormDocument, type FormPlan, type JsonObject } from '../src/core';
import {
  type CreateFileUploadNodeRegistryOptions,
  createFileUploadNodeRegistry,
  createFormFileUploadSchema,
  FILE_UPLOAD_WIDGET,
  FormDesigner,
  type FormFileOpenRequest,
  type FormFileReference,
  type FormFileRemoveRequest,
  type FormFileService,
  type FormFileUploadRequest,
  FormRenderer,
  isFormFileReference,
} from '../src/react';

interface PendingUpload {
  request: FormFileUploadRequest;
  resolve: (reference: FormFileReference) => void;
  reject: (error: unknown) => void;
}

function createDocument(
  options: {
    maxFiles?: number;
    maxFileSize?: number;
    accept?: string;
    concurrency?: number;
    locale?: string;
  } = {},
): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: '材料提交', locale: options.locale ?? 'zh-CN' },
    schema: {
      type: 'object',
      properties: {
        attachments: createFormFileUploadSchema({ maxFiles: options.maxFiles ?? 3 }),
      },
      required: ['attachments'],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['attachments'] },
        {
          id: 'attachments',
          kind: 'field',
          label: '附件',
          description: '上传审批所需材料',
          schemaPath: '/properties/attachments',
          widget: FILE_UPLOAD_WIDGET,
          customProps: {
            accept: options.accept ?? '.pdf,image/*',
            maxFileSize: options.maxFileSize ?? 1024,
            maxConcurrentUploads: options.concurrency ?? 2,
          },
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

function createPlan(document = createDocument()): FormPlan {
  return assertCompiled(document, { capabilities: { widgets: [FILE_UPLOAD_WIDGET] } });
}

function createService(overrides: Partial<FormFileService> = {}) {
  const uploads: PendingUpload[] = [];
  const removals: FormFileRemoveRequest[] = [];
  const opens: FormFileOpenRequest[] = [];
  const service: FormFileService = {
    upload: (request) =>
      new Promise((resolve, reject) => uploads.push({ request, resolve, reject })),
    remove: async (request) => {
      removals.push(request);
    },
    open: async (request) => {
      opens.push(request);
    },
    ...overrides,
  };
  return { service, uploads, removals, opens };
}

function reference(id: string, name = `${id}.pdf`, size = 100): FormFileReference {
  return { id, name, size, mediaType: 'application/pdf' };
}

function file(name: string, size: number, type = 'application/pdf'): File {
  return new File([new Uint8Array(size)], name, { type });
}

function Harness({
  service,
  document = createDocument(),
  initialValue = { attachments: [] },
  readOnly = false,
  errorMessage,
  messages,
}: {
  service: FormFileService;
  document?: FormDocument;
  initialValue?: JsonObject;
  readOnly?: boolean;
  errorMessage?: (error: unknown) => string;
  messages?: CreateFileUploadNodeRegistryOptions['messages'];
}) {
  const plan = useMemo(() => createPlan(document), [document]);
  const registry = useMemo(
    () => createFileUploadNodeRegistry({ service, getErrorMessage: errorMessage, messages }),
    [errorMessage, messages, service],
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

describe('file upload value contract', () => {
  it('creates bounded closed schemas', () => {
    expect(createFormFileUploadSchema()).toEqual(
      expect.objectContaining({ minItems: 0, maxItems: 5, uniqueItems: true }),
    );
    expect(createFormFileUploadSchema({ minFiles: 12, maxFiles: 3 })).toEqual(
      expect.objectContaining({ minItems: 3, maxItems: 3 }),
    );
    expect(createFormFileUploadSchema({ minFiles: -1, maxFiles: 500 })).toEqual(
      expect.objectContaining({ minItems: 0, maxItems: 100 }),
    );
    expect(createFormFileUploadSchema({ maxFiles: 1.5 })).toEqual(
      expect.objectContaining({ minItems: 0, maxItems: 5 }),
    );
    expect(createFormFileUploadSchema().items).toEqual(
      expect.objectContaining({
        type: 'object',
        required: ['id', 'name', 'size', 'mediaType'],
        additionalProperties: false,
      }),
    );
  });

  it('rejects every malformed reference boundary', () => {
    const valid = reference('valid', 'valid.pdf', 0);
    expect(isFormFileReference(valid)).toBe(true);
    const invalid: unknown[] = [
      null,
      [],
      'file',
      { ...valid, secret: 'token' },
      { id: 'missing-fields' },
      { ...valid, id: 1 },
      { ...valid, id: '' },
      { ...valid, id: 'x'.repeat(513) },
      { ...valid, name: 1 },
      { ...valid, name: ' ' },
      { ...valid, name: 'x'.repeat(1025) },
      { ...valid, size: '1' },
      { ...valid, size: 1.5 },
      { ...valid, size: -1 },
      { ...valid, mediaType: 1 },
      { ...valid, mediaType: '' },
      { ...valid, mediaType: 'x'.repeat(256) },
    ];
    for (const candidate of invalid) expect(isFormFileReference(candidate)).toBe(false);
  });
});

describe('official file upload extension', () => {
  it('uploads JSON-safe references with bounded concurrency and progress', async () => {
    const { service, uploads } = createService();
    render(<Harness service={service} />);

    const input = screen.getByLabelText('选择附件文件');
    const files = [
      file('brief.pdf', 200),
      file('cover.png', 300, 'image/png'),
      file('plan.pdf', 400),
    ];
    fireEvent.change(input, { target: { files } });

    await waitFor(() => expect(uploads).toHaveLength(2));
    expect(uploads[0].request).toEqual(
      expect.objectContaining({
        file: files[0],
        valuePath: 'attachments',
        rowIndices: [],
      }),
    );
    expect(uploads[0].request.plan.nodeById.attachments.id).toBe('attachments');
    expect(uploads[0].request.node.id).toBe('attachments');

    act(() => uploads[0].request.onProgress({ loaded: 50, total: 200 }));
    await waitFor(() =>
      expect(
        screen
          .getByRole('progressbar', { name: 'brief.pdf 上传进度' })
          .getAttribute('aria-valuenow'),
      ).toBe('25'),
    );
    await act(async () => uploads[0].resolve(reference('brief', 'brief.pdf', 200)));

    await waitFor(() => expect(uploads).toHaveLength(3));
    expect(uploads[2].request.file.name).toBe('plan.pdf');
    await act(async () => uploads[1].resolve(reference('cover', 'cover.png', 300)));
    await act(async () => uploads[2].resolve(reference('plan', 'plan.pdf', 400)));

    await waitFor(() => expect(screen.getByTestId('value').textContent).toContain('"id":"plan"'));
    const serialized = screen.getByTestId('value').textContent ?? '';
    expect(serialized).not.toContain('lastModified');
    expect(serialized).not.toContain('blob:');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('validates type, size, and capacity before calling the host', async () => {
    const { service, uploads } = createService();
    render(
      <Harness service={service} document={createDocument({ maxFiles: 1, maxFileSize: 16 })} />,
    );

    fireEvent.change(screen.getByLabelText('选择附件文件'), {
      target: {
        files: [
          file('script.js', 8, 'text/javascript'),
          file('oversized.pdf', 32),
          file('valid.pdf', 8),
          file('overflow.pdf', 8),
        ],
      },
    });

    await waitFor(() => expect(uploads).toHaveLength(1));
    expect(uploads[0].request.file.name).toBe('valid.pdf');
    expect(screen.getByText('不支持这种文件类型。')).toBeTruthy();
    expect(screen.getByText('文件超过 16 B 上限。')).toBeTruthy();
    expect(screen.getByText('最多可保留 1 个文件。')).toBeTruthy();
    expect(screen.getByRole('button', { name: '移除 script.js 错误' })).toBeTruthy();
  });

  it('supports cancellation, retry, and safe host error messages', async () => {
    const { service, uploads } = createService();
    render(<Harness service={service} />);

    fireEvent.change(screen.getByLabelText('选择附件文件'), {
      target: { files: [file('cancel.pdf', 8)] },
    });
    await waitFor(() => expect(uploads).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: '取消上传 cancel.pdf' }));
    expect(uploads[0].request.signal.aborted).toBe(true);
    act(() => uploads[0].request.onProgress({ loaded: 8, total: 8 }));
    await waitFor(() => expect(screen.queryByText('cancel.pdf')).toBeNull());
    await act(async () => uploads[0].reject(new DOMException('Cancelled.', 'AbortError')));
    expect(screen.getByTestId('value').textContent).not.toContain('late');

    fireEvent.change(screen.getByLabelText('选择附件文件'), {
      target: { files: [file('retry.pdf', 8), file('retry.js', 8, 'text/javascript')] },
    });
    await waitFor(() => expect(uploads).toHaveLength(2));
    uploads[1].reject(new Error('private storage token expired'));
    expect(await screen.findByText('上传没有完成，请重试。')).toBeTruthy();
    expect(screen.queryByText(/private storage token/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '重试上传 retry.pdf' }));
    await waitFor(() => expect(uploads).toHaveLength(3));
    uploads[2].resolve(reference('retry', 'retry.pdf', 8));
    await waitFor(() => expect(screen.getByTestId('value').textContent).toContain('"id":"retry"'));
  });

  it('uses a host error mapper without accepting malformed references', async () => {
    const { service, uploads } = createService();
    render(<Harness service={service} errorMessage={() => '存储服务暂时不可用。'} />);

    fireEvent.change(screen.getByLabelText('选择附件文件'), {
      target: { files: [file('malformed.pdf', 8)] },
    });
    await waitFor(() => expect(uploads).toHaveLength(1));
    uploads[0].resolve({
      id: 'unsafe',
      name: 'malformed.pdf',
      size: 8,
      mediaType: 'application/pdf',
      url: 'https://example.test/?token=secret',
    } as FormFileReference);

    expect(await screen.findByText('存储服务暂时不可用。')).toBeTruthy();
    expect(screen.getByTestId('value').textContent).toBe('{"attachments":[]}');
  });

  it('rejects duplicate host identifiers without changing the controlled value', async () => {
    const { service, uploads } = createService();
    render(
      <Harness
        service={service}
        initialValue={{ attachments: [reference('duplicate', 'existing.pdf')] }}
      />,
    );
    fireEvent.change(screen.getByLabelText('选择附件文件'), {
      target: { files: [file('replacement.pdf', 8)] },
    });
    await waitFor(() => expect(uploads).toHaveLength(1));
    uploads[0].resolve(reference('duplicate', 'replacement.pdf', 8));
    expect(await screen.findByText('上传没有完成，请重试。')).toBeTruthy();
    expect(screen.getByTestId('value').textContent).toContain('existing.pdf');
    expect(screen.getByTestId('value').textContent).not.toContain('replacement.pdf');
  });

  it('opens and removes uploaded files through the host service', async () => {
    let removeAttempts = 0;
    const { service, removals, opens } = createService({
      remove: async (request) => {
        removals.push(request);
        removeAttempts += 1;
        if (removeAttempts === 1) throw new Error('private delete failure');
      },
    });
    render(
      <Harness
        service={service}
        initialValue={{ attachments: [reference('existing', 'existing-contract.pdf', 2048)] }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '打开 existing-contract.pdf' }));
    await waitFor(() => expect(opens).toHaveLength(1));
    expect(opens[0]).toEqual(expect.objectContaining({ valuePath: 'attachments' }));

    fireEvent.click(screen.getByRole('button', { name: '删除 existing-contract.pdf' }));
    expect(await screen.findByText('删除没有完成，请重试。')).toBeTruthy();
    expect(screen.getByTestId('value').textContent).toContain('existing');
    fireEvent.click(screen.getByRole('button', { name: '重试删除 existing-contract.pdf' }));
    await waitFor(() => expect(removals).toHaveLength(2));
    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('{"attachments":[]}'));
  });

  it('accepts drag and drop and cancels work when unmounted', async () => {
    const { service, uploads } = createService();
    const rendered = render(<Harness service={service} />);
    const dropzone = screen.getByTestId('file-upload-dropzone');
    const dropped = file('dropped.pdf', 12);

    fireEvent.dragEnter(dropzone, { dataTransfer: { files: [dropped] } });
    expect(dropzone.getAttribute('data-dragging')).toBe('true');
    fireEvent.drop(dropzone, { dataTransfer: { files: [dropped] } });
    await waitFor(() => expect(uploads).toHaveLength(1));
    rendered.unmount();
    expect(uploads[0].request.signal.aborted).toBe(true);
    await act(async () => uploads[0].resolve(reference('ignored', 'dropped.pdf', 12)));
  });

  it('keeps read-only references available without exposing mutation controls', async () => {
    const { service, opens } = createService();
    render(
      <Harness
        service={service}
        readOnly
        initialValue={{ attachments: [reference('readonly', 'approved.pdf')] }}
      />,
    );

    expect((screen.getByLabelText('选择附件文件') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: '删除 approved.pdf' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '打开 approved.pdf' }));
    await waitFor(() => expect(opens).toHaveLength(1));
  });

  it('renders localized empty and required states', () => {
    const { service } = createService();
    render(<Harness service={service} document={createDocument({ locale: 'en-US' })} />);

    expect(screen.getByText('附件')).toBeTruthy();
    expect(screen.getByText('Drop files here')).toBeTruthy();
    expect(screen.getByText('Required')).toBeTruthy();
    expect(screen.getByText(/Up to 3 files/)).toBeTruthy();
  });

  it('uses runtime label and description fallbacks', () => {
    const document = createDocument();
    const node = document.ui.nodes.find((candidate) => candidate.widget === FILE_UPLOAD_WIDGET);
    if (!node) throw new Error('Missing file node fixture.');
    delete node.label;
    delete node.description;
    render(<Harness service={createService().service} document={document} />);

    expect(screen.getByText('附件')).toBeTruthy();
    expect(screen.queryByText('上传审批所需材料')).toBeNull();
    expect(screen.getByLabelText('选择附件文件')).toBeTruthy();
  });

  it('supports functional and object message overrides', () => {
    const first = createService();
    const rendered = render(
      <Harness
        service={first.service}
        document={createDocument({ locale: 'en-US' })}
        messages={(locale) => ({
          dropPrompt: locale === 'en-US' ? 'Attach evidence' : '添加材料',
          constraints: '{unknown} {count}',
        })}
      />,
    );
    expect(screen.getByText('Attach evidence')).toBeTruthy();
    expect(screen.getByText('{unknown} 3')).toBeTruthy();
    rendered.unmount();

    render(
      <Harness service={createService().service} messages={{ empty: '没有待提交的附件。' }} />,
    );
    expect(screen.getByText('没有待提交的附件。')).toBeTruthy();
  });

  it('renders malformed controlled entries and large file sizes without dropping data', () => {
    const { service } = createService({ open: undefined });
    render(
      <Harness
        service={service}
        document={createDocument({ maxFiles: 10 })}
        initialValue={{
          attachments: [
            {
              id: 'invalid',
              name: 'unsafe.pdf',
              size: 1,
              mediaType: 'application/pdf',
              url: 'secret',
            },
            reference('fraction', 'fraction.bin', 1536),
            reference('megabytes', 'archive.bin', 11 * 1024 * 1024),
            reference('gigabytes', 'dataset.bin', 1024 * 1024 * 1024),
          ],
        }}
      />,
    );

    expect(screen.getByText('宿主返回的文件引用无效。')).toBeTruthy();
    expect(screen.getByText(/1.5 KB/)).toBeTruthy();
    expect(screen.getByText(/11 MB/)).toBeTruthy();
    expect(screen.getByText(/1 GB/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /打开 fraction.bin/ })).toBeNull();
    expect(screen.getByTestId('value').textContent).toContain('"url":"secret"');
  });

  it('treats non-array and non-JSON host values as invalid controlled input', () => {
    const first = render(
      <Harness service={createService().service} initialValue={{ attachments: 'invalid-array' }} />,
    );
    expect(screen.getByText('尚未上传文件。')).toBeTruthy();
    first.unmount();

    render(
      <Harness
        service={createService().service}
        initialValue={{ attachments: [undefined] as never }}
      />,
    );
    expect(screen.getByText('宿主返回的文件引用无效。')).toBeTruthy();
  });

  it('accepts exact MIME and unrestricted configurations', async () => {
    const exact = createService();
    const first = render(
      <Harness service={exact.service} document={createDocument({ accept: 'application/pdf' })} />,
    );
    fireEvent.change(screen.getByLabelText('选择附件文件'), {
      target: { files: [file('exact.data', 4, 'application/pdf')] },
    });
    await waitFor(() => expect(exact.uploads).toHaveLength(1));
    first.unmount();

    const unrestricted = createService();
    render(
      <Harness service={unrestricted.service} document={createDocument({ accept: 'invalid' })} />,
    );
    fireEvent.change(screen.getByLabelText('选择附件文件'), {
      target: { files: [file('notes.txt', 4, 'text/plain')] },
    });
    await waitFor(() => expect(unrestricted.uploads).toHaveLength(1));
  });

  it('normalizes missing and out-of-range progress values', async () => {
    const { service, uploads } = createService();
    render(<Harness service={service} />);
    fireEvent.change(screen.getByLabelText('选择附件文件'), {
      target: { files: [file('progress.pdf', 100)] },
    });
    await waitFor(() => expect(uploads).toHaveLength(1));
    const progress = screen.getByRole('progressbar', { name: 'progress.pdf 上传进度' });
    act(() => uploads[0].request.onProgress({ loaded: Number.NaN }));
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    act(() => uploads[0].request.onProgress({ loaded: 300 }));
    await waitFor(() => expect(progress.getAttribute('aria-valuenow')).toBe('100'));
    act(() => uploads[0].request.onProgress({ loaded: -10, total: 0 }));
    await waitFor(() => expect(progress.getAttribute('aria-valuenow')).toBe('0'));
  });

  it('shows pending and failed open states without exposing host errors', async () => {
    let rejectOpen: ((error: unknown) => void) | undefined;
    const { service } = createService({
      open: () =>
        new Promise((_, reject) => {
          rejectOpen = reject;
        }),
    });
    render(
      <Harness service={service} initialValue={{ attachments: [reference('open', 'open.pdf')] }} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '打开 open.pdf' }));
    expect(await screen.findByText(/正在打开/)).toBeTruthy();
    await act(async () => rejectOpen?.(new Error('private signed URL failure')));
    expect(await screen.findByText('文件无法打开，请重试。')).toBeTruthy();
    expect(screen.queryByText(/private signed URL/)).toBeNull();
  });

  it('contains drag state and ignores disabled or empty selections', async () => {
    const active = createService();
    const rendered = render(<Harness service={active.service} />);
    const dropzone = screen.getByTestId('file-upload-dropzone');
    const transfer = { files: [] as File[], dropEffect: 'none' };
    fireEvent.dragEnter(dropzone, { dataTransfer: transfer });
    fireEvent.dragEnter(dropzone, { dataTransfer: transfer });
    fireEvent.dragOver(dropzone, { dataTransfer: transfer });
    fireEvent.dragLeave(dropzone, { dataTransfer: transfer });
    expect(dropzone.getAttribute('data-dragging')).toBe('true');
    fireEvent.dragLeave(dropzone, { dataTransfer: transfer });
    expect(dropzone.getAttribute('data-dragging')).toBeNull();
    fireEvent.drop(dropzone, { dataTransfer: {} });
    fireEvent.change(screen.getByLabelText('选择附件文件'), { target: {} });
    expect(active.uploads).toHaveLength(0);
    rendered.unmount();

    const disabled = createService();
    render(<Harness service={disabled.service} document={createDocument({ maxFiles: 0 })} />);
    const disabledDropzone = screen.getByTestId('file-upload-dropzone');
    fireEvent.dragEnter(disabledDropzone, { dataTransfer: transfer });
    fireEvent.dragOver(disabledDropzone, { dataTransfer: transfer });
    fireEvent.dragLeave(disabledDropzone, { dataTransfer: transfer });
    fireEvent.drop(disabledDropzone, {
      dataTransfer: { files: [file('ignored.pdf', 4)] },
    });
    expect(disabledDropzone.getAttribute('data-dragging')).toBeNull();
    expect(disabled.uploads).toHaveLength(0);
  });

  it('handles synchronous service and error-mapper failures safely', async () => {
    const service: FormFileService = {
      upload: () => {
        throw new Error('synchronous private failure');
      },
      remove: () => {
        throw new Error('synchronous private delete failure');
      },
    };
    render(
      <Harness
        service={service}
        errorMessage={() => {
          throw new Error('mapper failure');
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText('选择附件文件'), {
      target: { files: [file('sync.pdf', 4)] },
    });
    expect(await screen.findByText('上传没有完成，请重试。')).toBeTruthy();
  });

  it('does not resurrect a file removed externally during host deletion', async () => {
    let resolveRemove: (() => void) | undefined;
    const service: FormFileService = {
      upload: async ({ file }) => reference('unused', file.name, file.size),
      remove: () =>
        new Promise((resolve) => {
          resolveRemove = resolve;
        }),
    };
    const registry = createFileUploadNodeRegistry({ service });
    const plan = createPlan();

    function ExternalValueHarness() {
      const [value, setValue] = useState<JsonObject>({
        attachments: [reference('external', 'external.pdf')],
      });
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} nodeRegistry={registry} />
          <button type="button" onClick={() => setValue({ attachments: [] })}>
            外部移除
          </button>
          <output data-testid="external-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<ExternalValueHarness />);
    fireEvent.click(screen.getByRole('button', { name: '删除 external.pdf' }));
    await waitFor(() => expect(resolveRemove).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: '外部移除' }));
    await act(async () => resolveRemove?.());
    expect(screen.getByTestId('external-value').textContent).toBe('{"attachments":[]}');
  });
});

describe('file upload Designer integration', () => {
  it('adds the official extension and edits its bounded settings', async () => {
    const { service } = createService();
    const registry = createFileUploadNodeRegistry({ service });
    const source = createDocument();
    source.schema = { type: 'object', properties: {}, additionalProperties: false };
    source.ui.nodes = [
      { id: 'root', kind: 'root', label: '材料提交', children: [], columns: 12, gap: 16 },
    ];
    let latest = source;

    function DesignerHarness() {
      const [document, setDocument] = useState(source);
      latest = document;
      return <FormDesigner document={document} onChange={setDocument} nodeRegistry={registry} />;
    }

    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加文件上传字段' }));

    expect(await screen.findByText('拖放文件到这里')).toBeTruthy();
    const selected = latest.ui.nodes.find((node) => node.widget === FILE_UPLOAD_WIDGET);
    expect(selected?.schemaPath).toBeTruthy();
    const property = selected?.schemaPath?.split('/').at(-1);
    const schema = property ? latest.schema.properties?.[property] : undefined;
    expect(schema).toEqual(
      expect.objectContaining({
        type: 'array',
        maxItems: 5,
        items: expect.objectContaining({ additionalProperties: false }),
      }),
    );

    fireEvent.change(screen.getByLabelText('允许的文件类型'), { target: { value: '.pdf' } });
    fireEvent.change(screen.getByLabelText('单个文件上限（MB）'), { target: { value: '25' } });
    fireEvent.change(screen.getByLabelText('并发上传数'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.change(screen.getByLabelText('最多文件数'), { target: { value: '8' } });

    await waitFor(() => {
      const node = latest.ui.nodes.find((candidate) => candidate.widget === FILE_UPLOAD_WIDGET);
      expect(node?.customProps).toEqual(
        expect.objectContaining({
          accept: '.pdf',
          maxFileSize: 25 * 1024 * 1024,
          maxConcurrentUploads: 3,
        }),
      );
      const key = node?.schemaPath?.split('/').at(-1);
      expect(key ? latest.schema.properties?.[key]?.maxItems : undefined).toBe(8);
    });
  });

  it('exposes an accessible design summary and inspector grouping', () => {
    const { service } = createService();
    const registry = createFileUploadNodeRegistry({ service });
    render(
      <FormDesigner
        document={createDocument()}
        onChange={() => undefined}
        nodeRegistry={registry}
      />,
    );

    const canvas = screen.getByTestId('designer-canvas');
    expect(within(canvas).getByText('上传审批所需材料')).toBeTruthy();
    expect(screen.getByRole('region', { name: '文件上传设置' })).toBeTruthy();
    expect(screen.getByLabelText('允许的文件类型').classList.contains('input')).toBe(true);
    expect(screen.getByLabelText('单个文件上限（MB）').classList.contains('input')).toBe(true);
  });

  it('uses clear design fallbacks for an unconfigured file field', async () => {
    const { service } = createService();
    const registry = createFileUploadNodeRegistry({ service });
    const source = createDocument();
    source.schema.required = [];
    const fileNode = source.ui.nodes.find((node) => node.widget === FILE_UPLOAD_WIDGET);
    if (!fileNode) throw new Error('Missing file node fixture.');
    delete fileNode.label;
    delete fileNode.description;
    delete fileNode.customProps;
    let latest = source;

    function FallbackHarness() {
      const [document, setDocument] = useState(source);
      latest = document;
      return <FormDesigner document={document} onChange={setDocument} nodeRegistry={registry} />;
    }

    render(<FallbackHarness />);
    expect(screen.getByText('由宿主服务接收并保存文件')).toBeTruthy();
    expect(screen.getByText(/不限格式/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('允许的文件类型'), { target: { value: '   ' } });
    await waitFor(() => {
      const node = latest.ui.nodes.find((candidate) => candidate.widget === FILE_UPLOAD_WIDGET);
      expect(node?.customProps).toEqual({});
    });
  });
});
