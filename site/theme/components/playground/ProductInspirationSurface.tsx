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

type InspirationPreviewName = (typeof inspirationItems)[number]["preview"];

function DashboardPreview({
  locale,
  name,
}: {
  locale: ProductPlaygroundLocale;
  name: Extract<InspirationPreviewName, "dashboard" | "report" | "workbench">;
}) {
  const zh = locale === "zh";
  const content =
    name === "workbench"
      ? {
          heading: zh ? "本周工作" : "This week",
          metrics: [
            [zh ? "已完成" : "Done", "12"],
            [zh ? "待确认" : "Review", "3"],
            [zh ? "完成率" : "Progress", "86%"],
          ],
          rows: zh
            ? ["发布说明", "组件验收", "依赖更新"]
            : ["Release notes", "UI review", "Dependency update"],
        }
      : name === "dashboard"
        ? {
            heading: zh ? "发布准备度" : "Release readiness",
            metrics: [
              [zh ? "检查" : "Checks", "48"],
              [zh ? "通过" : "Passed", "45"],
              [zh ? "风险" : "Risks", "3"],
            ],
            rows: zh
              ? ["视觉验收", "端到端测试", "变更审阅"]
              : ["Visual review", "End-to-end tests", "Change review"],
          }
        : {
            heading: zh ? "体验验收" : "Experience review",
            metrics: [
              [zh ? "视觉" : "Visual", "96"],
              [zh ? "交互" : "Behavior", "94"],
              [zh ? "无障碍" : "A11y", "98"],
            ],
            rows: zh
              ? ["宽屏布局", "移动端导航", "键盘路径"]
              : ["Wide layout", "Mobile navigation", "Keyboard path"],
          };

  return (
    <span data-preview-dashboard>
      <span data-preview-rail>
        <b>{zh ? "概览" : "Overview"}</b>
        <i />
        <i />
        <i />
      </span>
      <span data-preview-workspace>
        <strong>{content.heading}</strong>
        <span data-preview-metrics>
          {content.metrics.map(([label, value]) => (
            <span key={label}>
              <small>{label}</small>
              <b>{value}</b>
            </span>
          ))}
        </span>
        <span data-preview-rows>
          {content.rows.map((row, index) => (
            <span key={row}>
              <i
                data-state={
                  index === content.rows.length - 1 ? "pending" : "ready"
                }
              />
              <b>{row}</b>
              <small>
                {index === content.rows.length - 1 ? "09:30" : "Done"}
              </small>
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

function BoardPreview({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  const columns = zh
    ? [
        ["待处理", "需求复核", "资料清点"],
        ["进行中", "界面优化", "交互验收"],
        ["已完成", "路由整理", "版本说明"],
      ]
    : [
        ["To do", "Review brief", "Audit sources"],
        ["In progress", "Refine UI", "Verify behavior"],
        ["Done", "Organize routes", "Release notes"],
      ];
  return (
    <span data-preview-board>
      <strong>{zh ? "产品交付" : "Product delivery"}</strong>
      <span>
        {columns.map(([label, ...cards]) => (
          <span key={label}>
            <small>{label}</small>
            {cards.map((card) => (
              <b key={card}>{card}</b>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}

function DocumentPreview({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  return (
    <span data-preview-document>
      <small>{zh ? "调研决策简报" : "Research decision brief"}</small>
      <strong>
        {zh ? "让证据进入下一步决策" : "Turn evidence into the next decision"}
      </strong>
      <p>
        {zh
          ? "整理来源、权衡与仍需验证的假设，让结论能够被复核。"
          : "Organize sources, tradeoffs, and assumptions so every conclusion can be reviewed."}
      </p>
      <span>
        <b>{zh ? "结论" : "Decision"}</b>
        <i />
        <i />
        <i />
      </span>
      <em>{zh ? "8 个来源 · 3 项行动" : "8 sources · 3 actions"}</em>
    </span>
  );
}

function GraphPreview({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  return (
    <span data-preview-graph>
      <span>
        <strong>{zh ? "代码关系" : "Code relationships"}</strong>
        <small>
          {zh ? "包 · 模块 · 依赖" : "Packages · modules · dependencies"}
        </small>
      </span>
      <svg viewBox="0 0 320 190">
        <path d="M58 96 128 45m-70 51 70 54m0-105 72 18m-72 87 72-24m0-63 62 34m-62 29 62-29" />
        <g>
          <rect height="32" rx="8" width="74" x="21" y="80" />
          <rect height="32" rx="8" width="74" x="91" y="29" />
          <rect height="32" rx="8" width="74" x="91" y="134" />
          <rect height="36" rx="9" width="82" x="159" y="45" />
          <rect height="36" rx="9" width="82" x="159" y="108" />
          <circle cx="269" cy="97" r="27" />
        </g>
      </svg>
      <em>{zh ? "12 个模块 · 18 条边" : "12 modules · 18 edges"}</em>
    </span>
  );
}

function TimelinePreview({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  const rows = zh
    ? [
        ["09:30", "回归结果"],
        ["11:00", "发布评审"],
        ["15:30", "证据归档"],
      ]
    : [
        ["09:30", "Regression results"],
        ["11:00", "Release review"],
        ["15:30", "Archive evidence"],
      ];
  return (
    <span data-preview-timeline>
      <strong>{zh ? "发布协作日程" : "Release coordination"}</strong>
      <span>
        {rows.map(([time, label], index) => (
          <span key={time}>
            <small>{time}</small>
            <i data-state={index === 0 ? "ready" : "pending"} />
            <b>{label}</b>
          </span>
        ))}
      </span>
      <em>{zh ? "下一次更新 16:00" : "Next update at 16:00"}</em>
    </span>
  );
}

function LibraryPreview({ locale }: { locale: ProductPlaygroundLocale }) {
  const zh = locale === "zh";
  const rows = zh
    ? [
        ["设计规范", "已索引"],
        ["发布流程", "已索引"],
        ["故障恢复", "待更新"],
      ]
    : [
        ["Design system", "Indexed"],
        ["Release process", "Indexed"],
        ["Recovery", "Update due"],
      ];
  return (
    <span data-preview-library>
      <span>
        <strong>{zh ? "团队知识" : "Team knowledge"}</strong>
        <small>{zh ? "搜索资料" : "Search sources"}</small>
      </span>
      <span>
        {rows.map(([label, state], index) => (
          <span key={label}>
            <i data-state={index === rows.length - 1 ? "pending" : "ready"} />
            <b>{label}</b>
            <small>{state}</small>
          </span>
        ))}
      </span>
    </span>
  );
}

function InspirationPreview({
  detail = false,
  locale,
  name,
}: {
  detail?: boolean;
  locale: ProductPlaygroundLocale;
  name: InspirationPreviewName;
}) {
  const zh = locale === "zh";
  const labels: Record<InspirationPreviewName, string> = {
    board: zh ? "产品交付" : "Product delivery",
    dashboard: zh ? "发布准备度" : "Release readiness",
    document: zh ? "决策简报" : "Decision brief",
    graph: zh ? "依赖图谱" : "Dependency map",
    library: zh ? "团队知识" : "Team knowledge",
    report: zh ? "体验验收" : "Experience review",
    timeline: zh ? "发布协作" : "Release coordination",
    workbench: zh ? "个人工作台" : "Personal workbench",
  };
  return (
    <figure
      aria-hidden="true"
      data-detail={detail ? "true" : undefined}
      data-preview={name}
    >
      <span data-preview-window>
        <span data-preview-bar>
          <span>
            <i />
            <i />
            <i />
          </span>
          <strong>{labels[name]}</strong>
          <small>A3S</small>
        </span>
        <span data-preview-canvas>
          {name === "workbench" || name === "dashboard" || name === "report" ? (
            <DashboardPreview locale={locale} name={name} />
          ) : null}
          {name === "board" ? <BoardPreview locale={locale} /> : null}
          {name === "document" ? <DocumentPreview locale={locale} /> : null}
          {name === "graph" ? <GraphPreview locale={locale} /> : null}
          {name === "timeline" ? <TimelinePreview locale={locale} /> : null}
          {name === "library" ? <LibraryPreview locale={locale} /> : null}
        </span>
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
  const selectedCategoryLabel = selectedItem
    ? categories.find(([id]) => id === selectedItem.category)?.[1]
    : undefined;

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favoriteId) => favoriteId !== id)
        : [...current, id],
    );
  };

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
            <ProductPlaygroundIcon name="heart" />
            {zh ? "我的收藏" : "Favorites"}
          </button>
          <label data-focus-owner="container">
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

      {visibleItems.length ? (
        <div className="product-inspiration__gallery">
          {visibleItems.map((item) => (
            <article data-size={item.size} key={item.id}>
              <button
                aria-label={
                  zh ? `打开${item.title.zh}` : `Open ${item.title.en}`
                }
                className="product-inspiration__open"
                onClick={() => setSelected(item.id)}
                type="button"
              >
                <InspirationPreview locale={locale} name={item.preview} />
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
                onClick={() => toggleFavorite(item.id)}
                type="button"
              >
                <ProductPlaygroundIcon name="heart" />
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
              <h2 id="product-inspiration-detail-title">
                {selectedItem.title[locale]}
              </h2>
              <span>
                <button
                  aria-label={
                    favorites.includes(selectedItem.id)
                      ? zh
                        ? `取消收藏${selectedItem.title.zh}`
                        : `Remove ${selectedItem.title.en} from favorites`
                      : zh
                        ? `收藏${selectedItem.title.zh}`
                        : `Add ${selectedItem.title.en} to favorites`
                  }
                  aria-pressed={favorites.includes(selectedItem.id)}
                  onClick={() => toggleFavorite(selectedItem.id)}
                  type="button"
                >
                  <ProductPlaygroundIcon name="heart" />
                </button>
                <button
                  aria-label={zh ? "关闭灵感详情" : "Close inspiration details"}
                  onClick={() => setSelected("")}
                  type="button"
                >
                  <ProductPlaygroundIcon name="close" />
                </button>
              </span>
            </header>
            <section className="product-inspiration__detail-intro">
              <p>{selectedItem.description[locale]}</p>
              <small>{selectedCategoryLabel}</small>
            </section>
            <div data-inspiration-detail-preview>
              <InspirationPreview
                detail
                locale={locale}
                name={selectedItem.preview}
              />
            </div>
            <footer>
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
                {zh ? "一键创建任务" : "Create task"}
                <ProductPlaygroundIcon name="arrow" />
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
