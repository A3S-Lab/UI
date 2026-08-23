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

function applyCodeEditorState(
  root: HTMLElement,
  state: string,
  isChinese: boolean,
) {
  if (!root.matches(".code-editor")) return;

  const control = root.querySelector<HTMLTextAreaElement>("textarea");
  const status = root.querySelector<HTMLElement>("[data-code-editor-state]");
  const message = root.querySelector<HTMLElement>(
    "[data-code-editor-message]",
  );
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

function applyState(root: HTMLElement, state: string, isChinese: boolean) {
  const control = stateControl(root);
  root.setAttribute("data-state", state);

  if (root.matches("dialog.dialog, dialog.alert-dialog")) {
    root.dataset.stateSpecimenPresentation = "inline-dialog";
  }

  if (busyStates.has(state)) root.setAttribute("aria-busy", "true");
  if (["disabled", "unavailable"].includes(state)) {
    root.setAttribute("aria-disabled", "true");
    if (control && "disabled" in control) {
      (
        control as
          | HTMLButtonElement
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement
      ).disabled = true;
    }
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
    root.setAttribute("data-readonly", "true");
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
  if (
    [
      "expanded",
      "open",
      "inspector-open",
      "context-open",
      "mobile-open",
    ].includes(state)
  ) {
    root.setAttribute("aria-expanded", "true");
  }
  if (["collapsed", "closed"].includes(state))
    root.setAttribute("aria-expanded", "false");

  if (root instanceof HTMLDialogElement || root instanceof HTMLDetailsElement) {
    if (state === "open") root.setAttribute("open", "");
    if (state === "closed") root.removeAttribute("open");
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

  applyCodeEditorState(root, state, isChinese);
}

function inheritPreviewContext(source: HTMLElement, clone: HTMLElement) {
  const previewCanvas = source.closest<HTMLElement>(".a3s-preview__canvas");
  if (!previewCanvas) return;

  const theme = previewCanvas.dataset.a3sTheme;
  if (theme && !clone.hasAttribute("data-a3s-theme")) {
    clone.dataset.a3sTheme = theme;
  }

  const direction = previewCanvas.getAttribute("dir");
  if (direction && !clone.hasAttribute("dir")) {
    clone.setAttribute("dir", direction);
  }
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
        const clone = source.cloneNode(true) as HTMLElement;
        clearRuntimeAnnotations(clone);
        rewriteIds(clone, `a3s-contract-${contract.slug}-${state}`);
        inheritPreviewContext(source, clone);
        applyState(clone, state, isChinese);
        clone.setAttribute("data-state-specimen-root", state);
        mount.append(clone);
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

              <div className="a3s-component-state-matrix__grid" ref={matrixRef}>
                {contract.states.map((state) => (
                  <article data-state-specimen={state} key={state}>
                    <header>
                      <code>{state}</code>
                      <span>{stateDescription(state, isChinese)}</span>
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
