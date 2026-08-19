import { useState } from "react";
import { withBase } from "@rspress/core/runtime";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductModelSettings } from "./ProductSettingsModelManager";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  announceProductSetting,
  SettingsHeader,
  SettingsRow,
  SettingsSwitch,
} from "./ProductSettingsPrimitives";

export function ExecutionSettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "定义新任务的默认执行边界。每个任务仍可单独收紧。"
            : "Define default execution boundaries for new tasks. Each task can still be restricted further."
        }
        title={zh ? "执行设置" : "Execution"}
      />
      <section className="product-settings__rows">
        <SettingsRow
          description={
            zh
              ? "平衡速度、分析深度与交互确认。"
              : "Balance speed, analysis depth, and confirmation."
          }
          title={zh ? "默认执行模式" : "Default execution mode"}
        >
          <select
            defaultValue="balanced"
            onChange={(event) =>
              announceProductSetting("executionMode", event.currentTarget.value)
            }
          >
            <option value="balanced">{zh ? "平衡" : "Balanced"}</option>
            <option value="guided">{zh ? "逐步确认" : "Guided"}</option>
            <option value="focused">{zh ? "聚焦执行" : "Focused"}</option>
          </select>
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "文件修改、外部写入与高风险操作前确认。"
              : "Confirm before file changes, external writes, and privileged actions."
          }
          title={zh ? "操作审批" : "Action approval"}
        >
          <select
            defaultValue="risk"
            onChange={(event) =>
              announceProductSetting(
                "actionApproval",
                event.currentTarget.value,
              )
            }
          >
            <option value="risk">
              {zh ? "按风险确认" : "Confirm by risk"}
            </option>
            <option value="always">{zh ? "始终确认" : "Always confirm"}</option>
          </select>
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "仅在当前工作区边界内读写文件。"
              : "Read and write only within the current workspace boundary."
          }
          title={zh ? "工作区隔离" : "Workspace isolation"}
        >
          <SettingsSwitch
            checked
            label={zh ? "工作区隔离" : "Workspace isolation"}
          />
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "完成后保留命令、结果与恢复信息。"
              : "Retain commands, results, and recovery context after completion."
          }
          title={zh ? "保留执行证据" : "Keep execution evidence"}
        >
          <SettingsSwitch
            checked
            label={zh ? "保留执行证据" : "Keep execution evidence"}
          />
        </SettingsRow>
      </section>
      <section className="product-settings__boundary">
        <ProductPlaygroundIcon name="shield" />
        <span>
          <strong>{zh ? "默认安全边界" : "Default safety boundary"}</strong>
          <small>
            {zh
              ? "外部发布、删除和凭据访问始终需要明确授权。"
              : "Publishing, deletion, and credential access always require explicit authorization."}
          </small>
        </span>
      </section>
    </>
  );
}

export function MemorySettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [items, setItems] = useState([
    zh ? "偏好使用中文界面" : "Prefers the current interface language",
    zh ? "发布前需要视觉验收证据" : "Requires visual evidence before release",
  ]);
  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "记忆只保存明确、长期且有助于任务执行的信息。"
            : "Memory keeps only explicit, durable information that helps future work."
        }
        title={zh ? "记忆" : "Memory"}
      />
      <section className="product-settings__rows">
        <SettingsRow
          description={
            zh
              ? "新记忆会在保存前显示来源与作用范围。"
              : "New memories show their source and scope before being saved."
          }
          title={zh ? "启用记忆" : "Enable memory"}
        >
          <SettingsSwitch checked label={zh ? "启用记忆" : "Enable memory"} />
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "默认仅在当前工作区中使用。"
              : "Use memory only in the current workspace by default."
          }
          title={zh ? "默认范围" : "Default scope"}
        >
          <select
            defaultValue="workspace"
            onChange={(event) =>
              announceProductSetting("memoryScope", event.currentTarget.value)
            }
          >
            <option value="workspace">
              {zh ? "当前工作区" : "Current workspace"}
            </option>
            <option value="local">{zh ? "此设备" : "This device"}</option>
          </select>
        </SettingsRow>
      </section>
      <section className="product-settings__memory-list">
        <header>
          <strong>
            {zh
              ? `已保存记忆（${items.length}）`
              : `Saved memories (${items.length})`}
          </strong>
          <button
            disabled={!items.length}
            onClick={() => setItems([])}
            type="button"
          >
            {zh ? "全部清除" : "Clear all"}
          </button>
        </header>
        {items.length ? (
          items.map((item) => (
            <article key={item}>
              <ProductPlaygroundIcon name="knowledge" />
              <span>
                <strong>{item}</strong>
                <small>
                  {zh
                    ? "当前工作区 · 本地保存"
                    : "Current workspace · Stored locally"}
                </small>
              </span>
              <button
                aria-label={zh ? `删除${item}` : `Delete ${item}`}
                onClick={() =>
                  setItems((current) =>
                    current.filter((value) => value !== item),
                  )
                }
                type="button"
              >
                <ProductPlaygroundIcon name="close" />
              </button>
            </article>
          ))
        ) : (
          <p>{zh ? "当前没有已保存记忆。" : "No saved memories yet."}</p>
        )}
      </section>
    </>
  );
}

export function ModelSettings({ locale }: { locale: ProductPlaygroundLocale }) {
  return <ProductModelSettings locale={locale} />;
}

const integrations = [
  { id: "browser", label: { en: "Browser preview", zh: "浏览器预览" } },
  { id: "repository", label: { en: "Repository events", zh: "仓库事件" } },
  { id: "documents", label: { en: "Document provider", zh: "文档服务" } },
] as const;

export function AssistantSettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const guideHref = withBase(
    locale === "zh" ? "/integration.html" : "/en/integration.html",
  );

  const toggleIntegration = (integrationId: string, enabled: boolean) => {
    setConfigured((current) => ({
      ...current,
      [integrationId]: enabled,
    }));
    announceProductSetting("assistantIntegration", {
      enabled,
      id: integrationId,
    });
  };

  return (
    <>
      <SettingsHeader title={zh ? "助理设置" : "Assistant settings"} />
      <section className="product-settings__group">
        <div className="product-settings__group-title">
          <h3>{zh ? "本地集成（Beta）" : "Local integrations (Beta)"}</h3>
          <a href={guideHref}>{zh ? "配置指南" : "Setup guide"}</a>
        </div>
        <article className="product-settings__featured">
          <div>
            <strong>
              {zh ? "本地 WebView 集成" : "Local WebView integration"}
            </strong>
            <p>
              {zh
                ? "允许本地预览表面共享经过授权的任务上下文。"
                : "Share authorized task context with local preview surfaces."}
            </p>
          </div>
          <SettingsSwitch
            checked
            label={
              zh ? "启用本地 WebView 集成" : "Enable local WebView integration"
            }
          />
          <label>
            <span>{zh ? "同步任务产物" : "Sync task artifacts"}</span>
            <SettingsSwitch
              label={zh ? "同步任务产物" : "Sync task artifacts"}
            />
          </label>
          <div
            aria-hidden="true"
            className="product-settings__integration-mark"
          >
            <ProductPlaygroundIcon name="workspace" />
          </div>
        </article>
        {integrations.map((integration) => {
          const isConfigured = Boolean(configured[integration.id]);
          return (
            <article
              className="product-settings__integration"
              data-configured={isConfigured ? "true" : undefined}
              key={integration.id}
            >
              <div>
                <strong>{integration.label[locale]}</strong>
                <p>
                  {isConfigured
                    ? zh
                      ? "连接已启用，可随时点击移除。"
                      : "The connection is enabled and can be removed at any time."
                    : zh
                      ? "授权、数据与失败恢复由宿主管理。"
                      : "Authorization, data, and recovery remain host-owned."}
                </p>
                <a href={guideHref}>{zh ? "配置指南" : "Setup guide"}</a>
              </div>
              <button
                aria-pressed={isConfigured}
                onClick={() => toggleIntegration(integration.id, !isConfigured)}
                type="button"
              >
                {isConfigured
                  ? zh
                    ? "移除"
                    : "Remove"
                  : zh
                    ? "配置"
                    : "Configure"}
              </button>
            </article>
          );
        })}
      </section>
    </>
  );
}
