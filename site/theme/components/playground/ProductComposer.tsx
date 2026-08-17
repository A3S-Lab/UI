import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AgentComposerEditor,
  type AgentComposerEditorHandle,
} from "../../../../src/integrations/tiptap/react.js";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export type ProductComposerContext = {
  model: "auto" | "fast" | "reasoner";
  permissions: "ask" | "edit" | "read";
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
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

export function ProductComposer({
  compact = false,
  contextual = false,
  initialValue = "",
  locale,
  onSubmit,
  placeholder,
  showPermissions = true,
  submitSuccessMessage,
}: {
  compact?: boolean;
  contextual?: boolean;
  initialValue?: string;
  locale: ProductPlaygroundLocale;
  onSubmit?: (value: string, context: ProductComposerContext) => void;
  placeholder?: string;
  showPermissions?: boolean;
  submitSuccessMessage?: string;
}) {
  const zh = locale === "zh";
  const editorRef = useRef<AgentComposerEditorHandle>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechOutcomeRef = useRef<"captured" | "error" | "idle" | "stopped">(
    "idle",
  );
  const workspaceMenuRef = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState(initialValue);
  const [listening, setListening] = useState(false);
  const [model, setModel] = useState<ProductComposerContext["model"]>("auto");
  const [permissions, setPermissions] =
    useState<ProductComposerContext["permissions"]>("ask");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [status, setStatus] = useState("");
  const [workspace, setWorkspace] =
    useState<ProductComposerContext["workspace"]>("");
  const workspaceOptions = [
    ["ui", zh ? "A3S UI 体验优化" : "A3S UI experience"],
    ["local", zh ? "本地工作空间" : "Local workspace"],
  ] as const;
  const workspaceLabel = workspaceOptions.find(
    ([value]) => value === workspace,
  )?.[1];

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
      const transcript = Array.from(
        event.results,
        (result) => result[0]?.transcript ?? "",
      )
        .join(" ")
        .trim();
      if (!transcript) return;
      speechOutcomeRef.current = "captured";
      const currentValue = editorRef.current?.getMarkdown() ?? "";
      editorRef.current?.insertContent(
        `${currentValue.trim() ? " " : ""}${transcript}`,
      );
      setStatus(zh ? "语音内容已加入任务。" : "Voice input added.");
    };
    recognition.onerror = (event) => {
      speechOutcomeRef.current = "error";
      setListening(false);
      recognitionRef.current = null;
      const permissionDenied =
        event.error === "not-allowed" || event.error === "service-not-allowed";
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
      setStatus(
        zh
          ? "暂时无法启动语音输入，请重试。"
          : "Voice input could not start. Try again.",
      );
    }
  };

  const submit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!draft.trim()) {
      setStatus(
        zh ? "请先描述要完成的任务。" : "Describe the task before sending.",
      );
      editorRef.current?.focus();
      return;
    }
    const normalizedDraft = draft.trim();
    if (normalizedDraft.length > maxTaskLength) {
      setStatus(
        zh
          ? `任务内容不能超过 ${maxTaskLength.toLocaleString("zh-CN")} 个字符。`
          : `Keep the task under ${maxTaskLength.toLocaleString("en-US")} characters.`,
      );
      editorRef.current?.focus();
      return;
    }
    if (onSubmit) {
      onSubmit(normalizedDraft, { model, permissions, workspace });
      setDraft("");
      setStatus(
        submitSuccessMessage ??
          (zh
            ? "消息已添加到当前会话。"
            : "Message added to the current session."),
      );
      return;
    }
    setStatus(
      zh
        ? "当前页面没有可接收此任务的会话。"
        : "This page does not have a session destination for the task.",
    );
  };

  return (
    <form
      aria-label={zh ? "任务输入" : "Task composer"}
      className="product-composer"
      data-compact={compact ? "true" : undefined}
      data-contextual={contextual ? "true" : undefined}
      onSubmit={submit}
    >
      <AgentComposerEditor
        ref={editorRef}
        ariaLabel={zh ? "任务指令" : "Task instruction"}
        onChange={setDraft}
        onSubmit={() => submit()}
        placeholder={
          placeholder ??
          (zh
            ? "今天帮你做些什么？ @ 引用对话文件，/ 调用技能与指令"
            : "What can I help you accomplish? Use @ for files or / for commands")
        }
        suggestionsOpen={false}
        value={draft}
      />
      <footer>
        <div data-composer-tools>
          <button
            aria-label={zh ? "添加文件或上下文" : "Add file or context"}
            type="button"
            onClick={() => {
              editorRef.current?.insertContent("@ ");
              setStatus(
                zh
                  ? "输入文件名以添加上下文。"
                  : "Type a file name to add context.",
              );
            }}
          >
            <ProductPlaygroundIcon name="plus" />
          </button>
          {!contextual && showPermissions ? (
            <label>
              <span className="sr-only">{zh ? "权限" : "Permissions"}</span>
              <ProductPlaygroundIcon name="shield" />
              <select
                aria-label={zh ? "权限" : "Permissions"}
                onChange={(event) =>
                  setPermissions(
                    event.currentTarget
                      .value as ProductComposerContext["permissions"],
                  )
                }
                value={permissions}
              >
                <option value="ask">
                  {zh ? "默认权限" : "Default permissions"}
                </option>
                <option value="read">{zh ? "仅查看" : "Read only"}</option>
                <option value="edit">{zh ? "允许修改" : "Allow edits"}</option>
              </select>
            </label>
          ) : null}
        </div>
        <div data-composer-actions>
          <label>
            <span className="sr-only">{zh ? "模型" : "Model"}</span>
            <select
              aria-label={zh ? "模型" : "Model"}
              onChange={(event) =>
                setModel(
                  event.currentTarget.value as ProductComposerContext["model"],
                )
              }
              value={model}
            >
              <option value="auto">Auto</option>
              <option value="reasoner">A3S Reasoner</option>
              <option value="fast">A3S Fast</option>
            </select>
          </label>
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
            title={
              speechSupported
                ? undefined
                : zh
                  ? "当前浏览器不支持语音输入"
                  : "Voice input is unavailable in this browser"
            }
            type="button"
            onClick={toggleSpeechInput}
          >
            <ProductPlaygroundIcon name="microphone" />
          </button>
          <button
            aria-label={zh ? "发送任务" : "Send task"}
            data-primary
            disabled={!draft.trim()}
            type="submit"
          >
            <ProductPlaygroundIcon name="send" />
          </button>
        </div>
      </footer>
      {contextual ? (
        <div
          aria-label={zh ? "任务上下文" : "Task context"}
          className="product-composer__context"
        >
          <details ref={workspaceMenuRef}>
            <summary
              aria-label={zh ? "选择工作空间" : "Select workspace"}
              aria-haspopup="menu"
            >
              <ProductPlaygroundIcon name="folder" />
              <span>
                {workspaceLabel ?? (zh ? "选择工作空间" : "Select workspace")}
              </span>
              <ProductPlaygroundIcon name="chevron" />
            </summary>
            <div aria-label={zh ? "工作空间" : "Workspaces"} role="menu">
              {workspaceOptions.map(([value, label]) => (
                <button
                  aria-current={workspace === value ? "true" : undefined}
                  key={value}
                  onClick={() => {
                    setWorkspace(value);
                    setStatus(zh ? `已选择“${label}”。` : `${label} selected.`);
                    workspaceMenuRef.current?.removeAttribute("open");
                  }}
                  role="menuitem"
                  type="button"
                >
                  <span>{label}</span>
                  {workspace === value ? (
                    <ProductPlaygroundIcon name="check" />
                  ) : null}
                </button>
              ))}
            </div>
          </details>
          <label>
            <span className="sr-only">{zh ? "权限" : "Permissions"}</span>
            <ProductPlaygroundIcon name="shield" />
            <select
              aria-label={zh ? "权限设置" : "Permission settings"}
              onChange={(event) => {
                setPermissions(
                  event.currentTarget
                    .value as ProductComposerContext["permissions"],
                );
                const label = event.currentTarget.selectedOptions[0]?.text;
                setStatus(
                  zh
                    ? `权限已设为“${label}”。`
                    : `Permissions set to ${label}.`,
                );
              }}
              value={permissions}
            >
              <option value="ask">
                {zh ? "默认权限" : "Default permissions"}
              </option>
              <option value="read">{zh ? "仅查看" : "Read only"}</option>
              <option value="edit">{zh ? "允许修改" : "Allow edits"}</option>
            </select>
          </label>
        </div>
      ) : null}
      <output aria-live="polite">{status}</output>
    </form>
  );
}
