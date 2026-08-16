export * from "dockview";

export const themeA3S = Object.freeze({
  className: "dockview-theme-a3s",
  dndOverlayBorder: "1px solid var(--a3s-blue, #1456f0)",
  dndOverlayMounting: "absolute",
  dndPanelOverlay: "group",
  dndTabIndicator: "line",
  edgeGroupCollapsedSize: 34,
  gap: 1,
  name: "a3s",
  tabAnimation: "smooth",
  tabGroupIndicator: "none",
});

export const dockviewOpenSourceCapabilities = Object.freeze([
  "dockable-grid",
  "nested-layouts",
  "watermark",
  "tab-strip-position",
  "headerless-groups",
  "full-width-single-tab",
  "custom-tab-components",
  "header-action-slots",
  "tab-overflow-menu",
  "animated-tab-dragging",
  "tab-group-chips",
  "custom-tab-group-chip",
  "tab-drag-and-drop",
  "group-drag-and-drop",
  "external-drag-and-drop",
  "touch-and-pen",
  "per-feature-drag-opt-out",
  "edge-drop-zones",
  "drag-backend-strategy",
  "custom-drop-overlay",
  "custom-group-drag-preview",
  "floating-groups",
  "floating-group-bounds",
  "floating-group-drag-handle",
  "popout-windows",
  "custom-popout-url",
  "edge-groups",
  "locked-groups-and-panels",
  "maximize-and-restore",
  "drag-to-resize-splitters",
  "size-constraints",
  "auto-resize",
  "borderless-mode",
  "render-modes",
  "custom-scrollbars",
  "strict-csp",
  "save-and-restore-layouts",
  "full-state-capture",
  "custom-panel-state",
  "empty-state-behavior",
  "built-in-themes",
  "css-variable-theming",
  "tab-group-color-palette",
  "programmatic-layout-control",
  "directional-placement",
  "panel-and-group-apis",
  "active-panel-tracking",
  "panel-lifecycle-events",
  "runtime-option-updates",
  "custom-ui-messages",
  "full-event-surface",
  "keyboard-focus-navigation",
  "aria-roles-and-labels",
  "screen-reader-announcements",
  "focus-indicators",
  "shadow-dom",
  "gridview",
  "splitview",
  "paneview",
  "react",
  "vue",
]);

export const dockviewCommercialOnlyCapabilities = Object.freeze([
  "advanced-tab-overflow",
  "multi-row-tabs",
  "pinned-tabs",
  "tab-context-menus",
  "tab-group-chip-context-menus",
  "drag-and-drop-compass",
  "smart-guides",
  "auto-hide-edge-groups",
  "dock-to-edge-groups",
  "layout-history",
  "spatial-keyboard-navigation",
  "keyboard-docking",
]);

const dockviewEdgePositions = ["top", "bottom", "left", "right"];

export function resetDockviewLayout(api, initialize) {
  if (!api || typeof api.clear !== "function") {
    throw new TypeError("A Dockview layout API is required.");
  }

  for (const position of dockviewEdgePositions) {
    if (api.getEdgeGroup(position)) api.removeEdgeGroup(position);
  }
  api.clear();
  initialize?.(api);
}

function reportError(callback, error, operation) {
  callback?.(
    error instanceof Error ? error : new Error(String(error)),
    operation,
  );
}

function browserStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isLayoutApi(api) {
  return Boolean(
    api &&
    typeof api.toJSON === "function" &&
    typeof api.fromJSON === "function" &&
    typeof api.onDidLayoutChange === "function",
  );
}

export function createDockviewLayoutPersistence(options = {}) {
  const key = options.key || "a3s-ui:dockview-layout";
  const version = Number.isInteger(options.version) ? options.version : 1;
  const debounce = Math.max(0, Number(options.debounce ?? 160));
  let timer = null;
  let pendingApi = null;

  const getStorage = () => options.storage || browserStorage();

  const save = (api) => {
    if (!isLayoutApi(api)) {
      const error = new TypeError(
        "A serializable Dockview layout API is required.",
      );
      reportError(options.onError, error, "save");
      return false;
    }
    const storage = getStorage();
    if (!storage) return false;

    try {
      const layout = api.toJSON();
      storage.setItem(
        key,
        JSON.stringify({
          layout,
          savedAt: new Date().toISOString(),
          version,
        }),
      );
      options.onSave?.(layout);
      return true;
    } catch (error) {
      reportError(options.onError, error, "save");
      return false;
    }
  };

  const flush = () => {
    if (timer !== null && typeof window !== "undefined") {
      window.clearTimeout(timer);
    }
    timer = null;
    const api = pendingApi;
    pendingApi = null;
    return api ? save(api) : false;
  };

  const schedule = (api) => {
    pendingApi = api;
    if (timer !== null && typeof window !== "undefined") {
      window.clearTimeout(timer);
    }
    if (debounce === 0 || typeof window === "undefined") return flush();
    timer = window.setTimeout(flush, debounce);
    return true;
  };

  const restore = (api) => {
    if (!isLayoutApi(api)) {
      const error = new TypeError(
        "A serializable Dockview layout API is required.",
      );
      reportError(options.onError, error, "restore");
      return { error, status: "error" };
    }
    const storage = getStorage();
    if (!storage) return { status: "unavailable" };

    let raw;
    try {
      raw = storage.getItem(key);
    } catch (error) {
      reportError(options.onError, error, "restore");
      return { error, status: "error" };
    }
    if (!raw) return { status: "empty" };

    try {
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== "object" || !("layout" in payload)) {
        throw new TypeError(
          "The stored Dockview layout has no layout payload.",
        );
      }
      let layout = payload.layout;
      const storedVersion = Number.isInteger(payload.version)
        ? payload.version
        : 0;
      if (storedVersion !== version) {
        if (!options.migrate) {
          return { fromVersion: storedVersion, status: "incompatible" };
        }
        layout = options.migrate(layout, storedVersion, version);
      }
      if (options.validate && !options.validate(layout)) {
        return { status: "invalid" };
      }
      api.fromJSON(layout);
      options.onRestore?.(layout);
      return { layout, status: "restored" };
    } catch (error) {
      reportError(options.onError, error, "restore");
      return { error, status: "invalid" };
    }
  };

  const clear = () => {
    const storage = getStorage();
    if (!storage) return false;
    try {
      storage.removeItem(key);
      return true;
    } catch (error) {
      reportError(options.onError, error, "clear");
      return false;
    }
  };

  const bind = (api) => {
    if (!isLayoutApi(api)) {
      throw new TypeError("A serializable Dockview layout API is required.");
    }
    const subscription = api.onDidLayoutChange(() => schedule(api));
    return {
      dispose() {
        subscription.dispose();
        flush();
      },
    };
  };

  return {
    bind,
    clear,
    flush,
    key,
    restore,
    save,
    schedule,
    version,
  };
}
