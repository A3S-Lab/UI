import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  productComposerEfforts,
  productComposerModels,
  type ProductComposerEffort,
  type ProductComposerModel,
} from "./product-composer-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type ComposerControlKey = "mode" | "run" | "workspace";

function ComposerControl({
  activeControl,
  children,
  control,
  label,
  onActiveControlChange,
  panelDetail,
  panelLabel,
  trigger,
}: {
  activeControl: ComposerControlKey | null;
  children: ReactNode;
  control: ComposerControlKey;
  label: string;
  onActiveControlChange: (control: ComposerControlKey | null) => void;
  panelDetail?: string;
  panelLabel: string;
  trigger: ReactNode;
}) {
  const open = activeControl === control;
  return (
    <div data-composer-control={control} data-open={open ? "true" : undefined}>
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
          aria-label={panelLabel}
          className="product-composer-control-panel"
          data-control-panel={control}
          data-control-detail={panelDetail}
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

export function ProductComposerModeControl({
  activeControl,
  locale,
  onActiveControlChange,
  onPermissionsChange,
  permissions,
}: {
  activeControl: ComposerControlKey | null;
  locale: ProductPlaygroundLocale;
  onActiveControlChange: (control: ComposerControlKey | null) => void;
  onPermissionsChange: (permissions: "ask" | "edit" | "read") => void;
  permissions: "ask" | "edit" | "read";
}) {
  const zh = locale === "zh";
  const modes = [
    {
      description: zh
        ? "在当前工作区内推进任务，敏感操作前向你确认"
        : "Work inside the current workspace and ask before sensitive actions",
      icon: "shield" as const,
      id: "ask" as const,
      label: zh ? "默认权限" : "Default permissions",
    },
    {
      description: zh
        ? "可以读取工作区内容，但不允许修改文件"
        : "Read workspace content without changing files",
      icon: "eye" as const,
      id: "read" as const,
      label: zh ? "只读" : "Read only",
    },
    {
      description: zh
        ? "允许在当前工作区内连续修改和运行命令"
        : "Allow continuous edits and commands inside this workspace",
      icon: "automation" as const,
      id: "edit" as const,
      label: zh ? "完全访问" : "Full access",
    },
  ];
  const selected = modes.find((mode) => mode.id === permissions) ?? modes[0];

  return (
    <ComposerControl
      activeControl={activeControl}
      control="mode"
      label={zh ? `权限：${selected.label}` : `Permissions: ${selected.label}`}
      onActiveControlChange={onActiveControlChange}
      panelLabel={zh ? "选择权限边界" : "Choose permission boundary"}
      trigger={
        <>
          <ProductPlaygroundIcon name={selected.icon} />
          <span data-setting-label>{selected.label}</span>
          <ProductPlaygroundIcon name="chevron" />
        </>
      }
    >
      <header>
        <span>
          <ProductPlaygroundIcon name={selected.icon} />
          <span>
            <strong>{zh ? "权限边界" : "Permission boundary"}</strong>
            <small>
              {zh
                ? "控制任务可以读取、修改和运行的范围"
                : "Controls what the task may read, change, and run"}
            </small>
          </span>
        </span>
      </header>
      <div
        aria-label={zh ? "权限边界" : "Permission boundary"}
        data-mode-options
        role="listbox"
      >
        {modes.map((mode) => (
          <button
            aria-selected={permissions === mode.id}
            key={mode.id}
            onClick={() => {
              onPermissionsChange(mode.id);
              onActiveControlChange(null);
            }}
            role="option"
            type="button"
          >
            <span>
              <ProductPlaygroundIcon name={mode.icon} />
            </span>
            <span>
              <strong>{mode.label}</strong>
              <small>{mode.description}</small>
            </span>
            {permissions === mode.id ? (
              <ProductPlaygroundIcon name="check" />
            ) : null}
          </button>
        ))}
      </div>
      <p
        data-permission-guidance
        data-tone={permissions === "edit" ? "warning" : "neutral"}
      >
        <ProductPlaygroundIcon
          name={permissions === "edit" ? "warning" : "info"}
        />
        {permissions === "edit"
          ? zh
            ? "完全访问只对当前工作区生效；工作区外和高风险系统操作仍会被拦截。"
            : "Full access applies only to this workspace; outside and high-risk system actions remain blocked."
          : zh
            ? "可随时收紧权限；已经开始的高风险操作不会绕过确认。"
            : "You can tighten permissions at any time; in-flight risky actions cannot bypass confirmation."}
      </p>
    </ComposerControl>
  );
}

export function ProductComposerWorkspaceControl({
  activeControl,
  locale,
  onActiveControlChange,
  onWorkspaceChange,
  workspace,
}: {
  activeControl: ComposerControlKey | null;
  locale: ProductPlaygroundLocale;
  onActiveControlChange: (control: ComposerControlKey | null) => void;
  onWorkspaceChange: (workspace: "" | "local" | "root" | "ui" | "web") => void;
  workspace: "" | "local" | "root" | "ui" | "web";
}) {
  const zh = locale === "zh";
  const [query, setQuery] = useState("");
  const workspaces = [
    {
      id: "ui" as const,
      label: zh ? "a3s-ui" : "a3s-ui",
      path: "/workspace/a3s-ui",
    },
    {
      id: "web" as const,
      label: "a3s-web",
      path: "/workspace/a3s/apps/web",
    },
    {
      id: "root" as const,
      label: "a3s",
      path: "/workspace/a3s",
    },
    {
      id: "local" as const,
      label: zh ? "本地工作区" : "Local workspace",
      path: zh ? "选择本地文件夹" : "Choose a local folder",
    },
  ];
  const current = workspaces.find((item) => item.id === workspace);
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filteredWorkspaces = workspaces.filter(
    (item) =>
      item.id !== "local" &&
      (!normalizedQuery ||
        `${item.label} ${item.path}`
          .toLocaleLowerCase(locale)
          .includes(normalizedQuery)),
  );

  return (
    <ComposerControl
      activeControl={activeControl}
      control="workspace"
      label={zh ? "选择工作区" : "Choose workspace"}
      onActiveControlChange={onActiveControlChange}
      panelLabel={zh ? "工作区" : "Workspace"}
      trigger={
        <>
          <ProductPlaygroundIcon name="folder" />
          <span data-workspace-copy>
            <strong>
              {current?.label ?? (zh ? "选择工作区" : "Choose workspace")}
            </strong>
            <small>
              {current?.path ??
                (zh ? "任务尚未绑定工作区" : "No workspace selected")}
            </small>
          </span>
          <ProductPlaygroundIcon name="chevron" />
        </>
      }
    >
      <header>
        <span>
          <ProductPlaygroundIcon name="folder" />
          <span>
            <strong>{zh ? "工作区" : "Workspace"}</strong>
            <small>
              {zh
                ? "任务文件、命令和产物都以此目录为边界"
                : "Files, commands, and artifacts stay within this directory"}
            </small>
          </span>
        </span>
      </header>
      <label data-workspace-search>
        <ProductPlaygroundIcon name="search" />
        <input
          aria-label={zh ? "搜索工作区" : "Search workspaces"}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={zh ? "搜索工作区" : "Search workspaces"}
          type="search"
          value={query}
        />
      </label>
      <div
        aria-label={zh ? "工作区" : "Workspace"}
        data-workspace-options
        role="listbox"
      >
        {filteredWorkspaces.map((item) => (
          <button
            aria-selected={workspace === item.id}
            key={item.id}
            onClick={() => {
              onWorkspaceChange(item.id);
              onActiveControlChange(null);
            }}
            role="option"
            type="button"
          >
            <ProductPlaygroundIcon name="folder" />
            <span>
              <strong>{item.label}</strong>
              <small>{item.path}</small>
            </span>
            {workspace === item.id ? (
              <ProductPlaygroundIcon name="check" />
            ) : null}
          </button>
        ))}
        {filteredWorkspaces.length === 0 ? (
          <p role="status">
            {zh ? "没有匹配的工作区" : "No matching workspaces"}
          </p>
        ) : null}
      </div>
      <footer data-workspace-actions>
        <button
          onClick={() => {
            onWorkspaceChange("root");
            onActiveControlChange(null);
          }}
          type="button"
        >
          <ProductPlaygroundIcon name="plus" />
          {zh ? "新建工作区" : "New workspace"}
        </button>
        <button
          onClick={() => {
            onWorkspaceChange("local");
            onActiveControlChange(null);
          }}
          type="button"
        >
          <ProductPlaygroundIcon name="folder" />
          {zh ? "打开本地文件夹" : "Open local folder"}
        </button>
      </footer>
    </ComposerControl>
  );
}

export function ProductComposerRunSettings({
  activeControl,
  deepResearch,
  effort,
  locale,
  model,
  onActiveControlChange,
  onConfigure,
  onDeepResearchChange,
  onEffortChange,
  onModelChange,
}: {
  activeControl: ComposerControlKey | null;
  deepResearch: boolean;
  effort: ProductComposerEffort;
  locale: ProductPlaygroundLocale;
  model: ProductComposerModel["id"];
  onActiveControlChange: (control: ComposerControlKey | null) => void;
  onConfigure: () => void;
  onDeepResearchChange: (enabled: boolean) => void;
  onEffortChange: (effort: ProductComposerEffort) => void;
  onModelChange: (model: ProductComposerModel["id"]) => void;
}) {
  const zh = locale === "zh";
  const searchRef = useRef<HTMLInputElement>(null);
  const [detail, setDetail] = useState<"effort" | "model" | null>(null);
  const [previewEffort, setPreviewEffort] = useState(
    Math.max(
      0,
      productComposerEfforts.findIndex((item) => item.id === effort),
    ),
  );
  const [provider, setProvider] = useState<
    "all" | ProductComposerModel["provider"]
  >("all");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const currentEffort =
    productComposerEfforts.find((item) => item.id === effort) ??
    productComposerEfforts[1];
  const currentModel = productComposerModels.find((item) => item.id === model);
  const currentModelName = currentModel?.name[locale] ?? model;
  const providerOptions = [
    ["all", zh ? "全部" : "All"],
    ["automatic", zh ? "自动" : "Automatic"],
    ["configured", zh ? "已配置" : "Configured"],
    ["local", zh ? "本地" : "Local"],
  ] as const;
  const filteredModels = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return productComposerModels.filter(
      (item) =>
        (provider === "all" || item.provider === provider) &&
        (!normalized ||
          `${item.name.en} ${item.name.zh} ${item.provider} ${item.description.en} ${item.description.zh}`
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    );
  }, [locale, provider, query]);

  useEffect(() => {
    if (activeControl !== "run") setDetail(null);
  }, [activeControl]);

  useEffect(() => {
    if (detail !== "model") return;
    setQuery("");
    setProvider("all");
    setActiveIndex(0);
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, [detail]);

  useEffect(() => {
    setPreviewEffort(
      Math.max(
        0,
        productComposerEfforts.findIndex((item) => item.id === effort),
      ),
    );
  }, [effort]);

  const preview = productComposerEfforts[previewEffort] ?? currentEffort;

  return (
    <ComposerControl
      activeControl={activeControl}
      control="run"
      label={
        zh
          ? `运行设置：${currentModelName}，努力程度${currentEffort.label.zh}${deepResearch ? "，深度研究已开启" : ""}`
          : `Run settings: ${currentModelName}, ${currentEffort.label.en} effort${deepResearch ? ", deep research enabled" : ""}`
      }
      onActiveControlChange={(next) => {
        if (next !== "run") setDetail(null);
        onActiveControlChange(next);
      }}
      panelDetail={detail ?? undefined}
      panelLabel={zh ? "运行设置面板" : "Run settings panel"}
      trigger={
        <>
          <ProductPlaygroundIcon name="assistant" />
          <span data-setting-label>{currentModelName}</span>
          <i>{currentEffort.label[locale]}</i>
          <ProductPlaygroundIcon name="chevron" />
        </>
      }
    >
      <header>
        <span>
          <span>
            <strong>{zh ? "运行设置" : "Run settings"}</strong>
            <small>
              {zh
                ? "默认配置适合大多数任务，需要时再调整"
                : "Defaults suit most tasks; adjust only when needed"}
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
      <div data-run-settings-row>
        <span>{zh ? "任务方式" : "Task mode"}</span>
        <button
          aria-pressed={deepResearch}
          data-research-active={deepResearch ? "true" : undefined}
          onClick={() => onDeepResearchChange(!deepResearch)}
          type="button"
        >
          <ProductPlaygroundIcon name="search" />
          {zh ? "深度研究" : "Deep research"}
        </button>
      </div>
      <div data-run-settings-row>
        <span>{zh ? "模型与推理" : "Model and reasoning"}</span>
        <div>
          <button
            aria-expanded={detail === "effort"}
            onClick={() =>
              setDetail((current) => (current === "effort" ? null : "effort"))
            }
            type="button"
          >
            <ProductPlaygroundIcon name="brain" />
            {zh
              ? `努力程度 · ${currentEffort.label.zh}`
              : `Effort · ${currentEffort.label.en}`}
            <ProductPlaygroundIcon name="chevron" />
          </button>
          <button
            aria-expanded={detail === "model"}
            onClick={() =>
              setDetail((current) => (current === "model" ? null : "model"))
            }
            type="button"
          >
            <ProductPlaygroundIcon name="assistant" />
            {currentModelName}
            <ProductPlaygroundIcon name="chevron" />
          </button>
        </div>
      </div>

      {detail === "effort" ? (
        <section
          aria-label={zh ? "选择努力程度" : "Choose effort"}
          data-run-detail="effort"
        >
          <header>
            <span>
              <ProductPlaygroundIcon name="brain" />
              <strong>{zh ? "努力程度" : "Effort"}</strong>
            </span>
            <button
              aria-label={zh ? "关闭努力程度" : "Close effort"}
              onClick={() => setDetail(null)}
              type="button"
            >
              <ProductPlaygroundIcon name="close" />
            </button>
          </header>
          <div data-effort-preview>
            <strong>{preview.label[locale]}</strong>
            <p>{preview.description[locale]}</p>
            <input
              aria-label={zh ? "努力程度" : "Effort"}
              aria-valuetext={preview.label[locale]}
              max={productComposerEfforts.length - 1}
              min={0}
              onBlur={(event) => {
                const next =
                  productComposerEfforts[event.currentTarget.valueAsNumber];
                if (next) onEffortChange(next.id);
              }}
              onChange={(event) =>
                setPreviewEffort(event.currentTarget.valueAsNumber)
              }
              onKeyUp={(event) => {
                const next =
                  productComposerEfforts[event.currentTarget.valueAsNumber];
                if (next) onEffortChange(next.id);
              }}
              onPointerUp={(event) => {
                const next =
                  productComposerEfforts[event.currentTarget.valueAsNumber];
                if (next) onEffortChange(next.id);
              }}
              step={1}
              type="range"
              value={previewEffort}
            />
            <div aria-hidden="true" data-effort-ticks>
              {productComposerEfforts.map((item, index) => (
                <span
                  data-active={index === previewEffort ? "true" : undefined}
                  key={item.id}
                >
                  {item.label[locale]}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {detail === "model" ? (
        <section
          aria-label={zh ? "选择模型" : "Choose a model"}
          data-run-detail="model"
        >
          <header>
            <span>
              <ProductPlaygroundIcon name="assistant" />
              <strong>{zh ? "选择模型" : "Choose a model"}</strong>
            </span>
            <button
              aria-label={zh ? "关闭模型选择" : "Close model picker"}
              onClick={() => setDetail(null)}
              type="button"
            >
              <ProductPlaygroundIcon name="close" />
            </button>
          </header>
          <div aria-label={zh ? "模型提供方" : "Model provider"} role="tablist">
            {providerOptions.map(([item, label]) => (
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
                {label}
              </button>
            ))}
          </div>
          <label data-model-search>
            <ProductPlaygroundIcon name="search" />
            <input
              aria-activedescendant={
                filteredModels[activeIndex]
                  ? `product-model-option-${activeIndex}`
                  : undefined
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
                    Math.max(
                      0,
                      Math.min(index + offset, filteredModels.length - 1),
                    ),
                  );
                } else if (
                  event.key === "Enter" &&
                  filteredModels[activeIndex]
                ) {
                  event.preventDefault();
                  onModelChange(filteredModels[activeIndex].id);
                  setDetail(null);
                }
              }}
              placeholder={zh ? "搜索名称或提供方" : "Search name or provider"}
              ref={searchRef}
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
            {filteredModels.map((item, index) => (
              <button
                aria-selected={item.id === model}
                data-active={index === activeIndex ? "true" : undefined}
                id={`product-model-option-${index}`}
                key={item.id}
                onClick={() => {
                  onModelChange(item.id);
                  setDetail(null);
                }}
                onPointerMove={() => setActiveIndex(index)}
                role="option"
                type="button"
              >
                <span data-model-mark>
                  <ProductPlaygroundIcon name="assistant" />
                </span>
                <span>
                  <strong>{item.name[locale]}</strong>
                  <small>{item.description[locale]}</small>
                </span>
                <span data-model-meta>
                  {item.recommended ? (
                    <small>{zh ? "推荐" : "Recommended"}</small>
                  ) : null}
                  <em>{item.price[locale]}</em>
                  {item.id === model ? (
                    <ProductPlaygroundIcon name="check" />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          <footer>
            <button onClick={onConfigure} type="button">
              <ProductPlaygroundIcon name="settings" />
              {zh ? "配置模型与提供方" : "Configure models and providers"}
            </button>
          </footer>
        </section>
      ) : null}
    </ComposerControl>
  );
}

export type { ComposerControlKey };
