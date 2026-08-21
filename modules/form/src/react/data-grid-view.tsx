import { type FocusEvent as ReactFocusEvent, type SetStateAction, useMemo, useState } from 'react';
import { canonicalize, type FormLocaleMessages, formatFormMessage, type JsonValue } from '../core';
import type { StableRepeaterRow } from './repeater-state';

export type DataGridSortDirection = 'ascending' | 'descending';

export interface DataGridSortState {
  columnId: string;
  direction: DataGridSortDirection;
}

interface PinnedRow {
  key: string;
  filterMatches: boolean;
  sortColumnId?: string;
  sortValue?: JsonValue;
}

interface DataGridViewOptions {
  rows: readonly StableRepeaterRow[];
  columns: readonly { id: string; label: string; width: number }[];
  locale?: string;
  sorting: boolean;
  filtering: boolean;
  pinFocusedRow: boolean;
  getCellValue: (nodeId: string, index: number) => JsonValue | undefined;
  formatCellValue: (nodeId: string, index: number) => string;
}

function normalizeSearch(value: string, locale?: string): string {
  const normalized = value.normalize('NFKC');
  try {
    return locale ? normalized.toLocaleLowerCase(locale) : normalized.toLocaleLowerCase();
  } catch {
    return normalized.toLowerCase();
  }
}

function searchTokens(value: string, locale?: string): string[] {
  return normalizeSearch(value.trim(), locale).split(/\s+/u).filter(Boolean);
}

function rowMatchesFilter(
  row: StableRepeaterRow,
  columns: DataGridViewOptions['columns'],
  tokens: readonly string[],
  locale: string | undefined,
  formatCellValue: DataGridViewOptions['formatCellValue'],
): boolean {
  if (tokens.length === 0) return true;
  const text = normalizeSearch(
    columns.map((column) => formatCellValue(column.id, row.index)).join('\n'),
    locale,
  );
  return tokens.every((token) => text.includes(token));
}

function createCollator(locale?: string): Intl.Collator {
  try {
    return new Intl.Collator(locale, {
      numeric: true,
      sensitivity: 'base',
      usage: 'sort',
    });
  } catch {
    return new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
      usage: 'sort',
    });
  }
}

function isEmptySortValue(value: JsonValue | undefined): boolean {
  return value === undefined || value === null || value === '';
}

function compareGridValues(left: JsonValue, right: JsonValue, collator: Intl.Collator): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right);
  const leftText = typeof left === 'string' ? left : canonicalize(left);
  const rightText = typeof right === 'string' ? right : canonicalize(right);
  return collator.compare(leftText, rightText);
}

export function useDataGridView(options: DataGridViewOptions) {
  const [filterValue, setFilterValue] = useState('');
  const [sortState, setSortState] = useState<DataGridSortState>();
  const [pinnedRow, setPinnedRow] = useState<PinnedRow>();
  const tokens = useMemo(
    () => (options.filtering ? searchTokens(filterValue, options.locale) : []),
    [filterValue, options.filtering, options.locale],
  );
  const activeSort =
    options.sorting &&
    sortState &&
    options.columns.some((column) => column.id === sortState.columnId)
      ? sortState
      : undefined;
  const collator = useMemo(() => createCollator(options.locale), [options.locale]);

  const visibleRows = useMemo(() => {
    const filtered = options.rows.filter((row) =>
      pinnedRow?.key === row.key
        ? pinnedRow.filterMatches
        : rowMatchesFilter(row, options.columns, tokens, options.locale, options.formatCellValue),
    );
    if (!activeSort) return filtered;
    return [...filtered].sort((left, right) => {
      const leftValue =
        pinnedRow?.key === left.key && pinnedRow.sortColumnId === activeSort.columnId
          ? pinnedRow.sortValue
          : options.getCellValue(activeSort.columnId, left.index);
      const rightValue =
        pinnedRow?.key === right.key && pinnedRow.sortColumnId === activeSort.columnId
          ? pinnedRow.sortValue
          : options.getCellValue(activeSort.columnId, right.index);
      const leftEmpty = isEmptySortValue(leftValue);
      const rightEmpty = isEmptySortValue(rightValue);
      if (leftEmpty || rightEmpty)
        return leftEmpty === rightEmpty ? left.index - right.index : leftEmpty ? 1 : -1;
      const comparison = compareGridValues(
        leftValue as JsonValue,
        rightValue as JsonValue,
        collator,
      );
      if (comparison === 0) return left.index - right.index;
      return activeSort.direction === 'ascending' ? comparison : -comparison;
    });
  }, [
    activeSort,
    collator,
    options.columns,
    options.formatCellValue,
    options.getCellValue,
    options.locale,
    options.rows,
    pinnedRow,
    tokens,
  ]);

  const cycleSort = (columnId: string) => {
    setSortState((current) => {
      if (!current || current.columnId !== columnId) return { columnId, direction: 'ascending' };
      if (current.direction === 'ascending') return { columnId, direction: 'descending' };
      return undefined;
    });
  };

  const captureFocusedRow = (event: ReactFocusEvent<HTMLTableElement>) => {
    if (!options.pinFocusedRow || (!activeSort && tokens.length === 0)) return;
    const rowElement = (event.target as HTMLElement).closest<HTMLElement>('[data-row-key]');
    const key = rowElement?.dataset.rowKey;
    if (!key) return;
    const row = options.rows.find((candidate) => candidate.key === key);
    if (!row) return;
    setPinnedRow((current) =>
      current?.key === key
        ? current
        : {
            key,
            filterMatches: rowMatchesFilter(
              row,
              options.columns,
              tokens,
              options.locale,
              options.formatCellValue,
            ),
            sortColumnId: activeSort?.columnId,
            sortValue: activeSort
              ? options.getCellValue(activeSort.columnId, row.index)
              : undefined,
          },
    );
  };

  const releaseFocusedRow = (event: ReactFocusEvent<HTMLTableElement>) => {
    const currentRow = (event.target as HTMLElement).closest<HTMLElement>('[data-row-key]');
    const nextRow = (event.relatedTarget as HTMLElement | null)?.closest<HTMLElement>(
      '[data-row-key]',
    );
    if (currentRow?.dataset.rowKey && currentRow.dataset.rowKey === nextRow?.dataset.rowKey) return;
    setPinnedRow(undefined);
  };

  return {
    rows: visibleRows,
    filterValue: options.filtering ? filterValue : '',
    setFilterValue,
    clearFilter: () => setFilterValue(''),
    sortState: activeSort,
    setSortState,
    cycleSort,
    transformed: Boolean(activeSort) || tokens.length > 0,
    filterActive: tokens.length > 0,
    onFocusCapture: captureFocusedRow,
    onBlurCapture: releaseFocusedRow,
  };
}

function DataGridViewIcon({ name }: { name: 'search' | 'close' | 'sort' | 'paste' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none">
      {name === 'search' && (
        <>
          <circle cx="7" cy="7" r="3.75" />
          <path d="m10 10 3 3" />
        </>
      )}
      {name === 'close' && <path d="m4.25 4.25 7.5 7.5m0-7.5-7.5 7.5" />}
      {name === 'sort' && (
        <>
          <path d="m4.25 6 2-2 2 2M6.25 4v8" />
          <path d="m11.75 10-2 2-2-2M9.75 12V4" />
        </>
      )}
      {name === 'paste' && (
        <>
          <path d="M5.25 4.25h-1.5v9h8.5v-9h-1.5" />
          <path d="M6 2.75h4v3H6zM6.25 8.25h3.5M6.25 10.75h3.5" />
        </>
      )}
    </svg>
  );
}

export function DataGridToolbar(props: {
  label: string;
  columns: DataGridViewOptions['columns'];
  messages: Readonly<FormLocaleMessages>;
  filtering: boolean;
  sorting: boolean;
  filterValue: string;
  setFilterValue: (value: SetStateAction<string>) => void;
  clearFilter: () => void;
  sortState?: DataGridSortState;
  setSortState: (value: SetStateAction<DataGridSortState | undefined>) => void;
  visibleCount: number;
  totalCount: number;
  paste: boolean;
  pasteDisabled: boolean;
  pasteDisabledTitle?: string;
  onPaste: (trigger: HTMLButtonElement) => void;
}) {
  if (!props.filtering && !props.sorting && !props.paste) return null;
  const rowWord =
    props.totalCount === 1 ? props.messages.dataGridRowSingular : props.messages.dataGridRowPlural;
  const sortValue = props.sortState
    ? `${props.columns.findIndex((column) => column.id === props.sortState?.columnId)}:${props.sortState.direction}`
    : '';
  return (
    <div
      className={`a3s-form-data-grid-toolbar${props.filtering ? ' has-filter' : ''}${!props.filtering && props.sorting && !props.paste ? ' is-sort-only' : ''}`}
    >
      {props.filtering && (
        <label className="a3s-form-data-grid-filter">
          <DataGridViewIcon name="search" />
          <input
            className="input"
            type="search"
            aria-label={formatFormMessage(props.messages, 'dataGridFilterLabel', {
              label: props.label,
            })}
            placeholder={props.messages.dataGridFilterPlaceholder}
            value={props.filterValue}
            disabled={props.totalCount === 0 && props.filterValue.length === 0}
            autoComplete="off"
            onChange={(event) => props.setFilterValue(event.target.value)}
          />
          {props.filterValue.length > 0 && (
            <button
              type="button"
              className="btn"
              data-size="icon-xs"
              data-variant="ghost"
              aria-label={props.messages.dataGridFilterClear}
              onClick={props.clearFilter}
            >
              <DataGridViewIcon name="close" />
            </button>
          )}
        </label>
      )}
      {props.sorting && (
        <label className="a3s-form-data-grid-mobile-sort">
          <DataGridViewIcon name="sort" />
          <select
            className="select"
            aria-label={formatFormMessage(props.messages, 'dataGridMobileSortLabel', {
              label: props.label,
            })}
            value={sortValue}
            disabled={props.totalCount < 2}
            onChange={(event) => {
              if (!event.target.value) {
                props.setSortState(undefined);
                return;
              }
              const [columnIndex, direction] = event.target.value.split(':');
              const column = props.columns[Number(columnIndex)];
              if (!column || (direction !== 'ascending' && direction !== 'descending')) return;
              props.setSortState({ columnId: column.id, direction });
            }}
          >
            <option value="">{props.messages.dataGridOriginalOrder}</option>
            {props.columns.flatMap((column, index) => [
              <option key={`${column.id}-ascending`} value={`${index}:ascending`}>
                {column.label} · {props.messages.dataGridAscending}
              </option>,
              <option key={`${column.id}-descending`} value={`${index}:descending`}>
                {column.label} · {props.messages.dataGridDescending}
              </option>,
            ])}
          </select>
        </label>
      )}
      {props.filtering && props.filterValue.trim().length > 0 && (
        <span className="a3s-form-data-grid-filter-status" role="status" aria-live="polite">
          {formatFormMessage(props.messages, 'dataGridFilterResults', {
            visible: props.visibleCount,
            total: props.totalCount,
            rows: rowWord,
          })}
        </span>
      )}
      {props.paste && (
        <button
          type="button"
          className="a3s-form-data-grid-paste-action btn"
          data-size="sm"
          data-variant="secondary"
          disabled={props.pasteDisabled}
          title={props.pasteDisabledTitle}
          onClick={(event) => props.onPaste(event.currentTarget)}
        >
          <DataGridViewIcon name="paste" />
          <span>{props.messages.dataGridPaste}</span>
        </button>
      )}
    </div>
  );
}

export function DataGridColumnHeader(props: {
  column: { id: string; label: string };
  messages: Readonly<FormLocaleMessages>;
  sorting: boolean;
  sortState?: DataGridSortState;
  disabled?: boolean;
  onSort: (columnId: string) => void;
}) {
  const direction =
    props.sortState?.columnId === props.column.id ? props.sortState.direction : undefined;
  if (!props.sorting) return <th scope="col">{props.column.label}</th>;
  const action = direction
    ? direction === 'ascending'
      ? 'dataGridSortDescendingLabel'
      : 'dataGridSortClearLabel'
    : 'dataGridSortAscendingLabel';
  const actionLabel = formatFormMessage(props.messages, action, { column: props.column.label });
  return (
    <th scope="col" aria-label={props.column.label} aria-sort={direction}>
      <button
        type="button"
        className="a3s-form-data-grid-sort btn"
        data-size="xs"
        data-variant="ghost"
        data-direction={direction}
        aria-label={actionLabel}
        title={actionLabel}
        disabled={props.disabled}
        onClick={() => props.onSort(props.column.id)}
      >
        <span>{props.column.label}</span>
        <DataGridViewIcon name="sort" />
      </button>
    </th>
  );
}

export function DataGridNoResults(props: {
  messages: Readonly<FormLocaleMessages>;
  colSpan: number;
  onClear: () => void;
}) {
  return (
    <tr>
      <td className="a3s-form-data-grid-empty is-filtered" colSpan={props.colSpan}>
        <span role="status">{props.messages.dataGridFilterNoResults}</span>
        <button type="button" className="btn" onClick={props.onClear}>
          {props.messages.dataGridFilterNoResultsClear}
        </button>
      </td>
    </tr>
  );
}

export function SelectionCheckbox(props: {
  checked: boolean;
  mixed?: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <input
      ref={(input) => {
        if (input) input.indeterminate = Boolean(props.mixed);
      }}
      type="checkbox"
      className="a3s-form-data-grid-select input"
      aria-label={props.label}
      checked={props.checked}
      disabled={props.disabled}
      onChange={props.onChange}
    />
  );
}
