import type {
  WorkflowNodeDefinition,
  WorkflowNodeFieldDefinition,
} from '../integrations/workflow-node-manifest';
import { DesignerIcon } from './designer-icons';
import { workflowNodeVisual } from './workflow-node-visual';

export type WorkflowNodePreviewStatus = 'idle' | 'running' | 'success' | 'waiting' | 'error';

export interface WorkflowNodePreviewProps {
  node: WorkflowNodeDefinition;
  className?: string;
  selected?: boolean;
  ports?: WorkflowNodePreviewPorts;
  locale?: string;
  technical?: boolean;
  status?: WorkflowNodePreviewStatus;
  onSelect?: () => void;
}

export interface WorkflowNodePreviewPort {
  id: string;
  label: string;
  types: readonly string[];
  kind?: 'control' | 'data';
}

export interface WorkflowNodePreviewPorts {
  inputs: readonly WorkflowNodePreviewPort[];
  outputs: readonly WorkflowNodePreviewPort[];
}

function uniqueTypes(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function previewShape(
  inputs: readonly WorkflowNodePreviewPort[],
  outputs: readonly WorkflowNodePreviewPort[],
): 'entry' | 'terminal' | 'branch' | 'action' | 'isolated' {
  if (inputs.length === 0 && outputs.length === 0) return 'isolated';
  if (inputs.length === 0) return 'entry';
  if (outputs.length === 0) return 'terminal';
  if (outputs.length > 1) return 'branch';
  return 'action';
}

function isVisibleInputPortField(
  field: WorkflowNodeFieldDefinition,
): field is WorkflowNodeFieldDefinition & { input_types: string[] } {
  return field.show !== false && (field.input_types?.length ?? 0) > 0;
}

function inputPorts(node: WorkflowNodeDefinition): WorkflowNodePreviewPort[] {
  const fields = node.fields.filter(isVisibleInputPortField).map((field) => ({
    id: field.name,
    label: field.display_name ?? field.name,
    types: uniqueTypes(field.input_types),
  }));
  if (fields.length > 0) return fields;
  const types = uniqueTypes(node.input_types);
  return types.length > 0 ? [{ id: 'input', label: 'Input', types }] : [];
}

function outputPorts(node: WorkflowNodeDefinition): WorkflowNodePreviewPort[] {
  if (node.outputs.length > 0) {
    return node.outputs.map((output) => ({
      id: output.name,
      label: output.display_name || output.name,
      types: uniqueTypes(output.types),
    }));
  }
  const types = uniqueTypes(node.output_types);
  return types.length > 0 ? [{ id: 'output', label: 'Output', types }] : [];
}

function PortList({
  direction,
  ports,
  technical,
}: {
  direction: 'input' | 'output';
  ports: readonly WorkflowNodePreviewPort[];
  technical: boolean;
}) {
  if (ports.length === 0) return null;
  return (
    <div className="a3s-form-workflow-node-preview-port-list" data-direction={direction}>
      {ports.map((port) => (
        <div
          className="a3s-form-workflow-node-preview-port"
          data-port-kind={port.kind}
          key={port.id}
        >
          {direction === 'input' && <i aria-hidden="true" />}
          <span>
            <strong>{port.label}</strong>
            {technical && <small>{port.types.join(' · ') || 'Any'}</small>}
          </span>
          {direction === 'output' && <i aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

export function WorkflowNodePreview({
  node,
  className,
  ports,
  selected = true,
  locale = 'en',
  technical = true,
  status = 'idle',
  onSelect,
}: WorkflowNodePreviewProps) {
  const chinese = locale.toLocaleLowerCase().startsWith('zh');
  const inputs = ports?.inputs ?? inputPorts(node);
  const outputs = ports?.outputs ?? outputPorts(node);
  const runtimeBinding =
    'runtimeBinding' in node && typeof node.runtimeBinding === 'string'
      ? node.runtimeBinding
      : undefined;
  const visual = workflowNodeVisual(node);
  const shape = previewShape(inputs, outputs);
  const interactive = typeof onSelect === 'function';
  return (
    <article
      className={['a3s-form-workflow-node-preview', className].filter(Boolean).join(' ')}
      data-node-type={node.type}
      data-node-shape={shape}
      data-node-tone={visual.tone}
      data-runtime-binding={runtimeBinding}
      data-selected={selected || undefined}
      data-status={status}
      data-technical={technical || undefined}
      aria-label={`${node.display_name}${chinese ? '节点预览' : ' workflow node preview'}`}
      {...(interactive
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-pressed': selected,
          }
        : {})}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!interactive || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onSelect();
      }}
    >
      <header>
        <span aria-hidden="true">
          <DesignerIcon name={visual.icon} size={17} />
        </span>
        <div>
          <strong>{node.display_name}</strong>
          <small>{node.categoryLabel}</small>
        </div>
        {status !== 'idle' && (
          <span
            className="a3s-form-workflow-node-preview-status"
            data-status={status}
            aria-hidden="true"
          />
        )}
        {(node.beta || node.legacy) && <em>{node.beta ? 'Beta' : 'Legacy'}</em>}
      </header>
      <div className="a3s-form-workflow-node-preview-body">
        <PortList direction="input" ports={inputs} technical={technical} />
        <PortList direction="output" ports={outputs} technical={technical} />
        {inputs.length === 0 && outputs.length === 0 && (
          <p>{chinese ? '这个节点没有连接端口。' : 'This node has no typed ports.'}</p>
        )}
      </div>
      {node.description && (
        <p className="a3s-form-workflow-node-preview-description">{node.description}</p>
      )}
      <footer>
        {technical ? (
          <>
            <code>{node.type}</code>
            <span>
              {runtimeBinding ??
                `${node.fields.filter((field) => field.show !== false).length} settings`}
            </span>
          </>
        ) : (
          <span>
            {chinese
              ? `${inputs.length} 个输入 · ${outputs.length} 个输出`
              : `${inputs.length} inputs · ${outputs.length} outputs`}
          </span>
        )}
      </footer>
    </article>
  );
}
