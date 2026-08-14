import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useLang, withBase } from "@rspress/core/runtime";
import {
  AutomationScene,
  CatalogScene,
  ChannelsScene,
  SettingsScene,
} from "./ProductScenes";
import { SceneState } from "./SceneState";
import {
  CodeScene,
  DesignScene,
  WorkflowScene,
  WriteScene,
} from "./TaskScenes";
import { PlaygroundIcon } from "./PlaygroundIcon";
import {
  playgroundScenes,
  playgroundStates,
  playgroundViewports,
  type PlaygroundLocale,
  type PlaygroundSceneId,
  type PlaygroundState,
  type PlaygroundViewport,
} from "./playground-data";

const sceneComponents = {
  automation: AutomationScene,
  catalog: CatalogScene,
  channels: ChannelsScene,
  code: CodeScene,
  design: DesignScene,
  settings: SettingsScene,
  workflow: WorkflowScene,
  write: WriteScene,
};

const viewportSizes: Record<PlaygroundViewport, string> = {
  desktop: "1280 × 800",
  tablet: "768 × 1024",
  phone: "390 × 844",
};

export function WorkspacePlayground() {
  const language = useLang();
  const locale: PlaygroundLocale = language === "zh" ? "zh" : "en";
  const headingId = useId();
  const tabListRef = useRef<HTMLDivElement>(null);
  const [sceneId, setSceneId] = useState<PlaygroundSceneId>("code");
  const [state, setState] = useState<PlaygroundState>("ready");
  const [viewport, setViewport] = useState<PlaygroundViewport>("desktop");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const scene =
    playgroundScenes.find((candidate) => candidate.id === sceneId) ??
    playgroundScenes[0];
  const Scene = sceneComponents[scene.id];

  useEffect(() => {
    if (window.matchMedia("(max-width: 40rem)").matches) {
      setViewport("phone");
      setInspectorOpen(false);
      return;
    }
    if (window.matchMedia("(max-width: 64rem)").matches) {
      setViewport("tablet");
    }
  }, []);

  const selectScene = (nextScene: PlaygroundSceneId) => {
    const nextSceneDefinition = playgroundScenes.find(
      (candidate) => candidate.id === nextScene,
    );
    setSceneId(nextScene);
    setState("ready");
    setNavigationOpen(false);
    if (!nextSceneDefinition?.supportsInspector) setInspectorOpen(false);
  };

  const selectViewport = (nextViewport: PlaygroundViewport) => {
    setViewport(nextViewport);
    setNavigationOpen(false);
    if (nextViewport === "phone") setInspectorOpen(false);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    const tabs = Array.from(
      tabListRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not([disabled])',
      ) ?? [],
    );
    const currentIndex = tabs.indexOf(event.target as HTMLButtonElement);
    if (currentIndex === -1) return;
    event.preventDefault();

    const directionStep =
      (event.key === "ArrowRight" ? 1 : -1) * (direction === "rtl" ? -1 : 1);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (currentIndex + directionStep + tabs.length) % tabs.length;
    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  };

  return (
    <section
      className="a3s-workspace-playground rp-not-doc"
      aria-labelledby={headingId}
      data-playground-direction={direction}
      data-playground-inspector={inspectorOpen ? "open" : "closed"}
      data-playground-state={state}
      data-playground-viewport={viewport}
      dir={direction}
    >
      <header className="a3s-workspace-playground__header">
        <div>
          <h1 id={headingId}>
            {locale === "zh" ? "工作区 Playground" : "Workspace playground"}
          </h1>
          <p>
            {locale === "zh"
              ? "切换真实任务、设备与失败状态，检查组件组合能否保持清晰、可操作和可恢复。"
              : "Switch real tasks, devices, and failure states to verify that complete compositions stay clear, operable, and recoverable."}
          </p>
        </div>
        <output aria-live="polite" aria-atomic="true">
          <strong>{scene.label[locale]}</strong>
          <span>{scene.description[locale]}</span>
        </output>
      </header>

      <div className="a3s-workspace-playground__controls">
        <div
          ref={tabListRef}
          className="a3s-workspace-playground__scenes"
          role="tablist"
          aria-label={locale === "zh" ? "工作区场景" : "Workspace scenes"}
          onKeyDown={handleTabKeyDown}
        >
          {playgroundScenes.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              id={`${headingId}-${candidate.id}-tab`}
              aria-controls={`${headingId}-scene-panel`}
              aria-selected={candidate.id === scene.id}
              tabIndex={candidate.id === scene.id ? 0 : -1}
              onClick={() => selectScene(candidate.id)}
            >
              <PlaygroundIcon name={candidate.icon} width="16" height="16" />
              <span>{candidate.label[locale]}</span>
            </button>
          ))}
        </div>
        <div className="a3s-workspace-playground__options">
          <fieldset>
            <legend>{locale === "zh" ? "设备" : "Device"}</legend>
            <div>
              {playgroundViewports.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  aria-pressed={candidate.id === viewport}
                  onClick={() => selectViewport(candidate.id)}
                >
                  {candidate.label[locale]}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            <span>{locale === "zh" ? "状态" : "State"}</span>
            <select
              value={state}
              onChange={(event) =>
                setState(event.target.value as PlaygroundState)
              }
            >
              {playgroundStates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label[locale]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="a3s-workspace-playground__utility"
            aria-pressed={scene.supportsInspector ? inspectorOpen : false}
            disabled={!scene.supportsInspector}
            title={
              scene.supportsInspector
                ? undefined
                : locale === "zh"
                  ? "当前场景没有独立检查器"
                  : "This scene has no separate inspector"
            }
            onClick={() => setInspectorOpen((open) => !open)}
          >
            <PlaygroundIcon name="inspect" width="16" height="16" />
            {locale === "zh" ? "检查器" : "Inspector"}
          </button>
          <button
            type="button"
            className="a3s-workspace-playground__utility"
            aria-pressed={direction === "rtl"}
            onClick={() =>
              setDirection((value) => (value === "ltr" ? "rtl" : "ltr"))
            }
          >
            {direction === "ltr" ? "LTR" : "RTL"}
          </button>
        </div>
      </div>

      <div className="a3s-workspace-playground__stage">
        <div className="a3s-workspace-playground__device">
          <header className="a3s-workspace-playground__windowbar">
            <span aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <div>
              <img src={withBase("/logo.png")} alt="" width="20" height="20" />
              <strong>A3S Workspace</strong>
            </div>
            <small>{viewportSizes[viewport]}</small>
          </header>
          <div
            className="app-shell a3s-workspace-playground__shell"
            data-app-shell-initialized="playground"
          >
            <aside
              data-app-navigation
              data-open={navigationOpen ? "true" : "false"}
              hidden={viewport === "phone" && !navigationOpen}
              aria-label={locale === "zh" ? "主导航" : "Primary navigation"}
            >
              <header>
                <img
                  src={withBase("/logo.png")}
                  alt=""
                  width="28"
                  height="28"
                />
                <strong>A3S</strong>
              </header>
              <nav>
                {playgroundScenes.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    aria-current={
                      candidate.id === scene.id ? "page" : undefined
                    }
                    aria-label={candidate.label[locale]}
                    onClick={() => selectScene(candidate.id)}
                  >
                    <PlaygroundIcon
                      name={candidate.icon}
                      width="17"
                      height="17"
                    />
                    <span>{candidate.label[locale]}</span>
                  </button>
                ))}
              </nav>
              <footer>
                <button type="button" onClick={() => selectScene("settings")}>
                  <PlaygroundIcon name="settings" width="17" height="17" />
                  <span>{locale === "zh" ? "设置" : "Settings"}</span>
                </button>
              </footer>
            </aside>
            <div data-app-main>
              <header className="workspace-header">
                <div data-workspace-leading>
                  <button
                    type="button"
                    className="btn"
                    data-size="icon-sm"
                    data-variant="ghost"
                    data-app-navigation-trigger
                    aria-expanded={
                      viewport === "phone" ? navigationOpen : undefined
                    }
                    aria-label={
                      viewport === "phone" && navigationOpen
                        ? locale === "zh"
                          ? "关闭导航"
                          : "Close navigation"
                        : locale === "zh"
                          ? "打开导航"
                          : "Open navigation"
                    }
                    onClick={() => setNavigationOpen((open) => !open)}
                  >
                    <PlaygroundIcon name={scene.icon} width="17" height="17" />
                  </button>
                </div>
                <div data-workspace-identity>
                  <strong data-workspace-title>{scene.label[locale]}</strong>
                  <span>{scene.description[locale]}</span>
                </div>
                <div data-workspace-actions>
                  <span
                    className="status-badge"
                    data-state={
                      state === "ready"
                        ? "success"
                        : state === "error"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {
                      playgroundStates.find(
                        (candidate) => candidate.id === state,
                      )?.label[locale]
                    }
                  </span>
                  <button
                    type="button"
                    className="btn"
                    data-size="icon-sm"
                    data-variant="ghost"
                    disabled={!scene.supportsInspector}
                    aria-label={
                      scene.supportsInspector
                        ? locale === "zh"
                          ? "切换检查器"
                          : "Toggle inspector"
                        : locale === "zh"
                          ? "当前场景没有独立检查器"
                          : "This scene has no separate inspector"
                    }
                    onClick={() => setInspectorOpen((open) => !open)}
                  >
                    <PlaygroundIcon name="inspect" width="17" height="17" />
                  </button>
                </div>
              </header>
              <div
                id={`${headingId}-scene-panel`}
                className="a3s-workspace-playground__content"
                role="tabpanel"
                aria-labelledby={`${headingId}-${scene.id}-tab`}
                aria-busy={state === "loading"}
                onSubmit={(event) => event.preventDefault()}
              >
                {state === "ready" ? (
                  <Scene locale={locale} />
                ) : (
                  <SceneState locale={locale} state={state} />
                )}
              </div>
              <footer
                className="status-bar"
                aria-label={locale === "zh" ? "工作区状态" : "Workspace status"}
              >
                <div data-status-info>
                  <span>{scene.label[locale]}</span>
                  <span>
                    {state === "ready"
                      ? locale === "zh"
                        ? "本地状态已保存"
                        : "Local state saved"
                      : playgroundStates.find(
                          (candidate) => candidate.id === state,
                        )?.label[locale]}
                  </span>
                </div>
                <div data-status-actions>
                  <output>{direction.toUpperCase()}</output>
                  <hr role="separator" />
                  <output>{viewportSizes[viewport]}</output>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
