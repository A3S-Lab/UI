import type { FormDiagnostic } from './types';

const MAX_INPUT_GRAPH_DEPTH = 128;
const MAX_INPUT_GRAPH_ENTRIES = 100_000;

interface PendingValue {
  value: unknown;
  exit: boolean;
  depth: number;
  allowUndefined: boolean;
}

export function portableDocumentDiagnostic(): FormDiagnostic {
  return {
    code: 'document.json_value',
    severity: 'error',
    message: 'Form document must be an acyclic, bounded JSON value without accessor properties.',
    path: '/document',
  };
}

/**
 * Validates the JavaScript-to-portable-core boundary without recursively
 * reading arbitrary values. Undefined object members remain compatible with
 * JSON.stringify omission, while every other non-JSON value fails closed.
 */
export function hasPortableJsonGraph(value: unknown): boolean {
  const ancestors = new Set<object>();
  const pending: PendingValue[] = [{ value, exit: false, depth: 0, allowUndefined: false }];
  let entries = 0;
  try {
    while (pending.length > 0) {
      const current = pending.pop();
      if (!current) break;
      const candidate = current.value;
      if (candidate === undefined) {
        if (!current.allowUndefined) return false;
        continue;
      }
      if (candidate === null || typeof candidate === 'string' || typeof candidate === 'boolean') {
        continue;
      }
      if (typeof candidate === 'number') {
        if (!Number.isFinite(candidate)) return false;
        continue;
      }
      if (typeof candidate !== 'object') return false;
      if (current.exit) {
        ancestors.delete(candidate);
        continue;
      }
      if (current.depth > MAX_INPUT_GRAPH_DEPTH || ancestors.has(candidate)) return false;

      const array = Array.isArray(candidate);
      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== null && prototype !== (array ? Array.prototype : Object.prototype)) {
        return false;
      }
      const descriptors = Object.getOwnPropertyDescriptors(candidate);
      const keys: string[] = [];
      for (const key of Reflect.ownKeys(descriptors)) {
        if (typeof key !== 'string') return false;
        keys.push(key);
      }
      if (array) {
        const length = descriptors.length?.value;
        if (!Number.isSafeInteger(length) || length < 0) return false;
        const indices = keys.filter((key) => key !== 'length');
        if (indices.length !== length) return false;
        for (const key of indices) {
          const index = Number(key);
          if (
            !Number.isSafeInteger(index) ||
            index < 0 ||
            index >= length ||
            String(index) !== key
          ) {
            return false;
          }
        }
      }

      ancestors.add(candidate);
      pending.push({
        value: candidate,
        exit: true,
        depth: current.depth,
        allowUndefined: false,
      });
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        const key = keys[index];
        if (key === 'length') continue;
        const descriptor = descriptors[key];
        if (!descriptor?.enumerable || !('value' in descriptor)) return false;
        entries += 1;
        if (entries > MAX_INPUT_GRAPH_ENTRIES) return false;
        pending.push({
          value: descriptor.value,
          exit: false,
          depth: current.depth + 1,
          allowUndefined: !array,
        });
      }
    }
    return true;
  } catch {
    return false;
  }
}
