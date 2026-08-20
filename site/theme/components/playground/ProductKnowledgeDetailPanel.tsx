import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  productKnowledgeItemCount,
  type ProductKnowledgeBase,
  type ProductKnowledgeSource,
  type ProductKnowledgeSourceKind,
} from "./product-knowledge-library-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type KnowledgeDetailTab = "overview" | "settings" | "sources";
const knowledgeDetailTabs: readonly KnowledgeDetailTab[] = [
  "overview",
  "sources",
  "settings",
];

export function ProductKnowledgeDetailPanel({
  base,
  locale,
  modal = false,
  onAddSource,
  onClose,
  onDelete,
  onPinChange,
  onPolicyChange,
  onRename,
  onReindexSource,
  onRemoveSource,
  onRequestCompilation,
  onUseInTask,
}: {
  base: ProductKnowledgeBase;
  locale: ProductPlaygroundLocale;
  modal?: boolean;
  onAddSource: (
    source: Pick<ProductKnowledgeSource, "kind" | "name" | "path">,
  ) => void;
  onClose: () => void;
  onDelete: () => void;
  onPinChange: (pinned: boolean) => void;
  onPolicyChange: (policy: ProductKnowledgeBase["policy"]) => void;
  onRename: (name: string) => void;
  onReindexSource: (sourceId: string) => void;
  onRemoveSource: (sourceId: string) => void;
  onRequestCompilation: () => void;
  onUseInTask: () => void;
}) {
  const zh = locale === "zh";
  const detailId = useId().replaceAll(":", "");
  const [name, setName] = useState(base.name[locale]);
  const [managedSourceId, setManagedSourceId] = useState<string>();
  const [removeConfirmId, setRemoveConfirmId] = useState<string>();
  const [sourceError, setSourceError] = useState("");
  const [sourceFormOpen, setSourceFormOpen] = useState(false);
  const [sourceKind, setSourceKind] =
    useState<ProductKnowledgeSourceKind>("folder");
  const [sourceName, setSourceName] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<KnowledgeDetailTab>("overview");
  const addSourceButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const removeCancelRef = useRef<HTMLButtonElement>(null);
  const sourcePathInputRef = useRef<HTMLInputElement>(null);
  const sourcePrimaryActionRef = useRef<HTMLButtonElement>(null);
  const sourceTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  const tabRefs = useRef<Record<KnowledgeDetailTab, HTMLButtonElement | null>>({
    overview: null,
    settings: null,
    sources: null,
  });
  const active = base.phase === "queued" || base.phase === "running";
  const canCompile = base.sources.length > 0;
  const phase = knowledgePhasePresentation(base, locale);

  useEffect(() => {
    setName(base.name[locale]);
    setManagedSourceId(undefined);
    setRemoveConfirmId(undefined);
    setSourceError("");
    setSourceFormOpen(false);
    setSourceKind("folder");
    setSourceName("");
    setSourcePath("");
    setTab("overview");
    setStatus("");
  }, [base.id, locale]);

  useEffect(() => {
    if (!sourceFormOpen) return;
    const frame = window.requestAnimationFrame(() => {
      sourcePathInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sourceFormOpen]);

  useEffect(() => {
    if (!managedSourceId) return;
    const frame = window.requestAnimationFrame(() => {
      sourcePrimaryActionRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [managedSourceId]);

  useEffect(() => {
    if (!removeConfirmId) return;
    const frame = window.requestAnimationFrame(() => {
      removeCancelRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [removeConfirmId]);

  useEffect(() => {
    if (!modal) return;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [base.id, modal]);

  const handleModalKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!modal) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const selectTab = (nextTab: KnowledgeDetailTab, focus = false) => {
    setTab(nextTab);
    if (nextTab !== "sources") {
      setManagedSourceId(undefined);
      setRemoveConfirmId(undefined);
      setSourceFormOpen(false);
    }
    if (focus) {
      window.requestAnimationFrame(() => tabRefs.current[nextTab]?.focus());
    }
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: KnowledgeDetailTab,
  ) => {
    const currentIndex = knowledgeDetailTabs.indexOf(currentTab);
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % knowledgeDetailTabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex =
        (currentIndex - 1 + knowledgeDetailTabs.length) %
        knowledgeDetailTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = knowledgeDetailTabs.length - 1;
    }
    if (nextIndex === undefined) return;
    event.preventDefault();
    selectTab(knowledgeDetailTabs[nextIndex], true);
  };

  const closeSourceForm = (restoreFocus = true) => {
    setSourceError("");
    setSourceFormOpen(false);
    setSourceKind("folder");
    setSourceName("");
    setSourcePath("");
    if (restoreFocus) {
      window.requestAnimationFrame(() => addSourceButtonRef.current?.focus());
    }
  };

  const submitSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const path = normalizeKnowledgeSourcePath(sourcePath);
    const displayName = sourceName.trim() || knowledgeSourceNameFromPath(path);
    if (!path) {
      setSourceError(
        zh ? "请输入工作空间中的来源路径。" : "Enter a workspace source path.",
      );
      sourcePathInputRef.current?.focus();
      return;
    }
    if (
      !path.startsWith("/workspace/") ||
      path.split("/").some((segment) => segment === "..")
    ) {
      setSourceError(
        zh
          ? "来源必须位于 /workspace/ 下，且不能包含上级目录跳转。"
          : "Sources must be under /workspace/ and cannot traverse parent directories.",
      );
      sourcePathInputRef.current?.focus();
      return;
    }
    if (!displayName) {
      setSourceError(
        zh ? "请输入来源显示名称。" : "Enter a source display name.",
      );
      return;
    }
    if (
      base.sources.some(
        (source) =>
          normalizeKnowledgeSourcePath(source.path).toLocaleLowerCase() ===
          path.toLocaleLowerCase(),
      )
    ) {
      setSourceError(
        zh
          ? "这个来源已经关联到当前知识库。"
          : "This source is already connected to the knowledge base.",
      );
      sourcePathInputRef.current?.focus();
      return;
    }
    onAddSource({ kind: sourceKind, name: displayName, path });
    setStatus(
      zh
        ? `已添加“${displayName}”，等待下次更新。`
        : `${displayName} added and waiting for the next update.`,
    );
    closeSourceForm();
  };

  const closeSourceActions = (sourceId: string, restoreFocus = true) => {
    setManagedSourceId(undefined);
    setRemoveConfirmId(undefined);
    if (restoreFocus) {
      window.requestAnimationFrame(() =>
        sourceTriggerRefs.current[sourceId]?.focus(),
      );
    }
  };

  const handleSourceActionsKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    sourceId: string,
  ) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeSourceActions(sourceId);
  };

  return (
    <aside
      aria-label={
        zh
          ? `${base.name.zh} 知识库管理`
          : `${base.name.en} knowledge management`
      }
      aria-modal={modal ? true : undefined}
      data-knowledge-library-detail
      data-modal={modal ? "true" : undefined}
      onKeyDown={handleModalKeyDown}
      role={modal ? "dialog" : undefined}
    >
      <header>
        <span data-knowledge-detail-mark>
          <ProductPlaygroundIcon name="knowledge" />
        </span>
        <span>
          <strong>{base.name[locale]}</strong>
          <small title={base.path}>{base.path}</small>
        </span>
        <span data-knowledge-detail-actions>
          <button data-task-context onClick={onUseInTask} type="button">
            <ProductPlaygroundIcon name="task-add" />
            {zh ? "引用到任务" : "Use in task"}
          </button>
          <button
            aria-label={zh ? "关闭知识库详情" : "Close knowledge details"}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        </span>
      </header>

      <div
        aria-label={zh ? "知识库详情" : "Knowledge details"}
        aria-orientation="horizontal"
        role="tablist"
      >
        {(
          [
            ["overview", zh ? "概览" : "Overview"],
            ["sources", zh ? "来源" : "Sources"],
            ["settings", zh ? "设置" : "Settings"],
          ] as const
        ).map(([id, label]) => (
          <button
            aria-controls={`${detailId}-${id}-panel`}
            aria-selected={tab === id}
            id={`${detailId}-${id}-tab`}
            key={id}
            onClick={() => selectTab(id)}
            onKeyDown={(event) => handleTabKeyDown(event, id)}
            ref={(element) => {
              tabRefs.current[id] = element;
            }}
            role="tab"
            tabIndex={tab === id ? 0 : -1}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div data-knowledge-detail-content>
        {tab === "overview" ? (
          <div
            aria-labelledby={`${detailId}-overview-tab`}
            data-knowledge-tab-panel="overview"
            id={`${detailId}-overview-panel`}
            role="tabpanel"
            tabIndex={0}
          >
            <section
              aria-busy={active}
              data-knowledge-compilation
              data-phase={base.phase}
            >
              <header>
                <span>
                  <ProductPlaygroundIcon
                    name={
                      base.phase === "failed" || base.phase === "paused"
                        ? "warning"
                        : base.phase === "succeeded"
                          ? "check"
                          : "database"
                    }
                  />
                  <span>
                    <strong>{phase.label}</strong>
                    <small>{phase.description}</small>
                  </span>
                </span>
                {active ? <i aria-hidden="true" /> : null}
              </header>
              {base.error ? (
                <p role={base.phase === "failed" ? "alert" : "status"}>
                  {base.error[locale]}
                </p>
              ) : null}
              {base.pendingChanges && base.phase === "succeeded" ? (
                <p role="status">
                  {zh
                    ? "检测到来源变化，建议再次更新。"
                    : "Source changes were detected. Update again when ready."}
                </p>
              ) : null}
              {!canCompile ? (
                <p role="status">
                  {zh
                    ? "添加至少一个来源后才能生成可搜索内容。"
                    : "Connect at least one source before building searchable content."}
                </p>
              ) : null}
              <button
                data-primary
                disabled={active || !canCompile}
                onClick={onRequestCompilation}
                type="button"
              >
                <ProductPlaygroundIcon name="refresh" />
                {!canCompile
                  ? zh
                    ? "先添加来源"
                    : "Add a source first"
                  : active
                    ? base.phase === "queued"
                      ? zh
                        ? "等待更新"
                        : "Queued"
                      : zh
                        ? "正在更新"
                        : "Updating"
                    : base.phase === "failed" || base.phase === "succeeded"
                      ? zh
                        ? "再次更新"
                        : "Update again"
                      : zh
                        ? "立即更新"
                        : "Update now"}
              </button>
            </section>

            <dl data-knowledge-stats>
              <div>
                <dt>{zh ? "来源" : "Sources"}</dt>
                <dd>
                  {zh
                    ? `${base.sources.length} 个入口 · ${productKnowledgeItemCount(base).toLocaleString("zh-CN")} 项`
                    : `${base.sources.length} roots · ${productKnowledgeItemCount(base).toLocaleString("en-US")} items`}
                </dd>
              </div>
              <div>
                <dt>{zh ? "概念" : "Concepts"}</dt>
                <dd>{base.conceptCount.toLocaleString(locale)}</dd>
              </div>
              <div>
                <dt>{zh ? "大小" : "Size"}</dt>
                <dd>{formatBytes(base.bytes)}</dd>
              </div>
              <div>
                <dt>{zh ? "最近更新" : "Updated"}</dt>
                <dd>{formatDate(base.updated, locale)}</dd>
              </div>
            </dl>

            <section data-knowledge-description>
              <h2>{zh ? "关于此知识库" : "About this knowledge base"}</h2>
              <p>{base.description[locale]}</p>
              <span>
                <ProductPlaygroundIcon name="shield" />
                {zh
                  ? "内容保存在当前工作空间；组件不拥有同步和权限。"
                  : "Content stays in the current workspace; sync and permissions remain host-owned."}
              </span>
            </section>

            <section data-knowledge-recent-sources>
              <header>
                <h2>{zh ? "最近来源" : "Recent sources"}</h2>
                <button
                  onClick={() => selectTab("sources", true)}
                  type="button"
                >
                  {zh ? "查看全部" : "View all"}
                </button>
              </header>
              {base.sources.slice(0, 3).map((source) => (
                <article key={source.id}>
                  <ProductPlaygroundIcon
                    name={knowledgeSourceIcon(source.kind)}
                  />
                  <span>
                    <strong title={source.path}>{source.name}</strong>
                    <small>
                      {knowledgeSourceKindLabel(source.kind, locale)} ·{" "}
                      {formatKnowledgeSourceItems(source.itemCount, locale)}
                    </small>
                  </span>
                  <em data-source-status={source.status}>
                    {knowledgeSourceStatusLabel(source.status, locale)}
                  </em>
                </article>
              ))}
            </section>
          </div>
        ) : null}

        {tab === "sources" ? (
          <div
            aria-labelledby={`${detailId}-sources-tab`}
            data-knowledge-tab-panel="sources"
            id={`${detailId}-sources-panel`}
            role="tabpanel"
            tabIndex={0}
          >
            <section data-knowledge-sources>
              <header>
                <span>
                  <h2>{zh ? "知识来源" : "Knowledge sources"}</h2>
                  <p>
                    {zh
                      ? `当前关联 ${base.sources.length} 个来源入口；文件读取、授权与同步由宿主负责。`
                      : `${base.sources.length} source roots are connected. The host owns file access, authorization, and sync.`}
                  </p>
                </span>
                <button
                  aria-controls={`${detailId}-source-form`}
                  aria-expanded={sourceFormOpen}
                  disabled={active}
                  onClick={() => {
                    if (sourceFormOpen) closeSourceForm();
                    else {
                      setManagedSourceId(undefined);
                      setRemoveConfirmId(undefined);
                      setSourceFormOpen(true);
                    }
                  }}
                  ref={addSourceButtonRef}
                  type="button"
                >
                  <ProductPlaygroundIcon
                    name={sourceFormOpen ? "close" : "plus"}
                  />
                  {sourceFormOpen
                    ? zh
                      ? "收起"
                      : "Close"
                    : zh
                      ? "添加来源"
                      : "Add source"}
                </button>
              </header>

              {sourceFormOpen ? (
                <form
                  data-knowledge-source-form
                  id={`${detailId}-source-form`}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape") return;
                    event.preventDefault();
                    event.stopPropagation();
                    closeSourceForm();
                  }}
                  onSubmit={submitSource}
                >
                  <header>
                    <span>
                      <strong>
                        {zh ? "关联工作空间来源" : "Connect a workspace source"}
                      </strong>
                      <small>
                        {zh
                          ? "添加后先进入待处理状态，不会立即替换当前可用索引。"
                          : "New sources remain pending and do not replace the current usable index."}
                      </small>
                    </span>
                  </header>
                  <label>
                    <span>{zh ? "工作空间路径" : "Workspace path"}</span>
                    <input
                      aria-describedby={`${detailId}-source-path-help`}
                      aria-invalid={sourceError ? true : undefined}
                      aria-label={zh ? "来源路径" : "Source path"}
                      onChange={(event) => {
                        setSourcePath(event.currentTarget.value);
                        setSourceError("");
                      }}
                      placeholder="/workspace/docs/product"
                      ref={sourcePathInputRef}
                      value={sourcePath}
                    />
                    <small id={`${detailId}-source-path-help`}>
                      {zh
                        ? "仅可关联 /workspace/ 下已授权的路径。"
                        : "Only authorized paths under /workspace/ can be connected."}
                    </small>
                  </label>
                  <div>
                    <label>
                      <span>{zh ? "来源类型" : "Source type"}</span>
                      <select
                        aria-label={zh ? "来源类型" : "Source type"}
                        onChange={(event) =>
                          setSourceKind(
                            event.currentTarget
                              .value as ProductKnowledgeSourceKind,
                          )
                        }
                        value={sourceKind}
                      >
                        {(
                          ["folder", "markdown", "document", "vault"] as const
                        ).map((kind) => (
                          <option key={kind} value={kind}>
                            {knowledgeSourceKindLabel(kind, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>
                        {zh ? "显示名称（可选）" : "Display name (optional)"}
                      </span>
                      <input
                        aria-label={zh ? "来源显示名称" : "Source display name"}
                        maxLength={80}
                        onChange={(event) => {
                          setSourceName(event.currentTarget.value);
                          setSourceError("");
                        }}
                        placeholder={
                          zh
                            ? "默认使用路径末级名称"
                            : "Defaults to the final path segment"
                        }
                        value={sourceName}
                      />
                    </label>
                  </div>
                  {sourceError ? <p role="alert">{sourceError}</p> : null}
                  <footer>
                    <button onClick={() => closeSourceForm()} type="button">
                      {zh ? "取消" : "Cancel"}
                    </button>
                    <button data-primary type="submit">
                      <ProductPlaygroundIcon name="plus" />
                      {zh ? "添加来源" : "Add source"}
                    </button>
                  </footer>
                </form>
              ) : null}

              {base.sources.length > 0 ? (
                <div role="list">
                  {base.sources.map((source) => {
                    const actionsOpen = managedSourceId === source.id;
                    const confirmingRemoval = removeConfirmId === source.id;
                    return (
                      <article
                        data-source-id={source.id}
                        data-source-kind={source.kind}
                        data-source-path={source.path}
                        data-source-row
                        key={source.id}
                        role="listitem"
                      >
                        <span data-source-mark>
                          <ProductPlaygroundIcon
                            name={knowledgeSourceIcon(source.kind)}
                          />
                        </span>
                        <span>
                          <strong title={source.path}>{source.name}</strong>
                          <small title={source.path}>
                            {knowledgeSourceKindLabel(source.kind, locale)} ·{" "}
                            {formatKnowledgeSourceItems(
                              source.itemCount,
                              locale,
                            )}{" "}
                            · {formatDate(source.updated, locale)}
                          </small>
                        </span>
                        <em data-source-status={source.status}>
                          {knowledgeSourceStatusLabel(source.status, locale)}
                        </em>
                        <button
                          aria-controls={`${detailId}-${source.id}-actions`}
                          aria-expanded={actionsOpen}
                          aria-label={
                            zh ? `管理 ${source.name}` : `Manage ${source.name}`
                          }
                          disabled={active}
                          onClick={() => {
                            setSourceFormOpen(false);
                            setRemoveConfirmId(undefined);
                            setManagedSourceId(
                              actionsOpen ? undefined : source.id,
                            );
                          }}
                          ref={(element) => {
                            sourceTriggerRefs.current[source.id] = element;
                          }}
                          type="button"
                        >
                          <ProductPlaygroundIcon
                            name={actionsOpen ? "close" : "more"}
                          />
                        </button>

                        {actionsOpen ? (
                          <section
                            aria-label={
                              zh
                                ? `${source.name} 来源操作`
                                : `${source.name} source actions`
                            }
                            data-knowledge-source-actions
                            id={`${detailId}-${source.id}-actions`}
                            onKeyDown={(event) =>
                              handleSourceActionsKeyDown(event, source.id)
                            }
                          >
                            <span>
                              <strong>{source.name}</strong>
                              <small title={source.path}>{source.path}</small>
                            </span>
                            {!confirmingRemoval ? (
                              <div>
                                <button
                                  disabled={source.status === "pending"}
                                  onClick={() => {
                                    onReindexSource(source.id);
                                    setStatus(
                                      zh
                                        ? `已将“${source.name}”标记为待更新。`
                                        : `${source.name} marked for reindexing.`,
                                    );
                                    closeSourceActions(source.id);
                                  }}
                                  ref={
                                    source.status === "pending"
                                      ? undefined
                                      : sourcePrimaryActionRef
                                  }
                                  type="button"
                                >
                                  <ProductPlaygroundIcon name="refresh" />
                                  {source.status === "pending"
                                    ? zh
                                      ? "已等待更新"
                                      : "Already pending"
                                    : zh
                                      ? "下次更新时重新索引"
                                      : "Reindex on next update"}
                                </button>
                                <button
                                  data-danger
                                  onClick={() => setRemoveConfirmId(source.id)}
                                  ref={
                                    source.status === "pending"
                                      ? sourcePrimaryActionRef
                                      : undefined
                                  }
                                  type="button"
                                >
                                  <ProductPlaygroundIcon name="trash" />
                                  {zh ? "移除关联" : "Remove connection"}
                                </button>
                              </div>
                            ) : (
                              <div data-source-remove-confirmation>
                                <p>
                                  {zh
                                    ? "仅从当前知识库移除关联；工作空间中的原文件会保留。"
                                    : "This only disconnects the source. The original workspace files remain in place."}
                                </p>
                                <span>
                                  <button
                                    onClick={() =>
                                      setRemoveConfirmId(undefined)
                                    }
                                    ref={removeCancelRef}
                                    type="button"
                                  >
                                    {zh ? "取消" : "Cancel"}
                                  </button>
                                  <button
                                    data-danger
                                    onClick={() => {
                                      onRemoveSource(source.id);
                                      setManagedSourceId(undefined);
                                      setRemoveConfirmId(undefined);
                                      setStatus(
                                        zh
                                          ? `已移除“${source.name}”的关联；原文件仍保留在工作空间。`
                                          : `${source.name} disconnected; the original files remain in the workspace.`,
                                      );
                                      window.requestAnimationFrame(() =>
                                        addSourceButtonRef.current?.focus(),
                                      );
                                    }}
                                    type="button"
                                  >
                                    {zh ? "确认移除" : "Remove connection"}
                                  </button>
                                </span>
                              </div>
                            )}
                          </section>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <section data-knowledge-sources-empty role="status">
                  <ProductPlaygroundIcon name="link" />
                  <strong>{zh ? "还没有来源" : "No sources connected"}</strong>
                  <p>
                    {zh
                      ? "添加工作空间中的文件、文件夹或笔记库，再生成首个可搜索版本。"
                      : "Connect a workspace file, folder, or vault, then build the first searchable version."}
                  </p>
                </section>
              )}
            </section>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div
            aria-labelledby={`${detailId}-settings-tab`}
            data-knowledge-tab-panel="settings"
            id={`${detailId}-settings-panel`}
            role="tabpanel"
            tabIndex={0}
          >
            <section data-knowledge-settings>
              <header>
                <h2>{zh ? "知识库设置" : "Knowledge settings"}</h2>
                <p>
                  {zh
                    ? "每次修改都应保留失败恢复路径。"
                    : "Every mutation needs a recoverable failure path."}
                </p>
              </header>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = name.trim();
                  if (!value) {
                    setStatus(zh ? "名称不能为空。" : "Name cannot be empty.");
                    return;
                  }
                  onRename(value);
                  setStatus(zh ? "名称已保存。" : "Name saved.");
                }}
              >
                <label>
                  <span>{zh ? "名称" : "Name"}</span>
                  <input
                    maxLength={80}
                    onChange={(event) => setName(event.currentTarget.value)}
                    value={name}
                  />
                </label>
                <button type="submit">{zh ? "保存名称" : "Save name"}</button>
              </form>
              <label data-knowledge-setting-switch>
                <span>
                  <strong>{zh ? "自动更新" : "Automatic updates"}</strong>
                  <small>
                    {zh
                      ? "文件稳定后更新，且两次更新至少间隔 10 分钟。"
                      : "Update after files settle, with at least ten minutes between runs."}
                  </small>
                </span>
                <input
                  checked={base.policy === "smart_auto"}
                  onChange={(event) => {
                    onPolicyChange(
                      event.currentTarget.checked ? "smart_auto" : "manual",
                    );
                    setStatus(
                      event.currentTarget.checked
                        ? zh
                          ? "已开启自动更新。"
                          : "Automatic updates enabled."
                        : zh
                          ? "已切换为手动更新。"
                          : "Switched to manual updates.",
                    );
                  }}
                  role="switch"
                  type="checkbox"
                />
              </label>
              <label data-knowledge-setting-switch>
                <span>
                  <strong>{zh ? "置顶知识库" : "Pin knowledge base"}</strong>
                  <small>
                    {zh
                      ? "在知识库列表顶部显示。"
                      : "Keep this library at the top of the directory."}
                  </small>
                </span>
                <input
                  checked={base.pinned}
                  onChange={(event) => {
                    onPinChange(event.currentTarget.checked);
                    setStatus(
                      event.currentTarget.checked
                        ? zh
                          ? "已置顶知识库。"
                          : "Knowledge base pinned."
                        : zh
                          ? "已取消置顶。"
                          : "Knowledge base unpinned.",
                    );
                  }}
                  role="switch"
                  type="checkbox"
                />
              </label>
              <section data-danger-zone>
                <span>
                  <strong>{zh ? "移除知识库" : "Remove knowledge base"}</strong>
                  <small>
                    {zh
                      ? "移除知识库配置与可搜索索引；工作空间原文件保留。"
                      : "Remove the knowledge configuration and searchable index; original workspace files remain."}
                  </small>
                </span>
                <button onClick={onDelete} type="button">
                  <ProductPlaygroundIcon name="trash" />
                  {zh ? "移除" : "Remove"}
                </button>
              </section>
            </section>
          </div>
        ) : null}
      </div>
      <output aria-live="polite">{status}</output>
    </aside>
  );
}

export function knowledgePhasePresentation(
  base: ProductKnowledgeBase,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (base.sources.length === 0)
    return {
      label: zh ? "还没有来源" : "No sources yet",
      description: zh
        ? "关联工作空间来源后再生成可搜索版本。"
        : "Connect a workspace source before building a searchable version.",
    };
  if (base.phase === "queued")
    return {
      label: zh ? "等待更新" : "Queued",
      description: zh
        ? "已加入队列，稍后生成可搜索内容。"
        : "Queued to generate searchable content.",
    };
  if (base.phase === "running")
    return {
      label: zh ? "正在更新" : "Updating",
      description: zh
        ? "正在整理来源并建立可搜索内容。"
        : "Organizing sources and building the searchable index.",
    };
  if (base.phase === "succeeded")
    return {
      label: base.pendingChanges
        ? zh
          ? "来源有变化"
          : "Sources changed"
        : zh
          ? "已更新"
          : "Up to date",
      description: zh
        ? "最近一次更新成功；失败时仍保留当前可用版本。"
        : "The latest update succeeded; failures retain the current usable version.",
    };
  if (base.phase === "failed")
    return {
      label: zh ? "更新失败" : "Update failed",
      description: zh
        ? "上一版可搜索内容仍然可用。"
        : "The previous searchable version remains available.",
    };
  if (base.phase === "paused")
    return {
      label: zh ? "自动更新已暂停" : "Automatic update paused",
      description: zh
        ? "检查来源后手动继续。"
        : "Review the sources before continuing manually.",
    };
  return {
    label: zh ? "可以更新" : "Ready to update",
    description: zh
      ? "来源已准备好，更新后即可搜索和引用。"
      : "Sources are ready to become searchable and referenceable.",
  };
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(value: string, locale: ProductPlaygroundLocale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeKnowledgeSourcePath(value: string) {
  return value
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
}

function knowledgeSourceNameFromPath(value: string) {
  return value.split("/").filter(Boolean).at(-1) ?? "";
}

function knowledgeSourceIcon(
  kind: ProductKnowledgeSourceKind,
): "document" | "folder" {
  return kind === "folder" || kind === "vault" ? "folder" : "document";
}

function knowledgeSourceKindLabel(
  kind: ProductKnowledgeSourceKind,
  locale: ProductPlaygroundLocale,
) {
  const labels: Record<
    ProductKnowledgeSourceKind,
    Record<ProductPlaygroundLocale, string>
  > = {
    document: { en: "Document", zh: "文档" },
    folder: { en: "Folder", zh: "文件夹" },
    markdown: { en: "Markdown", zh: "Markdown" },
    vault: { en: "Notes vault", zh: "笔记库" },
  };
  return labels[kind][locale];
}

function knowledgeSourceStatusLabel(
  status: ProductKnowledgeSource["status"],
  locale: ProductPlaygroundLocale,
) {
  if (status === "indexed") return locale === "zh" ? "已索引" : "Indexed";
  if (status === "pending") return locale === "zh" ? "待更新" : "Pending";
  return locale === "zh" ? "已跳过" : "Skipped";
}

function formatKnowledgeSourceItems(
  itemCount: number,
  locale: ProductPlaygroundLocale,
) {
  if (itemCount === 0) return locale === "zh" ? "待统计" : "Count pending";
  return locale === "zh"
    ? `${itemCount.toLocaleString("zh-CN")} 项`
    : `${itemCount.toLocaleString("en-US")} item${itemCount === 1 ? "" : "s"}`;
}
