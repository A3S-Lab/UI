import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  productFileEntries,
  type ProductFileEntry,
} from "./product-file-manager-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type FileView = "grid" | "list";
type SortField = "modified" | "name" | "size";

export function ProductFileManagerSurface({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [clipboard, setClipboard] = useState<{
    ids: string[];
    mode: "copy" | "cut";
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [currentId, setCurrentId] = useState("root");
  const [deletePending, setDeletePending] = useState<string[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [entries, setEntries] = useState<ProductFileEntry[]>(() => [
    ...productFileEntries,
  ]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [folderError, setFolderError] = useState("");
  const [history, setHistory] = useState(["root"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [lastSelectedId, setLastSelectedId] = useState<string>();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [query, setQuery] = useState("");
  const [quickLookId, setQuickLookId] = useState<string>();
  const [renameId, setRenameId] = useState<string>();
  const [renameValue, setRenameValue] = useState("");
  const [searchScope, setSearchScope] = useState<"current" | "workspace">(
    "current",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortField, setSortField] = useState<SortField>("name");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<FileView>("grid");
  const current = entries.find((entry) => entry.id === currentId);
  const quickLook = entries.find((entry) => entry.id === quickLookId);
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const visibleEntries = useMemo(() => {
    const candidates = entries.filter(
      (entry) =>
        entry.id !== "root" &&
        (searchScope === "workspace" && normalizedQuery
          ? true
          : entry.parentId === currentId),
    );
    return candidates
      .filter(
        (entry) =>
          (!favoritesOnly || entry.favorite) &&
          (!normalizedQuery ||
            `${entry.name} ${entry.type} ${entry.owner}`
              .toLocaleLowerCase(locale)
              .includes(normalizedQuery)),
      )
      .sort((left, right) => {
        if (left.kind !== right.kind) return left.kind === "folder" ? -1 : 1;
        const direction = sortDirection === "asc" ? 1 : -1;
        if (sortField === "size") {
          return (left.sizeBytes - right.sizeBytes) * direction;
        }
        const leftValue = sortField === "modified" ? left.modified : left.name;
        const rightValue = sortField === "modified" ? right.modified : right.name;
        return leftValue.localeCompare(rightValue, locale) * direction;
      });
  }, [currentId, entries, favoritesOnly, locale, normalizedQuery, searchScope, sortDirection, sortField]);
  const selectedEntries = entries.filter((entry) => selectedIds.has(entry.id));
  const breadcrumbs = buildBreadcrumbs(entries, currentId);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  const navigate = (id: string, record = true) => {
    const target = entries.find((entry) => entry.id === id);
    if (!target || target.kind !== "folder") return;
    setCurrentId(id);
    setSelectedIds(new Set());
    setQuickLookId(undefined);
    setContextMenu(null);
    setQuery("");
    if (record) {
      setHistory((currentHistory) => [
        ...currentHistory.slice(0, historyIndex + 1),
        id,
      ]);
      setHistoryIndex((index) => index + 1);
    }
  };

  const moveHistory = (offset: number) => {
    const nextIndex = historyIndex + offset;
    const id = history[nextIndex];
    if (!id) return;
    setHistoryIndex(nextIndex);
    navigate(id, false);
  };

  const selectEntry = (entry: ProductFileEntry, event: MouseEvent) => {
    setContextMenu(null);
    if (event.shiftKey && lastSelectedId) {
      const start = visibleEntries.findIndex((item) => item.id === lastSelectedId);
      const end = visibleEntries.findIndex((item) => item.id === entry.id);
      if (start >= 0 && end >= 0) {
        const [from, to] = start < end ? [start, end] : [end, start];
        setSelectedIds(
          new Set(visibleEntries.slice(from, to + 1).map((item) => item.id)),
        );
        return;
      }
    }
    if (event.metaKey || event.ctrlKey) {
      setSelectedIds((currentSelection) => {
        const next = new Set(currentSelection);
        if (next.has(entry.id)) next.delete(entry.id);
        else next.add(entry.id);
        return next;
      });
    } else {
      setSelectedIds(new Set([entry.id]));
    }
    setLastSelectedId(entry.id);
  };

  const openEntry = (entry: ProductFileEntry) => {
    if (entry.kind === "folder") navigate(entry.id);
    else setQuickLookId(entry.id);
  };

  const startRename = (entry: ProductFileEntry) => {
    setSelectedIds(new Set([entry.id]));
    setRenameId(entry.id);
    setRenameValue(entry.name);
    setContextMenu(null);
  };

  const commitRename = () => {
    const name = renameValue.trim();
    if (!renameId || !name) return;
    const duplicate = entries.some(
      (entry) =>
        entry.id !== renameId && entry.parentId === currentId && entry.name === name,
    );
    if (duplicate) {
      setStatus(zh ? "当前文件夹中已有同名项目。" : "An item with that name already exists here.");
      return;
    }
    setEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.id === renameId ? { ...entry, name } : entry,
      ),
    );
    setRenameId(undefined);
    setStatus(zh ? `已重命名为“${name}”。` : `Renamed to “${name}”.`);
  };

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) {
      setFolderError(zh ? "请输入文件夹名称。" : "Enter a folder name.");
      return;
    }
    if (entries.some((entry) => entry.parentId === currentId && entry.name === name)) {
      setFolderError(zh ? "当前文件夹中已有同名项目。" : "An item with that name already exists here.");
      return;
    }
    const id = `folder-${Date.now()}`;
    setEntries((currentEntries) => [
      ...currentEntries,
      {
        id,
        kind: "folder",
        modified: new Date().toISOString(),
        name,
        owner: zh ? "你" : "You",
        parentId: currentId,
        size: zh ? "0 项" : "0 items",
        sizeBytes: 0,
        type: zh ? "文件夹" : "Folder",
      },
    ]);
    setNewFolderOpen(false);
    setNewFolderName("");
    setFolderError("");
    setSelectedIds(new Set([id]));
    setStatus(zh ? `已创建文件夹“${name}”。` : `Folder “${name}” created.`);
  };

  const duplicateEntries = (ids: readonly string[], parentId = currentId) => {
    const additions = entries
      .filter((entry) => ids.includes(entry.id))
      .map((entry, index) => ({
        ...entry,
        favorite: false,
        id: `${entry.id}-copy-${Date.now()}-${index}`,
        modified: new Date().toISOString(),
        name: copyName(entry.name, locale),
        parentId,
      }));
    setEntries((currentEntries) => [...currentEntries, ...additions]);
    setSelectedIds(new Set(additions.map((entry) => entry.id)));
    setStatus(
      zh ? `已复制 ${additions.length} 项。` : `${additions.length} item${additions.length === 1 ? "" : "s"} duplicated.`,
    );
  };

  const paste = () => {
    if (!clipboard) return;
    if (clipboard.mode === "copy") duplicateEntries(clipboard.ids);
    else {
      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          clipboard.ids.includes(entry.id) ? { ...entry, parentId: currentId } : entry,
        ),
      );
      setClipboard(null);
      setStatus(zh ? "所选项目已移动到当前文件夹。" : "Selected items moved here.");
    }
  };

  const toggleFavorite = (ids: readonly string[]) => {
    const shouldFavorite = entries
      .filter((entry) => ids.includes(entry.id))
      .some((entry) => !entry.favorite);
    setEntries((currentEntries) =>
      currentEntries.map((entry) =>
        ids.includes(entry.id) ? { ...entry, favorite: shouldFavorite } : entry,
      ),
    );
    setContextMenu(null);
    setStatus(
      shouldFavorite
        ? zh
          ? "已添加到收藏。"
          : "Added to Favorites."
        : zh
          ? "已从收藏中移除。"
          : "Removed from Favorites.",
    );
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "a") {
      event.preventDefault();
      setSelectedIds(new Set(visibleEntries.map((entry) => entry.id)));
    } else if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (visibleEntries.length === 0) return;
      const currentIndex = Math.max(
        0,
        visibleEntries.findIndex((entry) => entry.id === lastSelectedId),
      );
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? visibleEntries.length - 1
            : ["ArrowDown", "ArrowRight"].includes(event.key)
              ? Math.min(currentIndex + 1, visibleEntries.length - 1)
              : Math.max(currentIndex - 1, 0);
      const next = visibleEntries[nextIndex];
      if (!next) return;
      setLastSelectedId(next.id);
      setSelectedIds(new Set([next.id]));
    } else if (event.key === " " && selectedEntries.length === 1) {
      event.preventDefault();
      setQuickLookId(selectedEntries[0]?.id);
    } else if (event.key === "Enter" && selectedEntries.length === 1) {
      event.preventDefault();
      openEntry(selectedEntries[0]!);
    } else if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.size > 0) {
      event.preventDefault();
      setDeletePending([...selectedIds]);
    } else if (event.key === "Escape") {
      setContextMenu(null);
      setQuickLookId(undefined);
      setSelectedIds(new Set());
    }
  };

  const addDroppedFiles = (files: readonly File[]) => {
    const additions = files.map((file, index) => ({
      id: `upload-${file.name}-${Date.now()}-${index}`,
      kind: "file" as const,
      modified: new Date().toISOString(),
      name: file.name,
      owner: zh ? "你" : "You",
      parentId: currentId,
      preview: {
        en: "Imported from this device into the current workspace folder.",
        zh: "已从此设备导入当前工作区文件夹。",
      },
      size: formatBytes(file.size),
      sizeBytes: file.size,
      type: file.name.split(".").pop()?.toLocaleUpperCase() || "File",
    }));
    setEntries((currentEntries) => [...currentEntries, ...additions]);
    setSelectedIds(new Set(additions.map((entry) => entry.id)));
    setStatus(
      zh ? `已导入 ${additions.length} 个文件。` : `${additions.length} file${additions.length === 1 ? "" : "s"} imported.`,
    );
  };

  return (
    <section
      aria-label={zh ? "文件管理器" : "File manager"}
      className="file-manager product-file-manager"
      data-file-manager-initialized="true"
      data-file-manager-view={view}
      data-state="ready"
    >
      <aside data-file-manager-sidebar>
        <header>
          <span><ProductPlaygroundIcon name="files" /></span>
          <strong>{zh ? "文件" : "Files"}</strong>
        </header>
        <nav aria-label={zh ? "文件位置" : "File locations"}>
          <span>{zh ? "位置" : "Locations"}</span>
          <button aria-current={currentId === "root" ? "page" : undefined} onClick={() => navigate("root")} type="button">
            <ProductPlaygroundIcon name="workspace" />
            {zh ? "工作空间" : "Workspace"}
          </button>
          <button aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)} type="button">
            <ProductPlaygroundIcon name="pin" />
            {zh ? "收藏" : "Favorites"}
          </button>
          <span>{zh ? "快速访问" : "Quick access"}</span>
          {entries
            .filter((entry) => entry.kind === "folder" && entry.favorite)
            .map((entry) => (
              <button aria-current={currentId === entry.id ? "page" : undefined} key={entry.id} onClick={() => navigate(entry.id)} type="button">
                <ProductPlaygroundIcon name="folder" />
                {entry.name}
              </button>
            ))}
        </nav>
        <footer>
          <span>{zh ? "本地工作空间" : "Local workspace"}</span>
          <strong>1.2 GB / 5 GB</strong>
          <div><i /></div>
        </footer>
      </aside>

      <main>
        <header data-file-manager-header>
          <div data-file-navigation>
            <button aria-label={zh ? "后退" : "Back"} disabled={historyIndex === 0} onClick={() => moveHistory(-1)} type="button">
              <ProductPlaygroundIcon name="back" />
            </button>
            <button aria-label={zh ? "前进" : "Forward"} disabled={historyIndex >= history.length - 1} onClick={() => moveHistory(1)} type="button">
              <ProductPlaygroundIcon name="forward" />
            </button>
            <button aria-label={zh ? "上一级" : "Up one level"} disabled={!current?.parentId} onClick={() => current?.parentId && navigate(current.parentId)} type="button">
              <ProductPlaygroundIcon name="up" />
            </button>
          </div>
          <nav aria-label={zh ? "当前位置" : "Current location"} data-file-manager-breadcrumb>
            {breadcrumbs.map((entry, index) => (
              <span key={entry.id}>
                {index > 0 ? <ProductPlaygroundIcon name="chevron" /> : null}
                <button aria-current={entry.id === currentId ? "page" : undefined} onClick={() => navigate(entry.id)} type="button">
                  {index === 0 ? <ProductPlaygroundIcon name="workspace" /> : null}
                  {entry.name}
                </button>
              </span>
            ))}
          </nav>
          <label data-file-search>
            <ProductPlaygroundIcon name="search" />
            <input aria-label={zh ? "搜索文件" : "Search files"} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={searchScope === "current" ? (zh ? "搜索当前文件夹" : "Search this folder") : zh ? "搜索整个工作空间" : "Search workspace"} type="search" value={query} />
            <button aria-label={zh ? "切换搜索范围" : "Change search scope"} onClick={() => setSearchScope((scope) => (scope === "current" ? "workspace" : "current"))} type="button">
              {searchScope === "current" ? (zh ? "当前" : "Folder") : zh ? "全部" : "All"}
            </button>
          </label>
        </header>

        <div data-file-manager-toolbar>
          <div>
            <button data-primary onClick={() => { setNewFolderOpen(true); setFolderError(""); }} type="button">
              <ProductPlaygroundIcon name="folder" />
              {zh ? "新建文件夹" : "New folder"}
            </button>
            <label data-upload-action>
              <ProductPlaygroundIcon name="upload" />
              {zh ? "导入" : "Import"}
              <input multiple onChange={(event) => { addDroppedFiles(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ""; }} type="file" />
            </label>
            <button disabled={!clipboard} onClick={paste} type="button">
              <ProductPlaygroundIcon name="copy" />
              {zh ? "粘贴" : "Paste"}
            </button>
          </div>
          <div>
            <button aria-label={zh ? "切换排序字段" : "Change sort field"} onClick={() => setSortField((field) => (field === "name" ? "modified" : field === "modified" ? "size" : "name"))} type="button">
              <ProductPlaygroundIcon name="sort" />
              {sortField === "name" ? (zh ? "名称" : "Name") : sortField === "modified" ? (zh ? "修改时间" : "Modified") : zh ? "大小" : "Size"}
            </button>
            <button aria-label={zh ? "切换排序方向" : "Reverse sort direction"} onClick={() => setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))} type="button">
              {sortDirection === "asc" ? "A–Z" : "Z–A"}
            </button>
            <div aria-label={zh ? "文件视图" : "File view"} role="group">
              <button aria-label={zh ? "图标视图" : "Grid view"} aria-pressed={view === "grid"} onClick={() => setView("grid")} type="button"><ProductPlaygroundIcon name="grid" /></button>
              <button aria-label={zh ? "列表视图" : "List view"} aria-pressed={view === "list"} onClick={() => setView("list")} type="button"><ProductPlaygroundIcon name="list" /></button>
            </div>
          </div>
        </div>

        {selectedIds.size > 0 ? (
          <section aria-label={zh ? "所选文件操作" : "Selected file actions"} data-file-manager-selection-toolbar>
            <strong>{zh ? `已选择 ${selectedIds.size} 项` : `${selectedIds.size} selected`}</strong>
            <button onClick={() => setClipboard({ ids: [...selectedIds], mode: "copy" })} type="button"><ProductPlaygroundIcon name="copy" />{zh ? "复制" : "Copy"}</button>
            <button onClick={() => setClipboard({ ids: [...selectedIds], mode: "cut" })} type="button"><ProductPlaygroundIcon name="arrow" />{zh ? "剪切" : "Cut"}</button>
            <button onClick={() => toggleFavorite([...selectedIds])} type="button"><ProductPlaygroundIcon name="pin" />{zh ? "收藏" : "Favorite"}</button>
            <button data-danger onClick={() => setDeletePending([...selectedIds])} type="button"><ProductPlaygroundIcon name="trash" />{zh ? "删除" : "Delete"}</button>
            <button aria-label={zh ? "清除选择" : "Clear selection"} onClick={() => setSelectedIds(new Set())} type="button"><ProductPlaygroundIcon name="close" /></button>
          </section>
        ) : null}

        <section
          aria-activedescendant={lastSelectedId ? fileOptionId(lastSelectedId) : undefined}
          aria-multiselectable="true"
          aria-label={zh ? "文件内容" : "File contents"}
          data-file-manager-viewport
          data-view={view}
          onKeyDown={handleKeyboard}
          onContextMenu={(event) => event.preventDefault()}
          onDragEnter={(event) => { if (!event.dataTransfer.types.includes("Files")) return; event.preventDefault(); setDropActive(true); }}
          onDragLeave={(event) => { if (event.currentTarget.contains(event.relatedTarget as Node | null)) return; setDropActive(false); }}
          onDragOver={(event) => { if (!event.dataTransfer.types.includes("Files")) return; event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
          onDrop={(event) => { event.preventDefault(); setDropActive(false); addDroppedFiles(Array.from(event.dataTransfer.files)); }}
          role="listbox"
          tabIndex={0}
        >
          {view === "list" ? (
            <header data-file-list-header>
              <span>{zh ? "名称" : "Name"}</span><span>{zh ? "类型" : "Kind"}</span><span>{zh ? "所有者" : "Owner"}</span><span>{zh ? "修改时间" : "Modified"}</span><span>{zh ? "大小" : "Size"}</span>
            </header>
          ) : null}
          {newFolderOpen ? (
            <form data-file-inline-editor onSubmit={(event) => { event.preventDefault(); createFolder(); }}>
              <ProductPlaygroundIcon name="folder" />
              <label><span className="sr-only">{zh ? "文件夹名称" : "Folder name"}</span><input autoFocus onChange={(event) => { setNewFolderName(event.currentTarget.value); setFolderError(""); }} onKeyDown={(event) => { if (event.key === "Escape") setNewFolderOpen(false); }} placeholder={zh ? "未命名文件夹" : "Untitled folder"} value={newFolderName} /></label>
              <button type="submit"><ProductPlaygroundIcon name="check" /></button>
              <button aria-label={zh ? "取消" : "Cancel"} onClick={() => setNewFolderOpen(false)} type="button"><ProductPlaygroundIcon name="close" /></button>
              {folderError ? <small role="alert">{folderError}</small> : null}
            </form>
          ) : null}
          {visibleEntries.map((entry) => (
            <article aria-selected={selectedIds.has(entry.id)} data-file-manager-item data-kind={entry.kind} id={fileOptionId(entry.id)} key={entry.id} onContextMenu={(event) => { event.preventDefault(); setLastSelectedId(entry.id); setSelectedIds(new Set([entry.id])); setContextMenu({ id: entry.id, x: event.clientX, y: event.clientY }); }} role="option">
              {renameId === entry.id ? (
                <form data-file-inline-editor onSubmit={(event) => { event.preventDefault(); commitRename(); }}>
                  <ProductPlaygroundIcon name={entry.kind === "folder" ? "folder" : "document"} />
                  <input autoFocus aria-label={zh ? "新名称" : "New name"} onChange={(event) => setRenameValue(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Escape") setRenameId(undefined); }} value={renameValue} />
                  <button type="submit"><ProductPlaygroundIcon name="check" /></button>
                  <button aria-label={zh ? "取消" : "Cancel"} onClick={() => setRenameId(undefined)} type="button"><ProductPlaygroundIcon name="close" /></button>
                </form>
              ) : (
                <button onClick={(event) => selectEntry(entry, event)} onDoubleClick={() => openEntry(entry)} tabIndex={-1} type="button">
                  <span data-file-icon><ProductPlaygroundIcon name={entry.kind === "folder" ? "folder" : entry.type.includes("image") ? "eye" : "document"} />{entry.favorite ? <ProductPlaygroundIcon data-favorite name="pin" /> : null}</span>
                  <strong title={entry.name}>{entry.name}</strong>
                  <span data-file-kind>{entry.type}</span><span data-file-owner>{entry.owner}</span><span data-file-modified>{formatDate(entry.modified, locale)}</span><span data-file-size>{entry.size}</span>
                </button>
              )}
            </article>
          ))}
          {visibleEntries.length === 0 && !newFolderOpen ? (
            <div data-file-manager-empty role="status"><ProductPlaygroundIcon name={normalizedQuery ? "search" : "folder"} /><strong>{normalizedQuery ? (zh ? "没有匹配的文件" : "No matching files") : zh ? "这个文件夹是空的" : "This folder is empty"}</strong><span>{normalizedQuery ? (zh ? "更换关键词或搜索整个工作空间。" : "Try another term or search the whole workspace.") : zh ? "新建文件夹或从设备导入文件。" : "Create a folder or import files from this device."}</span></div>
          ) : null}
          {dropActive ? <div data-file-dropzone><ProductPlaygroundIcon name="upload" /><strong>{zh ? "松开即可导入" : "Drop to import"}</strong><span>{zh ? "文件将复制到当前文件夹。" : "Files will be copied into this folder."}</span></div> : null}
        </section>

        <footer data-file-manager-status><span>{zh ? `${visibleEntries.length} 项` : `${visibleEntries.length} items`}</span><output aria-live="polite">{status}</output><span>{current?.name}</span></footer>
      </main>

      {quickLook ? (
        <aside aria-label={zh ? `快速查看 ${quickLook.name}` : `Quick Look ${quickLook.name}`} data-file-manager-quicklook>
          <header><span><ProductPlaygroundIcon name="eye" /><strong>{zh ? "快速查看" : "Quick Look"}</strong></span><button aria-label={zh ? "关闭快速查看" : "Close Quick Look"} onClick={() => setQuickLookId(undefined)} type="button"><ProductPlaygroundIcon name="close" /></button></header>
          <div data-quicklook-preview><span><ProductPlaygroundIcon name={quickLook.kind === "folder" ? "folder" : "document"} /></span><h2>{quickLook.name}</h2><pre>{quickLook.preview?.[locale] ?? (zh ? "此项目没有可用预览。" : "No preview is available for this item.")}</pre></div>
          <dl><div><dt>{zh ? "类型" : "Kind"}</dt><dd>{quickLook.type}</dd></div><div><dt>{zh ? "大小" : "Size"}</dt><dd>{quickLook.size}</dd></div><div><dt>{zh ? "修改" : "Modified"}</dt><dd>{formatDate(quickLook.modified, locale)}</dd></div></dl>
          <footer><button onClick={() => startRename(quickLook)} type="button"><ProductPlaygroundIcon name="edit" />{zh ? "重命名" : "Rename"}</button><button onClick={() => setStatus(zh ? "下载已准备。" : "Download prepared.")} type="button"><ProductPlaygroundIcon name="download" />{zh ? "下载" : "Download"}</button></footer>
        </aside>
      ) : null}

      {contextMenu ? (
        <div aria-label={zh ? "文件操作" : "File actions"} className="product-file-context-menu" role="menu" style={{ "--context-x": `${contextMenu.x}px`, "--context-y": `${contextMenu.y}px` } as CSSProperties}>
          <button onClick={() => { const entry = entries.find((item) => item.id === contextMenu.id); if (entry) openEntry(entry); }} role="menuitem" type="button"><ProductPlaygroundIcon name="eye" />{zh ? "打开" : "Open"}</button>
          <button onClick={() => { const entry = entries.find((item) => item.id === contextMenu.id); if (entry) startRename(entry); }} role="menuitem" type="button"><ProductPlaygroundIcon name="edit" />{zh ? "重命名" : "Rename"}</button>
          <button onClick={() => { duplicateEntries([contextMenu.id]); setContextMenu(null); }} role="menuitem" type="button"><ProductPlaygroundIcon name="copy" />{zh ? "制作副本" : "Duplicate"}</button>
          <button onClick={() => toggleFavorite([contextMenu.id])} role="menuitem" type="button"><ProductPlaygroundIcon name="pin" />{zh ? "切换收藏" : "Toggle favorite"}</button>
          <hr />
          <button data-danger onClick={() => { setDeletePending([contextMenu.id]); setContextMenu(null); }} role="menuitem" type="button"><ProductPlaygroundIcon name="trash" />{zh ? "移到废纸篓" : "Move to Trash"}</button>
        </div>
      ) : null}

      <ProductFileDeleteDialog ids={deletePending} locale={locale} onCancel={() => setDeletePending([])} onConfirm={() => { const targets = collectDescendants(entries, deletePending); setEntries((currentEntries) => currentEntries.filter((entry) => !targets.has(entry.id))); setSelectedIds(new Set()); setQuickLookId(undefined); setDeletePending([]); setStatus(zh ? `已将 ${targets.size} 项移到废纸篓。` : `${targets.size} item${targets.size === 1 ? "" : "s"} moved to Trash.`); }} />
    </section>
  );
}

function ProductFileDeleteDialog({ ids, locale, onCancel, onConfirm }: { ids: readonly string[]; locale: ProductPlaygroundLocale; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const zh = locale === "zh";
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (ids.length > 0 && !dialog.open) dialog.showModal();
    if (ids.length === 0 && dialog.open) dialog.close();
  }, [ids.length]);
  return <dialog aria-labelledby="product-file-delete-title" className="product-file-delete-dialog" onCancel={(event) => { event.preventDefault(); onCancel(); }} ref={dialogRef}><ProductPlaygroundIcon name="trash" /><h2 id="product-file-delete-title">{zh ? `将 ${ids.length} 项移到废纸篓？` : `Move ${ids.length} item${ids.length === 1 ? "" : "s"} to Trash?`}</h2><p>{zh ? "文件会从当前工作空间移除；宿主可提供恢复或永久删除流程。" : "Items leave the current workspace. The host can provide recovery or permanent deletion."}</p><footer><button onClick={onCancel} type="button">{zh ? "取消" : "Cancel"}</button><button data-danger onClick={onConfirm} type="button">{zh ? "移到废纸篓" : "Move to Trash"}</button></footer></dialog>;
}

function buildBreadcrumbs(entries: readonly ProductFileEntry[], id: string) { const result: ProductFileEntry[] = []; let current = entries.find((entry) => entry.id === id); while (current) { result.unshift(current); current = current.parentId ? entries.find((entry) => entry.id === current?.parentId) : undefined; } return result; }
function collectDescendants(entries: readonly ProductFileEntry[], ids: readonly string[]) { const targets = new Set(ids); let changed = true; while (changed) { changed = false; entries.forEach((entry) => { if (entry.parentId && targets.has(entry.parentId) && !targets.has(entry.id)) { targets.add(entry.id); changed = true; } }); } return targets; }
function copyName(name: string, locale: ProductPlaygroundLocale) { const dot = name.lastIndexOf("."); if (dot <= 0) return `${name} ${locale === "zh" ? "副本" : "copy"}`; return `${name.slice(0, dot)} ${locale === "zh" ? "副本" : "copy"}${name.slice(dot)}`; }
function formatBytes(value: number) { if (value < 1024) return `${value} B`; if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`; return `${(value / (1024 * 1024)).toFixed(1)} MB`; }
function formatDate(value: string, locale: ProductPlaygroundLocale) { return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" }).format(new Date(value)); }
function fileOptionId(value: string) { return `product-file-option-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`; }
