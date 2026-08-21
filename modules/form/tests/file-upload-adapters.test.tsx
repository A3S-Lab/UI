import { fireEvent, waitFor } from '@testing-library/react';
import { createApp, h, ref as vueRef } from 'vue';
import { assertCompiled, type FormDocument, type JsonObject } from '../src/core';
import {
  createFileUploadNodeRegistry,
  createFormFileUploadSchema,
  FILE_UPLOAD_WIDGET,
  type FormFileService,
} from '../src/react';
import { A3SFormRenderer } from '../src/vue';
import { type A3SFormRendererElement, defineA3SFormElements } from '../src/web-component';

function fileDocument(): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: 'File adapter', locale: 'en-US' },
    schema: {
      type: 'object',
      properties: { files: createFormFileUploadSchema({ maxFiles: 2 }) },
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['files'] },
        {
          id: 'files',
          kind: 'field',
          label: 'Node files',
          schemaPath: '/properties/files',
          widget: FILE_UPLOAD_WIDGET,
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

function immediateService(): FormFileService {
  return {
    upload: async ({ file, onProgress }) => {
      onProgress({ loaded: file.size, total: file.size });
      return {
        id: `stored-${file.name}`,
        name: file.name,
        size: file.size,
        mediaType: file.type || 'application/octet-stream',
      };
    },
    remove: async () => undefined,
  };
}

describe('file upload framework adapters', () => {
  it('uploads through the Vue controlled-value bridge', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const value = vueRef<JsonObject>({ files: [] });
    const registry = createFileUploadNodeRegistry({ service: immediateService() });
    const plan = assertCompiled(fileDocument(), {
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
    const input = await waitFor(() => {
      const candidate = container.querySelector('input[type="file"]') as HTMLInputElement | null;
      expect(candidate).toBeTruthy();
      return candidate as HTMLInputElement;
    });
    fireEvent.change(input, {
      target: {
        files: [new File(['vue'], 'vue.pdf', { type: 'application/pdf' })],
      },
    });
    await waitFor(() => expect((value.value.files as JsonObject[])[0]?.id).toBe('stored-vue.pdf'));
    app.unmount();
    container.remove();
  });

  it('uploads through the Web Component property and value-change event', async () => {
    defineA3SFormElements();
    const registry = createFileUploadNodeRegistry({ service: immediateService() });
    const element = document.createElement('a3s-form-renderer') as A3SFormRendererElement;
    element.plan = assertCompiled(fileDocument(), {
      capabilities: { widgets: Object.keys(registry) },
    });
    element.value = { files: [] };
    element.nodeRegistry = registry;
    let emitted: JsonObject | undefined;
    element.addEventListener('value-change', (event) => {
      emitted = (event as CustomEvent<JsonObject>).detail;
    });
    document.body.append(element);

    const input = await waitFor(() => {
      const candidate = element.querySelector('input[type="file"]') as HTMLInputElement | null;
      expect(candidate).toBeTruthy();
      return candidate as HTMLInputElement;
    });
    fireEvent.change(input, {
      target: {
        files: [new File(['web'], 'web.pdf', { type: 'application/pdf' })],
      },
    });
    await waitFor(() =>
      expect((emitted?.files as JsonObject[] | undefined)?.[0]?.id).toBe('stored-web.pdf'),
    );
    element.remove();
  });
});
