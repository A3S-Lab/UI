import { expect, test, type Page } from "@playwright/test";

async function openComponent(page: Page, component: string) {
  await page.goto(`en/components/${component}.html`);
  await page.evaluate(() => document.fonts.ready);
}

test("Breadcrumb keeps long Office paths on one scrollable command row", async ({
  page,
}) => {
  if (page.viewportSize()!.width <= 768) {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await openComponent(page, "breadcrumb");

  const preview = page
    .locator(".a3s-preview[data-preview-component=breadcrumb]")
    .first();
  const breadcrumb = preview.locator(".breadcrumb");
  const row = breadcrumb.locator(":scope > ol");
  await breadcrumb.evaluate((element) => {
    element.style.width = "11.25rem";
    const labels = element.querySelectorAll('a, [aria-current="page"]');
    labels[0]!.textContent = "Operations workspace";
    labels[1]!.textContent = "Regional gateways";
    labels[2]!.textContent = "Deployment configuration";
  });

  const dimensions = await row.evaluate((element) => ({
    clientWidth: element.clientWidth,
    height: element.getBoundingClientRect().height,
    overflowX: getComputedStyle(element).overflowX,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.height).toBeLessThanOrEqual(25);
  expect(dimensions.overflowX).toBe("auto");
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);

  await openComponent(page, "breadcrumb");
  await expect(
    page.locator(".a3s-preview[data-preview-component=breadcrumb]").first(),
  ).toHaveScreenshot("breadcrumb-office.png");
});

test("Tabs preserve compact geometry, bounded overflow, and RTL arrow order", async ({
  page,
}) => {
  if (page.viewportSize()!.width <= 768) {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await openComponent(page, "tabs");

  const preview = page
    .locator(".a3s-preview[data-preview-component=tabs]")
    .first();
  const primaryTabs = preview.locator("#demo-tabs-with-panels");
  const primaryList = primaryTabs.locator('[role="tablist"]');
  const firstTab = primaryList.locator('[role="tab"]').first();
  const [listBox, tabBox] = await Promise.all([
    primaryList.boundingBox(),
    firstTab.boundingBox(),
  ]);
  expect(listBox).not.toBeNull();
  expect(tabBox).not.toBeNull();
  expect(listBox!.height).toBeGreaterThanOrEqual(35);
  expect(listBox!.height).toBeLessThanOrEqual(37);
  expect(tabBox!.height).toBeGreaterThanOrEqual(29);
  expect(tabBox!.height).toBeLessThanOrEqual(31);

  const passwordTab = primaryList.getByRole("tab", { name: "Password" });
  await expect
    .poll(() =>
      primaryTabs.evaluate(
        (element) =>
          typeof (element as HTMLElement & { refresh?: unknown }).refresh ===
            "function" &&
          typeof (element as HTMLElement & { select?: unknown }).select ===
            "function",
      ),
    )
    .toBe(true);
  await primaryTabs.evaluate((element) => {
    const controller = element as HTMLElement & {
      refresh(): void;
      select(tab: Element, focus?: boolean): void;
    };
    controller.refresh();
    controller.select(
      document.getElementById("demo-tabs-with-panels-tab-2")!,
      true,
    );
  });
  await expect(passwordTab).toHaveAttribute("aria-selected", "true");
  await expect(passwordTab).toBeFocused();
  await expect(
    primaryTabs.locator("#demo-tabs-with-panels-panel-2"),
  ).toBeVisible();
  await expect(
    primaryTabs.locator("#demo-tabs-with-panels-panel-1"),
  ).toBeHidden();

  const rtlTabs = page.locator("#tabs-rtl");
  await rtlTabs.evaluate((element) => {
    element.style.width = "11.25rem";
  });
  const rtlList = rtlTabs.locator('[role="tablist"]');
  const rtlDimensions = await rtlList.evaluate((element) => ({
    clientWidth: element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
    scrollWidth: element.scrollWidth,
  }));
  expect(rtlDimensions.overflowX).toBe("auto");
  expect(rtlDimensions.scrollWidth).toBeGreaterThan(rtlDimensions.clientWidth);

  const rtlTabButtons = rtlList.locator('[role="tab"]');
  await rtlTabButtons.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(rtlTabButtons.last()).toBeFocused();
  await expect(rtlTabButtons.last()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(rtlTabButtons.first()).toBeFocused();

  await expect(preview).toHaveScreenshot("tabs-office.png");
});

test("Pagination is a bounded component and updates its current page", async ({
  page,
}) => {
  if (page.viewportSize()!.width <= 768) {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await openComponent(page, "pagination");

  const preview = page
    .locator(".a3s-preview[data-preview-component=pagination]")
    .first();
  const pagination = preview.locator("nav.pagination");
  const list = pagination.locator(":scope > ul");
  await expect(pagination).toHaveCount(1);
  const dimensions = await list.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  const pageTwo = pagination.locator('[data-pagination-page="2"]');
  const pageThree = pagination.locator('[data-pagination-page="3"]');
  const pageButtonBox = await pageTwo.boundingBox();
  expect(pageButtonBox).not.toBeNull();
  expect(pageButtonBox!.width).toBeGreaterThanOrEqual(31);
  expect(pageButtonBox!.width).toBeLessThanOrEqual(33);
  expect(pageButtonBox!.height).toBeGreaterThanOrEqual(31);
  expect(pageButtonBox!.height).toBeLessThanOrEqual(33);

  await pageThree.click();
  await expect(pageThree).toHaveAttribute("aria-current", "page");
  await expect(pageTwo).not.toHaveAttribute("aria-current", "page");

  const previousLabel = pagination.locator("[data-pagination-label]").first();
  if (page.viewportSize()!.width <= 640) {
    await expect(previousLabel).toHaveCSS("position", "absolute");
  } else {
    await expect(previousLabel).not.toHaveCSS("position", "absolute");
  }
  await expect(preview).toHaveScreenshot("pagination-office.png");
});

test("Sidebar synchronizes responsive state and restores compact focus", async ({
  page,
}) => {
  const compact = page.viewportSize()!.width <= 768;
  if (compact) await page.setViewportSize({ width: 390, height: 844 });
  await openComponent(page, "sidebar");

  const preview = page
    .locator(".a3s-preview[data-preview-component=sidebar]")
    .first();
  const demo = preview.locator(".a3s-sidebar-demo");
  const sidebar = demo.locator("#demo-sidebar");
  const navigation = sidebar.locator("nav");
  const toggle = demo.getByRole("button", { name: "Toggle sidebar" });

  if (!compact) {
    await expect(sidebar).toHaveAttribute("aria-hidden", "false");
    const navigationBox = await navigation.boundingBox();
    expect(navigationBox).not.toBeNull();
    expect(navigationBox!.width).toBeGreaterThanOrEqual(183);
    expect(navigationBox!.width).toBeLessThanOrEqual(185);
    await toggle.click();
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await toggle.click();
    await expect(sidebar).toHaveAttribute("aria-hidden", "false");
    await expect(preview).toHaveScreenshot("sidebar-office.png");
    return;
  }

  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await toggle.click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");
  await expect(navigation.getByRole("link").first()).toBeFocused();
  const [demoBox, navigationBox] = await Promise.all([
    demo.boundingBox(),
    navigation.boundingBox(),
  ]);
  expect(demoBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(navigationBox!.width).toBeGreaterThanOrEqual(239);
  expect(navigationBox!.width).toBeLessThanOrEqual(241);
  await expect
    .poll(async () => {
      const [currentDemoBox, currentNavigationBox] = await Promise.all([
        demo.boundingBox(),
        navigation.boundingBox(),
      ]);
      return currentNavigationBox!.x - currentDemoBox!.x;
    })
    .toBeCloseTo(1, 0);
  await expect(preview).toHaveScreenshot("sidebar-office.png");

  await page.keyboard.press("Escape");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(navigation).toHaveCSS("pointer-events", "none");
  await expect(toggle).toBeFocused();

  await toggle.click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");
  await page.mouse.click(
    demoBox!.x + demoBox!.width - 8,
    demoBox!.y + demoBox!.height / 2,
  );
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(toggle).toBeFocused();
});
