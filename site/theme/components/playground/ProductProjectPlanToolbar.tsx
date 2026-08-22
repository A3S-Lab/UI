import { useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductProjectPlanToolbar({
  locale,
  mineOnly,
  onAddTask,
  onMineOnlyChange,
  onQueryChange,
  query,
}: {
  locale: ProductPlaygroundLocale;
  mineOnly: boolean;
  onAddTask: () => void;
  onMineOnlyChange: (mineOnly: boolean) => void;
  onQueryChange: (query: string) => void;
  query: string;
}) {
  const zh = locale === "zh";
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div data-plan-navigation>
        <span data-plan-scope>
          <ProductPlaygroundIcon name="folder" />
          {zh ? "全部" : "All"}
        </span>
      </div>
      <div data-plan-actions>
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
            placeholder={zh ? "搜索计划" : "Search plan"}
            type="search"
            value={query}
          />
        </label>
        <button data-plan-primary onClick={onAddTask} type="button">
          {zh ? "添加" : "Add"}
        </button>
      </div>
    </>
  );
}
