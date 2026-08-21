import { useMemo, useState } from 'react';
import { assertCompiled, type FormDocument, type JsonObject } from '../../../src/core';
import {
  createFormSignatureSchema,
  createSignatureNodeRegistry,
  FormRenderer,
  type FormSignatureService,
  SIGNATURE_WIDGET,
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
      reject(new DOMException('Signature operation cancelled.', 'AbortError'));
    };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

const demoSignatureService: FormSignatureService = {
  save: async ({ capture, signal }) => {
    await abortableDelay(520, signal);
    return {
      id: globalThis.crypto?.randomUUID?.() ?? `demo-signature-${Date.now()}`,
      method: capture.method,
      signedAt: new Date().toISOString(),
    };
  },
  remove: async ({ signal }) => abortableDelay(260, signal),
};

const nodeRegistry = createSignatureNodeRegistry({ service: demoSignatureService });

const document: FormDocument = {
  kind: 'a3s.form',
  apiVersion: 'a3s.dev/form/v1alpha1',
  revision: 1,
  metadata: { title: '发布确认', locale: 'zh-CN' },
  schema: {
    type: 'object',
    properties: {
      approvalSignature: createFormSignatureSchema({ required: true }),
    },
    required: ['approvalSignature'],
    additionalProperties: false,
  },
  ui: {
    root: 'root',
    nodes: [
      { id: 'root', kind: 'root', children: ['approvalSignature'] },
      {
        id: 'approvalSignature',
        kind: 'field',
        label: '发布确认签名',
        description: '核对发布内容后完成签署',
        schemaPath: '/properties/approvalSignature',
        widget: SIGNATURE_WIDGET,
        customProps: {
          captureMode: 'drawn-or-typed',
          penColor: 'ink',
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

const initialValue: JsonObject = { approvalSignature: [] };

export function SignatureDemo() {
  const resetValue = useMemo(() => structuredClone(initialValue), []);
  const [value, setValue] = useState<JsonObject>(resetValue);
  const [instance, setInstance] = useState(0);
  return (
    <section className="a3s-doc-field-demo a3s-doc-signature-demo">
      <header>
        <div>
          <strong>实时示例</strong>
          <span>FormSignatureReference[]</span>
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
