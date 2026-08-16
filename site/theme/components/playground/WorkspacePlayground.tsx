import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useLang, withBase } from "@rspress/core/runtime";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
} from "dockview-react";
import {
  createDockviewLayoutPersistence,
  resetDockviewLayout,
  themeA3S,
} from "../../../../src/integrations/dockview/shared.js";
import { PlaygroundIcon } from "./PlaygroundIcon";
import {
  playgroundScenes,
  playgroundStates,
  type PlaygroundLocale,
  type PlaygroundSceneId,
  type PlaygroundState,
} from "./playground-data";
import { WorkspaceProvider } from "./WorkspaceContext";
import {
  EmptyWorkspacePanel,
  workspacePanelComponents,
} from "./WorkspacePanels";

function buildWorkspaceLayout(
  api: DockviewApi,
  locale: PlaygroundLocale,
  compact: boolean,
) {
  const zh = locale === "zh";
  const titles = {
    editor: zh ? "工作区" : "Workspace",
    explorer: zh ? "资源管理器" : "Explorer",
    inspector: zh ? "检查器" : "Inspector",
    preview: zh ? "设备预览" : "Device preview",
    task: zh ? "任务" : "Task",
    terminal: zh ? "终端" : "Terminal",
  };

  const task = api.addPanel({
    component: "task",
    id: "task",
    title: titles.task,
  });
  const editor = api.addPanel({
    component: "editor",
    id: "editor",
    initialWidth: compact ? undefined : 650,
    position: compact
      ? { direction: "within", referencePanel: task }
      : { direction: "right", referencePanel: task },
    title: titles.editor,
  });
  api.addPanel({
    component: "preview",
    id: "preview",
    position: { direction: "within", referencePanel: editor },
    title: titles.preview,
  });

  const editorGroupId = editor.api.group.id;
  const workTabs = api.createTabGroup({
    color: "blue",
    groupId: editorGroupId,
    label: zh ? "构建" : "Build",
  });
  for (const panelId of ["editor", "preview"]) {
    api.addPanelToTabGroup({
      groupId: editorGroupId,
      panelId,
      tabGroupId: workTabs.id,
    });
  }

  if (compact) {
    for (const [id, component, title] of [
      ["explorer", "explorer", titles.explorer],
      ["inspector", "inspector", titles.inspector],
      ["terminal", "terminal", titles.terminal],
    ] as const) {
      api.addPanel({
        component,
        id,
        position: { direction: "within", referencePanel: task },
        title,
      });
    }
  } else {
    const explorer = api.addEdgeGroup("left", {
      collapsedSize: 34,
      id: "explorer-edge",
      initialSize: 238,
      minimumSize: 188,
    });
    const inspector = api.addEdgeGroup("right", {
      collapsedSize: 34,
      id: "inspector-edge",
      initialSize: 286,
      minimumSize: 224,
    });
    const terminal = api.addEdgeGroup("bottom", {
      collapsed: true,
      collapsedSize: 34,
      id: "terminal-edge",
      initialSize: 196,
      minimumSize: 120,
    });
    api.addPanel({
      component: "explorer",
      id: "explorer",
      position: { referenceGroup: explorer.id },
      title: titles.explorer,
    });
    api.addPanel({
      component: "inspector",
      id: "inspector",
      position: { referenceGroup: inspector.id },
      title: titles.inspector,
    });
    api.addPanel({
      component: "terminal",
      id: "terminal",
      position: { referenceGroup: terminal.id },
      title: titles.terminal,
    });
  }

  editor.api.setActive();
  task.api.setActive();
}

function LayoutActions({
  api,
  locale,
  onFeedback,
  onReset,
  onRestore,
  onSave,
}: {
  api: DockviewApi | null;
  locale: PlaygroundLocale;
  onFeedback: (message: string) => void;
  onReset: () => void;
  onRestore: () => void;
  onSave: () => void;
}) {
  const zh = locale === "zh";
  const menuRef = useRef<HTMLDetailsElement>(null);

  const runAction = (action: () => void | Promise<void>) => {
    const result = action();
    menuRef.current?.removeAttribute("open");
    return result;
  };

  const revealPanel = (panelId: string) => {
    const panel = api?.getPanel(panelId);
    if (!panel) return;
    if (panel.api.location.type === "edge") panel.api.group.api.expand();
    panel.api.setActive();
  };

  const floatInspector = () => {
    const panel = api?.getPanel("inspector");
    if (!api || !panel) return;
    if (panel.api.location.type === "floating") {
      panel.api.moveTo({ position: "right" });
      onFeedback(zh ? "检查器已停靠。" : "Inspector docked.");
      return;
    }
    api.addFloatingGroup(panel, {
      height: 420,
      position: { right: 24, top: 64 },
      width: 320,
    });
    onFeedback(
      zh
        ? "检查器已浮动，可拖回停靠区。"
        : "Inspector is floating and can be docked again.",
    );
  };

  const popoutPreview = async () => {
    const panel = api?.getPanel("preview");
    if (!api || !panel) return;
    const opened = await api.addPopoutGroup(panel);
    onFeedback(
      opened
        ? zh
          ? "设备预览已在独立窗口打开。"
          : "Device preview opened in a separate window."
        : zh
          ? "浏览器阻止了独立窗口，请允许弹出窗口后重试。"
          : "The browser blocked the popout. Allow popups and retry.",
    );
  };

  const toggleMaximize = () => {
    const group = api?.activeGroup;
    if (!group || group.api.location.type !== "grid") return;
    if (group.api.isMaximized()) {
      group.api.exitMaximized();
      onFeedback(zh ? "已恢复工作区布局。" : "Workspace layout restored.");
    } else {
      group.api.maximize();
      onFeedback(zh ? "当前面板组已最大化。" : "Active panel group maximized.");
    }
  };

  return (
    <details
      ref={menuRef}
      className="workbench-layout-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary>
        {zh ? "布局" : "Layout"}
        <span aria-hidden="true">⌄</span>
      </summary>
      <div>
        <section>
          <strong>{zh ? "面板" : "Panels"}</strong>
          <button
            type="button"
            onClick={() => runAction(() => revealPanel("explorer"))}
          >
            {zh ? "显示资源管理器" : "Show explorer"}
            <kbd>⌘⇧E</kbd>
          </button>
          <button
            type="button"
            onClick={() => runAction(() => revealPanel("terminal"))}
          >
            {zh ? "显示终端" : "Show terminal"}
            <kbd>⌃`</kbd>
          </button>
          <button type="button" onClick={() => runAction(toggleMaximize)}>
            {zh ? "最大化当前组" : "Maximize active group"}
          </button>
          <button type="button" onClick={() => runAction(floatInspector)}>
            {zh ? "浮动检查器" : "Float inspector"}
          </button>
          <button type="button" onClick={() => runAction(popoutPreview)}>
            {zh ? "弹出设备预览" : "Pop out device preview"}
          </button>
        </section>
        <section>
          <strong>{zh ? "工作区状态" : "Workspace state"}</strong>
          <button type="button" onClick={() => runAction(onSave)}>
            {zh ? "保存布局" : "Save layout"}
          </button>
          <button type="button" onClick={() => runAction(onRestore)}>
            {zh ? "恢复布局" : "Restore layout"}
          </button>
          <button type="button" data-danger onClick={() => runAction(onReset)}>
            {zh ? "重置布局" : "Reset layout"}
          </button>
        </section>
      </div>
    </details>
  );
}

export function WorkspacePlayground() {
  const language = useLang();
  const locale: PlaygroundLocale = language === "zh" ? "zh" : "en";
  const zh = locale === "zh";
  const headingId = useId();
  const activityRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<DockviewApi | null>(null);
  const persistenceRef = useRef<ReturnType<
    typeof createDockviewLayoutPersistence
  > | null>(null);
  const layoutSubscriptionRef = useRef<{ dispose(): void } | null>(null);
  const [api, setApi] = useState<DockviewApi | null>(null);
  const [sceneId, setSceneId] = useState<PlaygroundSceneId>("code");
  const [state, setState] = useState<PlaygroundState>("ready");
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [feedback, setFeedback] = useState(
    zh ? "布局将在本机自动保存。" : "Layout saves locally and automatically.",
  );
  const scene =
    playgroundScenes.find((candidate) => candidate.id === sceneId) ??
    playgroundScenes[0];
  const contextValue = useMemo(
    () => ({ locale, sceneId, state }),
    [locale, sceneId, state],
  );

  const initialize = useCallback(
    (target: DockviewApi) => {
      buildWorkspaceLayout(
        target,
        locale,
        window.matchMedia("(max-width: 52rem)").matches,
      );
    },
    [locale],
  );

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      const compact = window.matchMedia("(max-width: 52rem)").matches;
      const persistence = createDockviewLayoutPersistence({
        key: `a3s-ui:playground:${locale}:${compact ? "compact" : "desktop"}:v1`,
        onError: (_error, operation) =>
          setFeedback(
            zh
              ? `无法${operation === "restore" ? "恢复" : "保存"}本机布局。`
              : `Could not ${operation} the local layout.`,
          ),
      });
      const result = persistence.restore(event.api);
      if (result.status !== "restored") initialize(event.api);
      layoutSubscriptionRef.current?.dispose();
      layoutSubscriptionRef.current = persistence.bind(event.api);
      persistenceRef.current = persistence;
      apiRef.current = event.api;
      setApi(event.api);
      setFeedback(
        result.status === "restored"
          ? zh
            ? "已恢复上次布局。"
            : "Previous layout restored."
          : zh
            ? "已创建默认工作区，拖动标签即可重新编排。"
            : "Default workspace created. Drag tabs to rearrange it.",
      );
    },
    [initialize, locale, zh],
  );

  useEffect(
    () => () => {
      layoutSubscriptionRef.current?.dispose();
      layoutSubscriptionRef.current = null;
      apiRef.current = null;
    },
    [],
  );

  const resetLayout = () => {
    if (!apiRef.current) return;
    persistenceRef.current?.clear();
    resetDockviewLayout(apiRef.current, initialize);
    setFeedback(
      zh
        ? "布局已重置为默认工作区。"
        : "Layout reset to the default workspace.",
    );
  };
  const saveLayout = () => {
    const saved =
      apiRef.current && persistenceRef.current?.save(apiRef.current);
    setFeedback(
      saved
        ? zh
          ? "布局已保存到本机。"
          : "Layout saved locally."
        : zh
          ? "无法保存布局。"
          : "Layout could not be saved.",
    );
  };
  const restoreLayout = () => {
    if (!apiRef.current || !persistenceRef.current) return;
    const result = persistenceRef.current.restore(apiRef.current);
    setFeedback(
      result.status === "restored"
        ? zh
          ? "布局已恢复。"
          : "Layout restored."
        : zh
          ? "没有可恢复的布局。"
          : "No saved layout is available.",
    );
  };

  const selectScene = (next: PlaygroundSceneId) => {
    setSceneId(next);
    setState("ready");
    apiRef.current?.getPanel("editor")?.api.setActive();
  };

  const selectState = (next: PlaygroundState) => {
    setState(next);
    apiRef.current?.getPanel("editor")?.api.setActive();
  };

  const handleActivityKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(
      activityRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      ) ?? [],
    );
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    if (current < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
            buttons.length;
    buttons[next]?.focus();
    buttons[next]?.click();
  };

  return (
    <WorkspaceProvider value={contextValue}>
      <section
        className="a3s-workspace-playground rp-not-doc"
        aria-labelledby={headingId}
        data-playground-state={state}
        dir={direction}
      >
        <header className="workbench-commandbar">
          <div className="workbench-commandbar__brand">
            <img src={withBase("/logo.png")} alt="" width="24" height="24" />
            <h1 id={headingId}>Playground</h1>
          </div>
          <button
            type="button"
            className="workbench-commandbar__project"
            onClick={() => apiRef.current?.getPanel("task")?.api.setActive()}
          >
            <span>a3s-ui</span>
            <strong>{scene.label[locale]}</strong>
            <kbd>⌘K</kbd>
          </button>
          <div className="workbench-commandbar__actions">
            <label>
              <span className="sr-only">
                {zh ? "工作区状态" : "Workspace state"}
              </span>
              <select
                value={state}
                onChange={(event) =>
                  selectState(event.target.value as PlaygroundState)
                }
              >
                {playgroundStates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.label[locale]}
                  </option>
                ))}
              </select>
            </label>
            <LayoutActions
              api={api}
              locale={locale}
              onFeedback={setFeedback}
              onReset={resetLayout}
              onRestore={restoreLayout}
              onSave={saveLayout}
            />
            <button
              type="button"
              className="workbench-icon-button"
              aria-label={zh ? "切换文字方向" : "Toggle text direction"}
              aria-pressed={direction === "rtl"}
              onClick={() =>
                setDirection((value) => (value === "ltr" ? "rtl" : "ltr"))
              }
            >
              {direction.toUpperCase()}
            </button>
          </div>
        </header>

        <div className="workbench-body">
          <div
            ref={activityRef}
            className="workbench-activity"
            role="tablist"
            aria-label={zh ? "工作场景" : "Work scenes"}
            aria-orientation="vertical"
            onKeyDown={handleActivityKeyDown}
          >
            {playgroundScenes.map((candidate) => (
              <button
                type="button"
                role="tab"
                key={candidate.id}
                aria-label={candidate.label[locale]}
                aria-selected={candidate.id === sceneId}
                tabIndex={candidate.id === sceneId ? 0 : -1}
                title={`${candidate.label[locale]} — ${candidate.description[locale]}`}
                onClick={() => selectScene(candidate.id)}
              >
                <PlaygroundIcon name={candidate.icon} width="19" height="19" />
              </button>
            ))}
          </div>
          <main
            className="workbench-dock"
            aria-label={zh ? "可停靠工作区" : "Dockable workspace"}
          >
            <DockviewReact
              components={workspacePanelComponents}
              floatingGroupBounds="boundedWithinViewport"
              onReady={onReady}
              theme={themeA3S}
              watermarkComponent={EmptyWorkspacePanel}
            />
          </main>
        </div>

        <footer
          className="workbench-statusbar"
          aria-label={zh ? "工作区状态" : "Workspace status"}
        >
          <div>
            <span>main*</span>
            <span>
              <PlaygroundIcon name="check" width="13" height="13" /> 0
            </span>
            <span>{zh ? "本机" : "Local"}</span>
          </div>
          <output aria-live="polite">{feedback}</output>
          <div>
            <span>{direction.toUpperCase()}</span>
            <span>UTF-8</span>
            <span>Dockview 8.1</span>
          </div>
        </footer>
      </section>
    </WorkspaceProvider>
  );
}
