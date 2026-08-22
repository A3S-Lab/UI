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
  ProductComposerExecutionTargetControl,
  ProductComposerModeControl,
  ProductComposerRunSettings,
  ProductComposerWorkspaceControl,
  type ComposerControlKey,
  type ProductComposerExecutionTarget,
} from "./ProductComposerRunSettings";
import {
  ProductComposerSuggestions,
  type ProductComposerSuggestionKind,
  type ProductComposerSuggestionsHandle,
} from "./ProductComposerSuggestions";
import {
  ProductComposerResourcePicker,
  type ProductComposerResourcePickerKind,
} from "./ProductComposerResourcePicker";
import {
  type ProductComposerEffort,
  type ProductComposerModel,
  type ProductComposerResource,
  type ProductComposerWorkspace,
} from "./product-composer-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  productWorkspaceFileBatchLimit,
  productWorkspaceFileSizeLimit,
  queueProductWorkspaceFiles,
  removeProductWorkspaceFiles,
  retryProductWorkspaceFile,
  useProductWorkspaceFiles,
  type ProductWorkspaceFile,
  type ProductWorkspaceFileRejection,
} from "./product-workspace-files";
import { useProductComposerSpeech } from "./useProductComposerSpeech";

export type ProductComposerContext = {
  deepResearch: boolean;
  effort: ProductComposerEffort;
  executionTarget: ProductComposerExecutionTarget;
  mode: "agent" | "answer" | "plan";
  model: ProductComposerModel["id"];
  permissions: "ask" | "edit" | "read";
  resources: ProductComposerResource[];
  workspace: ProductComposerWorkspace;
};

const maxTaskLength = 8_000;

export function ProductComposer({
  busy = false,
  compact = false,
  contextual = false,
  docked = false,
  initialValue = "",
  initialResources = [],
  initialWorkspace = "",
  locale,
  onConfigureModels,
  onStop,
  onSubmit,
  placeholder,
  showExecutionTarget = false,
  showPermissions = true,
  submitSuccessMessage,
}: {
  busy?: boolean;
  compact?: boolean;
  contextual?: boolean;
  docked?: boolean;
  initialValue?: string;
  initialResources?: readonly ProductComposerResource[];
  initialWorkspace?: ProductComposerContext["workspace"];
  locale: ProductPlaygroundLocale;
  onConfigureModels?: () => void;
  onStop?: () => void;
  onSubmit?: (value: string, context: ProductComposerContext) => void;
  placeholder?: string;
  showExecutionTarget?: boolean;
  showPermissions?: boolean;
  submitSuccessMessage?: string;
}) {
  const zh = locale === "zh";
  const composerRef = useRef<HTMLFormElement>(null);
  const editorRef = useRef<AgentComposerEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentTriggerRef = useRef<HTMLButtonElement>(null);
  const suggestionsRef = useRef<ProductComposerSuggestionsHandle>(null);
  const dragDepthRef = useRef(0);
  const suggestionsId = useId().replaceAll(":", "");
  const [activeControl, setActiveControl] = useState<ComposerControlKey | null>(
    null,
  );
  const [activeSuggestionId, setActiveSuggestionId] = useState<string>();
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachmentSubmenu, setAttachmentSubmenu] = useState<
    "file" | "mode" | null
  >(null);
  const [deepResearch, setDeepResearch] = useState(false);
  const [draft, setDraft] = useState(initialValue);
  const [dropActive, setDropActive] = useState(false);
  const [focused, setFocused] = useState(false);
  const [effort, setEffort] = useState<ProductComposerEffort>("medium");
  const [executionTarget, setExecutionTarget] =
    useState<ProductComposerExecutionTarget>("local");
  const [manualSuggestionKind, setManualSuggestionKind] =
    useState<ProductComposerSuggestionKind | null>(null);
  const [localTransferIds, setLocalTransferIds] = useState<string[]>([]);
  const [mode, setMode] = useState<ProductComposerContext["mode"]>("agent");
  const [model, setModel] = useState<ProductComposerContext["model"]>("auto");
  const [permissions, setPermissions] =
    useState<ProductComposerContext["permissions"]>("ask");
  const [resources, setResources] = useState<ProductComposerResource[]>(() =>
    initialResources.map((resource) => ({ ...resource })),
  );
  const [resourcePickerKind, setResourcePickerKind] =
    useState<ProductComposerResourcePickerKind | null>(null);
  const [status, setStatus] = useState("");
  const [trigger, setTrigger] = useState<AgentComposerTrigger | null>(null);
  const [workspace, setWorkspace] =
    useState<ProductComposerContext["workspace"]>(initialWorkspace);
  const workspaceFiles = useProductWorkspaceFiles();
  const localTransfers = localTransferIds.flatMap((id) => {
    const record = workspaceFiles.find((item) => item.id === id);
    return record ? [record] : [];
  });
  const menuKind = trigger?.kind ?? manualSuggestionKind;
  const engaged =
    !docked ||
    focused ||
    busy ||
    Boolean(draft.trim()) ||
    resources.length > 0 ||
    localTransfers.length > 0 ||
    Boolean(
      activeControl ||
      attachmentMenuOpen ||
      attachmentSubmenu ||
      resourcePickerKind ||
      menuKind ||
      dropActive,
    );
  const { listening, speechSupported, toggleSpeechInput } =
    useProductComposerSpeech({
      editorRef,
      locale,
      setStatus,
    });

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!composerRef.current?.contains(target)) {
        setActiveControl(null);
        setAttachmentMenuOpen(false);
        setAttachmentSubmenu(null);
        setResourcePickerKind(null);
        if (menuKind) closeSuggestions();
        return;
      }
      if (attachmentMenuOpen && !target.closest("[data-composer-attachment]")) {
        setAttachmentMenuOpen(false);
        setAttachmentSubmenu(null);
      }
      if (resourcePickerKind && !target.closest("[data-composer-attachment]")) {
        setResourcePickerKind(null);
      }
      if (activeControl && !target.closest("[data-composer-control]")) {
        setActiveControl(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeControl, attachmentMenuOpen, menuKind, resourcePickerKind]);

  const closeSuggestions = () => {
    setManualSuggestionKind(null);
    setTrigger(null);
    setActiveSuggestionId(undefined);
  };

  const closeAttachmentLayers = () => {
    setAttachmentMenuOpen(false);
    setAttachmentSubmenu(null);
  };

  const addResource = (resource: ProductComposerResource) => {
    setResources((current) =>
      current.some((item) => item.id === resource.id)
        ? current
        : [...current, resource],
    );
  };

  const addLocalFiles = (files: readonly File[]) => {
    if (files.length === 0) return;
    const batch = queueProductWorkspaceFiles(files, { workspace });
    setLocalTransferIds((current) => [
      ...new Set([...current, ...batch.records.map((record) => record.id)]),
    ]);
    if (batch.records.length > 0) {
      setStatus(
        zh
          ? `正在将 ${batch.records.length} 个文件复制到工作区…`
          : `Copying ${batch.records.length} file${batch.records.length === 1 ? "" : "s"} into the workspace…`,
      );
    }
    if (batch.rejected.length > 0) {
      setStatus(formatWorkspaceFileRejections(batch.rejected, locale));
    }
    void batch.completion.catch(() => {
      // Removing a pending transfer intentionally cancels its completion.
    });
  };

  useEffect(() => {
    const completed = localTransfers.filter(
      (record) => record.state === "ready",
    );
    if (completed.length === 0) return;
    setResources((current) => {
      const ids = new Set(current.map((resource) => resource.id));
      const additions = completed
        .map((record) => workspaceFileResource(record, locale))
        .filter((resource) => !ids.has(resource.id));
      return additions.length > 0 ? [...current, ...additions] : current;
    });
    const completedIds = new Set(completed.map((record) => record.id));
    setLocalTransferIds((current) =>
      current.filter((id) => !completedIds.has(id)),
    );
    setStatus(
      zh
        ? `${completed.length} 个文件已复制到工作区并加入任务上下文。`
        : `${completed.length} file${completed.length === 1 ? "" : "s"} copied to the workspace and attached to this task.`,
    );
  }, [localTransfers, locale, zh]);

  const selectFile = (resource: ProductComposerResource) => {
    if (trigger?.kind === "file") editorRef.current?.replaceTrigger(trigger);
    addResource(resource);
    closeSuggestions();
    setStatus(
      zh
        ? `已将“${resource.label}”加入任务上下文。`
        : `${resource.label} added to task context.`,
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
    if (trigger?.kind === "command")
      editorRef.current?.replaceTrigger(trigger, `/${id} `);
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
      suggestionsRef.current?.moveToEdge(
        event.key === "Home" ? "start" : "end",
      );
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

  const submit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (localTransfers.length > 0) {
      const failed = localTransfers.some((record) => record.state === "error");
      setStatus(
        failed
          ? zh
            ? "有文件未能进入工作区，请重试或移除后再发送。"
            : "A file could not enter the workspace. Retry or remove it before sending."
          : zh
            ? "文件仍在复制到工作区，请完成后再发送。"
            : "Files are still being copied into the workspace. Send after they finish.",
      );
      return;
    }
    const normalizedDraft = draft.trim();
    if (!normalizedDraft) {
      setStatus(
        zh ? "请先描述要完成的任务。" : "Describe the task before sending.",
      );
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
      executionTarget,
      mode,
      model,
      permissions,
      resources,
      workspace,
    });
    setDraft("");
    setResources([]);
    setStatus(
      submitSuccessMessage ??
        (zh
          ? "消息已添加到当前会话。"
          : "Message added to the current session."),
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
    addLocalFiles(dropped);
  };

  return (
    <form
      aria-label={zh ? "任务输入" : "Task composer"}
      className="agent-composer product-composer"
      data-compact={compact ? "true" : undefined}
      data-contextual={contextual ? "true" : undefined}
      data-docked={docked ? "true" : undefined}
      data-engaged={engaged ? "true" : "false"}
      data-layout={compact ? "compact" : "default"}
      data-task-mode={mode}
      data-state={busy ? "busy" : "ready"}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        ) {
          return;
        }
        setFocused(false);
      }}
      onFocusCapture={() => setFocused(true)}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={handleDrop}
      onSubmit={submit}
      ref={composerRef}
    >
      {resources.length > 0 || localTransfers.length > 0 ? (
        <ul
          aria-label={zh ? "已添加的任务资源" : "Attached task resources"}
          data-composer-resources
        >
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
                    ? "checklist"
                    : resource.kind === "assistant"
                      ? "assistant"
                      : resource.kind === "connector"
                        ? "link"
                        : resource.kind === "folder"
                          ? "folder"
                          : "document"
                }
              />
              <span data-resource-label>{resource.label}</span>
              {resource.meta ? <small>{resource.meta}</small> : null}
              <button
                aria-label={
                  zh ? `移除 ${resource.label}` : `Remove ${resource.label}`
                }
                data-composer-action="remove-resource"
                onClick={() =>
                  setResources((current) =>
                    current.filter((item) => item.id !== resource.id),
                  )
                }
                type="button"
              >
                <ProductPlaygroundIcon name="close" />
              </button>
            </li>
          ))}
          {localTransfers.map((record) => (
            <li
              data-resource-id={`workspace:${record.id}`}
              data-resource-kind="file"
              data-resource-state={record.state}
              key={record.id}
              title={
                record.state === "error"
                  ? zh
                    ? "无法读取此文件"
                    : "This file could not be read"
                  : zh
                    ? "正在复制到工作区"
                    : "Copying into the workspace"
              }
            >
              <ProductPlaygroundIcon
                name={record.state === "error" ? "warning" : "refresh"}
              />
              <span data-resource-label>{record.name}</span>
              <small>
                {record.state === "error"
                  ? zh
                    ? "导入失败"
                    : "Import failed"
                  : zh
                    ? "正在复制…"
                    : "Copying…"}
              </small>
              {record.state === "error" ? (
                <button
                  aria-label={
                    zh ? `重试 ${record.name}` : `Retry ${record.name}`
                  }
                  data-composer-action="retry-resource"
                  onClick={() => {
                    setStatus(
                      zh ? "正在重试文件导入…" : "Retrying file import…",
                    );
                    void retryProductWorkspaceFile(record.id);
                  }}
                  type="button"
                >
                  <ProductPlaygroundIcon name="refresh" />
                </button>
              ) : null}
              <button
                aria-label={
                  zh ? `取消 ${record.name}` : `Cancel ${record.name}`
                }
                data-composer-action="remove-resource"
                onClick={() => {
                  removeProductWorkspaceFiles([record.id]);
                  setLocalTransferIds((current) =>
                    current.filter((id) => id !== record.id),
                  );
                  setStatus(zh ? "已取消文件导入。" : "File import cancelled.");
                }}
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
            setActiveControl(null);
            setManualSuggestionKind(null);
          }
        }}
        placeholder={
          placeholder ??
          (zh
            ? "今天想完成什么？@ 引用工作区文件，$ 使用技能，/ 调用指令…"
            : "What would you like to accomplish? Use @ for files, $ for skills, or / for commands…")
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
          onClose={() => {
            closeSuggestions();
            editorRef.current?.focus();
          }}
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
          <div data-composer-attachment>
            <button
              aria-expanded={attachmentMenuOpen}
              aria-haspopup="menu"
              aria-label={zh ? "添加任务上下文" : "Add task context"}
              data-composer-attachment-trigger
              onClick={() => {
                setActiveControl(null);
                closeSuggestions();
                setResourcePickerKind(null);
                setAttachmentMenuOpen((open) => {
                  if (open) setAttachmentSubmenu(null);
                  return !open;
                });
              }}
              ref={attachmentTriggerRef}
              type="button"
            >
              <ProductPlaygroundIcon
                name={attachmentMenuOpen ? "close" : "plus"}
              />
            </button>
            <input
              hidden
              multiple
              onChange={(event) => {
                addLocalFiles(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = "";
                closeAttachmentLayers();
              }}
              ref={fileInputRef}
              type="file"
            />
            {attachmentMenuOpen ? (
              <section
                aria-label={zh ? "添加任务上下文" : "Add task context"}
                data-composer-attachment-menu
                role="menu"
              >
                <button
                  aria-expanded={attachmentSubmenu === "file"}
                  onClick={() =>
                    setAttachmentSubmenu((current) =>
                      current === "file" ? null : "file",
                    )
                  }
                  role="menuitem"
                  type="button"
                >
                  <ProductPlaygroundIcon name="files" />
                  <span>{zh ? "添加文件" : "Add files"}</span>
                  <ProductPlaygroundIcon name="chevron" />
                </button>
                <button
                  aria-expanded={attachmentSubmenu === "mode"}
                  onClick={() =>
                    setAttachmentSubmenu((current) =>
                      current === "mode" ? null : "mode",
                    )
                  }
                  role="menuitem"
                  type="button"
                >
                  <ProductPlaygroundIcon name="automation" />
                  <span>{zh ? "模式" : "Mode"}</span>
                  <ProductPlaygroundIcon name="chevron" />
                </button>
                <button
                  onClick={() => {
                    closeAttachmentLayers();
                    setResourcePickerKind("assistant");
                  }}
                  role="menuitem"
                  type="button"
                >
                  <ProductPlaygroundIcon name="assistant" />
                  <span>{zh ? "专家" : "Assistants"}</span>
                  <ProductPlaygroundIcon name="chevron" />
                </button>
                <button
                  onClick={() => {
                    closeAttachmentLayers();
                    editorRef.current?.focus();
                    setManualSuggestionKind("skill");
                  }}
                  role="menuitem"
                  type="button"
                >
                  <ProductPlaygroundIcon name="checklist" />
                  <span>{zh ? "技能" : "Skills"}</span>
                  <kbd>$</kbd>
                </button>
                <button
                  onClick={() => {
                    closeAttachmentLayers();
                    setResourcePickerKind("connector");
                  }}
                  role="menuitem"
                  type="button"
                >
                  <ProductPlaygroundIcon name="link" />
                  <span>{zh ? "连接器" : "Connectors"}</span>
                  <ProductPlaygroundIcon name="chevron" />
                </button>
              </section>
            ) : null}
            {attachmentMenuOpen && attachmentSubmenu === "file" ? (
              <section
                aria-label={zh ? "选择文件来源" : "Choose a file source"}
                data-composer-attachment-submenu="file"
                role="menu"
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  role="menuitem"
                  type="button"
                >
                  <ProductPlaygroundIcon name="upload" />
                  <span>{zh ? "本地文件" : "Local files"}</span>
                </button>
                <button
                  onClick={() => {
                    closeAttachmentLayers();
                    editorRef.current?.focus();
                    setManualSuggestionKind("file");
                  }}
                  role="menuitem"
                  type="button"
                >
                  <ProductPlaygroundIcon name="folder" />
                  <span>{zh ? "工作区文件" : "Workspace files"}</span>
                  <kbd>@</kbd>
                </button>
                <button
                  onClick={() => {
                    addResource({
                      id: "artifact:release-readiness",
                      kind: "file",
                      label: "release-readiness.md",
                      meta: zh ? "任务成果 · 12 KB" : "Task artifact · 12 KB",
                    });
                    closeAttachmentLayers();
                    setStatus(
                      zh
                        ? "已引用最近的任务成果。"
                        : "The latest task artifact was attached.",
                    );
                  }}
                  role="menuitem"
                  type="button"
                >
                  <ProductPlaygroundIcon name="document" />
                  <span>{zh ? "任务成果" : "Task artifacts"}</span>
                </button>
                <button
                  onClick={() => {
                    addResource({
                      id: "knowledge:a3s-ui-design",
                      kind: "selection",
                      label: zh ? "A3S UI 设计系统" : "A3S UI design system",
                      meta: zh
                        ? "知识库 · 1,428 个概念"
                        : "Knowledge · 1,428 concepts",
                    });
                    closeAttachmentLayers();
                    setStatus(
                      zh
                        ? "知识库已加入任务上下文。"
                        : "The knowledge base was added to task context.",
                    );
                  }}
                  role="menuitem"
                  type="button"
                >
                  <ProductPlaygroundIcon name="knowledge" />
                  <span>{zh ? "知识库" : "Knowledge base"}</span>
                </button>
              </section>
            ) : null}
            {attachmentMenuOpen && attachmentSubmenu === "mode" ? (
              <section
                aria-label={zh ? "选择任务模式" : "Choose task mode"}
                data-composer-attachment-submenu="mode"
                role="menu"
              >
                <p>
                  {mode === "agent"
                    ? zh
                      ? "当前为默认模式，可高效执行并完成任务。"
                      : "Default mode can plan and complete the task efficiently."
                    : mode === "plan"
                      ? zh
                        ? "仅制定可执行计划，不修改工作区。"
                        : "Creates an actionable plan without changing the workspace."
                      : zh
                        ? "直接回答问题，不运行工具或修改文件。"
                        : "Answers directly without tools or file changes."}
                </p>
                <button
                  aria-checked={mode === "plan"}
                  onClick={() => {
                    setMode((current) =>
                      current === "plan" ? "agent" : "plan",
                    );
                    setStatus(zh ? "任务模式已更新。" : "Task mode updated.");
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  <ProductPlaygroundIcon name="checklist" />
                  <span>
                    <strong>{zh ? "计划" : "Plan"}</strong>
                    <small>Plan</small>
                  </span>
                  <i aria-hidden="true" />
                </button>
                <button
                  aria-checked={mode === "answer"}
                  onClick={() => {
                    setMode((current) =>
                      current === "answer" ? "agent" : "answer",
                    );
                    setStatus(zh ? "任务模式已更新。" : "Task mode updated.");
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  <ProductPlaygroundIcon name="document" />
                  <span>
                    <strong>{zh ? "仅回答" : "Answer only"}</strong>
                    <small>Ask</small>
                  </span>
                  <i aria-hidden="true" />
                </button>
              </section>
            ) : null}
            {resourcePickerKind ? (
              <ProductComposerResourcePicker
                kind={resourcePickerKind}
                locale={locale}
                onClose={() => {
                  setResourcePickerKind(null);
                  window.requestAnimationFrame(() =>
                    attachmentTriggerRef.current?.focus(),
                  );
                }}
                onSelect={(resource) => {
                  addResource(resource);
                  setResourcePickerKind(null);
                  setStatus(
                    zh
                      ? `已将“${resource.label}”加入任务上下文。`
                      : `${resource.label} added to task context.`,
                  );
                  editorRef.current?.focus();
                }}
                selectedIds={new Set(resources.map((resource) => resource.id))}
              />
            ) : null}
          </div>
          {!contextual && showPermissions ? (
            <ProductComposerModeControl
              activeControl={activeControl}
              locale={locale}
              onActiveControlChange={setActiveControl}
              onPermissionsChange={(next) => {
                setPermissions(next);
                setStatus(
                  zh ? "权限边界已更新。" : "Permission boundary updated.",
                );
              }}
              permissions={permissions}
            />
          ) : null}
        </div>
        <div data-composer-actions>
          <ProductComposerRunSettings
            activeControl={activeControl}
            deepResearch={deepResearch}
            effort={effort}
            locale={locale}
            model={model}
            onActiveControlChange={setActiveControl}
            onConfigure={() => {
              setActiveControl(null);
              if (onConfigureModels) {
                onConfigureModels();
                return;
              }
              setStatus(
                zh
                  ? "可在设置中管理模型提供方、凭据与默认模型。"
                  : "Manage model providers, credentials, and defaults in Settings.",
              );
            }}
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
            onEffortChange={(next) => {
              setEffort(next);
              setStatus(zh ? "努力程度已更新。" : "Effort updated.");
            }}
            onModelChange={(next) => {
              setModel(next);
              setStatus(zh ? "模型设置已更新。" : "Model setting updated.");
            }}
          />
          {busy ? (
            <span aria-live="polite" data-composer-running>
              <i />
              {zh ? "执行中" : "Running"}
            </span>
          ) : null}
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
            data-composer-action="voice"
            disabled={!speechSupported || busy}
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
            aria-label={
              busy
                ? zh
                  ? "停止任务"
                  : "Stop task"
                : zh
                  ? "发送任务"
                  : "Send task"
            }
            data-busy={busy ? "true" : undefined}
            data-composer-action="submit"
            data-primary
            disabled={busy ? !onStop : !draft.trim()}
            onClick={
              busy
                ? () => {
                    onStop?.();
                    setStatus(
                      zh
                        ? "当前执行已停止，后续指令队列保持暂停。"
                        : "The current run stopped. Follow-up instructions remain paused.",
                    );
                  }
                : undefined
            }
            type={busy ? "button" : "submit"}
          >
            <ProductPlaygroundIcon name={busy ? "stop" : "up"} />
          </button>
        </div>
      </footer>

      {contextual ? (
        <section
          aria-label={zh ? "任务边界" : "Task boundary"}
          data-composer-context-bar
        >
          {showExecutionTarget ? (
            <div data-context-target>
              <ProductComposerExecutionTargetControl
                activeControl={activeControl}
                executionTarget={executionTarget}
                locale={locale}
                onActiveControlChange={setActiveControl}
                onExecutionTargetChange={(next) => {
                  setExecutionTarget(next);
                  setStatus(
                    zh ? "执行位置已更新。" : "Execution target updated.",
                  );
                }}
              />
            </div>
          ) : null}
          <div data-context-workspace>
            <ProductComposerWorkspaceControl
              activeControl={activeControl}
              locale={locale}
              onActiveControlChange={setActiveControl}
              onWorkspaceChange={(next) => {
                setWorkspace(next);
                setStatus(zh ? "工作区已更新。" : "Workspace updated.");
              }}
              workspace={workspace}
            />
          </div>
          {showPermissions ? (
            <div data-context-permissions>
              <ProductComposerModeControl
                activeControl={activeControl}
                locale={locale}
                onActiveControlChange={setActiveControl}
                onPermissionsChange={(next) => {
                  setPermissions(next);
                  setStatus(
                    zh ? "权限边界已更新。" : "Permission boundary updated.",
                  );
                }}
                permissions={permissions}
              />
            </div>
          ) : null}
        </section>
      ) : null}
      <output aria-live="polite" data-composer-status>
        {status}
      </output>
      {dropActive ? (
        <div data-composer-dropzone>
          <span>
            <ProductPlaygroundIcon name="upload" />
          </span>
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

function workspaceFileResource(
  record: ProductWorkspaceFile,
  locale: ProductPlaygroundLocale,
): ProductComposerResource {
  const workspaceLabels = {
    local: locale === "zh" ? "本地工作区" : "Local workspace",
    root: "a3s",
    ui: "a3s-ui",
  } as const;
  return {
    id: `workspace:${record.id}`,
    kind: "file",
    label: record.name,
    meta: `${workspaceLabels[record.workspace]} · ${formatFileSize(record.file.size, locale)}`,
    workspaceFileId: record.id,
  };
}

function formatWorkspaceFileRejections(
  rejected: readonly ProductWorkspaceFileRejection[],
  locale: ProductPlaygroundLocale,
) {
  const first = rejected[0];
  if (!first) return "";
  if (first.code === "file-too-large") {
    const limit = formatFileSize(productWorkspaceFileSizeLimit, locale);
    return locale === "zh"
      ? `“${first.file.name}”超过 ${limit}，未复制到工作区。`
      : `“${first.file.name}” exceeds ${limit} and was not copied into the workspace.`;
  }
  return locale === "zh"
    ? `每次最多导入 ${productWorkspaceFileBatchLimit} 个文件，其余文件未处理。`
    : `Import up to ${productWorkspaceFileBatchLimit} files at a time. The remaining files were not processed.`;
}
