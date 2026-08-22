import { preloadOfficeEditor } from "@a3s-lab/office/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type {
  ProductFileEntry,
  ProductFileWorkbenchKind,
} from "./product-file-manager-data";
import type {
  ProductLocalizedText,
  ProductPlaygroundLocale,
} from "./product-playground-data";
import { ProductFileWorkbench } from "./ProductFileWorkbench";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type ProjectAssetKind = "document" | "folder";
type ProjectAssetFilter = "all" | "document" | "folder";

type ProjectAsset = {
  id: string;
  kind: ProjectAssetKind;
  name: string;
  owner: string;
  parentId: string | null;
  preview?: ProductLocalizedText;
  sizeBytes: number;
  type: ProductLocalizedText;
  updated: ProductLocalizedText;
  workbench?: ProductFileWorkbenchKind;
};

const STORAGE_LIMIT_BYTES = 5_000_000_000;

const initialProjectAssets: readonly ProjectAsset[] = [
  {
    id: "visual-acceptance",
    kind: "folder",
    name: "visual-acceptance",
    owner: "Rui",
    parentId: null,
    sizeBytes: 0,
    type: { en: "Folder", zh: "文件夹" },
    updated: { en: "Today", zh: "今天" },
  },
  {
    id: "design-md",
    kind: "document",
    name: "DESIGN.md",
    owner: "Rui",
    parentId: null,
    preview: {
      en: "# A3S UI Design System\n\nA precise, framework-independent interface system for intelligent work.",
      zh: "# A3S UI 设计系统\n\n面向智能工作的精确、框架无关界面系统。",
    },
    sizeBytes: 18_432,
    type: { en: "Markdown", zh: "Markdown" },
    updated: { en: "Today", zh: "今天" },
    workbench: "code",
  },
  {
    id: "project-workflow-acl",
    kind: "document",
    name: "product-project-workflow.acl",
    owner: "A3S",
    parentId: null,
    preview: {
      en: 'suite "a3s-ui-product-project-workflow" {\n    version = 1\n}',
      zh: 'suite "a3s-ui-product-project-workflow" {\n    version = 1\n}',
    },
    sizeBytes: 12_288,
    type: { en: "ACL", zh: "ACL" },
    updated: { en: "Yesterday", zh: "昨天" },
    workbench: "code",
  },
  {
    id: "experience-brief",
    kind: "document",
    name: "experience-brief.docx",
    owner: "Mina",
    parentId: null,
    preview: {
      en: "Product experience brief with goals, acceptance criteria, and tracked review decisions.",
      zh: "包含目标、验收标准与评审决策的产品体验说明。",
    },
    sizeBytes: 88_064,
    type: { en: "Word document", zh: "Word 文档" },
    updated: { en: "Monday", zh: "周一" },
    workbench: "document",
  },
  {
    id: "release-readiness",
    kind: "document",
    name: "release-readiness.md",
    owner: "A3S",
    parentId: null,
    preview: {
      en: "# Release readiness\n\nReview route continuity, interaction states, and visual evidence before release.",
      zh: "# 发布就绪\n\n发布前核对路由连续性、交互状态与视觉证据。",
    },
    sizeBytes: 8_192,
    type: { en: "Markdown", zh: "Markdown" },
    updated: { en: "Monday", zh: "周一" },
    workbench: "code",
  },
  {
    id: "visual-report",
    kind: "document",
    name: "visual-acceptance-report.pdf",
    owner: "A3S",
    parentId: "visual-acceptance",
    preview: {
      en: "Bounded desktop, mobile, focus, and overlay acceptance evidence.",
      zh: "桌面、移动、焦点与浮层的有界验收证据。",
    },
    sizeBytes: 3_984_588,
    type: { en: "PDF", zh: "PDF" },
    updated: { en: "Today", zh: "今天" },
    workbench: "pdf",
  },
  {
    id: "mobile-evidence",
    kind: "document",
    name: "project-mobile-evidence.png",
    owner: "A3S",
    parentId: "visual-acceptance",
    preview: {
      en: "Project workspace evidence captured at a 390 × 844 viewport.",
      zh: "在 390 × 844 视口采集的项目工作区证据。",
    },
    sizeBytes: 1_248_600,
    type: { en: "PNG image", zh: "PNG 图片" },
    updated: { en: "Today", zh: "今天" },
  },
];

function formatBytes(bytes: number, locale: ProductPlaygroundLocale) {
  if (bytes === 0) return "—";
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  return `${(bytes / 1_000_000).toLocaleString(locale, {
    maximumFractionDigits: 1,
  })} MB`;
}

function uploadedWorkbench(name: string): ProductFileWorkbenchKind {
  const extension = name.split(".").pop()?.toLocaleLowerCase() ?? "";
  if (extension === "doc" || extension === "docx") return "document";
  if (extension === "xls" || extension === "xlsx" || extension === "csv") {
    return "spreadsheet";
  }
  if (extension === "ppt" || extension === "pptx") return "presentation";
  if (extension === "pdf") return "pdf";
  return "code";
}

function uploadedType(name: string): ProductLocalizedText {
  const labels: Record<ProductFileWorkbenchKind, ProductLocalizedText> = {
    code: { en: "Code or text", zh: "代码或文本" },
    document: { en: "Word document", zh: "Word 文档" },
    pdf: { en: "PDF", zh: "PDF" },
    presentation: { en: "Presentation", zh: "演示文稿" },
    spreadsheet: { en: "Spreadsheet", zh: "表格" },
  };
  return labels[uploadedWorkbench(name)];
}

function toFileEntry(
  asset: ProjectAsset,
  locale: ProductPlaygroundLocale,
): ProductFileEntry | null {
  if (asset.kind !== "document" || !asset.workbench) return null;
  return {
    id: `project:${asset.id}`,
    kind: "file",
    modified: new Date().toISOString(),
    name: asset.name,
    owner: asset.owner,
    parentId: "project-assets",
    preview: asset.preview,
    size: formatBytes(asset.sizeBytes, locale),
    sizeBytes: asset.sizeBytes,
    type: asset.type[locale],
    workbench: asset.workbench,
  };
}

export function ProductProjectAssetsWorkspace({
  locale,
  onCreateTask,
}: {
  locale: ProductPlaygroundLocale;
  onCreateTask: (assets: readonly ProjectAsset[]) => void;
}) {
  const zh = locale === "zh";
  const [assets, setAssets] = useState<ProjectAsset[]>([
    ...initialProjectAssets,
  ]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectAssetFilter>("all");
  const [folderName, setFolderName] = useState("");
  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [openedEntry, setOpenedEntry] = useState<ProductFileEntry | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);
  const lastOpenedAssetId = useRef<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const workbenchDialogRef = useRef<HTMLDialogElement>(null);

  const currentFolder = assets.find((asset) => asset.id === currentFolderId);
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const visibleAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          asset.parentId === currentFolderId &&
          (filter === "all" || asset.kind === filter) &&
          (!normalizedQuery ||
            `${asset.name} ${asset.type.en} ${asset.type.zh} ${asset.owner}`
              .toLocaleLowerCase(locale)
              .includes(normalizedQuery)),
      ),
    [assets, currentFolderId, filter, locale, normalizedQuery],
  );
  const selectedAssets = assets.filter((asset) => selectedIds.has(asset.id));
  const allVisibleSelected =
    visibleAssets.length > 0 &&
    visibleAssets.every((asset) => selectedIds.has(asset.id));
  const someVisibleSelected = visibleAssets.some((asset) =>
    selectedIds.has(asset.id),
  );
  const usedBytes = assets.reduce((total, asset) => total + asset.sizeBytes, 0);

  useEffect(() => {
    const dialog = workbenchDialogRef.current;
    if (!dialog) return;
    if (openedEntry && !dialog.open) dialog.showModal();
    if (!openedEntry && dialog.open) dialog.close();
  }, [openedEntry]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate =
      someVisibleSelected && !allVisibleSelected;
  }, [allVisibleSelected, someVisibleSelected]);

  useEffect(() => {
    const visibleIds = new Set(visibleAssets.map((asset) => asset.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleAssets]);

  useEffect(() => {
    if (!folderFormOpen) return;
    const frame = window.requestAnimationFrame(() =>
      folderInputRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [folderFormOpen]);

  const openAsset = (asset: ProjectAsset) => {
    if (asset.kind === "folder") {
      setCurrentFolderId(asset.id);
      setFilter("all");
      setQuery("");
      setSelectedIds(new Set());
      setStatus(zh ? `已打开 ${asset.name}` : `Opened ${asset.name}`);
      return;
    }
    const entry = toFileEntry(asset, locale);
    if (!entry) {
      setStatus(
        zh
          ? `${asset.name} 可作为任务上下文使用，当前不支持直接预览。`
          : `${asset.name} can be used as task context but has no direct preview.`,
      );
      return;
    }
    if (entry.workbench && entry.workbench !== "code") {
      void preloadOfficeEditor(entry.workbench).catch(() => undefined);
    }
    lastOpenedAssetId.current = asset.id;
    setOpenedEntry(entry);
  };

  const preloadAsset = (asset: ProjectAsset) => {
    if (!asset.workbench || asset.workbench === "code") return;
    void preloadOfficeEditor(asset.workbench).catch(() => undefined);
  };

  const restoreAssetFocus = () => {
    const restoreId = lastOpenedAssetId.current;
    setOpenedEntry(null);
    window.requestAnimationFrame(() => {
      if (!restoreId) return;
      document
        .querySelector<HTMLButtonElement>(
          `[data-asset-id="${CSS.escape(restoreId)}"] [data-asset-open]`,
        )
        ?.focus();
    });
  };

  const closeWorkbench = () => {
    const dialog = workbenchDialogRef.current;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    restoreAssetFocus();
  };

  const toggleSelection = (assetId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const submitFolder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    setAssets((current) => [
      {
        id: `folder-${Date.now()}`,
        kind: "folder",
        name,
        owner: zh ? "你" : "You",
        parentId: currentFolderId,
        sizeBytes: 0,
        type: { en: "Folder", zh: "文件夹" },
        updated: { en: "Now", zh: "刚刚" },
      },
      ...current,
    ]);
    setFolderName("");
    setFolderFormOpen(false);
    setStatus(zh ? `已新建文件夹 ${name}` : `Created folder ${name}`);
  };

  const uploadFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.currentTarget.files ?? [])];
    if (!files.length) return;
    const timestamp = Date.now();
    const uploaded = files.map<ProjectAsset>((file, index) => ({
      id: `upload-${timestamp}-${index}`,
      kind: "document",
      name: file.name,
      owner: zh ? "你" : "You",
      parentId: currentFolderId,
      preview: {
        en: `Local project asset uploaded from ${file.name}.`,
        zh: `从本机上传的项目资产 ${file.name}。`,
      },
      sizeBytes: file.size,
      type: uploadedType(file.name),
      updated: { en: "Now", zh: "刚刚" },
      workbench: uploadedWorkbench(file.name),
    }));
    setAssets((current) => [...uploaded, ...current]);
    setStatus(
      zh
        ? `已上传 ${uploaded.length} 个文件`
        : `Uploaded ${uploaded.length} ${uploaded.length === 1 ? "file" : "files"}`,
    );
    event.currentTarget.value = "";
  };

  return (
    <div className="product-project-assets-workspace">
      <div className="product-project-workspace__toolbar" data-asset-toolbar>
        <div data-asset-primary-actions>
          {currentFolder ? (
            <button
              aria-label={zh ? "返回项目资产" : "Back to project assets"}
              data-asset-back
              onClick={() => {
                setCurrentFolderId(currentFolder.parentId);
                setQuery("");
                setSelectedIds(new Set());
              }}
              type="button"
            >
              <ProductPlaygroundIcon name="back" />
            </button>
          ) : null}
          <button
            aria-expanded={folderFormOpen}
            onClick={() => setFolderFormOpen((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="folder" />
            {zh ? "新建文件夹" : "New folder"}
          </button>
          <label data-asset-upload>
            <ProductPlaygroundIcon name="upload" />
            <span>{zh ? "上传文件" : "Upload files"}</span>
            <input
              aria-label={zh ? "上传项目资产" : "Upload project assets"}
              multiple
              onChange={uploadFiles}
              type="file"
            />
          </label>
          <span data-asset-storage>
            <span>
              {zh ? "已用" : "Used"} {formatBytes(usedBytes, locale)} / 5 GB
            </span>
            <progress max={STORAGE_LIMIT_BYTES} value={usedBytes} />
          </span>
        </div>
        <div data-asset-filter-actions>
          <label data-asset-type-filter>
            <span className="sr-only">
              {zh ? "项目资产类型" : "Project asset type"}
            </span>
            <select
              aria-label={zh ? "项目资产类型" : "Project asset type"}
              onChange={(event) =>
                setFilter(event.currentTarget.value as ProjectAssetFilter)
              }
              value={filter}
            >
              <option value="all">{zh ? "全部类型" : "All types"}</option>
              <option value="folder">{zh ? "文件夹" : "Folders"}</option>
              <option value="document">{zh ? "文件" : "Files"}</option>
            </select>
          </label>
          <label data-focus-owner="container" data-search>
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={zh ? "搜索项目资产" : "Search project assets"}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={
                currentFolder
                  ? zh
                    ? `搜索 ${currentFolder.name}`
                    : `Search ${currentFolder.name}`
                  : zh
                    ? "搜索文件或文件夹"
                    : "Search files or folders"
              }
              type="search"
              value={query}
            />
          </label>
        </div>
      </div>

      <div className="product-project-workspace__viewport">
        <section
          aria-labelledby="product-project-tab-assets"
          className="product-project-workspace__panel"
          id="product-project-panel-assets"
          role="tabpanel"
        >
          <div className="product-project-workspace__assets">
            <header data-asset-location>
              <div>
                <ProductPlaygroundIcon name="folder" />
                <strong>
                  {currentFolder?.name ?? (zh ? "项目资产" : "Project assets")}
                </strong>
              </div>
              <output aria-live="polite">{status}</output>
            </header>
            <div data-asset-table-scroll>
              <table>
                <thead>
                  <tr>
                    <th scope="col">
                      <label data-asset-checkbox-hit>
                        <input
                          aria-label={
                            zh ? "全选当前资产" : "Select all visible assets"
                          }
                          checked={allVisibleSelected}
                          onChange={() => {
                            setSelectedIds((current) => {
                              const next = new Set(current);
                              if (allVisibleSelected) {
                                visibleAssets.forEach((asset) =>
                                  next.delete(asset.id),
                                );
                              } else {
                                visibleAssets.forEach((asset) =>
                                  next.add(asset.id),
                                );
                              }
                              return next;
                            });
                          }}
                          ref={selectAllRef}
                          type="checkbox"
                        />
                      </label>
                    </th>
                    <th scope="col">{zh ? "名称" : "Name"}</th>
                    <th scope="col">{zh ? "类型" : "Type"}</th>
                    <th scope="col">{zh ? "更新人" : "Updated by"}</th>
                    <th scope="col">{zh ? "更新时间" : "Updated"}</th>
                    <th scope="col">{zh ? "大小" : "Size"}</th>
                    <th scope="col">
                      <span className="sr-only">{zh ? "操作" : "Actions"}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {folderFormOpen ? (
                    <tr data-asset-create-row>
                      <td />
                      <th colSpan={6} scope="row">
                        <form onSubmit={submitFolder}>
                          <ProductPlaygroundIcon name="folder" />
                          <input
                            aria-label={zh ? "新文件夹名称" : "New folder name"}
                            onChange={(event) =>
                              setFolderName(event.currentTarget.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key !== "Escape") return;
                              setFolderName("");
                              setFolderFormOpen(false);
                            }}
                            placeholder={zh ? "文件夹名称" : "Folder name"}
                            ref={folderInputRef}
                            value={folderName}
                          />
                          <button
                            data-primary
                            disabled={!folderName.trim()}
                            type="submit"
                          >
                            {zh ? "创建" : "Create"}
                          </button>
                          <button
                            aria-label={
                              zh ? "取消新建文件夹" : "Cancel new folder"
                            }
                            onClick={() => {
                              setFolderName("");
                              setFolderFormOpen(false);
                            }}
                            type="button"
                          >
                            <ProductPlaygroundIcon name="close" />
                          </button>
                        </form>
                      </th>
                    </tr>
                  ) : null}
                  {visibleAssets.map((asset) => {
                    const selected = selectedIds.has(asset.id);
                    return (
                      <tr
                        data-asset-id={asset.id}
                        data-asset-row
                        data-selected={selected ? "true" : undefined}
                        key={asset.id}
                      >
                        <td>
                          <label data-asset-checkbox-hit>
                            <input
                              aria-label={
                                selected
                                  ? zh
                                    ? `取消选择 ${asset.name}`
                                    : `Deselect ${asset.name}`
                                  : zh
                                    ? `选择 ${asset.name}`
                                    : `Select ${asset.name}`
                              }
                              checked={selected}
                              data-asset-select
                              onChange={() => toggleSelection(asset.id)}
                              type="checkbox"
                            />
                          </label>
                        </td>
                        <th scope="row">
                          <button
                            aria-label={
                              asset.kind === "folder"
                                ? zh
                                  ? `打开文件夹 ${asset.name}`
                                  : `Open folder ${asset.name}`
                                : zh
                                  ? `打开 ${asset.name}`
                                  : `Open ${asset.name}`
                            }
                            data-asset-open
                            onFocus={() => preloadAsset(asset)}
                            onClick={() => openAsset(asset)}
                            onPointerEnter={() => preloadAsset(asset)}
                            type="button"
                          >
                            <span data-asset-icon data-kind={asset.kind}>
                              <ProductPlaygroundIcon name={asset.kind} />
                            </span>
                            <span data-asset-copy>
                              <strong>{asset.name}</strong>
                              <small>{asset.type[locale]}</small>
                            </span>
                          </button>
                        </th>
                        <td>{asset.type[locale]}</td>
                        <td>{asset.owner}</td>
                        <td>
                          <time>{asset.updated[locale]}</time>
                        </td>
                        <td>{formatBytes(asset.sizeBytes, locale)}</td>
                        <td>
                          <button
                            aria-label={
                              zh
                                ? `添加 ${asset.name} 到任务`
                                : `Add ${asset.name} to task`
                            }
                            data-asset-task
                            onClick={() => {
                              setSelectedIds((current) =>
                                new Set(current).add(asset.id),
                              );
                              setStatus(
                                zh
                                  ? `已选择 ${asset.name}`
                                  : `Selected ${asset.name}`,
                              );
                            }}
                            type="button"
                          >
                            <ProductPlaygroundIcon name="task-add" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!visibleAssets.length && !folderFormOpen ? (
              <div data-asset-empty role="status">
                <ProductPlaygroundIcon name="search" />
                <strong>{zh ? "没有匹配的资产" : "No matching assets"}</strong>
                <span>
                  {zh
                    ? "调整类型或清除搜索，查看当前文件夹中的全部资产。"
                    : "Change the type or clear search to see every asset in this folder."}
                </span>
                <button
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                  }}
                  type="button"
                >
                  {zh ? "清除筛选" : "Clear filters"}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="product-project-workspace__context-actions">
        <ProductProjectAssetActionBar
          locale={locale}
          onClear={() => setSelectedIds(new Set())}
          onCreateTask={() => onCreateTask(selectedAssets)}
          selectedAssets={selectedAssets}
        />
      </div>

      <dialog
        aria-label={
          openedEntry
            ? zh
              ? `${openedEntry.name} 文件预览`
              : `${openedEntry.name} file preview`
            : undefined
        }
        aria-modal="true"
        className="product-project-assets-dialog"
        data-project-asset-dialog
        onCancel={(event) => {
          event.preventDefault();
          closeWorkbench();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeWorkbench();
        }}
        onClose={restoreAssetFocus}
        ref={workbenchDialogRef}
      >
        {openedEntry ? (
          <div
            className="product-project-assets-workbench"
            data-project-asset-workbench
          >
            <ProductFileWorkbench
              entry={openedEntry}
              key={openedEntry.id}
              locale={locale}
              onBack={closeWorkbench}
              presentation="dialog"
            />
          </div>
        ) : null}
      </dialog>
    </div>
  );
}

function ProductProjectAssetActionBar({
  locale,
  onClear,
  onCreateTask,
  selectedAssets,
}: {
  locale: ProductPlaygroundLocale;
  onClear: () => void;
  onCreateTask: () => void;
  selectedAssets: readonly ProjectAsset[];
}) {
  const zh = locale === "zh";
  if (!selectedAssets.length) return null;
  const labels = selectedAssets.map((asset) => asset.name);

  return (
    <aside
      aria-label={zh ? "已选资产操作" : "Selected asset actions"}
      data-asset-action-bar
    >
      <div>
        <span>
          <strong>
            {zh
              ? `已选择 ${selectedAssets.length} 项`
              : `${selectedAssets.length} selected`}
          </strong>
          <small title={labels.join("、")}>{labels.join("、")}</small>
        </span>
      </div>
      <div>
        <button
          aria-label={zh ? "创建关联任务" : "Create linked task"}
          data-primary
          onClick={onCreateTask}
          type="button"
        >
          <ProductPlaygroundIcon name="task-add" />
          <span>{zh ? "创建关联任务" : "Create linked task"}</span>
        </button>
        <button
          aria-label={zh ? "清除资产选择" : "Clear asset selection"}
          data-clear
          onClick={onClear}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </div>
    </aside>
  );
}
