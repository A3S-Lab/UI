import { useId, useMemo, useRef, useState } from "react";
import { useLang, useVersion, withBase } from "@rspress/core/runtime";
import {
  ProductPlaygroundIcon,
  type ProductPlaygroundIconName,
} from "./playground/ProductPlaygroundIcon";
import "./PatternCatalog.css";
import "./PatternCatalogResponsive.css";

type CatalogLanguage = "en" | "zh";
type PatternCategory = "governance" | "integration" | "workflow";
type LocalizedText = Record<CatalogLanguage, string>;

type PatternRecord = {
  category: PatternCategory;
  description: LocalizedText;
  icon: ProductPlaygroundIconName;
  label: LocalizedText;
  slug: string;
};

const patternRecords: readonly PatternRecord[] = [
  {
    category: "workflow",
    description: {
      en: "Long-running navigation, transcript, planning, evidence, and review.",
      zh: "组合长期任务导航、连续记录、计划、执行证据与审阅。",
    },
    icon: "workspace",
    label: { en: "Task workspace", zh: "任务工作区" },
    slug: "task-workspace",
  },
  {
    category: "workflow",
    description: {
      en: "Collect the first instruction, workspace, model, and permissions.",
      zh: "收集第一条指令、工作区、模型与权限。",
    },
    icon: "task-add",
    label: { en: "New task", zh: "新建任务" },
    slug: "new-task",
  },
  {
    category: "workflow",
    description: {
      en: "Manage durable project context and start from a known structure.",
      zh: "管理长期项目上下文，并从模板建立初始结构。",
    },
    icon: "project",
    label: { en: "Projects", zh: "项目" },
    slug: "projects",
  },
  {
    category: "governance",
    description: {
      en: "Discover templates, configure schedules, and inspect run history.",
      zh: "发现模板、配置计划并查看运行历史。",
    },
    icon: "automation",
    label: { en: "Automations", zh: "自动化" },
    slug: "automations",
  },
  {
    category: "governance",
    description: {
      en: "Browse assistants, skills, and connectors through one catalog shell.",
      zh: "在同一套目录骨架中浏览助理、技能与连接器。",
    },
    icon: "catalog",
    label: { en: "Capability catalog", zh: "能力目录" },
    slug: "capability-catalog",
  },
  {
    category: "governance",
    description: {
      en: "Organize application settings with stable secondary navigation.",
      zh: "使用稳定的二级导航组织广泛的应用设置。",
    },
    icon: "settings",
    label: { en: "Settings center", zh: "设置中心" },
    slug: "settings-center",
  },
  {
    category: "integration",
    description: {
      en: "Define ownership, keyboard behavior, and recovery for reusable recipes.",
      zh: "明确可重复组合的所有权、键盘行为与失败恢复。",
    },
    icon: "checklist",
    label: { en: "Composition recipes", zh: "组合方案" },
    slug: "composition-recipes",
  },
  {
    category: "integration",
    description: {
      en: "Keep provider identity, remote services, and host capabilities bounded.",
      zh: "划清供应商身份、远程服务与宿主能力的边界。",
    },
    icon: "shield",
    label: { en: "Host integrations", zh: "宿主集成边界" },
    slug: "host-integrations",
  },
  {
    category: "integration",
    description: {
      en: "Preserve one task and state model across landmarks and mobile layouts.",
      zh: "让地标表面与移动布局保留同一任务和状态模型。",
    },
    icon: "menu",
    label: { en: "Landmarks and mobile", zh: "地标与移动端组合" },
    slug: "landmarks-and-mobile",
  },
];

const primaryPatternSlugs = [
  "new-task",
  "task-workspace",
  "projects",
  "capability-catalog",
  "automations",
] as const;

const morePatternSlugs = [
  "composition-recipes",
  "host-integrations",
  "settings-center",
  "landmarks-and-mobile",
] as const;

const categoryLabels: Record<"all" | PatternCategory, LocalizedText> = {
  all: { en: "All", zh: "全部" },
  governance: { en: "Governance", zh: "治理与配置" },
  integration: { en: "Integration", zh: "接入与适配" },
  workflow: { en: "Workflows", zh: "任务工作流" },
};

const categoryOrder: readonly ("all" | PatternCategory)[] = [
  "all",
  "workflow",
  "governance",
  "integration",
];

function localize(text: LocalizedText, language: CatalogLanguage) {
  return text[language];
}

function patternHref(slug: string, language: CatalogLanguage, version: string) {
  const parts = [
    version === "next" ? "" : version,
    language === "zh" ? "" : language,
    "patterns",
    `${slug}.html`,
  ].filter(Boolean);

  return withBase(`/${parts.join("/")}`);
}

function patternBySlug(slug: string) {
  const record = patternRecords.find((item) => item.slug === slug);
  if (!record) throw new Error(`Unknown pattern: ${slug}`);
  return record;
}

function PatternDiagram() {
  return (
    <svg
      aria-hidden="true"
      className="pattern-catalog__diagram"
      fill="none"
      viewBox="0 0 560 220"
    >
      <path
        className="pattern-catalog__diagram-link"
        d="M174 105h43M372 105h42"
      />
      <circle
        className="pattern-catalog__diagram-node"
        cx="195"
        cy="105"
        r="4"
      />
      <circle
        className="pattern-catalog__diagram-node"
        cx="393"
        cy="105"
        r="4"
      />
      <g className="pattern-catalog__diagram-frame">
        <rect height="118" rx="10" width="150" x="24" y="47" />
        <path d="M24 72h150M61 72v93" />
        <circle cx="40" cy="60" r="3" />
        <circle cx="50" cy="60" r="3" />
        <path d="M37 88h12M37 103h12M37 118h12" />
        <rect height="21" rx="4" width="77" x="77" y="88" />
        <path d="M77 124h58M77 137h42M77 150h66" />
      </g>
      <g className="pattern-catalog__diagram-frame">
        <rect height="158" rx="12" width="155" x="217" y="27" />
        <path d="M217 54h155" />
        <circle cx="234" cy="40.5" r="3" />
        <circle cx="244" cy="40.5" r="3" />
        <rect height="32" rx="6" width="77" x="235" y="70" />
        <path d="M248 81h50M248 91h34" />
        <rect height="35" rx="6" width="77" x="277" y="115" />
        <path d="M289 127h51M289 138h40M235 168h119" />
      </g>
      <g className="pattern-catalog__diagram-frame">
        <rect height="138" rx="15" width="87" x="414" y="43" />
        <path d="M447 55h21M448 168h19" />
        <rect height="32" rx="6" width="61" x="427" y="72" />
        <path d="M437 83h41M437 93h26" />
        <rect height="34" rx="6" width="61" x="427" y="115" />
        <path d="M437 127h41M437 137h32" />
      </g>
      <path
        className="pattern-catalog__diagram-accent"
        d="M528 71v18m-9-9h18"
      />
      <circle
        className="pattern-catalog__diagram-accent"
        cx="527"
        cy="138"
        r="8"
      />
    </svg>
  );
}

function PatternCard({
  language,
  record,
  result = false,
  version,
}: {
  language: CatalogLanguage;
  record: PatternRecord;
  result?: boolean;
  version: string;
}) {
  return (
    <a
      className="pattern-catalog__card"
      data-pattern-link
      data-pattern-result={result ? "true" : undefined}
      href={patternHref(record.slug, language, version)}
    >
      <span className="pattern-catalog__icon">
        <ProductPlaygroundIcon name={record.icon} />
      </span>
      <span className="pattern-catalog__card-copy">
        <strong>{localize(record.label, language)}</strong>
        <small>{localize(record.description, language)}</small>
      </span>
      <ProductPlaygroundIcon className="pattern-catalog__arrow" name="arrow" />
    </a>
  );
}

export function PatternCatalog() {
  const currentLanguage = useLang();
  const version = useVersion();
  const language: CatalogLanguage = currentLanguage === "en" ? "en" : "zh";
  const zh = language === "zh";
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDetailsElement>(null);
  const [activeCategory, setActiveCategory] = useState<"all" | PatternCategory>(
    "all",
  );
  const [collapsed, setCollapsed] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase(language);
  const defaultView = activeCategory === "all" && !normalizedQuery;
  const featuredPattern = patternRecords[0];
  const visiblePatterns = useMemo(() => {
    const candidates = defaultView ? patternRecords.slice(1) : patternRecords;
    return candidates.filter((record) => {
      const matchesCategory =
        activeCategory === "all" || record.category === activeCategory;
      const searchableText = [
        record.label.en,
        record.label.zh,
        record.description.en,
        record.description.zh,
        record.slug,
      ]
        .join(" ")
        .toLocaleLowerCase(language);
      return matchesCategory && searchableText.includes(normalizedQuery);
    });
  }, [activeCategory, defaultView, language, normalizedQuery]);

  const focusSearch = () => {
    setFilterOpen(false);
    moreRef.current?.removeAttribute("open");
    searchRef.current?.scrollIntoView({ block: "center" });
    searchRef.current?.focus({ preventScroll: true });
  };

  const selectCategory = (category: "all" | PatternCategory) => {
    setActiveCategory(category);
    setFilterOpen(false);
    setMobileOpen(false);
  };

  return (
    <section
      aria-labelledby={titleId}
      className="pattern-catalog"
      data-collapsed={collapsed ? "true" : undefined}
      data-mobile-open={mobileOpen ? "true" : undefined}
      data-pattern-catalog
    >
      <button
        aria-expanded={mobileOpen}
        aria-label={
          mobileOpen
            ? zh
              ? "关闭组合模式菜单"
              : "Close pattern menu"
            : zh
              ? "打开组合模式菜单"
              : "Open pattern menu"
        }
        className="pattern-catalog__mobile-menu"
        onClick={() => setMobileOpen((value) => !value)}
        type="button"
      >
        <ProductPlaygroundIcon name={mobileOpen ? "close" : "menu"} />
      </button>
      {mobileOpen ? (
        <button
          aria-label={zh ? "关闭组合模式菜单" : "Close pattern menu"}
          className="pattern-catalog__backdrop"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        aria-label={zh ? "组合模式菜单" : "Pattern menu"}
        className="pattern-menu"
        data-mobile-open={mobileOpen ? "true" : undefined}
      >
        <header className="pattern-menu__window">
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div>
            <button
              aria-label={
                collapsed
                  ? zh
                    ? "展开侧边栏"
                    : "Expand sidebar"
                  : zh
                    ? "收起侧边栏"
                    : "Collapse sidebar"
              }
              onClick={() => setCollapsed((value) => !value)}
              type="button"
            >
              <ProductPlaygroundIcon name="collapse" />
            </button>
            <button
              aria-label={zh ? "搜索" : "Search"}
              onClick={focusSearch}
              type="button"
            >
              <ProductPlaygroundIcon name="search" />
            </button>
            <button
              aria-expanded={filterOpen}
              aria-label={zh ? "筛选组合模式" : "Filter patterns"}
              data-active={filterOpen ? "true" : undefined}
              onClick={() => {
                moreRef.current?.removeAttribute("open");
                setFilterOpen((value) => !value);
              }}
              type="button"
            >
              <ProductPlaygroundIcon name="filter" />
            </button>
          </div>
        </header>

        {filterOpen ? (
          <section
            aria-label={zh ? "组合模式筛选" : "Pattern filters"}
            className="pattern-menu__filter"
          >
            <strong>{zh ? "按职责筛选" : "Filter by responsibility"}</strong>
            {categoryOrder.map((category) => (
              <button
                aria-pressed={activeCategory === category}
                key={category}
                onClick={() => selectCategory(category)}
                type="button"
              >
                {localize(categoryLabels[category], language)}
                {activeCategory === category ? (
                  <ProductPlaygroundIcon name="check" />
                ) : null}
              </button>
            ))}
          </section>
        ) : null}

        <a className="pattern-menu__identity" href={withBase("/")}>
          <img alt="" height="28" src={withBase("/logo.png")} width="28" />
          <span>
            <strong>A3S UI</strong>
            <small>v0.3.0</small>
          </span>
        </a>

        <nav
          aria-label={zh ? "主要模式" : "Primary patterns"}
          className="pattern-menu__primary"
        >
          {primaryPatternSlugs.map((slug) => {
            const record = patternBySlug(slug);
            return (
              <a href={patternHref(slug, language, version)} key={slug}>
                <ProductPlaygroundIcon name={record.icon} />
                <span>{localize(record.label, language)}</span>
              </a>
            );
          })}
          <details className="pattern-menu__more" ref={moreRef}>
            <summary onClick={() => setFilterOpen(false)}>
              <ProductPlaygroundIcon name="more" />
              <span>{zh ? "更多" : "More"}</span>
              <small>{zh ? "接入 · 适配" : "Integration"}</small>
            </summary>
            <div aria-label={zh ? "更多组合模式" : "More patterns"} role="menu">
              {morePatternSlugs.map((slug, index) => {
                const record = patternBySlug(slug);
                return (
                  <div className="pattern-menu__more-item" key={slug}>
                    {index === 2 ? <span role="separator" /> : null}
                    <a
                      href={patternHref(slug, language, version)}
                      role="menuitem"
                    >
                      <ProductPlaygroundIcon name={record.icon} />
                      {localize(record.label, language)}
                    </a>
                  </div>
                );
              })}
            </div>
          </details>
        </nav>

        <div className="pattern-menu__history">
          <section>
            <h2>{zh ? "最近查看 (1)" : "Recent (1)"}</h2>
            <a href={patternHref(featuredPattern.slug, language, version)}>
              <span>{localize(featuredPattern.label, language)}</span>
              <time>{zh ? "今天" : "Today"}</time>
            </a>
          </section>
          <section>
            <h2>{zh ? "分组 (3)" : "Groups (3)"}</h2>
            <button onClick={() => selectCategory("workflow")} type="button">
              <ProductPlaygroundIcon name="project" />
              <span>{zh ? "任务工作流" : "Task workflows"}</span>
              <ProductPlaygroundIcon name="chevron" />
            </button>
          </section>
        </div>

        <footer className="pattern-menu__footer">
          <a
            href={withBase(
              language === "zh"
                ? "/introduction.html"
                : "/en/introduction.html",
            )}
          >
            <img alt="" height="30" src={withBase("/logo.png")} width="30" />
            <strong>{zh ? "设计系统" : "Design system"}</strong>
          </a>
          <button
            aria-label={zh ? "搜索组合模式" : "Search patterns"}
            onClick={focusSearch}
            type="button"
          >
            <ProductPlaygroundIcon name="search" />
          </button>
          <a
            aria-label={zh ? "在 GitHub 查看 A3S UI" : "View A3S UI on GitHub"}
            href="https://github.com/A3S-Lab/UI"
          >
            <ProductPlaygroundIcon name="settings" />
          </a>
        </footer>
      </aside>

      <main className="pattern-catalog__content">
        <header className="pattern-catalog__hero">
          <div>
            <h1 id={titleId}>{zh ? "组合模式" : "Composition patterns"}</h1>
            <p>
              {zh
                ? "把组件装配成完整、可恢复的产品工作流。"
                : "Assemble components into complete, recoverable product workflows."}
            </p>
            <a href={patternHref(featuredPattern.slug, language, version)}>
              <ProductPlaygroundIcon name="arrow" />
              {zh ? "打开任务工作区" : "Open task workspace"}
            </a>
          </div>
          <PatternDiagram />
        </header>

        <section className="pattern-catalog__recommended">
          <div className="pattern-catalog__section-heading">
            <h2>{zh ? "推荐起点" : "Recommended starting point"}</h2>
            <label className="pattern-catalog__search">
              <ProductPlaygroundIcon name="search" />
              <span className="pattern-catalog__visually-hidden">
                {zh ? "搜索组合模式" : "Search patterns"}
              </span>
              <input
                aria-label={zh ? "搜索组合模式" : "Search patterns"}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={zh ? "搜索组合模式" : "Search patterns"}
                ref={searchRef}
                type="search"
                value={query}
              />
            </label>
          </div>
          <PatternCard
            language={language}
            record={featuredPattern}
            version={version}
          />
        </section>

        <section
          className="pattern-catalog__results"
          id="pattern-catalog-results"
        >
          <div className="pattern-catalog__section-heading">
            <h2>{zh ? "从模式开始" : "Start from a pattern"}</h2>
            <div
              aria-label={zh ? "按职责筛选" : "Filter by responsibility"}
              className="pattern-catalog__filters"
              role="group"
            >
              {categoryOrder.map((category) => (
                <button
                  aria-pressed={activeCategory === category}
                  key={category}
                  onClick={() => selectCategory(category)}
                  type="button"
                >
                  {localize(categoryLabels[category], language)}
                </button>
              ))}
            </div>
          </div>

          {visiblePatterns.length > 0 ? (
            <div className="pattern-catalog__grid">
              {visiblePatterns.map((record) => (
                <PatternCard
                  key={record.slug}
                  language={language}
                  record={record}
                  result
                  version={version}
                />
              ))}
            </div>
          ) : (
            <div className="pattern-catalog__empty" role="status">
              <ProductPlaygroundIcon name="search" />
              <strong>
                {zh ? "没有匹配的组合模式" : "No matching patterns"}
              </strong>
              <p>
                {zh
                  ? "清除搜索或切换职责分组后重试。"
                  : "Clear the search or choose another responsibility."}
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  selectCategory("all");
                }}
                type="button"
              >
                {zh ? "显示全部" : "Show all"}
              </button>
            </div>
          )}
        </section>
      </main>
    </section>
  );
}
