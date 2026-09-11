import type { Locator, Page } from "@playwright/test";

/**
 * Approximate Chrome page zoom for layout/reflow checks.
 *
 * Prefer CSS `zoom` over `deviceScaleFactor` (screenshot-only) or CDP
 * `Emulation.setPageScaleFactor` (visual/pinch scale without the same layout
 * CSS-pixel reflow as browser Ctrl+/- zoom).
 *
 * Note: Playwright element screenshots under documentElement `zoom` are
 * coordinate-desynced in Chromium (rects vs painted pixels). Prefer
 * {@link applyLocalCssZoom} on the demo region when capturing proof PNGs.
 */
export async function applyCssPageZoom(
  page: Page,
  factor: number,
): Promise<void> {
  await page.evaluate((zoomFactor) => {
    document.documentElement.style.zoom = `${zoomFactor * 100}%`;
  }, factor);
}

/**
 * Apply CSS `zoom` to a single demo/control host.
 *
 * Local zoom reflows the component like browser zoom while keeping Playwright
 * screenshots aligned with painted pixels (unlike documentElement zoom).
 */
export async function applyLocalCssZoom(
  target: Locator,
  factor: number,
): Promise<void> {
  await target.evaluate((node, zoomFactor) => {
    (node as HTMLElement).style.zoom = `${zoomFactor * 100}%`;
  }, factor);
}

/**
 * Bring a control into the layout viewport under document CSS `zoom`.
 *
 * Playwright `scrollIntoViewIfNeeded` and direct `scrollTop` often stop short
 * once `documentElement.style.zoom` is set. Mouse wheel deltas still move
 * `window.scrollY` 1:1 with `getBoundingClientRect` in that mode.
 */
export async function bringControlIntoViewUnderCssZoom(
  page: Page,
  control: Locator,
): Promise<void> {
  await control.scrollIntoViewIfNeeded();

  const viewport = page.viewportSize();
  if (viewport) {
    await page.mouse.move(
      Math.floor(viewport.width / 2),
      Math.floor(viewport.height / 2),
    );
  }

  for (let i = 0; i < 48; i += 1) {
    const position = await control.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return {
        intersects:
          bounds.bottom > 0 &&
          bounds.top < window.innerHeight &&
          bounds.right > 0 &&
          bounds.left < window.innerWidth,
        top: bounds.top,
        viewportHeight: window.innerHeight,
      };
    });
    // Require a usable band, not a 1px intersection at the fold.
    if (
      position.intersects &&
      position.top > 40 &&
      position.top < position.viewportHeight * 0.7
    ) {
      return;
    }

    const targetTop = 120;
    const rawDelta = Math.round(position.top - targetTop);
    if (rawDelta === 0) {
      return;
    }
    const delta =
      rawDelta > 0
        ? Math.max(120, Math.min(1200, rawDelta))
        : Math.min(-120, Math.max(-1200, rawDelta));
    await page.mouse.wheel(0, delta);
  }
}
