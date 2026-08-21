import { act, renderHook } from '@testing-library/react';
import type { JsonValue } from '../src/core';
import { useStableRepeaterRows } from '../src/react/repeater-state';

function identity(item: JsonValue): string | undefined {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return undefined;
  return typeof item.id === 'string' ? item.id : undefined;
}

describe('stable repeater row state', () => {
  it('allocates new host identities while retaining existing keys across replacements', () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: JsonValue[] }) => useStableRepeaterRows(items, identity),
      { initialProps: { items: [{ id: 'alpha' }] } },
    );
    const alphaKey = result.current.rows[0].key;

    rerender({ items: [{ id: 'alpha' }, { id: 'beta' }] });
    const betaKey = result.current.rows[1].key;
    expect(result.current.rows[0].key).toBe(alphaKey);
    expect(betaKey).not.toBe(alphaKey);

    rerender({ items: [{ id: 'beta' }, { id: 'alpha' }] });
    expect(result.current.rows.map((row) => row.key)).toEqual([betaKey, alphaKey]);
  });

  it('returns a safe copy when a move would leave the array', () => {
    const items: JsonValue[] = [{ id: 'alpha' }];
    const { result } = renderHook(() => useStableRepeaterRows(items, identity));
    let next: JsonValue[] = [];

    act(() => {
      next = result.current.move(0, -1);
    });

    expect(next).toEqual(items);
    expect(next).not.toBe(items);
  });

  it('keeps positional keys when an edited row becomes equal to a sibling', () => {
    const { result, rerender } = renderHook(
      ({ items }: { items: JsonValue[] }) => useStableRepeaterRows(items),
      {
        initialProps: {
          items: [
            { provider: 'openai', model: '' },
            { provider: 'anthropic', model: '' },
          ],
        },
      },
    );
    const keys = result.current.rows.map((row) => row.key);

    rerender({
      items: [
        { provider: 'anthropic', model: '' },
        { provider: 'anthropic', model: '' },
      ],
    });

    expect(result.current.rows.map((row) => row.key)).toEqual(keys);
  });

  it('removes a bounded set of rows without changing surviving keys', () => {
    const items: JsonValue[] = [{ id: 'alpha' }, { id: 'beta' }, { id: 'gamma' }];
    const { result, rerender } = renderHook(
      ({ values }: { values: JsonValue[] }) => useStableRepeaterRows(values, identity),
      { initialProps: { values: items } },
    );
    const [alphaKey, betaKey, gammaKey] = result.current.rows.map((row) => row.key);
    let next: JsonValue[] = [];

    act(() => {
      next = result.current.removeMany([0, 2, 2, -1, 99]);
    });
    rerender({ values: next });

    expect(next).toEqual([{ id: 'beta' }]);
    expect(result.current.rows[0].key).toBe(betaKey);
    expect(result.current.rows.map((row) => row.key)).not.toContain(alphaKey);
    expect(result.current.rows.map((row) => row.key)).not.toContain(gammaKey);
  });
});
