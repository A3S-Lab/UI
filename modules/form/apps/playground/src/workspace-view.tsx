import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { A3SFlowDagNodeManifest } from '../../../src/a3s-flow';
import { ProductIcon } from './icons';
import { countFormFields, type PlaygroundFormRecord } from './workspace';

export type WorkspaceTemplateId = 'blank' | 'onboarding';

type WorkspaceCollection = 'all' | 'workflow';

export interface WorkspaceViewProps {
  active?: boolean;
  forms: readonly PlaygroundFormRecord[];
  workflowNodes: readonly A3SFlowDagNodeManifest[];
  storageAvailable: boolean;
  onOpen: (formId: string) => void;
  onOpenWorkflowNode: (type: string) => void;
  onCreate: (title: string, description: string, template: WorkspaceTemplateId) => void;
  onImport: (file: File) => void | Promise<void>;
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function getPreviewFields(record: PlaygroundFormRecord): readonly string[] {
  return record.document.ui.nodes
    .filter((node) => node.kind === 'field' || node.kind === 'repeater')
    .slice(0, 3)
    .map((node) => node.label ?? node.schemaPath ?? '未命名字段');
}

export function WorkspaceView(props: WorkspaceViewProps) {
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState<WorkspaceCollection>('all');
  const [nodeCategory, setNodeCategory] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 840);
  const [creating, setCreating] = useState(false);
  const [template, setTemplate] = useState<WorkspaceTemplateId>('blank');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const workflowCount = props.workflowNodes.length;
  const fieldCount = props.forms.reduce(
    (total, record) => total + countFormFields(record.document),
    0,
  );
  const sortedForms = useMemo(
    () => [...props.forms].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [props.forms],
  );
  const visibleForms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    return sortedForms.filter((record) => {
      if (!normalized) return true;
      return `${record.document.metadata.title} ${record.document.metadata.description ?? ''}`
        .toLocaleLowerCase('zh-CN')
        .includes(normalized);
    });
  }, [query, sortedForms]);
  const nodeCategories = useMemo(
    () =>
      [
        ...new Map(
          props.workflowNodes.map((node) => [node.category, node.categoryLabel]),
        ).entries(),
      ].map(([id, label]) => ({
        id,
        label,
        count: props.workflowNodes.filter((node) => node.category === id).length,
      })),
    [props.workflowNodes],
  );
  const visibleWorkflowNodes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('en');
    return props.workflowNodes.filter((node) => {
      if (nodeCategory !== 'all' && node.category !== nodeCategory) return false;
      if (!normalized) return true;
      return `${node.display_name} ${node.description} ${node.type} ${node.categoryLabel}`
        .toLocaleLowerCase('en')
        .includes(normalized);
    });
  }, [nodeCategory, props.workflowNodes, query]);

  const closeCreate = useCallback(() => {
    setCreating(false);
    window.requestAnimationFrame(() => lastFocusedRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!creating) return;
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCreate();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && window.document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && window.document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleDialogKeys);
    const focusFrame = window.requestAnimationFrame(() => titleInputRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleDialogKeys);
    };
  }, [closeCreate, creating]);

  useEffect(() => {
    const closeSidebarOnCompactViewport = () => {
      if (window.innerWidth < 840) setSidebarOpen(false);
    };

    closeSidebarOnCompactViewport();
    window.addEventListener('resize', closeSidebarOnCompactViewport);
    return () => window.removeEventListener('resize', closeSidebarOnCompactViewport);
  }, []);

  const chooseTemplate = (nextTemplate: WorkspaceTemplateId) => {
    setTemplate(nextTemplate);
    if (nextTemplate === 'onboarding') {
      setTitle('新员工入职申请');
      setDescription('收集入职资料并提交给人力资源团队审核。');
    } else {
      setTitle('');
      setDescription('');
    }
  };

  const openCreate = (nextTemplate: WorkspaceTemplateId = 'blank') => {
    lastFocusedRef.current =
      window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
    chooseTemplate(nextTemplate);
    setCreating(true);
  };

  const create = () => {
    if (!title.trim()) return;
    props.onCreate(title.trim(), description.trim(), template);
    setCreating(false);
    setTitle('');
    setDescription('');
    setTemplate('blank');
  };

  const showCollection = (nextCollection: WorkspaceCollection) => {
    setCollection(nextCollection);
    setQuery('');
    setNodeCategory('all');
    if (window.innerWidth < 840) setSidebarOpen(false);
  };

  const clearFilters = () => {
    setQuery('');
    setNodeCategory('all');
  };

  const collectionTitle = collection === 'workflow' ? 'DAG 节点目录' : '最近表单';

  return (
    <main
      className={`playground-workspace app-shell ${sidebarOpen ? 'sidebar-visible' : ''}`}
      hidden={props.active === false}
      inert={props.active === false}
      data-navigation={sidebarOpen ? 'expanded' : 'hidden'}
      data-mobile-navigation={sidebarOpen ? 'open' : 'closed'}
    >
      {sidebarOpen && (
        <aside
          className="playground-workspace-sidebar"
          aria-label="A3S UI Form Playground 导航"
          data-app-navigation
          inert={creating}
        >
          <header className="playground-sidebar-product-header">
            <strong>表单</strong>
            <button
              type="button"
              className="playground-icon-button btn"
              data-size="icon-sm"
              data-variant="ghost"
              aria-label="收起表单侧边栏"
              title="收起侧边栏"
              onClick={() => setSidebarOpen(false)}
            >
              <ProductIcon name="panel-left-close" size={16} />
            </button>
          </header>

          <section className="playground-workspace-card" aria-label="当前工作区">
            <span className="playground-sidebar-label">工作区</span>
            <div>
              <span className="playground-workspace-card-icon">
                <ProductIcon name="database" size={17} />
              </span>
              <span>
                <strong>在线 Playground</strong>
                <small>
                  {props.forms.length} 份表单 · {fieldCount} 个字段
                </small>
              </span>
            </div>
          </section>

          <nav className="playground-sidebar-nav" aria-label="A3S UI Form Playground 页面">
            <span className="playground-sidebar-label">产品</span>
            <button
              type="button"
              className={`btn${collection === 'all' ? ' is-active' : ''}`}
              data-variant="ghost"
              aria-current={collection === 'all' ? 'page' : undefined}
              onClick={() => showCollection('all')}
            >
              <ProductIcon name="folder" size={16} />
              <span className="playground-sidebar-item-label">我的表单</span>
              <em>{props.forms.length}</em>
            </button>
            <button
              type="button"
              className={`btn${collection === 'workflow' ? ' is-active' : ''}`}
              data-variant="ghost"
              aria-current={collection === 'workflow' ? 'page' : undefined}
              onClick={() => showCollection('workflow')}
            >
              <ProductIcon name="template" size={16} />
              <span className="playground-sidebar-item-label">Flow DAG 节点</span>
              <em>{workflowCount}</em>
            </button>
            <a
              href="https://a3s-lab.github.io/UI/components/form-system/"
              target="_blank"
              rel="noreferrer"
            >
              <ProductIcon name="book" size={16} />
              <span className="playground-sidebar-item-label">组件文档</span>
              <ProductIcon name="arrow-right" size={12} />
            </a>
          </nav>

          <section className="playground-sidebar-create" aria-label="快速新建">
            <span className="playground-sidebar-label">快速新建</span>
            <button
              type="button"
              className="btn"
              data-variant="ghost"
              onClick={() => openCreate('blank')}
            >
              <span className="playground-quick-create-icon">
                <ProductIcon name="file" size={15} />
              </span>
              <span className="playground-sidebar-item-label">空白表单</span>
            </button>
            <button
              type="button"
              className="btn"
              data-variant="ghost"
              onClick={() => openCreate('onboarding')}
            >
              <span className="playground-quick-create-icon template">
                <ProductIcon name="form" size={15} />
              </span>
              <span className="playground-sidebar-item-label">入职申请</span>
            </button>
          </section>

          <div className="playground-sidebar-footer">
            <section className="playground-sidebar-storage" aria-label="存储状态">
              <span className={props.storageAvailable ? 'is-ready' : 'is-warning'} />
              <div>
                <strong>{props.storageAvailable ? '本地自动保存' : '临时会话'}</strong>
                <small>
                  {props.storageAvailable ? '数据仅保存在此浏览器' : '关闭页面后数据可能丢失'}
                </small>
              </div>
            </section>
          </div>
        </aside>
      )}

      {sidebarOpen && (
        <button
          type="button"
          className="playground-sidebar-scrim"
          aria-label="关闭表单侧边栏"
          inert={creating}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <section className="playground-workspace-main" data-app-main inert={creating}>
        <div className="playground-workspace-content" data-app-content>
          <header className="playground-home-header">
            <div className="playground-home-title">
              {!sidebarOpen && (
                <button
                  type="button"
                  className="playground-icon-button playground-sidebar-open btn"
                  data-size="icon-sm"
                  data-variant="ghost"
                  aria-label="展开表单侧边栏"
                  title="展开侧边栏"
                  onClick={() => setSidebarOpen(true)}
                >
                  <ProductIcon name="panel-left-open" size={17} />
                </button>
              )}
              <div>
                <h1>{collection === 'workflow' ? 'A3S Flow DAG 节点' : '我的表单'}</h1>
                <p>
                  {collection === 'workflow'
                    ? '由宿主 manifest 定义属性，覆盖 Flow 1.0 DAG 结构与全部运行时命令。'
                    : '设计、校验和预览，都在当前浏览器里完成。'}
                </p>
              </div>
            </div>
            <div className="playground-home-actions">
              <label className="playground-search input-group">
                <ProductIcon name="search" size={15} />
                <span className="sr-only">
                  {collection === 'workflow' ? '搜索节点' : '搜索表单'}
                </span>
                <input
                  className="input"
                  value={query}
                  placeholder={collection === 'workflow' ? '搜索节点或类型' : '搜索表单'}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="btn"
                    data-size="icon-xs"
                    data-variant="ghost"
                    aria-label="清空搜索"
                    onClick={() => setQuery('')}
                  >
                    <ProductIcon name="close" size={13} />
                  </button>
                )}
              </label>
              {collection === 'all' && (
                <button
                  type="button"
                  className="playground-primary btn"
                  data-variant="primary"
                  onClick={() => openCreate()}
                >
                  <ProductIcon name="plus" size={15} />
                  新建表单
                </button>
              )}
            </div>
          </header>

          {collection === 'all' && (
            <section className="playground-template-section" aria-labelledby="create-title">
              <div className="playground-section-heading">
                <div>
                  <h2 id="create-title">新建</h2>
                  <span>选择一个起点</span>
                </div>
              </div>
              <div className="playground-template-grid">
                <TemplateCard
                  icon="file"
                  title="空白表单"
                  description="从空白画布开始"
                  onClick={() => openCreate('blank')}
                />
                <TemplateCard
                  icon="form"
                  title="入职申请模板"
                  description="包含字段与显隐规则"
                  onClick={() => openCreate('onboarding')}
                />
                <TemplateCard
                  icon="upload"
                  title="导入表单 JSON"
                  description="校验后加入当前工作区"
                  onClick={() => importInputRef.current?.click()}
                />
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                hidden
                aria-label="导入表单 JSON"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void props.onImport(file);
                  event.target.value = '';
                }}
              />
            </section>
          )}

          <section className="playground-recent-section" aria-labelledby="recent-title">
            <div className="playground-section-heading">
              <div>
                <h2 id="recent-title">{collectionTitle}</h2>
                <span>
                  {collection === 'workflow'
                    ? `${visibleWorkflowNodes.length} / ${workflowCount} 个节点`
                    : `${visibleForms.length} 份表单`}
                </span>
              </div>
              {(query || nodeCategory !== 'all') && (
                <button
                  type="button"
                  className="playground-text-button btn"
                  data-variant="link"
                  onClick={clearFilters}
                >
                  清除筛选
                  <ProductIcon name="arrow-right" size={13} />
                </button>
              )}
            </div>

            {collection === 'workflow' && (
              <nav className="playground-node-category-filter" aria-label="节点分类">
                <button
                  type="button"
                  className={`btn${nodeCategory === 'all' ? ' is-active' : ''}`}
                  data-size="sm"
                  data-variant={nodeCategory === 'all' ? 'secondary' : 'ghost'}
                  aria-pressed={nodeCategory === 'all'}
                  onClick={() => setNodeCategory('all')}
                >
                  全部
                  <span>{workflowCount}</span>
                </button>
                {nodeCategories.map((category) => (
                  <button
                    type="button"
                    className={`btn${nodeCategory === category.id ? ' is-active' : ''}`}
                    data-size="sm"
                    data-variant={nodeCategory === category.id ? 'secondary' : 'ghost'}
                    aria-pressed={nodeCategory === category.id}
                    key={category.id}
                    onClick={() => setNodeCategory(category.id)}
                  >
                    {category.label}
                    <span>{category.count}</span>
                  </button>
                ))}
              </nav>
            )}

            {!props.storageAvailable && (
              <div className="playground-storage-warning alert" role="alert">
                <ProductIcon name="database" size={16} />
                浏览器拒绝了本地存储访问，本次修改只能保留到页面关闭前。
              </div>
            )}

            {collection === 'workflow' && visibleWorkflowNodes.length > 0 ? (
              <WorkflowNodeCatalog nodes={visibleWorkflowNodes} onOpen={props.onOpenWorkflowNode} />
            ) : collection === 'all' && visibleForms.length > 0 ? (
              <div className="playground-form-grid">
                {visibleForms.map((record) => (
                  <FormCard
                    key={record.id}
                    record={record}
                    onOpen={() => props.onOpen(record.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="playground-search-empty empty">
                <span>
                  <ProductIcon name="search" size={21} />
                </span>
                <strong>
                  {query
                    ? `没有找到“${query}”`
                    : collection === 'workflow'
                      ? '这个分类没有节点'
                      : '暂时没有表单'}
                </strong>
                <p>{query ? '换一个关键词试试。' : '清除分类筛选后再查看。'}</p>
                <button
                  type="button"
                  className="playground-secondary btn"
                  data-variant="secondary"
                  onClick={clearFilters}
                >
                  清除筛选
                </button>
              </div>
            )}
          </section>
        </div>
      </section>

      {creating && (
        <div className="playground-dialog-backdrop" role="presentation">
          <button
            type="button"
            className="playground-dialog-dismiss"
            aria-label="点击遮罩关闭新建表单"
            onClick={closeCreate}
          />
          <section
            ref={dialogRef}
            className="playground-dialog card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-form-title"
            aria-describedby="create-form-description"
          >
            <header>
              <div>
                <span className="playground-dialog-icon" aria-hidden="true">
                  <ProductIcon name="form" size={19} />
                </span>
                <span>
                  <strong id="create-form-title">创建表单</strong>
                  <small id="create-form-description">选择起点，命名后进入设计器</small>
                </span>
              </div>
              <button
                type="button"
                className="btn"
                data-size="icon-sm"
                data-variant="ghost"
                aria-label="关闭新建表单"
                onClick={closeCreate}
              >
                <ProductIcon name="close" size={17} />
              </button>
            </header>
            <div className="playground-dialog-body">
              <fieldset className="playground-template-picker">
                <legend>选择起点</legend>
                <div className="playground-template-options">
                  <button
                    type="button"
                    className={`btn${template === 'blank' ? ' is-selected' : ''}`}
                    data-variant="outline"
                    aria-pressed={template === 'blank'}
                    onClick={() => chooseTemplate('blank')}
                  >
                    <ProductIcon name="file" size={18} />
                    <span>
                      <strong>空白表单</strong>
                      <small>从零开始搭建</small>
                    </span>
                    <i>
                      <ProductIcon name="check" size={12} />
                    </i>
                  </button>
                  <button
                    type="button"
                    className={`btn${template === 'onboarding' ? ' is-selected' : ''}`}
                    data-variant="outline"
                    aria-pressed={template === 'onboarding'}
                    onClick={() => chooseTemplate('onboarding')}
                  >
                    <ProductIcon name="form" size={18} />
                    <span>
                      <strong>入职审批</strong>
                      <small>字段与显隐规则</small>
                    </span>
                    <i>
                      <ProductIcon name="check" size={12} />
                    </i>
                  </button>
                </div>
              </fieldset>
              <div className="playground-dialog-fields">
                <label className="field">
                  <span>
                    表单名称 <em>*</em>
                  </span>
                  <input
                    className="input"
                    ref={titleInputRef}
                    aria-label="新表单名称"
                    placeholder="例如：客户满意度调查"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') create();
                    }}
                  />
                </label>
                <label className="field">
                  <span>
                    表单说明 <small>选填</small>
                  </span>
                  <textarea
                    className="textarea"
                    aria-label="新表单说明"
                    placeholder="说明这个表单用于收集什么信息"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
              </div>
              <p className="playground-dialog-note">
                <ProductIcon name="database" size={14} />
                创建后自动保存在当前浏览器，不会上传任何数据。
              </p>
            </div>
            <footer>
              <button
                type="button"
                className="playground-secondary btn"
                data-variant="secondary"
                onClick={closeCreate}
              >
                取消
              </button>
              <button
                type="button"
                className="playground-primary btn"
                data-variant="primary"
                disabled={!title.trim()}
                onClick={create}
              >
                创建并开始设计
                <ProductIcon name="arrow-right" size={15} />
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

function TemplateCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: 'file' | 'form' | 'upload';
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="playground-template-card card" onClick={onClick}>
      <span className="playground-template-preview" aria-hidden="true">
        <span className="playground-template-sheet">
          <ProductIcon name={icon} size={22} />
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className="playground-template-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

function FormCard({ record, onOpen }: { record: PlaygroundFormRecord; onOpen: () => void }) {
  const previewFields = getPreviewFields(record);
  const recordFieldCount = countFormFields(record.document);

  return (
    <button
      type="button"
      className="playground-form-card card"
      aria-label={`打开${record.document.metadata.title}`}
      onClick={onOpen}
    >
      <span className="playground-form-preview" aria-hidden="true">
        <span className="playground-form-sheet">
          <strong>{record.document.metadata.title}</strong>
          <span>
            {previewFields.length > 0 ? (
              previewFields.map((field) => (
                <i key={field}>
                  <em>{field}</em>
                  <span />
                </i>
              ))
            ) : (
              <i className="is-empty">
                <em>空白表单</em>
                <span />
              </i>
            )}
          </span>
        </span>
      </span>
      <span className="playground-form-copy">
        <strong>{record.document.metadata.title}</strong>
        <small>{record.document.metadata.description || '尚未填写表单说明'}</small>
        <span>
          {recordFieldCount} 个字段 · v{record.document.revision} ·{' '}
          <time dateTime={record.updatedAt}>{formatUpdatedAt(record.updatedAt)}</time>
        </span>
      </span>
      <span className="playground-form-kind">
        <ProductIcon name="form" size={14} />
      </span>
    </button>
  );
}

function uniqueNodeTypes(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function nodeCategoryIcon(category: string): 'clock' | 'layers' | 'template' {
  if (category === 'control-flow') return 'template';
  if (category === 'suspension') return 'clock';
  return 'layers';
}

function WorkflowNodeCatalog({
  nodes,
  onOpen,
}: {
  nodes: readonly A3SFlowDagNodeManifest[];
  onOpen: (type: string) => void;
}) {
  const groups = useMemo(() => {
    const grouped = new Map<
      string,
      { id: string; label: string; nodes: A3SFlowDagNodeManifest[] }
    >();
    for (const node of nodes) {
      const group = grouped.get(node.category) ?? {
        id: node.category,
        label: node.categoryLabel,
        nodes: [],
      };
      group.nodes.push(node);
      grouped.set(node.category, group);
    }
    return [...grouped.values()];
  }, [nodes]);

  return (
    <div className="playground-node-catalog">
      {groups.map((group) => (
        <section
          className="playground-node-category"
          aria-labelledby={`node-category-${group.id}`}
          key={group.id}
        >
          <header>
            <span aria-hidden="true">
              <ProductIcon name={nodeCategoryIcon(group.id)} size={15} />
            </span>
            <h3 id={`node-category-${group.id}`}>{group.label}</h3>
            <small>{group.nodes.length}</small>
          </header>
          <div className="playground-node-grid">
            {group.nodes.map((node) => (
              <WorkflowNodeCard node={node} key={node.type} onOpen={() => onOpen(node.type)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function WorkflowNodeCard({ node, onOpen }: { node: A3SFlowDagNodeManifest; onOpen: () => void }) {
  const advancedCount = node.fields.filter((field) => field.advanced).length;
  const inputTypes = uniqueNodeTypes(node.ports.inputs.flatMap((port) => port.types));
  const outputTypes = uniqueNodeTypes(node.ports.outputs.flatMap((port) => port.types));
  const badge =
    node.role === 'runtime-command'
      ? 'Runtime'
      : node.role === 'container'
        ? 'Container'
        : node.role === 'entry'
          ? 'Entry'
          : node.role === 'control'
            ? 'Control'
            : 'Host';

  return (
    <button
      type="button"
      className="playground-node-card card"
      data-node-type={node.type}
      data-runtime-binding={node.runtimeBinding}
      aria-label={`Open ${node.display_name} configuration from ${node.categoryLabel}`}
      onClick={onOpen}
    >
      <span className="playground-node-card-heading">
        <span className="playground-node-card-icon" aria-hidden="true">
          <ProductIcon name={nodeCategoryIcon(node.category)} size={17} />
        </span>
        <span>
          <strong>{node.display_name}</strong>
          <code>{node.type}</code>
        </span>
        <span className="playground-node-card-status">
          <em className="badge" data-variant="outline">
            {badge}
          </em>
        </span>
      </span>
      <span className="playground-node-card-description">{node.description}</span>
      <span className="playground-node-card-metrics">
        <span>{node.fields.length} settings</span>
        {advancedCount > 0 && <span>{advancedCount} advanced</span>}
        <span>{node.owner} manifest</span>
        {node.runtimeBinding && (
          <span>
            <code>{node.runtimeBinding}</code>
          </span>
        )}
      </span>
      <span className="playground-node-card-contract">
        <span>
          <small>IN</small>
          <code>{inputTypes.length > 0 ? inputTypes.slice(0, 2).join(' · ') : 'None'}</code>
          {inputTypes.length > 2 && <em>+{inputTypes.length - 2}</em>}
        </span>
        <span>
          <small>OUT</small>
          <code>{outputTypes.length > 0 ? outputTypes.slice(0, 2).join(' · ') : 'None'}</code>
          {outputTypes.length > 2 && <em>+{outputTypes.length - 2}</em>}
        </span>
      </span>
      <span className="playground-node-card-action" aria-hidden="true">
        Configure
        <ProductIcon name="arrow-right" size={13} />
      </span>
    </button>
  );
}
