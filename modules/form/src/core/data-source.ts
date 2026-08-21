import { canonicalize } from './canonical';
import { getAtPath } from './pointer';
import type {
  DataSourceDefinition,
  DataSourcePage,
  DataSourceRequestScope,
  FormPlan,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  UiOption,
} from './types';

export type DataSourceLeaseSource = 'network' | 'deduplicated' | 'cache';
export const DEFAULT_DATA_SOURCE_CACHE_ENTRIES = 128;

export interface DataSourceLease {
  promise: Promise<DataSourcePage>;
  source: DataSourceLeaseSource;
  release: () => void;
}

export interface DataSourceRequestKeyOptions {
  locale: string;
  query?: string;
  cursor?: string;
  scope?: DataSourceRequestScope;
}

interface CacheEntry {
  page: DataSourcePage;
  expiresAt: number;
}

interface InFlightEntry {
  controller: AbortController;
  consumers: number;
  promise: Promise<DataSourcePage>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function normalizeOption(input: unknown): UiOption {
  if (
    !isRecord(input) ||
    Object.keys(input).some(
      (key) => !['label', 'value', 'disabled'].includes(key) && input[key] !== undefined,
    ) ||
    typeof input.label !== 'string' ||
    input.label.trim().length === 0 ||
    !isJsonPrimitive(input.value) ||
    (input.disabled !== undefined && typeof input.disabled !== 'boolean')
  ) {
    throw new TypeError('Data-source options must use the closed UiOption shape.');
  }
  return {
    label: input.label.trim(),
    value: input.value,
    disabled: input.disabled as boolean | undefined,
  };
}

export function normalizeDataSourceResponse(input: unknown): DataSourcePage {
  const response = Array.isArray(input) ? { options: input } : input;
  if (
    !isRecord(response) ||
    Object.keys(response).some(
      (key) => !['options', 'nextCursor'].includes(key) && response[key] !== undefined,
    ) ||
    !Array.isArray(response.options) ||
    (response.nextCursor !== undefined &&
      (typeof response.nextCursor !== 'string' || response.nextCursor.length === 0))
  ) {
    throw new TypeError('Data-source response must contain options and an optional cursor.');
  }
  const options = response.options.map(normalizeOption);
  const values = options.map((option) => String(option.value));
  if (new Set(values).size !== values.length) {
    throw new TypeError('Data-source option values must remain unique after string conversion.');
  }
  return {
    options,
    nextCursor: response.nextCursor as string | undefined,
  };
}

export function createDataSourceRequestKey(
  plan: FormPlan,
  definition: DataSourceDefinition,
  value: JsonObject,
  options: DataSourceRequestKeyOptions,
): string {
  const bindings =
    options.scope?.dependencies ??
    (definition.dependencies ?? []).map((path) => ({ template: path, path }));
  const dependencies = [...bindings]
    .sort(
      (left, right) =>
        left.template.localeCompare(right.template) || left.path.localeCompare(right.path),
    )
    .map(({ path, template }) => {
      const dependency = getAtPath(value, path) as JsonValue | undefined;
      return dependency === undefined
        ? [template, path, false, null]
        : [template, path, true, dependency];
    });
  return canonicalize({
    sourceDigest: plan.sourceDigest,
    sourceId: definition.id,
    registryKey: definition.registryKey,
    parameters: definition.parameters ?? {},
    dependencies,
    locale: options.locale,
    query: options.query ?? null,
    cursor: options.cursor ?? null,
    limit: definition.pageSize ?? null,
    scope:
      options.scope && options.scope.rowIndices.length > 0
        ? {
            nodeId: options.scope.nodeId,
            valuePath: options.scope.valuePath,
            rowIndices: options.scope.rowIndices,
          }
        : null,
  });
}

function clonePage(page: DataSourcePage): DataSourcePage {
  return structuredClone(page);
}

export class DataSourceCoordinator {
  readonly #cache = new Map<string, CacheEntry>();
  readonly #inFlight = new Map<string, InFlightEntry>();
  readonly #now: () => number;
  readonly #maxCacheEntries: number;

  constructor(now: () => number = Date.now, maxCacheEntries = DEFAULT_DATA_SOURCE_CACHE_ENTRIES) {
    if (!Number.isSafeInteger(maxCacheEntries) || maxCacheEntries < 1) {
      throw new TypeError('Data-source cache size must be a positive safe integer.');
    }
    this.#now = now;
    this.#maxCacheEntries = maxCacheEntries;
  }

  get cacheSize(): number {
    return this.#cache.size;
  }

  get inFlightSize(): number {
    return this.#inFlight.size;
  }

  acquire(
    key: string,
    cacheTtlMs: number,
    loader: (signal: AbortSignal) => Promise<unknown>,
  ): DataSourceLease {
    const cached = this.#cache.get(key);
    if (cached && cached.expiresAt > this.#now()) {
      this.#cache.delete(key);
      this.#cache.set(key, cached);
      return {
        promise: Promise.resolve(clonePage(cached.page)),
        source: 'cache',
        release: () => undefined,
      };
    }
    if (cached) this.#cache.delete(key);

    const shared = this.#inFlight.get(key);
    if (shared) {
      shared.consumers += 1;
      return this.#lease(key, shared, 'deduplicated');
    }

    const controller = new AbortController();
    const entry: InFlightEntry = {
      controller,
      consumers: 1,
      promise: Promise.resolve({ options: [] }),
    };
    let loaded: Promise<unknown>;
    try {
      loaded = loader(controller.signal);
    } catch (error) {
      loaded = Promise.reject(error);
    }
    entry.promise = loaded
      .then(normalizeDataSourceResponse)
      .then((page) => {
        if (!controller.signal.aborted && cacheTtlMs > 0) {
          this.#storeCache(key, page, cacheTtlMs);
        }
        return page;
      })
      .finally(() => {
        if (this.#inFlight.get(key) === entry) this.#inFlight.delete(key);
      });
    this.#inFlight.set(key, entry);
    return this.#lease(key, entry, 'network');
  }

  clear(): void {
    for (const entry of this.#inFlight.values()) entry.controller.abort();
    this.#inFlight.clear();
    this.#cache.clear();
  }

  #storeCache(key: string, page: DataSourcePage, cacheTtlMs: number): void {
    const now = this.#now();
    for (const [cachedKey, entry] of this.#cache) {
      if (entry.expiresAt <= now) this.#cache.delete(cachedKey);
    }
    this.#cache.delete(key);
    while (this.#cache.size >= this.#maxCacheEntries) {
      const oldest = this.#cache.keys().next().value as string;
      this.#cache.delete(oldest);
    }
    this.#cache.set(key, {
      page: clonePage(page),
      expiresAt: now + cacheTtlMs,
    });
  }

  #lease(
    key: string,
    entry: InFlightEntry,
    source: Exclude<DataSourceLeaseSource, 'cache'>,
  ): DataSourceLease {
    let released = false;
    return {
      promise: entry.promise.then(clonePage),
      source,
      release: () => {
        if (released) return;
        released = true;
        if (this.#inFlight.get(key) !== entry) return;
        entry.consumers -= 1;
        if (entry.consumers > 0) return;
        this.#inFlight.delete(key);
        entry.controller.abort();
      },
    };
  }
}
