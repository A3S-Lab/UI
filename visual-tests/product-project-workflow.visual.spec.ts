import { expect, test, type Locator, type Page } from "@playwright/test";

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function revealNavigation(application: Locator) {
  const menuButton = application.getByRole("button", {
    name: "打开应用导航",
  });
  if (await menuButton.isVisible()) await menuButton.click();
}

test("project card opens a durable workspace and child-task session", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("app/projects.html", { waitUntil: "networkidle" });
  const application = page.locator("[data-product-application]");
  const projectCard = application.locator(".product-projects__owned > a");

  await expect(projectCard).toHaveAttribute(
    "href",
    /\/app\/projects\/a3s-ui-experience\.html$/u,
  );
  await projectCard.click();
  await expect(page).toHaveURL(/\/app\/projects\/a3s-ui-experience\.html$/u);
  await expect(application).toHaveAttribute("data-view", "project");
  await expect(
    application.locator('[data-product-surface="project"]'),
  ).toBeVisible();
  await expect(application.locator(".a3s-workspace-playground")).toHaveCount(0);
  await expect(
    application.locator(".product-project-workspace__composer .ProseMirror"),
  ).toBeVisible();

  await revealNavigation(application);
  await expect(
    application.locator(
      ".product-sidebar__primary a[aria-current='page'][href$='/app/projects.html']",
    ),
  ).toBeVisible();
  await expect(
    application.locator(".product-sidebar__project-group"),
  ).toHaveAttribute("data-expanded", "true");

  const childTask = application.locator(".product-sidebar__project-task");
  await childTask.click();
  await expect(page).toHaveURL(
    /\/app\/projects\/a3s-ui-experience\/sessions\/release-readiness\.html$/u,
  );
  await expect(application).toHaveAttribute("data-view", "project-session");
  await expect(
    application.locator('[data-product-surface="project-session"]'),
  ).toBeVisible();
  await expect(application.locator(".a3s-workspace-playground")).toHaveCount(0);
  await expect(
    application.getByRole("navigation", { name: "项目路径" }),
  ).toBeVisible();
  await expect(
    application.locator(".product-session__composer .ProseMirror"),
  ).toBeVisible();

  await application.getByRole("button", { name: "在项目会话中搜索" }).click();
  await application
    .getByRole("searchbox", { name: "搜索项目会话" })
    .fill("项目");
  await expect(
    application.locator(".product-session__search > output"),
  ).toHaveText("7 个结果");
  await application.getByRole("button", { name: "关闭项目会话搜索" }).click();

  const artifactsTrigger = application.getByRole("button", {
    name: "打开项目产物",
  });
  await artifactsTrigger.click();
  const artifacts = application.locator("aside[aria-label='项目产物']");
  await expect(artifacts).toBeVisible();
  await expect(
    artifacts.getByRole("button", { name: "关闭项目产物" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(artifacts).not.toBeVisible();
  await expect(artifactsTrigger).toBeFocused();

  await application
    .locator(".product-session__composer .ProseMirror")
    .fill("继续执行暗色模式验收");
  await application.getByRole("button", { name: "发送任务" }).click();
  await expect(
    application.getByText("继续执行暗色模式验收", { exact: true }),
  ).toBeVisible();

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(runtimeErrors).toEqual([]);
});

test("project session preserves contrast and width in dark mode", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto(
    "app/projects/a3s-ui-experience/sessions/release-readiness.html",
    { waitUntil: "networkidle" },
  );
  const application = page.locator("[data-product-application]");
  const session = application.locator(
    '[data-product-surface="project-session"]',
  );

  await expect(session).toBeVisible();
  const colors = await session.evaluate((element) => {
    const style = getComputedStyle(element);
    const header = element.querySelector<HTMLElement>(
      ".product-session__header",
    );
    return {
      background: style.backgroundColor,
      color: style.color,
      headerBackground: header ? getComputedStyle(header).backgroundColor : "",
    };
  });
  expect(colors.background).not.toBe("rgb(255, 255, 255)");
  expect(colors.headerBackground).not.toBe("rgb(255, 255, 255)");
  expect(colors.color).not.toBe(colors.background);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(runtimeErrors).toEqual([]);
});
