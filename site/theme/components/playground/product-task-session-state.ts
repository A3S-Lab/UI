import type { ProductComposerContext } from "./ProductComposer";
import type { ProductTaskDraft } from "./product-composer-data";
import type {
  ProductLocalizedText,
  ProductPlaygroundLocale,
} from "./product-playground-data";
import { productProjectName } from "./product-project-data";

const taskSessionStorageKey = "a3s-ui:product-task-session:v1";
const pendingTaskDraftStorageKey = "a3s-ui:pending-task-draft:v1";
const maxTaskLength = 8_000;
const maxFollowUpCount = 100;
let memoryTaskSession: ProductTaskSession | null = null;
let memoryTaskSessionPersisted = false;
let memoryPendingTaskDraft: ProductTaskDraft | null = null;

const workspaceLabels: Record<
  ProductComposerContext["workspace"],
  ProductLocalizedText
> = {
  "": { en: "No workspace selected", zh: "未选择工作空间" },
  local: { en: "Local workspace", zh: "本地工作空间" },
  root: { en: "A3S monorepo", zh: "A3S 主仓库" },
  ui: productProjectName,
};

const modeLabels: Record<ProductComposerContext["mode"], ProductLocalizedText> =
  {
    agent: { en: "Default", zh: "默认" },
    answer: { en: "Answer only", zh: "仅回答" },
    plan: { en: "Plan", zh: "计划" },
  };

const permissionLabels: Record<
  ProductComposerContext["permissions"],
  ProductLocalizedText
> = {
  ask: { en: "Ask before changes", zh: "修改前询问" },
  edit: { en: "Allow edits", zh: "允许修改" },
  read: { en: "Read only", zh: "仅查看" },
};

const modelLabels: Record<
  ProductComposerContext["model"],
  ProductLocalizedText
> = {
  auto: { en: "Auto", zh: "自动" },
  default: { en: "Current default", zh: "当前默认模型" },
  local: { en: "Configured local model", zh: "已配置的本地模型" },
};

const effortLabels: Record<
  ProductComposerContext["effort"],
  ProductLocalizedText
> = {
  high: { en: "High", zh: "深入" },
  low: { en: "Low", zh: "快速" },
  max: { en: "Max", zh: "最大" },
  medium: { en: "Medium", zh: "标准" },
  ultracode: { en: "Ultra", zh: "极限" },
  xhigh: { en: "XHigh", zh: "极高" },
};

export type ProductTaskOrigin = "assistant" | "start";

export type ProductTaskSession = {
  context: ProductComposerContext;
  createdAt: string;
  followUps: string[];
  id: string;
  origin: ProductTaskOrigin;
  prompt: string;
  queuePaused: boolean;
  queuedFollowUps: ProductTaskQueuedFollowUp[];
  version: 2;
};

export type ProductTaskQueuedFollowUp = {
  content: string;
  context: ProductComposerContext;
  enqueuedAt: string;
  id: string;
};

export type ProductTaskArtifact = {
  content: string;
  id: string;
  kind: string;
  name: string;
  summary: ProductLocalizedText;
};

export type ProductTaskContextDetails = {
  effort: string;
  mode: string;
  model: string;
  permissions: string;
  resources: string;
  workspace: string;
};

function normalizeContext(value: unknown): ProductComposerContext {
  const context = value as Partial<ProductComposerContext> | null;
  const rawModel = context?.model as string | undefined;
  const model =
    rawModel === "default" || rawModel === "reasoner"
      ? "default"
      : rawModel === "local" || rawModel === "fast"
        ? "local"
        : "auto";
  const permissions =
    context?.permissions === "read" || context?.permissions === "edit"
      ? context.permissions
      : "ask";
  const workspace =
    context?.workspace === "ui" ||
    context?.workspace === "root" ||
    context?.workspace === "local"
      ? context.workspace
      : "";
  const mode =
    context?.mode === "plan" || context?.mode === "answer"
      ? context.mode
      : "agent";
  const effort =
    context?.effort === "low" ||
    context?.effort === "high" ||
    context?.effort === "max" ||
    context?.effort === "xhigh" ||
    context?.effort === "ultracode"
      ? context.effort
      : "medium";
  const resources = Array.isArray(context?.resources)
    ? context.resources
        .filter(
          (resource) =>
            resource &&
            typeof resource.id === "string" &&
            typeof resource.label === "string" &&
            [
              "assistant",
              "connector",
              "file",
              "folder",
              "selection",
              "skill",
            ].includes(resource.kind),
        )
        .slice(0, 50)
        .map((resource) => ({
          id: resource.id,
          kind: resource.kind,
          label: resource.label,
          ...(typeof resource.meta === "string" ? { meta: resource.meta } : {}),
        }))
    : [];
  return {
    deepResearch: context?.deepResearch === true,
    effort,
    mode,
    model,
    permissions,
    resources,
    workspace,
  };
}

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message): message is string => typeof message === "string")
    .map((message) => message.trim().slice(0, maxTaskLength))
    .filter(Boolean)
    .slice(-maxFollowUpCount);
}

function normalizeQueuedFollowUps(value: unknown): ProductTaskQueuedFollowUp[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item) =>
        item && typeof item.id === "string" && typeof item.content === "string",
    )
    .map((item) => ({
      content: item.content.trim().slice(0, maxTaskLength),
      context: normalizeContext(item.context),
      enqueuedAt:
        typeof item.enqueuedAt === "string"
          ? item.enqueuedAt
          : new Date(0).toISOString(),
      id: item.id,
    }))
    .filter((item) => item.content)
    .slice(-maxFollowUpCount);
}

export function createProductTaskSession(
  prompt: string,
  context: ProductComposerContext,
  origin: ProductTaskOrigin,
): ProductTaskSession {
  const normalizedPrompt = prompt.trim().slice(0, maxTaskLength);
  return {
    context: normalizeContext(context),
    createdAt: new Date().toISOString(),
    followUps: [],
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `task-${Date.now()}`,
    origin,
    prompt: normalizedPrompt,
    queuePaused: false,
    queuedFollowUps: [],
    version: 2,
  };
}

export function readProductTaskSession(): ProductTaskSession | null {
  if (typeof window === "undefined") return null;
  if (memoryTaskSession && !memoryTaskSessionPersisted) {
    return memoryTaskSession;
  }
  try {
    const raw = window.localStorage.getItem(taskSessionStorageKey);
    if (!raw) {
      memoryTaskSessionPersisted = false;
      return memoryTaskSession;
    }
    const value = JSON.parse(raw) as Omit<
      Partial<ProductTaskSession>,
      "version"
    > & { version?: number };
    if (
      (value.version !== 1 && value.version !== 2) ||
      typeof value.id !== "string" ||
      typeof value.prompt !== "string" ||
      (value.origin !== "assistant" && value.origin !== "start")
    ) {
      window.localStorage.removeItem(taskSessionStorageKey);
      memoryTaskSession = null;
      memoryTaskSessionPersisted = false;
      return null;
    }
    const prompt = value.prompt.trim().slice(0, maxTaskLength);
    if (!prompt) {
      window.localStorage.removeItem(taskSessionStorageKey);
      memoryTaskSession = null;
      memoryTaskSessionPersisted = false;
      return null;
    }
    memoryTaskSession = {
      context: normalizeContext(value.context),
      createdAt:
        typeof value.createdAt === "string"
          ? value.createdAt
          : new Date(0).toISOString(),
      followUps: normalizeMessages(value.followUps),
      id: value.id,
      origin: value.origin,
      prompt,
      queuePaused: value.queuePaused === true,
      queuedFollowUps: normalizeQueuedFollowUps(value.queuedFollowUps),
      version: 2,
    };
    memoryTaskSessionPersisted = true;
    return memoryTaskSession;
  } catch {
    memoryTaskSessionPersisted = false;
    try {
      window.localStorage.removeItem(taskSessionStorageKey);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    return memoryTaskSession;
  }
}

export function writeProductTaskSession(session: ProductTaskSession) {
  if (typeof window === "undefined") return false;
  memoryTaskSession = session;
  memoryTaskSessionPersisted = false;
  try {
    window.localStorage.setItem(taskSessionStorageKey, JSON.stringify(session));
    memoryTaskSessionPersisted = true;
    return true;
  } catch {
    return false;
  }
}

export function getProductTaskPersistenceStatus(): "memory" | "saved" {
  return memoryTaskSessionPersisted ? "saved" : "memory";
}

function normalizePendingTaskDraft(value: unknown): ProductTaskDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<ProductTaskDraft>;
  const context = normalizeContext({
    resources: draft.resources,
    workspace: draft.workspace,
  });
  const prompt =
    typeof draft.prompt === "string"
      ? draft.prompt.trim().slice(0, maxTaskLength)
      : "";
  if (!prompt && context.resources.length === 0) return null;
  return {
    prompt,
    resources: context.resources,
    revision:
      typeof draft.revision === "number" && Number.isFinite(draft.revision)
        ? Math.max(0, Math.floor(draft.revision))
        : Date.now(),
    workspace: context.workspace,
  };
}

export function readPendingProductTaskDraft(): ProductTaskDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(pendingTaskDraftStorageKey);
    if (!raw) return memoryPendingTaskDraft;
    const draft = normalizePendingTaskDraft(JSON.parse(raw));
    if (!draft) {
      window.sessionStorage.removeItem(pendingTaskDraftStorageKey);
      memoryPendingTaskDraft = null;
      return null;
    }
    memoryPendingTaskDraft = draft;
    return draft;
  } catch {
    return memoryPendingTaskDraft;
  }
}

export function writePendingProductTaskDraft(
  draft: Omit<ProductTaskDraft, "revision">,
): ProductTaskDraft {
  const pendingDraft = normalizePendingTaskDraft({
    ...draft,
    revision: Date.now(),
  });
  if (!pendingDraft) {
    clearPendingProductTaskDraft();
    return {
      prompt: "",
      resources: [],
      revision: Date.now(),
      workspace: "",
    };
  }
  memoryPendingTaskDraft = pendingDraft;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(
        pendingTaskDraftStorageKey,
        JSON.stringify(pendingDraft),
      );
    } catch {
      // The in-memory fallback still preserves the draft across client routes.
    }
  }
  return pendingDraft;
}

export function clearPendingProductTaskDraft() {
  memoryPendingTaskDraft = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(pendingTaskDraftStorageKey);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export function enqueueProductTaskFollowUp(
  session: ProductTaskSession,
  message: string,
  context: ProductComposerContext,
): ProductTaskSession {
  const normalizedMessage = message.trim().slice(0, maxTaskLength);
  if (!normalizedMessage) return session;
  return {
    ...session,
    queuedFollowUps: [
      ...session.queuedFollowUps,
      {
        content: normalizedMessage,
        context: normalizeContext(context),
        enqueuedAt: new Date().toISOString(),
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `queued-${Date.now()}`,
      },
    ].slice(-maxFollowUpCount),
  };
}

export function moveProductTaskQueuedFollowUp(
  session: ProductTaskSession,
  id: string,
  offset: -1 | 1,
) {
  const index = session.queuedFollowUps.findIndex((item) => item.id === id);
  const nextIndex = index + offset;
  if (index < 0 || nextIndex < 0 || nextIndex >= session.queuedFollowUps.length)
    return session;
  const queuedFollowUps = [...session.queuedFollowUps];
  const [item] = queuedFollowUps.splice(index, 1);
  if (!item) return session;
  queuedFollowUps.splice(nextIndex, 0, item);
  return { ...session, queuedFollowUps };
}

export function updateProductTaskQueuedFollowUp(
  session: ProductTaskSession,
  id: string,
  message: string,
) {
  const content = message.trim().slice(0, maxTaskLength);
  if (!content) return session;
  return {
    ...session,
    queuedFollowUps: session.queuedFollowUps.map((item) =>
      item.id === id ? { ...item, content } : item,
    ),
  };
}

export function removeProductTaskQueuedFollowUp(
  session: ProductTaskSession,
  id: string,
) {
  return {
    ...session,
    queuedFollowUps: session.queuedFollowUps.filter((item) => item.id !== id),
  };
}

export function setProductTaskQueuePaused(
  session: ProductTaskSession,
  queuePaused: boolean,
) {
  return { ...session, queuePaused };
}

export function runNextProductTaskQueuedFollowUp(session: ProductTaskSession) {
  const [next, ...queuedFollowUps] = session.queuedFollowUps;
  if (!next) return session;
  return {
    ...session,
    followUps: [...session.followUps, next.content].slice(-maxFollowUpCount),
    queuePaused: false,
    queuedFollowUps,
  };
}

export function formatProductTaskTitle(
  prompt: string,
  locale: ProductPlaygroundLocale,
) {
  const fallback = locale === "zh" ? "新任务" : "New task";
  const firstLine = prompt.split(/\r?\n/u, 1)[0]?.trim() || fallback;
  const limit = locale === "zh" ? 18 : 48;
  const characters = Array.from(firstLine);
  return characters.length > limit
    ? `${characters.slice(0, limit).join("")}…`
    : firstLine;
}

export function getProductTaskContextDetails(
  session: ProductTaskSession,
  locale: ProductPlaygroundLocale,
): ProductTaskContextDetails {
  return {
    effort: effortLabels[session.context.effort][locale],
    mode: modeLabels[session.context.mode][locale],
    model: modelLabels[session.context.model][locale],
    permissions: permissionLabels[session.context.permissions][locale],
    resources:
      locale === "zh"
        ? `${session.context.resources.length} 项`
        : `${session.context.resources.length} item${session.context.resources.length === 1 ? "" : "s"}`,
    workspace: workspaceLabels[session.context.workspace][locale],
  };
}

function contextLabel(
  session: ProductTaskSession,
  locale: ProductPlaygroundLocale,
) {
  const context = getProductTaskContextDetails(session, locale);
  return `${context.workspace} · ${context.mode} · ${context.model} · ${context.effort}`;
}

export function getProductTaskConversation(
  session: ProductTaskSession,
  locale: ProductPlaygroundLocale,
  persistenceStatus: "memory" | "saved" = "saved",
) {
  const context = contextLabel(session, locale);
  const persistenceCopy =
    persistenceStatus === "saved"
      ? {
          en: "This task stays in this browser, so it remains available from Recent tasks after navigation or refresh.",
          zh: "当前任务会保存在此浏览器中，切换页面或刷新后仍可从最近任务继续。",
        }
      : {
          en: "Browser storage is unavailable. This task remains available during the current browsing session but cannot be restored after a refresh.",
          zh: "当前浏览器未允许持久保存。本次浏览期间仍可继续任务，但刷新后将无法恢复。",
        };
  return locale === "zh"
    ? [
        session.prompt,
        `任务已创建，并保留了“${context}”上下文。我会先确认目标、约束和可用资料。`,
        "执行入口已准备好。你可以继续补充要求、添加文件，或明确希望先完成的步骤。",
        persistenceCopy.zh,
      ]
    : [
        session.prompt,
        `The task is ready with the “${context}” context preserved. I will first confirm the goal, constraints, and available sources.`,
        "The execution entry is ready. Add constraints, attach files, or name the first step you want completed.",
        persistenceCopy.en,
      ];
}

export function getProductTaskArtifacts(
  session: ProductTaskSession,
  locale: ProductPlaygroundLocale,
): ProductTaskArtifact[] {
  const title = formatProductTaskTitle(session.prompt, locale);
  const context = contextLabel(session, locale);
  return [
    {
      content: `# ${title}\n\n${session.prompt}\n`,
      id: "task-brief",
      kind: "Markdown",
      name: "task-brief.md",
      summary: {
        en: "Preserves the original request without rewriting its intent.",
        zh: "完整保留原始任务要求，不改写用户意图。",
      },
    },
    {
      content: JSON.stringify(
        {
          context: session.context,
          createdAt: session.createdAt,
          origin: session.origin,
        },
        null,
        2,
      ),
      id: "task-context",
      kind: "JSON",
      name: "task-context.json",
      summary: {
        en: `Records the selected workspace, permissions, and model: ${context}.`,
        zh: `记录工作空间、权限与模型选择：${context}。`,
      },
    },
    {
      content:
        locale === "zh"
          ? "# 执行计划\n\n1. 确认目标与完成标准\n2. 检查可用上下文和权限\n3. 执行首个可验证步骤\n4. 汇报结果与恢复路径\n"
          : "# Execution plan\n\n1. Confirm the goal and completion criteria\n2. Review available context and permissions\n3. Execute the first verifiable step\n4. Report results and recovery paths\n",
      id: "execution-plan",
      kind: "Markdown",
      name: "execution-plan.md",
      summary: {
        en: "Defines the first safe, verifiable execution sequence.",
        zh: "定义首个安全且可验证的执行顺序。",
      },
    },
  ];
}

export function getProductTaskFollowUpReply(locale: ProductPlaygroundLocale) {
  return locale === "zh"
    ? "这条补充已加入当前任务上下文。后续执行会保留原始要求，并按新的约束继续。"
    : "This update is now part of the task context. The next step will preserve the original request and apply the new constraint.";
}
