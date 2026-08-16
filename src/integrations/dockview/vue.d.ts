export * from "dockview";
export {
  createDockviewLayoutPersistence,
  dockviewCommercialOnlyCapabilities,
  dockviewOpenSourceCapabilities,
  themeA3S,
} from "./shared.js";

import type {
  DockviewApi,
  DockviewDidDropEvent,
  DockviewGroupPanel,
  DockviewOptions,
  DockviewReadyEvent,
  DockviewWillDropEvent,
  GridviewApi,
  GridviewOptions,
  GridviewPanelApi,
  IChipContextMenuItemComponentProps,
  IContentRenderer,
  IContextMenuItemComponentProps,
  IDockviewGroupPanel,
  IDockviewPanelProps,
  IGroupDragGhostRenderer,
  IGroupHeaderProps,
  IHeaderActionsRenderer,
  ITabGroup,
  ITabGroupChipRenderer,
  ITabRenderer,
  IWatermarkRenderer,
  PaneviewApi,
  PaneviewDidDropEvent,
  PaneviewOptions,
  PaneviewPanelApi,
  PanelUpdateEvent,
  Parameters as DockviewParameters,
  SerializedDockview,
  SplitviewApi,
  SplitviewOptions,
  SplitviewPanelApi,
  TabPartInitParameters,
  WatermarkRendererInitParameters,
} from "dockview";
import type {
  Component,
  ComponentInternalInstance,
  DefineComponent,
  ShallowReactive,
  ShallowRef,
} from "vue";
import type {
  DockviewLayoutPersistence,
  DockviewLayoutPersistenceOptions,
  DockviewPersistenceResult,
  DockviewPersistenceStatus,
} from "./shared.js";

/** A Vue component accepted by the official Dockview Vue renderer. */
export type VueComponent<Props = Record<string, unknown>> =
  DefineComponent<Props>;

export type ComponentInterface = Component;

export interface VueProps {
  components?: Record<string, Component>;
  defaultTabComponent?: string | Component;
  groupDragGhostComponent?: string | Component;
  leftHeaderActionsComponent?: string | Component;
  prefixHeaderActionsComponent?: string | Component;
  rightHeaderActionsComponent?: string | Component;
  tabComponents?: Record<string, Component>;
  tabGroupChipComponent?: string | Component;
  watermarkComponent?: string | Component;
}

export type VueEvents = {
  didDrop: [event: DockviewDidDropEvent];
  ready: [event: DockviewReadyEvent];
  willDrop: [event: DockviewWillDropEvent];
};

export type IDockviewVueProps = DockviewOptions & VueProps;

/** Props exposed to a named DockviewVue panel slot or registered component. */
export type IDockviewVuePanelProps<
  Params extends Record<string, unknown> = Record<string, unknown>,
> = IDockviewPanelProps<Params>;

export interface GridviewReadyEvent {
  api: GridviewApi;
}

export interface IGridviewVuePanelProps<
  Params extends Record<string, unknown> = Record<string, unknown>,
> {
  api: GridviewPanelApi;
  containerApi: GridviewApi;
  params: Params;
}

export interface IGridviewVueProps extends GridviewOptions {
  components?: Record<string, Component>;
}

export type GridviewVueEvents = {
  ready: [event: GridviewReadyEvent];
};

export interface SplitviewReadyEvent {
  api: SplitviewApi;
}

export interface ISplitviewVuePanelProps<
  Params extends Record<string, unknown> = Record<string, unknown>,
> {
  api: SplitviewPanelApi;
  containerApi: SplitviewApi;
  params: Params;
}

export interface ISplitviewVueProps extends SplitviewOptions {
  components?: Record<string, Component>;
}

export type SplitviewVueEvents = {
  ready: [event: SplitviewReadyEvent];
};

export interface PaneviewReadyEvent {
  api: PaneviewApi;
}

export interface IPaneviewVuePanelProps<
  Params extends Record<string, unknown> = Record<string, unknown>,
> {
  api: PaneviewPanelApi;
  containerApi: PaneviewApi;
  params: Params;
  title: string;
}

export interface IPaneviewVueProps extends PaneviewOptions {
  components?: Record<string, Component>;
}

export type PaneviewVueEvents = {
  didDrop: [event: PaneviewDidDropEvent];
  ready: [event: PaneviewReadyEvent];
};

export declare const DockviewVue: DefineComponent<IDockviewVueProps>;
export declare const GridviewVue: DefineComponent<IGridviewVueProps>;
export declare const SplitviewVue: DefineComponent<ISplitviewVueProps>;
export declare const PaneviewVue: DefineComponent<IPaneviewVueProps>;

export declare function findComponent(
  parent: ComponentInternalInstance,
  name: string,
  components?: Record<string, Component | undefined>,
): Component | null;

export declare function resolveComponent(
  value: string | Component | undefined,
  parent: ComponentInternalInstance,
  components?: Record<string, Component | undefined>,
): Component | undefined;

export declare function mountVueComponent<
  Props extends Record<string, unknown>,
>(
  component: VueComponent<Props>,
  parent: ComponentInternalInstance,
  props: Props,
  element: HTMLElement,
): VueMountDisposable;

export interface VueMountDisposable {
  dispose(): void;
  update(props: Record<string, unknown>): void;
}

export interface VueMountEntry {
  readonly component: Component;
  readonly id: number;
  readonly props: ShallowRef<Record<string, unknown>>;
  readonly target: HTMLElement;
}

export declare class VueRendererRegistry {
  readonly entries: ShallowReactive<VueMountEntry[]>;
  mount(
    component: Component,
    target: HTMLElement,
    props: Record<string, unknown>,
  ): VueMountDisposable;
}

export declare class VueRenderer implements ITabRenderer, IContentRenderer {
  constructor(
    component: Component,
    parent: ComponentInternalInstance,
    registry?: VueRendererRegistry,
  );
  get element(): HTMLElement;
  dispose(): void;
  init(parameters: TabPartInitParameters): void;
  update(event: PanelUpdateEvent<DockviewParameters>): void;
}

export declare class VueWatermarkRenderer implements IWatermarkRenderer {
  constructor(
    component: Component,
    parent: ComponentInternalInstance,
    registry?: VueRendererRegistry,
  );
  get element(): HTMLElement;
  dispose(): void;
  init(parameters: WatermarkRendererInitParameters): void;
  update(event: PanelUpdateEvent<DockviewParameters>): void;
}

export declare class VueHeaderActionsRenderer implements IHeaderActionsRenderer {
  constructor(
    component: Component,
    parent: ComponentInternalInstance,
    group: DockviewGroupPanel,
    registry?: VueRendererRegistry,
  );
  get element(): HTMLElement;
  dispose(): void;
  init(props: IGroupHeaderProps): void;
}

export declare class VueContextMenuItemRenderer {
  constructor(
    component: Component,
    parent: ComponentInternalInstance,
    registry?: VueRendererRegistry,
  );
  get element(): HTMLElement;
  dispose(): void;
  init(
    props: IContextMenuItemComponentProps | IChipContextMenuItemComponentProps,
  ): void;
}

export declare class VueTabGroupChipRenderer implements ITabGroupChipRenderer {
  constructor(
    component: Component,
    parent: ComponentInternalInstance,
    registry?: VueRendererRegistry,
  );
  get element(): HTMLElement;
  dispose(): void;
  init(params: { api: DockviewApi; tabGroup: ITabGroup }): void;
  update(params: { tabGroup: ITabGroup }): void;
}

export declare class VueGroupDragGhostRenderer implements IGroupDragGhostRenderer {
  constructor(
    component: Component,
    parent: ComponentInternalInstance,
    registry?: VueRendererRegistry,
  );
  get element(): HTMLElement;
  dispose(): void;
  init(params: { api: DockviewApi; group: IDockviewGroupPanel }): void;
}

export declare class VuePart<
  Props extends Record<string, unknown> = Record<string, unknown>,
> {
  constructor(
    element: HTMLElement,
    vueComponent: VueComponent<Props>,
    parent: ComponentInternalInstance,
    props: Props,
    registry?: VueRendererRegistry,
  );
  dispose(): void;
  init(): void;
  update(props: Props): void;
}

export interface UseDockviewLayoutOptions extends DockviewLayoutPersistenceOptions<SerializedDockview> {
  initialize?: (api: DockviewApi) => void;
  onReady?: (
    event: DockviewReadyEvent,
    result: DockviewPersistenceResult<SerializedDockview>,
  ) => void;
  persistence?: DockviewLayoutPersistence<SerializedDockview>;
  restore?: boolean;
}

export interface DockviewLayoutHandle {
  api: ShallowRef<DockviewApi | undefined>;
  clear(): boolean;
  onReady(event: DockviewReadyEvent): void;
  reset(): boolean;
  restore(): DockviewPersistenceResult<SerializedDockview>;
  save(): boolean;
  status: ShallowRef<DockviewPersistenceStatus | "idle">;
}

export interface UseViewApiOptions<Event> {
  onReady?: (event: Event) => void;
}

export interface ViewApiHandle<Api, Event> {
  api: ShallowRef<Api | undefined>;
  onReady(event: Event): void;
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
