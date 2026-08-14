import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  useLang,
  useLocation,
  useSite,
  useVersion,
  withBase,
} from "@rspress/core/runtime";
import Chart, { type ChartConfiguration } from "chart.js/auto";

declare global {
  interface Window {
    a3sUI?: {
      initAll: (options?: { force?: boolean }) => void;
      start: () => void;
    };
    a3sAI?: {
      scan: (root?: Document | Element) => Element[];
    };
  }
}

const attributeAliases: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  colspan: "colSpan",
  rowspan: "rowSpan",
  autocomplete: "autoComplete",
  maxlength: "maxLength",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
};

const eventAliases: Record<string, string> = {
  onclick: "onClick",
  onchange: "onChange",
  oninput: "onInput",
  onkeydown: "onKeyDown",
  onkeyup: "onKeyUp",
  onpointerdown: "onPointerDown",
  onpointerup: "onPointerUp",
  onsubmit: "onSubmit",
};

function parseStyleAttribute(value: string): CSSProperties {
  const entries = value
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(":");
      if (separator === -1) return null;
      const property = declaration.slice(0, separator).trim();
      const propertyValue = declaration.slice(separator + 1).trim();
      const reactProperty = property.startsWith("--")
        ? property
        : property.replace(/-([a-z])/g, (_, letter: string) =>
            letter.toUpperCase(),
          );
      return [reactProperty, propertyValue] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return Object.fromEntries(entries) as CSSProperties;
}

function createInlineHandler(source: string) {
  const evaluate = Function("event", source) as (
    this: EventTarget,
    event: Event,
  ) => void;

  return (event: {
    currentTarget: EventTarget;
    preventDefault: () => void;
  }) => {
    evaluate.call(event.currentTarget, event as unknown as Event);
  };
}

function normalizePreviewNode(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map(normalizePreviewNode);
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<Record<string, unknown>>;
  const normalizedProps: Record<string, unknown> = {};
  const isMutableFormControl =
    typeof element.type === "string" &&
    ["input", "select", "textarea"].includes(element.type);
  const hasValueHandler = ["onChange", "onInput", "onchange", "oninput"].some(
    (name) => element.props[name] !== undefined,
  );

  for (const [name, value] of Object.entries(element.props)) {
    if (name === "children") continue;

    if (isMutableFormControl && !hasValueHandler && name === "value") {
      normalizedProps.value = undefined;
      normalizedProps.defaultValue = value;
      continue;
    }

    if (isMutableFormControl && !hasValueHandler && name === "checked") {
      normalizedProps.checked = undefined;
      normalizedProps.defaultChecked = value;
      continue;
    }

    const attributeAlias = attributeAliases[name];
    if (attributeAlias) {
      normalizedProps[name] = undefined;
      normalizedProps[attributeAlias] = value;
      continue;
    }

    const eventAlias = eventAliases[name];
    if (eventAlias && typeof value === "string") {
      normalizedProps[name] = undefined;
      normalizedProps[eventAlias] = createInlineHandler(value);
      normalizedProps[`data-preview-${name}`] = value;
      continue;
    }

    if (name === "style" && typeof value === "string") {
      normalizedProps.style = parseStyleAttribute(value);
      continue;
    }

    normalizedProps[name] = value;
  }

  normalizedProps.children = normalizePreviewNode(
    element.props.children as ReactNode,
  );
  return cloneElement(element, normalizedProps);
}

function initializeDocumentationDemos(root: HTMLElement) {
  root
    .querySelectorAll<HTMLElement>("[data-checkbox-table]")
    .forEach((table) => {
      if (table.dataset.demoCheckboxTableInitialized) return;
      table.dataset.demoCheckboxTableInitialized = "true";
      const selectAll = table.querySelector<HTMLInputElement>(
        "thead input[type='checkbox']",
      );
      const rowCheckboxes = Array.from(
        table.querySelectorAll<HTMLInputElement>(
          "tbody input[type='checkbox']",
        ),
      );

      const synchronize = () => {
        rowCheckboxes.forEach((checkbox) => {
          const row = checkbox.closest<HTMLElement>("tr");
          if (!row) return;
          if (checkbox.checked) row.dataset.state = "selected";
          else row.removeAttribute("data-state");
        });

        if (!selectAll || rowCheckboxes.length === 0) return;
        const selected = rowCheckboxes.filter(
          (checkbox) => checkbox.checked,
        ).length;
        selectAll.checked = selected === rowCheckboxes.length;
        selectAll.indeterminate =
          selected > 0 && selected < rowCheckboxes.length;
      };

      selectAll?.addEventListener("change", () => {
        rowCheckboxes.forEach((checkbox) => {
          checkbox.checked = Boolean(selectAll.checked);
        });
        synchronize();
      });
      rowCheckboxes.forEach((checkbox) =>
        checkbox.addEventListener("change", synchronize),
      );
      synchronize();
    });

  window.a3sUI?.start();
  window.a3sUI?.initAll();
}

function handleDocumentationDemoClick(event: ReactMouseEvent<HTMLDivElement>) {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const paginationLink = target.closest<HTMLAnchorElement>(
    ".pagination [data-pagination-page]",
  );
  if (paginationLink) {
    event.preventDefault();
    const pagination = paginationLink.closest<HTMLElement>(".pagination");
    pagination
      ?.querySelectorAll<HTMLElement>('[aria-current="page"]')
      .forEach((link) => link.removeAttribute("aria-current"));
    paginationLink.setAttribute("aria-current", "page");
    return;
  }

  const activityLink = target.closest<HTMLAnchorElement>(
    '.activity-bar a[href^="#"]',
  );
  if (activityLink) {
    event.preventDefault();
    const activityBar = activityLink.closest<HTMLElement>(".activity-bar");
    activityBar
      ?.querySelectorAll<HTMLAnchorElement>('a[aria-current="page"]')
      .forEach((link) => link.removeAttribute("aria-current"));
    activityLink.setAttribute("aria-current", "page");
    return;
  }
}

type PreviewProps = HTMLAttributes<HTMLDivElement> & {
  class?: string;
  children: ReactNode;
  source?: string;
};

type PreviewView = "preview" | "code";

const previewVoidElements = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const previewBooleanAttributes = new Set([
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected",
]);

const previewRuntimeAttribute =
  /^(?:data-basecoat-component|data-a3s-(?:component|components|part-owners|parts|positioned|state)|data-resolved-(?:align|side)|data-[a-z0-9-]+-initialized)$/;
const previewDemoAttribute =
  /^data-(?:demo-[a-z0-9-]+|[a-z0-9-]+-demo(?:-[a-z0-9-]+)?)$/;

function escapePreviewText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapePreviewAttribute(value: string) {
  return escapePreviewText(value).replaceAll('"', "&quot;");
}

function previewAttributeSource(element: Element) {
  return Array.from(element.attributes).map(({ name, value }) => {
    const normalizedName = name.toLowerCase();
    if (previewBooleanAttributes.has(normalizedName) && value === "") {
      return name;
    }
    return `${name}="${escapePreviewAttribute(value)}"`;
  });
}

function formatPreviewElement(element: Element, depth = 0): string {
  const indentation = "  ".repeat(depth);
  const childIndentation = "  ".repeat(depth + 1);
  const tagName = element.tagName.toLowerCase();
  const attributes = previewAttributeSource(element);
  const compactOpening = `<${tagName}${attributes.length ? ` ${attributes.join(" ")}` : ""}>`;
  const opening =
    indentation.length + compactOpening.length <= 108
      ? `${indentation}${compactOpening}`
      : [
          `${indentation}<${tagName}`,
          ...attributes.map((attribute) => `${childIndentation}${attribute}`),
          `${indentation}>`,
        ].join("\n");

  if (previewVoidElements.has(tagName)) return opening;

  const children = Array.from(element.childNodes).filter(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())),
  );
  if (children.length === 0) return `${opening}</${tagName}>`;

  const textOnly = children.every((node) => node.nodeType === Node.TEXT_NODE);
  if (textOnly) {
    const text = children
      .map((node) => node.textContent ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    const inline = `${compactOpening}${escapePreviewText(text)}</${tagName}>`;
    if (!opening.includes("\n") && indentation.length + inline.length <= 120) {
      return `${indentation}${inline}`;
    }
  }

  const formattedChildren = children.flatMap((node) => {
    if (node instanceof Element) return formatPreviewElement(node, depth + 1);
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    return text ? `${childIndentation}${escapePreviewText(text)}` : [];
  });

  return [opening, ...formattedChildren, `${indentation}</${tagName}>`].join(
    "\n",
  );
}

function previewSourceFromCanvas(canvas: HTMLElement) {
  const clone = canvas.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach(({ name }) => {
      if (name.startsWith("data-preview-on")) {
        element.setAttribute(
          name.slice("data-preview-".length),
          element.getAttribute(name) ?? "",
        );
        element.removeAttribute(name);
        return;
      }
      if (
        name === "data-reactroot" ||
        previewRuntimeAttribute.test(name) ||
        previewDemoAttribute.test(name)
      ) {
        element.removeAttribute(name);
      }
    });

    if (
      element instanceof HTMLCanvasElement &&
      element.closest(".a3s-chart-demo")
    ) {
      element.removeAttribute("height");
      element.removeAttribute("style");
      element.removeAttribute("width");
    }
  });

  return Array.from(clone.children)
    .map((element) => formatPreviewElement(element))
    .join("\n");
}

async function writePreviewSource(source: string) {
  let clipboardError: unknown;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(source);
      return;
    } catch (error) {
      clipboardError = error;
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = source;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) {
    throw (
      clipboardError ?? new Error("The browser rejected the copy operation.")
    );
  }
}

export function Preview({
  children,
  className,
  class: htmlClass,
  source,
}: PreviewProps) {
  const location = useLocation();
  const language = useLang();
  const previewRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const copyResetRef = useRef<number | null>(null);
  const panelId = useId();
  const [activeView, setActiveView] = useState<PreviewView>("preview");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [sourceText, setSourceText] = useState(source ?? "");
  const componentName =
    location.pathname.match(/\/components\/([^/.]+)/)?.[1] ??
    (/\/components\/?$/.test(location.pathname) ? "index" : undefined);
  const isChinese = language === "zh";
  const previewTabId = `${panelId}-preview-tab`;
  const previewPanelId = `${panelId}-preview-panel`;
  const codeTabId = `${panelId}-code-tab`;
  const codePanelId = `${panelId}-code-panel`;

  const selectView = (view: PreviewView, focus = false) => {
    setActiveView(view);
    if (focus) {
      requestAnimationFrame(() => {
        previewRef.current
          ?.querySelector<HTMLElement>(`[data-preview-view="${view}"]`)
          ?.focus();
      });
    }
    if (view === "preview") {
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
  };

  const handleViewKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const nextView =
      event.key === "ArrowLeft" || event.key === "Home"
        ? "preview"
        : event.key === "ArrowRight" || event.key === "End"
          ? "code"
          : null;
    if (!nextView) return;
    event.preventDefault();
    selectView(nextView, true);
  };

  const handleCopySource = async () => {
    try {
      await writePreviewSource(sourceText);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    if (copyResetRef.current !== null) {
      window.clearTimeout(copyResetRef.current);
    }
    copyResetRef.current = window.setTimeout(() => setCopyState("idle"), 2000);
  };

  useEffect(() => {
    const preview = previewRef.current;
    const syncOverlayState = () => {
      preview?.toggleAttribute(
        "data-overlay-open",
        Boolean(preview.querySelector('[data-popover][aria-hidden="false"]')),
      );
    };

    const overlayObserver = new MutationObserver(syncOverlayState);
    if (preview) {
      overlayObserver.observe(preview, {
        attributes: true,
        attributeFilter: ["aria-hidden"],
        subtree: true,
      });
    }

    syncOverlayState();
    if (canvasRef.current) {
      setSourceText(source ?? previewSourceFromCanvas(canvasRef.current));
      initializeDocumentationDemos(canvasRef.current);
      window.a3sAI?.scan(canvasRef.current);
    }
    syncOverlayState();
    return () => {
      overlayObserver.disconnect();
    };
  }, [children, source]);

  useEffect(
    () => () => {
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
    },
    [],
  );

  return (
    <section
      ref={previewRef}
      className="a3s-preview"
      aria-label={
        language === "zh" ? "交互式组件预览" : "Interactive component preview"
      }
      data-preview-component={componentName}
      data-preview-active-view={activeView}
      data-preview-source={sourceText ? "ready" : "pending"}
    >
      <header className="a3s-preview__header">
        <span>
          <i aria-hidden="true" />
          {language === "zh" ? "实时预览" : "Live preview"}
        </span>
        <div className="a3s-preview__header-actions">
          <small>HTML · CSS · JavaScript</small>
          <div
            className="a3s-preview__view-tabs"
            role="tablist"
            aria-label={isChinese ? "预览显示模式" : "Preview display mode"}
          >
            <button
              id={previewTabId}
              type="button"
              role="tab"
              aria-controls={previewPanelId}
              aria-selected={activeView === "preview"}
              data-preview-view="preview"
              tabIndex={activeView === "preview" ? 0 : -1}
              onClick={() => selectView("preview")}
              onKeyDown={handleViewKeyDown}
            >
              {isChinese ? "预览" : "Preview"}
            </button>
            <button
              id={codeTabId}
              type="button"
              role="tab"
              aria-controls={codePanelId}
              aria-selected={activeView === "code"}
              data-preview-view="code"
              tabIndex={activeView === "code" ? 0 : -1}
              onClick={() => selectView("code")}
              onKeyDown={handleViewKeyDown}
            >
              {isChinese ? "代码" : "Code"}
            </button>
          </div>
        </div>
      </header>
      <div
        id={previewPanelId}
        className="a3s-preview__stage"
        role="tabpanel"
        aria-labelledby={previewTabId}
        hidden={activeView !== "preview"}
      >
        <div
          ref={canvasRef}
          onClick={handleDocumentationDemoClick}
          className={["a3s-preview__canvas", "rp-not-doc", className, htmlClass]
            .filter(Boolean)
            .join(" ")}
        >
          {normalizePreviewNode(children)}
        </div>
      </div>
      <div
        id={codePanelId}
        className="a3s-preview__source"
        role="tabpanel"
        aria-labelledby={codeTabId}
        hidden={activeView !== "code"}
      >
        <div className="a3s-preview__source-toolbar">
          <span>{isChinese ? "语义化 HTML" : "Semantic HTML"}</span>
          <button
            type="button"
            data-preview-copy
            data-copy-state={copyState}
            onClick={handleCopySource}
          >
            {copyState === "copied"
              ? isChinese
                ? "已复制"
                : "Copied"
              : copyState === "error"
                ? isChinese
                  ? "复制失败，请重试"
                  : "Copy failed. Try again"
                : isChinese
                  ? "复制代码"
                  : "Copy code"}
          </button>
        </div>
        <pre tabIndex={0}>
          <code>
            {sourceText ||
              (isChinese ? "正在生成预览源码…" : "Preparing preview source…")}
          </code>
        </pre>
      </div>
    </section>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <div className="a3s-steps">{children}</div>;
}

export function Step({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="a3s-step">
      <div className="a3s-step__rail" aria-hidden="true">
        <span />
      </div>
      <div className="a3s-step__body">
        <h3>{title}</h3>
        {children}
      </div>
    </section>
  );
}

export function CodeGroup({ children }: { children: ReactNode }) {
  return <div className="a3s-code-group">{Children.toArray(children)}</div>;
}

type CalloutProps = {
  action?: { label: string; href: string };
  children: ReactNode;
  icon?: string;
  title?: string;
  type?: "info" | "warning" | "danger" | "success";
};

export function Callout({
  action,
  children,
  title,
  type = "info",
}: CalloutProps) {
  const language = useLang();
  const version = useVersion();
  const { site } = useSite();
  const routePrefix = [
    version && version !== site.multiVersion.default ? version : "",
    language !== site.lang ? language : "",
  ]
    .filter(Boolean)
    .join("/");
  const actionHref = action
    ? action.href.startsWith("/")
      ? withBase(
          `/${[routePrefix, action.href.replace(/^\/+/, "")]
            .filter(Boolean)
            .join("/")}`,
        )
      : action.href
    : undefined;

  return (
    <aside className="a3s-callout" data-type={type}>
      <span className="a3s-callout__mark" aria-hidden="true">
        {type === "warning" ? "!" : type === "danger" ? "×" : "i"}
      </span>
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
      {action && actionHref ? (
        <a href={actionHref} className="a3s-callout__action">
          {action.label} <span aria-hidden="true">→</span>
        </a>
      ) : null}
    </aside>
  );
}

type ChartDemoVariant = "bar" | "line" | "step" | "stacked" | "donut" | "radar";

function chartConfiguration(variant: ChartDemoVariant): ChartConfiguration {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const gridColor = "rgba(123, 132, 148, 0.16)";
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: variant === "donut" || variant === "radar" },
    },
    scales:
      variant === "donut" || variant === "radar"
        ? undefined
        : {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: gridColor } },
          },
  };

  if (variant === "donut") {
    return {
      type: "doughnut",
      data: {
        labels: ["Direct", "Search", "Social", "Referral"],
        datasets: [
          {
            data: [42, 31, 17, 10],
            backgroundColor: ["#4f7ff0", "#28a978", "#9a63df", "#e4a43b"],
            borderWidth: 0,
          },
        ],
      },
      options: commonOptions,
    };
  }

  if (variant === "radar") {
    return {
      type: "radar",
      data: {
        labels: ["Speed", "Quality", "Safety", "Reach", "Control", "Clarity"],
        datasets: [
          {
            label: "A3S UI",
            data: [86, 92, 88, 78, 91, 94],
            borderColor: "#4f7ff0",
            backgroundColor: "rgba(79, 127, 240, 0.18)",
            pointBackgroundColor: "#4f7ff0",
          },
        ],
      },
      options: commonOptions,
    };
  }

  const isLine = variant === "line" || variant === "step";
  return {
    type: isLine ? "line" : "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Desktop",
          data: [186, 305, 237, 273, 209, 314],
          borderColor: "#4f7ff0",
          backgroundColor: isLine ? "rgba(79, 127, 240, 0.14)" : "#4f7ff0",
          fill: isLine,
          stepped: variant === "step",
          tension: variant === "line" ? 0.35 : 0,
          stack: variant === "stacked" ? "traffic" : undefined,
        },
        {
          label: "Mobile",
          data: [80, 200, 120, 190, 130, 220],
          borderColor: "#28a978",
          backgroundColor: isLine ? "rgba(40, 169, 120, 0.08)" : "#71c9a8",
          fill: isLine,
          tension: variant === "line" ? 0.35 : 0,
          stack: variant === "stacked" ? "traffic" : undefined,
        },
      ],
    },
    options: commonOptions,
  };
}

export function ChartDemo({ variant = "bar" }: { variant?: ChartDemoVariant }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, chartConfiguration(variant));
    return () => chart.destroy();
  }, [variant]);

  return (
    <div className="a3s-chart-demo chart">
      <canvas ref={canvasRef} aria-label={`${variant} chart preview`} />
    </div>
  );
}
