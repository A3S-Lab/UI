import {
  decodePointer,
  type FormDocument,
  getAtPointer,
  type JsonSchema,
  type UiNode,
} from '../core';

export interface NodeSchemaBinding {
  property: string;
  parentPointer: string;
  parentSchema: JsonSchema;
  schema: JsonSchema;
}

export interface DesignerSchemaScope {
  pointer: string;
  schema: JsonSchema;
  repeater?: UiNode;
}

export function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function pointerFromTokens(tokens: readonly string[]): string {
  return tokens.length > 0 ? `/${tokens.map(pointerToken).join('/')}` : '';
}

export function findDesignerParent(document: FormDocument, id: string): UiNode | undefined {
  return document.ui.nodes.find((node) => node.children?.includes(id));
}

export function schemaForNode(
  document: FormDocument,
  node: UiNode | undefined,
): JsonSchema | undefined {
  if (!node?.schemaPath) return undefined;
  const schema = getAtPointer(document.schema, node.schemaPath);
  return schema && typeof schema === 'object' && !Array.isArray(schema)
    ? (schema as JsonSchema)
    : undefined;
}

export function schemaBindingForNode(
  document: FormDocument,
  node: UiNode | undefined,
): NodeSchemaBinding | undefined {
  if (!node?.schemaPath) return undefined;
  const tokens = decodePointer(node.schemaPath);
  if (tokens.length < 2 || tokens.at(-2) !== 'properties') return undefined;
  const property = tokens.at(-1);
  if (!property) return undefined;
  const parentPointer = pointerFromTokens(tokens.slice(0, -2));
  const parent = getAtPointer(document.schema, parentPointer);
  if (!parent || typeof parent !== 'object' || Array.isArray(parent)) return undefined;
  const parentSchema = parent as JsonSchema;
  const schema = parentSchema.properties?.[property];
  return schema ? { property, parentPointer, parentSchema, schema } : undefined;
}

export function schemaScopeForContainer(
  document: FormDocument,
  containerId: string,
): DesignerSchemaScope {
  const visited = new Set<string>();
  let node = document.ui.nodes.find((candidate) => candidate.id === containerId);
  while (node && !visited.has(node.id)) {
    visited.add(node.id);
    if (node.kind === 'repeater') {
      const schema = schemaForNode(document, node);
      if (node.schemaPath && schema?.items?.type === 'object') {
        return { pointer: `${node.schemaPath}/items`, schema: schema.items, repeater: node };
      }
    }
    node = findDesignerParent(document, node.id);
  }
  return { pointer: '', schema: document.schema };
}

export function isDesignerContainer(
  document: FormDocument,
  node: UiNode | undefined,
): node is UiNode {
  if (!node || node.kind === 'field' || node.kind === 'content') return false;
  if (node.kind !== 'repeater') return true;
  return schemaForNode(document, node)?.items?.type === 'object';
}

export function schemaPathForProperty(scopePointer: string, property: string): string {
  return `${scopePointer}/properties/${pointerToken(property)}`;
}

export function allocateSchemaProperty(schema: JsonSchema, preferred: string): string {
  const properties = new Set(Object.keys(schema.properties ?? {}));
  if (!properties.has(preferred)) return preferred;
  let suffix = 2;
  while (properties.has(`${preferred}_${suffix}`)) suffix += 1;
  return `${preferred}_${suffix}`;
}
