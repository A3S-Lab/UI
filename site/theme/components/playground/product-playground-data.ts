import type { ProductPlaygroundIconName } from "./ProductPlaygroundIcon";

export type ProductPlaygroundLocale = "en" | "zh";
export type ProductPlaygroundView =
  | "assistant"
  | "automation"
  | "catalog"
  | "created-session"
  | "marketplace"
  | "memory"
  | "project"
  | "project-session"
  | "projects"
  | "resources"
  | "session"
  | "start";
export type ProductResourceView =
  "documents" | "files" | "inspiration" | "knowledge" | "mail";

export type ProductLocalizedText = Record<ProductPlaygroundLocale, string>;

export type ProductCapabilityTab = "assistants" | "connectors" | "skills";
export type ProductCapabilityCategory =
  "content" | "data" | "engineering" | "knowledge" | "operations" | "product";

export type ProductNavigationItem = {
  icon: ProductPlaygroundIconName;
  id: Exclude<
    ProductPlaygroundView,
    "created-session" | "project" | "project-session" | "resources" | "session"
  >;
  label: ProductLocalizedText;
};

export const productNavigation: readonly ProductNavigationItem[] = [
  {
    id: "start",
    icon: "task-add",
    label: { en: "New task", zh: "新建任务" },
  },
  {
    id: "assistant",
    icon: "assistant",
    label: { en: "Assistant", zh: "助理" },
  },
  {
    id: "projects",
    icon: "project",
    label: { en: "Projects", zh: "项目" },
  },
  {
    id: "catalog",
    icon: "catalog",
    label: { en: "Capabilities", zh: "专家·技能·连接器" },
  },
  {
    id: "automation",
    icon: "automation",
    label: { en: "Automations", zh: "自动化" },
  },
];

export const resourceNavigation: readonly {
  icon: ProductPlaygroundIconName;
  id: ProductResourceView;
  label: ProductLocalizedText;
}[] = [
  { id: "files", icon: "files", label: { en: "My files", zh: "我的文件" } },
  { id: "mail", icon: "mail", label: { en: "Mail", zh: "我的邮箱" } },
  {
    id: "documents",
    icon: "document",
    label: { en: "Documents", zh: "协作文档" },
  },
  {
    id: "knowledge",
    icon: "knowledge",
    label: { en: "Knowledge", zh: "知识库" },
  },
  {
    id: "inspiration",
    icon: "inspiration",
    label: { en: "Inspiration", zh: "灵感" },
  },
];

export const productMoreNavigation: readonly {
  icon: ProductPlaygroundIconName;
  id: Extract<ProductPlaygroundView, "marketplace" | "memory">;
  label: ProductLocalizedText;
}[] = [
  {
    id: "memory",
    icon: "brain",
    label: { en: "Memory", zh: "记忆" },
  },
  {
    id: "marketplace",
    icon: "catalog",
    label: { en: "Extensions", zh: "扩展" },
  },
];

export type ProductMoreMenuItem =
  | {
      id: Extract<ProductPlaygroundView, "marketplace" | "memory">;
      kind: "view";
    }
  | { id: ProductResourceView; kind: "resource" };

export const productMoreMenuItems: readonly ProductMoreMenuItem[] = [
  { id: "files", kind: "resource" },
  { id: "mail", kind: "resource" },
  { id: "documents", kind: "resource" },
  { id: "knowledge", kind: "resource" },
  { id: "inspiration", kind: "resource" },
  { id: "memory", kind: "view" },
  { id: "marketplace", kind: "view" },
];

export const projectTemplates: readonly {
  description: ProductLocalizedText;
  label: ProductLocalizedText;
}[] = [
  {
    label: { en: "Product requirements", zh: "产品需求全流程" },
    description: {
      en: "Requirements planning, specs, implementation, test, and acceptance.",
      zh: "从需求规划、PRD 到研发测试验收",
    },
  },
  {
    label: { en: "Market and competitor research", zh: "市场调研与竞品分析" },
    description: {
      en: "Deep research, competitor teardown, and report review.",
      zh: "深度调研、竞品拆解、报告评审",
    },
  },
  {
    label: { en: "Team knowledge", zh: "团队知识库" },
    description: {
      en: "Build durable procedures, experience, and recurring answers.",
      zh: "持续沉淀 SOP、经验和 FAQ",
    },
  },
  {
    label: { en: "Project delivery", zh: "项目交付" },
    description: {
      en: "Manage customer requirements, plans, risks, and weekly reports.",
      zh: "管理客户需求、计划、风险和周报",
    },
  },
  {
    label: { en: "Bug tracking and acceptance", zh: "Bug 跟踪/测试验收" },
    description: {
      en: "Track bugs, test cases, evidence, and acceptance decisions.",
      zh: "持续跟踪 Bug，统一测试用例和验收结论",
    },
  },
];

export const automationTemplates: readonly {
  description: ProductLocalizedText;
  icon: ProductPlaygroundIconName;
  label: ProductLocalizedText;
}[] = [
  {
    icon: "report",
    label: { en: "Daily release digest", zh: "每日发布摘要" },
    description: {
      en: "Summarize merged changes, failed checks, and release risk.",
      zh: "汇总合并变更、失败检查与发布风险。",
    },
  },
  {
    icon: "checklist",
    label: { en: "Weekly dependency review", zh: "每周依赖审查" },
    description: {
      en: "Review upgrades, advisories, and compatibility evidence.",
      zh: "审查升级、安全通告与兼容性证据。",
    },
  },
  {
    icon: "calendar",
    label: { en: "Meeting preparation", zh: "会议前准备" },
    description: {
      en: "Collect decisions, unresolved items, and required context.",
      zh: "整理决策、未决事项与必要上下文。",
    },
  },
  {
    icon: "search",
    label: { en: "Regression watch", zh: "回归结果巡检" },
    description: {
      en: "Inspect scheduled visual and interaction test results.",
      zh: "巡检定时视觉与交互测试结果。",
    },
  },
  {
    icon: "document",
    label: { en: "Documentation drift", zh: "文档漂移检查" },
    description: {
      en: "Compare public examples with the current package contract.",
      zh: "比对公开示例与当前包契约。",
    },
  },
  {
    icon: "shield",
    label: { en: "Permission audit", zh: "权限边界审计" },
    description: {
      en: "Surface changes to privileged actions and recovery paths.",
      zh: "发现高风险操作与恢复路径的变化。",
    },
  },
  {
    icon: "filter",
    label: { en: "Issue intake triage", zh: "问题接收分诊" },
    description: {
      en: "Group new issues, flag duplicates, and assign an owner.",
      zh: "归类新问题、标记重复项并建议负责人。",
    },
  },
  {
    icon: "files",
    label: { en: "Artifact retention review", zh: "产物留存检查" },
    description: {
      en: "Find stale artifacts before the workspace retention window closes.",
      zh: "在工作区留存期限结束前发现过期产物。",
    },
  },
  {
    icon: "workspace",
    label: { en: "Workspace health report", zh: "工作区健康报告" },
    description: {
      en: "Summarize blocked work, pending approvals, and storage pressure.",
      zh: "汇总阻塞任务、待审批事项与存储压力。",
    },
  },
  {
    icon: "notification",
    label: { en: "Approval reminder", zh: "审批提醒" },
    description: {
      en: "Notify owners when a gated action has waited too long.",
      zh: "在受控操作等待过久时提醒对应负责人。",
    },
  },
  {
    icon: "catalog",
    label: { en: "Capability update review", zh: "能力更新审查" },
    description: {
      en: "Review changed permissions and release notes before updating.",
      zh: "更新前审查权限变化与版本说明。",
    },
  },
  {
    icon: "refresh",
    label: { en: "Nightly recovery drill", zh: "夜间恢复演练" },
    description: {
      en: "Exercise a bounded recovery path and retain the evidence.",
      zh: "执行受控恢复路径并留存验证证据。",
    },
  },
];

export const capabilityGroups: readonly {
  description: ProductLocalizedText;
  label: ProductLocalizedText;
  entries: readonly ProductLocalizedText[];
}[] = [
  {
    label: { en: "Product engineering", zh: "产品工程" },
    description: {
      en: "Plan, implement, review, and verify product changes.",
      zh: "规划、实现、评审并验证产品变更。",
    },
    entries: [
      { en: "Release reviewer", zh: "发布评审" },
      { en: "Interface auditor", zh: "界面验收" },
      { en: "Repository analyst", zh: "仓库分析" },
    ],
  },
  {
    label: { en: "Research", zh: "调研分析" },
    description: {
      en: "Collect evidence and turn it into traceable decisions.",
      zh: "收集证据并形成可追溯的决策。",
    },
    entries: [
      { en: "Source review", zh: "资料评审" },
      { en: "Market analysis", zh: "市场分析" },
      { en: "Decision brief", zh: "决策简报" },
    ],
  },
  {
    label: { en: "Knowledge operations", zh: "知识运营" },
    description: {
      en: "Maintain shared context, procedures, and recurring answers.",
      zh: "维护共享上下文、流程与常见答案。",
    },
    entries: [
      { en: "Knowledge curator", zh: "知识整理" },
      { en: "Document reviewer", zh: "文档评审" },
      { en: "Workflow librarian", zh: "流程归档" },
    ],
  },
  {
    label: { en: "Operations", zh: "运营协作" },
    description: {
      en: "Coordinate recurring work, evidence, and handoffs.",
      zh: "协调重复工作、证据与交接。",
    },
    entries: [
      { en: "Run monitor", zh: "运行监控" },
      { en: "Risk triage", zh: "风险分诊" },
      { en: "Status reporter", zh: "状态汇报" },
    ],
  },
  {
    label: { en: "Quality operations", zh: "质量运营" },
    description: {
      en: "Turn checks, reviews, and recovery evidence into a repeatable loop.",
      zh: "将检查、评审与恢复证据沉淀为可重复闭环。",
    },
    entries: [
      { en: "Release gate", zh: "发布门禁" },
      { en: "Visual acceptance", zh: "视觉验收" },
      { en: "Recovery drill", zh: "恢复演练" },
    ],
  },
];

export const capabilityDirectory: Record<
  ProductCapabilityTab,
  readonly {
    category: ProductCapabilityCategory;
    description: ProductLocalizedText;
    icon?: ProductPlaygroundIconName;
    label: ProductLocalizedText;
    owned?: boolean;
    tag: ProductLocalizedText;
  }[]
> = {
  assistants: [
    {
      category: "product",
      label: { en: "Product delivery lead", zh: "产品交付负责人" },
      description: {
        en: "Coordinates requirements, evidence, review, and release readiness.",
        zh: "协调需求、证据、评审与发布准备。",
      },
      tag: { en: "Product", zh: "产品" },
      owned: true,
    },
    {
      category: "engineering",
      label: { en: "Repository analyst", zh: "仓库分析专家" },
      description: {
        en: "Maps ownership, dependencies, risks, and affected surfaces.",
        zh: "梳理归属、依赖、风险与受影响界面。",
      },
      tag: { en: "Engineering", zh: "工程" },
      owned: true,
    },
    {
      category: "engineering",
      label: { en: "Release reviewer", zh: "发布评审专家" },
      description: {
        en: "Reviews checks, regressions, migration notes, and rollback paths.",
        zh: "评审检查结果、回归、迁移说明与回滚路径。",
      },
      tag: { en: "Release", zh: "发布" },
    },
    {
      category: "data",
      label: { en: "Evidence analyst", zh: "证据分析专家" },
      description: {
        en: "Turns measurements and test artifacts into traceable findings.",
        zh: "将测量结果与测试产物转为可追溯结论。",
      },
      tag: { en: "Data", zh: "数据" },
    },
    {
      category: "knowledge",
      label: { en: "Knowledge curator", zh: "知识整理专家" },
      description: {
        en: "Maintains durable sources, decisions, and recurring answers.",
        zh: "维护长期资料、决策与高频答案。",
      },
      tag: { en: "Knowledge", zh: "知识" },
    },
    {
      category: "content",
      label: { en: "Technical editor", zh: "技术内容编辑" },
      description: {
        en: "Clarifies guides, release notes, and public examples.",
        zh: "优化指南、版本说明与公开示例。",
      },
      tag: { en: "Content", zh: "内容" },
    },
    {
      category: "operations",
      label: { en: "Incident coordinator", zh: "事件协调专家" },
      description: {
        en: "Keeps timeline, ownership, recovery, and follow-up aligned.",
        zh: "统一时间线、责任人、恢复与后续行动。",
      },
      tag: { en: "Operations", zh: "运营" },
    },
    {
      category: "product",
      label: { en: "Interface reviewer", zh: "界面体验评审" },
      description: {
        en: "Checks hierarchy, interaction states, accessibility, and fit.",
        zh: "检查层级、交互状态、无障碍与适配。",
      },
      tag: { en: "Experience", zh: "体验" },
    },
    {
      category: "operations",
      label: { en: "Workflow operator", zh: "工作流运营专家" },
      description: {
        en: "Finds repeated work and defines observable automation boundaries.",
        zh: "识别重复工作并定义可观测的自动化边界。",
      },
      tag: { en: "Workflow", zh: "工作流" },
    },
    {
      category: "knowledge",
      label: { en: "Local file librarian", zh: "本地文件管理专家" },
      description: {
        en: "Organizes folders, naming, metadata, and recoverable file operations.",
        zh: "负责文件夹、命名、元数据与可恢复文件操作。",
      },
      tag: { en: "Files", zh: "文件" },
    },
    {
      category: "content",
      label: { en: "Office document editor", zh: "办公文档编辑专家" },
      description: {
        en: "Prepares reviewed documents, spreadsheets, slides, and PDF deliverables.",
        zh: "制作可审阅的文档、表格、演示稿与 PDF 交付物。",
      },
      tag: { en: "Office", zh: "办公" },
    },
    {
      category: "data",
      label: { en: "Data analysis partner", zh: "数据分析伙伴" },
      description: {
        en: "Finds trends and anomalies, then keeps the evidence beside each finding.",
        zh: "识别趋势与异常，并为每项结论保留对应证据。",
      },
      tag: { en: "Analysis", zh: "分析" },
    },
  ],
  skills: [
    {
      category: "engineering",
      icon: "search",
      label: { en: "Repository inspection", zh: "仓库巡检" },
      description: {
        en: "Inspects structure, status, ownership, and focused changes.",
        zh: "检查结构、状态、归属与聚焦变更。",
      },
      tag: { en: "Read-only", zh: "只读" },
      owned: true,
    },
    {
      category: "engineering",
      icon: "checklist",
      label: { en: "Test execution", zh: "测试执行" },
      description: {
        en: "Runs bounded suites and preserves failures as evidence.",
        zh: "运行受控测试并将失败保留为证据。",
      },
      tag: { en: "Verification", zh: "验证" },
      owned: true,
    },
    {
      category: "product",
      icon: "eye",
      label: { en: "Visual acceptance", zh: "视觉验收" },
      description: {
        en: "Captures representative viewports and compares visible states.",
        zh: "采集代表性视口并对比可见状态。",
      },
      tag: { en: "Interface", zh: "界面" },
    },
    {
      category: "knowledge",
      icon: "document",
      label: { en: "Document synthesis", zh: "文档综合" },
      description: {
        en: "Combines approved sources without losing provenance.",
        zh: "综合已授权资料且保留来源。",
      },
      tag: { en: "Knowledge", zh: "知识" },
    },
    {
      category: "data",
      icon: "chart",
      label: { en: "Result comparison", zh: "结果对比" },
      description: {
        en: "Normalizes structured output and highlights meaningful drift.",
        zh: "标准化结构化输出并突出关键变化。",
      },
      tag: { en: "Analysis", zh: "分析" },
    },
    {
      category: "operations",
      icon: "calendar",
      label: { en: "Scheduled review", zh: "定时巡检" },
      description: {
        en: "Runs a repeatable check on a declared schedule and scope.",
        zh: "按声明的时间与范围执行可重复检查。",
      },
      tag: { en: "Automation", zh: "自动化" },
    },
    {
      category: "content",
      icon: "edit",
      label: { en: "Release note drafting", zh: "版本说明撰写" },
      description: {
        en: "Turns verified changes into concise user-facing notes.",
        zh: "将已验证变更整理为简洁的用户说明。",
      },
      tag: { en: "Writing", zh: "写作" },
    },
    {
      category: "product",
      icon: "shield",
      label: { en: "Accessibility review", zh: "无障碍评审" },
      description: {
        en: "Checks names, order, focus, contrast, and keyboard completion.",
        zh: "检查名称、顺序、焦点、对比度与键盘完成路径。",
      },
      tag: { en: "Quality", zh: "质量" },
    },
    {
      category: "operations",
      icon: "refresh",
      label: { en: "Recovery rehearsal", zh: "恢复演练" },
      description: {
        en: "Exercises rollback steps without expanding the declared scope.",
        zh: "在既定范围内演练回滚步骤。",
      },
      tag: { en: "Recovery", zh: "恢复" },
    },
    {
      category: "engineering",
      icon: "search",
      label: { en: "Workspace quick open", zh: "工作区快速打开" },
      description: {
        en: "Searches open tabs and local workspace files from one keyboard flow.",
        zh: "通过统一键盘流程搜索已打开标签与本地工作区文件。",
      },
      tag: { en: "Navigation", zh: "导航" },
    },
    {
      category: "engineering",
      icon: "project",
      label: { en: "Code graph navigation", zh: "代码图谱导航" },
      description: {
        en: "Explores symbols, ownership, and dependency paths in an interactive graph.",
        zh: "在交互图谱中探索符号、归属与依赖路径。",
      },
      tag: { en: "Graph", zh: "图谱" },
    },
    {
      category: "product",
      icon: "eye",
      label: { en: "Device preview", zh: "设备预览" },
      description: {
        en: "Reviews responsive output in realistic desktop and mobile hardware shells.",
        zh: "在真实感桌面与移动设备外壳中检查响应式结果。",
      },
      tag: { en: "Preview", zh: "预览" },
    },
    {
      category: "product",
      icon: "checklist",
      label: { en: "Structured proposal review", zh: "结构化提案评审" },
      description: {
        en: "Compares targets, before and after values, stale state, and safe apply scope.",
        zh: "对比目标、变更前后、过期状态与安全应用范围。",
      },
      tag: { en: "Review", zh: "评审" },
    },
    {
      category: "knowledge",
      icon: "knowledge",
      label: { en: "Knowledge compilation", zh: "知识库编译" },
      description: {
        en: "Compiles approved sources with retry, quiet-window, and bulk-change safeguards.",
        zh: "在重试、静默窗口与批量变更保护下编译已批准资料。",
      },
      tag: { en: "Knowledge", zh: "知识" },
    },
    {
      category: "knowledge",
      icon: "brain",
      label: { en: "Memory retrieval", zh: "记忆检索" },
      description: {
        en: "Finds relevant local memories through filters, timeline, and graph context.",
        zh: "通过筛选、时间线与图谱上下文查找相关本地记忆。",
      },
      tag: { en: "Memory", zh: "记忆" },
    },
    {
      category: "content",
      icon: "presentation",
      label: { en: "Office deliverable editing", zh: "Office 交付物编辑" },
      description: {
        en: "Edits documents, spreadsheets, presentations, and reviewed PDF output.",
        zh: "编辑文档、表格、演示稿与经过审阅的 PDF 输出。",
      },
      tag: { en: "Office", zh: "办公" },
    },
  ],
  connectors: [
    {
      category: "engineering",
      icon: "code",
      label: { en: "Git repository", zh: "Git 仓库" },
      description: {
        en: "Read branches, reviews, checks, and authorized file content.",
        zh: "读取分支、评审、检查与已授权文件内容。",
      },
      tag: { en: "Source", zh: "源码" },
      owned: true,
    },
    {
      category: "knowledge",
      icon: "document",
      label: { en: "Document library", zh: "文档资料库" },
      description: {
        en: "Search approved documents and attach source excerpts.",
        zh: "检索已授权文档并引用原始片段。",
      },
      tag: { en: "Documents", zh: "文档" },
      owned: true,
    },
    {
      category: "operations",
      icon: "checklist",
      label: { en: "Issue tracker", zh: "问题跟踪系统" },
      description: {
        en: "Read work items, status, ownership, and linked evidence.",
        zh: "读取工作项、状态、归属与关联证据。",
      },
      tag: { en: "Planning", zh: "计划" },
    },
    {
      category: "operations",
      icon: "mail",
      label: { en: "Team messages", zh: "团队消息" },
      description: {
        en: "Search authorized threads and prepare bounded replies.",
        zh: "搜索已授权会话并准备受控回复。",
      },
      tag: { en: "Messages", zh: "消息" },
    },
    {
      category: "data",
      icon: "chart",
      label: { en: "Metrics store", zh: "指标数据源" },
      description: {
        en: "Query approved metrics without exposing credentials.",
        zh: "在不暴露凭据的前提下查询授权指标。",
      },
      tag: { en: "Metrics", zh: "指标" },
    },
    {
      category: "engineering",
      icon: "eye",
      label: { en: "Browser surface", zh: "浏览器表面" },
      description: {
        en: "Inspect and test an explicitly authorized Web origin.",
        zh: "检查并测试明确授权的 Web 来源。",
      },
      tag: { en: "Web", zh: "网页" },
    },
    {
      category: "knowledge",
      icon: "files",
      label: { en: "Workspace files", zh: "工作区文件" },
      description: {
        en: "Reference local artifacts within declared file boundaries.",
        zh: "在声明的文件边界内引用本地产物。",
      },
      tag: { en: "Files", zh: "文件" },
    },
    {
      category: "product",
      icon: "palette",
      label: { en: "Design source", zh: "设计资料源" },
      description: {
        en: "Read approved frames, tokens, and exported assets.",
        zh: "读取已授权画板、令牌与导出资源。",
      },
      tag: { en: "Design", zh: "设计" },
    },
    {
      category: "content",
      icon: "upload",
      label: { en: "Publishing target", zh: "发布目标" },
      description: {
        en: "Prepare a release and require confirmation before publishing.",
        zh: "准备发布内容并在发布前要求确认。",
      },
      tag: { en: "Publish", zh: "发布" },
    },
    {
      category: "engineering",
      icon: "brain",
      label: { en: "Local model runtime", zh: "本地模型运行时" },
      description: {
        en: "Uses configured local inference endpoints without exposing credentials.",
        zh: "使用已配置的本地推理端点，同时避免暴露凭据。",
      },
      tag: { en: "Local", zh: "本地" },
      owned: true,
    },
    {
      category: "engineering",
      icon: "link",
      label: { en: "MCP service", zh: "MCP 服务" },
      description: {
        en: "Connects reviewed tool servers through explicit capability and permission scope.",
        zh: "通过明确的能力与权限范围连接已审核工具服务。",
      },
      tag: { en: "Tools", zh: "工具" },
    },
    {
      category: "operations",
      icon: "automation",
      label: { en: "Automation runner", zh: "自动化运行器" },
      description: {
        en: "Runs declared schedules and retains status, history, and recovery evidence.",
        zh: "按声明计划运行，并保留状态、历史与恢复证据。",
      },
      tag: { en: "Automation", zh: "自动化" },
    },
  ],
};

export const resourceFiles = [
  ["src/session.ts", "TypeScript", "A3S UI", "Today", "7 KB"],
  ["src/sign-in.tsx", "TypeScript", "A3S UI", "Today", "9 KB"],
  ["tests/session.test.ts", "TypeScript", "A3S UI", "Today", "11 KB"],
  ["release-review.md", "Markdown", "A3S UI", "Yesterday", "5 KB"],
  ["src/runtime.ts", "TypeScript", "A3S UI", "Yesterday", "7 KB"],
] as const;

export function localizeProductText(
  text: ProductLocalizedText,
  locale: ProductPlaygroundLocale,
) {
  return text[locale];
}
