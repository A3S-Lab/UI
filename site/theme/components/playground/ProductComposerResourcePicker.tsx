import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductComposerResource } from "./product-composer-data";
import {
  getProductCapabilityDefinitions,
  useProductCapabilityRegistry,
} from "./product-capability-state";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export type ProductComposerResourcePickerKind = "assistant" | "connector";

type ResourcePickerItem = {
  description: string;
  id: string;
  kind: ProductComposerResourcePickerKind;
  label: string;
  meta: string;
};

export function ProductComposerResourcePicker({
  kind,
  locale,
  onClose,
  onSelect,
  selectedIds,
}: {
  kind: ProductComposerResourcePickerKind;
  locale: ProductPlaygroundLocale;
  onClose: () => void;
  onSelect: (resource: ProductComposerResource) => void;
  selectedIds: ReadonlySet<string>;
}) {
  const zh = locale === "zh";
  const { registry } = useProductCapabilityRegistry();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId().replaceAll(":", "");
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState("");
  const title =
    kind === "assistant"
      ? zh
        ? "选择专家"
        : "Choose an assistant"
      : zh
        ? "选择连接器"
        : "Choose a connector";
  const items = useMemo(() => {
    const source = getProductCapabilityDefinitions(
      kind === "assistant" ? "assistants" : "connectors",
      registry,
    );
    const normalized = query.trim().toLocaleLowerCase(locale);
    return source
      .filter((item) => registry.records[item.id]?.lifecycle === "ready")
      .map<ResourcePickerItem>((item) => ({
        description: item.description[locale],
        id: item.id,
        kind,
        label: item.label[locale],
        meta: item.tag[locale],
      }))
      .filter(
        (item) =>
          !selectedIds.has(item.id) &&
          (!normalized ||
            `${item.label} ${item.description} ${item.meta}`
              .toLocaleLowerCase(locale)
              .includes(normalized)),
      );
  }, [kind, locale, query, registry, selectedIds]);
  const currentIndex = Math.min(activeIndex, Math.max(0, items.length - 1));
  const currentItem = items[currentIndex];

  useEffect(() => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [kind]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const selectItem = (item: ResourcePickerItem | undefined) => {
    if (!item) return;
    onSelect({
      id: item.id,
      kind: item.kind,
      label: item.label,
      meta: `${item.meta} · ${zh ? "已配置" : "Configured"}`,
    });
  };

  return (
    <section
      aria-label={title}
      className="product-composer-resource-picker"
      data-composer-resource-picker={kind}
      role="dialog"
    >
      <header>
        <span>
          <ProductPlaygroundIcon
            name={kind === "assistant" ? "assistant" : "link"}
          />
          <span>
            <strong>{title}</strong>
            <small>
              {zh
                ? "仅可添加当前已配置的能力"
                : "Only configured capabilities can be attached"}
            </small>
          </span>
        </span>
        <button
          aria-label={zh ? "关闭资源选择" : "Close resource picker"}
          onClick={onClose}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>
      <label data-focus-owner="container" data-resource-picker-search>
        <ProductPlaygroundIcon name="search" />
        <input
          aria-activedescendant={
            currentItem ? `${listboxId}-${currentIndex}` : undefined
          }
          aria-controls={listboxId}
          aria-expanded="true"
          aria-label={zh ? "搜索能力" : "Search capabilities"}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const offset = event.key === "ArrowDown" ? 1 : -1;
              setActiveIndex((index) =>
                Math.max(0, Math.min(index + offset, items.length - 1)),
              );
            } else if (event.key === "Home" || event.key === "End") {
              event.preventDefault();
              setActiveIndex(event.key === "Home" ? 0 : items.length - 1);
            } else if (event.key === "Enter") {
              event.preventDefault();
              selectItem(currentItem);
            }
          }}
          placeholder={
            kind === "assistant"
              ? zh
                ? "搜索专家名称或能力"
                : "Search assistants"
              : zh
                ? "搜索连接器或来源"
                : "Search connectors"
          }
          ref={inputRef}
          role="combobox"
          type="search"
          value={query}
        />
      </label>
      <div aria-label={title} id={listboxId} role="listbox">
        {items.map((item, index) => {
          return (
            <button
              aria-selected={index === currentIndex}
              data-active={index === currentIndex ? "true" : undefined}
              data-configured="true"
              id={`${listboxId}-${index}`}
              key={item.id}
              onClick={() => selectItem(item)}
              onPointerMove={() => setActiveIndex(index)}
              role="option"
              type="button"
            >
              <span data-resource-picker-mark>
                <ProductPlaygroundIcon
                  name={kind === "assistant" ? "assistant" : "link"}
                />
              </span>
              <span data-resource-picker-copy>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <span data-resource-picker-state>
                <small>{item.meta}</small>
              </span>
            </button>
          );
        })}
        {items.length === 0 ? (
          <p role="status">
            {query.trim()
              ? zh
                ? "没有匹配的可用能力"
                : "No ready capabilities match"
              : zh
                ? "没有其他可添加的能力"
                : "No other ready capabilities are available"}
          </p>
        ) : null}
      </div>
      <footer>
        <span>
          <kbd>↑↓</kbd>
          {zh ? "移动" : "Move"}
        </span>
        <span>
          <kbd>↵</kbd>
          {zh ? "添加" : "Add"}
        </span>
        <span>
          <kbd>Esc</kbd>
          {zh ? "关闭" : "Close"}
        </span>
      </footer>
    </section>
  );
}
