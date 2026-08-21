import { useId, useRef } from 'react';
import { canonicalize, type JsonValue } from '../core';

export interface StableRepeaterRow {
  key: string;
  index: number;
  value: JsonValue;
}

interface RepeaterSnapshot {
  items: readonly JsonValue[];
  keys: readonly string[];
}

export type RepeaterItemIdentity = (item: JsonValue, index: number) => string | undefined;

function itemIdentity(
  item: JsonValue,
  index: number,
  identify: RepeaterItemIdentity | undefined,
): string | undefined {
  const value = identify?.(item, index);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function useStableRepeaterRows(
  items: readonly JsonValue[],
  identify?: RepeaterItemIdentity,
) {
  const prefix = useId().replaceAll(':', '');
  const counter = useRef(0);
  const snapshot = useRef<RepeaterSnapshot | undefined>(undefined);

  const allocate = (item: JsonValue, index: number, used: ReadonlySet<string>): string => {
    const identity = itemIdentity(item, index, identify);
    const identityKey = identity ? `${prefix}-data-${encodeURIComponent(identity)}` : undefined;
    if (identityKey && !used.has(identityKey)) return identityKey;
    let key = '';
    do {
      counter.current += 1;
      key = `${prefix}-row-${counter.current}`;
    } while (used.has(key));
    return key;
  };

  const previous = snapshot.current;
  const used = new Set<string>();
  const keys = items.map((item, index) => {
    if (previous) {
      const identity = itemIdentity(item, index, identify);
      if (identity) {
        const match = previous.items.findIndex(
          (candidate, candidateIndex) =>
            !used.has(previous.keys[candidateIndex]) &&
            itemIdentity(candidate, candidateIndex, identify) === identity,
        );
        if (match >= 0) {
          used.add(previous.keys[match]);
          return previous.keys[match];
        }
      }
      const referenceMatch = previous.items.findIndex(
        (candidate, candidateIndex) =>
          !used.has(previous.keys[candidateIndex]) && candidate === item,
      );
      if (referenceMatch >= 0) {
        used.add(previous.keys[referenceMatch]);
        return previous.keys[referenceMatch];
      }
      const positional = previous.keys[index];
      if (positional && !used.has(positional)) {
        used.add(positional);
        return positional;
      }
      const canonical = canonicalize(item);
      const valueMatch = previous.items.findIndex(
        (candidate, candidateIndex) =>
          !used.has(previous.keys[candidateIndex]) && canonicalize(candidate) === canonical,
      );
      if (valueMatch >= 0) {
        used.add(previous.keys[valueMatch]);
        return previous.keys[valueMatch];
      }
    }
    const key = allocate(item, index, used);
    used.add(key);
    return key;
  });
  snapshot.current = { items, keys };

  const commit = (nextItems: JsonValue[], nextKeys: string[]): JsonValue[] => {
    snapshot.current = { items: nextItems, keys: nextKeys };
    return nextItems;
  };

  return {
    rows: items.map((value, index): StableRepeaterRow => ({ key: keys[index], index, value })),
    insert(item: JsonValue, index = items.length): JsonValue[] {
      const nextItems = [...items];
      const nextKeys = [...keys];
      const target = Math.max(0, Math.min(index, nextItems.length));
      nextItems.splice(target, 0, item);
      nextKeys.splice(target, 0, allocate(item, target, new Set(nextKeys)));
      return commit(nextItems, nextKeys);
    },
    update(index: number, item: JsonValue): JsonValue[] {
      const nextItems = [...items];
      nextItems[index] = item;
      return commit(nextItems, [...keys]);
    },
    remove(index: number): JsonValue[] {
      const nextItems = [...items];
      const nextKeys = [...keys];
      nextItems.splice(index, 1);
      nextKeys.splice(index, 1);
      return commit(nextItems, nextKeys);
    },
    removeMany(indices: readonly number[]): JsonValue[] {
      const targets = new Set(
        indices.filter((index) => Number.isInteger(index) && index >= 0 && index < items.length),
      );
      const nextItems = items.filter((_, index) => !targets.has(index));
      const nextKeys = keys.filter((_, index) => !targets.has(index));
      return commit(nextItems, nextKeys);
    },
    move(index: number, offset: -1 | 1): JsonValue[] {
      const target = index + offset;
      if (target < 0 || target >= items.length) return [...items];
      const nextItems = [...items];
      const nextKeys = [...keys];
      const [item] = nextItems.splice(index, 1);
      const [key] = nextKeys.splice(index, 1);
      nextItems.splice(target, 0, item);
      nextKeys.splice(target, 0, key);
      return commit(nextItems, nextKeys);
    },
  };
}
