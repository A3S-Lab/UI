import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo, useState } from 'react';
import {
  assertCompiled,
  type DataSourceRequest,
  type DataSourceResponse,
  type FormDocument,
  type FormHostAdapter,
  type JsonObject,
} from '../src/core';
import { FormRenderer } from '../src/react';

function createDataSourceDocument(): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: 'Model settings', locale: 'zh-CN' },
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
        model: { type: 'string' },
        fallbackModel: { type: 'string' },
        note: { type: 'string' },
      },
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['provider', 'model', 'note'] },
        {
          id: 'provider',
          kind: 'field',
          label: 'Provider',
          schemaPath: '/properties/provider',
          widget: 'select',
          options: [
            { label: 'OpenAI', value: 'openai' },
            { label: 'Anthropic', value: 'anthropic' },
          ],
        },
        {
          id: 'model',
          kind: 'field',
          label: 'Model',
          schemaPath: '/properties/model',
          widget: 'select',
          dataSource: 'models',
        },
        {
          id: 'note',
          kind: 'field',
          label: 'Note',
          schemaPath: '/properties/note',
          widget: 'text',
        },
      ],
    },
    dataSources: [
      {
        id: 'models',
        registryKey: 'workflow.models',
        dependencies: ['provider'],
        cacheTtlMs: 1_000,
      },
    ],
    actions: [],
    rules: [],
  };
}

function Harness({
  document,
  hostAdapter,
  initialValue,
}: {
  document: FormDocument;
  hostAdapter?: FormHostAdapter;
  initialValue: JsonObject;
}) {
  const [value, setValue] = useState(initialValue);
  const plan = useMemo(() => assertCompiled(document), [document]);
  return (
    <>
      <FormRenderer plan={plan} value={value} onChange={setValue} hostAdapter={hostAdapter} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

describe('React data-source orchestration', () => {
  it('reloads only for declared dependencies and cancels superseded work', async () => {
    const requests: Array<{
      request: DataSourceRequest;
      signal: AbortSignal;
      resolve: (response: DataSourceResponse) => void;
    }> = [];
    const hostAdapter: FormHostAdapter = {
      resolveDataSource: (request, signal) =>
        new Promise((resolve) => requests.push({ request, signal, resolve })),
    };
    render(
      <Harness
        document={createDataSourceDocument()}
        hostAdapter={hostAdapter}
        initialValue={{ provider: 'openai', note: 'first' }}
      />,
    );

    await waitFor(() => expect(requests).toHaveLength(1));
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'second' } });
    await Promise.resolve();
    expect(requests).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'anthropic' } });
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[0].signal.aborted).toBe(true);
    expect(requests[1].request.value.provider).toBe('anthropic');
    requests[1].resolve([{ label: 'Claude Sonnet', value: 'claude-sonnet' }]);
    expect(await screen.findByRole('option', { name: 'Claude Sonnet' })).toBeTruthy();
    requests[0].resolve([{ label: 'Stale GPT', value: 'stale-gpt' }]);
    await Promise.resolve();
    expect(screen.queryByRole('option', { name: 'Stale GPT' })).toBeNull();
  });

  it('waits for declared dependencies and ignores hidden option fields', async () => {
    const document = createDataSourceDocument();
    document.rules = [
      {
        id: 'show-model-for-anthropic',
        target: 'model',
        kind: 'visible',
        expression: {
          op: 'eq',
          left: { op: 'field', path: 'provider' },
          right: { op: 'literal', value: 'anthropic' },
        },
      },
    ];
    let calls = 0;
    render(
      <Harness
        document={document}
        initialValue={{}}
        hostAdapter={{
          resolveDataSource: async () => {
            calls += 1;
            return [];
          },
        }}
      />,
    );

    expect(screen.queryByLabelText('Model')).toBeNull();
    expect(calls).toBe(0);
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'anthropic' } });
    await waitFor(() => expect(calls).toBe(1));
    expect(await screen.findByText('暂无可用选项。')).toBeTruthy();
  });

  it('blocks a visible source until its dependency has a value', async () => {
    let calls = 0;
    render(
      <Harness
        document={createDataSourceDocument()}
        initialValue={{}}
        hostAdapter={{
          resolveDataSource: async () => {
            calls += 1;
            return [];
          },
        }}
      />,
    );

    expect(await screen.findByText('请先完成关联字段。')).toBeTruthy();
    expect((screen.getByLabelText('Model') as HTMLSelectElement).disabled).toBe(true);
    expect(calls).toBe(0);
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'openai' } });
    await waitFor(() => expect(calls).toBe(1));
  });

  it('deduplicates identical requests across fields in one embedded renderer', async () => {
    const document = createDataSourceDocument();
    document.ui.nodes[0].children = ['provider', 'model', 'fallback-model'];
    document.ui.nodes.push({
      id: 'fallback-model',
      kind: 'field',
      label: 'Fallback model',
      schemaPath: '/properties/fallbackModel',
      widget: 'select',
      dataSource: 'models',
    });
    let resolveRequest: ((response: DataSourceResponse) => void) | undefined;
    let calls = 0;
    render(
      <Harness
        document={document}
        initialValue={{ provider: 'openai' }}
        hostAdapter={{
          resolveDataSource: () => {
            calls += 1;
            return new Promise((resolve) => {
              resolveRequest = resolve;
            });
          },
        }}
      />,
    );

    await waitFor(() => expect(calls).toBe(1));
    resolveRequest?.([{ label: 'GPT-4.1', value: 'gpt-4.1' }]);
    expect(await screen.findAllByRole('option', { name: 'GPT-4.1' })).toHaveLength(2);
  });

  it('supports focus triggers and an explicit empty state', async () => {
    const document = createDataSourceDocument();
    if (!document.dataSources) throw new Error('Missing data-source fixture.');
    document.dataSources[0].trigger = 'focus';
    let resolveRequest: ((response: DataSourceResponse) => void) | undefined;
    let calls = 0;
    render(
      <Harness
        document={document}
        initialValue={{ provider: 'openai' }}
        hostAdapter={{
          resolveDataSource: () => {
            calls += 1;
            return new Promise((resolve) => {
              resolveRequest = resolve;
            });
          },
        }}
      />,
    );

    expect(calls).toBe(0);
    fireEvent.focus(screen.getByLabelText('Model'));
    await waitFor(() => expect(calls).toBe(1));
    resolveRequest?.({ options: [] });
    expect(await screen.findByText('暂无可用选项。')).toBeTruthy();
  });

  it('searches with the declared debounce and appends cursor pages', async () => {
    const document = createDataSourceDocument();
    if (!document.dataSources) throw new Error('Missing data-source fixture.');
    document.dataSources[0].searchable = true;
    document.dataSources[0].debounceMs = 0;
    document.dataSources[0].pageSize = 1;
    const requests: DataSourceRequest[] = [];
    render(
      <Harness
        document={document}
        initialValue={{ provider: 'openai' }}
        hostAdapter={{
          resolveDataSource: async (request) => {
            requests.push(request);
            if (request.query) {
              return { options: [{ label: 'GPT-4.1 mini', value: 'gpt-4.1-mini' }] };
            }
            if (request.cursor === 'page-2') {
              return { options: [{ label: 'GPT-4.1', value: 'gpt-4.1' }] };
            }
            return {
              options: [{ label: 'GPT-5', value: 'gpt-5' }],
              nextCursor: 'page-2',
            };
          },
        }}
      />,
    );

    expect(await screen.findByRole('option', { name: 'GPT-5' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '加载更多选项' }));
    expect(await screen.findByRole('option', { name: 'GPT-4.1' })).toBeTruthy();
    expect(requests.at(-1)).toEqual(expect.objectContaining({ cursor: 'page-2', limit: 1 }));

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索 Model 选项' }), {
      target: { value: 'mini' },
    });
    expect(await screen.findByRole('option', { name: 'GPT-4.1 mini' })).toBeTruthy();
    expect(requests.at(-1)).toEqual(expect.objectContaining({ query: 'mini', limit: 1 }));
    expect(screen.queryByRole('option', { name: 'GPT-5' })).toBeNull();
  });

  it('passes the latest whole form value when an unrelated field changes before pagination', async () => {
    const document = createDataSourceDocument();
    if (!document.dataSources) throw new Error('Missing data-source fixture.');
    document.dataSources[0].pageSize = 1;
    const requests: DataSourceRequest[] = [];
    render(
      <Harness
        document={document}
        initialValue={{ provider: 'openai', note: 'first' }}
        hostAdapter={{
          resolveDataSource: async (request) => {
            requests.push(request);
            return request.cursor
              ? { options: [{ label: 'Second model', value: 'second' }] }
              : {
                  options: [{ label: 'First model', value: 'first' }],
                  nextCursor: 'page-2',
                };
          },
        }}
      />,
    );

    expect(await screen.findByRole('option', { name: 'First model' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'latest' } });
    fireEvent.click(screen.getByRole('button', { name: '加载更多选项' }));
    expect(await screen.findByRole('option', { name: 'Second model' })).toBeTruthy();
    expect(requests.at(-1)).toEqual(
      expect.objectContaining({
        cursor: 'page-2',
        value: expect.objectContaining({ note: 'latest' }),
      }),
    );
  });

  it('fails closed with retry instead of leaking host errors', async () => {
    const originalWarn = console.warn;
    console.warn = () => undefined;
    let attempts = 0;
    render(
      <Harness
        document={createDataSourceDocument()}
        initialValue={{ provider: 'openai' }}
        hostAdapter={{
          resolveDataSource: async () => {
            attempts += 1;
            if (attempts === 1) throw new Error('secret upstream detail');
            return [{ label: 'Recovered model', value: 'recovered' }];
          },
        }}
      />,
    );

    expect(await screen.findByRole('alert', { name: 'Model 选项加载失败' })).toBeTruthy();
    expect(screen.queryByText('secret upstream detail')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '重试加载 Model 选项' }));
    expect(await screen.findByRole('option', { name: 'Recovered model' })).toBeTruthy();
    console.warn = originalWarn;
  });

  it('retains loaded options when pagination fails and retries the same cursor', async () => {
    const originalWarn = console.warn;
    console.warn = () => undefined;
    const document = createDataSourceDocument();
    if (!document.dataSources) throw new Error('Missing data-source fixture.');
    document.dataSources[0].pageSize = 1;
    let pageAttempts = 0;
    render(
      <Harness
        document={document}
        initialValue={{ provider: 'openai' }}
        hostAdapter={{
          resolveDataSource: async (request) => {
            if (!request.cursor) {
              return {
                options: [{ label: 'First model', value: 'first' }],
                nextCursor: 'page-2',
              };
            }
            pageAttempts += 1;
            if (pageAttempts === 1) throw new Error('page unavailable');
            return { options: [{ label: 'Second model', value: 'second' }] };
          },
        }}
      />,
    );

    expect(await screen.findByRole('option', { name: 'First model' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '加载更多选项' }));
    expect(await screen.findByRole('alert', { name: 'Model 更多选项加载失败' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'First model' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '重试加载 Model 更多选项' }));
    expect(await screen.findByRole('option', { name: 'Second model' })).toBeTruthy();
    expect(pageAttempts).toBe(2);
    console.warn = originalWarn;
  });
});
