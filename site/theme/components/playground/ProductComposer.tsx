import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  AgentComposerEditor,
  type AgentComposerEditorHandle,
  type AgentComposerTrigger,
} from "../../../../src/integrations/tiptap/react.js";
import {
  ProductComposerEffortPicker,
  ProductComposerModelPicker,
  ProductComposerRunSettings,
  type ComposerControlKey,
} from "./ProductComposerRunSettings";
import {
  ProductComposerSuggestions,
  type ProductComposerSuggestionKind,
  type ProductComposerSuggestionsHandle,
} from "./ProductComposerSuggestions";
import {
  type ProductComposerEffort,
  type ProductComposerModel,
  type ProductComposerResource,
} from "./product-composer-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export type ProductComposerContext = {
  deepResearch: boolean;
  effort: ProductComposerEffort;
  model: ProductComposerModel["id"];
  permissions: "ask" | "edit" | "read";
  resources: ProductComposerResource[];
  workspace: "" | "local" | "ui";
};

const maxTaskLength = 8_000;

type SpeechRecognitionResultLike = {
  readonly 0?: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = Event & {
  readonly error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function ProductComposer({
  compact = false,
  contextual = false,
  initialValue = "",
  initialWorkspace = "",
  locale,
  onSubmit,
  placeholder,
  showPermissions = true,
  submitSuccessMessage,
}: {
  compact?: boolean;
  contextual?: boolean;
  initialValue?: string;
  initialWorkspace?: ProductComposerContext["workspace"];
  locale: ProductPlaygroundLocale;
  onSubmit?: (value: string, context: ProductComposerContext) => void;
  placeholder?: string;
  showPermissions?: boolean;
  submitSuccessMessage?: string;
}) {
  const zh = locale === "zh";
  const composerRef = useRef<HTMLFormElement>(null);
  const editorRef = useRef<AgentComposerEditorHandle>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const suggestionsRef = useRef<ProductComposerSuggestionsHandle>(null);
  const speechOutcomeRef = useRef<"captured" | "error" | "idle" | "stopped">("idle");
  const manualSuggestionsRef = useRef(false);
  const dragDepthRef = useRef(0);
  const suggestionsId = useId().replaceAll(":", "");
  const [activeControl, setActiveControl] = useState<ComposerControlKey | null>(null);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string>();
  const [deepResearch, setDeepResearch] = useState(false);
  const [draft, setDraft] = useState(initialValue);
  const [dropActive, setDropActive] = useState(false);
  const [effort, setEffort] = useState<ProductComposerEffort>("medium");
  const [listening, setListening] = useState(false);
  const [menuKind, setMenuKind] = useState<ProductComposerSuggestionKind | null>(null);
  const [model, setModel] = useState<ProductComposerContext["model"]>("auto");
  const [permissions, setPermissions] = useState<ProductComposerContext["permissions"]>("ask");
  const [resources, setResources] = useState<ProductComposerResource[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [status, setStatus] = useState("");
  const [trigger, setTrigger] = useState<AgentComposerTrigger | null>(null);
  const [workspace, setWorkspace] = useState<ProductComposerContext["workspace"]>(initialWorkspace);
  const workspaceLabel =
    workspace === "ui"
      ? zh
        ? "A3S UI 体验优化"
        : "A3S UI experience"
      : workspace === "local"
        ? zh
          ? "本地工作空间"
          : "Local workspace"
        : zh
          ? "未选择工作空间"
          : "No workspace selected";
  const permissionLabel =
    permissions === "edit"
      ? zh
        ? "允许修改"
        : "Allow edits"
      : permissions === "read"
        ? zh
          ? "仅查看"
          : "Read only"
        : zh
          ? "修改前询问"
          : "Ask before changes";

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (!recognition) return;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
      recognition.abort();
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!composerRef.current?.contains(target)) {
        setActiveControl(null);
        if (manualSuggestionsRef.current) closeSuggestions();
        return;
      }
      if (activeControl && !target.closest("[data-composer-control]")) {
        setActiveControl(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeControl]);

  const closeSuggestions = () => {
    manualSuggestionsRef.current = false;
    setMenuKind(null);
    setTrigger(null);
    setActiveSuggestionId(undefined);
  };

  const openSuggestions = (kind: ProductComposerSuggestionKind) => {
    manualSuggestionsRef.current = true;
    setActiveControl(null);
    setTrigger(null);
    setMenuKind(kind);
    window.requestAnimationFrame(() => editorRef.current?.focus());
  };

  const addResource = (resource: ProductComposerResource) => {
    setResources((current) =>
      current.some((item) => item.id === resource.id) ? current : [...current, resource],
    );
  };

  const selectFile = (resource: ProductComposerResource) => {
    if (trigger?.kind === "file") editorRef.current?.replaceTrigger(trigger);
    addResource(resource);
    closeSuggestions();
    setStatus(
      zh ? `已将“${resource.label}”加入任务上下文。` : `${resource.label} added to task context.`,
    );
    editorRef.current?.focus();
  };

  const selectSkill = (resource: ProductComposerResource) => {
    if (trigger?.kind === "skill") editorRef.current?.replaceTrigger(trigger);
    addResource(resource);
    closeSuggestions();
    setStatus(zh ? `已启用 ${resource.label}。` : `${resource.label} enabled.`);
    editorRef.current?.focus();
  };

  const selectCommand = (id: string) => {
    if (trigger?.kind === "command") editorRef.current?.replaceTrigger(trigger, `/${id} `);
    else editorRef.current?.insertContent(`/${id} `);
    closeSuggestions();
    setStatus(zh ? `已插入 /${id} 指令。` : `/${id} inserted.`);
    editorRef.current?.focus();
  };

  const handleSuggestionKeyDown = (event: globalThis.KeyboardEvent) => {
    if (!menuKind) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSuggestions();
      return true;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      suggestionsRef.current?.moveActive(event.key === "ArrowDown" ? 1 : -1);
      return true;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      suggestionsRef.current?.moveToEdge(event.key === "Home" ? "start" : "end");
      return true;
    }
    if (menuKind === "file" && event.key === "ArrowRight") {
      event.preventDefault();
      suggestionsRef.current?.openActive();
      return true;
    }
    if (menuKind === "file" && event.key === "ArrowLeft") {
      event.preventDefault();
      suggestionsRef.current?.closeActive();
      return true;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      suggestionsRef.current?.activateActive();
      return true;
    }
    return false;
  };

  const toggleSpeechInput = () => {
    if (listening) {
      speechOutcomeRef.current = "stopped";
      recognitionRef.current?.stop();
      setListening(false);
      setStatus(zh ? "语音输入已停止。" : "Voice input stopped.");
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setStatus(
        zh
          ? "当前浏览器不支持语音输入，请继续使用键盘。"
          : "Voice input is unavailable in this browser. Continue with the keyboard.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = zh ? "zh-CN" : "en-US";
    speechOutcomeRef.current = "idle";
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results, (result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (!transcript) return;
      speechOutcomeRef.current = "captured";
      const currentValue = editorRef.current?.getMarkdown() ?? "";
      editorRef.current?.insertContent(`${currentValue.trim() ? " " : ""}${transcript}`);
      setStatus(zh ? "语音内容已加入任务。" : "Voice input added.");
    };
    recognition.onerror = (event) => {
      speechOutcomeRef.current = "error";
      setListening(false);
      recognitionRef.current = null;
      const permissionDenied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setStatus(
        permissionDenied
          ? zh
            ? "无法使用麦克风，请检查浏览器权限。"
            : "Microphone access was denied. Check browser permissions."
          : zh
            ? "没有识别到语音，请重试或使用键盘。"
            : "No speech was recognized. Try again or use the keyboard.",
      );
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (speechOutcomeRef.current === "idle") {
        setStatus(
          zh
            ? "没有识别到语音，请重试或使用键盘。"
            : "No speech was recognized. Try again or use the keyboard.",
        );
      }
    };
    try {
      recognition.start();
      setListening(true);
      setStatus(zh ? "正在聆听…" : "Listening…");
    } catch {
      recognitionRef.current = null;
      speechOutcomeRef.current = "error";
      setListening(false);
      setStatus(zh ? "暂时无法启动语音输入，请重试。" : "Voice input could not start. Try again.");
    }
  };

  const submit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const normalizedDraft = draft.trim();
    if (!normalizedDraft) {
      setStatus(zh ? "请先描述要完成的任务。" : "Describe the task before sending.");
      editorRef.current?.focus();
      return;
    }
    if (normalizedDraft.length > maxTaskLength) {
      setStatus(
        zh
          ? `任务内容不能超过 ${maxTaskLength.toLocaleString("zh-CN")} 个字符。`
          : `Keep the task under ${maxTaskLength.toLocaleString("en-US")} characters.`,
      );
      editorRef.current?.focus();
      return;
    }
    if (!onSubmit) {
      setStatus(
        zh
          ? "当前页面没有可接收此任务的会话。"
          : "This page does not have a session destination for the task.",
      );
      return;
    }
    onSubmit(normalizedDraft, {
      deepResearch,
      effort,
      model,
      permissions,
      resources,
      workspace,
    });
    setDraft("");
    setResources([]);
    setStatus(
      submitSuccessMessage ??
        (zh ? "消息已添加到当前会话。" : "Message added to the current session."),
    );
  };

  const handleDragEnter = (event: DragEvent<HTMLFormElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setDropActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLFormElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDropActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDropActive(false);
    const dropped = Array.from(event.dataTransfer.files);
    if (dropped.length === 0) return;
    setResources((current) => {
      const existing = new Set(current.map((item) => item.label));
      const additions = dropped
        .filter((file) => !existing.has(file.name))
        .map((file, index) => ({
          id: `drop:${file.name}:${file.size}:${index}`,
          kind: "file" as const,
          label: file.name,
          meta: formatFileSize(file.size, locale),
        }));
      return [...current, ...additions];
    });
    setStatus(
      zh
        ? `已将 ${dropped.length} 个文件加入任务上下文。`
        : `${dropped.length} file${dropped.length === 1 ? "" : "s"} added to task context.`,
    );
  };

  return (
    <form
      aria-label={zh ? "任务输入" : "Task composer"}
      className="agent-composer product-composer"
      data-compact={compact ? "true" : undefined}
      data-contextual={contextual ? "true" : undefined}
      data-layout={compact ? "compact" : "default"}
      data-state="ready"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={handleDrop}
      onSubmit={submit}
      ref={composerRef}
    >
      {resources.length > 0 ? (
        <ul aria-label={zh ? "已添加的任务资源" : "Attached task resources"} data-composer-resources>
          {resources.map((resource) => (
            <li
              data-resource-id={resource.id}
              data-resource-kind={resource.kind}
              key={resource.id}
              title={resource.meta}
            >
              <ProductPlaygroundIcon
                name={
                  resource.kind === "skill"
                    ? "brain"
                    : resource.kind === "folder"
                      ? "folder"
                      : "document"
                }
              />
              <span data-resource-label>{resource.label}</span>
              {resource.meta ? <small>{resource.meta}</small> : null}
              <button
                aria-label={zh ? `移除 ${resource.label}` : `Remove ${resource.label}`}
                data-composer-action="remove-resource"
                onClick={() =>
                  setResources((current) => current.filter((item) => item.id !== resource.id))
                }
                type="button"
              >
                <ProductPlaygroundIcon name="close" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <AgentComposerEditor
        activeSuggestionId={activeSuggestionId}
        ariaLabel={zh ? "任务指令" : "Task instruction"}
        onChange={setDraft}
        onSubmit={() => submit()}
        onSuggestionKeyDown={handleSuggestionKeyDown}
        onTriggerChange={(nextTrigger: AgentComposerTrigger | null) => {
          setTrigger(nextTrigger);
          if (nextTrigger) {
            manualSuggestionsRef.current = false;
            setActiveControl(null);
            setMenuKind(nextTrigger.kind);
          } else if (!manualSuggestionsRef.current) {
            setMenuKind(null);
          }
        }}
        placeholder={
          placeholder ??
          (zh
            ? "描述任务；@ 添加工作区文件，$ 使用技能，/ 运行指令…"
            : "Describe the task; use @ for workspace files, $ for skills, or / for commands…")
        }
        ref={editorRef}
        suggestionsId={menuKind ? suggestionsId : undefined}
        suggestionsOpen={Boolean(menuKind)}
        value={draft}
      />

      {menuKind ? (
        <ProductComposerSuggestions
          id={suggestionsId}
          kind={menuKind}
          locale={locale}
          onActiveDescendantChange={setActiveSuggestionId}
          onSelectCommand={selectCommand}
          onSelectFile={selectFile}
          onSelectSkill={selectSkill}
          query={trigger?.kind === menuKind ? trigger.query : ""}
          ref={suggestionsRef}
          resources={resources}
        />
      ) : null}

      <footer>
        <div data-composer-tools>
          <button
            aria-expanded={menuKind === "file"}
            aria-label={zh ? "添加工作区文件" : "Add workspace files"}
            data-composer-action="attach-file"
            onClick={() => openSuggestions("file")}
            type="button"
          >
            <ProductPlaygroundIcon name="plus" />
          </button>
          <button
            aria-expanded={menuKind === "skill"}
            aria-label={zh ? "选择技能" : "Choose a skill"}
            data-composer-action="choose-skill"
            onClick={() => openSuggestions("skill")}
            type="button"
          >
            <ProductPlaygroundIcon name="brain" />
            <span data-setting-label>{zh ? "技能" : "Skills"}</span>
          </button>
          <ProductComposerModelPicker
            activeControl={activeControl}
            locale={locale}
            model={model}
            onActiveControlChange={setActiveControl}
            onConfigure={() =>
              setStatus(
                zh
                  ? "模型配置入口已就绪，可在设置中管理提供方、凭据与默认模型。"
                  : "Model configuration is ready in Settings for providers, credentials, and defaults.",
              )
            }
            onModelChange={(next) => {
              setModel(next);
              setStatus(zh ? "模型设置已更新。" : "Model setting updated.");
            }}
          />
          <ProductComposerEffortPicker
            activeControl={activeControl}
            effort={effort}
            locale={locale}
            onActiveControlChange={setActiveControl}
            onEffortChange={(next) => {
              setEffort(next);
              setStatus(zh ? "努力程度已保存。" : "Effort saved.");
            }}
          />
          <ProductComposerRunSettings
            activeControl={activeControl}
            deepResearch={deepResearch}
            locale={locale}
            onActiveControlChange={setActiveControl}
            onCompactContext={() =>
              setStatus(
                zh
                  ? "已保留近期内容，并将较早上下文整理为摘要。"
                  : "Recent content was retained and older context was compacted into a summary.",
              )
            }
            onDeepResearchChange={(enabled) => {
              setDeepResearch(enabled);
              setStatus(
                enabled
                  ? zh
                    ? "深度研究已开启。"
                    : "Deep research enabled."
                  : zh
                    ? "深度研究已关闭。"
                    : "Deep research disabled.",
              );
            }}
            onPermissionsChange={setPermissions}
            onWorkspaceChange={setWorkspace}
            permissions={permissions}
            showPermissions={showPermissions}
            workspace={workspace}
          />
        </div>
        <div data-composer-actions>
          <button
            aria-label={
              listening
                ? zh
                  ? "停止语音输入"
                  : "Stop voice input"
                : speechSupported
                  ? zh
                    ? "开始语音输入"
                    : "Start voice input"
                  : zh
                    ? "当前浏览器不支持语音输入"
                    : "Voice input is unavailable in this browser"
            }
            aria-pressed={listening}
            disabled={!speechSupported}
            onClick={toggleSpeechInput}
            title={
              speechSupported
                ? undefined
                : zh
                  ? "当前浏览器不支持语音输入"
                  : "Voice input is unavailable in this browser"
            }
            type="button"
          >
            <ProductPlaygroundIcon name="microphone" />
          </button>
          <button
            aria-label={zh ? "发送任务" : "Send task"}
            data-composer-action="submit"
            data-primary
            disabled={!draft.trim()}
            type="submit"
          >
            <ProductPlaygroundIcon name="up" />
          </button>
        </div>
      </footer>

      {contextual ? (
        <section aria-label={zh ? "当前运行上下文" : "Current run context"} data-composer-run-summary>
          <span title={workspaceLabel}>
            <ProductPlaygroundIcon name="folder" />
            {workspaceLabel}
          </span>
          {showPermissions ? (
            <span>
              <ProductPlaygroundIcon name="shield" />
              {permissionLabel}
            </span>
          ) : null}
          <span>
            <ProductPlaygroundIcon name="database" />
            {zh ? "上下文 24%" : "Context 24%"}
          </span>
        </section>
      ) : null}
      <output aria-live="polite" data-composer-status>{status}</output>
      {dropActive ? (
        <div data-composer-dropzone>
          <span><ProductPlaygroundIcon name="upload" /></span>
          <strong>{zh ? "松开放入工作区" : "Drop into the workspace"}</strong>
          <small>
            {zh
              ? "文件会复制到工作区并加入当前任务上下文。"
              : "Files will be copied into the workspace and attached to this task."}
          </small>
        </div>
      ) : null}
    </form>
  );
}

function formatFileSize(size: number, locale: ProductPlaygroundLocale) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  const value = `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return locale === "zh" ? value : value;
}
