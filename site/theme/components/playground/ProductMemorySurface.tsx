import { useMemo, useState, type CSSProperties } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type MemoryView = "evolution" | "graph" | "timeline";
type MemoryScope = "all" | "personal" | "workspace";

type MemoryRecord = {
  body: { en: string; zh: string };
  id: string;
  kind: "decision" | "fact" | "preference" | "procedure";
  scope: Exclude<MemoryScope, "all">;
  source: { en: string; zh: string };
  time: { en: string; zh: string };
  title: { en: string; zh: string };
};

const memories: readonly MemoryRecord[] = [
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
    source: { en: "A3S UI workspace", zh: "A3S UI 工作空间" },
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
    source: { en: "Explicit preference", zh: "明确偏好" },
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
    source: { en: "Project decision", zh: "项目决策" },
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
    source: { en: "Repository context", zh: "仓库上下文" },
    time: { en: "2 days ago", zh: "2 天前" },
  },
];

const kindCopy = {
  decision: { en: "Decision", zh: "决策" },
  fact: { en: "Fact", zh: "事实" },
  preference: { en: "Preference", zh: "偏好" },
  procedure: { en: "Procedure", zh: "流程" },
} as const;

export function ProductMemorySurface({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [view, setView] = useState<MemoryView>("timeline");
  const [scope, setScope] = useState<MemoryScope>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(memories[0].id);
  const [refreshing, setRefreshing] = useState(false);
  const [candidateStates, setCandidateStates] = useState<
    Record<string, "accepted" | "pending" | "rejected">
  >({ terminology: "pending", testing: "pending" });
  const visibleMemories = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return memories.filter(
      (memory) =>
        (scope === "all" || memory.scope === scope) &&
        (!normalized ||
          `${memory.title.en} ${memory.title.zh} ${memory.body.en} ${memory.body.zh}`
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    );
  }, [locale, query, scope]);
  const selected =
    memories.find((memory) => memory.id === selectedId) ?? memories[0];

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 480);
  };

  return (
    <section className="product-memory" data-product-surface="memory">
      <header className="product-memory__header">
        <div>
          <span>
            <ProductPlaygroundIcon name="brain" />
          </span>
          <div>
            <h1>{zh ? "记忆" : "Memory"}</h1>
            <p>
              {zh
                ? "检查长期上下文的来源、关系与演化，不在这里直接改写事实。"
                : "Inspect the sources, relationships, and evolution of durable context without rewriting facts in place."}
            </p>
          </div>
        </div>
        <div>
          <label>
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={zh ? "搜索记忆" : "Search memory"}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={zh ? "搜索记忆" : "Search memory"}
              type="search"
              value={query}
            />
          </label>
          <button disabled={refreshing} onClick={refresh} type="button">
            <ProductPlaygroundIcon name={refreshing ? "update" : "refresh"} />
            {refreshing ? (zh ? "同步中" : "Syncing") : zh ? "刷新" : "Refresh"}
          </button>
        </div>
      </header>

      <nav aria-label={zh ? "记忆视图" : "Memory views"} role="tablist">
        {(
          [
            ["timeline", zh ? "时间线" : "Timeline", "list"],
            ["graph", zh ? "关系图谱" : "Graph", "project"],
            ["evolution", zh ? "演化候选" : "Evolution", "update"],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            aria-selected={view === id}
            key={id}
            onClick={() => setView(id)}
            role="tab"
            type="button"
          >
            <ProductPlaygroundIcon name={icon} />
            {label}
            {id === "evolution" ? <small>2</small> : null}
          </button>
        ))}
      </nav>

      <div className="product-memory__workspace">
        <aside className="product-memory__filters">
          <header>
            <strong>{zh ? "范围" : "Scope"}</strong>
            <small>{visibleMemories.length}</small>
          </header>
          <div>
            {(
              [
                ["all", zh ? "全部记忆" : "All memory", "database"],
                ["workspace", zh ? "当前工作区" : "Workspace", "workspace"],
                ["personal", zh ? "个人偏好" : "Personal", "assistant"],
              ] as const
            ).map(([id, label, icon]) => (
              <button
                aria-pressed={scope === id}
                key={id}
                onClick={() => setScope(id)}
                type="button"
              >
                <ProductPlaygroundIcon name={icon} />
                <span>{label}</span>
                <small>
                  {id === "all"
                    ? memories.length
                    : memories.filter((item) => item.scope === id).length}
                </small>
              </button>
            ))}
          </div>
          <section>
            <strong>{zh ? "记忆原则" : "Memory policy"}</strong>
            <p>
              {zh
                ? "只保留可追溯、长期有效且能改善后续工作的上下文。"
                : "Keep only traceable, durable context that improves future work."}
            </p>
            <button type="button">
              <ProductPlaygroundIcon name="settings" />
              {zh ? "管理记忆设置" : "Manage memory settings"}
            </button>
          </section>
        </aside>

        <main>
          {view === "timeline" ? (
            <MemoryTimeline
              locale={locale}
              memories={visibleMemories}
              onSelect={setSelectedId}
              selectedId={selectedId}
            />
          ) : null}
          {view === "graph" ? (
            <MemoryGraph
              locale={locale}
              onSelect={setSelectedId}
              selectedId={selectedId}
            />
          ) : null}
          {view === "evolution" ? (
            <MemoryEvolution
              locale={locale}
              onStateChange={(id, state) =>
                setCandidateStates((current) => ({ ...current, [id]: state }))
              }
              states={candidateStates}
            />
          ) : null}
        </main>

        <aside className="product-memory__inspector">
          <header>
            <span data-kind={selected.kind}>
              <ProductPlaygroundIcon name="knowledge" />
            </span>
            <div>
              <small>{kindCopy[selected.kind][locale]}</small>
              <strong>{selected.title[locale]}</strong>
            </div>
          </header>
          <p>{selected.body[locale]}</p>
          <dl>
            <div>
              <dt>{zh ? "范围" : "Scope"}</dt>
              <dd>
                {selected.scope === "workspace"
                  ? zh
                    ? "当前工作区"
                    : "Workspace"
                  : zh
                    ? "个人"
                    : "Personal"}
              </dd>
            </div>
            <div>
              <dt>{zh ? "来源" : "Source"}</dt>
              <dd>{selected.source[locale]}</dd>
            </div>
            <div>
              <dt>{zh ? "更新" : "Updated"}</dt>
              <dd>{selected.time[locale]}</dd>
            </div>
          </dl>
          <section>
            <ProductPlaygroundIcon name="shield" />
            <div>
              <strong>{zh ? "可追溯来源" : "Traceable source"}</strong>
              <small>
                {zh
                  ? "原始任务与确认记录仍然可用。"
                  : "The originating task and confirmation remain available."}
              </small>
            </div>
          </section>
          <footer>
            <button type="button">{zh ? "查看来源" : "Open source"}</button>
            <button data-danger type="button">
              {zh ? "请求遗忘" : "Request removal"}
            </button>
          </footer>
        </aside>
      </div>
    </section>
  );
}

function MemoryTimeline({
  locale,
  memories: visible,
  onSelect,
  selectedId,
}: {
  locale: ProductPlaygroundLocale;
  memories: readonly MemoryRecord[];
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  const zh = locale === "zh";
  return (
    <section className="product-memory__timeline" role="tabpanel">
      <header>
        <div>
          <h2>{zh ? "记忆时间线" : "Memory timeline"}</h2>
          <p>
            {zh
              ? "按最近确认时间排列，选择一条查看来源和使用范围。"
              : "Ordered by confirmation time. Select an item to inspect source and scope."}
          </p>
        </div>
        <button type="button">
          <ProductPlaygroundIcon name="filter" />
          {zh ? "全部类型" : "All types"}
        </button>
      </header>
      {visible.length ? (
        <ol>
          {visible.map((memory, index) => (
            <li key={memory.id}>
              <time>{memory.time[locale]}</time>
              <i aria-hidden="true" />
              <button
                aria-pressed={selectedId === memory.id}
                onClick={() => onSelect(memory.id)}
                type="button"
              >
                <span>
                  <em>{kindCopy[memory.kind][locale]}</em>
                  <small>{memory.source[locale]}</small>
                </span>
                <strong>{memory.title[locale]}</strong>
                <p>{memory.body[locale]}</p>
                <span>
                  <ProductPlaygroundIcon
                    name={
                      memory.scope === "workspace" ? "workspace" : "assistant"
                    }
                  />
                  {memory.scope === "workspace"
                    ? zh
                      ? "工作区"
                      : "Workspace"
                    : zh
                      ? "个人"
                      : "Personal"}
                  {index === 0 ? (
                    <b>{zh ? "最近使用" : "Recently used"}</b>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="product-memory__empty" role="status">
          <ProductPlaygroundIcon name="search" />
          <strong>{zh ? "没有匹配的记忆" : "No matching memories"}</strong>
          <span>
            {zh
              ? "调整搜索词或范围后重试。"
              : "Change the search or scope and try again."}
          </span>
        </div>
      )}
    </section>
  );
}

function MemoryGraph({
  locale,
  onSelect,
  selectedId,
}: {
  locale: ProductPlaygroundLocale;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  const zh = locale === "zh";
  const nodes = [
    ["visual-evidence", 52, 48, zh ? "视觉验收" : "Visual review"],
    ["design-contract", 25, 25, zh ? "设计契约" : "Design contract"],
    ["workspace-boundary", 78, 28, "Rspress"],
    ["language", 22, 72, zh ? "语言偏好" : "Language"],
    ["testing", 78, 72, zh ? "回归测试" : "Regression"],
  ] as const;
  return (
    <section className="product-memory__graph" role="tabpanel">
      <header>
        <div>
          <h2>{zh ? "关系图谱" : "Relationship graph"}</h2>
          <p>
            {zh
              ? "关系表示来源引用和共同作用范围，不代表自动推断出的事实。"
              : "Edges represent shared sources and scope, not automatically inferred facts."}
          </p>
        </div>
        <div>
          <button aria-label={zh ? "缩小" : "Zoom out"} type="button">
            −
          </button>
          <output>100%</output>
          <button aria-label={zh ? "放大" : "Zoom in"} type="button">
            +
          </button>
        </div>
      </header>
      <div data-memory-graph-canvas>
        <svg
          aria-hidden="true"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <path d="M25 25 52 48 78 28M52 48 22 72M52 48 78 72M25 25 22 72M78 28 78 72" />
        </svg>
        {nodes.map(([id, x, y, label], index) => (
          <button
            aria-pressed={selectedId === id}
            key={id}
            onClick={() => {
              if (memories.some((memory) => memory.id === id)) onSelect(id);
            }}
            style={
              {
                "--memory-node-x": `${x}%`,
                "--memory-node-y": `${y}%`,
              } as CSSProperties
            }
            type="button"
          >
            <span data-tone={(index % 4) + 1}>
              <ProductPlaygroundIcon
                name={index === 0 ? "brain" : "knowledge"}
              />
            </span>
            <strong>{label}</strong>
            <small>
              {index === 0
                ? zh
                  ? "核心上下文"
                  : "Core context"
                : zh
                  ? "相关记忆"
                  : "Related memory"}
            </small>
          </button>
        ))}
        <footer>
          <span>
            <i data-tone="workspace" />
            {zh ? "工作区" : "Workspace"}
          </span>
          <span>
            <i data-tone="personal" />
            {zh ? "个人" : "Personal"}
          </span>
          <span>
            <i data-tone="source" />
            {zh ? "来源关系" : "Source link"}
          </span>
        </footer>
      </div>
    </section>
  );
}

function MemoryEvolution({
  locale,
  onStateChange,
  states,
}: {
  locale: ProductPlaygroundLocale;
  onStateChange: (id: string, state: "accepted" | "rejected") => void;
  states: Record<string, "accepted" | "pending" | "rejected">;
}) {
  const zh = locale === "zh";
  const candidates = [
    {
      id: "terminology",
      reason: zh
        ? "最近 4 个任务都要求组件命名保持一致。"
        : "Four recent tasks requested consistent component terminology.",
      title: zh ? "统一使用“工作空间”术语" : "Use “workspace” consistently",
    },
    {
      id: "testing",
      reason: zh
        ? "发布任务反复要求同时检查桌面端和移动端。"
        : "Release tasks repeatedly require both desktop and mobile review.",
      title: zh
        ? "发布验收包含双端截图"
        : "Release review includes both viewport classes",
    },
  ];
  return (
    <section className="product-memory__evolution" role="tabpanel">
      <header>
        <div>
          <h2>{zh ? "演化候选" : "Evolution candidates"}</h2>
          <p>
            {zh
              ? "候选必须由你确认后才会成为长期记忆。"
              : "A candidate becomes durable memory only after your confirmation."}
          </p>
        </div>
        <span>
          <ProductPlaygroundIcon name="shield" />
          {zh ? "需人工确认" : "Review required"}
        </span>
      </header>
      <div>
        {candidates.map((candidate) => (
          <article data-state={states[candidate.id]} key={candidate.id}>
            <header>
              <span>
                <ProductPlaygroundIcon name="update" />
              </span>
              <div>
                <small>{zh ? "建议的新规则" : "Proposed rule"}</small>
                <strong>{candidate.title}</strong>
              </div>
              <em>
                {states[candidate.id] === "accepted"
                  ? zh
                    ? "已接受"
                    : "Accepted"
                  : states[candidate.id] === "rejected"
                    ? zh
                      ? "已忽略"
                      : "Dismissed"
                    : zh
                      ? "待确认"
                      : "Pending"}
              </em>
            </header>
            <p>{candidate.reason}</p>
            <dl>
              <div>
                <dt>{zh ? "证据" : "Evidence"}</dt>
                <dd>{zh ? "4 个任务 · 2 个项目" : "4 tasks · 2 projects"}</dd>
              </div>
              <div>
                <dt>{zh ? "范围" : "Scope"}</dt>
                <dd>{zh ? "当前工作区" : "Workspace"}</dd>
              </div>
            </dl>
            {states[candidate.id] === "pending" ? (
              <footer>
                <button
                  onClick={() => onStateChange(candidate.id, "rejected")}
                  type="button"
                >
                  {zh ? "忽略" : "Dismiss"}
                </button>
                <button
                  data-primary
                  onClick={() => onStateChange(candidate.id, "accepted")}
                  type="button"
                >
                  {zh ? "接受为记忆" : "Accept as memory"}
                </button>
              </footer>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
