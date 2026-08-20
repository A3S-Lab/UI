import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFragment } from "parse5";
import { format } from "prettier";
import { components } from "../src/ai/manifest/index.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const checkOnly = process.argv.includes("--check");
const docsVersions = ["next", "v0.3.0", "v0.2.0", "v0.1.0"];
const placeholderPattern =
  /(?:Component content|Component summary|组件内容|组件摘要|>\s*(?:\.{3}|…)\s*<)/u;
const structuralCommentPattern = /(?:\{\/\*[^*]+\*\/\}|<!--[^>]+-->)/u;
const voidElements = new Set([
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
const booleanAttributes = new Set([
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
const reactAttributeAliases = Object.freeze({
  "accept-charset": "acceptCharset",
  allowfullscreen: "allowFullScreen",
  autofocus: "autoFocus",
  autocomplete: "autoComplete",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  charset: "charSet",
  class: "className",
  colspan: "colSpan",
  contenteditable: "contentEditable",
  crossorigin: "crossOrigin",
  datetime: "dateTime",
  enctype: "encType",
  fetchpriority: "fetchPriority",
  for: "htmlFor",
  formaction: "formAction",
  formenctype: "formEncType",
  formmethod: "formMethod",
  formnovalidate: "formNoValidate",
  formtarget: "formTarget",
  frameborder: "frameBorder",
  maxlength: "maxLength",
  minlength: "minLength",
  readonly: "readOnly",
  referrerpolicy: "referrerPolicy",
  rowspan: "rowSpan",
  spellcheck: "spellCheck",
  srcset: "srcSet",
  tabindex: "tabIndex",
  usemap: "useMap",
  viewbox: "viewBox",
});

function pascal(value) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function labels(locale) {
  return locale === "zh"
    ? {
        action: "继续",
        content: "组件内容",
        current: "当前页面",
        details: "查看详情",
        field: "名称",
        option: "已就绪",
        status: "操作已完成",
        summary: "组件摘要",
      }
    : {
        action: "Continue",
        content: "Component content",
        current: "Current page",
        details: "View details",
        field: "Name",
        option: "Ready",
        status: "Action complete",
        summary: "Component summary",
      };
}

const examplePlaceholderFragments = Object.freeze({
  "activity-bar": {
    en: [
      '<a href="/" aria-label="Home">A3S</a>',
      '<li><a href="/projects" aria-current="page">Projects</a></li>',
      '<button type="button" aria-label="Settings">Settings</button>',
    ],
    zh: [
      '<a href="/" aria-label="首页">A3S</a>',
      '<li><a href="/projects" aria-current="page">项目</a></li>',
      '<button type="button" aria-label="设置">设置</button>',
    ],
  },
  "agent-transcript": {
    en: [
      "<p>Review the release checks.</p>",
      "<p>All checks passed. The build is ready.</p>",
      "<p>Workspace permissions verified.</p>",
    ],
    zh: [
      "<p>检查发布验证结果。</p>",
      "<p>全部检查已通过，可以发布。</p>",
      "<p>工作区权限已验证。</p>",
    ],
  },
  "agent-workbench": {
    en: [
      '<nav aria-label="Project context"><a href="#files">Files</a></nav>',
      "<h1>Release verification</h1><p>Review the current run and evidence.</p>",
      "<h2>Inspector</h2><p>3 changed files</p>",
      '<output aria-live="polite">Ready</output>',
    ],
    zh: [
      '<nav aria-label="项目上下文"><a href="#files">文件</a></nav>',
      "<h1>发布验证</h1><p>检查当前运行和证据。</p>",
      "<h2>检查器</h2><p>3 个文件已更改</p>",
      '<output aria-live="polite">已就绪</output>',
    ],
  },
  "app-page": {
    en: [
      '<button type="button" class="btn">New project</button>',
      '<section aria-labelledby="recent-projects"><h2 id="recent-projects">Recent projects</h2><p>2 projects updated today.</p></section>',
    ],
    zh: [
      '<button type="button" class="btn">新建项目</button>',
      '<section aria-labelledby="recent-projects"><h2 id="recent-projects">最近项目</h2><p>今天更新了 2 个项目。</p></section>',
    ],
  },
  "app-shell": {
    en: [
      '<nav aria-label="Workspace"><a href="/tasks" aria-current="page">Tasks</a></nav>',
      '<section aria-labelledby="workspace-title"><h1 id="workspace-title">Design system workspace</h1><p>Review the active task and files.</p></section>',
    ],
    zh: [
      '<nav aria-label="工作区"><a href="/tasks" aria-current="page">任务</a></nav>',
      '<section aria-labelledby="workspace-title"><h1 id="workspace-title">设计系统工作区</h1><p>检查当前任务和文件。</p></section>',
    ],
  },
  "approval-request": {
    en: [
      '<label><input type="radio" name="scope" value="once" checked />Allow once</label><label><input type="radio" name="scope" value="task" />Allow for this task</label>',
      '<button type="button" data-approval="deny">Deny</button><button type="submit" data-approval="approve">Allow command</button>',
    ],
    zh: [
      '<label><input type="radio" name="scope" value="once" checked />仅允许一次</label><label><input type="radio" name="scope" value="task" />本任务内允许</label>',
      '<button type="button" data-approval="deny">拒绝</button><button type="submit" data-approval="approve">允许命令</button>',
    ],
  },
  "artifact-card": {
    en: [
      "<p>All required release checks passed.</p>",
      '<a href="/reports/release-readiness">Open report</a>',
    ],
    zh: [
      "<p>所有必需的发布检查均已通过。</p>",
      '<a href="/reports/release-readiness">打开报告</a>',
    ],
  },
  checkpoint: {
    en: ["<p>3 files changed before the responsive layout update.</p>"],
    zh: ["<p>响应式布局更新前共更改 3 个文件。</p>"],
  },
  "execution-evidence": {
    en: ['<a href="/reports/component-semantics">Open test report</a>'],
    zh: ['<a href="/reports/component-semantics">打开测试报告</a>'],
  },
  "execution-item": {
    en: [
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>',
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 6 3 3 3-3" /></svg>',
      "<pre>15 tests passed in 4.2s</pre>",
      '<button type="button">Copy log</button>',
    ],
    zh: [
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>',
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 6 3 3 3-3" /></svg>',
      "<pre>15 项测试通过，用时 4.2 秒</pre>",
      '<button type="button">复制日志</button>',
    ],
  },
  "message-attachment": {
    en: [
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h5l3 3v9H4z" /></svg>',
      '<span aria-hidden="true">×</span>',
    ],
    zh: [
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h5l3 3v9H4z" /></svg>',
      '<span aria-hidden="true">×</span>',
    ],
  },
  "plan-step": {
    en: ["Verify the layout at 390 px and 1280 px."],
    zh: ["在 390 px 和 1280 px 宽度下验证布局。"],
  },
  "resource-card": {
    en: ['<span aria-hidden="true">⌘</span>'],
    zh: ['<span aria-hidden="true">⌘</span>'],
  },
  "setting-row": {
    en: [
      '<option value="en">English</option><option value="zh-CN">简体中文</option>',
      "Saved automatically.",
    ],
    zh: [
      '<option value="zh-CN">简体中文</option><option value="en">English</option>',
      "更改会自动保存。",
    ],
  },
  "settings-layout": {
    en: [
      '<a href="#general" aria-current="page">General</a>',
      "<h2>General</h2><p>Configure workspace defaults.</p>",
    ],
    zh: [
      '<a href="#general" aria-current="page">常规</a>',
      "<h2>常规</h2><p>配置工作区默认值。</p>",
    ],
  },
  "status-bar": {
    en: ['<button type="button">Open sync details</button>'],
    zh: ['<button type="button">打开同步详情</button>'],
  },
  "task-pane": {
    en: [
      '<button type="button" aria-label="Close properties">Close</button>',
      "<dl><div><dt>Owner</dt><dd>Release team</dd></div></dl>",
      '<button type="button">Save properties</button>',
    ],
    zh: [
      '<button type="button" aria-label="关闭属性面板">关闭</button>',
      "<dl><div><dt>负责人</dt><dd>发布团队</dd></div></dl>",
      '<button type="button">保存属性</button>',
    ],
  },
  "task-plan": {
    en: [
      "<p>2 of 3 steps complete</p>",
      "<strong>Build package</strong><span>Complete</span>",
      "<strong>Verify responsive behavior</strong><span>In progress</span>",
      '<button type="button">Pause plan</button>',
    ],
    zh: [
      "<p>已完成 3 步中的 2 步</p>",
      "<strong>构建软件包</strong><span>已完成</span>",
      "<strong>验证响应式行为</strong><span>进行中</span>",
      '<button type="button">暂停计划</button>',
    ],
  },
  "task-queue": {
    en: ["<strong>Run visual checks</strong><span>Queued</span>"],
    zh: ["<strong>运行视觉检查</strong><span>等待中</span>"],
  },
  "task-workspace": {
    en: [
      "<article><p>Review the component documentation.</p></article>",
      '<textarea aria-label="Message" placeholder="Describe the next task"></textarea><button type="submit">Send</button>',
      '<h2>Files</h2><a href="/src/index.ts">src/index.ts</a>',
    ],
    zh: [
      "<article><p>检查组件文档。</p></article>",
      '<textarea aria-label="消息" placeholder="描述下一项任务"></textarea><button type="submit">发送</button>',
      '<h2>文件</h2><a href="/src/index.ts">src/index.ts</a>',
    ],
  },
  terminal: {
    en: [
      "package contract valid\n15 checks passed",
      '<button type="button">Copy output</button>',
    ],
    zh: [
      "软件包契约有效\n15 项检查通过",
      '<button type="button">复制输出</button>',
    ],
  },
  timeline: {
    en: [
      "<h3>Package built</h3><p>Completed at 10:24</p>",
      "<h3>Visual checks</h3><p>Running desktop and mobile suites</p>",
    ],
    zh: [
      "<h3>软件包构建完成</h3><p>完成于 10:24</p>",
      "<h3>视觉检查</h3><p>正在运行桌面端和移动端套件</p>",
    ],
  },
  "task-start": {
    en: [
      '<button type="button">Review the release</button><button type="button">Fix a failing test</button>',
      '<textarea aria-label="Task" placeholder="Describe the outcome"></textarea><button type="submit">Start</button>',
    ],
    zh: [
      '<button type="button">检查发布</button><button type="button">修复失败测试</button>',
      '<textarea aria-label="任务" placeholder="描述预期结果"></textarea><button type="submit">开始</button>',
    ],
  },
  toolbar: {
    en: [
      '<button type="button" aria-pressed="true">Bold</button><button type="button" aria-pressed="false">Italic</button>',
      '<button type="button">Link</button>',
    ],
    zh: [
      '<button type="button" aria-pressed="true">粗体</button><button type="button" aria-pressed="false">斜体</button>',
      '<button type="button">链接</button>',
    ],
  },
  ribbon: {
    en: [
      '<button type="button" role="tab" aria-selected="true">Home</button>',
      '<button type="button">Paste</button><button type="button">Copy</button>',
    ],
    zh: [
      '<button type="button" role="tab" aria-selected="true">开始</button>',
      '<button type="button">粘贴</button><button type="button">复制</button>',
    ],
  },
  "file-explorer": {
    en: [
      '<div role="treeitem" aria-expanded="true"><span>src</span><div role="group"><button type="button" role="treeitem">index.ts</button></div></div>',
    ],
    zh: [
      '<div role="treeitem" aria-expanded="true"><span>src</span><div role="group"><button type="button" role="treeitem">index.ts</button></div></div>',
    ],
  },
  "workspace-header": {
    en: [
      '<a href="/projects" aria-label="Back to projects">Projects</a>',
      '<button type="button">Share</button>',
    ],
    zh: [
      '<a href="/projects" aria-label="返回项目">项目</a>',
      '<button type="button">共享</button>',
    ],
  },
});

function placeholderFallback(parent, locale) {
  const ready = locale === "zh" ? "已就绪" : "Ready";
  const status = locale === "zh" ? "状态" : "Status";

  switch (parent.tagName) {
    case "dl":
      return `<div><dt>${status}</dt><dd>${ready}</dd></div>`;
    case "ol":
    case "ul":
      return `<li>${ready}</li>`;
    case "nav":
      return `<a href="#">${ready}</a>`;
    case "select":
      return `<option>${ready}</option>`;
    case "tbody":
      return `<tr><td>${ready}</td></tr>`;
    case "thead":
      return `<tr><th scope="col">${status}</th></tr>`;
    case "tr":
      return `<td>${ready}</td>`;
    default:
      return `<span>${ready}</span>`;
  }
}

function replaceExamplePlaceholders(
  node,
  component,
  locale,
  allowFallback = false,
) {
  const replacements =
    examplePlaceholderFragments[component.slug]?.[locale] ?? [];
  let replacementIndex = 0;

  const visit = (parent) => {
    const children = parent.childNodes ?? [];
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      if (
        child.nodeName === "#text" &&
        /^(?:\.{3}|…)$/u.test((child.value ?? "").trim())
      ) {
        const replacement =
          replacements[replacementIndex] ??
          (allowFallback ? placeholderFallback(parent, locale) : undefined);
        if (!replacement) {
          throw new Error(
            `${locale}/${component.slug} needs a concrete replacement for framework example placeholder ${replacementIndex + 1}.`,
          );
        }
        replacementIndex += 1;
        const replacementNodes = parseFragment(replacement).childNodes ?? [];
        children.splice(index, 1, ...replacementNodes);
        index += replacementNodes.length - 1;
        continue;
      }
      visit(child);
    }
  };

  visit(node);
  return node;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("{", "&#123;")
    .replaceAll("}", "&#125;");
}

function elementAttributes(node) {
  return Object.fromEntries(
    (node.attrs ?? []).map(({ name, value }) => [name, value]),
  );
}

function classTokens(node) {
  return (elementAttributes(node).class ?? "").split(/\s+/u).filter(Boolean);
}

function elementChildren(node) {
  return (node.childNodes ?? []).filter((child) => child.tagName);
}

function walkElements(node, visit) {
  for (const child of node.childNodes ?? []) {
    if (child.tagName && visit(child)) return child;
    const descendant = walkElements(child, visit);
    if (descendant) return descendant;
  }
  return undefined;
}

function matchesComponentRoot(node, component, allowLegacy = false) {
  const attributes = elementAttributes(node);
  const classes = classTokens(node);
  const expectedClasses = component.framework.className
    .split(/\s+/u)
    .filter(Boolean);

  switch (component.slug) {
    case "chart":
      return node.tagName === "canvas";
    case "checkbox":
      return (
        classes.includes("input") &&
        attributes.type === "checkbox" &&
        attributes.role !== "switch"
      );
    case "radio-group":
      return attributes.role === "radiogroup";
    case "pagination":
      return allowLegacy
        ? expectedClasses.every((className) => classes.includes(className)) ||
            (node.tagName === "nav" &&
              attributes["aria-label"]?.toLowerCase() === "pagination")
        : expectedClasses.every((className) => classes.includes(className));
    case "slider":
      return classes.includes("input") && attributes.type === "range";
    case "switch":
      return classes.includes("input") && attributes.role === "switch";
    case "theme-switcher":
      return allowLegacy
        ? node.tagName === "button" &&
            attributes.onclick?.includes("a3sUI.theme.toggle")
        : Object.hasOwn(attributes, "data-a3s-theme-toggle");
    case "tooltip":
      return Object.hasOwn(attributes, "data-tooltip");
    default:
      return (
        expectedClasses.length > 0 &&
        expectedClasses.every((className) => classes.includes(className))
      );
  }
}

function htmlCodeBlocks(source) {
  return [...source.matchAll(/^```html\n([\s\S]*?)\n```/gmu)].map((match) =>
    match[1].trim(),
  );
}

function componentExampleNode(
  source,
  component,
  locale,
  replacePlaceholders = true,
  allowLegacy = false,
  allowFallbackPlaceholders = false,
) {
  for (const code of htmlCodeBlocks(source)) {
    const fragment = parseFragment(code);
    const match = walkElements(fragment, (node) =>
      matchesComponentRoot(node, component, allowLegacy),
    );
    if (match) {
      return replacePlaceholders
        ? replaceExamplePlaceholders(
            match,
            component,
            locale,
            allowFallbackPlaceholders,
          )
        : match;
    }
  }

  if (component.slug === "radio-group") {
    for (const code of htmlCodeBlocks(source)) {
      const fragment = parseFragment(code);
      const option = walkElements(
        fragment,
        (node) => elementAttributes(node).type === "radio",
      );
      if (!option) continue;
      const radioGroup = {
        attrs: [
          { name: "role", value: "radiogroup" },
          {
            name: "aria-label",
            value: locale === "zh" ? "运行模式" : "Run mode",
          },
        ],
        childNodes: [option],
        nodeName: "div",
        tagName: "div",
      };
      return replacePlaceholders
        ? replaceExamplePlaceholders(radioGroup, component, locale)
        : radioGroup;
    }
  }

  return undefined;
}

function stripRootDefaults(node, component) {
  const expectedClasses = new Set(
    component.framework.className.split(/\s+/u).filter(Boolean),
  );
  const defaults = component.framework.attributes;

  return (node.attrs ?? []).flatMap(({ name, value }) => {
    if (name === "class") {
      const remaining = value
        .split(/\s+/u)
        .filter(Boolean)
        .filter((className) => !expectedClasses.has(className));
      return remaining.length > 0 ? [{ name, value: remaining.join(" ") }] : [];
    }
    if (Object.hasOwn(defaults, name) && String(defaults[name]) === value) {
      return [];
    }
    return [{ name, value }];
  });
}

function styleExpression(value) {
  const declarations = value
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon < 0) return undefined;
      const property = declaration.slice(0, colon).trim();
      const propertyName = property.startsWith("--")
        ? JSON.stringify(property)
        : property.replace(/-([a-z])/gu, (_match, letter) =>
            letter.toUpperCase(),
          );
      const propertyValue = declaration.slice(colon + 1).trim();
      return `${propertyName}: ${JSON.stringify(propertyValue)}`;
    })
    .filter(Boolean);
  return `{{ ${declarations.join(", ")} }}`;
}

function reactAttributeName(name) {
  if (name.startsWith("aria-") || name.startsWith("data-")) return name;
  if (reactAttributeAliases[name]) return reactAttributeAliases[name];
  return name.replace(/-([a-z])/gu, (_match, letter) => letter.toUpperCase());
}

function serializeAttribute(attribute, framework, tagName, attributes) {
  const { name, value } = attribute;
  if (name === "...") return "";
  if (/^on[a-z]/u.test(name)) return "";

  if (framework === "react") {
    if (name === "style") return `style=${styleExpression(value)}`;
    const reactName =
      name === "checked"
        ? "defaultChecked"
        : name === "value" &&
            (tagName === "textarea" ||
              (tagName === "input" &&
                !["checkbox", "hidden", "radio"].includes(
                  attributes.type ?? "text",
                )))
          ? "defaultValue"
          : reactAttributeName(name);
    if (booleanAttributes.has(name) && value === "") return reactName;
    return `${reactName}="${escapeAttribute(value)}"`;
  }

  if (booleanAttributes.has(name) && value === "") return name;
  return `${name}="${escapeAttribute(value)}"`;
}

function serializeNode(
  node,
  framework,
  rootNode,
  component,
  componentName,
  hook,
  useAdapter = true,
) {
  if (node.nodeName === "#text") return escapeText(node.value ?? "");
  if (node.nodeName === "#comment") {
    return framework === "react"
      ? `{/* ${node.data.trim()} */}`
      : `<!-- ${node.data.trim()} -->`;
  }
  if (!node.tagName) return "";

  const root = useAdapter && node === rootNode;
  const sourceTag = node.tagName;
  const tagName = root ? componentName : sourceTag;
  const attributes = root
    ? stripRootDefaults(node, component)
    : [...(node.attrs ?? [])];
  if (root && sourceTag !== component.framework.tag) {
    attributes.unshift({ name: "as", value: sourceTag });
  }
  if (root && hook) {
    attributes.unshift({
      expression: framework === "react",
      name: "ref",
      value: framework === "react" ? "control.ref" : "componentRef",
    });
  }

  const attributeMap = Object.fromEntries(
    attributes.map(({ name, value }) => [name, value]),
  );
  const serializedAttributes = attributes
    .map((attribute) =>
      attribute.expression
        ? `${attribute.name}={${attribute.value}}`
        : serializeAttribute(attribute, framework, sourceTag, attributeMap),
    )
    .filter(Boolean);
  const opening = `<${tagName}${serializedAttributes.length > 0 ? ` ${serializedAttributes.join(" ")}` : ""}`;
  const children = (node.childNodes ?? [])
    .map((child) =>
      serializeNode(child, framework, rootNode, component, componentName, hook),
    )
    .join("");

  if (children.length === 0 && (voidElements.has(sourceTag) || root)) {
    return `${opening} />`;
  }
  return `${opening}>${children}</${tagName}>`;
}

async function derivedFrameworkExamples(
  component,
  locale,
  source,
  { useAdapters = true } = {},
) {
  const node = componentExampleNode(
    source,
    component,
    locale,
    true,
    !useAdapters,
    !useAdapters,
  );
  if (!node) return undefined;

  const name = pascal(component.slug);
  const hook =
    useAdapters &&
    (component.events.length > 0 || component.methods.length > 0);
  const hookName = `use${name}`;
  const reactMarkup = serializeNode(
    node,
    "react",
    node,
    component,
    name,
    hook,
    useAdapters,
  );
  const vueMarkup = serializeNode(
    node,
    "vue",
    node,
    component,
    name,
    hook,
    useAdapters,
  );
  const reactImport = useAdapters
    ? `import { ${name}${hook ? `, ${hookName}` : ""} } from "@a3s-lab/ui/react";\n\n`
    : "";
  const react = `${reactImport}export function ${name}Example() {

${hook ? `  const control = ${hookName}();\n` : ""}  return (${reactMarkup});
}`;
  const vueScript = useAdapters
    ? `<script setup lang="ts">
import { ${name}${hook ? `, ${hookName}` : ""} } from "@a3s-lab/ui/vue";
${hook ? `\nconst control = ${hookName}();\nconst componentRef = control.componentRef;` : ""}
</script>\n\n`
    : "";
  const vue = `${vueScript}<template>${vueMarkup}</template>`;

  try {
    return {
      react: (await format(react, { parser: "typescript" })).trim(),
      vue: (await format(vue, { parser: "vue" })).trim(),
    };
  } catch (error) {
    throw new Error(
      `${locale}/${component.slug} generated an invalid ${useAdapters ? "adapter" : "semantic"} framework example: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function frameworkCodeRange(source, framework) {
  const heading = `## ${framework}`;
  const headingStart = source.indexOf(heading);
  if (headingStart < 0) return undefined;
  const fenceStart = source.indexOf("```", headingStart + heading.length);
  if (fenceStart < 0) return undefined;
  const codeStart = source.indexOf("\n", fenceStart) + 1;
  const fenceEnd = source.indexOf("\n```", codeStart);
  if (codeStart <= 0 || fenceEnd < 0) return undefined;
  return { end: fenceEnd, start: codeStart };
}

function frameworkCode(source, framework) {
  const range = frameworkCodeRange(source, framework);
  return range ? source.slice(range.start, range.end) : undefined;
}

function frameworkTabsCode(source, framework) {
  const tabsStart = source.indexOf("<FrameworkTabs");
  const attributeStart = source.indexOf(
    `${framework.toLowerCase()}={\``,
    tabsStart,
  );
  if (tabsStart < 0 || attributeStart < 0) return undefined;
  const codeStart = attributeStart + `${framework.toLowerCase()}={\``.length;
  const nextFramework =
    framework === "HTML" ? "react" : framework === "React" ? "vue" : undefined;
  const endMarker = nextFramework ? `\`}\n  ${nextFramework}={\`` : "`}\n/>";
  const codeEnd = source.indexOf(endMarker, codeStart);
  return codeEnd >= 0
    ? source.slice(codeStart, codeEnd).replaceAll("\\`", "`")
    : undefined;
}

function documentedFrameworkCode(source, framework) {
  return (
    frameworkCode(source, framework) ?? frameworkTabsCode(source, framework)
  );
}

function replaceFrameworkCode(source, framework, code) {
  const range = frameworkCodeRange(source, framework);
  if (!range) return source;
  return `${source.slice(0, range.start)}${code}${source.slice(range.end)}`;
}

function sample(component, locale, framework) {
  const text = labels(locale);
  const name = pascal(component.slug);
  const react = framework === "react";
  const attributes = [];
  if (
    ["a", "brand-lockup", "message-citation"].includes(component.framework.tag)
  )
    attributes.push('href="#example"');
  if (
    [
      "aside",
      "dialog",
      "fieldset",
      "form",
      "nav",
      "ol",
      "section",
      "table",
    ].includes(component.framework.tag)
  )
    attributes.push(`aria-label="${component.name}"`);
  if (["input", "textarea"].includes(component.framework.tag))
    attributes.push(`aria-label="${text.field}"`);
  if (component.framework.tag === "textarea")
    attributes.push(
      react ? `defaultValue="${text.content}"` : `value="${text.content}"`,
    );
  if (component.slug === "tooltip") attributes.push('aria-label="Help"');
  const hook = component.events.length > 0 || component.methods.length > 0;
  if (hook)
    attributes.unshift(react ? "ref={control.ref}" : 'ref="componentRef"');

  let children = text.content;
  if (["input", "textarea"].includes(component.framework.tag)) children = null;
  else if (component.framework.tag === "select")
    children = `<option value="ready">${text.option}</option>`;
  else if (component.framework.tag === "details")
    children = `<summary>${text.details}</summary><div>${text.content}</div>`;
  else if (component.framework.tag === "dialog")
    children = `<div><header><h2>${text.summary}</h2></header><section>${text.content}</section><footer><button type="button">${text.action}</button></footer></div>`;
  else if (component.framework.tag === "form")
    children = `<label>${text.field}<input name="name" /></label><button type="submit">${text.action}</button>`;
  else if (component.framework.tag === "fieldset")
    children = `<legend>${text.summary}</legend><label><input type="radio" name="choice" /> ${text.option}</label>`;
  else if (component.framework.tag === "figure")
    children =
      component.slug === "image"
        ? `<img src="/logo.png" alt="A3S OS" /><figcaption>${text.summary}</figcaption>`
        : `<figcaption>${text.summary}</figcaption><pre><code>${text.content}</code></pre>`;
  else if (component.framework.tag === "nav")
    children = `<a href="#current" aria-current="page">${text.current}</a>`;
  else if (["ol", "ul"].includes(component.framework.tag))
    children = `<li>${text.content}</li>`;
  else if (component.framework.tag === "dl")
    children = `<div><dt>${text.field}</dt><dd>${text.content}</dd></div>`;
  else if (component.framework.tag === "pre")
    children = `<code>${text.content}</code>`;
  else if (component.slug === "table")
    children = `<table><caption>${text.summary}</caption><tbody><tr><th scope="row">${text.field}</th><td>${text.content}</td></tr></tbody></table>`;
  else if (component.slug === "radio-group")
    children = `<label><input type="radio" name="choice" /> ${text.option}</label>`;

  const open = `<${name}${attributes.length ? ` ${attributes.join(" ")}` : ""}`;
  return children === null ? `${open} />` : `${open}>${children}</${name}>`;
}

async function frameworkSection(
  component,
  locale,
  source,
  { useAdapters = true } = {},
) {
  const zh = locale === "zh";
  const name = pascal(component.slug);
  const hook =
    useAdapters &&
    (component.events.length > 0 || component.methods.length > 0);
  const hookName = `use${name}`;
  const derived = await derivedFrameworkExamples(component, locale, source, {
    useAdapters,
  });
  if (!derived && !useAdapters) {
    throw new Error(
      `${locale}/${component.slug} has no semantic HTML contract for historical framework examples.`,
    );
  }
  const react =
    derived?.react ??
    `import { ${name}${hook ? `, ${hookName}` : ""} } from "@a3s-lab/ui/react";

export function Example() {
${hook ? `  const control = ${hookName}();\n` : ""}  return (
    ${sample(component, locale, "react")}
  );
}`;
  const vue =
    derived?.vue ??
    `<script setup lang="ts">
import { ${name}${hook ? `, ${hookName}` : ""} } from "@a3s-lab/ui/vue";
${hook ? `\nconst control = ${hookName}();\nconst componentRef = control.componentRef;` : ""}
</script>

<template>
  ${sample(component, locale, "vue")}
</template>`;
  const explanation = useAdapters
    ? hook
      ? zh
        ? `\`${hookName}\` 订阅清单中声明的 DOM 事件，并且只调用清单中公开的方法。适配器不创建另一套框架专属状态。`
        : `\`${hookName}\` subscribes to manifest-declared DOM events and calls only public manifest methods. The adapter creates no second, framework-only state model.`
      : zh
        ? "适配器只替换指南中已记录的语义根元素，不增加包装层；内部标记继续使用上方 HTML 契约。"
        : "The adapter replaces only the documented semantic root and adds no wrapper; its children keep the HTML contract shown above."
    : zh
      ? "该发布版本尚未提供框架适配器；示例直接渲染同一语义 DOM，并由该版本的浏览器运行时增强交互。"
      : "This published version predates framework adapters. The example renders the same semantic DOM and lets that version's browser runtime enhance its interactions.";

  return `

## React

\`\`\`tsx
${react}
\`\`\`

${explanation}

## Vue

\`\`\`vue
${vue}
\`\`\`

${explanation}
`;
}

function hasFrameworkGuide(source, framework) {
  const tabProp = framework.toLowerCase();
  const frameworkTabs = new RegExp(
    `<FrameworkTabs\\b[\\s\\S]*?\\b${tabProp}=\\{`,
    "u",
  );
  if (framework === "HTML") {
    return /^```html$/mu.test(source) || frameworkTabs.test(source);
  }
  return (
    new RegExp(`^## ${framework}$`, "mu").test(source) ||
    frameworkTabs.test(source)
  );
}

function isUnavailableGuide(source) {
  return (
    /not part of this\s+published\s+package contract/u.test(source) ||
    /not part of this stable documentation snapshot/u.test(source) ||
    /不属于该历史版本的公开契约/u.test(source) ||
    /不属于此稳定版文档快照/u.test(source)
  );
}

const missing = [];
const invalidHtmlExamples = [];
const placeholderGuides = [];
const componentsBySlug = new Map(
  components.map((component) => [component.slug, component]),
);
let checked = 0;
let written = 0;
for (const version of docsVersions) {
  for (const locale of ["en", "zh"]) {
    const componentsDirectory = path.join(
      projectRoot,
      "site",
      "docs",
      version,
      locale,
      "components",
    );
    const componentFiles = (await readdir(componentsDirectory))
      .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
      .sort();

    for (const componentFile of componentFiles) {
      const slug = path.basename(componentFile, ".mdx");
      const component = componentsBySlug.get(slug);
      if (!component) {
        throw new Error(
          `${version}/${locale}/${slug} has no matching component manifest entry.`,
        );
      }

      const filePath = path.join(componentsDirectory, componentFile);
      const source = await readFile(filePath, "utf8");
      if (isUnavailableGuide(source)) continue;

      checked += 1;
      const useAdapters = version === "next";
      const guideKey = `${version}/${locale}/${component.slug}`;
      let nextSource = source;
      const hasHtml = hasFrameworkGuide(source, "HTML");
      const hasReact = hasFrameworkGuide(source, "React");
      const hasVue = hasFrameworkGuide(source, "Vue");
      const authoredHtml = frameworkTabsCode(source, "HTML");
      const currentReact = documentedFrameworkCode(source, "React");
      const currentVue = documentedFrameworkCode(source, "Vue");
      const hasPlaceholders = [currentReact, currentVue].some(
        (code) =>
          code &&
          (placeholderPattern.test(code) ||
            (useAdapters && structuralCommentPattern.test(code))),
      );
      const hasConcreteHtmlExample = authoredHtml
        ? /<(?!script\b)[a-z][\w-]*\b/u.test(authoredHtml)
        : Boolean(
            componentExampleNode(
              source,
              component,
              locale,
              false,
              !useAdapters,
            ),
          );
      if (!hasConcreteHtmlExample) {
        invalidHtmlExamples.push(guideKey);
      }

      if (!hasHtml || !hasReact || !hasVue) {
        missing.push(
          `${guideKey} (${[
            !hasHtml && "HTML",
            !hasReact && "React",
            !hasVue && "Vue",
          ]
            .filter(Boolean)
            .join(", ")})`,
        );
        if (!checkOnly) {
          nextSource = `${source.trimEnd()}${(
            await frameworkSection(component, locale, source, { useAdapters })
          ).trimEnd()}\n`;
        }
      } else if (hasPlaceholders) {
        placeholderGuides.push(guideKey);
        if (!checkOnly) {
          const examples = await derivedFrameworkExamples(
            component,
            locale,
            source,
            { useAdapters },
          );
          if (!examples) {
            throw new Error(
              `${guideKey} has placeholder framework content and no matching HTML contract.`,
            );
          }
          nextSource = replaceFrameworkCode(
            replaceFrameworkCode(source, "React", examples.react),
            "Vue",
            examples.vue,
          );
        }
      }

      const normalized = `${nextSource.trimEnd()}\n`;
      if (!checkOnly && normalized !== source) {
        await writeFile(filePath, normalized);
        written += 1;
      }
    }
  }
}

if (
  checkOnly &&
  (missing.length > 0 ||
    invalidHtmlExamples.length > 0 ||
    placeholderGuides.length > 0)
) {
  const problems = [
    missing.length > 0
      ? `Missing framework component guides: ${missing.join(", ")}`
      : "",
    placeholderGuides.length > 0
      ? `Placeholder framework examples: ${placeholderGuides.join(", ")}`
      : "",
    invalidHtmlExamples.length > 0
      ? `Missing concrete HTML examples: ${invalidHtmlExamples.join(", ")}`
      : "",
  ].filter(Boolean);
  throw new Error(problems.join("\n"));
}

console.log(
  checkOnly
    ? `Validated ${checked} versioned component guides with HTML, React, and Vue examples.`
    : `Updated framework examples or file endings in ${written} component guides.`,
);
