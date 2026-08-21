import { compileForm } from '../src/core';
import { compileForm as compileFormReference } from '../src/core/compiler-reference';
import { createObjectRepeaterDocument } from './fixtures';

function dataGridDocument() {
  const document = createObjectRepeaterDocument();
  const grid = document.ui.nodes.find((node) => node.id === 'recipients');
  if (!grid) throw new Error('Missing recipient repeater.');
  grid.layout = 'data-grid';
  return { document, grid };
}

describe('portable data-grid configuration', () => {
  it('keeps valid configuration byte-semantically aligned with the TypeScript reference', () => {
    const { document, grid } = dataGridDocument();
    grid.dataGrid = {
      editMode: 'dialog',
      selection: 'multiple',
      sorting: 'single',
      filtering: 'search',
      paste: 'append',
      fill: 'down',
      virtualization: { mode: 'rows', viewportHeight: 420, overscan: 6 },
    };

    const portable = compileForm(document);
    const reference = compileFormReference(document);
    expect(portable.ok).toBe(true);
    expect(reference.ok).toBe(true);
    expect(portable.document).toEqual(reference.document);
    expect(portable.plan).toEqual(reference.plan);
    expect(portable.diagnostics).toEqual(reference.diagnostics);
  });

  it('returns the same bounded diagnostics for invalid configuration', () => {
    const { document, grid } = dataGridDocument();
    grid.dataGrid = {
      editMode: 'drawer',
      selection: 'single',
      sorting: 'multiple',
      filtering: 'column',
      paste: 'replace',
      fill: 'right',
      virtualization: {
        mode: 'columns',
        viewportHeight: 120,
        overscan: 0,
      },
    } as never;

    const portable = compileForm(document);
    const reference = compileFormReference(document);
    expect(portable.ok).toBe(false);
    expect(portable.diagnostics).toEqual(reference.diagnostics);
  });
});
