import { useState } from "react";
import { DeviceSimulatorSurface } from "./DevicePreviewPanel";
import { ProductCodeGraphPanel } from "./ProductCodeGraphPanel";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

const previewDevicePresets = [
  { dimensions: "390 × 844", frame: "phone", id: "phone-compact", label: { en: "Compact phone", zh: "紧凑手机" } },
  { dimensions: "412 × 915", frame: "phone", id: "phone-large", label: { en: "Large phone", zh: "大屏手机" } },
  { dimensions: "820 × 1180", frame: "tablet", id: "tablet", label: { en: "Tablet", zh: "平板" } },
  { dimensions: "1366 × 768", frame: "desktop", id: "laptop", label: { en: "Laptop", zh: "笔记本" } },
  { dimensions: "1440 × 900", frame: "desktop", id: "desktop", label: { en: "Desktop", zh: "桌面" } },
] as const;

type PreviewDevicePresetId = (typeof previewDevicePresets)[number]["id"];

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
  const [device, setDevice] = useState<PreviewDevicePresetId>("phone-compact");
  const [previewRevision, setPreviewRevision] = useState(0);
  const activePreset = previewDevicePresets.find((preset) => preset.id === device) ?? previewDevicePresets[0];

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
              <small>{zh ? "真实设备外壳、视口与 a3s-webview 命令" : "Production shell, viewport, and a3s-webview command"}</small>
            </div>
            <button aria-pressed="true" onClick={() => onExpandedChange(false)} type="button">
              <ProductPlaygroundIcon name="close" />
              {zh ? "收起" : "Collapse"}
            </button>
          </header>
          <DeviceSimulatorSurface className="product-session-device-simulator" locale={locale} />
        </>
      ) : (
        <>
          <header className="product-inspector-preview__toolbar">
            <label>
              <ProductPlaygroundIcon name={activePreset.frame === "desktop" ? "workspace" : activePreset.frame === "tablet" ? "document" : "video"} />
              <span className="sr-only">{zh ? "预览设备尺寸" : "Preview device size"}</span>
              <select aria-label={zh ? "预览设备尺寸" : "Preview device size"} onChange={(event) => setDevice(event.currentTarget.value as PreviewDevicePresetId)} value={device}>
                {previewDevicePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.label[locale]} · {preset.dimensions}</option>
                ))}
              </select>
            </label>
            <span data-preview-toolbar-actions>
              <button aria-label={zh ? "刷新预览" : "Refresh preview"} onClick={() => setPreviewRevision((value) => value + 1)} type="button">
                <ProductPlaygroundIcon name="refresh" />
              </button>
              <button aria-label={zh ? "打开完整设备模拟器" : "Open full device simulator"} aria-pressed="false" onClick={() => onExpandedChange(true)} type="button">
                <ProductPlaygroundIcon name="eye" />
              </button>
            </span>
          </header>
          <DeviceShell device={activePreset.frame} key={`${device}-${previewRevision}`} locale={locale} preset={device} />
          <footer>
            <span><i />a3s-webview</span>
            <small>{activePreset.label[locale]} · {activePreset.dimensions}</small>
          </footer>
        </>
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
          <small>{zh ? "搜索、旋转、缩放并检查本次变更邻域" : "Search, rotate, zoom, and inspect the change neighborhood"}</small>
        </div>
        <button aria-pressed={expanded} onClick={() => onExpandedChange(!expanded)} type="button">
          <ProductPlaygroundIcon name={expanded ? "close" : "eye"} />
          {expanded ? (zh ? "收起" : "Collapse") : zh ? "展开" : "Expand"}
        </button>
      </header>
      <ProductCodeGraphPanel id={`${id}-interactive`} locale={locale} />
    </section>
  );
}

function DeviceShell({
  device,
  locale,
  preset,
}: {
  device: "desktop" | "phone" | "tablet";
  locale: ProductPlaygroundLocale;
  preset: PreviewDevicePresetId;
}) {
  const zh = locale === "zh";
  return (
    <div className="product-device-stage" data-device={device} data-preset={preset}>
      <div className="product-device-shell">
        <i data-device-button="top" />
        <i data-device-button="middle" />
        <div className="product-device-shell__screen">
          <div className="product-device-shell__sensor"><i /><span /></div>
          <header><span><i /><i /><i /></span><small>localhost:4178</small><ProductPlaygroundIcon name="refresh" /></header>
          <main>
            <div><span><ProductPlaygroundIcon name="assistant" /></span><strong>A3S</strong><small>{zh ? "本地预览" : "Local preview"}</small></div>
            <section>
              <small>{zh ? "会话恢复" : "Session recovery"}</small>
              <h3>{zh ? "恢复路径已修复" : "Recovery path fixed"}</h3>
              <p>{zh ? "返回路由与键盘焦点均已保留。" : "Return routing and keyboard focus are preserved."}</p>
              <ul>
                <li><ProductPlaygroundIcon name="check" />{zh ? "路由检查" : "Route check"}<span>{zh ? "通过" : "Passed"}</span></li>
                <li><ProductPlaygroundIcon name="check" />{zh ? "焦点恢复" : "Focus recovery"}<span>{zh ? "通过" : "Passed"}</span></li>
              </ul>
              <button type="button">{zh ? "查看验证证据" : "Review evidence"}</button>
            </section>
          </main>
          <footer><span /><span /><span /></footer>
        </div>
        <div className="product-device-shell__stand"><i /></div>
      </div>
    </div>
  );
}
