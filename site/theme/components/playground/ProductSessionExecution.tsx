import { useEffect, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import type {
  ProductSessionContextDetails,
  ProductSessionInspectorTab,
} from "./ProductSessionInspector";

export function ProductSessionExecution({
  contextDetails,
  created,
  locale,
  onOpenInspector,
}: {
  contextDetails?: ProductSessionContextDetails | null;
  created: boolean;
  locale: ProductPlaygroundLocale;
  onOpenInspector: (
    tab: ProductSessionInspectorTab,
    returnFocus?: HTMLElement,
  ) => void;
}) {
  const zh = locale === "zh";
  const [permission, setPermission] = useState<
    "approved" | "denied" | "pending"
  >("approved");
  const [copied, setCopied] = useState(false);

  const steps = created
    ? [
        {
          label: zh
            ? "读取工作区与任务上下文"
            : "Read workspace and task context",
          state: "complete",
        },
        {
          label: zh
            ? "确认受影响的文件与交互"
            : "Confirm affected files and interactions",
          state: "active",
        },
        {
          label: zh
            ? "实现变更并运行验证"
            : "Implement changes and run verification",
          state: "pending",
        },
      ]
    : [
        {
          label: zh ? "复现登录恢复问题" : "Reproduce sign-in recovery issue",
          state: "complete",
        },
        {
          label: zh ? "修复路由与焦点恢复" : "Repair route and focus recovery",
          state: "complete",
        },
        {
          label: zh
            ? "补充回归测试并验收"
            : "Add regression coverage and verify",
          state: "complete",
        },
      ];

  if (created) {
    return (
      <div className="product-session-execution" data-created>
        {contextDetails ? (
          <ContextReceipt context={contextDetails} locale={locale} />
        ) : null}
        <ExecutionPlan created locale={locale} steps={steps} />
        <section className="product-session-next-action">
          <span>
            <ProductPlaygroundIcon name="search" />
          </span>
          <div>
            <strong>
              {zh ? "正在建立变更边界" : "Mapping the change boundary"}
            </strong>
            <p>
              {zh
                ? "下一步会先读取相关文件和设计约束，再决定实现路径。"
                : "The next step reads relevant files and design constraints before choosing an implementation path."}
            </p>
          </div>
          <i aria-hidden="true" />
        </section>
      </div>
    );
  }

  return (
    <div className="product-session-execution">
      <ExecutionPlan created={false} locale={locale} steps={steps} />
      <DeliverySummary locale={locale} onOpenInspector={onOpenInspector} />

      <details className="product-session-reasoning">
        <summary>
          <span>
            <ProductPlaygroundIcon name="brain" />
          </span>
          <div>
            <strong>{zh ? "查看分析过程" : "Review analysis"}</strong>
            <small>
              {zh
                ? "定位恢复状态的清理顺序"
                : "Located recovery-state cleanup ordering"}
            </small>
          </div>
          <ProductPlaygroundIcon name="chevron" />
        </summary>
        <p>
          {zh
            ? "失败分支在重定向前清除了恢复目标，并且焦点恢复依赖已经被卸载的触发控件。修复需要先保留稳定的返回路径，再在导航提交后恢复焦点。"
            : "The failure branch cleared the recovery target before redirecting, while focus restoration depended on an unmounted trigger. The fix preserves a stable return path and restores focus after navigation commits."}
        </p>
      </details>

      <section
        className="product-tool-timeline"
        aria-label={zh ? "工具调用时间线" : "Tool-call timeline"}
      >
        <header>
          <div>
            <ProductPlaygroundIcon name="automation" />
            <strong>{zh ? "执行记录" : "Execution record"}</strong>
          </div>
          <small>{zh ? "4 步 · 4.8 秒" : "4 steps · 4.8s"}</small>
        </header>
        <ol>
          <li data-state="complete">
            <details>
              <summary>
                <span data-state-icon>
                  <ProductPlaygroundIcon name="search" />
                </span>
                <span>
                  <strong>
                    {zh ? "检查会话恢复路径" : "Inspect recovery path"}
                  </strong>
                  <small>src/auth/session.ts · src/routes/sign-in.tsx</small>
                </span>
                <em>{zh ? "已完成" : "Complete"}</em>
                <ProductPlaygroundIcon name="chevron" />
              </summary>
              <div className="product-tool-timeline__detail">
                <dl>
                  <div>
                    <dt>{zh ? "操作" : "Action"}</dt>
                    <dd>
                      {zh
                        ? "读取 2 个源文件和 1 个测试文件"
                        : "Read 2 source files and 1 test file"}
                    </dd>
                  </div>
                  <div>
                    <dt>{zh ? "发现" : "Finding"}</dt>
                    <dd>
                      {zh
                        ? "失败分支过早清除了返回路径"
                        : "The failure branch cleared the return path too early"}
                    </dd>
                  </div>
                </dl>
              </div>
            </details>
          </li>
          <li data-state="complete">
            <details open>
              <summary>
                <span data-state-icon>
                  <ProductPlaygroundIcon name="edit" />
                </span>
                <span>
                  <strong>
                    {zh ? "更新恢复实现" : "Update recovery implementation"}
                  </strong>
                  <small>src/auth/session.ts</small>
                </span>
                <em>+18 −6</em>
                <ProductPlaygroundIcon name="chevron" />
              </summary>
              <div className="product-tool-diff-preview">
                <header>
                  <strong>src/auth/session.ts</strong>
                  <button
                    onClick={(event) =>
                      onOpenInspector("files", event.currentTarget)
                    }
                    type="button"
                  >
                    {zh ? "查看完整差异" : "Open full diff"}
                    <ProductPlaygroundIcon name="arrow" />
                  </button>
                </header>
                <pre aria-label={zh ? "代码差异预览" : "Code diff preview"}>
                  <code>
                    <span data-removed>− const target = session.returnTo;</span>
                    <span data-added>
                      + const target = normalizeReturnPath(returnTo);
                    </span>
                    <span> await refreshSessionToken();</span>
                    <span data-added>+ navigate(target);</span>
                    <span data-added>+ restoreTriggerFocus();</span>
                  </code>
                </pre>
              </div>
            </details>
          </li>
          <li data-state={permission === "denied" ? "blocked" : "complete"}>
            <details open={permission === "pending"}>
              <summary>
                <span data-state-icon>
                  <ProductPlaygroundIcon name="shield" />
                </span>
                <span>
                  <strong>
                    {zh ? "确认运行工作区测试" : "Confirm workspace test run"}
                  </strong>
                  <small>npm test -- session</small>
                </span>
                <em>
                  {permission === "approved"
                    ? zh
                      ? "已允许"
                      : "Approved"
                    : permission === "denied"
                      ? zh
                        ? "已拒绝"
                        : "Denied"
                      : zh
                        ? "待确认"
                        : "Approval needed"}
                </em>
                <ProductPlaygroundIcon name="chevron" />
              </summary>
              <PermissionDecision
                locale={locale}
                onChange={setPermission}
                state={permission}
              />
            </details>
          </li>
          <li data-state={permission === "approved" ? "complete" : "pending"}>
            <details>
              <summary>
                <span data-state-icon>
                  <ProductPlaygroundIcon name="check" />
                </span>
                <span>
                  <strong>
                    {zh ? "运行回归测试" : "Run regression tests"}
                  </strong>
                  <small>12 passed · 0 failed</small>
                </span>
                <em>
                  {permission === "approved"
                    ? zh
                      ? "通过"
                      : "Passed"
                    : zh
                      ? "等待"
                      : "Waiting"}
                </em>
                <ProductPlaygroundIcon name="chevron" />
              </summary>
              <div className="product-command-preview">
                <header>
                  <span>
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>{zh ? "终端" : "Terminal"}</strong>
                  <button
                    aria-label={zh ? "复制命令" : "Copy command"}
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        "npm test -- session",
                      );
                      setCopied(true);
                    }}
                    type="button"
                  >
                    <ProductPlaygroundIcon name={copied ? "check" : "copy"} />
                  </button>
                </header>
                <pre>
                  <code>
                    <span>$ npm test -- session</span>
                    {"\n"}
                    <b>PASS</b> tests/session.test.ts{"\n"} ✓ restores focus
                    after refresh failure{"\n"} ✓ preserves return route{"\n"} ✓
                    announces recovery state{"\n\n"}
                    <strong>Tests: 12 passed, 12 total</strong>
                  </code>
                </pre>
              </div>
            </details>
          </li>
        </ol>
      </section>

      <section
        className="product-runtime-agents"
        aria-label={zh ? "并行检查" : "Parallel checks"}
      >
        <header>
          <div>
            <ProductPlaygroundIcon name="project" />
            <strong>{zh ? "并行检查" : "Parallel checks"}</strong>
          </div>
          <small>{zh ? "2 个检查已完成" : "2 checks complete"}</small>
        </header>
        <ul>
          <li>
            <span>
              <ProductPlaygroundIcon name="check" />
            </span>
            <div>
              <strong>{zh ? "回归覆盖检查" : "Regression coverage"}</strong>
              <small>
                {zh ? "测试审阅 · 已完成" : "Test review · Complete"}
              </small>
            </div>
            <time>00:03</time>
          </li>
          <li>
            <span>
              <ProductPlaygroundIcon name="check" />
            </span>
            <div>
              <strong>{zh ? "键盘焦点复核" : "Keyboard focus review"}</strong>
              <small>
                {zh ? "无障碍检查 · 已完成" : "Accessibility check · Complete"}
              </small>
            </div>
            <time>00:02</time>
          </li>
        </ul>
      </section>
    </div>
  );
}

function DeliverySummary({
  locale,
  onOpenInspector,
}: {
  locale: ProductPlaygroundLocale;
  onOpenInspector: (
    tab: ProductSessionInspectorTab,
    returnFocus?: HTMLElement,
  ) => void;
}) {
  const zh = locale === "zh";
  return (
    <section
      className="product-delivery-summary"
      aria-label={zh ? "任务交付摘要" : "Delivery summary"}
    >
      <header>
        <span>
          <ProductPlaygroundIcon name="check" />
        </span>
        <div>
          <small>{zh ? "交付状态" : "Delivery status"}</small>
          <strong>{zh ? "任务已可审阅" : "Task is ready for review"}</strong>
        </div>
        <em>{zh ? "已验证" : "Verified"}</em>
      </header>
      <div
        className="product-delivery-summary__progress"
        role="progressbar"
        aria-label={zh ? "交付检查完成度" : "Delivery checks completed"}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={100}
      >
        <span />
      </div>
      <dl>
        <div>
          <dt>12</dt>
          <dd>{zh ? "已通过" : "Passed"}</dd>
        </div>
        <div>
          <dt>0</dt>
          <dd>{zh ? "待检查" : "Pending"}</dd>
        </div>
        <div>
          <dt>0</dt>
          <dd>{zh ? "失败" : "Failed"}</dd>
        </div>
        <div>
          <dt>0</dt>
          <dd>{zh ? "风险" : "Risks"}</dd>
        </div>
      </dl>
      <footer>
        <p>
          {zh
            ? "路由、焦点与状态公告均有可追溯证据。"
            : "Routing, focus, and status announcements all have traceable evidence."}
        </p>
        <div>
          <button
            onClick={(event) =>
              onOpenInspector("artifacts", event.currentTarget)
            }
            type="button"
          >
            <ProductPlaygroundIcon name="document" />
            {zh ? "产物" : "Artifacts"}
          </button>
          <button
            onClick={(event) => onOpenInspector("files", event.currentTarget)}
            type="button"
          >
            <ProductPlaygroundIcon name="files" />
            {zh ? "文件差异" : "File diff"}
          </button>
          <button
            data-primary
            onClick={(event) =>
              onOpenInspector("preview", event.currentTarget)
            }
            type="button"
          >
            <ProductPlaygroundIcon name="eye" />
            {zh ? "设备预览" : "Device preview"}
          </button>
          <button
            onClick={(event) => onOpenInspector("graph", event.currentTarget)}
            type="button"
          >
            <ProductPlaygroundIcon name="project" />
            {zh ? "代码图谱" : "Code graph"}
          </button>
        </div>
      </footer>
    </section>
  );
}

function ContextReceipt({
  context,
  locale,
}: {
  context: ProductSessionContextDetails;
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  return (
    <details className="product-session-context" open>
      <summary>
        <span>
          <ProductPlaygroundIcon name="workspace" />
        </span>
        <div>
          <strong>{zh ? "任务上下文已准备" : "Task context ready"}</strong>
          <small>{context.workspace}</small>
        </div>
        <em>{zh ? "就绪" : "Ready"}</em>
        <ProductPlaygroundIcon name="chevron" />
      </summary>
      <dl>
        <div>
          <dt>{zh ? "工作区" : "Workspace"}</dt>
          <dd>{context.workspace}</dd>
        </div>
        <div>
          <dt>{zh ? "模型" : "Model"}</dt>
          <dd>{context.model}</dd>
        </div>
        <div>
          <dt>{zh ? "模式" : "Mode"}</dt>
          <dd>{context.mode}</dd>
        </div>
        <div>
          <dt>{zh ? "努力程度" : "Effort"}</dt>
          <dd>{context.effort}</dd>
        </div>
        <div>
          <dt>{zh ? "权限" : "Permissions"}</dt>
          <dd>{context.permissions}</dd>
        </div>
        <div>
          <dt>{zh ? "资源" : "Resources"}</dt>
          <dd>{context.resources}</dd>
        </div>
      </dl>
    </details>
  );
}

function ExecutionPlan({
  created,
  locale,
  steps,
}: {
  created: boolean;
  locale: ProductPlaygroundLocale;
  steps: readonly { label: string; state: string }[];
}) {
  const zh = locale === "zh";
  const [expanded, setExpanded] = useState(created);

  useEffect(() => {
    setExpanded(created);
  }, [created]);

  return (
    <details
      className="product-execution-plan"
      data-state={created ? "active" : "complete"}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      open={expanded}
    >
      <summary>
        <div>
          <ProductPlaygroundIcon name="checklist" />
          <strong>{zh ? "计划" : "Plan"}</strong>
        </div>
        <span>
          <small>
            {created
              ? zh
                ? "1 / 3 进行中"
                : "1 / 3 in progress"
              : zh
                ? "3 / 3 已完成"
                : "3 / 3 complete"}
          </small>
          <ProductPlaygroundIcon data-plan-disclosure name="chevron" />
        </span>
      </summary>
      <ol>
        {steps.map((step) => (
          <li data-state={step.state} key={step.label}>
            <span>
              {step.state === "complete" ? (
                <ProductPlaygroundIcon name="check" />
              ) : step.state === "active" ? (
                <i />
              ) : null}
            </span>
            <strong>{step.label}</strong>
          </li>
        ))}
      </ol>
    </details>
  );
}

function PermissionDecision({
  locale,
  onChange,
  state,
}: {
  locale: ProductPlaygroundLocale;
  onChange: (state: "approved" | "denied" | "pending") => void;
  state: "approved" | "denied" | "pending";
}) {
  const zh = locale === "zh";
  return (
    <section className="product-permission-decision">
      <header>
        <span>
          <ProductPlaygroundIcon name="warning" />
        </span>
        <div>
          <strong>{zh ? "需要你的确认" : "Your approval is required"}</strong>
          <small>
            {zh ? "只影响当前这一次操作" : "Applies only to this operation"}
          </small>
        </div>
      </header>
      <dl>
        <div>
          <dt>{zh ? "即将执行" : "Action"}</dt>
          <dd>
            <code>npm test -- session</code>
          </dd>
        </div>
        <div>
          <dt>{zh ? "为什么需要" : "Reason"}</dt>
          <dd>
            {zh
              ? "命令会启动本地测试进程并读取当前工作区。"
              : "The command starts a local test process and reads the current workspace."}
          </dd>
        </div>
        <div>
          <dt>{zh ? "影响范围" : "Scope"}</dt>
          <dd>
            {zh
              ? "当前任务工作区，不写入工作区外部。"
              : "Current task workspace; no writes outside it."}
          </dd>
        </div>
      </dl>
      {state === "pending" ? (
        <footer>
          <button onClick={() => onChange("denied")} type="button">
            {zh ? "拒绝" : "Deny"}
          </button>
          <button
            data-primary
            onClick={() => onChange("approved")}
            type="button"
          >
            {zh ? "允许一次" : "Allow once"}
          </button>
        </footer>
      ) : (
        <output data-state={state}>
          <ProductPlaygroundIcon
            name={state === "approved" ? "check" : "stop"}
          />
          {state === "approved"
            ? zh
              ? "已允许一次，操作已继续执行。"
              : "Allowed once. The operation continued."
            : zh
              ? "已拒绝，本次操作不会执行。"
              : "Denied. The operation will not run."}
          <button onClick={() => onChange("pending")} type="button">
            {zh ? "重新演示" : "Try decision again"}
          </button>
        </output>
      )}
    </section>
  );
}
