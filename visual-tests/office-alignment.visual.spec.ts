import { expect, test, type Page } from "@playwright/test";

async function openDocumentationPage(page: Page, route: string) {
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
}

async function waitForDocumentationHydration(page: Page) {
  await expect(page.locator(".rp-switch-appearance").first()).toHaveAttribute(
    "role",
    "button",
  );
}

async function waitForSettledBrowserFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      }),
  );
}

async function readThemeTextContrast(page: Page) {
  return page.evaluate(() => {
    const toRgb = (value: string) =>
      value
        .trim()
        .slice(1)
        .match(/../g)!
        .map((part) => Number.parseInt(part, 16));
    const luminance = (value: string) => {
      const [red, green, blue] = toRgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const contrast = (foreground: string, background: string) => {
      const foregroundLuminance = luminance(foreground);
      const backgroundLuminance = luminance(background);
      return (
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
      );
    };
    const styles = getComputedStyle(document.documentElement);
    const canvas = styles.getPropertyValue("--ui-canvas");

    return {
      faint: contrast(styles.getPropertyValue("--ui-faint"), canvas),
      muted: contrast(styles.getPropertyValue("--ui-muted"), canvas),
    };
  });
}

async function expectPreviewOverlayToEscapeFrame(
  page: Page,
  route: string,
  triggerSelector: string,
) {
  await openDocumentationPage(page, route);

  const preview = page.locator(".a3s-preview").first();
  const popover = preview.locator("[data-popover]").first();
  await page.locator(triggerSelector).first().click();
  await expect(popover).toHaveAttribute("aria-hidden", "false");
  await expect(popover).toHaveCSS("opacity", "1");
  await expect(preview).toHaveAttribute("data-overlay-open", "");
  await expect(preview).toHaveCSS("overflow", "visible");
  await expect(preview).toHaveCSS("z-index", "100");
  await expect(page.locator(".rp-doc-layout__doc")).toHaveCSS(
    "overflow",
    "visible",
  );

  const [previewBox, popoverBox] = await Promise.all([
    preview.boundingBox(),
    popover.boundingBox(),
  ]);
  expect(previewBox).not.toBeNull();
  expect(popoverBox).not.toBeNull();
  expect(popoverBox!.y + popoverBox!.height).toBeGreaterThan(
    previewBox!.y + previewBox!.height,
  );

  const popoverOwnsBottomPoint = await popover.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const pointElement = document.elementFromPoint(
      Math.min(window.innerWidth - 1, rect.left + rect.width / 2),
      Math.min(window.innerHeight - 1, rect.bottom - 2),
    );
    return Boolean(pointElement && element.contains(pointElement));
  });
  expect(popoverOwnsBottomPoint).toBe(true);
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

test("theme switcher updates Rspress and component previews together", async ({
  page,
}) => {
  await openDocumentationPage(page, "en/components/theme-switcher.html");
  await waitForDocumentationHydration(page);

  const html = page.locator("html");
  const previewToggle = page
    .locator(".a3s-preview")
    .first()
    .getByRole("button", { name: "Toggle dark mode" });

  await expect(html).not.toHaveClass(/\bdark\b/);
  await previewToggle.click();
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveClass(/\brp-dark\b/);

  await expect
    .poll(() =>
      page.evaluate(() => ({
        a3s: localStorage.getItem("themeMode"),
        rspress: localStorage.getItem("rspress-theme-appearance"),
        background: getComputedStyle(document.documentElement)
          .getPropertyValue("--background")
          .trim(),
        themeColor: document
          .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
          ?.getAttribute("content"),
      })),
    )
    .toEqual({
      a3s: "dark",
      rspress: "dark",
      background: "#101118",
      themeColor: "#101118",
    });

  const visibleThemeToggle = page.locator(".rp-switch-appearance:visible");
  await expect(visibleThemeToggle).toHaveCount(1);
  await expect(visibleThemeToggle).toBeVisible();
  await visibleThemeToggle.click();
  await expect(html).not.toHaveClass(/\bdark\b/);
  await expect(html).not.toHaveClass(/\brp-dark\b/);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        a3s: localStorage.getItem("themeMode"),
        background: getComputedStyle(document.documentElement)
          .getPropertyValue("--background")
          .trim(),
      })),
    )
    .toEqual({ a3s: "light", background: "#f7f7f8" });
});

test("homepage theme customizer applies and persists product choices", async ({
  page,
}) => {
  await openDocumentationPage(page, "en/");

  const html = page.locator("html");
  const customizer = page.locator("[data-a3s-customizer]");
  await expect(customizer).toBeVisible();
  const lightContrast = await readThemeTextContrast(page);
  expect(lightContrast.muted).toBeGreaterThanOrEqual(4.5);
  expect(lightContrast.faint).toBeGreaterThanOrEqual(4.5);

  await customizer.getByRole("button", { name: "Violet" }).click();
  await customizer.getByRole("button", { name: "Rounded" }).click();
  await customizer.getByRole("button", { name: "Comfortable" }).click();
  await customizer.getByRole("button", { name: "Dark", exact: true }).click();
  await waitForSettledBrowserFrames(page);

  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveClass(/\brp-dark\b/);
  await expect(html).toHaveAttribute("data-a3s-accent", "violet");
  await expect(html).toHaveAttribute("data-a3s-radius", "rounded");
  await expect(html).toHaveAttribute("data-a3s-density", "comfortable");
  const darkContrast = await readThemeTextContrast(page);
  expect(darkContrast.muted).toBeGreaterThanOrEqual(4.5);
  expect(darkContrast.faint).toBeGreaterThanOrEqual(4.5);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        accent: localStorage.getItem("a3s-ui-accent"),
        appearance: localStorage.getItem("rspress-theme-appearance"),
        density: localStorage.getItem("a3s-ui-density"),
        radius: localStorage.getItem("a3s-ui-radius"),
      })),
    )
    .toEqual({
      accent: "violet",
      appearance: "dark",
      density: "comfortable",
      radius: "rounded",
    });

  await openDocumentationPage(page, "en/components/button.html");
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveAttribute("data-a3s-accent", "violet");
  await expect(html).toHaveAttribute("data-a3s-radius", "rounded");
  await expect(html).toHaveAttribute("data-a3s-density", "comfortable");
});

test("homepage system appearance follows OS changes in real time", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openDocumentationPage(page, "en/");

  const html = page.locator("html");
  const customizer = page.locator("[data-a3s-customizer]");
  await customizer.getByRole("button", { name: "System", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("rspress-theme-appearance")),
    )
    .toBe("auto");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveClass(/\brp-dark\b/);
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("rspress-theme-appearance")),
    )
    .toBe("auto");

  await customizer.getByRole("button", { name: "Dark", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("rspress-theme-appearance")),
    )
    .toBe("dark");

  await page.emulateMedia({ colorScheme: "light" });
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveClass(/\brp-dark\b/);

  await customizer.getByRole("button", { name: "System", exact: true }).click();
  await expect(html).not.toHaveClass(/\bdark\b/);
  await expect(html).not.toHaveClass(/\brp-dark\b/);
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("rspress-theme-appearance")),
    )
    .toBe("auto");
});

test("mobile documentation shell keeps closed panels out of the focus order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDocumentationPage(page, "en/components/button.html");
  await waitForDocumentationHydration(page);

  const sidebar = page.locator(".rp-doc-layout__sidebar");
  const outline = page.locator(".rp-doc-layout__outline");
  const menuButton = page.locator(".rp-sidebar-menu__left");
  const outlineButton = page.locator(".rp-sidebar-menu__right");
  const mobileSearch = page.locator(".rp-search-button--mobile");

  await expect(sidebar).toHaveAttribute("inert", "");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(outline).toHaveAttribute("inert", "");
  await expect(outline).toHaveAttribute("aria-hidden", "true");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(outlineButton).toHaveAttribute("aria-expanded", "false");

  await expect(mobileSearch).toHaveAttribute("role", "button");
  await expect(mobileSearch).toHaveAttribute(
    "aria-label",
    "Search documentation",
  );
  await expect(mobileSearch).toHaveAttribute("tabindex", "0");
  const searchBox = await mobileSearch.boundingBox();
  expect(searchBox).not.toBeNull();
  expect(searchBox!.width).toBeGreaterThanOrEqual(44);
  expect(searchBox!.height).toBeGreaterThanOrEqual(44);

  await menuButton.click();
  await expect(sidebar).not.toHaveAttribute("inert", "");
  await expect(sidebar).not.toHaveAttribute("aria-hidden", "true");
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(document.activeElement?.closest(".rp-doc-layout__sidebar")),
      ),
    )
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(sidebar).toHaveAttribute("inert", "");
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(menuButton).toBeFocused();

  await outlineButton.click();
  await expect(outline).not.toHaveAttribute("inert", "");
  await expect(outline).not.toHaveAttribute("aria-hidden", "true");
  await expect(outlineButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(outline).toHaveAttribute("inert", "");
  await expect(outline).toHaveAttribute("aria-hidden", "true");
  await expect(outlineButton).toBeFocused();

  await mobileSearch.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".rp-search-panel__modal")).toBeVisible();
});

test("theme bootstrap works before Rspress hydration", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("themeMode", "dark");
    localStorage.removeItem("rspress-theme-appearance");
  });
  await page.route("**/static/js/**", (route) => route.abort());

  await page.goto("en/components/theme-switcher.html", {
    waitUntil: "domcontentloaded",
  });

  const html = page.locator("html");
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(html).toHaveClass(/\brp-dark\b/);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        a3s: localStorage.getItem("themeMode"),
        rspress: localStorage.getItem("rspress-theme-appearance"),
        themeColor: document
          .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
          ?.getAttribute("content"),
      })),
    )
    .toEqual({ a3s: "dark", rspress: "dark", themeColor: "#101118" });

  const runtimeScript = page.locator('script[src$="/assets/a3s-ui.min.js"]');
  await expect(runtimeScript).toHaveCount(1);
  expect(await runtimeScript.textContent()).toBe("");
  await expect(page.locator('head link[rel="canonical"]')).toHaveCount(1);

  await page.evaluate(() => window.a3sUI?.theme.toggle());
  await expect(html).not.toHaveClass(/\bdark\b/);
  await expect(html).not.toHaveClass(/\brp-dark\b/);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        a3s: localStorage.getItem("themeMode"),
        rspress: localStorage.getItem("rspress-theme-appearance"),
      })),
    )
    .toEqual({ a3s: "light", rspress: "light" });
});

test("MDX preview popovers are not clipped by the preview frame", async ({
  page,
}) => {
  for (const [route, trigger] of [
    ["en/components/dropdown-menu.html", "#demo-dropdown-menu-trigger"],
    ["en/components/popover.html", "#demo-popover-trigger"],
    ["en/components/select.html", "#select-demo-trigger"],
    [
      "en/components/combobox.html",
      "#framework-combobox > input[role=combobox]",
    ],
  ] as const) {
    await expectPreviewOverlayToEscapeFrame(page, route, trigger);
  }
});
