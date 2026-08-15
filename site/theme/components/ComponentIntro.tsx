import { useEffect, useRef, useState } from "react";
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
  const resetTimer = useRef<number | null>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");

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
  const command = "npm install @a3s-lab/ui";
  const versionLabel =
    version === "next"
      ? isChinese
        ? "开发版"
        : "Development"
      : version;
  const copyLabel =
    copyState === "copied"
      ? isChinese
        ? "安装命令已复制"
        : "Install command copied"
      : copyState === "error"
        ? isChinese
          ? "复制失败，请重试"
          : "Copy failed, try again"
        : isChinese
          ? "复制安装命令"
          : "Copy install command";

  const copyCommand = async () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);

    try {
      await writeClipboardText(command);
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
        <ul aria-label={isChinese ? "可用接入方式" : "Available integrations"}>
          <li>HTML</li>
          <li>React</li>
          <li>Vue</li>
        </ul>
      </div>

      <div className="component-intro__install">
        <code>{command}</code>
        <button
          type="button"
          onClick={copyCommand}
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
