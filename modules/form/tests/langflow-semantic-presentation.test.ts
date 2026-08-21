import { compileForm, evaluateFormValue, type JsonSchema, type JsonValue } from '../src/core';
import {
  createLangflowNodeDefaultValue,
  createLangflowNodeForm,
  type LangflowNodeDefinition,
  langflowNodeCatalog,
  WORKFLOW_CONFIGURATION_WIDGET_KEYS,
  WORKFLOW_CONFIGURATION_WIDGETS,
} from '../src/workflow';

function semanticNode(fields: LangflowNodeDefinition['fields']): LangflowNodeDefinition {
  return {
    category: 'tests',
    categoryLabel: 'Tests',
    type: 'SemanticPresentationNode',
    display_name: 'Semantic presentation node',
    description: 'Exercises semantic field presentation.',
    beta: false,
    legacy: false,
    official: true,
    tool_mode: false,
    base_classes: [],
    input_types: [],
    output_types: [],
    fields,
    outputs: [],
  };
}

function valueTypeMatches(schema: JsonSchema, value: JsonValue): boolean {
  if (!schema.type) return true;
  if (schema.type === 'null') return value === null;
  if (schema.type === 'array') return Array.isArray(value);
  if (schema.type === 'object') {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  if (schema.type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (schema.type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === schema.type;
}

function schemaTypeMismatches(schema: JsonSchema, value: JsonValue, path: string): string[] {
  if (!valueTypeMatches(schema, value)) {
    return [
      `${path}: expected ${schema.type}, received ${Array.isArray(value) ? 'array' : typeof value}`,
    ];
  }
  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    return value.flatMap((item, index) =>
      schemaTypeMismatches(schema.items ?? {}, item, `${path}/${index}`),
    );
  }
  if (
    schema.type === 'object' &&
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return Object.entries(schema.properties ?? {}).flatMap(([name, property]) => {
      const child = value[name];
      return child === undefined ? [] : schemaTypeMismatches(property, child, `${path}/${name}`);
    });
  }
  return [];
}

function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function fieldNode(document: ReturnType<typeof createLangflowNodeForm>, name: string) {
  return document.ui.nodes.find((node) => node.schemaPath === `/properties/${pointerToken(name)}`);
}

const fullWidthControls = new Set<string>([
  WORKFLOW_CONFIGURATION_WIDGETS.actionPicker,
  WORKFLOW_CONFIGURATION_WIDGETS.code,
  WORKFLOW_CONFIGURATION_WIDGETS.connection,
  WORKFLOW_CONFIGURATION_WIDGETS.dataDisplay,
  WORKFLOW_CONFIGURATION_WIDGETS.file,
  WORKFLOW_CONFIGURATION_WIDGETS.json,
  WORKFLOW_CONFIGURATION_WIDGETS.mcp,
  WORKFLOW_CONFIGURATION_WIDGETS.prompt,
  WORKFLOW_CONFIGURATION_WIDGETS.sortableList,
]);

describe('Langflow semantic field presentation', () => {
  it('prioritizes explicit JSON inputs and normalizes object and collection defaults', () => {
    const node = semanticNode([
      {
        name: 'payload',
        type: 'other',
        _input_type: 'JSONInput',
        value: '',
        input_types: ['Data', 'JSON'],
        tool_mode: true,
        dynamic: true,
        real_time_refresh: true,
        refresh_button: true,
        advanced: true,
        combobox: true,
      },
      {
        name: 'records',
        type: 'other',
        _input_type: 'JSONInput',
        list: true,
        value: {},
      },
    ]);
    const document = createLangflowNodeForm(node);
    const payload = fieldNode(document, 'payload');

    expect(document.schema.properties?.payload).toEqual(
      expect.objectContaining({ type: 'object', default: {} }),
    );
    expect(document.schema.properties?.records).toEqual(
      expect.objectContaining({ type: 'array', default: [] }),
    );
    expect(createLangflowNodeDefaultValue(node)).toEqual({ payload: {}, records: [] });
    expect(payload).toEqual(
      expect.objectContaining({
        width: 12,
        customProps: expect.objectContaining({
          inputType: 'JSONInput',
          sourceType: 'other',
          inputTypes: ['Data', 'JSON'],
          toolMode: true,
          dynamic: true,
          realTimeRefresh: true,
          refreshButton: true,
          advanced: true,
          combobox: true,
          controlWidget: WORKFLOW_CONFIGURATION_WIDGETS.json,
          semanticGroup: 'input',
          semanticGroupLabel: 'Input',
        }),
      }),
    );
  });

  it('keeps every catalog default type-aligned with its compiled schema', () => {
    const failures: string[] = [];

    for (const node of langflowNodeCatalog) {
      const document = createLangflowNodeForm(node);
      const compiled = compileForm(document, {
        capabilities: { widgets: [...WORKFLOW_CONFIGURATION_WIDGET_KEYS] },
      });
      if (!compiled.ok || !compiled.plan) {
        failures.push(`${node.type}: ${JSON.stringify(compiled.diagnostics)}`);
        continue;
      }
      const value = createLangflowNodeDefaultValue(node);
      const evaluation = evaluateFormValue(compiled.plan, value);
      const typeErrors = evaluation.errors.filter((error) => error.code === 'type');
      if (typeErrors.length > 0) failures.push(`${node.type}: ${JSON.stringify(typeErrors)}`);
      failures.push(...schemaTypeMismatches(document.schema, value, node.type));
    }

    expect(failures).toEqual([]);
  });

  it('keeps all 797 catalog fields within the semantic width contract', () => {
    const failures: string[] = [];
    let generatedFields = 0;

    for (const node of langflowNodeCatalog) {
      const document = createLangflowNodeForm(node);
      const presentations = node.fields.map((field) => ({
        field,
        schema: document.schema.properties?.[field.name],
        ui: fieldNode(document, field.name),
      }));

      for (const presentation of presentations) {
        generatedFields += 1;
        const { field, schema, ui } = presentation;
        if (!schema || !ui) {
          failures.push(`${node.type}.${field.name}: missing generated schema or UI field`);
          continue;
        }

        const control = ui.customProps?.controlWidget;
        const fullWidth =
          field.type === 'table' ||
          schema.type === 'array' ||
          field.multiline === true ||
          field._input_type === 'MultilineInput' ||
          (typeof control === 'string' && fullWidthControls.has(control));
        const numericRuntimePeers = presentations.filter(
          (candidate) =>
            candidate.field.show !== false &&
            (candidate.field.advanced === true) === (field.advanced === true) &&
            (candidate.schema?.type === 'integer' || candidate.schema?.type === 'number') &&
            candidate.ui?.customProps?.semanticGroup === 'runtime',
        );
        const compactRuntimeCluster =
          !fullWidth &&
          (schema.type === 'integer' || schema.type === 'number') &&
          ui.customProps?.semanticGroup === 'runtime' &&
          numericRuntimePeers.length >= 3;
        const expectedWidth = fullWidth ? 12 : compactRuntimeCluster ? 4 : 6;

        if (ui.width !== expectedWidth) {
          failures.push(
            `${node.type}.${field.name}: expected width ${expectedWidth}, received ${String(ui.width)}`,
          );
        }
      }
    }

    expect(langflowNodeCatalog).toHaveLength(131);
    expect(generatedFields).toBe(797);
    expect(failures).toEqual([]);
  });

  it('aggregates repeated semantic groups and lets control semantics resolve ambiguous names', () => {
    const node = semanticNode([
      { name: 'prompt', type: 'str', _input_type: 'StrInput' },
      { name: 'mode', type: 'tab', _input_type: 'TabInput', options: ['fast', 'safe'] },
      { name: 'context', type: 'str', _input_type: 'StrInput' },
      { name: 'check_response_status', type: 'bool', _input_type: 'BoolInput' },
      { name: 'response_timeout', type: 'int', _input_type: 'IntInput' },
      { name: 'max_retries', type: 'int', _input_type: 'IntInput' },
      { name: 'concurrency', type: 'int', _input_type: 'IntInput' },
      { name: 'output_format', type: 'str', _input_type: 'StrInput' },
      {
        name: 'selected_path',
        display_name: 'Select Path',
        type: 'str',
        _input_type: 'DropdownInput',
        options: ['body', 'metadata'],
      },
    ]);
    const document = createLangflowNodeForm(node);
    const parameters = document.ui.nodes.find((candidate) =>
      candidate.id.endsWith('-node-parameters'),
    );
    const groups = (parameters?.children ?? []).map((id) =>
      document.ui.nodes.find((candidate) => candidate.id === id),
    );
    const labelsByGroup = Object.fromEntries(
      groups.map((group) => [
        group?.label,
        (group?.children ?? []).map(
          (id) => document.ui.nodes.find((candidate) => candidate.id === id)?.label,
        ),
      ]),
    );

    expect(groups.map((group) => group?.label)).toEqual(['Input', 'Behavior', 'Runtime', 'Output']);
    expect(labelsByGroup).toEqual({
      Input: ['prompt', 'context'],
      Behavior: ['mode', 'check_response_status', 'Select Path'],
      Runtime: ['response_timeout', 'max_retries', 'concurrency'],
      Output: ['output_format'],
    });
    expect(fieldNode(document, 'check_response_status')?.customProps?.semanticGroup).toBe(
      'behavior',
    );
    expect(fieldNode(document, 'selected_path')?.customProps?.semanticGroup).toBe('behavior');
    expect(fieldNode(document, 'response_timeout')).toEqual(expect.objectContaining({ width: 4 }));
  });

  it('assigns semantic widths and stable groups while preserving source order', () => {
    const node = semanticNode([
      { name: 'source', type: 'other', _input_type: 'HandleInput', list: true, value: '' },
      { name: 'matrix', type: 'table', _input_type: 'TableInput' },
      { name: 'code', type: 'code', _input_type: 'CodeInput' },
      { name: 'prompt', type: 'prompt', _input_type: 'PromptInput' },
      { name: 'notes', type: 'str', multiline: true },
      { name: 'payload', type: 'other', _input_type: 'JSONInput' },
      {
        name: 'file',
        type: 'file',
        _input_type: 'FileInput',
        options: ['local', 'remote'],
        file_types: ['json'],
        model_type: 'embedding',
        copy_field: true,
        list_add_label: 'Add file',
        external_options: true,
        limit: 2,
      },
      { name: 'items', type: 'str', is_list: true },
      { name: 'short_text', type: 'str', _input_type: 'StrInput' },
      { name: 'api_key', type: 'str', _input_type: 'SecretStrInput', password: true },
      { name: 'model', type: 'model', _input_type: 'ModelInput' },
      { name: 'mode', type: 'tab', _input_type: 'TabInput', options: ['fast', 'safe'] },
      { name: 'temperature', type: 'float', _input_type: 'FloatInput' },
      {
        name: 'duration',
        display_name: 'Duration',
        type: 'duration',
        _input_type: 'DurationInput',
      },
      { name: 'timeout', display_name: 'Timeout', type: 'int', _input_type: 'IntInput' },
      {
        name: 'max_retries',
        display_name: 'Max retries',
        type: 'int',
        _input_type: 'IntInput',
      },
      {
        name: 'concurrency',
        display_name: 'Concurrency',
        type: 'int',
        _input_type: 'IntInput',
      },
      { name: 'result', type: 'data_display', _input_type: 'DataDisplayInput' },
      { name: 'collection_name', type: 'str', _input_type: 'StrInput' },
    ]);
    const document = createLangflowNodeForm(node);
    const widths = Object.fromEntries(
      node.fields.map((field) => [field.name, fieldNode(document, field.name)?.width]),
    );

    expect(widths).toEqual({
      source: 12,
      matrix: 12,
      code: 12,
      prompt: 12,
      notes: 12,
      payload: 12,
      file: 12,
      items: 12,
      short_text: 6,
      api_key: 6,
      model: 6,
      mode: 6,
      temperature: 6,
      duration: 6,
      timeout: 4,
      max_retries: 4,
      concurrency: 4,
      result: 12,
      collection_name: 6,
    });
    expect(fieldNode(document, 'source')?.customProps?.controlWidget).toBe(
      WORKFLOW_CONFIGURATION_WIDGETS.connection,
    );
    expect(fieldNode(document, 'api_key')?.customProps).toEqual(
      expect.objectContaining({
        semanticGroup: 'provider-credentials',
        semanticGroupLabel: 'Provider & credentials',
      }),
    );
    expect(fieldNode(document, 'mode')?.customProps).toEqual(
      expect.objectContaining({ semanticGroup: 'behavior', semanticGroupLabel: 'Behavior' }),
    );
    expect(fieldNode(document, 'result')?.customProps).toEqual(
      expect.objectContaining({ semanticGroup: 'output', semanticGroupLabel: 'Output' }),
    );
    expect(fieldNode(document, 'collection_name')?.customProps).toEqual(
      expect.objectContaining({
        semanticGroup: 'storage-retrieval',
        semanticGroupLabel: 'Storage & retrieval',
      }),
    );
    expect(
      document.ui.nodes
        .filter((candidate) => candidate.customProps?.semanticGroup === 'runtime')
        .map((candidate) => candidate.label),
    ).toEqual(['Duration', 'Timeout', 'Max retries', 'Concurrency']);
    expect(fieldNode(document, 'file')?.customProps).toEqual(
      expect.objectContaining({
        sourceOptions: ['local', 'remote'],
        fileTypes: ['json'],
        modelType: 'embedding',
        copyField: true,
        listAddLabel: 'Add file',
        externalOptions: true,
        limit: 2,
      }),
    );

    const parameters = document.ui.nodes.find((candidate) =>
      candidate.id.endsWith('-node-parameters'),
    );
    const visualGroups = (parameters?.children ?? []).map((id) =>
      document.ui.nodes.find((candidate) => candidate.id === id),
    );
    expect(visualGroups.every((group) => group?.kind === 'group')).toBe(true);
    expect(visualGroups.flatMap((group) => group?.children ?? [])).toEqual(
      node.fields.map((field) => fieldNode(document, field.name)?.id),
    );
    expect(visualGroups.map((group) => group?.label)).toEqual([
      'Input',
      'Provider & credentials',
      'Behavior',
      'Runtime',
      'Output',
      'Storage & retrieval',
    ]);
  });
});
