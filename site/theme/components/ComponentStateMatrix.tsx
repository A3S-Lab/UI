import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import "./ComponentStateMatrix.css";

export type ComponentStateMatrixContract = {
  name: string;
  selector: string;
  slug: string;
  states: readonly string[];
};

type ComponentStateMatrixProps = {
  canvasRef: RefObject<HTMLDivElement | null>;
  contract: ComponentStateMatrixContract;
  isChinese: boolean;
};

const busyStates = new Set([
  "awaiting",
  "busy",
  "capturing",
  "closing",
  "copying",
  "generating",
  "loading",
  "preparing",
  "recording",
  "renaming",
  "restoring",
  "running",
  "saving",
  "sending",
  "stopping",
  "streaming",
  "submitting",
  "uploading",
  "waiting",
]);

const hiddenStates = new Set(["closed", "hidden"]);

function stateDescription(state: string, isChinese: boolean) {
  if (hiddenStates.has(state)) {
    return isChinese
      ? "该状态保留在 DOM 契约中，但不对用户显示。"
      : "This state remains in the DOM contract without being shown to the user.";
  }
  if (busyStates.has(state)) {
    return isChinese
      ? "进行中的状态必须保留组件几何与当前上下文。"
      : "In-progress state preserves component geometry and the current context.";
  }
  if (state === "empty") {
    return isChinese
      ? "空状态必须说明当前缺少什么，并给出有效的下一步。"
      : "Empty state identifies what is absent and gives one valid next step.";
  }
  if (
    [
      "error",
      "danger",
      "destructive",
      "invalid",
      "offline",
      "permission-denied",
    ].includes(state)
  ) {
    return isChinese
      ? "问题状态必须同时给出文字含义与可恢复路径。"
      : "Problem state requires textual meaning and a valid recovery path.";
  }
  if (["disabled", "readonly", "read-only", "unavailable"].includes(state)) {
    return isChinese
      ? "受限状态必须具有原生或等效的可访问语义。"
      : "Restricted state requires native or equivalent accessible semantics.";
  }
  if (
    ["checked", "current", "expanded", "open", "pressed", "selected"].includes(
      state,
    )
  ) {
    return isChinese
      ? "选择或展开状态不能只依赖颜色表达。"
      : "Selection or disclosure state cannot rely on color alone.";
  }
  return isChinese
    ? "该状态使用公开组件根节点与稳定状态标记。"
    : "This state uses the public component root and its stable state marker.";
}

function rewriteIds(root: Element, prefix: string) {
  const idMap = new Map<string, string>();
  const elements = [root, ...root.querySelectorAll("*")];

  elements.forEach((element, index) => {
    const id = element.getAttribute("id");
    if (!id) return;
    const nextId = `${prefix}-${index}-${id}`;
    idMap.set(id, nextId);
    element.setAttribute("id", nextId);
  });

  for (const element of elements) {
    if (element.matches('input[type="radio"][name]')) {
      element.setAttribute(
        "name",
        `${prefix}-${element.getAttribute("name") ?? "choice"}`,
      );
    }

    for (const attribute of [
      "aria-controls",
      "aria-describedby",
      "aria-labelledby",
      "for",
    ]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      element.setAttribute(
        attribute,
        value
          .split(/\s+/u)
          .map((token) => idMap.get(token) ?? token)
          .join(" "),
      );
    }

    const href = element.getAttribute("href");
    if (href?.startsWith("#") && idMap.has(href.slice(1))) {
      element.setAttribute("href", `#${idMap.get(href.slice(1))}`);
    }
  }
}

function applyRadioGroupState(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (
    !root.matches(
      '.radio-group, [role="radiogroup"], [data-slot="radio-group"]',
    )
  ) {
    return;
  }

  const options = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  );
  if (options.length === 0 || state !== "invalid") return;

  const feedbackId = `${options[0].id || "radio-group"}-invalid-feedback`;
  let feedback = root.querySelector<HTMLElement>(
    "[data-state-specimen-feedback]",
  );
  if (!feedback) {
    feedback = document.createElement("p");
    feedback.dataset.stateSpecimenFeedback = "";
    feedback.id = feedbackId;
    feedback.setAttribute("role", "alert");
    feedback.className = "text-destructive";
    const groupLabel = root.querySelector(
      ':scope > .label, :scope > [data-variant="label"]',
    );
    groupLabel?.after(feedback);
    if (!feedback.parentElement) root.prepend(feedback);
  }
  feedback.textContent = isChinese
    ? "请选择一个选项，然后再继续。"
    : "Choose one option before continuing.";

  for (const option of options) {
    option.checked = false;
    option.required = true;
    option.setAttribute("aria-invalid", "true");
    const describedBy = new Set(
      (option.getAttribute("aria-describedby") ?? "")
        .split(/\s+/u)
        .filter(Boolean),
    );
    describedBy.add(feedback.id);
    option.setAttribute("aria-describedby", [...describedBy].join(" "));
  }
}

function clearRuntimeAnnotations(root: Element) {
  for (const element of [root, ...root.querySelectorAll("*")]) {
    element.removeAttribute("data-a3s-component");
    element.removeAttribute("data-a3s-components");
    element.removeAttribute("data-a3s-part-owners");
    element.removeAttribute("data-a3s-parts");
    element.removeAttribute("data-a3s-state");
  }
}

function findContractSource(
  canvas: HTMLElement,
  contract: ComponentStateMatrixContract,
) {
  const localSource = canvas.querySelector<HTMLElement>(contract.selector);
  if (localSource) return localSource;

  for (const preview of document.querySelectorAll<HTMLElement>(
    ".a3s-preview",
  )) {
    if (preview.dataset.previewComponent !== contract.slug) continue;
    const previewCanvas = preview.querySelector<HTMLElement>(
      ".a3s-preview__canvas",
    );
    const source = previewCanvas?.querySelector<HTMLElement>(contract.selector);
    if (source) return source;
  }

  return null;
}

function stateControl(root: HTMLElement) {
  if (root.matches("button, input, select, textarea, summary")) return root;
  return root.querySelector<HTMLElement>(
    "button, input, select, textarea, summary, [role=switch], [role=option], [tabindex]",
  );
}

function interactiveControls(root: HTMLElement) {
  const selector = [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "summary",
    "[contenteditable=true]",
    "[role=button]",
    "[role=checkbox]",
    "[role=combobox]",
    "[role=menuitem]",
    "[role=menuitemcheckbox]",
    "[role=menuitemradio]",
    "[role=option]",
    "[role=radio]",
    "[role=link]",
    "[role=slider]",
    "[role=switch]",
    "[role=tab]",
    "[tabindex]",
  ].join(", ");
  const controls = Array.from(root.querySelectorAll<HTMLElement>(selector));
  if (root.matches(selector)) controls.unshift(root);
  return [...new Set(controls)];
}

function applyDisabledState(root: HTMLElement) {
  root.setAttribute("aria-disabled", "true");
  for (const element of interactiveControls(root)) {
    if (
      element instanceof HTMLButtonElement ||
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.disabled = true;
      continue;
    }
    element.setAttribute("aria-disabled", "true");
    if (element.tabIndex >= 0) element.tabIndex = -1;
  }
}

function normalizeGroupedActionState(root: HTMLElement, state: string) {
  if (!root.matches(".button-group")) return;

  // A Button Group is a relationship between native actions, not a disabled
  // composite widget. Disabled evidence belongs on each child action.
  root.removeAttribute("aria-disabled");
  if (!root.hasAttribute("role")) root.setAttribute("role", "group");
  if (state !== "disabled") return;

  for (const control of interactiveControls(root)) {
    if (control instanceof HTMLButtonElement) control.disabled = true;
  }
}

function normalizeBulkActionBarState(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!root.matches(".bulk-action-bar")) return;

  const controller = root as HTMLElement & {
    clear?: (options?: Record<string, unknown>) => boolean;
    setPending?: (
      action: string,
      pending?: boolean,
      options?: Record<string, unknown>,
    ) => void;
  };

  if (state === "empty") {
    controller.setPending?.("", false);
    controller.clear?.({
      emit: false,
      keepPending: false,
      restoreFocus: false,
      source: "state-matrix",
    });
    root.hidden = true;
    root.dataset.state = "empty";
    return;
  }

  controller.setPending?.("", false);
  root.hidden = false;

  if (state === "loading") {
    const action = root.querySelector<HTMLElement>(
      "[data-bulk-actions] [data-bulk-action]:not([data-bulk-clear])",
    );
    controller.setPending?.(action?.dataset.bulkAction ?? "action", true, {
      message: isChinese ? "正在处理已选项目…" : "Processing selected items…",
    });
    root.dataset.state = "loading";
    return;
  }

  root.dataset.state = state;
}

function findElementById(root: HTMLElement, id: string) {
  if (root.id === id) return root;
  return Array.from(root.querySelectorAll<HTMLElement>("[id]")).find(
    (element) => element.id === id,
  );
}

function disclosureTrigger(root: HTMLElement) {
  if (root.matches("summary, [aria-expanded]")) return root;
  return root.querySelector<HTMLElement>(
    ":scope > button[aria-controls], :scope > button[aria-haspopup], :scope > summary, [data-trigger][aria-controls], [aria-expanded][aria-controls]",
  );
}

function applyDisclosureState(root: HTMLElement, expanded: boolean) {
  const trigger = disclosureTrigger(root);
  trigger?.setAttribute("aria-expanded", String(expanded));

  if (root instanceof HTMLDialogElement || root instanceof HTMLDetailsElement) {
    root.toggleAttribute("open", expanded);
  }

  const controlledId = trigger?.getAttribute("aria-controls");
  const controlled = controlledId
    ? findElementById(root, controlledId)
    : undefined;
  const presentationOwner = controlled?.closest<HTMLElement>(
    "[data-popover], [data-context-content], [role=dialog], [role=menu]",
  );
  const popup =
    (presentationOwner && root.contains(presentationOwner)
      ? presentationOwner
      : controlled) ??
    root.querySelector<HTMLElement>(
      ":scope > [data-popover], :scope > [data-context-content], :scope > [role=listbox], :scope > [role=menu], :scope > [role=dialog]",
    );
  if (!popup) return;

  popup.setAttribute("aria-hidden", String(!expanded));
  popup.hidden = !expanded;
  popup.dataset.stateSpecimenPresentation = "inline-popover";
}

function specimenInputValue(
  control: HTMLInputElement | HTMLTextAreaElement,
  state: string,
  isChinese: boolean,
) {
  if (control instanceof HTMLTextAreaElement) {
    if (state === "invalid") {
      return isChinese
        ? "发布说明缺少回滚步骤，请补充失败后的恢复路径。"
        : "The release note is missing a rollback path for failed deployments.";
    }
    if (state === "disabled") {
      return isChinese
        ? "此归档说明由旧版本保留，当前不可编辑。"
        : "This archived note is retained from an earlier release.";
    }
    if (["readonly", "read-only"].includes(state)) {
      return isChinese
        ? "安全审查已批准；该记录仍可选择和复制。"
        : "Security review approved; this record remains selectable and copyable.";
    }
    return isChinese
      ? "说明此次变更、验证方法以及失败时的恢复步骤。"
      : "Describe the change, how it was verified, and how to recover if it fails.";
  }

  if (state === "invalid") {
    if (control.type === "email") return "owner@";
    if (control.type === "url") return "https://";
    if (control.type === "number") return "-1";
    return isChinese ? "待修复的输入" : "Value requiring review";
  }
  if (control.type === "email") {
    return state === "disabled"
      ? "archived@example.com"
      : state === "readonly" || state === "read-only"
        ? "account-owner@example.com"
        : "alex@example.com";
  }
  if (control.type === "url") return "https://example.com/release-notes";
  if (control.type === "number") return "42";
  if (control.type === "date") return "2026-08-24";
  if (control.type === "time") return "09:30";
  if (control.type === "search") {
    return isChinese ? "搜索发布记录" : "Search release notes";
  }
  return isChinese ? "季度无障碍审查" : "Quarterly accessibility review";
}

function populateTextControl(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  const control = root.matches("input, textarea")
    ? (root as HTMLInputElement | HTMLTextAreaElement)
    : null;
  if (!control) return;
  if (
    control instanceof HTMLInputElement &&
    [
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "image",
      "radio",
      "range",
      "reset",
      "submit",
    ].includes(control.type)
  ) {
    return;
  }

  const value = specimenInputValue(control, state, isChinese);
  control.value = value;
  if (control instanceof HTMLInputElement) control.setAttribute("value", value);
  else control.textContent = value;
}

function applyFieldState(root: HTMLElement, state: string, isChinese: boolean) {
  if (!root.matches(".field")) return;

  const control = root.querySelector<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(
    ":scope > input:not([type=checkbox]):not([type=radio]):not([type=range]), :scope > select, :scope > textarea",
  );
  const description = root.querySelector<HTMLElement>(
    ":scope > [data-field-description], :scope > section > [data-field-description]",
  );
  const message = root.querySelector<HTMLElement>(
    ":scope > [data-field-message]",
  );
  if (!control || !description || !message) return;

  const isDisabled = state === "disabled";
  const isInvalid = state === "invalid";
  const isReadonly = ["readonly", "read-only"].includes(state);
  const values = isChinese
    ? {
        disabled: "已归档运行时",
        empty: "",
        invalid: "名",
        readonly: "生产运行时",
        ready: "智能体运行时",
      }
    : {
        disabled: "Archived Runtime",
        empty: "",
        invalid: "A",
        readonly: "Production Runtime",
        ready: "Agent Runtime",
      };
  const descriptions = isChinese
    ? {
        disabled: "该名称保留在审计记录中，归档后不能再编辑。",
        empty: "尚未填写工作区名称。保存前请输入 2 到 40 个字符。",
        invalid: "用于导航、邀请和审计记录，长度为 2 到 40 个字符。",
        readonly: "该值仍可选择和复制，只有组织所有者可以修改。",
        ready: "用于导航、邀请和审计记录，长度为 2 到 40 个字符。",
      }
    : {
        disabled:
          "This name remains in audit history and cannot be edited after archival.",
        empty:
          "No workspace name has been entered. Enter 2 to 40 characters before saving.",
        invalid:
          "Shown in navigation, invitations, and audit history. Use 2 to 40 characters.",
        readonly:
          "This value remains selectable and copyable; only an organization owner can change it.",
        ready:
          "Shown in navigation, invitations, and audit history. Use 2 to 40 characters.",
      };
  const value = values[state as keyof typeof values] ?? values.ready;

  root.removeAttribute("aria-disabled");
  root.removeAttribute("aria-invalid");
  root.removeAttribute("aria-readonly");
  root.removeAttribute("data-validation-state");
  if (isDisabled) root.setAttribute("data-disabled", "true");
  else root.removeAttribute("data-disabled");
  if (isInvalid) root.setAttribute("data-invalid", "true");
  else root.removeAttribute("data-invalid");
  if (isReadonly) root.setAttribute("data-readonly", "true");
  else root.removeAttribute("data-readonly");

  control.disabled = isDisabled;
  if (
    control instanceof HTMLInputElement ||
    control instanceof HTMLTextAreaElement
  ) {
    control.readOnly = isReadonly;
  }
  control.value = value;
  if (control instanceof HTMLInputElement) control.setAttribute("value", value);
  else if (control instanceof HTMLTextAreaElement) control.textContent = value;
  if (isInvalid) control.setAttribute("aria-invalid", "true");
  else control.removeAttribute("aria-invalid");

  description.textContent =
    descriptions[state as keyof typeof descriptions] ?? descriptions.ready;
  message.textContent = isChinese
    ? "请输入 2 到 40 个字符的工作区名称。"
    : "Enter a workspace name between 2 and 40 characters.";
  message.hidden = !isInvalid;
  message.setAttribute("role", "alert");
  control.setCustomValidity(isInvalid ? message.textContent : "");

  const describedBy = [description.id, ...(isInvalid ? [message.id] : [])]
    .filter(Boolean)
    .join(" ");
  if (describedBy) control.setAttribute("aria-describedby", describedBy);
  else control.removeAttribute("aria-describedby");
}

const inputSpecimenExcludedTypes = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function isInputSpecimenRoot(root: HTMLElement): root is HTMLInputElement {
  return (
    root instanceof HTMLInputElement &&
    root.matches("input.input") &&
    !inputSpecimenExcludedTypes.has(root.type)
  );
}

function applyInputState(root: HTMLElement, state: string, isChinese: boolean) {
  if (!isInputSpecimenRoot(root)) return;

  const isDisabled = state === "disabled";
  const isInvalid = state === "invalid";
  const isReadonly = ["readonly", "read-only"].includes(state);
  const values = {
    disabled: "archived@example.com",
    empty: "",
    invalid: "owner@",
    readonly: "account-owner@example.com",
    ready: "alex@example.com",
  };
  const value = values[state as keyof typeof values] ?? values.ready;

  root.disabled = isDisabled;
  root.readOnly = isReadonly;
  root.required = isInvalid;
  root.value = value;
  root.setAttribute("value", value);
  if (isInvalid) root.setAttribute("aria-invalid", "true");
  else root.removeAttribute("aria-invalid");
  if (isReadonly) root.setAttribute("aria-readonly", "true");
  else root.removeAttribute("aria-readonly");

  const field = root.closest<HTMLElement>(".field") ?? root.parentElement;
  const feedback = String(root.getAttribute("aria-describedby") ?? "")
    .split(/\s+/u)
    .filter(Boolean)
    .map((id) => (field ? findElementById(field, id) : undefined))
    .find((element) => element?.hasAttribute("data-state-specimen-feedback"));
  if (!feedback) return;

  const messages = isChinese
    ? {
        disabled: "该地址由工作区策略锁定，保留它是为了说明当前通知配置。",
        empty: "尚未填写通知邮箱。填写后才能启用邮件通知。",
        invalid: "请输入完整的邮箱地址，例如 owner@example.com。",
        readonly: "该值仍可选择和复制，并会包含在表单提交中。",
        ready: "当前值：alex@example.com。",
      }
    : {
        disabled:
          "This address is retained for reference and locked by workspace policy.",
        empty:
          "No notification address has been entered. Enter one before enabling email notifications.",
        invalid: "Enter a complete email address, such as owner@example.com.",
        readonly:
          "This value remains selectable and included in form submission.",
        ready: "Current value: alex@example.com.",
      };
  feedback.textContent =
    messages[state as keyof typeof messages] ?? messages.ready;
  feedback.toggleAttribute("data-error", isInvalid);
  if (isInvalid) feedback.setAttribute("role", "alert");
  else feedback.removeAttribute("role");
}

function mountInputSpecimen(
  source: HTMLElement,
  clone: HTMLElement,
  mount: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!isInputSpecimenRoot(source) || !isInputSpecimenRoot(clone)) return false;

  const field = source.closest<HTMLElement>(".field");
  const sourceLabel = Array.from(
    field?.querySelectorAll<HTMLLabelElement>("label[for]") ?? [],
  ).find((label) => label.htmlFor === source.id);
  const wrapper = source.ownerDocument.createElement("div");
  wrapper.className = "field a3s-component-state-matrix__field-specimen";
  wrapper.toggleAttribute("data-disabled", state === "disabled");
  wrapper.toggleAttribute("data-invalid", state === "invalid");
  wrapper.toggleAttribute(
    "data-readonly",
    ["readonly", "read-only"].includes(state),
  );

  const label = sourceLabel?.cloneNode(true) as HTMLLabelElement | undefined;
  const resolvedLabel = label ?? source.ownerDocument.createElement("label");
  resolvedLabel.htmlFor = clone.id;
  if (!label)
    resolvedLabel.textContent = isChinese ? "通知邮箱" : "Notification email";

  const feedback = source.ownerDocument.createElement("p");
  feedback.id = `a3s-contract-input-${state}-feedback`;
  feedback.setAttribute("data-state-specimen-feedback", "");
  clone.setAttribute("aria-describedby", feedback.id);

  wrapper.append(resolvedLabel, clone, feedback);
  mount.append(wrapper);
  applyInputState(clone, state, isChinese);
  return true;
}

function inputGroupControl(root: HTMLElement) {
  return root.querySelector<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >(":scope > input, :scope > textarea, :scope > select");
}

function applyInputGroupState(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!root.matches(".input-group")) return;
  const control = inputGroupControl(root);
  if (!control) return;

  const disabled = state === "disabled";
  const invalid = state === "invalid";
  const loading = state === "loading";
  const readonly = ["readonly", "read-only"].includes(state);
  const values = {
    disabled: "archived",
    empty: "",
    invalid: "r",
    loading: "runtime",
    readonly: "release",
    ready: "runtime",
  };
  const value = values[state as keyof typeof values] ?? values.ready;

  root.removeAttribute("aria-disabled");
  root.removeAttribute("aria-invalid");
  root.removeAttribute("aria-readonly");
  root.toggleAttribute("aria-busy", loading);
  root.toggleAttribute("data-disabled", disabled);
  if (readonly) root.setAttribute("data-readonly", "");
  else root.removeAttribute("data-readonly");

  control.disabled = disabled;
  control.required = invalid;
  if (control instanceof HTMLInputElement) {
    control.readOnly = readonly;
    if (invalid) control.minLength = 3;
    else control.removeAttribute("minlength");
    control.value = value;
    control.setAttribute("value", value);
  } else if (control instanceof HTMLTextAreaElement) {
    control.readOnly = readonly;
    if (invalid) control.minLength = 3;
    else control.removeAttribute("minlength");
    control.value = value;
    control.textContent = value;
  } else {
    const option = Array.from(control.options).find(
      (candidate) => candidate.value === value,
    );
    if (option) control.value = option.value;
  }
  control.toggleAttribute("aria-invalid", invalid);
  control.setCustomValidity(
    invalid
      ? isChinese
        ? "至少输入 3 个字符。"
        : "Use at least 3 characters."
      : "",
  );

  const field = root.closest<HTMLElement>(
    ".a3s-component-state-matrix__field-specimen",
  );
  field?.toggleAttribute("data-disabled", disabled);
  field?.toggleAttribute("data-invalid", invalid);
  field?.toggleAttribute("data-readonly", readonly);

  const description = field?.querySelector<HTMLElement>(
    "[data-input-group-state-description]",
  );
  const error = field?.querySelector<HTMLElement>(
    "[data-input-group-state-error]",
  );
  const status = root.querySelector<HTMLElement>(
    ":scope > [data-input-group-status], :scope > [role=status]",
  );
  const descriptions = isChinese
    ? {
        disabled: "该项目已归档，因此搜索值仅用于审计参考。",
        empty: "按项目名称或仓库路径搜索。",
        invalid: "按项目名称或仓库路径搜索。",
        loading: "正在搜索项目；输入框仍可编辑新查询。",
        readonly: "该筛选器由发布策略锁定，但仍可选择和复制。",
        ready: "按项目名称或仓库路径搜索。",
      }
    : {
        disabled:
          "This project is archived, so the search value remains for audit reference only.",
        empty: "Search by project name or repository path.",
        invalid: "Search by project name or repository path.",
        loading:
          "Searching projects; the input remains editable for a newer query.",
        readonly:
          "Release policy locks this filter, but its value remains selectable and copyable.",
        ready: "Search by project name or repository path.",
      };
  if (description) {
    description.setAttribute("dir", "auto");
    description.textContent =
      descriptions[state as keyof typeof descriptions] ?? descriptions.ready;
  }
  if (error) {
    error.setAttribute("dir", "auto");
    error.textContent = isChinese
      ? "至少输入 3 个字符，然后重新搜索。"
      : "Use at least 3 characters, then search again.";
    error.hidden = !invalid;
    if (invalid) error.setAttribute("role", "alert");
    else error.removeAttribute("role");
  }
  if (status) {
    status.setAttribute("dir", "auto");
    const statuses = isChinese
      ? {
          disabled: "不可用",
          empty: "尚未查询",
          invalid: "尚未搜索",
          loading: "正在搜索项目",
          readonly: "8 个匹配项",
          ready: "8 个匹配项",
        }
      : {
          disabled: "Unavailable",
          empty: "No query",
          invalid: "Not searched",
          loading: "Searching projects",
          readonly: "8 matches",
          ready: "8 matches",
        };
    status.textContent =
      statuses[state as keyof typeof statuses] ?? statuses.ready;
    if (loading) status.setAttribute("role", "status");
    else status.removeAttribute("role");
  }

  const describedBy = [description?.id, ...(invalid ? [error?.id] : [])]
    .filter(Boolean)
    .join(" ");
  if (describedBy) control.setAttribute("aria-describedby", describedBy);
  else control.removeAttribute("aria-describedby");
}

function mountInputGroupSpecimen(
  source: HTMLElement,
  clone: HTMLElement,
  mount: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!source.matches(".input-group") || !clone.matches(".input-group")) {
    return false;
  }
  const sourceControl = inputGroupControl(source);
  const cloneControl = inputGroupControl(clone);
  if (!sourceControl || !cloneControl) return false;

  const sourceField = source.closest<HTMLElement>(".field");
  const sourceLabel = Array.from(
    sourceField?.querySelectorAll<HTMLLabelElement>("label[for]") ?? [],
  ).find((label) => label.htmlFor === sourceControl.id);
  const wrapper = source.ownerDocument.createElement("div");
  wrapper.className = "field a3s-component-state-matrix__field-specimen";

  const label = sourceLabel?.cloneNode(true) as HTMLLabelElement | undefined;
  const resolvedLabel = label ?? source.ownerDocument.createElement("label");
  resolvedLabel.htmlFor = cloneControl.id;
  resolvedLabel.setAttribute("dir", "auto");
  if (!label)
    resolvedLabel.textContent = isChinese ? "搜索项目" : "Search projects";

  cloneControl.setAttribute("dir", "auto");

  const description = source.ownerDocument.createElement("p");
  description.id = `a3s-contract-input-group-${state}-description`;
  description.dataset.fieldDescription = "";
  description.dataset.inputGroupStateDescription = "";
  description.setAttribute("dir", "auto");

  const error = source.ownerDocument.createElement("p");
  error.id = `a3s-contract-input-group-${state}-error`;
  error.dataset.fieldMessage = "";
  error.dataset.inputGroupStateError = "";
  error.setAttribute("dir", "auto");
  error.hidden = true;

  wrapper.append(resolvedLabel, clone, description, error);
  mount.append(wrapper);
  applyInputGroupState(clone, state, isChinese);
  return true;
}

function isTextareaSpecimenRoot(
  root: HTMLElement,
): root is HTMLTextAreaElement {
  return (
    root instanceof HTMLTextAreaElement && root.matches("textarea.textarea")
  );
}

function applyTextareaState(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!isTextareaSpecimenRoot(root)) return;

  const isDisabled = state === "disabled";
  const isInvalid = state === "invalid";
  const isReadonly = ["readonly", "read-only"].includes(state);
  const isRtl =
    root.closest<HTMLElement>("[data-state-specimen-mount]")?.dir === "rtl";
  const values = isRtl
    ? {
        disabled: "تم الاحتفاظ بملاحظات الإصدار المؤرشفة لسجل التدقيق.",
        empty: "",
        invalid: "تم تسجيل التحقق من النشر، لكن خطوات التراجع لا تزال مفقودة.",
        readonly:
          "تمت الموافقة على هذه الملاحظات؛ ويظل المحتوى قابلاً للتحديد والنسخ والإرسال.",
        ready: "صف التغيير ودليل التحقق وخطوات التراجع عند فشل التحقق.",
      }
    : isChinese
      ? {
          disabled: "这份归档发布说明为审计记录保留。",
          empty: "",
          invalid: "已记录部署验证，但还没有写明失败后的回滚步骤。",
          readonly: "安全审查已批准这份说明；内容仍可选择、复制和提交。",
          ready: "说明变更内容、验证证据，以及验证失败时应执行的回滚步骤。",
        }
      : {
          disabled: "This archived release note is retained for audit history.",
          empty: "",
          invalid:
            "Deployment verification is recorded, but the rollback steps are still missing.",
          readonly:
            "Security review approved this note; it remains selectable, copyable, and submitted.",
          ready:
            "Describe the change, verification evidence, and the rollback steps to follow if verification fails.",
        };
  const messages = isRtl
    ? {
        disabled: "مساحة العمل مؤرشفة، لذلك لا يمكن تعديل هذا السجل.",
        empty:
          "لم تتم كتابة ملاحظات الإصدار. صف التغيير وطريقة التحقق ومسار الاستعادة.",
        invalid: "أضف خطوات التراجع المحددة التي يجب اتباعها عند فشل التحقق.",
        readonly:
          "يمكن لمسؤول الإصدار فقط التعديل؛ وتبقى القيمة الحالية ضمن إرسال النموذج.",
        ready: "تتضمن الملاحظات الحالية سياق التغيير والتحقق والاستعادة.",
      }
    : isChinese
      ? {
          disabled: "工作区归档后不能再编辑这份记录。",
          empty: "尚未填写发布说明。请写明变更、验证方法和失败恢复步骤。",
          invalid: "请补充验证失败时应执行的具体回滚步骤。",
          readonly: "只有发布负责人可以修改；当前内容仍参与表单提交。",
          ready: "当前说明包含变更、验证和失败恢复上下文。",
        }
      : {
          disabled:
            "The workspace is archived, so this record cannot be edited.",
          empty:
            "No release note has been entered. Describe the change, verification, and recovery path.",
          invalid:
            "Add the specific rollback steps to follow if verification fails.",
          readonly:
            "Only the release owner can edit it; the current value remains in form submission.",
          ready:
            "The current note includes change, verification, and recovery context.",
        };
  const value = values[state as keyof typeof values] ?? values.ready;

  root.disabled = isDisabled;
  root.readOnly = isReadonly;
  root.required = isInvalid;
  root.maxLength = 320;
  root.rows = 5;
  root.placeholder = isRtl
    ? "صف التغيير ونتيجة التحقق ومسار التراجع"
    : isChinese
      ? "说明变更内容、验证结果和回滚路径"
      : "Describe the change, verification result, and rollback path";
  root.value = value;
  root.textContent = value;
  root.setCustomValidity(isInvalid ? messages.invalid : "");
  root.toggleAttribute("aria-invalid", isInvalid);
  root.removeAttribute("aria-disabled");
  root.removeAttribute("aria-readonly");

  const field = root.closest<HTMLElement>(".field") ?? root.parentElement;
  field?.toggleAttribute("data-disabled", isDisabled);
  field?.toggleAttribute("data-invalid", isInvalid);
  field?.toggleAttribute("data-readonly", isReadonly);
  const feedback = String(root.getAttribute("aria-describedby") ?? "")
    .split(/\s+/u)
    .filter(Boolean)
    .map((id) => (field ? findElementById(field, id) : undefined))
    .find((element) => element?.hasAttribute("data-state-specimen-feedback"));
  if (!feedback) return;

  feedback.textContent =
    messages[state as keyof typeof messages] ?? messages.ready;
  feedback.toggleAttribute("data-error", isInvalid);
  if (isInvalid) feedback.setAttribute("role", "alert");
  else feedback.removeAttribute("role");
}

function mountTextareaSpecimen(
  source: HTMLElement,
  clone: HTMLElement,
  mount: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!isTextareaSpecimenRoot(source) || !isTextareaSpecimenRoot(clone)) {
    return false;
  }

  const field = source.closest<HTMLElement>(".field");
  const sourceLabel = Array.from(
    field?.querySelectorAll<HTMLLabelElement>("label[for]") ?? [],
  ).find((label) => label.htmlFor === source.id);
  const wrapper = source.ownerDocument.createElement("div");
  wrapper.className = "field a3s-component-state-matrix__field-specimen";

  const label = sourceLabel?.cloneNode(true) as HTMLLabelElement | undefined;
  const resolvedLabel = label ?? source.ownerDocument.createElement("label");
  resolvedLabel.htmlFor = clone.id;
  if (mount.dir === "rtl") {
    resolvedLabel.textContent = "ملاحظات الإصدار";
  } else if (!label) {
    resolvedLabel.textContent = isChinese ? "发布说明" : "Release note";
  }

  const feedback = source.ownerDocument.createElement("p");
  feedback.id = `a3s-contract-textarea-${state}-feedback`;
  feedback.setAttribute("data-state-specimen-feedback", "");
  clone.setAttribute("aria-describedby", feedback.id);

  wrapper.append(resolvedLabel, clone, feedback);
  mount.append(wrapper);
  applyTextareaState(clone, state, isChinese);
  return true;
}

function applyHotkeyInputState(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!root.matches(".hotkey-input")) return;
  const input = root.querySelector<HTMLInputElement>("input");
  const preview = root.querySelector<HTMLElement>("[data-hotkey-preview]");
  const clear = root.querySelector<HTMLElement>("[data-hotkey-clear]");
  const feedbackScope =
    root.closest<HTMLElement>(".field") ?? root.parentElement ?? root;
  const feedback = String(input?.getAttribute("aria-describedby") ?? "")
    .split(/\s+/u)
    .filter(Boolean)
    .map((id) => findElementById(feedbackScope, id))
    .find((element) => element?.hasAttribute("data-hotkey-feedback"));
  if (!input) return;

  const recording = state === "recording";
  const value = root.dataset.hotkeyValue || input.value;
  root.dataset.hasValue = String(Boolean(value));
  input.value = recording ? "" : value;
  if (recording) {
    input.placeholder = isChinese ? "按下组合键…" : "Press a key combination…";
  }
  if (preview) preview.hidden = recording || !value;
  if (clear) clear.hidden = recording || !value;
  if (feedback) {
    if (recording) {
      feedback.textContent =
        root.dataset.recordingMessage ??
        (isChinese
          ? "请按下一组完整组合键，按 Escape 取消。"
          : "Press one complete key combination. Escape cancels.");
    } else if (state === "invalid") {
      feedback.textContent = isChinese
        ? "该快捷键已分配给其他命令。按 Enter 选择其他组合。"
        : "This shortcut is already assigned. Press Enter to choose another.";
    } else if (state === "disabled") {
      feedback.textContent = isChinese
        ? "此快捷键由工作区策略统一管理。"
        : "This shortcut is managed by workspace policy.";
    }
    feedback.toggleAttribute("data-error", state === "invalid");
  }
}

function mountHotkeyInputSpecimen(
  source: HTMLElement,
  clone: HTMLElement,
  mount: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!clone.matches(".hotkey-input")) return false;

  const sourceInput = source.querySelector<HTMLInputElement>("input");
  const cloneInput = clone.querySelector<HTMLInputElement>("input");
  if (!sourceInput || !cloneInput) return false;

  const field = source.closest<HTMLElement>(".field");
  const sourceLabel = Array.from(
    field?.querySelectorAll<HTMLLabelElement>("label[for]") ?? [],
  ).find((label) => label.htmlFor === sourceInput.id);
  const describedIds = String(
    sourceInput.getAttribute("aria-describedby") ?? "",
  )
    .split(/\s+/u)
    .filter(Boolean);
  const sourceFeedback = describedIds
    .map((id) => source.ownerDocument.getElementById(id))
    .find((element) => element?.hasAttribute("data-hotkey-feedback"));

  const wrapper = document.createElement("div");
  wrapper.className = "field a3s-component-state-matrix__field-specimen";

  const label = sourceLabel?.cloneNode(true) as HTMLLabelElement | undefined;
  if (label) {
    label.htmlFor = cloneInput.id;
    wrapper.append(label);
  }

  wrapper.append(clone);

  const feedback = sourceFeedback?.cloneNode(true) as HTMLElement | undefined;
  if (feedback) {
    feedback.id = `a3s-contract-hotkey-${state}-feedback`;
    cloneInput.setAttribute("aria-describedby", feedback.id);
    wrapper.append(feedback);
  }

  mount.append(wrapper);
  applyHotkeyInputState(clone, state, isChinese);
  return true;
}

function applyNativeSelectState(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!(root instanceof HTMLSelectElement)) return;
  if (!root.matches("select.native-select")) return;

  const isInvalid = state === "invalid";
  const isEmpty = state === "empty" || isInvalid;
  root.required = isInvalid;

  if (isEmpty) {
    root.value = "";
  } else {
    const preferred = Array.from(root.options).find(
      (option) =>
        option.value === "apple" &&
        !option.disabled &&
        !option.parentElement?.matches("optgroup[disabled]"),
    );
    const fallback = Array.from(root.options).find(
      (option) =>
        option.value !== "" &&
        !option.disabled &&
        !option.parentElement?.matches("optgroup[disabled]"),
    );
    root.value = preferred?.value ?? fallback?.value ?? "";
  }

  const feedbackScope =
    root.closest<HTMLElement>(".field") ?? root.parentElement;
  const feedback = String(root.getAttribute("aria-describedby") ?? "")
    .split(/\s+/u)
    .filter(Boolean)
    .map((id) =>
      feedbackScope ? findElementById(feedbackScope, id) : undefined,
    )
    .find((element) => element?.hasAttribute("data-state-specimen-feedback"));
  if (!feedback) return;

  const messages = isChinese
    ? {
        disabled: "此选项由工作区策略统一管理。",
        empty: "尚未选择水果。请选择一种水果后继续。",
        invalid: "请选择一种水果后继续。",
        ready: "已选择苹果。",
      }
    : {
        disabled: "This choice is managed by workspace policy.",
        empty: "No fruit is selected. Choose one to continue.",
        invalid: "Choose a fruit before continuing.",
        ready: "Apple is selected.",
      };
  feedback.textContent =
    messages[state as keyof typeof messages] ?? messages.ready;
  feedback.toggleAttribute("data-error", isInvalid);
  if (isInvalid) feedback.setAttribute("role", "alert");
  else feedback.removeAttribute("role");
}

function mountNativeSelectSpecimen(
  source: HTMLElement,
  clone: HTMLElement,
  mount: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!(source instanceof HTMLSelectElement)) return false;
  if (!(clone instanceof HTMLSelectElement)) return false;
  if (!clone.matches("select.native-select")) return false;

  const field = source.closest<HTMLElement>(".field");
  const sourceLabel = Array.from(
    field?.querySelectorAll<HTMLLabelElement>("label[for]") ?? [],
  ).find((label) => label.htmlFor === source.id);
  const wrapper = source.ownerDocument.createElement("div");
  wrapper.className = "field a3s-component-state-matrix__field-specimen";
  wrapper.toggleAttribute("data-invalid", state === "invalid");

  const label = sourceLabel?.cloneNode(true) as HTMLLabelElement | undefined;
  if (label) {
    label.htmlFor = clone.id;
    wrapper.append(label);
  }

  const feedback = source.ownerDocument.createElement("p");
  feedback.id = `a3s-contract-native-select-${state}-feedback`;
  feedback.setAttribute("data-state-specimen-feedback", "");
  clone.setAttribute("aria-describedby", feedback.id);
  wrapper.append(clone, feedback);
  mount.append(wrapper);
  applyNativeSelectState(clone, state, isChinese);
  return true;
}

function applyCodeEditorState(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!root.matches(".code-editor")) return;

  const control = root.querySelector<HTMLTextAreaElement>("textarea");
  const status = root.querySelector<HTMLElement>("[data-code-editor-state]");
  const message = root.querySelector<HTMLElement>("[data-code-editor-message]");
  const labels = isChinese
    ? {
        dirty: "有未保存的更改",
        invalid: "内容无效，请检查输入",
        readonly: "只读",
        ready: "已保存",
      }
    : {
        dirty: "Unsaved changes",
        invalid: "Invalid content — review the input",
        readonly: "Read only",
        ready: "Saved",
      };

  root.dataset.dirty = state === "dirty" ? "true" : "false";
  root.toggleAttribute("data-readonly", state === "readonly");
  if (state === "invalid") root.dataset.validationState = "invalid";
  else root.removeAttribute("data-validation-state");

  if (status) {
    status.textContent = labels[state as keyof typeof labels] ?? labels.ready;
  }
  if (message) {
    message.textContent = state === "invalid" ? labels.invalid : "";
  }
  if (control) {
    control.readOnly = state === "readonly";
    if (state === "invalid") control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
  }
}

function buttonStateIcon(root: HTMLElement, kind: "loading" | "pressed") {
  const svg = root.ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-icon", "inline-start");
  svg.setAttribute("fill", "none");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("stroke-width", "2");
  if (kind === "loading") svg.classList.add("animate-spin");

  const path = root.ownerDocument.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  path.setAttribute(
    "d",
    kind === "loading"
      ? "M21 12a9 9 0 1 1-6.22-8.56"
      : "M12 17v5M5 3h14l-2 7 3 3v1H4v-1l3-3-2-7Z",
  );
  svg.append(path);
  return svg;
}

function applyButtonState(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!root.matches("button.btn, a.btn")) return;

  const loading = state === "loading";
  const pressed = state === "pressed";
  const disabled = state === "disabled" || loading;
  root.removeAttribute("aria-busy");
  root.removeAttribute("aria-disabled");
  root.removeAttribute("aria-pressed");

  if (root instanceof HTMLButtonElement) {
    root.disabled = disabled;
    root.type = "button";
  } else if (disabled) {
    root.setAttribute("aria-disabled", "true");
    root.tabIndex = -1;
  }

  if (loading) root.setAttribute("aria-busy", "true");
  if (pressed) root.setAttribute("aria-pressed", "true");

  const label = root.ownerDocument.createElement("span");
  label.textContent = loading
    ? isChinese
      ? "保存中…"
      : "Saving…"
    : pressed
      ? isChinese
        ? "已固定"
        : "Pinned"
      : isChinese
        ? "保存"
        : "Save";

  root.replaceChildren();
  if (loading) root.append(buttonStateIcon(root, "loading"));
  if (pressed) root.append(buttonStateIcon(root, "pressed"));
  root.append(label);
}

function applyState(root: HTMLElement, state: string, isChinese: boolean) {
  const control = stateControl(root);
  root.setAttribute("data-state", state);
  root.removeAttribute("aria-busy");
  root.removeAttribute("aria-current");
  root.removeAttribute("aria-pressed");
  root.removeAttribute("data-active");
  root.removeAttribute("data-selected");
  root.removeAttribute("data-validation-state");
  root.removeAttribute("data-readonly");
  root.hidden = false;

  normalizeBulkActionBarState(root, state, isChinese);

  if (root.matches("dialog.dialog, dialog.alert-dialog")) {
    root.dataset.stateSpecimenPresentation = "inline-dialog";
  }

  if (busyStates.has(state)) root.setAttribute("aria-busy", "true");
  if (["disabled", "unavailable"].includes(state)) {
    applyDisabledState(root);
  }
  if (state === "invalid") {
    root.setAttribute("aria-invalid", "true");
    root.dataset.validationState = "invalid";
    control?.setAttribute("aria-invalid", "true");
  }
  if (state === "valid") root.dataset.validationState = "valid";
  if (state === "dirty") root.dataset.dirty = "true";
  if (["readonly", "read-only"].includes(state)) {
    root.setAttribute("aria-readonly", "true");
    root.setAttribute("data-readonly", "");
    if (control && "readOnly" in control) {
      (control as HTMLInputElement | HTMLTextAreaElement).readOnly = true;
    }
  }

  if (["active", "selected"].includes(state))
    root.setAttribute("data-selected", "true");
  if (state === "active") root.setAttribute("data-active", "true");
  if (state === "current" || state === "visited")
    root.setAttribute("aria-current", "page");
  if (state === "pressed") root.setAttribute("aria-pressed", "true");
  const opensDisclosure = [
    "expanded",
    "open",
    "inspector-open",
    "context-open",
    "mobile-open",
  ].includes(state);
  const closesDisclosure = ["collapsed", "closed"].includes(state);
  if (opensDisclosure) {
    applyDisclosureState(root, true);
  } else if (closesDisclosure || disclosureTrigger(root)) {
    applyDisclosureState(root, false);
  }

  const choice =
    root instanceof HTMLInputElement &&
    ["checkbox", "radio"].includes(root.type)
      ? root
      : root.querySelector<HTMLInputElement>(
          "input[type=checkbox], input[type=radio]",
        );
  if (choice) {
    if (state === "checked") choice.checked = true;
    if (state === "unchecked") choice.checked = false;
    if (state === "indeterminate") choice.indeterminate = true;
  }

  const progress =
    root instanceof HTMLProgressElement || root.matches('[role="progressbar"]')
      ? root
      : root.querySelector<HTMLElement>('progress, [role="progressbar"]');
  const progressIndicator =
    progress?.querySelector<HTMLElement>(":scope > span") ?? null;
  if (progress && state === "complete") {
    if (progress instanceof HTMLProgressElement) {
      progress.value = progress.max;
    }
    const maximum = Number(progress.getAttribute("aria-valuemax") ?? "100");
    progress.setAttribute(
      "aria-valuenow",
      String(Number.isFinite(maximum) ? maximum : 100),
    );
    progressIndicator?.style.setProperty("width", "100%");
  }
  if (progress && state === "indeterminate") {
    if (progress instanceof HTMLProgressElement) {
      progress.removeAttribute("value");
    }
    progress.removeAttribute("aria-valuenow");
    progress.removeAttribute("aria-valuetext");
    progressIndicator?.style.removeProperty("width");
  }

  if (state === "hidden") root.hidden = true;
  if (state === "visible") root.hidden = false;

  applyButtonState(root, state, isChinese);
  populateTextControl(root, state, isChinese);
  applyFieldState(root, state, isChinese);
  applyInputState(root, state, isChinese);
  applyTextareaState(root, state, isChinese);
  applyInputGroupState(root, state, isChinese);
  applyHotkeyInputState(root, state, isChinese);
  applyNativeSelectState(root, state, isChinese);
  applyRadioGroupState(root, state, isChinese);
  applyCodeEditorState(root, state, isChinese);
  normalizeGroupedActionState(root, state);
}

function inheritPreviewContext(source: HTMLElement, target: HTMLElement) {
  const previewCanvas = source.closest<HTMLElement>(".a3s-preview__canvas");
  if (!previewCanvas) return;

  const theme = previewCanvas.dataset.a3sTheme;
  if (theme) target.dataset.a3sTheme = theme;
  else target.removeAttribute("data-a3s-theme");

  const direction = previewCanvas.getAttribute("dir");
  if (direction) target.setAttribute("dir", direction);
  else target.removeAttribute("dir");
}

function StateMatrixIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <rect
        x="3"
        y="3"
        width="5.25"
        height="5.25"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="11.75"
        y="3"
        width="5.25"
        height="5.25"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="3"
        y="11.75"
        width="5.25"
        height="5.25"
        rx="1.25"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="m12.4 14.45 1.2 1.2 2.35-2.75"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="m5.5 5.5 9 9m0-9-9 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ComponentStateMatrix({
  canvasRef,
  contract,
  isChinese,
}: ComponentStateMatrixProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sourceMissing, setSourceMissing] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const matrix = matrixRef.current;
    const canvas = canvasRef.current;
    if (!matrix || !canvas) return;

    window.a3sAI?.scan(canvas);
    const source = findContractSource(canvas, contract);
    setSourceMissing(!source);

    matrix
      .querySelectorAll<HTMLElement>("[data-state-specimen-mount]")
      .forEach((mount) => {
        mount.replaceChildren();
        if (!source) return;
        const state = mount.dataset.stateSpecimenMount ?? "ready";
        inheritPreviewContext(source, mount);
        const clone = source.cloneNode(true) as HTMLElement;
        clearRuntimeAnnotations(clone);
        rewriteIds(clone, `a3s-contract-${contract.slug}-${state}`);
        if (contract.slug === "button") {
          const sourceWidth = source.getBoundingClientRect().width;
          if (sourceWidth > 0) clone.style.inlineSize = `${sourceWidth}px`;
        }
        applyState(clone, state, isChinese);
        clone.setAttribute("data-state-specimen-root", state);
        if (
          !mountInputGroupSpecimen(source, clone, mount, state, isChinese) &&
          !mountInputSpecimen(source, clone, mount, state, isChinese) &&
          !mountTextareaSpecimen(source, clone, mount, state, isChinese) &&
          !mountHotkeyInputSpecimen(source, clone, mount, state, isChinese) &&
          !mountNativeSelectSpecimen(source, clone, mount, state, isChinese)
        ) {
          mount.append(clone);
        }
        if (hiddenStates.has(state)) {
          const note = document.createElement("span");
          note.className = "a3s-component-state-matrix__hidden-note";
          note.textContent = isChinese
            ? "该组件在此状态下不显示"
            : "The component is not displayed in this state";
          mount.append(note);
        }
      });

    window.a3sAI?.scan(matrix);
    matrix
      .querySelectorAll<HTMLElement>("[data-state-specimen-mount]")
      .forEach((mount) => {
        const state = mount.dataset.stateSpecimenMount ?? "ready";
        const clone = mount.querySelector<HTMLElement>(
          "[data-state-specimen-root]",
        );
        if (clone) applyState(clone, state, isChinese);
      });
  }, [canvasRef, contract, isChinese, open]);

  const close = () => setOpen(false);
  const restoreTriggerFocus = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <button
        aria-controls={`${titleId}-dialog`}
        aria-expanded={open}
        aria-label={
          isChinese ? "查看状态验收矩阵" : "View state acceptance matrix"
        }
        data-preview-control="states"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        title={isChinese ? "状态验收" : "State acceptance"}
        type="button"
      >
        <StateMatrixIcon />
        <span className="a3s-component-state-matrix__trigger-label">
          {isChinese ? "状态" : "States"}
        </span>
      </button>
      {mounted
        ? createPortal(
            <dialog
              aria-describedby={descriptionId}
              aria-labelledby={titleId}
              className="a3s-component-state-matrix"
              data-component={contract.slug}
              id={`${titleId}-dialog`}
              onCancel={(event) => {
                event.preventDefault();
                restoreTriggerFocus();
              }}
              onClose={restoreTriggerFocus}
              ref={dialogRef}
            >
              <header className="a3s-component-state-matrix__header">
                <div>
                  <h2 id={titleId}>
                    {isChinese
                      ? `${contract.name} 状态验收`
                      : `${contract.name} state acceptance`}
                  </h2>
                  <p id={descriptionId}>
                    {isChinese
                      ? "逐态复制当前实时预览的公开根节点，并应用对应的原生 HTML、ARIA 与公开状态输入。矩阵只用于验收，不替代组件业务示例。"
                      : "Each specimen clones the live public root and applies the corresponding native HTML, ARIA, and public state input. This matrix supports acceptance; it does not replace product examples."}
                  </p>
                </div>
                <button
                  aria-label={
                    isChinese ? "关闭状态验收" : "Close state acceptance"
                  }
                  data-state-matrix-close
                  onClick={close}
                  type="button"
                >
                  <CloseIcon />
                </button>
              </header>

              {sourceMissing ? (
                <div className="a3s-component-state-matrix__error" role="alert">
                  <strong>
                    {isChinese
                      ? "无法创建状态验收矩阵"
                      : "Unable to create the state acceptance matrix"}
                  </strong>
                  <p>
                    {isChinese
                      ? `实时预览中未找到公开根节点 ${contract.selector}。请修复示例与 Manifest 的偏差。`
                      : `The live preview does not contain the public root ${contract.selector}. Repair the example-to-manifest drift.`}
                  </p>
                </div>
              ) : null}

              <div
                aria-label={
                  isChinese ? "组件状态样本" : "Component state specimens"
                }
                className="a3s-component-state-matrix__grid"
                ref={matrixRef}
                role="region"
                tabIndex={0}
              >
                {contract.states.map((state) => (
                  <article data-state-specimen={state} key={state}>
                    <header>
                      <code dir="ltr">{state}</code>
                      <span dir="auto">
                        {stateDescription(state, isChinese)}
                      </span>
                    </header>
                    <div
                      className="a3s-component-state-matrix__specimen"
                      data-state-specimen-mount={state}
                      inert
                    />
                  </article>
                ))}
              </div>
            </dialog>,
            document.body,
          )
        : null}
    </>
  );
}
