import {
  CodeBlockRuntime,
  type CodeBlockRuntimeProps,
} from "@rspress/core/theme";
import {
  useLang,
  useLocation,
  useVersion,
  withBase,
} from "@rspress/core/runtime";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import {
  findCatalogRecord,
  type CatalogLanguage,
} from "./componentCatalogData";
import "./ComponentIntro.css";

type Framework = "html" | "react" | "vue";

type ComponentIntroProps = Partial<Record<Framework, string>> & {
  hasController?: boolean;
  semanticFrameworks?: boolean;
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
      install: installCommand(framework, slug, version),
      setup:
        setupImports ??
        (hasController
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
    install: installCommand(framework, slug, version),
    setup: setupImports ?? 'import "@a3s-lab/ui/a3s.css";',
    setupFile: "main.ts",
    setupLanguage: "ts",
  };
}

export function ComponentIntro({
  hasController = false,
  html,
  react,
  semanticFrameworks = false,
  vue,
}: ComponentIntroProps) {
  const currentLanguage = useLang();
  const location = useLocation();
  const version = useVersion();
  const language: CatalogLanguage = currentLanguage === "en" ? "en" : "zh";
  const isChinese = language === "zh";
  const slug = location.pathname.match(/\/components\/([^/.]+)/)?.[1];
  const record = slug ? findCatalogRecord(language, slug) : undefined;
  const frameworkId = useId();
  const [framework, setFramework] = useState<Framework>("html");

  useEffect(() => {
    try {
      const storedFramework = window.localStorage.getItem(
        FRAMEWORK_STORAGE_KEY,
      );
      if (frameworks.includes(storedFramework as Framework)) {
        setFramework(storedFramework as Framework);
      }
    } catch {
      // Storage is an enhancement; tabs remain fully operable without it.
    }
  }, []);

  if (!record) return null;

  const routeParts = [
    version === "next" ? "" : version,
    language === "zh" ? "" : language,
    "components",
  ].filter(Boolean);
  const catalogHref = withBase(`/${routeParts.join("/")}/index.html`);
  const componentName = adapterName(record.slug);
  const hookName = `use${componentName}`;
  const versionLabel =
    version === "next" ? (isChinese ? "开发版" : "Development") : version;
  const examples = html && react && vue ? { html, react, vue } : undefined;

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

  const content = examples
    ? integrationContent(
        framework,
        record.slug,
        componentName,
        hasController,
        semanticFrameworks,
        version,
        examples,
      )
    : undefined;
  const integrationNote = semanticFrameworks
    ? isChinese
      ? "该发布版本尚未提供框架适配器；示例直接渲染同一语义 DOM，并由该版本的浏览器运行时增强交互。"
      : "This published version predates framework adapters. The example renders the same semantic DOM and lets that version's browser runtime enhance its interactions."
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

  return (
    <section
      className="component-intro"
      aria-label={isChinese ? "组件快速开始" : "Component quick start"}
      data-component-intro={record.slug}
      data-mode={content ? "complete" : "legacy"}
      data-framework-contract={semanticFrameworks ? "semantic" : "adapter"}
    >
      <header className="component-intro__header">
        <div className="component-intro__context">
          <strong>{isChinese ? "快速开始" : "Quick start"}</strong>
          <span>
            <a href={catalogHref}>{record.filterLabel}</a>
            <span aria-hidden="true">·</span>
            <span>{versionLabel}</span>
          </span>
        </div>
        <div className="component-intro__frameworks" role="presentation">
          <div
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
        </div>
      </header>

      <div
        id={`${frameworkId}-panel`}
        className="component-intro__panel"
        role="tabpanel"
        aria-labelledby={`${frameworkId}-${framework}-tab`}
      >
        {content ? (
          <>
            <section className="component-intro__step component-intro__install">
              <div className="component-intro__step-label">
                <strong>{isChinese ? "安装" : "Install"}</strong>
                <span>Terminal</span>
              </div>
              <CodeBlockRuntime
                lang="bash"
                code={content.install}
                containerElementClassName="component-intro__code"
                codeButtonGroupProps={copyOnlyCodeActions}
              />
            </section>

            <section className="component-intro__step component-intro__setup">
              <div className="component-intro__step-label">
                <strong>{isChinese ? "项目入口" : "Project entry"}</strong>
                <span>{content.setupFile}</span>
              </div>
              <CodeBlockRuntime
                lang={content.setupLanguage}
                code={content.setup}
                containerElementClassName="component-intro__code"
                codeButtonGroupProps={copyOnlyCodeActions}
              />
            </section>

            <section className="component-intro__step component-intro__example">
              <div className="component-intro__step-label">
                <strong>{isChinese ? "最小示例" : "Minimal example"}</strong>
                <span>{content.exampleFile}</span>
              </div>
              <CodeBlockRuntime
                lang={content.exampleLanguage}
                code={content.example}
                containerElementClassName="component-intro__code"
                codeButtonGroupProps={copyOnlyCodeActions}
              />
            </section>

            <div className="component-intro__note">
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
            </div>
          </>
        ) : (
          <div className="component-intro__legacy">
            <p>
              {isChinese
                ? "此版本保留发布时的原生 HTML 契约；框架适配器用法请切换到开发版文档。"
                : "This version preserves its published native HTML contract. Switch to the development docs for framework adapter guidance."}
            </p>
            <CodeBlockRuntime
              lang="js"
              code={
                framework === "html"
                  ? 'import "@a3s-lab/ui/a3s.css";\nimport "@a3s-lab/ui/all";'
                  : `import "@a3s-lab/ui/a3s.css";\nimport { ${componentName} } from "@a3s-lab/ui/${framework}";`
              }
              containerElementClassName="component-intro__code"
              codeButtonGroupProps={copyOnlyCodeActions}
            />
          </div>
        )}
      </div>
    </section>
  );
}
