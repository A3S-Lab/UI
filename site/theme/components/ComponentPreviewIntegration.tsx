import {
  CodeBlockRuntime,
  type CodeBlockRuntimeProps,
} from "@rspress/core/theme";
import { useLang, useLocation, useVersion } from "@rspress/core/runtime";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import "./ComponentPreviewIntegration.css";

type Framework = "html" | "react" | "vue";
type IntegrationFile = "example" | "setup";

export type ComponentPreviewIntegrationProps = {
  hasController?: boolean;
  html: string;
  htmlInstall?: string;
  integrationHook?: string;
  onExampleChange?: (source: string) => void;
  react: string;
  reactInstall?: string;
  semanticFrameworks?: boolean;
  vue: string;
  vueInstall?: string;
};

type IntegrationContent = {
  example: string;
  exampleFile: string;
  exampleLanguage: string;
  install: string;
  setup: string;
  setupFile: string;
  setupLanguage: string;
};

const FRAMEWORK_STORAGE_KEY = "a3s-ui-docs-framework";
const frameworks: readonly Framework[] = ["html", "react", "vue"];
// Rspress supplies the copy target internally, but its public option type still
// exposes that private field.
const copyOnlyCodeActions = {
  showWrapCodeButton: false,
} as NonNullable<CodeBlockRuntimeProps["codeButtonGroupProps"]>;

const tiptapPackages = [
  "@tiptap/core",
  "@tiptap/extension-placeholder",
  "@tiptap/markdown",
  "@tiptap/pm",
  "@tiptap/starter-kit",
];

function adapterName(slug: string) {
  return slug
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function frameworkLabel(framework: Framework) {
  if (framework === "html") return "HTML";
  return framework === "react" ? "React" : "Vue";
}

function formatInstallCommand(packages: string[]) {
  const inline = `npm install ${packages.join(" ")}`;
  if (inline.length <= 88) return inline;

  const rows: string[] = [];
  for (let index = 0; index < packages.length; index += 3) {
    rows.push(packages.slice(index, index + 3).join(" "));
  }
  return `npm install ${rows
    .map((row, index) => `${row}${index < rows.length - 1 ? " \\" : ""}`)
    .join("\n  ")}`;
}

function packageSpecifier(version: string) {
  if (version === "next") return "@a3s-lab/ui";
  if (version === "v0.1.0") {
    return "github:A3S-Lab/UI#d2799d3914d2d291fbf0c2c3e638e2380ce266c0";
  }
  return `@a3s-lab/ui@${version.replace(/^v/u, "")}`;
}

function installCommand(framework: Framework, slug: string, version: string) {
  const packages = [packageSpecifier(version)];

  if (framework === "react") packages.push("react", "react-dom");
  if (framework === "vue") packages.push("vue");

  if (slug === "chart") packages.push("chart.js");
  if (slug === "agent-composer") {
    packages.push(...tiptapPackages);
    if (framework === "react") packages.push("@tiptap/react");
    if (framework === "vue") packages.push("@tiptap/vue-3");
  }

  return formatInstallCommand(packages);
}

function integrationContent(
  framework: Framework,
  slug: string,
  componentName: string,
  hasController: boolean,
  semanticFrameworks: boolean,
  version: string,
  examples: Record<Framework, string>,
  installs: Partial<Record<Framework, string>>,
  externalIntegration: boolean,
): IntegrationContent {
  const setupImports = semanticFrameworks
    ? [
        'import "@a3s-lab/ui/a3s.css";',
        'import "@a3s-lab/ui/all";',
        ...(slug === "chart" ? ['import "@a3s-lab/ui/chart";'] : []),
      ].join("\n")
    : undefined;

  if (framework === "html") {
    return {
      example: examples.html.trim(),
      exampleFile: "index.html",
      exampleLanguage: "html",
      install:
        installs[framework]?.trim() ?? installCommand(framework, slug, version),
      setup:
        setupImports ??
        (hasController && !externalIntegration
          ? 'import "@a3s-lab/ui/a3s.css";\nimport "@a3s-lab/ui/all";'
          : 'import "@a3s-lab/ui/a3s.css";'),
      setupFile: "main.js",
      setupLanguage: "js",
    };
  }

  return {
    example: examples[framework].trim(),
    exampleFile:
      framework === "react" ? `${componentName}Example.tsx` : "Example.vue",
    exampleLanguage: framework === "react" ? "tsx" : "vue",
    install:
      installs[framework]?.trim() ?? installCommand(framework, slug, version),
    setup: setupImports ?? 'import "@a3s-lab/ui/a3s.css";',
    setupFile: "main.ts",
    setupLanguage: "ts",
  };
}

export function ComponentPreviewIntegration({
  hasController = false,
  html,
  htmlInstall,
  integrationHook,
  onExampleChange,
  react,
  reactInstall,
  semanticFrameworks = false,
  vue,
  vueInstall,
}: ComponentPreviewIntegrationProps) {
  const language = useLang();
  const location = useLocation();
  const version = useVersion();
  const isChinese = language === "zh";
  const isHarnessGuide = /\/harness\//u.test(location.pathname);
  const slug =
    location.pathname.match(/\/(?:components|harness)\/([^/.]+)/)?.[1] ??
    "component";
  const componentName = adapterName(slug);
  const hookName = integrationHook ?? `use${componentName}`;
  const frameworkId = useId();
  const fileId = useId();
  const [framework, setFramework] = useState<Framework>("html");
  const [activeFile, setActiveFile] = useState<IntegrationFile>("example");
  const examples = { html, react, vue };
  const installs = {
    html: htmlInstall,
    react: reactInstall,
    vue: vueInstall,
  };
  const content = integrationContent(
    framework,
    slug,
    componentName,
    hasController,
    semanticFrameworks,
    version,
    examples,
    installs,
    isHarnessGuide,
  );
  const sourceFiles = [
    {
      code: content.example,
      file: content.exampleFile,
      kind: "example" as const,
      language: content.exampleLanguage,
    },
    {
      code: content.setup,
      file: content.setupFile,
      kind: "setup" as const,
      language: content.setupLanguage,
    },
  ];
  const activeSource =
    sourceFiles.find((sourceFile) => sourceFile.kind === activeFile) ??
    sourceFiles[0];

  useEffect(() => {
    try {
      const storedFramework = window.localStorage.getItem(
        FRAMEWORK_STORAGE_KEY,
      );
      if (frameworks.includes(storedFramework as Framework)) {
        setFramework(storedFramework as Framework);
      }
    } catch {
      // Storage is an enhancement; tabs remain operable without it.
    }
  }, []);

  useEffect(() => {
    onExampleChange?.(activeSource.code);
  }, [activeSource.code, onExampleChange]);

  const selectFramework = (nextFramework: Framework) => {
    setFramework(nextFramework);
    try {
      window.localStorage.setItem(FRAMEWORK_STORAGE_KEY, nextFramework);
    } catch {
      // Storage is optional and must never block framework selection.
    }
  };

  const handleFrameworkKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const currentIndex = frameworks.indexOf(framework);
    const direction = getComputedStyle(event.currentTarget).direction;
    const arrowDelta =
      event.key === "ArrowRight"
        ? direction === "rtl"
          ? -1
          : 1
        : direction === "rtl"
          ? 1
          : -1;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? frameworks.length - 1
          : (currentIndex + arrowDelta + frameworks.length) % frameworks.length;
    const nextFramework = frameworks[nextIndex];
    selectFramework(nextFramework);
    document.getElementById(`${frameworkId}-${nextFramework}-tab`)?.focus();
  };

  const handleFileKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const files: readonly IntegrationFile[] = ["example", "setup"];
    const currentIndex = files.indexOf(activeFile);
    const direction = getComputedStyle(event.currentTarget).direction;
    const arrowDelta =
      event.key === "ArrowRight"
        ? direction === "rtl"
          ? -1
          : 1
        : direction === "rtl"
          ? 1
          : -1;
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? files.length - 1
          : (currentIndex + arrowDelta + files.length) % files.length;
    const nextFile = files[nextIndex];
    setActiveFile(nextFile);
    document.getElementById(`${fileId}-${nextFile}-tab`)?.focus();
  };

  const integrationNote = semanticFrameworks
    ? isChinese
      ? "该发布版本尚未提供框架适配器；示例直接渲染同一语义 DOM，并由该版本的浏览器运行时增强交互。"
      : "This published version predates framework adapters. The example renders the same semantic DOM and lets that version's browser runtime enhance its interactions."
    : isHarnessGuide
      ? framework === "html"
        ? isChinese
          ? "原生入口直接创建对应布局实例；主题层不接管面板数据、权限或产品状态。"
          : "The native entry creates the layout instance directly; the theme layer does not own panel data, permissions, or product state."
        : isChinese
          ? "该框架入口管理实例就绪和文档列出的布局生命周期；面板数据、权限与产品状态仍由宿主负责。"
          : "The framework entry manages instance readiness and the documented layout lifecycle; panel data, permissions, and product state remain host-owned."
      : hasController
        ? framework === "html"
          ? isChinese
            ? "浏览器运行时初始化公开 DOM 控制器；事件、状态与方法仍以组件文档中的 HTML 契约为唯一来源。"
            : "The browser runtime initializes the public DOM controller; documented HTML events, state, and methods remain the source of truth."
          : framework === "react"
            ? isChinese
              ? "绑定 ref、订阅公开 DOM 事件并调用文档列出的方法，不复制一份 React 私有状态。"
              : "Binds the ref, subscribes to public DOM events, and calls documented methods without duplicating state in React."
            : isChinese
              ? "提供 componentRef、ready、事件订阅与 call()，不复制一份 Vue 私有状态。"
              : "Provides componentRef, ready, event subscriptions, and call() without duplicating state in Vue."
        : framework === "html"
          ? isChinese
            ? "此组件由语义化 HTML 与 CSS 完成，不需要额外的 JavaScript 控制器。"
            : "Semantic HTML and CSS provide this component; no additional JavaScript controller is required."
          : isChinese
            ? `此组件没有框架私有 Hook；${frameworkLabel(framework)} 适配器只映射相同的语义根元素，状态由原生事件和宿主应用管理。`
            : `This component needs no framework-specific hook. The ${frameworkLabel(framework)} adapter maps the same semantic root while native events and the host own state.`;
  const versionLabel =
    version === "next" ? (isChinese ? "开发版" : "Development") : version;

  return (
    <div
      className="a3s-preview-integration"
      data-component-integration={slug}
      data-framework={framework}
      data-framework-contract={semanticFrameworks ? "semantic" : "adapter"}
      data-mode="complete"
    >
      <header className="a3s-preview-integration__header">
        <div
          className="a3s-preview-integration__tabs"
          role="tablist"
          aria-label={isChinese ? "选择接入方式" : "Choose integration"}
          aria-orientation="horizontal"
          onKeyDown={handleFrameworkKeyDown}
        >
          {frameworks.map((candidate) => (
            <button
              key={candidate}
              type="button"
              role="tab"
              id={`${frameworkId}-${candidate}-tab`}
              aria-controls={`${frameworkId}-panel`}
              aria-selected={candidate === framework}
              tabIndex={candidate === framework ? 0 : -1}
              onClick={() => selectFramework(candidate)}
            >
              {frameworkLabel(candidate)}
            </button>
          ))}
        </div>
        <span className="a3s-preview-integration__context">
          {isChinese ? "接入代码" : "Integration code"}
          <span aria-hidden="true">·</span>
          {versionLabel}
        </span>
      </header>

      <div
        id={`${frameworkId}-panel`}
        className="a3s-preview-integration__panel"
        role="tabpanel"
        aria-labelledby={`${frameworkId}-${framework}-tab`}
      >
        <section className="a3s-preview-integration__install">
          <div className="a3s-preview-integration__install-label">
            <strong>{isChinese ? "安装" : "Install"}</strong>
            <span>Terminal</span>
          </div>
          <CodeBlockRuntime
            lang="bash"
            code={content.install}
            containerElementClassName="a3s-preview-integration__code"
            codeButtonGroupProps={copyOnlyCodeActions}
          />
        </section>

        <section className="a3s-preview-integration__workspace">
          <div
            className="a3s-preview-integration__files"
            role="tablist"
            aria-label={isChinese ? "选择代码文件" : "Choose code file"}
            aria-orientation="horizontal"
            onKeyDown={handleFileKeyDown}
          >
            <button
              id={`${fileId}-example-tab`}
              type="button"
              role="tab"
              aria-controls={`${fileId}-example-source`}
              aria-label={`${isChinese ? "示例" : "Example"} ${content.exampleFile}`}
              aria-selected={activeFile === "example"}
              tabIndex={activeFile === "example" ? 0 : -1}
              title={content.exampleFile}
              onClick={() => setActiveFile("example")}
            >
              <span>{isChinese ? "示例" : "Example"}</span>
              <code>{content.exampleFile}</code>
            </button>
            <button
              id={`${fileId}-setup-tab`}
              type="button"
              role="tab"
              aria-controls={`${fileId}-setup-source`}
              aria-label={`${isChinese ? "入口" : "Entry"} ${content.setupFile}`}
              aria-selected={activeFile === "setup"}
              tabIndex={activeFile === "setup" ? 0 : -1}
              title={content.setupFile}
              onClick={() => setActiveFile("setup")}
            >
              <span>{isChinese ? "入口" : "Entry"}</span>
              <code>{content.setupFile}</code>
            </button>
          </div>
          {sourceFiles.map((sourceFile) => (
            <div
              key={sourceFile.kind}
              id={`${fileId}-${sourceFile.kind}-source`}
              className="a3s-preview-integration__source"
              role="tabpanel"
              aria-labelledby={`${fileId}-${sourceFile.kind}-tab`}
              data-code-file={sourceFile.kind}
              data-code-filename={sourceFile.file}
              hidden={activeFile !== sourceFile.kind}
            >
              <CodeBlockRuntime
                lang={sourceFile.language}
                code={sourceFile.code}
                containerElementClassName="a3s-preview-integration__code"
                codeButtonGroupProps={copyOnlyCodeActions}
              />
            </div>
          ))}
        </section>

        <footer className="a3s-preview-integration__note">
          <strong>
            {semanticFrameworks
              ? isChinese
                ? "版本合同"
                : "Version contract"
              : hasController
                ? framework === "vue"
                  ? isChinese
                    ? "组合式函数"
                    : "Composable"
                  : framework === "react"
                    ? "Hook"
                    : isHarnessGuide
                      ? isChinese
                        ? "原生入口"
                        : "Native entry"
                      : isChinese
                        ? "控制器"
                        : "Controller"
                : isChinese
                  ? "状态归属"
                  : "State ownership"}
          </strong>
          <p>
            {hasController && framework !== "html" ? (
              <>
                <code>{hookName}</code> {integrationNote}
              </>
            ) : (
              integrationNote
            )}
          </p>
        </footer>
      </div>
    </div>
  );
}
