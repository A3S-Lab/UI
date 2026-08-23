import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { withBase } from "@rspress/core/runtime";
import type {
  ProductCapabilityTab,
  ProductPlaygroundLocale,
  ProductPlaygroundView,
  ProductResourceView,
} from "./product-playground-data";
import { productProjectName } from "./product-project-data";
import {
  ProductPlaygroundIcon,
  type ProductPlaygroundIconName,
} from "./ProductPlaygroundIcon";
import type { SettingsSection } from "./ProductSettingsSections";
import { useProductAppearance } from "./useProductAppearance";

type SearchItem = {
  category: "navigation" | "resources" | "settings" | "tasks";
  description: { en: string; zh: string };
  destination: ProductSearchDestination;
  icon: ProductPlaygroundIconName;
  id: string;
  keywords: string;
  label: { en: string; zh: string };
};

export type ProductSearchDestination =
  | { type: "capability"; tab: ProductCapabilityTab }
  | { type: "resource"; resource: ProductResourceView }
  | { type: "settings"; section: SettingsSection }
  | { type: "view"; view: ProductPlaygroundView };

const searchItems: readonly SearchItem[] = [
  {
    category: "tasks",
    description: { en: "Today · Task", zh: "今天 · 任务" },
    destination: { type: "view", view: "session" },
    icon: "workspace",
    id: "seeded-session",
    keywords: "conversation session recovery 会话 恢复",
    label: { en: "Fix session recovery", zh: "修复会话恢复" },
  },
  {
    category: "tasks",
    description: { en: "Project", zh: "项目" },
    destination: { type: "view", view: "project" },
    icon: "project",
    id: "a3s-ui-project",
    keywords: "workspace project 空间 项目",
    label: productProjectName,
  },
  {
    category: "navigation",
    description: { en: "Start a durable task", zh: "开始一个持久任务" },
    destination: { type: "view", view: "start" },
    icon: "task-add",
    id: "new-task",
    keywords: "new task compose 新建 任务 输入",
    label: { en: "New task", zh: "新建任务" },
  },
  {
    category: "navigation",
    description: { en: "Browse project workspaces", zh: "浏览项目空间" },
    destination: { type: "view", view: "projects" },
    icon: "project",
    id: "projects",
    keywords: "projects spaces 项目 空间",
    label: { en: "Projects", zh: "项目" },
  },
  {
    category: "navigation",
    description: { en: "Assistants, Skills, and connectors", zh: "专家、技能与连接器" },
    destination: { type: "capability", tab: "assistants" },
    icon: "catalog",
    id: "capabilities",
    keywords: "assistant skill connector expert 专家 技能 连接器",
    label: { en: "Capabilities", zh: "能力目录" },
  },
  {
    category: "navigation",
    description: { en: "Scheduled tasks and run history", zh: "定时任务与运行记录" },
    destination: { type: "view", view: "automation" },
    icon: "automation",
    id: "automations",
    keywords: "schedule runs automation 定时 运行 自动化",
    label: { en: "Automations", zh: "自动化" },
  },
  {
    category: "resources",
    description: { en: "Artifacts and local workspace files", zh: "任务成果与本地工作区文件" },
    destination: { type: "resource", resource: "files" },
    icon: "files",
    id: "files",
    keywords: "quick open finder workspace file 快速打开 工作区 文件",
    label: { en: "Files", zh: "我的文件" },
  },
  {
    category: "resources",
    description: { en: "Searchable, cited long-term sources", zh: "可搜索、可引用的长期资料" },
    destination: { type: "resource", resource: "knowledge" },
    icon: "knowledge",
    id: "knowledge",
    keywords: "knowledge base compile citation 知识库 编译 引用",
    label: { en: "Knowledge", zh: "知识库" },
  },
  {
    category: "resources",
    description: { en: "Document collaboration workspace", zh: "文档协作工作区" },
    destination: { type: "resource", resource: "documents" },
    icon: "document",
    id: "documents",
    keywords: "document office collaboration 文档 协作 office",
    label: { en: "Documents", zh: "协作文档" },
  },
  {
    category: "resources",
    description: { en: "Traceable durable context", zh: "可追溯的长期上下文" },
    destination: { type: "view", view: "memory" },
    icon: "brain",
    id: "memory",
    keywords: "memory graph evolution 记忆 图谱 演化",
    label: { en: "Memory", zh: "记忆" },
  },
  {
    category: "settings",
    description: { en: "Providers, models, and defaults", zh: "提供方、模型与默认配置" },
    destination: { type: "settings", section: "models" },
    icon: "assistant",
    id: "model-settings",
    keywords: "provider model runtime 模型 提供方 运行时",
    label: { en: "Model settings", zh: "模型设置" },
  },
  {
    category: "settings",
    description: { en: "Local, Feishu, and Weixin remote", zh: "本机、飞书与微信远程渠道" },
    destination: { type: "settings", section: "channels" },
    icon: "link",
    id: "channel-settings",
    keywords: "channel weixin feishu remote 渠道 微信 飞书 远程",
    label: { en: "Channels", zh: "渠道" },
  },
];

export function ProductSearchDialog({
  createdTaskTitle,
  locale,
  onClose,
  onSelect,
  open,
}: {
  createdTaskTitle: string | null;
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onSelect: (destination: ProductSearchDestination) => void;
  open: boolean;
}) {
  const zh = locale === "zh";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const closeDialog = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose();
  };
  const items = useMemo<readonly SearchItem[]>(
    () =>
      createdTaskTitle
        ? [
            {
              category: "tasks",
              description: { en: "Now · Current task", zh: "刚刚 · 当前任务" },
              destination: { type: "view", view: "created-session" },
              icon: "workspace",
              id: "created-session",
              keywords: `current active task 当前 任务 ${createdTaskTitle}`,
              label: { en: createdTaskTitle, zh: createdTaskTitle },
            },
            ...searchItems,
          ]
        : searchItems,
    [createdTaskTitle],
  );
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    if (!normalized) return items;
    return items.filter((item) =>
      [
        item.label.en,
        item.label.zh,
        item.description.en,
        item.description.zh,
        item.keywords,
      ]
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(normalized),
    );
  }, [items, locale, query]);
  const groups = ["tasks", "navigation", "resources", "settings"] as const;
  const groupLabels = {
    navigation: { en: "Navigate", zh: "前往" },
    resources: { en: "Resources", zh: "资源" },
    settings: { en: "Settings", zh: "设置" },
    tasks: { en: "Tasks and spaces", zh: "任务与空间" },
  } as const;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const container = resultsRef.current;
    const active = container?.querySelector<HTMLElement>(
      `[data-search-index="${activeIndex}"]`,
    );
    if (!container || !active) return;
    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight;
    }
  }, [activeIndex]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      setActiveIndex(0);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open && dialog?.open) dialog.close();
  });

  return (
    <dialog
      aria-label={zh ? "全局搜索" : "Global search"}
      className="product-search-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <header>
        <label data-focus-owner="container">
          <ProductPlaygroundIcon name="search" />
          <input
            aria-activedescendant={
              results[activeIndex]
                ? `product-search-option-${results[activeIndex].id}`
                : undefined
            }
            aria-controls="product-search-results"
            aria-expanded="true"
            aria-label={zh ? "搜索任务、文件和操作" : "Search tasks, files, and actions"}
            autoFocus
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (results.length === 0) return;
                const offset = event.key === "ArrowDown" ? 1 : -1;
                setActiveIndex((current) =>
                  (current + offset + results.length) % results.length,
                );
                return;
              }
              if (event.key === "Enter" && results[activeIndex]) {
                event.preventDefault();
                onSelect(results[activeIndex].destination);
              }
            }}
            placeholder={zh ? "搜索任务、文件和操作" : "Search tasks, files, and actions"}
            role="combobox"
            type="search"
            value={query}
          />
        </label>
        <button
          aria-label={zh ? "关闭搜索" : "Close search"}
          onClick={closeDialog}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>
      <div
        aria-label={zh ? "搜索结果" : "Search results"}
        className="product-search-dialog__results"
        id="product-search-results"
        ref={resultsRef}
        role="listbox"
      >
        {results.length > 0 ? (
          groups.map((group) => {
            const grouped = results
              .map((item, index) => ({ index, item }))
              .filter(({ item }) => item.category === group);
            if (grouped.length === 0) return null;
            return (
              <section
                aria-labelledby={`product-search-group-${group}`}
                key={group}
                role="group"
              >
                <h2 id={`product-search-group-${group}`}>
                  {groupLabels[group][locale]}
                </h2>
                <div>
                  {grouped.map(({ index, item }) => (
                    <button
                      aria-selected={activeIndex === index}
                      data-search-index={index}
                      id={`product-search-option-${item.id}`}
                      key={item.id}
                      onClick={() => onSelect(item.destination)}
                      onPointerMove={() => setActiveIndex(index)}
                      role="option"
                      type="button"
                    >
                      <span data-search-icon>
                        <ProductPlaygroundIcon name={item.icon} />
                      </span>
                      <span data-search-copy>
                        <strong>{item.label[locale]}</strong>
                        <small>{item.description[locale]}</small>
                      </span>
                      <ProductPlaygroundIcon name="arrow" />
                    </button>
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <p role="status">
            {zh
              ? "没有匹配的任务、文件或操作"
              : "No matching tasks, files, or actions"}
          </p>
        )}
      </div>
      <footer>
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          {zh ? "选择" : "Select"}
        </span>
        <span>
          <kbd>Enter</kbd>
          {zh ? "打开" : "Open"}
        </span>
        <span>
          <kbd>Esc</kbd>
          {zh ? "关闭" : "Close"}
        </span>
      </footer>
    </dialog>
  );
}

export function ProductAccountMenu({
  languageHref,
  locale,
  onClose,
  onOpenSettings,
  onRequestExit,
  open,
  triggerRef,
}: {
  languageHref: string;
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onOpenSettings: (section: SettingsSection) => void;
  onRequestExit: () => void;
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const zh = locale === "zh";
  const menuRef = useRef<HTMLElement>(null);
  const [updateRequested, setUpdateRequested] = useState(false);
  const { mode, toggleMode } = useProductAppearance();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, triggerRef]);

  if (!open) return null;

  const openSettings = (section: SettingsSection) => {
    onClose();
    onOpenSettings(section);
  };

  return (
    <section
      aria-label={zh ? "账户菜单" : "Account menu"}
      className="product-account-menu"
      ref={menuRef}
      role="menu"
    >
      <header role="none">
        <img alt="" height="36" src={withBase("/logo.png")} width="36" />
        <span>
          <strong>{zh ? "本地用户" : "Local user"}</strong>
          <small>{zh ? "数据保留在此设备" : "Data stays on this device"}</small>
        </span>
      </header>
      <button
        onClick={() => openSettings("account")}
        role="menuitem"
        type="button"
      >
        <ProductPlaygroundIcon name="version" />
        <span>
          <strong>{zh ? "社区版本" : "Community edition"}</strong>
          <small>A3S UI v0.3.0</small>
        </span>
        <ProductPlaygroundIcon name="arrow" />
      </button>
      <hr role="separator" />
      <button
        onClick={() => openSettings("system")}
        role="menuitem"
        type="button"
      >
        <ProductPlaygroundIcon name="settings" />
        <span>{zh ? "设置" : "Settings"}</span>
      </button>
      <button
        aria-checked={mode === "dark"}
        onClick={toggleMode}
        role="menuitemcheckbox"
        type="button"
      >
        <ProductPlaygroundIcon name={mode === "dark" ? "moon" : "sun"} />
        <span>{zh ? "深色外观" : "Dark appearance"}</span>
        <i aria-hidden="true" className="product-account-menu__switch">
          <b />
        </i>
      </button>
      <a href={languageHref} onClick={onClose} role="menuitem">
        <ProductPlaygroundIcon name="language" />
        <span>
          {zh ? "切换到 English" : "切换到中文"}
          <small>{zh ? "保持当前页面" : "Keep the current page"}</small>
        </span>
        <ProductPlaygroundIcon name="arrow" />
      </a>
      <button
        onClick={() => openSettings("help")}
        role="menuitem"
        type="button"
      >
        <ProductPlaygroundIcon name="help" />
        <span>{zh ? "帮助与反馈" : "Help and feedback"}</span>
      </button>
      <hr role="separator" />
      <button
        onClick={() => {
          setUpdateRequested(true);
          document.dispatchEvent(
            new CustomEvent("a3s:playground-check-update", {
              detail: { version: "0.3.0" },
            }),
          );
        }}
        role="menuitem"
        type="button"
      >
        <ProductPlaygroundIcon name={updateRequested ? "check" : "update"} />
        <span>
          {zh ? "检查更新" : "Check for updates"}
          {updateRequested ? (
            <small aria-live="polite">
              {zh ? "检查请求已发送" : "Update request sent"}
            </small>
          ) : null}
        </span>
      </button>
      <button
        className="product-account-menu__danger"
        onClick={() => {
          onClose();
          onRequestExit();
        }}
        role="menuitem"
        type="button"
      >
        <ProductPlaygroundIcon name="logout" />
        <span>{zh ? "退出 A3S" : "Quit A3S"}</span>
      </button>
    </section>
  );
}

export function ProductExitDialog({
  locale,
  onClose,
  onConfirm,
  open,
  returnFocusRef,
}: {
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const zh = locale === "zh";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeDialog = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
    onClose();
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open && dialog?.open) dialog.close();
  });

  return (
    <dialog
      aria-labelledby="product-exit-dialog-title"
      className="product-exit-dialog"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <ProductPlaygroundIcon name="logout" />
      <div>
        <h2 id="product-exit-dialog-title">
          {zh ? "退出 A3S？" : "Quit A3S?"}
        </h2>
        <p>
          {zh
            ? "当前任务会停止，未发送的草稿仍保留在此浏览器中。"
            : "The current task will stop. Unsent drafts remain in this browser."}
        </p>
      </div>
      <footer>
        <button onClick={closeDialog} type="button">
          {zh ? "取消" : "Cancel"}
        </button>
        <button data-danger onClick={onConfirm} type="button">
          {zh ? "退出" : "Quit"}
        </button>
      </footer>
    </dialog>
  );
}
