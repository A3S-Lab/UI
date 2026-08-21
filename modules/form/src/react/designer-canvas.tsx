import {
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { type FormDocument, resolveFormLocaleCatalog, type UiNode } from '../core';
import type { FormDataSourceState } from './data-source';
import { DesignerIcon } from './designer-icons';
import { isDesignerContainer, schemaBindingForNode, schemaForNode } from './designer-schema';
import { NativeWidget } from './native-widget';
import type { FormNodeDefinition, FormNodeRegistry } from './node-registry';
import { RepeaterIcon } from './repeater-controls';
import {
  BOOLEAN_FIELD_WIDGETS,
  COMPOSITE_FIELD_WIDGETS,
  designerWidgetValue,
} from './widget-contract';

export const catalogDragType = 'application/x-a3s-form-catalog';
export const nodeDragType = 'application/x-a3s-form-node';

const DESIGN_DATA_SOURCE: FormDataSourceState = {
  options: [],
  status: 'static',
  query: '',
  searchable: false,
  hasMore: false,
  loadingMore: false,
  pageError: false,
  activate: () => undefined,
  setQuery: () => undefined,
  retry: () => undefined,
  loadMore: () => undefined,
};

export interface CanvasDropTarget {
  containerId: string;
  index: number;
}

export function scrollSelectedNodeIntoView(
  stage: HTMLElement,
  selectedId: string,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  if (stage.clientHeight <= 0) return false;
  const selected = Array.from(stage.querySelectorAll<HTMLElement>('[data-node-id]')).find(
    (element) => element.dataset.nodeId === selectedId,
  );
  if (!selected) return false;

  const stageBounds = stage.getBoundingClientRect();
  const selectedBounds = selected.getBoundingClientRect();
  const inset = 24;
  const visibleTop = stageBounds.top + inset;
  const visibleBottom = stageBounds.bottom - inset;
  if (selectedBounds.top >= visibleTop && selectedBounds.bottom <= visibleBottom) return false;

  const availableHeight = Math.max(0, stage.clientHeight - inset * 2);
  const offset =
    selectedBounds.height >= availableHeight
      ? inset
      : Math.max(inset, (stage.clientHeight - selectedBounds.height) / 2);
  const top = Math.max(0, stage.scrollTop + selectedBounds.top - stageBounds.top - offset);
  stage.scrollTo({ top, behavior });
  return true;
}

interface DesignerCanvasProps {
  document: FormDocument;
  selectedId: string;
  viewport: 'desktop' | 'mobile';
  nodeRegistry?: FormNodeRegistry;
  onSelect: (nodeId: string) => void;
  onCatalogDrop: (catalogId: string, target: CanvasDropTarget) => void;
  onNodeDrop: (nodeId: string, target: CanvasDropTarget) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function DesignerCanvas(props: DesignerCanvasProps) {
  const root = props.document.ui.nodes.find((node) => node.id === props.document.ui.root);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    scrollSelectedNodeIntoView(stage, props.selectedId, 'auto');
  }, [props.selectedId]);

  return (
    <div className={`a3s-form-design-stage is-${props.viewport}`} ref={stageRef}>
      <div className="a3s-form-design-page">
        {root ? (
          <>
            <button
              type="button"
              className={`a3s-form-page-heading${props.selectedId === root.id ? ' is-selected' : ''}`}
              data-node-id={root.id}
              aria-label={`选择${root.label ?? root.id}`}
              onClick={() => props.onSelect(root.id)}
            >
              <strong>{props.document.metadata.title}</strong>
              <span>
                {props.document.metadata.description ?? root.description ?? '请填写以下信息'}
              </span>
            </button>
            <CanvasChildren
              {...props}
              container={root}
              activeTabs={activeTabs}
              onActivateTab={(containerId, tabId) =>
                setActiveTabs((current) => ({ ...current, [containerId]: tabId }))
              }
            />
          </>
        ) : (
          <div className="a3s-form-canvas-unavailable">根节点不可用，请先修复编译诊断。</div>
        )}
      </div>
    </div>
  );
}

interface CanvasTreeProps extends DesignerCanvasProps {
  activeTabs: Record<string, string>;
  onActivateTab: (containerId: string, tabId: string) => void;
}

function CanvasChildren(props: CanvasTreeProps & { container: UiNode; ancestry?: Set<string> }) {
  const { container } = props;
  const children = container.children ?? [];
  const style = {
    '--a3s-form-columns': container.columns ?? 12,
    '--a3s-form-gap': `${container.gap ?? 16}px`,
  } as CSSProperties;
  return (
    <div className="a3s-form-design-grid" style={style}>
      {children.map((child, index) => {
        const childNode = props.document.ui.nodes.find((node) => node.id === child);
        return (
          <div
            className="a3s-form-canvas-item"
            style={
              {
                '--a3s-form-item-column': `span ${childNode?.width ?? 12}`,
              } as CSSProperties
            }
            key={child}
          >
            <CanvasDropSlot
              {...props}
              containerId={container.id}
              index={index}
              placement="before"
            />
            <CanvasNode {...props} nodeId={child} ancestry={props.ancestry} />
          </div>
        );
      })}
      {children.length === 0 ? (
        <CanvasDropSlot {...props} containerId={container.id} index={0} placement="empty" />
      ) : (
        <CanvasDropSlot
          {...props}
          containerId={container.id}
          index={children.length}
          placement="end"
        />
      )}
    </div>
  );
}

function CustomCanvasNode(
  props: CanvasTreeProps & {
    node: UiNode;
    definition: FormNodeDefinition;
    selected: boolean;
    ancestry: Set<string>;
    style: CSSProperties;
  },
) {
  const Design = props.definition.design;
  const binding = schemaBindingForNode(props.document, props.node);
  const schema = schemaForNode(props.document, props.node);
  const required = Boolean(binding?.parentSchema.required?.includes(binding.property));
  const acceptsChildren = isDesignerContainer(props.document, props.node);
  return (
    <article
      className={`a3s-form-design-custom card${props.selected ? ' is-selected' : ''}`}
      data-node-id={props.node.id}
      data-node-kind={props.node.kind}
      data-node-type={props.node.widget}
      style={props.style}
      draggable
      onDragStart={(event) => beginNodeDrag(event, props.node.id)}
    >
      <button
        type="button"
        className="a3s-form-node-select"
        aria-label={`选择${props.node.label ?? props.node.id}`}
        onClick={() => props.onSelect(props.node.id)}
      />
      <span className="a3s-form-node-handle" aria-hidden="true">
        <DesignerIcon name="grip" size={15} />
      </span>
      <div className="a3s-form-design-custom-body">
        {Design ? (
          <Design node={props.node} schema={schema} required={required} />
        ) : (
          <div className="a3s-form-design-custom-fallback">
            <strong>{props.node.label ?? props.definition.catalog.label}</strong>
            <span>{props.definition.catalog.description}</span>
          </div>
        )}
      </div>
      {acceptsChildren && (
        <CanvasChildren {...props} container={props.node} ancestry={props.ancestry} />
      )}
      {props.selected && <NodeActions actionNode={props.node} {...props} />}
    </article>
  );
}

function CanvasNode(
  props: CanvasTreeProps & { nodeId: string; ancestry?: Set<string> },
): ReactNode {
  const node = props.document.ui.nodes.find((candidate) => candidate.id === props.nodeId);
  if (!node) return null;
  if (props.ancestry?.has(node.id)) {
    return <div className="a3s-form-canvas-unavailable">布局存在循环：{node.id}</div>;
  }
  const ancestry = new Set(props.ancestry ?? []);
  ancestry.add(node.id);
  const selected = props.selectedId === node.id;
  const style = {
    '--a3s-form-gap': `${node.gap ?? 24}px`,
    width: '100%',
  } as CSSProperties;

  const extension = node.widget ? props.nodeRegistry?.[node.widget] : undefined;
  if (extension) {
    return (
      <CustomCanvasNode
        {...props}
        node={node}
        definition={extension}
        selected={selected}
        ancestry={ancestry}
        style={style}
      />
    );
  }

  if (node.kind === 'section' || node.kind === 'group') {
    if (node.layout === 'wizard')
      return (
        <WizardDesignContainer {...props} node={node} selected={selected} ancestry={ancestry} />
      );
    if (node.layout === 'tabs')
      return <TabbedContainer {...props} node={node} selected={selected} ancestry={ancestry} />;
    if (node.layout === 'collapse')
      return <CollapseContainer {...props} node={node} selected={selected} ancestry={ancestry} />;
    return (
      <fieldset
        aria-label={node.label ?? node.id}
        className={`a3s-form-design-container fieldset is-${node.layout ?? 'flow'}${node.layout === 'card' ? ' card' : ''}${selected ? ' is-selected' : ''}`}
        data-node-id={node.id}
        data-node-kind={node.kind}
        data-node-type={node.layout ?? 'flow'}
        style={style}
        draggable
        onDragStart={(event) => beginNodeDrag(event, node.id)}
      >
        <ContainerHeading {...props} node={node} selected={selected} />
        {node.description && <p className="a3s-form-container-description">{node.description}</p>}
        <CanvasChildren {...props} container={node} ancestry={ancestry} />
      </fieldset>
    );
  }

  if (node.kind === 'repeater' && isDesignerContainer(props.document, node)) {
    if (node.layout === 'data-grid') {
      return (
        <DataGridDesignContainer
          {...props}
          node={node}
          selected={selected}
          ancestry={ancestry}
          style={style}
        />
      );
    }
    return (
      <fieldset
        aria-label={node.label ?? node.id}
        className={`a3s-form-design-container a3s-form-design-repeater-group fieldset${selected ? ' is-selected' : ''}`}
        data-node-id={node.id}
        data-node-kind={node.kind}
        data-node-type={node.layout ?? 'repeater-group'}
        style={style}
        draggable
        onDragStart={(event) => beginNodeDrag(event, node.id)}
      >
        <ContainerHeading {...props} node={node} selected={selected} />
        {node.description && <p className="a3s-form-container-description">{node.description}</p>}
        <p className="a3s-form-repeater-template-note">每一项使用以下字段</p>
        <CanvasChildren {...props} container={node} ancestry={ancestry} />
      </fieldset>
    );
  }

  if (node.kind === 'content') {
    return <ContentNode {...props} node={node} selected={selected} style={style} />;
  }

  const binding = schemaBindingForNode(props.document, node);
  const required = Boolean(binding?.parentSchema.required?.includes(binding.property));
  return (
    <article
      className={`a3s-form-design-field card${selected ? ' is-selected' : ''}`}
      data-node-id={node.id}
      data-node-kind={node.kind}
      data-node-type={node.widget ?? 'text'}
      style={style}
      draggable
      onDragStart={(event) => beginNodeDrag(event, node.id)}
    >
      <button
        type="button"
        className="a3s-form-node-select"
        aria-label={`选择${node.label ?? node.id}`}
        onClick={() => props.onSelect(node.id)}
      />
      <span className="a3s-form-node-handle" aria-hidden="true">
        <DesignerIcon name="grip" size={15} />
      </span>
      {node.kind === 'repeater' ? (
        <fieldset className="a3s-form-design-repeater-preview fieldset">
          <legend className={required ? 'is-required' : undefined}>{node.label ?? node.id}</legend>
          {node.description && <p>{node.description}</p>}
          <div className="a3s-form-mock-repeater">
            <div className="a3s-form-mock-repeater-row">
              <input
                type="text"
                className="input"
                aria-label={`${node.label ?? node.id}示例项`}
                value={nodeCustomString(node, 'itemPlaceholder', '列表项')}
                readOnly
                disabled
              />
              <span className="a3s-form-repeater-row-actions">
                <button
                  type="button"
                  className="btn"
                  data-size="icon-xs"
                  data-variant="ghost"
                  aria-label="上移示例项"
                  disabled
                >
                  <RepeaterIcon name="up" />
                </button>
                <button
                  type="button"
                  className="btn"
                  data-size="icon-xs"
                  data-variant="ghost"
                  aria-label="下移示例项"
                  disabled
                >
                  <RepeaterIcon name="down" />
                </button>
                <button
                  type="button"
                  className="btn"
                  data-size="icon-xs"
                  data-variant="ghost"
                  aria-label="移除示例项"
                  disabled
                >
                  <RepeaterIcon name="remove" />
                </button>
              </span>
            </div>
            <div className="a3s-form-repeater-footer">
              <button
                type="button"
                className="a3s-form-secondary btn"
                data-size="sm"
                data-variant="secondary"
                disabled
              >
                <RepeaterIcon name="add" />
                <span>{nodeCustomString(node, 'addLabel', '添加一项')}</span>
              </button>
            </div>
          </div>
        </fieldset>
      ) : (
        <DesignerFieldPreview document={props.document} node={node} required={required} />
      )}
      {selected && <NodeActions actionNode={node} {...props} />}
    </article>
  );
}

function DataGridDesignContainer(
  props: CanvasTreeProps & {
    node: UiNode;
    selected: boolean;
    ancestry: Set<string>;
    style: CSSProperties;
  },
) {
  const columns = (props.node.children ?? [])
    .map((id) => props.document.ui.nodes.find((node) => node.id === id))
    .filter((node): node is UiNode => Boolean(node));
  const gridStyle = {
    '--a3s-form-design-grid-columns': columns.length,
  } as CSSProperties;
  return (
    <fieldset
      aria-label={props.node.label ?? props.node.id}
      className={`a3s-form-design-container a3s-form-design-data-grid fieldset${props.selected ? ' is-selected' : ''}`}
      data-node-id={props.node.id}
      data-node-kind={props.node.kind}
      data-node-type="data-grid"
      style={props.style}
      draggable
      onDragStart={(event) => beginNodeDrag(event, props.node.id)}
    >
      <ContainerHeading {...props} node={props.node} selected={props.selected} />
      {props.node.description && (
        <p className="a3s-form-container-description">{props.node.description}</p>
      )}
      <p className="a3s-form-repeater-template-note">
        {props.node.dataGrid
          ? [
              props.node.dataGrid.editMode === 'dialog' ? '对话框草稿编辑' : '表内直接编辑',
              props.node.dataGrid.sorting === 'single' ? '单列排序' : '',
              props.node.dataGrid.filtering === 'search' ? '跨列筛选' : '',
              props.node.dataGrid.selection === 'multiple' ? '多行选择' : '',
              props.node.dataGrid.paste === 'append' ? '批量粘贴' : '',
              props.node.dataGrid.fill === 'down' ? '向下填充' : '',
              '窄屏按行展示',
            ]
              .filter(Boolean)
              .join(' · ')
          : '列标题来自字段名称，窄屏按行展示。'}
      </p>
      {columns.length > 0 ? (
        <div className="a3s-form-design-data-grid-scroll table-container">
          <table
            className="a3s-form-design-data-grid-table table"
            aria-label={`${props.node.label ?? props.node.id}设计预览`}
          >
            <thead>
              <tr className="a3s-form-design-data-grid-row is-header" style={gridStyle}>
                {columns.map((column) => (
                  <th scope="col" key={column.id}>
                    <button type="button" onClick={() => props.onSelect(column.id)}>
                      {column.label ?? column.id}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="a3s-form-design-data-grid-row is-preview" style={gridStyle}>
                {columns.map((column, index) => (
                  <td
                    className="a3s-form-canvas-item"
                    data-column-label={column.label ?? column.id}
                    key={column.id}
                  >
                    <CanvasDropSlot
                      {...props}
                      containerId={props.node.id}
                      index={index}
                      placement="before"
                    />
                    <CanvasNode {...props} nodeId={column.id} ancestry={props.ancestry} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <CanvasDropSlot
            {...props}
            containerId={props.node.id}
            index={columns.length}
            placement="end"
          />
        </div>
      ) : (
        <CanvasDropSlot {...props} containerId={props.node.id} index={0} placement="empty" />
      )}
    </fieldset>
  );
}

function WizardDesignContainer(
  props: CanvasTreeProps & {
    node: UiNode;
    selected: boolean;
    ancestry: Set<string>;
  },
) {
  const pages = (props.node.children ?? [])
    .map((id) => props.document.ui.nodes.find((node) => node.id === id))
    .filter((node): node is UiNode => Boolean(node));
  const activeId = pages.some((page) => page.id === props.activeTabs[props.node.id])
    ? props.activeTabs[props.node.id]
    : pages[0]?.id;
  const active = pages.find((page) => page.id === activeId);
  return (
    <fieldset
      aria-label={props.node.label ?? props.node.id}
      className={`a3s-form-design-container fieldset is-wizard${props.selected ? ' is-selected' : ''}`}
      style={{ width: '100%' }}
      data-node-id={props.node.id}
      data-node-kind={props.node.kind}
      data-node-type="wizard"
      draggable
      onDragStart={(event) => beginNodeDrag(event, props.node.id)}
    >
      <ContainerHeading {...props} node={props.node} selected={props.selected} />
      <nav className="a3s-form-design-wizard-progress" aria-label="向导步骤">
        {pages.map((page, index) => (
          <button
            type="button"
            id={`a3s-form-design-step-${page.id}`}
            aria-current={page.id === activeId ? 'step' : undefined}
            data-page-role={page.pageRole ?? 'form'}
            key={page.id}
            onKeyDown={(event) => {
              const next = adjacentTab(pages, page.id, event.key);
              if (!next) return;
              event.preventDefault();
              props.onActivateTab(props.node.id, next.id);
              props.onSelect(next.id);
              window.requestAnimationFrame(() =>
                window.document.getElementById(`a3s-form-design-step-${next.id}`)?.focus(),
              );
            }}
            onClick={() => {
              props.onActivateTab(props.node.id, page.id);
              props.onSelect(page.id);
            }}
          >
            <span aria-hidden="true">{index + 1}</span>
            <strong>{page.label ?? `步骤 ${index + 1}`}</strong>
            <small>{page.pageRole === 'review' ? '确认' : '填写'}</small>
          </button>
        ))}
      </nav>
      {active ? (
        <section
          className={`a3s-form-design-wizard-panel${props.selectedId === active.id ? ' is-selected' : ''}`}
          data-node-id={active.id}
          aria-labelledby={`a3s-form-design-step-${active.id}`}
        >
          <div className="a3s-form-design-panel-heading">
            <button type="button" onClick={() => props.onSelect(active.id)}>
              {active.pageRole === 'review' ? '确认页内容' : '步骤内容'}
            </button>
            {props.selectedId === active.id && <NodeActions actionNode={active} {...props} />}
          </div>
          <CanvasChildren {...props} container={active} ancestry={props.ancestry} />
        </section>
      ) : (
        <CanvasDropSlot {...props} containerId={props.node.id} index={0} placement="empty" />
      )}
    </fieldset>
  );
}

function TabbedContainer(
  props: CanvasTreeProps & {
    node: UiNode;
    selected: boolean;
    ancestry: Set<string>;
  },
) {
  const tabs = (props.node.children ?? [])
    .map((id) => props.document.ui.nodes.find((node) => node.id === id))
    .filter((node): node is UiNode => Boolean(node));
  const activeId = tabs.some((tab) => tab.id === props.activeTabs[props.node.id])
    ? props.activeTabs[props.node.id]
    : tabs[0]?.id;
  const active = tabs.find((tab) => tab.id === activeId);
  return (
    <fieldset
      aria-label={props.node.label ?? props.node.id}
      className={`a3s-form-design-container fieldset tabs is-tabs${props.selected ? ' is-selected' : ''}`}
      style={{ width: '100%' }}
      data-node-id={props.node.id}
      data-node-kind={props.node.kind}
      data-node-type="tabs"
      draggable
      onDragStart={(event) => beginNodeDrag(event, props.node.id)}
    >
      <ContainerHeading {...props} node={props.node} selected={props.selected} />
      <div
        className="a3s-form-design-tablist"
        role="tablist"
        aria-label={props.node.label}
        aria-orientation="horizontal"
      >
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            id={`a3s-form-design-tab-${tab.id}`}
            aria-selected={tab.id === activeId}
            aria-controls={`a3s-form-design-panel-${props.node.id}`}
            tabIndex={tab.id === activeId ? 0 : -1}
            className={tab.id === activeId ? 'is-active' : ''}
            key={tab.id}
            onKeyDown={(event) => {
              const next = adjacentTab(tabs, tab.id, event.key);
              if (!next) return;
              event.preventDefault();
              props.onActivateTab(props.node.id, next.id);
              props.onSelect(next.id);
              window.requestAnimationFrame(() =>
                window.document.getElementById(`a3s-form-design-tab-${next.id}`)?.focus(),
              );
            }}
            onClick={() => {
              props.onActivateTab(props.node.id, tab.id);
              props.onSelect(tab.id);
            }}
          >
            {tab.label ?? '未命名标签'}
          </button>
        ))}
      </div>
      {active ? (
        <CanvasPanel
          {...props}
          node={active}
          ancestry={props.ancestry}
          label="标签页内容"
          panelId={`a3s-form-design-panel-${props.node.id}`}
          labelledBy={`a3s-form-design-tab-${active.id}`}
        />
      ) : (
        <CanvasDropSlot {...props} containerId={props.node.id} index={0} placement="empty" />
      )}
    </fieldset>
  );
}

function CollapseContainer(
  props: CanvasTreeProps & {
    node: UiNode;
    selected: boolean;
    ancestry: Set<string>;
  },
) {
  const panels = (props.node.children ?? [])
    .map((id) => props.document.ui.nodes.find((node) => node.id === id))
    .filter((node): node is UiNode => Boolean(node));
  return (
    <fieldset
      aria-label={props.node.label ?? props.node.id}
      className={`a3s-form-design-container fieldset is-collapse${props.selected ? ' is-selected' : ''}`}
      style={{ width: '100%' }}
      data-node-id={props.node.id}
      data-node-kind={props.node.kind}
      data-node-type="collapse"
      draggable
      onDragStart={(event) => beginNodeDrag(event, props.node.id)}
    >
      <ContainerHeading {...props} node={props.node} selected={props.selected} />
      <div className="a3s-form-design-collapse-list accordion">
        {panels.map((panel) => (
          <details open data-node-id={panel.id} key={panel.id}>
            <summary>
              <span>{panel.label ?? '未命名面板'}</span>
              <DesignerIcon name="chevron-down" size={15} />
            </summary>
            <button
              type="button"
              className="a3s-form-design-collapse-select"
              aria-label={panel.label ?? '未命名面板'}
              onClick={() => props.onSelect(panel.id)}
            />
            {props.selectedId === panel.id && (
              <div className="a3s-form-design-collapse-actions">
                <NodeActions actionNode={panel} {...props} />
              </div>
            )}
            <CanvasChildren {...props} container={panel} ancestry={props.ancestry} />
          </details>
        ))}
        {panels.length === 0 && (
          <CanvasDropSlot {...props} containerId={props.node.id} index={0} placement="empty" />
        )}
      </div>
    </fieldset>
  );
}

function CanvasPanel(
  props: CanvasTreeProps & {
    node: UiNode;
    ancestry: Set<string>;
    label: string;
    panelId: string;
    labelledBy: string;
  },
) {
  const selected = props.selectedId === props.node.id;
  return (
    <div
      className={`a3s-form-design-panel${selected ? ' is-selected' : ''}`}
      data-node-id={props.node.id}
      id={props.panelId}
      role="tabpanel"
      aria-labelledby={props.labelledBy}
    >
      <div className="a3s-form-design-panel-heading">
        <button type="button" onClick={() => props.onSelect(props.node.id)}>
          {props.label}
        </button>
        {selected && <NodeActions actionNode={props.node} {...props} />}
      </div>
      <CanvasChildren {...props} container={props.node} ancestry={props.ancestry} />
    </div>
  );
}

function ContainerHeading(props: CanvasTreeProps & { node: UiNode; selected: boolean }) {
  const fallback = props.node.kind === 'section' ? '未命名分组' : '布局容器';
  return (
    <header className="a3s-form-design-container-heading">
      <button type="button" onClick={() => props.onSelect(props.node.id)}>
        <span className="a3s-form-node-handle" aria-hidden="true">
          <DesignerIcon name="grip" size={15} />
        </span>
        <span>{props.node.label ?? fallback}</span>
      </button>
      {props.selected && <NodeActions actionNode={props.node} {...props} />}
    </header>
  );
}

function ContentNode(
  props: CanvasTreeProps & {
    node: UiNode;
    selected: boolean;
    style: CSSProperties;
  },
) {
  const className = `a3s-form-design-content is-${props.node.presentation ?? 'text'}${props.selected ? ' is-selected' : ''}`;
  return (
    <article
      className={className}
      data-node-id={props.node.id}
      data-node-kind={props.node.kind}
      data-node-type={props.node.presentation ?? 'text'}
      style={props.style}
      draggable
      onDragStart={(event) => beginNodeDrag(event, props.node.id)}
    >
      <button
        type="button"
        className="a3s-form-node-select"
        aria-label={`选择${props.node.label ?? props.node.id}`}
        onClick={() => props.onSelect(props.node.id)}
      />
      {props.node.presentation === 'divider' ? (
        <div className="a3s-form-mock-divider field-separator">
          <hr />
          {props.node.content && <span>{props.node.content}</span>}
        </div>
      ) : props.node.presentation === 'spacer' ? (
        <div className="a3s-form-mock-spacer">间距 {props.node.gap ?? 24}px</div>
      ) : (
        <>
          <span className="a3s-form-content-icon" aria-hidden="true">
            <DesignerIcon name="info" size={15} />
          </span>
          <p>{props.node.content ?? '在属性面板中编辑说明文字。'}</p>
        </>
      )}
      {props.selected && <NodeActions actionNode={props.node} {...props} />}
    </article>
  );
}

function DesignerFieldPreview({
  document,
  node,
  required,
}: {
  document: FormDocument;
  node: UiNode;
  required: boolean;
}) {
  const schema = schemaForNode(document, node);
  const widget = node.widget ?? 'text';
  const booleanField = BOOLEAN_FIELD_WIDGETS.has(widget);
  const compositeField = COMPOSITE_FIELD_WIDGETS.has(widget);
  const inputId = `a3s-form-design-preview-${node.id}`;
  const labelId = `${inputId}-label`;
  const helpId = node.description ? `${inputId}-help` : undefined;
  const locale = document.metadata.locale ?? 'zh-CN';
  const messages = resolveFormLocaleCatalog(locale).messages;
  const previewDisabled = Boolean(
    node.readOnly ||
      document.rules?.some((rule) => rule.kind === 'computed' && rule.target === node.id),
  );

  if (widget === 'hidden') {
    return (
      <div className="a3s-form-design-hidden a3s-form-field field">
        <span className="label">{node.label ?? node.id}</span>
        <input
          id={inputId}
          type="hidden"
          value={String(designerWidgetValue(node, schema))}
          readOnly
        />
        <p>不在填写页显示，值会随表单提交。</p>
      </div>
    );
  }

  return (
    <div
      className={`a3s-form-design-widget a3s-form-field field${booleanField ? ' is-boolean' : ''}`}
      data-orientation={booleanField ? 'horizontal' : undefined}
      data-disabled={previewDisabled || undefined}
      data-preview-state={previewDisabled ? 'readonly' : 'sample'}
      inert
    >
      {!booleanField &&
        (compositeField ? (
          <div
            id={labelId}
            className={`a3s-form-field-label label${required ? ' is-required' : ''}`}
          >
            {node.label ?? node.id}
          </div>
        ) : (
          <label id={labelId} htmlFor={inputId} className={required ? 'is-required' : undefined}>
            {node.label ?? node.id}
          </label>
        ))}
      {!booleanField && node.description && <p id={helpId}>{node.description}</p>}
      <NativeWidget
        id={inputId}
        labelledBy={compositeField ? labelId : undefined}
        node={node}
        schema={schema}
        value={designerWidgetValue(node, schema)}
        disabled={previewDisabled}
        invalid={false}
        required={required}
        describedBy={helpId}
        options={node.options ?? []}
        dataSource={{ ...DESIGN_DATA_SOURCE, options: node.options ?? [] }}
        messages={messages}
        locale={locale}
        onChange={() => undefined}
      />
    </div>
  );
}

function NodeActions(props: CanvasTreeProps & { actionNode: UiNode }) {
  return (
    <div className="a3s-form-node-actions">
      <button
        type="button"
        className="btn"
        data-size="icon-xs"
        data-variant="ghost"
        aria-label="上移节点"
        title="上移"
        onClick={(event) => {
          event.stopPropagation();
          props.onMove(-1);
        }}
      >
        <DesignerIcon name="arrow-up" size={14} />
      </button>
      <button
        type="button"
        className="btn"
        data-size="icon-xs"
        data-variant="ghost"
        aria-label="下移节点"
        title="下移"
        onClick={(event) => {
          event.stopPropagation();
          props.onMove(1);
        }}
      >
        <DesignerIcon name="arrow-down" size={14} />
      </button>
      <button
        type="button"
        className="btn"
        data-size="icon-xs"
        data-variant="ghost"
        aria-label="复制节点"
        title="复制"
        onClick={(event) => {
          event.stopPropagation();
          props.onDuplicate();
        }}
      >
        <DesignerIcon name="copy" size={14} />
      </button>
      <button
        type="button"
        className="btn"
        data-size="icon-xs"
        data-variant="destructive"
        aria-label="删除节点"
        title="删除"
        onClick={(event) => {
          event.stopPropagation();
          props.onRemove();
        }}
      >
        <DesignerIcon name="trash" size={14} />
      </button>
    </div>
  );
}

function CanvasDropSlot(
  props: CanvasTreeProps & {
    containerId: string;
    index: number;
    placement: 'before' | 'end' | 'empty';
  },
) {
  const [active, setActive] = useState(false);
  return (
    <button
      type="button"
      tabIndex={-1}
      className={`a3s-form-canvas-drop is-${props.placement}${active ? ' is-active' : ''}`}
      aria-label={`插入到${props.containerId}第${props.index + 1}位`}
      onDragEnter={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        setActive(false);
        handleDrop(event, { containerId: props.containerId, index: props.index }, props);
      }}
    >
      {props.placement === 'empty' ? (
        <span>
          <i aria-hidden="true">
            <DesignerIcon name="components" size={18} />
          </i>
          <strong>添加第一个组件</strong>
          <small>从左侧拖入字段或布局组件。</small>
          <em>组件点击会加到表单末尾</em>
        </span>
      ) : (
        <i />
      )}
    </button>
  );
}

function beginNodeDrag(event: DragEvent, nodeId: string) {
  event.stopPropagation();
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(nodeDragType, nodeId);
}

function handleDrop(event: DragEvent, target: CanvasDropTarget, props: DesignerCanvasProps) {
  event.preventDefault();
  event.stopPropagation();
  const catalogId = event.dataTransfer.getData(catalogDragType);
  if (catalogId) {
    props.onCatalogDrop(catalogId, target);
    return;
  }
  const nodeId = event.dataTransfer.getData(nodeDragType);
  if (nodeId) props.onNodeDrop(nodeId, target);
}

function adjacentTab(tabs: readonly UiNode[], currentId: string, key: string): UiNode | undefined {
  const current = tabs.findIndex((tab) => tab.id === currentId);
  if (current < 0) return undefined;
  if (key === 'Home') return tabs[0];
  if (key === 'End') return tabs.at(-1);
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return undefined;
  const offset = key === 'ArrowRight' ? 1 : -1;
  return tabs[(current + offset + tabs.length) % tabs.length];
}

function nodeCustomString(node: UiNode, key: string, fallback: string): string {
  const value = node.customProps?.[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}
