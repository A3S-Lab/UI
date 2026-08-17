import { useRef, useState, type FormEvent } from "react";
import {
  AgentComposerEditor,
  type AgentComposerEditorHandle,
} from "../../../../src/integrations/tiptap/react.js";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

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
  onSubmit?: (value: string) => void;
  placeholder?: string;
  showPermissions?: boolean;
  submitSuccessMessage?: string;
}) {
  const zh = locale === "zh";
  const editorRef = useRef<AgentComposerEditorHandle>(null);
  const workspaceMenuRef = useRef<HTMLDetailsElement>(null);
  const [draft, setDraft] = useState(initialValue);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [workspace, setWorkspace] = useState("");
  const workspaceOptions = [
    ["ui", zh ? "A3S UI 体验优化" : "A3S UI experience"],
    ["local", zh ? "本地工作空间" : "Local workspace"],
  ] as const;
  const workspaceLabel = workspaceOptions.find(
    ([value]) => value === workspace,
  )?.[1];

  const submit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!draft.trim()) {
      setStatus(
        zh ? "请先描述要完成的任务。" : "Describe the task before sending.",
      );
      editorRef.current?.focus();
      return;
    }
    if (onSubmit) {
      onSubmit(draft.trim());
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
        ? "任务已进入演示队列，输入内容已保留在本地。"
        : "Task added to the demo queue and kept locally.",
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
                defaultValue="ask"
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
            <select aria-label={zh ? "模型" : "Model"} defaultValue="auto">
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
                : zh
                  ? "开始语音输入"
                  : "Start voice input"
            }
            aria-pressed={listening}
            type="button"
            onClick={() => {
              setListening((value) => !value);
              setStatus(
                listening
                  ? zh
                    ? "语音输入已停止。"
                    : "Voice input stopped."
                  : zh
                    ? "语音输入演示已开启。"
                    : "Voice input demo started.",
              );
            }}
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
              defaultValue="ask"
              onChange={(event) => {
                const label = event.currentTarget.selectedOptions[0]?.text;
                setStatus(
                  zh
                    ? `权限已设为“${label}”。`
                    : `Permissions set to ${label}.`,
                );
              }}
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
