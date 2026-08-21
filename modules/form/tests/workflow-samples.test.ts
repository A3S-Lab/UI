import { wizardFormSeed } from '../apps/playground/src/wizard-sample';
import {
  createWorkflowFormSeed,
  workflowNodeDescriptors,
  workflowNodeKinds,
} from '../apps/playground/src/workflow-samples';
import { A3S_FLOW_V1_COMPATIBILITY, a3sFlowDagNodeManifestCatalog } from '../src/a3s-flow';
import { compileForm } from '../src/core';
import {
  createLangflowNodeDefaultValue,
  createLangflowNodeForm,
  LANGFLOW_CATALOG_PROVENANCE,
  type LangflowNodeDefinition,
  langflowFieldDefault,
  langflowNodeCatalog,
  langflowNodeCategories,
  requireLangflowNode,
  WORKFLOW_CONFIGURATION_WIDGET_KEYS,
} from '../src/workflow';

const expectedInputTypes = [
  'ActionPickerInput',
  'BoolInput',
  'CodeInput',
  'DataDisplayInput',
  'DataFrameInput',
  'DictInput',
  'DropdownInput',
  'DurationInput',
  'FileInput',
  'FloatInput',
  'HandleInput',
  'IntInput',
  'JSONInput',
  'McpInput',
  'MessageInput',
  'MessageTextInput',
  'ModelInput',
  'MultilineInput',
  'MultiselectInput',
  'NestedDictInput',
  'PromptInput',
  'QueryInput',
  'SecretStrInput',
  'SliderInput',
  'SortableListInput',
  'StrInput',
  'TabInput',
  'TableInput',
];

function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

describe('Workflow node catalogs', () => {
  it('pins the complete Langflow 1.11.3 component index', () => {
    expect(LANGFLOW_CATALOG_PROVENANCE).toEqual({
      repository: 'https://github.com/langflow-ai/langflow',
      revision: '3325c4642c489bfc2e2f4c9f3c63a32961f9581f',
      version: '1.11.3',
      componentIndexSha256: '9e19c76e01ef19fd82c6795f8c51c7c6eb7876bf2e9dfa0c33bb72b577d921e4',
      sourcePath: 'src/lfx/src/lfx/_assets/component_index.json',
      categories: 17,
      nodes: 131,
      fields: 797,
    });
    expect(langflowNodeCategories).toHaveLength(17);
    expect(langflowNodeCatalog).toHaveLength(131);
    expect(langflowNodeCatalog.flatMap((node) => node.fields)).toHaveLength(797);
    expect(new Set(langflowNodeCatalog.map((node) => node.type))).toHaveProperty('size', 131);
  });

  it('uses the visible Flow 1.0 DAG manifests as the primary Playground catalog', () => {
    const visibleManifests = a3sFlowDagNodeManifestCatalog.filter((manifest) => !manifest.internal);
    expect(workflowNodeDescriptors).toEqual(visibleManifests);
    expect(workflowNodeKinds).toEqual(visibleManifests.map((manifest) => manifest.type));
    expect(workflowNodeDescriptors).toHaveLength(18);
    expect(workflowNodeKinds).toContain('flow.signal');
    expect(workflowNodeKinds).toContain('iteration');
    expect(workflowNodeKinds).not.toContain('iteration-start');
  });

  it('compiles every official node with its source field order and defaults', () => {
    for (const node of langflowNodeCatalog) {
      const document = createLangflowNodeForm(node);
      const result = compileForm(document, {
        capabilities: { widgets: [...WORKFLOW_CONFIGURATION_WIDGET_KEYS] },
      });
      const fieldNames = node.fields.map((field) => field.name);

      expect(result.ok, `${node.type}: ${JSON.stringify(result.diagnostics)}`).toBe(true);
      expect(Object.keys(document.schema.properties ?? {})).toEqual(fieldNames);
      expect(Object.keys(document.schema.default ?? {})).toEqual(fieldNames);
      expect(document.schema.default).toEqual(createLangflowNodeDefaultValue(node));
      expect(document.metadata.owner).toBe('A3S Form');
      expect(document.metadata.compatibility).toContain('langflow/1.11.3');
    }
  });

  it('maps each source field exactly once and covers every source input type', () => {
    const inputTypes = new Set<string>();

    for (const node of langflowNodeCatalog) {
      const document = createLangflowNodeForm(node);
      for (const field of node.fields) {
        if (field._input_type) inputTypes.add(field._input_type);
        const schemaPath = `/properties/${pointerToken(field.name)}`;
        const matches = document.ui.nodes.filter(
          (candidate) => candidate.schemaPath === schemaPath,
        );
        expect(matches, `${node.type}.${field.name}`).toHaveLength(1);
        if (field.type === 'table') {
          expect(matches[0]).toEqual(
            expect.objectContaining({ kind: 'repeater', layout: 'data-grid' }),
          );
        } else {
          expect(matches[0]).toEqual(
            expect.objectContaining({ kind: 'field', widget: expect.any(String) }),
          );
        }
      }
    }

    expect([...inputTypes].sort()).toEqual(expectedInputTypes);
  });

  it('accepts dynamic build-config order and host visibility overrides without mutating the catalog', () => {
    const source = requireLangflowNode('APIRequest');
    const original = structuredClone(source.fields);
    const selected = [source.fields[2], source.fields[0], source.fields[1]];
    const buildConfig = Object.fromEntries(selected.map((field) => [field.name, { ...field }]));
    const hiddenName = selected[0].name;
    const document = createLangflowNodeForm(source, {
      buildConfig,
      fieldVisibility: { [hiddenName]: false },
    });

    expect(Object.keys(document.schema.properties ?? {})).toEqual(
      selected.map((field) => field.name),
    );
    expect(
      document.ui.nodes.find(
        (node) => node.schemaPath === `/properties/${pointerToken(hiddenName)}`,
      )?.hidden,
    ).toBe(true);
    expect(source.fields).toEqual(original);

    const sourceHidden = source.fields.find((field) => field.show === false);
    if (!sourceHidden) throw new Error('APIRequest must include a source-hidden field.');
    const revealed = createLangflowNodeForm(source, {
      fieldVisibility: { [sourceHidden.name]: true },
    });
    expect(
      revealed.ui.nodes.find(
        (node) => node.schemaPath === `/properties/${pointerToken(sourceHidden.name)}`,
      )?.hidden,
    ).toBe(false);
  });

  it('creates an A3S Flow 1.0 DAG-node Playground seed on demand', () => {
    const seed = createWorkflowFormSeed('flow.step');
    expect(seed.id).toBe('workflow-durable-work-flow-step-config');
    expect(seed.seedVersion).toBe(1000);
    expect(seed.document.metadata.title).toBe('Run Step configuration');
    expect(seed.document.metadata.compatibility).toEqual(A3S_FLOW_V1_COMPATIBILITY);
    expect(() => createWorkflowFormSeed('missing-node')).toThrow(
      'Unknown visible A3S Flow DAG node type',
    );
    expect(() => requireLangflowNode('missing-node')).toThrow('Unknown Langflow node type');
  });

  it('preserves Langflow fallback values, range metadata, option shapes, and table columns', () => {
    expect(langflowFieldDefault({ name: 'enabled', type: 'bool' })).toBe(false);
    expect(langflowFieldDefault({ name: 'count', type: 'int' })).toBe(0);
    expect(langflowFieldDefault({ name: 'delay', type: 'float' })).toBe(0);
    expect(langflowFieldDefault({ name: 'items', is_list: true })).toEqual([]);
    expect(langflowFieldDefault({ name: 'config', type: 'mcp' })).toEqual({});
    expect(langflowFieldDefault({ name: 'source', type: 'other' })).toBeNull();
    expect(langflowFieldDefault({ name: 'label', value: '__UNDEFINED__' })).toBe('');
    expect(langflowFieldDefault({ name: 'order', type: 'sortableList', value: 'invalid' })).toEqual(
      [],
    );

    const node: LangflowNodeDefinition = {
      category: 'tests',
      categoryLabel: 'Tests',
      type: 'CatalogEdgeNode',
      display_name: 'Catalog edge node',
      description: 'Exercises the complete descriptor conversion contract.',
      beta: false,
      legacy: false,
      official: true,
      tool_mode: false,
      base_classes: [],
      input_types: [],
      output_types: [],
      outputs: [],
      fields: [
        {
          name: 'matrix',
          type: 'table',
          _input_type: 'TableInput',
          required: true,
          input_types: ['DataFrame'],
          table_schema: {
            columns: [
              { name: 'enabled', type: 'bool', required: true, default: false },
              { name: 'count', type: 'integer', default: 1 },
              { name: 'score', type: 'number' },
              { name: 'metadata', type: 'object', default: { source: 'test' } },
              { name: 'tags', type: 'array', default: [], options: ['a', { bad: true }] },
              { name: 'mode', options: ['fast', 'safe'] },
            ],
          },
        },
        { name: 'empty_table', type: 'table' },
        {
          name: 'temperature',
          type: 'slider',
          range_spec: { min: 0, max: 2, step: 0.25 },
        },
        {
          name: 'retries',
          type: 'int',
          rangeSpec: { min: Number.NaN, max: Number.POSITIVE_INFINITY, step: 0 },
        },
        {
          name: 'provider',
          type: 'str',
          options: [
            'local',
            null,
            { name: 'remote', display_name: 'Remote' },
            { value: 'edge', label: 'Edge' },
            { value: { unsupported: true } },
          ],
        },
        {
          name: 'files',
          type: 'file',
          file_types: ['json'],
          model_type: 'embedding',
        },
      ],
    };
    const document = createLangflowNodeForm(node);
    const matrix = document.schema.properties?.matrix;

    expect(matrix?.items?.properties?.enabled?.type).toBe('boolean');
    expect(matrix?.items?.properties?.count?.type).toBe('integer');
    expect(matrix?.items?.properties?.score?.type).toBe('number');
    expect(matrix?.items?.properties?.metadata?.additionalProperties).toBe(true);
    expect(matrix?.items?.properties?.tags?.items).toEqual({});
    expect(matrix?.items?.properties?.mode?.enum).toEqual(['fast', 'safe']);
    expect(matrix?.items?.required).toEqual(['enabled']);
    expect(document.schema.properties?.temperature).toEqual(
      expect.objectContaining({ minimum: 0, maximum: 2, multipleOf: 0.25 }),
    );
    expect(document.schema.properties?.provider?.enum).toEqual(['local', null, 'remote', 'edge']);
    expect(document.ui.nodes.find((item) => item.label === 'files')?.customProps).toEqual(
      expect.objectContaining({ fileTypes: ['json'], modelType: 'embedding' }),
    );
  });
});

describe('wizard Playground example', () => {
  it('ships a compilable branched wizard with a final review page', () => {
    const result = compileForm(wizardFormSeed.document);
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    const wizard = wizardFormSeed.document.ui.nodes.find((node) => node.layout === 'wizard');
    expect(wizard?.children).toHaveLength(4);
    expect(
      wizard?.children?.map(
        (id) => wizardFormSeed.document.ui.nodes.find((node) => node.id === id)?.pageRole,
      ),
    ).toEqual(['form', 'form', 'form', 'review']);
    expect(wizardFormSeed.document.rules).toContainEqual(
      expect.objectContaining({ target: 'verification-page', kind: 'visible' }),
    );
  });
});
