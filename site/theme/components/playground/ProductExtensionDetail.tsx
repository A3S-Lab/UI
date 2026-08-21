import type { ProductPlaygroundLocale } from "./product-playground-data";
import type { ProductExtension } from "./product-marketplace-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductExtensionDetail({
  extension,
  installed,
  installing,
  locale,
  onClose,
  onInstall,
  onOpen,
  onRequestUninstall,
}: {
  extension: ProductExtension;
  installed: boolean;
  installing: boolean;
  locale: ProductPlaygroundLocale;
  onClose?: () => void;
  onInstall: () => void;
  onOpen: () => void;
  onRequestUninstall: (trigger: HTMLButtonElement) => void;
}) {
  const zh = locale === "zh";

  return (
    <>
      <header>
        <span data-extension-icon>
          <ProductPlaygroundIcon name={extension.icon} />
        </span>
        <div>
          <strong>{extension.name[locale]}</strong>
          <small>
            {extension.publisher} · v{extension.version}
          </small>
        </div>
        {onClose ? (
          <button
            aria-label={zh ? "关闭扩展详情" : "Close extension details"}
            data-extension-detail-close
            onClick={onClose}
            type="button"
          >
            <ProductPlaygroundIcon name="close" />
          </button>
        ) : null}
      </header>
      <p>{extension.description[locale]}</p>
      <section data-extension-permissions>
        <h3>{zh ? "请求的权限" : "Requested permissions"}</h3>
        {extension.permissions.map((permission) => (
          <div key={permission.en}>
            <ProductPlaygroundIcon name="check" />
            <span>{permission[locale]}</span>
          </div>
        ))}
        <p>
          <ProductPlaygroundIcon name="shield" />
          <span>
            {zh
              ? "只会向隔离宿主授予这里列出的权限；新增权限需要再次确认。"
              : "Only the permissions listed here reach the isolated host. New permissions require another review."}
          </span>
        </p>
      </section>
      <dl>
        <div>
          <dt>{zh ? "安装状态" : "Install status"}</dt>
          <dd data-installed={installed ? "true" : "false"}>
            {installed ? <ProductPlaygroundIcon name="check" /> : null}
            {installed
              ? zh
                ? "已安装"
                : "Installed"
              : zh
                ? "未安装"
                : "Not installed"}
          </dd>
        </div>
        <div>
          <dt>{zh ? "发布通道" : "Release channel"}</dt>
          <dd>
            {extension.channel === "stable"
              ? zh
                ? "稳定版"
                : "Stable"
              : zh
                ? "测试版"
                : "Beta"}
          </dd>
        </div>
        <div>
          <dt>{zh ? "运行边界" : "Runtime boundary"}</dt>
          <dd>{zh ? "隔离宿主" : "Isolated host"}</dd>
        </div>
        <div>
          <dt>{zh ? "最近更新" : "Last updated"}</dt>
          <dd>{extension.updated[locale]}</dd>
        </div>
      </dl>
      <footer>
        {installed ? (
          <>
            <button data-primary onClick={onOpen} type="button">
              <ProductPlaygroundIcon name="arrow" />
              {zh ? "打开扩展" : "Open extension"}
            </button>
            <button
              data-danger
              onClick={(event) => onRequestUninstall(event.currentTarget)}
              type="button"
            >
              {zh ? "卸载" : "Uninstall"}
            </button>
          </>
        ) : (
          <button
            aria-busy={installing}
            data-primary
            disabled={installing}
            onClick={onInstall}
            type="button"
          >
            <ProductPlaygroundIcon name={installing ? "refresh" : "plus"} />
            {installing
              ? zh
                ? "正在安装"
                : "Installing"
              : zh
                ? "确认并安装"
                : "Confirm and install"}
          </button>
        )}
      </footer>
    </>
  );
}
