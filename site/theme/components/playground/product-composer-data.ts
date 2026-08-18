import type { ProductLocalizedText } from "./product-playground-data";

export type ProductComposerResource = {
  id: string;
  kind: "file" | "folder" | "selection" | "skill";
  label: string;
  meta?: string;
};

export type ProductComposerModel = {
  capabilities: readonly ("image" | "reasoning" | "tools")[];
  description: ProductLocalizedText;
  id: "auto" | "fast" | "reasoner";
  name: string;
  provider: "A3S" | "Local";
  recommended?: boolean;
};

export type ProductComposerEffort = "high" | "low" | "max" | "medium";

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
    name: "Auto",
    provider: "A3S",
    capabilities: ["reasoning", "tools", "image"],
    recommended: true,
    description: {
      en: "Routes each step to the most suitable configured model.",
      zh: "根据任务步骤自动选择最合适的已配置模型。",
    },
  },
  {
    id: "reasoner",
    name: "A3S Reasoner",
    provider: "A3S",
    capabilities: ["reasoning", "tools"],
    description: {
      en: "Deeper analysis for architecture, review, and multi-step work.",
      zh: "适合架构、评审和多步骤任务的深度推理模型。",
    },
  },
  {
    id: "fast",
    name: "A3S Fast",
    provider: "Local",
    capabilities: ["tools"],
    description: {
      en: "Low-latency local model for bounded edits and quick answers.",
      zh: "适合明确修改与快速问答的低延迟本地模型。",
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
    id: "max",
    label: { en: "Maximum", zh: "最高" },
    description: {
      en: "Reserve more time for hard, high-risk decisions.",
      zh: "为复杂且高风险的决策投入更多时间。",
    },
  },
];

export const productComposerSkills = [
  {
    id: "ui-review",
    label: "ui-review",
    description: {
      en: "Review interaction details, visual hierarchy, and responsive states.",
      zh: "审查交互细节、视觉层级与响应式状态。",
    },
    scope: { en: "Workspace", zh: "工作区" },
  },
  {
    id: "browser-check",
    label: "browser-check",
    description: {
      en: "Verify a real browser workflow and retain bounded evidence.",
      zh: "验证真实浏览器流程并保留必要证据。",
    },
    scope: { en: "Installed", zh: "已安装" },
  },
  {
    id: "release-audit",
    label: "release-audit",
    description: {
      en: "Check release boundaries, documentation, tests, and recovery.",
      zh: "检查发布边界、文档、测试与恢复路径。",
    },
    scope: { en: "Workspace", zh: "工作区" },
  },
  {
    id: "accessibility",
    label: "accessibility",
    description: {
      en: "Inspect keyboard, naming, contrast, and assistive technology paths.",
      zh: "检查键盘、命名、对比度与辅助技术路径。",
    },
    scope: { en: "Built-in", zh: "内置" },
  },
] as const;

export const productComposerCommands = [
  {
    id: "goal",
    label: "/goal",
    description: {
      en: "Continue until the stated outcome is verifiably complete.",
      zh: "持续执行，直到目标得到可验证的完成。",
    },
  },
  {
    id: "review",
    label: "/review",
    description: {
      en: "Review the current change set and report material risks.",
      zh: "审查当前变更并报告实质风险。",
    },
  },
  {
    id: "explain",
    label: "/explain",
    description: {
      en: "Explain selected code, dependencies, and ownership boundaries.",
      zh: "解释所选代码、依赖关系和职责边界。",
    },
  },
  {
    id: "test",
    label: "/test",
    description: {
      en: "Run the focused checks that prove the current change.",
      zh: "运行能够证明当前变更的聚焦检查。",
    },
  },
] as const;

export const productComposerWorkspace: readonly ProductComposerWorkspaceNode[] = [
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
