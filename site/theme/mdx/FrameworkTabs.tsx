import { CodeBlockRuntime } from "@rspress/core/theme";
import { useLang } from "@rspress/core/runtime";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { writeClipboardText } from "../components/clipboard";
import "./FrameworkTabs.css";

type Framework = "html" | "react" | "vue";

const frameworks: Framework[] = ["html", "react", "vue"];
const storageKey = "a3s-ui-docs-framework";

export default function FrameworkTabs({
  html,
  react,
  vue,
}: Record<Framework, string>) {
  const language = useLang();
  const zh = language === "zh";
  const id = useId();
  const timer = useRef<number | null>(null);
  const [framework, setFramework] = useState<Framework>("html");
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">("idle");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Framework | null;
      if (stored && frameworks.includes(stored)) setFramework(stored);
    } catch {
      // Persistence is optional.
    }
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const select = (next: Framework) => {
    setFramework(next);
    setCopyState("idle");
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Persistence is optional.
    }
  };

  const keydown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = frameworks.indexOf(framework);
    const index = event.key === "Home"
      ? 0
      : event.key === "End"
        ? frameworks.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + frameworks.length) % frameworks.length;
    const next = frameworks[index];
    select(next);
    document.getElementById(`${id}-${next}-tab`)?.focus();
  };

  const copy = async () => {
    try {
      await writeClipboardText({ html, react, vue }[framework]);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopyState("idle"), 1800);
  };

  const code = { html, react, vue }[framework].trim();
  const copyLabel = copyState === "copied"
    ? zh ? "已复制" : "Copied"
    : copyState === "error"
      ? zh ? "重试" : "Retry"
      : zh ? "复制代码" : "Copy code";

  return (
    <section className="a3s-framework-tabs tabs" aria-label={zh ? "框架用法" : "Framework usage"}>
      <header>
        <div role="tablist" aria-label={zh ? "选择框架" : "Choose framework"} onKeyDown={keydown}>
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
              {candidate === "html" ? "HTML" : candidate === "react" ? "React" : "Vue"}
            </button>
          ))}
        </div>
        <button type="button" className="a3s-framework-tabs__copy" data-state={copyState} onClick={copy}>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
            {copyState === "copied" ? (
              <path d="m4.5 10.25 3.25 3.25 7.75-7.75" />
            ) : (
              <><rect x="6.25" y="6.25" width="9" height="9" rx="1.75" /><path d="M13.25 6.25v-1.5A1.75 1.75 0 0 0 11.5 3H4.75A1.75 1.75 0 0 0 3 4.75v6.75c0 .97.78 1.75 1.75 1.75h1.5" /></>
            )}
          </svg>
          <span>{copyLabel}</span>
        </button>
      </header>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${framework}-tab`} tabIndex={0}>
        <CodeBlockRuntime
          lang={framework === "html" ? "html" : framework === "react" ? "tsx" : "vue"}
          code={code}
          containerElementClassName="a3s-framework-tabs__code"
        />
      </div>
      <span className="a3s-framework-tabs__feedback" aria-live="polite">
        {copyState === "idle" ? "" : copyLabel}
      </span>
    </section>
  );
}
