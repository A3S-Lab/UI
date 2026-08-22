import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AgentComposerEditor,
  type AgentComposerEditorHandle,
} from "../../../../src/integrations/tiptap/react.js";
import {
  productComposerEfforts,
  productComposerModels,
  type ProductComposerEffort,
  type ProductComposerModel,
} from "./product-composer-data";
import {
  createProductAutomationDraft,
  formatProductAutomationNextRun,
  formatProductAutomationSchedule,
  getProductAutomationToday,
  isProductAutomationOnceScheduleInPast,
  type ProductAutomationCadence,
  type ProductAutomationChannel,
  type ProductAutomationConnector,
  type ProductAutomationDraft,
  type ProductAutomationInterval,
  type ProductAutomationPermission,
  type ProductAutomationScheduleKind,
  type ProductAutomationTemplateDraft,
  type ProductAutomationTimeZone,
  type ProductAutomationWeekday,
  type ProductAutomationWorkspace,
} from "./product-automation-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import { SettingsSwitch } from "./ProductSettingsPrimitives";

type ValidationErrors = {
  date?: string;
  name?: string;
  prompt?: string;
  time?: string;
};

const automationWeekdays: readonly {
  label: { en: string; zh: string };
  value: ProductAutomationWeekday;
}[] = [
  { label: { en: "Sunday", zh: "周日" }, value: 0 },
  { label: { en: "Monday", zh: "周一" }, value: 1 },
  { label: { en: "Tuesday", zh: "周二" }, value: 2 },
  { label: { en: "Wednesday", zh: "周三" }, value: 3 },
  { label: { en: "Thursday", zh: "周四" }, value: 4 },
  { label: { en: "Friday", zh: "周五" }, value: 5 },
  { label: { en: "Saturday", zh: "周六" }, value: 6 },
];

export function ProductAutomationBuilder({
  initialDraft,
  locale,
  onCancel,
  onSave,
  template,
}: {
  initialDraft?: ProductAutomationDraft;
  locale: ProductPlaygroundLocale;
  onCancel: () => void;
  onSave: (result: ProductAutomationDraft) => void;
  template?: ProductAutomationTemplateDraft;
}) {
  const zh = locale === "zh";
  const seed = useMemo(
    () => initialDraft ?? createProductAutomationDraft(template),
    [initialDraft, template],
  );
  const nameRef = useRef<HTMLInputElement>(null);
  const onceTimeRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<AgentComposerEditorHandle>(null);
  const [name, setName] = useState(seed.name[locale]);
  const [workspace, setWorkspace] = useState<ProductAutomationWorkspace>(
    seed.workspace,
  );
  const [model, setModel] = useState<ProductComposerModel["id"]>(seed.model);
  const [effort, setEffort] = useState<ProductComposerEffort>(seed.effort);
  const [permission, setPermission] = useState<ProductAutomationPermission>(
    seed.permission,
  );
  const [prompt, setPrompt] = useState(seed.prompt[locale]);
  const [scheduleKind, setScheduleKind] =
    useState<ProductAutomationScheduleKind>(seed.schedule.kind);
  const [cadence, setCadence] = useState<ProductAutomationCadence>(
    seed.schedule.cadence,
  );
  const [intervalHours, setIntervalHours] = useState<ProductAutomationInterval>(
    seed.schedule.intervalHours,
  );
  const [anchorTime, setAnchorTime] = useState(seed.schedule.anchorTime);
  const [date, setDate] = useState(seed.schedule.date);
  const [time, setTime] = useState(seed.schedule.time);
  const [timeZone, setTimeZone] = useState(seed.schedule.timeZone);
  const [weekDay, setWeekDay] = useState<ProductAutomationWeekday>(
    seed.schedule.weekDay,
  );
  const [connector, setConnector] = useState<ProductAutomationConnector>(
    seed.connector,
  );
  const [skillEnabled, setSkillEnabled] = useState(seed.skillEnabled);
  const [assistantEnabled, setAssistantEnabled] = useState(
    seed.assistantEnabled,
  );
  const [desktopNotice, setDesktopNotice] = useState(seed.desktopNotice);
  const [notificationChannel, setNotificationChannel] =
    useState<ProductAutomationChannel>(seed.notificationChannel);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [status, setStatus] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const schedule = useMemo(
    () => ({
      anchorTime,
      cadence,
      date,
      intervalHours,
      kind: scheduleKind,
      time,
      timeZone,
      weekDay,
    }),
    [
      anchorTime,
      cadence,
      date,
      intervalHours,
      scheduleKind,
      time,
      timeZone,
      weekDay,
    ],
  );
  const scheduleSummary = formatProductAutomationSchedule(schedule, locale);
  const nextRunSummary = now
    ? formatProductAutomationNextRun(schedule, locale, now)
    : zh
      ? "正在计算下一次运行…"
      : "Calculating next run…";
  const selectedModel = productComposerModels.find((item) => item.id === model);
  const selectedEffort = productComposerEfforts.find(
    (item) => item.id === effort,
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: ValidationErrors = {};
    if (!name.trim()) {
      nextErrors.name = zh
        ? "输入一个能区分用途的自动化名称。"
        : "Enter a name that distinguishes this automation.";
    } else if (name.trim().length > 80) {
      nextErrors.name = zh
        ? "名称最多 80 个字符。"
        : "Keep the name to 80 characters or fewer.";
    }
    if (!prompt.trim()) {
      nextErrors.prompt = zh
        ? "说明要执行的任务、判断条件和期望结果。"
        : "Describe the task, decision rules, and expected result.";
    }
    const submittedAt = new Date();
    if (
      scheduleKind === "once" &&
      (!date || date < getProductAutomationToday(timeZone, submittedAt))
    ) {
      nextErrors.date = zh
        ? "选择当前时区中今天或之后的执行日期。"
        : "Choose today or a later date in the selected time zone.";
    } else if (
      scheduleKind === "once" &&
      isProductAutomationOnceScheduleInPast(schedule, submittedAt)
    ) {
      nextErrors.time = zh
        ? "这个时间已经过去，请选择当前时区中的未来时刻。"
        : "That time has already passed. Choose a future time in this zone.";
    }
    setErrors(nextErrors);
    if (nextErrors.name) {
      setStatus(nextErrors.name);
      nameRef.current?.focus();
      return;
    }
    if (nextErrors.prompt) {
      setStatus(nextErrors.prompt);
      editorRef.current?.focus();
      return;
    }
    if (nextErrors.date) {
      setStatus(nextErrors.date);
      document
        .querySelector<HTMLInputElement>("[data-automation-once-date]")
        ?.focus();
      return;
    }
    if (nextErrors.time) {
      setStatus(nextErrors.time);
      onceTimeRef.current?.focus();
      return;
    }

    const normalizedName = name.trim();
    const normalizedPrompt = prompt.trim();
    const localizedName =
      normalizedName === seed.name[locale]
        ? { ...seed.name }
        : { en: normalizedName, zh: normalizedName };
    const localizedPrompt =
      normalizedPrompt === seed.prompt[locale]
        ? { ...seed.prompt }
        : { en: normalizedPrompt, zh: normalizedPrompt };
    onSave({
      assistantEnabled,
      connector,
      desktopNotice,
      effort,
      model,
      name: localizedName,
      notificationChannel,
      permission,
      prompt: localizedPrompt,
      schedule,
      skillEnabled,
      workspace,
    });
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
            {initialDraft
              ? name || (zh ? "编辑自动化" : "Edit automation")
              : zh
                ? "新建自动化"
                : "New automation"}
          </strong>
        </div>
        <nav aria-label={zh ? "自动化编辑操作" : "Automation edit actions"}>
          <button onClick={onCancel} type="button">
            {zh ? "取消" : "Cancel"}
          </button>
          <button
            aria-label={zh ? "保存自动化" : "Save automation"}
            data-primary
            form="product-automation-form"
            type="submit"
          >
            {zh ? "保存" : "Save"}
          </button>
        </nav>
      </header>

      <form id="product-automation-form" noValidate onSubmit={submit}>
        <div className="product-automation-builder__notice" role="note">
          <ProductPlaygroundIcon name="info" />
          <p>
            <strong>{zh ? "提示" : "Notice"}</strong>
            <span>
              {zh
                ? "自动化在本地运行；设备离线时暂停调度，恢复连接后只执行仍在有效窗口内的任务。"
                : "Automations run locally. Schedules pause while this device is offline and resume only runs still inside their valid window."}
            </span>
          </p>
        </div>

        <label className="product-automation-builder__field">
          <span>
            {zh ? "名称" : "Name"}
            <small>{name.trim().length}/80</small>
          </span>
          <input
            aria-describedby={errors.name ? "automation-name-error" : undefined}
            aria-invalid={errors.name ? "true" : undefined}
            aria-label={zh ? "名称" : "Name"}
            autoFocus
            maxLength={80}
            onChange={(event) => {
              setName(event.currentTarget.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder={
              zh ? "例如：每日发布检查" : "For example: Daily release check"
            }
            ref={nameRef}
            value={name}
          />
          {errors.name ? (
            <small id="automation-name-error" role="alert">
              {errors.name}
            </small>
          ) : null}
        </label>

        <label className="product-automation-builder__field">
          <span>
            {zh ? "工作区" : "Workspace"}
            <small>
              {zh ? "决定文件和命令边界" : "Scopes files and commands"}
            </small>
          </span>
          <select
            aria-label={zh ? "工作区" : "Workspace"}
            onChange={(event) =>
              setWorkspace(
                event.currentTarget.value as ProductAutomationWorkspace,
              )
            }
            value={workspace}
          >
            <option value="a3s-ui">a3s-ui · /workspace/a3s-ui</option>
            <option value="none">{zh ? "不绑定工作区" : "No workspace"}</option>
          </select>
        </label>

        <section
          className="product-automation-builder__prompt"
          data-invalid={errors.prompt ? "true" : undefined}
        >
          <header>
            <span>{zh ? "任务指令" : "Task instruction"}</span>
            <small>
              {zh
                ? "明确输入、完成条件和失败后的恢复要求"
                : "Define inputs, completion criteria, and failure recovery"}
            </small>
          </header>
          <AgentComposerEditor
            aria-describedby={
              errors.prompt ? "automation-prompt-error" : undefined
            }
            aria-invalid={errors.prompt ? "true" : undefined}
            ariaLabel={zh ? "自动化任务指令" : "Automation task instruction"}
            onChange={(value) => {
              setPrompt(value);
              setErrors((current) => ({ ...current, prompt: undefined }));
            }}
            placeholder={
              zh
                ? "描述需要重复执行的任务、判断条件与交付结果…"
                : "Describe the recurring task, decision rules, and expected delivery…"
            }
            ref={editorRef}
            value={prompt}
          />
          <footer>
            <fieldset className="product-automation-builder__runtime">
              <legend className="product-automation-builder__visually-hidden">
                {zh ? "运行配置" : "Runtime configuration"}
              </legend>
              <div>
                <label data-runtime-control="model">
                  <ProductPlaygroundIcon name="model" />
                  <span>
                    {selectedModel?.name[locale] ?? (zh ? "模型" : "Model")}
                  </span>
                  <select
                    aria-describedby="automation-model-description"
                    aria-label={zh ? "模型" : "Model"}
                    onChange={(event) =>
                      setModel(
                        event.currentTarget.value as ProductComposerModel["id"],
                      )
                    }
                    value={model}
                  >
                    {productComposerModels.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name[locale]}
                      </option>
                    ))}
                  </select>
                  <ProductPlaygroundIcon name="chevron" />
                </label>
                <label data-runtime-control="effort">
                  <ProductPlaygroundIcon name="brain" />
                  <span>
                    {selectedEffort?.label[locale] ??
                      (zh ? "努力程度" : "Effort")}
                  </span>
                  <select
                    aria-describedby="automation-effort-description"
                    aria-label={zh ? "努力程度" : "Effort"}
                    onChange={(event) =>
                      setEffort(
                        event.currentTarget.value as ProductComposerEffort,
                      )
                    }
                    value={effort}
                  >
                    {productComposerEfforts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label[locale]}
                      </option>
                    ))}
                  </select>
                  <ProductPlaygroundIcon name="chevron" />
                </label>
                <label data-runtime-control="skill">
                  <ProductPlaygroundIcon name="checklist" />
                  <span>
                    {skillEnabled
                      ? zh
                        ? "视觉验收"
                        : "Visual acceptance"
                      : zh
                        ? "技能"
                        : "Skill"}
                  </span>
                  <select
                    aria-label={zh ? "技能" : "Skill"}
                    onChange={(event) =>
                      setSkillEnabled(event.currentTarget.value === "visual")
                    }
                    value={skillEnabled ? "visual" : "none"}
                  >
                    <option value="none">{zh ? "技能" : "Skill"}</option>
                    <option value="visual">
                      {zh ? "视觉验收" : "Visual acceptance"}
                    </option>
                  </select>
                  <ProductPlaygroundIcon name="chevron" />
                </label>
                <label data-runtime-control="assistant">
                  <ProductPlaygroundIcon name="assistant" />
                  <span>
                    {assistantEnabled
                      ? zh
                        ? "发布评审"
                        : "Release reviewer"
                      : zh
                        ? "召唤专家"
                        : "Add assistant"}
                  </span>
                  <select
                    aria-label={zh ? "专家" : "Assistant"}
                    onChange={(event) =>
                      setAssistantEnabled(
                        event.currentTarget.value === "reviewer",
                      )
                    }
                    value={assistantEnabled ? "reviewer" : "none"}
                  >
                    <option value="none">
                      {zh ? "召唤专家" : "Add assistant"}
                    </option>
                    <option value="reviewer">
                      {zh ? "发布评审" : "Release reviewer"}
                    </option>
                  </select>
                  <ProductPlaygroundIcon name="chevron" />
                </label>
                <label data-runtime-control="permission">
                  <ProductPlaygroundIcon name="shield" />
                  <span>
                    {permission === "read-only"
                      ? zh
                        ? "只读工作区"
                        : "Read-only workspace"
                      : zh
                        ? "允许写入"
                        : "Allow writes"}
                  </span>
                  <select
                    aria-describedby="automation-permission-description"
                    aria-label={zh ? "权限边界" : "Permission boundary"}
                    onChange={(event) =>
                      setPermission(
                        event.currentTarget
                          .value as ProductAutomationPermission,
                      )
                    }
                    value={permission}
                  >
                    <option value="read-only">
                      {zh ? "只读工作区" : "Read-only workspace"}
                    </option>
                    <option value="workspace-write">
                      {zh ? "允许写入" : "Allow writes"}
                    </option>
                  </select>
                  <ProductPlaygroundIcon name="chevron" />
                </label>
              </div>
              <span
                className="product-automation-builder__visually-hidden"
                id="automation-model-description"
              >
                {selectedModel?.description[locale]}
              </span>
              <span
                className="product-automation-builder__visually-hidden"
                id="automation-effort-description"
              >
                {selectedEffort?.description[locale]}
              </span>
              <span
                className="product-automation-builder__visually-hidden"
                id="automation-permission-description"
              >
                {permission === "read-only"
                  ? zh
                    ? "可读取文件和运行无副作用检查。"
                    : "Can read files and run checks without side effects."
                  : zh
                    ? "仅允许修改已选工作区；高风险操作仍需按次确认。"
                    : "Writes stay inside the selected workspace; high-risk actions still require per-run confirmation."}
              </span>
            </fieldset>
          </footer>
          {errors.prompt ? (
            <small id="automation-prompt-error" role="alert">
              {errors.prompt}
            </small>
          ) : null}
        </section>

        <label
          className="product-automation-builder__field"
          data-field="connector"
        >
          <span>
            {zh ? "连接器" : "Connector"}
            <small>
              {zh
                ? "选中后，该连接器在任务中免确认使用"
                : "Selected connectors can be used in this task without another prompt"}
            </small>
          </span>
          <select
            aria-label={zh ? "连接器" : "Connector"}
            onChange={(event) =>
              setConnector(
                event.currentTarget.value as ProductAutomationConnector,
              )
            }
            value={connector}
          >
            <option value="none">
              {zh ? "选择连接器" : "Choose connector"}
            </option>
            <option value="repository">{zh ? "代码仓库" : "Repository"}</option>
            <option value="webview">{zh ? "本地预览" : "Local preview"}</option>
          </select>
        </label>

        <fieldset className="product-automation-builder__schedule">
          <legend>
            {zh ? "执行频率" : "Schedule"}
            <small>
              {zh
                ? "时间、时区和下一次运行必须可预测"
                : "Time, zone, and the next run must be predictable"}
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
                onClick={() => {
                  setScheduleKind(id);
                  setErrors((current) => ({
                    ...current,
                    date: undefined,
                    time: undefined,
                  }));
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div
            data-schedule-controls
            data-schedule-kind={scheduleKind}
            data-weekly={
              scheduleKind === "recurring" && cadence === "weekly"
                ? "true"
                : undefined
            }
          >
            {scheduleKind === "recurring" ? (
              <>
                <label data-schedule-field>
                  <span>{zh ? "重复周期" : "Recurrence"}</span>
                  <select
                    aria-label={zh ? "重复周期" : "Recurrence"}
                    onChange={(event) =>
                      setCadence(
                        event.currentTarget.value as ProductAutomationCadence,
                      )
                    }
                    value={cadence}
                  >
                    <option value="weekdays">
                      {zh ? "工作日" : "Weekdays"}
                    </option>
                    <option value="daily">{zh ? "每天" : "Daily"}</option>
                    <option value="weekly">{zh ? "每周" : "Weekly"}</option>
                  </select>
                </label>
                {cadence === "weekly" ? (
                  <label data-schedule-field>
                    <span>{zh ? "星期" : "Weekday"}</span>
                    <select
                      aria-label={zh ? "每周执行日" : "Weekly run day"}
                      onChange={(event) =>
                        setWeekDay(
                          Number(
                            event.currentTarget.value,
                          ) as ProductAutomationWeekday,
                        )
                      }
                      value={weekDay}
                    >
                      {automationWeekdays.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label[locale]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label data-schedule-field>
                  <span>{zh ? "执行时间" : "Run time"}</span>
                  <input
                    aria-label={zh ? "执行时间" : "Run time"}
                    onChange={(event) => setTime(event.currentTarget.value)}
                    type="time"
                    value={time}
                  />
                </label>
                <label data-schedule-field>
                  <span>{zh ? "时区" : "Time zone"}</span>
                  <select
                    aria-label={zh ? "执行时区" : "Run time zone"}
                    onChange={(event) =>
                      setTimeZone(
                        event.currentTarget.value as ProductAutomationTimeZone,
                      )
                    }
                    value={timeZone}
                  >
                    <option value="local">
                      {zh ? "本地时间" : "Local time"}
                    </option>
                    <option value="Asia/Shanghai">Asia/Shanghai</option>
                    <option value="UTC">UTC</option>
                  </select>
                </label>
              </>
            ) : scheduleKind === "interval" ? (
              <>
                <label data-schedule-field>
                  <span>{zh ? "执行间隔" : "Interval"}</span>
                  <select
                    aria-label={zh ? "执行间隔" : "Interval"}
                    onChange={(event) =>
                      setIntervalHours(
                        Number(
                          event.currentTarget.value,
                        ) as ProductAutomationInterval,
                      )
                    }
                    value={intervalHours}
                  >
                    <option value="2">
                      {zh ? "每 2 小时" : "Every 2 hours"}
                    </option>
                    <option value="6">
                      {zh ? "每 6 小时" : "Every 6 hours"}
                    </option>
                    <option value="12">
                      {zh ? "每 12 小时" : "Every 12 hours"}
                    </option>
                  </select>
                </label>
                <label data-schedule-field>
                  <span>{zh ? "锚点时间" : "Anchor time"}</span>
                  <input
                    aria-label={zh ? "间隔锚点时间" : "Interval anchor time"}
                    onChange={(event) =>
                      setAnchorTime(event.currentTarget.value)
                    }
                    type="time"
                    value={anchorTime}
                  />
                </label>
                <label data-schedule-field>
                  <span>{zh ? "时区" : "Time zone"}</span>
                  <select
                    aria-label={zh ? "执行时区" : "Run time zone"}
                    onChange={(event) =>
                      setTimeZone(
                        event.currentTarget.value as ProductAutomationTimeZone,
                      )
                    }
                    value={timeZone}
                  >
                    <option value="local">
                      {zh ? "本地时间" : "Local time"}
                    </option>
                    <option value="Asia/Shanghai">Asia/Shanghai</option>
                    <option value="UTC">UTC</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label data-schedule-field>
                  <span>{zh ? "执行日期" : "Run date"}</span>
                  <input
                    aria-describedby={
                      errors.date ? "automation-date-error" : undefined
                    }
                    aria-invalid={errors.date ? "true" : undefined}
                    aria-label={zh ? "执行日期" : "Run date"}
                    data-automation-once-date
                    min={
                      now ? getProductAutomationToday(timeZone, now) : undefined
                    }
                    onChange={(event) => {
                      setDate(event.currentTarget.value);
                      setErrors((current) => ({
                        ...current,
                        date: undefined,
                        time: undefined,
                      }));
                    }}
                    type="date"
                    value={date}
                  />
                </label>
                <label data-schedule-field>
                  <span>{zh ? "执行时间" : "Run time"}</span>
                  <input
                    aria-describedby={
                      errors.time ? "automation-time-error" : undefined
                    }
                    aria-invalid={errors.time ? "true" : undefined}
                    aria-label={zh ? "执行时间" : "Run time"}
                    onChange={(event) => {
                      setTime(event.currentTarget.value);
                      setErrors((current) => ({
                        ...current,
                        time: undefined,
                      }));
                    }}
                    ref={onceTimeRef}
                    type="time"
                    value={time}
                  />
                </label>
                <label data-schedule-field>
                  <span>{zh ? "时区" : "Time zone"}</span>
                  <select
                    aria-label={zh ? "执行时区" : "Run time zone"}
                    onChange={(event) => {
                      setTimeZone(
                        event.currentTarget.value as ProductAutomationTimeZone,
                      );
                      setErrors((current) => ({
                        ...current,
                        date: undefined,
                        time: undefined,
                      }));
                    }}
                    value={timeZone}
                  >
                    <option value="local">
                      {zh ? "本地时间" : "Local time"}
                    </option>
                    <option value="Asia/Shanghai">Asia/Shanghai</option>
                    <option value="UTC">UTC</option>
                  </select>
                </label>
              </>
            )}
            <output aria-label={zh ? "调度摘要" : "Schedule summary"}>
              <ProductPlaygroundIcon name="calendar" />
              <span>
                <strong>{scheduleSummary}</strong>
                <small>
                  {zh ? `下一次：${nextRunSummary}` : `Next: ${nextRunSummary}`}
                </small>
              </span>
            </output>
            {errors.date ? (
              <small id="automation-date-error" role="alert">
                {errors.date}
              </small>
            ) : null}
            {errors.time ? (
              <small id="automation-time-error" role="alert">
                {errors.time}
              </small>
            ) : null}
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
                    ? "仅在状态改变或需要处理时通知"
                    : "Notify only when state changes or attention is required"}
                </small>
              </span>
            </span>
            <SettingsSwitch
              checked={desktopNotice}
              label={zh ? "桌面通知" : "Desktop notification"}
              onCheckedChange={setDesktopNotice}
            />
          </label>
          <label>
            <span>
              <ProductPlaygroundIcon name="send" />
              <span>
                <strong>{zh ? "远程渠道" : "Remote channel"}</strong>
                <small>
                  {zh
                    ? "把需要处理的摘要发送到已连接渠道"
                    : "Send actionable summaries to a connected channel"}
                </small>
              </span>
            </span>
            <SettingsSwitch
              checked={notificationChannel !== "none"}
              label={zh ? "远程渠道" : "Remote channel"}
              onCheckedChange={(checked) =>
                setNotificationChannel(checked ? "release" : "none")
              }
            />
          </label>
          {notificationChannel !== "none" ? (
            <label data-notification-channel>
              <span>{zh ? "通知目标" : "Notification destination"}</span>
              <select
                aria-label={zh ? "通知目标" : "Notification destination"}
                onChange={(event) =>
                  setNotificationChannel(
                    event.currentTarget.value as ProductAutomationChannel,
                  )
                }
                value={notificationChannel}
              >
                <option value="release"># release-readiness</option>
                <option value="product"># product-operations</option>
              </select>
            </label>
          ) : null}
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
