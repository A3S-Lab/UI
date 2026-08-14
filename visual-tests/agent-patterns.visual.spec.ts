import { expect, test, type Locator, type Page } from "@playwright/test";

async function openPattern(page: Page, pattern: string) {
  await page.goto(`en/patterns/${pattern}.html`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");

  const preview = page.locator(".a3s-preview").first();
  await expect(preview).toBeVisible();
  return preview;
}

async function expectNoHorizontalOverflow(page: Page, ...elements: Locator[]) {
  const documentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(documentOverflow).toBeLessThanOrEqual(0);

  for (const element of elements) {
    const overflow = await element.evaluate(
      (node) => node.scrollWidth - node.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
}

function collectBrowserDiagnostics(page: Page) {
  const diagnostics: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      diagnostics.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  return diagnostics;
}

test("Task Workspace composes one bounded responsive task surface", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const preview = await openPattern(page, "task-workspace");
  const shell = preview.locator(".app-shell");
  const transcript = shell.locator(".agent-transcript");
  const composer = shell.locator("form.agent-composer");

  await expect(shell).toHaveAttribute("data-navigation", "expanded");
  await expect(transcript).toHaveAccessibleName("Task transcript");
  await expect(composer).toHaveAccessibleName("Follow up");
  await expect(shell.locator("details.execution-item")).toHaveCount(1);
  await expect(shell.locator(".task-plan")).toHaveCount(1);
  await expect(shell.locator(".plan-step")).toHaveCount(4);
  await expect(shell.locator(".message-status")).toHaveCount(3);
  await expect(shell.locator(".message-attachment")).toHaveCount(1);
  await expect(shell.locator(".message-citation")).toHaveCount(1);
  await expect(shell.locator("details.tool-call")).toHaveCount(1);
  await expect(shell.locator(".terminal")).toHaveCount(1);
  await expect(shell.locator(".execution-evidence")).toHaveCount(1);
  await expect(shell.locator(".artifact-card")).toHaveCount(1);
  await expect(shell.locator(".follow-up-suggestions")).toHaveCount(1);
  await expect(shell.locator(".approval-request")).toHaveCount(1);
  await expect(shell.locator(".task-pane")).toHaveCount(1);
  await expect(shell.locator(".context-selector")).toHaveCount(3);
  await expect(shell.locator(".task-queue")).toHaveCount(1);
  await expect(shell.locator(".checkpoint")).toHaveCount(1);
  await expect(shell.locator(".change-review")).toHaveCount(1);
  await expect(shell.locator("form")).toHaveCount(1);
  await expect(
    preview.locator("span > p, button > p, summary > p"),
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page, preview, shell);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(shell.locator("[data-app-navigation]")).toHaveAttribute(
    "inert",
    "",
  );
  await expect(shell.locator("[data-app-navigation]")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await expect(shell.locator("[data-task-inspector]")).toHaveCSS(
    "visibility",
    "hidden",
  );
  const inspectorToggle = shell.getByRole("button", { name: "Context" });
  await expect(inspectorToggle).toHaveAttribute("aria-expanded", "false");
  await inspectorToggle.click();
  const workspace = shell.locator(".task-workspace");
  await expect(workspace).toHaveAttribute("data-inspector", "open");
  await expect(shell.locator("[data-task-inspector]")).not.toHaveAttribute(
    "inert",
    "",
  );
  await page.keyboard.press("Escape");
  await expect(workspace).not.toHaveAttribute("data-inspector", "open");
  await expect(inspectorToggle).toBeFocused();
  await shell.evaluate((element) => {
    document.documentElement.classList.add("dark", "rp-dark");
    document.documentElement.dir = "rtl";
    element.dir = "rtl";

    const path = element.querySelector<HTMLElement>(
      "[data-task-inspector] .item:last-of-type h3",
    );
    if (path) {
      path.textContent =
        "\\\\build-server\\task-workspaces\\a3s-ui\\feature\\stream-cancellation\\packages\\ui";
    }
  });

  await expect(shell).toHaveCSS("direction", "rtl");
  await expect(shell.locator("[data-app-main]")).toBeVisible();
  await expect(composer.getByRole("button", { name: "Send" })).toBeVisible();
  await expectNoHorizontalOverflow(page, preview, shell);
  expect(diagnostics).toEqual([]);
});

test("New Task keeps one submit boundary across narrow and RTL layouts", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const preview = await openPattern(page, "new-task");
  const form = preview.locator("form");
  const composer = form.locator("textarea");

  await expect(form).toHaveCount(1);
  await expect(form).toHaveAccessibleName("Start a new task");
  await expect(composer).toHaveCount(1);
  await expect(form.getByRole("textbox", { name: "Instruction" })).toHaveValue(
    "",
  );
  await expect(form.getByRole("button", { name: "Start" })).toBeVisible();
  await expect(
    preview.locator("span > p, button > p, summary > p"),
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page, preview, form);

  await page.setViewportSize({ width: 390, height: 844 });
  await form.evaluate((element) => {
    document.documentElement.classList.add("dark", "rp-dark");
    document.documentElement.dir = "rtl";
    element.dir = "rtl";

    const suggestion = element
      .closest(".task-start")
      ?.querySelector<HTMLElement>(
        "[data-task-suggestions] button:first-of-type",
      );
    if (suggestion) {
      suggestion.textContent =
        "Analyze \\\\build-server\\task-workspaces\\A3S Lab\\feature stream cancellation\\packages\\ui";
    }
  });

  await expect(form).toHaveCSS("direction", "rtl");
  await expectNoHorizontalOverflow(page, preview, form);
  expect(diagnostics).toEqual([]);
});

test("Capability Catalog keeps tabs, filters, and resources bounded", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const preview = await openPattern(page, "capability-catalog");
  const catalog = preview.locator(".catalog");
  const tablist = catalog.getByRole("tablist", { name: "Capability type" });
  const assistants = tablist.getByRole("tab", { name: "Assistants" });
  const skills = tablist.getByRole("tab", { name: "Skills" });

  await expect(tablist.getByRole("tab")).toHaveCount(3);
  await expect(assistants).toHaveAttribute("aria-selected", "true");
  await skills.click();
  await expect(skills).toHaveAttribute("aria-selected", "true");
  await expect(assistants).toHaveAttribute("aria-selected", "false");
  await expect(
    catalog.locator("[data-catalog-results] .resource-card"),
  ).toHaveCount(6);
  await expectNoHorizontalOverflow(page, preview, catalog);

  await page.setViewportSize({ width: 320, height: 844 });
  await catalog.evaluate((element) => {
    document.documentElement.classList.add("dark", "rp-dark");
    document.documentElement.dir = "rtl";
    element.dir = "rtl";

    const resource = element.querySelector<HTMLElement>(
      "[data-catalog-results] .resource-card strong",
    );
    if (resource) {
      resource.textContent =
        "Repository release readiness and dependency review workspace";
    }
  });

  await expect(catalog).toHaveCSS("direction", "rtl");
  await expectNoHorizontalOverflow(page, preview, catalog);
  expect(diagnostics).toEqual([]);
});

test("Settings Center keeps native controls reachable at 320px", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const preview = await openPattern(page, "settings-center");
  const dialog = preview.getByRole("dialog", { name: "Settings" });
  const settings = dialog.locator(".settings-layout");

  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(
    settings.getByRole("navigation", { name: "Settings sections" }),
  ).toBeVisible();
  await expect(
    settings.getByRole("combobox", { name: "Language" }),
  ).toBeVisible();
  await expect(
    settings.getByRole("switch", { name: "Follow system theme" }),
  ).toBeChecked();
  await expect(settings.locator(".setting-row")).toHaveCount(5);
  await expectNoHorizontalOverflow(page, preview, dialog, settings);

  await page.setViewportSize({ width: 320, height: 844 });
  await dialog.evaluate((element) => {
    document.documentElement.classList.add("dark", "rp-dark");
    document.documentElement.dir = "rtl";
    element.dir = "rtl";
  });

  await expect(dialog).toHaveCSS("direction", "rtl");
  await expect(
    settings.getByRole("button", { name: "Change location" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, preview, dialog, settings);
  expect(diagnostics).toEqual([]);
});

test("Projects preserves search, existing context, and templates", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const preview = await openPattern(page, "projects");
  const pageSurface = preview.locator(".app-page");

  await expect(
    pageSurface.getByRole("searchbox", { name: "Search projects" }),
  ).toBeVisible();
  await expect(pageSurface.locator("article.resource-card")).toHaveCount(2);
  await expect(pageSurface.locator("button.resource-card")).toHaveCount(3);
  await expectNoHorizontalOverflow(page, preview, pageSurface);

  await page.setViewportSize({ width: 320, height: 844 });
  await pageSurface.evaluate((element) => {
    document.documentElement.classList.add("dark", "rp-dark");
    document.documentElement.dir = "rtl";
    element.dir = "rtl";

    const project = element.querySelector<HTMLElement>(
      "article.resource-card strong",
    );
    if (project) {
      project.textContent =
        "Internationalized release coordination and evidence workspace";
    }
  });

  await expect(pageSurface).toHaveCSS("direction", "rtl");
  await expectNoHorizontalOverflow(page, preview, pageSurface);
  expect(diagnostics).toEqual([]);
});

test("Automations contains schedules while run history scrolls locally", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const preview = await openPattern(page, "automations");
  const pageSurface = preview.locator(".app-page");
  const runHistory = pageSurface.locator(".table-container");

  await expect(pageSurface.locator(".item-group > .item")).toHaveCount(2);
  await expect(pageSurface.locator("tbody > tr")).toHaveCount(2);
  await expect(pageSurface.locator("button.resource-card")).toHaveCount(2);
  await expect(runHistory).toHaveCSS("overflow-x", "auto");
  await expectNoHorizontalOverflow(page, preview, pageSurface);

  await page.setViewportSize({ width: 320, height: 844 });
  await pageSurface.evaluate((element) => {
    document.documentElement.classList.add("dark", "rp-dark");
    document.documentElement.dir = "rtl";
    element.dir = "rtl";

    const schedule = element.querySelector<HTMLElement>(".item h4");
    if (schedule) {
      schedule.textContent =
        "Weekly international release evidence and dependency report";
    }
  });

  await expect(pageSurface).toHaveCSS("direction", "rtl");
  await expectNoHorizontalOverflow(page, preview, pageSurface);
  expect(diagnostics).toEqual([]);
});
