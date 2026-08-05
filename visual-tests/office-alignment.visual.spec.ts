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

async function readA3sFoundationMetrics(page: Page) {
  return page.evaluate(() => {
    const parseColor = (value: string) => {
      const normalized = value.trim();
      if (normalized.startsWith("#")) {
        const hex = normalized.slice(1);
        const channels = (
          hex.length === 3
            ? hex.split("").map((part) => `${part}${part}`)
            : (hex.match(/../g) ?? [])
        ).slice(0, 3);
        return channels.map((part) => Number.parseInt(part, 16));
      }

      return (normalized.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    };
    const luminance = (value: string) => {
      const [red, green, blue] = parseColor(value).map((channel) => {
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
    const root = getComputedStyle(document.documentElement);
    const rootFontSize = Number.parseFloat(root.fontSize);
    const pixels = (property: string) => {
      const value = root.getPropertyValue(property).trim();
      return value.endsWith("rem")
        ? Number.parseFloat(value) * rootFontSize
        : Number.parseFloat(value);
    };
    const backgrounds = ["--a3s-bg", "--a3s-panel"].map((property) =>
      root.getPropertyValue(property).trim(),
    );
    const minimumContrast = (property: string) => {
      const foreground = root.getPropertyValue(property).trim();
      return Math.min(
        ...backgrounds.map((background) => contrast(foreground, background)),
      );
    };

    return {
      blueContrast: minimumContrast("--a3s-blue"),
      compactFontSize: pixels("--a3s-font-size-compact"),
      faintContrast: minimumContrast("--a3s-faint"),
      greenContrast: minimumContrast("--a3s-green"),
      microFontSize: pixels("--a3s-font-size-micro"),
      mutedContrast: minimumContrast("--a3s-muted"),
      orangeContrast: minimumContrast("--a3s-orange"),
      redContrast: minimumContrast("--a3s-red"),
      subtleContrast: minimumContrast("--a3s-subtle"),
      warningContrast: minimumContrast("--a3s-warning"),
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
  const ribbonTabs = specimen.locator(".ribbon > [role=tablist]");
  const ribbonPanel = specimen.locator(
    ".ribbon > [role=tabpanel]:not([hidden])",
  );
  const ribbonGroup = ribbonPanel.locator("[data-ribbon-group]").first();
  const workspace = specimen.locator(".ui-office-workspace");
  const taskPane = specimen.locator(".task-pane");
  const statusBar = specimen.locator(".status-bar");
  const [
    shellBox,
    mainBox,
    ribbonTabsBox,
    ribbonPanelBox,
    ribbonGroupBox,
    workspaceBox,
    taskPaneBox,
    statusBarBox,
  ] = await Promise.all([
    shell.boundingBox(),
    main.boundingBox(),
    ribbonTabs.boundingBox(),
    ribbonPanel.boundingBox(),
    ribbonGroup.boundingBox(),
    workspace.boundingBox(),
    taskPane.boundingBox(),
    statusBar.boundingBox(),
  ]);
  expect(shellBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(ribbonTabsBox).not.toBeNull();
  expect(ribbonPanelBox).not.toBeNull();
  expect(ribbonGroupBox).not.toBeNull();
  expect(workspaceBox).not.toBeNull();
  expect(taskPaneBox).not.toBeNull();
  expect(statusBarBox).not.toBeNull();
  expect(mainBox!.width).toBeGreaterThan(shellBox!.width * 0.75);
  expect(ribbonTabsBox!.height).toBeGreaterThanOrEqual(35);
  expect(ribbonTabsBox!.height).toBeLessThanOrEqual(37);
  expect(ribbonPanelBox!.height).toBeGreaterThanOrEqual(73);
  expect(ribbonPanelBox!.height).toBeLessThanOrEqual(75);
  expect(ribbonGroupBox!.height).toBeGreaterThanOrEqual(64);
  expect(ribbonGroupBox!.height).toBeLessThanOrEqual(66);
  expect(statusBarBox!.height).toBeGreaterThanOrEqual(27);
  expect(statusBarBox!.height).toBeLessThanOrEqual(29);

  if (page.viewportSize()!.width > 900) {
    expect(taskPaneBox!.width).toBeGreaterThanOrEqual(160);
    expect(taskPaneBox!.width).toBeLessThan(workspaceBox!.width * 0.34);
  } else {
    await expect(taskPane).toHaveCSS("position", "absolute");
    expect(taskPaneBox!.x + taskPaneBox!.width).toBeCloseTo(
      workspaceBox!.x + workspaceBox!.width,
      0,
    );
  }
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

test("A3S foundation tokens keep compact text readable in both themes", async ({
  page,
}) => {
  await openDocumentationPage(page, "en/components/field.html");

  for (const dark of [false, true]) {
    await page.locator("html").evaluate((element, enabled) => {
      element.classList.toggle("dark", enabled);
      element.classList.toggle("rp-dark", enabled);
    }, dark);

    const metrics = await readA3sFoundationMetrics(page);
    expect(metrics.mutedContrast).toBeGreaterThanOrEqual(4.5);
    expect(metrics.subtleContrast).toBeGreaterThanOrEqual(4.5);
    expect(metrics.faintContrast).toBeGreaterThanOrEqual(4.5);
    expect(metrics.blueContrast).toBeGreaterThanOrEqual(4.5);
    expect(metrics.greenContrast).toBeGreaterThanOrEqual(4.5);
    expect(metrics.orangeContrast).toBeGreaterThanOrEqual(4.5);
    expect(metrics.redContrast).toBeGreaterThanOrEqual(4.5);
    expect(metrics.warningContrast).toBeGreaterThanOrEqual(4.5);
    expect(metrics.compactFontSize).toBeGreaterThanOrEqual(12);
    expect(metrics.microFontSize).toBeGreaterThanOrEqual(11);
  }
});

test("form errors and compact choices remain perceivable and operable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDocumentationPage(page, "en/components/field.html");

  const invalidInput = page.locator("#invalid-email");
  const error = page.locator("#invalid-email-error");
  const choice = page.locator("#checkout-same-as-shipping");
  const choiceLabel = page.locator('label[for="checkout-same-as-shipping"]');
  await invalidInput.scrollIntoViewIfNeeded();
  await invalidInput.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(invalidInput).toBeFocused();

  const states = await page.evaluate(() => {
    const input = document.querySelector<HTMLElement>("#invalid-email")!;
    const error = document.querySelector<HTMLElement>("#invalid-email-error")!;
    const root = getComputedStyle(document.documentElement);
    const resolveColor = (value: string) => {
      const probe = document.createElement("span");
      probe.style.color = value;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };

    return {
      errorColor: getComputedStyle(error).color,
      inputBorder: getComputedStyle(input).borderColor,
      inputShadow: getComputedStyle(input).boxShadow,
      inputTransition: getComputedStyle(input).transition,
      red: resolveColor(root.getPropertyValue("--a3s-red")),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  });
  expect(states.errorColor).toBe(states.red);
  expect(states.inputBorder).toBe(states.red);
  expect(states.inputShadow, JSON.stringify(states)).toContain(states.red);
  expect(states.reducedMotion).toBe(true);
  expect(states.inputTransition).toBe("none");

  const [choiceBox, labelBox] = await Promise.all([
    choice.boundingBox(),
    choiceLabel.boundingBox(),
  ]);
  expect(choiceBox).not.toBeNull();
  expect(labelBox).not.toBeNull();
  expect(Math.max(choiceBox!.height, labelBox!.height)).toBeGreaterThanOrEqual(
    24,
  );
});

test("homepage keeps one document hierarchy and only working specimen controls", async ({
  page,
}) => {
  await openDocumentationPage(page, "en/");

  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);

  const specimen = page.locator(".ui-workbench-frame");
  await expect(specimen).toHaveAttribute(
    "aria-label",
    "Interactive A3S Office workbench specimen",
  );
  await expect(specimen.locator("button")).toHaveCount(7);
  await expect(specimen.getByRole("tab")).toHaveCount(4);
  await expect(specimen.locator(".resource-card")).toHaveCount(3);

  const preview = page.locator(".ui-theme-customizer__preview");
  await expect(
    preview.locator(
      'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).toHaveCount(0);

  expect(await page.locator(".ui-home").innerText()).not.toMatch(/[—–]/);
});

test("homepage copy failure is explicit and recoverable", async ({ page }) => {
  await openDocumentationPage(page, "en/");
  await waitForDocumentationHydration(page);
  await page.evaluate(() => {
    let attempts = 0;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("Clipboard unavailable");
        },
      },
    });
  });

  const copyButton = page.locator(".ui-install-command button");
  await expect(copyButton).toHaveAccessibleName("Copy install command");
  await copyButton.click();
  await expect(copyButton).toHaveAccessibleName("Copy failed. Try again");
  await expect(copyButton).toHaveAttribute("data-copy-state", "error");

  await copyButton.click();
  await expect(copyButton).toHaveAccessibleName("Copied");
  await expect(copyButton).toHaveAttribute("data-copy-state", "copied");
});

test("mobile homepage reveals the catalog before an optional product preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDocumentationPage(page, "en/");
  await waitForDocumentationHydration(page);

  const catalog = page.locator(".ui-catalog");
  expect(
    await page.evaluate(() => {
      const catalogElement = document.querySelector(".ui-catalog");
      const customizerElement = document.querySelector(".ui-theme-customizer");
      return Boolean(
        catalogElement &&
        customizerElement &&
        catalogElement.compareDocumentPosition(customizerElement) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);

  const preview = page.locator(".ui-theme-customizer__preview");
  const toggle = page.locator(".ui-theme-customizer__preview-toggle");
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAccessibleName("Show product preview");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(preview).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveAccessibleName("Hide product preview");
  await expect(preview).toBeVisible();
});

test("contained sidebar overlays compact content without layout shift", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDocumentationPage(page, "en/components/sidebar.html");

  const demo = page.locator(".a3s-sidebar-demo").first();
  const sidebar = demo.locator("#demo-sidebar");
  const main = demo.locator("main");
  const content = main.locator(":scope > div");
  const navigation = sidebar.locator("nav");

  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  await expect(main).toHaveCSS("transition", "none");
  expect(
    await content.evaluate((element) =>
      getComputedStyle(element).transitionProperty.split(", "),
    ),
  ).toEqual(["transform"]);
  const closedContentBox = await content.boundingBox();
  expect(closedContentBox).not.toBeNull();

  await demo.getByRole("button", { name: "Toggle sidebar" }).click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");
  await expect
    .poll(async () => {
      const [demoBox, navigationBox, contentBox] = await Promise.all([
        demo.boundingBox(),
        navigation.boundingBox(),
        content.boundingBox(),
      ]);
      return Boolean(
        demoBox &&
        navigationBox &&
        contentBox &&
        navigationBox.x >= demoBox.x - 1 &&
        navigationBox.x + navigationBox.width <=
          demoBox.x + demoBox.width + 1 &&
        Math.abs(contentBox.x - closedContentBox!.x) <= 1,
      );
    })
    .toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(content).toHaveCSS("transition", "none");
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
      const tablist = pattern.locator(":scope > [role=tablist]");
      const panel = pattern.locator(":scope > [role=tabpanel]:not([hidden])");
      const group = panel.locator(":scope > [data-ribbon-group]").first();
      await expect(tablist).toHaveCSS("display", "flex");
      const [tablistBox, panelBox, groupBox] = await Promise.all([
        tablist.boundingBox(),
        panel.boundingBox(),
        group.boundingBox(),
      ]);
      expect(tablistBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(groupBox).not.toBeNull();
      expect(tablistBox!.height).toBeGreaterThanOrEqual(35);
      expect(tablistBox!.height).toBeLessThanOrEqual(37);
      expect(panelBox!.height).toBeGreaterThanOrEqual(73);
      expect(panelBox!.height).toBeLessThanOrEqual(75);
      expect(groupBox!.height).toBeGreaterThanOrEqual(64);
      expect(groupBox!.height).toBeLessThanOrEqual(66);
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
      const host = preview.locator("[data-task-pane-host]");
      const heading = pattern.locator(":scope > header > h2");
      const [hostBox, paneBox, headerBox] = await Promise.all([
        host.boundingBox(),
        pattern.boundingBox(),
        pattern.locator(":scope > header").boundingBox(),
      ]);
      expect(hostBox).not.toBeNull();
      expect(paneBox).not.toBeNull();
      expect(headerBox).not.toBeNull();
      expect(headerBox!.height).toBeGreaterThanOrEqual(51);
      expect(headerBox!.height).toBeLessThanOrEqual(53);
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

      if (page.viewportSize()!.width > 900) {
        await expect(pattern).toHaveCSS("position", "static");
        expect(paneBox!.width).toBeGreaterThanOrEqual(320);
        expect(paneBox!.width).toBeLessThanOrEqual(380);
      } else {
        await expect(pattern).toHaveCSS("position", "absolute");
        expect(paneBox!.width).toBeLessThanOrEqual(380);
        expect(
          Math.abs(paneBox!.x + paneBox!.width - (hostBox!.x + hostBox!.width)),
        ).toBeLessThanOrEqual(1);
      }
    }
    if (name === "status-bar") {
      const editor = preview.locator("[data-status-bar-host]");
      const [editorBox, statusBox] = await Promise.all([
        editor.boundingBox(),
        pattern.boundingBox(),
      ]);
      expect(editorBox).not.toBeNull();
      expect(statusBox).not.toBeNull();
      expect(statusBox!.height).toBeGreaterThanOrEqual(27);
      expect(statusBox!.height).toBeLessThanOrEqual(29);
      expect(
        Math.abs(
          statusBox!.y + statusBox!.height - (editorBox!.y + editorBox!.height),
        ),
      ).toBeLessThanOrEqual(1);
    }
    await expect(preview).toHaveScreenshot(`${name}.png`);

    if (name === "task-pane") {
      await page.setViewportSize({ width: 390, height: 844 });
      const host = preview.locator("[data-task-pane-host]");
      const [hostBox, paneBox] = await Promise.all([
        host.boundingBox(),
        pattern.boundingBox(),
      ]);
      expect(hostBox).not.toBeNull();
      expect(paneBox).not.toBeNull();
      expect(Math.abs(paneBox!.width - hostBox!.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(paneBox!.x - hostBox!.x)).toBeLessThanOrEqual(1);
    }

    if (name === "status-bar") {
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(
        pattern.locator('[data-status-priority="low"]').first(),
      ).toBeHidden();
      await expect(pattern.locator("[data-status-actions]")).toBeVisible();
      expect((await pattern.boundingBox())!.height).toBeLessThanOrEqual(29);
    }
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
  const navigationButton = page.locator(".rp-nav-hamburger:visible");

  await expect(navigationButton).toHaveAccessibleName("Open navigation");
  await expect(navigationButton).toHaveAttribute("aria-expanded", "false");
  await expect(navigationButton).toHaveAttribute(
    "aria-controls",
    "rspress-primary-navigation",
  );
  const navigationButtonBox = await navigationButton.boundingBox();
  expect(navigationButtonBox).not.toBeNull();
  expect(navigationButtonBox!.width).toBeGreaterThanOrEqual(44);
  expect(navigationButtonBox!.height).toBeGreaterThanOrEqual(44);

  await navigationButton.click();
  const navigationPanel = page.locator(".rp-nav-screen");
  await expect(navigationPanel).toBeVisible();
  await expect(navigationPanel).toHaveAttribute(
    "id",
    "rspress-primary-navigation",
  );
  await expect(navigationPanel).not.toHaveAttribute("inert", "");
  await expect(navigationPanel).not.toHaveAttribute("aria-hidden", "true");
  await expect(navigationButton).toHaveAccessibleName("Close navigation");
  await expect(navigationButton).toHaveAttribute("aria-expanded", "true");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(document.activeElement?.closest(".rp-nav-screen")),
      ),
    )
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(navigationPanel).toHaveCount(0);
  await expect(navigationButton).toHaveAccessibleName("Open navigation");
  await expect(navigationButton).toHaveAttribute("aria-expanded", "false");
  await expect(navigationButton).toBeFocused();

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

test("component navigation exposes semantic collapsible groups", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDocumentationPage(page, "en/components/button.html");
  await waitForDocumentationHydration(page);

  await page.locator(".rp-sidebar-menu__left").click();
  const groups = page.locator('.rp-sidebar-group[data-depth="1"]');
  await expect(groups).toHaveCount(8);

  const actions = groups.filter({ hasText: /^Actions$/ });
  const forms = groups.filter({ hasText: /^Forms$/ });
  const navigation = groups.filter({ hasText: /^Navigation$/ });
  await expect(actions).toHaveAttribute("role", "button");
  await expect(actions).toHaveAttribute("tabindex", "0");
  await expect(actions).toHaveAttribute("aria-expanded", "true");
  await expect(forms).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).toHaveAttribute("aria-expanded", "false");

  const actionsPanelId = await actions.getAttribute("aria-controls");
  const formsPanelId = await forms.getAttribute("aria-controls");
  const navigationPanelId = await navigation.getAttribute("aria-controls");
  expect(actionsPanelId).toBeTruthy();
  expect(formsPanelId).toBeTruthy();
  expect(navigationPanelId).toBeTruthy();

  const actionsPanel = page.locator(`#${actionsPanelId}`);
  const formsPanel = page.locator(`#${formsPanelId}`);
  const navigationPanel = page.locator(`#${navigationPanelId}`);
  await expect(actionsPanel).not.toHaveAttribute("inert", "");
  await expect(actionsPanel).not.toHaveAttribute("aria-hidden", "true");
  await expect(formsPanel).toHaveAttribute("inert", "");
  await expect(formsPanel).toHaveAttribute("aria-hidden", "true");
  await expect(navigationPanel).toHaveAttribute("inert", "");

  await forms.focus();
  await forms.press("Enter");
  await expect(forms).toHaveAttribute("aria-expanded", "true");
  await expect(formsPanel).not.toHaveAttribute("inert", "");
  await expect(formsPanel).not.toHaveAttribute("aria-hidden", "true");

  await navigation.focus();
  await navigation.press("Space");
  await expect(navigation).toHaveAttribute("aria-expanded", "true");
  await expect(navigationPanel).not.toHaveAttribute("inert", "");
  await expect(navigationPanel).not.toHaveAttribute("aria-hidden", "true");
});

test("page outline progressively discloses one heading group", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDocumentationPage(page, "en/components/button.html");
  await waitForDocumentationHydration(page);

  const outline = page.locator(".rp-doc-layout__outline");
  const groups = outline.locator(".a3s-outline-group");
  await expect(groups).toHaveCount(2);

  const usageToggle = groups.nth(0).locator(".a3s-outline-group__toggle");
  const examplesToggle = groups.nth(1).locator(".a3s-outline-group__toggle");
  await expect(usageToggle).toHaveAccessibleName("Collapse Usage section");
  await expect(examplesToggle).toHaveAccessibleName("Expand Examples section");
  await expect(usageToggle).toHaveAttribute("aria-expanded", "true");
  await expect(examplesToggle).toHaveAttribute("aria-expanded", "false");

  const usagePanelId = await usageToggle.getAttribute("aria-controls");
  const examplesPanelId = await examplesToggle.getAttribute("aria-controls");
  expect(usagePanelId).toBeTruthy();
  expect(examplesPanelId).toBeTruthy();
  const usagePanel = page.locator(`#${usagePanelId}`);
  const examplesPanel = page.locator(`#${examplesPanelId}`);
  await expect(usagePanel).not.toHaveAttribute("hidden", "");
  await expect(usagePanel).not.toHaveAttribute("inert", "");
  await expect(examplesPanel).toHaveAttribute("hidden", "");
  await expect(examplesPanel).toHaveAttribute("inert", "");
  await expect(
    outline.locator(".a3s-outline-group__panel:not([hidden])"),
  ).toHaveCount(1);

  await examplesToggle.focus();
  await examplesToggle.press("Enter");
  await expect(examplesToggle).toHaveAccessibleName(
    "Collapse Examples section",
  );
  await expect(examplesToggle).toHaveAttribute("aria-expanded", "true");
  await expect(examplesPanel).not.toHaveAttribute("hidden", "");
  await expect(examplesPanel).not.toHaveAttribute("inert", "");
  await expect(usagePanel).toHaveAttribute("hidden", "");
  await expect(usagePanel).toHaveAttribute("inert", "");
  await expect(
    outline.locator(".a3s-outline-group__panel:not([hidden])"),
  ).toHaveCount(1);

  await expect(usageToggle).toHaveAccessibleName("Expand Usage section");
  await usageToggle.focus();
  await usageToggle.press("Space");
  await expect(usageToggle).toHaveAccessibleName("Collapse Usage section");
  await expect(usagePanel).not.toHaveAttribute("hidden", "");
  await expect(examplesPanel).toHaveAttribute("hidden", "");
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
