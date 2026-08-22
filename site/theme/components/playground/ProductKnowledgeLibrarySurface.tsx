import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  productKnowledgeItemCount,
  productKnowledgeBases,
  type ProductKnowledgeBase,
  type ProductKnowledgeSource,
} from "./product-knowledge-library-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductTaskDraft } from "./product-composer-data";
import {
  knowledgePhasePresentation,
  ProductKnowledgeDetailPanel,
} from "./ProductKnowledgeDetailPanel";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type KnowledgeFilter = "all" | "attention" | "pinned" | "updating";
type KnowledgeFormMode = "create" | "import" | null;

export function ProductKnowledgeLibrarySurface({
  locale,
  onStartTask,
}: {
  locale: ProductPlaygroundLocale;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
}) {
  const zh = locale === "zh";
  const timers = useRef<number[]>([]);
  const [deleteId, setDeleteId] = useState<string>();
  const [filter, setFilter] = useState<KnowledgeFilter>("all");
  const [formError, setFormError] = useState("");
  const [formMode, setFormMode] = useState<KnowledgeFormMode>(null);
  const [formName, setFormName] = useState("");
  const [formSource, setFormSource] = useState("");
  const [libraries, setLibraries] = useState<ProductKnowledgeBase[]>(() =>
    productKnowledgeBases.map((base) => ({
      ...base,
      sources: base.sources.map((source) => ({ ...source })),
    })),
  );
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState("");
  const [compactDetail, setCompactDetail] = useState(false);
  const selected = libraries.find((base) => base.id === selectedId);
  const deleteTarget = libraries.find((base) => base.id === deleteId);
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);

  useEffect(
    () => () => timers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );

  useEffect(() => {
    if (window.matchMedia("(min-width: 75rem)").matches) {
      setSelectedId("design-system");
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 54rem)");
    const update = () => setCompactDetail(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const counts = useMemo(
    () => ({
      all: libraries.length,
      attention: libraries.filter((base) =>
        ["failed", "paused"].includes(base.phase),
      ).length,
      pinned: libraries.filter((base) => base.pinned).length,
      updating: libraries.filter((base) =>
        ["queued", "running"].includes(base.phase),
      ).length,
    }),
    [libraries],
  );

  const visibleLibraries = useMemo(
    () =>
      libraries
        .filter((base) => {
          const matchesQuery =
            !normalizedQuery ||
            [
              base.name.en,
              base.name.zh,
              base.description.en,
              base.description.zh,
              base.path,
            ]
              .join(" ")
              .toLocaleLowerCase(locale)
              .includes(normalizedQuery);
          const matchesFilter =
            filter === "all" ||
            (filter === "pinned" && base.pinned) ||
            (filter === "attention" &&
              ["failed", "paused"].includes(base.phase)) ||
            (filter === "updating" &&
              ["queued", "running"].includes(base.phase));
          return matchesQuery && matchesFilter;
        })
        .sort((left, right) => {
          if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
          return right.updated.localeCompare(left.updated);
        }),
    [filter, libraries, locale, normalizedQuery],
  );

  const updateLibrary = (
    id: string,
    update: (base: ProductKnowledgeBase) => ProductKnowledgeBase,
  ) => {
    setLibraries((current) =>
      current.map((base) => (base.id === id ? update(base) : base)),
    );
  };

  const requestCompilation = (id: string) => {
    updateLibrary(id, (base) => ({
      ...base,
      phase: "queued",
    }));
    setStatus(zh ? "知识库已加入更新队列。" : "Knowledge update queued.");
    const runningTimer = window.setTimeout(() => {
      updateLibrary(id, (base) => ({ ...base, phase: "running" }));
      setStatus(zh ? "正在整理来源。" : "Organizing knowledge sources.");
    }, 450);
    const completeTimer = window.setTimeout(() => {
      updateLibrary(id, (base) => {
        const updated = new Date().toISOString();
        const sources = base.sources.map((source) => ({
          ...source,
          itemCount:
            source.itemCount > 0
              ? source.itemCount
              : source.kind === "folder" || source.kind === "vault"
                ? 8
                : 1,
          status: "indexed" as const,
          updated,
        }));
        const itemCount = sources.reduce(
          (total, source) => total + source.itemCount,
          0,
        );
        return {
          ...base,
          conceptCount: Math.max(base.conceptCount, itemCount * 8),
          error: undefined,
          pendingChanges: false,
          phase: "succeeded",
          sources,
          updated,
        };
      });
      setStatus(zh ? "知识库更新完成。" : "Knowledge update completed.");
    }, 1450);
    timers.current.push(runningTimer, completeTimer);
  };

  const openForm = (mode: Exclude<KnowledgeFormMode, null>) => {
    setFormMode(mode);
    setFormName("");
    setFormSource(mode === "import" ? "/workspace/docs" : "");
    setFormError("");
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = formName.trim();
    const source = formSource.trim();
    if (!name) {
      setFormError(zh ? "请输入知识库名称。" : "Enter a knowledge base name.");
      return;
    }
    if (libraries.some((base) => base.name[locale] === name)) {
      setFormError(
        zh
          ? "已经存在同名知识库。"
          : "A knowledge base with this name already exists.",
      );
      return;
    }
    if (formMode === "import" && !source) {
      setFormError(zh ? "请输入来源路径。" : "Enter a source path.");
      return;
    }

    const id = `knowledge-${Date.now()}`;
    const now = new Date().toISOString();
    const next: ProductKnowledgeBase = {
      bytes: 0,
      conceptCount: 0,
      description: {
        en:
          formMode === "import"
            ? "Imported workspace sources awaiting their first searchable version."
            : "A local knowledge area ready for durable workspace sources.",
        zh:
          formMode === "import"
            ? "已导入工作空间来源，等待生成首个可搜索版本。"
            : "用于沉淀工作空间长期资料的本地知识区域。",
      },
      id,
      name: { en: name, zh: name },
      origin: formMode === "import" ? "imported" : "created",
      path:
        formMode === "import"
          ? source
          : `/workspace/knowledge/${slugifyKnowledgeName(name)}`,
      phase: formMode === "import" ? "queued" : "ready",
      pinned: false,
      policy: "manual",
      sources: source
        ? [
            {
              id: `${id}-source`,
              itemCount: 0,
              kind: "folder",
              name: source.split("/").filter(Boolean).at(-1) ?? source,
              path: source,
              status: "pending",
              updated: now,
            },
          ]
        : [],
      updated: now,
    };
    setLibraries((current) => [next, ...current]);
    setSelectedId(id);
    setFilter("all");
    setFormMode(null);
    setQuery("");
    setStatus(
      formMode === "import"
        ? zh
          ? `已导入“${name}”，正在准备更新。`
          : `${name} imported and queued for update.`
        : zh
          ? `已创建“${name}”。`
          : `${name} created.`,
    );
    if (formMode === "import") requestCompilation(id);
  };

  const removeLibrary = () => {
    if (!deleteTarget) return;
    setLibraries((current) =>
      current.filter((base) => base.id !== deleteTarget.id),
    );
    if (selectedId === deleteTarget.id) setSelectedId("");
    setDeleteId(undefined);
    setStatus(
      zh
        ? `已移除“${deleteTarget.name.zh}”。`
        : `${deleteTarget.name.en} removed.`,
    );
  };

  const addSource = (
    id: string,
    source: Pick<ProductKnowledgeSource, "kind" | "name" | "path">,
  ) => {
    const now = new Date().toISOString();
    updateLibrary(id, (base) => ({
      ...base,
      pendingChanges: true,
      sources: [
        ...base.sources,
        {
          ...source,
          id: `${base.id}-source-${Date.now()}`,
          itemCount: 0,
          status: "pending",
          updated: now,
        },
      ],
    }));
  };

  const markSourceForReindex = (id: string, sourceId: string) => {
    const now = new Date().toISOString();
    updateLibrary(id, (base) => ({
      ...base,
      pendingChanges: true,
      sources: base.sources.map((source) =>
        source.id === sourceId
          ? { ...source, status: "pending", updated: now }
          : source,
      ),
    }));
  };

  const removeSource = (id: string, sourceId: string) => {
    updateLibrary(id, (base) => ({
      ...base,
      pendingChanges: true,
      sources: base.sources.filter((source) => source.id !== sourceId),
    }));
  };

  const filterOptions: readonly [KnowledgeFilter, string][] = [
    ["all", zh ? "全部知识库" : "All knowledge"],
    ["pinned", zh ? "已置顶" : "Pinned"],
    ["updating", zh ? "正在更新" : "Updating"],
    ["attention", zh ? "需要处理" : "Needs attention"],
  ];
  const pinned = visibleLibraries.filter((base) => base.pinned);
  const remaining = visibleLibraries.filter((base) => !base.pinned);
  const detailModalOpen = compactDetail && Boolean(selected);

  return (
    <section
      aria-label={zh ? "知识库管理" : "Knowledge library management"}
      className="knowledge-library product-knowledge-library"
      data-layout="wide"
      data-knowledge-library-initialized="true"
      data-state="ready"
    >
      <aside
        data-knowledge-library-navigation
        inert={detailModalOpen ? true : undefined}
      >
        <header>
          <span>
            <ProductPlaygroundIcon name="knowledge" />
          </span>
          <strong>{zh ? "知识库" : "Knowledge"}</strong>
        </header>
        <nav aria-label={zh ? "知识库筛选" : "Knowledge filters"}>
          {filterOptions.map(([id, label]) => (
            <button
              aria-pressed={filter === id}
              data-knowledge-filter={id}
              key={id}
              onClick={() => setFilter(id)}
              type="button"
            >
              <ProductPlaygroundIcon
                name={
                  id === "pinned"
                    ? "pin"
                    : id === "updating"
                      ? "refresh"
                      : id === "attention"
                        ? "warning"
                        : "database"
                }
              />
              <span>{label}</span>
              <small>{counts[id]}</small>
            </button>
          ))}
        </nav>
        <footer>
          <span>{zh ? "本地知识存储" : "Local knowledge storage"}</span>
          <strong>{formatKnowledgeStorage(libraries, locale)}</strong>
          <div aria-hidden="true">
            <i />
          </div>
          <small>
            {zh
              ? "索引、同步和权限由宿主负责。"
              : "Indexing, sync, and permissions remain host-owned."}
          </small>
        </footer>
      </aside>

      <main inert={detailModalOpen ? true : undefined}>
        <header data-knowledge-library-header>
          <span>
            <h1>{zh ? "知识库" : "Knowledge library"}</h1>
            <p>
              {zh
                ? "管理可搜索、可引用且能从失败中恢复的长期资料。"
                : "Manage durable sources that stay searchable, referenceable, and recoverable."}
            </p>
          </span>
          <div>
            <button
              aria-label={zh ? "刷新知识库" : "Refresh knowledge libraries"}
              onClick={() =>
                setStatus(
                  zh
                    ? `已检查 ${libraries.length} 个知识库。`
                    : `${libraries.length} knowledge bases checked.`,
                )
              }
              type="button"
            >
              <ProductPlaygroundIcon name="refresh" />
            </button>
            <button onClick={() => openForm("import")} type="button">
              <ProductPlaygroundIcon name="upload" />
              {zh ? "导入" : "Import"}
            </button>
            <button
              data-primary
              onClick={() => openForm("create")}
              type="button"
            >
              <ProductPlaygroundIcon name="plus" />
              {zh ? "新建知识库" : "New knowledge base"}
            </button>
          </div>
        </header>

        <div data-knowledge-library-toolbar>
          <label data-focus-owner="container">
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={zh ? "搜索知识库" : "Search knowledge bases"}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={
                zh
                  ? "搜索名称、说明或路径"
                  : "Search name, description, or path"
              }
              type="search"
              value={query}
            />
          </label>
          <span>
            {zh
              ? `${visibleLibraries.length} 个结果`
              : `${visibleLibraries.length} result${visibleLibraries.length === 1 ? "" : "s"}`}
          </span>
        </div>

        {formMode ? (
          <form data-knowledge-library-form onSubmit={submitForm}>
            <header>
              <span>
                <ProductPlaygroundIcon
                  name={formMode === "create" ? "plus" : "upload"}
                />
                <span>
                  <strong>
                    {formMode === "create"
                      ? zh
                        ? "新建知识库"
                        : "Create knowledge base"
                      : zh
                        ? "导入现有资料"
                        : "Import existing sources"}
                  </strong>
                  <small>
                    {formMode === "create"
                      ? zh
                        ? "先建立边界，再按需添加来源。"
                        : "Create the boundary first, then add sources."
                      : zh
                        ? "导入后先排队，不覆盖当前可用版本。"
                        : "Imports queue safely without replacing a usable version."}
                  </small>
                </span>
              </span>
              <button
                aria-label={zh ? "关闭表单" : "Close form"}
                onClick={() => setFormMode(null)}
                type="button"
              >
                <ProductPlaygroundIcon name="close" />
              </button>
            </header>
            <div>
              <label>
                <span>{zh ? "名称" : "Name"}</span>
                <input
                  autoFocus
                  maxLength={80}
                  onChange={(event) => {
                    setFormName(event.currentTarget.value);
                    setFormError("");
                  }}
                  placeholder={
                    zh ? "例如：发布规范" : "For example: Release standards"
                  }
                  value={formName}
                />
              </label>
              {formMode === "import" ? (
                <label>
                  <span>{zh ? "来源路径" : "Source path"}</span>
                  <input
                    onChange={(event) => {
                      setFormSource(event.currentTarget.value);
                      setFormError("");
                    }}
                    placeholder="/workspace/docs"
                    value={formSource}
                  />
                </label>
              ) : null}
            </div>
            {formError ? <p role="alert">{formError}</p> : null}
            <footer>
              <button onClick={() => setFormMode(null)} type="button">
                {zh ? "取消" : "Cancel"}
              </button>
              <button data-primary type="submit">
                {formMode === "create"
                  ? zh
                    ? "创建"
                    : "Create"
                  : zh
                    ? "导入并更新"
                    : "Import and update"}
              </button>
            </footer>
          </form>
        ) : null}

        <div data-knowledge-library-viewport>
          {visibleLibraries.length > 0 ? (
            <>
              {pinned.length > 0 ? (
                <KnowledgeLibraryGroup
                  bases={pinned}
                  label={zh ? "已置顶" : "Pinned"}
                  locale={locale}
                  onSelect={setSelectedId}
                  selectedId={selectedId}
                />
              ) : null}
              {remaining.length > 0 ? (
                <KnowledgeLibraryGroup
                  bases={remaining}
                  label={
                    filter === "all" && pinned.length > 0
                      ? zh
                        ? "全部知识库"
                        : "All knowledge"
                      : zh
                        ? "知识库"
                        : "Knowledge bases"
                  }
                  locale={locale}
                  onSelect={setSelectedId}
                  selectedId={selectedId}
                />
              ) : null}
            </>
          ) : (
            <section data-knowledge-library-empty role="status">
              <ProductPlaygroundIcon
                name={normalizedQuery ? "search" : "knowledge"}
              />
              <strong>
                {normalizedQuery
                  ? zh
                    ? "没有匹配的知识库"
                    : "No matching knowledge bases"
                  : zh
                    ? "此分组为空"
                    : "This group is empty"}
              </strong>
              <span>
                {normalizedQuery
                  ? zh
                    ? "更换关键词或清除筛选条件。"
                    : "Try another query or clear the active filter."
                  : zh
                    ? "新建知识库或从工作空间导入资料。"
                    : "Create a knowledge base or import workspace sources."}
              </span>
              <button
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                type="button"
              >
                {zh ? "查看全部" : "View all"}
              </button>
            </section>
          )}
        </div>
        <output aria-live="polite" data-knowledge-library-status>
          {status}
        </output>
      </main>

      {selected ? (
        <ProductKnowledgeDetailPanel
          base={selected}
          locale={locale}
          modal={detailModalOpen}
          onClose={() => setSelectedId("")}
          onAddSource={(source) => addSource(selected.id, source)}
          onDelete={() => setDeleteId(selected.id)}
          onPinChange={(pinnedValue) =>
            updateLibrary(selected.id, (base) => ({
              ...base,
              pinned: pinnedValue,
            }))
          }
          onPolicyChange={(policy) =>
            updateLibrary(selected.id, (base) => ({ ...base, policy }))
          }
          onRename={(name) =>
            updateLibrary(selected.id, (base) => ({
              ...base,
              name: { en: name, zh: name },
            }))
          }
          onRemoveSource={(sourceId) => removeSource(selected.id, sourceId)}
          onReindexSource={(sourceId) =>
            markSourceForReindex(selected.id, sourceId)
          }
          onRequestCompilation={() => requestCompilation(selected.id)}
          onUseInTask={() =>
            onStartTask({
              prompt: zh
                ? `基于“${selected.name.zh}”知识库回答问题，并为关键结论标注可追溯来源。`
                : `Use the “${selected.name.en}” knowledge base to answer the task and cite traceable sources for key conclusions.`,
              resources: [
                {
                  id: `knowledge:${selected.id}`,
                  kind: "selection",
                  label: selected.name[locale],
                  meta: zh
                    ? `知识库 · ${selected.conceptCount.toLocaleString("zh-CN")} 个概念`
                    : `Knowledge · ${selected.conceptCount.toLocaleString("en-US")} concepts`,
                },
              ],
              workspace: "ui",
            })
          }
        />
      ) : null}

      <KnowledgeDeleteDialog
        locale={locale}
        name={deleteTarget?.name[locale]}
        onCancel={() => setDeleteId(undefined)}
        onConfirm={removeLibrary}
      />
    </section>
  );
}

function KnowledgeLibraryGroup({
  bases,
  label,
  locale,
  onSelect,
  selectedId,
}: {
  bases: readonly ProductKnowledgeBase[];
  label: string;
  locale: ProductPlaygroundLocale;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  const zh = locale === "zh";
  return (
    <section data-knowledge-library-group>
      <header>
        <h2>{label}</h2>
        <small>{bases.length}</small>
      </header>
      <ul>
        {bases.map((base) => {
          const phase = knowledgePhasePresentation(base, locale);
          return (
            <li key={base.id}>
              <button
                aria-current={selectedId === base.id ? "true" : undefined}
                data-knowledge-library-item
                data-phase={base.phase}
                onClick={() => onSelect(base.id)}
                type="button"
              >
                <span data-knowledge-item-mark>
                  <ProductPlaygroundIcon
                    name={
                      base.phase === "failed" || base.phase === "paused"
                        ? "warning"
                        : "knowledge"
                    }
                  />
                  {base.pinned ? (
                    <ProductPlaygroundIcon data-pinned name="pin" />
                  ) : null}
                </span>
                <span data-knowledge-item-identity>
                  <strong>{base.name[locale]}</strong>
                  <small>{base.description[locale]}</small>
                  <em title={base.path}>{base.path}</em>
                </span>
                <span data-knowledge-item-stats>
                  <small>
                    {zh
                      ? `${base.sources.length} 个来源入口`
                      : `${base.sources.length} source roots`}
                  </small>
                  <small>
                    {zh
                      ? `${productKnowledgeItemCount(base).toLocaleString("zh-CN")} 个已编索项`
                      : `${productKnowledgeItemCount(base).toLocaleString("en-US")} indexed items`}
                  </small>
                </span>
                <span data-knowledge-item-phase>
                  <i aria-hidden="true" />
                  <strong>{phase.label}</strong>
                  <small>{formatKnowledgeDate(base.updated, locale)}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function KnowledgeDeleteDialog({
  locale,
  name,
  onCancel,
  onConfirm,
}: {
  locale: ProductPlaygroundLocale;
  name?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const zh = locale === "zh";
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (name && !dialog.open) dialog.showModal();
    if (!name && dialog.open) dialog.close();
  }, [name]);
  return (
    <dialog
      aria-labelledby="product-knowledge-delete-title"
      className="product-knowledge-delete-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      ref={dialogRef}
    >
      <ProductPlaygroundIcon name="trash" />
      <h2 id="product-knowledge-delete-title">
        {zh ? `移除“${name ?? ""}”？` : `Remove “${name ?? ""}”?`}
      </h2>
      <p>
        {zh
          ? "将移除当前知识库配置与可搜索索引。已关联的工作空间文件不会被删除，后续可重新导入。"
          : "This removes the knowledge configuration and searchable index. Connected workspace files are not deleted and can be imported again."}
      </p>
      <footer>
        <button onClick={onCancel} type="button">
          {zh ? "取消" : "Cancel"}
        </button>
        <button data-danger onClick={onConfirm} type="button">
          {zh ? "移除知识库" : "Remove knowledge base"}
        </button>
      </footer>
    </dialog>
  );
}

function formatKnowledgeDate(value: string, locale: ProductPlaygroundLocale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatKnowledgeStorage(
  libraries: readonly ProductKnowledgeBase[],
  locale: ProductPlaygroundLocale,
) {
  const bytes = libraries.reduce((total, base) => total + base.bytes, 0);
  return `${(bytes / (1024 * 1024)).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 1 })} MB`;
}

function slugifyKnowledgeName(value: string) {
  const slug = value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");
  return slug || `library-${Date.now()}`;
}
