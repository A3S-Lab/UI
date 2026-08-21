import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import {
  type A3SFlowWorkflowDagNode,
  createA3SFlowDagNode,
  createA3SFlowDagNodeRegistry,
  createA3SFlowNodeDefaultValue,
  defineA3SFlowDagNodeManifest,
  requireA3SFlowCoreNode,
  requireA3SFlowDagNodeManifest,
} from '../src/a3s-flow';
import type { AsyncValidationRequest, FormHostAdapter } from '../src/core';
import { A3SFlowDagNodeConfigurationPanel, A3SFlowDagNodePreview } from '../src/react';
import {
  createA3SFlowPanelHostAdapter,
  localizeA3SFlowDagNodeManifest,
} from '../src/react/a3s-flow-panel-support';

const approvalManifest = defineA3SFlowDagNodeManifest({
  type: 'acme.approval',
  display_name: 'Approval',
  description: 'Wait for a human decision.',
  category: 'host',
  categoryLabel: 'Host nodes',
  role: 'host',
  fields: [
    {
      name: 'team',
      display_name: 'Team',
      info: 'Team responsible for the decision.',
      type: 'str',
      _input_type: 'StrInput',
      value: 'finance',
      required: true,
    },
  ],
  ports: {
    inputs: [{ id: 'in', label: 'In', kind: 'control', types: ['FlowControl'] }],
    outputs: [{ id: 'approved', label: 'Approved', kind: 'control', types: ['FlowControl'] }],
  },
  input_types: [],
  output_types: [],
  outputs: [],
});

const registry = createA3SFlowDagNodeRegistry([approvalManifest]);

describe('A3S Flow DAG node configuration panel', () => {
  it('edits a registered host node losslessly and returns the whole DAG node', async () => {
    let applied: A3SFlowWorkflowDagNode | undefined;

    function Harness() {
      const [node, setNode] = useState<A3SFlowWorkflowDagNode>(() => ({
        ...createA3SFlowDagNode('approval-1', approvalManifest, { team: 'finance' }),
        position: { x: 40, y: 80 },
        data: {
          type: 'acme.approval',
          team: 'finance',
          'x-host-extension': { retained: true },
        },
      }));
      return (
        <>
          <A3SFlowDagNodeConfigurationPanel
            dagNode={node}
            registry={registry}
            onChange={setNode}
            onApply={(next) => {
              applied = next;
            }}
          />
          <output data-testid="node-value">{JSON.stringify(node)}</output>
        </>
      );
    }

    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'legal' } });
    const changed = JSON.parse(screen.getByTestId('node-value').textContent ?? '{}');
    expect(changed).toMatchObject({
      id: 'approval-1',
      position: { x: 40, y: 80 },
      data: {
        type: 'acme.approval',
        team: 'legal',
        'x-host-extension': { retained: true },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(applied?.data.team).toBe('legal'));
    expect(applied?.data['x-host-extension']).toEqual({ retained: true });
  });

  it('reports an unregistered node instead of silently changing its data', () => {
    render(
      <A3SFlowDagNodeConfigurationPanel
        dagNode={{ id: 'future', data: { type: 'future.node', retained: true } }}
        registry={registry}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('future.node');
  });

  it('reports an unregistered preview in the requested locale', () => {
    render(
      <A3SFlowDagNodePreview
        className="host-preview"
        dagNode={{ id: 'future-preview', data: { type: 'future.preview' } }}
        registry={registry}
        locale="zh-CN"
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert.classList.contains('host-preview')).toBe(true);
    expect(alert.textContent).toContain('未注册节点 future.preview');
    expect(alert.textContent).toContain('节点数据未被修改');
  });

  it('previews the manifest-owned ports from a complete DAG node', () => {
    const dagNode = createA3SFlowDagNode('approval-preview', approvalManifest, {
      team: 'finance',
    });
    render(<A3SFlowDagNodePreview dagNode={dagNode} manifest={approvalManifest} technical />);

    expect(screen.getByLabelText('Approval workflow node preview')).toBeTruthy();
    expect(screen.getByText('In')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
    expect(screen.getByText('acme.approval')).toBeTruthy();
  });

  it('keeps the A3S expression widget and localized copy on the DAG main path', () => {
    const manifest = requireA3SFlowDagNodeManifest('flow.step');
    const dagNode = createA3SFlowDagNode('step-dag', manifest);
    render(
      <A3SFlowDagNodeConfigurationPanel
        dagNode={dagNode}
        manifest={manifest}
        locale="zh-CN"
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: '执行步骤' })).toBeTruthy();
    expect(screen.getByLabelText('工作流字段路径')).toBeTruthy();
    expect(screen.queryByDisplayValue('[object Object]')).toBeNull();
  });

  it('merges manifest field overrides and returns a whole node on guarded reset', () => {
    let resetNode: A3SFlowWorkflowDagNode | undefined;
    const dagNode = createA3SFlowDagNode('approval-reset', approvalManifest, { team: 'legal' });
    const team = approvalManifest.fields[0];
    if (!team) throw new Error('Approval manifest requires the team field.');

    const { container } = render(
      <A3SFlowDagNodeConfigurationPanel
        className="host-panel"
        dagNode={dagNode}
        manifest={approvalManifest}
        buildConfig={{ team: { ...team, display_name: 'Review team' } }}
        onChange={() => undefined}
        onReset={(next) => {
          resetNode = next;
        }}
      />,
    );

    expect(screen.getByLabelText('Review team')).toBeTruthy();
    expect(container.querySelector('.host-panel')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Click again to reset' }));
    expect(resetNode).toMatchObject({
      id: 'approval-reset',
      data: { type: 'acme.approval', team: 'finance' },
    });
  });

  it('rejects build-config keys that disagree with their field names', () => {
    const dagNode = createA3SFlowDagNode('approval-invalid-build', approvalManifest);
    const team = approvalManifest.fields[0];
    if (!team) throw new Error('Approval manifest requires the team field.');

    expect(() =>
      render(
        <A3SFlowDagNodeConfigurationPanel
          dagNode={dagNode}
          manifest={approvalManifest}
          buildConfig={{ team: { ...team, name: 'different' } }}
          onChange={() => undefined}
        />,
      ),
    ).toThrow('A3S Flow build-config key team must match field name different.');
  });

  it('composes semantic and host validation without duplicating localization', async () => {
    const stepDefinition = requireA3SFlowCoreNode('flow.step');
    const stepManifest = requireA3SFlowDagNodeManifest('flow.step');
    expect(localizeA3SFlowDagNodeManifest(approvalManifest, undefined, 'zh-CN')).toBe(
      approvalManifest,
    );
    expect(localizeA3SFlowDagNodeManifest(stepManifest, stepDefinition, 'en-US')).toBe(
      stepManifest,
    );
    expect(localizeA3SFlowDagNodeManifest(stepManifest, stepDefinition, 'zh-CN').display_name).toBe(
      '执行步骤',
    );

    const baseRequest = {
      plan: {} as AsyncValidationRequest['plan'],
      value: {},
      scope: { kind: 'field', nodeId: 'team', path: 'team' } as const,
      trigger: 'blur' as const,
      locale: 'en-US',
    };
    const signal = new AbortController().signal;
    const passthrough = createA3SFlowPanelHostAdapter({});
    await expect(passthrough.validateValue?.(baseRequest, signal)).resolves.toEqual({ issues: [] });

    let hostCalls = 0;
    const hostAdapter: FormHostAdapter = {
      validateValue: async () => {
        hostCalls += 1;
        return { issues: [{ code: 'host.invalid', message: 'Host rejected the value.' }] };
      },
    };
    const composed = createA3SFlowPanelHostAdapter({
      definition: stepDefinition,
      hostAdapter,
      locale: 'zh-CN',
    });
    const invalid = await composed.validateValue?.(
      {
        ...baseRequest,
        value: {
          step_name: 'task.run',
          input: {
            apiVersion: 'a3s.dev/flow-expression/v1',
            expression: { op: 'field', path: 'input' },
          },
          max_attempts: 0,
          retry_delay_ms: 0,
          on_exhausted: 'fail_run',
        },
        scope: { kind: 'form' },
      },
      signal,
    );
    expect(invalid).toMatchObject({
      issues: [
        {
          code: 'flow.retry.invalid_max_attempts',
          message: '最多尝试次数必须是 1 到 100 之间的整数。',
        },
      ],
    });
    expect(hostCalls).toBe(0);

    await composed.validateValue?.(
      {
        ...baseRequest,
        value: createA3SFlowNodeDefaultValue(stepDefinition),
        scope: { kind: 'form' },
      },
      signal,
    );
    expect(hostCalls).toBe(1);
  });
});
