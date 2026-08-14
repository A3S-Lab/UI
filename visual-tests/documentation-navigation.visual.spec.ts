import { expect, test, type Page } from "@playwright/test";

async function openDocumentationPage(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");
}

async function openResponsiveNavigation(page: Page) {
  const navigation = page.locator(".docs-mobile-navigation");
  const trigger = navigation.locator(":scope > summary");

  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(navigation).toHaveAttribute("open", "");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  return navigation;
}

test("documentation header has no responsive dead zone at 1280px", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await openDocumentationPage(page, "components/device-simulator.html");

  const header = page.locator(".rp-nav");
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.height).toBeLessThanOrEqual(65);
  await expect(header).toHaveCSS("display", "flex");
  await expect(page.locator(".rp-nav__others")).not.toBeVisible();

  const navigation = await openResponsiveNavigation(page);
  await expect(
    navigation.getByRole("navigation", { name: "主导航" }),
  ).toBeVisible();
  await expect(
    navigation.locator(".docs-switchers[data-compact]"),
  ).toBeVisible();
});

test("responsive switchers preserve the page and produce one route prefix", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await openDocumentationPage(page, "components/device-simulator.html");

  let navigation = await openResponsiveNavigation(page);
  const compactSwitchers = navigation.locator(".docs-switchers[data-compact]");
  await compactSwitchers
    .locator('[data-switcher="language"] > summary')
    .click();
  await compactSwitchers.locator('a[lang="en"]').click();
  await expect(page).toHaveURL(/\/UI\/en\/components\/device-simulator\.html$/);
  await expect(
    page.getByRole("heading", { name: "Device Simulator" }),
  ).toBeVisible();

  await openDocumentationPage(page, "en/components/button.html");
  navigation = await openResponsiveNavigation(page);
  const versionSwitcher = navigation.locator(
    '.docs-switchers[data-compact] [data-switcher="version"]',
  );
  await versionSwitcher.locator(":scope > summary").click();
  await versionSwitcher.getByRole("link", { name: "v0.1.0" }).click();
  await expect(page).toHaveURL(/\/UI\/v0\.1\.0\/en\/components\/button\.html$/);
  expect(new URL(page.url()).pathname).not.toMatch(
    /\/(?:en\/en|v0\.1\.0\/v0\.1\.0)\//,
  );
  await expect(
    page.getByRole("heading", { name: "Button", level: 1 }),
  ).toBeVisible();
});
