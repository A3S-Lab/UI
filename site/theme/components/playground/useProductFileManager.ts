import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  productFileEntries,
  type ProductFileEntry,
} from "./product-file-manager-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  inferProductWorkspaceFileWorkbench,
  moveProductWorkspaceFile,
  productWorkspaceFileType,
  queueProductWorkspaceFiles,
  removeProductWorkspaceFiles,
  renameProductWorkspaceFile,
  retryProductWorkspaceFile,
  useProductWorkspaceFiles,
  type ProductWorkspaceFile,
} from "./product-workspace-files";

export type ProductFileView = "grid" | "list";
export type ProductFileSortField = "modified" | "name" | "size";

export function useProductFileManager(
  locale: ProductPlaygroundLocale,
  initialWorkbenchId?: string,
) {
  const zh = locale === "zh";
  const workspaceFiles = useProductWorkspaceFiles();
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
    ...workspaceFiles.map((record) => workspaceFileEntry(record, locale)),
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
  const [sortField, setSortField] = useState<ProductFileSortField>("name");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<ProductFileView>("list");
  const [workbenchId, setWorkbenchId] = useState<string | undefined>(
    initialWorkbenchId,
  );
  const fileViewportRef = useRef<HTMLElement>(null);
  const quickLookWasOpenRef = useRef(false);

  const current = entries.find((entry) => entry.id === currentId);
  const quickLook = entries.find((entry) => entry.id === quickLookId);
  const workbenchEntry = entries.find((entry) => entry.id === workbenchId);
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
        const rightValue =
          sortField === "modified" ? right.modified : right.name;
        return leftValue.localeCompare(rightValue, locale) * direction;
      });
  }, [
    currentId,
    entries,
    favoritesOnly,
    locale,
    normalizedQuery,
    searchScope,
    sortDirection,
    sortField,
  ]);
  const selectedEntries = entries.filter((entry) => selectedIds.has(entry.id));
  const breadcrumbs = buildBreadcrumbs(entries, currentId);
  const quickLookModalOpen = Boolean(quickLook);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  useEffect(() => {
    if (quickLookModalOpen) {
      quickLookWasOpenRef.current = true;
      return;
    }
    if (!quickLookWasOpenRef.current) return;
    quickLookWasOpenRef.current = false;
    if (renameId) return;
    const frame = window.requestAnimationFrame(() =>
      fileViewportRef.current?.focus(),
    );
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [quickLookModalOpen, renameId]);

  useEffect(() => {
    setEntries((currentEntries) => {
      const persistentEntries = currentEntries.filter(
        (entry) => !entry.workspaceFileId,
      );
      const importedEntries = workspaceFiles.map((record) => {
        const currentEntry = currentEntries.find(
          (entry) => entry.workspaceFileId === record.id,
        );
        return {
          ...workspaceFileEntry(record, locale),
          ...(currentEntry?.favorite ? { favorite: true } : {}),
        };
      });
      return [...persistentEntries, ...importedEntries];
    });
  }, [locale, workspaceFiles]);

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
      const start = visibleEntries.findIndex(
        (item) => item.id === lastSelectedId,
      );
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
    if (entry.transferState === "copying") {
      setStatus(
        zh
          ? "文件仍在复制到工作区，请稍候。"
          : "The file is still being copied into the workspace.",
      );
      return;
    }
    if (entry.transferState === "error") {
      setStatus(
        zh
          ? "文件导入失败，请重试或移除。"
          : "The file import failed. Retry or remove it.",
      );
      return;
    }
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
        entry.id !== renameId &&
        entry.parentId === currentId &&
        entry.name === name,
    );
    if (duplicate) {
      setStatus(
        zh
          ? "当前文件夹中已有同名项目。"
          : "An item with that name already exists here.",
      );
      return;
    }
    const target = entries.find((entry) => entry.id === renameId);
    if (target?.workspaceFileId) {
      renameProductWorkspaceFile(target.workspaceFileId, name);
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
    if (
      entries.some(
        (entry) => entry.parentId === currentId && entry.name === name,
      )
    ) {
      setFolderError(
        zh
          ? "当前文件夹中已有同名项目。"
          : "An item with that name already exists here.",
      );
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
      zh
        ? `已复制 ${additions.length} 项。`
        : `${additions.length} item${additions.length === 1 ? "" : "s"} duplicated.`,
    );
  };

  const paste = () => {
    if (!clipboard) return;
    if (clipboard.mode === "copy") duplicateEntries(clipboard.ids);
    else {
      entries
        .filter(
          (entry) => clipboard.ids.includes(entry.id) && entry.workspaceFileId,
        )
        .forEach((entry) =>
          moveProductWorkspaceFile(entry.workspaceFileId!, currentId),
        );
      setEntries((currentEntries) =>
        currentEntries.map((entry) =>
          clipboard.ids.includes(entry.id)
            ? { ...entry, parentId: currentId }
            : entry,
        ),
      );
      setClipboard(null);
      setStatus(
        zh ? "所选项目已移动到当前文件夹。" : "Selected items moved here.",
      );
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
    if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLocaleLowerCase() === "a"
    ) {
      event.preventDefault();
      setSelectedIds(new Set(visibleEntries.map((entry) => entry.id)));
    } else if (
      [
        "ArrowDown",
        "ArrowRight",
        "ArrowUp",
        "ArrowLeft",
        "Home",
        "End",
      ].includes(event.key)
    ) {
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
    } else if (
      (event.key === "Delete" || event.key === "Backspace") &&
      selectedIds.size > 0
    ) {
      event.preventDefault();
      setDeletePending([...selectedIds]);
    } else if (event.key === "Escape") {
      setContextMenu(null);
      setQuickLookId(undefined);
      setSelectedIds(new Set());
    }
  };

  const addDroppedFiles = (files: readonly File[]) => {
    if (files.length === 0) return;
    const batch = queueProductWorkspaceFiles(files, {
      parentId: currentId,
      workspace: "ui",
    });
    setSelectedIds(new Set(batch.records.map((record) => record.id)));
    setStatus(
      batch.rejected.length > 0
        ? zh
          ? `${batch.rejected.length} 个文件不符合导入限制，其余文件正在复制。`
          : `${batch.rejected.length} file${batch.rejected.length === 1 ? "" : "s"} did not meet the import limits. The rest are copying.`
        : zh
          ? `正在导入 ${batch.records.length} 个文件…`
          : `Importing ${batch.records.length} file${batch.records.length === 1 ? "" : "s"}…`,
    );
    void batch.completion.then((records) => {
      const failed = records.filter((record) => record.state === "error");
      setStatus(
        failed.length > 0
          ? zh
            ? `${failed.length} 个文件导入失败，可选择后重试。`
            : `${failed.length} file${failed.length === 1 ? "" : "s"} failed to import. Select them to retry.`
          : zh
            ? `${records.length} 个文件已复制到当前工作区文件夹。`
            : `${records.length} file${records.length === 1 ? "" : "s"} copied into this workspace folder.`,
      );
    });
  };

  const retryDroppedFile = (entry: ProductFileEntry) => {
    if (!entry.workspaceFileId) return;
    setStatus(zh ? `正在重试“${entry.name}”…` : `Retrying “${entry.name}”…`);
    void retryProductWorkspaceFile(entry.workspaceFileId).then((record) => {
      setStatus(
        record.state === "ready"
          ? zh
            ? `“${record.name}”已复制到工作区。`
            : `“${record.name}” was copied into the workspace.`
          : zh
            ? `仍无法读取“${record.name}”。`
            : `“${record.name}” still could not be read.`,
      );
    });
  };

  const confirmDelete = () => {
    const targets = collectDescendants(entries, deletePending);
    const workspaceFileIds = entries.flatMap((entry) =>
      targets.has(entry.id) && entry.workspaceFileId
        ? [entry.workspaceFileId]
        : [],
    );
    removeProductWorkspaceFiles(workspaceFileIds);
    setEntries((currentEntries) =>
      currentEntries.filter((entry) => !targets.has(entry.id)),
    );
    setSelectedIds(new Set());
    setQuickLookId(undefined);
    setDeletePending([]);
    setStatus(
      zh
        ? `已将 ${targets.size} 项移到废纸篓。`
        : `${targets.size} item${targets.size === 1 ? "" : "s"} moved to Trash.`,
    );
  };

  return {
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
  };
}

function buildBreadcrumbs(entries: readonly ProductFileEntry[], id: string) {
  const result: ProductFileEntry[] = [];
  let current = entries.find((entry) => entry.id === id);
  while (current) {
    result.unshift(current);
    current = current.parentId
      ? entries.find((entry) => entry.id === current?.parentId)
      : undefined;
  }
  return result;
}

function collectDescendants(
  entries: readonly ProductFileEntry[],
  ids: readonly string[],
) {
  const targets = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    entries.forEach((entry) => {
      if (
        entry.parentId &&
        targets.has(entry.parentId) &&
        !targets.has(entry.id)
      ) {
        targets.add(entry.id);
        changed = true;
      }
    });
  }
  return targets;
}

function copyName(name: string, locale: ProductPlaygroundLocale) {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return `${name} ${locale === "zh" ? "副本" : "copy"}`;
  return `${name.slice(0, dot)} ${locale === "zh" ? "副本" : "copy"}${name.slice(dot)}`;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function workspaceFileEntry(
  record: ProductWorkspaceFile,
  locale: ProductPlaygroundLocale,
): ProductFileEntry {
  const zh = locale === "zh";
  return {
    id: record.id,
    kind: "file",
    modified: record.importedAt,
    name: record.name,
    owner: zh ? "你" : "You",
    parentId: record.parentId,
    preview: {
      en:
        record.state === "ready"
          ? "Imported from this device and available to workspace tasks."
          : record.state === "copying"
            ? "This file is being copied into the workspace."
            : "The browser could not read this file. Retry the import or remove it.",
      zh:
        record.state === "ready"
          ? "已从此设备导入，可供工作区任务使用。"
          : record.state === "copying"
            ? "正在将此文件复制到工作区。"
            : "浏览器无法读取此文件，请重试导入或移除。",
    },
    size: formatBytes(record.file.size),
    sizeBytes: record.file.size,
    transferError: record.errorCode,
    transferState: record.state,
    type: productWorkspaceFileType(record.name),
    workbench: inferProductWorkspaceFileWorkbench(record.name),
    workspaceFileId: record.id,
  };
}

export function formatFileDate(value: string, locale: ProductPlaygroundLocale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function productFileOptionId(value: string) {
  return `product-file-option-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
