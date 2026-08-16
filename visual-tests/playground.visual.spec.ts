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

async function openPlayground(page: Page) {
  await page.goto("playground.html", { waitUntil: "networkidle" });
  const playground = page.locator(".a3s-workspace-playground");
  await expect(playground).toBeVisible();
  await expect(playground.locator(".dv-dockview")).toBeVisible();
  return playground;
}

async function openLayoutMenu(page: Page) {
  const menu = page.locator(".workbench-layout-menu");
  if ((await menu.getAttribute("open")) === null) {
    await menu.locator("summary").click();
  }
  await expect(menu).toHaveAttribute("open", "");
  return menu;
}

test("Playground is a standalone Dockview workspace with all six production panels", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openPlayground(page);

  await expect(page.locator(".a3s-playground-page")).toBeVisible();
  await expect(page.locator(".rp-doc-layout")).toHaveCount(0);
  await expect(
    playground.locator(".workbench-activity [role=tab]"),
  ).toHaveCount(scenarios.length);
  const dock = playground.locator(".workbench-dock");
  for (const [label, selector] of [
    ["资源管理器", ".workbench-explorer"],
    ["任务", ".workbench-task"],
    ["工作区", ".workbench-code"],
    ["设备预览", ".playground-device-preview"],
    ["检查器", ".workbench-inspector"],
    ["终端", ".workbench-terminal"],
  ] as const) {
    const tab = dock.getByRole("tab", { name: label, exact: true }).first();
    const panel = dock.locator(selector);
    await expect(tab).toBeVisible();
    if (!(await panel.isVisible())) {
      await tab.click();
    }
    await expect(panel).toBeVisible();
    if (label === "任务") {
      await expect(dock.locator(".ProseMirror")).toBeVisible();
    }
  }

  for (const [label, id] of scenarios) {
    await playground.getByRole("tab", { name: label, exact: true }).click();
    await expect(
      playground.locator(`[data-workbench-surface="${id}"]`),
    ).toBeVisible();
  }

  const codeTab = playground.getByRole("tab", { name: "代码", exact: true });
  await codeTab.focus();
  await page.keyboard.press("ArrowDown");
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

test("Dockview layout actions float, maximize, save, reset, and restore real groups", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openPlayground(page);

  let menu = await openLayoutMenu(page);
  await menu.getByRole("button", { name: "显示终端" }).click();
  await expect(playground.locator(".workbench-terminal")).toBeVisible();

  menu = await openLayoutMenu(page);
  await menu.getByRole("button", { name: "浮动检查器" }).click();
  await expect(
    playground.locator(".dv-resize-container .workbench-inspector"),
  ).toBeVisible();
  await expect(playground.locator(".workbench-statusbar output")).toContainText(
    "检查器已浮动",
  );

  menu = await openLayoutMenu(page);
  await menu.getByRole("button", { name: "保存布局" }).click();
  await expect(playground.locator(".workbench-statusbar output")).toContainText(
    "布局已保存",
  );

  menu = await openLayoutMenu(page);
  await menu.getByRole("button", { name: "浮动检查器" }).click();
  await expect(
    playground.locator(".dv-resize-container .workbench-inspector"),
  ).toHaveCount(0);
  await expect(playground.locator(".workbench-statusbar output")).toContainText(
    "检查器已停靠",
  );

  menu = await openLayoutMenu(page);
  await menu.getByRole("button", { name: "恢复布局" }).click();
  await expect(
    playground.locator(".dv-resize-container .workbench-inspector"),
  ).toBeVisible();

  const editorTab = playground
    .locator(".dv-tab")
    .filter({ hasText: "工作区" })
    .first();
  await editorTab.click();
  menu = await openLayoutMenu(page);
  await menu.getByRole("button", { name: "最大化当前组" }).click();
  await expect(playground.locator(".workbench-statusbar output")).toContainText(
    "已最大化",
  );
  menu = await openLayoutMenu(page);
  await menu.getByRole("button", { name: "最大化当前组" }).click();
  await expect(playground.locator(".workbench-statusbar output")).toContainText(
    "已恢复",
  );

  menu = await openLayoutMenu(page);
  await menu.getByRole("button", { name: "重置布局" }).click();
  await expect(
    playground.locator(".dv-resize-container .workbench-inspector"),
  ).toHaveCount(0);
  await expect(playground.locator(".workbench-statusbar output")).toContainText(
    "布局已重置",
  );

  expect(runtimeErrors).toEqual([]);
});

test("Device Preview uses a real hardware shell and preserves selected viewport state", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openPlayground(page);
  await playground
    .locator(".dv-tab")
    .filter({ hasText: "设备预览" })
    .first()
    .click();

  const device = playground.locator(".playground-device-preview");
  await expect(device).toBeVisible();
  await expect(device.locator("[data-device-simulator-frame]")).toBeVisible();
  await expect(
    device.locator("iframe[data-device-simulator-preview]"),
  ).toBeVisible();
  await expect(device).toHaveAttribute("data-device", "iphone-15-pro");

  await device
    .getByRole("combobox", { name: "设备预设" })
    .selectOption("pixel-8");
  await expect(device).toHaveAttribute("data-device", "pixel-8");
  await expect(device.locator("[data-device-simulator-width]")).toHaveValue(
    "412",
  );
  await expect(device.locator("[data-device-simulator-height]")).toHaveValue(
    "915",
  );

  await device.getByRole("button", { name: "横屏" }).click();
  await expect(device).toHaveAttribute("data-orientation", "landscape");
  await expect(device.locator("[data-device-simulator-width]")).toHaveValue(
    "915",
  );
  await expect(device.locator("[data-device-simulator-height]")).toHaveValue(
    "412",
  );

  const shellGeometry = await device
    .locator("[data-device-simulator-frame]")
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        pseudoDisplay: getComputedStyle(element, "::before").display,
      };
    });
  expect(shellGeometry.borderRadius).not.toBe("0px");
  expect(shellGeometry.boxShadow).not.toBe("none");
  expect(shellGeometry.pseudoDisplay).not.toBe("none");
  expect(runtimeErrors).toEqual([]);
});

test("Playground recovery states and compact workspace do not overflow", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openPlayground(page);

  const state = playground.locator(".workbench-commandbar__actions select");
  for (const value of [
    "loading",
    "empty",
    "error",
    "offline",
    "permission-denied",
  ]) {
    await state.selectOption(value);
    await expect(playground).toHaveAttribute("data-playground-state", value);
    await expect(
      playground.locator(
        ".playground-scene-state, [data-playground-state-panel]",
      ),
    ).toBeVisible();
  }
  await state.selectOption("ready");

  for (const [label, id] of scenarios) {
    await playground.getByRole("tab", { name: label, exact: true }).click();
    await expect(
      playground.locator(`[data-workbench-surface="${id}"]`),
    ).toBeVisible();
  }

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  const bounds = await playground.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.height).toBeLessThanOrEqual(844);
  expect(runtimeErrors).toEqual([]);
});

test("Dockview documentation demos and framework tabs render without page errors", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  for (const route of [
    "dock-workspace",
    "grid-view",
    "split-view",
    "pane-view",
  ]) {
    await page.goto(`harness/${route}.html`, { waitUntil: "networkidle" });
    await expect(page.locator(".dockview-demo")).toBeVisible();
    await expect(page.locator(".a3s-framework-tabs")).toBeVisible();
    await expect(page.locator(".a3s-framework-tabs [role=tab]")).toHaveCount(3);
    await page
      .locator(".a3s-framework-tabs [role=tab]")
      .filter({ hasText: "React" })
      .click();
    await expect(
      page.locator(".a3s-framework-tabs [role=tabpanel]"),
    ).toContainText(/use(?:DockviewLayout|Gridview|Splitview|Paneview)/);
  }
  expect(runtimeErrors).toEqual([]);
});
