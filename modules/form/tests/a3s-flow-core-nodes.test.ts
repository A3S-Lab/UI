import {
  A3S_FLOW_CORE_CATALOG_PROVENANCE,
  A3S_FLOW_CORE_NODE_TYPES,
  A3S_FLOW_EXPRESSION_API_VERSION,
  a3sFlowCoreNodeCatalog,
  a3sFlowCoreNodeCategories,
  createA3SFlowExpression,
  createA3SFlowNodeBuildConfig,
  createA3SFlowNodeDefaultValue,
  createA3SFlowNodeForm,
  isA3SFlowCorePortAvailable,
  requireA3SFlowCoreNode,
  validateA3SFlowNodeConfiguration,
} from '../src/a3s-flow';
import { compileForm, evaluateFormValue, type JsonObject } from '../src/core';
import { WORKFLOW_CONFIGURATION_WIDGET_KEYS } from '../src/workflow';

const expectedNodeTypes = [
  'flow.start',
  'flow.step',
  'flow.batch',
  'flow.condition',
  'flow.wait',
  'flow.hook',
  'flow.complete',
  'flow.fail',
] as const;

describe('A3S Flow core node catalog', () => {
  it('publishes a small engine-oriented catalog instead of an integration inventory', () => {
    expect(A3S_FLOW_CORE_CATALOG_PROVENANCE).toEqual({
      engine: 'a3s-flow',
      version: '0.4.2',
      categories: 3,
      nodes: 8,
      runtimeCommands: 6,
    });
    expect(A3S_FLOW_CORE_NODE_TYPES).toEqual(expectedNodeTypes);
    expect(
      a3sFlowCoreNodeCategories.map((category) => [category.id, category.nodes.length]),
    ).toEqual([
      ['control-flow', 4],
      ['durable-work', 2],
      ['suspension', 2],
    ]);
    expect(a3sFlowCoreNodeCatalog.map((node) => node.type)).toEqual(expectedNodeTypes);
    expect(new Set(a3sFlowCoreNodeCatalog.map((node) => node.type)).size).toBe(8);
  });

  it('covers every durable runtime command and keeps host-level decisions explicit', () => {
    const bindings = new Set(a3sFlowCoreNodeCatalog.map((node) => node.runtimeBinding));
    expect(bindings).toEqual(
      new Set([
        'workflow_input',
        'runtime_condition',
        'schedule_step',
        'schedule_steps',
        'wait_until',
        'create_hook',
        'complete',
        'fail',
      ]),
    );
    expect(requireA3SFlowCoreNode('flow.step').fields.map((field) => field.name)).toEqual([
      'step_name',
      'input',
      'max_attempts',
      'retry_delay_ms',
      'on_exhausted',
    ]);
    for (const type of ['flow.step', 'flow.wait', 'flow.hook']) {
      expect(requireA3SFlowCoreNode(type).stableIdBinding).toBe('graph_node_id');
    }
    expect(requireA3SFlowCoreNode('flow.batch').stableIdBinding).toBe(
      'graph_node_id_plus_member_key',
    );
    const hookFields = requireA3SFlowCoreNode('flow.hook').fields.map((field) => field.name);
    expect(hookFields).not.toContain('token');
    expect(hookFields).toContain('token_expression');
  });

  it('keeps the core catalog small without dropping essential workflow properties', () => {
    const expectedFields: Readonly<Record<(typeof expectedNodeTypes)[number], readonly string[]>> =
      {
        'flow.start': [
          'workflow_name',
          'workflow_version',
          'runtime_kind',
          'entrypoint',
          'export_name',
          'input_schema',
          'run_id_expression',
        ],
        'flow.step': ['step_name', 'input', 'max_attempts', 'retry_delay_ms', 'on_exhausted'],
        'flow.batch': ['steps'],
        'flow.condition': ['input', 'expression', 'matched_label', 'otherwise_label'],
        'flow.wait': ['resume_at'],
        'flow.hook': [
          'kind',
          'subject',
          'token_expression',
          'callback_method',
          'callback_path',
          'metadata',
        ],
        'flow.complete': ['output_expression'],
        'flow.fail': ['error_expression'],
      };

    for (const type of expectedNodeTypes) {
      expect(requireA3SFlowCoreNode(type).fields.map((field) => field.name)).toEqual(
        expectedFields[type],
      );
    }
  });

  it('appends handler-specific settings without removing Step runtime fields', () => {
    const node = requireA3SFlowCoreNode('flow.step');
    const handlerConfig = createA3SFlowNodeBuildConfig(node, {
      handler_profile: {
        name: 'handler_profile',
        display_name: 'Handler profile',
        info: 'Host-owned settings for the selected registered handler.',
        type: 'dict',
        _input_type: 'JSONInput',
        value: {},
      },
    });
    const document = createA3SFlowNodeForm(node, { buildConfig: handlerConfig });

    expect(Object.keys(document.schema.properties ?? {})).toEqual([
      'step_name',
      'input',
      'max_attempts',
      'retry_delay_ms',
      'on_exhausted',
      'handler_profile',
    ]);
    expect(createA3SFlowNodeDefaultValue(node, { buildConfig: handlerConfig })).toHaveProperty(
      'handler_profile',
      {},
    );
  });

  it('compiles every node into a controlled, type-aligned A3S Form document', () => {
    const failures: string[] = [];

    for (const node of a3sFlowCoreNodeCatalog) {
      const document = createA3SFlowNodeForm(node);
      const compilation = compileForm(document, {
        capabilities: { widgets: [...WORKFLOW_CONFIGURATION_WIDGET_KEYS] },
      });
      if (!compilation.ok || !compilation.plan) {
        failures.push(`${node.type}: ${JSON.stringify(compilation.diagnostics)}`);
        continue;
      }
      expect(document.metadata.compatibility).toEqual(['a3s-workflow/v1', 'a3s-flow/0.4.2']);
      const value = createA3SFlowNodeDefaultValue(node);
      const typeErrors = evaluateFormValue(compilation.plan, value).errors.filter(
        (error) => error.code === 'type',
      );
      if (typeErrors.length > 0) failures.push(`${node.type}: ${JSON.stringify(typeErrors)}`);
      const semantic = validateA3SFlowNodeConfiguration(node, value);
      if (!semantic.ok) failures.push(`${node.type}: ${JSON.stringify(semantic.errors)}`);
    }

    expect(failures).toEqual([]);
  });

  it('gives every configurable field usable labels, help, and bounded panel widths', () => {
    const failures: string[] = [];

    for (const node of a3sFlowCoreNodeCatalog) {
      const document = createA3SFlowNodeForm(node);
      for (const field of node.fields) {
        const ui = document.ui.nodes.find(
          (candidate) => candidate.schemaPath === `/properties/${field.name}`,
        );
        if (!field.display_name?.trim()) failures.push(`${node.type}.${field.name}: missing label`);
        if (!field.info?.trim()) failures.push(`${node.type}.${field.name}: missing help`);
        if (!ui) failures.push(`${node.type}.${field.name}: missing UI node`);
        else if (![4, 6, 12].includes(ui.width ?? 12)) {
          failures.push(`${node.type}.${field.name}: unsupported width ${String(ui.width)}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('publishes explicit control and data ports without dropping suspension control inputs', () => {
    const wait = requireA3SFlowCoreNode('flow.wait');
    expect(wait.ports.inputs.map((port) => [port.id, port.kind, port.types])).toEqual([
      ['in', 'control', ['FlowControl']],
      ['resume_at', 'data', ['DateTime']],
    ]);

    const hook = requireA3SFlowCoreNode('flow.hook');
    expect(hook.ports.inputs.map((port) => [port.id, port.kind])).toEqual([
      ['in', 'control'],
      ['token', 'data'],
      ['metadata', 'data'],
    ]);

    for (const type of A3S_FLOW_CORE_NODE_TYPES) {
      const node = requireA3SFlowCoreNode(type);
      const allPorts = [...node.ports.inputs, ...node.ports.outputs];
      expect(new Set(node.ports.inputs.map((port) => port.id)).size).toBe(node.ports.inputs.length);
      expect(new Set(node.ports.outputs.map((port) => port.id)).size).toBe(
        node.ports.outputs.length,
      );
      expect(allPorts.every((port) => port.id.length > 0 && port.label.length > 0)).toBe(true);
    }
  });

  it('conditions recoverable error ports on continue_workflow retry exhaustion', () => {
    const step = requireA3SFlowCoreNode('flow.step');
    const stepValue = createA3SFlowNodeDefaultValue(step);
    const stepError = step.ports.outputs.find((port) => port.id === 'error');
    expect(stepError?.condition).toEqual({
      kind: 'field_equals',
      field: 'on_exhausted',
      value: 'continue_workflow',
    });
    expect(stepError && isA3SFlowCorePortAvailable(stepError, stepValue)).toBe(false);
    stepValue.on_exhausted = 'continue_workflow';
    expect(stepError && isA3SFlowCorePortAvailable(stepError, stepValue)).toBe(true);

    const batch = requireA3SFlowCoreNode('flow.batch');
    const batchValue = createA3SFlowNodeDefaultValue(batch);
    const batchErrors = batch.ports.outputs.find((port) => port.id === 'errors');
    expect(batchErrors?.condition?.kind).toBe('collection_field_some');
    expect(batchErrors && isA3SFlowCorePortAvailable(batchErrors, batchValue)).toBe(false);
    const first = (batchValue.steps as JsonObject[])[0];
    first.on_exhausted = 'continue_workflow';
    expect(batchErrors && isA3SFlowCorePortAvailable(batchErrors, batchValue)).toBe(true);
  });

  it('uses one versioned runtime-neutral expression contract for every dynamic mapping', () => {
    const expected = createA3SFlowExpression({ op: 'field', path: 'input.value' });
    expect(expected.apiVersion).toBe(A3S_FLOW_EXPRESSION_API_VERSION);

    const dynamicFields = [
      ['flow.start', 'run_id_expression'],
      ['flow.condition', 'expression'],
      ['flow.step', 'input'],
      ['flow.wait', 'resume_at'],
      ['flow.hook', 'token_expression'],
      ['flow.complete', 'output_expression'],
      ['flow.fail', 'error_expression'],
    ] as const;
    for (const [type, field] of dynamicFields) {
      const value = createA3SFlowNodeDefaultValue(requireA3SFlowCoreNode(type));
      expect((value[field] as JsonObject).apiVersion).toBe(A3S_FLOW_EXPRESSION_API_VERSION);
    }
    const batch = createA3SFlowNodeDefaultValue(requireA3SFlowCoreNode('flow.batch'));
    expect(((batch.steps as JsonObject[])[0].input_mapping as JsonObject).apiVersion).toBe(
      A3S_FLOW_EXPRESSION_API_VERSION,
    );
  });

  it('rejects empty, duplicate, and out-of-range batch configuration', () => {
    const node = requireA3SFlowCoreNode('flow.batch');
    const empty = createA3SFlowNodeDefaultValue(node);
    empty.steps = [];
    expect(validateA3SFlowNodeConfiguration(node, empty)).toMatchObject({
      ok: false,
      errors: [{ path: 'steps', code: 'flow.batch.empty' }],
    });

    const invalid = createA3SFlowNodeDefaultValue(node);
    const member = structuredClone((invalid.steps as JsonObject[])[0]);
    member.step_key = 'member-1';
    member.max_attempts = 0;
    member.retry_delay_ms = 86_400_001;
    member.on_exhausted = 'ignore';
    (invalid.steps as JsonObject[]).push(member);
    const result = validateA3SFlowNodeConfiguration(node, invalid);
    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        'flow.batch.duplicate_step_key',
        'flow.retry.invalid_max_attempts',
        'flow.retry.invalid_delay',
        'flow.retry.invalid_on_exhausted',
      ]),
    );
  });

  it('rejects invalid step retry policy and unavailable recoverable-error edges', () => {
    const node = requireA3SFlowCoreNode('flow.step');
    const value = createA3SFlowNodeDefaultValue(node);
    value.max_attempts = 101;
    value.retry_delay_ms = -1;
    value.on_exhausted = 'fail_run';
    const result = validateA3SFlowNodeConfiguration(node, value, {
      connectedOutputPortIds: ['error'],
    });
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        'flow.retry.invalid_max_attempts',
        'flow.retry.invalid_delay',
        'flow.port.unavailable',
      ]),
    );

    value.max_attempts = 3;
    value.retry_delay_ms = 0;
    value.on_exhausted = 'continue_workflow';
    expect(
      validateA3SFlowNodeConfiguration(node, value, {
        connectedOutputPortIds: ['error', 'failed'],
      }),
    ).toEqual({ ok: true, errors: [] });
  });

  it('requires hook tokens to reference a host-validated field', () => {
    const node = requireA3SFlowCoreNode('flow.hook');
    const value = createA3SFlowNodeDefaultValue(node);
    expect(validateA3SFlowNodeConfiguration(node, value)).toEqual({ ok: true, errors: [] });

    value.token_expression = createA3SFlowExpression({
      op: 'literal',
      value: 'shared-token',
    }) as JsonObject;
    expect(validateA3SFlowNodeConfiguration(node, value)).toMatchObject({
      ok: false,
      errors: [{ path: 'token_expression', code: 'flow.hook.literal_token' }],
    });

    value.token_expression = '{{input.callbackToken}}';
    expect(validateA3SFlowNodeConfiguration(node, value).errors[0]?.code).toBe(
      'flow.expression.invalid_contract',
    );
  });

  it('accepts absolute UTC wait literals and host-validated field expressions', () => {
    const node = requireA3SFlowCoreNode('flow.wait');
    const value = createA3SFlowNodeDefaultValue(node);
    expect(validateA3SFlowNodeConfiguration(node, value)).toEqual({ ok: true, errors: [] });

    value.resume_at = createA3SFlowExpression({
      op: 'literal',
      value: '2026-08-10T09:00:00Z',
    }) as JsonObject;
    expect(validateA3SFlowNodeConfiguration(node, value)).toEqual({ ok: true, errors: [] });

    value.resume_at = createA3SFlowExpression({
      op: 'literal',
      value: '2026-08-10T17:00:00+08:00',
    }) as JsonObject;
    expect(validateA3SFlowNodeConfiguration(node, value).errors[0]?.code).toBe(
      'flow.wait.invalid_resume_at',
    );

    value.resume_at = createA3SFlowExpression({
      op: 'literal',
      value: '2026-02-29T09:00:00Z',
    }) as JsonObject;
    expect(validateA3SFlowNodeConfiguration(node, value).errors[0]?.code).toBe(
      'flow.wait.invalid_resume_at',
    );
  });
});
