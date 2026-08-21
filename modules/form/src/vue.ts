import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  ref,
  toRaw,
  watch,
} from 'vue';
import type {
  CompileOptions,
  FieldError,
  FormDocument,
  FormHostAdapter,
  FormLocaleCatalogOverride,
  FormPlan,
  FormWizardCheckpoint,
  JsonObject,
} from './core';
import {
  FormDesigner,
  type FormNodeRegistry,
  FormRenderer,
  type FormWidgetRegistry,
} from './react';

export const A3SFormRenderer = defineComponent({
  name: 'A3SFormRenderer',
  props: {
    plan: { type: Object as PropType<FormPlan>, required: true },
    modelValue: { type: Object as PropType<JsonObject>, required: true },
    readOnly: { type: Boolean, default: false },
    errors: { type: Array as PropType<FieldError[]>, default: undefined },
    hostAdapter: { type: Object as PropType<FormHostAdapter>, default: undefined },
    locale: { type: String, default: undefined },
    localeCatalog: { type: Object as PropType<FormLocaleCatalogOverride>, default: undefined },
    nodeRegistry: { type: Object as PropType<FormNodeRegistry>, default: undefined },
    widgetRegistry: { type: Object as PropType<FormWidgetRegistry>, default: undefined },
    wizardCheckpoints: {
      type: Object as PropType<Readonly<Record<string, FormWizardCheckpoint>>>,
      default: undefined,
    },
  },
  emits: ['update:modelValue', 'action', 'wizardCheckpointChange'],
  setup(props, { emit }) {
    const container = ref<HTMLElement>();
    let root: Root | undefined;
    const renderReact = () => {
      root?.render(
        createElement(FormRenderer, {
          plan: toRaw(props.plan),
          value: toRaw(props.modelValue),
          readOnly: props.readOnly,
          errors: props.errors ? toRaw(props.errors) : undefined,
          hostAdapter: props.hostAdapter ? toRaw(props.hostAdapter) : undefined,
          locale: props.locale,
          localeCatalog: props.localeCatalog ? toRaw(props.localeCatalog) : undefined,
          nodeRegistry: props.nodeRegistry ? toRaw(props.nodeRegistry) : undefined,
          widgetRegistry: props.widgetRegistry ? toRaw(props.widgetRegistry) : undefined,
          wizardCheckpoints: props.wizardCheckpoints ? toRaw(props.wizardCheckpoints) : undefined,
          onChange: (value) => emit('update:modelValue', value),
          onAction: (actionId, value) => emit('action', { actionId, value }),
          onWizardCheckpointChange: (change) => emit('wizardCheckpointChange', change),
        }),
      );
    };
    onMounted(() => {
      root = createRoot(container.value as HTMLElement);
      renderReact();
    });
    watch(
      () => [
        props.plan,
        props.modelValue,
        props.readOnly,
        props.errors,
        props.hostAdapter,
        props.locale,
        props.localeCatalog,
        props.nodeRegistry,
        props.widgetRegistry,
        props.wizardCheckpoints,
      ],
      renderReact,
      { deep: true },
    );
    onBeforeUnmount(() => root?.unmount());
    return () => h('div', { ref: container, class: 'a3s-form-vue-host' });
  },
});

export const A3SFormDesigner = defineComponent({
  name: 'A3SFormDesigner',
  props: {
    document: { type: Object as PropType<FormDocument>, required: true },
    modelValue: { type: Object as PropType<JsonObject>, default: () => ({}) },
    compileOptions: { type: Object as PropType<CompileOptions>, default: undefined },
    errors: { type: Array as PropType<FieldError[]>, default: undefined },
    hostAdapter: { type: Object as PropType<FormHostAdapter>, default: undefined },
    locale: { type: String, default: undefined },
    localeCatalog: { type: Object as PropType<FormLocaleCatalogOverride>, default: undefined },
    nodeRegistry: { type: Object as PropType<FormNodeRegistry>, default: undefined },
    readOnly: { type: Boolean, default: false },
    widgetRegistry: { type: Object as PropType<FormWidgetRegistry>, default: undefined },
    wizardCheckpoints: {
      type: Object as PropType<Readonly<Record<string, FormWizardCheckpoint>>>,
      default: undefined,
    },
  },
  emits: ['update:document', 'update:modelValue', 'action', 'wizardCheckpointChange'],
  setup(props, { emit }) {
    const container = ref<HTMLElement>();
    let root: Root | undefined;
    const renderReact = () => {
      root?.render(
        createElement(FormDesigner, {
          document: toRaw(props.document),
          value: toRaw(props.modelValue),
          compileOptions: props.compileOptions ? toRaw(props.compileOptions) : undefined,
          errors: props.errors ? toRaw(props.errors) : undefined,
          hostAdapter: props.hostAdapter ? toRaw(props.hostAdapter) : undefined,
          locale: props.locale,
          localeCatalog: props.localeCatalog ? toRaw(props.localeCatalog) : undefined,
          nodeRegistry: props.nodeRegistry ? toRaw(props.nodeRegistry) : undefined,
          readOnly: props.readOnly,
          widgetRegistry: props.widgetRegistry ? toRaw(props.widgetRegistry) : undefined,
          wizardCheckpoints: props.wizardCheckpoints ? toRaw(props.wizardCheckpoints) : undefined,
          onChange: (document) => emit('update:document', document),
          onValueChange: (value) => emit('update:modelValue', value),
          onAction: (actionId, value) => emit('action', { actionId, value }),
          onWizardCheckpointChange: (change) => emit('wizardCheckpointChange', change),
        }),
      );
    };
    onMounted(() => {
      root = createRoot(container.value as HTMLElement);
      renderReact();
    });
    watch(
      () => [
        props.document,
        props.modelValue,
        props.compileOptions,
        props.errors,
        props.hostAdapter,
        props.locale,
        props.localeCatalog,
        props.nodeRegistry,
        props.readOnly,
        props.widgetRegistry,
        props.wizardCheckpoints,
      ],
      renderReact,
      { deep: true },
    );
    onBeforeUnmount(() => root?.unmount());
    return () => h('div', { ref: container, class: 'a3s-form-vue-host' });
  },
});
