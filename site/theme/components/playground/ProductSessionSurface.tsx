import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductComposer } from "./ProductComposer";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const sessionCopy = {
  en: [
    "After a failed sign-in token refresh, focus is lost and the return route is not preserved. Find the cause, fix it, and add regression coverage.",
    "I reproduced the issue. The failure branch cleared the recovery target before redirecting and skipped focus restoration for the trigger.",
    "I changed the cleanup order, restored focus after navigation, and added coverage for the return route and accessibility announcement.",
    "The recovery path and its regression tests now pass.",
  ],
  zh: [
    "登录令牌刷新失败后，焦点会丢失，返回路径也没有保留。请定位原因、修复并补充回归测试。",
    "已复现问题。失败分支在重定向前清除了恢复目标，同时跳过了触发控件的焦点恢复。",
    "我调整了清理顺序，在导航完成后恢复焦点，并为返回路由和无障碍公告增加覆盖。",
    "恢复路径及其回归测试现已通过。",
  ],
} as const;

const sessionArtifacts = [
  {
    content: `export async function restoreSession(returnTo: string) {
  const recoveryTarget = normalizeReturnPath(returnTo);

  await refreshSessionToken();
  navigate(recoveryTarget);
  restoreTriggerFocus();
}`,
    id: "session",
    kind: "TypeScript",
    name: "src/auth/session.ts",
    summary: {
      en: "Preserves the recovery target until navigation completes.",
      zh: "保留恢复目标，直到导航完成。",
    },
  },
  {
    content: `export function SignInRecovery() {
  const returnTo = useRecoveryTarget();

  return (
    <SignInForm
      onRecovered={() => restoreSession(returnTo)}
    />
  );
}`,
    id: "sign-in",
    kind: "TSX",
    name: "src/routes/sign-in.tsx",
    summary: {
      en: "Restores focus after the return route is committed.",
      zh: "在返回路由提交后恢复焦点。",
    },
  },
  {
    content: `test("keeps the return route after refresh failure", async () => {
  await failNextTokenRefresh();
  await recoverFromSignIn("/projects/alpha");

  expect(currentRoute()).toBe("/projects/alpha");
  expect(trigger()).toHaveFocus();
});`,
    id: "tests",
    kind: "TypeScript",
    name: "tests/session.test.ts",
    summary: {
      en: "Covers route recovery, focus, and status announcements.",
      zh: "覆盖路由恢复、焦点与状态公告。",
    },
  },
  {
    content: `# Session recovery review

- Recovery target survives token refresh failures.
- Focus returns to the action that opened sign-in.
- Status changes use a bounded live region.
- All 12 focused regression tests pass.`,
    id: "review",
    kind: "Markdown",
    name: "release-review.md",
    summary: {
      en: "Records verification scope and release evidence.",
      zh: "记录验证范围与发布证据。",
    },
  },
] as const;

export function ProductSessionSurface({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const copy = sessionCopy[locale];
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [artifactCopyStatus, setArtifactCopyStatus] = useState("");
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorOverlay, setInspectorOverlay] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const inspectorCloseRef = useRef<HTMLButtonElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const inspectorTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 60rem)");
    const update = () => setInspectorOverlay(query.matches);
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

    const focusFrame = window.requestAnimationFrame(() =>
      inspectorCloseRef.current?.focus(),
    );
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
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeInspector, inspectorOpen, inspectorOverlay]);

  const matchCount = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return 0;
    return [...copy, ...followUps].reduce((count, value) => {
      const matches = value
        .toLocaleLowerCase(locale)
        .split(normalizedQuery).length;
      return count + Math.max(0, matches - 1);
    }, 0);
  }, [copy, followUps, locale, query]);

  const shareSession = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus(zh ? "会话链接已复制" : "Session link copied");
    } catch {
      setShareStatus(zh ? "无法复制链接" : "Unable to copy link");
    }
  };

  const activeArtifact = sessionArtifacts.find(
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

  return (
    <section
      className="product-session"
      data-product-surface="session"
      data-inspector-open={inspectorOpen ? "true" : undefined}
      data-search-open={searchOpen ? "true" : undefined}
    >
      <header className="product-session__header">
        <h1>{zh ? "修复会话恢复" : "Fix session recovery"}</h1>
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
                    <span data-tool-state>{zh ? "已完成" : "Complete"}</span>
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
              </div>
            </article>
          </li>
          {followUps.map((message, index) => (
            <li data-role="user" key={`${message}-${index}`}>
              <article>
                <p>{message}</p>
              </article>
            </li>
          ))}
        </ol>
      </div>

      <footer className="product-session__composer">
        <ProductComposer
          compact
          locale={locale}
          onSubmit={(message) =>
            setFollowUps((current) => [...current, message])
          }
        />
        <small>
          {zh
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
                  {zh
                    ? `${sessionArtifacts.length} 个文件 · 测试已通过`
                    : `${sessionArtifacts.length} files · Tests passed`}
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
                <section>
                  <span>
                    <ProductPlaygroundIcon name="check" />
                  </span>
                  <div>
                    <strong>
                      {zh ? "会话恢复修复完成" : "Session recovery fixed"}
                    </strong>
                    <small>
                      {zh
                        ? "2 个源文件已更新，12 项回归测试通过。"
                        : "2 source files updated and 12 regression tests passed."}
                    </small>
                  </div>
                </section>
                <div>
                  <header>
                    <strong>{zh ? "修复产物" : "Fix artifacts"}</strong>
                    <small>{sessionArtifacts.length}</small>
                  </header>
                  {sessionArtifacts.map((artifact) => (
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
