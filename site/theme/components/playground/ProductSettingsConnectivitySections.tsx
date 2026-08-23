import { useEffect, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  announceProductSetting,
  SettingsHeader,
  SettingsRow,
  SettingsSwitch,
} from "./ProductSettingsPrimitives";

export function IntegrationSettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [configured, setConfigured] = useState(
    new Set(["webview", "repository"]),
  );
  const integrations = [
    {
      id: "webview",
      icon: "workspace" as const,
      name: { en: "Local preview", zh: "本地预览" },
      description: {
        en: "Render authorized local targets inside device shells and retain bounded evidence.",
        zh: "在设备外壳中渲染已授权的本地目标，并保留受控证据。",
      },
    },
    {
      id: "repository",
      icon: "project" as const,
      name: { en: "Repository events", zh: "仓库事件" },
      description: {
        en: "Use branch, review, and check events as task and automation triggers.",
        zh: "将分支、评审与检查事件用作任务和自动化触发器。",
      },
    },
    {
      id: "office",
      icon: "document" as const,
      name: { en: "Office and PDF services", zh: "Office 与 PDF 服务" },
      description: {
        en: "Enable local conversion, preview, print, and safe save-back for supported files.",
        zh: "为支持的文件启用本地转换、预览、打印与安全回写。",
      },
    },
    {
      id: "knowledge",
      icon: "knowledge" as const,
      name: { en: "Knowledge sources", zh: "知识源" },
      description: {
        en: "Search approved sources and attach traceable excerpts to a task.",
        zh: "搜索已授权资料，并将可追溯片段加入任务上下文。",
      },
    },
  ];

  const toggle = (id: string) => {
    setConfigured((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      announceProductSetting("integration", {
        enabled: next.has(id),
        id,
      });
      return next;
    });
  };

  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "连接产品能力，不在浏览器组件中保存凭据或远程数据。"
            : "Connect product capabilities without storing credentials or remote data in browser components."
        }
        title={zh ? "集成" : "Integrations"}
      />
      <section className="product-settings__connection-list">
        {integrations.map((integration) => {
          const enabled = configured.has(integration.id);
          return (
            <article
              data-connected={enabled ? "true" : undefined}
              key={integration.id}
            >
              <span>
                <ProductPlaygroundIcon name={integration.icon} />
              </span>
              <div>
                <header>
                  <strong>{integration.name[locale]}</strong>
                  <em>
                    {enabled
                      ? zh
                        ? "已连接"
                        : "Connected"
                      : zh
                        ? "未配置"
                        : "Not configured"}
                  </em>
                </header>
                <p>{integration.description[locale]}</p>
                <small>
                  {enabled
                    ? zh
                      ? "授权由宿主管理 · 上次检查刚刚"
                      : "Host-managed authorization · Checked just now"
                    : zh
                      ? "配置后会明确显示请求的权限"
                      : "Requested permissions are shown before setup"}
                </small>
              </div>
              <button
                aria-pressed={enabled}
                onClick={() => toggle(integration.id)}
                type="button"
              >
                {enabled ? (zh ? "管理" : "Manage") : zh ? "配置" : "Configure"}
              </button>
            </article>
          );
        })}
      </section>
      <section className="product-settings__rows">
        <SettingsRow
          description={
            zh
              ? "连接中断时保留最后一次成功数据，并显示恢复操作。"
              : "Keep the last successful data and expose recovery when a connection fails."
          }
          title={zh ? "保留可用状态" : "Keep usable state"}
        >
          <SettingsSwitch
            checked
            label={zh ? "保留可用状态" : "Keep usable state"}
          />
        </SettingsRow>
      </section>
    </>
  );
}

export function ChannelSettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [active, setActive] = useState("local");
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [enabled, setEnabled] = useState(new Set(["local"]));
  const [notificationScope, setNotificationScope] = useState("bounded");
  const configurationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const channels = [
    {
      id: "local",
      icon: "workspace" as const,
      name: { en: "Local application", zh: "本地应用" },
      description: {
        en: "Primary interactive channel on this device.",
        zh: "此设备上的主要交互渠道。",
      },
    },
    {
      id: "webhook",
      icon: "link" as const,
      name: { en: "Webhook", zh: "Webhook" },
      description: {
        en: "Receive verified events from approved services.",
        zh: "接收来自已授权服务的已验证事件。",
      },
    },
    {
      id: "feishu",
      icon: "send" as const,
      name: { en: "Feishu", zh: "飞书" },
      description: {
        en: "Create tasks from approved chats and return bounded updates.",
        zh: "从已授权会话创建任务并返回受控进度。",
      },
    },
    {
      id: "weixin",
      icon: "mail" as const,
      name: { en: "Weixin remote", zh: "微信远程" },
      description: {
        en: "Review and confirm remote task requests with explicit pairing.",
        zh: "通过明确配对审阅并确认远程任务请求。",
      },
    },
  ];
  const selected =
    channels.find((channel) => channel.id === active) ?? channels[0];

  const openConfiguration = (
    channelId: string,
    trigger: HTMLButtonElement,
  ) => {
    configurationTriggerRef.current = trigger;
    setActive(channelId);
    setConfigurationOpen(true);
  };

  const closeConfiguration = () => {
    setConfigurationOpen(false);
    queueMicrotask(() => configurationTriggerRef.current?.focus());
  };

  const toggle = (id: string) => {
    setEnabled((current) => {
      const next = new Set(current);
      if (next.has(id) && id !== "local") next.delete(id);
      else next.add(id);
      announceProductSetting("channel", { enabled: next.has(id), id });
      return next;
    });
  };

  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "渠道只负责接收、通知和确认；任务仍在同一个工作空间中执行。"
            : "Channels receive, notify, and confirm; tasks still execute in the same workspace."
        }
        title={zh ? "渠道" : "Channels"}
      />
      <section
        aria-label={zh ? "渠道列表" : "Channel list"}
        className="product-settings__channels"
      >
        <header>
          <div>
            <h3>{zh ? "连接渠道" : "Connected channels"}</h3>
            <span>{zh ? "测试功能" : "Beta"}</span>
          </div>
          <p>
            {zh
              ? "远程渠道必须显式配置；本地应用始终保留为安全入口。"
              : "Remote channels require explicit setup. The local application remains the safe entry point."}
          </p>
        </header>
        <div>
          {channels.map((channel) => (
            <article
              data-channel-id={channel.id}
              data-enabled={enabled.has(channel.id) ? "true" : undefined}
              key={channel.id}
            >
              <span className="product-settings__channel-icon">
                <ProductPlaygroundIcon name={channel.icon} />
              </span>
              <div>
                <header>
                  <strong>{channel.name[locale]}</strong>
                  {channel.id === "local" ? (
                    <em>{zh ? "默认" : "Default"}</em>
                  ) : null}
                </header>
                <p>{channel.description[locale]}</p>
                <small
                  data-ready={enabled.has(channel.id) ? "true" : undefined}
                >
                  <i />
                  {enabled.has(channel.id)
                    ? zh
                      ? "已启用"
                      : "Enabled"
                    : zh
                      ? "未配置"
                      : "Not configured"}
                </small>
              </div>
              {channel.id === "local" ? (
                <SettingsSwitch
                  checked
                  label={zh ? "启用本地应用" : "Enable local application"}
                  onCheckedChange={() => toggle(channel.id)}
                />
              ) : (
                <button
                  aria-haspopup="dialog"
                  onClick={(event) =>
                    openConfiguration(channel.id, event.currentTarget)
                  }
                  type="button"
                >
                  {enabled.has(channel.id)
                    ? zh
                      ? "管理"
                      : "Manage"
                    : zh
                      ? "配置"
                      : "Configure"}
                </button>
              )}
              {channel.id === "local" ? (
                <button
                  aria-haspopup="dialog"
                  className="product-settings__channel-manage"
                  onClick={(event) =>
                    openConfiguration(channel.id, event.currentTarget)
                  }
                  type="button"
                >
                  {zh ? "管理" : "Manage"}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <ChannelConfigurationDialog
        approvalRequired={approvalRequired}
        enabled={enabled.has(selected.id)}
        locale={locale}
        notificationScope={notificationScope}
        onApprovalChange={(next) => {
          setApprovalRequired(next);
          announceProductSetting("channelApproval", {
            channel: selected.id,
            required: next,
          });
        }}
        onClose={closeConfiguration}
        onNotificationScopeChange={(next) => {
          setNotificationScope(next);
          announceProductSetting("channelNotificationScope", {
            channel: selected.id,
            scope: next,
          });
        }}
        onToggle={() => toggle(selected.id)}
        open={configurationOpen}
        selected={selected}
      />
    </>
  );
}

function ChannelConfigurationDialog({
  approvalRequired,
  enabled,
  locale,
  notificationScope,
  onApprovalChange,
  onClose,
  onNotificationScopeChange,
  onToggle,
  open,
  selected,
}: {
  approvalRequired: boolean;
  enabled: boolean;
  locale: ProductPlaygroundLocale;
  notificationScope: string;
  onApprovalChange: (checked: boolean) => void;
  onClose: () => void;
  onNotificationScopeChange: (scope: string) => void;
  onToggle: () => void;
  open: boolean;
  selected: {
    description: { en: string; zh: string };
    icon: "link" | "mail" | "send" | "workspace";
    id: string;
    name: { en: string; zh: string };
  };
}) {
  const zh = locale === "zh";
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
  };

  return (
    <dialog
      aria-labelledby="product-channel-configuration-title"
      className="product-channel-dialog"
      data-channel-config-dialog
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
      onClose={(event) => {
        event.stopPropagation();
        onClose();
      }}
      ref={dialogRef}
    >
      <header>
        <span>
          <ProductPlaygroundIcon name={selected.icon} />
        </span>
        <div>
          <h3 id="product-channel-configuration-title">
            {zh ? `配置${selected.name.zh}` : `Configure ${selected.name.en}`}
          </h3>
          <p>{selected.description[locale]}</p>
        </div>
        <button
          aria-label={zh ? "关闭渠道配置" : "Close channel configuration"}
          onClick={close}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>

      <div className="product-channel-dialog__body">
        <div className="product-settings__channel-status">
          <span data-ready={enabled ? "true" : undefined}>
            <i />
            {enabled
              ? zh
                ? "连接正常"
                : "Connected"
              : zh
                ? "等待配置"
                : "Awaiting setup"}
          </span>
          <code>
            {selected.id === "local"
              ? "local://this-device"
              : `${selected.id}://unconfigured`}
          </code>
        </div>

        <section aria-label={zh ? "渠道选项" : "Channel options"}>
          <label>
            <span>
              <strong>{zh ? "启用渠道" : "Enable channel"}</strong>
              <small>
                {selected.id === "local"
                  ? zh
                    ? "本地应用是设备上的安全入口，始终保持可用。"
                    : "The local application is the safe entry point and remains available."
                  : zh
                    ? "启用后才能接收已验证的远程请求。"
                    : "Enable this channel before it can receive verified remote requests."}
              </small>
            </span>
            <SettingsSwitch
              checked={enabled}
              label={`${zh ? "启用" : "Enable"} ${selected.name[locale]}`}
              onCheckedChange={onToggle}
            />
          </label>
          <label>
            <span>
              <strong>{zh ? "请求确认" : "Request approval"}</strong>
              <small>
                {zh
                  ? "新请求先进入待确认列表，不会自动执行。"
                  : "New requests enter the approval queue and never execute automatically."}
              </small>
            </span>
            <SettingsSwitch
              checked={approvalRequired}
              label={zh ? "请求确认" : "Request approval"}
              onCheckedChange={onApprovalChange}
            />
          </label>
          <label>
            <span>
              <strong>{zh ? "通知范围" : "Notification scope"}</strong>
              <small>
                {zh
                  ? "只发送状态、问题与最终摘要。"
                  : "Send only status, questions, and final summaries."}
              </small>
            </span>
            <select
              aria-label={zh ? "通知范围" : "Notification scope"}
              onChange={(event) =>
                onNotificationScopeChange(event.currentTarget.value)
              }
              value={notificationScope}
            >
              <option value="bounded">
                {zh ? "受控更新" : "Bounded updates"}
              </option>
              <option value="summary">{zh ? "仅结果" : "Final only"}</option>
            </select>
          </label>
        </section>
      </div>

      <footer>
        <button onClick={close} type="button">
          {zh ? "完成" : "Done"}
        </button>
        <button data-primary onClick={onToggle} type="button">
          {enabled
            ? selected.id === "local"
              ? zh
                ? "检查连接"
                : "Check connection"
              : zh
                ? "断开渠道"
                : "Disconnect"
            : zh
              ? "启用渠道"
              : "Enable channel"}
        </button>
      </footer>
    </dialog>
  );
}
