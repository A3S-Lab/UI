import { useMemo, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type RunState = "failed" | "running" | "success";

const runs = [
  {
    id: "release-digest-0818",
    name: { en: "Daily release digest", zh: "每日发布摘要" },
    started: { en: "Today, 09:30", zh: "今天 09:30" },
    duration: "18.4s",
    state: "success" as RunState,
    trigger: { en: "Schedule · Weekdays", zh: "定时 · 工作日" },
    summary: {
      en: "Summarized 7 merged changes, 12 passing checks, and no release blocker.",
      zh: "汇总 7 个已合并变更、12 项通过检查，没有发布阻塞项。",
    },
  },
  {
    id: "regression-watch-0818",
    name: { en: "Regression watch", zh: "回归结果巡检" },
    started: { en: "Today, 08:10", zh: "今天 08:10" },
    duration: "42.1s",
    state: "failed" as RunState,
    trigger: { en: "Schedule · Every 2 hours", zh: "定时 · 每 2 小时" },
    summary: {
      en: "Desktop checks passed. The mobile preview could not reach the local target and is ready to retry.",
      zh: "桌面检查通过；移动端预览无法连接本地目标，可以安全重试。",
    },
  },
  {
    id: "docs-drift-0817",
    name: { en: "Documentation drift", zh: "文档漂移检查" },
    started: { en: "Yesterday, 17:00", zh: "昨天 17:00" },
    duration: "31.8s",
    state: "success" as RunState,
    trigger: { en: "Repository event", zh: "仓库事件" },
    summary: {
      en: "Compared public examples with the current manifest and found two resolved differences.",
      zh: "比对公开示例与当前组件清单，发现的两处差异均已解决。",
    },
  },
  {
    id: "dependency-review-0817",
    name: { en: "Weekly dependency review", zh: "每周依赖审查" },
    started: { en: "Yesterday, 14:30", zh: "昨天 14:30" },
    duration: "1m 08s",
    state: "running" as RunState,
    trigger: { en: "Manual", zh: "手动运行" },
    summary: {
      en: "Reviewing compatibility evidence for two candidate updates.",
      zh: "正在检查两个候选更新的兼容性证据。",
    },
  },
];

export function ProductAutomationRunHistory({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [filter, setFilter] = useState<"all" | RunState>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(runs[0].id);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState<"input" | "output">();
  const visibleRuns = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return runs.filter(
      (run) =>
        (filter === "all" || run.state === filter) &&
        (!normalized ||
          `${run.name.en} ${run.name.zh} ${run.summary.en} ${run.summary.zh}`
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    );
  }, [filter, locale, query]);
  const selected = runs.find((run) => run.id === selectedId) ?? runs[0];
  const stateCopy = {
    failed: zh ? "失败" : "Failed",
    running: zh ? "运行中" : "Running",
    success: zh ? "成功" : "Succeeded",
  } as const;

  const copy = async (kind: "input" | "output", value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  };

  return (
    <section
      className="product-run-history"
      aria-label={zh ? "运行记录" : "Run history"}
    >
      <header>
        <div>
          <h1>{zh ? "运行记录" : "Run history"}</h1>
          <p>
            {zh
              ? "查看每次自动化的触发、步骤、输出与恢复路径。"
              : "Inspect triggers, steps, outputs, and recovery for each automation run."}
          </p>
        </div>
        <button type="button">
          <ProductPlaygroundIcon name="refresh" />
          {zh ? "刷新" : "Refresh"}
        </button>
      </header>
      <div className="product-run-history__toolbar">
        <label>
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "搜索运行记录" : "Search runs"}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={zh ? "搜索任务或输出" : "Search task or output"}
            type="search"
            value={query}
          />
        </label>
        <div aria-label={zh ? "运行状态" : "Run status"} role="group">
          {(["all", "success", "failed", "running"] as const).map((state) => (
            <button
              aria-pressed={filter === state}
              key={state}
              onClick={() => setFilter(state)}
              type="button"
            >
              {state === "all" ? (zh ? "全部" : "All") : stateCopy[state]}
            </button>
          ))}
        </div>
      </div>
      <div className="product-run-history__workspace">
        <div
          className="product-run-history__list"
          role="listbox"
          aria-label={zh ? "运行记录" : "Runs"}
        >
          <header>
            <span>
              {zh
                ? `${visibleRuns.length} 次运行`
                : `${visibleRuns.length} runs`}
            </span>
            <span>{zh ? "最近 7 天" : "Last 7 days"}</span>
          </header>
          {visibleRuns.length ? (
            visibleRuns.map((run) => (
              <button
                aria-selected={selected.id === run.id}
                key={run.id}
                onClick={() => {
                  setSelectedId(run.id);
                  setRetrying(false);
                }}
                role="option"
                type="button"
              >
                <span data-run-state={run.state}>
                  {run.state === "success" ? (
                    <ProductPlaygroundIcon name="check" />
                  ) : run.state === "failed" ? (
                    <ProductPlaygroundIcon name="warning" />
                  ) : (
                    <i />
                  )}
                </span>
                <span>
                  <strong>{run.name[locale]}</strong>
                  <small>
                    {run.started[locale]} · {run.trigger[locale]}
                  </small>
                </span>
                <span>
                  <em data-state={run.state}>{stateCopy[run.state]}</em>
                  <small>{run.duration}</small>
                </span>
                <ProductPlaygroundIcon name="chevron" />
              </button>
            ))
          ) : (
            <div role="status">
              <ProductPlaygroundIcon name="search" />
              <strong>{zh ? "没有匹配记录" : "No matching runs"}</strong>
              <span>
                {zh
                  ? "调整搜索或状态筛选后重试。"
                  : "Change the search or status filter and try again."}
              </span>
            </div>
          )}
        </div>

        <aside
          className="product-run-history__detail"
          aria-label={`${selected.name[locale]} ${zh ? "详情" : "details"}`}
        >
          <header>
            <div>
              <span data-run-state={selected.state}>
                {selected.state === "success" ? (
                  <ProductPlaygroundIcon name="check" />
                ) : selected.state === "failed" ? (
                  <ProductPlaygroundIcon name="warning" />
                ) : (
                  <i />
                )}
              </span>
              <span>
                <strong>{selected.name[locale]}</strong>
                <small>
                  {selected.started[locale]} · {selected.duration}
                </small>
              </span>
            </div>
            <em data-state={selected.state}>{stateCopy[selected.state]}</em>
          </header>
          <p>{selected.summary[locale]}</p>
          <dl>
            <div>
              <dt>{zh ? "触发方式" : "Trigger"}</dt>
              <dd>{selected.trigger[locale]}</dd>
            </div>
            <div>
              <dt>{zh ? "运行环境" : "Runtime"}</dt>
              <dd>{zh ? "本地工作区" : "Local workspace"}</dd>
            </div>
            <div>
              <dt>{zh ? "恢复策略" : "Recovery"}</dt>
              <dd>
                {selected.state === "failed"
                  ? zh
                    ? "可从失败步骤重试"
                    : "Retry from failed step"
                  : zh
                    ? "不需要"
                    : "Not needed"}
              </dd>
            </div>
          </dl>
          <section className="product-run-history__steps">
            <h2>{zh ? "执行步骤" : "Run steps"}</h2>
            <ol>
              <li data-state="success">
                <span>
                  <ProductPlaygroundIcon name="check" />
                </span>
                <div>
                  <strong>{zh ? "读取任务上下文" : "Read task context"}</strong>
                  <small>0.8s</small>
                </div>
              </li>
              <li data-state="success">
                <span>
                  <ProductPlaygroundIcon name="check" />
                </span>
                <div>
                  <strong>
                    {zh ? "执行自动化规则" : "Execute automation rule"}
                  </strong>
                  <small>
                    {selected.state === "running"
                      ? zh
                        ? "进行中"
                        : "Running"
                      : "12.6s"}
                  </small>
                </div>
              </li>
              <li data-state={selected.state}>
                <span>
                  {selected.state === "failed" ? (
                    <ProductPlaygroundIcon name="warning" />
                  ) : selected.state === "running" ? (
                    <i />
                  ) : (
                    <ProductPlaygroundIcon name="check" />
                  )}
                </span>
                <div>
                  <strong>
                    {zh ? "生成并归档结果" : "Generate and archive result"}
                  </strong>
                  <small>
                    {selected.state === "failed"
                      ? zh
                        ? "连接失败"
                        : "Connection failed"
                      : selected.state === "running"
                        ? zh
                          ? "等待"
                          : "Waiting"
                        : "5.0s"}
                  </small>
                </div>
              </li>
            </ol>
          </section>
          <section className="product-run-history__output">
            <header>
              <strong>{zh ? "输入" : "Input"}</strong>
              <button
                aria-label={zh ? "复制输入" : "Copy input"}
                onClick={() =>
                  copy("input", "workspace=a3s-ui\nviewport=desktop,mobile")
                }
                type="button"
              >
                <ProductPlaygroundIcon
                  name={copied === "input" ? "check" : "copy"}
                />
              </button>
            </header>
            <pre>
              <code>workspace=a3s-ui{"\n"}viewport=desktop,mobile</code>
            </pre>
          </section>
          <section className="product-run-history__output">
            <header>
              <strong>{zh ? "输出" : "Output"}</strong>
              <button
                aria-label={zh ? "复制输出" : "Copy output"}
                onClick={() => copy("output", selected.summary[locale])}
                type="button"
              >
                <ProductPlaygroundIcon
                  name={copied === "output" ? "check" : "copy"}
                />
              </button>
            </header>
            <pre>
              <code>
                {selected.state === "failed"
                  ? "ERROR preview.mobile: local target unavailable\nRECOVERY retry_step=preview.mobile"
                  : selected.summary[locale]}
              </code>
            </pre>
          </section>
          {selected.state === "failed" ? (
            <footer>
              <div>
                <ProductPlaygroundIcon name="warning" />
                <span>
                  <strong>
                    {zh ? "运行可以恢复" : "This run is recoverable"}
                  </strong>
                  <small>
                    {zh
                      ? "已完成步骤不会重复执行。"
                      : "Completed steps will not run again."}
                  </small>
                </span>
              </div>
              <button
                disabled={retrying}
                onClick={() => setRetrying(true)}
                type="button"
              >
                <ProductPlaygroundIcon name={retrying ? "update" : "refresh"} />
                {retrying
                  ? zh
                    ? "正在重试"
                    : "Retrying"
                  : zh
                    ? "从失败步骤重试"
                    : "Retry failed step"}
              </button>
            </footer>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
