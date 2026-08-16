import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLang } from "@rspress/core/runtime";
import {
  AgentComposerEditor,
  type AgentComposerEditorHandle,
  type AgentComposerTrigger,
} from "../../../src/integrations/tiptap/react.js";

type Resource = { id: string; kind: "file" | "selection" | "skill"; label: string };
type QueueItem = { id: string; message: string };

const suggestions = {
  command: [
    { id: "goal", label: "/goal", detail: "Run the task until the stated outcome is reached" },
    { id: "review", label: "/review", detail: "Review the current change set" },
    { id: "explain", label: "/explain", detail: "Explain selected code and dependencies" },
  ],
  file: [
    { id: "agents", label: "AGENTS.md", detail: "Repository instructions · 7.2 KB" },
    { id: "runtime", label: "src/runtime.ts", detail: "TypeScript · modified" },
    { id: "tests", label: "tests/runtime.spec.ts", detail: "TypeScript · 18 tests" },
  ],
  skill: [
    { id: "ui-review", label: "ui-review", detail: "Interaction and visual quality review" },
    { id: "browser-check", label: "browser-check", detail: "Browser workflow verification" },
    { id: "release-audit", label: "release-audit", detail: "Release readiness checks" },
  ],
} as const;

export default function AgentComposerDemo() {
  const language = useLang();
  const zh = language === "zh";
  const editorRef = useRef<AgentComposerEditorHandle>(null);
  const [draft, setDraft] = useState(
    zh
      ? "为权限边界补充回归测试，并说明失败时如何恢复。"
      : "Add regression coverage for the permission boundary and explain recovery after failure.",
  );
  const [resources, setResources] = useState<Resource[]>([
    { id: "agents", kind: "file", label: "AGENTS.md" },
    { id: "runtime", kind: "selection", label: "src/runtime.ts:42–96" },
  ]);
  const [queue, setQueue] = useState<QueueItem[]>([
    {
      id: "docs",
      message: zh ? "随后同步中英文集成示例。" : "Then synchronize the English and Chinese integration examples.",
    },
  ]);
  const [trigger, setTrigger] = useState<AgentComposerTrigger | null>(null);
  const [menuKind, setMenuKind] = useState<keyof typeof suggestions | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [state, setState] = useState<"queued" | "ready" | "streaming">("streaming");
  const [status, setStatus] = useState(
    zh ? "当前任务正在运行，新指令将进入队列。" : "A task is running. New instructions will be queued.",
  );
  const visibleSuggestions = useMemo(
    () => (menuKind ? suggestions[menuKind] : []),
    [menuKind],
  );
  const suggestionsOpen = menuKind !== null;

  const selectSuggestion = (index: number) => {
    const item = visibleSuggestions[index];
    if (!item || !menuKind) return;
    if (trigger) {
      const prefix = menuKind === "file" ? "@" : menuKind === "skill" ? "$" : "/";
      editorRef.current?.replaceTrigger(trigger, `${prefix}${item.id} `);
    } else {
      const prefix = menuKind === "file" ? "@" : menuKind === "skill" ? "$" : "/";
      editorRef.current?.insertContent(`${prefix}${item.id} `);
    }
    if (menuKind === "file") {
      setResources((current) =>
        current.some((resource) => resource.id === item.id)
          ? current
          : [...current, { id: item.id, kind: "file", label: item.label }],
      );
    }
    if (menuKind === "skill") {
      setResources((current) =>
        current.some((resource) => resource.id === item.id)
          ? current
          : [...current, { id: item.id, kind: "skill", label: `$${item.label}` }],
      );
    }
    setMenuKind(null);
    setTrigger(null);
    editorRef.current?.focus();
  };

  const handleSuggestionKeyDown = (event: globalThis.KeyboardEvent) => {
    if (!suggestionsOpen) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      setMenuKind(null);
      return true;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) =>
        (index + direction + visibleSuggestions.length) % visibleSuggestions.length,
      );
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectSuggestion(activeIndex);
      return true;
    }
    return false;
  };

  const submit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message) {
      setStatus(zh ? "请先描述要完成的任务。" : "Describe the task before sending it.");
      return;
    }
    if (state === "streaming") {
      setQueue((current) => [...current, { id: `queued-${Date.now()}`, message }]);
      setState("queued");
      setStatus(zh ? "指令已加入队列，草稿和上下文均已保留。" : "Instruction queued with its draft and context preserved.");
    } else {
      setState("streaming");
      setStatus(zh ? "正在提交任务。" : "Submitting the task.");
    }
  };

  return (
    <form
      className="agent-composer"
      aria-label={zh ? "任务输入器" : "Task composer"}
      data-state={state}
      onSubmit={submit}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (!file) return;
        setResources((current) => [
          ...current,
          { id: `drop-${file.name}`, kind: "file", label: file.name },
        ]);
        setStatus(zh ? `已附加 ${file.name}` : `Attached ${file.name}`);
      }}
    >
      <ul data-composer-resources aria-label={zh ? "已附加资源" : "Attached resources"}>
        {resources.map((resource) => (
          <li key={resource.id} data-resource-id={resource.id} data-resource-kind={resource.kind}>
            <ComposerIcon name={resource.kind} />
            <span data-resource-label>{resource.label}</span>
            <button
              type="button"
              className="btn"
              data-size="icon-xs"
              data-variant="ghost"
              data-composer-action="remove-resource"
              aria-label={zh ? `移除 ${resource.label}` : `Remove ${resource.label}`}
              onClick={() => setResources((current) => current.filter((item) => item.id !== resource.id))}
            >
              <ComposerIcon name="close" />
            </button>
          </li>
        ))}
      </ul>

      <AgentComposerEditor
        ref={editorRef}
        value={draft}
        ariaLabel={zh ? "任务指令" : "Task instruction"}
        placeholder={
          zh
            ? "描述任务；@ 添加文件，$ 使用 Skill，/ 运行命令…"
            : "Describe the task; use @ for files, $ for skills, or / for commands…"
        }
        suggestionsOpen={suggestionsOpen}
        suggestionsId="agent-composer-suggestions-demo"
        activeSuggestionId={
          suggestionsOpen ? `agent-composer-suggestion-${activeIndex}` : undefined
        }
        onChange={setDraft}
        onSubmit={() => submit()}
        onSuggestionKeyDown={handleSuggestionKeyDown}
        onTriggerChange={(nextTrigger: AgentComposerTrigger | null) => {
          setTrigger(nextTrigger);
          if (nextTrigger) {
            setMenuKind(nextTrigger.kind);
            setActiveIndex(0);
          }
        }}
      />

      <section
        id="agent-composer-suggestions-demo"
        data-composer-suggestions
        data-popover
        aria-hidden={!suggestionsOpen}
        hidden={!suggestionsOpen}
        aria-label={zh ? "输入建议" : "Composer suggestions"}
      >
        <header>
          <strong>
            {menuKind === "file"
              ? zh ? "添加文件" : "Add a file"
              : menuKind === "skill"
                ? zh ? "使用 Skill" : "Use a skill"
                : zh ? "运行命令" : "Run a command"}
          </strong>
          <span><kbd>↑</kbd><kbd>↓</kbd> {zh ? "选择" : "select"}</span>
        </header>
        <div role="listbox" aria-label={zh ? "匹配建议" : "Matching suggestions"}>
          {visibleSuggestions.map((item, index) => (
            <button
              id={`agent-composer-suggestion-${index}`}
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => selectSuggestion(index)}
            >
              <span data-composer-suggestion-icon><ComposerIcon name={menuKind || "command"} /></span>
              <span data-composer-suggestion-copy>
                <strong>{item.label}</strong>
                <small>{zh ? suggestionDetailZh(item.id) : item.detail}</small>
              </span>
              <kbd>↵</kbd>
            </button>
          ))}
        </div>
        <footer>
          <span><kbd>Esc</kbd> {zh ? "关闭" : "close"}</span>
          <span>{zh ? `${visibleSuggestions.length} 项结果` : `${visibleSuggestions.length} results`}</span>
        </footer>
      </section>

      <footer>
        <div data-composer-tools>
          <button
            type="button"
            className="btn"
            data-size="icon-sm"
            data-variant="ghost"
            data-composer-action="attach-file"
            aria-label={zh ? "附加文件" : "Attach a file"}
            onClick={() => {
              setMenuKind("file");
              setActiveIndex(0);
              editorRef.current?.focus();
            }}
          >
            <ComposerIcon name="attach" />
          </button>
          <button
            type="button"
            data-composer-setting
            data-composer-action="change-mode"
            aria-label={zh ? "执行模式：直接修改" : "Execution mode: Edit directly"}
          >
            <ComposerIcon name="mode" />
            <span data-setting-label>{zh ? "直接修改" : "Edit directly"}</span>
          </button>
          <button
            type="button"
            data-composer-setting
            data-composer-action="change-context"
            aria-label={zh ? "上下文：自动" : "Context: Auto"}
          >
            <ComposerIcon name="context" />
            <span data-setting-label>{zh ? "自动上下文" : "Auto context"}</span>
          </button>
          <button
            type="button"
            data-composer-setting
            data-composer-action="change-model"
            aria-label={zh ? "模型：A3S Reasoner" : "Model: A3S Reasoner"}
          >
            <span data-setting-label>A3S Reasoner</span>
            <ComposerIcon name="chevron" />
          </button>
        </div>
        <div data-composer-actions>
          {state === "streaming" && (
            <button
              type="button"
              className="btn"
              data-size="icon-sm"
              data-variant="outline"
              data-composer-action="stop"
              aria-label={zh ? "停止当前任务" : "Stop the current task"}
              onClick={() => {
                setState("ready");
                setStatus(zh ? "任务已停止，可以发送下一条指令。" : "Task stopped. The next instruction can be sent.");
              }}
            >
              <ComposerIcon name="stop" />
            </button>
          )}
          <button
            type="submit"
            className="btn"
            data-size="icon-sm"
            data-composer-action="submit"
            aria-label={state === "streaming" ? (zh ? "加入队列" : "Queue instruction") : (zh ? "发送指令" : "Send instruction")}
          >
            <ComposerIcon name={state === "streaming" ? "queue" : "send"} />
          </button>
        </div>
      </footer>

      <output data-composer-status aria-live="polite">{status}</output>

      <section data-composer-queue aria-label={zh ? "后续指令队列" : "Follow-up queue"}>
        <header>
          <strong>{zh ? `后续指令 · ${queue.length}` : `Follow-ups · ${queue.length}`}</strong>
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="ghost"
            data-composer-action="pause-queue"
          >
            {zh ? "暂停队列" : "Pause queue"}
          </button>
        </header>
        <ol>
          {queue.map((item, index) => (
            <li key={item.id} data-queue-id={item.id}>
              <span data-queue-position>{index + 1}</span>
              <span data-queue-message>{item.message}</span>
              <span>
                <button
                  type="button"
                  className="btn"
                  data-size="icon-xs"
                  data-variant="ghost"
                  data-composer-action="edit-queue-item"
                  aria-label={zh ? `编辑队列第 ${index + 1} 项` : `Edit queue item ${index + 1}`}
                >
                  <ComposerIcon name="edit" />
                </button>
                <button
                  type="button"
                  className="btn"
                  data-size="icon-xs"
                  data-variant="ghost"
                  data-composer-action="remove-queue-item"
                  aria-label={zh ? `移除队列第 ${index + 1} 项` : `Remove queue item ${index + 1}`}
                  onClick={() => setQueue((current) => current.filter((candidate) => candidate.id !== item.id))}
                >
                  <ComposerIcon name="close" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </form>
  );
}

function suggestionDetailZh(id: string) {
  const labels: Record<string, string> = {
    agents: "仓库说明 · 7.2 KB",
    runtime: "TypeScript · 已修改",
    tests: "TypeScript · 18 项测试",
    "ui-review": "交互与视觉质量审查",
    "browser-check": "浏览器工作流验收",
    "release-audit": "发布就绪检查",
    goal: "持续执行直到达成目标",
    review: "审查当前变更集",
    explain: "解释所选代码及其依赖",
  };
  return labels[id] || id;
}

function ComposerIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    attach: <><path d="m20.5 11.5-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9" /></>,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <><path d="m7 7 10 10" /><path d="M17 7 7 17" /></>,
    command: <><path d="m5 7 4 4-4 4" /><path d="M11 15h8" /></>,
    context: <><circle cx="12" cy="12" r="3" /><path d="M3 12h3m12 0h3M12 3v3m0 12v3" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8Z" /><path d="M14 2v6h6" /></>,
    mode: <><path d="M4 6h16M4 12h10M4 18h7" /><circle cx="17" cy="12" r="2" /></>,
    queue: <><path d="M5 6h14M5 12h9M5 18h6" /><path d="m16 16 3 2-3 2" /></>,
    selection: <><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" /><path d="M9 9h6v6H9z" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    skill: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="5" /></>,
    stop: <rect x="7" y="7" width="10" height="10" rx="1" />,
  };
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.command}
    </svg>
  );
}
