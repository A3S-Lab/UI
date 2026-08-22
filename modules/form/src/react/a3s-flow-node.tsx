import { useMemo } from 'react';
import type { JsonObject } from '../core';
import {
  A3S_FLOW_CORE_COMPATIBILITY,
  type A3SFlowCoreNodeDefinition,
  createA3SFlowNodeBuildConfig,
  createA3SFlowNodeDefaultValue,
} from '../integrations/a3s-flow-core';
import { localizeA3SFlowCoreNode } from '../integrations/a3s-flow-localization';
import { isA3SFlowCorePortAvailable } from '../integrations/a3s-flow-validation';
import { createA3SFlowPanelHostAdapter } from './a3s-flow-panel-support';
import { a3sFlowWidgetRegistry } from './a3s-flow-widgets';
import {
  WorkflowNodeConfigurationPanel,
  type WorkflowNodeConfigurationPanelProps,
} from './workflow-node-panel';
import { WorkflowNodePreview, type WorkflowNodePreviewProps } from './workflow-node-preview';

export interface A3SFlowNodeConfigurationPanelProps
  extends Omit<WorkflowNodeConfigurationPanelProps, 'compatibility' | 'node'> {
  node: A3SFlowCoreNodeDefinition;
  connectedOutputPortIds?: readonly string[];
}

export function A3SFlowNodeConfigurationPanel({
  className,
  buildConfig,
  connectedOutputPortIds,
  hostAdapter,
  locale,
  node,
  onRequestConnection,
  widgetRegistry,
  ...props
}: A3SFlowNodeConfigurationPanelProps) {
  const localizedNode = useMemo(() => localizeA3SFlowCoreNode(node, locale), [locale, node]);
  const resolvedBuildConfig = useMemo(
    () => (buildConfig ? createA3SFlowNodeBuildConfig(localizedNode, buildConfig) : undefined),
    [buildConfig, localizedNode],
  );
  const resolvedWidgetRegistry = useMemo(
    () => ({ ...a3sFlowWidgetRegistry, ...widgetRegistry }),
    [widgetRegistry],
  );
  const validatingHostAdapter = useMemo(
    () =>
      createA3SFlowPanelHostAdapter({
        connectedOutputPortIds,
        definition: node,
        hostAdapter,
        locale,
      }),
    [connectedOutputPortIds, hostAdapter, locale, node],
  );

  return (
    <WorkflowNodeConfigurationPanel
      {...props}
      buildConfig={resolvedBuildConfig}
      className={['a3s-form-flow-node-panel', className].filter(Boolean).join(' ')}
      compatibility={A3S_FLOW_CORE_COMPATIBILITY}
      hostAdapter={validatingHostAdapter}
      locale={locale}
      node={localizedNode}
      onRequestConnection={onRequestConnection}
      presentation="task"
      widgetRegistry={resolvedWidgetRegistry}
    />
  );
}

export interface A3SFlowNodePreviewProps extends Omit<WorkflowNodePreviewProps, 'node' | 'ports'> {
  node: A3SFlowCoreNodeDefinition;
  value?: JsonObject;
}

export function A3SFlowNodePreview({
  className,
  node,
  value = createA3SFlowNodeDefaultValue(node),
  locale,
  ...props
}: A3SFlowNodePreviewProps) {
  const localizedNode = useMemo(() => localizeA3SFlowCoreNode(node, locale), [locale, node]);
  const ports = {
    inputs: localizedNode.ports.inputs,
    outputs: localizedNode.ports.outputs.filter((port) => isA3SFlowCorePortAvailable(port, value)),
  };

  return (
    <WorkflowNodePreview
      {...props}
      className={['a3s-form-flow-node-preview', className].filter(Boolean).join(' ')}
      locale={locale}
      node={localizedNode}
      ports={ports}
      technical={false}
    />
  );
}
