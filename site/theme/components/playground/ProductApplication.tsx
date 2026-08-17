import { useEffect, useRef, useState } from "react";
import {
  removeBase,
  useLang,
  useLocation,
  useNavigate,
  withBase,
} from "@rspress/core/runtime";
import { Link } from "@rspress/core/theme";
import {
  getProductApplicationRoutePath,
  getProductApplicationRouteState,
  getProductCapabilityRoutePath,
  getProductCapabilityTab,
} from "../../../product-application-routes";
import {
  localizeProductText,
  productNavigation,
  resourceNavigation,
  type ProductCapabilityTab,
  type ProductPlaygroundLocale,
  type ProductPlaygroundView,
  type ProductResourceView,
} from "./product-playground-data";
import {
  ProductAutomationSurface,
  ProductCatalogSurface,
  ProductResourcesSurface,
} from "./ProductCollectionSurfaces";
import {
  ProductAccountMenu,
  ProductCapabilityMenu,
  ProductExitDialog,
  ProductSearchDialog,
} from "./ProductOverlayMenus";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  ProductProjectSessionSurface,
  ProductProjectWorkspaceSurface,
} from "./ProductProjectSurfaces";
import { ProductSessionSurface } from "./ProductSessionSurface";
import { ProductSettingsDialog } from "./ProductSettingsDialog";
import type { SettingsSection } from "./ProductSettingsSections";
import {
  ProductAssistantSurface,
  ProductProjectsSurface,
  ProductStartSurface,
} from "./ProductTaskSurfaces";

function ProductSidebar({
  capabilityTab,
  collapsed,
  compact,
  locale,
  mobileOpen,
  onCloseMobile,
  onOpenSearch,
  onOpenSettings,
  onRequestExit,
  onSelectCapabilityTab,
  onToggleCollapsed,
  resourceHref,
  resource,
  viewHref,
  view,
}: {
  capabilityTab: ProductCapabilityTab;
  collapsed: boolean;
  compact: boolean;
  locale: ProductPlaygroundLocale;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSearch: () => void;
  onOpenSettings: (section: SettingsSection) => void;
  onRequestExit: () => void;
  onSelectCapabilityTab: (tab: ProductCapabilityTab) => void;
  onToggleCollapsed: () => void;
  resourceHref: (resource: ProductResourceView) => string;
  resource: ProductResourceView;
  viewHref: (view: ProductPlaygroundView) => string;
  view: ProductPlaygroundView;
}) {
  const zh = locale === "zh";
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const capabilityTriggerRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [capabilityMenuOpen, setCapabilityMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTime, setFilterTime] = useState("all");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const projectRouteActive = view === "project" || view === "project-session";
  const [projectExpanded, setProjectExpanded] = useState(projectRouteActive);

  useEffect(() => {
    if (projectRouteActive) setProjectExpanded(true);
  }, [projectRouteActive]);

  useEffect(() => {
    if (view !== "catalog") setCapabilityMenuOpen(false);
  }, [view]);

  useEffect(() => {
    if (!compact || mobileOpen) return;
    setAccountOpen(false);
    setCapabilityMenuOpen(false);
    setFilterOpen(false);
    setNotificationOpen(false);
    moreRef.current?.removeAttribute("open");
  }, [compact, mobileOpen]);

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
    setCapabilityMenuOpen(false);
    setFilterOpen(false);
    setNotificationOpen(false);
    moreRef.current?.removeAttribute("open");
    onCloseMobile();
  };

  return (
    <aside
      aria-label={zh ? "应用导航" : "Application navigation"}
      className="product-sidebar"
      data-collapsed={collapsed ? "true" : undefined}
      data-mobile-open={mobileOpen ? "true" : undefined}
      inert={compact && !mobileOpen ? true : undefined}
    >
      <header className="product-sidebar__window">
        <span aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
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
              setAccountOpen(false);
              setFilterOpen(false);
              setNotificationOpen(false);
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
              setAccountOpen(false);
              setNotificationOpen(false);
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

      <Link
        className="product-sidebar__identity"
        href={viewHref("start")}
        onClick={closeNavigationLayers}
      >
        <img alt="" height="28" src={withBase("/logo.png")} width="28" />
        <span>
          <strong>A3S UI</strong>
          <small>v0.3.0</small>
        </span>
      </Link>

      <nav
        className="product-sidebar__primary"
        aria-label={zh ? "主要页面" : "Primary pages"}
      >
        {productNavigation.map((item) => {
          const current =
            view === item.id || (item.id === "projects" && projectRouteActive);
          if (item.id === "catalog") {
            return (
              <div className="product-sidebar__capability" key={item.id}>
                <button
                  aria-current={current ? "page" : undefined}
                  aria-expanded={capabilityMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setAccountOpen(false);
                    setFilterOpen(false);
                    setNotificationOpen(false);
                    moreRef.current?.removeAttribute("open");
                    setCapabilityMenuOpen((value) => !value);
                  }}
                  ref={capabilityTriggerRef}
                  type="button"
                >
                  <ProductPlaygroundIcon name={item.icon} />
                  <span>{localizeProductText(item.label, locale)}</span>
                </button>
                <ProductCapabilityMenu
                  activeTab={capabilityTab}
                  locale={locale}
                  onClose={() => setCapabilityMenuOpen(false)}
                  onSelect={(tab) => {
                    onSelectCapabilityTab(tab);
                    setCapabilityMenuOpen(false);
                    onCloseMobile();
                  }}
                  open={capabilityMenuOpen}
                  triggerRef={capabilityTriggerRef}
                />
              </div>
            );
          }

          return (
            <Link
              aria-current={current ? "page" : undefined}
              href={viewHref(item.id)}
              key={item.id}
              onClick={closeNavigationLayers}
            >
              <ProductPlaygroundIcon name={item.icon} />
              <span>{localizeProductText(item.label, locale)}</span>
            </Link>
          );
        })}
        <details className="product-sidebar__more" ref={moreRef}>
          <summary
            aria-current={view === "resources" ? "page" : undefined}
            onClick={() => {
              setAccountOpen(false);
              setFilterOpen(false);
              setNotificationOpen(false);
            }}
          >
            <ProductPlaygroundIcon name="more" />
            <span>{zh ? "更多" : "More"}</span>
            <small>{zh ? "资料库 · 灵感" : "Resources"}</small>
          </summary>
          <div role="menu" aria-label={zh ? "更多资源" : "More resources"}>
            {resourceNavigation.map((item) => (
              <Link
                aria-current={
                  view === "resources" && resource === item.id
                    ? "page"
                    : undefined
                }
                href={resourceHref(item.id)}
                key={item.id}
                onClick={closeNavigationLayers}
                role="menuitem"
              >
                <ProductPlaygroundIcon name={item.icon} />
                {localizeProductText(item.label, locale)}
              </Link>
            ))}
          </div>
        </details>
      </nav>

      <div className="product-sidebar__history">
        <section>
          <h2>{zh ? "任务 (1)" : "Tasks (1)"}</h2>
          {taskVisible ? (
            <Link
              aria-current={view === "session" ? "page" : undefined}
              href={viewHref("session")}
              onClick={closeNavigationLayers}
            >
              <span>{zh ? "修复会话恢复" : "Fix session recovery"}</span>
              <time>{zh ? "今天" : "Today"}</time>
            </Link>
          ) : (
            <p>{zh ? "没有符合条件的任务" : "No matching tasks"}</p>
          )}
        </section>
        <section>
          <h2>{zh ? "空间 (1)" : "Spaces (1)"}</h2>
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
                <span>{zh ? "A3S UI 体验优化" : "A3S UI experience"}</span>
              </Link>
              <button
                aria-expanded={projectExpanded}
                aria-label={
                  projectExpanded
                    ? zh
                      ? "收起项目任务"
                      : "Collapse project tasks"
                    : zh
                      ? "展开项目任务"
                      : "Expand project tasks"
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
          onClick={() => {
            setAccountOpen(false);
            setFilterOpen(false);
            setNotificationOpen((value) => !value);
          }}
          type="button"
        >
          <ProductPlaygroundIcon name="notification" />
        </button>
        <button
          aria-label={zh ? "设置" : "Settings"}
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
        >
          <header>
            <strong>{zh ? "消息中心" : "Notifications"}</strong>
            <button
              aria-label={zh ? "关闭消息中心" : "Close notifications"}
              onClick={() => setNotificationOpen(false)}
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
                {zh ? "今天 · A3S UI 体验优化" : "Today · A3S UI experience"}
              </small>
            </div>
          </article>
        </section>
      ) : null}
    </aside>
  );
}

export function ProductApplication() {
  const language = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const locale: ProductPlaygroundLocale = language === "en" ? "en" : "zh";
  const zh = locale === "zh";
  const { resource, view } = getProductApplicationRouteState(
    removeBase(location.pathname),
  );
  const [hydrated, setHydrated] = useState(false);
  const capabilityTab = hydrated
    ? getProductCapabilityTab(location.search)
    : "assistants";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("system");
  const [exitOpen, setExitOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 48rem)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const titles: Record<ProductPlaygroundView, string> = {
      assistant: zh ? "助理" : "Assistant",
      automation: zh ? "自动化" : "Automations",
      catalog: zh ? "能力目录" : "Capabilities",
      project: zh ? "A3S UI 体验优化" : "A3S UI experience",
      "project-session": zh ? "发布就绪检查" : "Release readiness",
      projects: zh ? "项目" : "Projects",
      resources: zh ? "资源" : "Resources",
      session: zh ? "修复会话恢复" : "Fix session recovery",
      start: zh ? "新建任务" : "New task",
    };
    document.title = `${titles[view]} · A3S`;
  }, [view, zh]);

  const routeHref = (
    nextView: ProductPlaygroundView,
    nextResource: ProductResourceView = resource,
  ) => withBase(getProductApplicationRoutePath(nextView, locale, nextResource));

  const navigateToView = (
    nextView: ProductPlaygroundView,
    nextResource: ProductResourceView = resource,
  ) => navigate(getProductApplicationRoutePath(nextView, locale, nextResource));

  const navigateToCapabilityTab = (tab: ProductCapabilityTab) =>
    navigate(getProductCapabilityRoutePath(tab, locale));

  const openSettings = (section: SettingsSection) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  return (
    <section
      className="a3s-product-application rp-not-doc"
      data-product-application
      data-sidebar-collapsed={sidebarCollapsed ? "true" : undefined}
      data-view={view}
    >
      <button
        aria-expanded={mobileOpen}
        aria-label={
          mobileOpen
            ? zh
              ? "关闭应用导航"
              : "Close application navigation"
            : zh
              ? "打开应用导航"
              : "Open application navigation"
        }
        className="product-application__mobile-menu"
        onClick={() => setMobileOpen((value) => !value)}
        type="button"
      >
        <ProductPlaygroundIcon name={mobileOpen ? "close" : "menu"} />
      </button>
      {mobileOpen ? (
        <button
          aria-label={zh ? "关闭应用导航" : "Close application navigation"}
          className="product-application__backdrop"
          data-visible="true"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}
      <ProductSidebar
        capabilityTab={capabilityTab}
        collapsed={sidebarCollapsed}
        compact={compact}
        locale={locale}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSettings={openSettings}
        onRequestExit={() => setExitOpen(true)}
        onSelectCapabilityTab={navigateToCapabilityTab}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        resourceHref={(nextResource) => routeHref("resources", nextResource)}
        resource={resource}
        viewHref={(nextView) => routeHref(nextView)}
        view={view}
      />
      <main className="product-application__main">
        {view === "start" ? <ProductStartSurface locale={locale} /> : null}
        {view === "assistant" ? (
          <ProductAssistantSurface
            locale={locale}
            onOpenSettings={() => openSettings("assistant")}
          />
        ) : null}
        {view === "projects" ? (
          <ProductProjectsSurface
            locale={locale}
            projectHref={routeHref("project")}
          />
        ) : null}
        {view === "project" ? (
          <ProductProjectWorkspaceSurface
            locale={locale}
            projectHref={routeHref("project")}
            projectsHref={routeHref("projects")}
            sessionHref={routeHref("project-session")}
          />
        ) : null}
        {view === "project-session" ? (
          <ProductProjectSessionSurface
            locale={locale}
            projectHref={routeHref("project")}
            projectsHref={routeHref("projects")}
          />
        ) : null}
        {view === "catalog" ? (
          <ProductCatalogSurface
            locale={locale}
            onTabChange={navigateToCapabilityTab}
            tab={capabilityTab}
          />
        ) : null}
        {view === "automation" ? (
          <ProductAutomationSurface locale={locale} />
        ) : null}
        {view === "resources" ? (
          <ProductResourcesSurface
            locale={locale}
            resource={resource}
            startHref={routeHref("start")}
          />
        ) : null}
        {view === "session" ? <ProductSessionSurface locale={locale} /> : null}
      </main>
      <ProductSettingsDialog
        initialSection={settingsSection}
        locale={locale}
        onClose={() => setSettingsOpen(false)}
        open={settingsOpen}
      />
      <ProductSearchDialog
        locale={locale}
        onClose={() => setSearchOpen(false)}
        onSelectView={(next) => {
          setSearchOpen(false);
          setMobileOpen(false);
          navigateToView(next);
        }}
        open={searchOpen}
      />
      <ProductExitDialog
        locale={locale}
        onClose={() => setExitOpen(false)}
        onConfirm={() => {
          document.dispatchEvent(
            new CustomEvent("a3s:application-exit", {
              detail: { source: "account-menu", view },
            }),
          );
          setExitOpen(false);
          setMobileOpen(false);
          navigateToView("start");
        }}
        open={exitOpen}
      />
    </section>
  );
}
