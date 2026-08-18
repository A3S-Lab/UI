import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  productComposerEfforts,
  productComposerModels,
  type ProductComposerEffort,
  type ProductComposerModel,
} from "./product-composer-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type ComposerControlKey = "effort" | "model" | "run";

type ComposerControlProps = {
  activeControl: ComposerControlKey | null;
  children: ReactNode;
  control: ComposerControlKey;
  label: string;
  onActiveControlChange: (control: ComposerControlKey | null) => void;
  trigger: ReactNode;
};

function ComposerControl({
  activeControl,
  children,
  control,
  label,
  onActiveControlChange,
  trigger,
}: ComposerControlProps) {
  const open = activeControl === control;
  return (
    <div data-composer-control={control}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        data-composer-setting
        onClick={() => onActiveControlChange(open ? null : control)}
        type="button"
      >
        {trigger}
      </button>
      {open ? (
        <section
          aria-label={label}
          className="product-composer-control-panel"
          data-control-panel={control}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            onActiveControlChange(null);
          }}
          role="dialog"
        >
          {children}
        </section>
      ) : null}
    </div>
  );
}

export function ProductComposerModelPicker({
  activeControl,
  locale,
  model,
  onActiveControlChange,
  onConfigure,
  onModelChange,
}: {
  activeControl: ComposerControlKey | null;
  locale: ProductPlaygroundLocale;
  model: ProductComposerModel["id"];
  onActiveControlChange: (control: ComposerControlKey | null) => void;
  onConfigure: () => void;
  onModelChange: (model: ProductComposerModel["id"]) => void;
}) {
  const zh = locale === "zh";
  const inputRef = useRef<HTMLInputElement>(null);
  const [provider, setProvider] = useState<"A3S" | "Local" | "all">("all");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const current = productComposerModels.find((item) => item.id === model);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return productComposerModels.filter(
      (item) =>
        (provider === "all" || item.provider === provider) &&
        (!normalized ||
          `${item.name} ${item.provider} ${item.description.en} ${item.description.zh}`
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    );
  }, [locale, provider, query]);
  const open = activeControl === "model";

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setProvider("all");
    setActiveIndex(
      Math.max(
        0,
        productComposerModels.findIndex((item) => item.id === model),
      ),
    );
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [model, open]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  }, [activeIndex, filtered.length]);

  const select = (next: ProductComposerModel) => {
    onModelChange(next.id);
    onActiveControlChange(null);
  };

  return (
    <ComposerControl
      activeControl={activeControl}
      control="model"
      label={zh ? `模型：${current?.name}` : `Model: ${current?.name}`}
      onActiveControlChange={onActiveControlChange}
      trigger={
        <>
          <ProductPlaygroundIcon name="assistant" />
          <span data-setting-label>{current?.name}</span>
          <ProductPlaygroundIcon name="chevron" />
        </>
      }
    >
      <header>
        <span>
          <ProductPlaygroundIcon name="assistant" />
          <span>
            <strong>{zh ? "选择模型" : "Choose a model"}</strong>
            <small>
              {zh
                ? "模型决定速度、推理深度与可用能力。"
                : "The model determines latency, reasoning, and capabilities."}
            </small>
          </span>
        </span>
        <button
          aria-label={zh ? "关闭模型选择" : "Close model picker"}
          onClick={() => onActiveControlChange(null)}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>
      <div aria-label={zh ? "模型提供方" : "Model provider"} role="tablist">
        {(["all", "A3S", "Local"] as const).map((item) => (
          <button
            aria-selected={provider === item}
            key={item}
            onClick={() => {
              setProvider(item);
              setActiveIndex(0);
            }}
            role="tab"
            type="button"
          >
            {item === "all" ? (zh ? "全部" : "All") : item}
          </button>
        ))}
      </div>
      <label data-model-search>
        <ProductPlaygroundIcon name="search" />
        <input
          aria-activedescendant={
            filtered[activeIndex] ? `product-model-option-${activeIndex}` : undefined
          }
          aria-controls="product-composer-model-list"
          aria-expanded="true"
          aria-label={zh ? "搜索模型" : "Search models"}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const offset = event.key === "ArrowDown" ? 1 : -1;
              setActiveIndex((index) =>
                Math.max(0, Math.min(index + offset, filtered.length - 1)),
              );
            } else if (event.key === "Enter" && filtered[activeIndex]) {
              event.preventDefault();
              select(filtered[activeIndex]);
            }
          }}
          placeholder={zh ? "搜索名称或提供方" : "Search name or provider"}
          ref={inputRef}
          role="combobox"
          type="search"
          value={query}
        />
      </label>
      <div
        aria-label={zh ? "可用模型" : "Available models"}
        id="product-composer-model-list"
        role="listbox"
      >
        {filtered.map((item, index) => (
          <button
            aria-selected={item.id === model}
            data-active={index === activeIndex ? "true" : undefined}
            id={`product-model-option-${index}`}
            key={item.id}
            onClick={() => select(item)}
            onPointerMove={() => setActiveIndex(index)}
            role="option"
            type="button"
          >
            <span data-model-mark>
              <ProductPlaygroundIcon name="assistant" />
            </span>
            <span>
              <strong>{item.name}</strong>
              <small>{item.description[locale]}</small>
              <span data-model-capabilities>
                {item.capabilities.map((capability) => (
                  <em key={capability}>
                    {capability === "reasoning"
                      ? zh
                        ? "推理"
                        : "Reasoning"
                      : capability === "tools"
                        ? zh
                          ? "工具"
                          : "Tools"
                        : zh
                          ? "视觉"
                          : "Vision"}
                  </em>
                ))}
              </span>
            </span>
            <span data-model-meta>
              {item.recommended ? <small>{zh ? "推荐" : "Recommended"}</small> : null}
              {item.id === model ? <ProductPlaygroundIcon name="check" /> : null}
            </span>
          </button>
        ))}
        {filtered.length === 0 ? (
          <div data-control-empty role="status">
            {zh ? "没有匹配的模型" : "No matching models"}
          </div>
        ) : null}
      </div>
      <footer>
        <button
          onClick={() => {
            onActiveControlChange(null);
            onConfigure();
          }}
          type="button"
        >
          <ProductPlaygroundIcon name="settings" />
          {zh ? "配置模型与提供方" : "Configure models and providers"}
        </button>
      </footer>
    </ComposerControl>
  );
}

export function ProductComposerEffortPicker({
  activeControl,
  effort,
  locale,
  onActiveControlChange,
  onEffortChange,
}: {
  activeControl: ComposerControlKey | null;
  effort: ProductComposerEffort;
  locale: ProductPlaygroundLocale;
  onActiveControlChange: (control: ComposerControlKey | null) => void;
  onEffortChange: (effort: ProductComposerEffort) => void;
}) {
  const zh = locale === "zh";
  const selectedIndex = Math.max(
    0,
    productComposerEfforts.findIndex((item) => item.id === effort),
  );
  const [previewIndex, setPreviewIndex] = useState(selectedIndex);
  const preview = productComposerEfforts[previewIndex] ?? productComposerEfforts[1];
  const selected = productComposerEfforts[selectedIndex] ?? productComposerEfforts[1];

  useEffect(() => setPreviewIndex(selectedIndex), [selectedIndex]);

  const commit = (index: number) => {
    const next = productComposerEfforts[index];
    if (next && next.id !== effort) onEffortChange(next.id);
  };

  return (
    <ComposerControl
      activeControl={activeControl}
      control="effort"
      label={zh ? `努力程度：${selected.label.zh}` : `Effort: ${selected.label.en}`}
      onActiveControlChange={onActiveControlChange}
      trigger={
        <>
          <ProductPlaygroundIcon name="brain" />
          <span data-setting-label>
            {zh ? `努力 · ${selected.label.zh}` : `Effort · ${selected.label.en}`}
          </span>
          <ProductPlaygroundIcon name="chevron" />
        </>
      }
    >
      <header>
        <span>
          <ProductPlaygroundIcon name="brain" />
          <span>
            <strong>{zh ? "努力程度" : "Effort"}</strong>
            <small>
              {zh
                ? "更高的程度会投入更多时间进行推理和验证。"
                : "Higher levels spend more time reasoning and verifying."}
            </small>
          </span>
        </span>
        <button
          aria-label={zh ? "关闭努力程度" : "Close effort picker"}
          onClick={() => onActiveControlChange(null)}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>
      <section data-effort-preview>
        <strong>{preview.label[locale]}</strong>
        <p>{preview.description[locale]}</p>
        <input
          aria-label={zh ? "努力程度" : "Effort"}
          aria-valuetext={preview.label[locale]}
          max={productComposerEfforts.length - 1}
          min={0}
          onBlur={(event) => commit(event.currentTarget.valueAsNumber)}
          onChange={(event) => setPreviewIndex(event.currentTarget.valueAsNumber)}
          onKeyUp={(event) => commit(event.currentTarget.valueAsNumber)}
          onPointerUp={(event) => commit(event.currentTarget.valueAsNumber)}
          step={1}
          type="range"
          value={previewIndex}
        />
        <div aria-hidden="true" data-effort-ticks>
          {productComposerEfforts.map((item, index) => (
            <span data-active={index === previewIndex ? "true" : undefined} key={item.id}>
              {item.label[locale]}
            </span>
          ))}
        </div>
      </section>
    </ComposerControl>
  );
}

export function ProductComposerRunSettings({
  activeControl,
  deepResearch,
  locale,
  onActiveControlChange,
  onCompactContext,
  onDeepResearchChange,
  onPermissionsChange,
  onWorkspaceChange,
  permissions,
  showPermissions,
  workspace,
}: {
  activeControl: ComposerControlKey | null;
  deepResearch: boolean;
  locale: ProductPlaygroundLocale;
  onActiveControlChange: (control: ComposerControlKey | null) => void;
  onCompactContext: () => void;
  onDeepResearchChange: (enabled: boolean) => void;
  onPermissionsChange: (permissions: "ask" | "edit" | "read") => void;
  onWorkspaceChange: (workspace: "" | "local" | "ui") => void;
  permissions: "ask" | "edit" | "read";
  showPermissions: boolean;
  workspace: "" | "local" | "ui";
}) {
  const zh = locale === "zh";
  const workspaces = [
    ["ui", zh ? "A3S UI 体验优化" : "A3S UI experience"],
    ["local", zh ? "本地工作空间" : "Local workspace"],
  ] as const;
  const permissionOptions = [
    ["ask", zh ? "修改前询问" : "Ask before changes"],
    ["read", zh ? "仅查看" : "Read only"],
    ["edit", zh ? "允许修改" : "Allow edits"],
  ] as const;
  const workspaceLabel = workspaces.find(([id]) => id === workspace)?.[1];

  return (
    <ComposerControl
      activeControl={activeControl}
      control="run"
      label={zh ? "运行设置" : "Run settings"}
      onActiveControlChange={onActiveControlChange}
      trigger={
        <>
          <ProductPlaygroundIcon name="settings" />
          <span data-setting-label>{zh ? "运行设置" : "Run settings"}</span>
          {deepResearch ? <i>{zh ? "研究" : "Research"}</i> : null}
          <ProductPlaygroundIcon name="chevron" />
        </>
      }
    >
      <header>
        <span>
          <ProductPlaygroundIcon name="settings" />
          <span>
            <strong>{zh ? "运行设置" : "Run settings"}</strong>
            <small>
              {zh
                ? "默认配置适合大多数任务，需要时再调整。"
                : "The defaults suit most work. Adjust only when needed."}
            </small>
          </span>
        </span>
        <button
          aria-label={zh ? "关闭运行设置" : "Close run settings"}
          onClick={() => onActiveControlChange(null)}
          type="button"
        >
          <ProductPlaygroundIcon name="close" />
        </button>
      </header>
      <section data-run-setting>
        <span>
          <strong>{zh ? "工作空间" : "Workspace"}</strong>
          <small>{workspaceLabel ?? (zh ? "未选择" : "Not selected")}</small>
        </span>
        <div aria-label={zh ? "工作空间" : "Workspace"} role="radiogroup">
          {workspaces.map(([id, label]) => (
            <button
              aria-checked={workspace === id}
              key={id}
              onClick={() => onWorkspaceChange(id)}
              role="radio"
              type="button"
            >
              <ProductPlaygroundIcon name="folder" />
              {label}
              {workspace === id ? <ProductPlaygroundIcon name="check" /> : null}
            </button>
          ))}
        </div>
      </section>
      {showPermissions ? (
        <section data-run-setting>
          <span>
            <strong>{zh ? "文件权限" : "File permissions"}</strong>
            <small>
              {permissionOptions.find(([id]) => id === permissions)?.[1]}
            </small>
          </span>
          <div aria-label={zh ? "文件权限" : "File permissions"} role="radiogroup">
            {permissionOptions.map(([id, label]) => (
              <button
                aria-checked={permissions === id}
                key={id}
                onClick={() => onPermissionsChange(id)}
                role="radio"
                type="button"
              >
                <ProductPlaygroundIcon name="shield" />
                {label}
                {permissions === id ? <ProductPlaygroundIcon name="check" /> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <label data-run-switch>
        <span>
          <ProductPlaygroundIcon name="search" />
          <span>
            <strong>{zh ? "深度研究" : "Deep research"}</strong>
            <small>
              {zh
                ? "规划问题、收集来源并生成可追溯报告。"
                : "Plan questions, collect sources, and produce a traceable report."}
            </small>
          </span>
        </span>
        <input
          checked={deepResearch}
          onChange={(event) => onDeepResearchChange(event.currentTarget.checked)}
          role="switch"
          type="checkbox"
        />
      </label>
      <section data-context-usage>
        <header>
          <span>
            <strong>{zh ? "上下文用量" : "Context usage"}</strong>
            <small>31,240 / 128,000 tokens</small>
          </span>
          <strong>24%</strong>
        </header>
        <div
          aria-label={zh ? "上下文用量" : "Context usage"}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={24}
          role="progressbar"
        >
          <i />
        </div>
        <button onClick={onCompactContext} type="button">
          <ProductPlaygroundIcon name="collapse" />
          {zh ? "压缩较早上下文" : "Compact older context"}
        </button>
      </section>
    </ComposerControl>
  );
}

export type { ComposerControlKey };
