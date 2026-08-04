import { expect, test, type Page } from "@playwright/test";

async function openDocumentationPage(page: Page, route: string) {
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
}

test("Office-derived workbench shell", async ({ page }) => {
  await openDocumentationPage(page, "en/");

  const specimen = page.locator(".ui-workbench-frame");
  await expect(specimen).toBeVisible();
  await expect(specimen.locator(".app-shell")).toHaveCount(1);
  await expect(specimen.locator(".ribbon")).toHaveCount(1);
  await expect(specimen.locator(".resource-card")).toHaveCount(3);
  await expect(specimen.locator(".task-pane")).toHaveCount(1);
  await expect(specimen.locator(".status-bar")).toHaveCount(1);

  const shell = specimen.locator(".app-shell");
  const main = shell.locator(":scope > [data-app-main]");
  const [shellBox, mainBox] = await Promise.all([
    shell.boundingBox(),
    main.boundingBox(),
  ]);
  expect(shellBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(mainBox!.width).toBeGreaterThan(shellBox!.width * 0.75);
  await expect(specimen).toHaveScreenshot("office-workbench.png");

  const resourceCards = specimen.locator(".resource-card");
  await resourceCards.first().click();
  await expect(resourceCards.first()).toHaveAttribute("aria-pressed", "true");
  await expect(resourceCards.nth(2)).toHaveAttribute("aria-pressed", "false");
  await expect(specimen.locator("#ui-specimen-resource")).toHaveValue(
    "Document",
  );

  const insertTab = specimen.getByRole("tab", { name: "Insert" });
  await insertTab.focus();
  await insertTab.press("ArrowRight");
  await expect(specimen.getByRole("tab", { name: "Layout" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

for (const [name, route, selector] of [
  ["ribbon", "en/components/ribbon.html", ".ribbon"],
  ["task-pane", "en/components/task-pane.html", ".task-pane"],
  ["status-bar", "en/components/status-bar.html", ".status-bar"],
] as const) {
  test(`${name} application pattern`, async ({ page }) => {
    await openDocumentationPage(page, route);

    const preview = page.locator(".a3s-preview").first();
    const pattern = preview.locator(selector);
    await expect(pattern).toBeVisible();

    if (name === "ribbon") {
      await expect(pattern.locator(":scope > [role=tablist]")).toHaveCSS(
        "display",
        "flex",
      );
      expect(
        await pattern
          .locator(":scope > [role=tablist] > [role=tab]")
          .first()
          .evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).paddingInlineStart),
          ),
      ).toBeGreaterThanOrEqual(8);
    }
    if (name === "task-pane") {
      const heading = pattern.locator(":scope > header > h2");
      expect(
        await heading.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ),
      ).toBeLessThanOrEqual(14);
      expect(
        await pattern
          .locator(":scope > footer > .btn")
          .first()
          .evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).paddingInlineStart),
          ),
      ).toBeGreaterThanOrEqual(8);
    }
    if (name === "status-bar") {
      expect((await pattern.boundingBox())!.height).toBeLessThanOrEqual(32);
    }
    await expect(preview).toHaveScreenshot(`${name}.png`);
  });
}
