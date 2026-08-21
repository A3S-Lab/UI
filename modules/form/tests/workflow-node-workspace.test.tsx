import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowNodeWorkspace } from '../apps/playground/src/workflow-node-workspace';
import { createA3SFlowDagNode, requireA3SFlowDagNodeManifest } from '../src/a3s-flow';

describe('Playground Flow DAG node workspace', () => {
  it('opens on configuration and exposes a compact preview switch', () => {
    const manifest = requireA3SFlowDagNodeManifest('flow.timeout');
    const dagNode = createA3SFlowDagNode('timeout-workspace', manifest);

    render(
      <WorkflowNodeWorkspace
        dagNode={dagNode}
        manifest={manifest}
        onChange={() => undefined}
        onApply={() => undefined}
        onReset={() => undefined}
      />,
    );

    const workspace = screen.getByRole('main');
    expect(workspace.getAttribute('data-active-pane')).toBe('configuration');
    expect(screen.getByRole('toolbar', { name: 'Flow DAG 节点工作区' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '节点配置' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByLabelText('Flow DAG 节点配置')).toBeTruthy();
    expect(screen.getByLabelText('Flow DAG 节点预览')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '节点预览' }));
    expect(workspace.getAttribute('data-active-pane')).toBe('preview');
    expect(screen.getByRole('button', { name: '节点预览' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(screen.getByLabelText('Time Out Workflow节点预览')).toBeTruthy();
  });
});
