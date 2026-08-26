import {
  Children,
  createElement,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { CodeBlockRuntime } from "@rspress/core/theme";
import { getComponent } from "../../../dist/ai/manifest.js";
import {
  ThemeContext,
  useLang,
  useLocation,
  useSite,
  useVersion,
  withBase,
} from "@rspress/core/runtime";
import { writeClipboardText } from "./clipboard";
import {
  needsRenderedPreviewSource,
  previewSourceFromCanvas,
  previewStylesheetHrefs,
  resolvePreviewLayout,
  responsivePreviewDocument,
  type PreviewLayout,
  type PreviewViewport,
} from "./DocsPreviewRuntime";
import { ComponentPreviewIntegration } from "./ComponentPreviewIntegration";
import { ComponentStateMatrix } from "./ComponentStateMatrix";

export { ChartDemo } from "./DocsChartDemo";

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
  inputmode: "inputMode",
  enterkeyhint: "enterKeyHint",
  maxlength: "maxLength",
  novalidate: "noValidate",
  readonly: "readOnly",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
};

const eventAliases: Record<string, string> = {
  onclick: "onClick",
  onchange: "onChange",
  oncompositionend: "onCompositionEnd",
  oncompositionstart: "onCompositionStart",
  oncompositionupdate: "onCompositionUpdate",
  oninput: "onInput",
  onkeydown: "onKeyDown",
  onkeyup: "onKeyUp",
  onpointerdown: "onPointerDown",
  onpointerup: "onPointerUp",
  onreset: "onReset",
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

  return (event: SyntheticEvent) => {
    const inlineEvent = Object.create(event) as SyntheticEvent & {
      isComposing?: boolean;
    };
    const nativeEvent = event.nativeEvent as Event & {
      isComposing?: boolean;
    };
    if (typeof nativeEvent.isComposing === "boolean") {
      Object.defineProperty(inlineEvent, "isComposing", {
        configurable: true,
        value: nativeEvent.isComposing,
      });
    }
    evaluate.call(event.currentTarget, inlineEvent as unknown as Event);
  };
}

function normalizePreviewNode(node: ReactNode): ReactNode {
  if (Array.isArray(node)) {
    return Children.toArray(node).map(normalizePreviewNode);
  }
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<Record<string, unknown>>;
  const normalizedProps: Record<string, unknown> = {};
  const isMutableFormControl =
    typeof element.type === "string" &&
    ["input", "select", "textarea"].includes(element.type);
  const hasManagedValueHandler = [
    "onChange",
    "onInput",
    "onchange",
    "oninput",
  ].some((name) => typeof element.props[name] === "function");

  for (const [name, value] of Object.entries(element.props)) {
    if (name === "children") continue;

    if (isMutableFormControl && !hasManagedValueHandler && name === "value") {
      normalizedProps.defaultValue = value;
      continue;
    }

    if (isMutableFormControl && !hasManagedValueHandler && name === "checked") {
      normalizedProps.defaultChecked = value;
      continue;
    }

    const attributeAlias = attributeAliases[name];
    if (attributeAlias) {
      normalizedProps[attributeAlias] = value;
      continue;
    }

    const eventAlias = eventAliases[name];
    if (eventAlias && typeof value === "string") {
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
  return createElement(element.type, {
    ...normalizedProps,
    key: element.key ?? undefined,
  });
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

  const bulkClear = target.closest<HTMLElement>("[data-demo-bulk-clear]");
  if (bulkClear) {
    const bar = bulkClear.closest<HTMLElement>(".bulk-action-bar");
    if (bar) bar.hidden = true;
    return;
  }

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
  frameworkHtml?: string;
  frameworkHtmlInstall?: string;
  frameworkReact?: string;
  frameworkReactInstall?: string;
  frameworkVue?: string;
  frameworkVueInstall?: string;
  hasController?: boolean;
  integrationHook?: string;
  layout?: PreviewLayout;
  semanticFrameworks?: boolean;
  source?: string;
  title?: string;
};

const previewViewportDimensions = {
  phone: {
    heights: { center: 280, flow: 480, overlay: 520, workspace: 592 },
    label: "Phone",
    width: 390,
  },
  tablet: {
    heights: { center: 320, flow: 520, overlay: 600, workspace: 672 },
    label: "Tablet",
    width: 768,
  },
} as const satisfies Record<
  Exclude<PreviewViewport, "fluid">,
  {
    heights: Record<PreviewLayout, number>;
    label: string;
    width: number;
  }
>;

function ResponsivePreviewFrame({
  documentSource,
  isChinese,
  layout,
  resolvedTitle,
  viewport,
}: {
  documentSource: string;
  isChinese: boolean;
  layout: PreviewLayout;
  resolvedTitle: string;
  viewport: Exclude<PreviewViewport, "fluid">;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dimensions = previewViewportDimensions[viewport];
  const frameHeight = dimensions.heights[layout];
  const frameOuterWidth = dimensions.width + 2;
  const frameOuterHeight = frameHeight + 2;

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const synchronizeScale = () => {
      const nextScale = Math.min(1, shell.clientWidth / frameOuterWidth);
      setScale((current) =>
        Math.abs(current - nextScale) < 0.001 ? current : nextScale,
      );
    };

    synchronizeScale();
    const observer = new ResizeObserver(synchronizeScale);
    observer.observe(shell);
    return () => observer.disconnect();
  }, [frameOuterWidth]);

  return (
    <div
      ref={shellRef}
      className="a3s-preview__viewport-shell"
      style={{
        height: frameOuterHeight * scale,
        maxWidth: frameOuterWidth,
      }}
    >
      <div
        className="a3s-preview__viewport-frame"
        data-preview-emulated-viewport={viewport}
        style={{
          height: frameHeight,
          transform: `scale(${scale})`,
          width: dimensions.width,
        }}
      >
        <div className="a3s-preview__viewport-frame-bar" aria-hidden="true">
          <span>{dimensions.width} CSS px</span>
          <span>{dimensions.label}</span>
        </div>
        <iframe
          className="a3s-preview__viewport-frame-content"
          title={
            isChinese
              ? `${resolvedTitle}${viewport === "phone" ? "手机" : "平板"}预览`
              : `${resolvedTitle} ${viewport} preview`
          }
          srcDoc={documentSource}
          sandbox="allow-scripts"
          allow="clipboard-write"
          loading="eager"
        />
      </div>
    </div>
  );
}

function PreviewCodeIcon() {
  return (
    <svg
      aria-hidden="true"
      data-preview-icon="source-code"
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
    >
      <path
        d="m7.25 5.5-4 4.5 4 4.5M12.75 5.5l4 4.5-4 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PreviewViewportIcon({ viewport }: { viewport: PreviewViewport }) {
  if (viewport === "phone") {
    return (
      <svg
        aria-hidden="true"
        data-preview-icon="viewport-phone"
        viewBox="0 0 20 20"
        fill="none"
      >
        <rect
          x="6.25"
          y="2.75"
          width="7.5"
          height="14.5"
          rx="1.75"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M9 14.75h2" stroke="currentColor" strokeLinecap="round" />
      </svg>
    );
  }

  if (viewport === "tablet") {
    return (
      <svg
        aria-hidden="true"
        data-preview-icon="viewport-tablet"
        viewBox="0 0 20 20"
        fill="none"
      >
        <rect
          x="3.5"
          y="2.75"
          width="13"
          height="14.5"
          rx="1.75"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M9 14.75h2" stroke="currentColor" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      data-preview-icon="viewport-fluid"
      viewBox="0 0 20 20"
      fill="none"
    >
      <rect
        x="2.75"
        y="4.25"
        width="14.5"
        height="11.5"
        rx="1.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7.25 10H4.5m0 0 1.75-1.75M4.5 10l1.75 1.75M12.75 10h2.75m0 0-1.75-1.75M15.5 10l-1.75 1.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PreviewThemeIcon({ target }: { target: "dark" | "light" }) {
  return target === "dark" ? (
    <svg
      aria-hidden="true"
      data-preview-icon="theme-dark"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M15.6 12.8A6.2 6.2 0 0 1 7.2 4.4 6.4 6.4 0 1 0 15.6 12.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      data-preview-icon="theme-light"
      viewBox="0 0 20 20"
      fill="none"
    >
      <circle cx="10" cy="10" r="3.25" stroke="currentColor" />
      <path
        d="M10 2.25v1.5M10 16.25v1.5M2.25 10h1.5M16.25 10h1.5M4.52 4.52l1.06 1.06M14.42 14.42l1.06 1.06M15.48 4.52l-1.06 1.06M5.58 14.42l-1.06 1.06"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PreviewCopyIcon({ copied }: { copied: boolean }) {
  return (
    <svg
      aria-hidden="true"
      data-preview-icon={copied ? "copy-complete" : "copy"}
      viewBox="0 0 20 20"
      width="16"
      height="16"
      fill="none"
    >
      {copied ? (
        <path
          d="m4.5 10.25 3.25 3.25 7.75-7.75"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <rect
            x="6.25"
            y="6.25"
            width="9"
            height="9"
            rx="1.75"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M13.25 6.25v-1.5c0-.97-.78-1.75-1.75-1.75H4.75C3.78 3 3 3.78 3 4.75v6.75c0 .97.78 1.75 1.75 1.75h1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function findPreviewHeading(preview: HTMLElement) {
  let sibling = preview.previousElementSibling;

  while (sibling) {
    if (sibling.matches("h1, h2, h3, h4")) {
      return (
        sibling.textContent?.replace(/\s+/g, " ").trim().replace(/^#\s*/, "") ??
        ""
      );
    }
    sibling = sibling.previousElementSibling;
  }

  return "";
}

export function Preview({
  children,
  className,
  class: htmlClass,
  frameworkHtml,
  frameworkHtmlInstall,
  frameworkReact,
  frameworkReactInstall,
  frameworkVue,
  frameworkVueInstall,
  hasController = false,
  integrationHook,
  layout,
  semanticFrameworks = false,
  source,
  title,
}: PreviewProps) {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();
  const language = useLang();
  const previewRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const copyResetRef = useRef<number | null>(null);
  const titleId = useId();
  const sourceId = useId();
  const [sourceText, setSourceText] = useState(source ?? "");
  const [integrationSourceText, setIntegrationSourceText] = useState(
    frameworkHtml ?? "",
  );
  const [responsiveSourceText, setResponsiveSourceText] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [viewport, setViewport] = useState<PreviewViewport>("fluid");
  const [alternateTheme, setAlternateTheme] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const frameworkSnippets = useMemo(
    () =>
      typeof frameworkHtml === "string" &&
      frameworkHtml.trim() &&
      typeof frameworkReact === "string" &&
      frameworkReact.trim() &&
      typeof frameworkVue === "string" &&
      frameworkVue.trim()
        ? {
            html: frameworkHtml,
            react: frameworkReact,
            vue: frameworkVue,
          }
        : undefined,
    [frameworkHtml, frameworkReact, frameworkVue],
  );
  const copyTarget = frameworkSnippets
    ? integrationSourceText || frameworkSnippets.html
    : sourceText;
  const componentName =
    location.pathname.match(/\/(?:components|harness)\/([^/.]+)/)?.[1] ??
    (/\/(?:components|harness)\/?$/.test(location.pathname)
      ? "index"
      : undefined);
  const componentContract = componentName
    ? getComponent(componentName)
    : undefined;
  const resolvedLayout = resolvePreviewLayout(componentName, layout);
  const isChinese = language === "zh";
  const fallbackTitle = isChinese ? "实时预览" : "Live preview";
  const [resolvedTitle, setResolvedTitle] = useState(
    title?.trim() || fallbackTitle,
  );

  useEffect(() => {
    const nextTitle =
      title?.trim() ||
      (previewRef.current ? findPreviewHeading(previewRef.current) : "") ||
      fallbackTitle;
    setResolvedTitle(nextTitle);
  }, [fallbackTitle, location.pathname, title]);

  useEffect(
    () => () => {
      if (copyResetRef.current !== null) {
        window.clearTimeout(copyResetRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!frameworkSnippets) return;
    setCopyState("idle");
    if (copyResetRef.current !== null) {
      window.clearTimeout(copyResetRef.current);
      copyResetRef.current = null;
    }
  }, [frameworkSnippets, integrationSourceText]);

  useEffect(() => {
    const preview = previewRef.current;
    let overlayFrame: number | null = null;
    const syncOverlayState = () => {
      const openOverlays = Array.from(
        preview?.querySelectorAll<HTMLElement>(
          '[data-popover][aria-hidden="false"], [data-context-content][aria-hidden="false"]',
        ) ?? [],
      );
      preview?.toggleAttribute("data-overlay-open", openOverlays.length > 0);

      const stage = preview?.querySelector<HTMLElement>(".a3s-preview__stage");
      if (!stage) return;
      if (overlayFrame !== null) window.cancelAnimationFrame(overlayFrame);
      stage.style.removeProperty("--a3s-preview-overlay-extension");
      if (openOverlays.length === 0) return;

      overlayFrame = window.requestAnimationFrame(() => {
        const stageBounds = stage.getBoundingClientRect();
        const overlayBottom = Math.max(
          ...openOverlays.map(
            (overlay) => overlay.getBoundingClientRect().bottom,
          ),
        );
        const extension = Math.max(
          0,
          Math.ceil(overlayBottom - stageBounds.bottom + 24),
        );
        stage.style.setProperty(
          "--a3s-preview-overlay-extension",
          `${extension}px`,
        );
        overlayFrame = null;
      });
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
      const renderedSource =
        !source || needsRenderedPreviewSource(source)
          ? previewSourceFromCanvas(canvasRef.current, "source")
          : "";
      setSourceText(
        source && !needsRenderedPreviewSource(source)
          ? source
          : renderedSource || source || "",
      );
      initializeDocumentationDemos(canvasRef.current);
      window.a3sAI?.scan(canvasRef.current);
      setResponsiveSourceText(
        previewSourceFromCanvas(canvasRef.current, "responsive"),
      );
    }
    syncOverlayState();
    return () => {
      overlayObserver.disconnect();
      if (overlayFrame !== null) window.cancelAnimationFrame(overlayFrame);
    };
  }, [children, source]);

  useEffect(() => {
    if (viewport === "fluid" || !canvasRef.current) return;
    setResponsiveSourceText(
      previewSourceFromCanvas(canvasRef.current, "responsive"),
    );
  }, [children, source, viewport]);

  const copySource = async () => {
    if (!copyTarget) return;
    if (copyResetRef.current !== null) {
      window.clearTimeout(copyResetRef.current);
    }

    try {
      await writeClipboardText(copyTarget);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    copyResetRef.current = window.setTimeout(() => {
      setCopyState("idle");
      copyResetRef.current = null;
    }, 1800);
  };

  const copyLabel =
    copyState === "copied"
      ? isChinese
        ? frameworkSnippets
          ? "代码已复制"
          : "源码已复制"
        : frameworkSnippets
          ? "Code copied"
          : "Source copied"
      : copyState === "error"
        ? isChinese
          ? "复制失败"
          : "Copy failed"
        : isChinese
          ? frameworkSnippets
            ? "复制当前代码"
            : "复制源码"
          : frameworkSnippets
            ? "Copy current code"
            : "Copy source";
  const copyVisibleLabel =
    copyState === "copied"
      ? isChinese
        ? "已复制"
        : "Copied"
      : copyState === "error"
        ? isChinese
          ? "重试"
          : "Retry"
        : isChinese
          ? "复制"
          : "Copy";
  const accessibleName =
    resolvedTitle === fallbackTitle
      ? isChinese
        ? "交互式组件预览"
        : "Interactive component preview"
      : isChinese
        ? `${resolvedTitle}组件预览`
        : `${resolvedTitle} component preview`;
  const siteIsDark = theme === "dark";
  const previewScheme = alternateTheme
    ? siteIsDark
      ? "light"
      : "dark"
    : "inherit";
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dialogs = Array.from(
      canvas.querySelectorAll<HTMLDialogElement>("dialog"),
    );
    const originals = dialogs.map((dialog) => ({
      dialog,
      direction: dialog.getAttribute("dir"),
      theme: dialog.getAttribute("data-a3s-theme"),
    }));

    for (const { dialog, direction, theme: originalTheme } of originals) {
      if (previewScheme === "inherit") {
        if (originalTheme === null) dialog.removeAttribute("data-a3s-theme");
        else dialog.setAttribute("data-a3s-theme", originalTheme);
      } else {
        dialog.dataset.a3sTheme = previewScheme;
      }

      if (rtl) dialog.setAttribute("dir", "rtl");
      else if (direction === null) dialog.removeAttribute("dir");
      else dialog.setAttribute("dir", direction);
    }

    return () => {
      for (const { dialog, direction, theme: originalTheme } of originals) {
        if (originalTheme === null) dialog.removeAttribute("data-a3s-theme");
        else dialog.setAttribute("data-a3s-theme", originalTheme);

        if (direction === null) dialog.removeAttribute("dir");
        else dialog.setAttribute("dir", direction);
      }
    };
  }, [children, previewScheme, rtl]);
  const responsiveDocument = useMemo(
    () =>
      responsivePreviewDocument({
        classes: [className, htmlClass].filter(Boolean).join(" "),
        dark:
          previewScheme === "dark" ||
          (previewScheme === "inherit" && siteIsDark),
        direction: rtl ? "rtl" : "ltr",
        language,
        layout: resolvedLayout,
        runtimeHref: withBase("/assets/a3s-ui.min.js"),
        source: responsiveSourceText,
        stylesheetHrefs: previewStylesheetHrefs(withBase("/assets/a3s-ui.css")),
      }),
    [
      className,
      htmlClass,
      language,
      previewScheme,
      resolvedLayout,
      rtl,
      siteIsDark,
      responsiveSourceText,
    ],
  );
  const viewportOptions: Array<{
    label: string;
    value: PreviewViewport;
  }> = [
    {
      label: isChinese ? "自适应宽度" : "Fluid width",
      value: "fluid",
    },
    {
      label: isChinese ? "手机宽度" : "Phone width",
      value: "phone",
    },
    {
      label: isChinese ? "平板宽度" : "Tablet width",
      value: "tablet",
    },
  ];
  const themeLabel = alternateTheme
    ? isChinese
      ? "恢复文档主题"
      : "Use documentation theme"
    : siteIsDark
      ? isChinese
        ? "切换为浅色预览"
        : "Preview in light mode"
      : isChinese
        ? "切换为深色预览"
        : "Preview in dark mode";
  const themeActionTarget: "dark" | "light" = alternateTheme
    ? siteIsDark
      ? "dark"
      : "light"
    : siteIsDark
      ? "light"
      : "dark";
  const directionActionTarget = rtl ? "ltr" : "rtl";
  const directionLabel = rtl
    ? isChinese
      ? "恢复从左到右布局"
      : "Use left-to-right layout"
    : isChinese
      ? "切换为从右到左布局"
      : "Preview right-to-left layout";
  const sourceLabel = sourceOpen
    ? isChinese
      ? frameworkSnippets
        ? "收起接入代码"
        : "收起源码"
      : frameworkSnippets
        ? "Hide integration code"
        : "Hide source"
    : isChinese
      ? frameworkSnippets
        ? "展开接入代码"
        : "展开源码"
      : frameworkSnippets
        ? "Show integration code"
        : "Show source";
  const toggleSource = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const opening = !sourceOpen;
    setSourceOpen(opening);

    if (!opening || !frameworkSnippets || event.detail !== 0) return;
    window.requestAnimationFrame(() => {
      previewRef.current
        ?.querySelector<HTMLButtonElement>(
          '.a3s-preview-integration [role="tab"][aria-selected="true"]',
        )
        ?.focus();
    });
  };

  return (
    <section
      ref={previewRef}
      className="a3s-preview"
      aria-label={accessibleName}
      data-preview-component={componentName}
      data-preview-direction={rtl ? "rtl" : "ltr"}
      data-preview-layout={resolvedLayout}
      data-preview-scheme={previewScheme}
      data-preview-source={copyTarget ? "ready" : "pending"}
      data-preview-viewport={viewport}
      data-preview-integration={frameworkSnippets ? "complete" : undefined}
      data-framework-contract={
        frameworkSnippets
          ? semanticFrameworks
            ? "semantic"
            : "adapter"
          : undefined
      }
    >
      <header className="a3s-preview__header">
        <strong id={titleId}>{resolvedTitle}</strong>
        <div
          className="a3s-preview__controls"
          role="group"
          aria-label={isChinese ? "预览工具" : "Preview tools"}
        >
          <div
            className="a3s-preview__viewport-controls"
            role="group"
            aria-label={isChinese ? "预览宽度" : "Preview width"}
          >
            {viewportOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={option.label}
                aria-pressed={viewport === option.value}
                data-preview-control="viewport"
                data-preview-viewport-option={option.value}
                title={option.label}
                onClick={() => setViewport(option.value)}
              >
                <PreviewViewportIcon viewport={option.value} />
              </button>
            ))}
          </div>
          <span className="a3s-preview__control-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setAlternateTheme((current) => !current)}
            aria-label={themeLabel}
            aria-pressed={alternateTheme}
            data-preview-control="appearance"
            data-preview-target={themeActionTarget}
            title={themeLabel}
          >
            <PreviewThemeIcon target={themeActionTarget} />
          </button>
          <button
            type="button"
            onClick={() => setRtl((current) => !current)}
            aria-label={directionLabel}
            aria-pressed={rtl}
            data-preview-control="direction"
            data-preview-target={directionActionTarget}
            title={directionLabel}
          >
            <span
              className="a3s-preview__direction-mark"
              aria-hidden="true"
              data-preview-icon={`direction-${directionActionTarget}`}
            >
              {directionActionTarget.toUpperCase()}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleSource}
            aria-label={sourceLabel}
            aria-controls={sourceId}
            aria-expanded={sourceOpen}
            data-preview-control="source"
            title={sourceLabel}
          >
            <PreviewCodeIcon />
            <span className="a3s-preview__code-label">
              {isChinese ? "代码" : "Code"}
            </span>
          </button>
          <span className="a3s-preview__control-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={copySource}
            disabled={!copyTarget}
            aria-label={copyLabel}
            data-preview-control="copy"
            title={copyLabel}
            data-state={copyState}
          >
            <PreviewCopyIcon copied={copyState === "copied"} />
            <span className="a3s-preview__copy-label">{copyVisibleLabel}</span>
            <span className="a3s-preview__feedback" aria-live="polite">
              {copyState === "idle" ? "" : copyLabel}
            </span>
          </button>
          {frameworkSnippets && componentContract ? (
            <ComponentStateMatrix
              canvasRef={canvasRef}
              contract={componentContract}
              isChinese={isChinese}
            />
          ) : null}
        </div>
      </header>
      <div className="a3s-preview__stage">
        <div
          ref={canvasRef}
          onClick={handleDocumentationDemoClick}
          className={[
            "a3s-preview__canvas",
            "rp-not-doc",
            previewScheme === "dark" ? "dark" : "",
            className,
            htmlClass,
          ]
            .filter(Boolean)
            .join(" ")}
          data-a3s-theme={
            previewScheme === "inherit" ? undefined : previewScheme
          }
          data-preview-scheme={previewScheme}
          dir={rtl ? "rtl" : undefined}
          hidden={viewport !== "fluid"}
        >
          {normalizePreviewNode(children)}
        </div>
        {viewport !== "fluid" ? (
          <ResponsivePreviewFrame
            documentSource={responsiveDocument}
            isChinese={isChinese}
            layout={resolvedLayout}
            resolvedTitle={resolvedTitle}
            viewport={viewport}
          />
        ) : null}
      </div>
      <div
        id={sourceId}
        className="a3s-preview__source"
        data-preview-source-panel
        hidden={!sourceOpen}
        role="region"
        aria-label={
          frameworkSnippets
            ? isChinese
              ? "HTML、React 与 Vue 接入代码"
              : "HTML, React, and Vue integration code"
            : isChinese
              ? "语义化 HTML 源码"
              : "Semantic HTML source"
        }
      >
        {frameworkSnippets ? (
          <ComponentPreviewIntegration
            hasController={hasController}
            html={frameworkSnippets.html}
            htmlInstall={frameworkHtmlInstall}
            integrationHook={integrationHook}
            react={frameworkSnippets.react}
            reactInstall={frameworkReactInstall}
            semanticFrameworks={semanticFrameworks}
            vue={frameworkSnippets.vue}
            vueInstall={frameworkVueInstall}
            onExampleChange={setIntegrationSourceText}
          />
        ) : (
          <div className="a3s-preview__source-content">
            <CodeBlockRuntime
              lang="html"
              code={
                sourceText ||
                (isChinese ? "正在生成预览源码…" : "Preparing preview source…")
              }
              containerElementClassName="a3s-preview__codeblock"
            />
          </div>
        )}
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
