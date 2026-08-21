import {
  canonicalize,
  getAtPath,
  type JsonObject,
  type JsonSchema,
  type JsonValue,
  removeAtPath,
  setAtPath,
} from '../core';

export const DATA_GRID_PASTE_MAX_BYTES = 256 * 1024;
export const DATA_GRID_PASTE_MAX_ROWS = 1000;

export interface RuntimeDataGridColumn {
  id: string;
  label: string;
  width: number;
  path?: string;
  schema?: JsonSchema;
  pasteable: boolean;
}

export type DataGridPasteErrorCode =
  | 'empty'
  | 'size'
  | 'rows'
  | 'unclosed_quote'
  | 'quote_trailing'
  | 'no_columns'
  | 'too_many_columns'
  | 'invalid_number'
  | 'invalid_integer'
  | 'invalid_boolean'
  | 'invalid_json'
  | 'invalid_object'
  | 'invalid_array'
  | 'invalid_null'
  | 'enum'
  | 'capacity';

export interface DataGridPasteError {
  code: DataGridPasteErrorCode;
  row?: number;
  column?: number;
}

export type DataGridPasteResult =
  | {
      ok: true;
      cells: string[][];
      cellCount: number;
      items: JsonValue[];
    }
  | {
      ok: false;
      error: DataGridPasteError;
    };

interface DataGridPasteOptions {
  remainingRows?: number;
  maxBytes?: number;
  maxRows?: number;
}

type CellResult =
  | { ok: true; value: JsonValue }
  | { ok: true; skip: true }
  | { ok: false; code: DataGridPasteErrorCode };

function clipboardByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function parseTsv(value: string): string[][] | DataGridPasteError {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;

  const finishCell = () => {
    cells.push(cell);
    cell = '';
    closedQuote = false;
  };
  const finishRow = () => {
    finishCell();
    rows.push(cells);
    cells = [];
  };

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const next = value[index + 1];
    if (quoted) {
      if (character === '"') {
        if (next === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else if (character === '\r' && next === '\n') {
        cell += '\n';
        index += 1;
      } else {
        cell += character;
      }
      continue;
    }
    if (closedQuote && character !== '\t' && character !== '\r' && character !== '\n') {
      return { code: 'quote_trailing', row: rows.length + 1, column: cells.length + 1 };
    }
    if (character === '\t') {
      finishCell();
      continue;
    }
    if (character === '\r' || character === '\n') {
      finishRow();
      if (character === '\r' && next === '\n') index += 1;
      continue;
    }
    if (character === '"' && cell.length === 0) {
      quoted = true;
      continue;
    }
    cell += character;
  }
  if (quoted) {
    return { code: 'unclosed_quote', row: rows.length + 1, column: cells.length + 1 };
  }
  finishRow();
  return rows;
}

function parseJsonCell(value: string): JsonValue | undefined {
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    return undefined;
  }
}

function coerceCell(value: string, schema: JsonSchema | undefined): CellResult {
  const type = schema?.type ?? 'string';
  const trimmed = value.trim();
  if (trimmed.length === 0 && type !== 'string') return { ok: true, skip: true };

  let parsed: JsonValue;
  if (type === 'number' || type === 'integer') {
    const number = Number(trimmed);
    if (!Number.isFinite(number)) {
      return { ok: false, code: type === 'integer' ? 'invalid_integer' : 'invalid_number' };
    }
    if (type === 'integer' && !Number.isInteger(number)) {
      return { ok: false, code: 'invalid_integer' };
    }
    parsed = number;
  } else if (type === 'boolean') {
    const normalized = trimmed.toLocaleLowerCase();
    if (['true', '1', 'yes', 'y', 'on', '是'].includes(normalized)) parsed = true;
    else if (['false', '0', 'no', 'n', 'off', '否'].includes(normalized)) parsed = false;
    else return { ok: false, code: 'invalid_boolean' };
  } else if (type === 'object' || type === 'array') {
    const json = parseJsonCell(value);
    if (json === undefined) return { ok: false, code: 'invalid_json' };
    if (type === 'object' && (json === null || typeof json !== 'object' || Array.isArray(json))) {
      return { ok: false, code: 'invalid_object' };
    }
    if (type === 'array' && !Array.isArray(json)) return { ok: false, code: 'invalid_array' };
    parsed = json;
  } else if (type === 'null') {
    if (trimmed !== 'null') return { ok: false, code: 'invalid_null' };
    parsed = null;
  } else {
    parsed = value;
  }

  if (
    schema?.enum &&
    !schema.enum.some((candidate) => canonicalize(candidate) === canonicalize(parsed))
  ) {
    return { ok: false, code: 'enum' };
  }
  return { ok: true, value: parsed };
}

export function parseDataGridPaste(
  value: string,
  columns: readonly RuntimeDataGridColumn[],
  createItem: () => JsonValue,
  options: DataGridPasteOptions = {},
): DataGridPasteResult {
  const maxBytes = options.maxBytes ?? DATA_GRID_PASTE_MAX_BYTES;
  const maxRows = options.maxRows ?? DATA_GRID_PASTE_MAX_ROWS;
  if (clipboardByteLength(value) > maxBytes) return { ok: false, error: { code: 'size' } };
  if (value.trim().length === 0) return { ok: false, error: { code: 'empty' } };
  const parsed = parseTsv(value);
  if (!Array.isArray(parsed)) return { ok: false, error: parsed };
  if (parsed.length > maxRows) return { ok: false, error: { code: 'rows' } };
  const cells = parsed.filter((row) => row.some((cell) => cell.length > 0));
  if (cells.length === 0) return { ok: false, error: { code: 'empty' } };
  if (options.remainingRows !== undefined && cells.length > options.remainingRows) {
    return { ok: false, error: { code: 'capacity' } };
  }

  type PasteColumn = RuntimeDataGridColumn & { path: string };
  const pasteColumns = columns.filter(
    (column): column is PasteColumn => column.pasteable && Boolean(column.path),
  );
  if (pasteColumns.length === 0) return { ok: false, error: { code: 'no_columns' } };
  const items: JsonValue[] = [];
  for (const [rowIndex, row] of cells.entries()) {
    if (row.length > pasteColumns.length) {
      return {
        ok: false,
        error: {
          code: 'too_many_columns',
          row: rowIndex + 1,
          column: pasteColumns.length + 1,
        },
      };
    }
    let item = createItem();
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, error: { code: 'invalid_object', row: rowIndex + 1 } };
    }
    for (const [columnIndex, cell] of row.entries()) {
      const column = pasteColumns[columnIndex] as PasteColumn;
      const result = coerceCell(cell, column.schema);
      if (!result.ok) {
        return {
          ok: false,
          error: { code: result.code, row: rowIndex + 1, column: columnIndex + 1 },
        };
      }
      if ('skip' in result) continue;
      item = setAtPath(item as JsonObject, column.path, result.value);
    }
    items.push(item);
  }
  return {
    ok: true,
    cells,
    cellCount: cells.reduce((total, row) => total + row.length, 0),
    items,
  };
}

export function dataGridCellValue(
  item: JsonValue,
  column: RuntimeDataGridColumn,
): JsonValue | undefined {
  if (!column.path || item === null || typeof item !== 'object' || Array.isArray(item)) {
    return undefined;
  }
  return getAtPath(item, column.path) as JsonValue | undefined;
}

export function fillDataGridColumn(
  items: readonly JsonValue[],
  sourceIndex: number,
  targetIndices: readonly number[],
  column: RuntimeDataGridColumn,
): JsonValue[] {
  const nextItems = [...items];
  const source = items[sourceIndex];
  if (!column.path || source === null || typeof source !== 'object' || Array.isArray(source)) {
    return nextItems;
  }
  const value = dataGridCellValue(source, column);
  for (const index of new Set(targetIndices)) {
    if (index === sourceIndex) continue;
    const item = items[index];
    if (item === null || typeof item !== 'object' || Array.isArray(item)) continue;
    nextItems[index] =
      value === undefined
        ? removeAtPath(item, column.path)
        : setAtPath(item, column.path, structuredClone(value));
  }
  return nextItems;
}
