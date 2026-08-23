import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductTaskDraft } from "./product-composer-data";
import { ProductFileArtifactsSurface } from "./ProductFileArtifactsSurface";
import { ProductFilePreviewDialog } from "./ProductFilePreviewDialog";
import { ProductFileWorkbench } from "./ProductFileWorkbench";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  formatFileDate,
  productFileOptionId,
  useProductFileManager,
} from "./useProductFileManager";
import { ProductFileTypeIcon } from "./ProductFileTypeIcon";

export function ProductFileManagerSurface({
  locale,
  onStartTask,
}: {
  locale: ProductPlaygroundLocale;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
}) {
  const zh = locale === "zh";
  const [surface, setSurface] = useState<"artifacts" | "workspace">(
    "artifacts",
  );
  const [selectedWorkbenchId, setSelectedWorkbenchId] = useState<string>();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs = [
    ["artifacts", zh ? "任务成果" : "Task artifacts", "document"],
    ["workspace", zh ? "工作区" : "Workspace", "folder"],
  ] as const;

  return (
    <section
      className="product-files"
      data-file-surface={surface}
      data-product-surface="files"
    >
      <header>
        <h1>{zh ? "我的文件" : "My files"}</h1>
        <p>
          {zh
            ? "集中查看任务成果，并在工作区中继续编辑和整理文件。"
            : "Review task artifacts, then continue editing and organizing them in the workspace."}
        </p>
      </header>
      <div aria-label={zh ? "文件视图" : "File view"} role="tablist">
        {tabs.map(([id, label, icon], index) => (
          <button
            aria-controls={`product-files-panel-${id}`}
            aria-selected={surface === id}
            id={`product-files-tab-${id}`}
            key={id}
            onClick={() => {
              if (id === "workspace") setSelectedWorkbenchId(undefined);
              setSurface(id);
            }}
            onKeyDown={(event) => {
              let nextIndex: number | undefined;
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                nextIndex = (index + 1) % tabs.length;
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                nextIndex = (index - 1 + tabs.length) % tabs.length;
              } else if (event.key === "Home") {
                nextIndex = 0;
              } else if (event.key === "End") {
                nextIndex = tabs.length - 1;
              }
              if (nextIndex === undefined) return;
              event.preventDefault();
              const next = tabs[nextIndex];
              if (!next) return;
              setSurface(next[0]);
              tabRefs.current[nextIndex]?.focus();
            }}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            role="tab"
            tabIndex={surface === id ? 0 : -1}
            type="button"
          >
            <ProductPlaygroundIcon name={icon} />
            {label}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`product-files-tab-${surface}`}
        className="product-files__panel"
        data-file-view={surface}
        id={`product-files-panel-${surface}`}
        role="tabpanel"
      >
        {surface === "artifacts" ? (
          <ProductFileArtifactsSurface
            locale={locale}
            onOpenWorkspace={(workspaceId) => {
              setSelectedWorkbenchId(workspaceId);
              setSurface("workspace");
            }}
            onStartTask={onStartTask}
          />
        ) : (
          <ProductWorkspaceFileManagerSurface
            initialWorkbenchId={selectedWorkbenchId}
            locale={locale}
            onWorkbenchClosed={() => setSelectedWorkbenchId(undefined)}
            onStartTask={onStartTask}
          />
        )}
      </div>
    </section>
  );
}

function ProductWorkspaceFileManagerSurface({
  initialWorkbenchId,
  locale,
  onWorkbenchClosed,
  onStartTask,
}: {
  initialWorkbenchId?: string;
  locale: ProductPlaygroundLocale;
  onWorkbenchClosed: () => void;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
}) {
  const {
    addDroppedFiles,
    breadcrumbs,
    clipboard,
    commitRename,
    confirmDelete,
    contextMenu,
    createFolder,
    current,
    currentId,
    deletePending,
    dropActive,
    duplicateEntries,
    entries,
    favoritesOnly,
    fileViewportRef,
    folderError,
    handleKeyboard,
    history,
    historyIndex,
    lastSelectedId,
    moveHistory,
    navigate,
    newFolderName,
    newFolderOpen,
    normalizedQuery,
    openEntry,
    paste,
    quickLook,
    query,
    renameId,
    renameValue,
    retryDroppedFile,
    searchScope,
    selectEntry,
    selectedEntries,
    selectedIds,
    setClipboard,
    setContextMenu,
    setDeletePending,
    setDropActive,
    setFavoritesOnly,
    setFolderError,
    setLastSelectedId,
    setNewFolderName,
    setNewFolderOpen,
    setQuery,
    setQuickLookId,
    setRenameId,
    setRenameValue,
    setSearchScope,
    setSelectedIds,
    setSortDirection,
    setSortField,
    setStatus,
    setView,
    setWorkbenchId,
    sortDirection,
    sortField,
    startRename,
    status,
    toggleFavorite,
    view,
    visibleEntries,
    workbenchEntry,
    zh,
  } = useProductFileManager(locale, initialWorkbenchId);

  const startTaskWithEntries = (
    selected: readonly (typeof selectedEntries)[number][],
  ) => {
    if (selected.length === 0) return;
    const labels = selected.map((entry) => entry.name);
    onStartTask({
      prompt: zh
        ? `检查并处理以下工作区资源：${labels.join("、")}。先说明将进行的操作和可能影响的文件。`
        : `Review and work with these workspace resources: ${labels.join(", ")}. Start by explaining the intended operations and affected files.`,
      resources: selected.map((entry) => ({
        id: `workspace:${entry.id}`,
        kind: entry.kind,
        label: entry.name,
        meta: `${entry.type} · ${entry.size}`,
      })),
      workspace: "ui",
    });
  };

  useEffect(() => {
    if (initialWorkbenchId) setWorkbenchId(initialWorkbenchId);
  }, [initialWorkbenchId, setWorkbenchId]);

  if (workbenchEntry?.kind === "file" && workbenchEntry.workbench) {
    return (
      <ProductFileWorkbench
        entry={workbenchEntry}
        key={workbenchEntry.id}
        locale={locale}
        onBack={() => {
          setWorkbenchId(undefined);
          setQuickLookId(workbenchEntry.id);
          onWorkbenchClosed();
        }}
      />
    );
  }

  return (
    <section
      aria-label={zh ? "文件管理器" : "File manager"}
      className="file-manager product-file-manager"
      data-file-manager-initialized="true"
      data-has-selection={selectedIds.size > 0 ? "true" : undefined}
      data-file-manager-view={view}
      data-state="ready"
    >
      <aside data-file-manager-sidebar>
        <header>
          <span>
            <ProductPlaygroundIcon name="files" />
          </span>
          <strong>{zh ? "文件" : "Files"}</strong>
        </header>
        <nav aria-label={zh ? "文件位置" : "File locations"}>
          <span>{zh ? "位置" : "Locations"}</span>
          <button
            aria-current={currentId === "root" ? "page" : undefined}
            onClick={() => navigate("root")}
            type="button"
          >
            <ProductPlaygroundIcon name="workspace" />
            {zh ? "工作空间" : "Workspace"}
          </button>
          <button
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="heart" />
            {zh ? "收藏" : "Favorites"}
          </button>
          <span>{zh ? "快速访问" : "Quick access"}</span>
          {entries
            .filter((entry) => entry.kind === "folder" && entry.favorite)
            .map((entry) => (
              <button
                aria-current={currentId === entry.id ? "page" : undefined}
                key={entry.id}
                onClick={() => navigate(entry.id)}
                type="button"
              >
                <ProductFileTypeIcon
                  entry={entry}
                  favorite={false}
                  size="navigation"
                />
                {entry.name}
              </button>
            ))}
        </nav>
        <footer>
          <span>{zh ? "本地工作空间" : "Local workspace"}</span>
          <strong>1.2 GB / 5 GB</strong>
          <div>
            <i />
          </div>
        </footer>
      </aside>

      <main>
        <header data-file-manager-header>
          <div data-file-navigation>
            <button
              aria-label={zh ? "后退" : "Back"}
              disabled={historyIndex === 0}
              onClick={() => moveHistory(-1)}
              type="button"
            >
              <ProductPlaygroundIcon name="back" />
            </button>
            <button
              aria-label={zh ? "前进" : "Forward"}
              disabled={historyIndex >= history.length - 1}
              onClick={() => moveHistory(1)}
              type="button"
            >
              <ProductPlaygroundIcon name="forward" />
            </button>
            <button
              aria-label={zh ? "上一级" : "Up one level"}
              disabled={!current?.parentId}
              onClick={() => current?.parentId && navigate(current.parentId)}
              type="button"
            >
              <ProductPlaygroundIcon name="up" />
            </button>
          </div>
          <nav
            aria-label={zh ? "当前位置" : "Current location"}
            data-file-manager-breadcrumb
          >
            {breadcrumbs.map((entry, index) => (
              <span key={entry.id}>
                {index > 0 ? <ProductPlaygroundIcon name="chevron" /> : null}
                <button
                  aria-current={entry.id === currentId ? "page" : undefined}
                  onClick={() => navigate(entry.id)}
                  type="button"
                >
                  {index === 0 ? (
                    <ProductPlaygroundIcon name="workspace" />
                  ) : null}
                  {entry.name}
                </button>
              </span>
            ))}
          </nav>
          <label data-file-search data-focus-owner="container">
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={zh ? "搜索文件" : "Search files"}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={
                searchScope === "current"
                  ? zh
                    ? "搜索当前文件夹"
                    : "Search this folder"
                  : zh
                    ? "搜索整个工作空间"
                    : "Search workspace"
              }
              type="search"
              value={query}
            />
            <button
              aria-label={zh ? "切换搜索范围" : "Change search scope"}
              onClick={() =>
                setSearchScope((scope) =>
                  scope === "current" ? "workspace" : "current",
                )
              }
              type="button"
            >
              {searchScope === "current"
                ? zh
                  ? "当前"
                  : "Folder"
                : zh
                  ? "全部"
                  : "All"}
            </button>
          </label>
        </header>

        <div data-file-manager-toolbar>
          <div>
            <button
              data-primary
              onClick={() => {
                setNewFolderOpen(true);
                setFolderError("");
              }}
              type="button"
            >
              <ProductFileTypeIcon
                entry={{ kind: "folder", name: newFolderName, type: "Folder" }}
                size="navigation"
              />
              {zh ? "新建文件夹" : "New folder"}
            </button>
            <label data-upload-action>
              <ProductPlaygroundIcon name="upload" />
              {zh ? "导入" : "Import"}
              <input
                aria-label={zh ? "导入文件" : "Import files"}
                multiple
                onChange={(event) => {
                  addDroppedFiles(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
                type="file"
              />
            </label>
            <button disabled={!clipboard} onClick={paste} type="button">
              <ProductPlaygroundIcon name="copy" />
              {zh ? "粘贴" : "Paste"}
            </button>
          </div>
          <div>
            <button
              aria-label={zh ? "切换排序字段" : "Change sort field"}
              onClick={() =>
                setSortField((field) =>
                  field === "name"
                    ? "modified"
                    : field === "modified"
                      ? "size"
                      : "name",
                )
              }
              type="button"
            >
              <ProductPlaygroundIcon name="sort" />
              {sortField === "name"
                ? zh
                  ? "名称"
                  : "Name"
                : sortField === "modified"
                  ? zh
                    ? "修改时间"
                    : "Modified"
                  : zh
                    ? "大小"
                    : "Size"}
            </button>
            <button
              aria-label={zh ? "切换排序方向" : "Reverse sort direction"}
              onClick={() =>
                setSortDirection((direction) =>
                  direction === "asc" ? "desc" : "asc",
                )
              }
              type="button"
            >
              {sortDirection === "asc" ? "A–Z" : "Z–A"}
            </button>
            <div
              aria-label={zh ? "文件视图" : "File view"}
              data-file-view-switcher
              role="group"
            >
              <button
                aria-label={zh ? "图标视图" : "Grid view"}
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                type="button"
              >
                <ProductPlaygroundIcon name="grid" />
              </button>
              <button
                aria-label={zh ? "列表视图" : "List view"}
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
                type="button"
              >
                <ProductPlaygroundIcon name="list" />
              </button>
            </div>
          </div>
        </div>

        {selectedIds.size > 0 ? (
          <section
            aria-label={zh ? "所选文件操作" : "Selected file actions"}
            data-file-manager-selection-toolbar
          >
            <strong>
              <span data-selection-count-full>
                {zh
                  ? `已选择 ${selectedIds.size} 项`
                  : `${selectedIds.size} selected`}
              </span>
              <span aria-hidden="true" data-selection-count-compact>
                {selectedIds.size}
              </span>
            </strong>
            <button
              aria-label={zh ? "用于任务" : "Use in task"}
              data-primary
              disabled={selectedEntries.some(
                (entry) =>
                  entry.transferState && entry.transferState !== "ready",
              )}
              onClick={() => startTaskWithEntries(selectedEntries)}
              type="button"
            >
              <ProductPlaygroundIcon name="task-add" />
              <span data-selection-action-label>
                {zh ? "用于任务" : "Use in task"}
              </span>
            </button>
            {selectedEntries.some(
              (entry) => entry.transferState === "error",
            ) ? (
              <button
                aria-label={zh ? "重试导入" : "Retry import"}
                onClick={() =>
                  selectedEntries
                    .filter((entry) => entry.transferState === "error")
                    .forEach(retryDroppedFile)
                }
                type="button"
              >
                <ProductPlaygroundIcon name="refresh" />
                <span data-selection-action-label>
                  {zh ? "重试导入" : "Retry import"}
                </span>
              </button>
            ) : null}
            <button
              aria-label={zh ? "复制" : "Copy"}
              onClick={() =>
                setClipboard({ ids: [...selectedIds], mode: "copy" })
              }
              type="button"
            >
              <ProductPlaygroundIcon name="copy" />
              <span data-selection-action-label>{zh ? "复制" : "Copy"}</span>
            </button>
            <button
              aria-label={zh ? "剪切" : "Cut"}
              onClick={() =>
                setClipboard({ ids: [...selectedIds], mode: "cut" })
              }
              type="button"
            >
              <ProductPlaygroundIcon name="cut" />
              <span data-selection-action-label>{zh ? "剪切" : "Cut"}</span>
            </button>
            <button
              aria-label={zh ? "收藏" : "Favorite"}
              onClick={() => toggleFavorite([...selectedIds])}
              type="button"
            >
              <ProductPlaygroundIcon name="heart" />
              <span data-selection-action-label>
                {zh ? "收藏" : "Favorite"}
              </span>
            </button>
            <button
              aria-label={zh ? "删除" : "Delete"}
              data-danger
              onClick={() => setDeletePending([...selectedIds])}
              type="button"
            >
              <ProductPlaygroundIcon name="trash" />
              <span data-selection-action-label>{zh ? "删除" : "Delete"}</span>
            </button>
            <button
              aria-label={zh ? "清除选择" : "Clear selection"}
              onClick={() => setSelectedIds(new Set())}
              type="button"
            >
              <ProductPlaygroundIcon name="close" />
            </button>
          </section>
        ) : null}

        <section
          aria-activedescendant={
            lastSelectedId ? productFileOptionId(lastSelectedId) : undefined
          }
          aria-multiselectable="true"
          aria-label={zh ? "文件内容" : "File contents"}
          data-file-manager-viewport
          data-view={view}
          onKeyDown={handleKeyboard}
          onContextMenu={(event) => event.preventDefault()}
          onDragEnter={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            setDropActive(true);
          }}
          onDragLeave={(event) => {
            if (
              event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              return;
            setDropActive(false);
          }}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDropActive(false);
            addDroppedFiles(Array.from(event.dataTransfer.files));
          }}
          role="listbox"
          ref={fileViewportRef}
          tabIndex={0}
        >
          {view === "list" ? (
            <header data-file-list-header>
              <span aria-hidden="true" data-file-icon-column />
              <span data-file-name>{zh ? "名称" : "Name"}</span>
              <span data-file-kind>{zh ? "类型" : "Kind"}</span>
              <span data-file-owner>{zh ? "所有者" : "Owner"}</span>
              <span data-file-modified>{zh ? "修改时间" : "Modified"}</span>
              <span data-file-size>{zh ? "大小" : "Size"}</span>
            </header>
          ) : null}
          {newFolderOpen ? (
            <form
              data-file-inline-editor
              onSubmit={(event) => {
                event.preventDefault();
                createFolder();
              }}
            >
              <ProductPlaygroundIcon name="folder" />
              <label>
                <span className="sr-only">
                  {zh ? "文件夹名称" : "Folder name"}
                </span>
                <input
                  autoFocus
                  onChange={(event) => {
                    setNewFolderName(event.currentTarget.value);
                    setFolderError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setNewFolderOpen(false);
                  }}
                  placeholder={zh ? "未命名文件夹" : "Untitled folder"}
                  value={newFolderName}
                />
              </label>
              <button
                aria-label={zh ? "创建文件夹" : "Create folder"}
                type="submit"
              >
                <ProductPlaygroundIcon name="check" />
              </button>
              <button
                aria-label={zh ? "取消" : "Cancel"}
                onClick={() => setNewFolderOpen(false)}
                type="button"
              >
                <ProductPlaygroundIcon name="close" />
              </button>
              {folderError ? <small role="alert">{folderError}</small> : null}
            </form>
          ) : null}
          {visibleEntries.map((entry) => (
            <article
              aria-selected={selectedIds.has(entry.id)}
              data-file-manager-item
              data-kind={entry.kind}
              data-transfer-state={entry.transferState}
              id={productFileOptionId(entry.id)}
              key={entry.id}
              onContextMenu={(event) => {
                event.preventDefault();
                setLastSelectedId(entry.id);
                setSelectedIds(new Set([entry.id]));
                setContextMenu({
                  id: entry.id,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onClick={(event) => {
                if (renameId === entry.id) return;
                selectEntry(entry, event);
              }}
              onDoubleClick={() => {
                if (renameId === entry.id) return;
                openEntry(entry);
              }}
              role="option"
            >
              {renameId === entry.id ? (
                <form
                  data-file-inline-editor
                  onSubmit={(event) => {
                    event.preventDefault();
                    commitRename();
                  }}
                >
                  <ProductFileTypeIcon
                    entry={entry}
                    favorite={false}
                    size={view === "grid" ? "grid" : "list"}
                  />
                  <input
                    autoFocus
                    aria-label={zh ? "新名称" : "New name"}
                    onChange={(event) =>
                      setRenameValue(event.currentTarget.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setRenameId(undefined);
                    }}
                    value={renameValue}
                  />
                  <button
                    aria-label={zh ? "确认重命名" : "Confirm rename"}
                    type="submit"
                  >
                    <ProductPlaygroundIcon name="check" />
                  </button>
                  <button
                    aria-label={zh ? "取消" : "Cancel"}
                    onClick={() => setRenameId(undefined)}
                    type="button"
                  >
                    <ProductPlaygroundIcon name="close" />
                  </button>
                </form>
              ) : (
                <div data-file-entry-control>
                  <ProductFileTypeIcon
                    entry={entry}
                    size={view === "grid" ? "grid" : "list"}
                  />
                  <strong data-file-name title={entry.name}>
                    {entry.name}
                  </strong>
                  <span
                    data-file-kind
                    data-file-transfer-state={
                      entry.transferState && entry.transferState !== "ready"
                        ? entry.transferState
                        : undefined
                    }
                  >
                    {entry.transferState === "copying"
                      ? zh
                        ? "正在导入"
                        : "Importing"
                      : entry.transferState === "error"
                        ? zh
                          ? "导入失败"
                          : "Import failed"
                        : entry.type}
                  </span>
                  <span data-file-owner>{entry.owner}</span>
                  <span data-file-modified>
                    {formatFileDate(entry.modified, locale)}
                  </span>
                  <span data-file-size>{entry.size}</span>
                </div>
              )}
            </article>
          ))}
          {visibleEntries.length === 0 && !newFolderOpen ? (
            <div data-file-manager-empty role="status">
              <ProductPlaygroundIcon
                name={normalizedQuery ? "search" : "folder"}
              />
              <strong>
                {normalizedQuery
                  ? zh
                    ? "没有匹配的文件"
                    : "No matching files"
                  : zh
                    ? "这个文件夹是空的"
                    : "This folder is empty"}
              </strong>
              <span>
                {normalizedQuery
                  ? zh
                    ? "更换关键词或搜索整个工作空间。"
                    : "Try another term or search the whole workspace."
                  : zh
                    ? "新建文件夹或从设备导入文件。"
                    : "Create a folder or import files from this device."}
              </span>
            </div>
          ) : null}
          {dropActive ? (
            <div data-file-dropzone>
              <ProductPlaygroundIcon name="upload" />
              <strong>{zh ? "松开即可导入" : "Drop to import"}</strong>
              <span>
                {zh
                  ? "文件将复制到当前文件夹。"
                  : "Files will be copied into this folder."}
              </span>
            </div>
          ) : null}
        </section>

        <footer data-file-manager-status>
          <span>
            {zh
              ? `${visibleEntries.length} 项`
              : `${visibleEntries.length} items`}
          </span>
          <output aria-live="polite">{status}</output>
          <span>{current?.name}</span>
        </footer>
      </main>

      {quickLook ? (
        <ProductFilePreviewDialog
          entry={quickLook}
          locale={locale}
          onClose={() => setQuickLookId(undefined)}
          onDownload={() =>
            setStatus(zh ? "下载已准备。" : "Download prepared.")
          }
          onOpen={
            quickLook.workbench &&
            (!quickLook.transferState || quickLook.transferState === "ready")
              ? () => setWorkbenchId(quickLook.id)
              : undefined
          }
          onRename={() => {
            startRename(quickLook);
            setQuickLookId(undefined);
          }}
          onRetry={
            quickLook.transferState === "error"
              ? () => retryDroppedFile(quickLook)
              : undefined
          }
          onUseInTask={() => startTaskWithEntries([quickLook])}
        />
      ) : null}

      {contextMenu ? (
        <div
          aria-label={zh ? "文件操作" : "File actions"}
          className="product-file-context-menu"
          role="menu"
          style={
            {
              "--context-x": `${contextMenu.x}px`,
              "--context-y": `${contextMenu.y}px`,
            } as CSSProperties
          }
        >
          <button
            onClick={() => {
              const entry = entries.find((item) => item.id === contextMenu.id);
              if (entry) startTaskWithEntries([entry]);
              setContextMenu(null);
            }}
            role="menuitem"
            type="button"
          >
            <ProductPlaygroundIcon name="task-add" />
            {zh ? "用于新任务" : "Use in new task"}
          </button>
          <hr />
          <button
            onClick={() => {
              const entry = entries.find((item) => item.id === contextMenu.id);
              if (!entry) return;
              if (
                entry.kind === "file" &&
                entry.workbench &&
                (!entry.transferState || entry.transferState === "ready")
              )
                setWorkbenchId(entry.id);
              else openEntry(entry);
              setContextMenu(null);
            }}
            role="menuitem"
            type="button"
          >
            <ProductPlaygroundIcon name="eye" />
            {zh ? "打开" : "Open"}
          </button>
          <button
            onClick={() => {
              const entry = entries.find((item) => item.id === contextMenu.id);
              if (entry) startRename(entry);
            }}
            role="menuitem"
            type="button"
          >
            <ProductPlaygroundIcon name="edit" />
            {zh ? "重命名" : "Rename"}
          </button>
          <button
            onClick={() => {
              duplicateEntries([contextMenu.id]);
              setContextMenu(null);
            }}
            role="menuitem"
            type="button"
          >
            <ProductPlaygroundIcon name="copy" />
            {zh ? "制作副本" : "Duplicate"}
          </button>
          <button
            onClick={() => toggleFavorite([contextMenu.id])}
            role="menuitem"
            type="button"
          >
            <ProductPlaygroundIcon name="heart" />
            {zh ? "切换收藏" : "Toggle favorite"}
          </button>
          <hr />
          <button
            data-danger
            onClick={() => {
              setDeletePending([contextMenu.id]);
              setContextMenu(null);
            }}
            role="menuitem"
            type="button"
          >
            <ProductPlaygroundIcon name="trash" />
            {zh ? "移到废纸篓" : "Move to Trash"}
          </button>
        </div>
      ) : null}

      <ProductFileDeleteDialog
        ids={deletePending}
        locale={locale}
        onCancel={() => setDeletePending([])}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function ProductFileDeleteDialog({
  ids,
  locale,
  onCancel,
  onConfirm,
}: {
  ids: readonly string[];
  locale: ProductPlaygroundLocale;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const zh = locale === "zh";
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (ids.length > 0 && !dialog.open) dialog.showModal();
    if (ids.length === 0 && dialog.open) dialog.close();
  }, [ids.length]);
  return (
    <dialog
      aria-labelledby="product-file-delete-title"
      className="product-file-delete-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      ref={dialogRef}
    >
      <ProductPlaygroundIcon name="trash" />
      <h2 id="product-file-delete-title">
        {zh
          ? `将 ${ids.length} 项移到废纸篓？`
          : `Move ${ids.length} item${ids.length === 1 ? "" : "s"} to Trash?`}
      </h2>
      <p>
        {zh
          ? "文件会从当前工作空间移除；宿主可提供恢复或永久删除流程。"
          : "Items leave the current workspace. The host can provide recovery or permanent deletion."}
      </p>
      <footer>
        <button onClick={onCancel} type="button">
          {zh ? "取消" : "Cancel"}
        </button>
        <button data-danger onClick={onConfirm} type="button">
          {zh ? "移到废纸篓" : "Move to Trash"}
        </button>
      </footer>
    </dialog>
  );
}
