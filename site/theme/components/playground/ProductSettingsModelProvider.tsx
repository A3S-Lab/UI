import { useEffect, useRef, useState } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  createEmptyProductModelDraft,
  type ProductModelDraft,
  type ProductProviderRecord,
} from "./product-model-settings-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type ProductModelProviderManagerProps = {
  defaultModel: string;
  locale: ProductPlaygroundLocale;
  onAddModel: (providerId: string, draft: ProductModelDraft) => boolean;
  onAddProvider: () => void;
  onDefaultModelChange: (model: string) => void;
  onRemoveModel: (providerId: string, modelId: string) => void;
  onRemoveProvider: (providerId: string) => void;
  onSelectProvider: (providerId: string) => void;
  onStatusChange: (status: string) => void;
  onUpdateProvider: (
    providerId: string,
    field: "apiKey" | "baseUrl" | "name",
    value: string,
  ) => void;
  providers: readonly ProductProviderRecord[];
  selectedProvider?: ProductProviderRecord;
};

export function ProductModelProviderManager({
  defaultModel,
  locale,
  onAddModel,
  onAddProvider,
  onDefaultModelChange,
  onRemoveModel,
  onRemoveProvider,
  onSelectProvider,
  onStatusChange,
  onUpdateProvider,
  providers,
  selectedProvider,
}: ProductModelProviderManagerProps) {
  const zh = locale === "zh";
  const [connectionState, setConnectionState] = useState<"idle" | "requested">(
    "idle",
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [modelDraft, setModelDraft] = useState<ProductModelDraft | null>(null);
  const [removeConfirmation, setRemoveConfirmation] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const editorDialogRef = useRef<HTMLDialogElement>(null);
  const editorTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setConnectionState("idle");
    setModelDraft(null);
    setRemoveConfirmation(false);
    setRevealed(false);
  }, [selectedProvider?.id]);

  useEffect(() => {
    const dialog = editorDialogRef.current;
    if (!dialog) return;
    if (editorOpen && !dialog.open) dialog.showModal();
    if (!editorOpen && dialog.open) dialog.close();
  }, [editorOpen]);

  const updateModelDraftField = <Key extends keyof ProductModelDraft>(
    field: Key,
    value: ProductModelDraft[Key],
  ) => {
    setModelDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };

  const submitModel = () => {
    if (!selectedProvider || !modelDraft?.id.trim()) return;
    if (!onAddModel(selectedProvider.id, modelDraft)) {
      onStatusChange(
        zh
          ? "模型 ID 在当前 Provider 中必须唯一"
          : "Model ID must be unique within this provider",
      );
      return;
    }
    setModelDraft(null);
    onStatusChange(
      zh ? "模型已加入待保存目录" : "Model added to the unsaved catalog",
    );
  };

  const closeEditor = () => {
    if (editorDialogRef.current?.open) editorDialogRef.current.close();
  };

  const handleEditorClosed = () => {
    setEditorOpen(false);
    queueMicrotask(() => editorTriggerRef.current?.focus());
  };

  const openEditor = (providerId: string, trigger: HTMLButtonElement) => {
    editorTriggerRef.current = trigger;
    onSelectProvider(providerId);
    setEditorOpen(true);
  };

  return (
    <section className="product-model-manager">
      <header>
        <div>
          <strong>{zh ? "Provider 与模型" : "Providers and models"}</strong>
          <small>
            {zh
              ? "选择 Provider 后配置连接和模型。"
              : "Choose a provider, then configure its connection and models."}
          </small>
        </div>
        <button
          aria-haspopup="dialog"
          onClick={(event) => {
            editorTriggerRef.current = event.currentTarget;
            onAddProvider();
            setEditorOpen(true);
          }}
          type="button"
        >
          <ProductPlaygroundIcon name="plus" />
          {zh ? "添加 Provider" : "Add provider"}
        </button>
      </header>

      {providers.length > 0 ? (
        <div
          aria-label={zh ? "Provider 列表" : "Provider list"}
          className="product-model-manager__list"
          role="list"
        >
          {providers.map((provider) => {
            const selected = provider.id === selectedProvider?.id;
            return (
              <article
                data-selected={selected ? "true" : undefined}
                key={provider.id}
                role="listitem"
              >
                <span className="product-model-manager__provider-icon">
                  <ProductPlaygroundIcon
                    name={provider.readOnly ? "database" : "workspace"}
                  />
                </span>
                <div>
                  <header>
                    <strong>{provider.name}</strong>
                    {provider.readOnly ? (
                      <em>{zh ? "运行时" : "Runtime"}</em>
                    ) : null}
                  </header>
                  <p>
                    {provider.readOnly
                      ? zh
                        ? "由宿主运行时同步，只读"
                        : "Synced from the host runtime; read only"
                      : provider.baseUrl ||
                        (zh ? "尚未设置 API 地址" : "API URL not set")}
                  </p>
                  <small>
                    {provider.models.length > 0
                      ? zh
                        ? `${provider.models.length} 个模型`
                        : `${provider.models.length} ${provider.models.length === 1 ? "model" : "models"}`
                      : zh
                        ? "尚未添加模型"
                        : "No models yet"}
                  </small>
                </div>
                <span
                  className="product-model-manager__provider-status"
                  data-ready={
                    provider.readOnly || provider.models.length > 0
                      ? "true"
                      : undefined
                  }
                >
                  <i />
                  {provider.readOnly
                    ? zh
                      ? "已同步"
                      : "Synced"
                    : provider.models.length > 0
                      ? zh
                        ? "已配置"
                        : "Configured"
                      : zh
                        ? "需要配置"
                        : "Setup required"}
                </span>
                <button
                  aria-haspopup="dialog"
                  aria-label={`${zh ? "管理" : "Manage"} ${provider.name}`}
                  onClick={(event) =>
                    openEditor(provider.id, event.currentTarget)
                  }
                  type="button"
                >
                  {zh ? "管理" : "Manage"}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="product-model-manager__empty" role="status">
          <ProductPlaygroundIcon name="workspace" />
          <strong>{zh ? "添加第一个 Provider" : "Add the first provider"}</strong>
          <button
            aria-haspopup="dialog"
            onClick={(event) => {
              editorTriggerRef.current = event.currentTarget;
              onAddProvider();
              setEditorOpen(true);
            }}
            type="button"
          >
            {zh ? "添加 Provider" : "Add provider"}
          </button>
        </div>
      )}

      {selectedProvider ? (
        <dialog
          aria-labelledby="product-model-provider-dialog-title"
          className="product-model-provider"
          data-provider-editor
          onCancel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            closeEditor();
          }}
          onClose={(event) => {
            event.stopPropagation();
            handleEditorClosed();
          }}
          ref={editorDialogRef}
        >
          <header>
            <span>
              <ProductPlaygroundIcon
                name={selectedProvider.readOnly ? "database" : "workspace"}
              />
            </span>
            <div>
              <strong id="product-model-provider-dialog-title">
                {zh
                  ? `管理 ${selectedProvider.name}`
                  : `Manage ${selectedProvider.name}`}
              </strong>
              <small>
                {selectedProvider.readOnly
                  ? zh
                    ? "由宿主运行时同步，只读"
                    : "Synced from the host runtime; read only"
                  : selectedProvider.baseUrl ||
                    (zh ? "尚未设置 API 地址" : "API URL not set")}
              </small>
            </div>
            <button
              aria-label={zh ? "关闭 Provider 配置" : "Close provider settings"}
              onClick={closeEditor}
              type="button"
            >
              <ProductPlaygroundIcon name="close" />
            </button>
          </header>

          <div className="product-model-provider__body">
            {removeConfirmation ? (
              <section
                className="product-model-provider__confirmation"
                role="alert"
              >
                <ProductPlaygroundIcon name="warning" />
                <div>
                  <strong>
                    {zh ? "移除此 Provider？" : "Remove this provider?"}
                  </strong>
                  <small>
                    {zh
                      ? "其模型会从选择器移除，保存前仍可取消。"
                      : "Its models leave the picker. You can still cancel before saving."}
                  </small>
                </div>
                <button
                  onClick={() => setRemoveConfirmation(false)}
                  type="button"
                >
                  {zh ? "取消" : "Cancel"}
                </button>
                <button
                  data-danger
                  onClick={() => {
                    onRemoveProvider(selectedProvider.id);
                    closeEditor();
                  }}
                  type="button"
                >
                  {zh ? "确认移除" : "Remove provider"}
                </button>
              </section>
            ) : null}

            <ProviderConnectionEditor
              connectionState={connectionState}
              locale={locale}
              onConnectionRequest={() => {
                setConnectionState("requested");
                onStatusChange(
                  zh
                    ? "连接检查已交给宿主，等待结果"
                    : "Connection check delegated to the host; awaiting result",
                );
              }}
              onRevealChange={setRevealed}
              onUpdate={(field, value) =>
                onUpdateProvider(selectedProvider.id, field, value)
              }
              provider={selectedProvider}
              revealed={revealed}
            />

            <ProviderModelCatalog
              defaultModel={defaultModel}
              draft={modelDraft}
              locale={locale}
              onDefaultModelChange={onDefaultModelChange}
              onDraftChange={setModelDraft}
              onDraftFieldChange={updateModelDraftField}
              onRemoveModel={(modelId) =>
                onRemoveModel(selectedProvider.id, modelId)
              }
              onSubmitModel={submitModel}
              provider={selectedProvider}
            />
          </div>

          <footer>
            {!selectedProvider.readOnly ? (
              <button
                aria-expanded={removeConfirmation}
                data-danger
                onClick={() => setRemoveConfirmation(true)}
                type="button"
              >
                <ProductPlaygroundIcon name="trash" />
                {zh ? "移除 Provider" : "Remove provider"}
              </button>
            ) : (
              <span />
            )}
            <button onClick={closeEditor} type="button">
              {zh ? "完成" : "Done"}
            </button>
          </footer>
        </dialog>
      ) : null}
    </section>
  );
}

function ProviderConnectionEditor({
  connectionState,
  locale,
  onConnectionRequest,
  onRevealChange,
  onUpdate,
  provider,
  revealed,
}: {
  connectionState: "idle" | "requested";
  locale: ProductPlaygroundLocale;
  onConnectionRequest: () => void;
  onRevealChange: (revealed: boolean) => void;
  onUpdate: (field: "apiKey" | "baseUrl" | "name", value: string) => void;
  provider: ProductProviderRecord;
  revealed: boolean;
}) {
  const zh = locale === "zh";
  return (
    <fieldset
      className="product-model-provider__connection"
      disabled={provider.readOnly}
    >
      <legend>{zh ? "连接" : "Connection"}</legend>
      <label>
        <span>{zh ? "名称" : "Name"}</span>
        <input
          aria-label={zh ? "Provider 名称" : "Provider name"}
          onChange={(event) => onUpdate("name", event.currentTarget.value)}
          value={provider.name}
        />
      </label>
      <label>
        <span>API Base URL</span>
        <input
          aria-label="API Base URL"
          onChange={(event) => onUpdate("baseUrl", event.currentTarget.value)}
          placeholder="https://…/v1"
          value={provider.baseUrl}
        />
      </label>
      <label data-secret>
        <span>API Key</span>
        <span>
          <input
            aria-label="API Key"
            autoComplete="off"
            onChange={(event) => onUpdate("apiKey", event.currentTarget.value)}
            placeholder={zh ? "由宿主安全保存" : "Stored securely by the host"}
            type={revealed ? "text" : "password"}
            value={provider.apiKey}
          />
          <button
            aria-label={
              revealed
                ? zh
                  ? "隐藏 API Key"
                  : "Hide API key"
                : zh
                  ? "显示 API Key"
                  : "Show API key"
            }
            onClick={() => onRevealChange(!revealed)}
            type="button"
          >
            <ProductPlaygroundIcon name={revealed ? "eye-off" : "eye"} />
          </button>
        </span>
      </label>
      <div data-connection-action>
        <button onClick={onConnectionRequest} type="button">
          <ProductPlaygroundIcon name="refresh" />
          {zh ? "检查连接" : "Check connection"}
        </button>
        <output aria-live="polite">
          {connectionState === "requested"
            ? zh
              ? "等待宿主响应"
              : "Awaiting host response"
            : zh
              ? "尚未检查"
              : "Not checked"}
        </output>
      </div>
    </fieldset>
  );
}

function ProviderModelCatalog({
  defaultModel,
  draft,
  locale,
  onDefaultModelChange,
  onDraftChange,
  onDraftFieldChange,
  onRemoveModel,
  onSubmitModel,
  provider,
}: {
  defaultModel: string;
  draft: ProductModelDraft | null;
  locale: ProductPlaygroundLocale;
  onDefaultModelChange: (model: string) => void;
  onDraftChange: (draft: ProductModelDraft | null) => void;
  onDraftFieldChange: <Key extends keyof ProductModelDraft>(
    field: Key,
    value: ProductModelDraft[Key],
  ) => void;
  onRemoveModel: (modelId: string) => void;
  onSubmitModel: () => void;
  provider: ProductProviderRecord;
}) {
  const zh = locale === "zh";
  const draftTriggerRef = useRef<HTMLButtonElement | null>(null);
  const draftWasOpenRef = useRef(false);

  useEffect(() => {
    if (draft) {
      draftWasOpenRef.current = true;
      return;
    }
    if (!draftWasOpenRef.current) return;
    draftWasOpenRef.current = false;
    queueMicrotask(() => draftTriggerRef.current?.focus());
  }, [draft]);

  const openDraft = (trigger: HTMLButtonElement) => {
    draftTriggerRef.current = trigger;
    onDraftChange(createEmptyProductModelDraft());
  };

  return (
    <section className="product-model-catalog">
      <header>
        <div>
          <strong>{zh ? "模型" : "Models"}</strong>
          <small>
            {provider.models.length > 0
              ? zh
                ? `${provider.models.length} 个可用模型`
                : `${provider.models.length} available ${provider.models.length === 1 ? "model" : "models"}`
              : zh
                ? "添加这个 Provider 可用的模型。"
                : "Add the models available from this provider."}
          </small>
        </div>
        {!provider.readOnly ? (
          <button
            aria-expanded={Boolean(draft)}
            aria-haspopup="dialog"
            onClick={(event) => openDraft(event.currentTarget)}
            type="button"
          >
            <ProductPlaygroundIcon name="plus" />
            {zh ? "添加模型" : "Add model"}
          </button>
        ) : null}
      </header>

      {draft ? (
        <ModelDraftForm
          draft={draft}
          locale={locale}
          onCancel={() => onDraftChange(null)}
          onFieldChange={onDraftFieldChange}
          onSubmit={onSubmitModel}
        />
      ) : null}

      {provider.models.length > 0 ? (
        <div
          aria-label={zh ? "模型目录" : "Model catalog"}
          className="product-model-catalog__table"
          role="table"
        >
          <div data-header role="row">
            <span role="columnheader">{zh ? "默认" : "Default"}</span>
            <span role="columnheader">{zh ? "模型" : "Model"}</span>
            <span role="columnheader">{zh ? "能力" : "Capabilities"}</span>
            <span role="columnheader">
              {zh ? "上下文 / 输出" : "Context / output"}
            </span>
            <span role="columnheader">{zh ? "操作" : "Actions"}</span>
          </div>
          {provider.models.map((model) => {
            const reference = `${provider.id}/${model.id}`;
            const isDefault = reference === defaultModel;
            return (
              <div key={model.id} role="row">
                <span role="cell">
                  <button
                    aria-label={
                      isDefault
                        ? zh
                          ? `${model.name} 是默认模型`
                          : `${model.name} is the default model`
                        : zh
                          ? `将 ${model.name} 设为默认模型`
                          : `Set ${model.name} as default`
                    }
                    aria-pressed={isDefault}
                    data-default={isDefault ? "true" : undefined}
                    onClick={() => onDefaultModelChange(reference)}
                    type="button"
                  >
                    <ProductPlaygroundIcon
                      name={isDefault ? "check" : "inspiration"}
                    />
                  </button>
                </span>
                <span role="cell">
                  <strong>{model.name}</strong>
                  <code>{reference}</code>
                </span>
                <span role="cell">
                  {formatCapabilities(model.capabilities, locale)}
                </span>
                <span role="cell">
                  {model.context} / {model.output}
                </span>
                <span role="cell">
                  {!provider.readOnly ? (
                    <button
                      aria-label={
                        zh
                          ? `删除模型 ${model.name}`
                          : `Delete model ${model.name}`
                      }
                      onClick={() => onRemoveModel(model.id)}
                      type="button"
                    >
                      <ProductPlaygroundIcon name="trash" />
                    </button>
                  ) : (
                    <small>{zh ? "只读" : "Read only"}</small>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="product-model-catalog__empty" role="status">
          <span>
            <ProductPlaygroundIcon name="workspace" />
          </span>
          <strong>{zh ? "还没有模型" : "No models yet"}</strong>
          <p>
            {zh
              ? "添加模型后，它会出现在默认模型和任务模型选择器中。"
              : "Added models appear in the default and task model pickers."}
          </p>
        </div>
      )}
    </section>
  );
}

function ModelDraftForm({
  draft,
  locale,
  onCancel,
  onFieldChange,
  onSubmit,
}: {
  draft: ProductModelDraft;
  locale: ProductPlaygroundLocale;
  onCancel: () => void;
  onFieldChange: <Key extends keyof ProductModelDraft>(
    field: Key,
    value: ProductModelDraft[Key],
  ) => void;
  onSubmit: () => void;
}) {
  const zh = locale === "zh";
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => {
    if (dialogRef.current?.open) dialogRef.current.close();
  };

  return (
    <dialog
      aria-labelledby="product-model-draft-title"
      className="product-model-catalog__draft"
      data-model-draft-dialog
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        close();
      }}
      onClose={(event) => {
        event.stopPropagation();
        onCancel();
      }}
      ref={dialogRef}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <header>
          <div>
            <strong id="product-model-draft-title">
              {zh ? "添加模型" : "Add model"}
            </strong>
            <small>
              {zh
                ? "模型 ID 必填，其他字段可按 Provider 能力补充。"
                : "Model ID is required. Add the remaining fields when the provider supports them."}
            </small>
          </div>
          <button
            aria-label={zh ? "关闭添加模型" : "Close add model"}
            onClick={close}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        </header>
        <ModelDraftField
          autoFocus
          label={zh ? "模型 ID" : "Model ID"}
          onChange={(value) => onFieldChange("id", value)}
          placeholder={zh ? "由 Provider 提供" : "From the provider catalog"}
          value={draft.id}
        />
        <ModelDraftField
          label={zh ? "显示名称" : "Display name"}
          onChange={(value) => onFieldChange("name", value)}
          placeholder={zh ? "留空则使用模型 ID" : "Uses the model ID when empty"}
          value={draft.name}
        />
        <ModelDraftField
          inputMode="numeric"
          label={zh ? "上下文上限" : "Context limit"}
          onChange={(value) => onFieldChange("context", value)}
          placeholder={zh ? "可选" : "Optional"}
          value={draft.context}
        />
        <ModelDraftField
          inputMode="numeric"
          label={zh ? "输出上限" : "Output limit"}
          onChange={(value) => onFieldChange("output", value)}
          placeholder={zh ? "可选" : "Optional"}
          value={draft.output}
        />
        <fieldset>
          <legend>{zh ? "能力" : "Capabilities"}</legend>
          {(
            [
              ["reasoning", zh ? "推理" : "Reasoning"],
              ["tools", zh ? "工具调用" : "Tool use"],
              ["attachment", zh ? "附件" : "Attachments"],
            ] as const
          ).map(([id, label]) => (
            <label key={id}>
              <input
                checked={draft[id]}
                onChange={(event) =>
                  onFieldChange(id, event.currentTarget.checked)
                }
                type="checkbox"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <footer>
          <button onClick={close} type="button">
            {zh ? "取消" : "Cancel"}
          </button>
          <button data-primary disabled={!draft.id.trim()} type="submit">
            {zh ? "添加到目录" : "Add to catalog"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function ModelDraftField({
  autoFocus,
  inputMode,
  label,
  onChange,
  placeholder,
  value,
}: {
  autoFocus?: boolean;
  inputMode?: "numeric";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        autoFocus={autoFocus}
        inputMode={inputMode}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function formatCapabilities(
  capabilities: readonly ("attachment" | "reasoning" | "tools")[],
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (capabilities.length === 0) return zh ? "标准" : "Standard";
  return capabilities
    .map((capability) =>
      capability === "reasoning"
        ? zh
          ? "推理"
          : "Reasoning"
        : capability === "tools"
          ? zh
            ? "工具"
            : "Tools"
          : zh
            ? "附件"
            : "Attachments",
    )
    .join(" · ");
}
