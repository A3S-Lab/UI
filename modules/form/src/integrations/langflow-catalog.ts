import source from './langflow-catalog.generated.json';

export interface LangflowCatalogProvenance {
  repository: string;
  revision: string;
  version: string;
  componentIndexSha256: string;
  sourcePath: string;
  categories: number;
  nodes: number;
  fields: number;
}

export interface LangflowRangeSpec {
  min?: number;
  max?: number;
  step?: number;
  step_type?: 'int' | 'float' | string;
}

export interface LangflowTableColumn {
  name: string;
  display_name?: string;
  description?: string;
  type?: string;
  default?: unknown;
  options?: unknown[];
  edit_mode?: string;
  required?: boolean;
  [key: string]: unknown;
}

export interface LangflowFieldDefinition {
  name: string;
  _input_type?: string;
  type?: string;
  display_name?: string;
  info?: string;
  placeholder?: string;
  value?: unknown;
  required?: boolean;
  advanced?: boolean;
  show?: boolean;
  readonly?: boolean;
  password?: boolean;
  multiline?: boolean;
  list?: boolean;
  is_list?: boolean;
  tool_mode?: boolean;
  dynamic?: boolean;
  real_time_refresh?: boolean;
  refresh_button?: boolean;
  combobox?: boolean;
  options?: unknown[];
  input_types?: string[];
  fileTypes?: string[];
  file_types?: string[];
  range_spec?: LangflowRangeSpec;
  rangeSpec?: LangflowRangeSpec;
  table_schema?: LangflowTableColumn[] | { columns?: LangflowTableColumn[] };
  model_type?: string;
  [key: string]: unknown;
}

export interface LangflowOutputDefinition {
  name: string;
  display_name: string;
  types: string[];
  selected?: string;
  group_outputs: boolean;
  allows_loop: boolean;
  tool_mode: boolean;
  info?: string;
}

export interface LangflowNodeDefinition {
  category: string;
  categoryLabel: string;
  type: string;
  display_name: string;
  description: string;
  icon?: string;
  documentation?: string;
  beta: boolean;
  legacy: boolean;
  official: boolean;
  tool_mode: boolean;
  base_classes: string[];
  input_types: string[];
  output_types: string[];
  fields: LangflowFieldDefinition[];
  outputs: LangflowOutputDefinition[];
}

export interface LangflowNodeCategory {
  id: string;
  label: string;
  nodes: readonly LangflowNodeDefinition[];
}

interface GeneratedCatalog {
  schemaVersion: 1;
  provenance: LangflowCatalogProvenance;
  categories: Array<{
    id: string;
    label: string;
    nodes: Array<Omit<LangflowNodeDefinition, 'category' | 'categoryLabel'>>;
  }>;
}

const generated = source as unknown as GeneratedCatalog;

export const LANGFLOW_CATALOG_PROVENANCE: Readonly<LangflowCatalogProvenance> = Object.freeze({
  ...generated.provenance,
});

export const langflowNodeCategories: readonly LangflowNodeCategory[] = generated.categories.map(
  (category) => ({
    id: category.id,
    label: category.label,
    nodes: category.nodes.map((node) => ({
      ...node,
      category: category.id,
      categoryLabel: category.label,
    })),
  }),
);

export const langflowNodeCatalog: readonly LangflowNodeDefinition[] =
  langflowNodeCategories.flatMap((category) => category.nodes);

const nodesByType = new Map(langflowNodeCatalog.map((node) => [node.type, node]));

export function getLangflowNode(type: string): LangflowNodeDefinition | undefined {
  return nodesByType.get(type);
}

export function requireLangflowNode(type: string): LangflowNodeDefinition {
  const node = getLangflowNode(type);
  if (!node) throw new Error(`Unknown Langflow node type: ${type}`);
  return node;
}
