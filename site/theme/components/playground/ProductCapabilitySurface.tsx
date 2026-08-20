import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { withBase } from "@rspress/core/runtime";
import { Link } from "@rspress/core/theme";
import { getProductCapabilityRoutePath } from "../../../product-application-routes";
import {
  type ProductCapabilityCategory,
  type ProductCapabilityTab,
  type ProductPlaygroundLocale,
} from "./product-playground-data";
import type { ProductTaskDraft } from "./product-composer-data";
import {
  getProductCapabilityDefinitions,
  type ProductCapabilityDefinition,
  type ProductCapabilityLifecycle,
  useProductCapabilityRegistry,
} from "./product-capability-state";
import {
  ProductCapabilityDetail,
  ProductCapabilityRemoveDialog,
} from "./ProductCapabilityManagement";
import {
  ProductCapabilitySetupDialog,
  type ProductCapabilitySetupResult,
} from "./ProductCapabilitySetupDialog";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const tabs = ["assistants", "skills", "connectors"] as const;

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
  if (lifecycle === "ready") return zh ? "可用" : "Ready";
  if (lifecycle === "attention") return zh ? "需处理" : "Attention";
  if (lifecycle === "disabled") return zh ? "已停用" : "Disabled";
  return zh ? "未配置" : "Not configured";
}

export function ProductCatalogSurface({
  locale,
  onStartTask,
  onTabChange,
  tab,
}: {
  locale: ProductPlaygroundLocale;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
  onTabChange: (tab: ProductCapabilityTab) => void;
  tab: ProductCapabilityTab;
}) {
  const zh = locale === "zh";
  const {
    addCustom,
    registry,
    retryPersistence,
    setPreference,
    storageAvailable,
  } = useProductCapabilityRegistry();
  const definitions = useMemo(
    () => getProductCapabilityDefinitions(tab, registry),
    [registry, tab],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ProductCapabilityCategory>(
    "all",
  );
  const [managedOnly, setManagedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(definitions[0]?.id ?? "");
  const [detailOpen, setDetailOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [status, setStatus] = useState("");
  const [setupTarget, setSetupTarget] = useState<
    "custom" | ProductCapabilityDefinition | null
  >(null);
  const [removeTarget, setRemoveTarget] =
    useState<ProductCapabilityDefinition | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const actionOriginRef = useRef<HTMLElement | null>(null);
  const retryTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 48rem)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(
    () => () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (definitions.some((definition) => definition.id === selectedId)) return;
    setSelectedId(definitions[0]?.id ?? "");
    setDetailOpen(false);
  }, [definitions, selectedId]);

  const visibleDefinitions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return definitions.filter((definition) => {
      const preference = registry.records[definition.id];
      const matchesQuery =
        !normalized ||
        [
          definition.label.en,
          definition.label.zh,
          definition.description.en,
          definition.description.zh,
          definition.tag.en,
          definition.tag.zh,
        ]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(normalized);
      const matchesCategory =
        category === "all" || definition.category === category;
      const matchesManaged =
        !managedOnly || preference?.lifecycle !== "available";
      return matchesQuery && matchesCategory && matchesManaged;
    });
  }, [category, definitions, locale, managedOnly, query, registry.records]);

  useEffect(() => {
    if (visibleDefinitions.some((definition) => definition.id === selectedId)) {
      return;
    }
    setSelectedId(visibleDefinitions[0]?.id ?? "");
    setDetailOpen(false);
  }, [selectedId, visibleDefinitions]);

  const selected =
    definitions.find((definition) => definition.id === selectedId) ??
    definitions[0];
  const selectedPreference = selected
    ? (registry.records[selected.id] ?? {
        lifecycle: "available" as const,
        scope: "current-workspace" as const,
      })
    : undefined;
  const managedCount = definitions.filter(
    (definition) => registry.records[definition.id]?.lifecycle !== "available",
  ).length;
  const attentionCount = definitions.filter(
    (definition) => registry.records[definition.id]?.lifecycle === "attention",
  ).length;

  const categories = [
    ["all", zh ? "全部" : "All"],
    ["product", zh ? "产品设计" : "Product"],
    ["engineering", zh ? "技术工程" : "Engineering"],
    ["data", zh ? "数据智能" : "Data"],
    ["knowledge", zh ? "知识管理" : "Knowledge"],
    ["operations", zh ? "运营协作" : "Operations"],
    ["content", zh ? "内容创作" : "Content"],
  ] as const;

  const heading =
    tab === "assistants"
      ? zh
        ? "管理可复用专家"
        : "Manage reusable assistants"
      : tab === "skills"
        ? zh
          ? "审查并启用技能"
          : "Review and enable skills"
        : zh
          ? "连接工作所需的数据与工具"
          : "Connect the data and tools work needs";
  const description =
    tab === "assistants"
      ? zh
        ? "专家由职责、运行策略、技能、连接器与权限边界共同组成。"
        : "Assistants combine a job, runtime policy, skills, connectors, and permission boundaries."
      : tab === "skills"
        ? zh
          ? "安装前确认来源、执行范围与写入边界；停用不会删除既有证据。"
          : "Confirm source, execution scope, and write boundaries before installation; disabling preserves evidence."
        : zh
          ? "连接状态、授权范围与恢复动作保持可见，凭据始终由宿主管理。"
          : "Connection health, authorization scope, and recovery stay visible while credentials remain host-managed.";

  const changeTab = (nextTab: ProductCapabilityTab) => {
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    setRetryingId(null);
    onTabChange(nextTab);
    setCategory("all");
    setQuery("");
    setStatus("");
    setDetailOpen(false);
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
    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    changeTab(tabs[nextIndex]);
  };

  const restoreActionFocus = () => {
    window.requestAnimationFrame(() => actionOriginRef.current?.focus());
  };

  const openSetup = (
    target: "custom" | ProductCapabilityDefinition,
    origin?: HTMLElement,
  ) => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = undefined;
      setRetryingId(null);
    }
    actionOriginRef.current = origin ?? rowRefs.current.get(selectedId) ?? null;
    setSetupTarget(target);
  };

  const closeSetup = () => {
    setSetupTarget(null);
    restoreActionFocus();
  };

  const saveSetup = (result: ProductCapabilitySetupResult) => {
    if (setupTarget === "custom") {
      const id = addCustom(
        {
          category: result.category,
          description: result.description,
          label: result.label,
          source: result.source,
          tab,
          tag: result.tag,
        },
        result.scope,
        result.permissions,
      );
      setSelectedId(id);
      setDetailOpen(true);
      setStatus(
        zh
          ? `已创建“${result.label}”，并限定在${result.scope === "all-workspaces" ? "所有工作区" : "当前工作区"}。`
          : `${result.label} is ready for ${result.scope === "all-workspaces" ? "all workspaces" : "the current workspace"}.`,
      );
    } else if (setupTarget) {
      setPreference(setupTarget.id, {
        description: result.description,
        lifecycle: "ready",
        permissions: result.permissions,
        scope: result.scope,
        source: result.source,
      });
      setStatus(
        zh
          ? `“${setupTarget.label.zh}”已完成审查，可用于新任务。`
          : `${setupTarget.label.en} passed review and is ready for new tasks.`,
      );
    }
    setSetupTarget(null);
    restoreActionFocus();
  };

  const useSelected = () => {
    if (!selected || selectedPreference?.lifecycle !== "ready") return;
    const kind =
      tab === "assistants" ? "assistant" : tab === "skills" ? "skill" : "connector";
    onStartTask({
      prompt: "",
      resources: [
        {
          id: selected.id,
          kind,
          label: tab === "skills" ? `$${selected.label[locale]}` : selected.label[locale],
          meta: `${selected.tag[locale]} · ${zh ? "已配置" : "Configured"}`,
        },
      ],
      workspace: "ui",
    });
  };

  return (
    <section
      className="product-catalog"
      data-catalog-tab={tab}
      data-detail-open={compact && detailOpen ? "true" : undefined}
      data-product-surface="catalog"
    >
      <header
        className="product-catalog__topbar"
        inert={compact && detailOpen ? true : undefined}
      >
        <div aria-label={zh ? "能力类型" : "Capability type"} role="tablist">
          {tabs.map((id, index) => (
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
                name={id === "assistants" ? "assistant" : id === "skills" ? "checklist" : "link"}
              />
              {tabLabel(id, locale)}
            </Link>
          ))}
        </div>
        <div className="product-catalog__topbar-actions">
          <label>
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={`${zh ? "搜索" : "Search"}${tabLabel(tab, locale)}`}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={`${zh ? "搜索" : "Search"}${tabLabel(tab, locale)}`}
              type="search"
              value={query}
            />
          </label>
          <button
            aria-pressed={managedOnly}
            onClick={() => setManagedOnly((value) => !value)}
            type="button"
          >
            <ProductPlaygroundIcon name="catalog" />
            {zh ? "已管理" : "Managed"}
            <em>{managedCount}</em>
          </button>
          <button
            data-catalog-create
            onClick={(event) => openSetup("custom", event.currentTarget)}
            type="button"
          >
            <ProductPlaygroundIcon name="plus" />
            {tab === "assistants"
              ? zh
                ? "创建专家"
                : "Create assistant"
              : tab === "skills"
                ? zh
                  ? "从来源添加"
                  : "Add from source"
                : zh
                  ? "自定义连接器"
                  : "Custom connector"}
          </button>
        </div>
      </header>

      <section
        aria-labelledby="product-capability-title"
        className="product-catalog__intro"
        inert={compact && detailOpen ? true : undefined}
      >
        <span>
          <h1 id="product-capability-title">{heading}</h1>
          <p>{description}</p>
        </span>
        {attentionCount > 0 ? (
          <button
            onClick={() => {
              setManagedOnly(true);
              const attention = definitions.find(
                (definition) => registry.records[definition.id]?.lifecycle === "attention",
              );
              if (attention) {
                setSelectedId(attention.id);
                setDetailOpen(true);
              }
            }}
            type="button"
          >
            <ProductPlaygroundIcon name="warning" />
            {zh ? `${attentionCount} 项需要处理` : `${attentionCount} need attention`}
          </button>
        ) : (
          <span data-capability-summary>
            <ProductPlaygroundIcon name="check" />
            {zh ? "没有待处理配置" : "No configuration needs attention"}
          </span>
        )}
      </section>

      {!storageAvailable ? (
        <div className="product-catalog__storage-warning" role="status">
          <ProductPlaygroundIcon name="warning" />
          <span>
            <strong>
              {zh ? "更改仅保留在当前页面" : "Changes are only in this page"}
            </strong>
            <small>
              {zh
                ? "浏览器存储不可用。关闭页面前请允许站点存储，然后重试保存。"
                : "Browser storage is unavailable. Allow site storage and retry before closing this page."}
            </small>
          </span>
          <button onClick={retryPersistence} type="button">
            {zh ? "重试保存" : "Retry saving"}
          </button>
        </div>
      ) : null}

      <div className="product-capability-workspace">
        <section
          aria-labelledby="product-capability-directory-title"
          className="product-catalog__directory"
          inert={compact && detailOpen ? true : undefined}
        >
          <header>
            <span>
              <h2 id="product-capability-directory-title">
                {tabLabel(tab, locale)}
              </h2>
              <small>
                {zh
                  ? `显示 ${visibleDefinitions.length} 项，共 ${definitions.length} 项`
                  : `Showing ${visibleDefinitions.length} of ${definitions.length}`}
              </small>
            </span>
            <div aria-label={zh ? "能力分组" : "Capability category"} role="group">
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
          {visibleDefinitions.length > 0 ? (
            <div data-directory-layout={tab}>
              {visibleDefinitions.map((definition) => {
                const preference = registry.records[definition.id] ?? {
                  lifecycle: "available" as const,
                  scope: "current-workspace" as const,
                };
                const selectedEntry = definition.id === selected?.id;
                return (
                  <button
                    aria-current={selectedEntry ? "true" : undefined}
                    className="product-catalog__entry"
                    data-capability-id={definition.id}
                    data-lifecycle={preference.lifecycle}
                    key={definition.id}
                    onClick={() => {
                      setSelectedId(definition.id);
                      setDetailOpen(true);
                    }}
                    ref={(node) => {
                      if (node) rowRefs.current.set(definition.id, node);
                      else rowRefs.current.delete(definition.id);
                    }}
                    type="button"
                  >
                    <span data-capability-mark>
                      <ProductPlaygroundIcon
                        name={
                          tab === "assistants"
                            ? "assistant"
                            : tab === "skills"
                              ? "checklist"
                              : "link"
                        }
                      />
                    </span>
                    <span className="product-catalog__entry-copy">
                      <strong>{definition.label[locale]}</strong>
                      <small>{definition.description[locale]}</small>
                      <span>
                        <em>{definition.tag[locale]}</em>
                        <em>
                          {preference.scope === "all-workspaces"
                            ? zh
                              ? "所有工作区"
                              : "All workspaces"
                            : zh
                              ? "当前工作区"
                              : "Current workspace"}
                        </em>
                      </span>
                    </span>
                    <span data-capability-row-state={preference.lifecycle}>
                      {preference.lifecycle === "attention" ? (
                        <ProductPlaygroundIcon name="warning" />
                      ) : preference.lifecycle === "ready" ? (
                        <ProductPlaygroundIcon name="check" />
                      ) : null}
                      {lifecycleLabel(preference.lifecycle, locale)}
                    </span>
                    <ProductPlaygroundIcon name="chevron" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="product-catalog__empty" role="status">
              <ProductPlaygroundIcon name="search" />
              <strong>{zh ? "没有匹配的能力" : "No matching capabilities"}</strong>
              <p>
                {zh
                  ? "清除搜索、分组或“已管理”筛选后重试。"
                  : "Clear search, category, or the Managed filter and try again."}
              </p>
              <button
                onClick={() => {
                  setCategory("all");
                  setManagedOnly(false);
                  setQuery("");
                }}
                type="button"
              >
                {zh ? "清除筛选" : "Clear filters"}
              </button>
            </div>
          )}
        </section>

        <div className="product-capability-workspace__detail" hidden={compact && !detailOpen}>
          {selected && selectedPreference ? (
            <ProductCapabilityDetail
              compact={compact}
              definition={selected}
              locale={locale}
              onClose={() => {
                setDetailOpen(false);
                window.requestAnimationFrame(() => rowRefs.current.get(selected.id)?.focus());
              }}
              onDisable={() => {
                setPreference(selected.id, {
                  ...selectedPreference,
                  lifecycle: "disabled",
                });
                setStatus(zh ? `已停用“${selected.label.zh}”。` : `${selected.label.en} disabled.`);
              }}
              onEnable={() => {
                setPreference(selected.id, {
                  ...selectedPreference,
                  lifecycle: "ready",
                });
                setStatus(zh ? `已启用“${selected.label.zh}”。` : `${selected.label.en} enabled.`);
              }}
              onRemove={(origin) => {
                if (retryTimerRef.current) {
                  window.clearTimeout(retryTimerRef.current);
                  retryTimerRef.current = undefined;
                  setRetryingId(null);
                }
                actionOriginRef.current = origin;
                setRemoveTarget(selected);
              }}
              onRetry={() => {
                if (retryTimerRef.current) {
                  window.clearTimeout(retryTimerRef.current);
                }
                setRetryingId(selected.id);
                setStatus(
                  zh
                    ? `正在重新检查“${selected.label.zh}”…`
                    : `Rechecking ${selected.label.en}…`,
                );
                retryTimerRef.current = window.setTimeout(() => {
                  retryTimerRef.current = undefined;
                  setPreference(selected.id, {
                    ...selectedPreference,
                    lifecycle: "ready",
                  });
                  setRetryingId(null);
                  setStatus(
                    zh
                      ? `“${selected.label.zh}”已恢复，可用于新任务。`
                      : `${selected.label.en} recovered and is ready for new tasks.`,
                  );
                }, 650);
              }}
              onSetup={(origin) => openSetup(selected, origin)}
              onUse={useSelected}
              preference={selectedPreference}
              retrying={retryingId === selected.id}
            />
          ) : null}
        </div>
      </div>

      <output aria-live="polite" className="product-catalog__status">
        {status}
      </output>

      {setupTarget ? (
        <ProductCapabilitySetupDialog
          definition={setupTarget === "custom" ? undefined : setupTarget}
          initialPreference={
            setupTarget === "custom"
              ? undefined
              : registry.records[setupTarget.id]
          }
          locale={locale}
          onCancel={closeSetup}
          onSave={saveSetup}
          tab={tab}
        />
      ) : null}
      {removeTarget ? (
        <ProductCapabilityRemoveDialog
          definition={removeTarget}
          locale={locale}
          onCancel={() => {
            setRemoveTarget(null);
            restoreActionFocus();
          }}
          onConfirm={() => {
            actionOriginRef.current = rowRefs.current.get(removeTarget.id) ?? null;
            setPreference(removeTarget.id, {
              lifecycle: "available",
              scope: "current-workspace",
            });
            setStatus(
              zh
                ? `已移除“${removeTarget.label.zh}”；已有任务记录保持可读。`
                : `${removeTarget.label.en} removed; existing task history remains readable.`,
            );
            setRemoveTarget(null);
            restoreActionFocus();
          }}
        />
      ) : null}
    </section>
  );
}
