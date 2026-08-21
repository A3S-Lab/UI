import {
  A3S_FLOW_CONTRACT_PROVENANCE,
  A3S_FLOW_ENGINE_VERSION,
  A3S_FLOW_TESTED_WORKFLOW_DSL_VERSION,
  A3S_FLOW_WORKFLOW_DAG_MAX_EDGES,
  A3S_FLOW_WORKFLOW_DAG_MAX_NODES,
  A3S_FLOW_WORKFLOW_DSL_MAX_BYTES,
  type A3SFlowWorkflowDag,
  type A3SFlowWorkflowDsl,
  classifyA3SFlowWorkflowDslVersion,
  compileA3SFlowWorkflowDag,
  createA3SFlowWorkflowDagNode,
  digestA3SFlowWorkflowDag,
  digestA3SFlowWorkflowDsl,
  parseA3SFlowWorkflowDslJson,
  updateA3SFlowWorkflowDagNodeConfiguration,
  validateA3SFlowWorkflowDsl,
} from '../src/a3s-flow';

function workflowDocument(): A3SFlowWorkflowDsl {
  return {
    version: '0.7.0',
    kind: 'app',
    app: {
      name: 'A3S workflow import fixture',
      mode: 'workflow',
      description: 'Echo one input through an LLM-compatible node.',
      use_icon_as_answer_icon: false,
    },
    dependencies: [
      {
        type: 'marketplace',
        value: {
          marketplace_plugin_unique_identifier: 'langgenius/openai:1.0.0@fixture',
        },
      },
    ],
    workflow: {
      conversation_variables: [],
      environment_variables: [],
      features: { file_upload: { enabled: false } },
      graph: {
        edges: [
          {
            id: 'start-source-llm-target',
            source: 'start',
            sourceHandle: 'source',
            target: 'llm',
            targetHandle: 'target',
            type: 'custom',
            data: {
              sourceType: 'start',
              targetType: 'llm',
              isInIteration: false,
              isInLoop: false,
            },
          },
          {
            id: 'llm-source-end-target',
            source: 'llm',
            sourceHandle: 'source',
            target: 'end',
            targetHandle: 'target',
            type: 'custom',
            data: {
              sourceType: 'llm',
              targetType: 'end',
              isInIteration: false,
              isInLoop: false,
            },
          },
        ],
        nodes: [
          {
            id: 'start',
            type: 'custom',
            position: { x: 0, y: 0 },
            data: {
              type: 'start',
              title: 'Start',
              variables: [
                {
                  variable: 'query',
                  label: 'Query',
                  type: 'text-input',
                  required: true,
                },
              ],
            },
          },
          {
            id: 'llm',
            type: 'custom',
            position: { x: 300, y: 0 },
            data: {
              type: 'llm',
              title: 'LLM',
              model: {
                provider: 'langgenius/openai/openai',
                name: 'gpt-4.1-mini',
                mode: 'chat',
              },
              prompt_template: [{ role: 'user', text: '{{#start.query#}}' }],
              'x-a3s-fixture-extension': { retained: true },
            },
          },
          {
            id: 'end',
            type: 'custom',
            position: { x: 600, y: 0 },
            data: {
              type: 'end',
              title: 'End',
              outputs: [
                {
                  variable: 'answer',
                  value_selector: ['llm', 'text'],
                  value_type: 'string',
                },
              ],
            },
          },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      'x-a3s-workflow-extension': { retained: true },
    },
    'x-a3s-document-extension': { retained: true },
  };
}

describe('A3S Flow v1 workflow DSL contract', () => {
  it('pins the current Flow engine, DSL, and source revision', () => {
    expect(A3S_FLOW_ENGINE_VERSION).toBe('1.0.0');
    expect(A3S_FLOW_TESTED_WORKFLOW_DSL_VERSION).toBe('0.7.0');
    expect(A3S_FLOW_CONTRACT_PROVENANCE).toEqual({
      repository: 'https://github.com/A3S-Lab/Flow',
      revision: '006e988b1f63e92a381f138d10af4084b96625a8',
      engineVersion: '1.0.0',
      workflowDslVersion: '0.7.0',
      maximumDocumentBytes: 10 * 1024 * 1024,
      maximumNodes: 10_000,
      maximumEdges: 100_000,
    });
  });

  it('matches Flow version classification and validates app metadata', () => {
    expect(classifyA3SFlowWorkflowDslVersion('0.7.0')).toBe('compatible');
    expect(classifyA3SFlowWorkflowDslVersion('0.6.9')).toBe('compatible_with_warnings');
    expect(classifyA3SFlowWorkflowDslVersion('0.7.1')).toBe('requires_confirmation');
    expect(classifyA3SFlowWorkflowDslVersion('1.0.0')).toBe('requires_confirmation');
    expect(classifyA3SFlowWorkflowDslVersion('latest')).toBe('invalid');

    expect(validateA3SFlowWorkflowDsl(workflowDocument())).toEqual({
      ok: true,
      compatibility: 'compatible',
    });
    expect(
      validateA3SFlowWorkflowDsl({
        ...workflowDocument(),
        app: { name: '', mode: 'workflow' },
      }),
    ).toMatchObject({ ok: false, issues: [{ code: 'flow.dsl.app_name' }] });
  });

  it('reports every workflow DSL envelope error and accepts both app modes', () => {
    const document = workflowDocument();
    const cases: Array<[unknown, string]> = [
      [null, 'flow.dsl.invalid_shape'],
      [{}, 'flow.dsl.version'],
      [{ ...document, version: 'latest' }, 'flow.dsl.version'],
      [{ ...document, kind: 'workflow' }, 'flow.dsl.kind'],
      [{ ...document, app: [] }, 'flow.dsl.app'],
      [{ ...document, app: { name: 42, mode: 'workflow' } }, 'flow.dsl.app_name'],
      [{ ...document, app: { name: 'Valid', mode: 'chat' } }, 'flow.dsl.app_mode'],
      [{ ...document, workflow: null }, 'flow.dsl.graph'],
      [{ ...document, workflow: {} }, 'flow.dsl.graph'],
    ];

    for (const [candidate, code] of cases) {
      expect(validateA3SFlowWorkflowDsl(candidate)).toMatchObject({
        ok: false,
        issues: [{ code }],
      });
    }

    expect(
      validateA3SFlowWorkflowDsl({
        ...document,
        version: '0.7.0-alpha.1',
        app: { name: 'Chat flow', mode: 'advanced-chat' },
      }),
    ).toEqual({ ok: true, compatibility: 'compatible' });
    expect(classifyA3SFlowWorkflowDslVersion('0.7.0+build.9')).toBe('compatible');
  });

  it('bounds and parses workflow DSL JSON without throwing', () => {
    expect(
      parseA3SFlowWorkflowDslJson(' '.repeat(A3S_FLOW_WORKFLOW_DSL_MAX_BYTES + 1)),
    ).toMatchObject({
      ok: false,
      issues: [{ code: 'flow.dsl.document_too_large' }],
    });
    expect(parseA3SFlowWorkflowDslJson('{')).toMatchObject({
      ok: false,
      issues: [{ code: 'flow.dsl.invalid_json' }],
    });
    expect(parseA3SFlowWorkflowDslJson(JSON.stringify({ version: '0.7.0' }))).toMatchObject({
      ok: false,
      issues: [{ code: 'flow.dsl.kind' }],
    });
    expect(parseA3SFlowWorkflowDslJson(JSON.stringify(workflowDocument()))).toMatchObject({
      ok: true,
      compatibility: 'compatible',
    });
  });

  it('derives deterministic top-level and container-scoped plans', () => {
    const result = compileA3SFlowWorkflowDag({
      nodes: [
        { id: 'end', data: { type: 'end' } },
        {
          id: 'iteration',
          data: { type: 'iteration', start_node_id: 'iteration-start' },
        },
        { id: 'start', data: { type: 'start' } },
        {
          id: 'inner',
          parentId: 'iteration',
          data: { type: 'template-transform', iteration_id: 'iteration' },
        },
        {
          id: 'iteration-start',
          parentId: 'iteration',
          data: { type: 'iteration-start' },
        },
      ],
      edges: [
        { id: 'iteration-end', source: 'iteration', target: 'end' },
        { id: 'start-iteration', source: 'start', target: 'iteration' },
        {
          id: 'iteration-start-inner',
          source: 'iteration-start',
          target: 'inner',
          data: { isInIteration: true, iteration_id: 'iteration' },
        },
      ],
    });

    expect(result).toEqual({
      ok: true,
      plan: {
        topLevel: ['start', 'iteration', 'end'],
        scopes: { iteration: ['iteration-start', 'inner'] },
      },
    });
  });

  it.each([
    [
      {
        nodes: [
          { id: 'same', data: { type: 'start' } },
          { id: 'same', data: { type: 'end' } },
        ],
        edges: [],
      },
      'flow.dag.duplicate_node',
    ],
    [
      {
        nodes: [{ id: 'start', data: { type: 'start' } }],
        edges: [{ id: 'missing', source: 'start', target: 'missing' }],
      },
      'flow.dag.missing_target',
    ],
    [
      {
        nodes: [
          { id: 'a', data: { type: 'start' } },
          { id: 'b', data: { type: 'end' } },
        ],
        edges: [
          { id: 'a-b', source: 'a', target: 'b' },
          { id: 'b-a', source: 'b', target: 'a' },
        ],
      },
      'flow.dag.cycle',
    ],
  ])('rejects invalid graph structure %#', (graph, code) => {
    expect(compileA3SFlowWorkflowDag(graph)).toMatchObject({
      ok: false,
      issues: [{ code }],
    });
  });

  it('reports bounded node, edge, scope, and container failures', () => {
    const nodeLimit = Array.from({ length: A3S_FLOW_WORKFLOW_DAG_MAX_NODES + 1 }, (_, index) => ({
      id: `node-${index}`,
      data: { type: 'step' },
    }));
    const edgeLimit = Array.from({ length: A3S_FLOW_WORKFLOW_DAG_MAX_EDGES + 1 }, (_, index) => ({
      id: `edge-${index}`,
      source: 'start',
      target: 'start',
    }));
    const cases: Array<{ code: string; graph: unknown }> = [
      { code: 'flow.dag.invalid_shape', graph: null },
      { code: 'flow.dag.empty', graph: { nodes: [], edges: [] } },
      { code: 'flow.dag.node_limit', graph: { nodes: nodeLimit, edges: [] } },
      {
        code: 'flow.dag.edge_limit',
        graph: { nodes: [{ id: 'start', data: { type: 'start' } }], edges: edgeLimit },
      },
      {
        code: 'flow.dag.invalid_node_id',
        graph: { nodes: [{ id: '', data: { type: 'start' } }], edges: [] },
      },
      {
        code: 'flow.dag.invalid_node_type',
        graph: { nodes: [{ id: 'start', data: { type: '' } }], edges: [] },
      },
      {
        code: 'flow.dag.missing_parent',
        graph: {
          nodes: [{ id: 'child', parentId: 'missing', data: { type: 'step' } }],
          edges: [],
        },
      },
      {
        code: 'flow.dag.invalid_parent_type',
        graph: {
          nodes: [
            { id: 'parent', data: { type: 'start' } },
            { id: 'child', parentId: 'parent', data: { type: 'step' } },
          ],
          edges: [],
        },
      },
      {
        code: 'flow.dag.invalid_container_start_type',
        graph: {
          nodes: [
            { id: 'iteration', data: { type: 'iteration', start_node_id: 'start' } },
            { id: 'start', parentId: 'iteration', data: { type: 'loop-start' } },
          ],
          edges: [],
        },
      },
      {
        code: 'flow.dag.invalid_container_start_type',
        graph: {
          nodes: [
            { id: 'loop', data: { type: 'loop', start_node_id: 'start' } },
            { id: 'start', parentId: 'loop', data: { type: 'iteration-start' } },
          ],
          edges: [],
        },
      },
      {
        code: 'flow.dag.missing_container_start',
        graph: { nodes: [{ id: 'iteration', data: { type: 'iteration' } }], edges: [] },
      },
      {
        code: 'flow.dag.missing_container_start',
        graph: {
          nodes: [{ id: 'iteration', data: { type: 'iteration', start_node_id: 'missing' } }],
          edges: [],
        },
      },
      {
        code: 'flow.dag.invalid_container_start',
        graph: {
          nodes: [
            { id: 'iteration', data: { type: 'iteration', start_node_id: 'start' } },
            { id: 'start', data: { type: 'iteration-start' } },
          ],
          edges: [],
        },
      },
      {
        code: 'flow.dag.empty_container',
        graph: {
          nodes: [
            { id: 'iteration', data: { type: 'iteration', start_node_id: 'start' } },
            { id: 'start', parentId: 'iteration', data: { type: 'iteration-start' } },
          ],
          edges: [],
        },
      },
      {
        code: 'flow.dag.parent_cycle',
        graph: {
          nodes: [
            {
              id: 'iteration',
              parentId: 'loop',
              data: { type: 'iteration', start_node_id: 'iteration-start' },
            },
            {
              id: 'loop',
              parentId: 'iteration',
              data: { type: 'loop', start_node_id: 'loop-start' },
            },
            {
              id: 'iteration-start',
              parentId: 'iteration',
              data: { type: 'iteration-start' },
            },
            { id: 'loop-start', parentId: 'loop', data: { type: 'loop-start' } },
          ],
          edges: [],
        },
      },
      {
        code: 'flow.dag.invalid_edge_id',
        graph: {
          nodes: [{ id: 'start', data: { type: 'start' } }],
          edges: [{ id: '', source: 'start', target: 'start' }],
        },
      },
      {
        code: 'flow.dag.duplicate_edge',
        graph: {
          nodes: [
            { id: 'start', data: { type: 'start' } },
            { id: 'end', data: { type: 'end' } },
          ],
          edges: [
            { id: 'edge', source: 'start', target: 'end' },
            { id: 'edge', source: 'start', target: 'end' },
          ],
        },
      },
      {
        code: 'flow.dag.missing_source',
        graph: {
          nodes: [{ id: 'end', data: { type: 'end' } }],
          edges: [{ id: 'edge', source: 'missing', target: 'end' }],
        },
      },
      {
        code: 'flow.dag.missing_source',
        graph: {
          nodes: [{ id: 'end', data: { type: 'end' } }],
          edges: [{ id: 'edge', source: 42, target: 'end' }],
        },
      },
      {
        code: 'flow.dag.missing_target',
        graph: {
          nodes: [{ id: 'start', data: { type: 'start' } }],
          edges: [{ id: 'edge', source: 'start', target: null }],
        },
      },
      {
        code: 'flow.dag.self_edge',
        graph: {
          nodes: [{ id: 'start', data: { type: 'start' } }],
          edges: [{ id: 'edge', source: 'start', target: 'start' }],
        },
      },
      {
        code: 'flow.dag.cross_scope_edge',
        graph: {
          nodes: [
            { id: 'top', data: { type: 'start' } },
            { id: 'iteration', data: { type: 'iteration', start_node_id: 'start' } },
            { id: 'start', parentId: 'iteration', data: { type: 'iteration-start' } },
            { id: 'child', parentId: 'iteration', data: { type: 'step' } },
          ],
          edges: [{ id: 'edge', source: 'child', target: 'top' }],
        },
      },
      {
        code: 'flow.dag.cycle',
        graph: {
          nodes: [
            { id: 'iteration', data: { type: 'iteration', start_node_id: 'start' } },
            { id: 'start', parentId: 'iteration', data: { type: 'iteration-start' } },
            { id: 'child', parentId: 'iteration', data: { type: 'step' } },
          ],
          edges: [
            { id: 'start-child', source: 'start', target: 'child' },
            { id: 'child-start', source: 'child', target: 'start' },
          ],
        },
      },
    ];

    for (const { code, graph } of cases) {
      expect(compileA3SFlowWorkflowDag(graph as A3SFlowWorkflowDag)).toMatchObject({
        ok: false,
        issues: [{ code }],
      });
    }
  });

  it('sorts independent nodes and multiple scopes by UTF-8 identifier', () => {
    const compilation = compileA3SFlowWorkflowDag({
      nodes: [
        { id: 'é', data: { type: 'step' } },
        { id: 'aa', data: { type: 'step' } },
        { id: 'a', data: { type: 'step' } },
        { id: 'iteration', data: { type: 'iteration', start_node_id: 'iteration-start' } },
        {
          id: 'iteration-start',
          parentId: 'iteration',
          data: { type: 'iteration-start' },
        },
        { id: 'iteration-task', parentId: 'iteration', data: { type: 'step' } },
        { id: 'loop', data: { type: 'loop', start_node_id: 'loop-start' } },
        { id: 'loop-start', parentId: 'loop', data: { type: 'loop-start' } },
        { id: 'loop-task', parentId: 'loop', data: { type: 'step' } },
      ],
      edges: [],
    });

    expect(compilation).toEqual({
      ok: true,
      plan: {
        topLevel: ['a', 'aa', 'iteration', 'loop', 'é'],
        scopes: {
          iteration: ['iteration-start', 'iteration-task'],
          loop: ['loop-start', 'loop-task'],
        },
      },
    });

    expect(
      compileA3SFlowWorkflowDag({
        nodes: [
          { id: 'c', data: { type: 'step' } },
          { id: 'b', data: { type: 'step' } },
          { id: 'a', data: { type: 'step' } },
        ],
        edges: [
          { id: 'a-c', source: 'a', target: 'c' },
          { id: 'b-c', source: 'b', target: 'c' },
        ],
      }),
    ).toEqual({ ok: true, plan: { topLevel: ['a', 'b', 'c'], scopes: {} } });
  });

  it('produces the byte-identical Flow execution digest', () => {
    const document = workflowDocument();
    expect(digestA3SFlowWorkflowDsl(document)).toBe(
      'a0ef26ef2c3e9c6aefe58e5e2546567bb0a6688336d96455e7f575fbde49c9c7',
    );

    const layoutChange = structuredClone(document);
    layoutChange.app.name = 'Renamed authoring surface';
    layoutChange.workflow.graph.nodes[1].position = { x: 999, y: -123 };
    layoutChange.workflow.graph.nodes[1].data.title = 'Presentation-only title';
    layoutChange.workflow.graph.viewport = { x: 42, y: 42, zoom: 0.25 };
    expect(digestA3SFlowWorkflowDsl(layoutChange)).toBe(digestA3SFlowWorkflowDsl(document));

    const semanticChange = structuredClone(document);
    const model = semanticChange.workflow.graph.nodes[1].data.model;
    if (!model || typeof model !== 'object' || Array.isArray(model)) throw new Error('model');
    model.name = 'different-model';
    expect(digestA3SFlowWorkflowDsl(semanticChange)).not.toBe(digestA3SFlowWorkflowDsl(document));
  });

  it('digests graph semantics and rejects non-executable documents and graphs', () => {
    const document = workflowDocument();
    document.dependencies = null as unknown as A3SFlowWorkflowDsl['dependencies'];
    for (const edge of document.workflow.graph.edges) delete edge.data;

    expect(digestA3SFlowWorkflowDag(document.workflow.graph)).toMatch(/^[a-f0-9]{64}$/);
    expect(digestA3SFlowWorkflowDsl(document)).toMatch(/^[a-f0-9]{64}$/);
    expect(() => digestA3SFlowWorkflowDsl({ ...document, kind: 'workflow' })).toThrow(
      'Workflow DSL kind must be app.',
    );
    expect(() =>
      digestA3SFlowWorkflowDsl({
        ...document,
        workflow: { ...document.workflow, graph: { nodes: [], edges: [] } },
      }),
    ).toThrow('An executable workflow DAG requires at least one node.');
    expect(() => digestA3SFlowWorkflowDag({ nodes: [], edges: [] })).toThrow(
      'An executable workflow DAG requires at least one node.',
    );
  });

  it('creates and updates lossless host-owned DAG nodes without changing type', () => {
    const node = createA3SFlowWorkflowDagNode(
      'review',
      'approval',
      { assignee: 'finance', 'x-vendor': { retained: true } },
      { position: { x: 80, y: 120 }, selected: true },
    );
    const updated = updateA3SFlowWorkflowDagNodeConfiguration(node, {
      assignee: 'legal',
      type: 'must-not-win',
    });

    expect(updated).toEqual({
      id: 'review',
      data: {
        type: 'approval',
        assignee: 'legal',
        'x-vendor': { retained: true },
      },
      position: { x: 80, y: 120 },
      selected: true,
    });
    expect(node.data.assignee).toBe('finance');
    expect(() => createA3SFlowWorkflowDagNode('', 'approval')).toThrow(
      'A3S Flow DAG node ID must not be empty.',
    );
    expect(() => createA3SFlowWorkflowDagNode('review', '')).toThrow(
      'A3S Flow DAG node type must not be empty.',
    );
  });
});
