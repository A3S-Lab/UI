import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  useLang,
  useLocation,
  useVersion,
  withBase,
} from "@rspress/core/runtime";
import {
  findCatalogRecord,
  type CatalogLanguage,
} from "./componentCatalogData";
import { writeClipboardText } from "./clipboard";
import "./ComponentIntro.css";

type CopyState = "copied" | "error" | "idle";
type Framework = "html" | "react" | "vue";

const FRAMEWORK_STORAGE_KEY = "a3s-ui-docs-framework";
const frameworks: readonly Framework[] = ["html", "react", "vue"];

function adapterName(slug: string) {
  return slug
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      {copied ? (
        <path
          d="m4.5 10.25 3.25 3.25 7.75-7.75"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <rect x="6.25" y="6.25" width="9" height="9" rx="1.75" />
          <path d="M13.25 6.25v-1.5c0-.97-.78-1.75-1.75-1.75H4.75C3.78 3 3 3.78 3 4.75v6.75c0 .97.78 1.75 1.75 1.75h1.5" />
        </>
      )}
    </svg>
  );
}

export function ComponentIntro() {
  const currentLanguage = useLang();
  const location = useLocation();
  const version = useVersion();
  const language: CatalogLanguage = currentLanguage === "en" ? "en" : "zh";
  const isChinese = language === "zh";
  const slug = location.pathname.match(/\/components\/([^/.]+)/)?.[1];
  const record = slug ? findCatalogRecord(language, slug) : undefined;
  const frameworkId = useId();
  const resetTimer = useRef<number | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");
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

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  if (!record) return null;

  const routeParts = [
    version === "next" ? "" : version,
    language === "zh" ? "" : language,
    "components",
  ].filter(Boolean);
  const catalogHref = withBase(`/${routeParts.join("/")}/index.html`);
  const componentName = adapterName(record.slug);
  const snippets: Record<Framework, string> = {
    html: 'import "@a3s-lab/ui";\nimport "@a3s-lab/ui/all";',
    react: `import "@a3s-lab/ui";\nimport { ${componentName} } from "@a3s-lab/ui/react";`,
    vue: `import "@a3s-lab/ui";\nimport { ${componentName} } from "@a3s-lab/ui/vue";`,
  };
  const snippet = snippets[framework];
  const frameworkLabel =
    framework === "html" ? "HTML" : framework === "react" ? "React" : "Vue";
  const versionLabel =
    version === "next"
      ? isChinese
        ? "开发版"
        : "Development"
      : version;
  const copyLabel =
    copyState === "copied"
        ? isChinese
        ? `${frameworkLabel} 接入代码已复制`
        : `${frameworkLabel} integration copied`
      : copyState === "error"
        ? isChinese
          ? "复制失败，请重试"
          : "Copy failed, try again"
        : isChinese
          ? `复制 ${frameworkLabel} 接入代码`
          : `Copy ${frameworkLabel} integration`;

  const selectFramework = (nextFramework: Framework) => {
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
    setCopyState("idle");
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
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? frameworks.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) +
              frameworks.length) %
            frameworks.length;
    const nextFramework = frameworks[nextIndex];
    selectFramework(nextFramework);
    document
      .getElementById(`${frameworkId}-${nextFramework}-tab`)
      ?.focus();
  };

  const copySnippet = async () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);

    try {
      await writeClipboardText(snippet);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    resetTimer.current = window.setTimeout(() => {
      setCopyState("idle");
      resetTimer.current = null;
    }, 1800);
  };

  return (
    <section
      className="component-intro"
      aria-label={isChinese ? "组件快速开始" : "Component quick start"}
      data-component-intro={record.slug}
    >
      <div className="component-intro__context">
        <div>
          <a href={catalogHref}>{record.filterLabel}</a>
          <span aria-hidden="true">/</span>
          <span>{versionLabel}</span>
        </div>
        <div className="component-intro__frameworks tabs">
          <div
            role="tablist"
            aria-label={isChinese ? "选择接入方式" : "Choose integration"}
            aria-orientation="horizontal"
            data-variant="line"
            onKeyDown={handleFrameworkKeyDown}
          >
            {frameworks.map((candidate) => {
              const label =
                candidate === "html"
                  ? "HTML"
                  : candidate === "react"
                    ? "React"
                    : "Vue";
              return (
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
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        id={`${frameworkId}-panel`}
        className="component-intro__snippet"
        role="tabpanel"
        aria-labelledby={`${frameworkId}-${framework}-tab`}
        tabIndex={0}
      >
        <pre>
          <code>{snippet}</code>
        </pre>
        <button
          type="button"
          onClick={copySnippet}
          aria-label={copyLabel}
          title={copyLabel}
          data-state={copyState}
        >
          <CopyIcon copied={copyState === "copied"} />
          <span>
            {copyState === "copied"
              ? isChinese
                ? "已复制"
                : "Copied"
              : copyState === "error"
                ? isChinese
                  ? "重试"
                  : "Retry"
                : isChinese
                  ? "复制"
                  : "Copy"}
          </span>
          <span className="component-intro__feedback" aria-live="polite">
            {copyState === "idle" ? "" : copyLabel}
          </span>
        </button>
      </div>
    </section>
  );
}
