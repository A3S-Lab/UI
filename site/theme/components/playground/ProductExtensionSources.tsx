import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type ExtensionSource = {
  address: string;
  count: number;
  id: string;
  name: string;
  trust: "local" | "pending" | "verified";
};

const initialSources: readonly ExtensionSource[] = [
  {
    address: "registry.a3s.dev",
    count: 18,
    id: "verified",
    name: "A3S verified",
    trust: "verified",
  },
  {
    address: "127.0.0.1:7331",
    count: 3,
    id: "local",
    name: "Local development",
    trust: "local",
  },
];

function validateSourceAddress(value: string, zh: boolean) {
  const candidate = value.trim();
  if (!candidate) return zh ? "请输入来源地址。" : "Enter a source address.";

  try {
    const parsed = new URL(
      candidate.includes("://") ? candidate : `https://${candidate}`,
    );
    const loopback =
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "localhost" ||
      parsed.hostname === "[::1]";

    if (parsed.username || parsed.password) {
      return zh
        ? "地址不能包含用户名或密码。"
        : "The address cannot contain a username or password.";
    }
    if (
      parsed.protocol !== "https:" &&
      !(parsed.protocol === "http:" && loopback)
    ) {
      return zh
        ? "远程来源必须使用 HTTPS；HTTP 只允许本机回环地址。"
        : "Remote sources must use HTTPS. HTTP is limited to loopback addresses.";
    }
    return null;
  } catch {
    return zh
      ? "请输入有效的 HTTPS 或本机来源地址。"
      : "Enter a valid HTTPS or local source address.";
  }
}

export function ProductExtensionSources({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<{ address?: string; name?: string }>({});
  const [feedback, setFeedback] = useState<string>();
  const [name, setName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sources, setSources] = useState<ExtensionSource[]>([
    ...initialSources,
  ]);

  useEffect(
    () => () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    },
    [],
  );

  const openAddDialog = () => {
    setName("");
    setAddress("");
    setErrors({});
    addDialogRef.current?.showModal();
    window.requestAnimationFrame(() => nameInputRef.current?.focus());
  };

  const closeAddDialog = () => addDialogRef.current?.close();

  const addSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const addressError = validateSourceAddress(address, zh);
    const nextErrors = {
      address: addressError ?? undefined,
      name: trimmedName
        ? undefined
        : zh
          ? "请输入来源名称。"
          : "Enter a source name.",
    };

    if (nextErrors.address || nextErrors.name) {
      setErrors(nextErrors);
      return;
    }

    const normalizedAddress = address
      .trim()
      .replace(/^https?:\/\//u, "")
      .replace(/\/$/u, "");
    if (sources.some((source) => source.address === normalizedAddress)) {
      setErrors({
        address: zh
          ? "此来源地址已经存在。"
          : "This source address already exists.",
      });
      return;
    }

    setSources((current) => [
      ...current,
      {
        address: normalizedAddress,
        count: 0,
        id: `custom-${current.length + 1}`,
        name: trimmedName,
        trust: "pending",
      },
    ]);
    setFeedback(
      zh
        ? "来源已加入待验证清单；身份验证完成前不会加载可执行内容。"
        : "Source added for review. Executable content stays unloaded until identity verification completes.",
    );
    closeAddDialog();
  };

  const refreshSources = () => {
    if (refreshing) return;
    setRefreshing(true);
    setFeedback(undefined);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      setRefreshing(false);
      setFeedback(
        zh
          ? `已重新读取 ${sources.length} 个来源的状态，未自动加载新内容。`
          : `Re-read ${sources.length} source states without loading new content automatically.`,
      );
    }, 550);
  };

  const trustLabel = (trust: ExtensionSource["trust"]) => {
    if (trust === "verified") return zh ? "已验证" : "Verified";
    if (trust === "local") return zh ? "仅本机" : "Local only";
    return zh ? "待验证" : "Pending review";
  };

  return (
    <section
      aria-labelledby="product-marketplace-sources-tab product-extension-sources-title"
      className="product-marketplace__sources"
      data-source-count={sources.length}
      id="product-marketplace-sources-panel"
      role="tabpanel"
    >
      <header>
        <div>
          <h2 id="product-extension-sources-title">
            {zh ? "扩展来源" : "Extension sources"}
          </h2>
          <p>
            {zh
              ? "来源身份变化会重新验证已打开的扩展。"
              : "Identity changes trigger re-verification for open extensions."}
          </p>
        </div>
        <button
          aria-busy={refreshing}
          data-source-refresh-state={refreshing ? "refreshing" : "ready"}
          disabled={refreshing}
          onClick={refreshSources}
          type="button"
        >
          <ProductPlaygroundIcon name="refresh" />
          {refreshing
            ? zh
              ? "正在刷新"
              : "Refreshing"
            : zh
              ? "刷新来源"
              : "Refresh sources"}
        </button>
      </header>

      {feedback ? (
        <output className="product-marketplace__sources-feedback">
          <ProductPlaygroundIcon name="check" />
          {feedback}
        </output>
      ) : null}

      <div role="table" aria-label={zh ? "扩展来源" : "Extension sources"}>
        <div data-header role="row">
          <span role="columnheader">{zh ? "来源" : "Source"}</span>
          <span role="columnheader">{zh ? "地址" : "Address"}</span>
          <span role="columnheader">{zh ? "信任" : "Trust"}</span>
          <span role="columnheader">{zh ? "扩展" : "Extensions"}</span>
        </div>
        {sources.map((source) => (
          <div data-source-id={source.id} key={source.id} role="row">
            <span role="cell">
              <i>
                <ProductPlaygroundIcon name="database" />
              </i>
              <strong>{source.name}</strong>
            </span>
            <code role="cell">{source.address}</code>
            <em data-trust={source.trust} role="cell">
              <ProductPlaygroundIcon
                name={source.trust === "pending" ? "warning" : "shield"}
              />
              {trustLabel(source.trust)}
            </em>
            <span role="cell">{source.count}</span>
          </div>
        ))}
      </div>

      <section>
        <ProductPlaygroundIcon name="warning" />
        <div>
          <strong>
            {zh
              ? "添加来源前先验证发布者"
              : "Verify the publisher before adding a source"}
          </strong>
          <p>
            {zh
              ? "来源可以提供可执行扩展。未知来源默认不会被加载。"
              : "Sources may provide executable extensions. Unknown sources are not loaded by default."}
          </p>
        </div>
        <button onClick={openAddDialog} ref={addTriggerRef} type="button">
          <ProductPlaygroundIcon name="plus" />
          {zh ? "添加来源" : "Add source"}
        </button>
      </section>

      <dialog
        aria-describedby="product-extension-source-description"
        aria-labelledby="product-extension-source-title"
        className="product-marketplace__source-dialog"
        onClose={() => addTriggerRef.current?.focus()}
        ref={addDialogRef}
      >
        <header>
          <div>
            <h2 id="product-extension-source-title">
              {zh ? "添加扩展来源" : "Add extension source"}
            </h2>
            <p id="product-extension-source-description">
              {zh
                ? "这里只保存来源身份；验证完成前不会下载或执行扩展。"
                : "This stores source identity only. Nothing is downloaded or executed before verification."}
            </p>
          </div>
          <button
            aria-label={zh ? "关闭添加来源" : "Close add source"}
            onClick={closeAddDialog}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        </header>
        <form noValidate onSubmit={addSource}>
          <label>
            <span>{zh ? "来源名称" : "Source name"}</span>
            <input
              aria-label={zh ? "来源名称" : "Source name"}
              aria-describedby={
                errors.name ? "product-source-name-error" : undefined
              }
              aria-invalid={errors.name ? "true" : undefined}
              onChange={(event) => {
                setName(event.currentTarget.value);
                if (errors.name)
                  setErrors((current) => ({ ...current, name: undefined }));
              }}
              ref={nameInputRef}
              value={name}
            />
            {errors.name ? (
              <small id="product-source-name-error" role="alert">
                {errors.name}
              </small>
            ) : null}
          </label>
          <label>
            <span>{zh ? "来源地址" : "Source address"}</span>
            <input
              aria-label={zh ? "来源地址" : "Source address"}
              aria-describedby={
                errors.address
                  ? "product-source-address-error"
                  : "product-source-address-hint"
              }
              aria-invalid={errors.address ? "true" : undefined}
              inputMode="url"
              onChange={(event) => {
                setAddress(event.currentTarget.value);
                if (errors.address) {
                  setErrors((current) => ({ ...current, address: undefined }));
                }
              }}
              placeholder="https://extensions.example.com"
              value={address}
            />
            {errors.address ? (
              <small id="product-source-address-error" role="alert">
                {errors.address}
              </small>
            ) : (
              <small id="product-source-address-hint">
                {zh
                  ? "远程来源使用 HTTPS；本机调试可使用 HTTP 回环地址。"
                  : "Use HTTPS remotely; HTTP is accepted only for local loopback development."}
              </small>
            )}
          </label>
          <footer>
            <button onClick={closeAddDialog} type="button">
              {zh ? "取消" : "Cancel"}
            </button>
            <button data-primary type="submit">
              {zh ? "加入待验证清单" : "Add for review"}
            </button>
          </footer>
        </form>
      </dialog>
    </section>
  );
}
