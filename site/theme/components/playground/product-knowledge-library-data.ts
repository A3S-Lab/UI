import type { ProductLocalizedText } from "./product-playground-data";

export type ProductKnowledgePhase =
  | "failed"
  | "paused"
  | "queued"
  | "ready"
  | "running"
  | "succeeded";

export type ProductKnowledgeSource = {
  id: string;
  kind: string;
  name: string;
  status: "indexed" | "pending" | "skipped";
  updated: string;
};

export type ProductKnowledgeBase = {
  bytes: number;
  conceptCount: number;
  description: ProductLocalizedText;
  error?: ProductLocalizedText;
  id: string;
  name: ProductLocalizedText;
  origin: "created" | "imported" | "selection" | "workspace";
  path: string;
  pendingChanges?: boolean;
  phase: ProductKnowledgePhase;
  pinned: boolean;
  policy: "manual" | "smart_auto";
  sourceCount: number;
  sources: readonly ProductKnowledgeSource[];
  updated: string;
};

export const productKnowledgeBases: readonly ProductKnowledgeBase[] = [
  {
    id: "design-system",
    name: { en: "A3S UI design system", zh: "A3S UI 设计系统" },
    description: {
      en: "Design principles, public contracts, interaction decisions, and acceptance evidence.",
      zh: "设计原则、公开契约、交互决策与验收证据。",
    },
    origin: "selection",
    path: "/workspace/knowledge/a3s-ui",
    phase: "succeeded",
    policy: "smart_auto",
    pinned: true,
    sourceCount: 86,
    conceptCount: 1_428,
    bytes: 18_874_368,
    updated: "2026-08-18T10:18:00.000Z",
    sources: [
      { id: "design", name: "DESIGN.md", kind: "Markdown", status: "indexed", updated: "2026-08-18T10:11:00.000Z" },
      { id: "docs", name: "site/docs/next", kind: "Folder", status: "indexed", updated: "2026-08-18T09:42:00.000Z" },
      { id: "source", name: "src/css/components", kind: "Folder", status: "indexed", updated: "2026-08-18T10:18:00.000Z" },
    ],
  },
  {
    id: "product-decisions",
    name: { en: "Product decisions", zh: "产品决策记录" },
    description: {
      en: "Requirements, alternatives, trade-offs, and decisions retained across releases.",
      zh: "跨版本保留需求、备选方案、权衡与决策结论。",
    },
    origin: "imported",
    path: "/workspace/knowledge/product-decisions",
    phase: "succeeded",
    policy: "manual",
    pinned: true,
    sourceCount: 34,
    conceptCount: 612,
    bytes: 7_235_174,
    updated: "2026-08-17T16:22:00.000Z",
    sources: [
      { id: "decision-log", name: "Decision log", kind: "Obsidian Vault", status: "indexed", updated: "2026-08-17T16:22:00.000Z" },
      { id: "research", name: "Research notes", kind: "Markdown", status: "indexed", updated: "2026-08-16T11:04:00.000Z" },
    ],
  },
  {
    id: "release-evidence",
    name: { en: "Release evidence", zh: "发布验收证据" },
    description: {
      en: "Browser screenshots, test reports, compatibility notes, and recovery checks.",
      zh: "浏览器截图、测试报告、兼容记录与恢复检查。",
    },
    origin: "selection",
    path: "/workspace/knowledge/release-evidence",
    phase: "running",
    policy: "smart_auto",
    pinned: false,
    sourceCount: 48,
    conceptCount: 318,
    bytes: 54_812_672,
    updated: "2026-08-18T10:24:00.000Z",
    sources: [
      { id: "visual", name: ".a3s-test/runs", kind: "Folder", status: "pending", updated: "2026-08-18T10:24:00.000Z" },
      { id: "e2e", name: "tests/e2e", kind: "Folder", status: "indexed", updated: "2026-08-18T10:02:00.000Z" },
    ],
  },
  {
    id: "migration-research",
    name: { en: "Migration research", zh: "组件迁移调研" },
    description: {
      en: "Source audits and product-admission notes for candidate components.",
      zh: "候选组件的源码审计与产品准入记录。",
    },
    origin: "selection",
    path: "/workspace/knowledge/migration-research",
    phase: "failed",
    policy: "manual",
    pinned: false,
    pendingChanges: true,
    error: {
      en: "Two source files could not be read. The previous searchable version remains available.",
      zh: "有 2 个来源文件无法读取；上一版可搜索内容仍然可用。",
    },
    sourceCount: 27,
    conceptCount: 404,
    bytes: 5_347_328,
    updated: "2026-08-17T21:05:00.000Z",
    sources: [
      { id: "audit", name: "component-audit", kind: "Markdown folder", status: "indexed", updated: "2026-08-17T21:05:00.000Z" },
      { id: "missing", name: "legacy-notes", kind: "Folder", status: "skipped", updated: "2026-08-16T18:42:00.000Z" },
    ],
  },
  {
    id: "workspace-notes",
    name: { en: "Workspace notes", zh: "工作空间笔记" },
    description: {
      en: "The default local knowledge area for temporary notes and durable handoffs.",
      zh: "用于临时笔记与长期交接的默认本地知识区域。",
    },
    origin: "workspace",
    path: "/workspace/knowledge/default",
    phase: "paused",
    policy: "smart_auto",
    pinned: false,
    error: {
      en: "Automatic updates paused after a large source change. Review and continue manually.",
      zh: "来源发生大规模变化后已暂停自动更新；请检查并手动继续。",
    },
    sourceCount: 12,
    conceptCount: 184,
    bytes: 2_621_440,
    updated: "2026-08-16T09:31:00.000Z",
    sources: [
      { id: "notes", name: "notes", kind: "Folder", status: "pending", updated: "2026-08-16T09:31:00.000Z" },
    ],
  },
];
