import { act, renderHook } from '@testing-library/react';
import type { JsonValue } from '../src/core';
import { useDataGridView } from '../src/react/data-grid-view';
import type { StableRepeaterRow } from '../src/react/repeater-state';

const columns = [{ id: 'value', label: 'Value', width: 12 }] as const;

function renderGridView(
  initialValues: readonly (JsonValue | undefined)[],
  locale = 'en-US',
  pinFocusedRow = false,
) {
  return renderHook(
    ({ values, currentLocale }) => {
      const rows: StableRepeaterRow[] = values.map((value, index) => ({
        key: `row-${index}`,
        index,
        value: value ?? null,
      }));
      return useDataGridView({
        rows,
        columns,
        locale: currentLocale,
        sorting: true,
        filtering: true,
        pinFocusedRow,
        getCellValue: (_nodeId, index) => values[index],
        formatCellValue: (_nodeId, index) => {
          const value = values[index];
          if (value === undefined || value === null) return '';
          return typeof value === 'string' ? value : JSON.stringify(value);
        },
      });
    },
    { initialProps: { values: initialValues, currentLocale: locale } },
  );
}

describe('data grid view transforms', () => {
  it('normalizes multi-token searches and falls back from an invalid locale', () => {
    const view = renderGridView(['Ada Lovelace', 'Grace Hopper'], 'invalid_locale');

    act(() => view.result.current.setFilterValue('  ＡＤＡ　LOVELACE  '));

    expect(view.result.current.rows.map((row) => row.key)).toEqual(['row-0']);
    expect(view.result.current.filterActive).toBe(true);
    expect(view.result.current.transformed).toBe(true);

    act(() => view.result.current.clearFilter());
    expect(view.result.current.rows).toHaveLength(2);
    expect(view.result.current.filterActive).toBe(false);

    const defaultLocaleView = renderGridView(['ALPHA'], '');
    act(() => defaultLocaleView.result.current.setFilterValue('alpha'));
    expect(defaultLocaleView.result.current.rows).toHaveLength(1);
  });

  it('sorts numbers, booleans, objects and empty values without moving empty cells forward', () => {
    const view = renderGridView([10, 2, 2]);

    act(() => view.result.current.cycleSort('value'));
    expect(view.result.current.rows.map((row) => row.index)).toEqual([1, 2, 0]);

    act(() => view.result.current.cycleSort('value'));
    expect(view.result.current.rows.map((row) => row.index)).toEqual([0, 1, 2]);

    view.rerender({ values: [true, false], currentLocale: 'en-US' });
    act(() => view.result.current.setSortState({ columnId: 'value', direction: 'ascending' }));
    expect(view.result.current.rows.map((row) => row.index)).toEqual([1, 0]);

    view.rerender({ values: [{ rank: 10 }, { rank: 2 }], currentLocale: 'en-US' });
    expect(view.result.current.rows.map((row) => row.index)).toEqual([1, 0]);

    view.rerender({ values: [null, '', undefined, 'ready'], currentLocale: 'en-US' });
    expect(view.result.current.rows.map((row) => row.index)).toEqual([3, 0, 1, 2]);

    view.rerender({ values: ['ready', null, '', undefined], currentLocale: 'en-US' });
    expect(view.result.current.rows.map((row) => row.index)).toEqual([0, 1, 2, 3]);

    act(() => view.result.current.cycleSort('value'));
    act(() => view.result.current.cycleSort('value'));
    expect(view.result.current.sortState).toBeUndefined();
    expect(view.result.current.rows.map((row) => row.index)).toEqual([0, 1, 2, 3]);
  });

  it('pins the focused row until focus leaves that row', () => {
    const view = renderGridView(['Grace', 'Ada'], 'en-US', true);
    const row = globalThis.document.createElement('tr');
    row.dataset.rowKey = 'row-0';
    const nameInput = globalThis.document.createElement('input');
    const emailInput = globalThis.document.createElement('input');
    row.append(nameInput, emailInput);
    const outside = globalThis.document.createElement('button');

    act(() => view.result.current.onFocusCapture({ target: nameInput } as never));
    act(() => view.result.current.setFilterValue('grace'));
    act(() => view.result.current.onFocusCapture({ target: nameInput } as never));
    act(() => view.result.current.onFocusCapture({ target: emailInput } as never));
    act(() => view.result.current.setFilterValue('ada'));
    expect(view.result.current.rows.map((currentRow) => currentRow.index)).toEqual([0, 1]);

    act(() =>
      view.result.current.onBlurCapture({ target: nameInput, relatedTarget: emailInput } as never),
    );
    expect(view.result.current.rows.map((currentRow) => currentRow.index)).toEqual([0, 1]);
    act(() =>
      view.result.current.onBlurCapture({ target: emailInput, relatedTarget: outside } as never),
    );
    expect(view.result.current.rows.map((currentRow) => currentRow.index)).toEqual([1]);

    act(() => view.result.current.clearFilter());
    act(() => view.result.current.setSortState({ columnId: 'value', direction: 'ascending' }));
    act(() => view.result.current.onFocusCapture({ target: nameInput } as never));
    view.rerender({ values: ['Aaron', 'Ada'], currentLocale: 'en-US' });
    expect(view.result.current.rows.map((currentRow) => currentRow.index)).toEqual([1, 0]);

    const missingKeyInput = globalThis.document.createElement('input');
    act(() => view.result.current.onFocusCapture({ target: missingKeyInput } as never));
    const missingRow = globalThis.document.createElement('tr');
    missingRow.dataset.rowKey = 'missing';
    const missingRowInput = globalThis.document.createElement('input');
    missingRow.append(missingRowInput);
    act(() => view.result.current.onFocusCapture({ target: missingRowInput } as never));
  });
});
