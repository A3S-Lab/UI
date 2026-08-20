import { useEffect, useId, useRef } from "react";
import type {
  ProductCapabilityTab,
  ProductPlaygroundLocale,
} from "./product-playground-data";
import {
  capabilityKindLabel,
  capabilityPermissionLabels,
  capabilitySourceLabel,
  capabilitySourceTitle,
  defaultCapabilityPermissions,
} from "./product-capability-copy";
import type {
  ProductCapabilityDefinition,
  ProductCapabilityPreference,
} from "./product-capability-state";
import {
  capabilityVisualTone,
  ProductCapabilityMark,
} from "./ProductCapabilityMark";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

function lifecycleLabel(
  lifecycle: ProductCapabilityPreference["lifecycle"],
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (lifecycle === "ready") return zh ? "可用于任务" : "Ready for tasks";
  if (lifecycle === "disabled") return zh ? "已停用" : "Disabled";
  if (lifecycle === "attention") return zh ? "需要处理" : "Needs attention";
  return zh ? "尚未配置" : "Not configured";
}

function setupActionLabel(
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (tab === "assistants") return zh ? "配置专家" : "Configure assistant";
  if (tab === "skills") return zh ? "审查并安装" : "Review and install";
  return zh ? "设置连接" : "Set up connection";
}

function removalActionLabel(
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (tab === "connectors") return zh ? "断开连接" : "Disconnect";
  if (tab === "skills") return zh ? "卸载技能" : "Uninstall skill";
  return zh ? "移除专家" : "Remove assistant";
}

type ProductCapabilityDetailProps = {
  definition: ProductCapabilityDefinition;
  locale: ProductPlaygroundLocale;
  onDisable: () => void;
  onEnable: () => void;
  onRemove: (origin: HTMLButtonElement) => void;
  onRetry: () => void;
  onSetup: (origin: HTMLButtonElement) => void;
  onUse: () => void;
  preference: ProductCapabilityPreference;
  retrying?: boolean;
};

function ProductCapabilityDetail({
  definition,
  locale,
  onDisable,
  onEnable,
  onRemove,
  onRetry,
  onSetup,
  onUse,
  preference,
  retrying = false,
}: ProductCapabilityDetailProps) {
  const zh = locale === "zh";
  const lifecycle = preference.lifecycle;
  const permissions = capabilityPermissionLabels(definition.tab, locale);
  const permissionFlags =
    preference.permissions ?? defaultCapabilityPermissions();
  const allowedPermissions = permissions.filter(
    (_, index) => permissionFlags[index] ?? false,
  );
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const previousStateRef = useRef({ id: definition.id, lifecycle });

  useEffect(() => {
    const previous = previousStateRef.current;
    previousStateRef.current = { id: definition.id, lifecycle };
    if (previous.id !== definition.id || previous.lifecycle === lifecycle)
      return;
    window.requestAnimationFrame(() => primaryActionRef.current?.focus());
  }, [definition.id, lifecycle]);

  return (
    <aside
      aria-label={zh ? "能力详情" : "Capability details"}
      className="product-capability-detail"
      data-capability-detail
      data-capability-tone={capabilityVisualTone(definition.id)}
      data-lifecycle={lifecycle}
    >
      <header>
        <span data-capability-mark>
          <ProductCapabilityMark definition={definition} />
        </span>
        <span>
          <small>{capabilityKindLabel(definition.tab, locale)}</small>
          <h2>{definition.label[locale]}</h2>
        </span>
        <em data-capability-state={lifecycle}>
          {lifecycleLabel(lifecycle, locale)}
        </em>
      </header>
      <p>{preference.description ?? definition.description[locale]}</p>

      {lifecycle === "attention" ? (
        <div
          aria-busy={retrying || undefined}
          className="product-capability-detail__attention"
          role="status"
        >
          <ProductPlaygroundIcon name="warning" />
          <span>
            <strong>
              {zh ? "授权状态需要重新确认" : "Authorization needs review"}
            </strong>
            <small>
              {retrying
                ? zh
                  ? "正在重新验证地址、授权范围与宿主状态。"
                  : "Rechecking the address, authorization scope, and host state."
                : zh
                  ? "现有任务记录保持可读；恢复前不会把该能力附加到新任务。"
                  : "Existing task history remains readable; new tasks cannot attach it until recovery."}
            </small>
          </span>
          <button disabled={retrying} onClick={onRetry} type="button">
            {retrying
              ? zh
                ? "检查中…"
                : "Checking…"
              : zh
                ? "重新检查"
                : "Check again"}
          </button>
        </div>
      ) : null}

      <dl>
        <div>
          <dt>{capabilitySourceTitle(definition.tab, locale)}</dt>
          <dd>{capabilitySourceLabel(definition, preference, locale)}</dd>
        </div>
        <div>
          <dt>{zh ? "作用范围" : "Scope"}</dt>
          <dd>
            {preference.scope === "all-workspaces"
              ? zh
                ? "所有工作区"
                : "All workspaces"
              : zh
                ? "当前工作区"
                : "Current workspace"}
          </dd>
        </div>
        <div>
          <dt>{zh ? "分类" : "Category"}</dt>
          <dd>{definition.tag[locale]}</dd>
        </div>
      </dl>

      <section aria-labelledby={`capability-permissions-${definition.id}`}>
        <h3 id={`capability-permissions-${definition.id}`}>
          {lifecycle === "available"
            ? zh
              ? "建议允许的操作"
              : "Proposed operations"
            : zh
              ? "已允许的操作"
              : "Allowed operations"}
        </h3>
        <ul>
          {allowedPermissions.map((permission) => (
            <li key={permission}>
              <ProductPlaygroundIcon name="check" />
              {permission}
            </li>
          ))}
        </ul>
        {definition.tab === "connectors" ? (
          <p className="product-capability-detail__guardrail">
            <ProductPlaygroundIcon name="shield" />
            {zh
              ? "凭据始终由宿主保管，任何写操作仍需再次确认。"
              : "Credentials remain host-managed, and every write still requires confirmation."}
          </p>
        ) : null}
      </section>

      <footer>
        {lifecycle === "available" ? (
          <button
            data-primary
            onClick={(event) => onSetup(event.currentTarget)}
            ref={primaryActionRef}
            type="button"
          >
            {setupActionLabel(definition.tab, locale)}
          </button>
        ) : lifecycle === "disabled" ? (
          <button
            data-primary
            onClick={onEnable}
            ref={primaryActionRef}
            type="button"
          >
            {zh ? "重新启用" : "Enable"}
          </button>
        ) : (
          <button
            data-primary
            disabled={lifecycle !== "ready"}
            onClick={onUse}
            ref={primaryActionRef}
            type="button"
          >
            {zh ? "用于新任务" : "Use in new task"}
          </button>
        )}
        {lifecycle !== "available" ? (
          <button
            onClick={(event) => onSetup(event.currentTarget)}
            type="button"
          >
            {zh ? "查看设置" : "Review settings"}
          </button>
        ) : null}
        {lifecycle === "ready" ? (
          <button onClick={onDisable} type="button">
            {zh ? "停用" : "Disable"}
          </button>
        ) : null}
        {lifecycle !== "available" ? (
          <button
            data-danger
            onClick={(event) => onRemove(event.currentTarget)}
            type="button"
          >
            {removalActionLabel(definition.tab, locale)}
          </button>
        ) : null}
      </footer>
    </aside>
  );
}

export function ProductCapabilityDetailDialog({
  onClose,
  ...detailProps
}: ProductCapabilityDetailProps & { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const zh = detailProps.locale === "zh";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      aria-label={
        zh
          ? `${detailProps.definition.label.zh}详情`
          : `${detailProps.definition.label.en} details`
      }
      className="product-capability-detail-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={dialogRef}
    >
      <div>
        <button
          aria-label={zh ? "关闭能力详情" : "Close capability details"}
          data-capability-detail-close
          onClick={onClose}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
        <ProductCapabilityDetail {...detailProps} />
      </div>
    </dialog>
  );
}

export function ProductCapabilityRemoveDialog({
  definition,
  locale,
  onCancel,
  onConfirm,
}: {
  definition: ProductCapabilityDefinition;
  locale: ProductPlaygroundLocale;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const zh = locale === "zh";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const descriptionId = useId();
  const action = removalActionLabel(definition.tab, locale);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-label={action}
      className="product-capability-remove"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      ref={dialogRef}
    >
      <form method="dialog" onSubmit={(event) => event.preventDefault()}>
        <span data-danger-mark>
          <ProductPlaygroundIcon name="warning" />
        </span>
        <h2>{action}</h2>
        <p id={descriptionId}>
          {zh
            ? `“${definition.label.zh}”将不再用于新任务。已有任务、运行记录与证据仍会保留。`
            : `${definition.label.en} will no longer be available to new tasks. Existing task history, runs, and evidence remain available.`}
        </p>
        <footer>
          <button autoFocus onClick={onCancel} type="button">
            {zh ? "取消" : "Cancel"}
          </button>
          <button data-danger onClick={onConfirm} type="button">
            {action}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
