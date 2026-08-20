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
  "app-page",
  "app-shell",
  "agent-composer",
  "agent-transcript",
  "agent-workbench",
  "approval-request",
  "artifact-card",
  "avatar",
  "back-to-bottom",
  "badge",
  "brand-lockup",
  "breadcrumb",
  "bulk-action-bar",
  "button",
  "button-group",
  "card",
  "catalog",
  "chart",
  "code-diff",
  "code-editor",
  "code-graph",
  "checkbox",
  "checkpoint",
  "change-review",
  "collapsible",
  "color-swatches",
  "combobox",
  "command",
  "context-menu",
  "context-selector",
  "copy-button",
  "data-grid",
  "date-picker",
  "dialog",
  "device-simulator",
  "drawer",
  "dropdown-menu",
  "editable-text",
  "emoji-picker",
  "empty",
  "execution-evidence",
  "execution-item",
  "field",
  "file-manager",
  "file-type-icon",
  "file-explorer",
  "filter-bar",
  "floating-panel",
  "follow-up-suggestions",
  "form",
  "highlighter",
  "hotkey-input",
  "icon",
  "image",
  "image-select",
  "image-viewer",
  "input",
  "input-group",
  "item",
  "kbd",
  "knowledge-library",
  "label",
  "log-viewer",
  "markdown-surface",
  "message-attachment",
  "message-citation",
  "message-status",
  "native-select",
  "pagination",
  "plan-step",
  "popover",
  "progress",
  "property-list",
  "radio-group",
  "resource-card",
  "ribbon",
  "scroll-area",
  "select",
  "setting-row",
  "settings-layout",
  "sidebar",
  "skeleton",
  "slider",
  "snippet",
  "sortable-list",
  "spinner",
  "split-pane",
  "status-bar",
  "status-badge",
  "stepper",
  "streaming-text",
  "switch",
  "table",
  "table-of-contents",
  "tabs",
  "task-plan",
  "task-pane",
  "task-queue",
  "task-start",
  "task-workspace",
  "terminal",
  "textarea",
  "theme-switcher",
  "toast",
  "toolbar",
  "timeline",
  "tool-call",
  "tool-call-timeline",
  "tool-result",
  "tooltip",
  "tree",
  "workspace-header",
] as const;

const componentRootSelectors = {
  accordion: ".accordion",
  "activity-bar": ".activity-bar",
  "alert-dialog": ".alert-dialog > div",
  alert: ".alert",
  "app-page": ".app-page",
  "app-shell": ".app-shell",
  "agent-composer": ".agent-composer",
  "agent-transcript": ".agent-transcript",
  "agent-workbench": ".agent-workbench",
  "approval-request": ".approval-request",
  "artifact-card": ".artifact-card",
  avatar: ".avatar",
  "back-to-bottom": ".back-to-bottom",
  badge: ".badge",
  "brand-lockup": ".brand-lockup",
  breadcrumb: ".breadcrumb [aria-current='page']",
  "bulk-action-bar": ".bulk-action-bar",
  button: ".btn",
  "button-group": ".button-group > .btn",
  card: ".card",
  catalog: ".catalog",
  chart: ".a3s-chart-demo canvas",
  "code-diff": ".code-diff",
  "code-editor": ".code-editor",
  "code-graph": ".code-graph",
  checkbox: "input[type='checkbox']:checked",
  checkpoint: ".checkpoint",
  "change-review": ".change-review",
  collapsible: ".collapsible",
  "color-swatches": ".color-swatches",
  combobox: ".combobox > input",
  command: ".command",
  "context-menu": ".context-menu",
  "context-selector": ".context-selector",
  "copy-button": ".copy-button",
  "data-grid": ".data-grid",
  "date-picker": ".date-picker",
  dialog: ".dialog > div",
  "device-simulator": ".device-simulator",
  drawer: ".drawer > article",
  "dropdown-menu": ".dropdown-menu > .btn",
  "editable-text": ".editable-text",
  "emoji-picker": ".emoji-picker",
  empty: ".empty",
  "execution-evidence": ".execution-evidence",
  "execution-item": ".execution-item",
  field: ".field input[type='text']",
  "file-manager": ".file-manager",
  "file-type-icon": ".file-type-icon",
  "file-explorer": ".file-explorer",
  "filter-bar": ".filter-bar",
  "floating-panel": ".floating-panel",
  "follow-up-suggestions": ".follow-up-suggestions",
  form: "form.form",
  highlighter: ".highlighter",
  "hotkey-input": ".hotkey-input",
  icon: ".icon",
  image: ".image",
  "image-select": ".image-select",
  "image-viewer": ".image-viewer",
  input: ".input",
  "input-group": ".input-group",
  item: ".item",
  kbd: ".kbd",
  "knowledge-library": ".knowledge-library",
  label: ".label",
  "log-viewer": ".log-viewer",
  "markdown-surface": ".markdown-surface",
  "message-attachment": ".message-attachment",
  "message-citation": ".message-citation",
  "message-status": ".message-status",
  "native-select": "select.select",
  pagination: ".pagination [aria-current='page']",
  "plan-step": ".plan-step",
  popover: ".popover > .btn",
  progress: ".progress",
  "property-list": ".property-list",
  "radio-group": "[data-slot='radio-group'] input:checked",
  "resource-card": ".resource-card",
  ribbon: ".ribbon [role='tab'][aria-selected='true']",
  "scroll-area": ".card",
  select: ".select > button",
  "setting-row": ".setting-row",
  "settings-layout": ".settings-layout > main > section",
  sidebar: ".sidebar [aria-current='page']",
  skeleton: ".skeleton",
  slider: "input[type='range']",
  snippet: ".snippet",
  "sortable-list": ".sortable-list",
  spinner: ".animate-spin",
  "split-pane": ".split-pane",
  "status-bar": ".status-bar",
  "status-badge": ".status-badge",
  stepper: ".stepper",
  "streaming-text": ".streaming-text",
  switch: "input[role='switch']",
  table: ".table-container",
  "table-of-contents": ".table-of-contents",
  tabs: ".tabs [role='tab'][aria-selected='true']",
  "task-plan": ".task-plan",
  "task-pane": ".task-pane",
  "task-queue": ".task-queue",
  "task-start": ".task-start",
  "task-workspace": ".task-workspace",
  terminal: ".terminal",
  textarea: ".textarea",
  "theme-switcher": "button[data-tooltip='Toggle dark mode']",
  toast: "#toaster .toast-content",
  toolbar: ".toolbar",
  timeline: ".timeline",
  "tool-call": ".tool-call",
  "tool-call-timeline": ".tool-call-timeline",
  "tool-result": ".tool-result",
  tooltip: "[data-tooltip]",
  tree: ".tree",
  "workspace-header": ".workspace-header",
} as const satisfies Record<(typeof componentRoutes)[number], string>;

const initiallyHiddenRootRoutes = new Set<(typeof componentRoutes)[number]>([
  "alert-dialog",
  "dialog",
  "drawer",
]);

const controlRootRoutes = new Set<(typeof componentRoutes)[number]>([
  "button",
  "button-group",
  "copy-button",
  "agent-composer",
  "code-editor",
  "combobox",
  "dropdown-menu",
  "field",
  "hotkey-input",
  "input",
  "input-group",
  "native-select",
  "popover",
  "select",
  "textarea",
  "theme-switcher",
  "tooltip",
]);

const selectedRootRoutes = new Set<(typeof componentRoutes)[number]>([
  "breadcrumb",
  "checkbox",
  "data-grid",
  "device-simulator",
  "code-graph",
  "file-explorer",
  "file-manager",
  "filter-bar",
  "knowledge-library",
  "pagination",
  "radio-group",
  "ribbon",
  "sidebar",
  "stepper",
  "switch",
  "tabs",
  "timeline",
  "tool-result",
  "tree",
]);

const interactiveStateCases = [
  {
    route: "alert-dialog",
    trigger:
      '.a3s-preview:has(#demo-alert-dialog) .a3s-preview__canvas button[data-preview-onclick*="demo-alert-dialog"]',
    visible: "#demo-alert-dialog[open] > *",
  },
  {
    route: "command",
    trigger: ".a3s-preview:has(#command-basic) .a3s-preview__canvas > button",
    visible: "#command-basic[open] > .command",
  },
  {
    route: "dialog",
    trigger:
      ".a3s-preview:has(#demo-dialog-edit-profile) .a3s-preview__canvas > button",
    visible: "#demo-dialog-edit-profile[open] > *",
  },
  {
    route: "drawer",
    trigger: ".a3s-preview:has(#demo-drawer) .a3s-preview__canvas > button",
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
    trigger: ".a3s-preview__canvas > button",
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

const previewOverlayRoutes = new Set([
  "combobox",
  "dropdown-menu",
  "popover",
  "select",
]);

async function openDocumentationPage(page: Page, route: string) {
  await page.goto(`en/components/${route}.html`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");
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
            "[role='treeitem']",
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

test("all component routes expose stable geometry, state, and diagnostics", async ({
  page,
}) => {
  test.slow();
  const diagnostics: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      diagnostics.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  for (const route of componentRoutes) {
    await test.step(route, async () => {
      const diagnosticOffset = diagnostics.length;
      await openDocumentationPage(page, route);
      const previews = page.locator(
        `.a3s-preview[data-preview-component="${route}"]`,
      );
      const preview =
        route === "code-editor"
          ? previews.filter({ has: page.locator(".code-editor") }).first()
          : previews.first();
      await expect(preview).toBeVisible();

      if (route === "switch") {
        await preview.locator(componentRootSelectors.switch).check();
      } else if (route === "toast") {
        await preview.locator(".a3s-preview__canvas > button").click();
      }
      await waitForSettledFrames(page);

      const root = componentRootSelectors[route].startsWith("#toaster")
        ? page.locator(componentRootSelectors[route]).first()
        : preview.locator(componentRootSelectors[route]).first();
      await expect(root).toBeAttached();

      if (!initiallyHiddenRootRoutes.has(route)) {
        await expect(root).toBeVisible();
        const [rootBox, canvasBox] = await Promise.all([
          root.boundingBox(),
          preview.locator(".a3s-preview__canvas").boundingBox(),
        ]);
        expect(rootBox).not.toBeNull();
        expect(canvasBox).not.toBeNull();
        expect(Number.isFinite(rootBox!.width)).toBe(true);
        expect(Number.isFinite(rootBox!.height)).toBe(true);
        expect(rootBox!.width).toBeGreaterThan(0);
        expect(rootBox!.height).toBeGreaterThan(0);

        if (route !== "toast") {
          expect(rootBox!.x).toBeGreaterThanOrEqual(canvasBox!.x - 1);
          expect(rootBox!.x + rootBox!.width).toBeLessThanOrEqual(
            canvasBox!.x + canvasBox!.width + 1,
          );
        }

        if (controlRootRoutes.has(route)) {
          expect(rootBox!.height).toBeGreaterThanOrEqual(24);
        }
      }

      if (selectedRootRoutes.has(route)) {
        expect(
          await root.evaluate(
            (element) =>
              element.matches(
                ":checked, [aria-current], [aria-selected='true'], [aria-pressed='true']",
              ) ||
              Boolean(
                element.querySelector(
                  ":checked, [aria-current], [aria-selected='true'], [aria-pressed='true']",
                ),
              ),
          ),
        ).toBe(true);
      }

      expect(
        diagnostics.slice(diagnosticOffset),
        `${route} emitted browser diagnostics`,
      ).toEqual([]);
    });
  }
});

test("all component previews meet the shared quality floor", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 390, height: 844 });

  for (const route of componentRoutes) {
    await test.step(route, async () => {
      await openDocumentationPage(page, route);
      const issues = await inspectPreviewQuality(page);
      expect
        .soft(issues, `${route}: ${JSON.stringify(issues, null, 2)}`)
        .toEqual({
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
    const trigger = page.locator(state.trigger).first();
    const triggerBoxBefore = await trigger.boundingBox();
    expect(triggerBoxBefore).not.toBeNull();

    if (state.route !== "toast" && state.route !== "alert-dialog") {
      await expect(page.locator(state.visible).first()).toBeHidden();
    }

    await trigger.click();
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

    const [stateBox, triggerBoxAfter] = await Promise.all([
      visibleState.boundingBox(),
      trigger.boundingBox(),
    ]);
    const viewport = page.viewportSize();
    expect(stateBox).not.toBeNull();
    expect(triggerBoxAfter).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(stateBox!.width).toBeGreaterThan(0);
    expect(stateBox!.height).toBeGreaterThan(0);
    expect(stateBox!.x).toBeGreaterThanOrEqual(-1);
    expect(stateBox!.y).toBeGreaterThanOrEqual(-1);
    expect(stateBox!.x + stateBox!.width).toBeLessThanOrEqual(
      viewport!.width + 1,
    );
    expect(stateBox!.y + stateBox!.height).toBeLessThanOrEqual(
      viewport!.height + 1,
    );
    expect(triggerBoxAfter!.width).toBeCloseTo(triggerBoxBefore!.width, 0);
    expect(triggerBoxAfter!.height).toBeCloseTo(triggerBoxBefore!.height, 0);

    expect(
      await visibleState.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const topElement = document.elementFromPoint(
          Math.min(window.innerWidth - 1, rect.left + rect.width / 2),
          Math.min(window.innerHeight - 1, rect.top + rect.height / 2),
        );
        return {
          display: style.display,
          opacity: Number.parseFloat(style.opacity),
          ownsCenterPoint: Boolean(
            topElement &&
            (element === topElement || element.contains(topElement)),
          ),
          pointerEvents: style.pointerEvents,
          visibility: style.visibility,
        };
      }),
    ).toEqual({
      display: expect.not.stringMatching(/^none$/),
      opacity: expect.any(Number),
      ownsCenterPoint: true,
      pointerEvents: expect.not.stringMatching(/^none$/),
      visibility: expect.not.stringMatching(/^hidden$/),
    });

    if (previewOverlayRoutes.has(state.route)) {
      await expect(
        visibleState.locator(
          "xpath=ancestor::section[contains(concat(' ', normalize-space(@class), ' '), ' a3s-preview ')][1]",
        ),
      ).toHaveAttribute("data-overlay-open", "");
    }

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

test("reduced motion stops perpetual loading indicators", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openDocumentationPage(page, "spinner");

  const spinner = page.locator(".a3s-preview .animate-spin").first();
  await expect(spinner).toBeVisible();
  expect(
    await spinner.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationName: style.animationName,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    }),
  ).toEqual({ animationName: "none", reducedMotion: true });
});

test.describe("coarse-pointer quality", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    viewport: { width: 390, height: 844 },
  });

  test("coarse pointers receive touch-sized component targets", async ({
    page: touchPage,
  }) => {
    test.slow();
    await openDocumentationPage(touchPage, "checkbox");
    expect(
      await touchPage.evaluate(() => matchMedia("(pointer: coarse)").matches),
    ).toBe(true);
    const checkbox = touchPage.locator("#release-desktop-en");
    const checkedCheckbox = touchPage.locator("#release-email-en");
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
    const endpoint = splitPane.locator("h2").first();
    expect(
      await endpoint.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
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
  });
});
