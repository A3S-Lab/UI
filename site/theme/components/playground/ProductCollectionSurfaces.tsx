import { useMemo, useState } from "react";
import { withBase } from "@rspress/core/runtime";
import {
  automationTemplates,
  capabilityDirectory,
  capabilityGroups,
  resourceFiles,
  type ProductCapabilityCategory,
  type ProductCapabilityTab,
  type ProductPlaygroundLocale,
  type ProductResourceView,
} from "./product-playground-data";
import { ProductConnectionSurface } from "./ProductConnectionSurface";
import { ProductInspirationSurface } from "./ProductInspirationSurface";
import { ProductMailSurface } from "./ProductMailSurface";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductAutomationSurface({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [tab, setTab] = useState<"scheduled" | "history">("scheduled");
  const [created, setCreated] = useState<string[]>([]);
  const activeAutomation = automationTemplates.find(
    (template) => template.label.en === created[0],
  );

  return (
    <section className="product-automation" data-product-surface="automation">
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
            {created.length === 0 ? (
              <>
                <ProductPlaygroundIcon name="automation" />
                <p>
                  {zh
                    ? "开启你的第一个自动化任务"
                    : "Create your first automation"}
                </p>
                <button
                  data-primary
                  onClick={() => setCreated([automationTemplates[0].label.en])}
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
                  <strong>{activeAutomation.label[locale]}</strong>
                  <small>
                    {zh
                      ? "工作日 09:30 · 已启用"
                      : "Weekdays at 09:30 · Enabled"}
                  </small>
                </div>
                <button type="button">{zh ? "查看" : "Open"}</button>
              </article>
            ) : null}
          </section>
          <section className="product-automation__templates">
            <h1>{zh ? "自动化任务模板" : "Automation templates"}</h1>
            <div>
              {automationTemplates.map((template) => (
                <button
                  key={template.label.en}
                  onClick={() =>
                    setCreated((current) => [
                      template.label.en,
                      ...current.filter((item) => item !== template.label.en),
                    ])
                  }
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
        <section className="product-automation__history">
          <ProductPlaygroundIcon name="report" />
          <h1>{zh ? "尚无运行记录" : "No runs yet"}</h1>
          <p>
            {zh
              ? "自动化首次运行后，结果和恢复信息会显示在这里。"
              : "Results and recovery details appear here after the first run."}
          </p>
          <button onClick={() => setTab("scheduled")} type="button">
            {zh ? "返回定时任务" : "Back to scheduled"}
          </button>
        </section>
      )}
    </section>
  );
}

export function ProductCatalogSurface({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [tab, setTab] = useState<ProductCapabilityTab>("assistants");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ProductCapabilityCategory>(
    "all",
  );
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState("");
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
      const matchesOwned = !ownedOnly || capability.owned;
      return matchesQuery && matchesCategory && matchesOwned;
    });
  }, [category, locale, ownedOnly, query, tab]);

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
  const sceneIcons = [
    "product",
    "chart",
    "knowledge",
    "automation",
    "shield",
  ] as const;
  const categoryKeywords: Record<ProductCapabilityCategory, readonly string[]> =
    zh
      ? {
          content: ["写作", "编辑"],
          data: ["分析", "洞察"],
          engineering: ["架构", "质量"],
          knowledge: ["沉淀", "检索"],
          operations: ["协作", "流程"],
          product: ["交付", "评审"],
        }
      : {
          content: ["Content", "Editing"],
          data: ["Data", "Insight"],
          engineering: ["Engineering", "Quality"],
          knowledge: ["Knowledge", "Curation"],
          operations: ["Operations", "Teamwork"],
          product: ["Product", "Delivery"],
        };

  return (
    <section className="product-catalog" data-product-surface="catalog">
      <header>
        <div aria-label={zh ? "能力类型" : "Capability type"} role="tablist">
          {tabs.map(([id, label]) => (
            <button
              aria-selected={tab === id}
              key={id}
              onClick={() => {
                setTab(id);
                setCategory("all");
                setSelectedCapability("");
              }}
              role="tab"
              type="button"
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
            </button>
          ))}
        </div>
        <div>
          <label>
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={zh ? "搜索能力" : "Search capabilities"}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={zh ? "搜索名称或描述" : "Search name or description"}
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
            {zh ? "我的能力" : "My capabilities"}
          </button>
        </div>
      </header>

      <section className="product-catalog__featured">
        <h1>{zh ? "精选场景" : "Featured scenarios"}</h1>
        <div>
          {capabilityGroups.map((group, index) => (
            <article key={group.label.en} data-scene={index + 1}>
              <figure aria-hidden="true">
                <ProductPlaygroundIcon
                  name={sceneIcons[index % sceneIcons.length]}
                />
                <i />
                <i />
              </figure>
              <h2>{group.label[locale]}</h2>
              <ul>
                {group.entries.map((entry) => (
                  <li key={entry.en}>
                    <span />
                    {entry[locale]}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="product-catalog__directory">
        <header>
          <h1>{tabs.find(([id]) => id === tab)?.[1]}</h1>
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
        {visibleCapabilities.length > 0 ? (
          <div>
            {visibleCapabilities.map((capability, index) => (
              <button
                aria-pressed={selectedCapability === capability.label.en}
                data-capability-tone={(index % 5) + 1}
                key={capability.label.en}
                onClick={() => setSelectedCapability(capability.label.en)}
                type="button"
              >
                <span>
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
                <span>
                  <strong>{capability.label[locale]}</strong>
                  <small>{capability.description[locale]}</small>
                  <span data-capability-tags>
                    {[
                      ...new Set([
                        capability.tag[locale],
                        ...categoryKeywords[capability.category],
                      ]),
                    ].map((keyword) => (
                      <em key={keyword}>{keyword}</em>
                    ))}
                  </span>
                </span>
                <span data-capability-action>{zh ? "使用" : "Use"}</span>
              </button>
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
        <output aria-live="polite">
          {selectedCapability
            ? zh
              ? `已选择“${
                  capabilityDirectory[tab].find(
                    (item) => item.label.en === selectedCapability,
                  )?.label.zh ?? selectedCapability
                }”。`
              : `${selectedCapability} selected.`
            : ""}
        </output>
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
  resource,
  startHref,
}: {
  locale: ProductPlaygroundLocale;
  resource: ProductResourceView;
  startHref: string;
}) {
  const zh = locale === "zh";
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"cloud" | "tasks">("tasks");
  const [fileType, setFileType] = useState<"all" | "markdown" | "typescript">(
    "all",
  );
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const copy = resourceTitles[resource];
  const rows = resourceFiles
    .map((row, index) => ({ favorite: index === 0 || index === 3, row }))
    .filter(({ favorite, row }) => {
      const matchesQuery = row
        .join(" ")
        .toLocaleLowerCase(locale)
        .includes(query.toLocaleLowerCase(locale));
      const matchesType =
        fileType === "all" || row[1].toLocaleLowerCase() === fileType;
      return matchesQuery && matchesType && (!favoritesOnly || favorite);
    });
  const fileTypeLabel =
    fileType === "typescript"
      ? "TypeScript"
      : fileType === "markdown"
        ? "Markdown"
        : zh
          ? "全部类型"
          : "All types";

  if (resource === "inspiration") {
    return <ProductInspirationSurface locale={locale} />;
  }

  if (resource === "mail") {
    return <ProductMailSurface locale={locale} startHref={startHref} />;
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
      {resource === "files" ? (
        <>
          <div
            className="product-resources__tabs"
            role="tablist"
            aria-label={zh ? "文件来源" : "File source"}
          >
            <button
              aria-selected={source === "tasks"}
              onClick={() => setSource("tasks")}
              role="tab"
              type="button"
            >
              <ProductPlaygroundIcon name="folder" />
              {zh ? "任务成果" : "Task artifacts"}
            </button>
            <button
              aria-selected={source === "cloud"}
              onClick={() => setSource("cloud")}
              role="tab"
              type="button"
            >
              <ProductPlaygroundIcon name="knowledge" />
              {zh ? "云端网盘" : "Cloud storage"}
            </button>
          </div>
          {source === "tasks" ? (
            <>
              <div className="product-resources__filters">
                <button
                  aria-label={zh ? "切换文件类型" : "Change file type"}
                  onClick={() =>
                    setFileType((current) =>
                      current === "all"
                        ? "typescript"
                        : current === "typescript"
                          ? "markdown"
                          : "all",
                    )
                  }
                  type="button"
                >
                  <ProductPlaygroundIcon name="filter" />
                  {fileTypeLabel}
                  <ProductPlaygroundIcon name="chevron" />
                </button>
                <label>
                  <ProductPlaygroundIcon name="search" />
                  <input
                    aria-label={zh ? "搜索文件" : "Search files"}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder={
                      zh
                        ? "搜索文件、任务或工作空间"
                        : "Search files, tasks, or workspaces"
                    }
                    type="search"
                    value={query}
                  />
                </label>
                <label>
                  <input
                    checked={favoritesOnly}
                    onChange={(event) =>
                      setFavoritesOnly(event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  {zh ? "我的收藏" : "Favorites"}
                </label>
              </div>
              <div
                className="product-resources__table"
                role="table"
                aria-label={zh ? "文件列表" : "Files"}
              >
                <div role="row" data-header>
                  <span role="columnheader">{zh ? "名称" : "Name"}</span>
                  <span role="columnheader">{zh ? "类型" : "Type"}</span>
                  <span role="columnheader">{zh ? "更新人" : "Owner"}</span>
                  <span
                    data-mobile-label={zh ? "更新" : "Updated"}
                    role="columnheader"
                  >
                    {zh ? "更新时间" : "Updated"}
                  </span>
                  <span role="columnheader">{zh ? "大小" : "Size"}</span>
                </div>
                <div role="row" data-group>
                  <span role="cell">
                    <ProductPlaygroundIcon name="chevron" />
                    <strong>{zh ? "未分组" : "Uncategorized"}</strong>
                    <small>1 {zh ? "个任务" : "task"}</small>
                  </span>
                </div>
                <div role="row" data-task>
                  <span role="cell">
                    <ProductPlaygroundIcon name="task-add" />
                    <strong>
                      {zh ? "修复会话恢复" : "Fix session recovery"}
                    </strong>
                  </span>
                </div>
                {rows.map(({ row: [name, type, owner, updated, size] }) => (
                  <button
                    aria-pressed={selectedFile === name}
                    key={name}
                    onClick={() => setSelectedFile(name)}
                    role="row"
                    type="button"
                  >
                    <span role="cell">
                      <ProductPlaygroundIcon name="document" />
                      <span className="product-resources__file-name">
                        {name}
                      </span>
                    </span>
                    <span role="cell">{type}</span>
                    <span role="cell">{owner}</span>
                    <span role="cell">
                      {zh ? (updated === "Today" ? "今天" : "昨天") : updated}
                    </span>
                    <span role="cell">{size}</span>
                  </button>
                ))}
                {rows.length === 0 ? (
                  <div data-empty role="row">
                    <span role="cell">
                      {zh ? "没有符合条件的文件" : "No matching files"}
                    </span>
                  </div>
                ) : null}
              </div>
              <output aria-live="polite">
                {selectedFile
                  ? zh
                    ? `已选择 ${selectedFile}`
                    : `${selectedFile} selected`
                  : ""}
              </output>
            </>
          ) : (
            <section className="product-resources__empty product-resources__cloud">
              <span>
                <ProductPlaygroundIcon name="knowledge" />
              </span>
              <h2>{zh ? "连接云端网盘" : "Connect cloud storage"}</h2>
              <p>
                {zh
                  ? "连接后，可在任务中引用已授权的云端文件。"
                  : "Reference authorized cloud files after connecting a provider."}
              </p>
              <button
                data-primary
                onClick={() => setSource("tasks")}
                type="button"
              >
                {zh ? "返回任务成果" : "Back to task artifacts"}
              </button>
            </section>
          )}
        </>
      ) : (
        <ProductConnectionSurface locale={locale} resource={resource} />
      )}
    </section>
  );
}
