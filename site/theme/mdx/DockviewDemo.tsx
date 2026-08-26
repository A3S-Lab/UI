import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DockviewReact,
  GridviewReact,
  Orientation,
  PaneviewReact,
  SplitviewReact,
  type DockviewApi,
  type GridviewApi,
  type GridviewReadyEvent,
  type IDockviewPanelProps,
  type IGridviewPanelProps,
  type IPaneviewPanelProps,
  type ISplitviewPanelProps,
  type PaneviewApi,
  type PaneviewReadyEvent,
  type SplitviewApi,
  type SplitviewReadyEvent,
} from "dockview-react";
import { useLang } from "@rspress/core/runtime";
import {
  themeA3S,
  useDockviewLayout,
} from "../../../src/integrations/dockview/react.js";
import { ProductPlaygroundIcon } from "../components/playground/ProductPlaygroundIcon";
import { DockviewProductPanel } from "./DockviewProductPanels";
import "./DockviewDemo.css";

type DockviewDemoMode = "dock" | "grid" | "pane" | "split";
type DemoPanelParams = {
  description?: string;
  id: string;
  kind?: "canvas" | "context" | "output" | "preview";
  title: string;
};

function DemoPanel({ params }: IDockviewPanelProps<DemoPanelParams>) {
  return <PanelSurface params={params} />;
}

function GridPanel({ params }: IGridviewPanelProps<DemoPanelParams>) {
  return <PanelSurface params={params} />;
}

function SplitPanel({ params }: ISplitviewPanelProps<DemoPanelParams>) {
  return <PanelSurface params={params} />;
}

function PanePanel({ params }: IPaneviewPanelProps<DemoPanelParams>) {
  return <PanelSurface params={params} />;
}

function PanelSurface({ params }: { params: DemoPanelParams }) {
  const language = useLang();
  return (
    <DockviewProductPanel
      id={params.id}
      kind={params.kind ?? "canvas"}
      locale={language === "zh" ? "zh" : "en"}
    />
  );
}

function PaneHeader({
  api,
  params,
  title,
}: IPaneviewPanelProps<DemoPanelParams>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(api.isExpanded);

  useEffect(() => {
    const redundantFocusTarget = buttonRef.current?.closest<HTMLElement>(
      '[role="group"][tabindex]',
    );
    if (redundantFocusTarget) {
      redundantFocusTarget.removeAttribute("role");
      redundantFocusTarget.tabIndex = -1;
    }
    setExpanded(api.isExpanded);
    const subscription = api.onDidExpansionChange(({ isExpanded }) => {
      setExpanded(isExpanded);
    });
    return () => subscription.dispose();
  }, [api]);

  return (
    <button
      aria-expanded={expanded}
      className="dockview-demo__pane-header"
      data-pane-header={params.id}
      onClick={() => api.setExpanded(!api.isExpanded)}
      ref={buttonRef}
      type="button"
    >
      <span aria-hidden="true" />
      {title}
    </button>
  );
}

const dockComponents = { panel: DemoPanel };
const gridComponents = { panel: GridPanel };
const splitComponents = { panel: SplitPanel };
const paneComponents = { panel: PanePanel };
const paneHeaders = { header: PaneHeader };

function DockWorkspaceDemo() {
  const language = useLang();
  const zh = language === "zh";
  const rootRef = useRef<HTMLElement>(null);
  const initializedCompactRef = useRef<boolean | null>(null);
  const [activeMaximized, setActiveMaximized] = useState(false);
  const [compact, setCompact] = useState(false);
  const [previewLocation, setPreviewLocation] = useState<"docked" | "floating">(
    "docked",
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = (width: number) => setCompact(width < 560);
    update(root.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const initialize = useCallback(
    (api: DockviewApi) => {
      initializedCompactRef.current = compact;
      const task = api.addPanel({
        component: "panel",
        id: "task",
        params: {
          description: zh
            ? "目标、记录与恢复操作"
            : "Goal, transcript, and recovery actions",
          id: "task",
          kind: "context",
          title: zh ? "任务" : "Task",
        },
        title: zh ? "任务" : "Task",
      });
      const editor = api.addPanel({
        component: "panel",
        id: "editor",
        params: {
          description: zh ? "主要工作画布" : "Primary work canvas",
          id: "editor",
          kind: "canvas",
          title: zh ? "编辑器" : "Editor",
        },
        position: {
          direction: compact ? "within" : "right",
          referencePanel: task,
        },
        title: zh ? "编辑器" : "Editor",
      });
      api.addPanel({
        component: "panel",
        id: "preview",
        params: {
          description: zh
            ? "可拖动到任意停靠区"
            : "Drag into any docking target",
          id: "preview",
          kind: "preview",
          title: zh ? "预览" : "Preview",
        },
        position: { direction: "within", referencePanel: editor },
        title: zh ? "预览" : "Preview",
      });
      api.addPanel({
        component: "panel",
        id: "terminal",
        params: {
          description: "12 passed · 0 failed",
          id: "terminal",
          kind: "output",
          title: zh ? "终端" : "Terminal",
        },
        position: {
          direction: compact ? "within" : "below",
          referencePanel: editor,
        },
        title: zh ? "终端" : "Terminal",
      });

      const explorerPosition = compact
        ? { direction: "within" as const, referencePanel: editor }
        : {
            referenceGroup: api.addEdgeGroup("left", {
              collapsedSize: 32,
              id: "explorer-edge",
              initialSize: 176,
              minimumSize: 132,
            }).id,
          };
      api.addPanel({
        component: "panel",
        id: "explorer",
        params: {
          description: "src / tests / fixtures",
          id: "explorer",
          kind: "context",
          title: zh ? "资源" : "Explorer",
        },
        position: explorerPosition,
        title: zh ? "资源" : "Explorer",
      });

      const groupId = editor.api.group.id;
      const group = api.createTabGroup({
        color: "blue",
        groupId,
        label: zh ? "构建" : "Build",
      });
      for (const panelId of ["editor", "preview"]) {
        api.addPanelToTabGroup({ groupId, panelId, tabGroupId: group.id });
      }
      editor.api.setActive();
    },
    [compact, zh],
  );
  const layout = useDockviewLayout({
    initialize,
    key: `a3s-ui:docs:dockview:${language}:v1`,
    restore: false,
  });

  useEffect(() => {
    if (!layout.api || initializedCompactRef.current === compact) return;
    layout.reset();
    setActiveMaximized(false);
    setPreviewLocation("docked");
  }, [compact, layout.api, layout.reset]);

  const toggleFloat = () => {
    const panel = layout.api?.getPanel("preview");
    if (!layout.api || !panel) return;
    if (panel.api.location.type === "floating") {
      panel.api.moveTo({ position: "right" });
      setPreviewLocation("docked");
      return;
    }
    layout.api.addFloatingGroup(panel, {
      height: 190,
      position: { right: 16, top: 42 },
      width: 280,
    });
    setPreviewLocation("floating");
  };

  const toggleMaximize = () => {
    const panel = layout.api?.activePanel;
    if (!panel || panel.api.location.type !== "grid") return;
    if (panel.api.isMaximized()) {
      panel.api.exitMaximized();
      setActiveMaximized(false);
    } else {
      panel.api.maximize();
      setActiveMaximized(true);
    }
  };

  const reset = () => {
    layout.reset();
    setActiveMaximized(false);
    setPreviewLocation("docked");
  };

  return (
    <section
      className="dockview-demo"
      data-active-maximized={activeMaximized}
      data-layout-density={compact ? "compact" : "wide"}
      data-mode="dock"
      data-preview-location={previewLocation}
      data-ready={Boolean(layout.api)}
      ref={rootRef}
    >
      <header className="dockview-demo__toolbar">
        <div>
          <strong>{zh ? "可停靠工作区" : "Dockable workspace"}</strong>
          <span>
            {zh
              ? "拖动标签或分隔条改变布局"
              : "Drag a tab or splitter to change the layout"}
          </span>
        </div>
        <nav aria-label={zh ? "布局操作" : "Layout actions"}>
          <button type="button" disabled={!layout.api} onClick={toggleFloat}>
            <ProductPlaygroundIcon name="expand" />
            {zh ? "浮动预览" : "Float preview"}
          </button>
          <button type="button" disabled={!layout.api} onClick={toggleMaximize}>
            <ProductPlaygroundIcon
              name={activeMaximized ? "contract" : "expand"}
            />
            {zh ? "最大化" : "Maximize"}
          </button>
          <button type="button" disabled={!layout.api} onClick={reset}>
            <ProductPlaygroundIcon name="refresh" />
            {zh ? "重置" : "Reset"}
          </button>
        </nav>
      </header>
      <div className="dockview-demo__stage">
        <DockviewReact
          components={dockComponents}
          floatingGroupBounds="boundedWithinViewport"
          onReady={layout.onReady}
          theme={themeA3S}
        />
      </div>
    </section>
  );
}

function GridDemo() {
  const language = useLang();
  const zh = language === "zh";
  const apiRef = useRef<GridviewApi | null>(null);
  const [preset, setPreset] = useState<"balanced" | "focus-canvas">("balanced");
  const [ready, setReady] = useState(false);

  const applyPreset = useCallback((next: "balanced" | "focus-canvas") => {
    const api = apiRef.current;
    if (!api) return;
    const width = Math.max(api.width, 320);
    const height = Math.max(api.height, 240);
    const context = api.getPanel("grid-context");
    const canvas = api.getPanel("grid-canvas");
    const output = api.getPanel("grid-output");
    const preview = api.getPanel("grid-preview");

    if (next === "balanced") {
      context?.api.setSize({
        height: Math.round(height * 0.52),
        width: Math.round(width * 0.42),
      });
      canvas?.api.setSize({
        height: Math.round(height * 0.52),
        width: Math.round(width * 0.58),
      });
      output?.api.setSize({ height: Math.round(height * 0.48) });
      preview?.api.setSize({ height: Math.round(height * 0.48) });
    } else {
      context?.api.setSize({
        height: Math.round(height * 0.38),
        width: Math.round(width * 0.3),
      });
      canvas?.api.setSize({
        height: Math.round(height * 0.7),
        width: Math.round(width * 0.7),
      });
      output?.api.setSize({ height: Math.round(height * 0.62) });
      preview?.api.setSize({ height: Math.round(height * 0.3) });
    }
    setPreset(next);
  }, []);

  const onReady = useCallback(
    ({ api }: GridviewReadyEvent) => {
      apiRef.current = api;
      const first = api.addPanel({
        component: "panel",
        id: "grid-context",
        params: {
          id: "grid-context",
          kind: "context",
          title: zh ? "上下文" : "Context",
        },
      });
      const second = api.addPanel({
        component: "panel",
        id: "grid-canvas",
        params: {
          id: "grid-canvas",
          kind: "canvas",
          title: zh ? "画布" : "Canvas",
        },
        position: { direction: "right", referencePanel: first.id },
      });
      api.addPanel({
        component: "panel",
        id: "grid-output",
        params: {
          id: "grid-output",
          kind: "output",
          title: zh ? "输出" : "Output",
        },
        position: { direction: "below", referencePanel: first.id },
      });
      api.addPanel({
        component: "panel",
        id: "grid-preview",
        params: {
          id: "grid-preview",
          kind: "preview",
          title: zh ? "预览" : "Preview",
        },
        position: { direction: "below", referencePanel: second.id },
      });
      setReady(true);
      window.requestAnimationFrame(() => applyPreset("balanced"));
    },
    [applyPreset, zh],
  );
  return (
    <PrimitiveDemo
      actions={
        <>
          <button
            aria-pressed={preset === "balanced"}
            disabled={!ready}
            onClick={() => applyPreset("balanced")}
            type="button"
          >
            <ProductPlaygroundIcon name="grid" />
            {zh ? "均衡" : "Balanced"}
          </button>
          <button
            aria-pressed={preset === "focus-canvas"}
            disabled={!ready}
            onClick={() => applyPreset("focus-canvas")}
            type="button"
          >
            <ProductPlaygroundIcon name="center" />
            {zh ? "聚焦画布" : "Focus canvas"}
          </button>
        </>
      }
      mode="grid"
      stateAttributes={{ "data-layout-preset": preset, "data-ready": ready }}
      title={zh ? "二维可调整网格" : "Two-dimensional resizable grid"}
    >
      <GridviewReact
        components={gridComponents}
        onReady={onReady}
        orientation={Orientation.VERTICAL}
        proportionalLayout
      />
    </PrimitiveDemo>
  );
}

function SplitDemo() {
  const language = useLang();
  const zh = language === "zh";
  const apiRef = useRef<SplitviewApi | null>(null);
  const [preset, setPreset] = useState<"balanced" | "focus-canvas">("balanced");
  const [ready, setReady] = useState(false);

  const applyPreset = useCallback((next: "balanced" | "focus-canvas") => {
    const api = apiRef.current;
    if (!api) return;
    const size = Math.max(api.width, 320);
    const ratios = next === "balanced" ? [0.25, 0.5, 0.25] : [0.18, 0.64, 0.18];
    for (const [index, id] of [
      "split-context",
      "split-canvas",
      "split-preview",
    ].entries()) {
      api.getPanel(id)?.api.setSize({ size: Math.round(size * ratios[index]) });
    }
    setPreset(next);
  }, []);

  const onReady = useCallback(
    ({ api }: SplitviewReadyEvent) => {
      apiRef.current = api;
      for (const [id, title, kind, size] of [
        ["split-context", zh ? "资源" : "Resources", "context", 150],
        ["split-canvas", zh ? "主画布" : "Canvas", "canvas", 320],
        ["split-preview", zh ? "预览" : "Preview", "preview", 180],
      ] as const) {
        api.addPanel({
          component: "panel",
          id,
          minimumSize: 96,
          params: { id, kind, title },
          size,
        });
      }
      setReady(true);
      window.requestAnimationFrame(() => applyPreset("balanced"));
    },
    [applyPreset, zh],
  );
  return (
    <PrimitiveDemo
      actions={
        <>
          <button
            aria-pressed={preset === "balanced"}
            disabled={!ready}
            onClick={() => applyPreset("balanced")}
            type="button"
          >
            <ProductPlaygroundIcon name="collapse" />
            {zh ? "均衡" : "Balanced"}
          </button>
          <button
            aria-pressed={preset === "focus-canvas"}
            disabled={!ready}
            onClick={() => applyPreset("focus-canvas")}
            type="button"
          >
            <ProductPlaygroundIcon name="center" />
            {zh ? "聚焦画布" : "Focus canvas"}
          </button>
        </>
      }
      mode="split"
      stateAttributes={{ "data-layout-preset": preset, "data-ready": ready }}
      title={zh ? "一维连续分栏" : "One-dimensional split layout"}
    >
      <SplitviewReact
        components={splitComponents}
        onReady={onReady}
        orientation={Orientation.HORIZONTAL}
        proportionalLayout={false}
      />
    </PrimitiveDemo>
  );
}

function PaneDemo() {
  const language = useLang();
  const zh = language === "zh";
  const apiRef = useRef<PaneviewApi | null>(null);
  const [expansion, setExpansion] = useState<
    "collapsed" | "expanded" | "mixed"
  >("mixed");
  const [ready, setReady] = useState(false);

  const updateExpansion = useCallback((api: PaneviewApi) => {
    const expandedCount = api.panels.filter(
      (panel) => panel.api.isExpanded,
    ).length;
    setExpansion(
      expandedCount === 0
        ? "collapsed"
        : expandedCount === api.panels.length
          ? "expanded"
          : "mixed",
    );
  }, []);

  const applyMixedPreset = useCallback((api: PaneviewApi) => {
    const height = Math.max(api.height, 320);
    api
      .getPanel("pane-files")
      ?.api.setSize({ size: Math.round(height * 0.42) });
    api
      .getPanel("pane-symbols")
      ?.api.setSize({ size: Math.round(height * 0.5) });
  }, []);

  const setAllExpanded = useCallback(
    (expanded: boolean) => {
      const api = apiRef.current;
      if (!api) return;
      for (const panel of api.panels) panel.api.setExpanded(expanded);
      if (expanded) {
        const size = Math.max(88, Math.floor(api.height / api.panels.length));
        for (const panel of api.panels) panel.api.setSize({ size });
      }
      updateExpansion(api);
    },
    [updateExpansion],
  );

  const onReady = useCallback(
    ({ api }: PaneviewReadyEvent) => {
      apiRef.current = api;
      for (const [id, title, kind, size, expanded] of [
        ["pane-files", zh ? "文件" : "Files", "context", 108, true],
        ["pane-symbols", zh ? "符号" : "Symbols", "canvas", 92, true],
        ["pane-history", zh ? "历史记录" : "History", "output", 86, false],
      ] as const) {
        api.addPanel({
          component: "panel",
          headerComponent: "header",
          id,
          isExpanded: expanded,
          minimumBodySize: 48,
          params: { id, kind, title },
          size,
          title,
        });
      }
      for (const panel of api.panels) {
        panel.api.onDidExpansionChange(() => updateExpansion(api));
      }
      updateExpansion(api);
      setReady(true);
      window.requestAnimationFrame(() => applyMixedPreset(api));
    },
    [applyMixedPreset, updateExpansion, zh],
  );
  return (
    <PrimitiveDemo
      actions={
        <>
          <button
            disabled={!ready}
            onClick={() => setAllExpanded(true)}
            type="button"
          >
            <ProductPlaygroundIcon name="expand" />
            {zh ? "全部展开" : "Expand all"}
          </button>
          <button
            disabled={!ready}
            onClick={() => setAllExpanded(false)}
            type="button"
          >
            <ProductPlaygroundIcon name="contract" />
            {zh ? "全部折叠" : "Collapse all"}
          </button>
        </>
      }
      mode="pane"
      stateAttributes={{
        "data-pane-expansion": expansion,
        "data-ready": ready,
      }}
      title={zh ? "可折叠工具窗格" : "Collapsible tool panes"}
    >
      <PaneviewReact
        components={paneComponents}
        headerComponents={paneHeaders}
        onReady={onReady}
      />
    </PrimitiveDemo>
  );
}

function PrimitiveDemo({
  actions,
  children,
  mode,
  stateAttributes,
  title,
}: {
  actions: ReactNode;
  children: ReactNode;
  mode: Exclude<DockviewDemoMode, "dock">;
  stateAttributes: Record<string, boolean | string>;
  title: string;
}) {
  const language = useLang();
  const zh = language === "zh";

  return (
    <section className="dockview-demo" data-mode={mode} {...stateAttributes}>
      <header className="dockview-demo__toolbar">
        <div>
          <strong>{title}</strong>
          <span>
            {zh ? "拖动分隔条调整区域大小" : "Drag the separators to resize"}
          </span>
        </div>
        <nav aria-label={zh ? "布局预设" : "Layout presets"}>{actions}</nav>
      </header>
      <div className="dockview-demo__stage dockview-theme-a3s">{children}</div>
    </section>
  );
}

export default function DockviewDemo({
  mode = "dock",
}: {
  mode?: DockviewDemoMode;
}) {
  if (mode === "grid") return <GridDemo />;
  if (mode === "split") return <SplitDemo />;
  if (mode === "pane") return <PaneDemo />;
  return <DockWorkspaceDemo />;
}
