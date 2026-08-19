import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { withBase } from "@rspress/core/runtime";
import { Link } from "@rspress/core/theme";
import { getProductCapabilityRoutePath } from "../../../product-application-routes";
import {
  automationTemplates,
  capabilityDirectory,
  type ProductCapabilityCategory,
  type ProductCapabilityTab,
  type ProductPlaygroundLocale,
  type ProductResourceView,
} from "./product-playground-data";
import { ProductConnectionSurface } from "./ProductConnectionSurface";
import { ProductFileManagerSurface } from "./ProductFileManagerSurface";
import { ProductInspirationSurface } from "./ProductInspirationSurface";
import { ProductKnowledgeLibrarySurface } from "./ProductKnowledgeLibrarySurface";
import { ProductMailSurface } from "./ProductMailSurface";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import { ProductAutomationRunHistory } from "./ProductAutomationRunHistory";
import type { ProductTaskDraft } from "./product-composer-data";
import {
  ProductAutomationBuilder,
  type ProductAutomationDraftResult,
  type ProductAutomationTemplateDraft,
} from "./ProductAutomationBuilder";

export function ProductAutomationSurface({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [tab, setTab] = useState<"scheduled" | "history">("scheduled");
  const [automations, setAutomations] = useState<
    { id: string; name: string; schedule: string }[]
  >([]);
  const [editor, setEditor] = useState<{
    automationId?: string;
    template?: ProductAutomationTemplateDraft;
  } | null>(null);
  const activeAutomation = automations[0];

  if (editor) {
    const existing = automations.find(
      (automation) => automation.id === editor.automationId,
    );
    return (
      <ProductAutomationBuilder
        initialName={existing?.name}
        key={editor.automationId ?? editor.template?.label.en ?? "new"}
        locale={locale}
        onCancel={() => setEditor(null)}
        onSave={(result: ProductAutomationDraftResult) => {
          const id = editor.automationId ?? `automation-${Date.now()}`;
          setAutomations((current) => [
            { id, ...result },
            ...current.filter((automation) => automation.id !== id),
          ]);
          setEditor(null);
        }}
        template={editor.template}
      />
    );
  }

  return (
    <section
      className="product-automation"
      data-product-surface="automation"
      data-tab={tab}
    >
      <header>
        <div aria-label={zh ? "自动化视图" : "Automation view"} role="tablist">
          <button
            aria-selected={tab === "scheduled"}
            onClick={() => setTab("scheduled")}
            role="tab"
            type="button"
          >
            {zh ? "定时任务" : "Scheduled"}
          </button>
          <button
            aria-selected={tab === "history"}
            onClick={() => setTab("history")}
            role="tab"
            type="button"
          >
            {zh ? "运行记录" : "Run history"}
          </button>
        </div>
      </header>

      {tab === "scheduled" ? (
        <>
          <section className="product-automation__status">
            {automations.length === 0 ? (
              <>
                <ProductPlaygroundIcon name="automation" />
                <p>
                  {zh
                    ? "开启你的第一个自动化任务"
                    : "Create your first automation"}
                </p>
                <button
                  data-primary
                  onClick={() => setEditor({})}
                  type="button"
                >
                  <ProductPlaygroundIcon name="plus" />
                  {zh ? "添加自动化" : "Add automation"}
                </button>
              </>
            ) : activeAutomation ? (
              <article>
                <span>
                  <ProductPlaygroundIcon name="check" />
                </span>
                <div>
                  <strong>{activeAutomation.name}</strong>
                  <small>
                    {activeAutomation.schedule} · {zh ? "已启用" : "Enabled"}
                  </small>
                </div>
                <button
                  onClick={() =>
                    setEditor({ automationId: activeAutomation.id })
                  }
                  type="button"
                >
                  {zh ? "编辑" : "Edit"}
                </button>
              </article>
            ) : null}
          </section>
          <section className="product-automation__templates">
            <h1>{zh ? "自动化任务模板" : "Automation templates"}</h1>
            <div>
              {automationTemplates.map((template) => (
                <button
                  key={template.label.en}
                  onClick={() => setEditor({ template })}
                  type="button"
                >
                  <ProductPlaygroundIcon name={template.icon} />
                  <span>
                    <strong>{template.label[locale]}</strong>
                    <small>{template.description[locale]}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <ProductAutomationRunHistory locale={locale} />
      )}
    </section>
  );
}

export function ProductCatalogSurface({
  locale,
  onTabChange,
  tab,
}: {
  locale: ProductPlaygroundLocale;
  onTabChange: (tab: ProductCapabilityTab) => void;
  tab: ProductCapabilityTab;
}) {
  const zh = locale === "zh";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ProductCapabilityCategory>(
    "all",
  );
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [enabledCapabilities, setEnabledCapabilities] = useState(
    () =>
      new Set(
        Object.values(capabilityDirectory)
          .flat()
          .filter((capability) => capability.owned)
          .map((capability) => capability.label.en),
      ),
  );
  const [status, setStatus] = useState("");
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const visibleCapabilities = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return capabilityDirectory[tab].filter((capability) => {
      const matchesQuery =
        !normalized ||
        [
          capability.label.en,
          capability.label.zh,
          capability.description.en,
          capability.description.zh,
          capability.tag.en,
          capability.tag.zh,
        ]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(normalized);
      const matchesCategory =
        category === "all" || capability.category === category;
      const matchesOwned =
        !ownedOnly || enabledCapabilities.has(capability.label.en);
      return matchesQuery && matchesCategory && matchesOwned;
    });
  }, [category, enabledCapabilities, locale, ownedOnly, query, tab]);

  const featuredCapabilities = capabilityDirectory[tab].slice(0, 4);
  const enabledCount = capabilityDirectory[tab].filter((capability) =>
    enabledCapabilities.has(capability.label.en),
  ).length;

  const tabs = [
    ["assistants", zh ? "专家" : "Assistants"],
    ["skills", zh ? "技能" : "Skills"],
    ["connectors", zh ? "连接器" : "Connectors"],
  ] as const;
  const categories = [
    ["all", zh ? "全部" : "All"],
    ["product", zh ? "产品设计" : "Product"],
    ["engineering", zh ? "技术工程" : "Engineering"],
    ["data", zh ? "数据智能" : "Data"],
    ["knowledge", zh ? "知识管理" : "Knowledge"],
    ["operations", zh ? "运营协作" : "Operations"],
    ["content", zh ? "内容创作" : "Content"],
  ] as const;
  const assistantScenarios = [
    {
      members: [0, 2, 3],
      title: zh ? "交付上线" : "Ship a release",
    },
    {
      members: [0, 7, 5],
      title: zh ? "产品体验" : "Product experience",
    },
    {
      members: [6, 1, 8],
      title: zh ? "故障恢复" : "Incident recovery",
    },
    {
      members: [4, 5, 3],
      title: zh ? "知识沉淀" : "Build shared knowledge",
    },
    {
      members: [8, 3, 2],
      title: zh ? "持续运营" : "Continuous operations",
    },
  ] as const;
  const toggleCapability = (
    capability: (typeof capabilityDirectory)[ProductCapabilityTab][number],
  ) => {
    const key = capability.label.en;
    const next = new Set(enabledCapabilities);
    const removing = next.has(key);
    if (removing) next.delete(key);
    else next.add(key);
    setEnabledCapabilities(next);
    setStatus(
      zh
        ? `${removing ? "已移除" : "已添加"}“${capability.label.zh}”。`
        : `${capability.label.en} ${removing ? "removed" : "added"}.`,
    );
  };
  const changeTab = (nextTab: ProductCapabilityTab) => {
    onTabChange(nextTab);
    setCategory("all");
    setStatus("");
  };
  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex === undefined) return;
    const next = tabs[nextIndex];
    if (!next) return;
    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    changeTab(next[0]);
  };

  return (
    <section
      className="product-catalog"
      data-catalog-tab={tab}
      data-product-surface="catalog"
    >
      <header>
        <div aria-label={zh ? "能力类型" : "Capability type"} role="tablist">
          {tabs.map(([id, label], index) => (
            <Link
              aria-selected={tab === id}
              href={withBase(getProductCapabilityRoutePath(id, locale))}
              key={id}
              onClick={(event) => {
                if (
                  event.button === 0 &&
                  !event.altKey &&
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  changeTab(id);
                }
              }}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={tab === id ? 0 : -1}
            >
              <ProductPlaygroundIcon
                name={
                  id === "connectors"
                    ? "knowledge"
                    : id === "skills"
                      ? "checklist"
                      : "assistant"
                }
              />
              {label}
            </Link>
          ))}
        </div>
        <div>
          <label>
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={
                tab === "assistants"
                  ? zh
                    ? "搜索专家"
                    : "Search assistants"
                  : tab === "skills"
                    ? zh
                      ? "搜索技能"
                      : "Search skills"
                    : zh
                      ? "搜索连接器"
                      : "Search connectors"
              }
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={
                tab === "assistants"
                  ? zh
                    ? "搜索专家名称或描述"
                    : "Search assistants"
                  : tab === "skills"
                    ? zh
                      ? "搜索技能"
                      : "Search skills"
                    : zh
                      ? "搜索连接器"
                      : "Search connectors"
              }
              type="search"
              value={query}
            />
          </label>
          <button
            aria-pressed={ownedOnly}
            onClick={() => setOwnedOnly((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="catalog" />
            {tab === "assistants"
              ? zh
                ? "我的专家"
                : "My assistants"
              : tab === "skills"
                ? zh
                  ? "我的技能"
                  : "My skills"
              : zh
                  ? "我的连接器"
                  : "My connectors"}
            <em aria-label={zh ? `${enabledCount} 个` : `${enabledCount} items`}>
              {enabledCount}
            </em>
          </button>
          <button
            data-catalog-create
            onClick={() =>
              setStatus(
                tab === "assistants"
                  ? zh
                    ? "专家创建流程已准备。"
                    : "Assistant creation is ready."
                  : tab === "skills"
                    ? zh
                      ? "技能添加流程已准备。"
                      : "Skill installation is ready."
                    : zh
                      ? "连接器配置流程已准备。"
                      : "Connector configuration is ready.",
              )
            }
            type="button"
          >
            <ProductPlaygroundIcon name="plus" />
            {tab === "assistants"
              ? zh
                ? "创建专家"
                : "Create assistant"
              : tab === "skills"
                ? zh
                  ? "添加技能"
                  : "Add skill"
                : zh
                  ? "自定义连接器"
                  : "Custom connector"}
          </button>
        </div>
      </header>

      {tab === "assistants" ? (
        <section
          aria-labelledby="product-catalog-featured-title"
          className="product-catalog__featured product-catalog__featured--scenarios"
        >
          <h1 id="product-catalog-featured-title">
            {zh ? "精选场景" : "Featured scenarios"}
          </h1>
          <div>
            {assistantScenarios.map((scenario, scenarioIndex) => (
              <article
                className="product-catalog__scenario"
                data-capability-tone={(scenarioIndex % 5) + 1}
                key={scenario.title}
              >
                <img
                  alt=""
                  aria-hidden="true"
                  src={withBase("/assets/images/project-collaboration.png")}
                />
                <h2>{scenario.title}</h2>
                <ul>
                  {scenario.members.map((memberIndex, memberPosition) => {
                    const member = capabilityDirectory.assistants[memberIndex];
                    if (!member) return null;
                    return (
                      <li key={member.label.en}>
                        <img
                          alt=""
                          height="24"
                          src={withBase(
                            `/assets/images/avatar-${(memberPosition % 3) + 1}.png`,
                          )}
                          width="24"
                        />
                        <span>{member.label[locale]}</span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : tab === "skills" ? (
        <section className="product-catalog__featured">
          <h1>{zh ? "精选技能" : "Featured skills"}</h1>
          <div>
            {featuredCapabilities.map((capability, index) => {
              const enabled = enabledCapabilities.has(capability.label.en);
              return (
                <article
                  key={capability.label.en}
                  data-capability-tone={index + 1}
                >
                  <span aria-hidden="true">
                    <ProductPlaygroundIcon name="checklist" />
                  </span>
                  <div>
                    <h2>{capability.label[locale]}</h2>
                    <p>{capability.description[locale]}</p>
                  </div>
                  <button
                    aria-label={
                      enabled
                        ? zh
                          ? `移除${capability.label.zh}`
                          : `Remove ${capability.label.en}`
                        : zh
                          ? `添加${capability.label.zh}`
                          : `Add ${capability.label.en}`
                    }
                    aria-pressed={enabled}
                    onClick={() => toggleCapability(capability)}
                    type="button"
                  >
                    <ProductPlaygroundIcon name={enabled ? "check" : "plus"} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="product-catalog__directory">
        {tab !== "connectors" ? (
          <header>
            <h1>
              {tab === "assistants"
                ? zh
                  ? "专家"
                  : "Assistants"
                : zh
                  ? "推荐"
                  : "Recommended"}
            </h1>
            <div
              aria-label={zh ? "能力分组" : "Capability category"}
              role="group"
            >
              {categories.map(([id, label]) => (
                <button
                  aria-pressed={category === id}
                  key={id}
                  onClick={() => setCategory(id)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </header>
        ) : (
          <h1 className="product-catalog__visually-hidden">
            {zh ? "连接器目录" : "Connector directory"}
          </h1>
        )}
        {visibleCapabilities.length > 0 ? (
          <div data-directory-layout={tab}>
            {visibleCapabilities.map((capability, index) => (
              <article
                className="product-catalog__entry"
                data-capability-tone={(index % 5) + 1}
                key={capability.label.en}
              >
                <span aria-hidden="true">
                  {tab === "assistants" ? (
                    <img
                      alt=""
                      height="40"
                      src={withBase(
                        `/assets/images/avatar-${(index % 3) + 1}.png`,
                      )}
                      width="40"
                    />
                  ) : (
                    <ProductPlaygroundIcon
                      name={tab === "connectors" ? "knowledge" : "checklist"}
                    />
                  )}
                </span>
                <span className="product-catalog__entry-copy">
                  <strong>{capability.label[locale]}</strong>
                  <small>{capability.description[locale]}</small>
                  {tab === "assistants" ? (
                    <span className="product-catalog__entry-tags">
                      <em>{capability.tag[locale]}</em>
                      <em>
                        {
                          categories.find(
                            ([id]) => id === capability.category,
                          )?.[1]
                        }
                      </em>
                      <em>{zh ? "可配置" : "Configurable"}</em>
                    </span>
                  ) : tab === "skills" ? (
                    <em>{capability.tag[locale]}</em>
                  ) : null}
                </span>
                <button
                  aria-label={
                    enabledCapabilities.has(capability.label.en)
                      ? zh
                        ? `移除${capability.label.zh}`
                        : `Remove ${capability.label.en}`
                      : zh
                        ? `添加${capability.label.zh}`
                        : `Add ${capability.label.en}`
                  }
                  aria-pressed={enabledCapabilities.has(capability.label.en)}
                  onClick={() => toggleCapability(capability)}
                  type="button"
                >
                  <ProductPlaygroundIcon
                    name={
                      enabledCapabilities.has(capability.label.en)
                        ? "check"
                        : "plus"
                    }
                  />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="product-catalog__empty" role="status">
            <ProductPlaygroundIcon name="search" />
            <strong>
              {zh ? "没有匹配的能力" : "No matching capabilities"}
            </strong>
            <button
              onClick={() => {
                setCategory("all");
                setOwnedOnly(false);
                setQuery("");
              }}
              type="button"
            >
              {zh ? "清除搜索" : "Clear search"}
            </button>
          </div>
        )}
        <output aria-live="polite">{status}</output>
      </section>
    </section>
  );
}

const resourceTitles: Record<
  ProductResourceView,
  {
    description: Record<ProductPlaygroundLocale, string>;
    title: Record<ProductPlaygroundLocale, string>;
  }
> = {
  files: {
    title: { en: "My files", zh: "我的文件" },
    description: {
      en: "Review task artifacts, then sync approved files through cloud storage.",
      zh: "快速查看任务成果，上传到云端网盘开启跨端同步。",
    },
  },
  mail: {
    title: { en: "Mail", zh: "我的邮箱" },
    description: {
      en: "Connect a mailbox before using messages as task context.",
      zh: "连接邮箱后，可将邮件作为任务上下文。",
    },
  },
  documents: {
    title: { en: "Documents", zh: "协作文档" },
    description: {
      en: "Connect a document provider and reuse approved sources.",
      zh: "连接文档服务并复用已授权资料。",
    },
  },
  knowledge: {
    title: { en: "Knowledge", zh: "知识库" },
    description: {
      en: "Keep durable sources separate from transient task output.",
      zh: "将长期资料与临时任务产物分开管理。",
    },
  },
  inspiration: {
    title: { en: "Inspiration", zh: "灵感" },
    description: {
      en: "Capture useful fragments and turn them into structured work.",
      zh: "收集可用片段，并将它们转为结构化任务。",
    },
  },
};

export function ProductResourcesSurface({
  locale,
  onStartTask,
  resource,
  startHref,
}: {
  locale: ProductPlaygroundLocale;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
  resource: ProductResourceView;
  startHref: string;
}) {
  const copy = resourceTitles[resource];

  if (resource === "inspiration") {
    return (
      <ProductInspirationSurface locale={locale} onStartTask={onStartTask} />
    );
  }

  if (resource === "mail") {
    return (
      <ProductMailSurface
        locale={locale}
        onStartTask={onStartTask}
        startHref={startHref}
      />
    );
  }

  if (resource === "files") {
    return (
      <ProductFileManagerSurface locale={locale} onStartTask={onStartTask} />
    );
  }

  if (resource === "knowledge") {
    return (
      <ProductKnowledgeLibrarySurface
        locale={locale}
        onStartTask={onStartTask}
      />
    );
  }

  return (
    <section
      className="product-resources"
      data-product-surface="resources"
      data-resource={resource}
    >
      <header>
        <h1>{copy.title[locale]}</h1>
        <p>{copy.description[locale]}</p>
      </header>
      <ProductConnectionSurface
        locale={locale}
        onUseInTask={() =>
          onStartTask({
            prompt:
              locale === "zh"
                ? "基于已授权的协作文档，梳理关键信息、待确认事项和下一步行动。"
                : "Review the authorized collaborative documents and summarize key information, open questions, and next actions.",
            resources: [
              {
                id: "connector:documents",
                kind: "connector",
                label: locale === "zh" ? "协作文档" : "Collaborative documents",
                meta:
                  locale === "zh"
                    ? "已授权连接器"
                    : "Authorized connector",
              },
            ],
            workspace: "ui",
          })
        }
        resource={resource}
      />
    </section>
  );
}
