import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "@rspress/core/theme";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductComposer } from "./ProductComposer";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
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
  onFollowUp,
  persistenceStatus = "saved",
  startHref,
  taskSession = null,
  taskSessionReady = true,
  variant = "seeded",
}: {
  locale: ProductPlaygroundLocale;
  onFollowUp?: (message: string) => void;
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
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [artifactCopyStatus, setArtifactCopyStatus] = useState("");
  const [seededFollowUps, setSeededFollowUps] = useState<string[]>([]);
  const followUps = created ? (taskSession?.followUps ?? []) : seededFollowUps;
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorOverlay, setInspectorOverlay] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const inspectorCloseRef = useRef<HTMLButtonElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const inspectorTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 60rem)");
    const update = () => {
      setInspectorOverlay(query.matches);
      setInspectorOpen(!query.matches);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorOpen(false);
    window.requestAnimationFrame(() => inspectorTriggerRef.current?.focus());
  }, []);

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
        ...(inspectorRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not(:disabled)",
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
    ];
    return messages.reduce((count, value) => {
      const matches = value
        .toLocaleLowerCase(locale)
        .split(normalizedQuery).length;
      return count + Math.max(0, matches - 1);
    }, 0);
  }, [copy, followUpReply, followUps, locale, query]);

  const shareSession = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus(zh ? "会话链接已复制" : "Session link copied");
    } catch {
      setShareStatus(zh ? "无法复制链接" : "Unable to copy link");
    }
  };

  const activeArtifact = artifacts.find(
    (artifact) => artifact.id === activeArtifactId,
  );

  const copyArtifact = async () => {
    if (!activeArtifact) return;
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      setArtifactCopyStatus(zh ? "内容已复制" : "Content copied");
    } catch {
      setArtifactCopyStatus(zh ? "无法复制内容" : "Unable to copy content");
    }
  };

  if (created && !taskSessionReady) {
    return (
      <section
        aria-busy="true"
        className="product-session"
        data-product-surface="session"
        data-session-state="loading"
        data-variant="created"
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
        data-variant="created"
      >
        <header className="product-session__header">
          <h1>{zh ? "当前任务" : "Current task"}</h1>
        </header>
        <div className="product-session__state" role="status">
          <span aria-hidden="true">
            <ProductPlaygroundIcon name="task-add" />
          </span>
          <h2 id="product-session-missing-title">
            {zh ? "没有可恢复的任务" : "No task to restore"}
          </h2>
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
      data-product-surface="session"
      data-inspector-open={inspectorOpen ? "true" : undefined}
      data-search-open={searchOpen ? "true" : undefined}
      data-session-state="ready"
      data-variant={variant}
    >
      <header className="product-session__header">
        <h1>{title}</h1>
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
            aria-controls="product-session-artifacts"
            aria-expanded={inspectorOpen}
            aria-label={
              inspectorOpen
                ? zh
                  ? "关闭产物面板"
                  : "Close artifacts panel"
                : zh
                  ? "打开产物面板"
                  : "Open artifacts panel"
            }
            data-active={inspectorOpen ? "true" : undefined}
            onClick={() =>
              inspectorOpen ? closeInspector() : setInspectorOpen(true)
            }
            ref={inspectorTriggerRef}
            type="button"
          >
            <ProductPlaygroundIcon name="workspace" />
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

      <div className="product-session__viewport">
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
              </header>
              <div className="product-session__response">
                <p>{copy[1]}</p>

                {created && contextDetails ? (
                  <>
                    <details className="product-session__tool" data-context>
                      <summary>
                        <span data-tool-icon>
                          <ProductPlaygroundIcon name="workspace" />
                        </span>
                        <span data-tool-identity>
                          <strong>
                            {zh ? "任务上下文已准备" : "Task context ready"}
                          </strong>
                          <small>{contextDetails.workspace}</small>
                        </span>
                        <span data-tool-state>{zh ? "就绪" : "Ready"}</span>
                        <ProductPlaygroundIcon
                          data-tool-disclosure
                          name="chevron"
                        />
                      </summary>
                      <section>
                        <dl>
                          <div>
                            <dt>{zh ? "工作空间" : "Workspace"}</dt>
                            <dd>{contextDetails.workspace}</dd>
                          </div>
                          <div>
                            <dt>{zh ? "权限" : "Permissions"}</dt>
                            <dd>{contextDetails.permissions}</dd>
                          </div>
                          <div>
                            <dt>{zh ? "模型" : "Model"}</dt>
                            <dd>{contextDetails.model}</dd>
                          </div>
                          <div>
                            <dt>{zh ? "努力程度" : "Effort"}</dt>
                            <dd>{contextDetails.effort}</dd>
                          </div>
                          <div>
                            <dt>{zh ? "已附加资源" : "Attached resources"}</dt>
                            <dd>{contextDetails.resources}</dd>
                          </div>
                        </dl>
                      </section>
                    </details>
                    <p>{copy[2]}</p>
                    <p>{copy[3]}</p>
                  </>
                ) : (
                  <>
                    <details className="product-session__tool">
                      <summary>
                        <span data-tool-icon>
                          <ProductPlaygroundIcon name="search" />
                        </span>
                        <span data-tool-identity>
                          <strong>
                            {zh
                              ? "检查会话恢复路径"
                              : "Inspect session recovery path"}
                          </strong>
                          <small>
                            src/auth/session.ts · src/routes/sign-in.tsx
                          </small>
                        </span>
                        <span data-tool-state>
                          {zh ? "已完成" : "Complete"}
                        </span>
                        <ProductPlaygroundIcon
                          data-tool-disclosure
                          name="chevron"
                        />
                      </summary>
                      <section>
                        <dl>
                          <div>
                            <dt>{zh ? "操作" : "Action"}</dt>
                            <dd>{zh ? "读取 2 个文件" : "Read 2 files"}</dd>
                          </div>
                          <div>
                            <dt>{zh ? "结果" : "Result"}</dt>
                            <dd>
                              {zh
                                ? "定位到失败分支中的状态清理顺序"
                                : "Located state cleanup ordering in the failure branch"}
                            </dd>
                          </div>
                        </dl>
                      </section>
                    </details>

                    <p>{copy[2]}</p>

                    <details className="product-session__tool" data-success>
                      <summary>
                        <span data-tool-icon>
                          <ProductPlaygroundIcon name="check" />
                        </span>
                        <span data-tool-identity>
                          <strong>
                            {zh ? "运行会话测试" : "Run session tests"}
                          </strong>
                          <small>npm test -- session</small>
                        </span>
                        <span data-tool-state>{zh ? "通过" : "Passed"}</span>
                        <ProductPlaygroundIcon
                          data-tool-disclosure
                          name="chevron"
                        />
                      </summary>
                      <section>
                        <pre>
                          <code>
                            PASS tests/session.test.ts{"\n"}
                            12 passed · 0 failed · 4.8s
                          </code>
                        </pre>
                      </section>
                    </details>

                    <p>{copy[3]}</p>
                  </>
                )}
              </div>
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
        <ProductComposer
          compact
          contextual
          initialWorkspace={
            created ? taskSession?.context.workspace || "local" : "local"
          }
          locale={locale}
          onSubmit={(message) => {
            if (created) onFollowUp?.(message);
            else setSeededFollowUps((current) => [...current, message]);
          }}
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
          <aside
            aria-label={zh ? "会话产物" : "Session artifacts"}
            aria-modal={inspectorOverlay ? true : undefined}
            className="product-session__inspector"
            id="product-session-artifacts"
            ref={inspectorRef}
            role={inspectorOverlay ? "dialog" : undefined}
          >
            <header>
              <div>
                <strong>{zh ? "产物" : "Artifacts"}</strong>
                <small>
                  {created
                    ? zh
                      ? `${artifacts.length} 个文件 · 上下文已准备`
                      : `${artifacts.length} files · Context ready`
                    : zh
                      ? `${artifacts.length} 个文件 · 测试已通过`
                      : `${artifacts.length} files · Tests passed`}
                </small>
              </div>
              <button
                aria-label={zh ? "关闭产物面板" : "Close artifacts panel"}
                onClick={closeInspector}
                ref={inspectorCloseRef}
                type="button"
              >
                <ProductPlaygroundIcon name="close" />
              </button>
            </header>

            {activeArtifact ? (
              <section className="product-session__artifact-preview">
                <header>
                  <button
                    onClick={() => {
                      setActiveArtifactId(null);
                      setArtifactCopyStatus("");
                    }}
                    type="button"
                  >
                    <ProductPlaygroundIcon name="arrow" />
                    {zh ? "返回" : "Back"}
                  </button>
                  <button onClick={copyArtifact} type="button">
                    <ProductPlaygroundIcon name="document" />
                    {zh ? "复制" : "Copy"}
                  </button>
                </header>
                <div>
                  <span>
                    <ProductPlaygroundIcon name="document" />
                  </span>
                  <strong>{activeArtifact.name}</strong>
                  <small>{activeArtifact.summary[locale]}</small>
                </div>
                <pre>
                  <code>{activeArtifact.content}</code>
                </pre>
                <output aria-live="polite">{artifactCopyStatus}</output>
              </section>
            ) : (
              <div className="product-session__artifact-overview">
                <section data-context={created ? "true" : undefined}>
                  <span>
                    <ProductPlaygroundIcon
                      name={created ? "workspace" : "check"}
                    />
                  </span>
                  <div>
                    <strong>
                      {created
                        ? zh
                          ? "任务上下文已准备"
                          : "Task context ready"
                        : zh
                          ? "会话恢复修复完成"
                          : "Session recovery fixed"}
                    </strong>
                    <small>
                      {created
                        ? zh
                          ? "原始要求、执行上下文与首个可验证计划均已保留。"
                          : "The original request, execution context, and first verifiable plan are preserved."
                        : zh
                          ? "2 个源文件已更新，12 项回归测试通过。"
                          : "2 source files updated and 12 regression tests passed."}
                    </small>
                  </div>
                </section>
                <div>
                  <header>
                    <strong>
                      {created
                        ? zh
                          ? "任务文件"
                          : "Task files"
                        : zh
                          ? "修复产物"
                          : "Fix artifacts"}
                    </strong>
                    <small>{artifacts.length}</small>
                  </header>
                  {artifacts.map((artifact) => (
                    <button
                      key={artifact.id}
                      onClick={() => {
                        setActiveArtifactId(artifact.id);
                        setArtifactCopyStatus("");
                      }}
                      type="button"
                    >
                      <span>
                        <ProductPlaygroundIcon name="document" />
                      </span>
                      <span>
                        <strong>{artifact.name}</strong>
                        <small>{artifact.kind}</small>
                      </span>
                      <ProductPlaygroundIcon name="chevron" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </>
      ) : null}
    </section>
  );
}
