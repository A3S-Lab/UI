import type { ProductLocalizedText } from "./product-playground-data";

export type ProductMemoryView = "evolution" | "graph" | "timeline";
export type ProductMemoryScope = "all" | "personal" | "workspace";
export type ProductMemoryKind =
  "decision" | "fact" | "preference" | "procedure";
export type ProductMemoryCandidateState = "accepted" | "pending" | "rejected";

export type ProductMemoryRecord = {
  body: ProductLocalizedText;
  evidence: ProductLocalizedText;
  id: string;
  kind: ProductMemoryKind;
  scope: Exclude<ProductMemoryScope, "all">;
  source: ProductLocalizedText;
  sourceLocator: string;
  time: ProductLocalizedText;
  title: ProductLocalizedText;
};

export type ProductMemoryCandidate = {
  body: ProductLocalizedText;
  evidence: ProductLocalizedText;
  id: string;
  kind: ProductMemoryKind;
  reason: ProductLocalizedText;
  scope: Exclude<ProductMemoryScope, "all">;
  title: ProductLocalizedText;
};

export const productMemoryKindCopy: Record<
  ProductMemoryKind,
  ProductLocalizedText
> = {
  decision: { en: "Decision", zh: "决策" },
  fact: { en: "Fact", zh: "事实" },
  preference: { en: "Preference", zh: "偏好" },
  procedure: { en: "Procedure", zh: "流程" },
};

export const initialProductMemories: readonly ProductMemoryRecord[] = [
  {
    id: "visual-evidence",
    kind: "procedure",
    scope: "workspace",
    title: {
      en: "Visual evidence is required before release",
      zh: "发布前必须保留视觉验收证据",
    },
    body: {
      en: "Desktop and mobile interaction paths must be reviewed before a release candidate is accepted.",
      zh: "发布候选版本验收前，需要检查桌面端与移动端的关键交互路径。",
    },
    evidence: {
      en: "Confirmed in the release-readiness task after desktop and mobile screenshots were attached.",
      zh: "在发布就绪任务中确认，当时附有桌面端与移动端截图。",
    },
    source: { en: "A3S UI workspace", zh: "A3S UI 工作空间" },
    sourceLocator: "session/release-readiness#visual-acceptance",
    time: { en: "12 minutes ago", zh: "12 分钟前" },
  },
  {
    id: "language",
    kind: "preference",
    scope: "personal",
    title: { en: "Use Simplified Chinese by default", zh: "默认使用简体中文" },
    body: {
      en: "Keep technical names in English when translation would reduce precision.",
      zh: "技术名词在翻译会降低准确性时保留英文。",
    },
    evidence: {
      en: "Captured from an explicit language preference, not inferred from usage.",
      zh: "来自明确的语言偏好设置，不是根据使用行为推断。",
    },
    source: { en: "Explicit preference", zh: "明确偏好" },
    sourceLocator: "settings/personalization#language",
    time: { en: "Today", zh: "今天" },
  },
  {
    id: "design-contract",
    kind: "decision",
    scope: "workspace",
    title: {
      en: "The design contract is the source of truth",
      zh: "设计契约是视觉实现的唯一依据",
    },
    body: {
      en: "Component changes must preserve the A3S blue theme, semantic markup, and bilingual behavior.",
      zh: "组件变更必须保留 A3S 蓝色主题、语义化标记与双语行为。",
    },
    evidence: {
      en: "Recorded in DESIGN.md and reaffirmed in the component review workflow.",
      zh: "记录于 DESIGN.md，并在组件评审流程中再次确认。",
    },
    source: { en: "Project decision", zh: "项目决策" },
    sourceLocator: "file/DESIGN.md#design-contract",
    time: { en: "Yesterday", zh: "昨天" },
  },
  {
    id: "workspace-boundary",
    kind: "fact",
    scope: "workspace",
    title: {
      en: "The documentation site uses Rspress",
      zh: "文档站使用 Rspress",
    },
    body: {
      en: "Playground routes stay outside the documentation tree while sharing the same build and locale system.",
      zh: "Playground 路由独立于文档目录，同时复用相同的构建与语言系统。",
    },
    evidence: {
      en: "Verified from the current site routing and build configuration.",
      zh: "已从当前站点路由与构建配置中验证。",
    },
    source: { en: "Repository context", zh: "仓库上下文" },
    sourceLocator: "repository/site/rspress.config.ts",
    time: { en: "2 days ago", zh: "2 天前" },
  },
  {
    id: "testing",
    kind: "procedure",
    scope: "workspace",
    title: {
      en: "Regression checks cover desktop and mobile workflows",
      zh: "回归检查同时覆盖桌面端与移动端流程",
    },
    body: {
      en: "Critical workflows require deterministic interaction checks and bounded visual evidence at both viewport classes.",
      zh: "关键流程需要在两类视口上保留确定性交互检查与有界视觉证据。",
    },
    evidence: {
      en: "Confirmed by the checked-in browser suites and their retained screenshots.",
      zh: "由已提交的浏览器套件及其保留截图确认。",
    },
    source: { en: "Release checklist", zh: "发布检查清单" },
    sourceLocator: "repository/tests/e2e",
    time: { en: "2 days ago", zh: "2 天前" },
  },
];

export const productMemoryCandidates: readonly ProductMemoryCandidate[] = [
  {
    id: "terminology",
    kind: "preference",
    scope: "workspace",
    title: {
      en: "Use “workspace” consistently",
      zh: "统一使用“工作空间”术语",
    },
    body: {
      en: "Use workspace as the stable product term across navigation, settings, and task context.",
      zh: "在导航、设置和任务上下文中统一使用“工作空间”。",
    },
    reason: {
      en: "Four recent tasks requested consistent component terminology.",
      zh: "最近 4 个任务都要求组件命名保持一致。",
    },
    evidence: {
      en: "4 tasks · 2 projects",
      zh: "4 个任务 · 2 个项目",
    },
  },
  {
    id: "testing-candidate",
    kind: "procedure",
    scope: "workspace",
    title: {
      en: "Release review includes both viewport classes",
      zh: "发布验收包含双端截图",
    },
    body: {
      en: "Require current desktop and mobile screenshots before approving a release.",
      zh: "批准发布前需要保留当前桌面端与移动端截图。",
    },
    reason: {
      en: "Release tasks repeatedly require both desktop and mobile review.",
      zh: "发布任务反复要求同时检查桌面端和移动端。",
    },
    evidence: {
      en: "4 tasks · 2 projects",
      zh: "4 个任务 · 2 个项目",
    },
  },
];

export function productMemoryFromCandidate(
  candidate: ProductMemoryCandidate,
): ProductMemoryRecord {
  return {
    body: candidate.body,
    evidence: {
      en: `Accepted after human review. Supporting evidence: ${candidate.evidence.en}.`,
      zh: `经人工评审后接受。支持证据：${candidate.evidence.zh}。`,
    },
    id: `evolution-${candidate.id}`,
    kind: candidate.kind,
    scope: candidate.scope,
    source: {
      en: "Memory evolution review",
      zh: "记忆演化评审",
    },
    sourceLocator: `memory/evolution/${candidate.id}`,
    time: { en: "Just now", zh: "刚刚" },
    title: candidate.title,
  };
}
