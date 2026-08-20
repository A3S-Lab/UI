import type { ProductLocalizedText } from "./product-playground-data";

export type ProductComposerResource = {
  id: string;
  kind: "assistant" | "connector" | "file" | "folder" | "selection" | "skill";
  label: string;
  meta?: string;
  workspaceFileId?: string;
};

export type ProductComposerWorkspace = "" | "local" | "root" | "ui";

export type ProductTaskDraft = {
  prompt: string;
  resources: ProductComposerResource[];
  revision: number;
  workspace: ProductComposerWorkspace;
};

export type ProductComposerModel = {
  capabilities: readonly ("image" | "reasoning" | "tools")[];
  description: ProductLocalizedText;
  id: "auto" | "default" | "local";
  name: ProductLocalizedText;
  price: ProductLocalizedText;
  provider: "automatic" | "configured" | "local";
  recommended?: boolean;
};

export type ProductComposerEffort =
  "high" | "low" | "max" | "medium" | "ultracode" | "xhigh";

export type ProductComposerWorkspaceNode = {
  children?: readonly ProductComposerWorkspaceNode[];
  id: string;
  kind: "directory" | "file";
  meta: ProductLocalizedText;
  name: string;
};

export const productComposerModels: readonly ProductComposerModel[] = [
  {
    id: "auto",
    name: { en: "Auto", zh: "自动" },
    price: { en: "Best available", zh: "自动择优" },
    provider: "automatic",
    capabilities: ["reasoning", "tools", "image"],
    recommended: true,
    description: {
      en: "Uses the runtime default and keeps provider choice automatic.",
      zh: "使用运行时默认模型，并自动处理提供方选择。",
    },
  },
  {
    id: "default",
    name: { en: "Current default", zh: "当前默认模型" },
    price: { en: "1.00×", zh: "1.00×" },
    provider: "configured",
    capabilities: ["reasoning", "tools"],
    description: {
      en: "Uses the default model selected in Settings.",
      zh: "使用“设置”中选定的默认模型。",
    },
  },
  {
    id: "local",
    name: { en: "Configured local model", zh: "已配置的本地模型" },
    price: { en: "Local · 0.00×", zh: "本地 · 0.00×" },
    provider: "local",
    capabilities: ["tools"],
    description: {
      en: "Uses an available local model without inventing a model identity.",
      zh: "使用当前可用的本地模型，不预设具体模型名称。",
    },
  },
];

export const productComposerEfforts: readonly {
  description: ProductLocalizedText;
  id: ProductComposerEffort;
  label: ProductLocalizedText;
}[] = [
  {
    id: "low",
    label: { en: "Low", zh: "快速" },
    description: {
      en: "Prefer speed for small, reversible work.",
      zh: "优先速度，适合小范围、可回滚的工作。",
    },
  },
  {
    id: "medium",
    label: { en: "Medium", zh: "标准" },
    description: {
      en: "Balanced reasoning and verification for routine work.",
      zh: "兼顾推理与验证，适合日常任务。",
    },
  },
  {
    id: "high",
    label: { en: "High", zh: "深入" },
    description: {
      en: "Inspect dependencies and validate more edge cases.",
      zh: "检查依赖关系并验证更多边界情况。",
    },
  },
  {
    id: "xhigh",
    label: { en: "XHigh", zh: "极高" },
    description: {
      en: "Spend additional time on complex work and boundary conditions.",
      zh: "为复杂工作和边界条件投入更多分析时间。",
    },
  },
  {
    id: "max",
    label: { en: "Max", zh: "最大" },
    description: {
      en: "Use the highest regular level of reasoning and verification.",
      zh: "以最高常规强度进行推理、检查与验证。",
    },
  },
  {
    id: "ultracode",
    label: { en: "Ultra", zh: "极限" },
    description: {
      en: "Reserve the most intensive analysis for the hardest coding work.",
      zh: "为最复杂的编码任务提供极限分析与验证。",
    },
  },
];

export const productComposerCommands = [
  {
    id: "goal",
    label: "/goal",
    description: {
      en: "Set a persistent goal; use /goal clear to stop it.",
      zh: "设置持续目标；输入 /goal clear 清除。",
    },
  },
] as const;

export const productComposerWorkspace: readonly ProductComposerWorkspaceNode[] =
  [
    {
      id: "src",
      kind: "directory",
      name: "src",
      meta: { en: "3 folders", zh: "3 个文件夹" },
      children: [
        {
          id: "src/css",
          kind: "directory",
          name: "css",
          meta: { en: "Design-system source", zh: "设计系统源码" },
          children: [
            {
              id: "src/css/components/agent-composer.css",
              kind: "file",
              name: "agent-composer.css",
              meta: { en: "CSS · 5.8 KB", zh: "CSS · 5.8 KB" },
            },
            {
              id: "src/css/components/file-explorer.css",
              kind: "file",
              name: "file-explorer.css",
              meta: { en: "CSS · 4.1 KB", zh: "CSS · 4.1 KB" },
            },
          ],
        },
        {
          id: "src/integrations",
          kind: "directory",
          name: "integrations",
          meta: { en: "Framework adapters", zh: "框架适配器" },
          children: [
            {
              id: "src/integrations/tiptap/react.js",
              kind: "file",
              name: "react.js",
              meta: { en: "JavaScript · modified", zh: "JavaScript · 已修改" },
            },
            {
              id: "src/integrations/tiptap/vue.js",
              kind: "file",
              name: "vue.js",
              meta: { en: "JavaScript · modified", zh: "JavaScript · 已修改" },
            },
          ],
        },
      ],
    },
    {
      id: "site",
      kind: "directory",
      name: "site",
      meta: { en: "Documentation application", zh: "文档应用" },
      children: [
        {
          id: "site/theme",
          kind: "directory",
          name: "theme",
          meta: { en: "Rspress theme", zh: "Rspress 主题" },
          children: [
            {
              id: "site/theme/components/playground/ProductComposer.tsx",
              kind: "file",
              name: "ProductComposer.tsx",
              meta: { en: "TypeScript · modified", zh: "TypeScript · 已修改" },
            },
            {
              id: "site/theme/mdx/AgentComposerDemo.tsx",
              kind: "file",
              name: "AgentComposerDemo.tsx",
              meta: { en: "TypeScript · 14.2 KB", zh: "TypeScript · 14.2 KB" },
            },
          ],
        },
        {
          id: "site/docs/next/zh/components/agent-composer.mdx",
          kind: "file",
          name: "agent-composer.mdx",
          meta: { en: "MDX · Chinese", zh: "MDX · 中文" },
        },
      ],
    },
    {
      id: "tests",
      kind: "directory",
      name: "tests",
      meta: { en: "Regression coverage", zh: "回归测试" },
      children: [
        {
          id: "tests/e2e/product-resource-surfaces.acl",
          kind: "file",
          name: "product-resource-surfaces.acl",
          meta: { en: "ACL · 4 scenarios", zh: "ACL · 4 个场景" },
        },
      ],
    },
    {
      id: "AGENTS.md",
      kind: "file",
      name: "AGENTS.md",
      meta: { en: "Repository instructions · 7.2 KB", zh: "仓库说明 · 7.2 KB" },
    },
    {
      id: "DESIGN.md",
      kind: "file",
      name: "DESIGN.md",
      meta: { en: "Design contract · 18.4 KB", zh: "设计规范 · 18.4 KB" },
    },
    {
      id: "package.json",
      kind: "file",
      name: "package.json",
      meta: { en: "Package manifest · modified", zh: "包清单 · 已修改" },
    },
  ];
