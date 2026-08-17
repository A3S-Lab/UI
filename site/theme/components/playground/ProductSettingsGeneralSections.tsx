import { useEffect, useRef, useState } from "react";
import { removeBase, withBase } from "@rspress/core/runtime";
import {
  getProductApplicationRoutePath,
  getProductApplicationRouteState,
} from "../../../product-application-routes";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  announceProductSetting,
  SettingsHeader,
  SettingsRow,
  SettingsSwitch,
} from "./ProductSettingsPrimitives";
import { useProductAppearance } from "./useProductAppearance";

export function SystemSettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const workspaceInputRef = useRef<HTMLInputElement>(null);
  const [workspacePath, setWorkspacePath] = useState("~/A3S");
  const [workspaceDraft, setWorkspaceDraft] = useState(workspacePath);
  const [editingWorkspace, setEditingWorkspace] = useState(false);

  const beginWorkspaceEdit = () => {
    setWorkspaceDraft(workspacePath);
    setEditingWorkspace(true);
    requestAnimationFrame(() => workspaceInputRef.current?.select());
  };

  const commitWorkspacePath = () => {
    const nextPath = workspaceDraft.trim() || workspacePath;
    setWorkspaceDraft(nextPath);
    setWorkspacePath(nextPath);
    setEditingWorkspace(false);
    announceProductSetting("workspacePath", nextPath);
  };

  return (
    <>
      <SettingsHeader title={zh ? "设置" : "Settings"} />
      <section
        aria-label={zh ? "界面" : "Interface"}
        className="product-settings__rows"
      >
        <SettingsRow
          description={
            zh
              ? "设置应用界面的显示语言。"
              : "Choose the application interface language."
          }
          title={zh ? "显示语言" : "Display language"}
        >
          <select
            defaultValue={locale}
            onChange={(event) => {
              const nextLocale = event.currentTarget.value;
              if (nextLocale === locale) return;
              const currentRoute = getProductApplicationRouteState(
                removeBase(window.location.pathname),
              );
              window.location.assign(
                withBase(
                  getProductApplicationRoutePath(
                    currentRoute.view,
                    nextLocale === "zh" ? "zh" : "en",
                    currentRoute.resource,
                  ),
                ),
              );
            }}
          >
            <option value="zh">中文（简体）</option>
            <option value="en">English</option>
          </select>
        </SettingsRow>
        <div className="product-settings__range-row">
          <strong>{zh ? "字体大小" : "Text size"}</strong>
          <input
            aria-label={zh ? "字体大小" : "Text size"}
            defaultValue="3"
            max="5"
            min="1"
            onChange={(event) =>
              announceProductSetting("textSize", event.currentTarget.value)
            }
            type="range"
          />
          <span>
            <small>{zh ? "小" : "Small"}</small>
            <small>{zh ? "默认" : "Default"}</small>
            <small>{zh ? "大" : "Large"}</small>
          </span>
        </div>
      </section>
      <section
        aria-label={zh ? "更新与执行" : "Updates and execution"}
        className="product-settings__rows"
      >
        <SettingsRow
          description={
            zh
              ? "自动更新已安装能力，不覆盖本地编辑内容。"
              : "Update installed capabilities without replacing local edits."
          }
          title={zh ? "能力自动更新" : "Capability auto-update"}
        >
          <SettingsSwitch
            checked
            label={zh ? "能力自动更新" : "Capability auto-update"}
          />
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "低风险更新仍会显示安全检查结果。"
              : "Low-risk updates still show their security review."
          }
          title={
            zh ? "低风险能力自动安装" : "Auto-install low-risk capabilities"
          }
        >
          <SettingsSwitch
            label={
              zh ? "低风险能力自动安装" : "Auto-install low-risk capabilities"
            }
          />
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "锁屏后保持已授权的定时任务运行。"
              : "Keep approved scheduled work active while the screen is locked."
          }
          title={zh ? "锁屏继续运行" : "Continue while locked"}
        >
          <SettingsSwitch
            label={zh ? "锁屏继续运行" : "Continue while locked"}
          />
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "更改后立即应用于新的网络请求。"
              : "Applies to new network requests immediately."
          }
          title={zh ? "网络代理" : "Network proxy"}
        >
          <select
            defaultValue="direct"
            onChange={(event) =>
              announceProductSetting("networkProxy", event.currentTarget.value)
            }
          >
            <option value="direct">
              {zh ? "直连（不使用代理）" : "Direct"}
            </option>
            <option value="system">
              {zh ? "跟随系统" : "Use system proxy"}
            </option>
            <option value="manual">{zh ? "手动配置" : "Manual"}</option>
          </select>
        </SettingsRow>
      </section>
      <section className="product-settings__storage">
        <header>
          <strong>{zh ? "存储" : "Storage"}</strong>
          <small>
            {zh
              ? "本地任务、缓存与预览产物"
              : "Local tasks, cache, and preview artifacts"}
          </small>
        </header>
        <label data-editing={editingWorkspace ? "true" : undefined}>
          <span className="sr-only">
            {zh ? "默认工作区路径" : "Default workspace path"}
          </span>
          <input
            onChange={(event) => setWorkspaceDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitWorkspacePath();
              if (event.key === "Escape") {
                setWorkspaceDraft(workspacePath);
                setEditingWorkspace(false);
              }
            }}
            readOnly={!editingWorkspace}
            ref={workspaceInputRef}
            value={workspaceDraft}
          />
          <button
            onClick={
              editingWorkspace ? commitWorkspacePath : beginWorkspaceEdit
            }
            type="button"
          >
            {editingWorkspace ? (zh ? "保存" : "Save") : zh ? "更改" : "Change"}
          </button>
        </label>
        <div>
          <span style={{ width: "42%" }} />
          <i>{zh ? "已使用 4.2 GB，共 10 GB" : "4.2 GB of 10 GB used"}</i>
        </div>
      </section>
    </>
  );
}

export function AccountSettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [profileName, setProfileName] = useState(
    zh ? "本地用户" : "Local user",
  );
  const [profileDraft, setProfileDraft] = useState(profileName);
  const [editingProfile, setEditingProfile] = useState(false);

  const beginProfileEdit = () => {
    setProfileDraft(profileName);
    setEditingProfile(true);
    requestAnimationFrame(() => profileInputRef.current?.select());
  };

  const commitProfile = () => {
    const nextName = profileDraft.trim() || profileName;
    setProfileDraft(nextName);
    setProfileName(nextName);
    setEditingProfile(false);
    announceProductSetting("profileName", nextName);
  };

  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "管理本地身份、版本权益与已登录设备。"
            : "Manage local identity, edition, and signed-in devices."
        }
        title={zh ? "账户管理" : "Account"}
      />
      <section className="product-settings__profile">
        <img alt="" height="48" src={withBase("/logo.png")} width="48" />
        <span>
          {editingProfile ? (
            <input
              aria-label={zh ? "显示名称" : "Display name"}
              onChange={(event) => setProfileDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitProfile();
                if (event.key === "Escape") {
                  setProfileDraft(profileName);
                  setEditingProfile(false);
                }
              }}
              ref={profileInputRef}
              value={profileDraft}
            />
          ) : (
            <strong>{profileName}</strong>
          )}
          <small>
            {zh
              ? "数据默认保留在此设备"
              : "Data stays on this device by default"}
          </small>
        </span>
        <button
          onClick={editingProfile ? commitProfile : beginProfileEdit}
          type="button"
        >
          {editingProfile
            ? zh
              ? "保存资料"
              : "Save profile"
            : zh
              ? "编辑资料"
              : "Edit profile"}
        </button>
      </section>
      <section className="product-settings__rows">
        <SettingsRow
          description={
            zh
              ? "当前使用开源社区版本。"
              : "You are using the open-source community edition."
          }
          title={zh ? "版本" : "Edition"}
        >
          <a href="https://github.com/A3S-Lab/UI/blob/main/CHANGELOG.md">
            {zh ? "查看版本说明" : "View release notes"}
          </a>
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "用于日期、时间和本地化格式。"
              : "Used for date, time, and localized formats."
          }
          title={zh ? "地区" : "Region"}
        >
          <select
            defaultValue="cn"
            onChange={(event) =>
              announceProductSetting("region", event.currentTarget.value)
            }
          >
            <option value="cn">{zh ? "中国大陆" : "Mainland China"}</option>
            <option value="global">Global</option>
          </select>
        </SettingsRow>
      </section>
      <section className="product-settings__sessions">
        <header>
          <strong>{zh ? "当前设备" : "Current device"}</strong>
          <small>
            {zh
              ? "只有你授权的设备可访问本地同步内容。"
              : "Only approved devices can access locally synchronized content."}
          </small>
        </header>
        <article>
          <ProductPlaygroundIcon name="workspace" />
          <span>
            <strong>{zh ? "这台 Mac" : "This Mac"}</strong>
            <small>
              {zh ? "上海 · 当前会话" : "Shanghai · Current session"}
            </small>
          </span>
          <em>{zh ? "当前" : "Current"}</em>
        </article>
      </section>
    </>
  );
}

type Density = "comfortable" | "compact";
type Accent = "amber" | "blue" | "emerald" | "rose" | "violet";

const accentOptions: readonly {
  id: Accent;
  label: { en: string; zh: string };
}[] = [
  { id: "blue", label: { en: "A3S blue", zh: "A3S 蓝" } },
  { id: "violet", label: { en: "Violet", zh: "紫罗兰" } },
  { id: "emerald", label: { en: "Emerald", zh: "翡翠绿" } },
  { id: "amber", label: { en: "Amber", zh: "琥珀色" } },
  { id: "rose", label: { en: "Rose", zh: "玫瑰色" } },
];

export function PersonalizationSettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const { appearance, chooseAppearance } = useProductAppearance();
  const [density, setDensity] = useState<Density>("compact");
  const [accent, setAccent] = useState<Accent>("blue");

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.a3sDensity === "comfortable") {
      setDensity("comfortable");
    }
    const currentAccent = root.dataset.a3sAccent as Accent | undefined;
    if (accentOptions.some((option) => option.id === currentAccent)) {
      setAccent(currentAccent ?? "blue");
    }
  }, []);

  const chooseDensity = (value: Density) => {
    setDensity(value);
    localStorage.setItem("a3s-ui-density", value);
    document.documentElement.dataset.a3sDensity = value;
    document.dispatchEvent(
      new CustomEvent("a3s:stylechange", { detail: { density: value } }),
    );
  };

  const chooseAccent = (value: Accent) => {
    setAccent(value);
    localStorage.setItem("a3s-ui-accent", value);
    document.documentElement.dataset.a3sAccent = value;
    document.dispatchEvent(
      new CustomEvent("a3s:stylechange", { detail: { accent: value } }),
    );
  };

  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "调整外观与信息密度，所有页面即时同步。"
            : "Adjust appearance and information density across every surface."
        }
        title={zh ? "个性化" : "Personalization"}
      />
      <section className="product-settings__choice-group">
        <strong>{zh ? "外观" : "Appearance"}</strong>
        <div>
          {(["system", "light", "dark"] as const).map((value) => (
            <button
              aria-pressed={appearance === value}
              key={value}
              onClick={() => chooseAppearance(value)}
              type="button"
            >
              <ProductPlaygroundIcon
                name={
                  value === "dark"
                    ? "inspiration"
                    : value === "light"
                      ? "settings"
                      : "workspace"
                }
              />
              {value === "system"
                ? zh
                  ? "跟随系统"
                  : "System"
                : value === "light"
                  ? zh
                    ? "浅色"
                    : "Light"
                  : zh
                    ? "深色"
                    : "Dark"}
            </button>
          ))}
        </div>
      </section>
      <section className="product-settings__choice-group">
        <strong>{zh ? "界面密度" : "Interface density"}</strong>
        <div>
          {(["compact", "comfortable"] as const).map((value) => (
            <button
              aria-pressed={density === value}
              key={value}
              onClick={() => chooseDensity(value)}
              type="button"
            >
              {value === "compact"
                ? zh
                  ? "紧凑"
                  : "Compact"
                : zh
                  ? "舒适"
                  : "Comfortable"}
            </button>
          ))}
        </div>
      </section>
      <section className="product-settings__accent">
        <strong>{zh ? "强调色" : "Accent"}</strong>
        <div>
          {accentOptions.map((option) => (
            <button
              aria-label={option.label[locale]}
              aria-pressed={accent === option.id}
              data-accent={option.id}
              key={option.id}
              onClick={() => chooseAccent(option.id)}
              type="button"
            />
          ))}
        </div>
      </section>
    </>
  );
}
