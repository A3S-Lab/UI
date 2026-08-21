import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const outputPath = resolve(projectRoot, 'src/integrations/langflow-catalog.generated.json');
const sourcePath = process.argv[2];
const revision = process.argv[3];

if (!sourcePath || !revision) {
  throw new Error(
    'Usage: node scripts/sync-langflow-catalog.mjs <component_index.json> <langflow-revision>',
  );
}

const source = JSON.parse(await readFile(resolve(sourcePath), 'utf8'));
if (!Array.isArray(source.entries) || typeof source.version !== 'string') {
  throw new Error('The input is not a Langflow component_index.json file.');
}

const categoryLabels = {
  agentics: 'Agentics',
  cassandra: 'Cassandra',
  crewai: 'CrewAI',
  custom_component: 'Custom components',
  data_source: 'Data sources',
  embeddings: 'Embeddings',
  files_and_knowledge: 'Files and knowledge',
  files_ingestion: 'File ingestion',
  flow_controls: 'Flow controls',
  input_output: 'Inputs and outputs',
  langchain_utilities: 'LangChain',
  llm_operations: 'LLM operations',
  models_and_agents: 'Models and agents',
  processing: 'Processing',
  prototypes: 'Prototypes',
  tools: 'Tools',
  utilities: 'Utilities',
};

function orderedFields(type, component) {
  const template = component.template ?? {};
  const sourceOrder = Array.isArray(component.field_order) ? component.field_order : [];
  const keys = [
    ...sourceOrder,
    ...Object.keys(template).filter((key) => !sourceOrder.includes(key)),
  ];
  const seen = new Set();
  return keys.flatMap((key) => {
    if (seen.has(key) || key === '_type' || (key === 'code' && type !== 'CustomComponent')) {
      return [];
    }
    seen.add(key);
    const field = template[key];
    if (!field || typeof field !== 'object' || Array.isArray(field)) return [];
    return [{ name: key, ...field }];
  });
}

const categories = source.entries.map(([category, components]) => ({
  id: category,
  label: categoryLabels[category] ?? category.replaceAll('_', ' '),
  nodes: Object.entries(components).map(([type, component]) => ({
    type,
    display_name: component.display_name,
    description: component.description,
    icon: component.icon,
    documentation: component.documentation,
    beta: component.beta === true,
    legacy: component.legacy === true,
    official: component.official !== false,
    tool_mode: component.tool_mode === true,
    base_classes: component.base_classes ?? [],
    input_types: component.input_types ?? [],
    output_types: component.output_types ?? [],
    fields: orderedFields(type, component),
    outputs: (component.outputs ?? []).map((output) => ({
      name: output.name,
      display_name: output.display_name,
      types: output.types ?? [],
      selected: output.selected,
      group_outputs: output.group_outputs === true,
      allows_loop: output.allows_loop === true,
      tool_mode: output.tool_mode === true,
      info: output.info,
    })),
  })),
}));

const nodes = categories.flatMap((category) => category.nodes);
const fields = nodes.flatMap((node) => node.fields);
const generated = {
  schemaVersion: 1,
  provenance: {
    repository: 'https://github.com/langflow-ai/langflow',
    revision,
    version: source.version,
    componentIndexSha256: source.sha256,
    sourcePath: 'src/lfx/src/lfx/_assets/component_index.json',
    categories: categories.length,
    nodes: nodes.length,
    fields: fields.length,
  },
  categories,
};

if (generated.provenance.categories !== source.metadata?.num_modules) {
  throw new Error('Category count differs from the Langflow index metadata.');
}
if (generated.provenance.nodes !== source.metadata?.num_components) {
  throw new Error('Node count differs from the Langflow index metadata.');
}

await writeFile(outputPath, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
console.log(
  `Synced Langflow ${source.version}: ${categories.length} categories, ${nodes.length} nodes, ${fields.length} fields.`,
);
