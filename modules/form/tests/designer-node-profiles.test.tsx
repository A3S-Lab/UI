import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { UiNode } from '../src/core';
import {
  productionProfileIdForNode,
  resolveDesignerNodeUxProfile,
} from '../src/react/designer-node-profiles';
import { handlePanelTabKey } from '../src/react/designer-tabs';
import type { FormNodeRegistry } from '../src/react/node-registry';
import { createDocument } from './fixtures';

describe('designer node profile resolution', () => {
  it('distinguishes column presets using only children that exist in the document', () => {
    const document = createDocument();
    const columns: UiNode = {
      id: 'columns',
      kind: 'group',
      layout: 'columns',
    };

    expect(productionProfileIdForNode(columns, document)).toBeUndefined();
    columns.children = ['name', 'missing', 'age'];
    expect(productionProfileIdForNode(columns, document)).toBe('columns-2');
    columns.children = ['name', 'age', 'active'];
    expect(productionProfileIdForNode(columns, document)).toBe('columns-3');
  });

  it('uses extension metadata for a registered non-production widget', () => {
    const document = createDocument();
    const node: UiNode = {
      id: 'color',
      kind: 'field',
      widget: 'test.color',
    };
    const registry: FormNodeRegistry = {
      'test.color': {
        kind: 'field',
        catalog: {
          section: 'visual',
          sectionLabel: 'Visual fields',
          label: 'Color',
          description: 'Choose a color.',
          glyph: 'C',
        },
        render: () => null,
      },
    };

    expect(resolveDesignerNodeUxProfile(node, document, registry)).toEqual(
      expect.objectContaining({
        id: 'custom:test.color',
        typeLabel: 'Color',
        category: 'Visual fields',
        purpose: 'Choose a color.',
        editor: 'host',
        glyph: 'C',
      }),
    );
  });

  it('maps every non-production container context explicitly', () => {
    const document = createDocument();
    const nodes: Array<[UiNode, string]> = [
      [{ id: 'context-root', kind: 'root' }, 'root'],
      [{ id: 'context-page', kind: 'group', layout: 'page' }, 'page'],
      [{ id: 'context-tab', kind: 'group', layout: 'tab' }, 'tab'],
      [{ id: 'context-panel', kind: 'group', layout: 'collapse-panel' }, 'collapse-panel'],
      [{ id: 'context-column', kind: 'group', layout: 'flow' }, 'column'],
      [{ id: 'context-group', kind: 'group' }, 'group'],
    ];

    for (const [node, id] of nodes) {
      expect(resolveDesignerNodeUxProfile(node, document).id).toBe(id);
    }
  });

  it('ignores keyboard navigation when the active panel is not registered', () => {
    const onChange = () => {
      throw new Error('Unknown panels must not be selected.');
    };

    expect(() =>
      handlePanelTabKey(
        {} as ReactKeyboardEvent<HTMLButtonElement>,
        ['properties', 'validation'],
        'missing',
        onChange,
      ),
    ).not.toThrow();
  });
});
