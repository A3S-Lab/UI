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

  await page.goto("sessions/current.html", { waitUntil: "networkidle" });
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
  await application
    .locator(".product-start .product-composer__context summary")
    .click();
  await application.getByRole("menuitem", { name: "A3S UI 体验优化" }).click();
  await application
    .locator('.product-start select[aria-label="权限设置"]')
    .selectOption("edit");
  await application
    .locator('.product-start select[aria-label="模型"]')
    .selectOption("reasoner");
  await composer.fill("整理导航交互并补充移动端回归");
  await application.getByRole("button", { name: "发送任务" }).click();

  await expect(page).toHaveURL(/\/sessions\/current\.html$/u);
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
  await expect(
    application.locator(".product-session__tool[data-context]"),
  ).toContainText("A3S Reasoner");

  const followUp = application.locator(
    '.product-session__composer [role="textbox"][aria-label="任务指令"]',
  );
  await followUp.fill("先确认触控目标和返回后的焦点位置");
  await application.getByRole("button", { name: "发送任务" }).click();
  await expect(
    application.getByText("先确认触控目标和返回后的焦点位置", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    application.locator("[data-follow-up-reply]").last(),
  ).toContainText("这条补充已加入当前任务上下文");

  await application.getByRole("button", { name: "打开产物面板" }).click();
  const artifacts = application.getByRole("complementary", {
    name: "会话产物",
  });
  await expect(artifacts).toContainText("task-brief.md");
  await artifacts.getByRole("button", { name: "关闭产物面板" }).click();

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

  await page.goto("app.html", { waitUntil: "networkidle" });
  const application = page.locator(".a3s-product-application");
  await application
    .locator('.product-start [role="textbox"][aria-label="任务指令"]')
    .fill("验证受限存储环境中的任务连续性");
  await application.getByRole("button", { name: "发送任务" }).click();

  await expect(page).toHaveURL(/\/sessions\/current\.html$/u);
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
