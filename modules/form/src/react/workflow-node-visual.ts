import type { WorkflowNodeDefinition } from '../integrations/workflow-node-manifest';
import type { DesignerIconName } from './designer-icons';

export type WorkflowNodeTone = 'blue' | 'cyan' | 'green' | 'orange' | 'red' | 'violet';

function categoryIcon(category: string): DesignerIconName {
  const normalized = category.toLocaleLowerCase('en');
  if (normalized.includes('agent') || normalized.includes('model') || normalized.includes('llm')) {
    return 'sparkles';
  }
  if (normalized.includes('file') || normalized.includes('knowledge')) return 'file';
  if (normalized.includes('data') || normalized.includes('cassandra')) return 'grid';
  if (normalized.includes('flow') || normalized.includes('input')) return 'layout';
  if (normalized.includes('tool') || normalized.includes('utilit')) return 'calculator';
  if (normalized.includes('embedding') || normalized.includes('search')) return 'search';
  if (normalized.includes('processing')) return 'settings';
  return 'components';
}

/** Shared visual identity for canvas nodes and their configuration panels. */
export function workflowNodeVisual(node: WorkflowNodeDefinition): {
  icon: DesignerIconName;
  tone: WorkflowNodeTone;
} {
  const type = node.type.toLocaleLowerCase('en');
  if (/(condition|branch|classifier|switch)/u.test(type)) return { icon: 'layout', tone: 'cyan' };
  if (/(complete|success|end)$/u.test(type)) return { icon: 'check-square', tone: 'orange' };
  if (/(fail|error|reject)/u.test(type)) return { icon: 'alert', tone: 'red' };
  if (/(wait|schedule|delay|timer)/u.test(type)) return { icon: 'calendar', tone: 'violet' };
  if (/(hook|callback|webhook|event)/u.test(type)) return { icon: 'link', tone: 'violet' };
  if (/(batch|iteration|loop|parallel)/u.test(type)) return { icon: 'list', tone: 'green' };
  if (/(start|trigger|step|task|run)/u.test(type)) return { icon: 'play', tone: 'blue' };
  return { icon: categoryIcon(node.category), tone: 'blue' };
}
