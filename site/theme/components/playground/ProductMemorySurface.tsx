import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  initialProductMemories,
  productMemoryCandidates,
  productMemoryFromCandidate,
  productMemoryKindCopy,
  type ProductMemoryCandidateState,
  type ProductMemoryKind,
  type ProductMemoryRecord,
  type ProductMemoryScope,
  type ProductMemoryView,
} from "./product-memory-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductTaskDraft } from "./product-composer-data";
import { ProductMemoryInspector } from "./ProductMemoryInspector";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductMemorySurface({
  locale,
  onOpenMemorySettings,
  onStartTask,
}: {
  locale: ProductPlaygroundLocale;
  onOpenMemorySettings: () => void;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
}) {
  const zh = locale === "zh";
  const tabId = useId().replaceAll(":", "");
  const refreshTimer = useRef<number | undefined>(undefined);
  const recordTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );
  const tabRefs = useRef<Record<ProductMemoryView, HTMLButtonElement | null>>({
    evolution: null,
    graph: null,
    timeline: null,
  });
  const [candidateStates, setCandidateStates] = useState<
    Record<string, ProductMemoryCandidateState>
  >(() =>
    Object.fromEntries(
      productMemoryCandidates.map((candidate) => [candidate.id, "pending"]),
    ),
  );
  const [compactInspector, setCompactInspector] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [kind, setKind] = useState<ProductMemoryKind | "all">("all");
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<ProductMemoryRecord[]>(() =>
    initialProductMemories.map((memory) => ({ ...memory })),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [removalRequests, setRemovalRequests] = useState<
    Record<string, boolean>
  >({});
  const [scope, setScope] = useState<ProductMemoryScope>("all");
  const [selectedId, setSelectedId] = useState(initialProductMemories[0].id);
  const [status, setStatus] = useState("");
  const [view, setView] = useState<ProductMemoryView>("timeline");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 86rem)");
    const update = () => setCompactInspector(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(
    () => () => {
      if (refreshTimer.current !== undefined) {
        window.clearTimeout(refreshTimer.current);
      }
    },
    [],
  );

  const visibleMemories = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return records.filter(
      (memory) =>
        (scope === "all" || memory.scope === scope) &&
        (kind === "all" || memory.kind === kind) &&
        (!normalized ||
          `${memory.title.en} ${memory.title.zh} ${memory.body.en} ${memory.body.zh} ${memory.source.en} ${memory.source.zh}`
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    );
  }, [kind, locale, query, records, scope]);
  const selected = visibleMemories.find((memory) => memory.id === selectedId);
  const pendingCandidateCount = productMemoryCandidates.filter(
    (candidate) => candidateStates[candidate.id] === "pending",
  ).length;
  const modalInspectorOpen = compactInspector && inspectorOpen && !!selected;

  useEffect(() => {
    if (visibleMemories.length === 0) {
      setInspectorOpen(false);
      return;
    }
    if (!visibleMemories.some((memory) => memory.id === selectedId)) {
      setSelectedId(visibleMemories[0].id);
      setInspectorOpen(false);
    }
  }, [selectedId, visibleMemories]);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setStatus(
      zh ? "正在检查记忆来源变化。" : "Checking memory source changes.",
    );
    if (refreshTimer.current !== undefined) {
      window.clearTimeout(refreshTimer.current);
    }
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = undefined;
      setRefreshing(false);
      setStatus(
        zh
          ? `已同步 ${records.length} 条记忆，没有未审核的外部变更。`
          : `${records.length} memories synchronized with no unreviewed external changes.`,
      );
    }, 480);
  };

  const selectView = (nextView: ProductMemoryView, focus = false) => {
    setView(nextView);
    if (nextView === "evolution") setInspectorOpen(false);
    if (focus) tabRefs.current[nextView]?.focus();
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentView: ProductMemoryView,
  ) => {
    const views: readonly ProductMemoryView[] = [
      "timeline",
      "graph",
      "evolution",
    ];
    const currentIndex = views.indexOf(currentView);
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % views.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + views.length) % views.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = views.length - 1;
    }
    if (nextIndex === undefined) return;
    event.preventDefault();
    selectView(views[nextIndex], true);
  };

  const selectMemory = (id: string) => {
    setSelectedId(id);
    setInspectorOpen(true);
  };

  const closeInspector = () => {
    setInspectorOpen(false);
    window.requestAnimationFrame(() =>
      recordTriggerRefs.current[selectedId]?.focus(),
    );
  };

  const updateCandidateState = (
    id: string,
    nextState: ProductMemoryCandidateState,
  ) => {
    const candidate = productMemoryCandidates.find((item) => item.id === id);
    if (!candidate) return;
    setCandidateStates((current) => ({ ...current, [id]: nextState }));
    setRecords((current) => {
      const withoutCandidate = current.filter(
        (memory) => memory.id !== `evolution-${id}`,
      );
      return nextState === "accepted"
        ? [productMemoryFromCandidate(candidate), ...withoutCandidate]
        : withoutCandidate;
    });
    setStatus(
      nextState === "accepted"
        ? zh
          ? `已将“${candidate.title.zh}”保存为长期记忆。`
          : `${candidate.title.en} saved as durable memory.`
        : nextState === "rejected"
          ? zh
            ? `已忽略“${candidate.title.zh}”，不会写入记忆。`
            : `${candidate.title.en} dismissed without changing memory.`
          : zh
            ? `已重新打开“${candidate.title.zh}”评审。`
            : `${candidate.title.en} reopened for review.`,
    );
  };

  const useMemoryInTask = (memory: ProductMemoryRecord) => {
    if (removalRequests[memory.id]) return;
    onStartTask({
      prompt: zh
        ? `在新任务中应用已确认的记忆“${memory.title.zh}”，并在结论中保留来源边界。`
        : `Apply the confirmed memory “${memory.title.en}” in a new task and preserve its source boundary in the result.`,
      resources: [
        {
          id: `memory:${memory.id}`,
          kind: "selection",
          label: memory.title[locale],
          meta:
            memory.scope === "workspace"
              ? zh
                ? "记忆 · 当前工作空间"
                : "Memory · Workspace"
              : zh
                ? "记忆 · 个人"
                : "Memory · Personal",
        },
      ],
      workspace: "ui",
    });
  };

  return (
    <section
      className="product-memory"
      data-memory-record-count={records.length}
      data-product-surface="memory"
      data-view={view}
    >
      <header
        className="product-memory__header"
        inert={modalInspectorOpen ? true : undefined}
      >
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
          <button
            aria-busy={refreshing}
            disabled={refreshing}
            onClick={refresh}
            type="button"
          >
            <ProductPlaygroundIcon name={refreshing ? "update" : "refresh"} />
            {refreshing ? (zh ? "同步中" : "Syncing") : zh ? "刷新" : "Refresh"}
          </button>
        </div>
      </header>

      <nav
        aria-label={zh ? "记忆视图" : "Memory views"}
        aria-orientation="horizontal"
        inert={modalInspectorOpen ? true : undefined}
        role="tablist"
      >
        {(
          [
            ["timeline", zh ? "时间线" : "Timeline", "list"],
            ["graph", zh ? "关系图谱" : "Graph", "project"],
            ["evolution", zh ? "演化候选" : "Evolution", "update"],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            aria-controls={`${tabId}-${id}-panel`}
            aria-selected={view === id}
            id={`${tabId}-${id}-tab`}
            key={id}
            onClick={() => selectView(id)}
            onKeyDown={(event) => handleTabKeyDown(event, id)}
            ref={(element) => {
              tabRefs.current[id] = element;
            }}
            role="tab"
            tabIndex={view === id ? 0 : -1}
            type="button"
          >
            <ProductPlaygroundIcon name={icon} />
            {label}
            {id === "evolution" && pendingCandidateCount > 0 ? (
              <small data-memory-pending-count={pendingCandidateCount}>
                {pendingCandidateCount}
              </small>
            ) : null}
          </button>
        ))}
      </nav>

      <div
        className="product-memory__workspace"
        data-inspector-open={modalInspectorOpen ? "true" : undefined}
      >
        <aside
          className="product-memory__filters"
          inert={modalInspectorOpen ? true : undefined}
        >
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
                    ? records.length
                    : records.filter((item) => item.scope === id).length}
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
            <button onClick={onOpenMemorySettings} type="button">
              <ProductPlaygroundIcon name="settings" />
              {zh ? "管理记忆设置" : "Manage memory settings"}
            </button>
          </section>
        </aside>

        <main inert={modalInspectorOpen ? true : undefined}>
          {view === "timeline" ? (
            <div
              aria-labelledby={`${tabId}-timeline-tab`}
              id={`${tabId}-timeline-panel`}
              role="tabpanel"
              tabIndex={0}
            >
              <MemoryTimeline
                kind={kind}
                locale={locale}
                memories={visibleMemories}
                onKindChange={setKind}
                onRegisterTrigger={(id, element) => {
                  recordTriggerRefs.current[id] = element;
                }}
                onSelect={selectMemory}
                removalRequests={removalRequests}
                selectedId={selectedId}
              />
            </div>
          ) : null}
          {view === "graph" ? (
            <div
              aria-labelledby={`${tabId}-graph-tab`}
              id={`${tabId}-graph-panel`}
              role="tabpanel"
              tabIndex={0}
            >
              <MemoryGraph
                locale={locale}
                memories={visibleMemories}
                onRegisterTrigger={(id, element) => {
                  recordTriggerRefs.current[id] = element;
                }}
                onSelect={selectMemory}
                removalRequests={removalRequests}
                selectedId={selectedId}
              />
            </div>
          ) : null}
          {view === "evolution" ? (
            <div
              aria-labelledby={`${tabId}-evolution-tab`}
              id={`${tabId}-evolution-panel`}
              role="tabpanel"
              tabIndex={0}
            >
              <MemoryEvolution
                locale={locale}
                onStateChange={updateCandidateState}
                query={query}
                scope={scope}
                states={candidateStates}
              />
            </div>
          ) : null}
        </main>

        {modalInspectorOpen ? (
          <button
            aria-label={zh ? "关闭记忆详情" : "Close memory details"}
            data-memory-inspector-backdrop
            onClick={closeInspector}
            type="button"
          />
        ) : null}
        {view !== "evolution" && selected ? (
          <ProductMemoryInspector
            compact={compactInspector}
            locale={locale}
            onClose={closeInspector}
            onRequestRemoval={() => {
              setRemovalRequests((current) => ({
                ...current,
                [selected.id]: true,
              }));
              setStatus(
                zh
                  ? `已请求遗忘“${selected.title.zh}”；它已停止用于新任务。`
                  : `Removal requested for ${selected.title.en}; it is excluded from new tasks.`,
              );
            }}
            onUndoRemoval={() => {
              setRemovalRequests((current) => {
                const next = { ...current };
                delete next[selected.id];
                return next;
              });
              setStatus(
                zh
                  ? `已撤销“${selected.title.zh}”的遗忘请求。`
                  : `Removal request for ${selected.title.en} undone.`,
              );
            }}
            onUseInTask={() => useMemoryInTask(selected)}
            open={inspectorOpen}
            record={selected}
            removalPending={Boolean(removalRequests[selected.id])}
          />
        ) : null}
      </div>
      <output aria-live="polite" className="product-memory__status">
        {status}
      </output>
    </section>
  );
}

function MemoryTimeline({
  kind,
  locale,
  memories: visible,
  onKindChange,
  onRegisterTrigger,
  onSelect,
  removalRequests,
  selectedId,
}: {
  kind: ProductMemoryKind | "all";
  locale: ProductPlaygroundLocale;
  memories: readonly ProductMemoryRecord[];
  onKindChange: (kind: ProductMemoryKind | "all") => void;
  onRegisterTrigger: (id: string, element: HTMLButtonElement | null) => void;
  onSelect: (id: string) => void;
  removalRequests: Record<string, boolean>;
  selectedId: string;
}) {
  const zh = locale === "zh";
  return (
    <section className="product-memory__timeline">
      <header>
        <div>
          <h2>{zh ? "记忆时间线" : "Memory timeline"}</h2>
          <p>
            {zh
              ? "按最近确认时间排列，选择一条查看来源和使用范围。"
              : "Ordered by confirmation time. Select an item to inspect source and scope."}
          </p>
        </div>
        <label data-memory-kind-filter>
          <ProductPlaygroundIcon name="filter" />
          <select
            aria-label={zh ? "按类型筛选记忆" : "Filter memory by type"}
            onChange={(event) =>
              onKindChange(
                event.currentTarget.value as ProductMemoryKind | "all",
              )
            }
            value={kind}
          >
            <option value="all">{zh ? "全部类型" : "All types"}</option>
            {(["decision", "fact", "preference", "procedure"] as const).map(
              (memoryKind) => (
                <option key={memoryKind} value={memoryKind}>
                  {productMemoryKindCopy[memoryKind][locale]}
                </option>
              ),
            )}
          </select>
        </label>
      </header>
      {visible.length ? (
        <ol>
          {visible.map((memory, index) => (
            <li
              data-memory-id={memory.id}
              data-removal={removalRequests[memory.id] ? "pending" : undefined}
              key={memory.id}
            >
              <time>{memory.time[locale]}</time>
              <i aria-hidden="true" />
              <button
                aria-pressed={selectedId === memory.id}
                onClick={() => onSelect(memory.id)}
                ref={(element) => onRegisterTrigger(memory.id, element)}
                type="button"
              >
                <span>
                  <em>{productMemoryKindCopy[memory.kind][locale]}</em>
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
                  {index === 0 && !removalRequests[memory.id] ? (
                    <b>{zh ? "最近使用" : "Recently used"}</b>
                  ) : null}
                  {removalRequests[memory.id] ? (
                    <b data-removal-pending>
                      {zh ? "遗忘处理中" : "Removal pending"}
                    </b>
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
  memories: visible,
  onRegisterTrigger,
  onSelect,
  removalRequests,
  selectedId,
}: {
  locale: ProductPlaygroundLocale;
  memories: readonly ProductMemoryRecord[];
  onRegisterTrigger: (id: string, element: HTMLButtonElement | null) => void;
  onSelect: (id: string) => void;
  removalRequests: Record<string, boolean>;
  selectedId: string;
}) {
  const zh = locale === "zh";
  const [zoom, setZoom] = useState(100);
  const nodeDefinitions = {
    "design-contract": [25, 25, zh ? "设计契约" : "Design contract"],
    language: [22, 72, zh ? "语言偏好" : "Language"],
    testing: [78, 72, zh ? "回归测试" : "Regression"],
    "visual-evidence": [52, 48, zh ? "视觉验收" : "Visual review"],
    "workspace-boundary": [78, 28, "Rspress"],
  } as const;
  const nodes = visible.flatMap((memory) => {
    const definition =
      nodeDefinitions[memory.id as keyof typeof nodeDefinitions];
    return definition
      ? [
          {
            id: memory.id,
            label: definition[2],
            scope: memory.scope,
            x: definition[0],
            y: definition[1],
          },
        ]
      : [];
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = [
    ["design-contract", "visual-evidence"],
    ["visual-evidence", "workspace-boundary"],
    ["visual-evidence", "language"],
    ["visual-evidence", "testing"],
    ["design-contract", "language"],
    ["workspace-boundary", "testing"],
  ] as const;
  return (
    <section className="product-memory__graph">
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
          <button
            aria-label={zh ? "缩小" : "Zoom out"}
            disabled={zoom <= 80}
            onClick={() => setZoom((value) => Math.max(80, value - 20))}
            type="button"
          >
            <ProductPlaygroundIcon name="minus" />
          </button>
          <output aria-live="polite" data-memory-graph-zoom>
            {zoom}%
          </output>
          <button
            aria-label={zh ? "放大" : "Zoom in"}
            disabled={zoom >= 140}
            onClick={() => setZoom((value) => Math.min(140, value + 20))}
            type="button"
          >
            <ProductPlaygroundIcon name="plus" />
          </button>
        </div>
      </header>
      <div data-memory-graph-canvas>
        {nodes.length > 0 ? (
          <div
            data-memory-graph-viewport
            style={
              {
                "--memory-graph-scale": zoom / 100,
              } as CSSProperties
            }
          >
            <svg
              aria-hidden="true"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {edges.map(([fromId, toId]) => {
                const from = nodeById.get(fromId);
                const to = nodeById.get(toId);
                return from && to ? (
                  <line
                    key={`${fromId}-${toId}`}
                    x1={from.x}
                    x2={to.x}
                    y1={from.y}
                    y2={to.y}
                  />
                ) : null;
              })}
            </svg>
            {nodes.map((node) => (
              <button
                aria-pressed={selectedId === node.id}
                data-memory-id={node.id}
                data-removal={removalRequests[node.id] ? "pending" : undefined}
                key={node.id}
                onClick={() => onSelect(node.id)}
                ref={(element) => onRegisterTrigger(node.id, element)}
                style={
                  {
                    "--memory-node-x": `${node.x}%`,
                    "--memory-node-y": `${node.y}%`,
                  } as CSSProperties
                }
                type="button"
              >
                <span data-tone={node.scope}>
                  <ProductPlaygroundIcon
                    name={node.id === "visual-evidence" ? "brain" : "knowledge"}
                  />
                </span>
                <strong>{node.label}</strong>
                <small>
                  {removalRequests[node.id]
                    ? zh
                      ? "遗忘处理中"
                      : "Removal pending"
                    : node.id === "visual-evidence"
                      ? zh
                        ? "核心上下文"
                        : "Core context"
                      : zh
                        ? "相关记忆"
                        : "Related memory"}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="product-memory__empty" role="status">
            <ProductPlaygroundIcon name="search" />
            <strong>
              {zh ? "没有匹配的图谱节点" : "No matching graph nodes"}
            </strong>
            <span>
              {zh
                ? "调整搜索、范围或类型筛选后重试。"
                : "Change the search, scope, or type filter and try again."}
            </span>
          </div>
        )}
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
  query,
  scope,
  states,
}: {
  locale: ProductPlaygroundLocale;
  onStateChange: (id: string, state: ProductMemoryCandidateState) => void;
  query: string;
  scope: ProductMemoryScope;
  states: Record<string, ProductMemoryCandidateState>;
}) {
  const zh = locale === "zh";
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const candidates = productMemoryCandidates.filter(
    (candidate) =>
      (scope === "all" || candidate.scope === scope) &&
      (!normalizedQuery ||
        `${candidate.title.en} ${candidate.title.zh} ${candidate.reason.en} ${candidate.reason.zh}`
          .toLocaleLowerCase(locale)
          .includes(normalizedQuery)),
  );
  return (
    <section className="product-memory__evolution">
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
      {candidates.length > 0 ? (
        <div>
          {candidates.map((candidate) => (
            <article
              data-memory-candidate-id={candidate.id}
              data-state={states[candidate.id]}
              key={candidate.id}
            >
              <header>
                <span>
                  <ProductPlaygroundIcon name="update" />
                </span>
                <div>
                  <small>{zh ? "建议的新记忆" : "Proposed memory"}</small>
                  <strong>{candidate.title[locale]}</strong>
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
              <p data-memory-candidate-proposal>{candidate.body[locale]}</p>
              <dl>
                <div>
                  <dt>{zh ? "建议原因" : "Why suggested"}</dt>
                  <dd>{candidate.reason[locale]}</dd>
                </div>
                <div>
                  <dt>{zh ? "证据" : "Evidence"}</dt>
                  <dd>{candidate.evidence[locale]}</dd>
                </div>
                <div>
                  <dt>{zh ? "写入范围" : "Write scope"}</dt>
                  <dd>
                    {candidate.scope === "workspace"
                      ? zh
                        ? "当前工作空间"
                        : "Workspace"
                      : zh
                        ? "个人"
                        : "Personal"}
                  </dd>
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
              ) : (
                <footer>
                  <button
                    onClick={() => onStateChange(candidate.id, "pending")}
                    type="button"
                  >
                    <ProductPlaygroundIcon name="refresh" />
                    {zh ? "重新评审" : "Reopen review"}
                  </button>
                </footer>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="product-memory__empty" role="status">
          <ProductPlaygroundIcon name="search" />
          <strong>
            {zh ? "没有匹配的演化候选" : "No matching evolution candidates"}
          </strong>
          <span>
            {zh
              ? "调整搜索或范围筛选后重试。"
              : "Change the search or scope filter and try again."}
          </span>
        </div>
      )}
    </section>
  );
}
