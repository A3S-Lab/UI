import type { UiNode } from '../src/core';
import {
  allocateSchemaProperty,
  schemaBindingForNode,
  schemaScopeForContainer,
} from '../src/react/designer-schema';
import { createDocument } from './fixtures';

describe('Designer schema scopes', () => {
  it('rejects malformed or non-object property bindings', () => {
    const document = createDocument();
    expect(
      schemaBindingForNode(document, {
        id: 'short',
        kind: 'field',
        schemaPath: '/properties',
      }),
    ).toBeUndefined();
    expect(
      schemaBindingForNode(document, {
        id: 'empty',
        kind: 'field',
        schemaPath: '/properties/',
      }),
    ).toBeUndefined();
    expect(
      schemaBindingForNode(document, {
        id: 'primitive-parent',
        kind: 'field',
        schemaPath: '/required/0/properties/value',
      }),
    ).toBeUndefined();
  });

  it('falls back to the root scope for a primitive repeater', () => {
    const document = createDocument();
    document.schema.properties = {
      ...document.schema.properties,
      tags: { type: 'array', items: { type: 'string' } },
    };
    const repeater: UiNode = {
      id: 'tags',
      kind: 'repeater',
      schemaPath: '/properties/tags',
    };
    document.ui.nodes.push(repeater);
    document.ui.nodes[0].children?.push(repeater.id);

    expect(schemaScopeForContainer(document, repeater.id)).toEqual({
      pointer: '',
      schema: document.schema,
    });
    expect(allocateSchemaProperty({}, 'field')).toBe('field');
  });
});
