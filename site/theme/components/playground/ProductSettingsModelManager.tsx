import { useMemo, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  createInitialProductProviders,
  createProductModelFromDraft,
  type ProductModelDraft,
  type ProductProviderRecord,
} from "./product-model-settings-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";
import { ProductModelProviderManager } from "./ProductSettingsModelProvider";
import {
  announceProductSetting,
  SettingsHeader,
} from "./ProductSettingsPrimitives";

export function ProductModelSettings({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const [providers, setProviders] = useState(() =>
    createInitialProductProviders(locale),
  );
  const [selectedProviderId, setSelectedProviderId] = useState("runtime");
  const [defaultModel, setDefaultModel] = useState("runtime/current");
  const [savedDefaultModel, setSavedDefaultModel] = useState("runtime/current");
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState(
    zh ? "配置已与当前页面同步" : "Configuration is synced to this page",
  );
  const [thinkingBudget, setThinkingBudget] = useState("");
  const [timeout, setTimeout] = useState("");

  const catalog = useMemo(
    () =>
      providers.flatMap((provider) =>
        provider.models.map((model) => ({
          id: `${provider.id}/${model.id}`,
          label: model.name || model.id,
          provider: provider.name,
        })),
      ),
    [providers],
  );
  const selectedProvider =
    providers.find((provider) => provider.id === selectedProviderId) ??
    providers[0];
  const currentDefault = catalog.find((model) => model.id === defaultModel);

  const markDirty = (message?: string) => {
    setDirty(true);
    setStatus(
      message ??
        (zh ? "有未保存的模型配置" : "Model configuration has unsaved changes"),
    );
  };

  const updateProvider = (
    providerId: string,
    update: (provider: ProductProviderRecord) => ProductProviderRecord,
  ) => {
    setProviders((current) =>
      current.map((provider) =>
        provider.id === providerId ? update(provider) : provider,
      ),
    );
    markDirty();
  };

  const reset = () => {
    setProviders(createInitialProductProviders(locale));
    setSelectedProviderId("runtime");
    setDefaultModel(savedDefaultModel);
    setThinkingBudget("");
    setTimeout("");
    setDirty(false);
    setStatus(zh ? "未保存的更改已重置" : "Unsaved changes reset");
  };

  const save = () => {
    setSavedDefaultModel(defaultModel);
    setDirty(false);
    setStatus(
      zh
        ? "配置已保存在当前产品预览中"
        : "Configuration saved in this product preview",
    );
    announceProductSetting("modelConfiguration", {
      defaultModel,
      providerCount: providers.length,
      thinkingBudget: thinkingBudget || null,
      timeoutSeconds: timeout || null,
    });
  };

  const addProvider = () => {
    const id = `provider-${providers.length + 1}`;
    const provider: ProductProviderRecord = {
      apiKey: "",
      baseUrl: "",
      id,
      models: [],
      name: zh ? "新 Provider" : "New provider",
    };
    setProviders((current) => [...current, provider]);
    setSelectedProviderId(id);
    markDirty(
      zh
        ? "填写连接信息并至少添加一个模型"
        : "Complete the connection and add at least one model",
    );
  };

  const removeProvider = (providerId: string) => {
    const providerToRemove = providers.find(
      (provider) => provider.id === providerId,
    );
    if (!providerToRemove || providerToRemove.readOnly) return;

    const removedPrefix = `${providerToRemove.id}/`;
    const next = providers.filter((provider) => provider.id !== providerId);
    const nextCatalog = next.flatMap((provider) =>
      provider.models.map((model) => `${provider.id}/${model.id}`),
    );
    setProviders(next);
    setSelectedProviderId(next[0]?.id ?? "");
    if (defaultModel.startsWith(removedPrefix)) {
      setDefaultModel(nextCatalog[0] ?? "");
    }
    markDirty(
      zh ? "Provider 已移除，保存后生效" : "Provider removed; save to apply",
    );
  };

  const addModel = (providerId: string, draft: ProductModelDraft) => {
    const provider = providers.find((item) => item.id === providerId);
    const modelId = draft.id.trim();
    if (
      !provider ||
      !modelId ||
      provider.models.some((model) => model.id === modelId)
    ) {
      return false;
    }

    const model = createProductModelFromDraft(draft, locale);
    updateProvider(providerId, (current) => ({
      ...current,
      models: [...current.models, model],
    }));
    if (!defaultModel) setDefaultModel(`${providerId}/${model.id}`);
    return true;
  };

  const removeModel = (providerId: string, modelId: string) => {
    const reference = `${providerId}/${modelId}`;
    const nextCatalog = catalog.filter((model) => model.id !== reference);
    updateProvider(providerId, (provider) => ({
      ...provider,
      models: provider.models.filter((model) => model.id !== modelId),
    }));
    if (defaultModel === reference) setDefaultModel(nextCatalog[0]?.id ?? "");
    setStatus(
      zh ? "模型已从待保存目录移除" : "Model removed from the unsaved catalog",
    );
  };

  return (
    <>
      <SettingsHeader
        description={
          zh
            ? "管理默认模型、Provider 连接、模型目录与运行参数；凭据只显示产品交互，不写入文档站。"
            : "Manage the default model, provider connections, model catalog, and runtime overrides. Credentials remain host-owned."
        }
        title={zh ? "模型" : "Models"}
      />

      <section
        aria-label={zh ? "模型配置状态" : "Model configuration status"}
        className="product-model-toolbar"
      >
        <label>
          <span>
            <strong>{zh ? "默认模型" : "Default model"}</strong>
            <small>
              {currentDefault
                ? `${currentDefault.provider} · ${currentDefault.label}`
                : zh
                  ? "请先添加可用模型"
                  : "Add an available model first"}
            </small>
          </span>
          <select
            aria-label={zh ? "默认模型" : "Default model"}
            disabled={catalog.length === 0}
            onChange={(event) => {
              setDefaultModel(event.currentTarget.value);
              markDirty();
            }}
            value={defaultModel}
          >
            {catalog.map((model) => (
              <option key={model.id} value={model.id}>
                {model.provider} / {model.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <output aria-live="polite" data-dirty={dirty ? "true" : undefined}>
            <i />
            {status}
          </output>
          <button disabled={!dirty} onClick={reset} type="button">
            {zh ? "重置" : "Reset"}
          </button>
          <button data-primary disabled={!dirty} onClick={save} type="button">
            <ProductPlaygroundIcon name="check" />
            {zh ? "保存更改" : "Save changes"}
          </button>
        </div>
      </section>

      <ProductModelProviderManager
        defaultModel={defaultModel}
        key={selectedProvider?.id ?? "empty"}
        locale={locale}
        onAddModel={addModel}
        onAddProvider={addProvider}
        onDefaultModelChange={(model) => {
          setDefaultModel(model);
          markDirty();
        }}
        onRemoveModel={removeModel}
        onRemoveProvider={removeProvider}
        onSelectProvider={setSelectedProviderId}
        onStatusChange={setStatus}
        onUpdateProvider={(providerId, field, value) =>
          updateProvider(providerId, (provider) => ({
            ...provider,
            [field]: value,
          }))
        }
        providers={providers}
        selectedProvider={selectedProvider}
      />

      <details className="product-model-runtime">
        <summary>
          <span>
            <strong>
              {zh ? "高级运行参数" : "Advanced runtime parameters"}
            </strong>
            <small>
              {zh
                ? "仅在需要覆盖运行时默认值时设置。"
                : "Set only when overriding runtime defaults."}
            </small>
          </span>
          <em>
            {thinkingBudget || timeout
              ? zh
                ? `${Number(Boolean(thinkingBudget)) + Number(Boolean(timeout))} 项已覆盖`
                : `${Number(Boolean(thinkingBudget)) + Number(Boolean(timeout))} overrides`
              : zh
                ? "使用默认值"
                : "Using defaults"}
          </em>
          <ProductPlaygroundIcon name="chevron" />
        </summary>
        <div>
          <label>
            <span>
              <strong>{zh ? "推理预算" : "Reasoning budget"}</strong>
              <small>
                {zh
                  ? "单次请求最多使用的思考 token。"
                  : "Maximum reasoning tokens for one request."}
              </small>
            </span>
            <span>
              <input
                min="1"
                onChange={(event) => {
                  setThinkingBudget(event.currentTarget.value);
                  markDirty();
                }}
                placeholder={zh ? "运行时默认" : "Runtime default"}
                type="number"
                value={thinkingBudget}
              />
              <small>tokens</small>
            </span>
          </label>
          <label>
            <span>
              <strong>{zh ? "请求超时" : "Request timeout"}</strong>
              <small>
                {zh
                  ? "模型请求等待多久后停止。"
                  : "How long to wait before stopping a model request."}
              </small>
            </span>
            <span>
              <input
                min="0.1"
                onChange={(event) => {
                  setTimeout(event.currentTarget.value);
                  markDirty();
                }}
                placeholder={zh ? "运行时默认" : "Runtime default"}
                step="0.1"
                type="number"
                value={timeout}
              />
              <small>{zh ? "秒" : "seconds"}</small>
            </span>
          </label>
        </div>
      </details>
    </>
  );
}
