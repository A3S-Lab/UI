import { expect, test, type Locator, type Page } from "@playwright/test";

type Box = { height: number; width: number; x: number; y: number };

async function openDocumentationPage(page: Page, route: string) {
  await page.goto(`en/components/${route}.html`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-a3s-defer-init",
  );
}

async function requiredBox(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(0);
  expect(box!.height).toBeGreaterThan(0);
  return box!;
}

function expectStableSize(before: Box, after: Box) {
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
}

async function expectNoDocumentOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

test("accordion, tabs, and ribbon preserve geometry while switching content", async ({
  page,
}) => {
  await openDocumentationPage(page, "accordion");
  const accordion = page
    .locator('.a3s-preview[data-preview-component="accordion"] .accordion')
    .first();
  await expect(accordion).toHaveAttribute(
    "data-accordion-initialized",
    "true",
  );
  const firstItem = accordion.locator(":scope > details").nth(0);
  const secondItem = accordion.locator(":scope > details").nth(1);
  const secondSummary = secondItem.locator("summary");
  const accordionBefore = await requiredBox(accordion);
  const summaryBefore = await requiredBox(secondSummary);

  await expect(firstItem).toHaveAttribute("open", "");
  await expect(secondItem).not.toHaveAttribute("open", "");
  await secondSummary.click();
  await expect(firstItem).not.toHaveAttribute("open", "");
  await expect(secondItem).toHaveAttribute("open", "");
  await expect(secondItem.locator(":scope > section")).toBeVisible();
  const accordionAfter = await requiredBox(accordion);
  const summaryAfter = await requiredBox(secondSummary);
  expect(accordionAfter.width).toBeCloseTo(accordionBefore.width, 0);
  expectStableSize(summaryBefore, summaryAfter);
  await expectNoDocumentOverflow(page);

  await openDocumentationPage(page, "tabs");
  const tabs = page
    .locator('.a3s-preview[data-preview-component="tabs"] .tabs')
    .first();
  await expect(tabs).toHaveAttribute("data-tabs-initialized", "true");
  const tablist = tabs.getByRole("tablist");
  const accountTab = tabs.getByRole("tab", { name: "Account" });
  const passwordTab = tabs.getByRole("tab", { name: "Password" });
  const tabsBefore = await requiredBox(tabs);
  const tablistBefore = await requiredBox(tablist);

  await expect(accountTab).toHaveAttribute("aria-selected", "true");
  await expect(passwordTab).toHaveAttribute("aria-selected", "false");
  await passwordTab.click();
  await expect(accountTab).toHaveAttribute("aria-selected", "false");
  await expect(passwordTab).toHaveAttribute("aria-selected", "true");
  await expect(tabs.locator("#demo-tabs-with-panels-panel-1")).toBeHidden();
  await expect(tabs.locator("#demo-tabs-with-panels-panel-2")).toBeVisible();
  const tabsAfter = await requiredBox(tabs);
  const tablistAfter = await requiredBox(tablist);
  expect(tabsAfter.width).toBeCloseTo(tabsBefore.width, 0);
  expectStableSize(tablistBefore, tablistAfter);
  await expectNoDocumentOverflow(page);

  await openDocumentationPage(page, "ribbon");
  const ribbon = page
    .locator('.a3s-preview[data-preview-component="ribbon"] .ribbon')
    .first();
  await expect(ribbon).toHaveAttribute("data-tabs-initialized", "true");
  const ribbonTablist = ribbon.getByRole("tablist");
  const ribbonBefore = await requiredBox(ribbon);
  const ribbonTablistBefore = await requiredBox(ribbonTablist);
  await ribbon.getByRole("tab", { name: "Insert" }).click();
  await expect(ribbon.locator("#ribbon-home")).toBeHidden();
  await expect(ribbon.locator("#ribbon-insert")).toBeVisible();
  await expect(ribbon.locator("#ribbon-insert-tab")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const ribbonAfter = await requiredBox(ribbon);
  const ribbonTablistAfter = await requiredBox(ribbonTablist);
  expect(ribbonAfter.width).toBeCloseTo(ribbonBefore.width, 0);
  expectStableSize(ribbonTablistBefore, ribbonTablistAfter);
  await expectNoDocumentOverflow(page);
});

test("switch, slider, toolbar, and tooltip effects change without layout shift", async ({
  page,
}) => {
  await openDocumentationPage(page, "switch");
  const switchControl = page.locator("#airplane-mode");
  const switchBefore = await requiredBox(switchControl);
  const thumbBefore = await switchControl.evaluate(
    (element) => getComputedStyle(element, "::before").transform,
  );
  await switchControl.check();
  await expect(switchControl).toBeChecked();
  const switchAfter = await requiredBox(switchControl);
  const thumbAfter = await switchControl.evaluate(
    (element) => getComputedStyle(element, "::before").transform,
  );
  expectStableSize(switchBefore, switchAfter);
  expect(thumbAfter).not.toBe(thumbBefore);
  await expectNoDocumentOverflow(page);

  await openDocumentationPage(page, "slider");
  const slider = page
    .locator('.a3s-preview[data-preview-component="slider"] input[type="range"]')
    .first();
  await expect(slider).toHaveAttribute("data-range-initialized", "true");
  const sliderBefore = await requiredBox(slider);
  const fillBefore = await slider.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--slider-value").trim(),
  );
  const valueBefore = await slider.inputValue();
  await slider.focus();
  await slider.press("ArrowRight");
  const sliderAfter = await requiredBox(slider);
  const fillAfter = await slider.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--slider-value").trim(),
  );
  expectStableSize(sliderBefore, sliderAfter);
  expect(await slider.inputValue()).not.toBe(valueBefore);
  expect(fillAfter).not.toBe(fillBefore);
  await expectNoDocumentOverflow(page);

  await openDocumentationPage(page, "toolbar");
  const bold = page
    .locator('.a3s-preview[data-preview-component="toolbar"]')
    .getByRole("button", { name: "Bold" })
    .first();
  const boldBefore = await requiredBox(bold);
  const backgroundBefore = await bold.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await bold.click();
  await expect(bold).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      bold.evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .not.toBe(backgroundBefore);
  const boldAfter = await requiredBox(bold);
  const backgroundAfter = await bold.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expectStableSize(boldBefore, boldAfter);
  expect(backgroundAfter).not.toBe(backgroundBefore);
  await expectNoDocumentOverflow(page);

  await openDocumentationPage(page, "tooltip");
  const tooltip = page
    .locator('.a3s-preview[data-preview-component="tooltip"] [data-tooltip]')
    .first();
  const tooltipTriggerBefore = await requiredBox(tooltip);
  const tooltipBefore = await tooltip.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return { opacity: style.opacity, visibility: style.visibility };
  });
  await tooltip.hover();
  await expect
    .poll(() =>
      tooltip.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element, "::before").opacity),
      ),
    )
    .toBeGreaterThan(0.9);
  const tooltipTriggerAfter = await requiredBox(tooltip);
  const tooltipAfter = await tooltip.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return {
      content: style.content,
      opacity: style.opacity,
      visibility: style.visibility,
    };
  });
  expectStableSize(tooltipTriggerBefore, tooltipTriggerAfter);
  expect(tooltipAfter.opacity).not.toBe(tooltipBefore.opacity);
  expect(tooltipAfter.visibility).not.toBe("hidden");
  expect(tooltipAfter.content).not.toBe("none");
  await expectNoDocumentOverflow(page);
});

test("app shell and split pane update layout without changing their outer bounds", async ({
  page,
}) => {
  await openDocumentationPage(page, "app-shell");
  const shellPreview = page.locator(
    '.a3s-preview[data-preview-component="app-shell"]',
  );
  const shell = shellPreview.locator(".app-shell").first();
  const shellMain = shell.locator(":scope > [data-app-main]");
  const shellNavigation = shell.locator(":scope > [data-app-navigation]");
  const shellToggle = shell.locator("[data-app-navigation-trigger]");
  const shellBefore = await requiredBox(shell);
  const mainBefore = await requiredBox(shellMain);
  const navigationBefore = await requiredBox(shellNavigation);
  const compact = (page.viewportSize()?.width ?? 0) <= 768;

  await expect(shell).toHaveAttribute("data-navigation", "expanded");
  await shellToggle.click();
  if (compact) {
    await expect(shell).toHaveAttribute("data-mobile-navigation", "open");
    await expect(shell).toHaveAttribute("data-navigation", "expanded");
    await expect(shellToggle).toHaveAttribute("aria-expanded", "true");
    await expect(shellToggle).toHaveAccessibleName("Close navigation");
  } else {
    await expect(shell).toHaveAttribute("data-navigation", "collapsed");
    await expect(shellToggle).toHaveAttribute("aria-expanded", "false");
    await expect(shellToggle).toHaveAccessibleName("Expand navigation");
  }
  const shellAfter = await requiredBox(shell);
  const mainAfter = await requiredBox(shellMain);
  const navigationAfter = await requiredBox(shellNavigation);
  expectStableSize(shellBefore, shellAfter);
  if (compact) {
    expectStableSize(mainBefore, mainAfter);
    expectStableSize(navigationBefore, navigationAfter);
    await page.keyboard.press("Escape");
    await expect(shell).not.toHaveAttribute("data-mobile-navigation", "open");
  } else {
    expect(mainAfter.width).toBeGreaterThan(mainBefore.width);
    expect(navigationAfter.width).toBeLessThan(navigationBefore.width);
  }
  await expectNoDocumentOverflow(page);

  await openDocumentationPage(page, "split-pane");
  const splitPane = page
    .locator('.a3s-preview[data-preview-component="split-pane"] .split-pane')
    .first();
  await expect(splitPane).toHaveAttribute(
    "data-split-pane-initialized",
    "true",
  );
  const separator = splitPane.getByRole("separator");
  const panes = splitPane.locator(":scope > section");
  const splitBefore = await requiredBox(splitPane);
  const separatorBefore = await requiredBox(separator);
  const firstPaneBefore = await requiredBox(panes.nth(0));
  const secondPaneBefore = await requiredBox(panes.nth(1));
  const valueBefore = Number(await separator.getAttribute("aria-valuenow"));

  await separator.focus();
  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute(
    "aria-valuenow",
    String(valueBefore + 5),
  );
  const splitAfter = await requiredBox(splitPane);
  const separatorAfter = await requiredBox(separator);
  const firstPaneAfter = await requiredBox(panes.nth(0));
  const secondPaneAfter = await requiredBox(panes.nth(1));
  expectStableSize(splitBefore, splitAfter);
  expectStableSize(separatorBefore, separatorAfter);
  expect(firstPaneAfter.width).toBeGreaterThan(firstPaneBefore.width);
  expect(secondPaneAfter.width).toBeLessThan(secondPaneBefore.width);
  expect(
    secondPaneAfter.x - (firstPaneAfter.x + firstPaneAfter.width),
  ).toBeLessThanOrEqual(separatorAfter.width + 1);
  await expectNoDocumentOverflow(page);
});
