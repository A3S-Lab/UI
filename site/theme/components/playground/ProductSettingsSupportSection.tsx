import { useState } from "react";
import { withBase } from "@rspress/core/runtime";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { SettingsHeader, SettingsRow } from "./ProductSettingsPrimitives";

async function copyDiagnosticSummary(summary: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(summary);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = summary;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.append(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) throw new Error("Clipboard access is unavailable");
}

export function HelpSettings({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  const [checked, setChecked] = useState(false);
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">(
    "idle",
  );
  const documentationHref = withBase(
    locale === "zh" ? "/installation.html" : "/en/installation.html",
  );

  const copyDiagnostics = () => {
    const diagnosticSummary = [
      "A3S UI 0.3.0",
      `Locale: ${locale}`,
      `Theme: ${document.documentElement.classList.contains("dark") ? "dark" : "light"}`,
      "Storage: available",
      "Credentials: excluded",
    ].join("\n");
    setCopyState("idle");
    void copyDiagnosticSummary(diagnosticSummary)
      .then(() => setCopyState("copied"))
      .catch(() => setCopyState("error"));
  };

  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "查看版本、运行诊断并获取配置帮助。"
            : "Review the version, run diagnostics, and get configuration help."
        }
        title={zh ? "帮助与反馈" : "Help and feedback"}
      />
      <section className="product-settings__about">
        <img alt="" height="56" src={withBase("/logo.png")} width="56" />
        <span>
          <strong>A3S UI</strong>
          <small>v0.3.0 · {zh ? "本地工作区" : "Local workspace"}</small>
        </span>
      </section>
      <section className="product-settings__rows">
        <SettingsRow
          description={
            zh
              ? "检查本地存储、渲染环境与可用集成。"
              : "Check local storage, rendering, and available integrations."
          }
          title={zh ? "运行诊断" : "Run diagnostics"}
        >
          <button onClick={() => setChecked(true)} type="button">
            {checked
              ? zh
                ? "状态正常"
                : "Healthy"
              : zh
                ? "开始检查"
                : "Run checks"}
          </button>
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "打开公开文档中的安装与配置指南。"
              : "Open installation and configuration guidance in the public docs."
          }
          title={zh ? "使用文档" : "Documentation"}
        >
          <a href={documentationHref}>{zh ? "打开文档" : "Open docs"}</a>
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "复制不含任务内容与凭据的诊断摘要。"
              : "Copy a diagnostic summary without task content or credentials."
          }
          title={zh ? "问题反馈" : "Report an issue"}
        >
          <button
            data-state={copyState}
            onClick={copyDiagnostics}
            type="button"
          >
            {copyState === "copied"
              ? zh
                ? "已复制"
                : "Copied"
              : copyState === "error"
                ? zh
                  ? "复制失败，请重试"
                  : "Copy failed, retry"
                : zh
                  ? "复制诊断信息"
                  : "Copy diagnostics"}
          </button>
        </SettingsRow>
      </section>
    </>
  );
}
