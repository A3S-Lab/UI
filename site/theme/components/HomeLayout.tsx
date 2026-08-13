import { useEffect, useRef, useState } from "react";
import { useLang, useSite, useVersion, withBase } from "@rspress/core/runtime";
import { ThemeCustomizer } from "./ThemeCustomizer";

type Locale = "zh" | "en";

type Localized = {
  zh: string;
  en: string;
};

type ComponentFamily = {
  category: Localized;
  count: string;
  description: Localized;
  href: string;
  title: Localized;
};

const componentFamilies: ComponentFamily[] = [
  {
    category: { zh: "输入与选择", en: "Input and selection" },
    count: "13",
    description: {
      zh: "字段、选择器、开关、滑块，以及可访问的表单组合。",
      en: "Fields, selects, switches, sliders, and accessible form composition.",
    },
    href: "/components/field",
    title: { zh: "表单", en: "Forms" },
  },
  {
    category: { zh: "定位与导航", en: "Orientation and wayfinding" },
    count: "05",
    description: {
      zh: "活动栏、面包屑、标签页、分页与产品侧边栏。",
      en: "Activity rails, breadcrumbs, tabs, pagination, and product sidebars.",
    },
    href: "/components/activity-bar",
    title: { zh: "导航", en: "Navigation" },
  },
  {
    category: { zh: "分层交互", en: "Layered interaction" },
    count: "07",
    description: {
      zh: "对话框、抽屉、菜单、浮层、命令面板与上下文帮助。",
      en: "Dialogs, drawers, menus, popovers, commands, and contextual help.",
    },
    href: "/components/dialog",
    title: { zh: "浮层", en: "Overlays" },
  },
  {
    category: { zh: "状态与反馈", en: "Status and feedback" },
    count: "08",
    description: {
      zh: "警告、状态徽章、进度、骨架屏、加载状态与 Toast 反馈。",
      en: "Alerts, status badges, progress, skeletons, spinners, and toast feedback.",
    },
    href: "/components/alert",
    title: { zh: "反馈", en: "Feedback" },
  },
  {
    category: { zh: "结构化内容", en: "Structured content" },
    count: "12",
    description: {
      zh: "卡片、属性列表、步骤条、时间线、日志、表格与结构化信息展示。",
      en: "Cards, property lists, steppers, timelines, logs, tables, and structured disclosure.",
    },
    href: "/components/card",
    title: { zh: "数据展示", en: "Data display" },
  },
  {
    category: { zh: "应用组合", en: "Application composition" },
    count: "12",
    description: {
      zh: "应用外壳、Agent 工作台、品牌标识组、分割面板与资源网格。",
      en: "Application shells, Agent workbenches, brand lockups, split panes, and resource grids.",
    },
    href: "/components/app-shell",
    title: { zh: "应用模式", en: "Application patterns" },
  },
];

const resourceKinds = [
  {
    icon: "Aa",
    id: "document",
    label: { zh: "文档", en: "Document" },
    meta: { zh: "空白画布", en: "Blank canvas" },
  },
  {
    icon: "▦",
    id: "spreadsheet",
    label: { zh: "预算模型", en: "Budget model" },
    meta: { zh: "12 个工作表", en: "12 sheets" },
  },
  {
    icon: "▤",
    id: "presentation",
    label: { zh: "项目复盘", en: "Project review" },
    meta: { zh: "24 张幻灯片", en: "24 slides" },
  },
] as const;

const homeCopy = {
  zh: {
    kicker: "A3S 产品界面系统",
    titleLead: "复杂界面，",
    titleAccent: "也该有清晰语法。",
    subtitle:
      "把 A3S Office 验证过的应用外壳、功能区、分栏与状态模型，交付为语义化 HTML、Tailwind CSS 和少量原生 JavaScript。无需 React，不绑定框架运行时。",
    start: "安装 A3S UI",
    github: "查看源码",
    copy: "复制安装命令",
    copied: "安装命令已复制",
    copyError: "无法复制，请手动选择命令",
    installCommandLabel: "npm 安装命令",
    componentGuides: "组件契约",
    foundationSystems: "设计基础",
    runtimeDependencies: "框架运行时",
    liveSpecimen: "公开组件组合",
    specimenMeta: "可交互 A3S OFFICE 工作台",
    semanticHtml: "语义化 HTML",
    nativeBehavior: "浏览器原生行为",
    applicationPatterns: "应用级组合",
    bidirectionalLayout: "响应式 + RTL",
    serverTemplates: "服务端模板",
    catalogTitle: "从一个控件，到整个工作台。",
    catalogBody:
      "每篇指南提供可运行样例、最小标记和完整状态契约；应用模式展示这些组件如何组成真实工作区。",
    guides: "个契约",
    browseCatalog: "查看全部组件契约",
    foundationsTitle: "一套语义契约，多种视觉基础。",
    foundationsBody:
      "颜色、字体与形状可以切换，组件结构、交互状态和可访问行为始终保持一致。",
    principles: [
      {
        title: "平台能力优先",
        body: "原生控件和语义化地标始终优先；只有浏览器无法提供的交互才使用 JavaScript。",
      },
      {
        title: "坚持一份契约",
        body: "CSS 变量和已记录的数据属性负责适配，不分叉组件结构，也不牺牲可访问行为。",
      },
      {
        title: "为复杂工作而设",
        body: "紧凑界面、稳定焦点与响应式工作区，让高密度产品始终保持清晰。",
      },
    ],
    principlesTitle: "三条不能妥协的产品原则。",
    ctaTitle: "从一个真实界面开始。",
    ctaBody:
      "安装 @a3s-lab/ui，选择视觉基础，然后从 App Shell 或任一组件契约复制可运行标记。",
    installation: "查看安装方式",
    explore: "浏览组件契约",
    workspace: "工作区 / 最近使用",
    continue: "继续上次工作",
    newResource: "新建资源",
    properties: "属性",
    resource: "资源",
    surface: "表面",
    canvas: "画布",
    accent: "强调色",
    saved: "已保存",
    ribbonControls: "控件",
    workbenchRegion: "交互式 A3S Office 工作台样例",
  },
  en: {
    kicker: "A3S PRODUCT INTERFACE SYSTEM",
    titleLead: "Complex UI.",
    titleAccent: "Clear grammar.",
    subtitle:
      "A3S Office patterns—app shells, ribbons, split panes, and state models—delivered as semantic HTML, Tailwind CSS, and small vanilla JavaScript controllers. No React. No framework runtime.",
    start: "Install A3S UI",
    github: "View source",
    copy: "Copy install command",
    copied: "Install command copied",
    copyError: "Couldn’t copy. Select the command manually.",
    installCommandLabel: "npm install command",
    componentGuides: "Component contracts",
    foundationSystems: "Design foundations",
    runtimeDependencies: "Framework runtimes",
    liveSpecimen: "PUBLIC COMPONENT COMPOSITION",
    specimenMeta: "INTERACTIVE A3S OFFICE WORKBENCH",
    semanticHtml: "Semantic HTML",
    nativeBehavior: "Browser-native behavior",
    applicationPatterns: "Application composition",
    bidirectionalLayout: "Responsive + RTL",
    serverTemplates: "Server templates",
    catalogTitle: "From one control to a complete workspace.",
    catalogBody:
      "Every guide pairs a live specimen with minimal markup and a complete state contract. Application patterns show how those pieces become real workspaces.",
    guides: "CONTRACTS",
    browseCatalog: "View all component contracts",
    foundationsTitle: "One semantic contract. Multiple visual foundations.",
    foundationsBody:
      "Color, type, and shape can change while component structure, interaction state, and accessible behavior stay intact.",
    principles: [
      {
        title: "Use the platform",
        body: "Native controls and semantic landmarks come first. JavaScript appears only when the browser does not supply the interaction.",
      },
      {
        title: "Keep one contract",
        body: "CSS variables and documented data attributes adapt the interface without forking structure or accessibility behavior.",
      },
      {
        title: "Design for dense work",
        body: "Compact chrome, predictable focus, and responsive workspaces keep complex product surfaces legible.",
      },
    ],
    principlesTitle: "Three non-negotiables.",
    ctaTitle: "Start with a real interface.",
    ctaBody:
      "Install @a3s-lab/ui, choose a visual foundation, then copy working markup from App Shell or any component contract.",
    installation: "View installation",
    explore: "Browse component contracts",
    workspace: "WORKSPACE / RECENT",
    continue: "Continue where you left off",
    newResource: "New resource",
    properties: "Properties",
    resource: "Resource",
    surface: "Surface",
    canvas: "Canvas",
    accent: "ACCENT",
    saved: "Saved",
    ribbonControls: "controls",
    workbenchRegion: "Interactive A3S Office workbench specimen",
  },
} as const;

function localeValue(value: Localized, locale: Locale) {
  return value[locale];
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 .9a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.14c-3.14.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.66-1.25-1.66-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.17 1.72 1.17 1 1.73 2.64 1.24 3.28.95.1-.73.39-1.24.71-1.52-2.5-.29-5.14-1.27-5.14-5.56 0-1.23.44-2.24 1.16-3.03-.12-.29-.5-1.44.11-3 0 0 .94-.3 3.08 1.16a10.58 10.58 0 0 1 5.61 0c2.14-1.46 3.08-1.16 3.08-1.16.61 1.56.23 2.71.11 3 .72.79 1.16 1.8 1.16 3.03 0 4.3-2.64 5.27-5.15 5.55.4.35.77 1.04.77 2.1v3.12c0 .3.21.65.78.54A11.2 11.2 0 0 0 12 .9Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m3.2 8.4 3 3 6.6-6.8" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <rect x="5.5" y="5.5" width="7" height="7" rx="1.5" />
      <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
    </svg>
  );
}

function WorkbenchSpecimen({ locale }: { locale: Locale }) {
  const labels = homeCopy[locale];
  const [selectedResource, setSelectedResource] = useState("presentation");
  const [activeRibbon, setActiveRibbon] = useState("Insert");
  const ribbonTabs = [
    { id: "Home", zh: "开始", en: "Home" },
    { id: "Insert", zh: "插入", en: "Insert" },
    { id: "Layout", zh: "布局", en: "Layout" },
    { id: "Review", zh: "审阅", en: "Review" },
  ] as const;
  const selectedResourceLabel = resourceKinds.find(
    (resource) => resource.id === selectedResource,
  )?.label[locale];

  const moveRibbonFocus = (
    event: import("react").KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % ribbonTabs.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + ribbonTabs.length) % ribbonTabs.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = ribbonTabs.length - 1;
    if (nextIndex === index) return;
    event.preventDefault();
    setActiveRibbon(ribbonTabs[nextIndex].id);
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    tabs?.[nextIndex]?.focus();
  };

  return (
    <div
      className="ui-workbench-frame"
      role="region"
      aria-label={labels.workbenchRegion}
    >
      <div className="ui-workbench-windowbar">
        <span className="ui-window-controls" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong>A3S Office</strong>
        <span data-save-state>
          <i /> {labels.saved}
        </span>
      </div>
      <div className="app-shell ui-workbench-shell" data-navigation="collapsed">
        <aside data-app-navigation aria-hidden="true">
          <div className="activity-bar" data-labels="hidden">
            <header>
              <span className="ui-office-mark">A</span>
              <span data-navigation-label>A3S</span>
            </header>
            <nav
              aria-label={locale === "zh" ? "工作区工具" : "Workspace tools"}
            >
              <ul>
                <li>
                  <span data-specimen-control data-selected="true">
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M4 4h6l2 2h8v14H4zM8 11h8M8 15h5" />
                    </svg>
                    <span data-navigation-label>
                      {locale === "zh" ? "文件" : "Files"}
                    </span>
                  </span>
                </li>
                <li>
                  <span data-specimen-control>
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="6" />
                      <path d="m16 16 4 4" />
                    </svg>
                    <span data-navigation-label>
                      {locale === "zh" ? "搜索" : "Search"}
                    </span>
                  </span>
                </li>
                <li>
                  <span data-specimen-control>
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="m12 3 2.1 5.9L20 11l-5.9 2.1L12 19l-2.1-5.9L4 11l5.9-2.1z" />
                    </svg>
                    <span data-navigation-label>
                      {locale === "zh" ? "智能体" : "Agents"}
                    </span>
                  </span>
                </li>
              </ul>
            </nav>
            <footer>
              <span className="btn" data-size="icon-sm" data-variant="ghost">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
                </svg>
              </span>
            </footer>
          </div>
        </aside>
        <div data-app-main>
          <header className="workspace-header">
            <div data-workspace-leading>
              <span className="btn" data-size="icon-sm" data-variant="ghost">
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </span>
              <span className="ui-file-kind-mark">P</span>
            </div>
            <div data-workspace-identity>
              <strong data-workspace-title>
                {locale === "zh" ? "项目复盘" : "Project review"}
              </strong>
              <span>
                {locale === "zh"
                  ? "演示文稿，刚刚保存"
                  : "Presentation, saved just now"}
              </span>
            </div>
            <div data-workspace-actions aria-hidden="true">
              <span
                className="btn"
                data-size="sm"
                data-variant="outline"
                data-collapse="mobile"
              >
                {locale === "zh" ? "预览" : "Preview"}
              </span>
              <span className="btn" data-size="sm">
                {locale === "zh" ? "导出" : "Export"}
              </span>
            </div>
          </header>
          <div className="ribbon tabs" data-accent="orange">
            <div
              role="tablist"
              aria-label={locale === "zh" ? "功能区" : "Ribbon"}
            >
              {ribbonTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`ui-ribbon-${tab.id}`}
                  aria-selected={activeRibbon === tab.id}
                  aria-controls={`ui-ribbon-panel-${tab.id}`}
                  tabIndex={activeRibbon === tab.id ? 0 : -1}
                  onClick={() => setActiveRibbon(tab.id)}
                  onKeyDown={(event) => moveRibbonFocus(event, index)}
                >
                  {tab[locale]}
                </button>
              ))}
            </div>
            {ribbonTabs.map((tab) => (
              <div
                key={`${tab.id}-panel`}
                role="tabpanel"
                id={`ui-ribbon-panel-${tab.id}`}
                aria-labelledby={`ui-ribbon-${tab.id}`}
                hidden={activeRibbon !== tab.id}
              >
                <fieldset data-ribbon-group>
                  <legend>{locale === "zh" ? "字体" : "Font"}</legend>
                  <div data-ribbon-controls aria-hidden="true">
                    <span
                      className="btn"
                      data-size="icon-sm"
                      data-variant="ghost"
                    >
                      <strong>B</strong>
                    </span>
                    <span
                      className="btn"
                      data-size="icon-sm"
                      data-variant="ghost"
                    >
                      <em>I</em>
                    </span>
                    <span
                      className="btn"
                      data-size="icon-sm"
                      data-variant="ghost"
                    >
                      <span className="underline">U</span>
                    </span>
                  </div>
                </fieldset>
                <fieldset data-ribbon-group>
                  <legend>{locale === "zh" ? "段落" : "Paragraph"}</legend>
                  <div data-ribbon-controls aria-hidden="true">
                    <span
                      className="btn"
                      data-size="icon-sm"
                      data-variant="ghost"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M4 6h16M4 10h11M4 14h16M4 18h9" />
                      </svg>
                    </span>
                    <span
                      className="btn"
                      data-size="icon-sm"
                      data-variant="ghost"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M8 6h12M8 12h12M8 18h12" />
                        <circle cx="4" cy="6" r="1" />
                        <circle cx="4" cy="12" r="1" />
                        <circle cx="4" cy="18" r="1" />
                      </svg>
                    </span>
                  </div>
                </fieldset>
                <fieldset data-ribbon-group>
                  <legend>{tab[locale]}</legend>
                  <div data-ribbon-controls aria-hidden="true">
                    <span className="btn" data-size="sm" data-variant="ghost">
                      {locale === "zh" ? "图片" : "Picture"}
                    </span>
                    <span className="btn" data-size="sm" data-variant="ghost">
                      {locale === "zh" ? "批注" : "Comment"}
                    </span>
                  </div>
                </fieldset>
              </div>
            ))}
          </div>
          <div data-app-content className="ui-office-workspace">
            <section className="ui-office-resource-stage">
              <header className="ui-office-section-heading">
                <div>
                  <small>{labels.workspace}</small>
                  <h2>{labels.continue}</h2>
                </div>
                <span
                  className="btn"
                  data-size="sm"
                  data-variant="outline"
                  aria-hidden="true"
                >
                  {labels.newResource}&nbsp; +
                </span>
              </header>
              <div className="resource-grid">
                {resourceKinds.map((resource) => (
                  <button
                    key={resource.id}
                    type="button"
                    className="resource-card"
                    data-kind={resource.id}
                    data-selected={selectedResource === resource.id}
                    aria-pressed={selectedResource === resource.id}
                    onClick={() => setSelectedResource(resource.id)}
                  >
                    <figure>
                      <span className="ui-resource-preview-mark">
                        {resource.icon}
                      </span>
                    </figure>
                    <section>
                      <strong>{resource.label[locale]}</strong>
                      <small>{resource.meta[locale]}</small>
                    </section>
                  </button>
                ))}
              </div>
            </section>
            <aside
              className="task-pane ui-office-task-pane"
              data-responsive="overlay"
            >
              <header>
                <strong>{labels.properties}</strong>
                <span
                  className="btn"
                  data-size="icon-xs"
                  data-variant="ghost"
                  aria-hidden="true"
                >
                  ×
                </span>
              </header>
              <section>
                <div className="field">
                  <label htmlFor="ui-specimen-resource">
                    {labels.resource}
                  </label>
                  <input
                    id="ui-specimen-resource"
                    value={selectedResourceLabel}
                    readOnly
                  />
                </div>
                <div className="field">
                  <label htmlFor="ui-specimen-surface">{labels.surface}</label>
                  <input
                    id="ui-specimen-surface"
                    value={labels.canvas}
                    readOnly
                  />
                </div>
                <fieldset className="ui-office-swatches">
                  <legend>{labels.accent}</legend>
                  <div aria-hidden="true">
                    <span data-specimen-swatch data-selected="true" />
                    <span data-specimen-swatch />
                    <span data-specimen-swatch />
                    <span data-specimen-swatch />
                  </div>
                </fieldset>
              </section>
            </aside>
          </div>
          <footer
            className="status-bar"
            aria-label={locale === "zh" ? "工作区状态" : "Workspace status"}
          >
            <div data-status-info>
              <span>
                {locale === "zh" ? "3 个最近资源" : "3 recent resources"}
              </span>
              <span>{labels.saved}</span>
            </div>
            <div data-status-actions>
              <output>{locale === "zh" ? "浅色" : "Light"}</output>
              <hr role="separator" />
              <span
                className="btn"
                data-size="icon-xs"
                data-variant="ghost"
                aria-hidden="true"
              >
                −
              </span>
              <output>90%</output>
              <span
                className="btn"
                data-size="icon-xs"
                data-variant="ghost"
                aria-hidden="true"
              >
                +
              </span>
            </div>
          </footer>
        </div>
      </div>
      <div
        className="ui-specimen-measure ui-specimen-measure--x"
        aria-hidden="true"
      >
        <span>8</span>
      </div>
      <div
        className="ui-specimen-measure ui-specimen-measure--y"
        aria-hidden="true"
      >
        <span>16</span>
      </div>
    </div>
  );
}

export function HomeLayout() {
  const rawLang = useLang();
  const locale: Locale = rawLang === "zh" ? "zh" : "en";
  const labels = homeCopy[locale];
  const version = useVersion();
  const { site } = useSite();
  const defaultVersion = site.multiVersion.default;
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copyResetTimer = useRef<number | null>(null);
  const routePrefix = [
    version && version !== defaultVersion ? version : "",
    locale !== site.lang ? locale : "",
  ]
    .filter(Boolean)
    .join("/");
  const route = (pathname: string) => {
    const normalizedPath = pathname.replace(/^\/+/, "");
    const parts = [routePrefix, normalizedPath].filter(Boolean).join("/");
    return withBase(`/${parts}`);
  };
  const installationHref = route("/installation");
  const componentsHref = route("/components/");
  const installVersion =
    version && version !== defaultVersion
      ? `@${version.replace(/^v/, "")}`
      : "";
  const installCommand = `npm install @a3s-lab/ui${installVersion}`;
  const copyFeedback =
    copyStatus === "copied"
      ? labels.copied
      : copyStatus === "error"
        ? labels.copyError
        : labels.copy;

  useEffect(
    () => () => {
      if (copyResetTimer.current !== null) {
        window.clearTimeout(copyResetTimer.current);
      }
    },
    [],
  );

  const scheduleCopyReset = (delay: number) => {
    if (copyResetTimer.current !== null) {
      window.clearTimeout(copyResetTimer.current);
    }
    copyResetTimer.current = window.setTimeout(() => {
      setCopyStatus("idle");
      copyResetTimer.current = null;
    }, delay);
  };

  const copyInstallCommand = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
    } catch {
      setCopyStatus("error");
      scheduleCopyReset(4000);
      return;
    }

    setCopyStatus("copied");
    scheduleCopyReset(1800);
  };

  return (
    <main className="ui-home">
      <section className="ui-hero">
        <div className="ui-hero__copy">
          <div className="ui-kicker">
            <span /> {labels.kicker}
          </div>
          <h1>
            {labels.titleLead}
            <span>{labels.titleAccent}</span>
          </h1>
          <p>{labels.subtitle}</p>
          <div className="ui-hero__actions">
            <a className="ui-action ui-action--primary" href={installationHref}>
              {labels.start} <ArrowIcon />
            </a>
            <a
              className="ui-action ui-action--secondary"
              href="https://github.com/A3S-Lab/UI"
            >
              <GitHubIcon /> {labels.github}
            </a>
          </div>
          <div
            className="ui-install-command"
            aria-label={labels.installCommandLabel}
          >
            <span>$</span>
            <code>{installCommand}</code>
            <button
              type="button"
              onClick={copyInstallCommand}
              aria-label={copyFeedback}
              data-copy-state={copyStatus}
            >
              {copyStatus === "copied" ? <CheckIcon /> : <CopyIcon />}
              <span aria-live="polite" aria-atomic="true">
                {copyFeedback}
              </span>
            </button>
          </div>
          <dl className="ui-hero__facts">
            <div>
              <dt>64</dt>
              <dd>{labels.componentGuides}</dd>
            </div>
            <div>
              <dt>06</dt>
              <dd>{labels.foundationSystems}</dd>
            </div>
            <div>
              <dt>00</dt>
              <dd>{labels.runtimeDependencies}</dd>
            </div>
          </dl>
        </div>
        <div className="ui-hero__specimen">
          <div className="ui-specimen-label">
            <span>{labels.liveSpecimen}</span>
            <small>{labels.specimenMeta}</small>
          </div>
          <WorkbenchSpecimen locale={locale} />
        </div>
      </section>

      <section className="ui-section ui-catalog">
        <header className="ui-section__header">
          <h2>{labels.catalogTitle}</h2>
          <p>{labels.catalogBody}</p>
        </header>
        <div className="ui-family-grid">
          {componentFamilies.map((family) => (
            <a key={family.href} href={route(family.href)}>
              <strong>{localeValue(family.title, locale)}</strong>
              <p>{localeValue(family.description, locale)}</p>
              <footer>
                <span className="ui-family-grid__category">
                  {localeValue(family.category, locale)}
                </span>
                <span className="ui-family-grid__count">
                  {family.count} {labels.guides} <ArrowIcon />
                </span>
              </footer>
            </a>
          ))}
        </div>
        <a className="ui-catalog__all" href={componentsHref}>
          {labels.browseCatalog} <ArrowIcon />
        </a>
      </section>

      <ThemeCustomizer locale={locale} />

      <section
        className="ui-proof-strip"
        aria-label={
          locale === "zh" ? "A3S UI 交付边界" : "A3S UI delivery boundaries"
        }
      >
        {[
          labels.semanticHtml,
          labels.nativeBehavior,
          labels.applicationPatterns,
          labels.bidirectionalLayout,
          labels.serverTemplates,
        ].map((label) => (
          <div key={label}>
            <CheckIcon />
            <strong>{label}</strong>
          </div>
        ))}
      </section>

      <section className="ui-section ui-system">
        <header className="ui-section__header">
          <h2>{labels.foundationsTitle}</h2>
          <p>{labels.foundationsBody}</p>
        </header>
        <div className="ui-system__board">
          <div className="ui-token-colors">
            <span style={{ background: "#4f7ff0" }}>ACTION</span>
            <span style={{ background: "#28a978" }}>SUCCESS</span>
            <span style={{ background: "#9a63df" }}>AGENT</span>
            <span style={{ background: "#e4a43b" }}>ATTENTION</span>
            <span style={{ background: "#d84e62" }}>DANGER</span>
          </div>
          <div className="ui-token-type">
            <span>TYPE SCALE</span>
            <strong>Aa</strong>
            <p>Geist Sans</p>
            <code>12 / 14 / 16 / 20 / 32 / 64</code>
          </div>
          <div className="ui-token-spacing">
            <span>SPACING SCALE</span>
            {[1, 2, 3, 4, 6, 8].map((step) => (
              <i key={step} style={{ width: `${step * 18}px` }}>
                {step * 4}
              </i>
            ))}
          </div>
          <div className="ui-token-shape">
            <span>CONTROL SHAPE</span>
            <i />
            <i />
            <i />
            <code>R06 / R10 / R14</code>
          </div>
        </div>
      </section>

      <section className="ui-principles" aria-labelledby="ui-principles-title">
        <header>
          <h2 id="ui-principles-title">{labels.principlesTitle}</h2>
        </header>
        <div className="ui-principles__list">
          {labels.principles.map((principle) => (
            <article key={principle.title}>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ui-cta">
        <div>
          <h2>{labels.ctaTitle}</h2>
          <p>{labels.ctaBody}</p>
        </div>
        <div>
          <a className="ui-action ui-action--primary" href={installationHref}>
            {labels.installation} <ArrowIcon />
          </a>
          <a className="ui-action ui-action--secondary" href={componentsHref}>
            {labels.explore}
          </a>
        </div>
      </section>
    </main>
  );
}
