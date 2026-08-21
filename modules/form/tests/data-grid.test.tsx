import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { assertCompiled, compileForm, type JsonObject } from '../src/core';
import { FormRenderer } from '../src/react';
import { createDocument, createObjectRepeaterDocument } from './fixtures';

function diagnosticCodes(input: unknown): string[] {
  return compileForm(input).diagnostics.map((diagnostic) => diagnostic.code);
}

describe('editable data grids', () => {
  it('accepts only object repeaters with direct field columns', () => {
    const valid = createObjectRepeaterDocument();
    const validGrid = valid.ui.nodes.find((node) => node.id === 'recipients');
    if (!validGrid) throw new Error('Missing recipient repeater.');
    validGrid.layout = 'data-grid';
    expect(compileForm(valid).ok).toBe(true);

    const wrongContainer = createDocument();
    wrongContainer.ui.nodes[0].layout = 'data-grid';
    expect(diagnosticCodes(wrongContainer)).toContain('data_grid.container');

    const empty = createObjectRepeaterDocument();
    const emptyGrid = empty.ui.nodes.find((node) => node.id === 'recipients');
    if (!emptyGrid) throw new Error('Missing recipient repeater.');
    emptyGrid.layout = 'data-grid';
    emptyGrid.children = [];
    expect(diagnosticCodes(empty)).toContain('data_grid.columns');

    const nestedColumn = createObjectRepeaterDocument();
    const nestedGrid = nestedColumn.ui.nodes.find((node) => node.id === 'recipients');
    const nested = nestedColumn.ui.nodes.find((node) => node.id === 'recipient-email');
    if (!nestedGrid || !nested) throw new Error('Missing recipient nodes.');
    nestedGrid.layout = 'data-grid';
    nested.kind = 'group';
    expect(diagnosticCodes(nestedColumn)).toContain('data_grid.column');

    const primitiveItems = createObjectRepeaterDocument();
    const primitiveGrid = primitiveItems.ui.nodes.find((node) => node.id === 'recipients');
    const primitiveSchema = primitiveItems.schema.properties?.recipients;
    if (!primitiveGrid || !primitiveSchema) throw new Error('Missing recipient schema.');
    primitiveGrid.layout = 'data-grid';
    primitiveSchema.items = { type: 'string' };
    expect(diagnosticCodes(primitiveItems)).toContain('data_grid.items_type');

    const malformed = createDocument();
    malformed.ui.nodes[0].layout = 'data-grid';
    Reflect.deleteProperty(malformed.ui.nodes[0], 'id');
    const malformedCodes = diagnosticCodes(malformed);
    expect(malformedCodes).toContain('node.id');
    expect(malformedCodes.some((code) => code.startsWith('data_grid.'))).toBe(false);

    const configured = createObjectRepeaterDocument();
    const configuredGrid = configured.ui.nodes.find((node) => node.id === 'recipients');
    if (!configuredGrid) throw new Error('Missing recipient repeater.');
    configuredGrid.layout = 'data-grid';
    configuredGrid.dataGrid = {
      editMode: 'dialog',
      selection: 'multiple',
      sorting: 'single',
      filtering: 'search',
      paste: 'append',
      fill: 'down',
      virtualization: {
        mode: 'rows',
        viewportHeight: 420,
        overscan: 6,
      },
    };
    expect(compileForm(configured).ok).toBe(true);

    const wrongScope = createObjectRepeaterDocument();
    const wrongScopeRepeater = wrongScope.ui.nodes.find((node) => node.id === 'recipients');
    if (!wrongScopeRepeater) throw new Error('Missing recipient repeater.');
    wrongScopeRepeater.dataGrid = { editMode: 'dialog' };
    expect(diagnosticCodes(wrongScope)).toContain('data_grid.config_scope');

    const invalidConfig = createObjectRepeaterDocument();
    const invalidConfigGrid = invalidConfig.ui.nodes.find((node) => node.id === 'recipients');
    if (!invalidConfigGrid) throw new Error('Missing recipient repeater.');
    invalidConfigGrid.layout = 'data-grid';
    invalidConfigGrid.dataGrid = {
      editMode: 'drawer' as never,
      selection: 'single' as never,
      sorting: 'multiple' as never,
      filtering: 'column' as never,
      paste: 'replace' as never,
      fill: 'right' as never,
      virtualization: {
        mode: 'columns',
        viewportHeight: 120,
        overscan: 0,
      } as never,
    };
    expect(diagnosticCodes(invalidConfig)).toEqual(
      expect.arrayContaining([
        'data_grid.edit_mode',
        'data_grid.selection',
        'data_grid.sorting',
        'data_grid.filtering',
        'data_grid.paste',
        'data_grid.fill',
        'data_grid.virtualization_mode',
        'data_grid.virtualization_height',
        'data_grid.virtualization_overscan',
      ]),
    );

    const malformedVirtualization = createObjectRepeaterDocument();
    const malformedVirtualizationGrid = malformedVirtualization.ui.nodes.find(
      (node) => node.id === 'recipients',
    );
    if (!malformedVirtualizationGrid) throw new Error('Missing recipient repeater.');
    malformedVirtualizationGrid.layout = 'data-grid';
    malformedVirtualizationGrid.dataGrid = {
      editMode: 'dialog',
      virtualization: 'rows' as never,
    };
    expect(diagnosticCodes(malformedVirtualization)).toContain('data_grid.virtualization');

    const inlineVirtualization = createObjectRepeaterDocument();
    const inlineVirtualizationGrid = inlineVirtualization.ui.nodes.find(
      (node) => node.id === 'recipients',
    );
    if (!inlineVirtualizationGrid) throw new Error('Missing recipient repeater.');
    inlineVirtualizationGrid.layout = 'data-grid';
    inlineVirtualizationGrid.dataGrid = {
      virtualization: { mode: 'rows' },
    } as never;
    expect(diagnosticCodes(inlineVirtualization)).toContain('data_grid.virtualization_edit_mode');

    const fillWithoutSelection = createObjectRepeaterDocument();
    const fillWithoutSelectionGrid = fillWithoutSelection.ui.nodes.find(
      (node) => node.id === 'recipients',
    );
    if (!fillWithoutSelectionGrid) throw new Error('Missing recipient repeater.');
    fillWithoutSelectionGrid.layout = 'data-grid';
    fillWithoutSelectionGrid.dataGrid = { fill: 'down' } as never;
    expect(diagnosticCodes(fillWithoutSelection)).toContain('data_grid.fill_selection');

    const nonObjectConfig = createObjectRepeaterDocument();
    const nonObjectConfigGrid = nonObjectConfig.ui.nodes.find((node) => node.id === 'recipients');
    if (!nonObjectConfigGrid) throw new Error('Missing recipient repeater.');
    nonObjectConfigGrid.layout = 'data-grid';
    nonObjectConfigGrid.dataGrid = [] as never;
    expect(diagnosticCodes(nonObjectConfig)).toContain('data_grid.config');
  });

  it('edits, adds, moves and removes controlled rows through a semantic table', () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    if (!gridNode) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    const plan = assertCompiled(document);

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [
          { rowId: 'recipient-1', name: 'Ada', email: 'ada@example.test' },
          { rowId: 'recipient-2', name: 'Grace', email: 'grace@example.test' },
        ],
      });
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} locale="en-US" />
          <output data-testid="grid-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<Harness />);
    const table = screen.getByRole('table', { name: 'Recipients' });
    expect(within(table).getByRole('columnheader', { name: 'Name' })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'Email' })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'Row actions' })).toBeTruthy();

    let rows = within(table).getAllByRole('row');
    fireEvent.change(within(rows[1]).getByLabelText('Name'), { target: { value: 'Ada L.' } });
    expect(screen.getByTestId('grid-value').textContent).toContain('"name":"Ada L."');

    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(4);
    fireEvent.change(within(rows[3]).getByLabelText('Name'), { target: { value: 'Lin' } });
    fireEvent.click(within(rows[3]).getByRole('button', { name: 'Move Recipients item 3 up' }));

    rows = within(table).getAllByRole('row');
    expect((within(rows[2]).getByLabelText('Name') as HTMLInputElement).value).toBe('Lin');
    fireEvent.click(within(rows[2]).getByRole('button', { name: 'Remove Recipients item 2' }));
    expect(screen.queryByDisplayValue('Lin')).toBeNull();
  });

  it('renders an actionable empty state inside the table and respects read-only mode', () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    const schema = document.schema.properties?.recipients;
    if (!gridNode || !schema) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = { sorting: 'single', filtering: 'search' };
    schema.minItems = 0;
    const plan = assertCompiled(document);

    const { rerender } = render(
      <FormRenderer
        plan={plan}
        value={{ recipients: [] }}
        onChange={() => undefined}
        locale="en-US"
      />,
    );
    const table = screen.getByRole('table', { name: 'Recipients' });
    expect(within(table).getByText('No rows yet. Add the first row to begin.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add row' })).toBeTruthy();

    rerender(
      <FormRenderer
        plan={plan}
        value={{
          recipients: [
            { rowId: 'recipient-1', name: 'Grace' },
            { rowId: 'recipient-2', name: 'Ada' },
          ],
        }}
        onChange={() => undefined}
        locale="en-US"
        readOnly
      />,
    );
    expect((screen.getAllByRole('textbox', { name: 'Name' })[0] as HTMLInputElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sort Name ascending' }));
    expect((screen.getAllByRole('textbox', { name: 'Name' })[0] as HTMLInputElement).value).toBe(
      'Ada',
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter Recipients rows' }), {
      target: { value: 'grace' },
    });
    expect(screen.getAllByRole('textbox', { name: 'Name' })).toHaveLength(1);
    expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Grace');
    expect((screen.getByRole('button', { name: 'Add row' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('keeps dialog edits in a validated draft until the row is saved', () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    if (!gridNode) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = { editMode: 'dialog' };
    const plan = assertCompiled(document);

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [
          { rowId: 'recipient-1', name: 'Ada', email: 'ada@example.test' },
          { rowId: 'recipient-2', name: 'Grace', email: 'grace@example.test' },
        ],
      });
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} locale="en-US" />
          <output data-testid="dialog-grid-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByRole('cell', { name: 'Ada' })).toBeTruthy();
    expect(screen.queryByLabelText('Name')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Recipients row 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit Recipients row 1' });
    expect((within(dialog).getByLabelText('Name') as HTMLInputElement).value).toBe('Ada');
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: '' } });
    expect(screen.getByTestId('dialog-grid-value').textContent).toContain('"name":"Ada"');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save row' }));
    expect(within(dialog).getByText('Enter at least 1 characters.')).toBeTruthy();
    expect(within(dialog).getByText('Fix the row errors before saving.')).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'Ada Lovelace' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save row' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('dialog-grid-value').textContent).toContain('"name":"Ada Lovelace"');

    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    const addDialog = screen.getByRole('dialog', { name: 'Add Recipients row' });
    fireEvent.change(within(addDialog).getByLabelText('Name'), { target: { value: 'Lin' } });
    fireEvent.click(within(addDialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByTestId('dialog-grid-value').textContent).not.toContain('"name":"Lin"');
  });

  it('sorts one column without mutating source order and edits the correct visible row', () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    if (!gridNode) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = { editMode: 'dialog', sorting: 'single' };
    const plan = assertCompiled(document);

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [
          { rowId: 'recipient-10', name: 'Agent 10', email: 'ten@example.test' },
          { rowId: 'recipient-2', name: 'Agent 2', email: 'two@example.test' },
        ],
      });
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} locale="en-US" />
          <output data-testid="sorted-grid-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<Harness />);
    const table = screen.getByRole('table', { name: 'Recipients' });
    fireEvent.click(within(table).getByRole('button', { name: 'Sort Name ascending' }));
    expect(
      within(table).getByRole('columnheader', { name: 'Name' }).getAttribute('aria-sort'),
    ).toBe('ascending');
    let rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Agent 2')).toBeTruthy();
    expect(within(rows[2]).getByText('Agent 10')).toBeTruthy();
    expect(screen.getByTestId('sorted-grid-value').textContent).toContain('"name":"Agent 10"');
    expect(screen.getByTestId('sorted-grid-value').textContent?.indexOf('Agent 10')).toBeLessThan(
      screen.getByTestId('sorted-grid-value').textContent?.indexOf('Agent 2') ?? 0,
    );

    const moveUp = within(rows[1]).getByRole('button', {
      name: 'Move Recipients item 1 up',
    }) as HTMLButtonElement;
    expect(moveUp.disabled).toBe(true);
    expect(moveUp.title).toBe('Clear sorting or filtering to change row order.');

    fireEvent.click(within(rows[1]).getByRole('button', { name: 'Edit Recipients row 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit Recipients row 1' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Agent 20' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save row' }));
    expect(screen.getByTestId('sorted-grid-value').textContent).toContain(
      '"rowId":"recipient-2","name":"Agent 20"',
    );

    rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Agent 10')).toBeTruthy();
    expect(within(rows[2]).getByText('Agent 20')).toBeTruthy();
    fireEvent.click(within(table).getByRole('button', { name: 'Sort Name descending' }));
    rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Agent 20')).toBeTruthy();
    fireEvent.click(within(table).getByRole('button', { name: 'Clear Name sorting' }));
    expect(
      within(table).getByRole('columnheader', { name: 'Name' }).hasAttribute('aria-sort'),
    ).toBe(false);

    const mobileSort = screen.getByRole('combobox', {
      name: 'Sort Recipients rows',
    }) as HTMLSelectElement;
    const missingColumnOption = globalThis.document.createElement('option');
    missingColumnOption.textContent = 'Missing column';
    missingColumnOption.value = '99:ascending';
    mobileSort.add(missingColumnOption);
    fireEvent.change(mobileSort, { target: { value: '99:ascending' } });
    const invalidDirectionOption = globalThis.document.createElement('option');
    invalidDirectionOption.textContent = 'Invalid direction';
    invalidDirectionOption.value = '0:sideways';
    mobileSort.add(invalidDirectionOption);
    fireEvent.change(mobileSort, { target: { value: '0:sideways' } });

    fireEvent.change(mobileSort, { target: { value: '0:ascending' } });
    rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Agent 10')).toBeTruthy();
    fireEvent.change(mobileSort, { target: { value: '0:descending' } });
    rows = within(table).getAllByRole('row');
    expect(within(rows[1]).getByText('Agent 20')).toBeTruthy();
    fireEvent.change(mobileSort, { target: { value: '' } });
    expect(mobileSort.value).toBe('');
  });

  it('filters across visible columns and selects only the visible rows', () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    const schema = document.schema.properties?.recipients;
    if (!gridNode || !schema) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = { editMode: 'dialog', filtering: 'search', selection: 'multiple' };
    schema.maxItems = 6;
    const plan = assertCompiled(document);

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [
          { rowId: 'recipient-1', name: 'Ada', email: 'ada@example.test' },
          { rowId: 'recipient-2', name: 'Grace', email: 'grace@example.test' },
          { rowId: 'recipient-3', name: 'Lin', email: 'lin@example.test' },
        ],
      });
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} locale="en-US" />
          <output data-testid="filtered-grid-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<Harness />);
    const filter = screen.getByRole('searchbox', { name: 'Filter Recipients rows' });
    fireEvent.change(filter, { target: { value: 'GRACE@EXAMPLE' } });
    expect(screen.getByText('1 of 3 rows')).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Grace' })).toBeTruthy();
    expect(screen.queryByRole('cell', { name: 'Ada' })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select visible Recipients rows' }));
    expect(screen.getByText('1 row selected')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear row filter' }));
    expect(
      (
        screen.getByRole('checkbox', {
          name: 'Select Recipients row 2',
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    fireEvent.change(filter, { target: { value: 'ada' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select visible Recipients rows' }));
    expect(screen.getByText('2 rows selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 rows' }));
    expect(screen.getByTestId('filtered-grid-value').textContent).toContain('"name":"Lin"');
    expect(screen.getByTestId('filtered-grid-value').textContent).not.toContain('"name":"Ada"');
    expect(screen.getByTestId('filtered-grid-value').textContent).not.toContain('"name":"Grace"');

    fireEvent.change(filter, { target: { value: 'missing' } });
    expect(screen.getByText('No rows match this filter.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear filter and show every row' })).toBeTruthy();
  });

  it('keeps an inline row in place until editing leaves the row', () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    if (!gridNode) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = { sorting: 'single', filtering: 'search' };
    const plan = assertCompiled(document);

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [
          { rowId: 'recipient-1', name: 'Grace', email: 'grace@example.test' },
          { rowId: 'recipient-2', name: 'Ada', email: 'ada@example.test' },
        ],
      });
      return <FormRenderer plan={plan} value={value} onChange={setValue} locale="en-US" />;
    }

    render(<Harness />);
    const table = screen.getByRole('table', { name: 'Recipients' });
    fireEvent.click(within(table).getByRole('button', { name: 'Sort Name ascending' }));
    let rows = within(table).getAllByRole('row');
    const nameInput = within(rows[1]).getByLabelText('Name');
    fireEvent.focus(nameInput);
    fireEvent.change(nameInput, { target: { value: 'Zoe' } });
    rows = within(table).getAllByRole('row');
    expect((within(rows[1]).getByLabelText('Name') as HTMLInputElement).value).toBe('Zoe');
    fireEvent.blur(nameInput, { relatedTarget: screen.getByRole('button', { name: 'Add row' }) });
    rows = within(table).getAllByRole('row');
    expect((within(rows[1]).getByLabelText('Name') as HTMLInputElement).value).toBe('Grace');
    expect((within(rows[2]).getByLabelText('Name') as HTMLInputElement).value).toBe('Zoe');
  });

  it('selects rows by stable identity and confirms a bounded bulk deletion', () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    if (!gridNode) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = { selection: 'multiple' };
    const plan = assertCompiled(document);

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [
          { rowId: 'recipient-1', name: 'Ada', email: 'ada@example.test' },
          { rowId: 'recipient-2', name: 'Grace', email: 'grace@example.test' },
        ],
      });
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} locale="en-US" />
          <button
            type="button"
            onClick={() =>
              setValue((current) => ({
                ...current,
                recipients: [
                  ...(current.recipients as JsonObject[]),
                  { rowId: 'recipient-3', name: 'Lin', email: 'lin@example.test' },
                ],
              }))
            }
          >
            Append host row
          </button>
          <button
            type="button"
            onClick={() =>
              setValue((current) => ({
                ...current,
                recipients: (current.recipients as JsonObject[]).slice(0, -1),
              }))
            }
          >
            Remove last host row
          </button>
          <output data-testid="selected-grid-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<Harness />);
    const firstRowSelection = screen.getByRole('checkbox', { name: 'Select Recipients row 1' });
    fireEvent.click(firstRowSelection);
    expect(screen.getByText('1 row selected')).toBeTruthy();
    fireEvent.click(firstRowSelection);
    expect(screen.queryByText('1 row selected')).toBeNull();
    fireEvent.click(firstRowSelection);
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    expect(screen.getByText('Delete 1 selected row?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete 1 row' }));
    expect(screen.getByTestId('selected-grid-value').textContent).not.toContain('recipient-1');
    expect(screen.getByTestId('selected-grid-value').textContent).toContain('recipient-2');

    fireEvent.click(screen.getByRole('button', { name: 'Append host row' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Recipients row 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove last host row' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete 1 row' }));
    expect(screen.getByTestId('selected-grid-value').textContent).toContain('recipient-2');

    const selectAll = screen.getByRole('checkbox', { name: 'Select all Recipients rows' });
    fireEvent.click(selectAll);
    expect(screen.queryByText('Delete 1 selected row?')).toBeNull();
    fireEvent.click(selectAll);
    expect(
      (screen.getByRole('button', { name: 'Delete selected' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByText('Keep at least 1 row.')).toBeTruthy();
  });

  it('reveals dialog rows for host errors and prevents stale draft overwrites', async () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    if (!gridNode) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = { editMode: 'dialog' };
    const plan = assertCompiled(document);

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [
          { rowId: 'recipient-1', name: 'Ada', email: 'ada@example.test' },
          { rowId: 'recipient-2', name: 'Grace', email: 'grace@example.test' },
        ],
      });
      return (
        <>
          <FormRenderer
            plan={plan}
            value={value}
            onChange={setValue}
            locale="en-US"
            errors={[
              {
                path: 'recipients.1.name',
                code: 'host.name',
                message: 'Use the reviewed recipient name.',
              },
            ]}
          />
          <button
            type="button"
            onClick={() =>
              setValue((current) => ({
                ...current,
                recipients: [
                  { rowId: 'recipient-1', name: 'Katherine', email: 'ada@example.test' },
                  ...((current.recipients as JsonObject[]).slice(1) ?? []),
                ],
              }))
            }
          >
            Replace first row
          </button>
          <button
            type="button"
            onClick={() =>
              setValue((current) => ({
                ...current,
                recipients: (current.recipients as JsonObject[]).slice(1),
              }))
            }
          >
            Remove first row
          </button>
          <output data-testid="conflict-grid-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Name: Use the reviewed recipient name.' }));
    const errorDialog = await screen.findByRole('dialog', { name: 'Edit Recipients row 2' });
    await waitFor(() =>
      expect(globalThis.document.activeElement).toBe(within(errorDialog).getByLabelText('Name')),
    );
    fireEvent.click(within(errorDialog).getByRole('button', { name: 'Cancel' }));

    fireEvent.click(screen.getByRole('button', { name: 'Edit Recipients row 1' }));
    const editDialog = screen.getByRole('dialog', { name: 'Edit Recipients row 1' });
    fireEvent.change(within(editDialog).getByLabelText('Name'), {
      target: { value: 'Ada draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Replace first row' }));
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Save row' }));
    expect(
      within(editDialog).getByText(
        'This row changed outside the editor. Close it and reopen the latest values.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('conflict-grid-value').textContent).toContain('"name":"Katherine"');
    expect(screen.getByTestId('conflict-grid-value').textContent).not.toContain('Ada draft');

    fireEvent.click(within(editDialog).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Recipients row 1' }));
    const removedRowDialog = screen.getByRole('dialog', { name: 'Edit Recipients row 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove first row' }));
    fireEvent.change(within(removedRowDialog).getByLabelText('Name'), {
      target: { value: 'Removed row draft' },
    });
    fireEvent.click(within(removedRowDialog).getByRole('button', { name: 'Save row' }));
    expect(within(removedRowDialog).getByText(/changed outside the editor/)).toBeTruthy();
    expect(screen.getByTestId('conflict-grid-value').textContent).toContain('"name":"Grace"');
    expect(screen.getByTestId('conflict-grid-value').textContent).not.toContain(
      'Removed row draft',
    );
  });

  it('appends typed spreadsheet rows atomically and restores focus to the paste action', async () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    const recipientSchema = document.schema.properties?.recipients?.items;
    if (!gridNode || !recipientSchema?.properties) throw new Error('Missing recipient fixture.');
    recipientSchema.properties.profile = {
      type: 'object',
      properties: { score: { type: 'integer', minimum: 1 } },
      additionalProperties: false,
    };
    recipientSchema.properties.active = { type: 'boolean' };
    recipientSchema.properties.total = { type: 'integer' };
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = { paste: 'append' };
    gridNode.children = [
      ...(gridNode.children ?? []),
      'recipient-score',
      'recipient-active',
      'recipient-total',
    ];
    document.ui.nodes.push(
      {
        id: 'recipient-score',
        kind: 'field',
        label: 'Score',
        schemaPath: '/properties/recipients/items/properties/profile/properties/score',
        widget: 'number',
      },
      {
        id: 'recipient-active',
        kind: 'field',
        label: 'Active',
        schemaPath: '/properties/recipients/items/properties/active',
        widget: 'switch',
      },
      {
        id: 'recipient-total',
        kind: 'field',
        label: 'Calculated total',
        schemaPath: '/properties/recipients/items/properties/total',
        widget: 'calculated',
      },
    );
    const plan = assertCompiled(document);

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [{ rowId: 'recipient-1', name: 'Grace', email: 'grace@example.test' }],
      });
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} locale="en-US" />
          <output data-testid="paste-grid-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<Harness />);
    const pasteAction = screen.getByRole('button', { name: 'Paste rows' });
    fireEvent.click(pasteAction);
    let dialog = screen.getByRole('dialog', { name: 'Paste rows into Recipients' });
    expect(within(dialog).queryByText('Calculated total')).toBeNull();
    const input = within(dialog).getByLabelText('Tab-separated rows');
    fireEvent.change(input, {
      target: {
        value: '"Ada\tLovelace"\tada@example.test\t7\ttrue\nLin\tlin@example.test\t9\t是',
      },
    });
    expect(within(dialog).getByText('2 rows · 8 cells')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Append rows' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('paste-grid-value').textContent).toContain(
      '"name":"Ada\\tLovelace","email":"ada@example.test","profile":{"score":7},"active":true',
    );
    expect(screen.getByTestId('paste-grid-value').textContent).toContain(
      '"name":"Lin","email":"lin@example.test","profile":{"score":9},"active":true',
    );
    await waitFor(() => expect(globalThis.document.activeElement).toBe(pasteAction));

    fireEvent.click(pasteAction);
    dialog = screen.getByRole('dialog', { name: 'Paste rows into Recipients' });
    fireEvent.change(within(dialog).getByLabelText('Tab-separated rows'), {
      target: { value: 'Dorothy\tnot-an-email\t4\tfalse' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Append rows' }));
    expect(within(dialog).getByText(/Rows were not added/)).toBeTruthy();
    expect(screen.getByTestId('paste-grid-value').textContent).not.toContain('Dorothy');
  });

  it('fills only visible selected rows and rejects stale host snapshots', () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    if (!gridNode) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = {
      selection: 'multiple',
      filtering: 'search',
      fill: 'down',
    };
    const plan = assertCompiled(document);

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [
          { rowId: 'recipient-1', name: 'Ada', email: 'shared@example.test' },
          { rowId: 'recipient-2', name: 'Grace', email: 'shared@example.test' },
          { rowId: 'recipient-3', name: 'Lin', email: 'private@example.test' },
        ],
      });
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} locale="en-US" />
          <button
            type="button"
            onClick={() =>
              setValue((current) => ({
                ...current,
                recipients: (current.recipients as JsonObject[]).map((row, index) =>
                  index === 1 ? { ...row, name: 'Katherine' } : row,
                ),
              }))
            }
          >
            Update selected host row
          </button>
          <output data-testid="fill-grid-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<Harness />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all Recipients rows' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter Recipients rows' }), {
      target: { value: 'shared@example' },
    });
    const fillAction = screen.getByRole('button', { name: 'Fill down' });
    fireEvent.click(fillAction);
    let dialog = screen.getByRole('dialog', { name: 'Fill selected Recipients rows' });
    expect(within(dialog).getByText('1 selected rows')).toBeTruthy();
    expect(within(dialog).getByText('Ada')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Update selected host row' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fill selected rows' }));
    expect(within(dialog).getByText(/selected row changed/i)).toBeTruthy();
    expect(screen.getByTestId('fill-grid-value').textContent).toContain('Katherine');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(fillAction);
    dialog = screen.getByRole('dialog', { name: 'Fill selected Recipients rows' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fill selected rows' }));
    const value = screen.getByTestId('fill-grid-value').textContent ?? '';
    expect(value).toContain('"rowId":"recipient-2","name":"Ada"');
    expect(value).toContain('"rowId":"recipient-3","name":"Lin"');
  });

  it('keeps a thousand-row dialog grid inside a bounded semantic row window', async () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    const schema = document.schema.properties?.recipients;
    if (!gridNode || !schema) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = {
      editMode: 'dialog',
      sorting: 'single',
      filtering: 'search',
      virtualization: { mode: 'rows', viewportHeight: 280, overscan: 2 },
    };
    schema.maxItems = 1_200;
    const plan = assertCompiled(document);
    const recipients = Array.from({ length: 1_000 }, (_, index) => ({
      rowId: `recipient-${index}`,
      name: `Recipient ${index}`,
      email: `recipient-${index}@example.test`,
    }));

    render(
      <FormRenderer plan={plan} value={{ recipients }} onChange={() => undefined} locale="en-US" />,
    );
    const viewport = screen.getByRole('region', { name: 'Recipients row viewport' });
    const table = screen.getByRole('table', { name: 'Recipients' });
    expect(table.getAttribute('aria-rowcount')).toBe('1001');
    expect(within(table).getAllByRole('row').length).toBeLessThan(16);
    expect(screen.getByRole('cell', { name: 'Recipient 0' })).toBeTruthy();
    expect(screen.queryByText('Recipient 200')).toBeNull();
    expect(screen.getByText(/1–\d+ of 1000 rows/)).toBeTruthy();

    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 5_600,
    });
    fireEvent.scroll(viewport);
    await act(
      () =>
        new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        }),
    );
    expect(screen.getByRole('cell', { name: 'Recipient 100' })).toBeTruthy();
    expect(screen.queryByText('Recipient 0')).toBeNull();
    expect(
      screen.getByRole('row', { name: 'Recipients row 101' }).getAttribute('aria-rowindex'),
    ).toBe('102');

    fireEvent.keyDown(viewport, { key: 'End' });
    await waitFor(() => expect(screen.getByRole('cell', { name: 'Recipient 999' })).toBeTruthy());
    expect(
      screen.getByRole('row', { name: 'Recipients row 1000' }).getAttribute('aria-rowindex'),
    ).toBe('1001');
    fireEvent.click(screen.getByRole('button', { name: 'Edit Recipients row 1000' }));
    expect(screen.getByRole('dialog', { name: 'Edit Recipients row 1000' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    fireEvent.keyDown(viewport, { key: 'Home' });
    await waitFor(() => expect(screen.getByRole('cell', { name: 'Recipient 0' })).toBeTruthy());

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter Recipients rows' }), {
      target: { value: 'recipient-999@example.test' },
    });
    expect(await screen.findByRole('cell', { name: 'Recipient 999' })).toBeTruthy();
    expect(table.getAttribute('aria-rowcount')).toBe('2');
    expect(screen.getByText('1–1 of 1 row')).toBeTruthy();
  });

  it('reveals and focuses an offscreen virtualized dialog row from a form error', async () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    const schema = document.schema.properties?.recipients;
    if (!gridNode || !schema) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = {
      editMode: 'dialog',
      virtualization: { mode: 'rows', viewportHeight: 280, overscan: 2 },
    };
    schema.maxItems = 250;
    const plan = assertCompiled(document);
    const recipients = Array.from({ length: 200 }, (_, index) => ({
      rowId: `recipient-${index}`,
      name: `Recipient ${index}`,
      email: `recipient-${index}@example.test`,
    }));

    render(
      <FormRenderer
        plan={plan}
        value={{ recipients }}
        onChange={() => undefined}
        locale="en-US"
        errors={[
          {
            path: 'recipients.180.name',
            code: 'host.recipient_review',
            message: 'Review this recipient.',
          },
        ]}
      />,
    );
    expect(screen.queryByText('Recipient 180')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Name: Review this recipient.' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Recipients row 181' });
    await waitFor(() =>
      expect(globalThis.document.activeElement).toBe(within(dialog).getByLabelText('Name')),
    );
  });

  it('falls back when native dialog methods are unavailable and reacts to a host maximum', () => {
    const document = createObjectRepeaterDocument();
    const gridNode = document.ui.nodes.find((node) => node.id === 'recipients');
    if (!gridNode) throw new Error('Missing recipient repeater.');
    gridNode.layout = 'data-grid';
    gridNode.dataGrid = { editMode: 'dialog' };
    const plan = assertCompiled(document);
    const prototype = HTMLDialogElement.prototype;
    const showModalDescriptor = Object.getOwnPropertyDescriptor(prototype, 'showModal');
    const closeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'close');
    Object.defineProperty(prototype, 'showModal', {
      configurable: true,
      value: () => {
        throw new Error('Dialog API unavailable.');
      },
    });
    Object.defineProperty(prototype, 'close', { configurable: true, value: undefined });

    function Harness() {
      const [value, setValue] = useState<JsonObject>({
        recipients: [
          { rowId: 'recipient-1', name: 'Ada', email: 'ada@example.test' },
          { rowId: 'recipient-2', name: 'Grace', email: 'grace@example.test' },
          { rowId: 'recipient-3', name: 'Lin', email: 'lin@example.test' },
        ],
      });
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} locale="en-US" />
          <button
            type="button"
            onClick={() =>
              setValue((current) => ({
                ...current,
                recipients: [
                  ...(current.recipients as JsonObject[]),
                  { rowId: 'recipient-4', name: 'Dorothy', email: 'dorothy@example.test' },
                ],
              }))
            }
          >
            Fill from host
          </button>
        </>
      );
    }

    const view = render(<Harness />);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
      const cancelledDialog = screen.getByRole('dialog', { name: 'Add Recipients row' });
      fireEvent(cancelledDialog, new Event('cancel', { bubbles: true, cancelable: true }));
      expect(screen.queryByRole('dialog')).toBeNull();

      Object.defineProperty(prototype, 'showModal', { configurable: true, value: undefined });
      fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
      const nativeCloseDialog = screen.getByRole('dialog', { name: 'Add Recipients row' });
      fireEvent(nativeCloseDialog, new Event('close'));
      expect(screen.queryByRole('dialog')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
      fireEvent.click(screen.getByRole('button', { name: 'Fill from host' }));
      const addButton = screen.getByRole('button', { name: 'Add row' }) as HTMLButtonElement;
      expect(addButton.disabled).toBe(true);
      expect(addButton.title).toBe('The maximum number of items is already present.');
      expect(screen.getAllByText('The maximum number of items is already present.')).toHaveLength(
        2,
      );
    } finally {
      view.unmount();
      if (showModalDescriptor) Object.defineProperty(prototype, 'showModal', showModalDescriptor);
      else Reflect.deleteProperty(prototype, 'showModal');
      if (closeDescriptor) Object.defineProperty(prototype, 'close', closeDescriptor);
      else Reflect.deleteProperty(prototype, 'close');
    }
  });
});
