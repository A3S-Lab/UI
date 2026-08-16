export type PreviewViewport = "fluid" | "phone" | "tablet";
export type PreviewLayout = "center" | "flow" | "overlay" | "workspace";

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

type PreviewSourceMode = "source" | "responsive";

function prepareResponsivePreviewClone(
  canvas: HTMLElement,
  clone: HTMLElement,
) {
  const sourceCanvases = Array.from(
    canvas.querySelectorAll<HTMLCanvasElement>("canvas"),
  );

  clone
    .querySelectorAll<HTMLCanvasElement>("canvas")
    .forEach((clonedCanvas, index) => {
      const sourceCanvas = sourceCanvases[index];
      if (
        !sourceCanvas ||
        sourceCanvas.width === 0 ||
        sourceCanvas.height === 0
      )
        return;

      try {
        const image = document.createElement("img");
        image.src = sourceCanvas.toDataURL("image/png");
        image.alt = sourceCanvas.getAttribute("aria-label") ?? "";
        image.width = sourceCanvas.width;
        image.height = sourceCanvas.height;
        image.dataset.previewCanvasSnapshot = "true";
        clonedCanvas.replaceWith(image);
      } catch {
        // A tainted third-party canvas cannot be serialized. Keep its semantic
        // fallback instead of failing the complete responsive preview.
      }
    });

  clone.querySelectorAll(".monaco-workbench__editor").forEach((editor) => {
    const snapshot = document.createElement("pre");
    snapshot.className = "a3s-preview-editor-snapshot";
    snapshot.textContent = `# Release review agent
agent "release-auditor" {
  model = "a3s/default"

  skills {
    enabled = ["release-evidence"]
  }
}`;
    editor.replaceChildren(snapshot);
  });
  clone
    .querySelectorAll(".monaco-aria-container, .context-view")
    .forEach((element) => element.remove());
}

export function previewSourceFromCanvas(
  canvas: HTMLElement,
  mode: PreviewSourceMode = "source",
) {
  const clone = canvas.cloneNode(true) as HTMLElement;
  if (mode === "responsive") {
    prepareResponsivePreviewClone(canvas, clone);
  }

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

export function needsRenderedPreviewSource(source: string) {
  return /<(?:A3SAssetImage|ChartDemo|SliderDemo)\b/.test(source);
}

const workspacePreviewComponents = new Set([
  "agent-workbench",
  "app-shell",
  "code-editor",
  "data-grid",
  "device-simulator",
  "file-explorer",
  "image-viewer",
  "log-viewer",
  "markdown-surface",
  "settings-layout",
  "sidebar",
  "split-pane",
  "task-pane",
  "task-workspace",
  "terminal",
]);

const overlayPreviewComponents = new Set([
  "alert-dialog",
  "combobox",
  "context-selector",
  "context-menu",
  "date-picker",
  "dialog",
  "drawer",
  "dropdown-menu",
  "emoji-picker",
  "floating-panel",
  "image-select",
  "popover",
  "select",
  "tooltip",
]);

const flowPreviewComponents = new Set([
  "agent-composer",
  "agent-transcript",
  "alert",
  "artifact-card",
  "bulk-action-bar",
  "card",
  "change-review",
  "chart",
  "code-diff",
  "empty",
  "field",
  "filter-bar",
  "form",
  "input-group",
  "item",
  "property-list",
  "resource-card",
  "ribbon",
  "scroll-area",
  "sortable-list",
  "status-bar",
  "table",
  "tabs",
  "timeline",
  "toolbar",
  "tree",
  "workspace-header",
]);

export function resolvePreviewLayout(
  componentName: string | undefined,
  requestedLayout: PreviewLayout | undefined,
): PreviewLayout {
  if (requestedLayout) return requestedLayout;
  if (!componentName) return "center";
  if (workspacePreviewComponents.has(componentName)) return "workspace";
  if (overlayPreviewComponents.has(componentName)) return "overlay";
  if (flowPreviewComponents.has(componentName)) return "flow";
  return "center";
}

type ResponsivePreviewDocumentOptions = {
  classes: string;
  dark: boolean;
  direction: "ltr" | "rtl";
  language: string;
  layout: PreviewLayout;
  runtimeHref: string;
  source: string;
  stylesheetHrefs: string[];
};

export function previewStylesheetHrefs(fallbackHref: string) {
  if (typeof document === "undefined") return [fallbackHref];

  const linkedStylesheets = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'),
    (link) => link.href,
  );
  return Array.from(
    new Set(
      linkedStylesheets.some((href) => href.endsWith("/assets/a3s-ui.css"))
        ? linkedStylesheets
        : [fallbackHref, ...linkedStylesheets],
    ),
  );
}

export function responsivePreviewDocument({
  classes,
  dark,
  direction,
  language,
  layout,
  runtimeHref,
  source,
  stylesheetHrefs,
}: ResponsivePreviewDocumentOptions) {
  const documentClass = dark ? ' class="dark"' : "";
  const stylesheetLinks = stylesheetHrefs
    .map(
      (href) =>
        `    <link rel="stylesheet" href="${escapePreviewAttribute(href)}" />`,
    )
    .join("\n");
  const fallback = `<p class="a3s-preview-empty">${
    language === "zh" ? "正在准备预览…" : "Preparing preview…"
  }</p>`;

  return `<!doctype html>
<html${documentClass} lang="${escapePreviewAttribute(language)}" dir="${direction}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="${dark ? "dark" : "light"}" />
${stylesheetLinks}
    <style>
      html { min-width: 0; background: var(--background, ${dark ? "#0d0d0f" : "#ffffff"}); }
      body {
        min-width: 0;
        min-height: 100vh;
        margin: 0;
        padding: 24px;
        overflow: auto;
        background: var(--background, ${dark ? "#0d0d0f" : "#ffffff"});
        color: var(--foreground, ${dark ? "#f4f4f5" : "#111113"});
      }
      .a3s-embedded-preview {
        display: grid;
        width: 100%;
        min-width: 0;
        min-height: calc(100vh - 48px);
        box-sizing: border-box;
        align-content: center;
        align-items: center;
        justify-items: center;
        gap: 16px;
      }
      body[data-preview-layout="flow"] .a3s-embedded-preview {
        align-content: start;
        align-items: start;
        justify-items: stretch;
      }
      body[data-preview-layout="workspace"] { padding: 0; }
      body[data-preview-layout="workspace"] .a3s-embedded-preview {
        min-height: 100vh;
        align-content: stretch;
        align-items: stretch;
        justify-items: stretch;
        gap: 0;
      }
      .a3s-embedded-preview > * { min-width: 0; max-width: 100%; }
      body[data-preview-layout="workspace"] .a3s-embedded-preview > * { width: 100%; }
      .a3s-embedded-preview img[data-preview-canvas-snapshot] {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .a3s-preview-editor-snapshot {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 18px 20px;
        overflow: hidden;
        background: var(--workbench-editor, var(--background, ${dark ? "#0d0d0f" : "#ffffff"}));
        color: var(--workbench-ink, var(--foreground, ${dark ? "#f4f4f5" : "#111113"}));
        font: 12px/1.75 var(--font-mono, ui-monospace, monospace);
        white-space: pre-wrap;
      }
      .a3s-preview-empty { margin: 0; color: var(--muted-foreground, #71717a); font: 13px/1.5 system-ui, sans-serif; }
    </style>
  </head>
  <body data-preview-layout="${layout}">
    <main class="a3s-embedded-preview${classes ? ` ${escapePreviewAttribute(classes)}` : ""}">
      ${source || fallback}
    </main>
    <script src="${escapePreviewAttribute(runtimeHref)}"></script>
    <script>window.a3sUI?.start();window.a3sUI?.initAll();</script>
  </body>
</html>`;
}
