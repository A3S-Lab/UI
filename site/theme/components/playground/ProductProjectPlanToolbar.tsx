import { useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductProjectPlanToolbar({
  locale,
  mineOnly,
  onAddTask,
  onMineOnlyChange,
  onOpenConfiguration,
  onQueryChange,
  query,
}: {
  locale: ProductPlaygroundLocale;
  mineOnly: boolean;
  onAddTask: () => void;
  onMineOnlyChange: (mineOnly: boolean) => void;
  onOpenConfiguration: () => void;
  onQueryChange: (query: string) => void;
  query: string;
}) {
  const zh = locale === "zh";
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <div data-plan-navigation>
        <button type="button">
          <ProductPlaygroundIcon name="folder" />
          {zh ? "全部" : "All"}
        </button>
        <button
          aria-label={zh ? "添加计划任务" : "Add a plan task"}
          onClick={onAddTask}
          type="button"
        >
          <ProductPlaygroundIcon name="plus" />
        </button>
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
        <label data-plan-search data-open={searchOpen || undefined}>
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
        <button
          aria-label={zh ? "打开项目配置" : "Open project configuration"}
          onClick={onOpenConfiguration}
          title={zh ? "项目配置" : "Project configuration"}
          type="button"
        >
          <ProductPlaygroundIcon name="settings" />
        </button>
        <button data-plan-primary onClick={onAddTask} type="button">
          {zh ? "添加" : "Add"}
        </button>
      </div>
    </>
  );
}
