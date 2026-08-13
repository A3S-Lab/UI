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

test("Codex Workbench composes one bounded responsive agent workspace", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const preview = await openPattern(page, "codex-workbench");
  const shell = preview.locator(".app-shell");
  const transcript = shell.locator(".agent-transcript");
  const composer = shell.locator("form.agent-composer");

  await expect(shell).toHaveAttribute("data-navigation", "collapsed");
  await expect(transcript).toHaveAccessibleName("Conversation");
  await expect(composer).toHaveAccessibleName("Message the coding agent");
  await expect(shell.locator("details.execution-item")).toHaveCount(1);
  await expect(shell.locator(".approval-request")).toHaveCount(1);
  await expect(shell.locator(".task-pane")).toHaveCount(1);
  await expect(shell.locator("form")).toHaveCount(1);
  const separator = shell.getByRole("separator", {
    name: "Resize conversation and context",
  });
  await expect(separator).toHaveAttribute("tabindex", "0");
  await expect(separator).toHaveAttribute("aria-orientation", "vertical");
  await expect(separator).toHaveAttribute("aria-valuenow", "70");
  await expect(
    preview.locator("span > p, button > p, summary > p"),
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page, preview, shell);

  await page.setViewportSize({ width: 390, height: 844 });
  await shell.evaluate((element) => {
    document.documentElement.classList.add("dark", "rp-dark");
    document.documentElement.dir = "rtl";
    element.dir = "rtl";

    const path = element.querySelector<HTMLElement>(
      ".property-list > div:nth-child(2) dd",
    );
    if (path) {
      path.textContent =
        "\\\\build-server\\agent worktrees\\a3s-ui\\feature\\stream-cancellation\\packages\\ui";
    }
  });

  await expect(shell).toHaveCSS("direction", "rtl");
  await expect(shell.locator("[data-app-main]")).toBeVisible();
  await expect(composer.getByRole("button", { name: "Queue" })).toBeVisible();
  await expectNoHorizontalOverflow(page, preview, shell);
  expect(diagnostics).toEqual([]);
});

test("New Agent Thread keeps one submit boundary across narrow and RTL layouts", async ({
  page,
}) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const preview = await openPattern(page, "new-agent-thread");
  const form = preview.locator("form");
  const composer = form.locator("section.agent-composer");

  await expect(form).toHaveCount(1);
  await expect(form).toHaveAccessibleName("Start a new Agent thread");
  await expect(composer).toHaveCount(1);
  await expect(composer.locator("form")).toHaveCount(0);
  await expect(
    composer.getByRole("textbox", { name: "First instruction" }),
  ).toHaveValue("Add cancellation coverage for the streaming execution path.");
  await expect(form.getByRole("radio")).toHaveCount(3);
  await expect(
    form.getByRole("radio", { name: /Local project/ }),
  ).toBeChecked();
  await expect(
    form.getByRole("button", { name: "Start thread" }),
  ).toBeVisible();
  await expect(
    preview.locator("span > p, button > p, summary > p"),
  ).toHaveCount(0);
  await expectNoHorizontalOverflow(page, preview, form);

  await page.setViewportSize({ width: 390, height: 844 });
  await form.evaluate((element) => {
    document.documentElement.classList.add("dark", "rp-dark");
    document.documentElement.dir = "rtl";
    element.dir = "rtl";

    const option = element.querySelector<HTMLOptionElement>(
      "#new-thread-project option",
    );
    if (option) {
      option.textContent =
        "a3s-ui · \\\\build-server\\agent worktrees\\A3S Lab\\feature stream cancellation\\packages\\ui";
    }
  });

  const environment = form.locator("fieldset");
  const details = form.locator("fieldset + div");
  const [environmentBox, detailsBox] = await Promise.all([
    environment.boundingBox(),
    details.boundingBox(),
  ]);
  expect(environmentBox).not.toBeNull();
  expect(detailsBox).not.toBeNull();
  expect(environmentBox!.y).toBeLessThan(detailsBox!.y);
  await expect(form).toHaveCSS("direction", "rtl");
  await expectNoHorizontalOverflow(page, preview, form);
  expect(diagnostics).toEqual([]);
});
