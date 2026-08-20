import { withBase } from "@rspress/core/runtime";
import type {
  ProductCapabilityCategory,
  ProductCapabilityTab,
  ProductPlaygroundLocale,
} from "./product-playground-data";
import type {
  ProductCapabilityDefinition,
  ProductCapabilityLifecycle,
  ProductCapabilityRegistry,
} from "./product-capability-state";
import {
  capabilityVisualTone,
  ProductCapabilityMark,
} from "./ProductCapabilityMark";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type CatalogSort = "configured" | "name" | "relevance";

type ProductCapabilityBrowseProps = {
  category: "all" | ProductCapabilityCategory;
  definitions: ProductCapabilityDefinition[];
  featuredDefinitions: ProductCapabilityDefinition[];
  locale: ProductPlaygroundLocale;
  managedOnly: boolean;
  onCategoryChange: (category: "all" | ProductCapabilityCategory) => void;
  onClearFilters: () => void;
  onOpen: (
    definition: ProductCapabilityDefinition,
    origin: HTMLButtonElement,
  ) => void;
  onQuickAction: (
    definition: ProductCapabilityDefinition,
    origin: HTMLButtonElement,
  ) => void;
  onRefreshFeatured: () => void;
  onSortChange: (sort: CatalogSort) => void;
  registry: ProductCapabilityRegistry;
  sort: CatalogSort;
  tab: ProductCapabilityTab;
  totalCount: number;
};

const assistantScenarios = [
  {
    members: [0, 2, 3],
    title: { en: "Ship a release", zh: "交付上线" },
  },
  {
    members: [0, 7, 5],
    title: { en: "Product experience", zh: "产品体验" },
  },
  {
    members: [6, 1, 8],
    title: { en: "Incident recovery", zh: "故障恢复" },
  },
  {
    members: [4, 5, 3],
    title: { en: "Build shared knowledge", zh: "知识沉淀" },
  },
  {
    members: [8, 3, 2],
    title: { en: "Continuous operations", zh: "持续运营" },
  },
] as const;

function tabLabel(tab: ProductCapabilityTab, locale: ProductPlaygroundLocale) {
  const zh = locale === "zh";
  if (tab === "assistants") return zh ? "专家" : "Assistants";
  if (tab === "skills") return zh ? "技能" : "Skills";
  return zh ? "连接器" : "Connectors";
}

function lifecycleLabel(
  lifecycle: ProductCapabilityLifecycle,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (lifecycle === "ready") return zh ? "可用于任务" : "Ready";
  if (lifecycle === "attention") return zh ? "需要处理" : "Needs attention";
  if (lifecycle === "disabled") return zh ? "已停用" : "Disabled";
  return zh ? "待配置" : "Set up";
}

function quickActionLabel(
  definition: ProductCapabilityDefinition,
  lifecycle: ProductCapabilityLifecycle,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  const label = definition.label[locale];
  if (lifecycle === "ready") {
    return zh ? `使用${label}新建任务` : `Start a task with ${label}`;
  }
  if (lifecycle === "attention") {
    return zh ? `处理${label}的配置` : `Review ${label}`;
  }
  if (lifecycle === "disabled") {
    return zh ? `查看已停用的${label}` : `Review disabled ${label}`;
  }
  if (definition.tab === "assistants") {
    return zh ? `配置${label}` : `Configure ${label}`;
  }
  if (definition.tab === "skills") {
    return zh ? `审查并安装${label}` : `Review and install ${label}`;
  }
  return zh ? `设置${label}连接` : `Set up ${label}`;
}

function capabilityPreference(
  definition: ProductCapabilityDefinition,
  registry: ProductCapabilityRegistry,
) {
  return (
    registry.records[definition.id] ?? {
      lifecycle: "available" as const,
      scope: "current-workspace" as const,
    }
  );
}

function ProductCapabilityFeatured({
  definitions,
  locale,
  onOpen,
  onQuickAction,
  onRefreshFeatured,
  registry,
  tab,
}: Pick<
  ProductCapabilityBrowseProps,
  | "locale"
  | "onOpen"
  | "onQuickAction"
  | "onRefreshFeatured"
  | "registry"
  | "tab"
> & { definitions: ProductCapabilityDefinition[] }) {
  const zh = locale === "zh";

  if (tab === "assistants") {
    return (
      <section
        aria-labelledby="product-catalog-featured-title"
        className="product-catalog__featured product-catalog__featured--scenarios"
      >
        <header>
          <h1 id="product-catalog-featured-title">
            {zh ? "精选场景" : "Featured scenarios"}
          </h1>
        </header>
        <div>
          {assistantScenarios.map((scenario, scenarioIndex) => (
            <article
              className="product-catalog__scenario"
              data-capability-tone={(scenarioIndex % 5) + 1}
              key={scenario.title.en}
            >
              <img
                alt=""
                aria-hidden="true"
                src={withBase("/assets/images/project-collaboration.png")}
              />
              <h2>{scenario.title[locale]}</h2>
              <ul>
                {scenario.members.map((memberIndex) => {
                  const member = definitions[memberIndex];
                  if (!member) return null;
                  return (
                    <li key={member.id}>
                      <button
                        onClick={(event) => onOpen(member, event.currentTarget)}
                        type="button"
                      >
                        <ProductCapabilityMark definition={member} size={24} />
                        <span>{member.label[locale]}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (tab !== "skills") return null;

  return (
    <section
      aria-labelledby="product-catalog-featured-title"
      className="product-catalog__featured product-catalog__featured--skills"
    >
      <header>
        <h1 id="product-catalog-featured-title">
          {zh ? "精选技能" : "Featured skills"}
        </h1>
        <button onClick={onRefreshFeatured} type="button">
          <ProductPlaygroundIcon name="refresh" />
          {zh ? "换一换" : "Refresh"}
        </button>
      </header>
      <div>
        {definitions.map((definition) => {
          const preference = capabilityPreference(definition, registry);
          return (
            <article
              data-capability-tone={capabilityVisualTone(definition.id)}
              data-lifecycle={preference.lifecycle}
              key={definition.id}
            >
              <span data-capability-mark>
                <ProductPlaygroundIcon name="checklist" />
              </span>
              <button
                className="product-catalog__featured-main"
                onClick={(event) => onOpen(definition, event.currentTarget)}
                type="button"
              >
                <strong>{definition.label[locale]}</strong>
                <small>{definition.description[locale]}</small>
              </button>
              <button
                aria-label={quickActionLabel(
                  definition,
                  preference.lifecycle,
                  locale,
                )}
                className="product-catalog__quick-action"
                data-state={preference.lifecycle}
                onClick={(event) =>
                  onQuickAction(definition, event.currentTarget)
                }
                title={quickActionLabel(
                  definition,
                  preference.lifecycle,
                  locale,
                )}
                type="button"
              >
                <ProductPlaygroundIcon
                  name={preference.lifecycle === "ready" ? "check" : "plus"}
                />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProductCapabilityCard({
  definition,
  locale,
  onOpen,
  onQuickAction,
  registry,
}: {
  definition: ProductCapabilityDefinition;
  locale: ProductPlaygroundLocale;
  onOpen: ProductCapabilityBrowseProps["onOpen"];
  onQuickAction: ProductCapabilityBrowseProps["onQuickAction"];
  registry: ProductCapabilityRegistry;
}) {
  const preference = capabilityPreference(definition, registry);
  const zh = locale === "zh";
  const scopeLabel =
    preference.scope === "all-workspaces"
      ? zh
        ? "所有工作区"
        : "All workspaces"
      : zh
        ? "当前工作区"
        : "Current workspace";

  return (
    <article
      className="product-catalog__entry"
      data-capability-id={definition.id}
      data-capability-tone={capabilityVisualTone(definition.id)}
      data-lifecycle={preference.lifecycle}
    >
      <span data-capability-mark>
        <ProductCapabilityMark definition={definition} />
      </span>
      <button
        className="product-catalog__entry-main"
        onClick={(event) => onOpen(definition, event.currentTarget)}
        type="button"
      >
        <span className="product-catalog__entry-title">
          <strong>{definition.label[locale]}</strong>
          <em data-capability-row-state={preference.lifecycle}>
            {preference.lifecycle === "attention" ? (
              <ProductPlaygroundIcon name="warning" />
            ) : preference.lifecycle === "ready" ? (
              <ProductPlaygroundIcon name="check" />
            ) : null}
            {lifecycleLabel(preference.lifecycle, locale)}
          </em>
        </span>
        <small>
          {preference.description ?? definition.description[locale]}
        </small>
        {definition.tab === "assistants" ? (
          <span className="product-catalog__entry-tags">
            <em>{definition.tag[locale]}</em>
            <em>{scopeLabel}</em>
          </span>
        ) : definition.tab === "skills" ? (
          <em className="product-catalog__entry-kind">
            {definition.tag[locale]}
          </em>
        ) : null}
      </button>
      <button
        aria-label={quickActionLabel(definition, preference.lifecycle, locale)}
        className="product-catalog__quick-action"
        data-state={preference.lifecycle}
        onClick={(event) => onQuickAction(definition, event.currentTarget)}
        title={quickActionLabel(definition, preference.lifecycle, locale)}
        type="button"
      >
        <ProductPlaygroundIcon
          name={
            preference.lifecycle === "ready"
              ? "arrow"
              : preference.lifecycle === "attention"
                ? "warning"
                : preference.lifecycle === "disabled"
                  ? "pause"
                  : "plus"
          }
        />
      </button>
    </article>
  );
}

export function ProductCapabilityBrowse({
  category,
  definitions,
  featuredDefinitions,
  locale,
  managedOnly,
  onCategoryChange,
  onClearFilters,
  onOpen,
  onQuickAction,
  onRefreshFeatured,
  onSortChange,
  registry,
  sort,
  tab,
  totalCount,
}: ProductCapabilityBrowseProps) {
  const zh = locale === "zh";
  const categories = [
    ["all", zh ? "全部" : "All"],
    ["product", zh ? "产品设计" : "Product"],
    ["engineering", zh ? "技术工程" : "Engineering"],
    ["data", zh ? "数据智能" : "Data"],
    ["knowledge", zh ? "知识管理" : "Knowledge"],
    ["operations", zh ? "运营协作" : "Operations"],
    ["content", zh ? "内容创作" : "Content"],
  ] as const;
  const sortOptions = [
    ["relevance", zh ? "综合" : "Relevance"],
    ["configured", zh ? "已配置优先" : "Configured first"],
    ["name", zh ? "名称" : "Name"],
  ] as const;
  const heading = managedOnly
    ? zh
      ? `已管理${tabLabel(tab, locale)}`
      : `Managed ${tabLabel(tab, locale).toLocaleLowerCase("en")}`
    : tab === "skills"
      ? zh
        ? "推荐"
        : "Recommended"
      : tabLabel(tab, locale);

  return (
    <>
      {!managedOnly && category === "all" ? (
        <ProductCapabilityFeatured
          definitions={featuredDefinitions}
          locale={locale}
          onOpen={onOpen}
          onQuickAction={onQuickAction}
          onRefreshFeatured={onRefreshFeatured}
          registry={registry}
          tab={tab}
        />
      ) : null}

      <section
        aria-labelledby="product-capability-directory-title"
        className="product-catalog__directory"
      >
        <header>
          <span>
            <h1 id="product-capability-directory-title">{heading}</h1>
            <small>
              {zh
                ? `显示 ${definitions.length} 项，共 ${totalCount} 项`
                : `Showing ${definitions.length} of ${totalCount}`}
            </small>
          </span>
          <div
            aria-label={zh ? "目录排序" : "Directory sorting"}
            className="product-catalog__sort"
            role="group"
          >
            {sortOptions.map(([id, label]) => (
              <button
                aria-pressed={sort === id}
                key={id}
                onClick={() => onSortChange(id)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {tab !== "connectors" ? (
          <div
            aria-label={zh ? "能力分组" : "Capability category"}
            className="product-catalog__categories"
            role="group"
          >
            {categories.map(([id, label]) => (
              <button
                aria-pressed={category === id}
                key={id}
                onClick={() => onCategoryChange(id)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {definitions.length > 0 ? (
          <div data-directory-layout={tab}>
            {definitions.map((definition) => (
              <ProductCapabilityCard
                definition={definition}
                key={definition.id}
                locale={locale}
                onOpen={onOpen}
                onQuickAction={onQuickAction}
                registry={registry}
              />
            ))}
          </div>
        ) : (
          <div className="product-catalog__empty" role="status">
            <ProductPlaygroundIcon name="search" />
            <strong>
              {zh ? "没有匹配的能力" : "No matching capabilities"}
            </strong>
            <p>
              {zh
                ? "清除搜索、分组或“已管理”筛选后重试。"
                : "Clear search, category, or the Managed filter and try again."}
            </p>
            <button onClick={onClearFilters} type="button">
              {zh ? "清除筛选" : "Clear filters"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}

export type { CatalogSort };
