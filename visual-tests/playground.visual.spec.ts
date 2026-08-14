import { expect, test, type Page } from "@playwright/test";

const scenarios = [
  ["代码", "code"],
  ["设计", "design"],
  ["写作", "write"],
  ["工作流", "workflow"],
  ["自动化", "automation"],
  ["能力目录", "catalog"],
  ["连接", "channels"],
  ["设置", "settings"],
] as const;

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("Playground is a standalone route with eight operable scenes", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("playground.html");

  const playground = page.locator(".a3s-workspace-playground");
  const tabs = playground.getByRole("tab");
  await expect(page.locator(".a3s-playground-page")).toBeVisible();
  await expect(page.locator(".rp-doc-layout")).toHaveCount(0);
  await expect(tabs).toHaveCount(scenarios.length);

  for (const [label, id] of scenarios) {
    await playground.getByRole("tab", { name: label, exact: true }).click();
    await expect(
      playground.locator(`[data-playground-scene="${id}"]`),
    ).toBeVisible();
    await expect(playground).toHaveAttribute("data-playground-state", "ready");
  }

  await expect(
    playground.getByRole("button", { name: "检查器", exact: true }),
  ).toBeDisabled();

  const codeTab = playground.getByRole("tab", { name: "代码", exact: true });
  await codeTab.click();
  await expect(
    playground.getByRole("button", { name: "检查器", exact: true }),
  ).toBeEnabled();
  await codeTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    playground.getByRole("tab", { name: "设计", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(
    playground.getByRole("tab", { name: "设置", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(codeTab).toHaveAttribute("aria-selected", "true");

  expect(runtimeErrors).toEqual([]);
});

test("Playground exposes recovery, direction, inspector, and phone states", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("playground.html");

  const playground = page.locator(".a3s-workspace-playground");
  const stateSelect = playground.locator(
    ".a3s-workspace-playground__options select",
  );
  for (const state of [
    "loading",
    "empty",
    "error",
    "offline",
    "permission-denied",
  ]) {
    await stateSelect.selectOption(state);
    await expect(playground).toHaveAttribute("data-playground-state", state);
    await expect(
      playground.locator(
        ".playground-scene-state, [data-playground-state-panel]",
      ),
    ).toBeVisible();
  }

  await stateSelect.selectOption("ready");
  await playground.getByRole("button", { name: "手机", exact: true }).click();
  await expect(playground).toHaveAttribute("data-playground-viewport", "phone");
  await expect(playground).toHaveAttribute(
    "data-playground-inspector",
    "closed",
  );

  const device = playground.locator(".a3s-workspace-playground__device");
  await expect
    .poll(async () => {
      const box = await device.boundingBox();
      return box ? Number((box.width / box.height).toFixed(3)) : 0;
    })
    .toBeCloseTo(390 / 844, 2);

  for (const [label, id] of scenarios) {
    await playground.getByRole("tab", { name: label, exact: true }).click();
    const overflow = await playground
      .locator(`[data-playground-scene="${id}"]`)
      .evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }

  await playground.getByRole("tab", { name: "代码", exact: true }).click();
  const inspectorButton = playground.getByRole("button", {
    name: "检查器",
    exact: true,
  });
  await inspectorButton.click();
  await expect(playground).toHaveAttribute("data-playground-inspector", "open");
  await expect(playground.locator(".playground-inspector")).toBeVisible();
  await inspectorButton.click();

  const directionButton = playground.getByRole("button", {
    name: "LTR",
    exact: true,
  });
  await directionButton.click();
  await expect(playground).toHaveAttribute("dir", "rtl");
  const codeTab = playground.getByRole("tab", { name: "代码", exact: true });
  await codeTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    playground.getByRole("tab", { name: "设置", exact: true }),
  ).toHaveAttribute("aria-selected", "true");

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(runtimeErrors).toEqual([]);
});

test("Playground phone navigation is isolated from the documentation runtime", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("playground.html");

  const playground = page.locator(".a3s-workspace-playground");
  await playground.getByRole("button", { name: "手机", exact: true }).click();
  const navigation = playground.locator(
    ".a3s-workspace-playground__shell > [data-app-navigation]",
  );
  const trigger = playground.locator("[data-app-navigation-trigger]");
  await expect(navigation).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();
  await expect(navigation).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAttribute("aria-label", "关闭导航");
  await navigation
    .getByRole("button", { name: "设置", exact: true })
    .first()
    .click();
  await expect(navigation).toBeHidden();
  await expect(
    playground.locator('[data-playground-scene="settings"]'),
  ).toBeVisible();

  await page.getByRole("button", { name: "打开主导航", exact: true }).click();
  await page.getByLabel("切换到深色主题").last().click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    playground.locator(".a3s-workspace-playground__content"),
  ).toHaveCSS("background-color", "rgb(13, 13, 15)");

  expect(runtimeErrors).toEqual([]);
});

test("Playground picks a usable simulated device on compact browsers", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "compact-768");
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("playground.html");

  const playground = page.locator(".a3s-workspace-playground");
  await expect(playground).toHaveAttribute(
    "data-playground-viewport",
    "tablet",
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);

  await playground.getByRole("button", { name: "手机", exact: true }).click();
  await expect(playground).toHaveAttribute("data-playground-viewport", "phone");
  await expect(
    playground.locator(".a3s-workspace-playground__device"),
  ).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("Playground starts in phone mode on phone-sized browsers", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("playground.html");

  const playground = page.locator(".a3s-workspace-playground");
  await expect(playground).toHaveAttribute("data-playground-viewport", "phone");
  await expect(playground).toHaveAttribute(
    "data-playground-inspector",
    "closed",
  );
  await expect(
    playground.locator(".a3s-workspace-playground__windowbar small"),
  ).toHaveText("390 × 844");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(runtimeErrors).toEqual([]);
});
