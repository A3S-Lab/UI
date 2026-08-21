import { createElement, useMemo } from 'react';
import type { FormDocument, JsonObject } from '../core';
import { createA3SFlowNodeBuildConfig, getA3SFlowCoreNode } from '../integrations/a3s-flow-core';
import {
  A3S_FLOW_V1_COMPATIBILITY,
  type A3SFlowWorkflowDagNode,
} from '../integrations/a3s-flow-dsl-types';
import {
  type A3SFlowDagNodeManifest,
  type A3SFlowDagNodeRegistry,
  a3sFlowDagNodeRegistry,
  mergeA3SFlowDagNodeConfiguration,
  selectA3SFlowDagNodeConfiguration,
} from '../integrations/a3s-flow-node-manifest';
import {
  createA3SFlowPanelHostAdapter,
  localizeA3SFlowDagNodeManifest,
} from './a3s-flow-panel-support';
import { a3sFlowWidgetRegistry } from './a3s-flow-widgets';
import {
  LangflowNodeConfigurationPanel,
  type LangflowNodeConfigurationPanelProps,
} from './langflow-node-panel';
import {
  LangflowWorkflowNodePreview,
  type LangflowWorkflowNodePreviewProps,
} from './langflow-workflow-node-preview';

export interface A3SFlowDagNodeConfigurationPanelProps
  extends Omit<
    LangflowNodeConfigurationPanelProps,
    'compatibility' | 'node' | 'onApply' | 'onChange' | 'onReset' | 'value'
  > {
  dagNode: A3SFlowWorkflowDagNode;
  manifest?: A3SFlowDagNodeManifest;
  registry?: A3SFlowDagNodeRegistry;
  connectedOutputPortIds?: readonly string[];
  onChange: (node: A3SFlowWorkflowDagNode) => void;
  onApply?: (node: A3SFlowWorkflowDagNode, document: FormDocument) => void | Promise<void>;
  onReset?: (node: A3SFlowWorkflowDagNode) => void;
}

export interface A3SFlowDagNodePreviewProps
  extends Omit<LangflowWorkflowNodePreviewProps, 'node' | 'ports'> {
  dagNode: A3SFlowWorkflowDagNode;
  manifest?: A3SFlowDagNodeManifest;
  registry?: A3SFlowDagNodeRegistry;
}

function missingManifestAlert(
  type: string,
  locale: string | undefined,
  className: string | undefined,
  surfaceClass: string,
) {
  const chinese = locale?.toLocaleLowerCase().startsWith('zh') === true;
  const copy = chinese
    ? {
        title: `未注册节点 ${type}`,
        detail: '请由接入系统为这个 data.type 注册属性 manifest。节点数据未被修改。',
      }
    : {
        title: `Unregistered node ${type}`,
        detail:
          'The host must register a property manifest for this data.type. No node data changed.',
      };
  return createElement(
    'section',
    {
      className: [surfaceClass, 'a3s-form-flow-dag-node-missing', className]
        .filter(Boolean)
        .join(' '),
      role: 'alert',
    },
    createElement('strong', null, copy.title),
    createElement('p', null, copy.detail),
  );
}

/** Typed graph preview for one host-owned Flow v1 DAG node. */
export function A3SFlowDagNodePreview({
  className,
  dagNode,
  manifest: suppliedManifest,
  registry = a3sFlowDagNodeRegistry,
  technical = false,
  ...props
}: A3SFlowDagNodePreviewProps) {
  const manifest = suppliedManifest ?? registry.get(dagNode.data.type);
  const localizedManifest = useMemo(() => {
    if (!manifest) return undefined;
    return localizeA3SFlowDagNodeManifest(
      manifest,
      getA3SFlowCoreNode(manifest.type),
      props.locale,
    );
  }, [manifest, props.locale]);
  if (!localizedManifest) {
    return missingManifestAlert(
      dagNode.data.type,
      props.locale,
      className,
      'a3s-form-workflow-node-preview',
    );
  }

  return createElement(LangflowWorkflowNodePreview, {
    ...props,
    className,
    node: localizedManifest,
    ports: localizedManifest.ports,
    technical,
  });
}

/** Lossless configuration surface for one host-owned Flow v1 DAG node. */
export function A3SFlowDagNodeConfigurationPanel({
  buildConfig,
  className,
  connectedOutputPortIds,
  dagNode,
  hostAdapter,
  locale,
  manifest: suppliedManifest,
  onApply,
  onChange,
  onReset,
  onRequestConnection,
  registry = a3sFlowDagNodeRegistry,
  widgetRegistry,
  ...props
}: A3SFlowDagNodeConfigurationPanelProps) {
  const manifest = suppliedManifest ?? registry.get(dagNode.data.type);
  const coreDefinition = useMemo(
    () => (manifest ? getA3SFlowCoreNode(manifest.type) : undefined),
    [manifest],
  );
  const localizedManifest = useMemo(
    () => (manifest ? localizeA3SFlowDagNodeManifest(manifest, coreDefinition, locale) : undefined),
    [coreDefinition, locale, manifest],
  );
  const value = useMemo(
    () => (manifest ? selectA3SFlowDagNodeConfiguration(dagNode, manifest) : undefined),
    [dagNode, manifest],
  );
  const resolvedBuildConfig = useMemo(
    () =>
      localizedManifest && buildConfig
        ? createA3SFlowNodeBuildConfig(localizedManifest, buildConfig)
        : buildConfig,
    [buildConfig, localizedManifest],
  );
  const resolvedWidgetRegistry = useMemo(
    () => ({ ...a3sFlowWidgetRegistry, ...widgetRegistry }),
    [widgetRegistry],
  );
  const validatingHostAdapter = useMemo(
    () =>
      createA3SFlowPanelHostAdapter({
        connectedOutputPortIds,
        definition: coreDefinition,
        hostAdapter,
        locale,
      }),
    [connectedOutputPortIds, coreDefinition, hostAdapter, locale],
  );

  if (!manifest || !localizedManifest || !value) {
    return missingManifestAlert(
      dagNode.data.type,
      locale,
      className,
      'a3s-form-workflow-node-panel',
    );
  }

  const nextNode = (configuration: JsonObject) =>
    mergeA3SFlowDagNodeConfiguration(dagNode, manifest, configuration);

  return createElement(LangflowNodeConfigurationPanel, {
    ...props,
    buildConfig: resolvedBuildConfig,
    className,
    compatibility: A3S_FLOW_V1_COMPATIBILITY,
    hostAdapter: validatingHostAdapter,
    locale,
    node: localizedManifest,
    value,
    onChange: (configuration) => onChange(nextNode(configuration)),
    onApply: async (configuration, document) => onApply?.(nextNode(configuration), document),
    onReset: (configuration) => onReset?.(nextNode(configuration)),
    onRequestConnection,
    presentation: 'task',
    widgetRegistry: resolvedWidgetRegistry,
  });
}
