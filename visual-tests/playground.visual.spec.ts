import { expect, test, type Locator, type Page } from "@playwright/test";

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
  await page.goto("playground.html", { waitUntil: "networkidle" });
  const application = page.locator(".a3s-product-application");
  await expect(application).toBeVisible();
  await expect(application).toHaveAttribute("data-view", "start");
  await expect(page.locator(".rp-nav")).toHaveCount(0);
  return application;
}

async function expectNeutralSearchBoundary(search: Locator) {
  await search.focus();
  const focusState = await search.evaluate(async (input) => {
    const owner = input.closest<HTMLElement>(
      "[data-focus-owner=container], .input-group",
    );
    if (!owner) throw new Error("Search field has no container focus owner");
    await Promise.all(
      owner
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
    const inputStyle = getComputedStyle(input);
    const ownerStyle = getComputedStyle(owner);
    return {
      input: {
        borderWidth: inputStyle.borderWidth,
        boxShadow: inputStyle.boxShadow,
        outlineStyle: inputStyle.outlineStyle,
      },
      owner: {
        borderColor: ownerStyle.borderColor,
        borderWidth: ownerStyle.borderWidth,
        boxShadow: ownerStyle.boxShadow,
        outlineStyle: ownerStyle.outlineStyle,
      },
    };
  });

  expect(focusState).toEqual({
    input: {
      borderWidth: "0px",
      boxShadow: "none",
      outlineStyle: "none",
    },
    owner: {
      borderColor: "rgb(200, 200, 200)",
      borderWidth: "1px",
      boxShadow: "none",
      outlineStyle: "none",
    },
  });
}

async function revealProductNavigation(playground: Locator) {
  const mobileMenu = playground.getByRole("button", {
    name: "打开应用导航",
  });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
}

async function closeProductNavigation(playground: Locator) {
  const mobileMenu = playground.getByRole("button", {
    name: "关闭应用导航",
  });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
}

async function openPlayground(page: Page) {
  // Playground is the task-first Product Application. The retired editor
  // workspace is deliberately not mounted on this route.
  const playground = await openProductApplication(page);
  await expect(page.locator(".a3s-product-application-page")).toBeVisible();
  await expect(playground.locator(".product-composer").first()).toBeVisible();
  await expect(playground.locator(".a3s-workspace-playground")).toHaveCount(0);
  return playground;
}

test("Product application opens in the approved task shell with complete navigation", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);

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
  // Focus owns the single boundary; it must not add a second halo or change
  // the surface elevation.
  expect(focusedComposerStyle.boxShadow).toBe(idleComposerStyle.boxShadow);
  expect(focusedComposerStyle.borderWidth).toBe("1px");
  expect(focusedComposerStyle.editorOutlineStyle).toBe("none");
  expect(focusedComposerStyle.editorOutlineWidth).toBe("0px");
  await expect(
    playground.locator(".product-start__prompts > button"),
  ).toHaveCount(8);
  await expect(
    playground.getByRole("tab", { name: "日常办公", exact: true }),
  ).toHaveAttribute("aria-selected", "true");

  await revealProductNavigation(playground);
  await expect(
    playground.getByRole("navigation", { name: "主要页面" }),
  ).toBeVisible();
  await closeProductNavigation(playground);

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
  await expect(
    playground.locator('[data-product-surface="files"]'),
  ).toBeVisible();

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
  const globalSearch = search.getByRole("combobox", {
    name: "搜索任务、文件和操作",
  });
  await globalSearch.fill("恢复");
  await search.getByRole("option", { name: /修复会话恢复/ }).click();
  await expect(page).toHaveURL(
    /\/playground\/sessions\/fix-session-recovery\.html$/u,
  );
  await expect(playground).toHaveAttribute("data-view", "session");
  await expect(
    playground.locator('[data-product-surface="session"]'),
  ).toBeVisible();
  await expect(playground.locator(".a3s-workspace-playground")).toHaveCount(0);
  await expect(
    playground.getByRole("heading", { name: "修复会话恢复", exact: true }),
  ).toBeVisible();
  await expect(
    playground.getByRole("region", { name: "工具调用时间线" }),
  ).toBeVisible();
  await expect(
    playground.getByRole("region", { name: "并行检查" }),
  ).toBeVisible();
  await playground
    .locator(".product-session__composer .ProseMirror")
    .fill("继续检查移动端焦点顺序");
  await playground.getByRole("button", { name: "发送任务" }).click();
  await expect(
    playground.getByText("继续检查移动端焦点顺序", { exact: true }),
  ).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});

test("Product searches keep one neutral container-owned focus boundary", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openProductApplication(page);
  await revealProductNavigation(playground);

  await playground.getByRole("button", { name: "搜索", exact: true }).click();
  const searchDialog = page.getByRole("dialog", { name: "全局搜索" });
  await expect(searchDialog).toBeVisible();
  await expectNeutralSearchBoundary(
    searchDialog.getByRole("combobox", {
      name: "搜索任务、文件和操作",
    }),
  );
  await page.keyboard.press("Escape");
  await expect(searchDialog).not.toBeVisible();

  await revealProductNavigation(playground);
  await playground.getByRole("link", { name: "项目", exact: true }).click();
  await expect(playground).toHaveAttribute("data-view", "projects");
  await expectNeutralSearchBoundary(
    playground.getByRole("searchbox", { name: "搜索项目" }),
  );
  expect(runtimeErrors).toEqual([]);
});

test("Automation editor keeps runtime controls inside the composer footer", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("playground/automations.html", { waitUntil: "networkidle" });

  const application = page.locator(".a3s-product-application");
  await expect(application).toHaveAttribute("data-view", "automation");
  await application
    .getByRole("button", { name: "新建自动化", exact: true })
    .click();

  const builder = application.locator(
    '[data-product-surface="automation-builder"]',
  );
  const footer = builder.locator(
    ".product-automation-builder__prompt > footer",
  );
  const runtime = footer.locator(".product-automation-builder__runtime");
  await expect(runtime.locator("[data-runtime-control]")).toHaveCount(5);
  await expect(builder.getByRole("switch")).toHaveCount(2);

  const geometry = await footer.evaluate((element) => {
    const footerRect = element.getBoundingClientRect();
    const runtimeElement = element.querySelector<HTMLElement>(
      ".product-automation-builder__runtime",
    )!;
    const runtimeRect = runtimeElement.getBoundingClientRect();
    const controls = Array.from(
      runtimeElement.querySelectorAll<HTMLElement>("[data-runtime-control]"),
    );
    const icons = Array.from(
      runtimeElement.querySelectorAll<SVGElement>("svg"),
    );
    return {
      controlMaxHeight: Math.max(
        ...controls.map((control) => control.getBoundingClientRect().height),
      ),
      contained:
        runtimeRect.top >= footerRect.top - 1 &&
        runtimeRect.bottom <= footerRect.bottom + 1,
      iconMaxSize: Math.max(
        ...icons.flatMap((icon) => {
          const rect = icon.getBoundingClientRect();
          return [rect.width, rect.height];
        }),
      ),
      runtimeHeight: runtimeRect.height,
    };
  });
  expect(geometry.contained).toBe(true);
  expect(geometry.controlMaxHeight).toBeLessThanOrEqual(36);
  expect(geometry.iconMaxSize).toBeLessThanOrEqual(16);
  expect(geometry.runtimeHeight).toBeLessThanOrEqual(40);

  const model = builder.getByRole("combobox", { name: "模型" });
  await model.focus();
  const focusBoundary = await runtime
    .locator('[data-runtime-control="model"]')
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        boxShadow: style.boxShadow,
        outlineStyle: style.outlineStyle,
      };
    });
  expect(focusBoundary.boxShadow).not.toBe("none");
  expect(focusBoundary.outlineStyle).toBe("none");
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

  await page.goto("en/playground/capabilities.html?capability=skills", {
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

  await expect(page).toHaveURL(
    /\/playground\/sessions\/fix-session-recovery\.html$/u,
  );
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
  await expectNeutralSearchBoundary(conversationSearch);
  await playground.getByRole("button", { name: "关闭会话搜索" }).click();

  const detailsTrigger = playground.locator(
    "button[aria-controls='product-session-details']",
  );
  await expect(detailsTrigger).toHaveAccessibleName("打开任务详情");
  await detailsTrigger.click();
  await expect(page).toHaveURL(
    /\/playground\/sessions\/fix-session-recovery\.html$/u,
  );
  await expect(playground).toHaveAttribute("data-view", "session");
  const details = playground.locator("aside[aria-label='任务详情']");
  await expect(details).toBeVisible();
  await expect(details).not.toHaveAttribute("role", "dialog");
  await expect(detailsTrigger).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(details).not.toBeVisible();
  await expect(detailsTrigger).toBeFocused();

  await detailsTrigger.click();
  await expect(playground.locator(".a3s-workspace-playground")).toHaveCount(0);
  await details.getByRole("tab", { name: "产物" }).click();
  await details.locator(".product-inspector-file-list button").first().click();
  await expect(
    details.locator(".product-inspector-artifacts__preview pre"),
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
  await playground
    .locator('[data-product-surface="assistant"] > header')
    .getByRole("button", { name: "助理设置", exact: true })
    .click();
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
          : id === "knowledge"
            ? ".product-knowledge-library"
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
  await page.reload({ waitUntil: "networkidle" });
  const restoredMailbox = page.locator(".product-mail__service");
  await expect(restoredMailbox).toHaveAttribute("data-connected", "true");
  await expect(
    restoredMailbox.getByRole("heading", { name: "智能体邮箱已开通" }),
  ).toBeVisible();
  await restoredMailbox.getByRole("button", { name: "用于新任务" }).click();
  await expect(playground).toHaveAttribute("data-view", "start");
  await expect(
    playground.locator(
      '[data-composer-resources] [data-resource-id="connector:agent-mailbox"]',
    ),
  ).toContainText("tasks@local.a3s.dev");

  await page.goto("playground/resources/mail.html", {
    waitUntil: "networkidle",
  });
  const persistedMailbox = page.locator(".product-mail__service");
  const disconnect = persistedMailbox.getByRole("button", {
    name: "断开",
    exact: true,
  });
  await disconnect.click();
  const disconnectDialog = page.getByRole("dialog", {
    name: "断开智能体邮箱？",
  });
  await expect(disconnectDialog).toBeVisible();
  await disconnectDialog.getByRole("button", { name: "取消" }).click();
  await expect(disconnect).toBeFocused();
  await disconnect.click();
  await disconnectDialog.getByRole("button", { name: "确认断开" }).click();
  await expect(persistedMailbox).toHaveAttribute("data-connected", "false");
  await expect(
    persistedMailbox.getByRole("button", { name: "确认开通" }),
  ).toBeDisabled();

  await revealProductNavigation(playground);
  more = playground.locator(".product-sidebar__more");
  await more.locator("summary").click();
  await more.getByRole("menuitem", { name: "协作文档" }).click();
  const connection = playground.locator(".product-connection");
  const connectDocuments = connection.getByRole("button", {
    name: "连接协作文档",
  });
  await expect(connectDocuments).toBeDisabled();
  await connection.getByRole("checkbox").check();
  await expect(connectDocuments).toBeEnabled();
  await connectDocuments.click();
  await expect(connection).toHaveAttribute("data-state", "connecting");
  await expect(connection).toHaveAttribute("data-connected", "true");
  await expect(
    connection.getByRole("heading", { name: "协作文档已连接" }),
  ).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  const restoredDocuments = page.locator(".product-connection");
  await expect(restoredDocuments).toHaveAttribute("data-state", "active");
  await restoredDocuments.getByRole("button", { name: "用于新任务" }).click();
  await expect(playground).toHaveAttribute("data-view", "start");
  await expect(
    playground.locator(
      '[data-composer-resources] [data-resource-id="connector:documents"]',
    ),
  ).toContainText("协作文档");

  await page.goto("playground/resources/documents.html", {
    waitUntil: "networkidle",
  });
  const persistedDocuments = page.locator(".product-connection");
  const disconnectDocuments = persistedDocuments.getByRole("button", {
    name: "断开",
    exact: true,
  });
  await disconnectDocuments.click();
  const documentDisconnectDialog = page.getByRole("dialog", {
    name: "断开协作文档？",
  });
  await expect(documentDisconnectDialog).toBeVisible();
  await documentDisconnectDialog.getByRole("button", { name: "取消" }).click();
  await expect(disconnectDocuments).toBeFocused();
  await disconnectDocuments.click();
  await documentDisconnectDialog
    .getByRole("button", { name: "确认断开" })
    .click();
  await expect(persistedDocuments).toHaveAttribute("data-connected", "false");
  await expect(
    persistedDocuments.getByRole("button", { name: "连接协作文档" }),
  ).toBeDisabled();

  expect(runtimeErrors).toEqual([]);
});

test("Mailbox activation remains recoverable when browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (
        key === "a3s-playground-agent-mailbox" ||
        key === "a3s-playground-document-connection"
      ) {
        throw new DOMException("Storage blocked", "SecurityError");
      }
      return nativeSetItem.call(this, key, value);
    };
  });

  await page.goto("playground/resources/mail.html", {
    waitUntil: "networkidle",
  });
  const mailbox = page.locator(".product-mail__service");
  await mailbox.getByRole("checkbox").check();
  await mailbox.getByRole("button", { name: "确认开通" }).click();
  await expect(mailbox).toHaveAttribute("data-connected", "true");
  await expect(mailbox.getByRole("status")).toContainText("浏览器未允许保存");
  await expect(mailbox.getByRole("button", { name: "重试保存" })).toBeVisible();

  await page.goto("playground/resources/documents.html", {
    waitUntil: "networkidle",
  });
  const documents = page.locator(".product-connection");
  await documents.getByRole("checkbox").check();
  await documents.getByRole("button", { name: "连接协作文档" }).click();
  await expect(documents).toHaveAttribute("data-connected", "true");
  await expect(documents.getByRole("status")).toContainText("浏览器未允许保存");
  await expect(
    documents.getByRole("button", { name: "重试保存" }),
  ).toBeVisible();
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
  const fileTable = playground.locator(".product-file-artifacts__table-wrap");
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
    const header = element.closest<HTMLElement>(
      ".product-settings__dialog-header",
    );
    const headerStyle = header ? getComputedStyle(header) : null;
    return {
      background: style.backgroundColor,
      headerPosition: headerStyle?.position ?? "static",
      headerZIndex: Number(headerStyle?.zIndex ?? "auto"),
    };
  });
  expect(closeStyle.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(
    closeStyle.headerPosition === "static" ||
      (closeStyle.headerPosition === "absolute" && closeStyle.headerZIndex > 0),
  ).toBe(true);
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

  await page.goto("playground/projects.html", { waitUntil: "networkidle" });
  const projects = page.locator('[data-product-surface="projects"]');
  await expect(projects).toBeVisible();
  expect(
    await projects
      .locator(".product-projects__hero")
      .evaluate((element) => element.scrollWidth - element.clientWidth),
  ).toBeLessThanOrEqual(0);

  await page.goto("playground/resources/inspiration.html", {
    waitUntil: "networkidle",
  });
  const inspiration = page.locator('[data-product-surface="inspiration"]');
  await expect(inspiration).toBeVisible();
  const categories = inspiration.locator(".product-inspiration__categories");
  await expect(categories.getByRole("button")).toHaveCount(6);
  await expect(
    categories.getByRole("button", { name: "全部", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
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

test("Task artifact actions keep their label on one line at desktop width", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("playground/resources/files.html", {
    waitUntil: "networkidle",
  });
  const artifacts = page.locator(
    '[data-product-surface="files"] .product-file-artifacts',
  );
  await expect(artifacts).toBeVisible();
  const actions = artifacts.locator("[data-artifact-task]");
  await expect(actions).toHaveCount(6);

  const metrics = await actions.evaluateAll((elements) =>
    elements.map((element) => {
      const button = element as HTMLElement;
      const label = button.querySelector<HTMLElement>("span");
      const cell = button.closest<HTMLElement>("td");
      const buttonRect = button.getBoundingClientRect();
      const cellRect = cell?.getBoundingClientRect();
      const labelStyle = label ? getComputedStyle(label) : null;
      return {
        buttonRight: buttonRect.right,
        cellRight: cellRect?.right ?? 0,
        labelHeight: label?.getBoundingClientRect().height ?? 0,
        labelLineHeight: labelStyle
          ? Number.parseFloat(labelStyle.lineHeight)
          : 0,
        whiteSpace: getComputedStyle(button).whiteSpace,
      };
    }),
  );

  for (const metric of metrics) {
    expect(metric.whiteSpace).toBe("nowrap");
    expect(metric.labelHeight).toBeLessThanOrEqual(
      metric.labelLineHeight * 1.1,
    );
    expect(metric.buttonRight).toBeLessThanOrEqual(metric.cellRight + 1);
  }

  await page.screenshot({
    path: testInfo.outputPath("task-artifacts-desktop.png"),
  });
  expect(runtimeErrors).toEqual([]);
});

test("Playground keeps one task-first composition root across its canonical routes", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openPlayground(page);
  await revealProductNavigation(playground);

  await expect(playground).toHaveAttribute("data-view", "start");
  await expect(page.locator(".rp-doc-layout")).toHaveCount(0);
  await expect(page.locator(".workbench-commandbar")).toHaveCount(0);
  await expect(playground.locator(".a3s-workspace-playground")).toHaveCount(0);

  const navigation = playground.getByRole("navigation", { name: "主要页面" });
  for (const label of [
    "新建任务",
    "助理",
    "项目",
    "专家·技能·连接器",
    "自动化",
  ]) {
    const link = navigation.getByRole("link", { name: label, exact: true });
    await expect(link).toHaveAttribute("href", /\/playground(?:\.html|\/)/u);
  }

  await page.goto("playground/sessions/fix-session-recovery.html", {
    waitUntil: "networkidle",
  });
  const session = page.locator(".a3s-product-application");
  await expect(session).toHaveAttribute("data-view", "session");
  await expect(
    session.locator('[data-product-surface="session"]'),
  ).toBeVisible();
  await expect(session.locator(".a3s-workspace-playground")).toHaveCount(0);

  await page.goto("playground/resources/files.html", {
    waitUntil: "networkidle",
  });
  const files = page.locator(".a3s-product-application");
  await expect(files).toHaveAttribute("data-view", "resources");
  await expect(files.locator('[data-product-surface="files"]')).toBeVisible();
  await expect(files.locator(".a3s-workspace-playground")).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

test("Dockview Harness routes keep production panels and working layout actions", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  const routes = [
    {
      route: "dock-workspace",
      mode: "dock",
      action: "浮动预览",
      reset: "重置",
    },
    { route: "grid-view", mode: "grid", action: "聚焦画布", reset: "均衡" },
    { route: "split-view", mode: "split", action: "聚焦画布", reset: "均衡" },
    { route: "pane-view", mode: "pane", action: "全部展开", reset: "全部折叠" },
  ] as const;

  for (const item of routes) {
    await page.goto(`harness/${item.route}.html`, { waitUntil: "networkidle" });
    const demo = page.locator(`.dockview-demo[data-mode="${item.mode}"]`);
    await expect(demo).toBeVisible();
    await expect(demo).toHaveAttribute("data-ready", "true");
    await expect(demo.locator(".dockview-demo__stage")).toBeVisible();
    const action = demo.getByRole("button", { name: item.action, exact: true });
    const reset = demo.getByRole("button", { name: item.reset, exact: true });
    await expect(action).toBeEnabled();
    await action.click();
    if (item.mode === "dock") {
      await expect(demo).toHaveAttribute("data-preview-location", "floating");
    } else if (item.mode === "grid" || item.mode === "split") {
      await expect(demo).toHaveAttribute("data-layout-preset", "focus-canvas");
    } else {
      await expect(demo).toHaveAttribute("data-pane-expansion", "expanded");
    }
    await reset.click();
    if (item.mode === "dock") {
      await expect(demo).toHaveAttribute("data-preview-location", "docked");
    } else if (item.mode === "grid" || item.mode === "split") {
      await expect(demo).toHaveAttribute("data-layout-preset", "balanced");
    } else {
      await expect(demo).toHaveAttribute("data-pane-expansion", "collapsed");
    }
    await expect(
      page.locator(`.a3s-preview[data-preview-component="${item.route}"]`),
    ).toBeVisible();
  }
  expect(runtimeErrors).toEqual([]);
});

test("Device simulator in the session inspector preserves hardware and viewport state", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("playground/sessions/fix-session-recovery.html", {
    waitUntil: "networkidle",
  });
  const application = page.locator(".a3s-product-application");
  await application.getByRole("button", { name: "打开任务详情" }).click();
  const details = page.locator('aside[aria-label="任务详情"]');
  await details.getByRole("tab", { name: "预览", exact: true }).click();

  const device = details.locator(".product-session-device-simulator");
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
  await device.getByRole("button", { name: "打开完整设备模拟器" }).click();
  await expect(device).not.toHaveAttribute("data-variant", "compact");
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

test("Task-first Playground remains bounded and readable at phone width", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = collectRuntimeErrors(page);
  const playground = await openPlayground(page);
  const menuButton = playground.getByRole("button", { name: "打开应用导航" });
  await menuButton.click();
  await expect(playground.locator(".product-sidebar")).toHaveAttribute(
    "data-mobile-open",
    "true",
  );
  await page.goto("playground/sessions/fix-session-recovery.html", {
    waitUntil: "networkidle",
  });
  await expect(playground).toHaveAttribute("data-view", "session");
  await expect(playground.locator(".product-session__viewport")).toBeVisible();
  await expect(playground.locator(".product-session__composer")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  const metrics = await playground.evaluate((element) => {
    const transcript = element.querySelector<HTMLElement>(
      ".product-session__viewport",
    );
    const composer = element.querySelector<HTMLElement>(
      ".product-session__composer",
    );
    return {
      width: element.getBoundingClientRect().width,
      transcriptOverflow: transcript
        ? transcript.scrollWidth - transcript.clientWidth
        : -1,
      composerBottom: composer?.getBoundingClientRect().bottom ?? 0,
    };
  });
  expect(metrics.width).toBeLessThanOrEqual(390);
  expect(metrics.transcriptOverflow).toBe(0);
  expect(metrics.composerBottom).toBeLessThanOrEqual(844);
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
  ] as const) {
    await page.goto(`harness/${route}.html`, { waitUntil: "networkidle" });
    await expect(
      page.locator(
        `.dockview-demo[data-mode="${route === "dock-workspace" ? "dock" : route.replace("-view", "")}"]`,
      ),
    ).toBeVisible();
    const preview = page
      .locator(`.a3s-preview[data-preview-component="${route}"]`)
      .first();
    await expect(preview).toBeVisible();
    await preview.getByRole("button", { name: "展开接入代码" }).click();
    const integration = preview.locator(
      ".a3s-preview__source > .a3s-preview-integration",
    );
    await expect(integration).toBeVisible();
    await expect(
      integration.locator(".a3s-preview-integration__tabs").getByRole("tab"),
    ).toHaveCount(3);
    const framework = route === "grid-view" ? "Vue" : "React";
    await integration
      .getByRole("tab", { name: framework, exact: true })
      .click();
    await expect(
      integration.locator(
        ".a3s-preview-integration__source:not([hidden]) code",
      ),
    ).toContainText(/use(?:DockviewLayout|Gridview|Splitview|Paneview)/u);
  }
  expect(runtimeErrors).toEqual([]);
});
