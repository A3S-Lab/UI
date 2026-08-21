import {
  A3S_FLOW_V1_COMPATIBILITY,
  type A3SFlowDagNodeManifest,
  a3sFlowDagNodeManifestCatalog,
} from '../../../src/a3s-flow';
import { createLangflowNodeForm } from '../../../src/workflow';
import type { PlaygroundWorkspaceSeed } from './workspace';

export type WorkflowNodeKind = string;

export const workflowNodeDescriptors: readonly A3SFlowDagNodeManifest[] =
  a3sFlowDagNodeManifestCatalog.filter((descriptor) => !descriptor.internal);

export const workflowNodeKinds: readonly WorkflowNodeKind[] = workflowNodeDescriptors.map(
  (descriptor) => descriptor.type,
);

function seedToken(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLocaleLowerCase();
}

export function createWorkflowFormSeed(type: string): PlaygroundWorkspaceSeed {
  const descriptor = workflowNodeDescriptors.find((candidate) => candidate.type === type);
  if (!descriptor) throw new Error(`Unknown visible A3S Flow DAG node type: ${type}`);
  return {
    id: `workflow-${seedToken(descriptor.category)}-${seedToken(descriptor.type)}-config`,
    seedVersion: 1000,
    document: createLangflowNodeForm(descriptor, {
      compatibility: A3S_FLOW_V1_COMPATIBILITY,
      presentation: 'task',
    }),
  };
}
