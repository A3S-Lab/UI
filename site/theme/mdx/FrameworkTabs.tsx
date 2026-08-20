import {
  CodeBlockRuntime,
  type CodeBlockRuntimeProps,
} from "@rspress/core/theme";
import { useLang } from "@rspress/core/runtime";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import "./FrameworkTabs.css";

type Framework = "html" | "react" | "vue";

type FrameworkTabsProps = Record<Framework, string> & {
  htmlInstall?: string;
  reactInstall?: string;
  vueInstall?: string;
};

const frameworks: readonly Framework[] = ["html", "react", "vue"];
const storageKey = "a3s-ui-docs-framework";
// Rspress supplies the copy target internally, but its public option type still
// exposes that private field.
const copyOnlyCodeActions = {
  showWrapCodeButton: false,
} as NonNullable<CodeBlockRuntimeProps["codeButtonGroupProps"]>;

const defaultInstall: Record<Framework, string> = {
  html: "npm install @a3s-lab/ui",
  react: "npm install @a3s-lab/ui react react-dom",
  vue: "npm install @a3s-lab/ui vue",
};

function frameworkLabel(framework: Framework) {
  if (framework === "html") return "HTML";
  return framework === "react" ? "React" : "Vue";
}

export default function FrameworkTabs({
  html,
  htmlInstall = defaultInstall.html,
  react,
  reactInstall = defaultInstall.react,
  vue,
  vueInstall = defaultInstall.vue,
}: FrameworkTabsProps) {
  const language = useLang();
  const zh = language === "zh";
  const id = useId();
  const [framework, setFramework] = useState<Framework>("html");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Framework | null;
      if (stored && frameworks.includes(stored)) setFramework(stored);
    } catch {
      // Persistence is optional.
    }
  }, []);

  const select = (next: Framework) => {
    setFramework(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Persistence is optional.
    }
  };

  const keydown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const current = frameworks.indexOf(framework);
    const direction = getComputedStyle(event.currentTarget).direction;
    const arrowDelta =
      event.key === "ArrowRight"
        ? direction === "rtl"
          ? -1
          : 1
        : direction === "rtl"
          ? 1
          : -1;
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? frameworks.length - 1
          : (current + arrowDelta + frameworks.length) % frameworks.length;
    const next = frameworks[index];
    select(next);
    document.getElementById(`${id}-${next}-tab`)?.focus();
  };

  const examples = { html, react, vue };
  const installs = {
    html: htmlInstall,
    react: reactInstall,
    vue: vueInstall,
  };
  const exampleFile = {
    html: "index.html",
    react: "Example.tsx",
    vue: "Example.vue",
  } satisfies Record<Framework, string>;
  const exampleLanguage = {
    html: "html",
    react: "tsx",
    vue: "vue",
  } satisfies Record<Framework, string>;

  return (
    <section
      className="a3s-framework-tabs"
      aria-label={zh ? "框架快速开始" : "Framework quick start"}
      data-framework={framework}
    >
      <header>
        <strong>{zh ? "快速开始" : "Quick start"}</strong>
        <div
          role="tablist"
          aria-label={zh ? "选择框架" : "Choose framework"}
          aria-orientation="horizontal"
          onKeyDown={keydown}
        >
          {frameworks.map((candidate) => (
            <button
              key={candidate}
              id={`${id}-${candidate}-tab`}
              type="button"
              role="tab"
              aria-controls={`${id}-panel`}
              aria-selected={candidate === framework}
              tabIndex={candidate === framework ? 0 : -1}
              onClick={() => select(candidate)}
            >
              {frameworkLabel(candidate)}
            </button>
          ))}
        </div>
      </header>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${framework}-tab`}
      >
        <section className="a3s-framework-tabs__step a3s-framework-tabs__install">
          <div className="a3s-framework-tabs__step-label">
            <strong>{zh ? "安装" : "Install"}</strong>
            <span>Terminal</span>
          </div>
          <CodeBlockRuntime
            lang="bash"
            code={installs[framework].trim()}
            containerElementClassName="a3s-framework-tabs__code"
            codeButtonGroupProps={copyOnlyCodeActions}
          />
        </section>
        <section className="a3s-framework-tabs__step a3s-framework-tabs__example">
          <div className="a3s-framework-tabs__step-label">
            <strong>{zh ? "示例" : "Example"}</strong>
            <span>{exampleFile[framework]}</span>
          </div>
          <CodeBlockRuntime
            lang={exampleLanguage[framework]}
            code={examples[framework].trim()}
            containerElementClassName="a3s-framework-tabs__code"
            codeButtonGroupProps={copyOnlyCodeActions}
          />
        </section>
      </div>
    </section>
  );
}
