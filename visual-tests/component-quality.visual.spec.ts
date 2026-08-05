import { expect, test, type Locator, type Page } from "@playwright/test";

type PreviewQualityIssues = {
  horizontalOverflow: number;
  smallText: string[];
  smallTargets: string[];
  unnamedControls: string[];
};

const componentRoutes = [
  "accordion",
  "activity-bar",
  "alert-dialog",
  "alert",
  "app-shell",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "button-group",
  "card",
  "chart",
  "checkbox",
  "combobox",
  "command",
  "dialog",
  "drawer",
  "dropdown-menu",
  "empty",
  "field",
  "input",
  "input-group",
  "item",
  "kbd",
  "label",
  "native-select",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resource-card",
  "ribbon",
  "scroll-area",
  "select",
  "settings-layout",
  "sidebar",
  "skeleton",
  "slider",
  "spinner",
  "split-pane",
  "status-bar",
  "switch",
  "table",
  "tabs",
  "task-pane",
  "textarea",
  "theme-switcher",
  "toast",
  "toolbar",
  "tooltip",
  "workspace-header",
] as const;

const interactiveStateCases = [
  {
    route: "alert-dialog",
    trigger: ".a3s-preview:has(#demo-alert-dialog) button",
    visible: "#demo-alert-dialog[open] > *",
  },
  {
    route: "command",
    trigger: ".a3s-preview:has(#command-basic) button",
    visible: "#command-basic[open] > .command",
  },
  {
    route: "dialog",
    trigger: ".a3s-preview:has(#demo-dialog-edit-profile) button",
    visible: "#demo-dialog-edit-profile[open] > *",
  },
  {
    route: "drawer",
    trigger: ".a3s-preview:has(#demo-drawer) button",
    visible: "#demo-drawer[open] > *",
  },
  {
    route: "dropdown-menu",
    trigger: "#demo-dropdown-menu-trigger",
    visible: '#demo-dropdown-menu-popover[aria-hidden="false"]',
  },
  {
    route: "popover",
    trigger: "#demo-popover-trigger",
    visible: '#demo-popover-popover[aria-hidden="false"]',
  },
  {
    route: "select",
    trigger: "#select-demo-trigger",
    visible: '#select-demo-popover[aria-hidden="false"]',
  },
  {
    route: "combobox",
    trigger: "#framework-combobox > input[role=combobox]",
    visible: '#framework-combobox-popover[aria-hidden="false"]',
  },
  {
    route: "toast",
    trigger: ".a3s-preview button",
    visible: "#toaster .toast",
  },
] as const;

const viewportEdgeOverlayCases = [
  {
    expectedSide: "top",
    position: { bottom: "4px", left: "auto", right: "4px", top: "auto" },
    route: "dropdown-menu",
    root: "#demo-dropdown-menu",
    side: "bottom",
    trigger: "#demo-dropdown-menu-trigger",
    popover: "#demo-dropdown-menu-popover",
  },
  {
    expectedSide: "left",
    position: { bottom: "auto", left: "auto", right: "4px", top: "160px" },
    route: "popover",
    root: "#demo-popover",
    side: "right",
    trigger: "#demo-popover-trigger",
    popover: "#demo-popover-popover",
  },
  {
    expectedSide: "bottom",
    position: { bottom: "auto", left: "4px", right: "auto", top: "4px" },
    route: "select",
    root: "#select-demo",
    side: "top",
    trigger: "#select-demo-trigger",
    popover: "#select-demo-popover",
  },
  {
    expectedSide: "right",
    position: { bottom: "auto", left: "4px", right: "auto", top: "160px" },
    route: "combobox",
    root: "#framework-combobox",
    side: "left",
    trigger: "#framework-combobox > input[role=combobox]",
    popover: "#framework-combobox-popover",
  },
] as const;

async function openDocumentationPage(page: Page, route: string) {
  await page.goto(`en/components/${route}.html`);
  await page.evaluate(() => document.fonts.ready);
}

async function waitForSettledFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
}

async function expectMinimumTarget(locator: Locator, minimum = 44) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(minimum);
  expect(box!.height).toBeGreaterThanOrEqual(minimum);
}

async function inspectPreviewQuality(
  page: Page,
): Promise<PreviewQualityIssues> {
  return page.evaluate(() => {
    const previews = Array.from(
      document.querySelectorAll<HTMLElement>(".a3s-preview, .toaster"),
    );
    const controls = previews.flatMap((preview) =>
      Array.from(
        preview.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button",
            "input:not([type='hidden'])",
            "select",
            "summary",
            "textarea",
            "[role='button']",
            "[role='combobox']",
            "[role='menuitem']",
            "[role='menuitemcheckbox']",
            "[role='menuitemradio']",
            "[role='option']",
            "[role='separator'][tabindex]",
            "[role='tab']",
          ].join(","),
        ),
      ),
    );
    const isVisible = (element: Element) => {
      if (
        element.closest(
          '[aria-hidden="true"], [hidden], [inert], .sr-only, [class*="sr-only"]',
        )
      ) {
        return false;
      }

      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const describe = (element: Element) => {
      const id = element.id ? `#${element.id}` : "";
      const classes = Array.from(element.classList)
        .slice(0, 2)
        .map((className) => `.${className}`)
        .join("");
      const text = element.textContent?.replace(/\s+/g, " ").trim();
      const hint =
        text ||
        element.getAttribute("name") ||
        element.getAttribute("placeholder") ||
        element.getAttribute("aria-controls");
      return `${element.tagName.toLowerCase()}${id}${classes}${hint ? ` (${hint.slice(0, 36)})` : ""}`;
    };
    const labelledByText = (element: Element) =>
      (element.getAttribute("aria-labelledby") ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .join(" ")
        .trim();
    const accessibleName = (element: HTMLElement) => {
      const labels =
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
          ? Array.from(element.labels ?? [])
              .map((label) => label.textContent?.trim() ?? "")
              .join(" ")
              .trim()
          : "";
      const inputValue =
        element instanceof HTMLInputElement &&
        ["button", "reset", "submit"].includes(element.type)
          ? element.value.trim()
          : "";

      return (
        element.getAttribute("aria-label")?.trim() ||
        labelledByText(element) ||
        labels ||
        element.getAttribute("alt")?.trim() ||
        element.textContent?.replace(/\s+/g, " ").trim() ||
        inputValue ||
        element.getAttribute("title")?.trim() ||
        ""
      );
    };
    const visibleControls = controls.filter(isVisible);
    const unnamedControls = visibleControls
      .filter((element) => !accessibleName(element))
      .map(describe);
    const smallTargets = visibleControls
      .filter((element) => {
        if (
          element.matches(":disabled, [aria-disabled='true']") ||
          (element instanceof HTMLAnchorElement &&
            getComputedStyle(element).display === "inline" &&
            !element.classList.contains("btn"))
        ) {
          return false;
        }

        const rects = [element.getBoundingClientRect()];
        if (
          element instanceof HTMLInputElement &&
          ["checkbox", "radio"].includes(element.type)
        ) {
          rects.push(
            ...Array.from(element.labels ?? [])
              .filter(isVisible)
              .map((label) => label.getBoundingClientRect()),
          );
        }

        return !rects.some((rect) => rect.width >= 24 && rect.height >= 24);
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return `${describe(element)} [${rect.width.toFixed(1)}x${rect.height.toFixed(1)}]`;
      });
    const textParents = new Set<HTMLElement>();
    for (const preview of previews) {
      const walker = document.createTreeWalker(preview, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim()) continue;
        const parent = node.parentElement;
        if (parent && isVisible(parent) && !parent.closest("svg")) {
          textParents.add(parent);
        }
      }
    }
    const smallText = Array.from(textParents)
      .filter(
        (element) => Number.parseFloat(getComputedStyle(element).fontSize) < 11,
      )
      .map((element) => {
        const size = Number.parseFloat(getComputedStyle(element).fontSize);
        return `${describe(element)} [${size.toFixed(1)}px]`;
      });

    return {
      horizontalOverflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      smallText: [...new Set(smallText)],
      smallTargets: [...new Set(smallTargets)],
      unnamedControls: [...new Set(unnamedControls)],
    };
  });
}

test("all component previews meet the shared quality floor", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of componentRoutes) {
    await test.step(route, async () => {
      await openDocumentationPage(page, route);
      const issues = await inspectPreviewQuality(page);
      expect(issues, `${route}: ${JSON.stringify(issues, null, 2)}`).toEqual({
        horizontalOverflow: 0,
        smallText: [],
        smallTargets: [],
        unnamedControls: [],
      });
    });
  }
});

for (const state of interactiveStateCases) {
  test(`${state.route} open state meets the shared quality floor`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openDocumentationPage(page, state.route);
    await page.locator(state.trigger).first().click();
    const visibleState = page.locator(state.visible).first();
    await expect(visibleState).toBeVisible();
    await visibleState.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    await waitForSettledFrames(page);

    const issues = await inspectPreviewQuality(page);
    expect(
      issues,
      `${state.route}: ${JSON.stringify(issues, null, 2)}`,
    ).toEqual({
      horizontalOverflow: 0,
      smallText: [],
      smallTargets: [],
      unnamedControls: [],
    });
  });
}

test("floating overlays avoid viewport edges and preserve logical alignment", async ({
  page,
}) => {
  const boundaryPadding = 8;
  await page.setViewportSize({ width: 390, height: 640 });

  for (const state of viewportEdgeOverlayCases) {
    await test.step(`${state.route} viewport collision`, async () => {
      await openDocumentationPage(page, state.route);
      await page.locator(state.root).evaluate(
        (root, placement) => {
          const element = root as HTMLElement;
          Object.assign(element.style, placement.position, {
            position: "fixed",
            zIndex: "100",
          });
          const popover = element.querySelector<HTMLElement>("[data-popover]");
          if (popover) {
            popover.dataset.align = "start";
            popover.dataset.side = placement.side;
          }
        },
        { position: state.position, side: state.side },
      );

      await page.locator(state.trigger).click();
      const popover = page.locator(state.popover);
      await expect(popover).toBeVisible();
      await waitForSettledFrames(page);

      await expect(popover).toHaveAttribute("data-a3s-positioned", "true");
      await expect(popover).toHaveAttribute(
        "data-resolved-side",
        state.expectedSide,
      );
      const box = await popover.boundingBox();
      const geometry = await popover.evaluate((element) => {
        const html = element as HTMLElement;
        const offsetParent = html.offsetParent as HTMLElement | null;
        const style = getComputedStyle(html);
        return {
          computed: {
            insetInlineStart: style.insetInlineStart,
            left: style.left,
            marginInlineStart: style.marginInlineStart,
            top: style.top,
            translate: style.translate,
          },
          offsetParent: offsetParent
            ? {
                clientLeft: offsetParent.clientLeft,
                clientTop: offsetParent.clientTop,
                id: offsetParent.id,
                rect: offsetParent.getBoundingClientRect().toJSON(),
                scrollLeft: offsetParent.scrollLeft,
                scrollTop: offsetParent.scrollTop,
              }
            : null,
          popover: html.getBoundingClientRect().toJSON(),
          root: html.parentElement?.getBoundingClientRect().toJSON(),
          style: html.getAttribute("style"),
          viewport: window.visualViewport
            ? {
                height: window.visualViewport.height,
                offsetLeft: window.visualViewport.offsetLeft,
                offsetTop: window.visualViewport.offsetTop,
                width: window.visualViewport.width,
              }
            : null,
        };
      });
      expect(box).not.toBeNull();
      expect(box!.x, JSON.stringify(geometry, null, 2)).toBeGreaterThanOrEqual(
        boundaryPadding - 0.5,
      );
      expect(box!.y, JSON.stringify(geometry, null, 2)).toBeGreaterThanOrEqual(
        boundaryPadding - 0.5,
      );
      expect(
        box!.x + box!.width,
        JSON.stringify(geometry, null, 2),
      ).toBeLessThanOrEqual(390 - boundaryPadding + 0.5);
      expect(
        box!.y + box!.height,
        JSON.stringify(geometry, null, 2),
      ).toBeLessThanOrEqual(640 - boundaryPadding + 0.5);
    });
  }

  await test.step("RTL start alignment", async () => {
    await page.setViewportSize({ width: 640, height: 640 });
    await openDocumentationPage(page, "popover");
    const root = page.locator("#demo-popover");
    await root.evaluate((element) => {
      const html = element as HTMLElement;
      html.dir = "rtl";
      Object.assign(html.style, {
        bottom: "auto",
        left: "320px",
        position: "fixed",
        right: "auto",
        top: "160px",
        zIndex: "100",
      });
      const popover = html.querySelector<HTMLElement>("[data-popover]");
      if (popover) {
        popover.dataset.align = "start";
        popover.dataset.side = "bottom";
      }
    });

    await page.locator("#demo-popover-trigger").click();
    const popover = page.locator("#demo-popover-popover");
    await expect(popover).toBeVisible();
    await waitForSettledFrames(page);
    const [rootBox, popoverBox] = await Promise.all([
      root.boundingBox(),
      popover.boundingBox(),
    ]);
    expect(rootBox).not.toBeNull();
    expect(popoverBox).not.toBeNull();
    const inlineEndDelta = Math.abs(
      popoverBox!.x + popoverBox!.width - (rootBox!.x + rootBox!.width),
    );
    expect(inlineEndDelta).toBeLessThanOrEqual(1);
  });
});

test("tooltips keep readable compact text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDocumentationPage(page, "tooltip");

  const trigger = page.locator(".a3s-preview [data-tooltip]").first();
  await trigger.hover();
  expect(
    await trigger.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element, "::before").fontSize),
    ),
  ).toBeGreaterThanOrEqual(11);
});

test("coarse pointers receive touch-sized component targets", async ({
  baseURL,
  browser,
}) => {
  expect(baseURL).toBeTruthy();
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });
  const touchPage = await context.newPage();

  try {
    await openDocumentationPage(touchPage, "checkbox");
    expect(
      await touchPage.evaluate(() => matchMedia("(pointer: coarse)").matches),
    ).toBe(true);
    const checkbox = touchPage.locator("#terms-checkbox");
    const checkedCheckbox = touchPage.locator("#terms-checkbox-2");
    await expectMinimumTarget(checkbox);
    await expectMinimumTarget(checkedCheckbox);
    expect(
      await checkedCheckbox.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          boxShadow: style.boxShadow,
        };
      }),
    ).toEqual({ backgroundColor: "rgba(0, 0, 0, 0)", boxShadow: "none" });

    await openDocumentationPage(touchPage, "radio-group");
    await expectMinimumTarget(touchPage.locator("#r1"));
    expect(
      await touchPage.locator("#r2").evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          boxShadow: style.boxShadow,
        };
      }),
    ).toEqual({ backgroundColor: "rgba(0, 0, 0, 0)", boxShadow: "none" });

    await openDocumentationPage(touchPage, "switch");
    const switchControl = touchPage.locator("#airplane-mode");
    await expectMinimumTarget(switchControl);
    expect(
      await switchControl.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          boxShadow: style.boxShadow,
        };
      }),
    ).toEqual({ backgroundColor: "rgba(0, 0, 0, 0)", boxShadow: "none" });
    await switchControl.check();
    expect(
      await switchControl.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          boxShadow: style.boxShadow,
        };
      }),
    ).toEqual({ backgroundColor: "rgba(0, 0, 0, 0)", boxShadow: "none" });

    await openDocumentationPage(touchPage, "slider");
    await expectMinimumTarget(
      touchPage.locator('.a3s-preview input[type="range"]').first(),
    );

    await openDocumentationPage(touchPage, "dropdown-menu");
    await touchPage.locator("#demo-dropdown-menu-trigger").click();
    await expectMinimumTarget(
      touchPage
        .locator('#demo-dropdown-menu-popover [role="menuitem"]')
        .first(),
    );

    await openDocumentationPage(touchPage, "ribbon");
    await expectMinimumTarget(touchPage.locator("#ribbon-home-tab"));

    await openDocumentationPage(touchPage, "status-bar");
    const statusBar = touchPage.locator(".a3s-preview .status-bar").first();
    await expectMinimumTarget(statusBar.locator(".btn").first());
    expect((await statusBar.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(
      statusBar.locator('[data-status-priority="low"]').first(),
    ).toBeHidden();
    await expect(statusBar.getByText("Saved", { exact: true })).toBeVisible();
    expect(
      await statusBar.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);

    await openDocumentationPage(touchPage, "split-pane");
    const splitPane = touchPage.locator(".a3s-preview .split-pane").first();
    await expectMinimumTarget(splitPane.locator('[role="separator"]'));
    expect(
      await splitPane.evaluate((element) => {
        const panes = element.querySelectorAll<HTMLElement>(
          ':scope > :not([role="separator"])',
        );
        return (
          panes[1].getBoundingClientRect().left -
          panes[0].getBoundingClientRect().right
        );
      }),
    ).toBeLessThanOrEqual(8.1);
  } finally {
    await context.close();
  }
});
