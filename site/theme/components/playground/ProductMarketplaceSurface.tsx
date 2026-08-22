import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ProductExtensionDetail } from "./ProductExtensionDetail";
import { ProductExtensionHost } from "./ProductExtensionHost";
import { ProductExtensionSources } from "./ProductExtensionSources";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  defaultInstalledExtensionIds,
  productExtensions,
  type ExtensionChannel,
} from "./product-marketplace-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

type MarketplaceSection = "extensions" | "sources";
type MarketplaceSort = "name" | "recommended" | "updated";
type MarketplaceFeedback = {
  message: string;
  tone: "success" | "warning";
};

const installedExtensionsStorageKey = "a3s-playground-installed-extensions";
const installedExtensionsStorageEvent =
  "a3s:playground-installed-extensions-change";

function defaultInstalledExtensions() {
  return new Set<string>(defaultInstalledExtensionIds);
}

function readInstalledExtensions() {
  if (typeof window === "undefined") {
    return { installed: defaultInstalledExtensions(), storageAvailable: true };
  }

  try {
    const value = window.localStorage.getItem(installedExtensionsStorageKey);
    if (!value) {
      return {
        installed: defaultInstalledExtensions(),
        storageAvailable: true,
      };
    }

    try {
      const parsed = JSON.parse(value) as { ids?: unknown };
      const knownIds = new Set(
        productExtensions.map((extension) => extension.id),
      );
      const ids = Array.isArray(parsed.ids)
        ? parsed.ids.filter(
            (id): id is string => typeof id === "string" && knownIds.has(id),
          )
        : [...defaultInstalledExtensionIds];
      return { installed: new Set(ids), storageAvailable: true };
    } catch {
      return {
        installed: defaultInstalledExtensions(),
        storageAvailable: true,
      };
    }
  } catch {
    return { installed: defaultInstalledExtensions(), storageAvailable: false };
  }
}

function persistInstalledExtensions(installed: Set<string>) {
  if (typeof window === "undefined") return false;

  try {
    const ids = [...installed];
    window.localStorage.setItem(
      installedExtensionsStorageKey,
      JSON.stringify({ ids, version: 1 }),
    );
    window.dispatchEvent(
      new CustomEvent(installedExtensionsStorageEvent, { detail: { ids } }),
    );
    return true;
  } catch {
    return false;
  }
}

export function ProductMarketplaceSurface({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  const detailAsideRef = useRef<HTMLElement>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const detailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const installTimerRef = useRef<number | null>(null);
  const installedFilterRef = useRef<HTMLButtonElement>(null);
  const restoreDetailFocusRef = useRef(true);
  const uninstallConfirmedRef = useRef(false);
  const uninstallDialogRef = useRef<HTMLDialogElement>(null);
  const uninstallTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [channel, setChannel] = useState<"all" | ExtensionChannel>("all");
  const [feedback, setFeedback] = useState<MarketplaceFeedback>();
  const [hostId, setHostId] = useState<string>();
  const [hydrated, setHydrated] = useState(false);
  const [installed, setInstalled] = useState(defaultInstalledExtensions);
  const [installedOnly, setInstalledOnly] = useState(false);
  const [installingId, setInstallingId] = useState<string>();
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<MarketplaceSection>("extensions");
  const [selectedId, setSelectedId] = useState("release-review");
  const [sort, setSort] = useState<MarketplaceSort>("recommended");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [uninstallId, setUninstallId] = useState<string>();

  useEffect(() => {
    const synchronize = (event?: Event) => {
      if (
        event instanceof StorageEvent &&
        event.key !== null &&
        event.key !== installedExtensionsStorageKey
      ) {
        return;
      }

      if (event instanceof CustomEvent && Array.isArray(event.detail?.ids)) {
        setInstalled(new Set(event.detail.ids));
        setStorageAvailable(true);
        setHydrated(true);
        return;
      }

      const stored = readInstalledExtensions();
      setInstalled(stored.installed);
      setStorageAvailable(stored.storageAvailable);
      setHydrated(true);
      if (!stored.storageAvailable) {
        setFeedback({
          message: zh
            ? "浏览器未允许读取安装状态；当前页面仍可使用，但离开后不会保留更改。"
            : "Browser storage is unavailable. This page still works, but install changes will not persist.",
          tone: "warning",
        });
      }
    };

    synchronize();
    window.addEventListener("storage", synchronize);
    window.addEventListener(installedExtensionsStorageEvent, synchronize);
    return () => {
      window.removeEventListener("storage", synchronize);
      window.removeEventListener(installedExtensionsStorageEvent, synchronize);
      if (installTimerRef.current !== null) {
        window.clearTimeout(installTimerRef.current);
      }
    };
  }, [zh]);

  const visibleExtensions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    const filtered = productExtensions.filter(
      (extension) =>
        (channel === "all" || extension.channel === channel) &&
        (!installedOnly || installed.has(extension.id)) &&
        (!normalized ||
          `${extension.name.en} ${extension.name.zh} ${extension.publisher} ${extension.description.en} ${extension.description.zh}`
            .toLocaleLowerCase(locale)
            .includes(normalized)),
    );
    const collator = new Intl.Collator(locale === "zh" ? "zh-CN" : "en");

    return filtered.sort((left, right) => {
      if (sort === "updated") return left.updatedRank - right.updatedRank;
      if (sort === "name") {
        return collator.compare(left.name[locale], right.name[locale]);
      }
      return left.featuredRank - right.featuredRank;
    });
  }, [channel, installed, installedOnly, locale, query, sort]);

  const selected =
    visibleExtensions.find((extension) => extension.id === selectedId) ??
    visibleExtensions[0] ??
    productExtensions.find((extension) => extension.id === selectedId) ??
    productExtensions[0];
  const hostExtension = productExtensions.find(
    (extension) => extension.id === hostId,
  );
  const uninstallExtension = productExtensions.find(
    (extension) => extension.id === uninstallId,
  );

  const focusExtensionTrigger = (id: string) => {
    const trigger = document.querySelector<HTMLButtonElement>(
      `[data-extension-id="${id}"] [data-extension-review]`,
    );
    (trigger ?? installedFilterRef.current)?.focus();
  };

  const updateInstalled = (
    next: Set<string>,
    successMessage: string,
    warningMessage: string,
  ) => {
    const persisted = persistInstalledExtensions(next);
    setInstalled(next);
    setStorageAvailable(persisted);
    setFeedback({
      message: persisted ? successMessage : warningMessage,
      tone: persisted ? "success" : "warning",
    });
  };

  const installExtension = (id: string) => {
    if (installed.has(id) || installingId) return;
    const extension = productExtensions.find((item) => item.id === id);
    if (!extension) return;

    setFeedback(undefined);
    setInstallingId(id);
    installTimerRef.current = window.setTimeout(() => {
      installTimerRef.current = null;
      const next = new Set(installed);
      next.add(id);
      updateInstalled(
        next,
        zh
          ? `${extension.name.zh} 已安装，安装状态已保存在此浏览器。`
          : `${extension.name.en} installed. The install state was saved in this browser.`,
        zh
          ? `${extension.name.zh} 已在当前页面安装，但浏览器未允许保存。`
          : `${extension.name.en} is installed on this page, but browser storage is unavailable.`,
      );
      setInstallingId(undefined);
    }, 550);
  };

  const retryPersistence = () => {
    const persisted = persistInstalledExtensions(installed);
    setStorageAvailable(persisted);
    setFeedback({
      message: persisted
        ? zh
          ? "安装状态已保存。"
          : "Install state saved."
        : zh
          ? "仍无法保存，请检查浏览器存储权限后重试。"
          : "Still unable to save. Check browser storage permissions and retry.",
      tone: persisted ? "success" : "warning",
    });
  };

  const openExtensionReview = (id: string, trigger: HTMLButtonElement) => {
    setSelectedId(id);
    detailTriggerRef.current = trigger;
    window.requestAnimationFrame(() => {
      const detailIsHidden =
        !detailAsideRef.current ||
        window.getComputedStyle(detailAsideRef.current).display === "none";
      if (detailIsHidden && !detailDialogRef.current?.open) {
        detailDialogRef.current?.showModal();
      }
    });
  };

  const closeDetailDialog = () => detailDialogRef.current?.close();

  const openExtensionHost = (id: string) => {
    restoreDetailFocusRef.current = false;
    detailDialogRef.current?.close();
    setHostId(id);
  };

  const requestUninstall = (id: string, trigger: HTMLButtonElement) => {
    setUninstallId(id);
    uninstallTriggerRef.current = trigger;
    uninstallDialogRef.current?.showModal();
  };

  const confirmUninstall = () => {
    if (!uninstallExtension) return;
    const id = uninstallExtension.id;
    const next = new Set(installed);
    next.delete(id);
    uninstallConfirmedRef.current = true;
    restoreDetailFocusRef.current = false;
    uninstallDialogRef.current?.close();
    detailDialogRef.current?.close();
    updateInstalled(
      next,
      zh
        ? `${uninstallExtension.name.zh} 已卸载；已有任务内容保持不变。`
        : `${uninstallExtension.name.en} uninstalled. Existing task content is unchanged.`,
      zh
        ? `${uninstallExtension.name.zh} 已从当前页面卸载，但浏览器未允许保存。`
        : `${uninstallExtension.name.en} was removed on this page, but browser storage is unavailable.`,
    );
    window.requestAnimationFrame(() => focusExtensionTrigger(id));
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: MarketplaceSection,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = current === "extensions" ? "sources" : "extensions";
    setSection(next);
    document.getElementById(`product-marketplace-${next}-tab`)?.focus();
  };

  if (hostExtension) {
    return (
      <ProductExtensionHost
        extension={hostExtension}
        locale={locale}
        onBack={() => {
          const id = hostExtension.id;
          setHostId(undefined);
          window.requestAnimationFrame(() => focusExtensionTrigger(id));
        }}
      />
    );
  }

  return (
    <section
      aria-busy={!hydrated || Boolean(installingId)}
      className="product-marketplace"
      data-hydrated={hydrated ? "true" : "false"}
      data-product-surface="marketplace"
    >
      <header>
        <div>
          <span>
            <ProductPlaygroundIcon name="catalog" />
          </span>
          <div>
            <h1>{zh ? "扩展" : "Extensions"}</h1>
            <p>
              {zh
                ? "安装经过验证的功能扩展；技能、连接器和专家仍在能力目录中管理。"
                : "Install verified product extensions. Skills, connectors, and assistants remain in the capability directory."}
            </p>
          </div>
        </div>
        <div>
          <label data-focus-owner="container">
            <ProductPlaygroundIcon name="search" />
            <input
              aria-label={zh ? "搜索扩展" : "Search extensions"}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={zh ? "搜索扩展" : "Search extensions"}
              type="search"
              value={query}
            />
          </label>
          <button
            aria-pressed={installedOnly}
            onClick={() => setInstalledOnly((value) => !value)}
            ref={installedFilterRef}
            type="button"
          >
            <ProductPlaygroundIcon name="check" />
            {zh ? `已安装 ${installed.size}` : `Installed ${installed.size}`}
          </button>
        </div>
      </header>

      <nav aria-label={zh ? "扩展页面" : "Extension pages"} role="tablist">
        <button
          aria-controls="product-marketplace-extensions-panel"
          aria-selected={section === "extensions"}
          id="product-marketplace-extensions-tab"
          onClick={() => setSection("extensions")}
          onKeyDown={(event) => handleTabKeyDown(event, "extensions")}
          role="tab"
          tabIndex={section === "extensions" ? 0 : -1}
          type="button"
        >
          <ProductPlaygroundIcon name="catalog" />
          {zh ? "插件" : "Extensions"}
        </button>
        <button
          aria-controls="product-marketplace-sources-panel"
          aria-selected={section === "sources"}
          id="product-marketplace-sources-tab"
          onClick={() => setSection("sources")}
          onKeyDown={(event) => handleTabKeyDown(event, "sources")}
          role="tab"
          tabIndex={section === "sources" ? 0 : -1}
          type="button"
        >
          <ProductPlaygroundIcon name="shield" />
          {zh ? "来源" : "Sources"}
        </button>
      </nav>

      {section === "sources" ? (
        <ProductExtensionSources locale={locale} />
      ) : (
        <div
          aria-labelledby="product-marketplace-extensions-tab"
          className="product-marketplace__workspace"
          id="product-marketplace-extensions-panel"
          role="tabpanel"
        >
          <aside>
            <header>
              <strong>{zh ? "筛选" : "Filters"}</strong>
              <button
                disabled={channel === "all" && !installedOnly && !query}
                onClick={() => {
                  setChannel("all");
                  setInstalledOnly(false);
                  setQuery("");
                }}
                type="button"
              >
                {zh ? "清除" : "Clear"}
              </button>
            </header>
            <fieldset>
              <legend>{zh ? "发布通道" : "Release channel"}</legend>
              {(
                [
                  ["all", zh ? "全部" : "All"],
                  ["stable", zh ? "稳定版" : "Stable"],
                  ["beta", zh ? "测试版" : "Beta"],
                ] as const
              ).map(([id, label]) => (
                <label key={id}>
                  <input
                    checked={channel === id}
                    name="extension-channel"
                    onChange={() => setChannel(id)}
                    type="radio"
                  />
                  <span>{label}</span>
                  <small>
                    {id === "all"
                      ? productExtensions.length
                      : productExtensions.filter((item) => item.channel === id)
                          .length}
                  </small>
                </label>
              ))}
            </fieldset>
            <section>
              <ProductPlaygroundIcon name="shield" />
              <div>
                <strong>{zh ? "验证边界" : "Verified boundary"}</strong>
                <p>
                  {zh
                    ? "扩展在隔离宿主中运行，权限在安装前明确列出。"
                    : "Extensions run in an isolated host and list permissions before installation."}
                </p>
              </div>
            </section>
          </aside>

          <main>
            <header>
              <div>
                <h2>
                  {installedOnly
                    ? zh
                      ? "已安装"
                      : "Installed"
                    : zh
                      ? "精选扩展"
                      : "Featured extensions"}
                </h2>
                <p>
                  {zh
                    ? `${visibleExtensions.length} 个扩展可用`
                    : `${visibleExtensions.length} extensions available`}
                </p>
              </div>
              <select
                aria-label={zh ? "扩展排序" : "Sort extensions"}
                onChange={(event) =>
                  setSort(event.currentTarget.value as MarketplaceSort)
                }
                value={sort}
              >
                <option value="recommended">
                  {zh ? "推荐优先" : "Recommended"}
                </option>
                <option value="updated">
                  {zh ? "最近更新" : "Recently updated"}
                </option>
                <option value="name">{zh ? "按名称" : "Name"}</option>
              </select>
            </header>

            {feedback ? (
              <div
                className="product-marketplace__feedback"
                data-tone={feedback.tone}
                role="status"
              >
                <ProductPlaygroundIcon
                  name={feedback.tone === "success" ? "check" : "warning"}
                />
                <span>{feedback.message}</span>
                {!storageAvailable ? (
                  <button onClick={retryPersistence} type="button">
                    <ProductPlaygroundIcon name="refresh" />
                    {zh ? "重试保存" : "Retry saving"}
                  </button>
                ) : null}
                <button
                  aria-label={zh ? "关闭状态消息" : "Dismiss status"}
                  onClick={() => setFeedback(undefined)}
                  type="button"
                >
                  <ProductPlaygroundIcon name="close" />
                </button>
              </div>
            ) : null}

            {visibleExtensions.length ? (
              <div className="product-marketplace__directory">
                {visibleExtensions.map((extension) => {
                  const isInstalled = installed.has(extension.id);
                  return (
                    <article
                      data-extension-id={extension.id}
                      data-installed={isInstalled ? "true" : "false"}
                      data-selected={
                        selected.id === extension.id ? "true" : undefined
                      }
                      key={extension.id}
                    >
                      <button
                        aria-label={`${zh ? "查看扩展详情" : "Review extension"} ${extension.name[locale]}`}
                        data-extension-review
                        onClick={(event) =>
                          openExtensionReview(extension.id, event.currentTarget)
                        }
                        type="button"
                      >
                        <span data-extension-icon>
                          <ProductPlaygroundIcon name={extension.icon} />
                        </span>
                        <span>
                          <strong>{extension.name[locale]}</strong>
                          <small>
                            {extension.publisher} · v{extension.version}
                          </small>
                          <p>{extension.description[locale]}</p>
                          <span data-extension-meta>
                            <em data-channel={extension.channel}>
                              {extension.channel === "stable"
                                ? zh
                                  ? "稳定版"
                                  : "Stable"
                                : "Beta"}
                            </em>
                            {isInstalled ? (
                              <em data-installed-badge>
                                <ProductPlaygroundIcon name="check" />
                                {zh ? "已安装" : "Installed"}
                              </em>
                            ) : null}
                          </span>
                        </span>
                        <ProductPlaygroundIcon name="arrow" />
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="product-marketplace__empty" role="status">
                <ProductPlaygroundIcon name="search" />
                <strong>
                  {zh ? "没有匹配的扩展" : "No matching extensions"}
                </strong>
                <span>
                  {zh
                    ? "调整搜索或筛选条件后重试。"
                    : "Change the search or filters and try again."}
                </span>
              </div>
            )}
          </main>

          <aside
            aria-label={zh ? "扩展详情" : "Extension details"}
            className="product-marketplace__detail"
            ref={detailAsideRef}
          >
            <ProductExtensionDetail
              extension={selected}
              installed={installed.has(selected.id)}
              installing={installingId === selected.id}
              locale={locale}
              onInstall={() => installExtension(selected.id)}
              onOpen={() => openExtensionHost(selected.id)}
              onRequestUninstall={(trigger) =>
                requestUninstall(selected.id, trigger)
              }
            />
          </aside>
        </div>
      )}

      <dialog
        aria-label={zh ? "扩展详情" : "Extension details"}
        className="product-marketplace__detail-dialog"
        data-extension-detail-dialog
        onClose={() => {
          if (restoreDetailFocusRef.current) detailTriggerRef.current?.focus();
          restoreDetailFocusRef.current = true;
        }}
        ref={detailDialogRef}
      >
        <ProductExtensionDetail
          extension={selected}
          installed={installed.has(selected.id)}
          installing={installingId === selected.id}
          locale={locale}
          onClose={closeDetailDialog}
          onInstall={() => installExtension(selected.id)}
          onOpen={() => openExtensionHost(selected.id)}
          onRequestUninstall={(trigger) =>
            requestUninstall(selected.id, trigger)
          }
        />
      </dialog>

      <dialog
        aria-describedby="product-extension-uninstall-description"
        aria-labelledby="product-extension-uninstall-title"
        className="product-marketplace__uninstall-dialog"
        onClose={() => {
          if (uninstallConfirmedRef.current && uninstallId) {
            window.requestAnimationFrame(() =>
              focusExtensionTrigger(uninstallId),
            );
          } else {
            uninstallTriggerRef.current?.focus();
          }
          uninstallConfirmedRef.current = false;
        }}
        ref={uninstallDialogRef}
      >
        <span aria-hidden="true">
          <ProductPlaygroundIcon name="warning" />
        </span>
        <div>
          <h2 id="product-extension-uninstall-title">
            {zh ? "卸载这个扩展？" : "Uninstall this extension?"}
          </h2>
          <p id="product-extension-uninstall-description">
            {zh
              ? `${uninstallExtension?.name.zh ?? "此扩展"} 将无法再运行。已经生成的任务内容和证据不会被删除。`
              : `${uninstallExtension?.name.en ?? "This extension"} will no longer run. Existing task content and evidence will not be deleted.`}
          </p>
        </div>
        <footer>
          <button
            onClick={() => uninstallDialogRef.current?.close()}
            type="button"
          >
            {zh ? "取消" : "Cancel"}
          </button>
          <button data-danger onClick={confirmUninstall} type="button">
            {zh ? "确认卸载" : "Uninstall"}
          </button>
        </footer>
      </dialog>
    </section>
  );
}
