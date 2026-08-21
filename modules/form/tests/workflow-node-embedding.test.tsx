import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { WorkflowNodeSettingsHost } from '../examples/workflow-node-settings-host';
import {
  compileForm,
  createFormRef,
  type DataSourceRequest,
  type FormHostAdapter,
  type JsonObject,
} from '../src/core';
import type { WorkflowNodeConfiguration } from '../src/workflow';
import { createDocument } from './fixtures';

describe('workflow node embedding example', () => {
  it('keeps the value controlled by the host and commits a pinned configuration', async () => {
    const document = compileForm(createDocument()).document;
    if (!document) throw new Error('Expected the fixture to compile.');
    const published = document;
    const form = createFormRef(published, 'a3s://forms/workflow/llm', 'configuration');
    let committed: WorkflowNodeConfiguration | undefined;

    function Host() {
      const [value, setValue] = useState<JsonObject>({ name: 'Node config' });
      return (
        <WorkflowNodeSettingsHost
          document={published}
          form={form}
          nodeType="llm"
          nodeId="llm-1"
          value={value}
          onChange={setValue}
          onCommit={(configuration) => {
            committed = configuration;
          }}
        />
      );
    }

    render(<Host />);
    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Production node' } });
    expect((screen.getByLabelText('姓名') as HTMLInputElement).value).toBe('Production node');
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    await waitFor(() =>
      expect(committed).toEqual(
        expect.objectContaining({
          apiVersion: 'a3s.dev/workflow-node-configuration/v1alpha1',
          nodeType: 'llm',
          nodeId: 'llm-1',
          form,
          value: { name: 'Production node' },
        }),
      ),
    );
  });

  it('refuses to render a form that no longer matches the pinned digest', () => {
    const document = compileForm(createDocument()).document;
    if (!document) throw new Error('Expected the fixture to compile.');
    const published = document;
    const form = createFormRef(published, 'a3s://forms/workflow/llm', 'configuration');

    render(
      <WorkflowNodeSettingsHost
        document={document}
        form={{ ...form, digest: 'sha256:stale' }}
        nodeType="llm"
        nodeId="llm-1"
        value={{}}
        onChange={() => undefined}
        onCommit={() => undefined}
      />,
    );

    expect(screen.getByRole('alert').textContent).toBe(
      'The node form no longer matches its pinned release.',
    );
    expect(screen.queryByRole('form')).toBeNull();
  });

  it('runs host-owned async validation before committing node configuration', async () => {
    const document = compileForm(createDocument()).document;
    if (!document) throw new Error('Expected the fixture to compile.');
    const published = document;
    const form = createFormRef(published, 'a3s://forms/workflow/llm', 'configuration');
    const scopes: string[] = [];
    const hostAdapter: FormHostAdapter = {
      validateValue: async (request) => {
        scopes.push(request.scope.kind);
        return {
          issues:
            request.value.name === 'Unavailable node'
              ? [
                  {
                    path: 'name',
                    code: 'node_unavailable',
                    message: 'This workflow node cannot use that name.',
                  },
                ]
              : [],
        };
      },
    };
    let committed: WorkflowNodeConfiguration | undefined;

    function Host() {
      const [value, setValue] = useState<JsonObject>({ name: 'Unavailable node' });
      return (
        <WorkflowNodeSettingsHost
          document={published}
          form={form}
          nodeType="llm"
          nodeId="llm-async"
          value={value}
          hostAdapter={hostAdapter}
          onChange={setValue}
          onCommit={(configuration) => {
            committed = configuration;
          }}
        />
      );
    }

    render(<Host />);
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    expect(await screen.findByText('This workflow node cannot use that name.')).toBeTruthy();
    expect(committed).toBeUndefined();

    fireEvent.change(screen.getByLabelText('姓名'), { target: { value: 'Available node' } });
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    await waitFor(() => expect(committed?.value.name).toBe('Available node'));
    expect(scopes).toEqual(['form', 'form']);
  });

  it('loads searchable node options through the neutral host adapter', async () => {
    const source = createDocument();
    if (!source.dataSources) throw new Error('Expected the fixture data source.');
    source.dataSources[0] = {
      ...source.dataSources[0],
      trigger: 'focus',
      searchable: true,
      debounceMs: 0,
      pageSize: 1,
    };
    const document = compileForm(source).document;
    if (!document) throw new Error('Expected the fixture to compile.');
    const form = createFormRef(document, 'a3s://forms/workflow/llm', 'configuration');
    const requests: DataSourceRequest[] = [];

    render(
      <WorkflowNodeSettingsHost
        document={document}
        form={form}
        nodeType="llm"
        nodeId="llm-options"
        value={{ name: 'Node config' }}
        hostAdapter={{
          resolveDataSource: async (request) => {
            requests.push(request);
            return [
              request.query
                ? { label: '成员', value: 'member' }
                : { label: '管理员', value: 'admin' },
            ];
          },
        }}
        onChange={() => undefined}
        onCommit={() => undefined}
      />,
    );

    expect(requests).toHaveLength(0);
    fireEvent.focus(screen.getByLabelText('角色'));
    expect(await screen.findByRole('option', { name: '管理员' })).toBeTruthy();
    expect(requests[0]).toEqual(expect.objectContaining({ limit: 1, locale: 'zh-CN' }));
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索 角色 选项' }), {
      target: { value: '成员' },
    });
    expect(await screen.findByRole('option', { name: '成员' })).toBeTruthy();
    expect(requests.at(-1)?.query).toBe('成员');
  });
});
