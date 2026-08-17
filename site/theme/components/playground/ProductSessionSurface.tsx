import { useMemo, useState } from "react";
import { Link } from "@rspress/core/theme";
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

export function ProductSessionSurface({
  locale,
  workspaceHref,
}: {
  locale: ProductPlaygroundLocale;
  workspaceHref: string;
}) {
  const zh = locale === "zh";
  const copy = sessionCopy[locale];
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

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

  return (
    <section
      className="product-session"
      data-product-surface="session"
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
          <Link
            aria-label={zh ? "打开会话工作区" : "Open session workspace"}
            href={workspaceHref}
          >
            <ProductPlaygroundIcon name="workspace" />
          </Link>
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
    </section>
  );
}
