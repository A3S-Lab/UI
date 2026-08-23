import { useEffect, useRef, useState, type RefObject } from "react";
import { withBase } from "@rspress/core/runtime";
import { Link } from "@rspress/core/theme";
import {
  localizeProductText,
  productMoreMenuItems,
  productMoreNavigation,
  productNavigation,
  resourceNavigation,
  type ProductCapabilityTab,
  type ProductPlaygroundLocale,
  type ProductPlaygroundView,
  type ProductResourceView,
} from "./product-playground-data";
import { productProjectName } from "./product-project-data";
import { ProductAccountMenu } from "./ProductOverlayMenus";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import type { SettingsSection } from "./ProductSettingsSections";

export function ProductNavigationSidebar({
  accountTriggerRef,
  capabilityHref,
  collapsed,
  compact,
  createdTaskTitle,
  locale,
  languageHref,
  mobileOpen,
  onCloseMobile,
  onOpenSearch,
  onOpenSettings,
  onRequestExit,
  onToggleCollapsed,
  resource,
  resourceHref,
  view,
  viewHref,
}: {
  accountTriggerRef: RefObject<HTMLButtonElement | null>;
  capabilityHref: (tab: ProductCapabilityTab) => string;
  collapsed: boolean;
  compact: boolean;
  createdTaskTitle: string | null;
  locale: ProductPlaygroundLocale;
  languageHref: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSearch: () => void;
  onOpenSettings: (section: SettingsSection) => void;
  onRequestExit: () => void;
  onToggleCollapsed: () => void;
  resource: ProductResourceView;
  resourceHref: (resource: ProductResourceView) => string;
  view: ProductPlaygroundView;
  viewHref: (view: ProductPlaygroundView) => string;
}) {
  const zh = locale === "zh";
  const moreRef = useRef<HTMLDetailsElement>(null);
  const notificationPanelRef = useRef<HTMLElement>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTime, setFilterTime] = useState("all");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const projectRouteActive = view === "project" || view === "project-session";
  const [projectExpanded, setProjectExpanded] = useState(projectRouteActive);

  useEffect(() => {
    if (projectRouteActive) setProjectExpanded(true);
  }, [projectRouteActive]);

  useEffect(() => {
    if (!compact || mobileOpen) return;
    setAccountOpen(false);
    setFilterOpen(false);
    setNotificationOpen(false);
    moreRef.current?.removeAttribute("open");
  }, [compact, mobileOpen]);

  useEffect(() => {
    const details = moreRef.current;
    if (!details) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !details.contains(target)) {
        details.removeAttribute("open");
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.open) return;
      event.preventDefault();
      details.removeAttribute("open");
      details.querySelector<HTMLElement>("summary")?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!notificationOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        !notificationPanelRef.current?.contains(target) &&
        !notificationTriggerRef.current?.contains(target)
      ) {
        setNotificationOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setNotificationOpen(false);
      notificationTriggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationOpen]);

  const statusOptions = [
    ["all", zh ? "全部状态" : "All statuses"],
    ["running", zh ? "进行中" : "In progress"],
    ["complete", zh ? "已完成" : "Completed"],
    ["failed", zh ? "失败" : "Failed"],
    ["pending", zh ? "待处理" : "Pending"],
    ["planning", zh ? "规划中" : "Planning"],
  ] as const;
  const timeOptions = [
    ["all", zh ? "全部时间" : "Any time"],
    ["today", zh ? "今天" : "Today"],
    ["week", zh ? "最近 7 天" : "Last 7 days"],
    ["month", zh ? "最近 30 天" : "Last 30 days"],
  ] as const;
  const taskVisible =
    (filterStatus === "all" || filterStatus === "running") &&
    (filterTime === "all" || filterTime === "today");

  const closeNavigationLayers = () => {
    setAccountOpen(false);
    setFilterOpen(false);
    setNotificationOpen(false);
    moreRef.current?.removeAttribute("open");
    onCloseMobile();
  };

  const closeTransientLayers = () => {
    setAccountOpen(false);
    setNotificationOpen(false);
    moreRef.current?.removeAttribute("open");
  };

  return (
    <aside
      aria-label={zh ? "应用导航" : "Application navigation"}
      className="product-sidebar"
      data-agent-context
      data-collapsed={collapsed ? "true" : undefined}
      data-mobile-open={mobileOpen ? "true" : undefined}
      inert={compact && !mobileOpen ? true : undefined}
    >
      <header className="product-sidebar__window">
        <Link
          aria-label={zh ? "A3S 新建任务" : "A3S new task"}
          className="product-sidebar__identity"
          href={viewHref("start")}
          onClick={closeNavigationLayers}
        >
          <img alt="" height="28" src={withBase("/logo.png")} width="28" />
          <span>
            <strong>A3S</strong>
            <small>v0.3.0</small>
          </span>
        </Link>
        <div>
          <button
            aria-label={
              compact
                ? zh
                  ? "关闭应用导航"
                  : "Close application navigation"
                : collapsed
                  ? zh
                    ? "展开侧边栏"
                    : "Expand sidebar"
                  : zh
                    ? "收起侧边栏"
                    : "Collapse sidebar"
            }
            onClick={compact ? onCloseMobile : onToggleCollapsed}
            type="button"
          >
            <ProductPlaygroundIcon name="collapse" />
          </button>
          <button
            aria-label={zh ? "搜索" : "Search"}
            onClick={() => {
              closeTransientLayers();
              onOpenSearch();
            }}
            type="button"
          >
            <ProductPlaygroundIcon name="search" />
          </button>
          <button
            aria-expanded={filterOpen}
            aria-label={zh ? "筛选任务" : "Filter tasks"}
            data-active={filterOpen ? "true" : undefined}
            onClick={() => {
              closeTransientLayers();
              setFilterOpen((value) => !value);
            }}
            type="button"
          >
            <ProductPlaygroundIcon name="filter" />
          </button>
        </div>
      </header>

      {filterOpen ? (
        <section
          aria-label={zh ? "任务筛选" : "Task filters"}
          className="product-sidebar__filter-popover"
        >
          <fieldset>
            <legend>{zh ? "筛选状态" : "Filter by status"}</legend>
            {statusOptions.map(([value, label]) => (
              <button
                aria-pressed={filterStatus === value}
                key={value}
                onClick={() => setFilterStatus(value)}
                type="button"
              >
                {label}
                {filterStatus === value ? (
                  <ProductPlaygroundIcon name="check" />
                ) : null}
              </button>
            ))}
          </fieldset>
          <fieldset>
            <legend>{zh ? "筛选时间" : "Filter by time"}</legend>
            {timeOptions.map(([value, label]) => (
              <button
                aria-pressed={filterTime === value}
                key={value}
                onClick={() => setFilterTime(value)}
                type="button"
              >
                {label}
                {filterTime === value ? (
                  <ProductPlaygroundIcon name="check" />
                ) : null}
              </button>
            ))}
          </fieldset>
          <button
            disabled={filterStatus === "all" && filterTime === "all"}
            onClick={() => {
              setFilterStatus("all");
              setFilterTime("all");
            }}
            type="button"
          >
            {zh ? "重置筛选条件" : "Reset filters"}
          </button>
        </section>
      ) : null}

      <nav
        aria-label={zh ? "主要页面" : "Primary pages"}
        className="product-sidebar__primary"
      >
        {productNavigation.map((item) => {
          const current =
            view === item.id || (item.id === "projects" && projectRouteActive);

          if (item.id === "catalog") {
            return (
              <Link
                aria-current={current ? "page" : undefined}
                className="product-sidebar__capability-link"
                href={capabilityHref("assistants")}
                key={item.id}
                onClick={closeNavigationLayers}
                title={
                  collapsed
                    ? localizeProductText(item.label, locale)
                    : undefined
                }
              >
                <ProductPlaygroundIcon name={item.icon} />
                <span>{localizeProductText(item.label, locale)}</span>
              </Link>
            );
          }

          if (item.id === "assistant") {
            return (
              <div
                className="product-sidebar__nav-row"
                data-current={current ? "true" : undefined}
                key={item.id}
              >
                <Link
                  aria-current={current ? "page" : undefined}
                  href={viewHref(item.id)}
                  onClick={closeNavigationLayers}
                  title={
                    collapsed
                      ? localizeProductText(item.label, locale)
                      : undefined
                  }
                >
                  <ProductPlaygroundIcon name={item.icon} />
                  <span>{localizeProductText(item.label, locale)}</span>
                </Link>
                {current && !collapsed ? (
                  <span className="product-sidebar__nav-actions">
                    <Link
                      aria-label={zh ? "打开文件" : "Open files"}
                      href={resourceHref("files")}
                      onClick={closeNavigationLayers}
                      title={zh ? "打开文件" : "Open files"}
                    >
                      <ProductPlaygroundIcon name="folder" />
                    </Link>
                    <button
                      aria-label={zh ? "助理设置" : "Assistant settings"}
                      onClick={() => onOpenSettings("assistant")}
                      title={zh ? "助理设置" : "Assistant settings"}
                      type="button"
                    >
                      <ProductPlaygroundIcon name="settings" />
                    </button>
                  </span>
                ) : null}
              </div>
            );
          }

          return (
            <Link
              aria-current={current ? "page" : undefined}
              href={viewHref(item.id)}
              key={item.id}
              onClick={closeNavigationLayers}
              title={
                collapsed ? localizeProductText(item.label, locale) : undefined
              }
            >
              <ProductPlaygroundIcon name={item.icon} />
              <span>{localizeProductText(item.label, locale)}</span>
            </Link>
          );
        })}
        <details className="product-sidebar__more" ref={moreRef}>
          <summary
            aria-current={
              view === "resources" ||
              productMoreNavigation.some((item) => item.id === view)
                ? "page"
                : undefined
            }
            onClick={() => {
              setAccountOpen(false);
              setFilterOpen(false);
              setNotificationOpen(false);
            }}
            title={collapsed ? (zh ? "更多" : "More") : undefined}
          >
            <ProductPlaygroundIcon name="more" />
            <span>{zh ? "更多" : "More"}</span>
            <small>
              {zh ? "文件 · 知识 · 灵感" : "Files · knowledge · inspiration"}
            </small>
          </summary>
          <div aria-label={zh ? "更多资源" : "More resources"} role="menu">
            {productMoreMenuItems.map((menuItem) => {
              const item =
                menuItem.kind === "view"
                  ? productMoreNavigation.find(
                      (candidate) => candidate.id === menuItem.id,
                    )
                  : resourceNavigation.find(
                      (candidate) => candidate.id === menuItem.id,
                    );
              if (!item) return null;
              const current =
                menuItem.kind === "view"
                  ? view === menuItem.id
                  : view === "resources" && resource === menuItem.id;
              return (
                <Link
                  aria-current={current ? "page" : undefined}
                  data-secondary={menuItem.kind === "view" ? "true" : undefined}
                  href={
                    menuItem.kind === "view"
                      ? viewHref(menuItem.id)
                      : resourceHref(menuItem.id)
                  }
                  key={`${menuItem.kind}-${menuItem.id}`}
                  onClick={closeNavigationLayers}
                  role="menuitem"
                >
                  <ProductPlaygroundIcon name={item.icon} />
                  {localizeProductText(item.label, locale)}
                </Link>
              );
            })}
          </div>
        </details>
      </nav>

      <div className="product-sidebar__history">
        <section>
          <button
            aria-expanded={tasksExpanded}
            className="product-sidebar__history-heading"
            onClick={() => setTasksExpanded((value) => !value)}
            type="button"
          >
            <span>
              {zh
                ? `任务 (${createdTaskTitle ? 2 : 1})`
                : `Tasks (${createdTaskTitle ? 2 : 1})`}
            </span>
            <ProductPlaygroundIcon name="chevron" />
          </button>
          {tasksExpanded && taskVisible ? (
            <>
              {createdTaskTitle ? (
                <Link
                  aria-current={view === "created-session" ? "page" : undefined}
                  data-created-task
                  href={viewHref("created-session")}
                  onClick={closeNavigationLayers}
                >
                  <span>{createdTaskTitle}</span>
                  <time>{zh ? "刚刚" : "Now"}</time>
                </Link>
              ) : null}
              <Link
                aria-current={view === "session" ? "page" : undefined}
                href={viewHref("session")}
                onClick={closeNavigationLayers}
              >
                <span>{zh ? "修复会话恢复" : "Fix session recovery"}</span>
                <time>{zh ? "今天" : "Today"}</time>
              </Link>
            </>
          ) : tasksExpanded ? (
            <p>{zh ? "没有符合条件的任务" : "No matching tasks"}</p>
          ) : null}
        </section>
        <section>
          <button
            aria-expanded={spacesExpanded}
            className="product-sidebar__history-heading"
            onClick={() => setSpacesExpanded((value) => !value)}
            type="button"
          >
            <span>{zh ? "空间 (1)" : "Spaces (1)"}</span>
            <ProductPlaygroundIcon name="chevron" />
          </button>
          {spacesExpanded ? (
            <div
              className="product-sidebar__project-group"
              data-expanded={projectExpanded ? "true" : undefined}
            >
              <div>
                <Link
                  aria-current={view === "project" ? "page" : undefined}
                  href={viewHref("project")}
                  onClick={closeNavigationLayers}
                >
                  <ProductPlaygroundIcon name="project" />
                  <span>{productProjectName[locale]}</span>
                </Link>
                <button
                  aria-expanded={projectExpanded}
                  aria-label={
                    projectExpanded
                      ? zh
                        ? "收起空间任务"
                        : "Collapse space tasks"
                      : zh
                        ? "展开空间任务"
                        : "Expand space tasks"
                  }
                  onClick={() => setProjectExpanded((value) => !value)}
                  type="button"
                >
                  <ProductPlaygroundIcon name="chevron" />
                </button>
              </div>
              {projectExpanded ? (
                <Link
                  aria-current={view === "project-session" ? "page" : undefined}
                  className="product-sidebar__project-task"
                  href={viewHref("project-session")}
                  onClick={closeNavigationLayers}
                >
                  <span>{zh ? "发布就绪检查" : "Release readiness"}</span>
                  <time>{zh ? "今天" : "Today"}</time>
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <footer className="product-sidebar__footer">
        <button
          aria-expanded={accountOpen}
          aria-haspopup="menu"
          onClick={() => {
            setFilterOpen(false);
            setNotificationOpen(false);
            moreRef.current?.removeAttribute("open");
            setAccountOpen((value) => !value);
          }}
          ref={accountTriggerRef}
          type="button"
        >
          <img alt="" height="30" src={withBase("/logo.png")} width="30" />
          <strong>{zh ? "本地用户" : "Local user"}</strong>
        </button>
        <button
          aria-expanded={notificationOpen}
          aria-label={zh ? "通知" : "Notifications"}
          data-product-control="notifications"
          onClick={() => {
            setAccountOpen(false);
            setFilterOpen(false);
            setNotificationOpen((value) => !value);
          }}
          ref={notificationTriggerRef}
          type="button"
        >
          <ProductPlaygroundIcon name="notification" />
        </button>
        <button
          aria-label={zh ? "设置" : "Settings"}
          data-product-control="settings"
          onClick={() => {
            setAccountOpen(false);
            onOpenSettings("system");
          }}
          type="button"
        >
          <ProductPlaygroundIcon name="settings" />
        </button>
      </footer>
      <ProductAccountMenu
        languageHref={languageHref}
        locale={locale}
        onClose={() => setAccountOpen(false)}
        onOpenSettings={onOpenSettings}
        onRequestExit={onRequestExit}
        open={accountOpen}
        triggerRef={accountTriggerRef}
      />
      {notificationOpen ? (
        <section
          aria-label={zh ? "消息中心" : "Notifications"}
          className="product-sidebar__notifications"
          ref={notificationPanelRef}
        >
          <header>
            <strong>{zh ? "消息" : "Notifications"}</strong>
            <button
              aria-label={zh ? "关闭消息" : "Close notifications"}
              onClick={() => {
                setNotificationOpen(false);
                window.requestAnimationFrame(() =>
                  notificationTriggerRef.current?.focus(),
                );
              }}
              type="button"
            >
              <ProductPlaygroundIcon name="close" />
            </button>
          </header>
          <article>
            <span>
              <ProductPlaygroundIcon name="check" />
            </span>
            <div>
              <strong>
                {zh ? "视觉验收已完成" : "Visual review completed"}
              </strong>
              <small>
                {zh
                  ? `今天 · ${productProjectName.zh}`
                  : `Today · ${productProjectName.en}`}
              </small>
            </div>
          </article>
        </section>
      ) : null}
    </aside>
  );
}
