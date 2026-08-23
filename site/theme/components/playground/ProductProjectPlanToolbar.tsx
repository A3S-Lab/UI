import { useEffect, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export type ProductProjectPlanDisplayOptions = {
  compact: boolean;
  showAssignees: boolean;
  showDates: boolean;
};

export function ProductProjectPlanToolbar({
  displayOptions,
  locale,
  mineOnly,
  onAddTask,
  onCreateView,
  onDisplayOptionsChange,
  onMineOnlyChange,
  onQueryChange,
  query,
}: {
  displayOptions: ProductProjectPlanDisplayOptions;
  locale: ProductPlaygroundLocale;
  mineOnly: boolean;
  onAddTask: () => void;
  onCreateView: () => void;
  onDisplayOptionsChange: (options: ProductProjectPlanDisplayOptions) => void;
  onMineOnlyChange: (mineOnly: boolean) => void;
  onQueryChange: (query: string) => void;
  query: string;
}) {
  const zh = locale === "zh";
  const [createViewStatus, setCreateViewStatus] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const optionsButtonRef = useRef<HTMLButtonElement>(null);
  const optionsPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        optionsPanelRef.current?.contains(target) ||
        optionsButtonRef.current?.contains(target)
      ) {
        return;
      }
      setOptionsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOptionsOpen(false);
      optionsButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [optionsOpen]);

  const updateDisplayOption = <
    Key extends keyof ProductProjectPlanDisplayOptions,
  >(
    key: Key,
    value: ProductProjectPlanDisplayOptions[Key],
  ) => onDisplayOptionsChange({ ...displayOptions, [key]: value });

  return (
    <>
      <div data-plan-navigation>
        <span data-plan-scope>
          <ProductPlaygroundIcon name="folder" />
          {zh ? "全部" : "All"}
        </span>
        <button
          aria-label={zh ? "新建计划视图" : "Create plan view"}
          data-plan-create-view
          onClick={() => {
            onCreateView();
            setCreateViewStatus(
              zh ? "已请求新建计划视图" : "Plan view creation requested",
            );
          }}
          title={zh ? "新建计划视图" : "Create plan view"}
          type="button"
        >
          <ProductPlaygroundIcon name="plus" />
        </button>
      </div>
      <div
        data-plan-actions
        data-search-open={searchOpen || query ? "true" : undefined}
      >
        <button
          aria-label={
            mineOnly
              ? zh
                ? "显示全部成员的任务"
                : "Show tasks from all members"
              : zh
                ? "仅显示我的任务"
                : "Show only my tasks"
          }
          aria-pressed={mineOnly}
          onClick={() => onMineOnlyChange(!mineOnly)}
          title={zh ? "成员筛选" : "Member filter"}
          type="button"
        >
          <ProductPlaygroundIcon name="filter" />
        </button>
        <label
          data-focus-owner="container"
          data-plan-search
          data-open={searchOpen || undefined}
        >
          <span className="sr-only">
            {zh ? "搜索计划任务" : "Search plan tasks"}
          </span>
          <ProductPlaygroundIcon name="search" />
          <input
            aria-label={zh ? "搜索计划任务" : "Search plan tasks"}
            onBlur={() => {
              if (!query) setSearchOpen(false);
            }}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              onQueryChange("");
              setSearchOpen(false);
              event.currentTarget.blur();
            }}
            placeholder={zh ? "搜索计划" : "Search plan"}
            type="search"
            value={query}
          />
        </label>
        <button
          aria-controls="product-project-plan-options"
          aria-expanded={optionsOpen}
          aria-haspopup="dialog"
          aria-label={zh ? "计划视图选项" : "Plan view options"}
          data-plan-view-options
          onClick={() => setOptionsOpen((value) => !value)}
          ref={optionsButtonRef}
          title={zh ? "视图选项" : "View options"}
          type="button"
        >
          <ProductPlaygroundIcon name="sliders" />
        </button>
        <button data-plan-primary onClick={onAddTask} type="button">
          {zh ? "添加" : "Add"}
        </button>
        {optionsOpen ? (
          <div
            aria-label={zh ? "计划视图选项" : "Plan view options"}
            className="product-project-plan-options"
            id="product-project-plan-options"
            ref={optionsPanelRef}
            role="dialog"
          >
            <strong>{zh ? "显示选项" : "Display options"}</strong>
            <label>
              <input
                checked={displayOptions.showAssignees}
                onChange={(event) =>
                  updateDisplayOption(
                    "showAssignees",
                    event.currentTarget.checked,
                  )
                }
                type="checkbox"
              />
              <span>{zh ? "显示负责人" : "Show assignees"}</span>
            </label>
            <label>
              <input
                checked={displayOptions.showDates}
                onChange={(event) =>
                  updateDisplayOption("showDates", event.currentTarget.checked)
                }
                type="checkbox"
              />
              <span>{zh ? "显示日期" : "Show dates"}</span>
            </label>
            <label>
              <input
                checked={displayOptions.compact}
                onChange={(event) =>
                  updateDisplayOption("compact", event.currentTarget.checked)
                }
                type="checkbox"
              />
              <span>{zh ? "紧凑任务行" : "Compact task rows"}</span>
            </label>
          </div>
        ) : null}
        <output className="sr-only" aria-live="polite">
          {createViewStatus}
        </output>
      </div>
    </>
  );
}
