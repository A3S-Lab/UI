import { useMemo, useState, type FormEvent } from "react";
import { AgentComposerEditor } from "../../../../src/integrations/tiptap/react.js";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type LocalizedCopy = Record<ProductPlaygroundLocale, string>;

export type ProductAutomationTemplateDraft = {
  description: LocalizedCopy;
  icon: Parameters<typeof ProductPlaygroundIcon>[0]["name"];
  label: LocalizedCopy;
};

export type ProductAutomationDraftResult = {
  name: string;
  schedule: string;
};

export function ProductAutomationBuilder({
  initialName,
  locale,
  onCancel,
  onSave,
  template,
}: {
  initialName?: string;
  locale: ProductPlaygroundLocale;
  onCancel: () => void;
  onSave: (result: ProductAutomationDraftResult) => void;
  template?: ProductAutomationTemplateDraft;
}) {
  const zh = locale === "zh";
  const [name, setName] = useState(
    initialName ?? template?.label[locale] ?? "",
  );
  const [workspace, setWorkspace] = useState("a3s-ui");
  const [prompt, setPrompt] = useState(() =>
    template
      ? zh
        ? `${template.description.zh}\n\n请保留运行证据，并在出现失败时给出可恢复的下一步。`
        : `${template.description.en}\n\nRetain run evidence and provide a recoverable next step when a check fails.`
      : "",
  );
  const [scheduleKind, setScheduleKind] = useState<
    "interval" | "once" | "recurring"
  >("recurring");
  const [cadence, setCadence] = useState("weekdays");
  const [time, setTime] = useState("09:30");
  const [connector, setConnector] = useState("none");
  const [skillEnabled, setSkillEnabled] = useState(Boolean(template));
  const [assistantEnabled, setAssistantEnabled] = useState(Boolean(template));
  const [desktopNotice, setDesktopNotice] = useState(true);
  const [channelNotice, setChannelNotice] = useState(false);
  const [status, setStatus] = useState("");

  const scheduleSummary = useMemo(() => {
    if (scheduleKind === "once") {
      return zh ? `单次 · 今天 ${time}` : `Once · Today at ${time}`;
    }
    if (scheduleKind === "interval") {
      return zh ? "每 6 小时" : "Every 6 hours";
    }
    const cadenceLabel =
      cadence === "daily"
        ? zh
          ? "每天"
          : "Daily"
        : cadence === "weekly"
          ? zh
            ? "每周一"
            : "Every Monday"
          : zh
            ? "工作日"
            : "Weekdays";
    return `${cadenceLabel} · ${time}`;
  }, [cadence, scheduleKind, time, zh]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setStatus(zh ? "请输入自动化名称。" : "Enter an automation name.");
      return;
    }
    if (!prompt.trim()) {
      setStatus(
        zh ? "请描述自动化需要完成的任务。" : "Describe the automated task.",
      );
      return;
    }
    onSave({ name: name.trim(), schedule: scheduleSummary });
  };

  return (
    <section
      className="product-automation-builder"
      data-product-surface="automation-builder"
    >
      <header>
        <div>
          <ProductPlaygroundIcon name="automation" />
          <span>{zh ? "自动化" : "Automations"}</span>
          <ProductPlaygroundIcon name="chevron" />
          <strong>
            {initialName
              ? zh
                ? "编辑自动化任务"
                : "Edit automation"
              : zh
                ? "添加自动化任务"
                : "Add automation"}
          </strong>
        </div>
        <nav aria-label={zh ? "自动化操作" : "Automation actions"}>
          <button onClick={onCancel} type="button">
            {zh ? "取消" : "Cancel"}
          </button>
          <button data-primary form="product-automation-form" type="submit">
            {zh ? "保存" : "Save"}
          </button>
        </nav>
      </header>

      <form id="product-automation-form" onSubmit={submit}>
        <div className="product-automation-builder__notice" role="note">
          <ProductPlaygroundIcon name="info" />
          <p>
            <strong>{zh ? "本地运行" : "Local execution"}</strong>
            <span>
              {zh
                ? "自动化依赖本地运行时。设备离线时会暂停，并在恢复连接后继续。"
                : "Automations depend on the local runtime. They pause while the device is offline and resume after reconnection."}
            </span>
          </p>
        </div>

        <label className="product-automation-builder__field">
          <span>{zh ? "名称" : "Name"}</span>
          <input
            aria-label={zh ? "名称" : "Name"}
            aria-invalid={status && !name.trim() ? "true" : undefined}
            autoFocus
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder={
              zh ? "例如：每日发布检查" : "For example: Daily release check"
            }
            value={name}
          />
        </label>

        <label className="product-automation-builder__field">
          <span>
            {zh ? "工作区" : "Workspace"}
            <small>{zh ? "可选" : "Optional"}</small>
          </span>
          <select
            aria-label={zh ? "工作区" : "Workspace"}
            onChange={(event) => setWorkspace(event.currentTarget.value)}
            value={workspace}
          >
            <option value="a3s-ui">a3s-ui · /workspace/a3s-ui</option>
            <option value="none">{zh ? "不绑定工作区" : "No workspace"}</option>
          </select>
        </label>

        <section className="product-automation-builder__prompt">
          <header>
            <span>{zh ? "任务指令" : "Task instruction"}</span>
            <small>
              {zh
                ? "支持 Markdown；使用 @ 引用文件，$ 调用技能"
                : "Supports Markdown; use @ for files and $ for skills"}
            </small>
          </header>
          <AgentComposerEditor
            ariaLabel={zh ? "自动化任务指令" : "Automation task instruction"}
            onChange={setPrompt}
            placeholder={
              zh
                ? "描述需要重复执行的任务、判断条件与交付结果…"
                : "Describe the recurring task, decision rules, and expected delivery…"
            }
            value={prompt}
          />
          <footer>
            <button
              aria-pressed={skillEnabled}
              onClick={() => setSkillEnabled((value) => !value)}
              type="button"
            >
              <ProductPlaygroundIcon name="checklist" />
              {zh ? "视觉验收技能" : "Visual acceptance skill"}
              {skillEnabled ? <ProductPlaygroundIcon name="check" /> : null}
            </button>
            <button
              aria-pressed={assistantEnabled}
              onClick={() => setAssistantEnabled((value) => !value)}
              type="button"
            >
              <ProductPlaygroundIcon name="assistant" />
              {zh ? "发布评审专家" : "Release reviewer"}
              {assistantEnabled ? <ProductPlaygroundIcon name="check" /> : null}
            </button>
            <span>
              <ProductPlaygroundIcon name="shield" />
              {zh ? "按需确认" : "Ask when needed"}
            </span>
          </footer>
        </section>

        <label className="product-automation-builder__field">
          <span>
            {zh ? "连接器" : "Connector"}
            <small>
              {zh ? "仅使用已授权的连接器" : "Authorized connectors only"}
            </small>
          </span>
          <select
            aria-label={zh ? "连接器" : "Connector"}
            onChange={(event) => setConnector(event.currentTarget.value)}
            value={connector}
          >
            <option value="none">{zh ? "不使用连接器" : "No connector"}</option>
            <option value="repository">{zh ? "代码仓库" : "Repository"}</option>
            <option value="webview">{zh ? "本地预览" : "Local preview"}</option>
          </select>
        </label>

        <fieldset className="product-automation-builder__schedule">
          <legend>
            {zh ? "执行频率" : "Schedule"}
            <small>
              {zh
                ? "选择可预测、可恢复的运行窗口"
                : "Choose a predictable, recoverable run window"}
            </small>
          </legend>
          <div aria-label={zh ? "执行频率类型" : "Schedule type"} role="group">
            {(
              [
                ["recurring", zh ? "周期" : "Recurring"],
                ["interval", zh ? "按间隔" : "Interval"],
                ["once", zh ? "单次" : "Once"],
              ] as const
            ).map(([id, label]) => (
              <button
                aria-pressed={scheduleKind === id}
                key={id}
                onClick={() => setScheduleKind(id)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div data-schedule-controls>
            {scheduleKind === "recurring" ? (
              <select
                aria-label={zh ? "重复周期" : "Recurrence"}
                onChange={(event) => setCadence(event.currentTarget.value)}
                value={cadence}
              >
                <option value="weekdays">{zh ? "工作日" : "Weekdays"}</option>
                <option value="daily">{zh ? "每天" : "Daily"}</option>
                <option value="weekly">{zh ? "每周一" : "Every Monday"}</option>
              </select>
            ) : scheduleKind === "interval" ? (
              <select
                aria-label={zh ? "执行间隔" : "Interval"}
                defaultValue="6"
              >
                <option value="2">{zh ? "每 2 小时" : "Every 2 hours"}</option>
                <option value="6">{zh ? "每 6 小时" : "Every 6 hours"}</option>
                <option value="12">
                  {zh ? "每 12 小时" : "Every 12 hours"}
                </option>
              </select>
            ) : (
              <input
                aria-label={zh ? "执行日期" : "Run date"}
                defaultValue="2026-08-20"
                type="date"
              />
            )}
            {scheduleKind !== "interval" ? (
              <input
                aria-label={zh ? "执行时间" : "Run time"}
                onChange={(event) => setTime(event.currentTarget.value)}
                type="time"
                value={time}
              />
            ) : null}
            <output>{scheduleSummary}</output>
          </div>
        </fieldset>

        <fieldset className="product-automation-builder__delivery">
          <legend>{zh ? "完成后通知" : "Completion notifications"}</legend>
          <label>
            <span>
              <ProductPlaygroundIcon name="notification" />
              <span>
                <strong>{zh ? "桌面通知" : "Desktop notification"}</strong>
                <small>
                  {zh
                    ? "在当前设备显示运行结果"
                    : "Show the result on this device"}
                </small>
              </span>
            </span>
            <input
              checked={desktopNotice}
              onChange={(event) =>
                setDesktopNotice(event.currentTarget.checked)
              }
              type="checkbox"
            />
          </label>
          <label>
            <span>
              <ProductPlaygroundIcon name="send" />
              <span>
                <strong>{zh ? "远程渠道" : "Remote channel"}</strong>
                <small>
                  {zh
                    ? "通过设置中已连接的渠道发送摘要"
                    : "Send a summary through a channel configured in Settings"}
                </small>
              </span>
            </span>
            <input
              checked={channelNotice}
              onChange={(event) =>
                setChannelNotice(event.currentTarget.checked)
              }
              type="checkbox"
            />
          </label>
        </fieldset>

        <output
          aria-live="polite"
          className="product-automation-builder__status"
        >
          {status}
        </output>
      </form>
    </section>
  );
}
