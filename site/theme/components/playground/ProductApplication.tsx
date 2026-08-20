import { useEffect, useState } from "react";
import {
  removeBase,
  useLang,
  useLocation,
  useNavigate,
  withBase,
} from "@rspress/core/runtime";
import {
  getCanonicalProductApplicationRoutePath,
  getProductApplicationRoutePath,
  getProductApplicationRouteState,
  getProductCapabilityRoutePath,
  getProductCapabilityTab,
  isLegacyProductApplicationRoute,
} from "../../../product-application-routes";
import type {
  ProductCapabilityTab,
  ProductPlaygroundLocale,
  ProductPlaygroundView,
  ProductResourceView,
} from "./product-playground-data";
import { ProductCatalogSurface } from "./ProductCapabilitySurface";
import { ProductResourcesSurface } from "./ProductResourceSurfaces";
import { ProductAutomationSurface } from "./ProductAutomationSurface";
import { ProductNavigationSidebar } from "./ProductNavigationSidebar";
import { ProductMarketplaceSurface } from "./ProductMarketplaceSurface";
import { ProductMemorySurface } from "./ProductMemorySurface";
import {
  ProductExitDialog,
  ProductSearchDialog,
  type ProductSearchDestination,
} from "./ProductOverlayMenus";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import type { ProductComposerContext } from "./ProductComposer";
import type { ProductTaskDraft } from "./product-composer-data";
import { productProjectName } from "./product-project-data";
import { ProductProjectSessionSurface } from "./ProductProjectSurfaces";
import { ProductProjectWorkspaceSurface } from "./ProductProjectWorkspaceSurface";
import { ProductSessionSurface } from "./ProductSessionSurface";
import { ProductSettingsDialog } from "./ProductSettingsDialog";
import type { SettingsSection } from "./ProductSettingsSections";
import {
  ProductAssistantSurface,
  ProductProjectsSurface,
  ProductStartSurface,
} from "./ProductTaskSurfaces";
import {
  clearPendingProductTaskDraft,
  createProductTaskSession,
  enqueueProductTaskFollowUp,
  formatProductTaskTitle,
  getProductTaskPersistenceStatus,
  moveProductTaskQueuedFollowUp,
  readPendingProductTaskDraft,
  readProductTaskSession,
  removeProductTaskQueuedFollowUp,
  runNextProductTaskQueuedFollowUp,
  setProductTaskQueuePaused,
  updateProductTaskQueuedFollowUp,
  writePendingProductTaskDraft,
  writeProductTaskSession,
  type ProductTaskOrigin,
  type ProductTaskSession,
} from "./product-task-session-state";

/*
THESIS: One task-first product workbench; refuse galleries, IDE chrome, and documentation scaffolds.
OWN-WORLD: Neutral operating canvas, compact context rail, flat panels, precise controls, and sparse A3S blue.
STORY: Start a task, bind context and run policy, follow execution, inspect artifacts, and manage durable resources.
FIRST VIEWPORT: Context rail at left, quiet task canvas in the center, one dominant composer above the fold.
FORM: User-confirmed pinned desktop-workbench canon; approval recorded 2026-08-19; seed user-pinned-operate-v5-3-3.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md.
*/

export function ProductApplication() {
  const language = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const locale: ProductPlaygroundLocale = language === "en" ? "en" : "zh";
  const zh = locale === "zh";
  const routePathname = removeBase(location.pathname);
  const { resource, view } = getProductApplicationRouteState(routePathname);
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
  const [taskSession, setTaskSession] = useState<ProductTaskSession | null>(
    null,
  );
  const [taskSessionReady, setTaskSessionReady] = useState(false);
  const [taskPersistenceStatus, setTaskPersistenceStatus] = useState<
    "memory" | "saved"
  >("saved");
  const [taskDraft, setTaskDraft] = useState<ProductTaskDraft | null>(null);

  useEffect(() => {
    const storedSession = readProductTaskSession();
    const pendingDraft = readPendingProductTaskDraft();
    setTaskSession(storedSession);
    setTaskDraft(pendingDraft);
    setTaskPersistenceStatus(getProductTaskPersistenceStatus());
    setTaskSessionReady(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!isLegacyProductApplicationRoute(routePathname)) return;
    const canonicalPath = getCanonicalProductApplicationRoutePath(
      routePathname,
      locale,
    );
    window.history.replaceState(
      window.history.state,
      "",
      `${withBase(canonicalPath)}${window.location.search}${window.location.hash}`,
    );
  }, [locale, routePathname]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 48rem)");
    const update = () => {
      setCompact(query.matches);
      if (!query.matches) setMobileOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setExitOpen(false);
    setSettingsOpen(false);
  }, [location.hash, location.key, location.pathname, location.search]);

  useEffect(() => {
    const titles: Record<ProductPlaygroundView, string> = {
      assistant: zh ? "助理" : "Assistant",
      automation: zh ? "自动化" : "Automations",
      catalog: zh ? "能力目录" : "Capabilities",
      "created-session": taskSession
        ? formatProductTaskTitle(taskSession.prompt, locale)
        : zh
          ? "当前任务"
          : "Current task",
      marketplace: zh ? "扩展" : "Extensions",
      memory: zh ? "记忆" : "Memory",
      project: productProjectName[locale],
      "project-session": zh ? "发布就绪检查" : "Release readiness",
      projects: zh ? "项目" : "Projects",
      resources: zh ? "资源" : "Resources",
      session: zh ? "修复会话恢复" : "Fix session recovery",
      start: zh ? "新建任务" : "New task",
    };
    document.title = `${titles[view]} · A3S`;
  }, [locale, taskSession, view, zh]);

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

  const createTask = (
    value: string,
    context: ProductComposerContext,
    origin: ProductTaskOrigin,
  ) => {
    const session = createProductTaskSession(value, context, origin);
    const persisted = writeProductTaskSession(session);
    setTaskSession(session);
    setTaskSessionReady(true);
    setTaskPersistenceStatus(persisted ? "saved" : "memory");
    setTaskDraft(null);
    clearPendingProductTaskDraft();
    navigateToView("created-session");
  };

  const startTaskWithContext = (draft: Omit<ProductTaskDraft, "revision">) => {
    setTaskDraft(writePendingProductTaskDraft(draft));
    navigateToView("start");
  };

  const updateTaskSession = (
    update: (session: ProductTaskSession) => ProductTaskSession,
  ) => {
    if (!taskSession) return;
    const nextSession = update(taskSession);
    const persisted = writeProductTaskSession(nextSession);
    setTaskSession(nextSession);
    setTaskPersistenceStatus(persisted ? "saved" : "memory");
  };

  const addTaskFollowUp = (
    message: string,
    context: ProductComposerContext,
  ) => {
    updateTaskSession((session) =>
      enqueueProductTaskFollowUp(session, message, context),
    );
  };

  const openSettings = (section: SettingsSection) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  const openGlobalSearch = () => {
    setExitOpen(false);
    setSettingsOpen(false);
    setMobileOpen(false);
    setSearchOpen(true);
  };

  const openSearchDestination = (destination: ProductSearchDestination) => {
    setSearchOpen(false);
    setMobileOpen(false);
    if (destination.type === "view") {
      navigateToView(destination.view);
      return;
    }
    if (destination.type === "resource") {
      navigateToView("resources", destination.resource);
      return;
    }
    if (destination.type === "capability") {
      navigateToCapabilityTab(destination.tab);
      return;
    }
    openSettings(destination.section);
  };

  return (
    <section
      className="a3s-product-application rp-not-doc"
      data-direction-contract="user-pinned-operate-v5-3-3"
      data-product-application
      data-sidebar-collapsed={sidebarCollapsed ? "true" : undefined}
      data-view={view}
      onKeyDown={(event) => {
        if (
          !(event.metaKey || event.ctrlKey) ||
          event.key.toLowerCase() !== "k"
        ) {
          return;
        }
        event.preventDefault();
        openGlobalSearch();
      }}
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
        <div
          aria-hidden="true"
          className="product-application__backdrop"
          data-visible="true"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <ProductNavigationSidebar
        capabilityHref={(tab) =>
          withBase(getProductCapabilityRoutePath(tab, locale))
        }
        collapsed={sidebarCollapsed}
        compact={compact}
        createdTaskTitle={
          taskSessionReady && taskSession
            ? formatProductTaskTitle(taskSession.prompt, locale)
            : null
        }
        locale={locale}
        languageHref={withBase(
          getProductApplicationRoutePath(
            view,
            locale === "zh" ? "en" : "zh",
            resource,
          ),
        )}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onOpenSearch={openGlobalSearch}
        onOpenSettings={openSettings}
        onRequestExit={() => setExitOpen(true)}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        resource={resource}
        resourceHref={(nextResource) => routeHref("resources", nextResource)}
        view={view}
        viewHref={(nextView) => routeHref(nextView)}
      />
      <main
        className="product-application__main"
        inert={compact && mobileOpen ? true : undefined}
      >
        {view === "start" ? (
          <ProductStartSurface
            initialDraft={taskDraft}
            locale={locale}
            onCreateTask={(value, context) =>
              createTask(value, context, "start")
            }
            onOpenModelSettings={() => openSettings("models")}
          />
        ) : null}
        {view === "assistant" ? (
          <ProductAssistantSurface
            filesHref={routeHref("resources", "files")}
            locale={locale}
            onCreateTask={(value, context) =>
              createTask(value, context, "assistant")
            }
            onOpenModelSettings={() => openSettings("models")}
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
            onOpenModelSettings={() => openSettings("models")}
            projectHref={routeHref("project")}
            projectsHref={routeHref("projects")}
            sessionHref={routeHref("project-session")}
          />
        ) : null}
        {view === "project-session" ? (
          <ProductProjectSessionSurface
            locale={locale}
            onOpenModelSettings={() => openSettings("models")}
            projectHref={routeHref("project")}
            projectsHref={routeHref("projects")}
          />
        ) : null}
        {view === "catalog" ? (
          <ProductCatalogSurface
            locale={locale}
            onStartTask={startTaskWithContext}
            onTabChange={navigateToCapabilityTab}
            tab={capabilityTab}
          />
        ) : null}
        {view === "automation" ? (
          <ProductAutomationSurface locale={locale} />
        ) : null}
        {view === "memory" ? (
          <ProductMemorySurface
            locale={locale}
            onOpenMemorySettings={() => openSettings("memory")}
            onStartTask={startTaskWithContext}
          />
        ) : null}
        {view === "marketplace" ? (
          <ProductMarketplaceSurface locale={locale} />
        ) : null}
        {view === "resources" ? (
          <ProductResourcesSurface
            locale={locale}
            onStartTask={startTaskWithContext}
            resource={resource}
            startHref={routeHref("start")}
          />
        ) : null}
        {view === "session" ? (
          <ProductSessionSurface
            locale={locale}
            onOpenModelSettings={() => openSettings("models")}
            variant="seeded"
          />
        ) : null}
        {view === "created-session" ? (
          <ProductSessionSurface
            locale={locale}
            onMoveQueuedFollowUp={(id, offset) =>
              updateTaskSession((session) =>
                moveProductTaskQueuedFollowUp(session, id, offset),
              )
            }
            onOpenModelSettings={() => openSettings("models")}
            onPauseQueue={() =>
              updateTaskSession((session) =>
                setProductTaskQueuePaused(session, true),
              )
            }
            onRemoveQueuedFollowUp={(id) =>
              updateTaskSession((session) =>
                removeProductTaskQueuedFollowUp(session, id),
              )
            }
            onResumeQueue={() =>
              updateTaskSession((session) =>
                setProductTaskQueuePaused(session, false),
              )
            }
            onRunNextQueuedFollowUp={() =>
              updateTaskSession(runNextProductTaskQueuedFollowUp)
            }
            onUpdateQueuedFollowUp={(id, message) =>
              updateTaskSession((session) =>
                updateProductTaskQueuedFollowUp(session, id, message),
              )
            }
            onFollowUp={addTaskFollowUp}
            persistenceStatus={taskPersistenceStatus}
            startHref={routeHref("start")}
            taskSession={taskSession}
            taskSessionReady={taskSessionReady}
            variant="created"
          />
        ) : null}
      </main>
      <ProductSettingsDialog
        initialSection={settingsSection}
        locale={locale}
        onClose={() => setSettingsOpen(false)}
        open={settingsOpen}
      />
      <ProductSearchDialog
        createdTaskTitle={
          taskSessionReady && taskSession
            ? formatProductTaskTitle(taskSession.prompt, locale)
            : null
        }
        locale={locale}
        onClose={() => setSearchOpen(false)}
        onSelect={openSearchDestination}
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
