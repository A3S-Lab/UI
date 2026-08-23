import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import type { ProductSessionContextDetails } from "./ProductSessionInspector";
import type { ProductTaskArtifact } from "./product-task-session-state";

export function ProductSessionOverviewPanel({
  artifacts,
  contextDetails,
  created,
  id,
  locale,
  project,
}: {
  artifacts: readonly ProductTaskArtifact[];
  contextDetails?: ProductSessionContextDetails | null;
  created: boolean;
  id: string;
  locale: ProductPlaygroundLocale;
  project: boolean;
}) {
  const zh = locale === "zh";
  const details = contextDetails ?? {
    effort: zh ? "高" : "High",
    model: "A3S Pro",
    permissions: zh ? "默认权限" : "Default permissions",
    resources: zh ? "4 个上下文资源" : "4 context resources",
    workspace: project ? "A3S UI" : "a3s/packages/ui",
  };
  const steps = created
    ? [
        [zh ? "读取工作区上下文" : "Read workspace context", "complete"],
        [zh ? "确认影响范围" : "Confirm affected scope", "active"],
        [zh ? "实现并验证变更" : "Implement and verify", "pending"],
      ]
    : [
        [zh ? "复现并定位问题" : "Reproduce and locate issue", "complete"],
        [zh ? "修复恢复路径" : "Repair recovery path", "complete"],
        [zh ? "补充回归覆盖" : "Add regression coverage", "complete"],
      ];
  const completedSteps = created ? 1 : steps.length;
  const statusTitle = created
    ? zh
      ? "任务已就绪"
      : "Task is ready"
    : zh
      ? "任务已可审阅"
      : "Ready for review";
  const statusDescription = created
    ? zh
      ? "上下文、权限和首个执行计划已经保留。"
      : "Context, permissions, and the first execution plan are preserved."
    : zh
      ? "所有必需检查已通过，没有待处理审批。"
      : "Every required check passed with no pending approvals.";

  return (
    <section className="product-inspector-overview" id={id} role="tabpanel">
      <article
        className="product-inspector-overview__summary"
        data-state={created ? "ready" : "complete"}
      >
        <span data-overview-status-icon aria-hidden="true">
          <ProductPlaygroundIcon name={created ? "workspace" : "check"} />
        </span>
        <div>
          <strong>{statusTitle}</strong>
          <p>{statusDescription}</p>
        </div>
        <span
          className="status-badge"
          data-indicator=""
          data-size="sm"
          data-state={created ? "active" : "success"}
        >
          {created ? (zh ? "已准备" : "Ready") : zh ? "已验证" : "Verified"}
        </span>
      </article>
      <dl
        className="property-list product-inspector-overview__metrics"
        data-size="sm"
        data-variant="plain"
      >
        <div>
          <dt>{zh ? "变更" : "Changes"}</dt>
          <dd>{created ? "—" : "+42 −6"}</dd>
        </div>
        <div>
          <dt>{zh ? "检查" : "Checks"}</dt>
          <dd>{created ? "0 / 3" : "12 / 12"}</dd>
        </div>
        <div>
          <dt>{zh ? "产物" : "Artifacts"}</dt>
          <dd>{artifacts.length}</dd>
        </div>
      </dl>
      <section
        aria-labelledby={`${id}-plan-title`}
        className="task-plan product-inspector-overview__plan"
        data-state={created ? "active" : "complete"}
        data-variant="plain"
      >
        <header>
          <div>
            <h2 id={`${id}-plan-title`}>
              {zh ? "执行计划" : "Execution plan"}
            </h2>
            <p>
              {zh
                ? `${completedSteps} / ${steps.length} 个步骤已完成`
                : `${completedSteps} of ${steps.length} steps complete`}
            </p>
          </div>
          <span data-plan-status>
            {created
              ? zh
                ? "进行中"
                : "In progress"
              : zh
                ? "已完成"
                : "Complete"}
          </span>
        </header>
        <ol>
          {steps.map(([label, state], index) => (
            <li
              aria-current={state === "active" ? "step" : undefined}
              className="plan-step"
              data-state={state}
              key={label}
            >
              <span aria-hidden="true" data-plan-marker>
                {state === "complete" ? (
                  <ProductPlaygroundIcon name="check" />
                ) : (
                  index + 1
                )}
              </span>
              <div data-step-identity>
                <strong>{label}</strong>
              </div>
              <span data-plan-step-status>
                {state === "complete"
                  ? zh
                    ? "已完成"
                    : "Done"
                  : state === "active"
                    ? zh
                      ? "进行中"
                      : "In progress"
                    : zh
                      ? "待执行"
                      : "Pending"}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section
        aria-labelledby={`${id}-runtime-title`}
        className="product-inspector-overview__runtime"
      >
        <header>
          <h2 id={`${id}-runtime-title`}>
            {zh ? "运行配置" : "Run configuration"}
          </h2>
        </header>
        <dl
          className="property-list"
          data-layout="rows"
          data-size="sm"
          data-variant="plain"
        >
          <div>
            <dt>
              <ProductPlaygroundIcon name="folder" />
              {zh ? "工作区" : "Workspace"}
            </dt>
            <dd>{details.workspace}</dd>
          </div>
          <div>
            <dt>
              <ProductPlaygroundIcon name="model" />
              {zh ? "模型" : "Model"}
            </dt>
            <dd>{details.model}</dd>
          </div>
          <div>
            <dt>
              <ProductPlaygroundIcon name="brain" />
              {zh ? "努力程度" : "Effort"}
            </dt>
            <dd>{details.effort}</dd>
          </div>
          <div>
            <dt>
              <ProductPlaygroundIcon name="shield" />
              {zh ? "权限" : "Permissions"}
            </dt>
            <dd>{details.permissions}</dd>
          </div>
          <div>
            <dt>
              <ProductPlaygroundIcon name="link" />
              {zh ? "上下文" : "Context"}
            </dt>
            <dd>{details.resources}</dd>
          </div>
        </dl>
      </section>
    </section>
  );
}
