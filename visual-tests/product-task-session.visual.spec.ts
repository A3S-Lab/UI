import { expect, test, type Page } from "@playwright/test";

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

test("Created tasks keep one continuous conversation across navigation and reload", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 1280, height: 760 });
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("playground/sessions/current.html", {
    waitUntil: "networkidle",
  });
  await expect(
    page.locator(
      '[data-product-surface="session"][data-session-state="missing"]',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "没有可恢复的任务" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "新建任务" }).last().click();

  const application = page.locator(".a3s-product-application");
  const composer = application.locator(
    '.product-start [role="textbox"][aria-label="任务指令"]',
  );
  await expect(composer).toBeVisible();
  const speechSupported = await page.evaluate(
    () => "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
  );
  const speechButton = application.locator(
    '.product-start button[aria-label*="语音输入"]',
  );
  if (speechSupported) await expect(speechButton).toBeEnabled();
  else await expect(speechButton).toBeDisabled();
  await application.getByRole("button", { name: "添加任务上下文" }).click();
  await application.getByRole("menuitem", { name: "添加文件" }).click();
  await application.getByRole("menuitem", { name: "工作区文件 @" }).click();
  await expect(
    application.getByRole("tree", { name: "工作区文件" }),
  ).toBeVisible();
  await application.getByRole("treeitem", { name: /AGENTS\.md/u }).click();
  await application.getByRole("button", { name: "权限：默认权限" }).click();
  await application.getByRole("option", { name: "完全访问" }).click();
  await application.getByRole("button", { name: /运行设置：自动/u }).click();
  await application
    .locator(
      '[data-control-panel="run"] [data-run-settings-row] > div > button:last-child',
    )
    .click();
  await application.getByRole("option", { name: /当前默认模型/u }).click();
  await composer.fill("整理导航交互并补充移动端回归");
  await application.getByRole("button", { name: "发送任务" }).click();

  await expect(page).toHaveURL(/\/playground\/sessions\/current\.html$/u);
  await expect(application).toHaveAttribute("data-view", "created-session");
  await expect(
    application.locator(
      '[data-product-surface="session"][data-session-state="ready"][data-variant="created"]',
    ),
  ).toBeVisible();
  await expect(
    application.getByRole("heading", {
      name: "整理导航交互并补充移动端回归",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    application.locator(".product-sidebar__history a[data-created-task]"),
  ).toHaveAttribute("aria-current", "page");
  await expect(application.locator(".product-session-context")).toContainText(
    "当前默认模型",
  );

  const followUp = application.locator(
    '.product-session__composer [role="textbox"][aria-label="任务指令"]',
  );
  await followUp.fill("先确认触控目标和返回后的焦点位置");
  await followUp.press("Enter");
  await expect(
    application.getByRole("region", { name: "后续指令队列" }),
  ).toContainText("先确认触控目标和返回后的焦点位置");
  await application.getByRole("button", { name: "停止任务" }).click();
  await application.getByRole("button", { name: "恢复并执行" }).click();
  await expect(
    application.getByText("先确认触控目标和返回后的焦点位置", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    application.locator("[data-follow-up-reply]").last(),
  ).toContainText("这条补充已加入当前任务上下文");

  await application.getByRole("button", { name: "更多回复操作" }).click();
  await application.getByRole("menuitem", { name: "查看交付产物" }).click();
  const artifacts = application.locator('aside[aria-label="任务详情"]');
  await expect(artifacts).toContainText("task-brief.md");
  await artifacts.getByRole("button", { name: "关闭任务详情" }).click();

  await application.getByRole("link", { name: "新建任务" }).first().click();
  await application
    .locator(".product-sidebar__history a[data-created-task]")
    .click();
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByText("先确认触控目标和返回后的焦点位置", { exact: true }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    application.getByRole("button", { name: "打开应用导航" }),
  ).toBeVisible();
  await application.getByRole("button", { name: "打开应用导航" }).click();
  await expect(
    application.locator(
      ".product-sidebar[data-mobile-open=true] a[data-created-task][aria-current=page]",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);

  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("created-task-mobile.png"),
  });
  expect(runtimeErrors).toEqual([]);
});

test("Created tasks stay usable in the current document when browser storage is unavailable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    originalSetItem.call(
      window.localStorage,
      "a3s-ui:product-task-session:v1",
      JSON.stringify({
        context: { model: "auto", permissions: "ask", workspace: "" },
        createdAt: "2026-08-18T00:00:00.000Z",
        followUps: [],
        id: "previous-task",
        origin: "start",
        prompt: "不应覆盖新任务的旧任务",
        version: 1,
      }),
    );
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === "a3s-ui:product-task-session:v1") {
        throw new DOMException("Storage disabled", "SecurityError");
      }
      return originalSetItem.call(this, key, value);
    };
  });
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("playground.html", { waitUntil: "networkidle" });
  const application = page.locator(".a3s-product-application");
  await application
    .locator('.product-start [role="textbox"][aria-label="任务指令"]')
    .fill("验证受限存储环境中的任务连续性");
  await application.getByRole("button", { name: "发送任务" }).click();

  await expect(page).toHaveURL(/\/playground\/sessions\/current\.html$/u);
  await expect(
    application.locator('[data-session-state="ready"][data-variant="created"]'),
  ).toBeVisible();
  await expect(
    application.locator('[data-persistence-warning="true"]'),
  ).toContainText("仅保留在当前页面");
  await expect(
    application.getByText("刷新后将无法恢复", { exact: false }),
  ).toBeVisible();
  await expect(
    application.getByText("不应覆盖新任务的旧任务", { exact: true }),
  ).toHaveCount(0);

  await application.getByRole("link", { name: "新建任务" }).first().click();
  await application
    .locator(".product-sidebar__history a[data-created-task]")
    .click();
  await expect(
    application.getByRole("heading", {
      name: "验证受限存储环境中的任务连续性",
      exact: true,
    }),
  ).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("Session headers reserve the mobile navigation control in LTR and RTL", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = collectRuntimeErrors(page);
  const routes = [
    "playground/sessions/fix-session-recovery.html",
    "playground/projects/a3s-ui-experience/sessions/release-readiness.html",
  ];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "networkidle" });
    const application = page.locator(".a3s-product-application");
    const menu = application.locator(".product-application__mobile-menu");
    const heading = application.locator(
      ".product-session__header > :is(.product-session__heading, .product-project-breadcrumb)",
    );
    await expect(menu).toBeVisible();
    await expect(heading).toBeVisible();

    for (const direction of ["ltr", "rtl"] as const) {
      await page.evaluate((value) => {
        document.documentElement.dir = value;
        document
          .querySelector<HTMLElement>(".a3s-product-application")
          ?.setAttribute("dir", value);
      }, direction);

      const geometry = await page.evaluate(() => {
        const root = document.querySelector<HTMLElement>(
          ".a3s-product-application",
        );
        const menuElement = root?.querySelector<HTMLElement>(
          ".product-application__mobile-menu",
        );
        const headingElement = root?.querySelector<HTMLElement>(
          ".product-session__header > :is(.product-session__heading, .product-project-breadcrumb)",
        );
        if (!root || !menuElement || !headingElement) {
          throw new Error("Session mobile header geometry is unavailable");
        }
        const menuRect = menuElement.getBoundingClientRect();
        const headingRect = headingElement.getBoundingClientRect();
        const overlaps =
          menuRect.left < headingRect.right &&
          menuRect.right > headingRect.left &&
          menuRect.top < headingRect.bottom &&
          menuRect.bottom > headingRect.top;
        const safeGap =
          getComputedStyle(root).direction === "rtl"
            ? menuRect.left - headingRect.right
            : headingRect.left - menuRect.right;
        return {
          direction: getComputedStyle(root).direction,
          overlaps,
          safeGap,
        };
      });

      expect(geometry.direction).toBe(direction);
      expect(geometry.overlaps).toBe(false);
      expect(geometry.safeGap).toBeGreaterThanOrEqual(4);
    }
  }

  expect(runtimeErrors).toEqual([]);
});
