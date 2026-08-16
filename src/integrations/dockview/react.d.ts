export * from "dockview-react";
export {
  createDockviewLayoutPersistence,
  dockviewCommercialOnlyCapabilities,
  dockviewOpenSourceCapabilities,
  themeA3S,
} from "./shared.js";

import type {
  DockviewApi,
  DockviewReadyEvent,
  GridviewApi,
  PaneviewApi,
  SerializedDockview,
  SplitviewApi,
} from "dockview";
import type {
  GridviewReadyEvent,
  PaneviewReadyEvent,
  SplitviewReadyEvent,
} from "dockview-react";
import type {
  DockviewLayoutPersistence,
  DockviewLayoutPersistenceOptions,
  DockviewPersistenceResult,
  DockviewPersistenceStatus,
} from "./shared.js";

export interface UseDockviewLayoutOptions
  extends DockviewLayoutPersistenceOptions<SerializedDockview> {
  initialize?: (api: DockviewApi) => void;
  onReady?: (
    event: DockviewReadyEvent,
    result: DockviewPersistenceResult<SerializedDockview>,
  ) => void;
  persistence?: DockviewLayoutPersistence<SerializedDockview>;
  restore?: boolean;
}

export interface DockviewLayoutHandle {
  api: DockviewApi | null;
  clear(): boolean;
  onReady(event: DockviewReadyEvent): void;
  reset(): boolean;
  restore(): DockviewPersistenceResult<SerializedDockview>;
  save(): boolean;
  status: DockviewPersistenceStatus | "idle";
}

export interface UseViewApiOptions<Event> {
  onReady?: (event: Event) => void;
}

export interface ViewApiHandle<Api, Event> {
  api: Api | null;
  onReady(event: Event): void;
  ready: boolean;
}

export function useGridview(
  options?: UseViewApiOptions<GridviewReadyEvent>,
): ViewApiHandle<GridviewApi, GridviewReadyEvent>;

export function useSplitview(
  options?: UseViewApiOptions<SplitviewReadyEvent>,
): ViewApiHandle<SplitviewApi, SplitviewReadyEvent>;

export function usePaneview(
  options?: UseViewApiOptions<PaneviewReadyEvent>,
): ViewApiHandle<PaneviewApi, PaneviewReadyEvent>;

export function useDockviewLayout(
  options?: UseDockviewLayoutOptions,
): DockviewLayoutHandle;
