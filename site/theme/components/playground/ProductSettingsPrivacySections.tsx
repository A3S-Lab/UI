import { useMemo, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import {
  announceProductSetting,
  SettingsHeader,
  SettingsRow,
  SettingsSwitch,
} from "./ProductSettingsPrimitives";

export function DataSettings({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  const [notice, setNotice] = useState("");
  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "查看本地数据占用、保留周期与导出选项。"
            : "Review local data usage, retention, and export options."
        }
        title={zh ? "数据管理" : "Data"}
      />
      <section className="product-settings__storage product-settings__storage--large">
        <header>
          <strong>{zh ? "本地数据" : "Local data"}</strong>
          <small>
            {zh
              ? "任务 1.8 GB · 产物 1.6 GB · 缓存 0.8 GB"
              : "Tasks 1.8 GB · Artifacts 1.6 GB · Cache 0.8 GB"}
          </small>
        </header>
        <div>
          <span style={{ width: "42%" }} />
          <i>{zh ? "已使用 4.2 GB，共 10 GB" : "4.2 GB of 10 GB used"}</i>
        </div>
      </section>
      <section className="product-settings__rows">
        <SettingsRow
          description={
            zh
              ? "导出任务、设置与本地记忆，不包含凭据。"
              : "Export tasks, settings, and local memory without credentials."
          }
          title={zh ? "导出本地数据" : "Export local data"}
        >
          <button
            onClick={() =>
              setNotice(zh ? "导出准备完成。" : "Export is ready.")
            }
            type="button"
          >
            {zh ? "准备导出" : "Prepare export"}
          </button>
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "到期后先进入可恢复清理区。"
              : "Expired items first move to a recoverable cleanup area."
          }
          title={zh ? "任务保留周期" : "Task retention"}
        >
          <select
            defaultValue="90"
            onChange={(event) =>
              announceProductSetting("taskRetention", event.currentTarget.value)
            }
          >
            <option value="30">30 {zh ? "天" : "days"}</option>
            <option value="90">90 {zh ? "天" : "days"}</option>
            <option value="forever">{zh ? "永久" : "Forever"}</option>
          </select>
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "仅清除可重新生成的预览与网络缓存。"
              : "Remove only reproducible previews and network cache."
          }
          title={zh ? "清理缓存" : "Clear cache"}
        >
          <button
            onClick={() => setNotice(zh ? "缓存已清理。" : "Cache cleared.")}
            type="button"
          >
            {zh ? "立即清理" : "Clear now"}
          </button>
        </SettingsRow>
      </section>
      <output aria-live="polite">{notice}</output>
    </>
  );
}

function formatShortcut(event: React.KeyboardEvent<HTMLButtonElement>) {
  if (["Alt", "Control", "Meta", "Shift"].includes(event.key)) return null;
  const keys: string[] = [];
  if (event.metaKey) keys.push("⌘");
  if (event.ctrlKey) keys.push("Ctrl");
  if (event.altKey) keys.push("⌥");
  if (event.shiftKey) keys.push("⇧");

  const key =
    event.key === "Enter"
      ? "↵"
      : event.key === " "
        ? "Space"
        : event.key.length === 1
          ? event.key.toUpperCase()
          : event.key;
  keys.push(key);
  return keys;
}

export function ShortcutSettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [query, setQuery] = useState("");
  const [recording, setRecording] = useState<string | null>(null);
  const shortcuts = [
    { id: "search", keys: ["⌘", "K"], label: zh ? "打开搜索" : "Open search" },
    { id: "new-task", keys: ["⌘", "N"], label: zh ? "新建任务" : "New task" },
    {
      id: "sidebar",
      keys: ["⌘", "\\"],
      label: zh ? "切换侧边栏" : "Toggle sidebar",
    },
    { id: "send", keys: ["⌘", "↵"], label: zh ? "发送任务" : "Send task" },
    {
      id: "stop",
      keys: ["⌘", "."],
      label: zh ? "停止当前任务" : "Stop current task",
    },
    {
      id: "settings",
      keys: ["⌘", ","],
      label: zh ? "打开设置" : "Open settings",
    },
  ];
  const [bindings, setBindings] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      shortcuts.map((shortcut) => [shortcut.id, shortcut.keys]),
    ),
  );
  const visible = useMemo(
    () =>
      shortcuts.filter((shortcut) =>
        shortcut.label
          .toLocaleLowerCase(locale)
          .includes(query.toLocaleLowerCase(locale)),
      ),
    [locale, query, shortcuts],
  );

  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "键盘操作与菜单命令保持一致。"
            : "Keyboard actions stay aligned with menu commands."
        }
        title={zh ? "快捷键" : "Shortcuts"}
      />
      <label className="product-settings__shortcut-search">
        <ProductPlaygroundIcon name="search" />
        <input
          aria-label={zh ? "搜索快捷键" : "Search shortcuts"}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={zh ? "搜索操作" : "Search actions"}
          type="search"
          value={query}
        />
      </label>
      <section className="product-settings__shortcut-list">
        {visible.length ? (
          visible.map((shortcut) => {
            const isRecording = recording === shortcut.id;
            return (
              <article key={shortcut.id}>
                <span>{shortcut.label}</span>
                <button
                  aria-label={
                    isRecording
                      ? zh
                        ? `正在录制${shortcut.label}，按下新组合键，Escape 取消`
                        : `Recording ${shortcut.label}; press a shortcut or Escape to cancel`
                      : zh
                        ? `修改${shortcut.label}`
                        : `Change ${shortcut.label}`
                  }
                  aria-pressed={isRecording}
                  onBlur={() => setRecording(null)}
                  onClick={() => setRecording(shortcut.id)}
                  onKeyDown={(event) => {
                    if (!isRecording) return;
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setRecording(null);
                      return;
                    }
                    const nextBinding = formatShortcut(event);
                    if (!nextBinding) return;
                    event.preventDefault();
                    setBindings((current) => ({
                      ...current,
                      [shortcut.id]: nextBinding,
                    }));
                    announceProductSetting("shortcut", {
                      binding: nextBinding,
                      id: shortcut.id,
                    });
                    setRecording(null);
                  }}
                  type="button"
                >
                  {isRecording ? (
                    <span>{zh ? "按下组合键" : "Press shortcut"}</span>
                  ) : (
                    (bindings[shortcut.id] ?? shortcut.keys).map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))
                  )}
                </button>
              </article>
            );
          })
        ) : (
          <p>{zh ? "没有匹配的快捷键。" : "No matching shortcuts."}</p>
        )}
      </section>
    </>
  );
}

export function SecuritySettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [managingPaths, setManagingPaths] = useState(false);
  const [paths, setPaths] = useState(["~/A3S"]);
  const [pathDraft, setPathDraft] = useState("");

  const addPath = () => {
    const nextPath = pathDraft.trim();
    if (!nextPath || paths.includes(nextPath)) return;
    const nextPaths = [...paths, nextPath];
    setPaths(nextPaths);
    setPathDraft("");
    announceProductSetting("trustedPaths", nextPaths);
  };

  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "高风险操作、凭据和外部写入使用独立边界。"
            : "Privileged actions, credentials, and external writes use separate boundaries."
        }
        title={zh ? "安全中心" : "Security"}
      />
      <section className="product-settings__security-summary">
        <ProductPlaygroundIcon name="shield" />
        <span>
          <strong>{zh ? "安全状态正常" : "Security status is healthy"}</strong>
          <small>
            {zh
              ? "没有待处理的高风险授权。"
              : "No privileged approvals require attention."}
          </small>
        </span>
      </section>
      <section className="product-settings__rows">
        <SettingsRow
          description={
            zh
              ? "删除、发布和凭据访问始终要求确认。"
              : "Deletion, publishing, and credential access always require confirmation."
          }
          title={zh ? "高风险操作确认" : "Confirm privileged actions"}
        >
          <SettingsSwitch
            checked
            label={zh ? "高风险操作确认" : "Confirm privileged actions"}
          />
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "仅允许当前工作区访问本地文件。"
              : "Allow local file access only inside the current workspace."
          }
          title={zh ? "受信任路径" : "Trusted paths"}
        >
          <button
            aria-expanded={managingPaths}
            onClick={() => setManagingPaths((value) => !value)}
            type="button"
          >
            {managingPaths
              ? zh
                ? "完成"
                : "Done"
              : zh
                ? `管理 ${paths.length} 个路径`
                : `Manage ${paths.length} ${paths.length === 1 ? "path" : "paths"}`}
          </button>
        </SettingsRow>
        <SettingsRow
          description={
            zh
              ? "凭据从不进入任务文本或测试证据。"
              : "Credentials never enter task text or test evidence."
          }
          title={zh ? "凭据隔离" : "Credential isolation"}
        >
          <em data-healthy>{zh ? "已启用" : "Enabled"}</em>
        </SettingsRow>
      </section>
      {managingPaths ? (
        <section
          aria-label={zh ? "管理受信任路径" : "Manage trusted paths"}
          className="product-settings__path-manager"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              addPath();
            }}
          >
            <label>
              <span className="sr-only">
                {zh ? "新增受信任路径" : "New trusted path"}
              </span>
              <input
                onChange={(event) => setPathDraft(event.currentTarget.value)}
                placeholder={zh ? "例如 ~/Projects" : "For example, ~/Projects"}
                value={pathDraft}
              />
            </label>
            <button disabled={!pathDraft.trim()} type="submit">
              {zh ? "添加路径" : "Add path"}
            </button>
          </form>
          <ul>
            {paths.map((path) => (
              <li key={path}>
                <code>{path}</code>
                <button
                  aria-label={zh ? `移除${path}` : `Remove ${path}`}
                  disabled={paths.length === 1}
                  onClick={() => {
                    const nextPaths = paths.filter((value) => value !== path);
                    setPaths(nextPaths);
                    announceProductSetting("trustedPaths", nextPaths);
                  }}
                  type="button"
                >
                  <ProductPlaygroundIcon name="close" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="product-settings__sessions">
        <header>
          <strong>{zh ? "最近安全活动" : "Recent security activity"}</strong>
        </header>
        <article>
          <ProductPlaygroundIcon name="check" />
          <span>
            <strong>
              {zh ? "工作区访问已确认" : "Workspace access confirmed"}
            </strong>
            <small>
              {zh ? "今天 10:42 · 本地会话" : "Today at 10:42 · Local session"}
            </small>
          </span>
          <em>{zh ? "正常" : "Normal"}</em>
        </article>
      </section>
    </>
  );
}
