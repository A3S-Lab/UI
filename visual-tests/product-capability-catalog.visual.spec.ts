import { expect, test, type Page } from "@playwright/test";

const registryStorageKey = "a3s-playground-capabilities-v1";

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" ||
      message.text().includes("hydrateRoot recoverable error")
    ) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function openCapabilityCatalog(
  page: Page,
  route = "playground/capabilities.html?capability=assistants",
) {
  await page.addInitScript((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, registryStorageKey);
  await page.goto(route, { waitUntil: "networkidle" });
  const application = page.locator(".a3s-product-application");
  await expect(application).toHaveAttribute("data-view", "catalog");
  await expect(
    application.locator('[data-product-surface="catalog"]'),
  ).toBeVisible();
  return application;
}

test("Capability catalog keeps browsing, details, and task use in one coherent path", async ({
  page,
}, testInfo) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const application = await openCapabilityCatalog(page);
  const catalog = application.locator('[data-product-surface="catalog"]');

  await expect(
    catalog.locator(".product-catalog__featured--scenarios"),
  ).toBeVisible();
  await expect(catalog.locator(".product-catalog__scenario")).toHaveCount(5);
  await expect(
    catalog.locator(
      '[data-directory-layout="assistants"] .product-catalog__entry',
    ),
  ).toHaveCount(12);

  const readyCard = catalog.locator(
    '[data-capability-id="assistant:product-delivery-lead"]',
  );
  const detailOrigin = readyCard.locator(".product-catalog__entry-main");
  await detailOrigin.click();

  const detail = page.getByRole("dialog", {
    name: "产品交付负责人详情",
  });
  await expect(detail).toBeVisible();
  await expect(
    detail.getByRole("heading", { name: "产品交付负责人" }),
  ).toBeVisible();
  await expect(
    detail.getByRole("button", { name: "用于新任务" }),
  ).toBeVisible();
  await expect(detail.locator("[data-capability-mark] img")).toBeVisible();
  const detailBounds = await detail.boundingBox();
  expect(detailBounds).not.toBeNull();
  expect(
    Math.abs((detailBounds?.x ?? 0) - (1280 - (detailBounds?.width ?? 0)) / 2),
  ).toBeLessThan(1);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("capability-detail-desktop.png"),
  });

  await detail.getByRole("button", { name: "关闭能力详情" }).click();
  await expect(detail).toBeHidden();
  await expect(detailOrigin).toBeFocused();

  await readyCard
    .getByRole("button", { name: "使用产品交付负责人新建任务" })
    .click();
  await expect(application).toHaveAttribute("data-view", "start");
  await expect(
    application.locator(
      '[data-composer-resources] [data-resource-id="assistant:product-delivery-lead"]',
    ),
  ).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("Assistant, skill, and connector directories keep their intended density", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1478, height: 852 });
  const runtimeErrors = collectRuntimeErrors(page);
  const application = await openCapabilityCatalog(page);
  const catalog = application.locator('[data-product-surface="catalog"]');

  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("capability-directory-assistants.png"),
  });

  await catalog.getByRole("tab", { name: "技能", exact: true }).click();
  const featuredSkills = catalog.locator(
    ".product-catalog__featured--skills article",
  );
  await expect(featuredSkills).toHaveCount(4);
  const featuredBefore = await featuredSkills.evaluateAll((items) =>
    items.map((item) => item.textContent?.trim()),
  );
  await catalog.getByRole("button", { name: "换一换" }).click();
  const featuredAfter = await featuredSkills.evaluateAll((items) =>
    items.map((item) => item.textContent?.trim()),
  );
  expect(featuredAfter).not.toEqual(featuredBefore);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("capability-directory-skills.png"),
  });

  await catalog.getByRole("tab", { name: "连接器", exact: true }).click();
  const connectors = catalog.locator(
    '[data-directory-layout="connectors"] .product-catalog__entry',
  );
  expect(await connectors.count()).toBeGreaterThan(1);
  const firstConnector = await connectors.nth(0).boundingBox();
  const secondConnector = await connectors.nth(1).boundingBox();
  expect(firstConnector).not.toBeNull();
  expect(secondConnector).not.toBeNull();
  expect(Math.abs((firstConnector?.y ?? 0) - (secondConnector?.y ?? 0))).toBe(
    0,
  );
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("capability-directory-connectors.png"),
  });

  await application.getByRole("button", { name: "设置", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await settings.getByRole("button", { name: "个性化", exact: true }).click();
  await settings.getByRole("button", { name: "深色", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/u);
  await settings.getByRole("button", { name: "关闭设置" }).click();
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("capability-directory-connectors-dark.png"),
  });

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(runtimeErrors).toEqual([]);
});

test("Unconfigured capabilities disclose review before installation", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const application = await openCapabilityCatalog(page);
  const catalog = application.locator('[data-product-surface="catalog"]');
  const availableCard = catalog.locator(
    '[data-capability-id="assistant:release-reviewer"]',
  );

  await availableCard.locator(".product-catalog__entry-main").click();
  const detail = page.getByRole("dialog", { name: "发布评审专家详情" });
  await expect(detail).toContainText("尚未配置");
  await detail.getByRole("button", { name: "配置专家" }).click();

  const setup = page.getByRole("dialog", { name: "配置专家" });
  await expect(setup).toBeVisible();
  await expect(setup).toContainText("先定义职责、运行说明和可访问范围");
  await setup.getByRole("button", { name: "取消" }).click();
  await expect(setup).toBeHidden();
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "关闭能力详情" }).click();
  expect(runtimeErrors).toEqual([]);
});

test("Capability details become a focused full-screen mobile surface", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = collectRuntimeErrors(page);
  const application = await openCapabilityCatalog(page);
  const detailOrigin = application.locator(
    '[data-capability-id="assistant:product-delivery-lead"] .product-catalog__entry-main',
  );
  await detailOrigin.click();

  const detail = page.getByRole("dialog", {
    name: "产品交付负责人详情",
  });
  await expect(detail).toBeVisible();
  const bounds = await detail.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.width).toBe(390);
  expect(bounds?.height).toBe(844);
  const footerBounds = await detail
    .locator(".product-capability-detail > footer")
    .boundingBox();
  expect(footerBounds).not.toBeNull();
  expect(
    Math.abs(
      (footerBounds?.y ?? 0) +
        (footerBounds?.height ?? 0) -
        (bounds?.height ?? 0),
    ),
  ).toBeLessThan(1);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("capability-detail-mobile.png"),
  });

  await page.keyboard.press("Escape");
  await expect(detail).toBeHidden();
  await expect(detailOrigin).toBeFocused();
  expect(runtimeErrors).toEqual([]);
});
