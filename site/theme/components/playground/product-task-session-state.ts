import type { ProductComposerContext } from "./ProductComposer";
import type {
  ProductLocalizedText,
  ProductPlaygroundLocale,
} from "./product-playground-data";

const taskSessionStorageKey = "a3s-ui:product-task-session:v1";
const maxTaskLength = 8_000;
const maxFollowUpCount = 100;
let memoryTaskSession: ProductTaskSession | null = null;
let memoryTaskSessionPersisted = false;

const workspaceLabels: Record<
  ProductComposerContext["workspace"],
  ProductLocalizedText
> = {
  "": { en: "No workspace selected", zh: "未选择工作空间" },
  local: { en: "Local workspace", zh: "本地工作空间" },
  ui: { en: "A3S UI experience", zh: "A3S UI 体验优化" },
};

const permissionLabels: Record<
  ProductComposerContext["permissions"],
  ProductLocalizedText
> = {
  ask: { en: "Ask before changes", zh: "修改前询问" },
  edit: { en: "Allow edits", zh: "允许修改" },
  read: { en: "Read only", zh: "仅查看" },
};

const modelLabels: Record<ProductComposerContext["model"], string> = {
  auto: "Auto",
  fast: "A3S Fast",
  reasoner: "A3S Reasoner",
};

export type ProductTaskOrigin = "assistant" | "start";

export type ProductTaskSession = {
  context: ProductComposerContext;
  createdAt: string;
  followUps: string[];
  id: string;
  origin: ProductTaskOrigin;
  prompt: string;
  version: 1;
};

export type ProductTaskArtifact = {
  content: string;
  id: string;
  kind: string;
  name: string;
  summary: ProductLocalizedText;
};

export type ProductTaskContextDetails = {
  model: string;
  permissions: string;
  workspace: string;
};

function normalizeContext(value: unknown): ProductComposerContext {
  const context = value as Partial<ProductComposerContext> | null;
  const model =
    context?.model === "reasoner" || context?.model === "fast"
      ? context.model
      : "auto";
  const permissions =
    context?.permissions === "read" || context?.permissions === "edit"
      ? context.permissions
      : "ask";
  const workspace =
    context?.workspace === "ui" || context?.workspace === "local"
      ? context.workspace
      : "";
  return { model, permissions, workspace };
}

function normalizeMessages(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message): message is string => typeof message === "string")
    .map((message) => message.trim().slice(0, maxTaskLength))
    .filter(Boolean)
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
    version: 1,
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
    const value = JSON.parse(raw) as Partial<ProductTaskSession>;
    if (
      value.version !== 1 ||
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
      version: 1,
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

export function appendProductTaskFollowUp(
  session: ProductTaskSession,
  message: string,
): ProductTaskSession {
  const normalizedMessage = message.trim().slice(0, maxTaskLength);
  if (!normalizedMessage) return session;
  return {
    ...session,
    followUps: [...session.followUps, normalizedMessage].slice(
      -maxFollowUpCount,
    ),
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
    model: modelLabels[session.context.model],
    permissions: permissionLabels[session.context.permissions][locale],
    workspace: workspaceLabels[session.context.workspace][locale],
  };
}

function contextLabel(
  session: ProductTaskSession,
  locale: ProductPlaygroundLocale,
) {
  const context = getProductTaskContextDetails(session, locale);
  return `${context.workspace} · ${context.model}`;
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
