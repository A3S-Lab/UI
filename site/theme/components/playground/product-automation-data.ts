import {
  productComposerEfforts,
  productComposerModels,
  type ProductComposerEffort,
  type ProductComposerModel,
} from "./product-composer-data";
import type {
  ProductLocalizedText,
  ProductPlaygroundLocale,
} from "./product-playground-data";
import type { ProductPlaygroundIconName } from "./ProductPlaygroundIcon";

export type ProductAutomationScheduleKind = "interval" | "once" | "recurring";
export type ProductAutomationCadence = "daily" | "weekdays" | "weekly";
export type ProductAutomationInterval = 2 | 6 | 12;
export type ProductAutomationRunState = "failed" | "running" | "success";
export type ProductAutomationRunStepState =
  "failed" | "pending" | "running" | "success";
export type ProductAutomationWorkspace = "a3s-ui" | "none";
export type ProductAutomationConnector = "none" | "repository" | "webview";
export type ProductAutomationChannel = "none" | "product" | "release";
export type ProductAutomationPermission = "read-only" | "workspace-write";
export type ProductAutomationTimeZone = "Asia/Shanghai" | "UTC" | "local";
export type ProductAutomationWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ProductAutomationSchedule = {
  anchorTime: string;
  cadence: ProductAutomationCadence;
  date: string;
  intervalHours: ProductAutomationInterval;
  kind: ProductAutomationScheduleKind;
  time: string;
  timeZone: ProductAutomationTimeZone;
  weekDay: ProductAutomationWeekday;
};

export type ProductAutomationDraft = {
  assistantEnabled: boolean;
  connector: ProductAutomationConnector;
  desktopNotice: boolean;
  effort: ProductComposerEffort;
  model: ProductComposerModel["id"];
  name: ProductLocalizedText;
  notificationChannel: ProductAutomationChannel;
  permission: ProductAutomationPermission;
  prompt: ProductLocalizedText;
  schedule: ProductAutomationSchedule;
  skillEnabled: boolean;
  workspace: ProductAutomationWorkspace;
};

export type ProductAutomationDefinition = ProductAutomationDraft & {
  enabled: boolean;
  id: string;
};

export type ProductAutomationRunStep = {
  detail?: ProductLocalizedText;
  durationMs?: number;
  id: string;
  label: ProductLocalizedText;
  state: ProductAutomationRunStepState;
};

export type ProductAutomationRun = {
  automationId: string;
  effort: ProductComposerEffort;
  failedStep?: string;
  id: string;
  input: string;
  model: ProductComposerModel["id"];
  name: ProductLocalizedText;
  output: ProductLocalizedText;
  permission: ProductAutomationPermission;
  started: ProductLocalizedText;
  state: ProductAutomationRunState;
  steps: ProductAutomationRunStep[];
  summary: ProductLocalizedText;
  trigger: ProductLocalizedText;
};

export type ProductAutomationTemplateDraft = {
  description: ProductLocalizedText;
  icon: ProductPlaygroundIconName;
  label: ProductLocalizedText;
};

type WallClockParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  weekDay: ProductAutomationWeekday;
  year: number;
};

const shanghaiOffsetMinutes = 8 * 60;

function nextLocalDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatInputDate({
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  });
}

function formatInputDate({
  day,
  month,
  year,
}: Pick<WallClockParts, "day" | "month" | "year">) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseClockTime(value: string) {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  return { hour, minute };
}

function getWallClockParts(
  instant: Date,
  timeZone: ProductAutomationTimeZone,
): WallClockParts {
  if (timeZone === "local") {
    return {
      day: instant.getDate(),
      hour: instant.getHours(),
      minute: instant.getMinutes(),
      month: instant.getMonth() + 1,
      weekDay: instant.getDay() as ProductAutomationWeekday,
      year: instant.getFullYear(),
    };
  }
  const shifted =
    timeZone === "Asia/Shanghai"
      ? new Date(instant.getTime() + shanghaiOffsetMinutes * 60_000)
      : instant;
  return {
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    month: shifted.getUTCMonth() + 1,
    weekDay: shifted.getUTCDay() as ProductAutomationWeekday,
    year: shifted.getUTCFullYear(),
  };
}

function wallClockToInstant(
  date: Pick<WallClockParts, "day" | "month" | "year">,
  time: string,
  timeZone: ProductAutomationTimeZone,
) {
  const { hour, minute } = parseClockTime(time);
  if (timeZone === "local") {
    return new Date(date.year, date.month - 1, date.day, hour, minute, 0, 0);
  }
  const offsetMinutes =
    timeZone === "Asia/Shanghai" ? shanghaiOffsetMinutes : 0;
  return new Date(
    Date.UTC(date.year, date.month - 1, date.day, hour, minute) -
      offsetMinutes * 60_000,
  );
}

function addWallClockDays(parts: WallClockParts, days: number) {
  const cursor = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days),
  );
  return {
    day: cursor.getUTCDate(),
    month: cursor.getUTCMonth() + 1,
    weekDay: cursor.getUTCDay() as ProductAutomationWeekday,
    year: cursor.getUTCFullYear(),
  };
}

function matchesRecurrence(
  cadence: ProductAutomationCadence,
  candidateWeekDay: ProductAutomationWeekday,
  configuredWeekDay: ProductAutomationWeekday,
) {
  if (cadence === "daily") return true;
  if (cadence === "weekdays") {
    return candidateWeekDay >= 1 && candidateWeekDay <= 5;
  }
  return candidateWeekDay === configuredWeekDay;
}

function localizedWeekday(
  day: ProductAutomationWeekday,
  locale: ProductPlaygroundLocale,
) {
  const labels =
    locale === "zh"
      ? ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
      : [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
  return labels[day];
}

function localizedTimeZone(
  timeZone: ProductAutomationTimeZone,
  locale: ProductPlaygroundLocale,
) {
  if (timeZone !== "local") return timeZone;
  return locale === "zh" ? "本地时间" : "Local time";
}

export function createProductAutomationSchedule(): ProductAutomationSchedule {
  return {
    anchorTime: "09:30",
    cadence: "weekdays",
    date: nextLocalDate(),
    intervalHours: 6,
    kind: "recurring",
    time: "09:30",
    timeZone: "local",
    weekDay: 1,
  };
}

export function createProductAutomationDraft(
  template?: ProductAutomationTemplateDraft,
): ProductAutomationDraft {
  return {
    assistantEnabled: Boolean(template),
    connector: "none",
    desktopNotice: true,
    effort: "high",
    model: "auto",
    name: template?.label ?? { en: "", zh: "" },
    notificationChannel: "none",
    permission: "read-only",
    prompt: template
      ? {
          en: `${template.description.en}\n\nRetain run evidence and provide a recoverable next step when a check fails.`,
          zh: `${template.description.zh}\n\n请保留运行证据，并在出现失败时给出可恢复的下一步。`,
        }
      : { en: "", zh: "" },
    schedule: createProductAutomationSchedule(),
    skillEnabled: Boolean(template),
    workspace: "a3s-ui",
  };
}

export function cloneProductAutomation(
  automation: ProductAutomationDefinition,
): ProductAutomationDefinition {
  return {
    ...automation,
    name: { ...automation.name },
    prompt: { ...automation.prompt },
    schedule: { ...automation.schedule },
  };
}

export function cloneProductAutomationRun(
  run: ProductAutomationRun,
): ProductAutomationRun {
  return {
    ...run,
    name: { ...run.name },
    output: { ...run.output },
    started: { ...run.started },
    steps: run.steps.map((step) => ({
      ...step,
      detail: step.detail ? { ...step.detail } : undefined,
      label: { ...step.label },
    })),
    summary: { ...run.summary },
    trigger: { ...run.trigger },
  };
}

export function getProductAutomationToday(
  timeZone: ProductAutomationTimeZone,
  now = new Date(),
) {
  return formatInputDate(getWallClockParts(now, timeZone));
}

export function getNextProductAutomationRun(
  schedule: ProductAutomationSchedule,
  now = new Date(),
) {
  if (schedule.kind === "once") {
    if (!schedule.date || !schedule.time) return undefined;
    const [year, month, day] = schedule.date.split("-").map(Number);
    if (!year || !month || !day) return undefined;
    const candidate = wallClockToInstant(
      { day, month, year },
      schedule.time,
      schedule.timeZone,
    );
    return candidate.getTime() > now.getTime() ? candidate : undefined;
  }

  const wallNow = getWallClockParts(now, schedule.timeZone);
  if (schedule.kind === "interval") {
    const anchor = wallClockToInstant(
      wallNow,
      schedule.anchorTime,
      schedule.timeZone,
    );
    const intervalMs = schedule.intervalHours * 60 * 60 * 1_000;
    if (anchor.getTime() > now.getTime()) return anchor;
    const elapsed = now.getTime() - anchor.getTime();
    return new Date(
      anchor.getTime() + (Math.floor(elapsed / intervalMs) + 1) * intervalMs,
    );
  }

  for (let dayOffset = 0; dayOffset <= 14; dayOffset += 1) {
    const candidateDate = addWallClockDays(wallNow, dayOffset);
    if (
      !matchesRecurrence(
        schedule.cadence,
        candidateDate.weekDay,
        schedule.weekDay,
      )
    ) {
      continue;
    }
    const candidate = wallClockToInstant(
      candidateDate,
      schedule.time,
      schedule.timeZone,
    );
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  return undefined;
}

export function formatProductAutomationSchedule(
  schedule: ProductAutomationSchedule,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  const zone = localizedTimeZone(schedule.timeZone, locale);
  if (schedule.kind === "interval") {
    return zh
      ? `每 ${schedule.intervalHours} 小时 · 从 ${schedule.anchorTime} · ${zone}`
      : `Every ${schedule.intervalHours} hours · from ${schedule.anchorTime} · ${zone}`;
  }
  if (schedule.kind === "once") {
    const parsedDate = new Date(`${schedule.date}T12:00:00`);
    const formattedDate = Number.isNaN(parsedDate.valueOf())
      ? schedule.date
      : new Intl.DateTimeFormat(zh ? "zh-CN" : "en-US", {
          day: "numeric",
          month: "short",
        }).format(parsedDate);
    return zh
      ? `单次 · ${formattedDate} ${schedule.time} · ${zone}`
      : `Once · ${formattedDate} at ${schedule.time} · ${zone}`;
  }
  const cadence =
    schedule.cadence === "daily"
      ? zh
        ? "每天"
        : "Daily"
      : schedule.cadence === "weekly"
        ? zh
          ? `每${localizedWeekday(schedule.weekDay, locale)}`
          : `Every ${localizedWeekday(schedule.weekDay, locale)}`
        : zh
          ? "工作日"
          : "Weekdays";
  return `${cadence} · ${schedule.time} · ${zone}`;
}

export function formatProductAutomationNextRun(
  schedule: ProductAutomationSchedule,
  locale: ProductPlaygroundLocale,
  now: Date,
) {
  const next = getNextProductAutomationRun(schedule, now);
  if (!next) return locale === "zh" ? "没有后续运行" : "No future run";
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    weekday: "short",
  };
  if (schedule.timeZone !== "local") options.timeZone = schedule.timeZone;
  return `${new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", options).format(next)} · ${localizedTimeZone(schedule.timeZone, locale)}`;
}

export function formatProductAutomationRuntime(
  runtime: Pick<ProductAutomationDraft, "effort" | "model" | "permission">,
  locale: ProductPlaygroundLocale,
) {
  const model = productComposerModels.find((item) => item.id === runtime.model);
  const effort = productComposerEfforts.find(
    (item) => item.id === runtime.effort,
  );
  const permission =
    runtime.permission === "read-only"
      ? locale === "zh"
        ? "只读"
        : "Read only"
      : locale === "zh"
        ? "工作区写入"
        : "Workspace write";
  return `${model?.name[locale] ?? runtime.model} · ${effort?.label[locale] ?? runtime.effort} · ${permission}`;
}

export function isProductAutomationOnceScheduleInPast(
  schedule: ProductAutomationSchedule,
  now = new Date(),
) {
  return (
    schedule.kind === "once" && !getNextProductAutomationRun(schedule, now)
  );
}

export function getProductAutomationRunDurationMs(
  run: Pick<ProductAutomationRun, "steps">,
) {
  return run.steps.reduce((total, step) => total + (step.durationMs ?? 0), 0);
}

export function formatProductAutomationDuration(durationMs: number) {
  return `${(durationMs / 1_000).toFixed(1)}s`;
}

export function formatProductAutomationRunDuration(
  run: ProductAutomationRun,
  locale: ProductPlaygroundLocale,
) {
  if (run.state === "running") return locale === "zh" ? "运行中" : "Running";
  return formatProductAutomationDuration(
    getProductAutomationRunDurationMs(run),
  );
}

export const initialProductAutomations: readonly ProductAutomationDefinition[] =
  [
    {
      ...createProductAutomationDraft({
        description: {
          en: "Summarize merged changes, failed checks, and release risk.",
          zh: "汇总合并变更、失败检查与发布风险。",
        },
        icon: "report",
        label: { en: "Daily release digest", zh: "每日发布摘要" },
      }),
      connector: "repository",
      effort: "medium",
      enabled: true,
      id: "release-digest",
      notificationChannel: "release",
    },
    {
      ...createProductAutomationDraft({
        description: {
          en: "Inspect scheduled visual and interaction test results.",
          zh: "巡检定时视觉与交互测试结果。",
        },
        icon: "search",
        label: { en: "Regression watch", zh: "回归结果巡检" },
      }),
      connector: "webview",
      effort: "high",
      enabled: true,
      id: "regression-watch",
      schedule: {
        ...createProductAutomationSchedule(),
        anchorTime: "08:10",
        intervalHours: 2,
        kind: "interval",
      },
    },
    {
      ...createProductAutomationDraft({
        description: {
          en: "Compare public examples with the current package contract.",
          zh: "比对公开示例与当前包契约。",
        },
        icon: "document",
        label: { en: "Documentation drift", zh: "文档漂移检查" },
      }),
      connector: "repository",
      effort: "high",
      enabled: false,
      id: "docs-drift",
      schedule: {
        ...createProductAutomationSchedule(),
        cadence: "weekly",
        time: "17:00",
        weekDay: 1,
      },
    },
  ];

export const initialProductAutomationRuns: readonly ProductAutomationRun[] = [
  {
    automationId: "release-digest",
    effort: "medium",
    id: "release-digest-0818",
    input:
      "workspace=a3s-ui\nconnector=repository\nmodel=auto\neffort=medium\npermission=read-only\ntrigger=schedule.weekdays",
    model: "auto",
    name: { en: "Daily release digest", zh: "每日发布摘要" },
    output: {
      en: "7 merged changes\n12 checks passed\n0 release blockers",
      zh: "7 个已合并变更\n12 项检查通过\n0 个发布阻塞项",
    },
    permission: "read-only",
    started: { en: "Today, 09:30", zh: "今天 09:30" },
    state: "success",
    steps: [
      {
        durationMs: 1_200,
        id: "context.read",
        label: { en: "Read bounded release context", zh: "读取限定发布上下文" },
        state: "success",
      },
      {
        durationMs: 12_400,
        id: "changes.review",
        label: { en: "Review changes and checks", zh: "审查变更与检查结果" },
        state: "success",
      },
      {
        durationMs: 4_800,
        id: "evidence.archive",
        label: { en: "Archive release evidence", zh: "归档发布证据" },
        state: "success",
      },
    ],
    summary: {
      en: "Summarized 7 merged changes, 12 passing checks, and no release blocker.",
      zh: "汇总 7 个已合并变更、12 项通过检查，没有发布阻塞项。",
    },
    trigger: { en: "Schedule · Weekdays", zh: "定时 · 工作日" },
  },
  {
    automationId: "regression-watch",
    effort: "high",
    failedStep: "preview.mobile",
    id: "regression-watch-0818",
    input:
      "workspace=a3s-ui\nconnector=webview\nmodel=auto\neffort=high\npermission=read-only\nviewport=desktop,mobile",
    model: "auto",
    name: { en: "Regression watch", zh: "回归结果巡检" },
    output: {
      en: "ERROR preview.mobile: local target unavailable\nRECOVERY retry_step=preview.mobile",
      zh: "错误 preview.mobile：本地目标不可用\n恢复 retry_step=preview.mobile",
    },
    permission: "read-only",
    started: { en: "Today, 08:10", zh: "今天 08:10" },
    state: "failed",
    steps: [
      {
        durationMs: 900,
        id: "context.read",
        label: { en: "Read visual test manifest", zh: "读取视觉测试清单" },
        state: "success",
      },
      {
        durationMs: 22_500,
        id: "preview.desktop",
        label: { en: "Validate desktop preview", zh: "验收桌面端预览" },
        state: "success",
      },
      {
        detail: {
          en: "Local target unavailable",
          zh: "本地目标不可用",
        },
        durationMs: 18_700,
        id: "preview.mobile",
        label: { en: "Validate mobile preview", zh: "验收移动端预览" },
        state: "failed",
      },
    ],
    summary: {
      en: "Desktop checks passed. The mobile preview could not reach the local target and is ready to retry.",
      zh: "桌面检查通过；移动端预览无法连接本地目标，可以安全重试。",
    },
    trigger: { en: "Schedule · Every 2 hours", zh: "定时 · 每 2 小时" },
  },
  {
    automationId: "docs-drift",
    effort: "high",
    id: "docs-drift-0817",
    input:
      "workspace=a3s-ui\nconnector=repository\nmodel=auto\neffort=high\npermission=read-only\ntrigger=schedule.weekly.monday",
    model: "auto",
    name: { en: "Documentation drift", zh: "文档漂移检查" },
    output: {
      en: "2 differences reviewed\n2 differences resolved",
      zh: "2 处差异已审查\n2 处差异已解决",
    },
    permission: "read-only",
    started: { en: "Yesterday, 17:00", zh: "昨天 17:00" },
    state: "success",
    steps: [
      {
        durationMs: 1_100,
        id: "context.read",
        label: { en: "Read public examples", zh: "读取公开示例" },
        state: "success",
      },
      {
        durationMs: 23_700,
        id: "contracts.compare",
        label: { en: "Compare package contracts", zh: "比对包契约" },
        state: "success",
      },
      {
        durationMs: 7_000,
        id: "report.archive",
        label: { en: "Archive drift report", zh: "归档漂移报告" },
        state: "success",
      },
    ],
    summary: {
      en: "Compared public examples with the current manifest and found two resolved differences.",
      zh: "比对公开示例与当前组件清单，发现的两处差异均已解决。",
    },
    trigger: { en: "Schedule · Every Monday", zh: "定时 · 每周一" },
  },
];
