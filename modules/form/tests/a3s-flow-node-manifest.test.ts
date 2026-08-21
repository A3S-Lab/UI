import {
  A3S_FLOW_DAG_NODE_MANIFEST_PROVENANCE,
  A3S_FLOW_RUNTIME_COMMAND_BINDINGS,
  a3sFlowDagNodeManifestCatalog,
  a3sFlowDagNodeRegistry,
  createA3SFlowDagNode,
  createA3SFlowDagNodeRegistry,
  defineA3SFlowDagNodeManifest,
  getA3SFlowDagNodeManifest,
  mergeA3SFlowDagNodeConfiguration,
  requireA3SFlowDagNodeManifest,
  selectA3SFlowDagNodeConfiguration,
} from '../src/a3s-flow';

describe('A3S Flow v1 host node manifests', () => {
  it('covers every Flow 1.0 runtime command and structural container', () => {
    expect(A3S_FLOW_RUNTIME_COMMAND_BINDINGS).toEqual([
      'complete',
      'fail',
      'cancel',
      'timeout',
      'continue_as_new',
      'record_progress',
      'link_child_operation',
      'start_child_workflow',
      'start_child_workflows',
      'schedule_step',
      'schedule_steps',
      'wait_until',
      'create_hook',
      'wait_for_signal',
    ]);
    expect(A3S_FLOW_DAG_NODE_MANIFEST_PROVENANCE).toMatchObject({
      engineVersion: '1.0.0',
      flowRevision: '006e988b1f63e92a381f138d10af4084b96625a8',
      runtimeCommands: 14,
      structuralNodeTypes: ['iteration', 'iteration-start', 'loop', 'loop-start'],
      ownership: 'host',
    });

    const visibleTypes = a3sFlowDagNodeManifestCatalog
      .filter((manifest) => !manifest.internal)
      .map((manifest) => manifest.type);
    expect(visibleTypes).toEqual(
      expect.arrayContaining([
        'flow.start',
        'flow.condition',
        'flow.cancel',
        'flow.timeout',
        'flow.continue-as-new',
        'flow.progress',
        'flow.child-operation',
        'flow.child-workflow',
        'flow.child-workflows',
        'flow.signal',
        'iteration',
        'loop',
      ]),
    );
    expect(a3sFlowDagNodeManifestCatalog.map((manifest) => manifest.type)).toEqual(
      expect.arrayContaining(['iteration-start', 'loop-start']),
    );
  });

  it('registers host-owned node types without claiming engine ownership', () => {
    const approval = defineA3SFlowDagNodeManifest({
      type: 'acme.approval',
      display_name: 'Approval',
      description: 'Wait for a human decision.',
      category: 'host',
      categoryLabel: 'Host nodes',
      role: 'host',
      fields: [
        {
          name: 'team',
          display_name: 'Team',
          type: 'str',
          _input_type: 'StrInput',
          value: 'finance',
          required: true,
        },
      ],
      ports: { inputs: [], outputs: [] },
      input_types: [],
      output_types: [],
      outputs: [],
    });
    const registry = createA3SFlowDagNodeRegistry([approval]);

    expect(registry.get('acme.approval')).toBe(approval);
    expect(registry.list()).toEqual([approval]);
    expect(() => registry.require('missing')).toThrow('Unknown A3S Flow DAG node type: missing');
  });

  it('rejects invalid manifests and duplicate host registrations', () => {
    const base = {
      type: 'acme.task',
      display_name: 'Task',
      description: 'Host task.',
      category: 'host',
      categoryLabel: 'Host nodes',
      role: 'host' as const,
      fields: [],
      ports: { inputs: [], outputs: [] },
      input_types: [],
      output_types: [],
      outputs: [],
    };

    expect(() => defineA3SFlowDagNodeManifest({ ...base, type: ' ' })).toThrow(
      'A3S Flow DAG node type must not be empty.',
    );
    expect(() => defineA3SFlowDagNodeManifest({ ...base, display_name: '' })).toThrow(
      'display name must not be empty.',
    );
    expect(() =>
      defineA3SFlowDagNodeManifest({
        ...base,
        fields: [
          { name: 'value', type: 'str' },
          { name: 'value', type: 'str' },
        ],
      }),
    ).toThrow('Duplicate field value');
    expect(() => defineA3SFlowDagNodeManifest({ ...base, role: 'runtime-command' })).toThrow(
      'requires a runtimeBinding',
    );
    expect(() => defineA3SFlowDagNodeManifest({ ...base, role: 'container' })).toThrow(
      'requires a container contract',
    );

    const manifest = defineA3SFlowDagNodeManifest(base);
    expect(() => createA3SFlowDagNodeRegistry([manifest, manifest])).toThrow(
      'Duplicate A3S Flow DAG node type',
    );
  });

  it('filters internal manifests and fails closed on type mismatches', () => {
    expect(a3sFlowDagNodeRegistry.list({ includeInternal: false })).toHaveLength(18);
    expect(getA3SFlowDagNodeManifest('missing')).toBeUndefined();

    const timeout = requireA3SFlowDagNodeManifest('flow.timeout');
    const wrong = { id: 'wrong', data: { type: 'flow.cancel' } };
    expect(() => selectA3SFlowDagNodeConfiguration(wrong, timeout)).toThrow(
      'does not match manifest',
    );
    expect(() => mergeA3SFlowDagNodeConfiguration(wrong, timeout, {})).toThrow(
      'does not match manifest',
    );

    const sparse = { id: 'timeout', data: { type: 'flow.timeout' } };
    expect(selectA3SFlowDagNodeConfiguration(sparse, timeout)).toHaveProperty('reason', '');
    expect(mergeA3SFlowDagNodeConfiguration(sparse, timeout, {})).toEqual(sparse);
    expect(() => createA3SFlowDagNode('', timeout)).toThrow(
      'A3S Flow DAG node ID must not be empty.',
    );
  });

  it('creates and edits node data without losing unknown semantics or presentation', () => {
    const timeout = requireA3SFlowDagNodeManifest('flow.timeout');
    const created = createA3SFlowDagNode('timeout-1', timeout, {
      reason: 'SLA exceeded',
      'x-vendor': { retained: true },
    });
    expect(created.data.type).toBe('flow.timeout');
    expect(created.data['x-vendor']).toEqual({ retained: true });

    const source = {
      ...created,
      position: { x: 120, y: 80 },
      selected: true,
      data: {
        ...created.data,
        deadline: { custom: 'future-expression' },
        'x-future-semantic': { retained: true },
      },
    };
    const selected = selectA3SFlowDagNodeConfiguration(source, timeout);
    expect(selected).not.toHaveProperty('type');
    expect(selected).not.toHaveProperty('x-future-semantic');

    const updated = mergeA3SFlowDagNodeConfiguration(source, timeout, {
      ...selected,
      reason: 'Updated reason',
      type: 'must-not-win',
    });
    expect(updated).toMatchObject({
      position: { x: 120, y: 80 },
      selected: true,
      data: {
        type: 'flow.timeout',
        reason: 'Updated reason',
        'x-vendor': { retained: true },
        'x-future-semantic': { retained: true },
      },
    });
  });

  it('pins the required container start-node contracts', () => {
    expect(requireA3SFlowDagNodeManifest('iteration')).toMatchObject({
      role: 'container',
      container: { startNodeType: 'iteration-start' },
    });
    expect(requireA3SFlowDagNodeManifest('loop')).toMatchObject({
      role: 'container',
      container: { startNodeType: 'loop-start' },
    });
    expect(requireA3SFlowDagNodeManifest('iteration-start')).toMatchObject({
      role: 'container-start',
      internal: true,
    });
  });
});
