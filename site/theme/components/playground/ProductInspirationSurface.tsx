import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductTaskDraft } from "./product-composer-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type InspirationCategory =
  "all" | "data" | "engineering" | "knowledge" | "product" | "workspace";

const inspirationItems = [
  {
    category: "workspace",
    description: {
      en: "Keep tasks, notes, decisions, and weekly review in one working surface.",
      zh: "在一个工作界面中整理任务、笔记、决策与每周复盘。",
    },
    id: "personal-workbench",
    preview: "workbench",
    size: "medium",
    title: { en: "Personal workbench", zh: "个人工作台" },
    type: "HTML",
  },
  {
    category: "data",
    description: {
      en: "Compare release readiness, failed checks, and ownership at a glance.",
      zh: "一眼对比发布准备度、失败检查与责任归属。",
    },
    id: "release-dashboard",
    preview: "dashboard",
    size: "short",
    title: { en: "Release readiness dashboard", zh: "发布准备度看板" },
    type: "HTML",
  },
  {
    category: "knowledge",
    description: {
      en: "Turn source notes into a durable review with decisions and citations.",
      zh: "将来源笔记整理为包含决策与引用的长期评审。",
    },
    id: "research-brief",
    preview: "document",
    size: "tall",
    title: { en: "Research decision brief", zh: "调研决策简报" },
    type: "Markdown",
  },
  {
    category: "product",
    description: {
      en: "Trace user needs, acceptance criteria, risk, and release evidence.",
      zh: "串联用户需求、验收标准、风险与发布证据。",
    },
    id: "delivery-board",
    preview: "board",
    size: "medium",
    title: { en: "Product delivery board", zh: "产品交付看板" },
    type: "HTML",
  },
  {
    category: "engineering",
    description: {
      en: "Map package ownership and dependency direction before a change.",
      zh: "在变更前梳理包归属与依赖方向。",
    },
    id: "dependency-map",
    preview: "graph",
    size: "tall",
    title: { en: "Repository dependency map", zh: "仓库依赖图谱" },
    type: "HTML",
  },
  {
    category: "data",
    description: {
      en: "Summarize visual, interaction, responsive, and accessibility results.",
      zh: "汇总视觉、交互、响应式与无障碍验收结果。",
    },
    id: "acceptance-report",
    preview: "report",
    size: "medium",
    title: { en: "Interface acceptance report", zh: "界面验收报告" },
    type: "HTML",
  },
  {
    category: "workspace",
    description: {
      en: "Coordinate schedule, approvals, evidence, and recovery steps.",
      zh: "协调排期、审批、证据与恢复步骤。",
    },
    id: "release-room",
    preview: "timeline",
    size: "short",
    title: { en: "Release coordination room", zh: "发布协作空间" },
    type: "HTML",
  },
  {
    category: "knowledge",
    description: {
      en: "Organize procedures, recurring questions, and verified examples.",
      zh: "整理流程、常见问题与已验证示例。",
    },
    id: "knowledge-starter",
    preview: "library",
    size: "medium",
    title: { en: "Team knowledge starter", zh: "团队知识库启动包" },
    type: "Markdown",
  },
] as const;

function InspirationPreview({ name }: { name: string }) {
  return (
    <figure aria-hidden="true" data-preview={name}>
      <span data-preview-bar>
        <i />
        <i />
        <i />
      </span>
      <span data-preview-sidebar>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span data-preview-canvas>
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    </figure>
  );
}

export function ProductInspirationSurface({
  locale,
  onStartTask,
}: {
  locale: ProductPlaygroundLocale;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
}) {
  const zh = locale === "zh";
  const [category, setCategory] = useState<InspirationCategory>("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const detailRef = useRef<HTMLDialogElement>(null);
  const categories = [
    ["all", zh ? "全部" : "All"],
    ["workspace", zh ? "个人工作台" : "Workspaces"],
    ["product", zh ? "产品协作" : "Product"],
    ["engineering", zh ? "开发工具" : "Engineering"],
    ["data", zh ? "数据分析" : "Data"],
    ["knowledge", zh ? "知识与学习" : "Knowledge"],
  ] as const;
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return inspirationItems.filter((item) => {
      const matchesCategory = category === "all" || item.category === category;
      const matchesFavorite = !favoritesOnly || favorites.includes(item.id);
      const matchesQuery =
        !normalized ||
        [
          item.title.en,
          item.title.zh,
          item.description.en,
          item.description.zh,
          item.type,
        ]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(normalized);
      return matchesCategory && matchesFavorite && matchesQuery;
    });
  }, [category, favorites, favoritesOnly, locale, query]);
  const selectedItem = inspirationItems.find((item) => item.id === selected);

  useEffect(() => {
    const dialog = detailRef.current;
    if (!dialog) return;
    if (selectedItem && !dialog.open) dialog.showModal();
    if (!selectedItem && dialog.open) dialog.close();
  }, [selectedItem]);

  return (
    <section className="product-inspiration" data-product-surface="inspiration">
      <header>
        <div>
          <h1>{zh ? "灵感" : "Inspiration"}</h1>
          <p>
            {zh
              ? "将成熟工作流沉淀为可复用的任务起点。"
              : "Turn proven workflows into reusable starting points."}
          </p>
        </div>
        <div>
          <button
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="check" />
            {zh ? "我的收藏" : "Favorites"}
          </button>
          <label>
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={zh ? "搜索灵感" : "Search inspiration"}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={zh ? "搜索灵感" : "Search inspiration"}
              type="search"
              value={query}
            />
          </label>
        </div>
      </header>

      <div
        aria-label={zh ? "灵感分类" : "Inspiration categories"}
        className="product-inspiration__categories"
        role="tablist"
      >
        {categories.map(([id, label]) => (
          <button
            aria-selected={category === id}
            key={id}
            onClick={() => setCategory(id)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {visibleItems.length ? (
        <div className="product-inspiration__gallery">
          {visibleItems.map((item) => (
            <article data-size={item.size} key={item.id}>
              <button
                className="product-inspiration__open"
                onClick={() => setSelected(item.id)}
                type="button"
              >
                <InspirationPreview name={item.preview} />
                <span className="product-inspiration__copy">
                  <span>
                    <strong>{item.title[locale]}</strong>
                    <small>{item.type}</small>
                  </span>
                  <span>{item.description[locale]}</span>
                  <em>{zh ? "A3S 官方" : "Official A3S"}</em>
                </span>
              </button>
              <button
                aria-label={
                  favorites.includes(item.id)
                    ? zh
                      ? `取消收藏${item.title.zh}`
                      : `Remove ${item.title.en} from favorites`
                    : zh
                      ? `收藏${item.title.zh}`
                      : `Add ${item.title.en} to favorites`
                }
                aria-pressed={favorites.includes(item.id)}
                className="product-inspiration__favorite"
                onClick={() =>
                  setFavorites((current) =>
                    current.includes(item.id)
                      ? current.filter((id) => id !== item.id)
                      : [...current, item.id],
                  )
                }
                type="button"
              >
                <ProductPlaygroundIcon name="inspiration" />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <section className="product-inspiration__empty" role="status">
          <ProductPlaygroundIcon name="search" />
          <strong>{zh ? "没有匹配的灵感" : "No matching inspiration"}</strong>
          <p>
            {favoritesOnly
              ? zh
                ? "先收藏一个工作流，或关闭收藏筛选。"
                : "Save a workflow first or turn off the favorites filter."
              : zh
                ? "调整关键词或选择其他分类。"
                : "Change the search term or choose another category."}
          </p>
          <button
            onClick={() => {
              setCategory("all");
              setFavoritesOnly(false);
              setQuery("");
            }}
            type="button"
          >
            {zh ? "清除筛选" : "Clear filters"}
          </button>
        </section>
      )}
      <dialog
        aria-labelledby="product-inspiration-detail-title"
        className="product-inspiration__detail"
        onCancel={(event) => {
          event.preventDefault();
          setSelected("");
        }}
        onClose={() => setSelected("")}
        ref={detailRef}
      >
        {selectedItem ? (
          <>
            <header>
              <span>
                <small>{selectedItem.type}</small>
                <h2 id="product-inspiration-detail-title">
                  {selectedItem.title[locale]}
                </h2>
              </span>
              <button
                aria-label={zh ? "关闭灵感详情" : "Close inspiration details"}
                onClick={() => setSelected("")}
                type="button"
              >
                <ProductPlaygroundIcon name="close" />
              </button>
            </header>
            <div data-inspiration-detail-preview>
              <InspirationPreview name={selectedItem.preview} />
            </div>
            <section>
              <p>{selectedItem.description[locale]}</p>
              <dl>
                <div>
                  <dt>{zh ? "形式" : "Format"}</dt>
                  <dd>{selectedItem.type}</dd>
                </div>
                <div>
                  <dt>{zh ? "任务上下文" : "Task context"}</dt>
                  <dd>{zh ? "可在创建后继续编辑" : "Editable after creation"}</dd>
                </div>
              </dl>
              <h3>{zh ? "从这里开始" : "Start from here"}</h3>
              <ol>
                <li>{zh ? "确认目标和期望产物" : "Confirm the goal and expected output"}</li>
                <li>{zh ? "选择工作区文件与知识来源" : "Choose workspace files and knowledge sources"}</li>
                <li>{zh ? "生成首版并保留验证步骤" : "Create the first version with verification steps"}</li>
              </ol>
            </section>
            <footer>
              <button onClick={() => setSelected("")} type="button">
                {zh ? "返回" : "Back"}
              </button>
              <button
                data-primary
                onClick={() =>
                  onStartTask({
                    prompt: zh
                      ? `以“${selectedItem.title.zh}”为起点：${selectedItem.description.zh} 先确认目标、可用资料和完成标准。`
                      : `Use “${selectedItem.title.en}” as the starting point: ${selectedItem.description.en} First confirm the goal, available sources, and completion criteria.`,
                    resources: [
                      {
                        id: `inspiration:${selectedItem.id}`,
                        kind: "selection",
                        label: selectedItem.title[locale],
                        meta: zh
                          ? `灵感模板 · ${selectedItem.type}`
                          : `Inspiration template · ${selectedItem.type}`,
                      },
                    ],
                    workspace: "ui",
                  })
                }
                type="button"
              >
                <ProductPlaygroundIcon name="task-add" />
                {zh ? "从此创建任务" : "Create task from this"}
              </button>
            </footer>
          </>
        ) : null}
      </dialog>
      <output aria-live="polite">
        {selectedItem
          ? zh
            ? `已打开“${selectedItem.title.zh}”详情。`
            : `${selectedItem.title.en} details opened.`
          : ""}
      </output>
    </section>
  );
}
