import type { PlaygroundIconName } from "./PlaygroundIcon";

export type PlaygroundLocale = "en" | "zh";
export type PlaygroundSceneId =
  | "code"
  | "design"
  | "write"
  | "workflow"
  | "automation"
  | "catalog"
  | "channels"
  | "settings";
export type PlaygroundState =
  "ready" | "loading" | "empty" | "error" | "offline" | "permission-denied";
export type PlaygroundViewport = "desktop" | "tablet" | "phone";

export type PlaygroundSceneDefinition = {
  description: Record<PlaygroundLocale, string>;
  icon: PlaygroundIconName;
  id: PlaygroundSceneId;
  label: Record<PlaygroundLocale, string>;
  supportsInspector: boolean;
};

export const playgroundScenes: readonly PlaygroundSceneDefinition[] = [
  {
    id: "code",
    icon: "code",
    supportsInspector: true,
    label: { en: "Code", zh: "代码" },
    description: {
      en: "Conversation, execution evidence, files, review, and preview.",
      zh: "对话、执行证据、文件、审阅与开发预览。",
    },
  },
  {
    id: "design",
    icon: "design",
    supportsInspector: true,
    label: { en: "Design", zh: "设计" },
    description: {
      en: "Canvas, layers, responsive prototype, and design review.",
      zh: "画布、图层、响应式原型与设计审阅。",
    },
  },
  {
    id: "write",
    icon: "write",
    supportsInspector: true,
    label: { en: "Write", zh: "写作" },
    description: {
      en: "Document tree, focused editor, sources, and writing assistant.",
      zh: "文档树、专注编辑器、资料与写作助手。",
    },
  },
  {
    id: "workflow",
    icon: "workflow",
    supportsInspector: true,
    label: { en: "Workflow", zh: "工作流" },
    description: {
      en: "Node flow, configuration, run history, and recovery.",
      zh: "节点流程、配置、运行历史与恢复。",
    },
  },
  {
    id: "automation",
    icon: "automation",
    supportsInspector: false,
    label: { en: "Automations", zh: "自动化" },
    description: {
      en: "Schedules, enabled state, latest result, and run evidence.",
      zh: "计划、启用状态、最近结果与运行证据。",
    },
  },
  {
    id: "catalog",
    icon: "catalog",
    supportsInspector: false,
    label: { en: "Catalog", zh: "能力目录" },
    description: {
      en: "Search, filters, installation state, and capability details.",
      zh: "搜索、筛选、安装状态与能力详情。",
    },
  },
  {
    id: "channels",
    icon: "channels",
    supportsInspector: false,
    label: { en: "Connections", zh: "连接" },
    description: {
      en: "Channel health, pairing, routing, and permission boundaries.",
      zh: "渠道健康、配对、路由与权限边界。",
    },
  },
  {
    id: "settings",
    icon: "settings",
    supportsInspector: false,
    label: { en: "Settings", zh: "设置" },
    description: {
      en: "Section navigation, validated controls, updates, and storage.",
      zh: "分区导航、校验控件、更新与存储。",
    },
  },
];

export const playgroundStates: readonly {
  id: PlaygroundState;
  label: Record<PlaygroundLocale, string>;
}[] = [
  { id: "ready", label: { en: "Ready", zh: "就绪" } },
  { id: "loading", label: { en: "Loading", zh: "加载中" } },
  { id: "empty", label: { en: "Empty", zh: "空状态" } },
  { id: "error", label: { en: "Error", zh: "错误" } },
  { id: "offline", label: { en: "Offline", zh: "离线" } },
  {
    id: "permission-denied",
    label: { en: "No permission", zh: "无权限" },
  },
];

export const playgroundViewports: readonly {
  id: PlaygroundViewport;
  label: Record<PlaygroundLocale, string>;
}[] = [
  { id: "desktop", label: { en: "Desktop", zh: "桌面" } },
  { id: "tablet", label: { en: "Tablet", zh: "平板" } },
  { id: "phone", label: { en: "Phone", zh: "手机" } },
];
