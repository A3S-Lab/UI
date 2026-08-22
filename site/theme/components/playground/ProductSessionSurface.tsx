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
    window.requestAnimationFrame(() => returnFocus?.focus());
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
    const focusFrame = inspectorOverlay
      ? window.requestAnimationFrame(() => inspectorCloseRef.current?.focus())
      : undefined;
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
      if (focusFrame) window.cancelAnimationFrame(focusFrame);
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
        className="product-session"
        data-product-surface="session"
        data-session-state="loading"
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
        className="product-session"
        data-product-surface="session"
        data-session-state="missing"
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
      className="product-session"
      data-inspector-open={inspectorOpen ? "true" : undefined}
      data-product-surface="session"
      data-search-open={searchOpen ? "true" : undefined}
      data-session-state="ready"
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

      <div className="product-session__viewport" ref={viewportRef}>
        <ol aria-label={zh ? "会话记录" : "Conversation history"}>
          <li data-role="user">
            <article>
              <p>{copy[0]}</p>
            </article>
          </li>
          <li data-role="assistant">
            <article>
              <header>
                <span>
                  <ProductPlaygroundIcon name="assistant" />
                  <strong>A3S</strong>
                </span>
                <small>{created ? (zh ? "刚刚" : "Now") : "2m 18s"}</small>
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
                    <small>{zh ? "刚刚" : "Now"}</small>
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
            overlay={inspectorOverlay}
            panelRef={inspectorRef}
          />
        </>
      ) : null}
    </section>
  );
}
