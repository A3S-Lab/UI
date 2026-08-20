import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function openProductApplication(page: Page) {
  await page.goto("app.html", { waitUntil: "networkidle" });
  const application = page.locator(".a3s-product-application");
  await expect(application).toBeVisible();
  await expect(application).toHaveAttribute("data-view", "start");
  await expect(page.locator(".rp-nav")).toHaveCount(0);
  return application;
}

async function revealProductNavigation(playground: Locator) {
  const mobileMenu = playground.getByRole("button", {
    name: "打开应用导航",
  });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
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

test("Product application opens in the approved task shell with complete navigation", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);

  await expect(
    playground.getByRole("navigation", { name: "主要页面" }),
  ).toBeVisible();
  const composerEditor = playground.locator(".product-composer .ProseMirror");
  await expect(composerEditor).toBeVisible();
  const composer = playground.locator(".product-composer").first();
  const idleComposerStyle = await composer.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderColor: style.borderColor, boxShadow: style.boxShadow };
  });
  await composerEditor.focus();
  await composer.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const focusedComposerStyle = await composer.evaluate((element) => {
    const style = getComputedStyle(element);
    const editorStyle = getComputedStyle(
      element.querySelector<HTMLElement>(".agent-composer-editor__content")!,
    );
    return {
      borderColor: style.borderColor,
      borderWidth: style.borderWidth,
      boxShadow: style.boxShadow,
      editorOutlineStyle: editorStyle.outlineStyle,
      editorOutlineWidth: editorStyle.outlineWidth,
    };
  });
  expect(focusedComposerStyle.borderColor).not.toBe(
    idleComposerStyle.borderColor,
  );
  expect(focusedComposerStyle.boxShadow).not.toBe(idleComposerStyle.boxShadow);
  expect(focusedComposerStyle.borderWidth).toBe("1px");
  expect(focusedComposerStyle.editorOutlineStyle).toBe("none");
  expect(focusedComposerStyle.editorOutlineWidth).toBe("0px");
  await expect(
    playground.locator(".product-start__prompts > button"),
  ).toHaveCount(8);
  await expect(
    playground.getByRole("tab", { name: "日常办公", exact: true }),
  ).toHaveAttribute("aria-selected", "true");

  await playground.getByRole("button", { name: "文档处理" }).click();
  await expect(
    playground.locator(".product-composer .ProseMirror"),
  ).toContainText("文档处理");
  const workspaceSelector = playground.getByRole("button", {
    name: "选择工作区",
  });
  await workspaceSelector.click();
  await playground
    .getByRole("dialog", { name: "工作区" })
    .getByRole("option", { name: /a3s-ui/ })
    .click();
  await expect(workspaceSelector).toContainText("a3s-ui");
  await playground.getByRole("button", { name: "权限：默认权限" }).click();
  await playground
    .getByRole("dialog", { name: "选择权限边界" })
    .getByRole("option", { name: /完全访问/ })
    .click();
  await expect(
    playground.getByRole("button", { name: "权限：完全访问" }),
  ).toBeVisible();

  await revealProductNavigation(playground);
  await playground.getByRole("link", { name: "助理", exact: true }).click();
  await expect(playground).toHaveAttribute("data-view", "assistant");
  await expect(
    playground.locator('[data-product-surface="assistant"]'),
  ).toBeVisible();

  await revealProductNavigation(playground);
  await playground.getByRole("link", { name: "项目", exact: true }).click();
  await expect(playground).toHaveAttribute("data-view", "projects");
  await playground.getByRole("button", { name: /产品需求全流程/ }).click();
  await expect(playground.locator(".product-projects > output")).toContainText(
    "产品需求全流程",
  );

  await revealProductNavigation(playground);
  await playground
    .getByRole("link", { name: "专家·技能·连接器", exact: true })
    .click();
  await expect(playground).toHaveAttribute("data-view", "catalog");
  await playground.getByRole("tab", { name: "技能", exact: true }).click();
  await expect(
    playground.getByRole("tab", { name: "技能", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const managedCapabilities = playground.getByRole("button", {
    name: /^已管理/u,
  });
  await managedCapabilities.click();
  await expect(managedCapabilities).toHaveAttribute("aria-pressed", "true");

  await revealProductNavigation(playground);
  await playground.getByRole("link", { name: "自动化", exact: true }).click();
  await expect(playground).toHaveAttribute("data-view", "automation");
  await expect(
    playground.locator('[data-product-surface="automation"]'),
  ).toBeVisible();

  await revealProductNavigation(playground);
  const more = playground.locator(".product-sidebar__more");
  await more.locator("summary").click();
  await expect(more).toHaveAttribute("open", "");
  await more.getByRole("menuitem", { name: "我的文件" }).click();
  await expect(playground).toHaveAttribute("data-view", "resources");
  await expect(playground.locator('[data-resource="files"]')).toBeVisible();

  await revealProductNavigation(playground);
  await playground.getByRole("button", { name: "设置", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await expect(settings).toBeVisible();
  await settings.getByRole("button", { name: "关闭设置" }).click();
  await expect(settings).not.toBeVisible();

  await revealProductNavigation(playground);
  await playground.getByRole("button", { name: "搜索", exact: true }).click();
  const search = page.getByRole("dialog", { name: "全局搜索" });
  await expect(search).toBeVisible();
  await search
    .getByRole("searchbox", { name: "搜索任务、文件和操作" })
    .fill("恢复");
  await search.getByRole("button", { name: /修复会话恢复/ }).click();
  await expect(page).toHaveURL(/\/sessions\/fix-session-recovery\.html$/u);
  await expect(playground).toHaveAttribute("data-view", "session");
  await expect(
    playground.locator('[data-product-surface="session"]'),
  ).toBeVisible();
  await expect(playground.locator(".a3s-workspace-playground")).toHaveCount(0);
  await expect(
    playground.getByRole("heading", { name: "修复会话恢复", exact: true }),
  ).toBeVisible();
  await expect(playground.locator(".product-session__tool")).toHaveCount(2);
  await playground
    .locator(".product-session__composer .ProseMirror")
    .fill("继续检查移动端焦点顺序");
  await playground.getByRole("button", { name: "发送任务" }).click();
  await expect(
    playground.getByText("继续检查移动端焦点顺序", { exact: true }),
  ).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});

test("Capability navigation preserves the selected catalog tab", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);
  await revealProductNavigation(playground);

  const capabilities = playground.getByRole("link", {
    name: "专家·技能·连接器",
    exact: true,
  });
  await expect(capabilities).toHaveAttribute(
    "href",
    /capabilities\.html\?capability=assistants$/u,
  );
  await capabilities.click();
  await expect(playground).toHaveAttribute("data-view", "catalog");
  await expect(page).toHaveURL(/capabilities\.html\?capability=assistants$/u);
  await expect(
    playground.getByRole("tab", { name: "专家", exact: true }),
  ).toHaveAttribute("aria-selected", "true");

  await playground.getByRole("tab", { name: "技能", exact: true }).click();
  await expect(page).toHaveURL(/capabilities\.html\?capability=skills$/u);
  await expect(
    playground.getByRole("tab", { name: "技能", exact: true }),
  ).toHaveAttribute("aria-selected", "true");

  await playground.getByRole("tab", { name: "连接器", exact: true }).click();
  await expect(page).toHaveURL(/capabilities\.html\?capability=connectors$/u);
  await expect(
    playground.getByRole("tab", { name: "连接器", exact: true }),
  ).toHaveAttribute("aria-selected", "true");

  await page.goto("en/app/capabilities.html?capability=skills", {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("tab", { name: "Skills", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("Session detail keeps artifacts in a focused secondary inspector", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 577 });
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);

  await playground.getByRole("link", { name: /修复会话恢复/ }).click();

  await expect(page).toHaveURL(/\/sessions\/fix-session-recovery\.html$/u);
  await expect(playground).toHaveAttribute("data-view", "session");
  await expect(
    playground.locator('[data-product-surface="session"]'),
  ).toBeVisible();
  await expect(playground.locator(".a3s-workspace-playground")).toHaveCount(0);
  await expect(
    playground.getByRole("heading", { name: "修复会话恢复", exact: true }),
  ).toBeVisible();
  await expect(playground.locator(".product-session__composer")).toBeVisible();
  await expect(
    playground.locator(".product-session__composer .ProseMirror"),
  ).toBeVisible();
  await expect(playground.locator(".product-session__header p")).toHaveCount(0);
  await expect(
    playground.getByRole("button", { name: "发送任务" }),
  ).toBeDisabled();

  await playground.getByRole("button", { name: "在会话中搜索" }).click();
  const conversationSearch = playground.getByRole("searchbox", {
    name: "搜索当前会话",
  });
  await conversationSearch.fill("焦点");
  await expect(
    playground.locator(".product-session__search > output"),
  ).toHaveText("3 个结果");
  await playground.getByRole("button", { name: "关闭会话搜索" }).click();

  const artifactsTrigger = playground.getByRole("button", {
    name: "打开产物面板",
  });
  await artifactsTrigger.click();
  await expect(page).toHaveURL(/\/sessions\/fix-session-recovery\.html$/u);
  await expect(playground).toHaveAttribute("data-view", "session");
  const artifacts = playground.getByRole("complementary", {
    name: "会话产物",
  });
  await expect(artifacts).toBeVisible();
  await expect(
    artifacts.getByRole("button", { name: "关闭产物面板" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(artifacts).not.toBeVisible();
  await expect(artifactsTrigger).toBeFocused();

  await artifactsTrigger.click();
  await expect(playground.locator(".a3s-workspace-playground")).toHaveCount(0);
  await playground
    .locator(".product-session__artifact-overview > div > button")
    .first()
    .click();
  await expect(
    playground.locator(".product-session__artifact-preview pre"),
  ).toContainText("restoreSession");
  expect(runtimeErrors).toEqual([]);
});

test("Account menu closes predictably and routes every account action", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);
  await revealProductNavigation(playground);
  const accountTrigger = playground
    .locator(".product-sidebar__footer > button")
    .first();
  const accountMenu = page.getByRole("menu", { name: "账户菜单" });

  await accountTrigger.click();
  await expect(accountMenu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(accountMenu).not.toBeVisible();
  await expect(accountTrigger).toBeFocused();

  await accountTrigger.click();
  await expect(accountMenu).toBeVisible();
  const backdrop = playground.locator(".product-application__backdrop");
  if (await backdrop.isVisible()) {
    await backdrop.click();
  } else {
    await playground.locator(".product-application__main").click({
      position: { x: 12, y: 12 },
    });
  }
  await expect(accountMenu).not.toBeVisible();

  await revealProductNavigation(playground);
  await accountTrigger.click();
  const appearance = accountMenu.getByRole("menuitemcheckbox", {
    name: "深色外观",
  });
  await expect(appearance).toHaveAttribute("aria-checked", "false");
  await appearance.click();
  await expect(appearance).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);

  await accountMenu.getByRole("menuitem", { name: /社区版本/ }).click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await expect(settings).toBeVisible();
  await expect(
    settings.getByRole("button", { name: "账户管理", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    settings.getByRole("heading", { level: 2, name: "账户管理" }),
  ).toBeVisible();
  await settings.getByRole("button", { name: "关闭设置" }).click();

  expect(runtimeErrors).toEqual([]);
});

test("Settings entry points open the intended section and every section is reachable", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);
  await revealProductNavigation(playground);
  const settings = page.getByRole("dialog", { name: "设置" });

  await playground.getByRole("button", { name: "设置", exact: true }).click();
  await expect(settings).toBeVisible();
  await expect(
    settings.getByRole("button", { name: "系统设置", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await settings.getByRole("button", { name: "关闭设置" }).click();

  await revealProductNavigation(playground);
  await playground.getByRole("link", { name: "助理", exact: true }).click();
  await playground.getByRole("button", { name: "助理设置" }).click();
  await expect(settings).toBeVisible();
  await expect(
    settings.getByRole("button", { name: "助理设置", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  const sections = [
    ["系统设置", "设置"],
    ["账户管理", "账户管理"],
    ["执行设置", "执行设置"],
    ["个性化", "个性化"],
    ["记忆", "记忆"],
    ["模型", "模型"],
    ["助理设置", "助理设置"],
    ["数据管理", "数据管理"],
    ["快捷键", "快捷键"],
    ["安全中心", "安全中心"],
    ["帮助与反馈", "帮助与反馈"],
  ] as const;
  for (const [navigationLabel, heading] of sections) {
    const button = settings.getByRole("button", {
      name: navigationLabel,
      exact: true,
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-current", "page");
    await expect(
      settings.getByRole("heading", { level: 2, name: heading }),
    ).toBeVisible();
  }

  await settings.getByRole("button", { name: "关闭设置" }).click();
  expect(runtimeErrors).toEqual([]);
});

test("Settings actions update local state instead of leaving inert controls", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);
  const settings = page.getByRole("dialog", { name: "设置" });
  await playground.getByRole("button", { name: "设置", exact: true }).click();

  const workspacePath = settings.getByRole("textbox", {
    name: "默认工作区路径",
  });
  await settings.getByRole("button", { name: "更改", exact: true }).click();
  await workspacePath.fill("~/Projects/A3S");
  await settings.getByRole("button", { name: "保存", exact: true }).click();
  await expect(workspacePath).toHaveValue("~/Projects/A3S");
  await expect(workspacePath).toHaveAttribute("readonly", "");

  await settings.getByRole("button", { name: "账户管理", exact: true }).click();
  await settings.getByRole("button", { name: "编辑资料" }).click();
  const displayName = settings.getByRole("textbox", { name: "显示名称" });
  await displayName.fill("A3S Designer");
  await settings.getByRole("button", { name: "保存资料" }).click();
  await expect(
    settings.getByText("A3S Designer", { exact: true }),
  ).toBeVisible();

  await settings.getByRole("button", { name: "助理设置", exact: true }).click();
  const browserIntegration = settings
    .locator(".product-settings__integration")
    .filter({ hasText: "浏览器预览" });
  const configure = browserIntegration.getByRole("button", { name: "配置" });
  await configure.click();
  await expect(
    browserIntegration.getByRole("button", { name: "移除" }),
  ).toHaveAttribute("aria-pressed", "true");

  await settings.getByRole("button", { name: "快捷键", exact: true }).click();
  const shortcut = settings.getByRole("button", { name: "修改打开搜索" });
  await shortcut.click();
  await page.keyboard.press("Control+Shift+P");
  await expect(shortcut.locator("kbd")).toHaveText(["Ctrl", "⇧", "P"]);

  await settings.getByRole("button", { name: "安全中心", exact: true }).click();
  await settings.getByRole("button", { name: "管理 1 个路径" }).click();
  await settings
    .getByRole("textbox", { name: "新增受信任路径" })
    .fill("~/Projects");
  await settings.getByRole("button", { name: "添加路径" }).click();
  await expect(settings.getByText("~/Projects", { exact: true })).toBeVisible();

  await settings
    .getByRole("button", { name: "帮助与反馈", exact: true })
    .click();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin,
  });
  await settings.getByRole("button", { name: "复制诊断信息" }).click();
  await expect(settings.getByRole("button", { name: "已复制" })).toBeVisible();

  await settings.getByRole("button", { name: "关闭设置" }).click();
  expect(runtimeErrors).toEqual([]);
});

test("Resource library pages preserve navigation and production connection states", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);
  const resources = [
    ["我的邮箱", "mail"],
    ["协作文档", "documents"],
    ["知识库", "knowledge"],
    ["灵感", "inspiration"],
  ] as const;

  for (const [label, id] of resources) {
    await revealProductNavigation(playground);
    const more = playground.locator(".product-sidebar__more");
    await more.locator("summary").click();
    await more.getByRole("menuitem", { name: label }).click();
    await expect(playground).toHaveAttribute("data-view", "resources");
    await expect(
      playground.locator(
        id === "inspiration"
          ? '[data-product-surface="inspiration"]'
          : `[data-resource="${id}"]`,
      ),
    ).toBeVisible();
  }

  await revealProductNavigation(playground);
  let more = playground.locator(".product-sidebar__more");
  await more.locator("summary").click();
  await more.getByRole("menuitem", { name: "我的邮箱" }).click();
  const mailbox = playground.locator(".product-mail__service");
  const activateMailbox = mailbox.getByRole("button", { name: "确认开通" });
  await expect(activateMailbox).toBeDisabled();
  await mailbox.getByRole("button", { name: "查看说明" }).click();
  await expect(mailbox.locator(".product-mail__details")).toBeVisible();
  await mailbox.getByRole("checkbox").check();
  await expect(activateMailbox).toBeEnabled();
  await activateMailbox.click();
  await expect(mailbox).toHaveAttribute("data-connected", "true");
  await expect(
    mailbox.getByRole("heading", { name: "智能体邮箱已开通" }),
  ).toBeVisible();

  await revealProductNavigation(playground);
  more = playground.locator(".product-sidebar__more");
  await more.locator("summary").click();
  await more.getByRole("menuitem", { name: "协作文档" }).click();
  const connection = playground.locator(".product-connection");
  await connection.getByRole("button", { name: "连接协作文档" }).click();
  await expect(connection).toHaveAttribute("data-connected", "true");
  await expect(
    connection.getByRole("heading", { name: "连接已就绪" }),
  ).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});

test("Product shell mobile drawer, resource menu, and backdrop stay usable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);
  const sidebar = playground.locator(".product-sidebar");
  const menuButton = playground.getByRole("button", {
    name: "打开应用导航",
  });

  await menuButton.click();
  await expect(sidebar).toHaveAttribute("data-mobile-open", "true");
  const more = sidebar.locator(".product-sidebar__more");
  await more.locator("summary").click();
  await expect(more.getByRole("menu")).toBeVisible();
  await more.getByRole("menuitem", { name: "我的文件" }).click();
  await expect(playground).toHaveAttribute("data-view", "resources");
  await expect(sidebar).not.toHaveAttribute("data-mobile-open", "true");
  const fileTable = playground.locator(".product-resources__table");
  await expect(
    fileTable.getByRole("columnheader", { name: "更新时间" }),
  ).toBeVisible();
  expect(
    await fileTable.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBe(0);

  await menuButton.click();
  await playground.getByRole("button", { name: "关闭应用导航" }).last().click();
  await expect(sidebar).not.toHaveAttribute("data-mobile-open", "true");

  await menuButton.click();
  await playground.getByRole("button", { name: "设置", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "设置" });
  await expect(settings).toBeVisible();
  const closeButton = settings.getByRole("button", { name: "关闭设置" });
  await expect(closeButton).toBeVisible();
  const closeStyle = await closeButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      zIndex: Number(style.zIndex),
    };
  });
  expect(closeStyle.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(closeStyle.zIndex).toBeGreaterThan(0);
  await closeButton.click();

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(runtimeErrors).toEqual([]);
});

test("Product project and inspiration surfaces preserve mobile width", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("app/projects.html", { waitUntil: "networkidle" });
  const projects = page.locator('[data-product-surface="projects"]');
  await expect(projects).toBeVisible();
  expect(
    await projects
      .locator(".product-projects__hero")
      .evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBeLessThanOrEqual(0);

  await page.goto("app/resources/inspiration.html", {
    waitUntil: "networkidle",
  });
  const inspiration = page.locator('[data-product-surface="inspiration"]');
  await expect(inspiration).toBeVisible();
  const categories = inspiration.locator(".product-inspiration__categories");
  await expect(categories.getByRole("tab")).toHaveCount(6);
  expect(
    await categories.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBeLessThanOrEqual(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect(runtimeErrors).toEqual([]);
});

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
