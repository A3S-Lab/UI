import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { automationTemplates } from "./product-playground-data";
import {
  cloneProductAutomation,
  cloneProductAutomationRun,
  formatProductAutomationNextRun,
  formatProductAutomationRuntime,
  formatProductAutomationSchedule,
  initialProductAutomationRuns,
  initialProductAutomations,
  type ProductAutomationDefinition,
  type ProductAutomationDraft,
  type ProductAutomationRun,
  type ProductAutomationTemplateDraft,
} from "./product-automation-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductAutomationBuilder } from "./ProductAutomationBuilder";
import { ProductAutomationRunHistory } from "./ProductAutomationRunHistory";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type AutomationTab = "history" | "scheduled";

export function ProductAutomationSurface({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const tabId = useId().replaceAll(":", "");
  const timers = useRef<number[]>([]);
  const editorReturnFocus = useRef<string | null>(null);
  const tabRefs = useRef<Record<AutomationTab, HTMLButtonElement | null>>({
    history: null,
    scheduled: null,
  });
  const [tab, setTab] = useState<AutomationTab>("scheduled");
  const [automations, setAutomations] = useState<ProductAutomationDefinition[]>(
    () => initialProductAutomations.map(cloneProductAutomation),
  );
  const [runs, setRuns] = useState<ProductAutomationRun[]>(() =>
    initialProductAutomationRuns.map(cloneProductAutomationRun),
  );
  const [editor, setEditor] = useState<{
    automationId?: string;
    template?: ProductAutomationTemplateDraft;
  } | null>(null);
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  const [status, setStatus] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const clockTimer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      window.clearInterval(clockTimer);
      timers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const activeCount = automations.filter(
    (automation) => automation.enabled,
  ).length;
  const runningAutomationIds = useMemo(
    () =>
      new Set(
        runs
          .filter((run) => run.state === "running")
          .map((run) => run.automationId),
      ),
    [runs],
  );
  const attentionCount = automations.filter((automation) => {
    const latest = runs.find((run) => run.automationId === automation.id);
    return latest?.state === "failed";
  }).length;
  const visibleTemplates = showAllTemplates
    ? automationTemplates
    : automationTemplates.slice(0, 6);

  const selectTab = (nextTab: AutomationTab, focus = false) => {
    setTab(nextTab);
    if (focus) tabRefs.current[nextTab]?.focus();
  };

  const openEditor = (
    nextEditor: NonNullable<typeof editor>,
    returnFocusSelector: string,
  ) => {
    editorReturnFocus.current = returnFocusSelector;
    setEditor(nextEditor);
  };

  const closeEditor = () => {
    setEditor(null);
    const selector = editorReturnFocus.current;
    editorReturnFocus.current = null;
    if (!selector) return;
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(selector)?.focus();
    });
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: AutomationTab,
  ) => {
    let nextTab: AutomationTab | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextTab = currentTab === "scheduled" ? "history" : "scheduled";
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextTab = currentTab === "history" ? "scheduled" : "history";
    } else if (event.key === "Home") {
      nextTab = "scheduled";
    } else if (event.key === "End") {
      nextTab = "history";
    }
    if (!nextTab) return;
    event.preventDefault();
    selectTab(nextTab, true);
  };

  const saveAutomation = (draft: ProductAutomationDraft) => {
    const existing = editor?.automationId
      ? automations.find((automation) => automation.id === editor.automationId)
      : undefined;
    const id = existing?.id ?? `automation-${Date.now()}`;
    const next: ProductAutomationDefinition = {
      ...draft,
      enabled: existing?.enabled ?? true,
      id,
    };
    setAutomations((current) => [
      next,
      ...current.filter((automation) => automation.id !== id),
    ]);
    setStatus(
      existing
        ? zh
          ? `已保存“${next.name.zh}”的全部运行配置。`
          : `All run settings for “${next.name.en}” were saved.`
        : zh
          ? `已创建“${next.name.zh}”，下一次运行时间已排定。`
          : `“${next.name.en}” was created and its next run is scheduled.`,
    );
    closeEditor();
  };

  const toggleAutomation = (id: string) => {
    const automation = automations.find((item) => item.id === id);
    if (!automation) return;
    const enabled = !automation.enabled;
    setAutomations((current) =>
      current.map((item) => (item.id === id ? { ...item, enabled } : item)),
    );
    setStatus(
      enabled
        ? zh
          ? `已启用“${automation.name.zh}”；后续调度将按原计划执行。`
          : `“${automation.name.en}” was enabled and will resume its schedule.`
        : zh
          ? `已暂停“${automation.name.zh}”；不会启动新的定时运行。`
          : `“${automation.name.en}” was paused and will not start new scheduled runs.`,
    );
  };

  const runAutomation = (id: string) => {
    const automation = automations.find((item) => item.id === id);
    if (!automation || runningAutomationIds.has(id)) {
      return;
    }
    const runId = `${id}-manual-${Date.now()}`;
    const runningRun: ProductAutomationRun = {
      automationId: id,
      effort: automation.effort,
      id: runId,
      input: `workspace=${automation.workspace}\nconnector=${automation.connector}\nmodel=${automation.model}\neffort=${automation.effort}\npermission=${automation.permission}\ntrigger=manual`,
      model: automation.model,
      name: { ...automation.name },
      output: {
        en: "Preparing the workspace and validating run permissions…",
        zh: "正在准备工作区并验证运行权限…",
      },
      permission: automation.permission,
      started: { en: "Just now", zh: "刚刚" },
      state: "running",
      steps: [
        {
          id: "context.read",
          label: {
            en: "Read bounded workspace context",
            zh: "读取限定工作区上下文",
          },
          state: "running",
        },
        {
          id: "automation.execute",
          label: { en: "Execute automation rule", zh: "执行自动化规则" },
          state: "pending",
        },
        {
          id: "evidence.archive",
          label: { en: "Archive run evidence", zh: "归档运行证据" },
          state: "pending",
        },
      ],
      summary: {
        en: "The manual run is reading its bounded context and validating available capabilities.",
        zh: "手动运行正在读取限定上下文，并验证所需能力是否可用。",
      },
      trigger: { en: "Manual run", zh: "手动运行" },
    };
    setRuns((current) => [runningRun, ...current]);
    setStatus(
      zh
        ? `“${automation.name.zh}”已开始运行，可在运行记录中继续跟踪。`
        : `“${automation.name.en}” started. Progress is available in Run history.`,
    );
    const timer = window.setTimeout(() => {
      setRuns((current) =>
        current.map((run) =>
          run.id === runId
            ? {
                ...run,
                output: {
                  en: "Run completed\nEvidence archived\nNo recovery action required",
                  zh: "运行完成\n证据已归档\n无需恢复操作",
                },
                state: "success",
                steps: [
                  {
                    durationMs: 800,
                    id: "context.read",
                    label: {
                      en: "Read bounded workspace context",
                      zh: "读取限定工作区上下文",
                    },
                    state: "success",
                  },
                  {
                    durationMs: 4_300,
                    id: "automation.execute",
                    label: {
                      en: "Execute automation rule",
                      zh: "执行自动化规则",
                    },
                    state: "success",
                  },
                  {
                    durationMs: 1_700,
                    id: "evidence.archive",
                    label: { en: "Archive run evidence", zh: "归档运行证据" },
                    state: "success",
                  },
                ],
                summary: {
                  en: "The manual run completed and archived its execution evidence.",
                  zh: "手动运行已完成，并归档了执行证据。",
                },
              }
            : run,
        ),
      );
      setStatus(
        zh
          ? `“${automation.name.zh}”运行成功，证据已归档。`
          : `“${automation.name.en}” succeeded and its evidence was archived.`,
      );
    }, 720);
    timers.current.push(timer);
  };

  const retryRun = (runId: string) => {
    const run = runs.find((item) => item.id === runId);
    if (!run || run.state !== "failed") return;
    setRuns((current) =>
      current.map((item) =>
        item.id === runId
          ? {
              ...item,
              output: {
                en: `Retrying from ${item.failedStep ?? "failed step"}…`,
                zh: `正在从 ${item.failedStep ?? "失败步骤"} 重试…`,
              },
              state: "running",
              steps: item.steps.map((step) =>
                step.id === item.failedStep
                  ? {
                      ...step,
                      detail: {
                        en: "Retry in progress",
                        zh: "正在重试",
                      },
                      durationMs: undefined,
                      state: "running",
                    }
                  : step,
              ),
              summary: {
                en: "The failed step is retrying. Completed steps remain preserved.",
                zh: "正在重试失败步骤，已完成步骤保持不变。",
              },
            }
          : item,
      ),
    );
    setStatus(
      zh ? "已从失败步骤开始重试。" : "Retry started from the failed step.",
    );
    const timer = window.setTimeout(() => {
      setRuns((current) =>
        current.map((item) =>
          item.id === runId
            ? (() => {
                const failedStep = item.failedStep;
                return {
                  ...item,
                  failedStep: undefined,
                  output: {
                    en: "Mobile preview connected\nEvidence archived\nRecovery complete",
                    zh: "移动端预览已连接\n证据已归档\n恢复完成",
                  },
                  state: "success" as const,
                  steps: item.steps.map((step) =>
                    step.id === failedStep
                      ? {
                          ...step,
                          detail: {
                            en: "Recovered without repeating completed steps",
                            zh: "未重复已完成步骤并恢复成功",
                          },
                          durationMs: 11_300,
                          state: "success" as const,
                        }
                      : step,
                  ),
                  summary: {
                    en: "The mobile preview reconnected and the recovered run completed without repeating prior steps.",
                    zh: "移动端预览已恢复连接，运行在不重复已完成步骤的前提下成功结束。",
                  },
                };
              })()
            : item,
        ),
      );
      setStatus(
        zh
          ? "重试成功，恢复证据已归档。"
          : "Retry succeeded and recovery evidence was archived.",
      );
    }, 760);
    timers.current.push(timer);
  };

  if (editor) {
    const existing = automations.find(
      (automation) => automation.id === editor.automationId,
    );
    return (
      <ProductAutomationBuilder
        initialDraft={existing}
        key={editor.automationId ?? editor.template?.label.en ?? "new"}
        locale={locale}
        onCancel={closeEditor}
        onSave={saveAutomation}
        template={editor.template}
      />
    );
  }

  return (
    <section
      className="product-automation"
      data-product-surface="automation"
      data-tab={tab}
    >
      <header>
        <div aria-label={zh ? "自动化视图" : "Automation view"} role="tablist">
          {(
            [
              ["scheduled", zh ? "自动化任务" : "Automations"],
              ["history", zh ? "运行记录" : "Run history"],
            ] as const
          ).map(([id, label]) => (
            <button
              aria-controls={`${tabId}-${id}-panel`}
              aria-selected={tab === id}
              id={`${tabId}-${id}-tab`}
              key={id}
              onClick={() => selectTab(id)}
              onKeyDown={(event) => handleTabKeyDown(event, id)}
              ref={(element) => {
                tabRefs.current[id] = element;
              }}
              role="tab"
              tabIndex={tab === id ? 0 : -1}
              type="button"
            >
              {label}
              {id === "history" && attentionCount > 0 ? (
                <small
                  aria-label={
                    zh ? `${attentionCount} 次失败` : `${attentionCount} failed`
                  }
                >
                  {attentionCount}
                </small>
              ) : null}
            </button>
          ))}
        </div>
        {tab === "scheduled" ? (
          <button
            data-new-automation
            data-primary
            onClick={() => openEditor({}, "[data-new-automation]")}
            type="button"
          >
            <ProductPlaygroundIcon name="plus" />
            {zh ? "新建自动化" : "New automation"}
          </button>
        ) : null}
      </header>

      {tab === "scheduled" ? (
        <div
          aria-labelledby={`${tabId}-scheduled-tab`}
          className="product-automation__scheduled"
          id={`${tabId}-scheduled-panel`}
          role="tabpanel"
          tabIndex={0}
        >
          <section className="product-automation__overview">
            <header>
              <div>
                <h1>{zh ? "自动化任务" : "Automations"}</h1>
                <p>
                  {zh
                    ? `${activeCount} 个已启用${attentionCount ? `，${attentionCount} 个需要处理` : ""}。每次运行都保留输入、步骤与恢复证据。`
                    : `${activeCount} enabled${attentionCount ? `, ${attentionCount} needs attention` : ""}. Every run retains inputs, steps, and recovery evidence.`}
                </p>
              </div>
              <span>
                <ProductPlaygroundIcon name="shield" />
                {zh
                  ? "高风险操作按次确认"
                  : "High-risk actions require confirmation"}
              </span>
            </header>
            <output
              aria-live="polite"
              className="product-automation__status-line"
            >
              {status}
            </output>
            <div
              aria-label={zh ? "自动化任务列表" : "Automation list"}
              role="list"
            >
              {automations.map((automation) => {
                const latestRun = runs.find(
                  (run) => run.automationId === automation.id,
                );
                const running = runningAutomationIds.has(automation.id);
                const state = running
                  ? "running"
                  : !automation.enabled
                    ? "paused"
                    : (latestRun?.state ?? "ready");
                return (
                  <article
                    data-automation-id={automation.id}
                    data-enabled={automation.enabled ? "true" : "false"}
                    data-state={state}
                    key={automation.id}
                    role="listitem"
                  >
                    <span data-automation-state={state}>
                      {state === "failed" ? (
                        <ProductPlaygroundIcon name="warning" />
                      ) : state === "running" ? (
                        <i />
                      ) : state === "paused" ? (
                        <ProductPlaygroundIcon name="pause" />
                      ) : (
                        <ProductPlaygroundIcon name="check" />
                      )}
                    </span>
                    <div data-automation-identity>
                      <strong>{automation.name[locale]}</strong>
                      <small>
                        {formatProductAutomationSchedule(
                          automation.schedule,
                          locale,
                        )}
                        {automation.workspace !== "none"
                          ? ` · ${automation.workspace}`
                          : ""}
                      </small>
                      <small data-automation-runtime>
                        {formatProductAutomationRuntime(automation, locale)}
                      </small>
                    </div>
                    <dl>
                      <div>
                        <dt>{zh ? "下次运行" : "Next run"}</dt>
                        <dd>
                          {automation.enabled
                            ? now
                              ? formatProductAutomationNextRun(
                                  automation.schedule,
                                  locale,
                                  now,
                                )
                              : zh
                                ? "正在计算…"
                                : "Calculating…"
                            : zh
                              ? "已暂停"
                              : "Paused"}
                        </dd>
                      </div>
                      <div>
                        <dt>{zh ? "最近结果" : "Last result"}</dt>
                        <dd data-state={latestRun?.state ?? "ready"}>
                          {latestRun
                            ? latestRun.state === "failed"
                              ? zh
                                ? "失败，需要处理"
                                : "Failed, action needed"
                              : latestRun.state === "running"
                                ? zh
                                  ? "运行中"
                                  : "Running"
                                : zh
                                  ? "成功"
                                  : "Succeeded"
                            : zh
                              ? "尚未运行"
                              : "Not run yet"}
                        </dd>
                      </div>
                    </dl>
                    <div data-automation-actions>
                      <button
                        aria-label={`${running ? (zh ? "运行中" : "Running") : zh ? "立即运行" : "Run now"} ${automation.name[locale]}`}
                        disabled={running}
                        onClick={() => runAutomation(automation.id)}
                        type="button"
                      >
                        <ProductPlaygroundIcon
                          name={running ? "update" : "play"}
                        />
                        {running
                          ? zh
                            ? "运行中"
                            : "Running"
                          : zh
                            ? "立即运行"
                            : "Run now"}
                      </button>
                      <button
                        aria-label={`${automation.enabled ? (zh ? "暂停" : "Pause") : zh ? "启用" : "Enable"} ${automation.name[locale]}`}
                        onClick={() => toggleAutomation(automation.id)}
                        type="button"
                      >
                        <ProductPlaygroundIcon
                          name={automation.enabled ? "pause" : "play"}
                        />
                        {automation.enabled
                          ? zh
                            ? "暂停"
                            : "Pause"
                          : zh
                            ? "启用"
                            : "Enable"}
                      </button>
                      <button
                        aria-label={`${zh ? "编辑" : "Edit"} ${automation.name[locale]}`}
                        data-edit-automation-id={automation.id}
                        onClick={() =>
                          openEditor(
                            { automationId: automation.id },
                            `[data-edit-automation-id="${automation.id}"]`,
                          )
                        }
                        type="button"
                      >
                        <ProductPlaygroundIcon name="edit" />
                        {zh ? "编辑" : "Edit"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="product-automation__templates">
            <header>
              <div>
                <h2>{zh ? "从模板开始" : "Start from a template"}</h2>
                <p>
                  {zh
                    ? "模板只预填任务意图；工作区、权限、调度与通知仍需确认。"
                    : "Templates prefill intent only; workspace, permissions, schedule, and notifications still require review."}
                </p>
              </div>
              <button
                onClick={() => setShowAllTemplates((value) => !value)}
                type="button"
              >
                {showAllTemplates
                  ? zh
                    ? "收起模板"
                    : "Show fewer"
                  : zh
                    ? `查看全部 ${automationTemplates.length} 个`
                    : `View all ${automationTemplates.length}`}
              </button>
            </header>
            <div>
              {visibleTemplates.map((template, index) => (
                <button
                  data-automation-template-index={index}
                  key={template.label.en}
                  onClick={() =>
                    openEditor(
                      { template },
                      `[data-automation-template-index="${index}"]`,
                    )
                  }
                  type="button"
                >
                  <ProductPlaygroundIcon name={template.icon} />
                  <span>
                    <strong>{template.label[locale]}</strong>
                    <small>{template.description[locale]}</small>
                  </span>
                  <ProductPlaygroundIcon name="arrow" />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div
          aria-labelledby={`${tabId}-history-tab`}
          id={`${tabId}-history-panel`}
          role="tabpanel"
          tabIndex={0}
        >
          <ProductAutomationRunHistory
            locale={locale}
            onRetry={retryRun}
            runs={runs}
          />
        </div>
      )}
    </section>
  );
}
