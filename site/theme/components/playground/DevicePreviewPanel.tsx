import { useEffect, useRef } from "react";
import { withBase } from "@rspress/core/runtime";
import { useWorkspace } from "./WorkspaceContext";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export type DeviceSimulatorState = {
  device: string;
  height: number;
  kind?: string;
  orientation: "landscape" | "portrait";
  width: number;
};

export function DevicePreviewPanel() {
  const { locale } = useWorkspace();
  return <DeviceSimulatorSurface locale={locale} />;
}

export function DeviceSimulatorSurface({
  className = "",
  id,
  initialDevice = "iphone-15-pro",
  initialHeight = 852,
  initialKind = "phone",
  initialOrientation = "portrait",
  initialWidth = 393,
  locale,
  onDeviceChange,
  onExpand,
  role,
  variant = "full",
}: {
  className?: string;
  id?: string;
  initialDevice?: string;
  initialHeight?: number;
  initialKind?: string;
  initialOrientation?: "landscape" | "portrait";
  initialWidth?: number;
  locale: ProductPlaygroundLocale;
  onDeviceChange?: (state: DeviceSimulatorState) => void;
  onExpand?: () => void;
  role?: "tabpanel";
  variant?: "compact" | "full";
}) {
  const root = useRef<HTMLElement>(null);
  const zh = locale === "zh";
  const compact = variant === "compact";
  const previewUrl = withBase(`/device-preview.html?lang=${locale}`);

  useEffect(() => {
    const element = root.current;
    if (!element || !onDeviceChange) return undefined;
    const handleDeviceChange = (event: Event) => {
      const detail = (event as CustomEvent<DeviceSimulatorState>).detail;
      if (!detail) return;
      onDeviceChange(detail);
    };
    element.addEventListener("a3s:device-change", handleDeviceChange);
    return () =>
      element.removeEventListener("a3s:device-change", handleDeviceChange);
  }, [onDeviceChange]);

  useEffect(() => {
    window.a3sUI?.start();
    window.a3sUI?.initAll();
  }, []);

  return (
    <section
      ref={root}
      className={`device-simulator playground-device-preview ${className}`.trim()}
      aria-label={zh ? "设备预览" : "Device preview"}
      data-device={initialDevice}
      data-device-kind={initialKind}
      data-device-title={zh ? "A3S 设备预览" : "A3S device preview"}
      data-orientation={initialOrientation}
      data-state="ready"
      data-variant={compact ? "compact" : undefined}
      data-width={initialWidth}
      data-height={initialHeight}
      id={id}
      role={role}
    >
      <header>
        <div data-device-simulator-toolbar>
          <label data-device-simulator-control>
            <span>{zh ? "设备" : "Device"}</span>
            <select
              className="select"
              defaultValue={initialDevice}
              data-device-simulator-select
              aria-label={zh ? "设备预设" : "Device preset"}
            >
              <optgroup label={zh ? "手机" : "Phones"}>
                <option
                  value="iphone-15-pro"
                  data-kind="phone"
                  data-orientation="portrait"
                  data-width="393"
                  data-height="852"
                >
                  iPhone 15 Pro · 393 × 852
                </option>
                <option
                  value="pixel-8"
                  data-kind="phone"
                  data-orientation="portrait"
                  data-width="412"
                  data-height="915"
                >
                  Pixel 8 · 412 × 915
                </option>
                <option
                  value="compact-phone"
                  data-kind="phone"
                  data-orientation="portrait"
                  data-width="360"
                  data-height="800"
                >
                  {zh ? "紧凑手机" : "Compact phone"} · 360 × 800
                </option>
              </optgroup>
              <optgroup label={zh ? "平板" : "Tablets"}>
                <option
                  value="ipad-mini"
                  data-kind="tablet"
                  data-orientation="portrait"
                  data-width="768"
                  data-height="1024"
                >
                  iPad mini · 768 × 1024
                </option>
              </optgroup>
              <optgroup label={zh ? "电脑" : "Computers"}>
                <option
                  value="laptop"
                  data-kind="desktop"
                  data-orientation="landscape"
                  data-width="1440"
                  data-height="900"
                >
                  {zh ? "笔记本" : "Laptop"} · 1440 × 900
                </option>
                <option
                  value="desktop"
                  data-kind="desktop"
                  data-orientation="landscape"
                  data-width="1920"
                  data-height="1080"
                >
                  {zh ? "桌面显示器" : "Desktop"} · 1920 × 1080
                </option>
              </optgroup>
              <option value="custom">{zh ? "自定义" : "Custom"}</option>
            </select>
          </label>
          <div
            aria-label={zh ? "视口尺寸" : "Viewport size"}
            data-device-simulator-dimensions
            hidden={compact}
          >
            <label>
              <span>{zh ? "宽" : "W"}</span>
              <input
                className="input"
                type="number"
                min="240"
                max="4000"
                defaultValue={initialWidth}
                inputMode="numeric"
                data-device-simulator-width
              />
            </label>
            <span aria-hidden="true">×</span>
            <label>
              <span>{zh ? "高" : "H"}</span>
              <input
                className="input"
                type="number"
                min="180"
                max="3000"
                defaultValue={initialHeight}
                inputMode="numeric"
                data-device-simulator-height
              />
            </label>
          </div>
          <div
            role="group"
            aria-label={zh ? "屏幕方向" : "Screen orientation"}
            data-device-simulator-orientation
            hidden={compact}
          >
            <button
              type="button"
              className="btn"
              data-size="sm"
              data-variant="ghost"
              aria-pressed="true"
              data-device-simulator-orientation-value="portrait"
            >
              {zh ? "竖屏" : "Portrait"}
            </button>
            <button
              type="button"
              className="btn"
              data-size="sm"
              data-variant="ghost"
              aria-pressed="false"
              data-device-simulator-orientation-value="landscape"
            >
              {zh ? "横屏" : "Landscape"}
            </button>
          </div>
          {compact ? (
            <div data-device-simulator-actions>
              <button
                aria-label={zh ? "刷新预览" : "Refresh preview"}
                className="btn"
                data-device-simulator-refresh
                data-size="icon-sm"
                data-variant="ghost"
                type="button"
              >
                <ProductPlaygroundIcon name="refresh" />
              </button>
              {onExpand ? (
                <button
                  aria-label={
                    zh ? "打开完整设备模拟器" : "Open full device simulator"
                  }
                  aria-pressed="false"
                  className="btn"
                  data-device-simulator-expand
                  data-size="icon-sm"
                  data-variant="ghost"
                  onClick={onExpand}
                  type="button"
                >
                  <ProductPlaygroundIcon name="expand" />
                </button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              className="btn"
              data-size="sm"
              data-variant="outline"
              data-device-simulator-native
            >
              {zh ? "原生预览" : "Native preview"}
            </button>
          )}
        </div>
        {compact ? null : (
          <form data-device-simulator-navigation>
            <label>
              <span className="sr-only">{zh ? "预览地址" : "Preview URL"}</span>
              <input
                className="input"
                type="text"
                inputMode="url"
                defaultValue={previewUrl}
                spellCheck="false"
                data-device-simulator-url
              />
            </label>
            <div data-device-simulator-actions>
              <button type="submit" className="btn" data-size="sm">
                {zh ? "打开" : "Open"}
              </button>
              <button
                type="button"
                className="btn"
                data-size="sm"
                data-variant="ghost"
                data-device-simulator-refresh
              >
                {zh ? "刷新" : "Refresh"}
              </button>
            </div>
          </form>
        )}
      </header>
      <div data-device-simulator-workspace>
        <div data-device-simulator-canvas>
          <div data-device-simulator-frame>
            <iframe
              title={zh ? "设备预览内容" : "Device preview content"}
              src={previewUrl}
              loading="eager"
              sandbox="allow-scripts"
              data-device-simulator-preview
            />
            <span hidden data-device-simulator-screen-status>
              {zh ? "正在加载预览…" : "Loading preview…"}
            </span>
          </div>
        </div>
      </div>
      <footer>
        {compact ? (
          <span data-device-simulator-bridge>
            <i />
            a3s-webview
          </span>
        ) : null}
        <output aria-live="polite" data-device-simulator-status>
          {zh ? "预览尺寸 393 × 852。" : "Preview ready at 393 × 852."}
        </output>
        {compact ? null : (
          <>
            <code data-device-simulator-command>a3s-webview --url …</code>
            <button
              type="button"
              className="btn"
              data-size="sm"
              data-variant="ghost"
              data-device-simulator-copy-command
            >
              {zh ? "复制命令" : "Copy command"}
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
