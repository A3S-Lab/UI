import { useState } from 'react';
import { useLang, useSite, useVersion, withBase } from '@rspress/core/runtime';

type Locale = 'zh' | 'en';

type Localized = {
  zh: string;
  en: string;
};

type ComponentFamily = {
  code: string;
  count: string;
  description: Localized;
  href: string;
  title: Localized;
};

const componentFamilies: ComponentFamily[] = [
  {
    code: '01 / INPUT',
    count: '12',
    description: {
      zh: '字段、选择器、开关、滑块，以及可访问的表单组合。',
      en: 'Fields, selects, switches, sliders, and accessible form composition.',
    },
    href: '/components/field',
    title: { zh: '表单', en: 'Forms' },
  },
  {
    code: '02 / WAYFINDING',
    count: '05',
    description: {
      zh: '活动栏、面包屑、标签页、分页与产品侧边栏。',
      en: 'Activity rails, breadcrumbs, tabs, pagination, and product sidebars.',
    },
    href: '/components/activity-bar',
    title: { zh: '导航', en: 'Navigation' },
  },
  {
    code: '03 / LAYERS',
    count: '07',
    description: {
      zh: '对话框、抽屉、菜单、浮层、命令面板与上下文帮助。',
      en: 'Dialogs, drawers, menus, popovers, commands, and contextual help.',
    },
    href: '/components/dialog',
    title: { zh: '浮层', en: 'Overlays' },
  },
  {
    code: '04 / SIGNALS',
    count: '07',
    description: {
      zh: '警告、徽标、进度、骨架屏、加载状态与 Toast 反馈。',
      en: 'Alerts, badges, progress, skeletons, spinners, and toast feedback.',
    },
    href: '/components/alert',
    title: { zh: '反馈', en: 'Feedback' },
  },
  {
    code: '05 / CONTENT',
    count: '07',
    description: {
      zh: '卡片、图表、表格、列表项、头像与结构化信息展示。',
      en: 'Cards, charts, tables, items, avatars, and structured disclosure.',
    },
    href: '/components/card',
    title: { zh: '数据展示', en: 'Data display' },
  },
  {
    code: '06 / WORKBENCH',
    count: '08',
    description: {
      zh: '应用外壳、功能区、工具栏、分割面板与资源网格。',
      en: 'Application shells, ribbons, toolbars, split panes, and resource grids.',
    },
    href: '/components/app-shell',
    title: { zh: '应用模式', en: 'Application patterns' },
  },
];

const resourceKinds = [
  {
    icon: 'Aa',
    id: 'document',
    label: { zh: '文档', en: 'Document' },
    meta: { zh: '空白画布', en: 'Blank canvas' },
  },
  {
    icon: '▦',
    id: 'spreadsheet',
    label: { zh: '预算模型', en: 'Budget model' },
    meta: { zh: '12 个工作表', en: '12 sheets' },
  },
  {
    icon: '▤',
    id: 'presentation',
    label: { zh: '项目复盘', en: 'Project review' },
    meta: { zh: '24 张幻灯片', en: '24 slides' },
  },
] as const;

const homeCopy = {
  zh: {
    kicker: 'A3S 产品设计系统',
    titleLead: '让每个界面',
    titleAccent: '都像同一个产品。',
    subtitle:
      '源自 A3S Office、智能体工作区和运维控制台的可复用视觉语言，以语义化 HTML、Tailwind CSS 与轻量原生 JavaScript 控制器交付。',
    start: '开始使用',
    github: '查看 GitHub',
    copy: '复制安装命令',
    copied: '已复制',
    componentGuides: '组件指南',
    foundationSystems: '基础系统',
    runtimeDependencies: '运行时依赖',
    liveSpecimen: '实时样例',
    specimenMeta: '可交互 OFFICE 工作台',
    semanticHtml: '语义化 HTML',
    lightDark: '浅色 + 深色',
    responsiveRtl: '响应式 + RTL',
    accessibleStates: '可访问状态',
    templates: 'Nunjucks + Jinja',
    catalogEyebrow: '组件目录 / 50 篇指南',
    catalogTitle: '从基础控件到完整工作台。',
    catalogBody:
      '每篇指南都包含实时样例、最小标记、参数、变体、状态行为与可访问性说明。',
    guides: '篇指南',
    browseCatalog: '浏览完整组件目录',
    foundationsEyebrow: '设计基础 / 系统令牌',
    foundationsTitle: '一套系统，覆盖每个 A3S 界面。',
    foundationsBody:
      '产品语义只定义一次，并在文档工具、Coding Agent 界面与可观测控制台之间共享。',
    principles: [
      {
        title: '平台优先',
        body: '以原生控件和语义化地标为基础；只有平台无法提供的交互才使用 JavaScript。',
      },
      {
        title: '参数，而不是分叉',
        body: '通过 CSS 变量和明确的数据属性适配组件，不复制结构，也不牺牲可访问行为。',
      },
      {
        title: '面向生产力应用的密度',
        body: '清晰层级、紧凑工具栏、可预测焦点，以及能承受复杂业务的响应式布局。',
      },
    ],
    ctaEyebrow: '开始组合',
    ctaTitle: '构建下一个 A3S 界面。',
    ctaBody: '安装组件包、选择设计基础，然后从任意组件指南复制语义化标记。',
    installation: '安装指南',
    explore: '探索组件',
    workspace: '工作区 / 最近使用',
    continue: '继续上次工作',
    newResource: '新建资源',
    properties: '属性',
    resource: '资源',
    surface: '表面',
    canvas: '画布',
    accent: '强调色',
    saved: '已保存',
    ribbonControls: '控件',
  },
  en: {
    kicker: 'A3S PRODUCT DESIGN SYSTEM',
    titleLead: 'Interfaces that feel',
    titleAccent: 'like one product.',
    subtitle:
      'The reusable visual language behind A3S Office, agent workspaces, and operational consoles—delivered as semantic HTML, Tailwind CSS, and small vanilla JavaScript controllers.',
    start: 'Get started',
    github: 'GitHub',
    copy: 'Copy install command',
    copied: 'Copied',
    componentGuides: 'Component guides',
    foundationSystems: 'Foundation systems',
    runtimeDependencies: 'Runtime dependencies',
    liveSpecimen: 'LIVE SPECIMEN',
    specimenMeta: 'INTERACTIVE OFFICE WORKBENCH',
    semanticHtml: 'Semantic HTML',
    lightDark: 'Light + dark',
    responsiveRtl: 'Responsive + RTL',
    accessibleStates: 'Accessible states',
    templates: 'Nunjucks + Jinja',
    catalogEyebrow: 'COMPONENT CATALOG / 50 GUIDES',
    catalogTitle: 'From controls to complete workspaces.',
    catalogBody:
      'Each guide includes a live specimen, minimal markup, parameters, variants, state behavior, and accessibility notes.',
    guides: 'GUIDES',
    browseCatalog: 'Browse the complete component catalog',
    foundationsEyebrow: 'FOUNDATIONS / SYSTEM TOKENS',
    foundationsTitle: 'One system. Every A3S surface.',
    foundationsBody:
      'Product semantics are encoded once, then shared across document tools, coding-agent interfaces, and observability consoles.',
    principles: [
      {
        title: 'Platform first',
        body: 'Native controls and semantic landmarks remain the foundation. JavaScript is reserved for behavior that the platform does not provide.',
      },
      {
        title: 'Parameters, not forks',
        body: 'CSS variables and documented data attributes adapt components without duplicating their structure or accessibility behavior.',
      },
      {
        title: 'Application density',
        body: 'The system is tuned for serious workspaces: clear hierarchy, compact chrome, predictable focus, and resilient responsive layouts.',
      },
    ],
    ctaEyebrow: 'START COMPOSING',
    ctaTitle: 'Build the next A3S interface.',
    ctaBody:
      'Install the package, choose a foundation, and copy the semantic markup from any component guide.',
    installation: 'Installation',
    explore: 'Explore components',
    workspace: 'WORKSPACE / RECENT',
    continue: 'Continue where you left off',
    newResource: 'New resource',
    properties: 'Properties',
    resource: 'Resource',
    surface: 'Surface',
    canvas: 'Canvas',
    accent: 'ACCENT',
    saved: 'Saved',
    ribbonControls: 'controls',
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
  const [selectedResource, setSelectedResource] = useState('presentation');
  const [activeRibbon, setActiveRibbon] = useState('Insert');
  const ribbonTabs = [
    { id: 'Home', zh: '开始', en: 'Home' },
    { id: 'Insert', zh: '插入', en: 'Insert' },
    { id: 'Layout', zh: '布局', en: 'Layout' },
    { id: 'Review', zh: '审阅', en: 'Review' },
  ] as const;
  const selectedResourceLabel = resourceKinds.find(
    (resource) => resource.id === selectedResource,
  )?.label[locale];

  return (
    <div
      className="ui-workbench"
      aria-label="Interactive A3S Office workbench specimen"
    >
      <div className="ui-workbench__titlebar">
        <span className="ui-window-controls" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong>A3S Office</strong>
        <span className="ui-workbench__sync">
          <i /> {labels.saved}
        </span>
      </div>
      <div className="ui-workbench__body">
        <aside className="ui-workbench__activity" aria-label="Workspace tools">
          <span className="ui-workbench__brand">A</span>
          <button type="button" className="is-active" aria-label="Files">
            ▦
          </button>
          <button type="button" aria-label="Search">
            ⌕
          </button>
          <button type="button" aria-label="Agents">
            ◇
          </button>
          <button type="button" aria-label="Settings">
            ⚙
          </button>
        </aside>
        <main className="ui-workbench__main">
          <div className="ui-workbench__ribbon" aria-label="Ribbon sections">
            {ribbonTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeRibbon === tab.id}
                onClick={() => setActiveRibbon(tab.id)}
              >
                {tab[locale]}
              </button>
            ))}
          </div>
          <div
            className="ui-workbench__toolbar"
            aria-label={`${activeRibbon} tools`}
          >
            <button type="button">
              <b>B</b>
            </button>
            <button type="button">
              <i>I</i>
            </button>
            <span />
            <button type="button">{locale === 'zh' ? '对齐' : 'Align'}</button>
            <button type="button">
              {locale === 'zh' ? '排列' : 'Arrange'}
            </button>
            <small>
              {ribbonTabs.find((tab) => tab.id === activeRibbon)?.[locale]}{' '}
              {labels.ribbonControls}
            </small>
          </div>
          <div className="ui-workbench__content">
            <section>
              <header>
                <div>
                  <small>{labels.workspace}</small>
                  <h2>{labels.continue}</h2>
                </div>
                <button type="button">{labels.newResource}&nbsp; +</button>
              </header>
              <div className="ui-resource-grid">
                {resourceKinds.map((resource) => (
                  <button
                    key={resource.id}
                    type="button"
                    data-kind={resource.id}
                    data-selected={selectedResource === resource.id}
                    aria-pressed={selectedResource === resource.id}
                    onClick={() => setSelectedResource(resource.id)}
                  >
                    <span>{resource.icon}</span>
                    <strong>{resource.label[locale]}</strong>
                    <small>{resource.meta[locale]}</small>
                    {selectedResource === resource.id ? (
                      <i aria-hidden="true" />
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
            <aside className="ui-properties" aria-label="Properties specimen">
              <header>
                <strong>{labels.properties}</strong>
                <span>•••</span>
              </header>
              <label>
                {labels.resource}
                <span>{selectedResourceLabel}</span>
              </label>
              <label>
                {labels.surface}
                <span>{labels.canvas}</span>
              </label>
              <div>
                <small>{labels.accent}</small>
                <span className="ui-swatches">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            </aside>
          </div>
        </main>
      </div>
      <div
        className="ui-workbench__measure ui-workbench__measure--x"
        aria-hidden="true"
      >
        <span>8</span>
      </div>
      <div
        className="ui-workbench__measure ui-workbench__measure--y"
        aria-hidden="true"
      >
        <span>16</span>
      </div>
    </div>
  );
}

export function HomeLayout() {
  const rawLang = useLang();
  const locale: Locale = rawLang === 'zh' ? 'zh' : 'en';
  const labels = homeCopy[locale];
  const version = useVersion();
  const { site } = useSite();
  const defaultVersion = site.multiVersion.default;
  const [copied, setCopied] = useState(false);
  const routePrefix = [
    version && version !== defaultVersion ? version : '',
    locale !== site.lang ? locale : '',
  ]
    .filter(Boolean)
    .join('/');
  const route = (pathname: string) => {
    const normalizedPath = pathname.replace(/^\/+/, '');
    const parts = [routePrefix, normalizedPath].filter(Boolean).join('/');
    return withBase(`/${parts}`);
  };
  const installationHref = route('/installation');
  const componentsHref = route('/components/');
  const installCommand = 'npm install github:A3S-Lab/UI';
  const copyInstallCommand = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
    } catch {
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
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
            aria-label="npm installation command"
          >
            <span>$</span>
            <code>{installCommand}</code>
            <button
              type="button"
              onClick={copyInstallCommand}
              aria-label={copied ? labels.copied : labels.copy}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span aria-live="polite">
                {copied ? labels.copied : labels.copy}
              </span>
            </button>
          </div>
          <dl className="ui-hero__facts">
            <div>
              <dt>50</dt>
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
          <div className="ui-specimen-notes" aria-hidden="true">
            <span>04PX BASELINE</span>
            <span>SEMANTIC STATES</span>
            <span>KEYBOARD READY</span>
          </div>
        </div>
      </section>

      <section
        className="ui-proof-strip"
        aria-label={
          locale === 'zh' ? '设计系统能力' : 'Design system qualities'
        }
      >
        {[
          ['01', labels.semanticHtml],
          ['02', labels.lightDark],
          ['03', labels.responsiveRtl],
          ['04', labels.accessibleStates],
          ['05', labels.templates],
        ].map(([index, label]) => (
          <div key={index}>
            <span>{index}</span>
            <strong>{label}</strong>
            <CheckIcon />
          </div>
        ))}
      </section>

      <section className="ui-section ui-catalog">
        <header className="ui-section__header">
          <div>
            <span className="ui-section__eyebrow">{labels.catalogEyebrow}</span>
            <h2>{labels.catalogTitle}</h2>
          </div>
          <p>{labels.catalogBody}</p>
        </header>
        <div className="ui-family-grid">
          {componentFamilies.map((family) => (
            <a key={family.code} href={route(family.href)}>
              <span className="ui-family-grid__code">{family.code}</span>
              <strong>{localeValue(family.title, locale)}</strong>
              <p>{localeValue(family.description, locale)}</p>
              <footer>
                <span>
                  {family.count} {labels.guides}
                </span>
                <ArrowIcon />
              </footer>
            </a>
          ))}
        </div>
        <a className="ui-catalog__all" href={componentsHref}>
          {labels.browseCatalog} <ArrowIcon />
        </a>
      </section>

      <section className="ui-section ui-system">
        <header className="ui-section__header">
          <div>
            <span className="ui-section__eyebrow">
              {labels.foundationsEyebrow}
            </span>
            <h2>{labels.foundationsTitle}</h2>
          </div>
          <p>{labels.foundationsBody}</p>
        </header>
        <div className="ui-system__board">
          <div className="ui-token-colors">
            <span style={{ background: '#4f7ff0' }}>ACTION</span>
            <span style={{ background: '#28a978' }}>SUCCESS</span>
            <span style={{ background: '#9a63df' }}>AGENT</span>
            <span style={{ background: '#e4a43b' }}>ATTENTION</span>
            <span style={{ background: '#d84e62' }}>DANGER</span>
          </div>
          <div className="ui-token-type">
            <span>TYPE / 01</span>
            <strong>Aa</strong>
            <p>Geist Sans</p>
            <code>12 · 14 · 16 · 20 · 32 · 64</code>
          </div>
          <div className="ui-token-spacing">
            <span>SPACE / 04PX</span>
            {[1, 2, 3, 4, 6, 8].map((step) => (
              <i key={step} style={{ width: `${step * 18}px` }}>
                {step * 4}
              </i>
            ))}
          </div>
          <div className="ui-token-shape">
            <span>SHAPE / CONTROL</span>
            <i />
            <i />
            <i />
            <code>R06 · R10 · R14</code>
          </div>
        </div>
      </section>

      <section className="ui-principles">
        {labels.principles.map((principle, index) => (
          <article key={principle.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
          </article>
        ))}
      </section>

      <section className="ui-cta">
        <div>
          <span className="ui-section__eyebrow">{labels.ctaEyebrow}</span>
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
