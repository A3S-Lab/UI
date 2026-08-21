import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyFormPatch,
  type CompileOptions,
  compileForm,
  type FormDocument,
  type FormPatch,
  type JsonObject,
  type JsonPrimitive,
  type JsonSchema,
  type UiMatrixColumn,
  type UiMatrixRow,
  type UiMatrixValue,
  type UiNode,
  type UiOption,
} from '../core';
import { type CanvasDropTarget, DesignerCanvas } from './designer-canvas';
import {
  createDesignerCatalog,
  type DesignerCatalogItem,
  fieldWidgets,
  findCatalogItem,
} from './designer-catalog';
import { DesignerIcon } from './designer-icons';
import { Inspector, type InspectorPanel, type PatchFeedback } from './designer-inspector';
import {
  allocateSchemaProperty,
  findDesignerParent,
  isDesignerContainer,
  schemaBindingForNode,
  schemaForNode,
  schemaPathForProperty,
  schemaScopeForContainer,
} from './designer-schema';
import {
  DesignerToolbar,
  type LeftPanel,
  type MobilePanel,
  MobilePanelBar,
  PalettePanel,
} from './designer-shell';
import type { FormNodeRegistry } from './node-registry';
import { FormRenderer, type FormRendererProps, type FormWidgetRegistry } from './renderer';

export interface FormDesignerProps {
  document: FormDocument;
  onChange: (document: FormDocument) => void;
  widgetRegistry?: FormWidgetRegistry;
  nodeRegistry?: FormNodeRegistry;
  compileOptions?: CompileOptions;
  value?: JsonObject;
  onValueChange?: (value: JsonObject) => void;
  onAction?: FormRendererProps['onAction'];
  hostAdapter?: FormRendererProps['hostAdapter'];
  errors?: FormRendererProps['errors'];
  readOnly?: boolean;
  locale?: string;
  localeCatalog?: FormRendererProps['localeCatalog'];
  wizardCheckpoints?: FormRendererProps['wizardCheckpoints'];
  onWizardCheckpointChange?: FormRendererProps['onWizardCheckpointChange'];
  className?: string;
}

interface DesignerNotice {
  tone: 'info' | 'error';
  message: string;
  undoable?: boolean;
}

const DATA_GRID_PRESET_COLUMNS = [
  { property: 'name', label: '名称', widget: 'text', width: 6 },
  { property: 'quantity', label: '数量', widget: 'number', width: 2 },
  { property: 'notes', label: '备注', widget: 'text', width: 4 },
] as const;

function allocateId(existing: Set<string>, prefix: string): string {
  let index = 1;
  while (existing.has(`${prefix}-${index}`)) index += 1;
  const id = `${prefix}-${index}`;
  existing.add(id);
  return id;
}

function nextId(document: FormDocument, prefix: string): string {
  return allocateId(new Set(document.ui.nodes.map((node) => node.id)), prefix);
}

function nextMatrixColumnValue(
  columns: readonly UiMatrixColumn[],
  usedValues: ReadonlySet<string>,
  preferredIndex: number,
): UiMatrixValue | undefined {
  const valueType = typeof columns[0]?.value;
  if (valueType === 'boolean') {
    return [false, true].find((value) => !usedValues.has(JSON.stringify(value)));
  }
  if (valueType === 'number') {
    let value = preferredIndex;
    while (usedValues.has(JSON.stringify(value))) value += 1;
    return value;
  }
  let suffix = preferredIndex;
  let value = `option-${suffix}`;
  while (usedValues.has(JSON.stringify(value))) {
    suffix += 1;
    value = `option-${suffix}`;
  }
  return value;
}

function nextOptionValue(
  options: readonly UiOption[],
  usedValues: ReadonlySet<string>,
  preferredIndex: number,
): JsonPrimitive | undefined {
  const valueType = typeof options[0]?.value;
  if (valueType === 'boolean') {
    return [false, true].find((value) => !usedValues.has(JSON.stringify(value)));
  }
  if (valueType === 'number') {
    let value = preferredIndex;
    while (usedValues.has(JSON.stringify(value))) value += 1;
    return value;
  }
  let suffix = preferredIndex;
  let value = `option-${suffix}`;
  while (usedValues.has(JSON.stringify(value))) {
    suffix += 1;
    value = `option-${suffix}`;
  }
  return value;
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function reconcileOptionDefault(
  schema: JsonSchema,
  previous: readonly UiOption[],
  options: readonly UiOption[],
  multiple: boolean,
): void {
  const values = options.map(({ value }) => value);
  const resolve = (value: JsonPrimitive): JsonPrimitive | undefined => {
    if (values.some((candidate) => Object.is(candidate, value))) return value;
    const previousIndex = previous.findIndex((candidate) => Object.is(candidate.value, value));
    const previousOption = previous[previousIndex];
    const nextOption = options[previousIndex];
    return previousOption && nextOption && previousOption.label === nextOption.label
      ? nextOption.value
      : undefined;
  };

  if (multiple) {
    if (!Array.isArray(schema.default)) return;
    const next = schema.default.filter(isJsonPrimitive).flatMap((value) => {
      const resolved = resolve(value);
      return resolved === undefined ? [] : [resolved];
    });
    if (next.length > 0) schema.default = next;
    else delete schema.default;
    return;
  }

  if (!isJsonPrimitive(schema.default)) return;
  const next = resolve(schema.default);
  if (next === undefined) delete schema.default;
  else schema.default = next;
}

function syncOptions(document: FormDocument, selectedId: string, options: UiOption[]): void {
  const node = document.ui.nodes.find((candidate) => candidate.id === selectedId);
  const previous = node?.options ?? [];
  if (node) node.options = options.map((option) => ({ ...option }));
  const binding = schemaBindingForNode(document, node);
  if (!binding) return;
  const values = options.map(({ value }) => value);
  if (node?.widget === 'multi-select') {
    binding.schema.items ??= { type: 'string' };
    binding.schema.items.enum = values;
    reconcileOptionDefault(binding.schema, previous, options, true);
  } else binding.schema.enum = values;
  if (node?.widget !== 'multi-select') {
    reconcileOptionDefault(binding.schema, previous, options, false);
  }
}

function syncMatrixRows(document: FormDocument, selectedId: string, rows: UiMatrixRow[]): void {
  if (rows.length === 0) return;
  const node = document.ui.nodes.find((candidate) => candidate.id === selectedId);
  const binding = schemaBindingForNode(document, node);
  if (!node?.matrix || !binding?.schema.properties) return;
  const previousRows = node.matrix.rows;
  const previousProperties = binding.schema.properties;
  const template = Object.values(previousProperties)[0];
  const previousIds = new Set(previousRows.map(({ id }) => id));
  const previousRequired = new Set(binding.schema.required ?? []);
  const allRowsRequired =
    previousRows.length > 0 && previousRows.every(({ id }) => previousRequired.has(id));
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];
  for (const [rowIndex, row] of rows.entries()) {
    const previousRow = previousRows[rowIndex];
    const existing = previousProperties[row.id];
    const renamed = previousRow ? previousProperties[previousRow.id] : undefined;
    const schema = structuredClone(existing ?? renamed ?? template);
    if (!schema) continue;
    schema.title = row.label;
    properties[row.id] = schema;
    if (
      previousRequired.has(row.id) ||
      (previousRow !== undefined && previousRequired.has(previousRow.id)) ||
      (!previousIds.has(row.id) && allRowsRequired)
    ) {
      required.push(row.id);
    }
  }
  node.matrix.rows = rows.map((row) => ({ ...row }));
  binding.schema.properties = properties;
  binding.schema.required = required;
}

function syncMatrixColumns(
  document: FormDocument,
  selectedId: string,
  columns: UiMatrixColumn[],
): void {
  if (columns.length === 0) return;
  const node = document.ui.nodes.find((candidate) => candidate.id === selectedId);
  const binding = schemaBindingForNode(document, node);
  if (!node?.matrix || !binding?.schema.properties) return;
  const values = columns.map(({ value }) => value);
  node.matrix.columns = columns.map((column) => ({ ...column }));
  for (const rowSchema of Object.values(binding.schema.properties)) {
    if (node.widget === 'matrix-multiple') {
      rowSchema.items ??= { type: 'string' };
      rowSchema.items.enum = values;
      if (rowSchema.maxItems !== undefined) {
        rowSchema.maxItems = Math.min(rowSchema.maxItems, values.length);
      }
      if (rowSchema.minItems !== undefined) {
        rowSchema.minItems = Math.min(rowSchema.minItems, values.length);
      }
    } else rowSchema.enum = values;
  }
}

function compileMutation(
  document: FormDocument,
  mutate: (draft: FormDocument) => void,
  options?: CompileOptions,
  onInvalid?: (message: string) => void,
): FormDocument | undefined {
  const draft = structuredClone(document);
  mutate(draft);
  draft.revision += 1;
  delete draft.digest;
  const result = compileForm(draft, options);
  if (!result.ok) {
    onInvalid?.(result.diagnostics[0]?.message ?? '这项修改未通过表单编译校验。');
  }
  return result.ok ? result.document : undefined;
}

function collectDescendants(
  document: FormDocument,
  id: string,
  output = new Set<string>(),
): Set<string> {
  if (output.has(id)) return output;
  output.add(id);
  for (const child of document.ui.nodes.find((node) => node.id === id)?.children ?? [])
    collectDescendants(document, child, output);
  return output;
}

function propertyFromNode(document: FormDocument, node: UiNode | undefined): string | undefined {
  return schemaBindingForNode(document, node)?.property;
}

export function FormDesigner(props: FormDesignerProps) {
  const { document, onChange } = props;
  const compileOptions = useMemo<CompileOptions>(() => {
    const configuredWidgets = Array.from(props.compileOptions?.capabilities?.widgets ?? []);
    return {
      ...props.compileOptions,
      capabilities: {
        ...props.compileOptions?.capabilities,
        widgets: Array.from(
          new Set([
            ...configuredWidgets,
            ...Object.keys(props.widgetRegistry ?? {}),
            ...Object.keys(props.nodeRegistry ?? {}),
          ]),
        ),
      },
    };
  }, [props.compileOptions, props.nodeRegistry, props.widgetRegistry]);
  const compiled = useMemo(() => compileForm(document, compileOptions), [compileOptions, document]);
  const catalog = useMemo(() => createDesignerCatalog(props.nodeRegistry), [props.nodeRegistry]);
  const availableFieldWidgets = useMemo(() => fieldWidgets(catalog), [catalog]);
  const [selectedId, setSelectedId] = useState(
    () =>
      (document.ui.nodes.some((node) => node.id === document.ui.root)
        ? document.ui.nodes.find((node) => node.kind === 'field')?.id
        : undefined) ?? document.ui.root,
  );
  const [mode, setMode] = useState<'design' | 'preview'>('design');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [leftPanel, setLeftPanel] = useState<LeftPanel>('components');
  const [inspectorPanel, setInspectorPanel] = useState<InspectorPanel>('properties');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('canvas');
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [value, setValue] = useState<JsonObject>({});
  const [undoStack, setUndoStack] = useState<FormDocument[]>([]);
  const [redoStack, setRedoStack] = useState<FormDocument[]>([]);
  const [patchText, setPatchText] = useState('');
  const [patchFeedback, setPatchFeedback] = useState<PatchFeedback>();
  const [notice, setNotice] = useState<DesignerNotice>();
  const activeValue = props.value ?? value;
  const selected = document.ui.nodes.find((node) => node.id === selectedId);
  const selectedProperty = propertyFromNode(document, selected);
  const selectedSchema = schemaForNode(document, selected);
  const mutateDocument = (mutate: (draft: FormDocument) => void) =>
    compileMutation(document, mutate, compileOptions, (message) =>
      compiled.ok ? setNotice({ tone: 'error', message }) : undefined,
    );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(undefined), notice.undoable ? 5200 : 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const commit = (next: FormDocument | undefined, nextSelectedId?: string) => {
    if (!next) return;
    setUndoStack((items) => [...items.slice(-49), document]);
    setRedoStack([]);
    onChange(next);
    if (nextSelectedId) setSelectedId(nextSelectedId);
  };

  const addCatalogItem = (item: DesignerCatalogItem, target?: CanvasDropTarget) => {
    const insertionParent = target
      ? document.ui.nodes.find((node) => node.id === target.containerId)
      : document.ui.nodes.find((node) => node.id === document.ui.root);
    if (!isDesignerContainer(document, insertionParent)) {
      setNotice({ tone: 'error', message: '插入位置不可用，请重新选择画布位置。' });
      return;
    }
    if (insertionParent.layout === 'data-grid' && item.kind !== 'field') {
      setNotice({
        tone: 'error',
        message: '数据表格只能直接包含字段。请把布局、内容或重复项拖到表格外。',
      });
      return;
    }
    const existingIds = new Set(document.ui.nodes.map((node) => node.id));
    const prefix = item.extensionKey
      ? 'custom'
      : item.kind === 'field' || item.kind === 'repeater'
        ? 'field'
        : item.kind;
    const nodeId = allocateId(existingIds, prefix);
    const preferredProperty = nodeId.replaceAll('-', '_');
    const next = mutateDocument((draft) => {
      const parent = draft.ui.nodes.find((node) => node.id === insertionParent.id);
      if (!isDesignerContainer(draft, parent)) return;
      const schemaScope = schemaScopeForContainer(draft, parent.id);
      const bindSchema = (schema: JsonSchema | undefined): string => {
        schemaScope.schema.type = 'object';
        schemaScope.schema.properties ??= {};
        const property = allocateSchemaProperty(schemaScope.schema, preferredProperty);
        schemaScope.schema.properties[property] = {
          ...structuredClone(schema ?? {}),
          title: item.label,
        };
        return schemaPathForProperty(schemaScope.pointer, property);
      };
      const defaults = structuredClone(item.defaults ?? {});
      const nodes: UiNode[] = [];
      if (item.extensionKey) {
        const bindsValue = item.kind === 'field' || item.kind === 'repeater';
        nodes.push({
          ...defaults,
          id: nodeId,
          kind: item.kind,
          label: item.label,
          schemaPath: bindsValue ? bindSchema(item.schema) : undefined,
          widget: item.extensionKey,
          children:
            item.kind === 'section' || item.kind === 'group'
              ? (defaults.children ?? [])
              : defaults.children,
          width: defaults.width ?? 12,
        });
      } else if (item.kind === 'field' || item.kind === 'repeater') {
        const schemaPath = bindSchema(item.schema);
        const objectRepeaterPreset =
          item.preset === 'repeater-group' || item.preset === 'data-grid';
        const valueNode: UiNode = {
          ...defaults,
          id: nodeId,
          kind: item.kind,
          label: item.label,
          schemaPath,
          widget: item.widget,
          options: item.options
            ? structuredClone(item.options)
            : defaults.options
              ? structuredClone(defaults.options)
              : undefined,
          layout: item.preset === 'data-grid' ? 'data-grid' : undefined,
          children: objectRepeaterPreset ? [] : undefined,
          columns: objectRepeaterPreset ? 12 : undefined,
          gap: objectRepeaterPreset ? 12 : undefined,
          width: defaults.width ?? 12,
        };
        nodes.push(valueNode);
        if (item.preset === 'data-grid') {
          for (const column of DATA_GRID_PRESET_COLUMNS) {
            const childId = allocateId(existingIds, 'field');
            valueNode.children?.push(childId);
            nodes.push({
              id: childId,
              kind: 'field',
              label: column.label,
              schemaPath: schemaPathForProperty(`${schemaPath}/items`, column.property),
              widget: column.widget,
              width: column.width,
            });
          }
        }
      } else if (item.kind === 'content') {
        nodes.push({
          id: nodeId,
          kind: 'content',
          label: item.label,
          content: item.preset === 'divider' ? '' : '在这里添加说明文字。',
          presentation:
            item.preset === 'divider' || item.preset === 'spacer' ? item.preset : 'text',
          gap: item.preset === 'spacer' ? 24 : undefined,
          width: 12,
        });
      } else {
        const layout =
          item.preset === 'card'
            ? 'card'
            : item.preset === 'columns-2' || item.preset === 'columns-3'
              ? 'columns'
              : item.preset === 'tabs' || item.preset === 'collapse' || item.preset === 'wizard'
                ? item.preset
                : 'grid';
        nodes.push({
          id: nodeId,
          kind: item.kind,
          label: item.label,
          layout,
          columns: 12,
          gap: 16,
          children: [],
          width: 12,
        });
        const columnCount = item.preset === 'columns-2' ? 2 : item.preset === 'columns-3' ? 3 : 0;
        for (let index = 0; index < columnCount; index += 1) {
          const columnId = allocateId(existingIds, 'column');
          nodes.push({
            id: columnId,
            kind: 'group',
            label: `第 ${index + 1} 栏`,
            layout: 'flow',
            columns: 12,
            gap: 12,
            children: [],
            width: columnCount === 2 ? 6 : 4,
          });
          nodes[0].children?.push(columnId);
        }
        if (item.preset === 'tabs' || item.preset === 'collapse' || item.preset === 'wizard') {
          const childCount = item.preset === 'wizard' ? 3 : 2;
          for (let index = 0; index < childCount; index += 1) {
            const childId = allocateId(
              existingIds,
              item.preset === 'tabs' ? 'tab' : item.preset === 'wizard' ? 'step' : 'panel',
            );
            const reviewPage = item.preset === 'wizard' && index === childCount - 1;
            nodes.push({
              id: childId,
              kind: 'group',
              label:
                item.preset === 'tabs'
                  ? `标签页 ${index + 1}`
                  : item.preset === 'wizard'
                    ? reviewPage
                      ? '确认提交'
                      : `步骤 ${index + 1}`
                    : `面板 ${index + 1}`,
              layout:
                item.preset === 'tabs'
                  ? 'tab'
                  : item.preset === 'wizard'
                    ? 'page'
                    : 'collapse-panel',
              pageRole: item.preset === 'wizard' ? (reviewPage ? 'review' : 'form') : undefined,
              columns: 12,
              gap: 12,
              children: [],
              width: 12,
            });
            nodes[0].children?.push(childId);
          }
        }
      }
      draft.ui.nodes.push(...nodes);
      parent.children ??= [];
      const index = target
        ? Math.max(0, Math.min(target.index, parent.children.length))
        : parent.children.length;
      parent.children.splice(index, 0, nodeId);
    });
    commit(next, nodeId);
    setInspectorPanel('properties');
  };

  const updateSelected = (changes: Partial<UiNode>) => {
    commit(
      mutateDocument((draft) => {
        const index = draft.ui.nodes.findIndex((node) => node.id === selectedId);
        if (index >= 0) draft.ui.nodes[index] = { ...draft.ui.nodes[index], ...changes };
      }),
    );
  };

  const updateFieldWidget = (widget: string) => {
    const item = catalog
      .flatMap((section) => section.items)
      .find((candidate) => candidate.kind === 'field' && candidate.widget === widget);
    if (!item) return;
    commit(
      mutateDocument((draft) => {
        const node = draft.ui.nodes.find((candidate) => candidate.id === selectedId);
        const binding = schemaBindingForNode(draft, node);
        if (!node || node.kind !== 'field' || !binding?.parentSchema.properties) return;
        const previous = catalog
          .flatMap((section) => section.items)
          .find((candidate) => candidate.kind === 'field' && candidate.widget === node.widget);
        node.widget = widget;
        if (item.options) node.options = structuredClone(item.options);
        else delete node.options;
        if (item.defaults?.customProps)
          node.customProps = structuredClone(item.defaults.customProps);
        else if (previous?.defaults?.customProps) delete node.customProps;
        if (item.defaults?.matrix) node.matrix = structuredClone(item.defaults.matrix);
        else if (previous?.defaults?.matrix) delete node.matrix;
        for (const property of ['readOnly', 'hidden'] as const) {
          const nextValue = item.defaults?.[property];
          if (nextValue !== undefined) node[property] = nextValue;
          else if (previous?.defaults?.[property] !== undefined) delete node[property];
        }
        const template: JsonSchema = structuredClone(item.schema ?? { type: 'string' });
        if (binding.schema.title !== undefined) template.title = binding.schema.title;
        if (binding.schema.description !== undefined)
          template.description = binding.schema.description;
        binding.parentSchema.properties[binding.property] = template;
      }),
    );
  };

  const updateMetadata = (changes: Partial<FormDocument['metadata']>) => {
    commit(
      mutateDocument((draft) => {
        draft.metadata = { ...draft.metadata, ...changes };
      }),
    );
  };

  const updateSchema = (changes: Partial<JsonSchema>) => {
    if (!selectedProperty) return;
    commit(
      mutateDocument((draft) => {
        const node = draft.ui.nodes.find((candidate) => candidate.id === selectedId);
        const binding = schemaBindingForNode(draft, node);
        if (binding?.parentSchema.properties) {
          binding.parentSchema.properties[binding.property] = {
            ...binding.schema,
            ...changes,
          };
        }
      }),
    );
  };

  const updateCustomNode = (changes: { node?: Partial<UiNode>; schema?: Partial<JsonSchema> }) => {
    if (!changes.node && !changes.schema) return;
    commit(
      mutateDocument((draft) => {
        if (changes.node) {
          const index = draft.ui.nodes.findIndex((node) => node.id === selectedId);
          if (index >= 0) draft.ui.nodes[index] = { ...draft.ui.nodes[index], ...changes.node };
        }
        if (changes.schema && selectedProperty) {
          const node = draft.ui.nodes.find((candidate) => candidate.id === selectedId);
          const binding = schemaBindingForNode(draft, node);
          if (binding?.parentSchema.properties) {
            binding.parentSchema.properties[binding.property] = {
              ...binding.schema,
              ...changes.schema,
            };
          }
        }
      }),
    );
  };

  const setRequired = (required: boolean) => {
    if (!selectedProperty) return;
    commit(
      mutateDocument((draft) => {
        const node = draft.ui.nodes.find((candidate) => candidate.id === selectedId);
        const binding = schemaBindingForNode(draft, node);
        if (!binding) return;
        const requirements = new Set(binding.parentSchema.required ?? []);
        if (required) requirements.add(binding.property);
        else requirements.delete(binding.property);
        binding.parentSchema.required = [...requirements];
        if (binding.schema.type === 'array') {
          binding.schema.minItems = required ? Math.max(1, binding.schema.minItems ?? 0) : 0;
        }
      }),
    );
  };

  const updateOptions = (text: string) => {
    const labels = text
      .split('\n')
      .map((label) => label.trim())
      .filter(Boolean);
    commit(
      mutateDocument((draft) => {
        const node = draft.ui.nodes.find((candidate) => candidate.id === selectedId);
        const previous = node?.options ?? [];
        const usedValues = new Set(previous.map(({ value }) => JSON.stringify(value)));
        const options = labels.flatMap((label, index) => {
          const existing = previous[index];
          if (existing) return [{ ...existing, label }];
          const value = nextOptionValue(previous, usedValues, index + 1);
          if (value === undefined) return [];
          usedValues.add(JSON.stringify(value));
          return [{ label, value }];
        });
        syncOptions(draft, selectedId, options);
      }),
    );
  };

  const replaceOptions = (options: UiOption[]) => {
    commit(
      mutateDocument((draft) => {
        syncOptions(draft, selectedId, options);
      }),
    );
  };

  const updateMatrixRows = (text: string) => {
    const labels = text
      .split('\n')
      .map((label) => label.trim())
      .filter(Boolean);
    commit(
      mutateDocument((draft) => {
        const node = draft.ui.nodes.find((candidate) => candidate.id === selectedId);
        if (!node?.matrix || labels.length === 0) return;
        const previousRows = node.matrix.rows;
        const usedIds = new Set(previousRows.map(({ id }) => id));
        const rows = labels.map((label, index) => {
          const previous = previousRows[index];
          if (previous) return { ...previous, label };
          let suffix = index + 1;
          while (usedIds.has(`row-${suffix}`)) suffix += 1;
          const id = `row-${suffix}`;
          usedIds.add(id);
          return { id, label };
        });
        syncMatrixRows(draft, selectedId, rows);
      }),
    );
  };

  const replaceMatrixRows = (rows: UiMatrixRow[]) => {
    commit(
      mutateDocument((draft) => {
        syncMatrixRows(draft, selectedId, rows);
      }),
    );
  };

  const updateMatrixColumns = (text: string) => {
    const labels = text
      .split('\n')
      .map((label) => label.trim())
      .filter(Boolean);
    commit(
      mutateDocument((draft) => {
        const node = draft.ui.nodes.find((candidate) => candidate.id === selectedId);
        if (!node?.matrix || labels.length === 0) return;
        const previousColumns = node.matrix.columns;
        const usedValues = new Set(previousColumns.map(({ value }) => JSON.stringify(value)));
        const columns = labels.flatMap((label, index) => {
          const previous = previousColumns[index];
          if (previous) return [{ ...previous, label }];
          const value = nextMatrixColumnValue(previousColumns, usedValues, index + 1);
          if (value === undefined) return [];
          usedValues.add(JSON.stringify(value));
          return [{ label, value }];
        });
        syncMatrixColumns(draft, selectedId, columns);
      }),
    );
  };

  const replaceMatrixColumns = (columns: UiMatrixColumn[]) => {
    commit(
      mutateDocument((draft) => {
        syncMatrixColumns(draft, selectedId, columns);
      }),
    );
  };

  const setMatrixRowsRequired = (required: boolean) => {
    commit(
      mutateDocument((draft) => {
        const node = draft.ui.nodes.find((candidate) => candidate.id === selectedId);
        const binding = schemaBindingForNode(draft, node);
        if (!node?.matrix || !binding?.schema.properties) return;
        binding.schema.required = required ? node.matrix.rows.map(({ id }) => id) : [];
        if (node.widget !== 'matrix-multiple') return;
        for (const rowSchema of Object.values(binding.schema.properties)) {
          rowSchema.minItems = required ? Math.max(1, rowSchema.minItems ?? 0) : 0;
        }
      }),
    );
  };

  const updateMatrixLimit = (keyword: 'minItems' | 'maxItems', value: number | undefined) => {
    commit(
      mutateDocument((draft) => {
        const node = draft.ui.nodes.find((candidate) => candidate.id === selectedId);
        const binding = schemaBindingForNode(draft, node);
        if (node?.widget !== 'matrix-multiple' || !binding?.schema.properties) return;
        for (const rowSchema of Object.values(binding.schema.properties)) {
          if (value === undefined) delete rowSchema[keyword];
          else rowSchema[keyword] = value;
        }
      }),
    );
  };

  const removeNode = (nodeId: string, nextSelectedId?: string) => {
    const sourceNode = document.ui.nodes.find((node) => node.id === nodeId);
    if (!sourceNode || sourceNode.id === document.ui.root) return;
    const currentParent = findDesignerParent(document, sourceNode.id);
    if (
      (currentParent?.layout === 'tabs' ||
        currentParent?.layout === 'collapse' ||
        currentParent?.layout === 'wizard') &&
      (currentParent.children?.length ?? 0) <= 1
    )
      return;
    const parentId = currentParent?.id ?? document.ui.root;
    const removed = collectDescendants(document, sourceNode.id);
    const next = mutateDocument((draft) => {
      const removedNodes = document.ui.nodes.filter((node) => removed.has(node.id));
      const schemaRoots = removedNodes.filter(
        (node) =>
          node.schemaPath &&
          !removedNodes.some(
            (candidate) =>
              candidate.id !== node.id &&
              candidate.schemaPath &&
              node.schemaPath?.startsWith(`${candidate.schemaPath}/`),
          ),
      );
      for (const source of schemaRoots) {
        const draftNode = draft.ui.nodes.find((node) => node.id === source.id);
        const binding = schemaBindingForNode(draft, draftNode);
        if (!binding?.parentSchema.properties) continue;
        delete binding.parentSchema.properties[binding.property];
        binding.parentSchema.required = binding.parentSchema.required?.filter(
          (item) => item !== binding.property,
        );
      }
      draft.ui.nodes = draft.ui.nodes
        .filter((node) => !removed.has(node.id))
        .map((node) => ({ ...node, children: node.children?.filter((id) => !removed.has(id)) }));
      draft.rules = draft.rules?.filter((rule) => !removed.has(rule.target));
    });
    if (!next) return;
    const removedLabel = sourceNode.label ?? sourceNode.id;
    commit(next, nextSelectedId ?? parentId);
    setNotice({
      tone: 'info',
      message: `已删除“${removedLabel}”。`,
      undoable: true,
    });
  };

  const removeSelected = () => {
    if (selected) removeNode(selected.id);
  };

  const duplicateNode = (sourceNodeId: string, nextSelectedId?: string) => {
    const sourceNode = document.ui.nodes.find((node) => node.id === sourceNodeId);
    if (!sourceNode || sourceNode.id === document.ui.root) return;
    const sourceIds = [...collectDescendants(document, sourceNode.id)];
    const existingIds = new Set(document.ui.nodes.map((node) => node.id));
    const idMap = new Map<string, string>();
    for (const id of sourceIds) {
      const source = document.ui.nodes.find((node) => node.id === id);
      const prefix =
        source?.kind === 'field' || source?.kind === 'repeater'
          ? 'field'
          : (source?.kind ?? 'node');
      idMap.set(id, allocateId(existingIds, prefix));
    }
    const nodeId = idMap.get(sourceNode.id);
    if (!nodeId) return;
    const next = mutateDocument((draft) => {
      const clones: UiNode[] = [];
      const schemaPathReplacements: Array<{ source: string; clone: string }> = [];
      for (const sourceId of sourceIds) {
        const source = document.ui.nodes.find((node) => node.id === sourceId);
        const cloneId = idMap.get(sourceId);
        if (!source || !cloneId) continue;
        const clone: UiNode = {
          ...structuredClone(source),
          id: cloneId,
          label: sourceId === sourceNode.id ? `${source.label ?? '节点'} 副本` : source.label,
          children: source.children?.map((child) => idMap.get(child) ?? child),
        };
        if (source.schemaPath) {
          const inherited = schemaPathReplacements
            .filter(({ source: path }) => source.schemaPath?.startsWith(`${path}/`))
            .sort((left, right) => right.source.length - left.source.length)[0];
          if (inherited) {
            clone.schemaPath = `${inherited.clone}${source.schemaPath.slice(inherited.source.length)}`;
          } else {
            const sourceBinding = schemaBindingForNode(document, source);
            const draftSource = draft.ui.nodes.find((node) => node.id === source.id);
            const draftBinding = schemaBindingForNode(draft, draftSource);
            if (sourceBinding && draftBinding) {
              draftBinding.parentSchema.properties ??= {};
              const property = allocateSchemaProperty(
                draftBinding.parentSchema,
                `${sourceBinding.property}_copy`,
              );
              draftBinding.parentSchema.properties[property] = structuredClone(
                sourceBinding.schema,
              );
              clone.schemaPath = schemaPathForProperty(draftBinding.parentPointer, property);
              if (sourceBinding.parentSchema.required?.includes(sourceBinding.property)) {
                draftBinding.parentSchema.required ??= [];
                draftBinding.parentSchema.required.push(property);
              }
              schemaPathReplacements.push({
                source: source.schemaPath,
                clone: clone.schemaPath,
              });
            }
          }
        }
        clones.push(clone);
      }
      draft.ui.nodes.push(...clones);
      const parent = findDesignerParent(draft, sourceNode.id);
      const childIndex = parent?.children?.indexOf(sourceNode.id) ?? -1;
      parent?.children?.splice(childIndex + 1, 0, nodeId);
    });
    commit(next, nextSelectedId ?? nodeId);
  };

  const duplicateSelected = () => {
    if (selected) duplicateNode(selected.id);
  };

  const addLayoutItem = () => {
    if (
      !selected ||
      (selected.layout !== 'tabs' && selected.layout !== 'collapse' && selected.layout !== 'wizard')
    )
      return;
    const prefix =
      selected.layout === 'tabs' ? 'tab' : selected.layout === 'wizard' ? 'step' : 'panel';
    const nodeId = nextId(document, prefix);
    const reviewIndex =
      selected.layout === 'wizard'
        ? (selected.children ?? []).findIndex(
            (id) => document.ui.nodes.find((node) => node.id === id)?.pageRole === 'review',
          )
        : -1;
    const insertionIndex = reviewIndex >= 0 ? reviewIndex : (selected.children?.length ?? 0);
    const itemNumber = insertionIndex + 1;
    const next = mutateDocument((draft) => {
      const container = draft.ui.nodes.find((node) => node.id === selected.id);
      if (!container) return;
      container.children ??= [];
      container.children.splice(insertionIndex, 0, nodeId);
      draft.ui.nodes.push({
        id: nodeId,
        kind: 'group',
        label:
          selected.layout === 'tabs'
            ? `标签页 ${itemNumber}`
            : selected.layout === 'wizard'
              ? `步骤 ${itemNumber}`
              : `面板 ${itemNumber}`,
        layout:
          selected.layout === 'tabs'
            ? 'tab'
            : selected.layout === 'wizard'
              ? 'page'
              : 'collapse-panel',
        pageRole: selected.layout === 'wizard' ? 'form' : undefined,
        columns: 12,
        gap: 12,
        children: [],
        width: 12,
      });
    });
    commit(next, nodeId);
  };

  const selectInspectorNode = (nodeId: string) => {
    setSelectedId(nodeId);
    setInspectorPanel('properties');
  };

  const updateLayoutItem = (nodeId: string, changes: Partial<UiNode>) => {
    if (!selected?.children?.includes(nodeId)) return;
    commit(
      mutateDocument((draft) => {
        const container = draft.ui.nodes.find((node) => node.id === selected.id);
        const item = draft.ui.nodes.find((node) => node.id === nodeId);
        if (!container || !item) return;
        Object.assign(item, changes);
        if (container.layout === 'wizard' && changes.pageRole === 'review') {
          for (const childId of container.children ?? []) {
            const child = draft.ui.nodes.find((node) => node.id === childId);
            if (child && child.id !== item.id) child.pageRole = 'form';
          }
          container.children = [
            ...(container.children ?? []).filter((childId) => childId !== item.id),
            item.id,
          ];
        }
      }),
      selected.id,
    );
  };

  const moveLayoutItem = (nodeId: string, direction: -1 | 1) => {
    if (!selected?.children?.includes(nodeId)) return;
    commit(
      mutateDocument((draft) => {
        const container = draft.ui.nodes.find((node) => node.id === selected.id);
        const index = container?.children?.indexOf(nodeId) ?? -1;
        const target = index + direction;
        if (!container?.children || index < 0 || target < 0 || target >= container.children.length)
          return;
        const item = draft.ui.nodes.find((node) => node.id === nodeId);
        const targetItem = draft.ui.nodes.find((node) => node.id === container.children?.[target]);
        if (
          container.layout === 'wizard' &&
          (item?.pageRole === 'review' || targetItem?.pageRole === 'review')
        )
          return;
        [container.children[index], container.children[target]] = [
          container.children[target],
          container.children[index],
        ];
      }),
      selected.id,
    );
  };

  const updateColumnWidths = (widths: UiNode['width'][]) => {
    if (selected?.layout !== 'columns') return;
    commit(
      mutateDocument((draft) => {
        const container = draft.ui.nodes.find((node) => node.id === selected.id);
        for (const [index, childId] of (container?.children ?? []).entries()) {
          const child = draft.ui.nodes.find((node) => node.id === childId);
          if (child && widths[index]) child.width = widths[index];
        }
      }),
      selected.id,
    );
  };

  const moveSelected = (direction: -1 | 1) => {
    if (!selected) return;
    commit(
      mutateDocument((draft) => {
        const parent = findDesignerParent(draft, selected.id);
        const index = parent?.children?.indexOf(selected.id) ?? -1;
        const target = index + direction;
        if (!parent?.children || index < 0 || target < 0 || target >= parent.children.length)
          return;
        [parent.children[index], parent.children[target]] = [
          parent.children[target],
          parent.children[index],
        ];
      }),
    );
  };

  const moveNodeToContainer = (nodeId: string, target: CanvasDropTarget) => {
    if (nodeId === document.ui.root || nodeId === target.containerId) return;
    const descendants = collectDescendants(document, nodeId);
    if (descendants.has(target.containerId)) return;
    const movedNode = document.ui.nodes.find((node) => node.id === nodeId);
    const targetContainer = document.ui.nodes.find((node) => node.id === target.containerId);
    if (targetContainer?.layout === 'data-grid' && movedNode?.kind !== 'field') {
      setNotice({
        tone: 'error',
        message: '数据表格只能直接包含字段。请把布局、内容或重复项拖到表格外。',
      });
      return;
    }
    const sourceParent = findDesignerParent(document, nodeId);
    const sourceIndex = sourceParent?.children?.indexOf(nodeId) ?? -1;
    commit(
      mutateDocument((draft) => {
        const container = draft.ui.nodes.find((node) => node.id === target.containerId);
        if (!isDesignerContainer(draft, container)) return;
        const movedIds = collectDescendants(draft, nodeId);
        const movedNodes = draft.ui.nodes.filter((node) => movedIds.has(node.id));
        const bindingRoots = movedNodes.filter(
          (node) =>
            node.schemaPath &&
            !movedNodes.some(
              (candidate) =>
                candidate.id !== node.id &&
                candidate.schemaPath &&
                node.schemaPath?.startsWith(`${candidate.schemaPath}/`),
            ),
        );
        const targetScope = schemaScopeForContainer(draft, container.id);
        for (const bindingRoot of bindingRoots) {
          const binding = schemaBindingForNode(draft, bindingRoot);
          if (!binding || binding.parentPointer === targetScope.pointer) continue;
          targetScope.schema.type = 'object';
          targetScope.schema.properties ??= {};
          const property = allocateSchemaProperty(targetScope.schema, binding.property);
          const required = binding.parentSchema.required?.includes(binding.property) ?? false;
          targetScope.schema.properties[property] = binding.schema;
          delete binding.parentSchema.properties?.[binding.property];
          binding.parentSchema.required = binding.parentSchema.required?.filter(
            (item) => item !== binding.property,
          );
          if (required) {
            targetScope.schema.required ??= [];
            targetScope.schema.required.push(property);
          }
          const previousPath = bindingRoot.schemaPath as string;
          const nextPath = schemaPathForProperty(targetScope.pointer, property);
          for (const moved of movedNodes) {
            if (moved.schemaPath === previousPath) moved.schemaPath = nextPath;
            else if (moved.schemaPath?.startsWith(`${previousPath}/`)) {
              moved.schemaPath = `${nextPath}${moved.schemaPath.slice(previousPath.length)}`;
            }
          }
        }
        for (const node of draft.ui.nodes)
          node.children = node.children?.filter((child) => child !== nodeId);
        container.children ??= [];
        const adjustment = sourceParent?.id === container.id && sourceIndex < target.index ? -1 : 0;
        const index = Math.max(0, Math.min(target.index + adjustment, container.children.length));
        container.children.splice(index, 0, nodeId);
      }),
      nodeId,
    );
  };

  const undo = useCallback(() => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setUndoStack((items) => items.slice(0, -1));
    setRedoStack((items) => [...items, document]);
    onChange(previous);
    setNotice(undefined);
  }, [document, onChange, undoStack]);

  const redo = useCallback(() => {
    const next = redoStack.at(-1);
    if (!next) return;
    setRedoStack((items) => items.slice(0, -1));
    setUndoStack((items) => [...items, document]);
    onChange(next);
    setNotice(undefined);
  }, [document, onChange, redoStack]);

  const reviewPatch = () => {
    try {
      const patch = JSON.parse(patchText) as FormPatch;
      const result = applyFormPatch(document, patch, compileOptions);
      if (result.ok) {
        commit(result.document);
        setPatchFeedback({
          tone: 'success',
          message: `已应用 ${patch.operations.length} 项受控变更，新 revision 为 ${result.document.revision}。`,
        });
      } else {
        setPatchFeedback({
          tone: 'error',
          message: result.conflicts.map((item) => item.message).join(' '),
        });
      }
    } catch {
      setPatchFeedback({ tone: 'error', message: '补丁不是有效 JSON，请检查后重试。' });
    }
  };

  const updateValue = (next: JsonObject) => {
    setValue(next);
    props.onValueChange?.(next);
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key.toLocaleLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [redo, undo]);

  return (
    <div
      className={[
        'a3s-form-designer',
        `is-${mode}`,
        `is-mobile-panel-${mobilePanel}`,
        leftPanelVisible ? '' : 'is-left-panel-collapsed',
        rightPanelVisible ? '' : 'is-right-panel-collapsed',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-mode={mode}
      data-testid="form-designer"
    >
      <DesignerToolbar
        mode={mode}
        viewport={viewport}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        compiled={compiled.ok}
        leftPanelVisible={leftPanelVisible}
        rightPanelVisible={rightPanelVisible}
        onModeChange={setMode}
        onViewportChange={setViewport}
        onUndo={undo}
        onRedo={redo}
        onToggleLeftPanel={() => setLeftPanelVisible((visible) => !visible)}
        onToggleRightPanel={() => setRightPanelVisible((visible) => !visible)}
      />
      {mode === 'design' && <MobilePanelBar panel={mobilePanel} onPanelChange={setMobilePanel} />}
      <div className={`a3s-form-designer-main is-${mode}`}>
        {mode === 'design' && (
          <PalettePanel
            document={document}
            catalog={catalog}
            selectedId={selectedId}
            panel={leftPanel}
            onPanelChange={setLeftPanel}
            onAdd={(item) => {
              addCatalogItem(item);
              setMobilePanel('canvas');
            }}
            onSelect={(id) => {
              setSelectedId(id);
              setInspectorPanel('properties');
              setMobilePanel('settings');
            }}
          />
        )}
        <main className="a3s-form-canvas" data-testid="designer-canvas">
          <div className="a3s-form-canvas-meta">
            <span className="a3s-form-canvas-context">
              <strong>{mode === 'design' ? '表单画布' : '交互预览'}</strong>
              <small>
                {mode === 'design' ? '点击组件编辑，拖拽调整位置' : '正在使用真实交互与校验规则'}
              </small>
            </span>
            <span
              className={`a3s-form-status-badge ${compiled.ok ? 'success is-ok' : 'danger is-error'}`}
              aria-live="polite"
            >
              {compiled.ok ? '● 编译通过' : `● ${compiled.diagnostics.length} 个问题`}
            </span>
          </div>
          {mode === 'preview' && compiled.plan ? (
            <div className={`a3s-form-preview-stage is-${viewport}`}>
              <FormRenderer
                plan={compiled.plan}
                value={activeValue}
                onChange={updateValue}
                onAction={props.onAction}
                hostAdapter={props.hostAdapter}
                errors={props.errors}
                readOnly={props.readOnly}
                locale={props.locale}
                localeCatalog={props.localeCatalog}
                wizardCheckpoints={props.wizardCheckpoints}
                onWizardCheckpointChange={props.onWizardCheckpointChange}
                widgetRegistry={props.widgetRegistry}
                nodeRegistry={props.nodeRegistry}
              />
            </div>
          ) : (
            <DesignerCanvas
              document={document}
              selectedId={selectedId}
              viewport={viewport}
              nodeRegistry={props.nodeRegistry}
              onSelect={(id) => {
                setSelectedId(id);
                setInspectorPanel('properties');
                setMobilePanel('settings');
              }}
              onCatalogDrop={(catalogId, containerId) => {
                const item = findCatalogItem(catalogId, catalog);
                if (item) addCatalogItem(item, containerId);
              }}
              onNodeDrop={moveNodeToContainer}
              onMove={moveSelected}
              onDuplicate={duplicateSelected}
              onRemove={removeSelected}
            />
          )}
          {!compiled.ok && (
            <div className="a3s-form-diagnostics" role="alert">
              <strong>编译诊断</strong>
              {compiled.diagnostics.map((item) => (
                <p key={`${item.code}-${item.path}-${item.message}`}>
                  {item.path || '/'} · {item.message}
                </p>
              ))}
            </div>
          )}
        </main>
        {mode === 'design' && (
          <Inspector
            document={document}
            selected={selected}
            selectedProperty={selectedProperty}
            selectedSchema={selectedSchema}
            availableFieldWidgets={availableFieldWidgets}
            nodeRegistry={props.nodeRegistry}
            panel={inspectorPanel}
            patchText={patchText}
            patchFeedback={patchFeedback}
            onPanelChange={setInspectorPanel}
            onUpdateNode={updateSelected}
            onUpdateWidget={updateFieldWidget}
            onUpdateMetadata={updateMetadata}
            onUpdateSchema={updateSchema}
            onUpdateCustomNode={updateCustomNode}
            onSetRequired={setRequired}
            onUpdateOptions={updateOptions}
            onReplaceOptions={replaceOptions}
            onUpdateMatrixRows={updateMatrixRows}
            onReplaceMatrixRows={replaceMatrixRows}
            onUpdateMatrixColumns={updateMatrixColumns}
            onReplaceMatrixColumns={replaceMatrixColumns}
            onSetMatrixRowsRequired={setMatrixRowsRequired}
            onUpdateMatrixMinimum={(value) => updateMatrixLimit('minItems', value)}
            onUpdateMatrixMaximum={(value) => updateMatrixLimit('maxItems', value)}
            onAddLayoutItem={addLayoutItem}
            onSelectNode={selectInspectorNode}
            onUpdateLayoutItem={updateLayoutItem}
            onMoveLayoutItem={moveLayoutItem}
            onDuplicateLayoutItem={(nodeId) => duplicateNode(nodeId, selected?.id)}
            onRemoveLayoutItem={(nodeId) => removeNode(nodeId, selected?.id)}
            onUpdateColumnWidths={updateColumnWidths}
            onDuplicate={duplicateSelected}
            onRemove={removeSelected}
            onPatchTextChange={(text) => {
              setPatchText(text);
              setPatchFeedback(undefined);
            }}
            onReviewPatch={reviewPatch}
          />
        )}
      </div>
      {notice && (
        <div
          className={`a3s-form-designer-notice is-${notice.tone}`}
          role={notice.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <DesignerIcon name={notice.tone === 'error' ? 'alert' : 'trash'} size={15} />
          <span>{notice.message}</span>
          {notice.undoable && (
            <button type="button" className="btn" data-variant="ghost" onClick={undo}>
              撤销删除
            </button>
          )}
          <button
            type="button"
            className="btn"
            data-size="icon-xs"
            data-variant="ghost"
            aria-label="关闭提示"
            onClick={() => setNotice(undefined)}
          >
            <DesignerIcon name="close" size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
