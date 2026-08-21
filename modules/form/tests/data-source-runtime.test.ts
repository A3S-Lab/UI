import {
  assertCompiled,
  createDataSourceRequestKey,
  DataSourceCoordinator,
  type DataSourceDefinition,
  type DataSourcePage,
  type DataSourceRequestScope,
  type JsonObject,
  normalizeDataSourceResponse,
} from '../src/core';
import { createDocument } from './fixtures';

describe('host-owned data-source runtime', () => {
  const definition = (changes: Partial<DataSourceDefinition> = {}): DataSourceDefinition => ({
    id: 'models',
    registryKey: 'workflow.models',
    dependencies: ['provider'],
    cacheTtlMs: 1_000,
    pageSize: 20,
    searchable: true,
    ...changes,
  });

  it('normalizes legacy arrays and closed paginated responses', () => {
    expect(normalizeDataSourceResponse([{ label: 'One', value: 1 }])).toEqual({
      options: [{ label: 'One', value: 1 }],
    });
    expect(
      normalizeDataSourceResponse({
        options: [{ label: 'Alpha', value: 'alpha', disabled: true }],
        nextCursor: 'page-2',
      }),
    ).toEqual({
      options: [{ label: 'Alpha', value: 'alpha', disabled: true }],
      nextCursor: 'page-2',
    });

    for (const response of [
      null,
      { options: [], extra: true },
      { options: 'invalid' },
      { options: [null] },
      { options: [{ label: '', value: 'empty' }] },
      { options: [{ label: 'Missing value' }] },
      { options: [{ label: 'Invalid disabled', value: 'x', disabled: 'yes' }] },
      {
        options: [
          { label: 'One', value: 1 },
          { label: 'String one', value: '1' },
        ],
      },
      { options: [], nextCursor: '' },
      { options: [], nextCursor: 2 },
    ]) {
      expect(() => normalizeDataSourceResponse(response)).toThrow(TypeError);
    }
  });

  it('keys requests by declared dependencies instead of unrelated form values', () => {
    const document = createDocument();
    if (!document.schema.properties) throw new Error('Missing fixture properties.');
    document.schema.properties.provider = { type: 'string' };
    const plan = assertCompiled(document);
    const source = definition();
    const base = createDataSourceRequestKey(
      plan,
      source,
      {
        provider: 'openai',
        unrelated: 'first',
      } as never,
      {
        locale: 'en-US',
        query: 'gpt',
      },
    );
    const unrelated = createDataSourceRequestKey(
      plan,
      source,
      {
        provider: 'openai',
        unrelated: 'second',
      } as never,
      {
        locale: 'en-US',
        query: 'gpt',
      },
    );
    const dependency = createDataSourceRequestKey(
      plan,
      source,
      { provider: 'anthropic' },
      {
        locale: 'en-US',
        query: 'gpt',
      },
    );
    const nextPage = createDataSourceRequestKey(
      plan,
      source,
      { provider: 'openai' },
      {
        locale: 'en-US',
        query: 'gpt',
        cursor: 'page-2',
      },
    );

    expect(unrelated).toBe(base);
    expect(dependency).not.toBe(base);
    expect(nextPage).not.toBe(base);

    const missing = createDataSourceRequestKey(plan, source, {}, { locale: 'en-US' });
    expect(missing).not.toBe(base);
    expect(
      createDataSourceRequestKey(
        plan,
        definition({ dependencies: undefined, pageSize: undefined }),
        {},
        {
          locale: 'en-US',
        },
      ),
    ).toContain('"limit":null');

    const bindings: DataSourceRequestScope['dependencies'] = [
      { template: 'z.*.provider', path: 'z.0.provider' },
      { template: 'a.*.region', path: 'a.0.region' },
      { template: 'a.*.region', path: 'a.0.alternateRegion' },
    ];
    const scopedOptions = (dependencies: DataSourceRequestScope['dependencies']) => ({
      locale: 'en-US',
      scope: {
        nodeId: 'model',
        valuePath: 'a.0.model',
        rowIndices: [0],
        dependencies,
      },
    });
    expect(createDataSourceRequestKey(plan, source, {}, scopedOptions(bindings))).toBe(
      createDataSourceRequestKey(plan, source, {}, scopedOptions([...bindings].reverse())),
    );
  });

  it('deduplicates in-flight requests and serves immutable TTL cache entries', async () => {
    let now = 100;
    const coordinator = new DataSourceCoordinator(() => now);
    let calls = 0;
    let resolve: ((page: DataSourcePage) => void) | undefined;
    const loader = () => {
      calls += 1;
      return new Promise<DataSourcePage>((next) => {
        resolve = next;
      });
    };

    const first = coordinator.acquire('same', 1_000, loader);
    const second = coordinator.acquire('same', 1_000, loader);
    expect(first.source).toBe('network');
    expect(second.source).toBe('deduplicated');
    expect(calls).toBe(1);
    resolve?.({ options: [{ label: 'One', value: 'one' }] });
    const [firstPage, secondPage] = await Promise.all([first.promise, second.promise]);
    expect(firstPage).toEqual(secondPage);
    firstPage.options[0].label = 'mutated consumer copy';

    const cached = coordinator.acquire('same', 1_000, loader);
    expect(cached.source).toBe('cache');
    await expect(cached.promise).resolves.toEqual({
      options: [{ label: 'One', value: 'one' }],
    });
    expect(calls).toBe(1);
    cached.release();

    now = 1_101;
    const expired = coordinator.acquire('same', 1_000, async () => ({ options: [] }));
    expect(expired.source).toBe('network');
    await expect(expired.promise).resolves.toEqual({ options: [] });
    expect(coordinator.cacheSize).toBe(1);
  });

  it('keys repeated-row requests by concrete dependency bindings and row path', () => {
    const plan = assertCompiled(createDocument());
    const source = definition({ dependencies: ['rows.*.provider'] });
    const scope = (index: number): DataSourceRequestScope => ({
      nodeId: 'row-model',
      valuePath: `rows.${index}.model`,
      rowIndices: [index],
      dependencies: [
        {
          template: 'rows.*.provider',
          path: `rows.${index}.provider`,
        },
      ],
    });
    const value: JsonObject = {
      rows: [
        { provider: 'openai', model: '' },
        { provider: 'openai', model: '' },
      ],
    };
    const first = createDataSourceRequestKey(plan, source, value, {
      locale: 'en-US',
      scope: scope(0),
    });
    const second = createDataSourceRequestKey(plan, source, value, {
      locale: 'en-US',
      scope: scope(1),
    });
    const unrelated = createDataSourceRequestKey(
      plan,
      source,
      { ...value, note: 'ignored' },
      { locale: 'en-US', scope: scope(0) },
    );

    expect(second).not.toBe(first);
    expect(unrelated).toBe(first);
    expect(first).toContain('rows.0.model');

    const sourceWithoutDependencies = definition({ dependencies: [] });
    expect(
      createDataSourceRequestKey(plan, sourceWithoutDependencies, value, {
        locale: 'en-US',
        scope: { ...scope(1), dependencies: [] },
      }),
    ).not.toBe(
      createDataSourceRequestKey(plan, sourceWithoutDependencies, value, {
        locale: 'en-US',
        scope: { ...scope(0), dependencies: [] },
      }),
    );
  });

  it('releases shared requests only after the final consumer and clears owned work', async () => {
    const coordinator = new DataSourceCoordinator();
    const signals: AbortSignal[] = [];
    const loader = (signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<DataSourcePage>(() => undefined);
    };
    const first = coordinator.acquire('pending', 0, loader);
    const second = coordinator.acquire('pending', 0, loader);
    first.release();
    first.release();
    expect(signals[0].aborted).toBe(false);
    second.release();
    expect(signals[0].aborted).toBe(true);

    coordinator.acquire('other', 0, loader);
    expect(coordinator.inFlightSize).toBe(1);
    coordinator.clear();
    expect(signals[1].aborted).toBe(true);
    expect(coordinator.inFlightSize).toBe(0);
    expect(coordinator.cacheSize).toBe(0);

    const synchronousFailure = coordinator.acquire('throws', 0, () => {
      throw new Error('sync failure');
    });
    await expect(synchronousFailure.promise).rejects.toThrow('sync failure');
  });

  it('bounds query-driven cache growth per embedded renderer', async () => {
    expect(() => new DataSourceCoordinator(Date.now, 0)).toThrow(TypeError);
    const coordinator = new DataSourceCoordinator(() => 0, 2);
    const load = async (label: string) => ({ options: [{ label, value: label }] });
    await coordinator.acquire('first', 1_000, () => load('first')).promise;
    await coordinator.acquire('second', 1_000, () => load('second')).promise;
    await coordinator.acquire('third', 1_000, () => load('third')).promise;
    expect(coordinator.cacheSize).toBe(2);

    let reloaded = false;
    const first = coordinator.acquire('first', 1_000, async () => {
      reloaded = true;
      return { options: [] };
    });
    expect(first.source).toBe('network');
    await first.promise;
    expect(reloaded).toBe(true);

    let now = 0;
    const expiring = new DataSourceCoordinator(() => now, 2);
    await expiring.acquire('expired', 1, () => load('expired')).promise;
    now = 2;
    await expiring.acquire('fresh', 1_000, () => load('fresh')).promise;
    expect(expiring.cacheSize).toBe(1);
  });
});
