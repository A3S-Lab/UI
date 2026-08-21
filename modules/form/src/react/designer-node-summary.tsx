import type { FormDocument, UiNode } from '../core';
import { CatalogIcon, DesignerIcon } from './designer-icons';
import { resolveDesignerNodeUxProfile } from './designer-node-profiles';
import { schemaBindingForNode } from './designer-schema';
import type { FormNodeRegistry } from './node-registry';

interface NodeStatus {
  label: string;
  title: string;
  tone: 'primary' | 'secondary' | 'outline';
}

export function DesignerNodeSummary({
  document,
  node,
  selectedProperty,
  nodeRegistry,
  onDuplicate,
  onRemove,
}: {
  document: FormDocument;
  node: UiNode;
  selectedProperty?: string;
  nodeRegistry?: FormNodeRegistry;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const profile = resolveDesignerNodeUxProfile(node, document, nodeRegistry);
  const statuses = nodeStatuses(document, node);
  return (
    <article
      className="a3s-form-node-profile item"
      data-size="xs"
      data-variant="muted"
      data-testid="designer-node-profile"
      data-profile-id={profile.id}
      data-editor={profile.editor}
    >
      <figure aria-hidden="true">
        <CatalogIcon id={profile.id} fallback={profile.glyph || profile.typeLabel.slice(0, 1)} />
      </figure>
      <section>
        <header className="a3s-form-node-profile-meta">
          <span className="badge" data-variant="outline">
            {profile.typeLabel}
          </span>
          <small>{profile.category}</small>
        </header>
        <h2>{node.kind === 'root' ? document.metadata.title : (node.label ?? node.id)}</h2>
        <p>{profile.purpose}</p>
        <footer className="a3s-form-node-profile-status">
          {selectedProperty && (
            <code className="badge" data-variant="secondary" title="字段绑定">
              {selectedProperty}
            </code>
          )}
          {statuses.map((status) => (
            <span
              className="badge"
              data-variant={status.tone}
              title={status.title}
              key={`${status.label}-${status.title}`}
            >
              {status.label}
            </span>
          ))}
        </footer>
      </section>
      {node.kind !== 'root' && (
        <aside aria-label="节点操作">
          <button
            type="button"
            className="btn"
            data-size="icon-sm"
            data-variant="ghost"
            aria-label="复制节点"
            title="复制节点"
            onClick={onDuplicate}
          >
            <DesignerIcon name="copy" size={14} />
          </button>
          <button
            type="button"
            className="btn"
            data-size="icon-sm"
            data-variant="destructive"
            aria-label={node.kind === 'field' || node.kind === 'repeater' ? '删除字段' : '删除节点'}
            title={node.kind === 'field' || node.kind === 'repeater' ? '删除字段' : '删除节点'}
            onClick={onRemove}
          >
            <DesignerIcon name="trash" size={14} />
          </button>
        </aside>
      )}
    </article>
  );
}

function nodeStatuses(document: FormDocument, node: UiNode): NodeStatus[] {
  const statuses: NodeStatus[] = [];
  const valueNode = node.kind === 'field' || node.kind === 'repeater';
  if (valueNode) {
    const binding = schemaBindingForNode(document, node);
    const required = Boolean(binding?.parentSchema.required?.includes(binding.property));
    statuses.push({
      label: required ? '必填' : '可选',
      title: required ? '提交前必须填写' : '允许留空',
      tone: required ? 'primary' : 'outline',
    });
  }
  const computed = document.rules?.some(
    (rule) => rule.kind === 'computed' && rule.target === node.id,
  );
  if (computed) {
    statuses.push({ label: '计算', title: '值由 computed 规则更新', tone: 'secondary' });
  } else if (node.readOnly) {
    statuses.push({ label: '只读', title: '填写者不能修改', tone: 'secondary' });
  }
  if (node.hidden || node.widget === 'hidden') {
    statuses.push({ label: '隐藏', title: '填写页不显示', tone: 'secondary' });
  }
  if (node.dataSource) {
    statuses.push({ label: '动态选项', title: `数据源：${node.dataSource}`, tone: 'secondary' });
  }
  if (node.matrix) {
    statuses.push({
      label: `${node.matrix.rows.length} × ${node.matrix.columns.length}`,
      title: `${node.matrix.rows.length} 行，${node.matrix.columns.length} 列`,
      tone: 'outline',
    });
  } else if (node.options) {
    statuses.push({
      label: `${node.options.length} 项`,
      title: `${node.options.length} 个静态选项`,
      tone: 'outline',
    });
  } else if (node.children) {
    statuses.push({
      label: `${node.children.length} 个子节点`,
      title: `${node.children.length} 个直接子节点`,
      tone: 'outline',
    });
  }
  return statuses;
}
