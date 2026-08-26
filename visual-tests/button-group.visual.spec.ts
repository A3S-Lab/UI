import { expect, test, type Locator, type Page } from "@playwright/test";

async function openButtonGroup(page: Page, locale: "en" | "zh" = "en") {
  const localePath =
    locale === "zh"
      ? "components/button-group.html"
      : "en/components/button-group.html";
  await page.goto(localePath, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html:not([data-a3s-defer-init])")).toBeVisible();
}

function primaryPreview(page: Page) {
  return page
    .locator(
      ".a3s-preview[data-preview-component=button-group][data-preview-integration=complete]",
    )
    .first();
}

function primaryGroup(page: Page, locale: "en" | "zh" = "en") {
  return primaryPreview(page).locator(
    `[data-button-group-primary-demo=${locale}] [data-button-group-actions]`,
  );
}

function expectNoOuterRing(boxShadow: string) {
  expect(boxShadow).not.toMatch(
    /0px 0px 0px (?:1px|2px|3px)(?![^,]*\binset\b)/u,
  );
}

async function settleElementAnimations(element: Locator) {
  await element.evaluate(async (node) => {
    await Promise.all(
      node
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

test("Button Group exposes one named cluster and preserves native child activation", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await openButtonGroup(page);
  const region = primaryPreview(page).locator(
    "[data-button-group-primary-demo=en]",
  );
  const group = primaryGroup(page);
  const status = region.locator("[data-button-group-status]");
  const buttons = group.getByRole("button");

  await expect(group).toHaveAttribute("role", "group");
  await expect(group).toHaveAccessibleName("Message actions");
  await expect(group).toHaveAttribute("data-a3s-components", /button-group/u);
  await expect(buttons).toHaveCount(3);
  await expect(buttons.nth(0)).toHaveAccessibleName("Archive");
  await expect(buttons.nth(1)).toHaveAccessibleName("Snooze");
  await expect(buttons.nth(2)).toHaveAccessibleName("Mark unread");
  await expect(buttons.nth(0)).toHaveAttribute("data-a3s-parts", /action/u);
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveText("No message action selected.");

  await buttons.nth(0).click();
  await expect(status).toHaveText("Message archived.");
  await buttons.nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("Snooze options requested.");
  await buttons.nth(2).focus();
  await page.keyboard.press("Space");
  await expect(status).toHaveText("Message marked as unread.");

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Button Group keeps joined geometry and one child focus outline", async ({
  page,
}) => {
  await openButtonGroup(page);
  const preview = primaryPreview(page);
  const group = primaryGroup(page);
  const archive = group.getByRole("button", { name: "Archive" });

  for (const theme of ["light", "dark"] as const) {
    await test.step(theme, async () => {
      await page.evaluate((value) => window.a3sUI.theme.set(value), theme);
      await settleElementAnimations(archive);
      const restingBorderColor = await archive.evaluate(
        (element) => getComputedStyle(element).borderColor,
      );
      await archive.focus();
      await settleElementAnimations(archive);

      const metrics = await group.evaluate((element) => {
        const controls = [
          ...element.querySelectorAll<HTMLElement>(":scope > .btn"),
        ];
        const boxes = controls.map((control) =>
          control.getBoundingClientRect(),
        );
        const focused = getComputedStyle(controls[0]);
        const root = getComputedStyle(element);
        return {
          borderColor: focused.borderColor,
          boxShadow: focused.boxShadow,
          groupBoxShadow: root.boxShadow,
          groupOutlineStyle: root.outlineStyle,
          heightDelta:
            Math.max(...boxes.map((box) => box.height)) -
            Math.min(...boxes.map((box) => box.height)),
          outlineOffset: focused.outlineOffset,
          outlineStyle: focused.outlineStyle,
          outlineWidth: focused.outlineWidth,
          seams: boxes
            .slice(1)
            .map((box, index) => box.left - boxes[index].right),
          zIndex: focused.zIndex,
        };
      });

      expect(metrics.borderColor).toBe(restingBorderColor);
      expect(metrics.outlineStyle).toBe("solid");
      expect(metrics.outlineWidth).toBe("2px");
      expect(metrics.outlineOffset).toBe("2px");
      expectNoOuterRing(metrics.boxShadow);
      expect(metrics.groupBoxShadow).toBe("none");
      expect(metrics.groupOutlineStyle).toBe("none");
      expect(metrics.heightDelta).toBeLessThanOrEqual(1);
      expect(metrics.seams.every((gap) => Math.abs(gap) <= 1)).toBe(true);
      expect(Number.parseInt(metrics.zIndex, 10)).toBeGreaterThanOrEqual(1);
    });
  }

  await expect(preview).toHaveScreenshot("button-group-primary-office.png");
});

test("Button Group composes a split menu with deterministic focus return", async ({
  page,
}) => {
  await openButtonGroup(page);
  const splitPreview = page
    .locator(".a3s-preview[data-preview-component=button-group]")
    .nth(2);
  const trigger = page.locator("#button-group-publish-trigger-en");
  const popover = page.locator("#button-group-publish-popover-en");
  const status = page.locator("[data-button-group-split-status]");

  await expect(trigger).toHaveAccessibleName("Choose publishing method");
  await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(popover).toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(trigger).toHaveAttribute(
    "aria-activedescendant",
    "button-group-publish-schedule-en",
  );
  await expect(
    popover.getByRole("menuitem", { name: "Schedule publication" }),
  ).toHaveClass(/\bactive\b/u);
  await expect(splitPreview).toHaveScreenshot(
    "button-group-split-menu-office.png",
  );

  await page.keyboard.press("Escape");
  await expect(popover).not.toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(status).toHaveText("Publishing requested.");
});

test("Button Group state matrix disables children without fabricating a disabled root", async ({
  page,
}) => {
  await openButtonGroup(page);
  const preview = primaryPreview(page);
  await preview
    .getByRole("button", { name: "Preview right-to-left layout" })
    .click();
  await preview.getByRole("button", { name: "Preview in dark mode" }).click();

  const trigger = preview.getByRole("button", {
    name: "View state acceptance matrix",
  });
  await trigger.click();
  const matrix = page.locator(
    ".a3s-component-state-matrix[open][data-component=button-group]",
  );
  await expect(matrix).toBeVisible();
  await expect(matrix.locator("[data-state-specimen]")).toHaveCount(2);

  const ready = matrix.locator(
    "[data-state-specimen=ready] [data-state-specimen-root=ready]",
  );
  const disabled = matrix.locator(
    "[data-state-specimen=disabled] [data-state-specimen-root=disabled]",
  );
  await expect(ready).toHaveAttribute("role", "group");
  await expect(ready.getByRole("button")).toHaveCount(3);
  await expect(disabled).not.toHaveAttribute("aria-disabled");
  await expect(disabled.getByRole("button")).toHaveCount(3);
  for (const button of await disabled.getByRole("button").all()) {
    await expect(button).toBeDisabled();
  }
  for (const mount of await matrix
    .locator("[data-state-specimen-mount]")
    .all()) {
    await expect(mount).toHaveAttribute("dir", "rtl");
    await expect(mount).toHaveAttribute("data-a3s-theme", "dark");
  }

  await expect(matrix).toHaveScreenshot("button-group-states-office.png");
  await page.keyboard.press("Escape");
  await expect(matrix).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("Button Group integrates HTML, React, and Vue without inventing a component hook", async ({
  page,
}) => {
  await openButtonGroup(page);
  const preview = primaryPreview(page);
  await preview.getByRole("button", { name: "Show integration code" }).click();

  const integration = preview.locator(
    "[data-component-integration=button-group][data-mode=complete]",
  );
  const tabs = integration
    .getByRole("tablist", { name: "Choose integration" })
    .getByRole("tab");
  await expect(integration).toBeVisible();
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveText("HTML");
  await expect(tabs.nth(1)).toHaveText("React");
  await expect(tabs.nth(2)).toHaveText("Vue");
  await expect(integration).toContainText("data-message-actions");

  await tabs.nth(1).click();
  await expect(integration).toContainText("useState");
  await expect(integration).toContainText("ButtonGroup");
  await tabs.nth(2).click();
  await expect(integration).toContainText('ref("No message action selected.")');
  await expect(integration).not.toContainText("useButtonGroup");
  await expect(
    page.getByRole("heading", { name: "React", level: 2 }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Vue", level: 2 }),
  ).toHaveCount(0);
});

test("Button Group contains localized long labels on a phone and preserves RTL order", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  await openButtonGroup(page, "zh");

  const preview = page
    .locator(".a3s-preview[data-preview-component=button-group]")
    .nth(3);
  await preview.getByRole("button", { name: "切换为从右到左布局" }).click();
  await preview.getByRole("button", { name: "切换为深色预览" }).click();
  const group = preview.locator("[data-button-group-long-labels=zh]");
  const buttons = group.locator(":scope > .btn");

  const geometry = await group.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const canvasBounds = element
      .closest<HTMLElement>(".a3s-preview__canvas")!
      .getBoundingClientRect();
    const children = [
      ...element.querySelectorAll<HTMLElement>(":scope > .btn"),
    ];
    const boxes = children.map((child) => child.getBoundingClientRect());
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      firstAtInlineStart: boxes[0].right > boxes[1].right,
      groupInsideCanvas:
        bounds.left >= canvasBounds.left - 1 &&
        bounds.right <= canvasBounds.right + 1,
      heightDelta:
        Math.max(...boxes.map((box) => box.height)) -
        Math.min(...boxes.map((box) => box.height)),
    };
  });
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
    geometry.documentClientWidth + 1,
  );
  expect(geometry.groupInsideCanvas).toBe(true);
  expect(geometry.heightDelta).toBeLessThanOrEqual(1);
  expect(geometry.firstAtInlineStart).toBe(true);
  await expect(buttons.nth(1)).toBeDisabled();
  await expect(
    page.locator("#button-group-production-reason-zh"),
  ).toHaveAttribute("dir", "auto");
  await expect(buttons.nth(1)).toHaveAccessibleDescription(
    "安全审阅通过后才能部署到生产环境。",
  );
  await expect(preview).toHaveScreenshot(
    "button-group-phone-dark-rtl-office.png",
  );
});

test("Button Group keeps containment and one focus boundary across compatibility styles", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  const stylePacks = [
    "vega",
    "nova",
    "maia",
    "lyra",
    "mira",
    "luma",
    "sera",
    "rhea",
  ] as const;
  const markup = `
    <main style="inline-size: 240px; padding: 16px">
      <div id="compat-group" role="group" aria-label="Release actions" class="button-group">
        <button id="compat-first" type="button" class="btn" data-size="sm" data-variant="outline">Request security review</button>
        <button id="compat-disabled" type="button" class="btn" data-size="sm" data-variant="outline" disabled>Deploy to production</button>
        <button id="compat-last" type="button" class="btn" data-size="sm" data-variant="outline">Save for later</button>
      </div>
    </main>`;

  for (const stylePack of stylePacks) {
    await test.step(stylePack, async () => {
      await page.setContent(markup);
      await page.addStyleTag({
        path: new URL(`../dist/basecoat-${stylePack}.cdn.css`, import.meta.url)
          .pathname,
      });
      const group = page.locator("#compat-group");
      const first = page.locator("#compat-first");
      await settleElementAnimations(first);
      const restingBorderColor = await first.evaluate(
        (element) => getComputedStyle(element).borderColor,
      );
      await first.focus();
      await settleElementAnimations(first);

      const metrics = await group.evaluate((element) => {
        const controls = [
          ...element.querySelectorAll<HTMLElement>(":scope > .btn"),
        ];
        const boxes = controls.map((control) =>
          control.getBoundingClientRect(),
        );
        const groupBounds = element.getBoundingClientRect();
        const focused = getComputedStyle(controls[0]);
        return {
          borderColor: focused.borderColor,
          boxShadow: focused.boxShadow,
          groupWidth: groupBounds.width,
          heightDelta:
            Math.max(...boxes.map((box) => box.height)) -
            Math.min(...boxes.map((box) => box.height)),
          outlineStyle: focused.outlineStyle,
          outlineWidth: focused.outlineWidth,
          seams: boxes
            .slice(1)
            .map((box, index) => box.left - boxes[index].right),
        };
      });
      expect(metrics.borderColor).toBe(restingBorderColor);
      expect(metrics.outlineStyle).toBe("solid");
      expect(Number.parseFloat(metrics.outlineWidth)).toBeGreaterThanOrEqual(1);
      expectNoOuterRing(metrics.boxShadow);
      expect(metrics.groupWidth).toBeLessThanOrEqual(240);
      expect(metrics.heightDelta).toBeLessThanOrEqual(1);
      expect(metrics.seams.every((gap) => Math.abs(gap) <= 1)).toBe(true);
      await expect(page.locator("#compat-disabled")).toBeDisabled();
    });
  }
});
