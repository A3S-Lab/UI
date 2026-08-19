import { useEffect, useRef } from "react";
import { withBase } from "@rspress/core/runtime";
import { useWorkspace } from "./WorkspaceContext";
import type { ProductPlaygroundLocale } from "./product-playground-data";

export function DevicePreviewPanel() {
  const { locale } = useWorkspace();
  return <DeviceSimulatorSurface locale={locale} />;
}

export function DeviceSimulatorSurface({
  className = "",
  id,
  locale,
  role,
}: {
  className?: string;
  id?: string;
  locale: ProductPlaygroundLocale;
  role?: "tabpanel";
}) {
  const root = useRef<HTMLElement>(null);
  const zh = locale === "zh";
  const previewUrl = withBase(`/device-preview.html?lang=${locale}`);

  useEffect(() => {
    window.a3sUI?.start();
    window.a3sUI?.initAll();
  }, []);

  return (
    <section
      ref={root}
      className={`device-simulator playground-device-preview ${className}`.trim()}
      aria-label={zh ? "设备预览" : "Device preview"}
      data-device="iphone-15-pro"
      data-device-kind="phone"
      data-device-title={zh ? "A3S 设备预览" : "A3S device preview"}
      data-orientation="portrait"
      data-state="ready"
      id={id}
      role={role}
    >
      <header>
        <div data-device-simulator-toolbar>
          <label data-device-simulator-control>
            <span>{zh ? "设备" : "Device"}</span>
            <select
              className="select"
              defaultValue="iphone-15-pro"
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
          <div data-device-simulator-dimensions aria-label={zh ? "视口尺寸" : "Viewport size"}>
            <label>
              <span>{zh ? "宽" : "W"}</span>
              <input
                className="input"
                type="number"
                min="240"
                max="4000"
                defaultValue="393"
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
                defaultValue="852"
                inputMode="numeric"
                data-device-simulator-height
              />
            </label>
          </div>
          <div
            role="group"
            aria-label={zh ? "屏幕方向" : "Screen orientation"}
            data-device-simulator-orientation
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
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="outline"
            data-device-simulator-native
          >
            {zh ? "原生预览" : "Native preview"}
          </button>
        </div>
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
        <output aria-live="polite" data-device-simulator-status>
          {zh ? "预览尺寸 393 × 852。" : "Preview ready at 393 × 852."}
        </output>
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
      </footer>
    </section>
  );
}
