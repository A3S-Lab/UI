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
  ProductCapabilityBrowse,
  type CatalogSort,
} from "./ProductCapabilityBrowse";
import {
  getProductCapabilityDefinitions,
  type ProductCapabilityDefinition,
  useProductCapabilityRegistry,
} from "./product-capability-state";
import {
  ProductCapabilityDetailDialog,
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

function searchPlaceholder(
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (tab === "assistants") {
    return zh ? "搜索专家职能或描述" : "Search assistant roles or descriptions";
  }
  if (tab === "skills") return zh ? "搜索技能" : "Search skills";
  return zh ? "搜索连接器" : "Search connectors";
}

function managedLabel(
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (tab === "assistants") return zh ? "我的专家" : "My assistants";
  if (tab === "skills") return zh ? "已安装" : "Installed";
  return zh ? "已连接" : "Connected";
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
  const [sort, setSort] = useState<CatalogSort>("relevance");
  const [featuredOffset, setFeaturedOffset] = useState(0);
  const [selectedId, setSelectedId] = useState(definitions[0]?.id ?? "");
  const [detailOpen, setDetailOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [setupTarget, setSetupTarget] = useState<
    "custom" | ProductCapabilityDefinition | null
  >(null);
  const [removeTarget, setRemoveTarget] =
    useState<ProductCapabilityDefinition | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const detailOriginRef = useRef<HTMLElement | null>(null);
  const actionOriginRef = useRef<HTMLElement | null>(null);
  const retryTimerRef = useRef<number | undefined>(undefined);

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
    const lifecycleRank = {
      attention: 1,
      available: 3,
      disabled: 2,
      ready: 0,
    } as const;
    const filtered = definitions.filter((definition) => {
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

    if (sort === "relevance") return filtered;
    return [...filtered].sort((left, right) => {
      if (sort === "configured") {
        const leftLifecycle =
          registry.records[left.id]?.lifecycle ?? "available";
        const rightLifecycle =
          registry.records[right.id]?.lifecycle ?? "available";
        const lifecycleDifference =
          lifecycleRank[leftLifecycle] - lifecycleRank[rightLifecycle];
        if (lifecycleDifference !== 0) return lifecycleDifference;
      }
      return left.label[locale].localeCompare(right.label[locale], locale);
    });
  }, [
    category,
    definitions,
    locale,
    managedOnly,
    query,
    registry.records,
    sort,
  ]);

  const featuredDefinitions = useMemo(() => {
    if (tab === "assistants") return definitions;
    if (tab !== "skills" || definitions.length <= 4) {
      return definitions.slice(0, 4);
    }
    const offset = featuredOffset % definitions.length;
    return [
      ...definitions.slice(offset),
      ...definitions.slice(0, offset),
    ].slice(0, 4);
  }, [definitions, featuredOffset, tab]);

  const selected = definitions.find(
    (definition) => definition.id === selectedId,
  );
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

  const changeTab = (nextTab: ProductCapabilityTab) => {
    if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    setRetryingId(null);
    onTabChange(nextTab);
    setCategory("all");
    setManagedOnly(false);
    setSort("relevance");
    setFeaturedOffset(0);
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

  const restoreFocus = (origin: HTMLElement | null) => {
    window.requestAnimationFrame(() => origin?.focus());
  };

  const closeDetail = () => {
    setDetailOpen(false);
    restoreFocus(detailOriginRef.current);
  };

  const openDetail = (
    definition: ProductCapabilityDefinition,
    origin: HTMLElement,
  ) => {
    detailOriginRef.current = origin;
    setSelectedId(definition.id);
    setDetailOpen(true);
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
    if (!detailOpen && target !== "custom" && origin) {
      detailOriginRef.current = origin;
    }
    actionOriginRef.current = origin ?? detailOriginRef.current;
    setSetupTarget(target);
  };

  const closeSetup = () => {
    const origin = actionOriginRef.current;
    setSetupTarget(null);
    restoreFocus(origin);
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
      detailOriginRef.current = actionOriginRef.current;
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
      if (!detailOpen) detailOriginRef.current = actionOriginRef.current;
      setSelectedId(setupTarget.id);
      setDetailOpen(true);
      setStatus(
        zh
          ? `“${setupTarget.label.zh}”已完成审查，可用于新任务。`
          : `${setupTarget.label.en} passed review and is ready for new tasks.`,
      );
    }
    setSetupTarget(null);
  };

  const useCapability = (definition: ProductCapabilityDefinition) => {
    const preference = registry.records[definition.id];
    if (preference?.lifecycle !== "ready") return;
    const kind =
      definition.tab === "assistants"
        ? "assistant"
        : definition.tab === "skills"
          ? "skill"
          : "connector";
    onStartTask({
      prompt: "",
      resources: [
        {
          id: definition.id,
          kind,
          label:
            definition.tab === "skills"
              ? `$${definition.label[locale]}`
              : definition.label[locale],
          meta: `${definition.tag[locale]} · ${zh ? "已配置" : "Configured"}`,
        },
      ],
      workspace: "ui",
    });
  };

  const quickAction = (
    definition: ProductCapabilityDefinition,
    origin: HTMLButtonElement,
  ) => {
    const lifecycle = registry.records[definition.id]?.lifecycle ?? "available";
    if (lifecycle === "ready") {
      useCapability(definition);
    } else if (lifecycle === "available") {
      openSetup(definition, origin);
    } else {
      openDetail(definition, origin);
    }
  };

  return (
    <section
      className="product-catalog"
      data-catalog-tab={tab}
      data-managed-only={managedOnly || undefined}
      data-product-surface="catalog"
    >
      <header className="product-catalog__topbar">
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
                name={
                  id === "assistants"
                    ? "assistant"
                    : id === "skills"
                      ? "checklist"
                      : "link"
                }
              />
              {tabLabel(id, locale)}
            </Link>
          ))}
        </div>
        <div className="product-catalog__topbar-actions">
          <label data-focus-owner="container">
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={`${zh ? "搜索" : "Search"}${tabLabel(tab, locale)}`}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={searchPlaceholder(tab, locale)}
              type="search"
              value={query}
            />
          </label>
          <button
            aria-label={`${zh ? "已管理" : "Managed"} ${managedCount}`}
            aria-pressed={managedOnly}
            data-attention-count={attentionCount || undefined}
            onClick={() => {
              setManagedOnly((value) => !value);
              setDetailOpen(false);
            }}
            title={
              attentionCount > 0
                ? zh
                  ? `${attentionCount} 项配置需要处理`
                  : `${attentionCount} configurations need attention`
                : undefined
            }
            type="button"
          >
            <ProductPlaygroundIcon name="catalog" />
            <span>{managedLabel(tab, locale)}</span>
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

      <ProductCapabilityBrowse
        category={category}
        definitions={visibleDefinitions}
        featuredDefinitions={featuredDefinitions}
        locale={locale}
        managedOnly={managedOnly}
        onCategoryChange={setCategory}
        onClearFilters={() => {
          setCategory("all");
          setManagedOnly(false);
          setQuery("");
        }}
        onOpen={openDetail}
        onQuickAction={quickAction}
        onRefreshFeatured={() =>
          setFeaturedOffset((current) =>
            definitions.length > 0 ? (current + 4) % definitions.length : 0,
          )
        }
        onSortChange={setSort}
        registry={registry}
        sort={sort}
        tab={tab}
        totalCount={definitions.length}
      />

      <output aria-live="polite" className="product-catalog__status">
        {status}
      </output>

      {detailOpen && selected && selectedPreference ? (
        <ProductCapabilityDetailDialog
          definition={selected}
          locale={locale}
          onClose={closeDetail}
          onDisable={() => {
            setPreference(selected.id, {
              ...selectedPreference,
              lifecycle: "disabled",
            });
            setStatus(
              zh
                ? `已停用“${selected.label.zh}”。`
                : `${selected.label.en} disabled.`,
            );
          }}
          onEnable={() => {
            setPreference(selected.id, {
              ...selectedPreference,
              lifecycle: "ready",
            });
            setStatus(
              zh
                ? `已启用“${selected.label.zh}”。`
                : `${selected.label.en} enabled.`,
            );
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
          onUse={() => useCapability(selected)}
          preference={selectedPreference}
          retrying={retryingId === selected.id}
        />
      ) : null}

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
            const origin = actionOriginRef.current;
            setRemoveTarget(null);
            restoreFocus(origin);
          }}
          onConfirm={() => {
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
            setDetailOpen(false);
            restoreFocus(detailOriginRef.current);
          }}
        />
      ) : null}
    </section>
  );
}
