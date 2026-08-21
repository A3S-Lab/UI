import type { ComponentType, ReactNode } from 'react';
import type {
  CompiledNode,
  FieldError,
  FormLocaleMessages,
  FormPlan,
  JsonObject,
  JsonSchema,
  JsonValue,
  UiNode,
  UiNodeKind,
  UiOption,
} from '../core';
import type { FormDataSourceState } from './data-source';

export type CustomFormNodeKind = Exclude<UiNodeKind, 'root'>;

export interface FormNodeCatalogDefinition {
  section: string;
  sectionLabel: string;
  label: string;
  description: string;
  glyph: string;
}

export interface FormNodeDesignProps {
  node: UiNode;
  schema?: JsonSchema;
  required: boolean;
}

export interface FormNodeRenderProps {
  id: string;
  node: CompiledNode;
  plan: FormPlan;
  locale: string;
  valuePath?: string;
  rowIndices: readonly number[];
  value: JsonValue | undefined;
  formValue: JsonObject;
  messages: Readonly<FormLocaleMessages>;
  required: boolean;
  disabled: boolean;
  invalid: boolean;
  errors: FieldError[];
  options: UiOption[];
  dataSource: FormDataSourceState;
  children?: ReactNode;
  onChange: (value: JsonValue) => void;
  onFormChange: (value: JsonObject) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

export interface FormNodeInspectorProps {
  node: UiNode;
  schema?: JsonSchema;
  onUpdate: (changes: { node?: Partial<UiNode>; schema?: Partial<JsonSchema> }) => void;
  onUpdateNode: (changes: Partial<UiNode>) => void;
  onUpdateSchema: (changes: Partial<JsonSchema>) => void;
}

export interface FormNodeDefinition {
  kind: CustomFormNodeKind;
  catalog: FormNodeCatalogDefinition;
  schema?: JsonSchema;
  defaults?: Partial<Omit<UiNode, 'id' | 'kind' | 'schemaPath' | 'widget'>>;
  design?: ComponentType<FormNodeDesignProps>;
  render: ComponentType<FormNodeRenderProps>;
  inspector?: ComponentType<FormNodeInspectorProps>;
}

export type FormNodeRegistry = Readonly<Record<string, FormNodeDefinition>>;

export function defineFormNodeRegistry<T extends FormNodeRegistry>(registry: T): T {
  return registry;
}
