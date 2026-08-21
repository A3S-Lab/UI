import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  assertCompiled,
  type FieldError,
  type JsonValue,
  resolveFormLocaleCatalog,
} from '../src/core';
import type { RuntimeDataGridColumn } from '../src/react/data-grid-bulk';
import {
  DataGridFillDialog,
  type DataGridFillSnapshot,
  DataGridPasteDialog,
} from '../src/react/data-grid-bulk-dialog';
import { DataGridSelectionBar } from '../src/react/data-grid-selection';
import { createObjectRepeaterDocument } from './fixtures';

const messages = resolveFormLocaleCatalog('en-US').messages;
const columns: readonly RuntimeDataGridColumn[] = [
  {
    id: 'name',
    label: 'Name',
    width: 6,
    path: 'name',
    schema: { type: 'string' },
    pasteable: true,
  },
  {
    id: 'note',
    label: 'Note',
    width: 6,
    path: 'note',
    pasteable: true,
  },
];

function repeaterNode() {
  const document = createObjectRepeaterDocument();
  const grid = document.ui.nodes.find((node) => node.id === 'recipients');
  if (!grid) throw new Error('Missing recipient repeater.');
  grid.layout = 'data-grid';
  return assertCompiled(document).nodeById.recipients;
}

describe('data grid bulk dialogs', () => {
  it('previews duplicate and empty cells, applies rows and handles every close path', async () => {
    const applied: JsonValue[][] = [];
    let closeCount = 0;
    render(
      <DataGridPasteDialog
        id="bulk"
        label="Recipients"
        columns={columns}
        messages={messages}
        disabled={false}
        items={[]}
        node={repeaterNode()}
        validateItems={(items) => ({ items, errors: [] })}
        onRequestClose={() => {
          closeCount += 1;
        }}
        onApply={(items) => applied.push(items)}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Paste rows into Recipients' });
    const input = within(dialog).getByLabelText('Tab-separated rows');
    await waitFor(() => expect(globalThis.document.activeElement).toBe(input));
    fireEvent.change(input, { target: { value: 'Ada\t\nAda\t' } });
    expect(within(dialog).getByText('2 rows · 4 cells')).toBeTruthy();
    expect(within(dialog).getAllByText('Empty')).toHaveLength(2);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Append rows' }));
    expect(applied).toHaveLength(1);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close paste rows dialog' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    fireEvent(dialog, new Event('close'));
    expect(closeCount).toBe(4);
  });

  it('localizes capacity, cell, row and missing-column paste failures', () => {
    const onClose = () => undefined;
    const view = render(
      <DataGridPasteDialog
        id="errors"
        label="Recipients"
        columns={columns}
        messages={messages}
        disabled={false}
        items={[]}
        maximum={0}
        node={repeaterNode()}
        validateItems={(items) => ({ items, errors: [] })}
        onRequestClose={onClose}
        onApply={() => undefined}
      />,
    );
    let dialog = screen.getByRole('dialog', { name: 'Paste rows into Recipients' });
    let input = within(dialog).getByLabelText('Tab-separated rows');
    fireEvent.change(input, { target: { value: 'Ada' } });
    expect(within(dialog).getByText('The pasted rows exceed the table capacity.')).toBeTruthy();

    view.rerender(
      <DataGridPasteDialog
        id="errors"
        label="Recipients"
        columns={columns}
        messages={messages}
        disabled={false}
        items={[]}
        node={repeaterNode()}
        validateItems={(items) => ({ items, errors: [] })}
        onRequestClose={onClose}
        onApply={() => undefined}
      />,
    );
    dialog = screen.getByRole('dialog', { name: 'Paste rows into Recipients' });
    input = within(dialog).getByLabelText('Tab-separated rows');
    fireEvent.change(input, { target: { value: 'Ada\tnote\textra' } });
    expect(
      within(dialog).getByText(
        'Row 1, column 3: This row contains more cells than the available columns.',
      ),
    ).toBeTruthy();

    const invalidNode = {
      ...repeaterNode(),
      schema: { type: 'array' as const, items: { type: 'string' as const } },
    };
    view.rerender(
      <DataGridPasteDialog
        id="errors"
        label="Recipients"
        columns={columns}
        messages={messages}
        disabled={false}
        items={[]}
        node={invalidNode}
        validateItems={(items) => ({ items, errors: [] })}
        onRequestClose={onClose}
        onApply={() => undefined}
      />,
    );
    dialog = screen.getByRole('dialog', { name: 'Paste rows into Recipients' });
    input = within(dialog).getByLabelText('Tab-separated rows');
    fireEvent.change(input, { target: { value: 'Ada' } });
    expect(within(dialog).getByText('Row 1: Enter a JSON object.')).toBeTruthy();

    view.rerender(
      <DataGridPasteDialog
        id="errors"
        label="Recipients"
        columns={[]}
        messages={messages}
        disabled={false}
        items={[]}
        node={repeaterNode()}
        validateItems={(items) => ({ items, errors: [] })}
        onRequestClose={onClose}
        onApply={() => undefined}
      />,
    );
    dialog = screen.getByRole('dialog', { name: 'Paste rows into Recipients' });
    input = within(dialog).getByLabelText('Tab-separated rows');
    fireEvent.change(input, { target: { value: 'Ada ' } });
    expect(within(dialog).getByText('No editable columns are available for paste.')).toBeTruthy();
  });

  it('keeps a failed fill atomic, updates the source preview and detects a removed target', () => {
    const fillColumns: readonly RuntimeDataGridColumn[] = [
      {
        id: 'metadata',
        label: 'Metadata',
        width: 6,
        path: 'metadata',
        schema: { type: 'object' },
        pasteable: true,
      },
      columns[0],
    ];
    const items: JsonValue[] = [
      { name: 'Ada', metadata: { code: 'A' } },
      { name: 'Grace', metadata: { code: 'B' } },
    ];
    const rows = items.map((value, index) => ({ key: `row-${index}`, index, value }));
    const snapshot: DataGridFillSnapshot = {
      rows: rows.map((row) => ({ key: row.key, value: structuredClone(row.value) })),
    };
    const applied: JsonValue[][] = [];
    let closeCount = 0;
    const validationError: FieldError = {
      path: 'recipients.1.metadata',
      code: 'metadata.invalid',
      message: 'Metadata is locked for this row.',
    };
    const view = render(
      <DataGridFillDialog
        id="fill"
        label="Recipients"
        columns={fillColumns}
        messages={messages}
        disabled={false}
        items={items}
        rows={rows}
        snapshot={snapshot}
        validateItems={(nextItems) => ({ items: nextItems, errors: [validationError] })}
        onRequestClose={() => {
          closeCount += 1;
        }}
        onApply={(nextItems) => applied.push(nextItems)}
      />,
    );

    let dialog = screen.getByRole('dialog', { name: 'Fill selected Recipients rows' });
    expect(within(dialog).getByText('{"code":"A"}')).toBeTruthy();
    const select = within(dialog).getByLabelText('Column to fill');
    fireEvent.change(select, { target: { value: 'name' } });
    expect(within(dialog).getByText('Ada')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fill selected rows' }));
    expect(
      within(dialog).getByText('Rows were not changed. Metadata is locked for this row.'),
    ).toBeTruthy();
    expect(applied).toHaveLength(0);

    view.rerender(
      <DataGridFillDialog
        id="fill"
        label="Recipients"
        columns={[fillColumns[0]]}
        messages={messages}
        disabled={false}
        items={items}
        rows={[rows[0]]}
        snapshot={snapshot}
        validateItems={(nextItems) => ({ items: nextItems, errors: [] })}
        onRequestClose={() => {
          closeCount += 1;
        }}
        onApply={(nextItems) => applied.push(nextItems)}
      />,
    );
    dialog = screen.getByRole('dialog', { name: 'Fill selected Recipients rows' });
    expect((within(dialog).getByLabelText('Column to fill') as HTMLSelectElement).value).toBe(
      'metadata',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fill selected rows' }));
    expect(within(dialog).getByText(/selected row changed/i)).toBeTruthy();

    view.rerender(
      <DataGridFillDialog
        id="fill"
        label="Recipients"
        columns={[]}
        messages={messages}
        disabled={false}
        items={[]}
        rows={[]}
        snapshot={{ rows: [] }}
        validateItems={(nextItems) => ({ items: nextItems, errors: [] })}
        onRequestClose={() => {
          closeCount += 1;
        }}
        onApply={(nextItems) => applied.push(nextItems)}
      />,
    );
    dialog = screen.getByRole('dialog', { name: 'Fill selected Recipients rows' });
    expect(within(dialog).getByText('Not provided')).toBeTruthy();
    expect(
      (within(dialog).getByRole('button', { name: 'Fill selected rows' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close fill down dialog' }));
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    fireEvent(dialog, new Event('close'));
    expect(closeCount).toBe(3);
  });

  it('labels disabled fill actions for minimum selection and missing editable columns', () => {
    let fillCount = 0;
    const view = render(
      <DataGridSelectionBar
        messages={messages}
        selectionKey="a\u0000b"
        selectedCount={2}
        visibleSelectedCount={1}
        minimum={2}
        canDelete={false}
        canFill
        fillColumnsAvailable
        disabled={false}
        onDelete={() => undefined}
        onFill={() => {
          fillCount += 1;
        }}
      />,
    );
    let fill = screen.getByRole('button', { name: 'Fill down' }) as HTMLButtonElement;
    expect(fill.disabled).toBe(true);
    expect(fill.title).toBe('Select at least two visible rows to fill down.');
    expect(screen.getByText('Keep at least 2 rows.')).toBeTruthy();

    view.rerender(
      <DataGridSelectionBar
        messages={messages}
        selectionKey="a\u0000b"
        selectedCount={2}
        visibleSelectedCount={2}
        minimum={2}
        canDelete
        canFill
        fillColumnsAvailable={false}
        disabled={false}
        onDelete={() => undefined}
        onFill={() => {
          fillCount += 1;
        }}
      />,
    );
    fill = screen.getByRole('button', { name: 'Fill down' }) as HTMLButtonElement;
    expect(fill.disabled).toBe(true);
    expect(fill.title).toBe('No editable columns are available for fill down.');
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    expect(screen.getByText('Delete 2 selected rows?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fillCount).toBe(0);
  });
});
