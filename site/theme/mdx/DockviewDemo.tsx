import { useCallback, type ReactNode } from "react";
import {
  DockviewReact,
  GridviewReact,
  Orientation,
  PaneviewReact,
  SplitviewReact,
  type DockviewApi,
  type GridviewReadyEvent,
  type IDockviewPanelProps,
  type IGridviewPanelProps,
  type IPaneviewPanelProps,
  type ISplitviewPanelProps,
  type PaneviewReadyEvent,
  type SplitviewReadyEvent,
} from "dockview-react";
import { useLang } from "@rspress/core/runtime";
import {
  themeA3S,
  useDockviewLayout,
} from "../../../src/integrations/dockview/react.js";
import "./DockviewDemo.css";

type DockviewDemoMode = "dock" | "grid" | "pane" | "split";
type DemoPanelParams = {
  description?: string;
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
  return (
    <section
      className="dockview-demo__panel"
      data-kind={params.kind ?? "canvas"}
    >
      <strong>{params.title}</strong>
      {params.description ? <p>{params.description}</p> : null}
      <span aria-hidden="true" />
    </section>
  );
}

const dockComponents = { panel: DemoPanel };
const gridComponents = { panel: GridPanel };
const splitComponents = { panel: SplitPanel };
const paneComponents = { panel: PanePanel };

function DockWorkspaceDemo() {
  const language = useLang();
  const zh = language === "zh";
  const initialize = useCallback(
    (api: DockviewApi) => {
      const task = api.addPanel({
        component: "panel",
        id: "task",
        params: {
          description: zh
            ? "目标、记录与恢复操作"
            : "Goal, transcript, and recovery actions",
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
          kind: "canvas",
          title: zh ? "编辑器" : "Editor",
        },
        position: { direction: "right", referencePanel: task },
        title: zh ? "编辑器" : "Editor",
      });
      api.addPanel({
        component: "panel",
        id: "preview",
        params: {
          description: zh
            ? "可拖动到任意停靠区"
            : "Drag into any docking target",
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
          kind: "output",
          title: zh ? "终端" : "Terminal",
        },
        position: { direction: "below", referencePanel: editor },
        title: zh ? "终端" : "Terminal",
      });

      const explorer = api.addEdgeGroup("left", {
        collapsedSize: 32,
        id: "explorer-edge",
        initialSize: 176,
        minimumSize: 132,
      });
      api.addPanel({
        component: "panel",
        id: "explorer",
        params: {
          description: "src / tests / fixtures",
          kind: "context",
          title: zh ? "资源" : "Explorer",
        },
        position: { referenceGroup: explorer.id },
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
    [zh],
  );
  const layout = useDockviewLayout({
    initialize,
    key: `a3s-ui:docs:dockview:${language}:v1`,
    restore: false,
  });

  const toggleFloat = () => {
    const panel = layout.api?.getPanel("preview");
    if (!layout.api || !panel) return;
    if (panel.api.location.type === "floating") {
      panel.api.moveTo({ position: "right" });
      return;
    }
    layout.api.addFloatingGroup(panel, {
      height: 190,
      position: { right: 16, top: 42 },
      width: 280,
    });
  };

  const toggleMaximize = () => {
    const panel = layout.api?.activePanel;
    if (!panel || panel.api.location.type !== "grid") return;
    if (panel.api.isMaximized()) panel.api.exitMaximized();
    else panel.api.maximize();
  };

  return (
    <section className="dockview-demo" data-mode="dock">
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
            {zh ? "浮动预览" : "Float preview"}
          </button>
          <button type="button" disabled={!layout.api} onClick={toggleMaximize}>
            {zh ? "最大化" : "Maximize"}
          </button>
          <button type="button" disabled={!layout.api} onClick={layout.reset}>
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
  const onReady = useCallback(
    ({ api }: GridviewReadyEvent) => {
      const first = api.addPanel({
        component: "panel",
        id: "grid-context",
        params: { kind: "context", title: zh ? "上下文" : "Context" },
      });
      const second = api.addPanel({
        component: "panel",
        id: "grid-canvas",
        params: { kind: "canvas", title: zh ? "画布" : "Canvas" },
        position: { direction: "right", referencePanel: first.id },
      });
      api.addPanel({
        component: "panel",
        id: "grid-output",
        params: { kind: "output", title: zh ? "输出" : "Output" },
        position: { direction: "below", referencePanel: first.id },
      });
      api.addPanel({
        component: "panel",
        id: "grid-preview",
        params: { kind: "preview", title: zh ? "预览" : "Preview" },
        position: { direction: "below", referencePanel: second.id },
      });
    },
    [zh],
  );
  return (
    <PrimitiveDemo
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
  const onReady = useCallback(
    ({ api }: SplitviewReadyEvent) => {
      for (const [id, title, kind, size] of [
        ["split-context", zh ? "资源" : "Resources", "context", 150],
        ["split-canvas", zh ? "主画布" : "Canvas", "canvas", 320],
        ["split-preview", zh ? "预览" : "Preview", "preview", 180],
      ] as const) {
        api.addPanel({
          component: "panel",
          id,
          minimumSize: 96,
          params: { kind, title },
          size,
        });
      }
    },
    [zh],
  );
  return (
    <PrimitiveDemo title={zh ? "一维连续分栏" : "One-dimensional split layout"}>
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
  const onReady = useCallback(
    ({ api }: PaneviewReadyEvent) => {
      for (const [id, title, kind, size, expanded] of [
        ["pane-files", zh ? "文件" : "Files", "context", 108, true],
        ["pane-symbols", zh ? "符号" : "Symbols", "canvas", 92, true],
        ["pane-history", zh ? "历史记录" : "History", "output", 86, false],
      ] as const) {
        api.addPanel({
          component: "panel",
          id,
          isExpanded: expanded,
          params: { kind, title },
          size,
          title,
        });
      }
    },
    [zh],
  );
  return (
    <PrimitiveDemo title={zh ? "可折叠工具窗格" : "Collapsible tool panes"}>
      <PaneviewReact components={paneComponents} onReady={onReady} />
    </PrimitiveDemo>
  );
}

function PrimitiveDemo({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  const language = useLang();
  const zh = language === "zh";

  return (
    <section className="dockview-demo" data-mode="primitive">
      <header className="dockview-demo__toolbar">
        <strong>{title}</strong>
        <span>
          {zh ? "拖动分隔条调整区域大小" : "Drag the separators to resize"}
        </span>
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
