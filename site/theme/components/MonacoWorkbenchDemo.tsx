import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import "./MonacoWorkbenchDemo.css";

import {
  getWorkbenchCopy,
  workbenchFiles,
  type WorkbenchLocale,
} from "./MonacoWorkbenchDemo.data";
import { WorkbenchIcon } from "./MonacoWorkbenchIcons";
import {
  applyWorkspaceMarkers,
  createWorkspaceModels,
  loadMonaco,
  themeForDocument,
  type MonacoEditor,
  type MonacoModel,
} from "./MonacoWorkbenchDemo.monaco";

type LoadState = "error" | "loading" | "ready";
type SidebarView = "explorer" | "search" | "source-control";
type PanelView = "output" | "problems" | "terminal";
type CommandId =
  | "format-document"
  | "open-agent-config"
  | "switch-theme"
  | "toggle-minimap"
  | "toggle-panel";

type MonacoWorkbenchDemoProps = {
  locale?: WorkbenchLocale;
};

const initialFile = workbenchFiles[0];
const panelViews: readonly PanelView[] = ["problems", "output", "terminal"];
const persistentMemoryWarningLine =
  initialFile.content
    .split("\n")
    .findIndex((line) => line.includes("max_entries = 1000")) + 1;

function languageLabel(language: string) {
  if (language === "a3s-acl") return "A3S ACL";
  if (language === "typescript") return "TypeScript";
  if (language === "json") return "JSON";
  return "Markdown";
}

export function MonacoWorkbenchDemo({
  locale = "en",
}: MonacoWorkbenchDemoProps) {
  const copy = getWorkbenchCopy(locale);
  const rootRef = useRef<HTMLElement>(null);
  const editorHostRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDialogElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<MonacoEditor | undefined>(undefined);
  const modelsRef = useRef<Map<string, MonacoModel>>(new Map());
  const savedValuesRef = useRef<Map<string, string>>(new Map());
  const dirtyPathsRef = useRef<Set<string>>(new Set());
  const activePathRef = useRef(initialFile.path);
  const minimapEnabledRef = useRef(true);
  const [activePath, setActivePath] = useState(initialFile.path);
  const [announcement, setAnnouncement] = useState("");
  const [column, setColumn] = useState(1);
  const [commandQuery, setCommandQuery] = useState("");
  const [dirtyRevision, setDirtyRevision] = useState(0);
  const [line, setLine] = useState(1);
  const [loadNonce, setLoadNonce] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [minimapEnabled, setMinimapEnabled] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  const [panelView, setPanelView] = useState<PanelView>("problems");
  const [problemCount, setProblemCount] = useState(1);
  const [saveState, setSaveState] = useState<"saved" | "unsaved">("saved");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarView, setSidebarView] = useState<SidebarView>("explorer");

  const activeFile =
    workbenchFiles.find((file) => file.path === activePath) ?? initialFile;
  const activeTabIndex = workbenchFiles.findIndex(
    (file) => file.path === activeFile.path,
  );
  const filteredFiles = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase(locale);
    if (!query) return workbenchFiles;
    return workbenchFiles.filter((file) =>
      file.path.toLocaleLowerCase(locale).includes(query),
    );
  }, [locale, searchQuery]);

  const openCommandPalette = useCallback(() => {
    const palette = paletteRef.current;
    if (!palette || palette.open) return;
    setCommandQuery("");
    palette.showModal();
    requestAnimationFrame(() => paletteInputRef.current?.focus());
  }, []);

  const openFile = useCallback((path: string, focus = true) => {
    const model = modelsRef.current.get(path);
    activePathRef.current = path;
    setActivePath(path);
    if (!model || !editorRef.current) return;
    editorRef.current.setModel(model);
    const position = editorRef.current.getPosition();
    setLine(position?.lineNumber ?? 1);
    setColumn(position?.column ?? 1);
    setSaveState(dirtyPathsRef.current.has(path) ? "unsaved" : "saved");
    if (focus) editorRef.current.focus();
  }, []);

  const saveActiveFile = useCallback(() => {
    const path = activePathRef.current;
    const model = modelsRef.current.get(path);
    if (!model) return;
    savedValuesRef.current.set(path, model.getValue());
    dirtyPathsRef.current.delete(path);
    setDirtyRevision((revision) => revision + 1);
    setSaveState("saved");
    setAnnouncement(`${copy.saveAnnouncement}: ${path}`);
  }, [copy.saveAnnouncement]);

  const togglePanel = useCallback(() => {
    setPanelVisible((visible) => !visible);
  }, []);

  const revealProblem = useCallback(() => {
    openFile(".a3s/agent.acl", false);
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      const model = modelsRef.current.get(".a3s/agent.acl");
      if (!editor || !model) return;
      const lineNumber =
        model
          .getLinesContent()
          .findIndex((content) => content.includes("max_entries = 1000")) + 1;
      editor.setPosition({ column: 5, lineNumber });
      editor.revealLineInCenter(lineNumber);
      editor.focus();
    });
  }, [openFile]);

  useEffect(() => {
    let disposed = false;
    let themeObserver: MutationObserver | undefined;
    const subscriptions: { dispose(): void }[] = [];

    setLoadState("loading");
    const initialize = async () => {
      try {
        const monaco = await loadMonaco();
        if (disposed || !editorHostRef.current) return;
        const models = createWorkspaceModels(monaco, workbenchFiles);
        modelsRef.current = models;
        savedValuesRef.current = new Map(
          workbenchFiles.map((file) => [file.path, file.content]),
        );
        dirtyPathsRef.current.clear();
        applyWorkspaceMarkers(monaco, models, locale);

        for (const model of models.values()) {
          model.updateOptions({ insertSpaces: true, tabSize: 2 });
        }

        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const editor = monaco.editor.create(editorHostRef.current, {
          accessibilitySupport: "auto",
          ariaLabel:
            locale === "zh"
              ? "A3S Monaco 代码编辑器"
              : "A3S Monaco code editor",
          automaticLayout: true,
          bracketPairColorization: { enabled: true },
          cursorBlinking: reducedMotion ? "solid" : "smooth",
          cursorSmoothCaretAnimation: reducedMotion ? "off" : "on",
          fontFamily: '"Geist Mono", "SFMono-Regular", Consolas, monospace',
          fontLigatures: false,
          fontSize: 13,
          folding: true,
          glyphMargin: true,
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          lineHeight: 21,
          lineNumbersMinChars: 3,
          matchBrackets: "always",
          minimap: {
            enabled: minimapEnabledRef.current,
            maxColumn: 72,
            renderCharacters: false,
            showSlider: "mouseover",
            size: "fit",
          },
          model:
            models.get(activePathRef.current) ?? models.get(initialFile.path),
          padding: { bottom: 12, top: 12 },
          renderValidationDecorations: "on",
          renderWhitespace: "selection",
          scrollBeyondLastLine: false,
          smoothScrolling: !reducedMotion,
          stickyScroll: { enabled: true, maxLineCount: 4 },
          theme: themeForDocument(),
          wordWrap: "off",
        });
        editorRef.current = editor;

        const syncCursor = () => {
          const position = editor.getPosition();
          setLine(position?.lineNumber ?? 1);
          setColumn(position?.column ?? 1);
        };
        const syncDirtyState = () => {
          const model = editor.getModel();
          if (!model) return;
          const path = workbenchFiles.find((file) =>
            model.uri.path.endsWith(file.path),
          )?.path;
          if (!path) return;
          const dirty = model.getValue() !== savedValuesRef.current.get(path);
          if (dirty) dirtyPathsRef.current.add(path);
          else dirtyPathsRef.current.delete(path);
          setSaveState(dirty ? "unsaved" : "saved");
          setDirtyRevision((revision) => revision + 1);
        };
        const syncProblems = () => {
          const count = Array.from(models.values()).reduce(
            (total, model) =>
              total +
              monaco.editor.getModelMarkers({ resource: model.uri }).length,
            0,
          );
          setProblemCount(count);
        };

        subscriptions.push(
          editor.onDidChangeCursorPosition(syncCursor),
          editor.onDidChangeModel(() => {
            syncCursor();
            setSaveState(
              dirtyPathsRef.current.has(activePathRef.current)
                ? "unsaved"
                : "saved",
            );
          }),
          editor.onDidChangeModelContent(syncDirtyState),
          monaco.editor.onDidChangeMarkers(syncProblems),
        );
        syncCursor();
        syncProblems();

        themeObserver = new MutationObserver(() => {
          monaco.editor.setTheme(themeForDocument());
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });

        if (rootRef.current) rootRef.current.dataset.monacoReady = "true";
        setLoadState("ready");
      } catch (error) {
        console.error(
          "Unable to initialize the Monaco documentation demo",
          error,
        );
        if (!disposed) setLoadState("error");
      }
    };

    void initialize();
    return () => {
      disposed = true;
      themeObserver?.disconnect();
      for (const subscription of subscriptions) subscription.dispose();
      editorRef.current?.dispose();
      for (const model of modelsRef.current.values()) model.dispose();
      editorRef.current = undefined;
      modelsRef.current = new Map();
      rootRef.current?.removeAttribute("data-monaco-ready");
    };
  }, [loadNonce, locale]);

  const commands = useMemo(
    () => [
      { id: "format-document" as const, label: copy.formatDocument },
      { id: "toggle-minimap" as const, label: copy.toggleMinimap },
      { id: "toggle-panel" as const, label: copy.toggleBottomPanel },
      { id: "open-agent-config" as const, label: copy.openAgentConfig },
      { id: "switch-theme" as const, label: copy.switchTheme },
    ],
    [copy],
  );
  const filteredCommands = useMemo(() => {
    const query = commandQuery.trim().toLocaleLowerCase(locale);
    if (!query) return commands;
    return commands.filter((command) =>
      command.label.toLocaleLowerCase(locale).includes(query),
    );
  }, [commandQuery, commands, locale]);

  const executeCommand = useCallback(
    async (command: CommandId) => {
      const editor = editorRef.current;
      if (command === "format-document") {
        await editor?.getAction("editor.action.formatDocument")?.run();
      } else if (command === "toggle-minimap") {
        minimapEnabledRef.current = !minimapEnabledRef.current;
        setMinimapEnabled(minimapEnabledRef.current);
        editor?.updateOptions({
          minimap: { enabled: minimapEnabledRef.current },
        });
      } else if (command === "toggle-panel") {
        togglePanel();
      } else if (command === "open-agent-config") {
        openFile(".a3s/agent.acl");
      } else if (command === "switch-theme") {
        document.querySelector<HTMLElement>(".rp-switch-appearance")?.click();
      }
      paletteRef.current?.close();
      setAnnouncement(
        `${copy.commandComplete}: ${commands.find((item) => item.id === command)?.label}`,
      );
    },
    [commands, copy.commandComplete, openFile, togglePanel],
  );

  const handleWorkbenchKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const commandKey = event.ctrlKey || event.metaKey;
    const key = event.key.toLocaleLowerCase();
    if (event.key === "F1" || (commandKey && event.shiftKey && key === "p")) {
      event.preventDefault();
      event.stopPropagation();
      openCommandPalette();
      return;
    }
    if (commandKey && !event.shiftKey && key === "s") {
      event.preventDefault();
      event.stopPropagation();
      saveActiveFile();
      return;
    }
    if (commandKey && !event.shiftKey && key === "j") {
      event.preventDefault();
      event.stopPropagation();
      togglePanel();
    }
  };

  const handleFileTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % workbenchFiles.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + workbenchFiles.length) % workbenchFiles.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = workbenchFiles.length - 1;
    }
    if (nextIndex === undefined) return;
    event.preventDefault();
    openFile(workbenchFiles[nextIndex].path, false);
    requestAnimationFrame(() => {
      rootRef.current
        ?.querySelectorAll<HTMLButtonElement>("[data-workbench-tab]")
        [nextIndex]?.focus();
    });
  };

  const handlePanelTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % panelViews.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + panelViews.length) % panelViews.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = panelViews.length - 1;
    }
    if (nextIndex === undefined) return;
    event.preventDefault();
    setPanelView(panelViews[nextIndex]);
    requestAnimationFrame(() => {
      rootRef.current
        ?.querySelectorAll<HTMLButtonElement>("[data-workbench-panel-tab]")
        [nextIndex]?.focus();
    });
  };

  const renderFileButton = (path: string, context: "editor" | "tree") => {
    const file = workbenchFiles.find((candidate) => candidate.path === path);
    if (!file) return null;
    const dirty = dirtyPathsRef.current.has(file.path);
    return (
      <button
        type="button"
        className="monaco-workbench__file"
        data-active={activePath === file.path || undefined}
        data-dirty={dirty || undefined}
        data-workbench-file={file.path}
        onClick={() => openFile(file.path)}
      >
        <span data-file-kind={file.language}>{file.compactLabel}</span>
        <span>{context === "tree" ? file.path : file.name}</span>
        {dirty ? <i aria-label={copy.unsaved}>M</i> : null}
      </button>
    );
  };

  const dirtyPaths = Array.from(dirtyPathsRef.current);
  void dirtyRevision;

  return (
    <section
      ref={rootRef}
      className="monaco-workbench"
      data-active-file={activePath}
      data-load-state={loadState}
      data-minimap-enabled={minimapEnabled}
      data-panel-open={panelVisible}
      data-save-state={saveState}
      data-workbench-locale={locale}
      lang={locale === "zh" ? "zh-CN" : "en"}
      dir="ltr"
      aria-label={
        locale === "zh" ? "Monaco 编辑器示例" : "Monaco editor example"
      }
      onKeyDownCapture={handleWorkbenchKeyDown}
    >
      <header className="monaco-workbench__titlebar">
        <strong>{copy.workspace}</strong>
        <button
          type="button"
          data-workbench-command-trigger
          aria-keyshortcuts="Control+Shift+P Meta+Shift+P F1"
          aria-label={copy.openCommandCenter}
          onClick={openCommandPalette}
        >
          <WorkbenchIcon name="search" />
          <span>{copy.commandCenter}</span>
          <span data-shortcut aria-hidden="true">
            <kbd>Ctrl</kbd>
            <kbd>Shift</kbd>
            <kbd>P</kbd>
          </span>
        </button>
        <small>{copy.illustrative}</small>
      </header>

      <div className="monaco-workbench__body">
        <nav className="monaco-workbench__activity" aria-label={copy.workspace}>
          {(
            [
              ["explorer", "explorer", copy.explorer],
              ["search", "search", copy.search],
              ["source-control", "source-control", copy.sourceControl],
            ] as const
          ).map(([view, icon, label]) => (
            <button
              type="button"
              key={view}
              aria-label={label}
              aria-pressed={sidebarView === view}
              data-active={sidebarView === view || undefined}
              data-workbench-view={view}
              title={label}
              onClick={() => setSidebarView(view)}
            >
              <WorkbenchIcon name={icon} />
              {view === "source-control" && dirtyPaths.length > 0 ? (
                <span data-activity-count>{dirtyPaths.length}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <aside
          className="monaco-workbench__sidebar"
          aria-label={
            copy[
              sidebarView === "source-control" ? "sourceControl" : sidebarView
            ]
          }
        >
          <header>
            <span>
              {
                copy[
                  sidebarView === "source-control"
                    ? "sourceControl"
                    : sidebarView
                ]
              }
            </span>
            <small>
              {sidebarView === "source-control"
                ? dirtyPaths.length
                : workbenchFiles.length}
            </small>
          </header>
          {sidebarView === "explorer" ? (
            <div data-sidebar-view="explorer">
              <section>
                <h3>{copy.openEditors}</h3>
                {renderFileButton(activePath, "editor")}
              </section>
              <section>
                <h3>
                  <WorkbenchIcon name="chevron" />
                  {copy.files}
                </h3>
                {workbenchFiles.map((file) =>
                  renderFileButton(file.path, "tree"),
                )}
              </section>
            </div>
          ) : null}
          {sidebarView === "search" ? (
            <div data-sidebar-view="search">
              <label>
                <span className="sr-only">{copy.filterFiles}</span>
                <WorkbenchIcon name="search" />
                <input
                  type="search"
                  value={searchQuery}
                  placeholder={copy.filterFiles}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </label>
              <section>
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) =>
                    renderFileButton(file.path, "tree"),
                  )
                ) : (
                  <p>{copy.noFiles}</p>
                )}
              </section>
            </div>
          ) : null}
          {sidebarView === "source-control" ? (
            <div data-sidebar-view="source-control">
              <section>
                <h3>{copy.changes}</h3>
                {dirtyPaths.length > 0 ? (
                  dirtyPaths.map((path) => renderFileButton(path, "tree"))
                ) : (
                  <p>
                    <WorkbenchIcon name="check" />
                    {copy.saved}
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </aside>

        <section
          className="monaco-workbench__editor-area"
          aria-label={activeFile.name}
        >
          <div
            className="monaco-workbench__tabs"
            role="tablist"
            aria-label={copy.openEditors}
          >
            {workbenchFiles.map((file, index) => (
              <button
                type="button"
                key={file.path}
                role="tab"
                id={`monaco-workbench-tab-${locale}-${index}`}
                aria-controls={`monaco-workbench-editor-${locale}`}
                aria-selected={activePath === file.path}
                data-active={activePath === file.path || undefined}
                data-dirty={dirtyPathsRef.current.has(file.path) || undefined}
                data-workbench-tab={file.path}
                tabIndex={activePath === file.path ? 0 : -1}
                onClick={() => openFile(file.path)}
                onKeyDown={(event) => handleFileTabKeyDown(event, index)}
              >
                <span data-file-kind={file.language}>{file.compactLabel}</span>
                <span>{file.name}</span>
                {dirtyPathsRef.current.has(file.path) ? (
                  <i aria-hidden="true" />
                ) : null}
              </button>
            ))}
          </div>
          <nav
            className="monaco-workbench__breadcrumbs"
            aria-label={activeFile.path}
          >
            {activeFile.path.split("/").map((part, index) => (
              <span key={`${part}-${index}`}>
                {index > 0 ? <WorkbenchIcon name="chevron" /> : null}
                {part}
              </span>
            ))}
          </nav>
          <div
            id={`monaco-workbench-editor-${locale}`}
            className="monaco-workbench__editor-stack"
            role="tabpanel"
            aria-labelledby={`monaco-workbench-tab-${locale}-${activeTabIndex}`}
          >
            <div
              ref={editorHostRef}
              className="monaco-workbench__editor"
              data-monaco-host
            />
            {loadState !== "ready" ? (
              <div
                className="monaco-workbench__loader"
                role={loadState === "error" ? "alert" : "status"}
              >
                {loadState === "loading" ? (
                  <i aria-hidden="true" />
                ) : (
                  <WorkbenchIcon name="problems" />
                )}
                <p>{loadState === "loading" ? copy.loading : copy.loadError}</p>
                {loadState === "error" ? (
                  <button
                    type="button"
                    onClick={() => setLoadNonce((nonce) => nonce + 1)}
                  >
                    {copy.retry}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <section
            className="monaco-workbench__panel"
            data-workbench-panel
            hidden={!panelVisible}
          >
            <header role="tablist" aria-label={copy.togglePanel}>
              {panelViews.map((view, index) => (
                <button
                  type="button"
                  key={view}
                  role="tab"
                  id={`monaco-workbench-panel-tab-${locale}-${view}`}
                  aria-controls={`monaco-workbench-panel-${locale}`}
                  aria-selected={panelView === view}
                  data-active={panelView === view || undefined}
                  data-workbench-panel-tab={view}
                  tabIndex={panelView === view ? 0 : -1}
                  onClick={() => setPanelView(view)}
                  onKeyDown={(event) => handlePanelTabKeyDown(event, index)}
                >
                  {copy[view]}
                  {view === "problems" && problemCount > 0 ? (
                    <span>{problemCount}</span>
                  ) : null}
                </button>
              ))}
              <button
                type="button"
                data-panel-close
                aria-label={copy.closePanel}
                onClick={() => setPanelVisible(false)}
              >
                <WorkbenchIcon name="close" />
              </button>
            </header>
            <div
              id={`monaco-workbench-panel-${locale}`}
              role="tabpanel"
              aria-labelledby={`monaco-workbench-panel-tab-${locale}-${panelView}`}
              data-panel-view={panelView}
            >
              {panelView === "problems" ? (
                <button
                  type="button"
                  data-workbench-problem
                  onClick={revealProblem}
                >
                  <WorkbenchIcon name="problems" />
                  <span>
                    <strong>{copy.warning}</strong>
                    {copy.warningDetail}
                  </span>
                  <code>{`.a3s/agent.acl:${persistentMemoryWarningLine}`}</code>
                </button>
              ) : null}
              {panelView === "output" ? (
                <pre>
                  <span>{copy.outputReady}</span>
                  {"\n"}
                  <span>{copy.outputIndexed}</span>
                </pre>
              ) : null}
              {panelView === "terminal" ? (
                <pre>
                  <strong>PS A3S:\release-review&gt;</strong>{" "}
                  {copy.terminalPrompt}
                  {"\n"}
                  <span>✓ 4 files checked · 1 policy warning</span>
                </pre>
              ) : null}
            </div>
          </section>
        </section>
      </div>

      <footer className="monaco-workbench__statusbar">
        <span>
          <WorkbenchIcon name="branch" />
          {copy.branch}
        </span>
        <button
          type="button"
          data-workbench-save-state
          onClick={saveActiveFile}
        >
          <WorkbenchIcon name={saveState === "saved" ? "check" : "file"} />
          {saveState === "saved" ? copy.saved : copy.unsaved}
        </button>
        <span data-status-spacer />
        <button
          type="button"
          aria-label={copy.togglePanel}
          aria-pressed={panelVisible}
          onClick={togglePanel}
        >
          <WorkbenchIcon name="panel" />
          {problemCount}
        </button>
        <span>
          {copy.line} {line}, {copy.column} {column}
        </span>
        <span>{copy.spaces}</span>
        <span>{copy.encoding}</span>
        <span>{languageLabel(activeFile.language)}</span>
      </footer>

      <dialog
        ref={paletteRef}
        className="monaco-workbench__palette"
        data-workbench-command-dialog
        aria-label={copy.commandPalette}
        onClose={() => setCommandQuery("")}
      >
        <header>
          <WorkbenchIcon name="command" />
          <strong>{copy.commandPalette}</strong>
          <form method="dialog">
            <button type="submit" aria-label={copy.close}>
              <WorkbenchIcon name="close" />
            </button>
          </form>
        </header>
        <label>
          <span className="sr-only">{copy.commandSearch}</span>
          <WorkbenchIcon name="search" />
          <input
            ref={paletteInputRef}
            type="search"
            value={commandQuery}
            placeholder={copy.commandSearch}
            data-workbench-command-input
            onChange={(event) => setCommandQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && filteredCommands[0]) {
                event.preventDefault();
                void executeCommand(filteredCommands[0].id);
              }
            }}
          />
        </label>
        <div role="listbox" aria-label={copy.commandPalette}>
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command, index) => (
              <button
                type="button"
                key={command.id}
                role="option"
                aria-selected={index === 0}
                data-workbench-command={command.id}
                onClick={() => void executeCommand(command.id)}
              >
                <WorkbenchIcon
                  name={
                    command.id === "open-agent-config"
                      ? "file"
                      : command.id === "toggle-panel"
                        ? "panel"
                        : "command"
                  }
                />
                <span>{command.label}</span>
                {index === 0 ? <kbd>Enter</kbd> : null}
              </button>
            ))
          ) : (
            <p>{copy.noCommands}</p>
          )}
        </div>
      </dialog>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
