import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { writeClipboardText } from "../clipboard";
import {
  formatProductAutomationDuration,
  formatProductAutomationRunDuration,
  formatProductAutomationRuntime,
  type ProductAutomationRun,
  type ProductAutomationRunState,
} from "./product-automation-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductAutomationRunHistory({
  locale,
  onRetry,
  runs,
}: {
  locale: ProductPlaygroundLocale;
  onRetry: (runId: string) => void;
  runs: readonly ProductAutomationRun[];
}) {
  const zh = locale === "zh";
  const refreshTimer = useRef<number | undefined>(undefined);
  const runRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [filter, setFilter] = useState<"all" | ProductAutomationRunState>(
    "all",
  );
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(runs[0]?.id ?? "");
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState<"input" | "output">();
  const [status, setStatus] = useState("");

  useEffect(
    () => () => {
      if (refreshTimer.current !== undefined) {
        window.clearTimeout(refreshTimer.current);
      }
    },
    [],
  );

  const visibleRuns = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return runs.filter(
      (run) =>
        (filter === "all" || run.state === filter) &&
        (!normalized ||
          `${run.name.en} ${run.name.zh} ${run.summary.en} ${run.summary.zh} ${run.input} ${run.output.en} ${run.output.zh} ${run.trigger.en} ${run.trigger.zh}`
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    );
  }, [filter, locale, query, runs]);
  const selected =
    visibleRuns.find((run) => run.id === selectedId) ?? visibleRuns[0];
  const stateCopy = {
    failed: zh ? "失败" : "Failed",
    running: zh ? "运行中" : "Running",
    success: zh ? "成功" : "Succeeded",
  } as const;

  useEffect(() => {
    if (!selected) {
      setDetailOpen(false);
      return;
    }
    if (selected.id !== selectedId) {
      setSelectedId(selected.id);
      setDetailOpen(false);
    }
  }, [selected, selectedId]);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setStatus(zh ? "正在同步运行记录。" : "Syncing run history.");
    if (refreshTimer.current !== undefined) {
      window.clearTimeout(refreshTimer.current);
    }
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = undefined;
      setRefreshing(false);
      setStatus(
        zh
          ? `已同步 ${runs.length} 次运行，没有遗漏的本地记录。`
          : `${runs.length} runs synchronized with no missing local records.`,
      );
    }, 480);
  };

  const copy = async (kind: "input" | "output", value: string) => {
    try {
      await writeClipboardText(value);
      setCopied(kind);
      setStatus(
        kind === "input"
          ? zh
            ? "输入已复制。"
            : "Input copied."
          : zh
            ? "输出已复制。"
            : "Output copied.",
      );
    } catch {
      setCopied(undefined);
      setStatus(
        zh
          ? "浏览器未允许复制，请直接选择代码内容。"
          : "The browser blocked copying. Select the code content directly.",
      );
    }
  };

  const selectRun = (run: ProductAutomationRun) => {
    setSelectedId(run.id);
    setDetailOpen(true);
    setCopied(undefined);
  };

  const retrySelectedRun = (run: ProductAutomationRun) => {
    setFilter("all");
    setQuery("");
    setDetailOpen(true);
    setStatus(
      zh
        ? "已开始重试并显示全部记录，恢复过程会保留在当前详情中。"
        : "Retry started and all runs are shown so recovery stays visible here.",
    );
    onRetry(run.id);
  };

  const handleRunKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowDown") {
      nextIndex = (index + 1) % visibleRuns.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = (index - 1 + visibleRuns.length) % visibleRuns.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = visibleRuns.length - 1;
    }
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextRun = visibleRuns[nextIndex];
    setSelectedId(nextRun.id);
    runRefs.current[nextRun.id]?.focus();
  };

  return (
    <section
      aria-label={zh ? "运行记录" : "Run history"}
      className="product-run-history"
      data-detail-open={detailOpen ? "true" : undefined}
    >
      <header>
        <div>
          <h1>{zh ? "运行记录" : "Run history"}</h1>
          <p>
            {zh
              ? "查看每次触发的输入、步骤、输出与可执行恢复路径。"
              : "Inspect the inputs, steps, outputs, and actionable recovery path for every trigger."}
          </p>
        </div>
        <button
          aria-busy={refreshing}
          disabled={refreshing}
          onClick={refresh}
          type="button"
        >
          <ProductPlaygroundIcon name={refreshing ? "update" : "refresh"} />
          {refreshing ? (zh ? "同步中" : "Syncing") : zh ? "刷新" : "Refresh"}
        </button>
      </header>
      <div className="product-run-history__toolbar">
        <label data-focus-owner="container">
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "搜索运行记录" : "Search runs"}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setDetailOpen(false);
            }}
            placeholder={zh ? "搜索任务或输出" : "Search task or output"}
            type="search"
            value={query}
          />
        </label>
        <div aria-label={zh ? "运行状态" : "Run status"} role="group">
          {(["all", "success", "failed", "running"] as const).map((state) => (
            <button
              aria-pressed={filter === state}
              data-run-filter={state}
              key={state}
              onClick={() => {
                setFilter(state);
                setDetailOpen(false);
              }}
              type="button"
            >
              {state === "all" ? (zh ? "全部" : "All") : stateCopy[state]}
            </button>
          ))}
        </div>
      </div>
      <div className="product-run-history__workspace">
        <div
          aria-label={zh ? "运行记录" : "Runs"}
          className="product-run-history__list"
          role="listbox"
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
            visibleRuns.map((run, index) => (
              <button
                aria-selected={selected?.id === run.id}
                data-automation-run-state={run.state}
                data-run-id={run.id}
                key={run.id}
                onClick={() => selectRun(run)}
                onKeyDown={(event) => handleRunKeyDown(event, index)}
                ref={(element) => {
                  runRefs.current[run.id] = element;
                }}
                role="option"
                tabIndex={selected?.id === run.id ? 0 : -1}
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
                  <small>
                    {run.state === "running"
                      ? "—"
                      : formatProductAutomationRunDuration(run, locale)}
                  </small>
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
                  ? "清除搜索或切换状态筛选后重试。"
                  : "Clear the search or change the state filter and try again."}
              </span>
            </div>
          )}
        </div>

        {selected ? (
          <aside
            aria-label={`${selected.name[locale]} ${zh ? "详情" : "details"}`}
            className="product-run-history__detail"
          >
            <button
              className="product-run-history__back"
              onClick={() => {
                setDetailOpen(false);
                window.queueMicrotask(() =>
                  runRefs.current[selected.id]?.focus(),
                );
              }}
              type="button"
            >
              <ProductPlaygroundIcon name="back" />
              {zh ? "返回运行记录" : "Back to runs"}
            </button>
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
                    {selected.started[locale]} ·{" "}
                    {formatProductAutomationRunDuration(selected, locale)}
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
                <dd>{formatProductAutomationRuntime(selected, locale)}</dd>
              </div>
              <div>
                <dt>{zh ? "恢复策略" : "Recovery"}</dt>
                <dd>
                  {selected.state === "failed"
                    ? zh
                      ? `从 ${selected.failedStep ?? "失败步骤"} 重试`
                      : `Retry from ${selected.failedStep ?? "failed step"}`
                    : selected.state === "running"
                      ? zh
                        ? "保留已完成步骤"
                        : "Preserve completed steps"
                      : zh
                        ? "无需恢复"
                        : "Not needed"}
                </dd>
              </div>
            </dl>
            <section className="product-run-history__steps">
              <h2>{zh ? "执行步骤" : "Run steps"}</h2>
              <ol>
                {selected.steps.map((step) => (
                  <li data-state={step.state} key={step.id}>
                    <span>
                      {step.state === "failed" ? (
                        <ProductPlaygroundIcon name="warning" />
                      ) : step.state === "running" ? (
                        <i />
                      ) : step.state === "pending" ? (
                        <b />
                      ) : (
                        <ProductPlaygroundIcon name="check" />
                      )}
                    </span>
                    <div>
                      <strong>{step.label[locale]}</strong>
                      <small>
                        {step.durationMs !== undefined
                          ? formatProductAutomationDuration(step.durationMs)
                          : step.state === "running"
                            ? zh
                              ? "进行中"
                              : "Running"
                            : zh
                              ? "等待中"
                              : "Waiting"}
                        {step.detail ? ` · ${step.detail[locale]}` : ""}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="product-run-history__output">
              <header>
                <strong>{zh ? "输入" : "Input"}</strong>
                <button
                  aria-label={
                    copied === "input"
                      ? zh
                        ? "输入已复制"
                        : "Input copied"
                      : zh
                        ? "复制输入"
                        : "Copy input"
                  }
                  onClick={() => copy("input", selected.input)}
                  type="button"
                >
                  <ProductPlaygroundIcon
                    name={copied === "input" ? "check" : "copy"}
                  />
                </button>
              </header>
              <pre>
                <code>{selected.input}</code>
              </pre>
            </section>
            <section className="product-run-history__output">
              <header>
                <strong>{zh ? "输出" : "Output"}</strong>
                <button
                  aria-label={
                    copied === "output"
                      ? zh
                        ? "输出已复制"
                        : "Output copied"
                      : zh
                        ? "复制输出"
                        : "Copy output"
                  }
                  onClick={() => copy("output", selected.output[locale])}
                  type="button"
                >
                  <ProductPlaygroundIcon
                    name={copied === "output" ? "check" : "copy"}
                  />
                </button>
              </header>
              <pre>
                <code>{selected.output[locale]}</code>
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
                        ? "只重试失败步骤，已完成步骤和输入快照保持不变。"
                        : "Only the failed step reruns; completed steps and the input snapshot stay unchanged."}
                    </small>
                  </span>
                </div>
                <button
                  onClick={() => retrySelectedRun(selected)}
                  type="button"
                >
                  <ProductPlaygroundIcon name="refresh" />
                  {zh ? "从失败步骤重试" : "Retry failed step"}
                </button>
              </footer>
            ) : selected.state === "running" ? (
              <footer data-running role="status">
                <div>
                  <ProductPlaygroundIcon name="update" />
                  <span>
                    <strong>
                      {zh ? "恢复正在运行" : "Recovery is running"}
                    </strong>
                    <small>
                      {zh
                        ? "可以离开此页面，运行记录会保留当前状态。"
                        : "You can leave this page; the run record keeps its current state."}
                    </small>
                  </span>
                </div>
              </footer>
            ) : null}
          </aside>
        ) : null}
      </div>
      <output aria-live="polite" className="product-run-history__status">
        {status}
      </output>
    </section>
  );
}
