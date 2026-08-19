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
    workspace: project ? "A3S UI" : "a3s/apps/web",
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

  return (
    <section className="product-inspector-overview" id={id} role="tabpanel">
      <article
        className="product-inspector-overview__summary"
        data-state={created ? "ready" : "complete"}
      >
        <span>
          <ProductPlaygroundIcon name={created ? "workspace" : "check"} />
        </span>
        <div>
          <small>
            {created
              ? zh
                ? "当前状态"
                : "Current state"
              : zh
                ? "交付状态"
                : "Delivery status"}
          </small>
          <strong>
            {created
              ? zh
                ? "任务已就绪"
                : "Task is ready"
              : zh
                ? "任务已可审阅"
                : "Ready for review"}
          </strong>
          <p>
            {created
              ? zh
                ? "上下文、权限和首个执行计划已经保留。"
                : "Context, permissions, and the first execution plan are preserved."
              : zh
                ? "所有必需检查已通过，没有待处理审批。"
                : "Every required check passed with no pending approvals."}
          </p>
        </div>
      </article>
      <dl className="product-inspector-overview__metrics">
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
      <section className="product-inspector-overview__plan">
        <header>
          <strong>{zh ? "执行计划" : "Execution plan"}</strong>
          <small>
            {created
              ? zh
                ? "1 / 3 进行中"
                : "1 / 3 in progress"
              : zh
                ? "3 / 3 已完成"
                : "3 / 3 complete"}
          </small>
        </header>
        <ol>
          {steps.map(([label, state]) => (
            <li data-state={state} key={label}>
              <span>
                {state === "complete" ? (
                  <ProductPlaygroundIcon name="check" />
                ) : state === "active" ? (
                  <i />
                ) : null}
              </span>
              <strong>{label}</strong>
              <small>
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
              </small>
            </li>
          ))}
        </ol>
      </section>
      <section className="product-inspector-overview__runtime">
        <header>
          <strong>{zh ? "运行配置" : "Run configuration"}</strong>
        </header>
        <dl>
          <div>
            <dt>
              <ProductPlaygroundIcon name="folder" />
              {zh ? "工作区" : "Workspace"}
            </dt>
            <dd>{details.workspace}</dd>
          </div>
          <div>
            <dt>
              <ProductPlaygroundIcon name="assistant" />
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
