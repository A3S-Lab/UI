import type { JsonObject, JsonValue } from '../src/core';
import {
  DATA_GRID_PASTE_MAX_BYTES,
  DATA_GRID_PASTE_MAX_ROWS,
  dataGridCellValue,
  fillDataGridColumn,
  parseDataGridPaste,
  type RuntimeDataGridColumn,
} from '../src/react/data-grid-bulk';

const columns: readonly RuntimeDataGridColumn[] = [
  {
    id: 'name',
    label: 'Name',
    width: 4,
    path: 'name',
    schema: { type: 'string', enum: ['Widget', 'Tabbed\tname'] },
    pasteable: true,
  },
  {
    id: 'quantity',
    label: 'Quantity',
    width: 2,
    path: 'quantity',
    schema: { type: 'integer', minimum: 1 },
    pasteable: true,
  },
  {
    id: 'active',
    label: 'Active',
    width: 2,
    path: 'active',
    schema: { type: 'boolean' },
    pasteable: true,
  },
  {
    id: 'metadata',
    label: 'Metadata',
    width: 4,
    path: 'metadata',
    schema: { type: 'object' },
    pasteable: true,
  },
];

function createItem(): JsonValue {
  return { id: 'generated', quantity: 1, active: false };
}

describe('data grid spreadsheet operations', () => {
  it('parses quoted TSV cells and preserves typed, nested row values', () => {
    const result = parseDataGridPaste(
      'Widget\t2\ttrue\t{"code":"A"}\r\n"Tabbed\tname"\t3\t0\t{"code":"B"}\n',
      columns,
      createItem,
    );

    expect(result).toEqual({
      ok: true,
      cells: [
        ['Widget', '2', 'true', '{"code":"A"}'],
        ['Tabbed\tname', '3', '0', '{"code":"B"}'],
      ],
      cellCount: 8,
      items: [
        {
          id: 'generated',
          name: 'Widget',
          quantity: 2,
          active: true,
          metadata: { code: 'A' },
        },
        {
          id: 'generated',
          name: 'Tabbed\tname',
          quantity: 3,
          active: false,
          metadata: { code: 'B' },
        },
      ],
    });
  });

  it('keeps defaults for empty typed cells and ignores fully empty rows', () => {
    const result = parseDataGridPaste('Widget\t\t\t\n\t\t\t\n', columns, createItem);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected a valid paste result.');
    expect(result.items).toEqual([{ id: 'generated', name: 'Widget', quantity: 1, active: false }]);
    expect(result.cellCount).toBe(4);
  });

  it('accepts quoted line breaks, doubled quotes and every supported typed value', () => {
    const typedColumns: readonly RuntimeDataGridColumn[] = [
      { ...columns[0], schema: { type: 'string' } },
      { ...columns[1], schema: { type: 'number' } },
      { ...columns[2], schema: { type: 'boolean' } },
      { ...columns[3], schema: { type: 'array' } },
      {
        id: 'empty',
        label: 'Empty',
        width: 1,
        path: 'empty',
        schema: { type: 'null' },
        pasteable: true,
      },
    ];
    const result = parseDataGridPaste(
      '"Widget ""XL""\r\nline"\t2.5\toff\t[1,"two"]\tnull',
      typedColumns,
      createItem,
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        items: [
          expect.objectContaining({
            name: 'Widget "XL"\nline',
            quantity: 2.5,
            active: false,
            metadata: [1, 'two'],
            empty: null,
          }),
        ],
      }),
    );
  });

  it.each([
    ['empty', '', undefined],
    ['unclosed_quote', '"Widget', undefined],
    ['quote_trailing', '"Widget"x', undefined],
    ['too_many_columns', 'Widget\t2\ttrue\t{}\textra', undefined],
    ['invalid_integer', 'Widget\t2.5', undefined],
    ['invalid_boolean', 'Widget\t2\tmaybe', undefined],
    ['invalid_json', 'Widget\t2\ttrue\t{broken}', undefined],
    ['enum', 'Unknown', undefined],
    ['capacity', 'Widget\nWidget', { remainingRows: 1 }],
  ])('reports %s without returning partial items', (code, text, options) => {
    const result = parseDataGridPaste(text, columns, createItem, options);

    expect(result).toEqual(
      expect.objectContaining({ ok: false, error: expect.objectContaining({ code }) }),
    );
  });

  it('bounds clipboard bytes and row count', () => {
    expect(
      parseDataGridPaste('x'.repeat(DATA_GRID_PASTE_MAX_BYTES + 1), columns, createItem),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'size' }),
      }),
    );
    expect(
      parseDataGridPaste(
        Array.from({ length: DATA_GRID_PASTE_MAX_ROWS + 1 }, () => 'Widget').join('\n'),
        columns,
        createItem,
      ),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'rows' }),
      }),
    );
    expect(parseDataGridPaste('Widget', columns, createItem, { maxBytes: 1 })).toEqual(
      expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'size' }) }),
    );
    expect(parseDataGridPaste('Widget\nWidget', columns, createItem, { maxRows: 1 })).toEqual(
      expect.objectContaining({ ok: false, error: expect.objectContaining({ code: 'rows' }) }),
    );
  });

  it('rejects invalid schema-specific values, missing columns and non-object row factories', () => {
    const column = (type: 'number' | 'object' | 'array' | 'null'): RuntimeDataGridColumn => ({
      id: type,
      label: type,
      width: 1,
      path: type,
      schema: { type },
      pasteable: true,
    });
    expect(parseDataGridPaste('Infinity', [column('number')], createItem)).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'invalid_number' }),
      }),
    );
    expect(
      parseDataGridPaste(
        'Infinity',
        [{ ...column('number'), id: 'integer', schema: { type: 'integer' } }],
        createItem,
      ),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'invalid_integer' }),
      }),
    );
    expect(parseDataGridPaste('[]', [column('object')], createItem)).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'invalid_object' }),
      }),
    );
    expect(parseDataGridPaste('{}', [column('array')], createItem)).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'invalid_array' }),
      }),
    );
    expect(parseDataGridPaste('nil', [column('null')], createItem)).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: 'invalid_null' }),
      }),
    );
    expect(parseDataGridPaste('Widget', [], createItem)).toEqual({
      ok: false,
      error: { code: 'no_columns' },
    });
    expect(parseDataGridPaste('""', [columns[0]], createItem)).toEqual({
      ok: false,
      error: { code: 'empty' },
    });
    expect(parseDataGridPaste('Widget', [columns[0]], () => 'row')).toEqual({
      ok: false,
      error: { code: 'invalid_object', row: 1 },
    });
  });

  it('copies and removes nested cell values without mutating source rows', () => {
    const items: JsonObject[] = [
      { when: { equals: 'enterprise' } },
      { when: { equals: 'consumer' } },
      { when: { equals: 'partner' } },
    ];
    const column: RuntimeDataGridColumn = {
      id: 'equals',
      label: 'Equals',
      width: 12,
      path: 'when.equals',
      schema: { type: 'string' },
      pasteable: true,
    };

    const filled = fillDataGridColumn(items, 0, [1, 2], column);
    expect(filled).toEqual([
      { when: { equals: 'enterprise' } },
      { when: { equals: 'enterprise' } },
      { when: { equals: 'enterprise' } },
    ]);
    expect(items[1]).toEqual({ when: { equals: 'consumer' } });

    const cleared = fillDataGridColumn([{}, ...items.slice(1)], 0, [1, 2], column);
    expect(cleared).toEqual([{}, { when: {} }, { when: {} }]);
  });

  it('guards missing paths and non-object sources or targets during cell operations', () => {
    const column: RuntimeDataGridColumn = {
      id: 'name',
      label: 'Name',
      width: 1,
      path: 'name',
      schema: { type: 'string' },
      pasteable: true,
    };
    const missingPath = { ...column, path: undefined };
    expect(dataGridCellValue(null, column)).toBeUndefined();
    expect(dataGridCellValue([], column)).toBeUndefined();
    expect(dataGridCellValue({ name: 'Ada' }, missingPath)).toBeUndefined();
    expect(fillDataGridColumn([{ name: 'Ada' }], 0, [0], missingPath)).toEqual([{ name: 'Ada' }]);
    expect(fillDataGridColumn(['source', { name: 'Grace' }], 0, [1], column)).toEqual([
      'source',
      { name: 'Grace' },
    ]);
    expect(fillDataGridColumn([{ name: 'Ada' }, null, []], 0, [0, 1, 2], column)).toEqual([
      { name: 'Ada' },
      null,
      [],
    ]);
  });
});
