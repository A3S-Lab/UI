import type { FormDocument, JsonValue } from './types';
import { sha256WithWasm } from './wasm';

const MAX_CANONICAL_VALUE_DEPTH = 256;

function canonicalizeInternal(value: unknown, ancestors = new Set<object>(), depth = 0): string {
  if (depth > MAX_CANONICAL_VALUE_DEPTH) {
    throw new TypeError(
      `Canonical JSON exceeds the maximum value depth of ${MAX_CANONICAL_VALUE_DEPTH}.`,
    );
  }
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError('Canonical JSON does not support non-finite numbers.');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new TypeError('Canonical JSON does not support cyclic values.');
    ancestors.add(value);
    try {
      const items = Array.from(value, (item) => canonicalizeInternal(item, ancestors, depth + 1));
      return `[${items.join(',')}]`;
    } finally {
      ancestors.delete(value);
    }
  }
  if (typeof value === 'object') {
    if (ancestors.has(value)) throw new TypeError('Canonical JSON does not support cyclic values.');
    ancestors.add(value);
    try {
      const entries: string[] = [];
      for (const key of Object.keys(value).sort()) {
        const child = (value as Record<string, unknown>)[key];
        if (child === undefined) continue;
        entries.push(`${JSON.stringify(key)}:${canonicalizeInternal(child, ancestors, depth + 1)}`);
      }
      return `{${entries.join(',')}}`;
    } finally {
      ancestors.delete(value);
    }
  }
  throw new TypeError(`Unsupported canonical JSON value: ${typeof value}`);
}

export function canonicalize(value: JsonValue | FormDocument): string {
  return canonicalizeInternal(value);
}

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256JavaScript(value: string): string {
  const maxWord = 2 ** 32;
  const words: number[] = [];
  const ascii = new TextEncoder().encode(value);
  const bitLength = ascii.length * 8;
  const bytes = [...ascii, 0x80];
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / maxWord);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);
  for (let index = 0; index < bytes.length; index += 4) {
    words.push(
      ((bytes[index] << 24) |
        (bytes[index + 1] << 16) |
        (bytes[index + 2] << 8) |
        bytes[index + 3]) >>>
        0,
    );
  }

  const primes: number[] = [];
  for (let candidate = 2; primes.length < 64; candidate += 1) {
    if (primes.every((prime) => candidate % prime !== 0)) primes.push(candidate);
  }
  const initial = primes.slice(0, 8).map((prime) => (Math.sqrt(prime) * maxWord) >>> 0);
  const constants = primes.map((prime) => (Math.cbrt(prime) * maxWord) >>> 0);
  const hash = [...initial];

  for (let offset = 0; offset < words.length; offset += 16) {
    const schedule = words.slice(offset, offset + 16);
    for (let index = 16; index < 64; index += 1) {
      const x = schedule[index - 15];
      const y = schedule[index - 2];
      const sigma0 = rightRotate(x, 7) ^ rightRotate(x, 18) ^ (x >>> 3);
      const sigma1 = rightRotate(y, 17) ^ rightRotate(y, 19) ^ (y >>> 10);
      schedule[index] = (schedule[index - 16] + sigma0 + schedule[index - 7] + sigma1) >>> 0;
    }
    const state = [...hash];
    for (let index = 0; index < 64; index += 1) {
      const [a, b, c, _d, e, f, g, h] = state;
      const sum1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choose + constants[index] + schedule[index]) >>> 0;
      const sum0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      state.unshift((temp1 + temp2) >>> 0);
      state[4] = (state[4] + temp1) >>> 0;
      state.pop();
    }
    for (let index = 0; index < 8; index += 1) hash[index] = (hash[index] + state[index]) >>> 0;
  }
  return hash.map((word) => word.toString(16).padStart(8, '0')).join('');
}

export function sha256Using(
  value: string,
  accelerated: (input: string) => string | undefined,
): string {
  return accelerated(value) ?? sha256JavaScript(value);
}

export function sha256(value: string): string {
  return sha256Using(value, sha256WithWasm);
}

export function digestDocument(document: FormDocument): string {
  const { digest: _digest, ...publishable } = document;
  return `sha256:${sha256(canonicalizeInternal(publishable))}`;
}

export function sealDocument(document: FormDocument): FormDocument {
  const copy = structuredClone(document);
  copy.digest = digestDocument(copy);
  return copy;
}
