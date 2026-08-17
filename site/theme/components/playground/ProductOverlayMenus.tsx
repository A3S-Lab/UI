import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { withBase } from "@rspress/core/runtime";
import type {
  ProductPlaygroundLocale,
  ProductPlaygroundView,
} from "./product-playground-data";
import {
  ProductPlaygroundIcon,
  type ProductPlaygroundIconName,
} from "./ProductPlaygroundIcon";
import type { SettingsSection } from "./ProductSettingsSections";
import { useProductAppearance } from "./useProductAppearance";

type SearchItem = {
  description: { en: string; zh: string };
  icon: ProductPlaygroundIconName;
  label: { en: string; zh: string };
  view: ProductPlaygroundView;
};

const searchItems: readonly SearchItem[] = [
  {
    description: { en: "Today · Task", zh: "今天 · 任务" },
    icon: "workspace",
    label: { en: "Fix session recovery", zh: "修复会话恢复" },
    view: "session",
  },
  {
    description: { en: "Project", zh: "项目" },
    icon: "project",
    label: { en: "A3S UI experience", zh: "A3S UI 体验优化" },
    view: "projects",
  },
];

export function ProductSearchDialog({
  locale,
  onClose,
  onSelectView,
  open,
}: {
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onSelectView: (view: ProductPlaygroundView) => void;
  open: boolean;
}) {
  const zh = locale === "zh";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    if (!normalized) return searchItems;
    return searchItems.filter((item) =>
      [item.label.en, item.label.zh, item.description.en, item.description.zh]
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(normalized),
    );
  }, [locale, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-label={zh ? "搜索任务" : "Search tasks"}
      className="product-search-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <header>
        <label>
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "搜索任务" : "Search tasks"}
            autoFocus
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={zh ? "搜索任务" : "Search tasks"}
            type="search"
            value={query}
          />
        </label>
        <button
          aria-label={zh ? "关闭搜索" : "Close search"}
          onClick={onClose}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>
      <section>
        <h2>
          {query ? (zh ? "搜索结果" : "Results") : zh ? "最近任务" : "Recent"}
        </h2>
        {results.length > 0 ? (
          <div>
            {results.map((item) => (
              <button
                key={item.label.en}
                onClick={() => onSelectView(item.view)}
                type="button"
              >
                <span>{item.label[locale]}</span>
                <small>
                  <ProductPlaygroundIcon name={item.icon} />
                  {item.description[locale]}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <p role="status">
            {zh ? "没有匹配的任务或项目" : "No matching tasks or projects"}
          </p>
        )}
      </section>
    </dialog>
  );
}

export function ProductAccountMenu({
  locale,
  onClose,
  onOpenSettings,
  onRequestExit,
  open,
  triggerRef,
}: {
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
}: {
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  const zh = locale === "zh";
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby="product-exit-dialog-title"
      className="product-exit-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
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
        <button onClick={onClose} type="button">
          {zh ? "取消" : "Cancel"}
        </button>
        <button data-danger onClick={onConfirm} type="button">
          {zh ? "退出" : "Quit"}
        </button>
      </footer>
    </dialog>
  );
}
