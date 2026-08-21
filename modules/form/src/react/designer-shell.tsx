import { useMemo, useState } from 'react';
import type { FormDocument } from '../core';
import { catalogDragType } from './designer-canvas';
import type { DesignerCatalogItem, DesignerCatalogSection } from './designer-catalog';
import { CatalogIcon, DesignerIcon } from './designer-icons';
import { findDesignerParent } from './designer-schema';
import { handlePanelTabKey } from './designer-tabs';

export type LeftPanel = 'components' | 'outline';
export type MobilePanel = 'components' | 'canvas' | 'settings';

export function MobilePanelBar({
  panel,
  onPanelChange,
}: {
  panel: MobilePanel;
  onPanelChange: (panel: MobilePanel) => void;
}) {
  const items: readonly {
    id: MobilePanel;
    label: string;
    icon: 'components' | 'edit' | 'settings';
  }[] = [
    { id: 'components', label: '组件', icon: 'components' },
    { id: 'canvas', label: '画布', icon: 'edit' },
    { id: 'settings', label: '设置', icon: 'settings' },
  ];
  return (
    <nav className="a3s-form-mobile-panel-bar" aria-label="设计器面板">
      {items.map((item) => (
        <button
          type="button"
          className={`btn${panel === item.id ? ' is-active' : ''}`}
          data-variant="ghost"
          aria-pressed={panel === item.id}
          key={item.id}
          onClick={() => onPanelChange(item.id)}
        >
          <DesignerIcon name={item.icon} size={15} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function DesignerToolbar({
  mode,
  viewport,
  canUndo,
  canRedo,
  compiled,
  leftPanelVisible,
  rightPanelVisible,
  onModeChange,
  onViewportChange,
  onUndo,
  onRedo,
  onToggleLeftPanel,
  onToggleRightPanel,
}: {
  mode: 'design' | 'preview';
  viewport: 'desktop' | 'mobile';
  canUndo: boolean;
  canRedo: boolean;
  compiled: boolean;
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  onModeChange: (mode: 'design' | 'preview') => void;
  onViewportChange: (viewport: 'desktop' | 'mobile') => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}) {
  return (
    <div className="a3s-form-designer-toolbar toolbar" role="toolbar" aria-label="表单设计器工具栏">
      <div className="a3s-form-toolbar-title" data-workspace-identity>
        <span className="a3s-form-toolbar-copy">
          <strong>表单内容</strong>
          <small>{compiled ? '结构与规则实时生效' : '处理问题后即可预览'}</small>
        </span>
      </div>
      <div className="a3s-form-toolbar-actions" data-workspace-actions>
        {mode === 'design' && (
          <fieldset className="a3s-form-toolbar-panel-controls" aria-label="桌面面板">
            <button
              type="button"
              className={`a3s-form-icon-button btn${leftPanelVisible ? ' is-active' : ''}`}
              data-size="icon-sm"
              data-variant="ghost"
              aria-label={leftPanelVisible ? '收起组件面板' : '展开组件面板'}
              aria-pressed={leftPanelVisible}
              title={leftPanelVisible ? '收起组件面板' : '展开组件面板'}
              onClick={onToggleLeftPanel}
            >
              <DesignerIcon name="components" size={16} />
            </button>
            <button
              type="button"
              className={`a3s-form-icon-button btn${rightPanelVisible ? ' is-active' : ''}`}
              data-size="icon-sm"
              data-variant="ghost"
              aria-label={rightPanelVisible ? '收起设置面板' : '展开设置面板'}
              aria-pressed={rightPanelVisible}
              title={rightPanelVisible ? '收起设置面板' : '展开设置面板'}
              onClick={onToggleRightPanel}
            >
              <DesignerIcon name="settings" size={16} />
            </button>
          </fieldset>
        )}
        {mode === 'design' && (
          <span className="a3s-form-toolbar-divider is-panel-separator" aria-hidden="true" />
        )}
        <fieldset className="a3s-form-toolbar-history" aria-label="编辑历史">
          <button
            type="button"
            className="a3s-form-icon-button btn"
            data-size="icon-sm"
            data-variant="ghost"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="撤销"
            aria-keyshortcuts="Control+Z Meta+Z"
            title="撤销（⌘/Ctrl Z）"
          >
            <DesignerIcon name="undo" size={16} />
          </button>
          <button
            type="button"
            className="a3s-form-icon-button btn"
            data-size="icon-sm"
            data-variant="ghost"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="重做"
            aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
            title="重做（⌘/Ctrl Shift Z）"
          >
            <DesignerIcon name="redo" size={16} />
          </button>
        </fieldset>
        <span className="a3s-form-toolbar-divider" aria-hidden="true" />
        <fieldset className="a3s-form-segmented is-viewport" aria-label="画布尺寸">
          <button
            type="button"
            className={`btn${viewport === 'desktop' ? ' is-active' : ''}`}
            data-size="xs"
            data-variant="ghost"
            aria-pressed={viewport === 'desktop'}
            onClick={() => onViewportChange('desktop')}
          >
            <DesignerIcon name="desktop" size={14} />
            桌面
          </button>
          <button
            type="button"
            className={`btn${viewport === 'mobile' ? ' is-active' : ''}`}
            data-size="xs"
            data-variant="ghost"
            aria-pressed={viewport === 'mobile'}
            onClick={() => onViewportChange('mobile')}
          >
            <DesignerIcon name="mobile" size={14} />
            移动
          </button>
        </fieldset>
        <fieldset className="a3s-form-segmented" aria-label="设计器模式">
          <button
            type="button"
            className={`btn${mode === 'design' ? ' is-active' : ''}`}
            data-size="xs"
            data-variant="ghost"
            aria-pressed={mode === 'design'}
            onClick={() => onModeChange('design')}
          >
            <DesignerIcon name="edit" size={14} />
            设计
          </button>
          <button
            type="button"
            className={`btn${mode === 'preview' ? ' is-active' : ''}`}
            data-size="xs"
            data-variant="ghost"
            aria-pressed={mode === 'preview'}
            aria-disabled={!compiled}
            disabled={!compiled}
            title={compiled ? '使用真实控件预览表单' : '修复编译问题后再预览'}
            onClick={() => onModeChange('preview')}
          >
            <DesignerIcon name="eye" size={14} />
            预览
          </button>
        </fieldset>
      </div>
    </div>
  );
}

export function PalettePanel({
  document,
  catalog,
  selectedId,
  panel,
  onPanelChange,
  onAdd,
  onSelect,
}: {
  document: FormDocument;
  catalog: readonly DesignerCatalogSection[];
  selectedId: string;
  panel: LeftPanel;
  onPanelChange: (panel: LeftPanel) => void;
  onAdd: (item: DesignerCatalogItem) => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const visibleCatalog = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    if (!normalized) return catalog;
    return catalog
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          `${item.label} ${item.description}`.toLocaleLowerCase('zh-CN').includes(normalized),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [catalog, query]);

  return (
    <aside className="a3s-form-palette task-pane tabs" aria-label="组件与表单结构">
      <div className="a3s-form-panel-tabs" role="tablist" aria-label="左侧面板">
        <button
          type="button"
          id="a3s-form-palette-tab-components"
          role="tab"
          aria-controls="a3s-form-palette-components"
          aria-selected={panel === 'components'}
          tabIndex={panel === 'components' ? 0 : -1}
          className={`btn${panel === 'components' ? ' is-active' : ''}`}
          data-size="xs"
          data-variant="ghost"
          onKeyDown={(event) =>
            handlePanelTabKey(event, ['components', 'outline'], panel, onPanelChange)
          }
          onClick={() => onPanelChange('components')}
        >
          组件
        </button>
        <button
          type="button"
          id="a3s-form-palette-tab-outline"
          role="tab"
          aria-controls="a3s-form-palette-outline"
          aria-selected={panel === 'outline'}
          tabIndex={panel === 'outline' ? 0 : -1}
          className={`btn${panel === 'outline' ? ' is-active' : ''}`}
          data-size="xs"
          data-variant="ghost"
          onKeyDown={(event) =>
            handlePanelTabKey(event, ['components', 'outline'], panel, onPanelChange)
          }
          onClick={() => onPanelChange('outline')}
        >
          结构
        </button>
      </div>
      {panel === 'components' ? (
        <div
          className="a3s-form-palette-content"
          id="a3s-form-palette-components"
          role="tabpanel"
          aria-labelledby="a3s-form-palette-tab-components"
        >
          <label className="a3s-form-catalog-search">
            <DesignerIcon name="search" size={14} />
            <input
              className="input"
              aria-label="搜索组件"
              placeholder="搜索字段或布局"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                className="btn"
                data-size="icon-xs"
                data-variant="ghost"
                aria-label="清空组件搜索"
                onClick={() => setQuery('')}
              >
                <DesignerIcon name="close" size={13} />
              </button>
            )}
          </label>
          <div className="a3s-form-insertion-guide alert" role="note">
            <DesignerIcon name="arrow-down" size={14} />
            <span>
              <strong>点击追加</strong>
              <small>拖拽可精确插入</small>
            </span>
          </div>
          <div className="a3s-form-catalog">
            {visibleCatalog.map((section) => (
              <section key={section.id}>
                <h2>
                  {section.label}
                  <span aria-hidden="true">{section.items.length}</span>
                </h2>
                <div className="a3s-form-palette-grid">
                  {section.items.map((item) => (
                    <button
                      type="button"
                      className="btn"
                      data-variant="outline"
                      key={item.id}
                      title={item.description}
                      aria-label={`添加${item.label}${item.kind === 'field' || (item.kind === 'repeater' && item.preset !== 'repeater-group' && item.preset !== 'data-grid') ? '字段' : ''}`}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData(catalogDragType, item.id)}
                      onClick={() => onAdd(item)}
                    >
                      <span className="a3s-form-palette-icon" aria-hidden="true">
                        <CatalogIcon id={item.id} fallback={item.glyph} />
                      </span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {visibleCatalog.length === 0 && (
              <div className="a3s-form-catalog-empty">
                <span aria-hidden="true">
                  <DesignerIcon name="search" size={18} />
                </span>
                <strong>没有匹配的组件</strong>
                <small>试试“文本”“日期”或“布局”</small>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="a3s-form-outline-panel"
          id="a3s-form-palette-outline"
          role="tabpanel"
          aria-labelledby="a3s-form-palette-tab-outline"
        >
          <div className="a3s-form-outline-summary">
            <span>页面结构</span>
            <strong>{document.ui.nodes.length} 个节点</strong>
          </div>
          <div className="a3s-form-outline" role="tree">
            {document.ui.nodes.map((node) => (
              <button
                type="button"
                role="treeitem"
                aria-label={`选择${node.label ?? node.id}`}
                aria-selected={selectedId === node.id}
                aria-level={nodeDepth(document, node.id) + 1}
                data-node-id={node.id}
                className={`btn${selectedId === node.id ? ' is-selected' : ''}`}
                data-size="sm"
                data-variant="ghost"
                style={{ paddingLeft: `${12 + nodeDepth(document, node.id) * 13}px` }}
                key={node.id}
                onClick={() => onSelect(node.id)}
              >
                <span aria-hidden="true">
                  <DesignerIcon
                    name={node.kind === 'field' || node.kind === 'repeater' ? 'field' : 'layout'}
                    size={13}
                  />
                </span>
                <span>{node.label ?? node.id}</span>
                <small>{node.kind}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function nodeDepth(
  document: FormDocument,
  id: string,
  depth = 0,
  seen = new Set<string>(),
): number {
  if (seen.has(id)) return depth;
  seen.add(id);
  const parent = findDesignerParent(document, id);
  return parent ? nodeDepth(document, parent.id, depth + 1, seen) : depth;
}
