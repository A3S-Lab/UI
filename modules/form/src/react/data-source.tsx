import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type CompiledNode,
  createDataSourceRequestKey,
  type DataSourceCoordinator,
  type DataSourceDefinition,
  type DataSourceLease,
  type DataSourceRequestScope,
  type FormHostAdapter,
  type FormLocaleMessages,
  type FormPlan,
  formatFormMessage,
  getAtPath,
  type JsonObject,
  type JsonValue,
  resolveValuePathTemplate,
  type UiOption,
} from '../core';

export type FormDataSourceStatus =
  | 'static'
  | 'idle'
  | 'blocked'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error';

export interface FormDataSourceState {
  definition?: DataSourceDefinition;
  options: UiOption[];
  status: FormDataSourceStatus;
  query: string;
  searchable: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  pageError: boolean;
  activate: () => void;
  setQuery: (query: string) => void;
  retry: () => void;
  loadMore: () => void;
}

interface UseFormDataSourceOptions {
  coordinator: DataSourceCoordinator;
  getValue: () => JsonObject;
  hostAdapter?: FormHostAdapter;
  locale: string;
  node: CompiledNode;
  plan: FormPlan;
  rowIndices?: readonly number[];
  value: JsonObject;
  valuePath?: string;
  visible: boolean;
}

function hasDependencyValue(value: JsonValue | undefined): boolean {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function mergeOptions(current: UiOption[], incoming: UiOption[]): UiOption[] {
  const merged = new Map(current.map((option) => [String(option.value), option]));
  for (const option of incoming) merged.set(String(option.value), option);
  return [...merged.values()];
}

export function useFormDataSource({
  coordinator,
  getValue,
  hostAdapter,
  locale,
  node,
  plan,
  rowIndices,
  value,
  valuePath,
  visible,
}: UseFormDataSourceOptions): FormDataSourceState {
  const definition = useMemo(
    () => plan.dataSources.find((source) => source.id === node.dataSource),
    [node.dataSource, plan.dataSources],
  );
  const staticOptions = node.options;
  const resolver = hostAdapter?.resolveDataSource;
  const [activated, setActivated] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [options, setOptions] = useState<UiOption[]>(staticOptions ?? []);
  const [status, setStatus] = useState<FormDataSourceStatus>(
    staticOptions
      ? 'static'
      : !definition
        ? 'ready'
        : definition.trigger === 'focus'
          ? 'idle'
          : 'loading',
  );
  const [nextCursor, setNextCursor] = useState<string>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [retryRevision, setRetryRevision] = useState(0);
  const generationRef = useRef(0);
  const pageLeaseRef = useRef<DataSourceLease | undefined>(undefined);
  const rowIndicesKey = rowIndices?.join('.') ?? '';
  const concreteRowIndices = useMemo(
    () => (rowIndicesKey ? rowIndicesKey.split('.').map(Number) : []),
    [rowIndicesKey],
  );

  const scope = useMemo<DataSourceRequestScope | undefined>(() => {
    if (!definition || !valuePath) return undefined;
    const dependencies = (definition.dependencies ?? []).map((template) => ({
      template,
      path: resolveValuePathTemplate(template, concreteRowIndices),
    }));
    if (dependencies.some((dependency) => !dependency.path)) return undefined;
    return {
      nodeId: node.id,
      valuePath,
      rowIndices: concreteRowIndices,
      dependencies: dependencies.map(({ template, path }) => ({
        template,
        path: path as string,
      })),
    };
  }, [concreteRowIndices, definition, node.id, valuePath]);

  const dependenciesReady = useMemo(
    () =>
      !definition ||
      Boolean(
        scope?.dependencies.every(({ path }) =>
          hasDependencyValue(getAtPath(value, path) as JsonValue | undefined),
        ),
      ),
    [definition, scope, value],
  );
  const active = definition?.trigger !== 'focus' || activated;
  const requestKey = useMemo(
    () =>
      definition
        ? createDataSourceRequestKey(plan, definition, value, {
            locale,
            query: debouncedQuery || undefined,
            scope,
          })
        : '',
    [debouncedQuery, definition, locale, plan, scope, value],
  );

  useEffect(() => {
    const delay = definition?.searchable ? (definition.debounceMs ?? 250) : 0;
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), delay);
    return () => window.clearTimeout(timeout);
  }, [definition?.debounceMs, definition?.searchable, query]);

  useEffect(() => {
    setActivated(false);
    setQuery('');
    setDebouncedQuery('');
  }, [definition?.id, definition?.registryKey, definition?.trigger]);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    pageLeaseRef.current?.release();
    pageLeaseRef.current = undefined;
    setLoadingMore(false);
    setPageError(false);
    setNextCursor(undefined);

    if (staticOptions) {
      setOptions(staticOptions);
      setStatus('static');
      return;
    }
    setOptions([]);
    if (!definition) {
      setStatus('ready');
      return;
    }
    if (!visible || !active) {
      setStatus('idle');
      return;
    }
    if (!dependenciesReady) {
      setStatus('blocked');
      return;
    }
    if (!resolver) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    const lease = coordinator.acquire(requestKey, definition.cacheTtlMs ?? 0, (signal) =>
      resolver(
        {
          definition,
          value: structuredClone(getValue()),
          locale,
          query: debouncedQuery || undefined,
          limit: definition.pageSize,
          scope: scope ? structuredClone(scope) : undefined,
        },
        signal,
      ),
    );
    lease.promise
      .then((page) => {
        if (generationRef.current !== generation) return;
        setOptions(page.options);
        setNextCursor(page.nextCursor);
        setStatus(page.options.length === 0 ? 'empty' : 'ready');
      })
      .catch(() => {
        if (generationRef.current !== generation) return;
        setStatus('error');
        console.warn('A3S Form data source failed.');
      });
    return () => {
      if (generationRef.current === generation) generationRef.current += 1;
      lease.release();
    };
  }, [
    active,
    coordinator,
    debouncedQuery,
    definition,
    dependenciesReady,
    getValue,
    locale,
    requestKey,
    resolver,
    retryRevision,
    scope,
    staticOptions,
    visible,
  ]);

  const loadMore = useCallback(() => {
    if (
      !definition ||
      !resolver ||
      !nextCursor ||
      loadingMore ||
      status === 'loading' ||
      !visible
    ) {
      return;
    }
    const generation = generationRef.current;
    const cursor = nextCursor;
    const value = getValue();
    const key = createDataSourceRequestKey(plan, definition, value, {
      locale,
      query: debouncedQuery || undefined,
      cursor,
      scope,
    });
    setLoadingMore(true);
    setPageError(false);
    const lease = coordinator.acquire(key, definition.cacheTtlMs ?? 0, (signal) =>
      resolver(
        {
          definition,
          value: structuredClone(value),
          locale,
          query: debouncedQuery || undefined,
          cursor,
          limit: definition.pageSize,
          scope: scope ? structuredClone(scope) : undefined,
        },
        signal,
      ),
    );
    pageLeaseRef.current?.release();
    pageLeaseRef.current = lease;
    lease.promise
      .then((page) => {
        if (generationRef.current !== generation || pageLeaseRef.current !== lease) return;
        setOptions((current) => mergeOptions(current, page.options));
        setNextCursor(page.nextCursor);
      })
      .catch(() => {
        if (generationRef.current !== generation || pageLeaseRef.current !== lease) return;
        setPageError(true);
        console.warn('A3S Form data-source page failed.');
      })
      .finally(() => {
        if (pageLeaseRef.current !== lease) return;
        pageLeaseRef.current = undefined;
        setLoadingMore(false);
        lease.release();
      });
  }, [
    coordinator,
    debouncedQuery,
    definition,
    getValue,
    loadingMore,
    locale,
    nextCursor,
    plan,
    resolver,
    scope,
    status,
    visible,
  ]);

  return {
    definition,
    options: staticOptions ?? options,
    status,
    query,
    searchable: Boolean(definition?.searchable && !staticOptions),
    hasMore: Boolean(nextCursor),
    loadingMore,
    pageError,
    activate: () => setActivated(true),
    setQuery,
    retry: () => {
      if (pageError) loadMore();
      else setRetryRevision((current) => current + 1);
    },
    loadMore,
  };
}

export function DataSourceSearch({
  label,
  messages,
  state,
}: {
  label: string;
  messages: Readonly<FormLocaleMessages>;
  state: FormDataSourceState;
}) {
  if (!state.searchable) return null;
  return (
    <label className="a3s-form-data-source-search">
      <span>{messages.dataSourceSearchLabel}</span>
      <input
        type="search"
        className="input"
        aria-label={formatFormMessage(messages, 'dataSourceSearchAriaLabel', { label })}
        placeholder={messages.dataSourceSearchPlaceholder}
        disabled={state.status === 'blocked'}
        value={state.query}
        onFocus={state.activate}
        onChange={(event) => state.setQuery(event.target.value)}
      />
    </label>
  );
}

export function DataSourceStatus({
  label,
  messages,
  state,
}: {
  label: string;
  messages: Readonly<FormLocaleMessages>;
  state: FormDataSourceState;
}) {
  if (!state.definition || state.status === 'static' || state.status === 'ready') {
    if (!state.hasMore && !state.pageError) return null;
  }
  return (
    <div className="a3s-form-data-source-status" data-status={state.status}>
      {state.status === 'idle' && <span>{messages.dataSourceFocusPrompt}</span>}
      {state.status === 'blocked' && (
        <span role="status">{messages.dataSourceDependencyPrompt}</span>
      )}
      {state.status === 'loading' && (
        <span
          role="status"
          aria-label={formatFormMessage(messages, 'dataSourceLoadingLabel', { label })}
        >
          {messages.dataSourceLoading}
        </span>
      )}
      {state.status === 'empty' && <span role="status">{messages.dataSourceEmpty}</span>}
      {state.status === 'error' && (
        <div
          role="alert"
          aria-label={formatFormMessage(messages, 'dataSourceErrorLabel', { label })}
        >
          <span>{messages.dataSourceError}</span>
          <button
            type="button"
            className="btn"
            onClick={state.retry}
            aria-label={formatFormMessage(messages, 'dataSourceRetryLabel', { label })}
          >
            {messages.dataSourceRetry}
          </button>
        </div>
      )}
      {state.pageError && state.status !== 'error' && (
        <div
          role="alert"
          aria-label={formatFormMessage(messages, 'dataSourcePageErrorLabel', { label })}
        >
          <span>{messages.dataSourcePageError}</span>
          <button
            type="button"
            className="btn"
            onClick={state.retry}
            aria-label={formatFormMessage(messages, 'dataSourcePageRetryLabel', { label })}
          >
            {messages.dataSourceRetry}
          </button>
        </div>
      )}
      {state.hasMore && !state.pageError && (
        <button
          type="button"
          className="a3s-form-data-source-more btn"
          data-size="sm"
          data-variant="secondary"
          disabled={state.loadingMore}
          onClick={state.loadMore}
          aria-label={messages.dataSourceLoadMoreLabel}
        >
          {state.loadingMore ? messages.dataSourceLoadingMore : messages.dataSourceLoadMore}
        </button>
      )}
    </div>
  );
}
