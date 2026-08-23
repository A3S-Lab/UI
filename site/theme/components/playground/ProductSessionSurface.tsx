import { Link } from "@rspress/core/theme";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ProductComposer,
  type ProductComposerContext,
} from "./ProductComposer";
import { ProductFollowUpQueue } from "./ProductFollowUpQueue";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import { ProductSessionExecution } from "./ProductSessionExecution";
import {
  ProductSessionInspector,
  type ProductSessionInspectorTab,
} from "./ProductSessionInspector";
import { ProductSessionMessageActions } from "./ProductSessionMessageActions";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  seededSessionArtifacts,
  seededSessionCopy,
  seededSessionTitle,
} from "./product-session-seeded-data";
import {
  formatProductTaskTitle,
  getProductTaskArtifacts,
  getProductTaskContextDetails,
  getProductTaskConversation,
  getProductTaskFollowUpReply,
  type ProductTaskSession,
} from "./product-task-session-state";

export function ProductSessionSurface({
  locale,
  onOpenModelSettings,
  onFollowUp,
  onMoveQueuedFollowUp,
  onPauseQueue,
  onRemoveQueuedFollowUp,
  onResumeQueue,
  onRunNextQueuedFollowUp,
  onUpdateQueuedFollowUp,
  persistenceStatus = "saved",
  startHref,
  taskSession = null,
  taskSessionReady = true,
  variant = "seeded",
}: {
  locale: ProductPlaygroundLocale;
  onOpenModelSettings?: () => void;
  onFollowUp?: (message: string, context: ProductComposerContext) => void;
  onMoveQueuedFollowUp?: (id: string, offset: -1 | 1) => void;
  onPauseQueue?: () => void;
  onRemoveQueuedFollowUp?: (id: string) => void;
  onResumeQueue?: () => void;
  onRunNextQueuedFollowUp?: () => void;
  onUpdateQueuedFollowUp?: (id: string, message: string) => void;
  persistenceStatus?: "memory" | "saved";
  startHref?: string;
  taskSession?: ProductTaskSession | null;
  taskSessionReady?: boolean;
  variant?: "created" | "seeded";
}) {
  const zh = locale === "zh";
  const created = variant === "created";
  const copy =
    created && taskSession
      ? getProductTaskConversation(taskSession, locale, persistenceStatus)
      : seededSessionCopy[locale];
  const artifacts =
    created && taskSession
      ? getProductTaskArtifacts(taskSession, locale)
      : seededSessionArtifacts;
  const contextDetails =
    created && taskSession
      ? getProductTaskContextDetails(taskSession, locale)
      : null;
  const title =
    created && taskSession
      ? formatProductTaskTitle(taskSession.prompt, locale)
      : seededSessionTitle[locale];
  const followUpReply = getProductTaskFollowUpReply(locale);
  const [seededFollowUps, setSeededFollowUps] = useState<string[]>([]);
  const followUps = created ? (taskSession?.followUps ?? []) : seededFollowUps;
  const queuedFollowUps = created ? (taskSession?.queuedFollowUps ?? []) : [];
  const messageAttachments = created
    ? (taskSession?.context.resources ?? []).filter((resource) =>
        ["file", "folder", "selection"].includes(resource.kind),
      )
    : [
        {
          id: "seeded-session-source",
          kind: "file" as const,
          label: "src/auth/session.ts",
          meta: zh ? "TypeScript · 会话恢复" : "TypeScript · Session recovery",
        },
      ];
  const suggestedFollowUps = zh
    ? ["检查移动端焦点恢复", "说明剩余风险", "打开完整测试证据"]
    : [
        "Check mobile focus recovery",
        "Explain the remaining risks",
        "Open the complete test evidence",
      ];
  const [running, setRunning] = useState(created);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorOverlay, setInspectorOverlay] = useState(false);
  const [inspectorTab, setInspectorTab] =
    useState<ProductSessionInspectorTab>("overview");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const inspectorCloseRef = useRef<HTMLButtonElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const inspectorReturnFocusRef = useRef<HTMLElement | null>(null);
  const inspectorTriggerRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (created && taskSession?.id) setRunning(true);
  }, [created, taskSession?.id]);

  useEffect(() => {
    if (followUps.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollTo({ top: viewport.scrollHeight });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [followUps.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 68rem)");
    const update = () => {
      setInspectorOverlay(mediaQuery.matches);
      if (mediaQuery.matches) setInspectorOpen(false);
    };
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const closeInspector = useCallback(() => {
    const returnFocus =
      inspectorReturnFocusRef.current ?? inspectorTriggerRef.current;
    setInspectorOpen(false);
    returnFocus?.focus();
  }, []);

  const openInspector = useCallback(
    (tab: ProductSessionInspectorTab, returnFocus?: HTMLElement | null) => {
      inspectorReturnFocusRef.current =
        returnFocus ?? inspectorTriggerRef.current;
      setInspectorTab(tab);
      setInspectorOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (!inspectorOpen) return undefined;
    if (inspectorOverlay) inspectorCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeInspector();
        return;
      }
      if (!inspectorOverlay || event.key !== "Tab") return;
      const controls = [
        ...(inspectorRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input:not(:disabled)",
        ) ?? []),
      ].filter((control) => control.getClientRects().length > 0);
      const first = controls.at(0);
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeInspector, inspectorOpen, inspectorOverlay]);

  const matchCount = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return 0;
    const messages = [
      ...copy,
      ...followUps.flatMap((message) => [message, followUpReply]),
      ...queuedFollowUps.map((item) => item.content),
    ];
    return messages.reduce((count, value) => {
      const matches = value
        .toLocaleLowerCase(locale)
        .split(normalizedQuery).length;
      return count + Math.max(0, matches - 1);
    }, 0);
  }, [copy, followUpReply, followUps, locale, query, queuedFollowUps]);

  const shareSession = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus(zh ? "会话链接已复制" : "Session link copied");
    } catch {
      setShareStatus(zh ? "无法复制链接" : "Unable to copy link");
    }
  };

  if (created && !taskSessionReady) {
    return (
      <section
        aria-busy="true"
        className="task-workspace product-session"
        data-product-surface="session"
        data-session-state="loading"
        data-state="waiting"
      >
        <header className="product-session__header">
          <h1>{zh ? "正在恢复任务" : "Restoring task"}</h1>
        </header>
        <div
          aria-labelledby="product-session-loading-title"
          className="product-session__state"
        >
          <span aria-hidden="true" data-state-indicator />
          <h2 id="product-session-loading-title">
            {zh ? "正在读取会话" : "Loading conversation"}
          </h2>
          <p>
            {zh
              ? "任务内容与最近进度将在此浏览器中恢复。"
              : "The task and its latest progress are being restored from this browser."}
          </p>
        </div>
      </section>
    );
  }

  if (created && !taskSession) {
    return (
      <section
        className="task-workspace product-session"
        data-product-surface="session"
        data-session-state="missing"
        data-state="error"
      >
        <header className="product-session__header">
          <h1>{zh ? "当前任务" : "Current task"}</h1>
        </header>
        <div className="product-session__state" role="status">
          <span aria-hidden="true">
            <ProductPlaygroundIcon name="task-add" />
          </span>
          <h2>{zh ? "没有可恢复的任务" : "No task to restore"}</h2>
          <p>
            {zh
              ? "此地址会打开最近创建的任务。请先新建任务，再从最近任务中返回。"
              : "This address opens the most recently created task. Create a task first, then return from Recent tasks."}
          </p>
          {startHref ? (
            <Link href={startHref}>{zh ? "新建任务" : "Create a task"}</Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className="task-workspace product-session"
      data-inspector={inspectorOpen ? "open" : "hidden"}
      data-inspector-open={inspectorOpen ? "true" : undefined}
      data-product-surface="session"
      data-search-open={searchOpen ? "true" : undefined}
      data-session-state="ready"
      data-state={created && running ? "streaming" : "complete"}
      data-task-workspace-controlled="true"
      data-variant={variant}
    >
      <header className="product-session__header">
        <div className="product-session__heading">
          <h1>{title}</h1>
          <small>
            <i
              data-state={
                created ? (running ? "active" : "stopped") : "complete"
              }
            />
            {created
              ? running
                ? zh
                  ? "正在执行"
                  : "In progress"
                : zh
                  ? "已停止"
                  : "Stopped"
              : zh
                ? "已完成"
                : "Completed"}
          </small>
        </div>
        <div className="product-session__actions">
          <button
            aria-expanded={searchOpen}
            aria-label={zh ? "在会话中搜索" : "Search conversation"}
            data-active={searchOpen ? "true" : undefined}
            onClick={() => setSearchOpen((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="search" />
          </button>
          <button
            aria-label={zh ? "分享会话" : "Share session"}
            onClick={shareSession}
            type="button"
          >
            <ProductPlaygroundIcon name="share" />
          </button>
          <button
            aria-controls="product-session-details"
            aria-expanded={inspectorOpen}
            aria-label={
              inspectorOpen
                ? zh
                  ? "关闭任务详情"
                  : "Close task details"
                : zh
                  ? "打开任务详情"
                  : "Open task details"
            }
            data-active={inspectorOpen ? "true" : undefined}
            data-task-inspector-trigger
            onClick={(event) =>
              inspectorOpen
                ? closeInspector()
                : openInspector("overview", event.currentTarget)
            }
            ref={inspectorTriggerRef}
            type="button"
          >
            <ProductPlaygroundIcon name="collapse" />
          </button>
          <output aria-live="polite">{shareStatus}</output>
        </div>
      </header>

      {searchOpen ? (
        <form
          className="product-session__search"
          data-focus-owner="container"
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "搜索当前会话" : "Search this conversation"}
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            placeholder={zh ? "搜索当前会话" : "Search this conversation"}
            type="search"
            value={query}
          />
          <output aria-live="polite">
            {query.trim()
              ? zh
                ? `${matchCount} 个结果`
                : `${matchCount} ${matchCount === 1 ? "result" : "results"}`
              : zh
                ? "输入关键词"
                : "Enter a keyword"}
          </output>
          <button
            aria-label={zh ? "关闭会话搜索" : "Close conversation search"}
            onClick={() => {
              setSearchOpen(false);
              setQuery("");
            }}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        </form>
      ) : null}

      <div
        className="agent-transcript product-session__viewport"
        data-state={created && running ? "streaming" : "complete"}
        ref={viewportRef}
      >
        <ol
          aria-label={zh ? "会话记录" : "Conversation history"}
          data-transcript-viewport
        >
          <li data-role="user">
            <article>
              <div data-message-content>
                <p>{copy[0]}</p>
              </div>
              {messageAttachments.length > 0 ? (
                <div className="product-session__attachments">
                  {messageAttachments.map((attachment) => (
                    <article
                      className="message-attachment"
                      data-state="complete"
                      key={attachment.id}
                    >
                      <figure aria-hidden="true">
                        <ProductPlaygroundIcon
                          name={attachment.kind === "folder" ? "folder" : "document"}
                        />
                      </figure>
                      <span data-attachment-identity>
                        <strong>{attachment.label}</strong>
                        <small data-attachment-meta>
                          {attachment.meta ??
                            (zh ? "已加入任务上下文" : "Attached to task context")}
                        </small>
                      </span>
                      <button
                        aria-label={
                          zh
                            ? `在任务详情中查看 ${attachment.label}`
                            : `View ${attachment.label} in task details`
                        }
                        onClick={(event) =>
                          openInspector("files", event.currentTarget)
                        }
                        type="button"
                      >
                        <ProductPlaygroundIcon name="arrow" />
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </article>
          </li>
          <li data-role="assistant">
            <article>
              <header>
                <span>
                  <ProductPlaygroundIcon name="assistant" />
                  <strong>A3S</strong>
                </span>
                <output
                  className="message-status"
                  data-state={created && running ? "streaming" : "sent"}
                >
                  <i aria-hidden="true" data-message-status-indicator />
                  <span data-message-status-label>
                    {created && running
                      ? zh
                        ? "执行中"
                        : "Running"
                      : zh
                        ? "已完成"
                        : "Complete"}
                  </span>
                  <time data-message-status-meta>
                    {created ? (zh ? "刚刚" : "Now") : "2m 18s"}
                  </time>
                </output>
              </header>
              <div className="product-session__response">
                <p>{copy[1]}</p>
                <ProductSessionExecution
                  contextDetails={contextDetails}
                  created={created}
                  locale={locale}
                  onOpenInspector={openInspector}
                />
                <p data-conclusion>
                  {created ? `${copy[2]} ${copy[3]}` : copy[3]}
                </p>
                <nav
                  aria-label={zh ? "回复来源" : "Response sources"}
                  className="product-session__citations"
                >
                  <a
                    className="message-citation"
                    data-state="ready"
                    href="#product-session-details-files"
                    onClick={(event) => {
                      event.preventDefault();
                      openInspector("files", event.currentTarget);
                    }}
                  >
                    <span data-citation-index>1</span>
                    <span data-citation-title>src/auth/session.ts</span>
                    <small data-citation-source>
                      {zh ? "工作区变更" : "Workspace change"}
                    </small>
                  </a>
                  <a
                    className="message-citation"
                    data-state="ready"
                    href="#product-session-details-artifacts"
                    onClick={(event) => {
                      event.preventDefault();
                      openInspector("artifacts", event.currentTarget);
                    }}
                  >
                    <span data-citation-index>2</span>
                    <span data-citation-title>tests/session.test.ts</span>
                    <small data-citation-source>
                      {zh ? "回归证据" : "Regression evidence"}
                    </small>
                  </a>
                </nav>
                <nav
                  aria-label={zh ? "建议的后续操作" : "Suggested follow-up actions"}
                  className="follow-up-suggestions product-session__suggestions"
                  data-state="ready"
                >
                  <strong>{zh ? "继续处理" : "Continue"}</strong>
                  <ul>
                    {suggestedFollowUps.map((suggestion) => (
                      <li key={suggestion}>
                        <button
                          onClick={() => {
                            if (created && taskSession && onFollowUp) {
                              onFollowUp(suggestion, taskSession.context);
                            } else {
                              setSeededFollowUps((current) => [
                                ...current,
                                suggestion,
                              ]);
                            }
                          }}
                          type="button"
                        >
                          {suggestion}
                          <ProductPlaygroundIcon name="arrow" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
              <ProductSessionMessageActions
                exportContent={[...copy, ...followUps]}
                locale={locale}
                onOpenArtifacts={(returnFocus) =>
                  openInspector("artifacts", returnFocus)
                }
                responseText={copy.slice(1).join("\n\n")}
                title={title}
              />
            </article>
          </li>
          {followUps.map((message, index) => (
            <Fragment key={`${message}-${index}`}>
              <li data-role="user">
                <article>
                  <p>{message}</p>
                </article>
              </li>
              <li data-follow-up-reply data-role="assistant">
                <article>
                  <header>
                    <span>
                      <ProductPlaygroundIcon name="assistant" />
                      <strong>A3S</strong>
                    </span>
                    <output className="message-status" data-state="sent">
                      <i aria-hidden="true" data-message-status-indicator />
                      <span data-message-status-label>
                        {zh ? "已发送" : "Sent"}
                      </span>
                      <time data-message-status-meta>{zh ? "刚刚" : "Now"}</time>
                    </output>
                  </header>
                  <div className="product-session__response">
                    <p>{followUpReply}</p>
                  </div>
                </article>
              </li>
            </Fragment>
          ))}
        </ol>
      </div>

      <footer className="product-session__composer">
        {created && queuedFollowUps.length > 0 ? (
          <ProductFollowUpQueue
            items={queuedFollowUps}
            locale={locale}
            onMove={(id, offset) => onMoveQueuedFollowUp?.(id, offset)}
            onPause={() => onPauseQueue?.()}
            onRemove={(id) => onRemoveQueuedFollowUp?.(id)}
            onResume={() => onResumeQueue?.()}
            onRunNext={() => {
              onRunNextQueuedFollowUp?.();
              setRunning(true);
            }}
            onUpdate={(id, message) => onUpdateQueuedFollowUp?.(id, message)}
            paused={taskSession?.queuePaused ?? false}
            running={running}
          />
        ) : null}
        <ProductComposer
          busy={created && running}
          compact
          contextual
          initialWorkspace={
            created ? taskSession?.context.workspace || "local" : "local"
          }
          locale={locale}
          onConfigureModels={onOpenModelSettings}
          onStop={
            created
              ? () => {
                  setRunning(false);
                  onPauseQueue?.();
                }
              : undefined
          }
          onSubmit={(message, context) => {
            if (created) onFollowUp?.(message, context);
            else setSeededFollowUps((current) => [...current, message]);
          }}
          placeholder={
            created && running
              ? zh
                ? "添加后续指令；Enter 加入队列，@ 添加文件，$ 使用 Skill…"
                : "Add a follow-up; press Enter to queue, use @ for files or $ for Skills…"
              : undefined
          }
          submitSuccessMessage={
            created
              ? zh
                ? "后续指令已加入队列。"
                : "Follow-up instruction added to the queue."
              : undefined
          }
        />
        <small
          data-persistence-warning={
            created && persistenceStatus === "memory" ? "true" : undefined
          }
          role={
            created && persistenceStatus === "memory" ? "status" : undefined
          }
        >
          {created && persistenceStatus === "memory"
            ? zh
              ? "浏览器未允许保存，本次会话仅保留在当前页面。"
              : "Browser storage is unavailable. This session remains only on the current page."
            : zh
              ? "生成内容可能存在误差，请核实重要信息"
              : "Generated content may contain errors. Verify important information."}
        </small>
      </footer>

      {inspectorOpen ? (
        <>
          <button
            aria-hidden="true"
            className="product-session__inspector-backdrop"
            onClick={closeInspector}
            tabIndex={-1}
            type="button"
          />
        </>
      ) : null}
      <ProductSessionInspector
        activeTab={inspectorTab}
        artifacts={artifacts}
        closeButtonRef={inspectorCloseRef}
        contextDetails={contextDetails}
        created={created}
        id="product-session-details"
        locale={locale}
        onClose={closeInspector}
        onTabChange={setInspectorTab}
        open={inspectorOpen}
        overlay={inspectorOverlay}
        panelRef={inspectorRef}
      />
    </section>
  );
}
