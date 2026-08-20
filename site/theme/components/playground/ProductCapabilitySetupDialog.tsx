import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  ProductCapabilityCategory,
  ProductCapabilityTab,
  ProductPlaygroundLocale,
} from "./product-playground-data";
import {
  capabilityPermissionLabels,
  defaultCapabilityPermissions,
} from "./product-capability-copy";
import type {
  ProductCapabilityDefinition,
  ProductCapabilityPreference,
  ProductCapabilityScope,
} from "./product-capability-state";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export type ProductCapabilitySetupResult = {
  category: ProductCapabilityCategory;
  description: string;
  label: string;
  permissions: boolean[];
  scope: ProductCapabilityScope;
  source: string;
  tag: string;
};

type ProductCapabilitySetupField =
  | "connection"
  | "description"
  | "label"
  | "permissions"
  | "source";

type ProductCapabilitySetupError = {
  field: ProductCapabilitySetupField;
  message: string;
};

function defaultSource(
  definition: ProductCapabilityDefinition | undefined,
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (definition?.source) return definition.source;
  if (tab === "assistants") {
    return zh
      ? "遵循工作区说明，并在修改前说明范围。"
      : "Follow workspace instructions and state the scope before edits.";
  }
  if (definition) {
    const identifier = definition.id.split(":").slice(1).join(":");
    return tab === "skills"
      ? `a3s://skills/${identifier}`
      : `host://connectors/${identifier}`;
  }
  return "";
}

function setupTitle(
  custom: boolean,
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (tab === "assistants") {
    if (custom) return zh ? "创建专家" : "Create assistant";
    return zh ? "配置专家" : "Configure assistant";
  }
  if (tab === "skills") {
    if (custom) return zh ? "从来源添加技能" : "Add skill from source";
    return zh ? "审查技能" : "Review skill";
  }
  if (custom) return zh ? "自定义连接器" : "Custom connector";
  return zh ? "设置连接器" : "Set up connector";
}

export function ProductCapabilitySetupDialog({
  definition,
  initialPreference,
  locale,
  onCancel,
  onSave,
  tab,
}: {
  definition?: ProductCapabilityDefinition;
  initialPreference?: ProductCapabilityPreference;
  locale: ProductPlaygroundLocale;
  onCancel: () => void;
  onSave: (result: ProductCapabilitySetupResult) => void;
  tab: ProductCapabilityTab;
}) {
  const zh = locale === "zh";
  const custom = !definition;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const labelRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const sourceRef = useRef<HTMLInputElement>(null);
  const firstPermissionRef = useRef<HTMLInputElement>(null);
  const connectionButtonRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const errorId = useId();
  const connectionFeedbackId = useId();
  const permissionOptions = useMemo(
    () => capabilityPermissionLabels(tab, locale),
    [locale, tab],
  );
  const initialSource =
    initialPreference?.source ?? defaultSource(definition, tab, locale);
  const [label, setLabel] = useState(definition?.label[locale] ?? "");
  const [description, setDescription] = useState(
    initialPreference?.description ?? definition?.description[locale] ?? "",
  );
  const [source, setSource] = useState(initialSource);
  const [scope, setScope] = useState<ProductCapabilityScope>(
    initialPreference?.scope ?? "current-workspace",
  );
  const [permissions, setPermissions] = useState(() => {
    const defaults = defaultCapabilityPermissions();
    return permissionOptions.map(
      (_, index) => initialPreference?.permissions?.[index] ?? defaults[index] ?? false,
    );
  });
  const [error, setError] = useState<ProductCapabilitySetupError | null>(null);
  const [testState, setTestState] = useState<
    "checking" | "failed" | "idle" | "passed"
  >(
    tab === "connectors"
      ? initialPreference?.lifecycle === "ready" && Boolean(initialSource)
        ? "passed"
        : "idle"
      : "passed",
  );
  const title = setupTitle(custom, tab, locale);
  const descriptionEditable = custom || tab === "assistants";
  const sourceReadOnly = !custom && tab === "skills";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (dialog.open) dialog.close();
    };
  }, []);

  const clearError = (field: ProductCapabilitySetupField) => {
    setError((current) => (current?.field === field ? null : current));
  };

  const invalidateConnectionCheck = () => {
    if (tab !== "connectors") return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    setTestState("idle");
    clearError("connection");
  };

  const reportError = (
    field: ProductCapabilitySetupField,
    message: string,
  ) => {
    setError({ field, message });
    window.requestAnimationFrame(() => {
      const target =
        field === "label"
          ? labelRef.current
          : field === "description"
            ? descriptionRef.current
            : field === "source"
              ? sourceRef.current
              : field === "permissions"
                ? firstPermissionRef.current
                : connectionButtonRef.current;
      target?.focus();
    });
    return false;
  };

  const validate = () => {
    if (custom && label.trim().length < 2) {
      return reportError(
        "label",
        zh
          ? "名称至少需要 2 个字符。"
          : "Enter at least 2 characters for the name.",
      );
    }
    if (description.trim().length < 8) {
      return reportError(
        "description",
        zh
          ? "请说明该能力负责什么，至少 8 个字符。"
          : "Describe the capability's job in at least 8 characters.",
      );
    }
    if (!source.trim()) {
      return reportError(
        "source",
        tab === "assistants"
          ? zh
            ? "请填写运行说明。"
            : "Add runtime instructions."
          : tab === "skills"
            ? zh
              ? "请填写包或仓库来源。"
              : "Add a package or repository source."
            : zh
              ? "请填写连接地址。"
              : "Add a connection address.",
      );
    }
    if (!permissions.some(Boolean)) {
      return reportError(
        "permissions",
        zh ? "至少选择一项允许范围。" : "Select at least one allowed operation.",
      );
    }
    if (tab === "connectors" && testState !== "passed") {
      return reportError(
        "connection",
        zh
          ? "保存前请先检查当前连接设置。"
          : "Check the current connection settings before saving.",
      );
    }
    setError(null);
    return true;
  };

  const testConnection = () => {
    const address = source.trim();
    if (!address) {
      reportError(
        "source",
        zh ? "请先填写连接地址。" : "Enter a connection address first.",
      );
      return;
    }
    try {
      new URL(address);
    } catch {
      setTestState("failed");
      reportError(
        "connection",
        zh
          ? "连接地址格式无效，请输入包含协议的完整地址。"
          : "Enter a complete connection address, including its protocol.",
      );
      return;
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setError(null);
    setTestState("checking");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined;
      const unavailable = /(?:\.invalid|unavailable|fail)/iu.test(address);
      setTestState(unavailable ? "failed" : "passed");
      setError(
        unavailable
          ? {
              field: "connection",
              message: zh
                ? "无法验证该地址。请修正地址或凭据后重试；已填写内容会保留。"
                : "The address could not be verified. Correct the address or credentials and retry; your entries are preserved.",
            }
          : null,
      );
    }, 420);
  };

  const connectionTitle =
    testState === "checking"
      ? zh
        ? "正在检查连接设置"
        : "Checking connection settings"
      : testState === "passed"
        ? zh
          ? "连接设置已通过检查"
          : "Connection settings passed"
        : testState === "failed"
          ? zh
            ? "连接检查失败"
            : "Connection check failed"
          : zh
            ? "连接设置尚未检查"
            : "Connection settings not checked";
  const connectionMessage =
    error?.field === "connection"
      ? error.message
      : testState === "checking"
        ? zh
          ? "正在验证声明的地址与授权范围。"
          : "Verifying the declared address and authorization scope."
        : testState === "passed"
          ? zh
            ? "配置检查已通过；实时认证和凭据仍由宿主管理。"
            : "Configuration passed; the host still owns live authentication and credentials."
          : zh
            ? "检查地址与授权范围后才能保存连接。"
            : "Check the address and authorization scope before saving.";

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-label={title}
      className="product-capability-setup"
      data-capability-setup={tab}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      ref={dialogRef}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!validate()) return;
          onSave({
            category: definition?.category ?? "engineering",
            description: description.trim(),
            label: (definition?.label[locale] ?? label).trim(),
            permissions: permissions.slice(0, permissionOptions.length),
            scope,
            source: source.trim(),
            tag:
              definition?.tag[locale] ??
              (tab === "assistants"
                ? zh
                  ? "自定义"
                  : "Custom"
                : tab === "skills"
                  ? zh
                    ? "已审查"
                    : "Reviewed"
                  : zh
                    ? "自定义连接"
                    : "Custom connection"),
          });
        }}
      >
        <header>
          <span>
            <ProductPlaygroundIcon
              name={
                tab === "assistants"
                  ? "assistant"
                  : tab === "skills"
                    ? "checklist"
                    : "link"
              }
            />
            <span>
              <h2>{title}</h2>
              <p id={descriptionId}>
                {tab === "assistants"
                  ? zh
                    ? "先定义职责、运行说明和可访问范围，再把专家用于任务。"
                    : "Define the job, runtime instructions, and access boundary before using the assistant."
                  : tab === "skills"
                    ? zh
                      ? "安装前审查来源、执行边界与工作区范围。"
                      : "Review source, execution boundary, and workspace scope before installation."
                    : zh
                      ? "凭据由宿主保管；这里定义连接地址、范围和授权边界。"
                      : "The host retains credentials; define the address, scope, and authorization boundary here."}
              </p>
            </span>
          </span>
          <button
            aria-label={zh ? "关闭配置" : "Close setup"}
            onClick={onCancel}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        </header>

        <div className="product-capability-setup__fields">
          <label>
            <span>{zh ? "名称" : "Name"}</span>
            <input
              aria-describedby={error?.field === "label" ? errorId : undefined}
              aria-invalid={error?.field === "label" || undefined}
              autoFocus={custom}
              disabled={!custom}
              maxLength={80}
              onChange={(event) => {
                setLabel(event.currentTarget.value);
                clearError("label");
              }}
              ref={labelRef}
              value={definition?.label[locale] ?? label}
            />
            {error?.field === "label" ? (
              <small className="product-capability-setup__field-error" id={errorId} role="alert">
                {error.message}
              </small>
            ) : null}
          </label>
          <label>
            <span>{zh ? "职责说明" : "Job description"}</span>
            <textarea
              aria-describedby={error?.field === "description" ? errorId : undefined}
              aria-invalid={error?.field === "description" || undefined}
              maxLength={240}
              onChange={(event) => {
                setDescription(event.currentTarget.value);
                clearError("description");
              }}
              readOnly={!descriptionEditable}
              ref={descriptionRef}
              rows={3}
              value={description}
            />
            <small aria-hidden="true" className="product-capability-setup__count">
              {description.length}/240
            </small>
            {error?.field === "description" ? (
              <small className="product-capability-setup__field-error" id={errorId} role="alert">
                {error.message}
              </small>
            ) : null}
          </label>
          <label>
            <span>
              {tab === "assistants"
                ? zh
                  ? "运行说明"
                  : "Runtime instructions"
                : tab === "skills"
                  ? zh
                    ? "包或仓库来源"
                    : "Package or repository source"
                  : zh
                    ? "连接地址"
                    : "Connection address"}
            </span>
            <input
              aria-describedby={error?.field === "source" ? errorId : undefined}
              aria-invalid={error?.field === "source" || undefined}
              maxLength={500}
              onChange={(event) => {
                setSource(event.currentTarget.value);
                clearError("source");
                invalidateConnectionCheck();
              }}
              placeholder={
                tab === "skills"
                  ? "https://github.com/organization/skill"
                  : tab === "connectors"
                    ? "https://service.example.com"
                    : undefined
              }
              readOnly={sourceReadOnly}
              ref={sourceRef}
              value={source}
            />
            {sourceReadOnly ? (
              <small className="product-capability-setup__hint">
                {zh
                  ? "内置技能的来源标识不可修改。"
                  : "The source identifier of a bundled skill cannot be changed."}
              </small>
            ) : null}
            {error?.field === "source" ? (
              <small className="product-capability-setup__field-error" id={errorId} role="alert">
                {error.message}
              </small>
            ) : null}
          </label>
          <label>
            <span>{zh ? "可用范围" : "Availability"}</span>
            <select
              onChange={(event) => {
                setScope(event.currentTarget.value as ProductCapabilityScope);
                invalidateConnectionCheck();
              }}
              value={scope}
            >
              <option value="current-workspace">
                {zh ? "仅当前工作区" : "Current workspace only"}
              </option>
              <option value="all-workspaces">
                {zh ? "所有工作区" : "All workspaces"}
              </option>
            </select>
          </label>
          <fieldset
            aria-describedby={error?.field === "permissions" ? errorId : undefined}
            aria-invalid={error?.field === "permissions" || undefined}
          >
            <legend>{zh ? "允许的操作" : "Allowed operations"}</legend>
            {permissionOptions.map((permission, index) => (
              <label key={permission}>
                <input
                  checked={permissions[index] ?? false}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setPermissions((current) =>
                      permissionOptions.map((_, currentIndex) =>
                        currentIndex === index
                          ? checked
                          : current[currentIndex] ?? false,
                      ),
                    );
                    clearError("permissions");
                    invalidateConnectionCheck();
                  }}
                  ref={index === 0 ? firstPermissionRef : undefined}
                  type="checkbox"
                />
                <span>{permission}</span>
              </label>
            ))}
            {error?.field === "permissions" ? (
              <small className="product-capability-setup__field-error" id={errorId} role="alert">
                {error.message}
              </small>
            ) : null}
          </fieldset>
          {tab === "connectors" ? (
            <div
              aria-live="polite"
              className="product-capability-setup__test"
              data-test-state={testState}
            >
              <span>
                <ProductPlaygroundIcon
                  name={
                    testState === "failed"
                      ? "warning"
                      : testState === "passed"
                        ? "check"
                        : "link"
                  }
                />
                <span>
                  <strong>{connectionTitle}</strong>
                  <small
                    id={connectionFeedbackId}
                    role={error?.field === "connection" ? "alert" : undefined}
                  >
                    {connectionMessage}
                  </small>
                </span>
              </span>
              <button
                aria-describedby={connectionFeedbackId}
                disabled={testState === "checking"}
                onClick={testConnection}
                ref={connectionButtonRef}
                type="button"
              >
                {testState === "failed"
                  ? zh
                    ? "重试"
                    : "Retry"
                  : testState === "passed"
                    ? zh
                      ? "再次检查"
                      : "Check again"
                    : zh
                      ? "检查连接"
                      : "Check connection"}
              </button>
            </div>
          ) : null}
        </div>

        <footer>
          <button onClick={onCancel} type="button">
            {zh ? "取消" : "Cancel"}
          </button>
          <button data-primary disabled={testState === "checking"} type="submit">
            {tab === "assistants"
              ? zh
                ? "保存专家"
                : "Save assistant"
              : tab === "skills"
                ? zh
                  ? "安装并启用"
                  : "Install and enable"
                : zh
                  ? "保存并连接"
                  : "Save and connect"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
