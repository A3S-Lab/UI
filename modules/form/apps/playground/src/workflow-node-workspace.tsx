import { useState } from 'react';
import type { A3SFlowDagNodeManifest, A3SFlowWorkflowDagNode } from '../../../src/a3s-flow';
import {
  A3SFlowDagNodeConfigurationPanel,
  type A3SFlowDagNodeConfigurationPanelProps,
  A3SFlowDagNodePreview,
} from '../../../src/react';

type WorkflowNodeHostCallbacks = Pick<
  A3SFlowDagNodeConfigurationPanelProps,
  'onCopyField' | 'onDataDisplayAction' | 'onRefreshField' | 'onRequestConnection'
>;

export interface WorkflowNodeWorkspaceProps extends WorkflowNodeHostCallbacks {
  dagNode: A3SFlowWorkflowDagNode;
  manifest: A3SFlowDagNodeManifest;
  onApply: A3SFlowDagNodeConfigurationPanelProps['onApply'];
  onChange: A3SFlowDagNodeConfigurationPanelProps['onChange'];
  onReset: A3SFlowDagNodeConfigurationPanelProps['onReset'];
}

type WorkflowNodePane = 'configuration' | 'preview';

export function WorkflowNodeWorkspace({
  dagNode,
  manifest,
  onApply,
  onChange,
  onCopyField,
  onDataDisplayAction,
  onRefreshField,
  onRequestConnection,
  onReset,
}: WorkflowNodeWorkspaceProps) {
  const [activePane, setActivePane] = useState<WorkflowNodePane>('configuration');

  return (
    <main className={`playground-node-surface is-pane-${activePane}`} data-active-pane={activePane}>
      <div
        className="playground-node-workspace-toolbar toolbar"
        role="toolbar"
        aria-label="Flow DAG 节点工作区"
      >
        <span>
          <strong>Flow DAG 节点</strong>
          <small>宿主 manifest 驱动 · 无损编辑 data.type</small>
        </span>
        <fieldset className="playground-node-pane-switch" aria-label="节点工作区区域">
          <button
            type="button"
            className={`btn${activePane === 'configuration' ? ' is-active' : ''}`}
            data-size="sm"
            data-variant="ghost"
            aria-controls="playground-node-configuration"
            aria-pressed={activePane === 'configuration'}
            onClick={() => setActivePane('configuration')}
          >
            节点配置
          </button>
          <button
            type="button"
            className={`btn${activePane === 'preview' ? ' is-active' : ''}`}
            data-size="sm"
            data-variant="ghost"
            aria-controls="playground-node-preview"
            aria-pressed={activePane === 'preview'}
            onClick={() => setActivePane('preview')}
          >
            节点预览
          </button>
        </fieldset>
      </div>

      <div className="playground-node-stage">
        <aside
          className="playground-node-preview"
          id="playground-node-preview"
          aria-label="Flow DAG 节点预览"
          data-workflow-pane="preview"
        >
          <span>节点预览</span>
          <A3SFlowDagNodePreview dagNode={dagNode} manifest={manifest} locale="zh-CN" technical />
        </aside>
        <section
          className="playground-node-configuration"
          id="playground-node-configuration"
          aria-label="Flow DAG 节点配置"
          data-workflow-pane="configuration"
        >
          <A3SFlowDagNodeConfigurationPanel
            dagNode={dagNode}
            manifest={manifest}
            locale="zh-CN"
            onChange={onChange}
            onApply={onApply}
            onReset={onReset}
            onRequestConnection={onRequestConnection}
            onRefreshField={onRefreshField}
            onCopyField={onCopyField}
            onDataDisplayAction={onDataDisplayAction}
          />
        </section>
      </div>
    </main>
  );
}
