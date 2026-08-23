import { DeviceSimulatorSurface } from "./DevicePreviewPanel";
import { ProductCodeGraphPanel } from "./ProductCodeGraphPanel";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductSessionPreviewPanel({
  expanded,
  id,
  locale,
  onExpandedChange,
}: {
  expanded: boolean;
  id: string;
  locale: ProductPlaygroundLocale;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const zh = locale === "zh";

  return (
    <section
      className="product-inspector-preview"
      data-production-preview={expanded ? "true" : undefined}
      id={id}
      role="tabpanel"
    >
      {expanded ? (
        <>
          <header className="product-inspector-section-heading">
            <div>
              <strong>{zh ? "设备模拟器" : "Device simulator"}</strong>
              <small>
                {zh
                  ? "真实设备外壳、视口与 a3s-webview 命令"
                  : "Production shell, viewport, and a3s-webview command"}
              </small>
            </div>
            <button
              aria-pressed="true"
              onClick={() => onExpandedChange(false)}
              type="button"
            >
              <ProductPlaygroundIcon name="contract" />
              {zh ? "收起" : "Collapse"}
            </button>
          </header>
          <DeviceSimulatorSurface
            className="product-session-device-simulator"
            key="full"
            locale={locale}
          />
        </>
      ) : (
        <DeviceSimulatorSurface
          className="product-session-device-simulator"
          key="compact"
          locale={locale}
          onExpand={() => onExpandedChange(true)}
          variant="compact"
        />
      )}
    </section>
  );
}

export function ProductSessionGraphPanel({
  expanded,
  id,
  locale,
  onExpandedChange,
}: {
  expanded: boolean;
  id: string;
  locale: ProductPlaygroundLocale;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const zh = locale === "zh";
  return (
    <section className="product-inspector-graph" id={id} role="tabpanel">
      <header className="product-inspector-section-heading">
        <div>
          <strong>{zh ? "代码依赖图谱" : "Code dependency graph"}</strong>
          <small>
            {zh
              ? "搜索、旋转、缩放并检查本次变更邻域"
              : "Search, rotate, zoom, and inspect the change neighborhood"}
          </small>
        </div>
        <button
          aria-controls={`${id}-interactive`}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? zh
                ? "收起代码依赖图谱"
                : "Collapse code dependency graph"
              : zh
                ? "展开代码依赖图谱"
                : "Expand code dependency graph"
          }
          onClick={() => onExpandedChange(!expanded)}
          type="button"
        >
          <ProductPlaygroundIcon name={expanded ? "contract" : "expand"} />
          {expanded ? (zh ? "收起" : "Collapse") : zh ? "展开" : "Expand"}
        </button>
      </header>
      <ProductCodeGraphPanel id={`${id}-interactive`} locale={locale} />
    </section>
  );
}
