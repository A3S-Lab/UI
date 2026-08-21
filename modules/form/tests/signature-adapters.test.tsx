import { fireEvent, waitFor } from '@testing-library/react';
import { createApp, h, ref as vueRef } from 'vue';
import { assertCompiled, type FormDocument, type JsonObject } from '../src/core';
import {
  createFormSignatureSchema,
  createSignatureNodeRegistry,
  type FormSignatureService,
  SIGNATURE_WIDGET,
} from '../src/react';
import { A3SFormRenderer } from '../src/vue';
import { type A3SFormRendererElement, defineA3SFormElements } from '../src/web-component';

function signatureDocument(): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: 'Signature adapter', locale: 'zh-CN' },
    schema: {
      type: 'object',
      properties: { signature: createFormSignatureSchema() },
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['signature'] },
        {
          id: 'signature',
          kind: 'field',
          label: '确认签名',
          schemaPath: '/properties/signature',
          widget: SIGNATURE_WIDGET,
          customProps: { captureMode: 'typed' },
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

function immediateService(): FormSignatureService {
  return {
    save: async ({ capture }) => ({
      id: `stored-${capture.method}`,
      method: capture.method,
      signedAt: '2026-08-09T09:30:00.000Z',
    }),
    remove: async () => undefined,
  };
}

async function typeAndSave(container: ParentNode, value: string) {
  const input = await waitFor(() => {
    const candidate = container.querySelector(
      'input[aria-label="签署姓名"]',
    ) as HTMLInputElement | null;
    expect(candidate).toBeTruthy();
    return candidate as HTMLInputElement;
  });
  fireEvent.change(input, { target: { value } });
  const button = container.querySelector(
    'button[aria-label="保存签名"]',
  ) as HTMLButtonElement | null;
  expect(button).toBeTruthy();
  fireEvent.click(button as HTMLButtonElement);
}

describe('signature framework adapters', () => {
  it('saves through the Vue controlled-value bridge', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const value = vueRef<JsonObject>({ signature: [] });
    const registry = createSignatureNodeRegistry({ service: immediateService() });
    const plan = assertCompiled(signatureDocument(), {
      capabilities: { widgets: Object.keys(registry) },
    });
    const app = createApp({
      setup: () => () =>
        h(A3SFormRenderer, {
          plan,
          modelValue: value.value,
          nodeRegistry: registry,
          'onUpdate:modelValue': (next: JsonObject) => {
            value.value = next;
          },
        }),
    });

    app.mount(container);
    await typeAndSave(container, 'Vue signer');
    await waitFor(() =>
      expect((value.value.signature as JsonObject[])[0]?.id).toBe('stored-typed'),
    );
    expect(JSON.stringify(value.value)).not.toContain('Vue signer');
    app.unmount();
    container.remove();
  });

  it('saves through the Web Component property and value-change event', async () => {
    defineA3SFormElements();
    const registry = createSignatureNodeRegistry({ service: immediateService() });
    const element = document.createElement('a3s-form-renderer') as A3SFormRendererElement;
    element.plan = assertCompiled(signatureDocument(), {
      capabilities: { widgets: Object.keys(registry) },
    });
    element.value = { signature: [] };
    element.nodeRegistry = registry;
    let emitted: JsonObject | undefined;
    element.addEventListener('value-change', (event) => {
      emitted = (event as CustomEvent<JsonObject>).detail;
    });
    document.body.append(element);

    await typeAndSave(element, 'Web signer');
    await waitFor(() =>
      expect((emitted?.signature as JsonObject[] | undefined)?.[0]?.id).toBe('stored-typed'),
    );
    expect(JSON.stringify(emitted)).not.toContain('Web signer');
    element.remove();
  });
});
