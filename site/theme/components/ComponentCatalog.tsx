import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLang, useVersion, withBase } from "@rspress/core/runtime";
import {
  catalogGroups,
  catalogRecords,
  normalizeCatalogQuery,
  type CatalogLanguage,
  type CatalogRecord,
} from "./componentCatalogData";
import "./ComponentCatalog.css";

type FilterOption = {
  count: number;
  key: string;
  label: string;
};

type FilterOverflow = "end" | "middle" | "none" | "start";

function resolveFilterOverflow(element: HTMLElement): FilterOverflow {
  if (element.scrollWidth - element.clientWidth <= 2) return "none";

  const atStart = element.scrollLeft <= 2;
  const atEnd =
    element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
  if (atStart) return "start";
  if (atEnd) return "end";
  return "middle";
}

function componentHref(
  link: string,
  language: CatalogLanguage,
  version: string,
) {
  const parts = [
    version === "next" ? "" : version,
    language === "zh" ? "" : language,
    link,
  ].filter(Boolean);

  return withBase(`/${parts.join("/")}.html`);
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <circle cx="8.75" cy="8.75" r="5.25" stroke="currentColor" />
      <path
        d="m12.75 12.75 3.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 10h11m-4-4 4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CatalogLink({
  language,
  record,
  version,
}: {
  language: CatalogLanguage;
  record: CatalogRecord;
  version: string;
}) {
  return (
    <a href={componentHref(record.link, language, version)}>
      <span className="component-catalog__name">
        <strong>{record.label}</strong>
        <small>{record.alternateLabel}</small>
      </span>
      <span className="component-catalog__group">{record.groupLabel}</span>
      <ArrowIcon />
    </a>
  );
}

export function ComponentCatalog() {
  const currentLanguage = useLang();
  const version = useVersion();
  const language: CatalogLanguage = currentLanguage === "en" ? "en" : "zh";
  const isChinese = language === "zh";
  const headingId = useId();
  const filtersRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [filterOverflow, setFilterOverflow] = useState<FilterOverflow>("none");
  const [query, setQuery] = useState("");
  const records = useMemo(() => catalogRecords(language), [language]);
  const groups = useMemo(
    () => catalogGroups(language, records),
    [language, records],
  );
  const filters = useMemo<FilterOption[]>(() => {
    const options = new Map<string, FilterOption>();
    records.forEach((record) => {
      const current = options.get(record.filterKey);
      options.set(record.filterKey, {
        count: (current?.count ?? 0) + 1,
        key: record.filterKey,
        label: record.filterLabel,
      });
    });
    return [
      {
        count: records.length,
        key: "all",
        label: isChinese ? "全部" : "All",
      },
      ...options.values(),
    ];
  }, [isChinese, records]);
  const normalizedQuery = normalizeCatalogQuery(query);
  const visibleRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          (activeFilter === "all" || record.filterKey === activeFilter) &&
          (!normalizedQuery || record.searchText.includes(normalizedQuery)),
      ),
    [activeFilter, normalizedQuery, records],
  );

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const filtersElement = filtersRef.current;
    if (!filtersElement) return;

    const synchronizeOverflow = () => {
      setFilterOverflow(resolveFilterOverflow(filtersElement));
    };
    const observer = new ResizeObserver(synchronizeOverflow);
    observer.observe(filtersElement);
    Array.from(filtersElement.children).forEach((child) =>
      observer.observe(child),
    );
    filtersElement.addEventListener("scroll", synchronizeOverflow, {
      passive: true,
    });
    synchronizeOverflow();

    return () => {
      observer.disconnect();
      filtersElement.removeEventListener("scroll", synchronizeOverflow);
    };
  }, [filters.length]);

  const showGroupOverview = activeFilter === "all" && !normalizedQuery;
  const resultSummary = showGroupOverview
    ? isChinese
      ? `${groups.length} 个职责分组，可搜索 ${records.length} 个组件`
      : `${groups.length} task groups across ${records.length} searchable components`
    : normalizedQuery
      ? isChinese
        ? `找到 ${visibleRecords.length} 个匹配组件`
        : `${visibleRecords.length} matching components`
      : isChinese
        ? `显示 ${visibleRecords.length} 个组件`
        : `Showing ${visibleRecords.length} components`;

  return (
    <section
      className="component-catalog"
      aria-labelledby={headingId}
      data-component-catalog
    >
      <header className="component-catalog__header">
        <div>
          <h2 id={headingId}>
            {isChinese
              ? "按界面职责查找组件"
              : "Find components by interface job"}
          </h2>
          <p>
            {isChinese
              ? "先确定要解决的界面任务；知道名称时可直接搜索。"
              : "Start with the interface job, or search directly when you know the name."}
          </p>
        </div>
        <span className="component-catalog__total">
          {records.length} {isChinese ? "个组件" : "components"}
        </span>
      </header>

      <div className="component-catalog__search" role="search">
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          value={query}
          aria-label={isChinese ? "搜索组件" : "Search components"}
          placeholder={
            isChinese
              ? "按名称、英文名或分组搜索…"
              : "Search by name, slug, or group…"
          }
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query) {
              event.preventDefault();
              setQuery("");
            }
          }}
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            {isChinese ? "清除" : "Clear"}
          </button>
        ) : (
          <kbd aria-hidden="true">/</kbd>
        )}
      </div>

      <div
        className="component-catalog__filter-rail"
        data-overflow={filterOverflow}
      >
        <div
          ref={filtersRef}
          className="component-catalog__filters"
          aria-label={
            isChinese ? "按组件分组筛选" : "Filter by component group"
          }
        >
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              aria-pressed={activeFilter === filter.key}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
              <span>{filter.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className="component-catalog__summary"
        role="status"
        aria-live="polite"
      >
        {resultSummary}
      </div>

      {showGroupOverview ? (
        <div className="component-catalog__groups">
          {groups.map((group) => {
            const groupHeadingId = `${headingId}-${group.key}`;
            return (
              <section
                key={group.key}
                className="component-catalog__group-section"
                aria-labelledby={groupHeadingId}
                data-component-group={group.key}
              >
                <header>
                  <div>
                    <h3 id={groupHeadingId}>{group.label}</h3>
                    <span>
                      {group.records.length}{" "}
                      {isChinese ? "个组件" : "components"}
                    </span>
                  </div>
                  <p>{group.description}</p>
                  <button
                    type="button"
                    onClick={() => setActiveFilter(group.key)}
                  >
                    {isChinese ? "查看全部" : "View all"}
                    <span aria-hidden="true">→</span>
                  </button>
                </header>
                <div className="component-catalog__group-links">
                  {group.records.slice(0, 4).map((record) => (
                    <CatalogLink
                      key={record.link}
                      language={language}
                      record={record}
                      version={version}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : visibleRecords.length > 0 ? (
        <div className="component-catalog__results">
          {visibleRecords.map((record) => (
            <CatalogLink
              key={record.link}
              language={language}
              record={record}
              version={version}
            />
          ))}
        </div>
      ) : (
        <div className="component-catalog__empty">
          <strong>
            {isChinese ? "没有匹配的组件" : "No matching components"}
          </strong>
          <p>
            {isChinese
              ? "试试组件英文名、路由名，或清除当前分组筛选。"
              : "Try a component slug, another term, or clear the group filter."}
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveFilter("all");
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            {isChinese ? "重置筛选" : "Reset filters"}
          </button>
        </div>
      )}
    </section>
  );
}
