import { expect, test, type Page } from "@playwright/test";

async function openDocumentationPage(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");
}

async function openResponsiveNavigation(page: Page) {
  const trigger = page.locator(".rp-nav-hamburger");

  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  const navigation = page.getByRole("dialog");
  await expect(navigation).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  return navigation;
}

test("desktop menus remain operable before any client JavaScript runs", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route(/\.js(?:\?|$)/, (route) => route.abort());
  await page.goto("components/button.html", { waitUntil: "domcontentloaded" });

  const menus = page.locator(".a3s-progressive-menu > details");
  expect(await menus.count()).toBeGreaterThanOrEqual(2);
  for (const menu of await menus.all()) {
    await menu.locator(":scope > summary").click();
    await expect(menu).toHaveAttribute("open", "");
    await expect(menu.locator(".a3s-progressive-menu__popover")).toBeVisible();
    await menu.locator(":scope > summary").click();
    await expect(menu).not.toHaveAttribute("open", "");
  }

  const language = menus.filter({ hasText: "简体中文" });
  await language.locator(":scope > summary").click();
  const english = language.getByRole("link", { name: "English" });
  await expect(english).toHaveAttribute("href", /\/UI\/en\/components\/button/);
  await english.click();
  await expect(page).toHaveURL(/\/UI\/en\/components\/button\.html$/);
  await expect(page.getByRole("heading", { name: "Button", level: 1 })).toBeVisible();
});

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

  const header = page.locator(".rp-nav");
  const utilities = header.locator(".rp-nav__others");
  await expect(utilities).toBeVisible();
  await expect(utilities).toContainText("简体中文");
  await expect(utilities).toContainText("next");
  await expect(
    utilities.getByRole("button", { name: "切换到深色主题" }),
  ).toBeVisible();
  await expect(
    utilities.getByRole("link", { name: "在 GitHub 查看 A3S UI" }),
  ).toBeVisible();
  await expect(header.locator(".rp-nav-hamburger")).not.toBeVisible();

  const titleBox = await page.locator(".rp-nav__title").boundingBox();
  const menuBox = await page.locator(".rp-nav-menu--left").boundingBox();
  const logoBox = await page.locator(".rp-nav__title__logo").boundingBox();
  const logoImageBox = await page.locator("img.rspress-logo").boundingBox();
  expect(titleBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  expect(logoImageBox).not.toBeNull();
  expect(menuBox!.x - (titleBox!.x + titleBox!.width)).toBeGreaterThanOrEqual(
    28,
  );
  expect(Math.abs(logoBox!.width - logoBox!.height)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(logoImageBox!.width - logoImageBox!.height)).toBeLessThanOrEqual(
    0.5,
  );
  await expect(header).toHaveCSS("height", "72px");
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
  expect(headerBox!.height).toBe(72);
  await expect(header).toHaveCSS("display", "flex");
  await expect(page.locator(".rp-nav__others")).not.toBeVisible();
  await expect(page.locator(".rp-nav-hamburger")).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.locator(".rp-nav__others")).not.toBeVisible();
  const navigation = await openResponsiveNavigation(page);
  await expect(navigation.getByRole("link", { name: "指南" })).toBeVisible();
  await expect(
    navigation.getByRole("button", { name: "语言 简体中文" }),
  ).toBeVisible();
  await expect(
    navigation.getByRole("button", { name: "版本 next" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(navigation).not.toBeVisible();
  await expect(page.locator(".rp-nav-hamburger")).toBeFocused();
});

test("responsive switchers preserve the page and produce one route prefix", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  await openDocumentationPage(page, "components/device-simulator.html");

  let navigation = await openResponsiveNavigation(page);
  await navigation
    .getByRole("button", { name: "语言 简体中文" })
    .click();
  await navigation.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/UI\/en\/components\/device-simulator\.html$/);
  await expect(
    page.getByRole("heading", { name: "Device Simulator" }),
  ).toBeVisible();

  await openDocumentationPage(page, "en/components/button.html");
  navigation = await openResponsiveNavigation(page);
  await navigation.getByRole("button", { name: "Versions next" }).click();
  await navigation.getByRole("link", { name: "v0.1.0" }).click();
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
  await expect(catalog).toContainText("114 个组件");
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
  await expect(catalog.getByRole("status")).toHaveText("显示 28 个组件");

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
