import type { ProductPlaygroundIconName } from "./ProductPlaygroundIcon";

export type ExtensionChannel = "beta" | "stable";

export type ProductExtension = {
  channel: ExtensionChannel;
  description: { en: string; zh: string };
  featuredRank: number;
  id: string;
  icon: ProductPlaygroundIconName;
  name: { en: string; zh: string };
  permissions: readonly { en: string; zh: string }[];
  publisher: string;
  updated: { en: string; zh: string };
  updatedRank: number;
  version: string;
};

export const defaultInstalledExtensionIds = [
  "release-review",
  "local-preview",
] as const;

export const productExtensions: readonly ProductExtension[] = [
  {
    id: "release-review",
    name: { en: "Release review", zh: "发布评审" },
    description: {
      en: "Collect build status, interaction evidence, and unresolved release risks in one review surface.",
      zh: "集中查看构建状态、交互证据与尚未解决的发布风险。",
    },
    publisher: "A3S Labs",
    version: "1.8.2",
    channel: "stable",
    icon: "checklist",
    featuredRank: 1,
    updatedRank: 2,
    updated: { en: "2 days ago", zh: "2 天前" },
    permissions: [
      { en: "Read task evidence", zh: "读取任务证据" },
      { en: "Propose task context", zh: "提议任务上下文" },
    ],
  },
  {
    id: "dependency-watch",
    name: { en: "Dependency watch", zh: "依赖巡检" },
    description: {
      en: "Review package changes, security advisories, and compatibility locks before an update.",
      zh: "更新前检查依赖变化、安全通告与兼容性锁。",
    },
    publisher: "A3S Labs",
    version: "2.1.0",
    channel: "stable",
    icon: "shield",
    featuredRank: 2,
    updatedRank: 1,
    updated: { en: "Today", zh: "今天" },
    permissions: [
      { en: "Read package manifests", zh: "读取包清单" },
      { en: "Create a review draft", zh: "创建评审草稿" },
    ],
  },
  {
    id: "document-insights",
    name: { en: "Document insights", zh: "文档洞察" },
    description: {
      en: "Extract decisions, citations, tables, and action items from supported local documents.",
      zh: "从支持的本地文档中提取决策、引用、表格与行动项。",
    },
    publisher: "A3S Community",
    version: "0.9.4",
    channel: "beta",
    icon: "document",
    featuredRank: 5,
    updatedRank: 3,
    updated: { en: "4 days ago", zh: "4 天前" },
    permissions: [
      { en: "Read selected files", zh: "读取所选文件" },
      { en: "Return structured results", zh: "返回结构化结果" },
    ],
  },
  {
    id: "workspace-map",
    name: { en: "Workspace map", zh: "工作区图谱" },
    description: {
      en: "Project ownership and dependency relationships into an explorable workspace map.",
      zh: "将所有权与依赖关系整理成可探索的工作区图谱。",
    },
    publisher: "A3S Community",
    version: "1.3.1",
    channel: "stable",
    icon: "project",
    featuredRank: 4,
    updatedRank: 5,
    updated: { en: "Last week", zh: "上周" },
    permissions: [
      { en: "Read workspace structure", zh: "读取工作区结构" },
      { en: "Open referenced files", zh: "打开引用文件" },
    ],
  },
  {
    id: "local-preview",
    name: { en: "Local preview bridge", zh: "本地预览桥接" },
    description: {
      en: "Connect authorized local preview targets to device shells and task evidence.",
      zh: "将已授权的本地预览目标连接到设备外壳与任务证据。",
    },
    publisher: "A3S Labs",
    version: "1.5.0",
    channel: "stable",
    icon: "workspace",
    featuredRank: 3,
    updatedRank: 4,
    updated: { en: "6 days ago", zh: "6 天前" },
    permissions: [
      { en: "Open a local preview URL", zh: "打开本地预览地址" },
      { en: "Capture bounded evidence", zh: "采集受控证据" },
    ],
  },
  {
    id: "mail-triage",
    name: { en: "Mail triage", zh: "邮件分拣" },
    description: {
      en: "Group selected messages, propose priorities, and prepare drafts without sending automatically.",
      zh: "整理所选邮件、建议优先级并准备草稿，不会自动发送。",
    },
    publisher: "A3S Community",
    version: "0.7.3",
    channel: "beta",
    icon: "mail",
    featuredRank: 6,
    updatedRank: 6,
    updated: { en: "2 weeks ago", zh: "2 周前" },
    permissions: [
      { en: "Read approved messages", zh: "读取已授权邮件" },
      { en: "Prepare drafts", zh: "准备邮件草稿" },
    ],
  },
];
