import { expect, test, type Page } from "@playwright/test";

async function openDocumentationPage(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");
}

async function openResponsiveNavigation(page: Page) {
  const navigation = page.locator(".docs-mobile-navigation");
  const trigger = page.locator(".docs-mobile-navigation__trigger");

  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(navigation).toHaveAttribute("open", "");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  return navigation;
}

test("index routes hydrate with complete desktop navigation", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 1440, height: 900 });
  const hydrationWarnings: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "warning" &&
      /hydrateRoot recoverable error|React error #418/.test(message.text())
    ) {
      hydrationWarnings.push(message.text());
    }
  });

  await openDocumentationPage(page, "components/index.html");

  const switchers = page.locator(".rp-nav__others > .docs-switchers");
  await expect(switchers).toBeVisible();
  await expect(
    switchers.locator('[data-switcher="language"] > summary'),
  ).toContainText("简体中文");
  await expect(
    switchers.locator('[data-switcher="version"] > summary'),
  ).toContainText("开发版");

  const titleBox = await page.locator(".rp-nav__title").boundingBox();
  const menuBox = await page.locator(".rp-nav-menu--left").boundingBox();
  expect(titleBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.x - (titleBox!.x + titleBox!.width)).toBeGreaterThanOrEqual(
    24,
  );
  expect(hydrationWarnings).toEqual([]);
});

test("documentation header uses one navigation model at each breakpoint", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await openDocumentationPage(page, "components/device-simulator.html");

  const header = page.locator(".rp-nav");
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.height).toBeLessThanOrEqual(65);
  await expect(header).toHaveCSS("display", "flex");
  await expect(page.locator(".rp-nav__others")).toBeVisible();
  await expect(
    page.locator(".docs-mobile-navigation__trigger"),
  ).not.toBeVisible();

  await page.setViewportSize({ width: 1024, height: 800 });
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
  await page.setViewportSize({ width: 1024, height: 800 });
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

test("component catalog searches both languages and filters by product group", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocumentationPage(page, "components/index.html");

  let catalog = page.locator("[data-component-catalog]");
  let search = catalog.getByRole("searchbox", { name: "搜索组件" });
  await expect(catalog).toContainText("111 个组件");
  await search.fill("device simulator");
  await expect(catalog.getByRole("status")).toHaveText("找到 1 个匹配组件");
  await expect(
    catalog.getByRole("link", { name: /设备模拟器/ }),
  ).toHaveAttribute("href", "/UI/components/device-simulator.html");

  await catalog.getByRole("button", { name: "清除" }).click();
  const harnessFilter = catalog
    .locator(".component-catalog__filters button")
    .filter({ hasText: "Harness" });
  await harnessFilter.click();
  await expect(harnessFilter).toHaveAttribute("aria-pressed", "true");
  await expect(catalog.getByRole("status")).toHaveText("显示 25 个组件");

  await openDocumentationPage(page, "en/components/index.html");
  catalog = page.locator("[data-component-catalog]");
  search = catalog.getByRole("searchbox", { name: "Search components" });
  await search.fill("设备模拟器");
  await expect(catalog.getByRole("status")).toHaveText("1 matching components");
  await expect(
    catalog.getByRole("link", { name: /Device Simulator/ }),
  ).toHaveAttribute("href", "/UI/en/components/device-simulator.html");

  await search.fill("");
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
});
