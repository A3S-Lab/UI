import { expect, test, type Locator, type Page } from "@playwright/test";

async function openButton(page: Page, locale: "en" | "zh" = "en") {
  const localePath =
    locale === "zh" ? "components/button.html" : "en/components/button.html";
  await page.goto(localePath, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html:not([data-a3s-defer-init])")).toBeVisible();
}

function primaryPreview(page: Page) {
  return page
    .locator(
      ".a3s-preview[data-preview-component=button][data-preview-integration=complete]",
    )
    .first();
}

function primaryRegion(page: Page, locale: "en" | "zh" = "en") {
  return primaryPreview(page).locator(`[data-button-primary-demo=${locale}]`);
}

function expectNoOuterRing(boxShadow: string) {
  expect(boxShadow).not.toMatch(
    /0px 0px 0px (?:1px|2px|3px)(?![^,]*\binset\b)/u,
  );
}

async function buttonWidth(button: Locator) {
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  return box!.width;
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

test("Button exposes one real decision context and rejects rapid repeat", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await openButton(page);
  const region = primaryRegion(page);
  const button = region.locator("[data-button-save]");
  const status = region.locator("[data-button-status]");

  await expect(region).toHaveAttribute("aria-labelledby", /.+/u);
  await expect(region).toHaveAttribute("data-button-submissions", "0");
  await expect(region.locator(".btn:not([data-variant])")).toHaveCount(1);
  await expect(button).toHaveAttribute("type", "button");
  await expect(button).toHaveAccessibleName("Save changes");
  await expect(button).toBeEnabled();
  await expect(status).toHaveAttribute("aria-live", "polite");
  await expect(status).toHaveText("Ready to save.");

  const restingBorderColor = await button.evaluate(
    (element) => getComputedStyle(element).borderColor,
  );
  await button.focus();
  const focusVisual = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderColor: style.borderColor,
      boxShadow: style.boxShadow,
      outlineOffset: style.outlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(focusVisual.borderColor).toBe(restingBorderColor);
  expect(focusVisual.outlineStyle).toBe("solid");
  expect(focusVisual.outlineWidth).toBe("2px");
  expect(focusVisual.outlineOffset).toBe("2px");
  expectNoOuterRing(focusVisual.boxShadow);

  const readyWidth = await buttonWidth(button);
  await button.click();
  await expect(region).toHaveAttribute("data-button-save-state", "loading");
  await expect(region).toHaveAttribute("data-button-submissions", "1");
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toHaveAccessibleName("Saving…");
  await expect(status).toHaveText("Saving permission changes…");
  expect(
    Math.abs((await buttonWidth(button)) - readyWidth),
  ).toBeLessThanOrEqual(1);

  await button.evaluate((element) => {
    const control = element as HTMLButtonElement;
    for (let index = 0; index < 10; index += 1) control.click();
  });
  await expect(region).toHaveAttribute("data-button-submissions", "1");

  await expect(status).toHaveText("Permission changes saved.");
  await expect(button).toBeEnabled();
  await expect(button).not.toHaveAttribute("aria-busy", "true");
  await expect(button).toHaveAccessibleName("Save changes");
  expect(
    Math.abs((await buttonWidth(button)) - readyWidth),
  ).toBeLessThanOrEqual(1);

  await button.focus();
  await page.keyboard.press("Enter");
  await expect(region).toHaveAttribute("data-button-submissions", "2");
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(status).toHaveText("Permission changes saved.");

  await button.focus();
  await page.keyboard.press("Space");
  await expect(region).toHaveAttribute("data-button-submissions", "3");
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(status).toHaveText("Permission changes saved.");

  const review = region.getByRole("button", { name: "Review changes" });
  await review.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveText(
    "Reviewer access and deployment approval will change.",
  );

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Button state matrix renders four independent visible and semantic states", async ({
  page,
}) => {
  await openButton(page);
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
    ".a3s-component-state-matrix[open][data-component=button]",
  );
  await expect(matrix).toBeVisible();
  await expect(matrix.locator("[data-state-specimen]")).toHaveCount(4);

  const ready = matrix.locator("[data-state-specimen=ready] .btn");
  const disabled = matrix.locator("[data-state-specimen=disabled] .btn");
  const loading = matrix.locator("[data-state-specimen=loading] .btn");
  const pressed = matrix.locator("[data-state-specimen=pressed] .btn");

  await expect(ready).toHaveText("Save");
  await expect(ready).toBeEnabled();
  await expect(ready).not.toHaveAttribute("aria-busy");
  await expect(ready).not.toHaveAttribute("aria-pressed");
  await expect(disabled).toHaveText("Save");
  await expect(disabled).toBeDisabled();
  await expect(disabled).not.toHaveAttribute("aria-busy");
  await expect(loading).toHaveText("Saving…");
  await expect(loading).toBeDisabled();
  await expect(loading).toHaveAttribute("aria-busy", "true");
  await expect(loading.locator(".animate-spin")).toHaveCount(1);
  await expect(pressed).toHaveText("Pinned");
  await expect(pressed).toBeEnabled();
  await expect(pressed).toHaveAttribute("aria-pressed", "true");
  await expect(pressed.locator("svg[aria-hidden=true]")).toHaveCount(1);

  const widths = await Promise.all(
    [ready, disabled, loading, pressed].map(buttonWidth),
  );
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);

  for (const control of [ready, disabled]) {
    const labelIsContained = await control.evaluate((element) => {
      const label = element.querySelector("span");
      if (!label) return false;
      return (
        label.getBoundingClientRect().height <=
        element.getBoundingClientRect().height
      );
    });
    expect(labelIsContained).toBe(true);
  }

  const disabledActivations = await disabled.evaluate((element) => {
    let activations = 0;
    element.addEventListener("click", () => {
      activations += 1;
    });
    (element as HTMLButtonElement).click();
    return activations;
  });
  expect(disabledActivations).toBe(0);

  const visualStates = await Promise.all(
    [ready, disabled, pressed].map((control) =>
      control.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          opacity: style.opacity,
          transform: style.transform,
        };
      }),
    ),
  );
  expect(visualStates[1].opacity).toBe("1");
  expect(visualStates[2].background).not.toBe(visualStates[0].background);
  expect(visualStates[2].transform).not.toBe(visualStates[0].transform);

  for (const specimen of await matrix
    .locator("[data-state-specimen-mount]")
    .all()) {
    await expect(specimen).toHaveAttribute("dir", "rtl");
    await expect(specimen).toHaveAttribute("data-a3s-theme", "dark");
  }

  await page.keyboard.press("Escape");
  await expect(matrix).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("Button documentation integrates HTML, React, and Vue without inventing a hook", async ({
  page,
}) => {
  await openButton(page);
  const preview = primaryPreview(page);
  await preview.getByRole("button", { name: "Show integration code" }).click();

  const integration = preview.locator(
    "[data-component-integration=button][data-mode=complete]",
  );
  await expect(integration).toBeVisible();
  const tabs = integration
    .getByRole("tablist", { name: "Choose integration" })
    .getByRole("tab");
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveText("HTML");
  await expect(tabs.nth(1)).toHaveText("React");
  await expect(tabs.nth(2)).toHaveText("Vue");

  await expect(integration).toContainText("savePermissionChanges");
  await tabs.nth(1).click();
  await expect(integration).toContainText("useRef");
  await expect(integration).toContainText("pending.current");
  await tabs.nth(2).click();
  await expect(integration).toContainText("if (saving.value) return");
  await expect(integration).not.toContainText("useButton");

  await expect(
    page.getByRole("heading", { name: "React", level: 2 }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Vue", level: 2 }),
  ).toHaveCount(0);
});

test("Button preserves native link navigation and icon-only names", async ({
  page,
}) => {
  await openButton(page);

  const iconButton = page.getByRole("button", { name: "More actions" });
  await expect(iconButton).toHaveAttribute("data-size", "icon");
  await expect(iconButton.locator("svg")).toHaveCount(1);

  const link = page.getByRole("link", { name: "View Button Group" });
  await expect(link).toHaveAttribute("href", "./button-group.html");
  await expect(link).not.toHaveAttribute("role", "button");
  await link.click();
  await expect(page).toHaveURL(/\/en\/components\/button-group\.html$/u);
  await expect(
    page.getByRole("heading", { name: "Button Group", level: 1 }),
  ).toBeVisible();
});

test("Button contains long Chinese and RTL labels with coarse-pointer geometry", async ({
  baseURL,
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  expect(baseURL).toBeTruthy();

  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    viewport: { height: 844, width: 390 },
  });

  try {
    const page = await context.newPage();
    await openButton(page, "zh");
    const preview = primaryPreview(page);
    await preview.getByRole("button", { name: "切换为从右到左布局" }).click();
    await preview.getByRole("button", { name: "切换为深色预览" }).click();

    const region = primaryRegion(page, "zh");
    const actions = region.locator(".flex.flex-wrap.gap-2").last();
    await actions.evaluate((element) => {
      const button = document.createElement("button");
      button.id = "button-long-localized-label";
      button.type = "button";
      button.className = "btn";
      button.dir = "auto";
      button.textContent =
        "保存所有工作区成员的审阅权限、部署审批规则与异常恢复设置";
      element.append(button);
    });

    const save = region.locator("[data-button-save]");
    const longLabel = region.locator("#button-long-localized-label");
    const iconOnly = page.getByRole("button", { name: "更多操作" });
    await save.focus();

    const geometry = await longLabel.evaluate((element) => {
      const buttonBounds = element.getBoundingClientRect();
      const canvas = element.closest<HTMLElement>(".a3s-preview__canvas")!;
      const canvasBounds = canvas.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        buttonHeight: buttonBounds.height,
        buttonInsideCanvas:
          buttonBounds.left >= canvasBounds.left &&
          buttonBounds.right <= canvasBounds.right,
        buttonWidth: buttonBounds.width,
        canvasWidth: canvasBounds.width,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        overflowWrap: style.overflowWrap,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        transitionDuration: style.transitionDuration,
        whiteSpace: style.whiteSpace,
      };
    });
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
      geometry.documentClientWidth + 1,
    );
    expect(geometry.buttonInsideCanvas).toBe(true);
    expect(geometry.buttonWidth).toBeLessThanOrEqual(geometry.canvasWidth + 1);
    expect(geometry.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.whiteSpace).toBe("normal");
    expect(["anywhere", "break-word"]).toContain(geometry.overflowWrap);
    expect(geometry.reducedMotion).toBe(true);
    expect(Number.parseFloat(geometry.transitionDuration)).toBeLessThanOrEqual(
      0.001,
    );

    for (const control of [save, iconOnly]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  } finally {
    await context.close();
  }
});

test("Button exposes system focus and removes nonessential loading motion", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openButton(page);

  const button = primaryRegion(page).locator("[data-button-save]");
  await button.focus();
  const focus = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      boxShadow: style.boxShadow,
      forcedColors: matchMedia("(forced-colors: active)").matches,
      outlineOffset: style.outlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(focus.forcedColors).toBe(true);
  expect(focus.outlineStyle).toBe("solid");
  expect(focus.outlineWidth).toBe("2px");
  expect(focus.outlineOffset).toBe("2px");
  expectNoOuterRing(focus.boxShadow);

  await button.click();
  const spinner = button.locator(".animate-spin");
  await expect(spinner).toBeVisible();
  await expect
    .poll(() =>
      spinner.evaluate((element) => getComputedStyle(element).animationName),
    )
    .toBe("none");
});

test("Button keeps one focus boundary and complete states across compatibility style packs", async ({
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
    <main style="inline-size: 240px; display: grid; gap: 12px; padding: 12px">
      <button id="compat-ready" type="button" class="btn">Save changes</button>
      <button id="compat-long" type="button" class="btn">Publish the localized workspace permission and deployment recovery configuration</button>
      <button id="compat-disabled" type="button" class="btn" disabled>Save changes</button>
      <button id="compat-loading" type="button" class="btn" disabled aria-busy="true"><svg data-icon="inline-start" class="animate-spin" aria-hidden="true" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.22-8.56" /></svg>Saving…</button>
      <button id="compat-pressed" type="button" class="btn" data-variant="secondary" aria-pressed="true">Pinned</button>
      <button id="compat-icon" type="button" class="btn" data-size="icon" aria-label="More actions"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /></svg></button>
    </main>`;

  for (const stylePack of stylePacks) {
    await test.step(stylePack, async () => {
      await page.setContent(markup);
      await page.addStyleTag({
        path: new URL(`../dist/basecoat-${stylePack}.cdn.css`, import.meta.url)
          .pathname,
      });

      const ready = page.locator("#compat-ready");
      const long = page.locator("#compat-long");
      const disabled = page.locator("#compat-disabled");
      const loading = page.locator("#compat-loading");
      const pressed = page.locator("#compat-pressed");
      const icon = page.locator("#compat-icon");
      await expect(icon).toHaveAccessibleName("More actions");
      await expect(disabled).toBeDisabled();
      await expect(loading).toHaveAttribute("aria-busy", "true");
      await expect(pressed).toHaveAttribute("aria-pressed", "true");

      // The stylesheet is injected after the fixture markup, so wait for the
      // initial border/background transitions before comparing focus state.
      await settleElementAnimations(ready);

      const restingBorderColor = await ready.evaluate(
        (element) => getComputedStyle(element).borderColor,
      );
      await ready.focus();
      await settleElementAnimations(ready);
      const metrics = await page.locator("main").evaluate((element) => {
        const read = (selector: string) =>
          getComputedStyle(element.querySelector<HTMLElement>(selector)!);
        const ready = read("#compat-ready");
        const long = element.querySelector<HTMLElement>("#compat-long")!;
        const longStyle = getComputedStyle(long);
        const disabled = read("#compat-disabled");
        const pressed = read("#compat-pressed");
        const readyElement =
          element.querySelector<HTMLElement>("#compat-ready")!;
        return {
          disabledOpacity: disabled.opacity,
          focusBorderColor: ready.borderColor,
          focusBoxShadow: ready.boxShadow,
          focusOutlineStyle: ready.outlineStyle,
          focusOutlineWidth: ready.outlineWidth,
          longClientWidth: long.clientWidth,
          longHeight: long.getBoundingClientRect().height,
          longScrollWidth: long.scrollWidth,
          longWhiteSpace: longStyle.whiteSpace,
          pressedBackground: pressed.backgroundColor,
          pressedTransform: pressed.transform,
          readyBackground: ready.backgroundColor,
          readyTransform: ready.transform,
          readyWidth: readyElement.getBoundingClientRect().width,
        };
      });
      expect(metrics.focusOutlineStyle).toBe("solid");
      expect(
        Number.parseFloat(metrics.focusOutlineWidth),
      ).toBeGreaterThanOrEqual(1);
      expect(metrics.focusBorderColor).toBe(restingBorderColor);
      expectNoOuterRing(metrics.focusBoxShadow);
      expect(metrics.disabledOpacity).toBe("1");
      expect(metrics.longWhiteSpace).toBe("normal");
      expect(metrics.longScrollWidth).toBeLessThanOrEqual(
        metrics.longClientWidth + 1,
      );
      expect(metrics.longHeight).toBeGreaterThan(36);
      expect(metrics.pressedBackground).not.toBe(metrics.readyBackground);
      expect(metrics.pressedTransform).not.toBe(metrics.readyTransform);
      expect(metrics.readyWidth).toBeLessThanOrEqual(240);
    });
  }
});
