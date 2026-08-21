import { useMemo, useState } from 'react';
import { assertCompiled, type FormDocument, type JsonObject } from '../../../src/core';
import {
  createFileUploadNodeRegistry,
  createFormFileUploadSchema,
  FILE_UPLOAD_WIDGET,
  type FormFileService,
  FormRenderer,
} from '../../../src/react';
import '../../../src/a3s-ui.css';

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener('abort', abort);
      resolve();
    };
    const timer = window.setTimeout(finish, milliseconds);
    const abort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(new DOMException('Upload cancelled.', 'AbortError'));
    };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

const demoFileService: FormFileService = {
  upload: ({ file, signal, onProgress }) =>
    new Promise((resolve, reject) => {
      let loaded = 0;
      const total = Math.max(1, file.size);
      const step = Math.max(1, Math.ceil(total / 5));
      const timer = window.setInterval(() => {
        loaded = Math.min(total, loaded + step);
        onProgress({ loaded, total });
        if (loaded < total) return;
        window.clearInterval(timer);
        signal.removeEventListener('abort', abort);
        resolve({
          id: globalThis.crypto?.randomUUID?.() ?? `demo-${file.name}-${file.size}`,
          name: file.name,
          size: file.size,
          mediaType: file.type || 'application/octet-stream',
        });
      }, 140);
      const abort = () => {
        window.clearInterval(timer);
        reject(new DOMException('Upload cancelled.', 'AbortError'));
      };
      if (signal.aborted) abort();
      else signal.addEventListener('abort', abort, { once: true });
    }),
  remove: async ({ signal }) => abortableDelay(240, signal),
};

const nodeRegistry = createFileUploadNodeRegistry({ service: demoFileService });

const document: FormDocument = {
  kind: 'a3s.form',
  apiVersion: 'a3s.dev/form/v1alpha1',
  revision: 1,
  metadata: { title: '发布材料', locale: 'zh-CN' },
  schema: {
    type: 'object',
    properties: {
      attachments: createFormFileUploadSchema({ minFiles: 1, maxFiles: 3 }),
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
        description: '支持 PDF 和常见图片，单个文件不超过 5 MB',
        schemaPath: '/properties/attachments',
        widget: FILE_UPLOAD_WIDGET,
        customProps: {
          accept: '.pdf,image/*',
          maxFileSize: 5 * 1024 * 1024,
          maxConcurrentUploads: 2,
        },
      },
    ],
  },
  rules: [],
  dataSources: [],
  actions: [],
};

const plan = assertCompiled(document, {
  capabilities: { widgets: Object.keys(nodeRegistry) },
});

const initialValue: JsonObject = {
  attachments: [
    {
      id: 'release-notes',
      name: 'release-notes.pdf',
      size: 184_320,
      mediaType: 'application/pdf',
    },
  ],
};

export function FileUploadDemo() {
  const resetValue = useMemo(() => structuredClone(initialValue), []);
  const [value, setValue] = useState<JsonObject>(resetValue);
  const [instance, setInstance] = useState(0);
  return (
    <section className="a3s-doc-field-demo a3s-doc-file-upload-demo">
      <header>
        <div>
          <strong>实时示例</strong>
          <span>FormFileReference[]</span>
        </div>
        <button
          type="button"
          className="btn"
          data-size="sm"
          data-variant="secondary"
          onClick={() => {
            setValue(structuredClone(resetValue));
            setInstance((current) => current + 1);
          }}
        >
          重置
        </button>
      </header>
      <div className="a3s-doc-field-demo__preview">
        <FormRenderer
          key={instance}
          plan={plan}
          value={value}
          onChange={setValue}
          nodeRegistry={nodeRegistry}
        />
      </div>
      <div className="a3s-doc-field-demo__value">
        <span>受控值</span>
        <pre aria-live="polite">{JSON.stringify(value, null, 2)}</pre>
      </div>
    </section>
  );
}
