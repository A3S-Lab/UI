import { canonicalize, digestDocument, sealDocument } from './canonical';
import {
  DATA_SOURCE_LIMITS,
  DEFAULT_COMPILER_LIMITS,
  DEFAULT_WIDGETS,
  MATRIX_LIMITS,
} from './compiler-contract';
import { analyzeExpression } from './expression';
import {
  getAtPointer,
  isValuePathScopeCompatible,
  schemaPointerToValuePathTemplate,
} from './pointer';
import { hasPortableJsonGraph, portableDocumentDiagnostic } from './portable-input';
import {
  A3S_FORM_SCHEMA_PROFILE_1_ID,
  inspectSchemaProfile,
  isJsonValue,
  jsonValuesEqual,
} from './schema-profile';
import type {
  CompiledNode,
  CompileOptions,
  CompileResult,
  FormDiagnostic,
  FormDocument,
  FormPlan,
  FormRule,
  JsonSchema,
  UiNode,
} from './types';

const MATRIX_WIDGETS = new Set(['matrix-single', 'matrix-multiple']);

const DATA_SOURCE_KEYS = new Set([
  'id',
  'registryKey',
  'parameters',
  'dependencies',
  'trigger',
  'searchable',
  'debounceMs',
  'pageSize',
  'cacheTtlMs',
]);

const SUPPORTED_LAYOUTS = new Set([
  'flow',
  'grid',
  'columns',
  'card',
  'tabs',
  'tab',
  'collapse',
  'collapse-panel',
  'data-grid',
  'wizard',
  'page',
]);

function diagnostic(
  code: string,
  message: string,
  path: string,
  severity: FormDiagnostic['severity'] = 'error',
  hint?: string,
): FormDiagnostic {
  return { code, message, path, severity, hint };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBoundedInteger(value: unknown, minimum: number, maximum: number): value is number {
  return (
    Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum
  );
}

type ReferenceCompileResult = Omit<CompileResult, 'compilerRevision'>;

function invalidInputResult(): ReferenceCompileResult {
  return {
    ok: false,
    diagnostics: [portableDocumentDiagnostic()],
  };
}

function matrixValueType(value: unknown): 'string' | 'number' | 'boolean' | undefined {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  return undefined;
}

function schemaAcceptsMatrixType(
  schema: JsonSchema | undefined,
  valueType: 'string' | 'number' | 'boolean',
): boolean {
  if (!schema) return false;
  if (valueType === 'number') return schema.type === 'number' || schema.type === 'integer';
  return schema.type === valueType;
}

function enumMatches(values: unknown, expected: readonly unknown[]): boolean {
  return (
    Array.isArray(values) &&
    values.length === expected.length &&
    expected.every((value) => values.some((candidate) => jsonValuesEqual(candidate, value)))
  );
}

function inspectMatrixNode(
  sourceNode: Record<string, unknown>,
  index: number,
  node: CompiledNode | undefined,
  diagnostics: FormDiagnostic[],
): void {
  const path = `/ui/nodes/${index}`;
  const widget = typeof sourceNode.widget === 'string' ? sourceNode.widget : undefined;
  const matrixWidget = widget !== undefined && MATRIX_WIDGETS.has(widget);
  if (!matrixWidget) {
    if (sourceNode.matrix !== undefined) {
      diagnostics.push(
        diagnostic(
          'matrix.scope',
          'matrix is available only on matrix-single or matrix-multiple fields.',
          `${path}/matrix`,
        ),
      );
    }
    return;
  }
  if (node?.kind !== 'field') {
    diagnostics.push(
      diagnostic('matrix.container', 'Matrix widgets must use field nodes.', `${path}/kind`),
    );
  }
  if (sourceNode.options !== undefined || sourceNode.dataSource !== undefined) {
    diagnostics.push(
      diagnostic(
        'matrix.options_source',
        'Matrix columns must be declared by matrix.columns and cannot use options or dataSource.',
        path,
      ),
    );
  }
  if (!isRecord(sourceNode.matrix)) {
    diagnostics.push(
      diagnostic(
        'matrix.definition',
        'Matrix fields must declare a matrix object containing rows and columns.',
        `${path}/matrix`,
      ),
    );
    return;
  }
  const rows = sourceNode.matrix.rows;
  const columns = sourceNode.matrix.columns;
  if (!Array.isArray(rows) || !Array.isArray(columns)) {
    diagnostics.push(
      diagnostic(
        'matrix.definition',
        'matrix.rows and matrix.columns must be arrays.',
        `${path}/matrix`,
      ),
    );
    return;
  }
  if (rows.length === 0) {
    diagnostics.push(
      diagnostic('matrix.rows', 'A matrix must contain at least one row.', `${path}/matrix/rows`),
    );
  }
  if (columns.length === 0) {
    diagnostics.push(
      diagnostic(
        'matrix.columns',
        'A matrix must contain at least one column.',
        `${path}/matrix/columns`,
      ),
    );
  }
  if (
    rows.length > MATRIX_LIMITS.maxRows ||
    columns.length > MATRIX_LIMITS.maxColumns ||
    rows.length * columns.length > MATRIX_LIMITS.maxCells
  ) {
    diagnostics.push(
      diagnostic(
        'matrix.limits',
        `A matrix may contain at most ${MATRIX_LIMITS.maxRows} rows, ${MATRIX_LIMITS.maxColumns} columns, and ${MATRIX_LIMITS.maxCells} cells.`,
        `${path}/matrix`,
      ),
    );
  }

  const rowIds = new Set<string>();
  let validRows = true;
  for (const [rowIndex, row] of rows.entries()) {
    const rowPath = `${path}/matrix/rows/${rowIndex}`;
    if (
      !isRecord(row) ||
      typeof row.id !== 'string' ||
      row.id.length === 0 ||
      row.id.includes('.') ||
      row.id === '*' ||
      typeof row.label !== 'string' ||
      row.label.trim().length === 0 ||
      (row.description !== undefined && typeof row.description !== 'string') ||
      (row.disabled !== undefined && typeof row.disabled !== 'boolean')
    ) {
      validRows = false;
      diagnostics.push(
        diagnostic(
          'matrix.row',
          'Matrix rows must contain a valid stable id and a non-empty label.',
          rowPath,
        ),
      );
      continue;
    }
    if (rowIds.has(row.id)) {
      validRows = false;
      diagnostics.push(
        diagnostic(
          'matrix.row_duplicate',
          `Matrix row ID ${row.id} is duplicated.`,
          `${rowPath}/id`,
        ),
      );
    }
    rowIds.add(row.id);
  }

  const columnValues: unknown[] = [];
  let columnType: 'string' | 'number' | 'boolean' | undefined;
  let validColumns = true;
  for (const [columnIndex, column] of columns.entries()) {
    const columnPath = `${path}/matrix/columns/${columnIndex}`;
    const valueType = isRecord(column) ? matrixValueType(column.value) : undefined;
    if (
      !isRecord(column) ||
      typeof column.label !== 'string' ||
      column.label.trim().length === 0 ||
      valueType === undefined ||
      (column.disabled !== undefined && typeof column.disabled !== 'boolean')
    ) {
      validColumns = false;
      diagnostics.push(
        diagnostic(
          'matrix.column',
          'Matrix columns must contain a non-empty label and a string, number, or boolean value.',
          columnPath,
        ),
      );
      continue;
    }
    if (columnType !== undefined && columnType !== valueType) {
      validColumns = false;
      diagnostics.push(
        diagnostic(
          'matrix.column_type',
          'All column values in a matrix must use the same primitive type.',
          `${columnPath}/value`,
        ),
      );
    }
    columnType ??= valueType;
    if (columnValues.some((candidate) => jsonValuesEqual(candidate, column.value))) {
      validColumns = false;
      diagnostics.push(
        diagnostic(
          'matrix.column_duplicate',
          `Matrix column value ${String(column.value)} is duplicated.`,
          `${columnPath}/value`,
        ),
      );
    }
    columnValues.push(column.value);
  }
  if (!validRows || !validColumns || !columnType || !node?.schema) return;

  const schema = node.schema;
  if (schema.type !== 'object' || !schema.properties || schema.additionalProperties !== false) {
    diagnostics.push(
      diagnostic(
        'matrix.schema_type',
        'Matrix fields must bind to an object schema with additionalProperties set to false.',
        `${path}/schemaPath`,
      ),
    );
    return;
  }
  const propertyIds = Object.keys(schema.properties);
  if (propertyIds.length !== rowIds.size || propertyIds.some((property) => !rowIds.has(property))) {
    diagnostics.push(
      diagnostic(
        'matrix.schema_properties',
        'Matrix schema properties must exactly match the IDs in matrix.rows.',
        `${path}/schemaPath`,
      ),
    );
  }
  for (const rowId of rowIds) {
    const rowSchema = schema.properties[rowId];
    const validSingle =
      widget === 'matrix-single' &&
      schemaAcceptsMatrixType(rowSchema, columnType) &&
      enumMatches(rowSchema?.enum, columnValues);
    const validMultiple =
      widget === 'matrix-multiple' &&
      rowSchema?.type === 'array' &&
      rowSchema.uniqueItems === true &&
      schemaAcceptsMatrixType(rowSchema.items, columnType) &&
      enumMatches(rowSchema.items?.enum, columnValues) &&
      (rowSchema.minItems === undefined || rowSchema.minItems <= columns.length) &&
      (rowSchema.maxItems === undefined || rowSchema.maxItems <= columns.length);
    if (validSingle || validMultiple) continue;
    diagnostics.push(
      diagnostic(
        'matrix.row_schema',
        `Matrix row ${rowId} schema does not match the ${widget} column contract.`,
        `${path}/schemaPath`,
      ),
    );
  }
}

function normalize(document: FormDocument): FormDocument {
  const normalized = structuredClone(document);
  normalized.metadata.locale ??= 'zh-CN';
  normalized.metadata.tags ??= [];
  normalized.rules ??= [];
  normalized.dataSources ??= [];
  normalized.actions ??= [];
  for (const source of normalized.dataSources) {
    source.parameters ??= {};
    source.dependencies ??= [];
    source.trigger ??= 'mount';
    source.searchable ??= false;
    source.cacheTtlMs ??= 0;
    source.debounceMs ??= 250;
    source.pageSize ??= 50;
  }
  for (const node of normalized.ui.nodes) {
    if (node.kind !== 'field' && node.kind !== 'content') node.children ??= [];
    if (node.kind === 'field') node.widget ??= 'text';
    if (node.layout === 'page') node.pageRole ??= 'form';
    node.width ??= 12;
  }
  return sealDocument(normalized);
}

function schemaHasValuePath(schema: JsonSchema, path: string): boolean {
  let current: JsonSchema = schema;
  for (const segment of path.split('.')) {
    if (segment === '*') {
      if (current.type !== 'array' || !current.items) return false;
      current = current.items;
      continue;
    }
    const child = current.properties?.[segment];
    if (!child) return false;
    current = child;
  }
  return true;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function inspectStructure(input: unknown, diagnostics: FormDiagnostic[]): input is FormDocument {
  if (!isRecord(input)) {
    diagnostics.push(diagnostic('document.type', 'Form document must be a JSON object.', ''));
    return false;
  }
  if (input.kind !== 'a3s.form')
    diagnostics.push(diagnostic('document.kind', 'kind must be a3s.form.', '/kind'));
  if (input.apiVersion !== 'a3s.dev/form/v1alpha1') {
    diagnostics.push(
      diagnostic(
        'document.api_version',
        'Unsupported Form document apiVersion.',
        '/apiVersion',
        'error',
        'Use a3s.dev/form/v1alpha1.',
      ),
    );
  }
  if (!isRecord(input.schema))
    diagnostics.push(diagnostic('schema.type', 'schema must be a JSON Schema object.', '/schema'));
  if (!isRecord(input.ui)) diagnostics.push(diagnostic('ui.type', 'ui must be an object.', '/ui'));
  else {
    if (typeof input.ui.root !== 'string')
      diagnostics.push(diagnostic('ui.root', 'ui.root must reference a root node ID.', '/ui/root'));
    if (!Array.isArray(input.ui.nodes))
      diagnostics.push(diagnostic('ui.nodes', 'ui.nodes must be an array.', '/ui/nodes'));
  }
  if (!isRecord(input.metadata) || typeof input.metadata.title !== 'string') {
    diagnostics.push(
      diagnostic('metadata.title', 'metadata.title must be a string.', '/metadata/title'),
    );
  }
  if (!Number.isSafeInteger(input.revision) || (input.revision as number) < 0) {
    diagnostics.push(
      diagnostic('document.revision', 'revision must be a non-negative safe integer.', '/revision'),
    );
  }
  for (const [field, code] of [
    ['rules', 'rules.type'],
    ['dataSources', 'data_source.type'],
    ['actions', 'action.type'],
  ] as const) {
    if (input[field] !== undefined && !Array.isArray(input[field])) {
      diagnostics.push(diagnostic(code, `${field} must be an array when present.`, `/${field}`));
    }
  }
  return !diagnostics.some((item) => item.severity === 'error');
}

function computedDependencyOrder(
  rules: FormRule[],
  nodes: Map<string, CompiledNode>,
  diagnostics: FormDiagnostic[],
): string[] {
  const computedRules = rules.filter((rule) => rule.kind === 'computed');
  const computedTargets = new Map(computedRules.map((rule) => [rule.target, rule]));
  const targetByPath = new Map<string, string>();
  for (const target of computedTargets.keys()) {
    const node = nodes.get(target);
    const path = node?.valuePathTemplate ?? node?.valuePath;
    if (path) targetByPath.set(path, target);
  }
  const graph = new Map<string, Set<string>>();
  for (const rule of computedRules) {
    const dependencies = graph.get(rule.target) ?? new Set<string>();
    graph.set(rule.target, dependencies);
    for (const path of analyzeExpression(rule.expression).fieldPaths) {
      const dependency = targetByPath.get(path);
      if (dependency) dependencies.add(dependency);
    }
  }
  const state = new Map<string, 'visiting' | 'visited'>();
  const stack: string[] = [];
  const order: string[] = [];
  let cycle = false;
  const visit = (id: string): void => {
    if (state.get(id) === 'visited') return;
    if (state.get(id) === 'visiting') {
      if (!cycle) {
        const start = stack.indexOf(id);
        const path = [...stack.slice(start), id];
        diagnostics.push(
          diagnostic(
            'rules.cycle',
            `Computed rule dependency cycle: ${path.join(' -> ')}.`,
            '/rules',
            'error',
            'Remove the circular computed dependency.',
          ),
        );
      }
      cycle = true;
      return;
    }
    state.set(id, 'visiting');
    stack.push(id);
    for (const dependency of [...(graph.get(id) ?? [])].sort()) visit(dependency);
    stack.pop();
    state.set(id, 'visited');
    order.push(id);
  };
  for (const id of [...graph.keys()].sort()) visit(id);
  return cycle ? [] : order;
}

function compileFormInternal(input: unknown, options: CompileOptions): ReferenceCompileResult {
  const diagnostics: FormDiagnostic[] = [];
  if (!inspectStructure(input, diagnostics)) return { ok: false, diagnostics };
  const document = input as FormDocument;
  const limits = { ...DEFAULT_COMPILER_LIMITS, ...options.limits };
  let serializedDocument: string | undefined;
  try {
    serializedDocument = canonicalize(document);
  } catch {
    try {
      serializedDocument = JSON.stringify(document);
    } catch {
      serializedDocument = undefined;
    }
  }
  const serializedBytes =
    serializedDocument === undefined
      ? undefined
      : new TextEncoder().encode(serializedDocument).byteLength;
  if (serializedBytes !== undefined && serializedBytes > limits.maxSerializedBytes) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'limits.document_size',
          `canonical document is ${serializedBytes} bytes; the configured limit is ${limits.maxSerializedBytes} bytes`,
          '/document',
        ),
      ],
    };
  }
  diagnostics.push(...inspectSchemaProfile(document.schema));
  const digest = typeof document.digest === 'string' ? document.digest : undefined;
  if (options.requireDigest && !digest) {
    diagnostics.push(
      diagnostic('digest.required', 'Published forms must contain a digest.', '/digest'),
    );
  }
  if (document.digest !== undefined && digest === undefined) {
    diagnostics.push(
      diagnostic('digest.mismatch', 'digest must be a sha256 string when present.', '/digest'),
    );
  } else if (digest && digest !== digestDocument(document)) {
    diagnostics.push(
      diagnostic(
        'digest.mismatch',
        'digest does not match the current document content.',
        '/digest',
        'error',
        'Seal the document again before publishing.',
      ),
    );
  }

  const sourceNodes = document.ui.nodes;
  if (sourceNodes.length > limits.maxNodes) {
    diagnostics.push(
      diagnostic(
        'limits.nodes',
        `Node count exceeds the configured limit of ${limits.maxNodes}.`,
        '/ui/nodes',
      ),
    );
  }
  const nodes = new Map<string, CompiledNode>();
  for (const [index, node] of sourceNodes.entries()) {
    const path = `/ui/nodes/${index}`;
    if (!isRecord(node) || typeof node.id !== 'string' || !node.id.trim()) {
      diagnostics.push(diagnostic('node.id', 'Every node must have a non-empty id.', `${path}/id`));
      continue;
    }
    if (nodes.has(node.id)) {
      diagnostics.push(
        diagnostic('node.duplicate', `Node ID ${node.id} is duplicated.`, `${path}/id`),
      );
      continue;
    }
    if (!['root', 'section', 'group', 'field', 'repeater', 'content'].includes(node.kind)) {
      diagnostics.push(
        diagnostic('node.kind', `Node ${node.id} has an unsupported kind.`, `${path}/kind`),
      );
      continue;
    }
    if (node.layout !== undefined && !SUPPORTED_LAYOUTS.has(node.layout as string)) {
      diagnostics.push(
        diagnostic('node.layout', `Node ${node.id} uses an unsupported layout.`, `${path}/layout`),
      );
    }
    if (node.pageRole !== undefined && !['form', 'review'].includes(node.pageRole as string)) {
      diagnostics.push(
        diagnostic(
          'wizard.page_role',
          `Node ${node.id} uses an unsupported wizard page role.`,
          `${path}/pageRole`,
        ),
      );
    }
    const children: string[] = [];
    if (node.children !== undefined) {
      if (!Array.isArray(node.children)) {
        diagnostics.push(
          diagnostic('node.children', 'Node children must be an array.', `${path}/children`),
        );
      } else {
        for (const [childIndex, child] of node.children.entries()) {
          if (typeof child === 'string') children.push(child);
          else {
            diagnostics.push(
              diagnostic(
                'node.child',
                'Node child references must be strings.',
                `${path}/children/${childIndex}`,
              ),
            );
          }
        }
      }
    }
    let schema: import('./types').JsonSchema | undefined;
    let valuePath: string | undefined;
    let valuePathTemplate: string | undefined;
    if (node.kind === 'field' || node.kind === 'repeater') {
      if (!node.schemaPath)
        diagnostics.push(
          diagnostic(
            'node.schema_path',
            `Node ${node.id} is missing schemaPath.`,
            `${path}/schemaPath`,
          ),
        );
      else {
        try {
          const resolvedSchema = getAtPointer(document.schema, node.schemaPath);
          valuePathTemplate = schemaPointerToValuePathTemplate(node.schemaPath);
          valuePath = valuePathTemplate?.includes('*') ? undefined : valuePathTemplate;
          if (!isRecord(resolvedSchema) || !valuePathTemplate) {
            diagnostics.push(
              diagnostic(
                'node.schema_reference',
                `Node ${node.id} schemaPath does not resolve to a value schema.`,
                `${path}/schemaPath`,
              ),
            );
          } else schema = resolvedSchema as import('./types').JsonSchema;
        } catch {
          diagnostics.push(
            diagnostic(
              'node.schema_reference',
              `Node ${node.id} schemaPath is not a valid JSON Pointer.`,
              `${path}/schemaPath`,
            ),
          );
        }
      }
    }
    nodes.set(node.id, {
      ...(node as UiNode),
      children,
      schema,
      valuePath,
      valuePathTemplate,
      depth: 0,
    });
  }
  if (!nodes.has(document.ui.root)) {
    diagnostics.push(
      diagnostic('ui.root_reference', 'ui.root references a node that does not exist.', '/ui/root'),
    );
  }

  const customWidgets = options.capabilities?.widgets ?? [];
  const widgets = new Set<string>([...DEFAULT_WIDGETS, ...customWidgets]);
  const dataSourceCapabilities = new Set(options.capabilities?.dataSources ?? []);
  const actionCapabilities = new Set(options.capabilities?.actions ?? []);
  for (const [index, node] of sourceNodes.entries()) {
    if (!isRecord(node)) continue;
    const compiledNode = typeof node.id === 'string' ? nodes.get(node.id) : undefined;
    inspectMatrixNode(node, index, compiledNode, diagnostics);
    if (node.dataGrid !== undefined) {
      if (node.layout !== 'data-grid') {
        diagnostics.push(
          diagnostic(
            'data_grid.config_scope',
            `Node ${String(node.id)} may declare dataGrid only when layout is data-grid.`,
            `/ui/nodes/${index}/dataGrid`,
          ),
        );
      }
      if (!isRecord(node.dataGrid)) {
        diagnostics.push(
          diagnostic(
            'data_grid.config',
            `Data grid ${String(node.id)} must use an object configuration.`,
            `/ui/nodes/${index}/dataGrid`,
          ),
        );
      } else {
        if (
          node.dataGrid.editMode !== undefined &&
          !['inline', 'dialog'].includes(node.dataGrid.editMode as string)
        ) {
          diagnostics.push(
            diagnostic(
              'data_grid.edit_mode',
              `Data grid ${String(node.id)} uses an unsupported edit mode.`,
              `/ui/nodes/${index}/dataGrid/editMode`,
            ),
          );
        }
        if (
          node.dataGrid.selection !== undefined &&
          !['none', 'multiple'].includes(node.dataGrid.selection as string)
        ) {
          diagnostics.push(
            diagnostic(
              'data_grid.selection',
              `Data grid ${String(node.id)} uses an unsupported selection mode.`,
              `/ui/nodes/${index}/dataGrid/selection`,
            ),
          );
        }
        if (
          node.dataGrid.sorting !== undefined &&
          !['none', 'single'].includes(node.dataGrid.sorting as string)
        ) {
          diagnostics.push(
            diagnostic(
              'data_grid.sorting',
              `Data grid ${String(node.id)} uses an unsupported sorting mode.`,
              `/ui/nodes/${index}/dataGrid/sorting`,
            ),
          );
        }
        if (
          node.dataGrid.filtering !== undefined &&
          !['none', 'search'].includes(node.dataGrid.filtering as string)
        ) {
          diagnostics.push(
            diagnostic(
              'data_grid.filtering',
              `Data grid ${String(node.id)} uses an unsupported filtering mode.`,
              `/ui/nodes/${index}/dataGrid/filtering`,
            ),
          );
        }
        if (
          node.dataGrid.paste !== undefined &&
          !['none', 'append'].includes(node.dataGrid.paste as string)
        ) {
          diagnostics.push(
            diagnostic(
              'data_grid.paste',
              `Data grid ${String(node.id)} uses an unsupported paste mode.`,
              `/ui/nodes/${index}/dataGrid/paste`,
            ),
          );
        }
        if (
          node.dataGrid.fill !== undefined &&
          !['none', 'down'].includes(node.dataGrid.fill as string)
        ) {
          diagnostics.push(
            diagnostic(
              'data_grid.fill',
              `Data grid ${String(node.id)} uses an unsupported fill mode.`,
              `/ui/nodes/${index}/dataGrid/fill`,
            ),
          );
        }
        if (node.dataGrid.fill === 'down' && node.dataGrid.selection !== 'multiple') {
          diagnostics.push(
            diagnostic(
              'data_grid.fill_selection',
              `Data grid ${String(node.id)} requires multiple selection for fill down.`,
              `/ui/nodes/${index}/dataGrid/fill`,
            ),
          );
        }
        if (node.dataGrid.virtualization !== undefined) {
          if (!isRecord(node.dataGrid.virtualization)) {
            diagnostics.push(
              diagnostic(
                'data_grid.virtualization',
                `Data grid ${String(node.id)} must use an object virtualization configuration.`,
                `/ui/nodes/${index}/dataGrid/virtualization`,
              ),
            );
          } else {
            if (node.dataGrid.virtualization.mode !== 'rows') {
              diagnostics.push(
                diagnostic(
                  'data_grid.virtualization_mode',
                  `Data grid ${String(node.id)} uses an unsupported virtualization mode.`,
                  `/ui/nodes/${index}/dataGrid/virtualization/mode`,
                ),
              );
            }
            if (
              node.dataGrid.virtualization.viewportHeight !== undefined &&
              !isBoundedInteger(node.dataGrid.virtualization.viewportHeight, 240, 960)
            ) {
              diagnostics.push(
                diagnostic(
                  'data_grid.virtualization_height',
                  `Data grid ${String(node.id)} virtualization viewport height must be an integer from 240 to 960.`,
                  `/ui/nodes/${index}/dataGrid/virtualization/viewportHeight`,
                ),
              );
            }
            if (
              node.dataGrid.virtualization.overscan !== undefined &&
              !isBoundedInteger(node.dataGrid.virtualization.overscan, 2, 24)
            ) {
              diagnostics.push(
                diagnostic(
                  'data_grid.virtualization_overscan',
                  `Data grid ${String(node.id)} virtualization overscan must be an integer from 2 to 24.`,
                  `/ui/nodes/${index}/dataGrid/virtualization/overscan`,
                ),
              );
            }
            if (node.dataGrid.editMode !== 'dialog') {
              diagnostics.push(
                diagnostic(
                  'data_grid.virtualization_edit_mode',
                  `Data grid ${String(node.id)} requires dialog editing when row virtualization is enabled.`,
                  `/ui/nodes/${index}/dataGrid/virtualization`,
                ),
              );
            }
          }
        }
      }
    }
    if (typeof node.widget === 'string' && !widgets.has(node.widget)) {
      diagnostics.push(
        diagnostic(
          'capability.widget',
          `Widget ${node.widget} is not registered.`,
          `/ui/nodes/${index}/widget`,
        ),
      );
    }
    if (
      typeof node.dataSource === 'string' &&
      !(document.dataSources ?? []).some((item) => isRecord(item) && item.id === node.dataSource)
    ) {
      diagnostics.push(
        diagnostic(
          'node.data_source',
          `Node ${node.id} references an unknown data source.`,
          `/ui/nodes/${index}/dataSource`,
        ),
      );
    }
    for (const child of compiledNode?.children ?? []) {
      if (!nodes.has(child))
        diagnostics.push(
          diagnostic(
            'node.child_reference',
            `Child node ${child} does not exist.`,
            `/ui/nodes/${index}/children`,
          ),
        );
    }
  }
  const parentsByChild = new Map<string, Set<string>>();
  for (const node of nodes.values()) {
    for (const child of node.children ?? []) {
      const parents = parentsByChild.get(child) ?? new Set<string>();
      parents.add(node.id);
      parentsByChild.set(child, parents);
    }
  }
  const sourceIndexById = new Map(
    sourceNodes.flatMap((node, index) =>
      isRecord(node) && typeof node.id === 'string' ? [[node.id, index] as const] : [],
    ),
  );
  for (const node of nodes.values()) {
    const index = sourceIndexById.get(node.id) ?? 0;
    const path = `/ui/nodes/${index}`;
    if (node.pageRole !== undefined && node.layout !== 'page') {
      diagnostics.push(
        diagnostic(
          'wizard.page_role_scope',
          `Node ${node.id} may declare pageRole only when layout is page.`,
          `${path}/pageRole`,
        ),
      );
    }
    if (node.layout === 'page') {
      const parents = [...(parentsByChild.get(node.id) ?? [])];
      if (
        parents.length !== 1 ||
        nodes.get(parents[0])?.layout !== 'wizard' ||
        !['group', 'section'].includes(node.kind)
      ) {
        diagnostics.push(
          diagnostic(
            'wizard.page_parent',
            `Wizard page ${node.id} must be a group or section owned by exactly one wizard.`,
            path,
          ),
        );
      }
    }
    if (node.layout !== 'wizard') continue;
    if (!['root', 'group', 'section'].includes(node.kind)) {
      diagnostics.push(
        diagnostic(
          'wizard.container',
          `Wizard ${node.id} must use a root, group, or section node.`,
          path,
        ),
      );
    }
    const pages = (node.children ?? [])
      .map((id) => nodes.get(id))
      .filter(Boolean) as CompiledNode[];
    if (pages.length === 0) {
      diagnostics.push(
        diagnostic('wizard.empty', `Wizard ${node.id} must contain at least one page.`, path),
      );
    }
    for (const page of pages) {
      if (page.layout !== 'page' || !['group', 'section'].includes(page.kind)) {
        diagnostics.push(
          diagnostic(
            'wizard.page',
            `Wizard ${node.id} may contain only group or section nodes with page layout.`,
            `${path}/children`,
          ),
        );
      }
    }
    const reviewPages = pages.filter((page) => page.pageRole === 'review');
    if (reviewPages.length > 1) {
      diagnostics.push(
        diagnostic(
          'wizard.review_count',
          `Wizard ${node.id} may contain only one review page.`,
          `${path}/children`,
        ),
      );
    }
    if (reviewPages[0] && pages.at(-1)?.id !== reviewPages[0].id) {
      diagnostics.push(
        diagnostic(
          'wizard.review_order',
          `Wizard ${node.id} review page must be the final page.`,
          `${path}/children`,
        ),
      );
    }
    const pending = [...(parentsByChild.get(node.id) ?? [])];
    const visited = new Set<string>();
    while (pending.length > 0) {
      const parentId = pending.pop();
      if (!parentId || visited.has(parentId)) continue;
      visited.add(parentId);
      const parent = nodes.get(parentId);
      if (parent?.layout === 'wizard' || parent?.kind === 'repeater') {
        diagnostics.push(
          diagnostic(
            'wizard.nested',
            `Wizard ${node.id} cannot be nested inside another wizard or repeater.`,
            path,
          ),
        );
        break;
      }
      pending.push(...(parentsByChild.get(parentId) ?? []));
    }
  }
  for (const [index, sourceNode] of sourceNodes.entries()) {
    if (isRecord(sourceNode) && sourceNode.layout === 'data-grid') {
      const grid = nodes.get(sourceNode.id as string);
      if (!grid) continue;
      const path = `/ui/nodes/${index}`;
      const gridChildren = grid.children ?? [];
      if (grid.kind !== 'repeater') {
        diagnostics.push(
          diagnostic('data_grid.container', `Data grid ${grid.id} must use a repeater node.`, path),
        );
      }
      if (grid.schema?.type !== 'array' || grid.schema.items?.type !== 'object') {
        diagnostics.push(
          diagnostic(
            'data_grid.items_type',
            `Data grid ${grid.id} must bind to an array of objects.`,
            `${path}/schemaPath`,
          ),
        );
      }
      if (gridChildren.length === 0) {
        diagnostics.push(
          diagnostic(
            'data_grid.columns',
            `Data grid ${grid.id} must contain at least one field column.`,
            `${path}/children`,
          ),
        );
      }
      for (const childId of gridChildren) {
        if (nodes.get(childId)?.kind === 'field') continue;
        diagnostics.push(
          diagnostic(
            'data_grid.column',
            `Data grid ${grid.id} may contain only direct field columns.`,
            `${path}/children`,
          ),
        );
      }
    }
    if (!isRecord(sourceNode) || sourceNode.kind !== 'repeater') continue;
    const node = nodes.get(sourceNode.id as string);
    if (!node?.schema) continue;
    if (node.schema.type !== 'array') {
      diagnostics.push(
        diagnostic(
          'repeater.schema_type',
          `Repeater ${node.id} must bind to an array schema.`,
          `/ui/nodes/${index}/schemaPath`,
        ),
      );
      continue;
    }
    if ((node.children?.length ?? 0) > 0 && node.schema.items?.type !== 'object') {
      diagnostics.push(
        diagnostic(
          'repeater.items_type',
          `Repeater ${node.id} with child fields must use an object item schema.`,
          `/ui/nodes/${index}/children`,
        ),
      );
    }
    if (node.itemKey !== undefined) {
      const keySchema = node.schema.items?.properties?.[node.itemKey];
      if (
        typeof node.itemKey !== 'string' ||
        node.itemKey.length === 0 ||
        node.itemKey.includes('.') ||
        keySchema?.type !== 'string' ||
        !node.schema.items?.required?.includes(node.itemKey)
      ) {
        diagnostics.push(
          diagnostic(
            'repeater.item_key',
            `Repeater ${node.id} itemKey must reference a required string property in its item schema.`,
            `/ui/nodes/${index}/itemKey`,
          ),
        );
      }
    }
  }
  for (const node of nodes.values()) {
    const template = node.valuePathTemplate;
    if (!template?.includes('*')) {
      node.repeaterAncestors = [];
      continue;
    }
    const ancestors: string[] = [];
    const visited = new Set<string>([node.id]);
    let currentId = node.id;
    let invalidScope = false;
    while (true) {
      const parents = [...(parentsByChild.get(currentId) ?? [])];
      if (parents.length === 0) break;
      if (parents.length !== 1 || visited.has(parents[0])) {
        invalidScope = true;
        break;
      }
      const parentId = parents[0];
      visited.add(parentId);
      const parent = nodes.get(parentId);
      if (parent?.kind === 'repeater') ancestors.unshift(parent.id);
      currentId = parentId;
    }
    const wildcardPositions = template
      .split('.')
      .flatMap((segment, index) => (segment === '*' ? [index] : []));
    if (ancestors.length !== wildcardPositions.length) invalidScope = true;
    for (const [index, ancestorId] of ancestors.entries()) {
      const repeaterTemplate = nodes.get(ancestorId)?.valuePathTemplate;
      const expectedPrefix = template.split('.').slice(0, wildcardPositions[index]).join('.');
      if (!repeaterTemplate || repeaterTemplate !== expectedPrefix) invalidScope = true;
    }
    if (invalidScope) {
      const sourceIndex = sourceNodes.findIndex(
        (candidate) => isRecord(candidate) && candidate.id === node.id,
      );
      diagnostics.push(
        diagnostic(
          'node.dynamic_scope',
          `Node ${node.id} must be nested under the repeaters declared by its schemaPath.`,
          `/ui/nodes/${sourceIndex}/schemaPath`,
        ),
      );
    } else node.repeaterAncestors = ancestors;
  }
  const dataSourceIds = new Set<string>();
  for (const [index, source] of (document.dataSources ?? []).entries()) {
    const path = `/dataSources/${index}`;
    if (!isRecord(source)) {
      diagnostics.push(
        diagnostic('data_source.definition', 'Data-source definition must be an object.', path),
      );
      continue;
    }
    for (const key of Object.keys(source)) {
      if (DATA_SOURCE_KEYS.has(key)) continue;
      const pointerKey = key.replaceAll('~', '~0').replaceAll('/', '~1');
      diagnostics.push(
        diagnostic(
          'data_source.keyword',
          `Unsupported data-source property ${key}.`,
          `${path}/${pointerKey}`,
        ),
      );
    }
    if (typeof source.id !== 'string' || source.id.trim().length === 0) {
      diagnostics.push(
        diagnostic('data_source.id', 'Data-source id must be a non-empty string.', `${path}/id`),
      );
    } else if (dataSourceIds.has(source.id)) {
      diagnostics.push(
        diagnostic(
          'data_source.duplicate',
          `Data-source id ${source.id} is duplicated.`,
          `${path}/id`,
        ),
      );
    } else {
      dataSourceIds.add(source.id);
    }
    if (typeof source.registryKey !== 'string' || source.registryKey.trim().length === 0) {
      diagnostics.push(
        diagnostic(
          'data_source.registry_key',
          'Data-source registryKey must be a non-empty string.',
          `${path}/registryKey`,
        ),
      );
    }
    if (
      source.parameters !== undefined &&
      (!isRecord(source.parameters) || !isJsonValue(source.parameters))
    ) {
      diagnostics.push(
        diagnostic(
          'data_source.parameters',
          'Data-source parameters must be a JSON object with finite values.',
          `${path}/parameters`,
        ),
      );
    }
    if (source.dependencies !== undefined) {
      if (
        !Array.isArray(source.dependencies) ||
        source.dependencies.length > DATA_SOURCE_LIMITS.maxDependencies
      ) {
        diagnostics.push(
          diagnostic(
            'data_source.dependencies',
            `Data-source dependencies must contain at most ${DATA_SOURCE_LIMITS.maxDependencies} paths.`,
            `${path}/dependencies`,
          ),
        );
      } else {
        const dependencies = new Set<string>();
        for (const [dependencyIndex, dependency] of source.dependencies.entries()) {
          const dependencyPath = `${path}/dependencies/${dependencyIndex}`;
          if (typeof dependency !== 'string' || dependency.trim().length === 0) {
            diagnostics.push(
              diagnostic(
                'data_source.dependency',
                'Data-source dependency must be a non-empty value path.',
                dependencyPath,
              ),
            );
            continue;
          }
          if (dependencies.has(dependency)) {
            diagnostics.push(
              diagnostic(
                'data_source.dependency_duplicate',
                `Data-source dependency ${dependency} is duplicated.`,
                dependencyPath,
              ),
            );
          }
          dependencies.add(dependency);
          const dependencyExists = schemaHasValuePath(document.schema, dependency);
          if (!dependencyExists) {
            diagnostics.push(
              diagnostic(
                'data_source.dependency_reference',
                `Data-source dependency ${dependency} is not declared by the schema.`,
                dependencyPath,
              ),
            );
          }
          if (dependencyExists && dependency.includes('*')) {
            const incompatibleNode = [...nodes.values()].find(
              (node) =>
                node.dataSource === source.id &&
                (!node.valuePathTemplate ||
                  !isValuePathScopeCompatible(node.valuePathTemplate, dependency)),
            );
            if (incompatibleNode) {
              diagnostics.push(
                diagnostic(
                  'data_source.dependency_scope',
                  `Data-source dependency ${dependency} cannot be bound from node ${incompatibleNode.id}.`,
                  dependencyPath,
                  'error',
                  'Attach the source inside the same repeater scope or use a global dependency.',
                ),
              );
            }
          }
        }
      }
    }
    if (source.trigger !== undefined && !['mount', 'focus'].includes(source.trigger as string)) {
      diagnostics.push(
        diagnostic(
          'data_source.trigger',
          'Data-source trigger must be mount or focus.',
          `${path}/trigger`,
        ),
      );
    }
    if (source.searchable !== undefined && typeof source.searchable !== 'boolean') {
      diagnostics.push(
        diagnostic(
          'data_source.searchable',
          'Data-source searchable must be a boolean.',
          `${path}/searchable`,
        ),
      );
    }
    if (
      source.cacheTtlMs !== undefined &&
      !isBoundedInteger(source.cacheTtlMs, 0, DATA_SOURCE_LIMITS.maxCacheTtlMs)
    ) {
      diagnostics.push(
        diagnostic(
          'data_source.cache_ttl',
          `Data-source cacheTtlMs must be an integer from 0 to ${DATA_SOURCE_LIMITS.maxCacheTtlMs}.`,
          `${path}/cacheTtlMs`,
        ),
      );
    }
    if (
      source.debounceMs !== undefined &&
      !isBoundedInteger(source.debounceMs, 0, DATA_SOURCE_LIMITS.maxDebounceMs)
    ) {
      diagnostics.push(
        diagnostic(
          'data_source.debounce',
          `Data-source debounceMs must be an integer from 0 to ${DATA_SOURCE_LIMITS.maxDebounceMs}.`,
          `${path}/debounceMs`,
        ),
      );
    }
    if (
      source.pageSize !== undefined &&
      !isBoundedInteger(source.pageSize, 1, DATA_SOURCE_LIMITS.maxPageSize)
    ) {
      diagnostics.push(
        diagnostic(
          'data_source.page_size',
          `Data-source pageSize must be an integer from 1 to ${DATA_SOURCE_LIMITS.maxPageSize}.`,
          `${path}/pageSize`,
        ),
      );
    }
    if (
      dataSourceCapabilities.size > 0 &&
      typeof source.registryKey === 'string' &&
      !dataSourceCapabilities.has(source.registryKey)
    ) {
      diagnostics.push(
        diagnostic(
          'capability.data_source',
          `Host capability ${source.registryKey} is not declared.`,
          `/dataSources/${index}/registryKey`,
        ),
      );
    }
  }
  for (const [index, action] of (document.actions ?? []).entries()) {
    if (!isRecord(action) || typeof action.registryKey !== 'string') {
      diagnostics.push(
        diagnostic('action.definition', 'Action definition is invalid.', `/actions/${index}`),
      );
      continue;
    }
    if (actionCapabilities.size > 0 && !actionCapabilities.has(action.registryKey)) {
      diagnostics.push(
        diagnostic(
          'capability.action',
          `Host capability ${action.registryKey} is not declared.`,
          `/actions/${index}/registryKey`,
        ),
      );
    }
  }

  const visiting = new Set<string>();
  const reached = new Set<string>();
  const walk = (id: string, depth: number): void => {
    if (visiting.has(id)) {
      diagnostics.push(diagnostic('layout.cycle', `Layout node ${id} forms a cycle.`, '/ui/nodes'));
      return;
    }
    const node = nodes.get(id);
    if (!node) return;
    if (depth > limits.maxDepth) {
      diagnostics.push(
        diagnostic(
          'limits.depth',
          `Layout depth exceeds the configured limit of ${limits.maxDepth}.`,
          '/ui/nodes',
        ),
      );
      return;
    }
    node.depth = Math.max(node.depth, depth);
    reached.add(id);
    visiting.add(id);
    for (const child of node.children ?? []) walk(child, depth + 1);
    visiting.delete(id);
  };
  walk(document.ui.root, 0);
  for (const id of nodes.keys()) {
    if (!reached.has(id))
      diagnostics.push(
        diagnostic(
          'layout.unreachable',
          `Node ${id} is not reachable from the root layout.`,
          '/ui/nodes',
          'warning',
        ),
      );
  }

  const rules = document.rules ?? [];
  if (rules.length > limits.maxRules)
    diagnostics.push(
      diagnostic(
        'limits.rules',
        `Rule count exceeds the configured limit of ${limits.maxRules}.`,
        '/rules',
      ),
    );
  const ruleIds = new Set<string>();
  const computedTargets = new Set<string>();
  const validRules: FormRule[] = [];
  const ruleDependencies: Record<string, string[]> = {};
  for (const [index, rule] of rules.entries()) {
    if (
      !isRecord(rule) ||
      typeof rule.id !== 'string' ||
      rule.id.trim().length === 0 ||
      typeof rule.target !== 'string' ||
      rule.target.trim().length === 0 ||
      !isRecord(rule.expression)
    ) {
      diagnostics.push(
        diagnostic('rule.definition', 'Rule definition is invalid.', `/rules/${index}`),
      );
      continue;
    }
    if (ruleIds.has(rule.id))
      diagnostics.push(
        diagnostic('rule.duplicate', `Rule ID ${rule.id} is duplicated.`, `/rules/${index}/id`),
      );
    ruleIds.add(rule.id);
    if (!['visible', 'enabled', 'computed', 'validate'].includes(rule.kind)) {
      diagnostics.push(
        diagnostic('rule.kind', `Rule ${rule.id} has an unsupported kind.`, `/rules/${index}/kind`),
      );
      continue;
    }
    if (rule.scope !== undefined && !['form', 'row'].includes(rule.scope as string)) {
      diagnostics.push(
        diagnostic(
          'rule.scope',
          `Rule ${rule.id} scope must be form or row.`,
          `/rules/${index}/scope`,
        ),
      );
    }
    const targetNode = nodes.get(rule.target);
    const targetPathTemplate = targetNode?.valuePathTemplate ?? targetNode?.valuePath;
    if (!targetNode)
      diagnostics.push(
        diagnostic(
          'rule.target',
          `Rule target ${rule.target} does not exist.`,
          `/rules/${index}/target`,
        ),
      );
    if (rule.kind === 'computed') {
      if (!targetPathTemplate) {
        diagnostics.push(
          diagnostic(
            'rules.computed_target',
            `Computed rule ${rule.id} must target a value-bearing field or repeater.`,
            `/rules/${index}/target`,
          ),
        );
      }
      if (computedTargets.has(rule.target)) {
        diagnostics.push(
          diagnostic(
            'rules.computed_target_duplicate',
            `Only one computed rule may target ${rule.target}.`,
            `/rules/${index}/target`,
          ),
        );
      }
      computedTargets.add(rule.target);
    }
    if (
      (rule.kind === 'computed' || rule.kind === 'validate') &&
      targetPathTemplate?.includes('*') &&
      rule.scope !== 'row'
    ) {
      diagnostics.push(
        diagnostic(
          'rule.dynamic_target',
          `Rule ${rule.id} cannot target a repeater item field without declaring row scope.`,
          `/rules/${index}/target`,
        ),
      );
    }
    if (rule.scope === 'row' && !targetPathTemplate?.includes('*')) {
      diagnostics.push(
        diagnostic(
          'rule.row_scope_target',
          `Row-scoped rule ${rule.id} must target a field inside a repeater.`,
          `/rules/${index}/target`,
        ),
      );
    }
    try {
      const analysis = analyzeExpression(rule.expression);
      for (const fieldPath of analysis.fieldPaths) {
        const fieldExists = schemaHasValuePath(document.schema, fieldPath);
        if (!fieldExists) {
          diagnostics.push(
            diagnostic(
              'rule.field_reference',
              `Rule ${rule.id} references undeclared field ${fieldPath}.`,
              `/rules/${index}/expression`,
            ),
          );
          continue;
        }
        if (rule.scope === 'row') {
          if (targetPathTemplate && !isValuePathScopeCompatible(targetPathTemplate, fieldPath)) {
            diagnostics.push(
              diagnostic(
                'rule.field_scope',
                `Rule ${rule.id} cannot bind ${fieldPath} from the target row scope.`,
                `/rules/${index}/expression`,
              ),
            );
          }
        } else if (fieldPath.includes('*')) {
          diagnostics.push(
            diagnostic(
              'rule.field_scope',
              `Rule ${rule.id} must declare row scope before reading ${fieldPath}.`,
              `/rules/${index}/expression`,
            ),
          );
        }
      }
      if (analysis.size > limits.maxExpressionOperations) {
        diagnostics.push(
          diagnostic(
            'limits.expression',
            `Rule ${rule.id} exceeds the expression operation limit.`,
            `/rules/${index}/expression`,
          ),
        );
      }
      ruleDependencies[rule.id] = [...analysis.fieldPaths].sort();
      validRules.push(rule);
    } catch {
      diagnostics.push(
        diagnostic(
          'rule.expression',
          `Rule ${rule.id} expression is invalid.`,
          `/rules/${index}/expression`,
        ),
      );
    }
  }
  const dependencyOrder = computedDependencyOrder(validRules, nodes, diagnostics);
  if (diagnostics.some((item) => item.severity === 'error')) return { ok: false, diagnostics };

  const normalized = normalize(document);
  const normalizedNodes = normalized.ui.nodes.map((item) => {
    const compiled = nodes.get(item.id) as CompiledNode;
    return {
      ...item,
      schema: compiled.schema,
      valuePath: compiled.valuePath,
      valuePathTemplate: compiled.valuePathTemplate,
      repeaterAncestors: compiled.repeaterAncestors,
      depth: compiled.depth,
    };
  });
  const nodeById = Object.fromEntries(normalizedNodes.map((node) => [node.id, node]));
  const dataSourceById = new Map(normalized.dataSources?.map((source) => [source.id, source]));
  const nodeSubscriptions = Object.fromEntries(
    normalizedNodes.map((node) => {
      const paths = new Set<string>();
      if (node.valuePathTemplate) paths.add(node.valuePathTemplate);
      for (const rule of normalized.rules ?? []) {
        if (rule.target !== node.id) continue;
        for (const path of ruleDependencies[rule.id] ?? []) paths.add(path);
      }
      const source = node.dataSource ? dataSourceById.get(node.dataSource) : undefined;
      for (const path of source?.dependencies ?? []) paths.add(path);
      return [node.id, [...paths].sort()];
    }),
  );
  const plan: FormPlan = {
    apiVersion: 'a3s.dev/form-plan/v1alpha1',
    schemaProfile: A3S_FORM_SCHEMA_PROFILE_1_ID,
    sourceRevision: normalized.revision,
    sourceDigest: normalized.digest as string,
    metadata: normalized.metadata,
    schema: normalized.schema,
    root: normalized.ui.root,
    nodes: normalizedNodes,
    nodeById,
    rules: normalized.rules ?? [],
    ruleDependencies,
    nodeSubscriptions,
    expressionOperationLimit: limits.maxExpressionOperations,
    dependencyOrder,
    dataSources: normalized.dataSources ?? [],
    actions: normalized.actions ?? [],
  };
  return { ok: true, document: deepFreeze(normalized), plan: deepFreeze(plan), diagnostics };
}

export function compileForm(input: unknown, options: CompileOptions = {}): CompileResult {
  const compilerRevision = 'a3s-form-typescript-reference@0.1.0';
  try {
    const result = hasPortableJsonGraph(input)
      ? compileFormInternal(input, options)
      : invalidInputResult();
    return { ...result, compilerRevision };
  } catch {
    return { ...invalidInputResult(), compilerRevision };
  }
}

export function assertCompiled(input: unknown, options?: CompileOptions): FormPlan {
  const result = compileForm(input, options);
  if (!result.ok || !result.plan) {
    const message = result.diagnostics
      .map((item) => `${item.path || '/'}: ${item.message}`)
      .join('\n');
    throw new Error(message || 'Form compilation failed.');
  }
  return result.plan;
}
