import { expect, test, type Locator, type Page } from "@playwright/test";

async function openComponent(page: Page, component: string) {
  await page.goto(`en/components/${component}.html`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
}

async function surfaceMetrics(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const shadowLayers =
      style.boxShadow.match(
        /rgba?\([^)]*\)(?:\s+-?\d+(?:\.\d+)?px){2,4}(?:\s+inset)?/gu,
      ) ?? [];
    const visibleBoxShadows = shadowLayers.filter((shadow) => {
      const color = shadow.match(/rgba?\(([^)]*)\)/u)?.[1];
      if (!color || !shadow.startsWith("rgba(")) {
        return true;
      }

      const channels = color.split(/[\s,/]+/u).filter(Boolean);
      return Number.parseFloat(channels.at(-1) ?? "1") > 0;
    });
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      hasVisibleShadow: visibleBoxShadows.length > 0,
      height: style.height,
      visibleBoxShadows,
    };
  });
}

test("canonical controls use Playground geometry and neutral actions", async ({
  page,
}) => {
  await openComponent(page, "button");

  const preview = page
    .locator('.a3s-preview[data-preview-component="button"]')
    .first();
  const primary = preview.locator(".a3s-preview__canvas .btn").first();
  const outline = preview.locator(
    '.a3s-preview__canvas .btn[data-variant="outline"]',
  );

  await expect(primary).toBeVisible();
  expect(await surfaceMetrics(primary)).toMatchObject({
    backgroundColor: "rgb(23, 23, 23)",
    borderRadius: "10px",
    hasVisibleShadow: false,
    height: "36px",
  });
  expect((await surfaceMetrics(outline)).hasVisibleShadow).toBe(false);

  await primary.focus();
  const focusState = await primary.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineOffset: style.outlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(focusState).toEqual({
    outlineOffset: "2px",
    outlineStyle: "solid",
    outlineWidth: "2px",
  });
  expect((await surfaceMetrics(primary)).hasVisibleShadow).toBe(false);

  await openComponent(page, "input");
  const input = page
    .locator('.a3s-preview[data-preview-component="input"]')
    .first()
    .locator(".a3s-preview__canvas .input")
    .first();
  expect(await surfaceMetrics(input)).toMatchObject({
    backgroundColor: "rgb(255, 255, 255)",
    borderRadius: "10px",
    hasVisibleShadow: false,
    height: "36px",
  });
});

test("canonical panels stay flat while floating surfaces use shared depth", async ({
  page,
}) => {
  await openComponent(page, "card");
  const card = page
    .locator('.a3s-preview[data-preview-component="card"]')
    .first()
    .locator(".a3s-preview__canvas > .card")
    .first();
  expect(await surfaceMetrics(card)).toMatchObject({
    borderRadius: "14px",
    hasVisibleShadow: false,
  });

  await openComponent(page, "resource-card");
  const resourceCard = page
    .locator('.a3s-preview[data-preview-component="resource-card"]')
    .first()
    .locator(".resource-card")
    .first();
  expect(await surfaceMetrics(resourceCard)).toMatchObject({
    borderRadius: "14px",
    hasVisibleShadow: false,
  });

  await openComponent(page, "dropdown-menu");
  const dropdown = page.locator("#demo-dropdown-menu");
  await dropdown.locator("#demo-dropdown-menu-trigger").click();
  const popover = dropdown.locator("#demo-dropdown-menu-popover");
  await expect(popover).toBeVisible();
  const popoverMetrics = await surfaceMetrics(popover);
  expect(popoverMetrics.borderRadius).toBe("14px");
  expect(popoverMetrics.hasVisibleShadow).toBe(true);

  await openComponent(page, "emoji-picker");
  const emojiPicker = page
    .locator('.a3s-preview[data-preview-component="emoji-picker"]')
    .first()
    .locator(".emoji-picker");
  const emojiPickerMetrics = await surfaceMetrics(emojiPicker);
  expect(emojiPickerMetrics.hasVisibleShadow).toBe(true);
  expect(emojiPickerMetrics.visibleBoxShadows).toEqual(
    popoverMetrics.visibleBoxShadows,
  );
});

test("selected swatches use a bounded choice state without a halo", async ({
  page,
}) => {
  await openComponent(page, "color-swatches");
  const selectedLabel = page
    .locator('.a3s-preview[data-preview-component="color-swatches"]')
    .first()
    .locator("label:has(input:checked)");

  const state = await selectedLabel.evaluate((label) => {
    const labelStyle = getComputedStyle(label);
    const swatchStyle = getComputedStyle(
      label.querySelector<HTMLElement>("[data-swatch]")!,
    );
    return {
      borderColor: labelStyle.borderColor,
      boxShadow: labelStyle.boxShadow,
      swatchShadow: swatchStyle.boxShadow,
    };
  });

  expect(state.borderColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(state.boxShadow).toBe("none");
  expect(state.swatchShadow).toContain("inset");
  expect(state.swatchShadow.match(/\binset\b/gu)?.length).toBe(1);
});

test("dark appearance preserves the canonical Playground token contract", async ({
  page,
}) => {
  await openComponent(page, "button");
  const tokens = await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    const style = getComputedStyle(document.documentElement);
    return {
      action: style.getPropertyValue("--a3s-action").trim(),
      canvas: style.getPropertyValue("--a3s-canvas").trim(),
      ink: style.getPropertyValue("--a3s-ink").trim(),
      paper: style.getPropertyValue("--a3s-paper").trim(),
      radius: Number.parseFloat(style.getPropertyValue("--a3s-radius").trim()),
      radiusLarge: Number.parseFloat(
        style.getPropertyValue("--a3s-radius-lg").trim(),
      ),
    };
  });

  expect(tokens).toEqual({
    action: "#f2f2f3",
    canvas: "#111112",
    ink: "#f2f2f3",
    paper: "#171718",
    radius: 0.625,
    radiusLarge: 0.875,
  });
});
