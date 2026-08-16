export * from "dockview";

import type {
  DockviewApi,
  DockviewTheme,
  DockviewIDisposable,
  SerializedDockview,
} from "dockview";

export declare const themeA3S: Readonly<DockviewTheme>;

export type DockviewOpenSourceCapability =
  | "dockable-grid"
  | "nested-layouts"
  | "watermark"
  | "tab-strip-position"
  | "headerless-groups"
  | "full-width-single-tab"
  | "custom-tab-components"
  | "header-action-slots"
  | "tab-overflow-menu"
  | "animated-tab-dragging"
  | "tab-group-chips"
  | "custom-tab-group-chip"
  | "tab-drag-and-drop"
  | "group-drag-and-drop"
  | "external-drag-and-drop"
  | "touch-and-pen"
  | "per-feature-drag-opt-out"
  | "edge-drop-zones"
  | "drag-backend-strategy"
  | "custom-drop-overlay"
  | "custom-group-drag-preview"
  | "floating-groups"
  | "floating-group-bounds"
  | "floating-group-drag-handle"
  | "popout-windows"
  | "custom-popout-url"
  | "edge-groups"
  | "locked-groups-and-panels"
  | "maximize-and-restore"
  | "drag-to-resize-splitters"
  | "size-constraints"
  | "auto-resize"
  | "borderless-mode"
  | "render-modes"
  | "custom-scrollbars"
  | "strict-csp"
  | "save-and-restore-layouts"
  | "full-state-capture"
  | "custom-panel-state"
  | "empty-state-behavior"
  | "built-in-themes"
  | "css-variable-theming"
  | "tab-group-color-palette"
  | "programmatic-layout-control"
  | "directional-placement"
  | "panel-and-group-apis"
  | "active-panel-tracking"
  | "panel-lifecycle-events"
  | "runtime-option-updates"
  | "custom-ui-messages"
  | "full-event-surface"
  | "keyboard-focus-navigation"
  | "aria-roles-and-labels"
  | "screen-reader-announcements"
  | "focus-indicators"
  | "shadow-dom"
  | "gridview"
  | "splitview"
  | "paneview"
  | "react"
  | "vue";

export declare const dockviewOpenSourceCapabilities: readonly DockviewOpenSourceCapability[];

export type DockviewCommercialOnlyCapability =
  | "advanced-tab-overflow"
  | "multi-row-tabs"
  | "pinned-tabs"
  | "tab-context-menus"
  | "tab-group-chip-context-menus"
  | "drag-and-drop-compass"
  | "smart-guides"
  | "auto-hide-edge-groups"
  | "dock-to-edge-groups"
  | "layout-history"
  | "spatial-keyboard-navigation"
  | "keyboard-docking";

export declare const dockviewCommercialOnlyCapabilities: readonly DockviewCommercialOnlyCapability[];

/**
 * Removes every edge slot, clears the remaining groups, and optionally creates
 * a fresh default layout. Dockview's native `clear()` intentionally preserves
 * edge slots, so use this helper before rebuilding a layout with Edge Groups.
 */
export function resetDockviewLayout(
  api: DockviewApi,
  initialize?: (api: DockviewApi) => void,
): void;

export interface DockviewStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface SerializableDockviewLayoutApi<Layout = SerializedDockview> {
  fromJSON(layout: Layout): void;
  onDidLayoutChange(listener: () => void): DockviewIDisposable;
  toJSON(): Layout;
}

export type DockviewPersistenceOperation = "clear" | "restore" | "save";
export type DockviewPersistenceStatus =
  "empty" | "error" | "incompatible" | "invalid" | "restored" | "unavailable";

export type DockviewPersistenceResult<Layout = SerializedDockview> = {
  error?: Error;
  fromVersion?: number;
  layout?: Layout;
  status: DockviewPersistenceStatus;
};

export interface DockviewLayoutPersistenceOptions<Layout = SerializedDockview> {
  debounce?: number;
  key?: string;
  migrate?: (layout: unknown, fromVersion: number, toVersion: number) => Layout;
  onError?: (error: Error, operation: DockviewPersistenceOperation) => void;
  onRestore?: (layout: Layout) => void;
  onSave?: (layout: Layout) => void;
  storage?: DockviewStorage;
  validate?: (layout: unknown) => layout is Layout;
  version?: number;
}

export interface DockviewLayoutPersistence<Layout = SerializedDockview> {
  bind(api: SerializableDockviewLayoutApi<Layout>): DockviewIDisposable;
  clear(): boolean;
  flush(): boolean;
  readonly key: string;
  restore(
    api: SerializableDockviewLayoutApi<Layout>,
  ): DockviewPersistenceResult<Layout>;
  save(api: SerializableDockviewLayoutApi<Layout>): boolean;
  schedule(api: SerializableDockviewLayoutApi<Layout>): boolean;
  readonly version: number;
}

export function createDockviewLayoutPersistence<Layout = SerializedDockview>(
  options?: DockviewLayoutPersistenceOptions<Layout>,
): DockviewLayoutPersistence<Layout>;
