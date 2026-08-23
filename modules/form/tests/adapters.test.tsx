import { act, fireEvent, waitFor } from '@testing-library/react';
import { createApp, h, nextTick, ref as vueRef } from 'vue';
import {
  assertCompiled,
  type CompileOptions,
  compileForm,
  createFormWizardCheckpoint,
  type FieldError,
  type FormDocument,
  type FormHostAdapter,
  type FormLocaleCatalogOverride,
  type FormWizardCheckpointChange,
  type JsonObject,
} from '../src/core';
import type { FormNodeRegistry, FormWidgetRegistry } from '../src/react';
import { A3SFormDesigner, A3SFormRenderer } from '../src/vue';
import {
  type A3SFormDesignerElement,
  A3SFormRendererElement,
  defineA3SFormElements,
} from '../src/web-component';
import { createDocument, createObjectRepeaterDocument, createWizardDocument } from './fixtures';

describe('framework adapters', () => {
  it('preserves editable data-grid semantics across Vue and Web Components', async () => {
    const document = createObjectRepeaterDocument();
    const grid = document.ui.nodes.find((node) => node.id === 'recipients');
    if (!grid) throw new Error('Missing recipient repeater.');
    grid.layout = 'data-grid';
    const plan = assertCompiled(document);

    const vueContainer = window.document.createElement('div');
    window.document.body.append(vueContainer);
    const vueValue = vueRef<JsonObject>({ recipients: [] });
    const vueApp = createApp({
      setup: () => () =>
        h(A3SFormRenderer, {
          plan,
          modelValue: vueValue.value,
          locale: 'en-US',
          'onUpdate:modelValue': (next: JsonObject) => {
            vueValue.value = next;
          },
        }),
    });
    vueApp.mount(vueContainer);
    await waitFor(() =>
      expect(vueContainer.querySelector('table[aria-label="Recipients"]')).toBeTruthy(),
    );
    fireEvent.click(
      Array.from(vueContainer.querySelectorAll('button')).find(
        (button) => button.textContent === 'Add row',
      ) as HTMLButtonElement,
    );
    await waitFor(() => expect((vueValue.value.recipients as unknown[]).length).toBe(1));
    vueApp.unmount();
    vueContainer.remove();

    defineA3SFormElements();
    const element = window.document.createElement('a3s-form-renderer') as A3SFormRendererElement;
    element.plan = plan;
    element.value = { recipients: [] };
    element.locale = 'en-US';
    let emitted: JsonObject | undefined;
    element.addEventListener('value-change', (event) => {
      emitted = (event as CustomEvent<JsonObject>).detail;
    });
    window.document.body.append(element);
    await waitFor(() =>
      expect(element.querySelector('table[aria-label="Recipients"]')).toBeTruthy(),
    );
    fireEvent.click(
      Array.from(element.querySelectorAll('button')).find(
        (button) => button.textContent === 'Add row',
      ) as HTMLButtonElement,
    );
    await waitFor(() => expect((emitted?.recipients as unknown[]).length).toBe(1));
    element.remove();
  });

  it('bridges Vue renderer values, actions and reactive props', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const plan = assertCompiled(createDocument());
    const value = vueRef<JsonObject>({ name: '张三' });
    const readOnly = vueRef(false);
    const errors = vueRef<FieldError[] | undefined>([
      { path: 'name', code: 'host.conflict', message: 'This value changed in the workflow.' },
    ]);
    const locale = vueRef('en-US');
    const localeCatalog = vueRef<FormLocaleCatalogOverride | undefined>({
      apiVersion: 'a3s.dev/form-locale-catalog/v1',
      messages: { selectPlaceholder: 'Choose a workflow role' },
    });
    const widgetRegistry = vueRef<FormWidgetRegistry>();
    const nodeRegistry = vueRef<FormNodeRegistry>();
    const resolvedLocales: string[] = [];
    const validationScopes: string[] = [];
    const hostAdapter = vueRef<FormHostAdapter | undefined>({
      resolveDataSource: async (request) => {
        resolvedLocales.push(request.locale);
        return { options: [{ label: 'Operator', value: 'member' }] };
      },
      validateValue: async (request) => {
        validationScopes.push(request.scope.kind);
        return { issues: [] };
      },
    });
    let action: { actionId: string; value: JsonObject } | undefined;
    const app = createApp({
      setup: () => () =>
        h(A3SFormRenderer, {
          plan,
          modelValue: value.value,
          readOnly: readOnly.value,
          errors: errors.value,
          hostAdapter: hostAdapter.value,
          locale: locale.value,
          localeCatalog: localeCatalog.value,
          widgetRegistry: widgetRegistry.value,
          nodeRegistry: nodeRegistry.value,
          'onUpdate:modelValue': (next: JsonObject) => {
            value.value = next;
          },
          onAction: (payload: { actionId: string; value: JsonObject }) => {
            action = payload;
          },
        }),
    });
    app.mount(container);
    await nextTick();
    await waitFor(() => expect(resolvedLocales).toContain('en-US'));
    expect(await waitFor(() => container.querySelector('option[value="member"]'))).toBeTruthy();
    expect(container.textContent).toContain('Choose a workflow role');
    expect(container.textContent).toContain('This value changed in the workflow.');
    const name = await waitFor(() => {
      const input = container.querySelector('input[id*="name"]') as HTMLInputElement | null;
      expect(input).toBeTruthy();
      return input as HTMLInputElement;
    });
    fireEvent.change(name, { target: { value: '李小明' } });
    await waitFor(() => expect(value.value.name).toBe('李小明'));
    await waitFor(() =>
      expect((container.querySelector('input[id*="name"]') as HTMLInputElement).value).toBe(
        '李小明',
      ),
    );
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(action).toEqual({ actionId: 'submit', value: { name: '李小明' } }));
    expect(validationScopes).toContain('form');
    readOnly.value = true;
    errors.value = [];
    locale.value = 'de-DE';
    widgetRegistry.value = {};
    nodeRegistry.value = {};
    await nextTick();
    await waitFor(() =>
      expect((container.querySelector('input[id*="name"]') as HTMLInputElement).disabled).toBe(
        true,
      ),
    );
    await waitFor(() => expect(resolvedLocales).toContain('de-DE'));
    expect(container.textContent).not.toContain('This value changed in the workflow.');
    errors.value = undefined;
    hostAdapter.value = undefined;
    localeCatalog.value = undefined;
    nodeRegistry.value = undefined;
    await nextTick();
    app.unmount();
    container.remove();
  });

  it('bridges the Vue designer document and uncontrolled preview value', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const source = compileForm(createDocument()).document as FormDocument;
    const current = vueRef(source);
    const widgetRegistry = vueRef<FormWidgetRegistry>();
    const nodeRegistry = vueRef<FormNodeRegistry>({});
    const compileOptions = vueRef<CompileOptions>({});
    const errors = vueRef<FieldError[]>([]);
    const hostAdapter: FormHostAdapter = {};
    const readOnly = vueRef(false);
    const localeCatalog: FormLocaleCatalogOverride = {
      apiVersion: 'a3s.dev/form-locale-catalog/v1',
      messages: { selectPlaceholder: 'Choose in designer preview' },
    };
    const previewModel = vueRef<JsonObject>({});
    let previewValue: JsonObject | undefined;
    let action: { actionId: string; value: JsonObject } | undefined;
    const app = createApp({
      setup: () => () =>
        h(A3SFormDesigner as never, {
          document: current.value,
          compileOptions: compileOptions.value,
          errors: errors.value,
          hostAdapter,
          locale: 'en-US',
          localeCatalog,
          modelValue: previewModel.value,
          nodeRegistry: nodeRegistry.value,
          readOnly: readOnly.value,
          widgetRegistry: widgetRegistry.value,
          wizardCheckpoints: {},
          'onUpdate:document': (next: FormDocument) => {
            current.value = next;
          },
          'onUpdate:modelValue': (next: JsonObject) => {
            previewModel.value = next;
            previewValue = next;
          },
          onAction: (payload: { actionId: string; value: JsonObject }) => {
            action = payload;
          },
        }),
    });
    await act(async () => {
      app.mount(container);
      await nextTick();
    });
    await waitFor(() => expect(container.querySelector('[aria-label="字段标题"]')).toBeTruthy());
    await act(async () => {
      widgetRegistry.value = {};
      nodeRegistry.value = {};
      compileOptions.value = {};
      await nextTick();
    });
    fireEvent.change(container.querySelector('[aria-label="字段标题"]') as HTMLInputElement, {
      target: { value: '真实姓名' },
    });
    await waitFor(() =>
      expect(current.value.ui.nodes.some((node) => node.label === '真实姓名')).toBe(true),
    );
    fireEvent.click(
      Array.from(container.querySelectorAll('button')).find(
        (button) => button.textContent === '预览',
      ) as HTMLButtonElement,
    );
    await waitFor(() => expect(container.querySelector('input[id*="name"]')).toBeTruthy());
    fireEvent.change(container.querySelector('input[id*="name"]') as HTMLInputElement, {
      target: { value: '王小云' },
    });
    await waitFor(() => expect(previewValue?.name).toBe('王小云'));
    fireEvent.click(container.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(action).toEqual({ actionId: 'submit', value: { name: '王小云' } }));
    await act(async () => {
      readOnly.value = true;
      await nextTick();
    });
    await waitFor(() =>
      expect((container.querySelector('input[id*="name"]') as HTMLInputElement).disabled).toBe(
        true,
      ),
    );
    app.unmount();
    container.remove();
  });

  it('mounts the Vue designer with its default value and optional host props omitted', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const source = compileForm(createDocument()).document as FormDocument;
    const app = createApp({
      setup: () => () =>
        h(A3SFormDesigner as never, {
          document: source,
          'onUpdate:document': () => undefined,
        }),
    });

    app.mount(container);
    await waitFor(() => expect(container.querySelector('[aria-label="字段标题"]')).toBeTruthy());
    app.unmount();
    container.remove();
  });

  it('defines idempotent Web Components and emits controlled value changes', async () => {
    defineA3SFormElements();
    defineA3SFormElements();
    expect(customElements.get('a3s-form-renderer')).toBe(A3SFormRendererElement);
    const element = document.createElement('a3s-form-renderer') as A3SFormRendererElement;
    element.plan = assertCompiled(createDocument());
    element.value = {};
    expect(element.plan).toBeTruthy();
    expect(element.value).toEqual({});
    let detail: JsonObject | undefined;
    let action: { actionId: string; value: JsonObject } | undefined;
    const validationScopes: string[] = [];
    element.hostAdapter = {
      validateValue: async (request) => {
        validationScopes.push(request.scope.kind);
        return { issues: [] };
      },
    };
    element.addEventListener('value-change', (event) => {
      detail = (event as CustomEvent<JsonObject>).detail;
    });
    element.addEventListener('form-action', (event) => {
      action = (event as CustomEvent<{ actionId: string; value: JsonObject }>).detail;
    });
    document.body.append(element);
    await waitFor(() => expect(element.querySelector('input[id*="name"]')).toBeTruthy());
    fireEvent.change(element.querySelector('input[id*="name"]') as HTMLInputElement, {
      target: { value: '王小云' },
    });
    expect(detail?.name).toBe('王小云');
    fireEvent.click(element.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(action).toEqual({ actionId: 'submit', value: { name: '王小云' } }));
    expect(validationScopes).toContain('form');
    element.plan = undefined;
    expect(element.plan).toBeUndefined();
    await waitFor(() => expect(element.querySelector('input[id*="name"]')).toBeNull());
    element.remove();
  });

  it('forwards Web Component host state without leaking ownership', async () => {
    defineA3SFormElements();
    const element = document.createElement('a3s-form-renderer') as A3SFormRendererElement;
    const locales: string[] = [];
    const widgetRegistry: FormWidgetRegistry = {};
    const nodeRegistry: FormNodeRegistry = {};
    element.plan = assertCompiled(createDocument());
    element.value = { name: 'Embedded node' };
    element.errors = [
      { path: 'name', code: 'host.conflict', message: 'Reload the workflow node configuration.' },
    ];
    element.hostAdapter = {
      resolveDataSource: async (request) => {
        locales.push(request.locale);
        return { options: [{ label: 'Operator', value: 'member' }] };
      },
    };
    element.locale = 'en-US';
    const localeCatalog: FormLocaleCatalogOverride = {
      apiVersion: 'a3s.dev/form-locale-catalog/v1',
      messages: { selectPlaceholder: 'Choose an embedded role' },
    };
    element.localeCatalog = localeCatalog;
    element.nodeRegistry = nodeRegistry;
    element.readOnly = true;
    element.widgetRegistry = widgetRegistry;

    expect(element.errors).toHaveLength(1);
    expect(element.hostAdapter).toBeTruthy();
    expect(element.locale).toBe('en-US');
    expect(element.localeCatalog).toBe(localeCatalog);
    expect(element.nodeRegistry).toBe(nodeRegistry);
    expect(element.readOnly).toBe(true);
    expect(element.widgetRegistry).toBe(widgetRegistry);

    document.body.append(element);
    await waitFor(() => expect(locales).toContain('en-US'));
    await waitFor(() => expect(element.querySelector('option[value="member"]')).toBeTruthy());
    expect(element.textContent).toContain('Choose an embedded role');
    await waitFor(() =>
      expect((element.querySelector('input[id*="name"]') as HTMLInputElement).disabled).toBe(true),
    );
    expect(element.textContent).toContain('Reload the workflow node configuration.');

    element.locale = 'de-DE';
    element.errors = [];
    element.readOnly = false;
    await waitFor(() => expect(locales).toContain('de-DE'));
    await waitFor(() =>
      expect((element.querySelector('input[id*="name"]') as HTMLInputElement).disabled).toBe(false),
    );
    expect(element.textContent).not.toContain('Reload the workflow node configuration.');
    element.remove();
  });

  it('mounts the Web Component designer and emits document and preview changes', async () => {
    defineA3SFormElements();
    const element = document.createElement('a3s-form-designer') as A3SFormDesignerElement;
    const compileOptions: CompileOptions = {};
    const nodeRegistry: FormNodeRegistry = {};
    const widgetRegistry: FormWidgetRegistry = {};
    const hostAdapter: FormHostAdapter = {};
    element.document = compileForm(createDocument()).document;
    element.compileOptions = compileOptions;
    element.errors = [];
    element.hostAdapter = hostAdapter;
    element.locale = 'en-US';
    const localeCatalog: FormLocaleCatalogOverride = {
      apiVersion: 'a3s.dev/form-locale-catalog/v1',
      messages: { selectPlaceholder: 'Choose in preview' },
    };
    element.localeCatalog = localeCatalog;
    element.nodeRegistry = nodeRegistry;
    element.readOnly = false;
    element.value = {};
    element.widgetRegistry = widgetRegistry;
    expect(element.compileOptions).toBe(compileOptions);
    expect(element.document).toBeTruthy();
    expect(element.errors).toEqual([]);
    expect(element.hostAdapter).toBe(hostAdapter);
    expect(element.locale).toBe('en-US');
    expect(element.localeCatalog).toBe(localeCatalog);
    expect(element.nodeRegistry).toBe(nodeRegistry);
    expect(element.readOnly).toBe(false);
    expect(element.value).toEqual({});
    expect(element.widgetRegistry).toBe(widgetRegistry);
    let changed: FormDocument | undefined;
    let previewValue: JsonObject | undefined;
    let action: { actionId: string; value: JsonObject } | undefined;
    element.addEventListener('document-change', (event) => {
      changed = (event as CustomEvent<FormDocument>).detail;
    });
    element.addEventListener('value-change', (event) => {
      previewValue = (event as CustomEvent<JsonObject>).detail;
    });
    element.addEventListener('form-action', (event) => {
      action = (event as CustomEvent<{ actionId: string; value: JsonObject }>).detail;
    });
    document.body.append(element);
    await waitFor(() => expect(element.querySelector('[aria-label="字段标题"]')).toBeTruthy());
    fireEvent.change(element.querySelector('[aria-label="字段标题"]') as HTMLInputElement, {
      target: { value: '姓名字段' },
    });
    await waitFor(() =>
      expect(changed?.ui.nodes.some((node) => node.label === '姓名字段')).toBe(true),
    );
    fireEvent.click(
      Array.from(element.querySelectorAll('button')).find(
        (button) => button.textContent === '预览',
      ) as HTMLButtonElement,
    );
    await waitFor(() => expect(element.querySelector('input[id*="name"]')).toBeTruthy());
    fireEvent.change(element.querySelector('input[id*="name"]') as HTMLInputElement, {
      target: { value: '赵六' },
    });
    await waitFor(() => expect(previewValue?.name).toBe('赵六'));
    element.value = { name: '外部更新' };
    await waitFor(() =>
      expect((element.querySelector('input[id*="name"]') as HTMLInputElement).value).toBe(
        '外部更新',
      ),
    );
    fireEvent.click(element.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() =>
      expect(action).toEqual({ actionId: 'submit', value: { name: '外部更新' } }),
    );
    element.document = undefined;
    expect(element.document).toBeUndefined();
    await waitFor(() => expect(element.querySelector('[aria-label="字段标题"]')).toBeNull());
    element.remove();
  });

  it('keeps wizard checkpoints controlled across Vue and Web Component adapters', async () => {
    const plan = assertCompiled(createWizardDocument());
    const checkpoint = createFormWizardCheckpoint(plan, 'onboarding', 'contact-page', [
      'identity-page',
    ]);
    if (!checkpoint.ok) throw new Error(checkpoint.message);
    const value = {
      workspaceName: 'Adapter workspace',
      organizationType: 'personal',
      contactEmail: 'owner@example.test',
    };

    const vueContainer = document.createElement('div');
    document.body.append(vueContainer);
    let vueChange: FormWizardCheckpointChange | undefined;
    const app = createApp({
      setup: () => () =>
        h(A3SFormRenderer, {
          plan,
          modelValue: value,
          wizardCheckpoints: { onboarding: checkpoint.checkpoint },
          'onUpdate:modelValue': () => undefined,
          onWizardCheckpointChange: (change: FormWizardCheckpointChange) => {
            vueChange = change;
          },
        }),
    });
    app.mount(vueContainer);
    await waitFor(() => expect(vueContainer.textContent).toContain('Contact'));
    fireEvent.click(
      Array.from(vueContainer.querySelectorAll('button')).find(
        (button) => button.textContent === 'Next step',
      ) as HTMLButtonElement,
    );
    await waitFor(() => expect(vueChange?.checkpoint.pageId).toBe('review-page'));
    app.unmount();
    vueContainer.remove();

    defineA3SFormElements();
    const element = document.createElement('a3s-form-renderer') as A3SFormRendererElement;
    element.plan = plan;
    element.value = value;
    element.wizardCheckpoints = { onboarding: checkpoint.checkpoint };
    expect(element.wizardCheckpoints).toEqual({ onboarding: checkpoint.checkpoint });
    let webChange: FormWizardCheckpointChange | undefined;
    element.addEventListener('wizard-checkpoint-change', (event) => {
      webChange = (event as CustomEvent<FormWizardCheckpointChange>).detail;
    });
    document.body.append(element);
    await waitFor(() => expect(element.textContent).toContain('Contact'));
    fireEvent.click(
      Array.from(element.querySelectorAll('button')).find(
        (button) => button.textContent === 'Next step',
      ) as HTMLButtonElement,
    );
    await waitFor(() => expect(webChange?.checkpoint.pageId).toBe('review-page'));
    element.remove();
  });
});
