import { expect, test, type Page } from "@playwright/test";

async function openComponent(page: Page, component: string) {
  await page.goto(`en/components/${component}.html`, {
    waitUntil: "networkidle",
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");
  return page.locator(
    `.a3s-preview[data-preview-component="${component}"] .${component}`,
  );
}

test("Back to Bottom exposes unread and activation state", async ({ page }) => {
  const root = await openComponent(page, "back-to-bottom");
  const result = await root.evaluate((element) => {
    const control = element as HTMLButtonElement & {
      getState(): { atBottom: boolean; unread: number; visible: boolean };
      scrollToBottom(options?: Record<string, unknown>): void;
      setUnread(value: number): { unread: number; visible: boolean };
    };
    let activations = 0;
    let visibilityChanges = 0;
    control.addEventListener("a3s:back-to-bottom-activate", () => {
      activations += 1;
    });
    control.addEventListener("a3s:back-to-bottom-visibility-change", () => {
      visibilityChanges += 1;
    });
    const unread = control.setUnread(4);
    control.scrollToBottom({ behavior: "auto", source: "test" });
    return {
      activations,
      final: control.getState(),
      unread,
      visibilityChanges,
    };
  });

  expect(result.unread).toMatchObject({ unread: 4, visible: true });
  expect(result.final).toMatchObject({ atBottom: true, unread: 0 });
  expect(result.activations).toBe(1);
  expect(result.visibilityChanges).toBeGreaterThanOrEqual(0);
  await expect(root.locator("[data-unread-count]")).toBeHidden();
});

test("Copy Button covers cancellation, success, and clipboard failure", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {
      __copiedValue?: string;
      __copyShouldFail?: boolean;
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          if (state.__copyShouldFail) throw new Error("Clipboard unavailable");
          state.__copiedValue = value;
        },
      },
    });
  });
  const root = await openComponent(page, "copy-button");
  const result = await root.evaluate(async (element) => {
    const control = element as HTMLButtonElement & {
      __blockCopy?: boolean;
      copy(value?: string, options?: Record<string, unknown>): Promise<boolean>;
      getState(): { source: string; state: string };
    };
    const state = window as typeof window & {
      __copiedValue?: string;
      __copyShouldFail?: boolean;
    };
    let errors = 0;
    let successes = 0;
    control.addEventListener("a3s:copy-before", (event) => {
      if (control.__blockCopy) event.preventDefault();
    });
    control.addEventListener("a3s:copy-success", () => {
      successes += 1;
    });
    control.addEventListener("a3s:copy-error", () => {
      errors += 1;
    });

    control.__blockCopy = true;
    const cancelled = await control.copy("blocked");
    control.__blockCopy = false;
    const copied = await control.copy("release-check", { resetAfter: 10_000 });
    const copiedState = control.getState();
    state.__copyShouldFail = true;
    const failed = await control.copy("retry-value");
    return {
      cancelled,
      copied,
      copiedState,
      copiedValue: state.__copiedValue,
      errors,
      failed,
      final: control.getState(),
      successes,
    };
  });

  expect(result).toEqual({
    cancelled: false,
    copied: true,
    copiedState: { source: "npm install @a3s-lab/ui", state: "copied" },
    copiedValue: "release-check",
    errors: 1,
    failed: false,
    final: { source: "npm install @a3s-lab/ui", state: "error" },
    successes: 1,
  });
});

test("Editable Text protects commits and restores values and focus", async ({
  page,
}) => {
  const root = await openComponent(page, "editable-text");
  const edit = root.locator('[data-editable-action="edit"]');
  const input = root.locator("input");

  await root.evaluate((element) => {
    const control = element as HTMLElement & { __blockCommit?: boolean };
    control.__blockCommit = true;
    control.addEventListener("a3s:editable-text-before-commit", (event) => {
      if (control.__blockCommit) event.preventDefault();
    });
  });
  await edit.click();
  await expect(input).toBeFocused();
  await input.fill("Rejected title");
  await input.press("Enter");
  await expect(root).toHaveAttribute("data-state", "editing");
  await expect(input).toHaveValue("Rejected title");

  const committed = await root.evaluate((element) => {
    const control = element as HTMLElement & {
      __blockCommit?: boolean;
      commit(value: string): boolean;
      getState(): { mode: string; value: string };
    };
    control.__blockCommit = false;
    return {
      accepted: control.commit("Approved title"),
      state: control.getState(),
    };
  });
  expect(committed).toEqual({
    accepted: true,
    state: { mode: "display", value: "Approved title" },
  });
  await expect(edit).toBeFocused();

  await edit.click();
  await input.fill("Temporary title");
  await input.press("Escape");
  await expect(input).toHaveValue("Approved title");
  await expect(root).toHaveAttribute("data-state", "display");
  await expect(edit).toBeFocused();
});

test("Emoji Picker keeps filtered results keyboard reachable and cancellable", async ({
  page,
}) => {
  const root = await openComponent(page, "emoji-picker");
  const search = root.locator('input[type="search"]');
  const options = root.locator("[data-emoji-value]");

  await search.fill("celebrate");
  const celebrate = root.locator('[data-emoji-value="🎉"]');
  await expect(root.locator("[data-emoji-value]:visible")).toHaveCount(1);
  await expect(celebrate).toHaveAttribute("tabindex", "0");
  await celebrate.focus();
  await root.evaluate((element) => {
    const control = element as HTMLElement & { __blockEmoji?: boolean };
    control.__blockEmoji = true;
    control.addEventListener("a3s:emoji-before-select", (event) => {
      if (control.__blockEmoji) event.preventDefault();
    });
  });
  await celebrate.press("Enter");
  await expect(celebrate).not.toHaveAttribute("aria-selected", "true");
  await root.evaluate((element) => {
    (element as HTMLElement & { __blockEmoji?: boolean }).__blockEmoji = false;
  });
  await celebrate.press("Enter");
  await expect(celebrate).toHaveAttribute("aria-selected", "true");

  await search.fill("");
  await options.first().focus();
  await options.first().press("ArrowRight");
  await expect(options.nth(1)).toBeFocused();
  await expect(options.nth(1)).toHaveAttribute("tabindex", "0");
});

test("Floating Panel honors lifecycle cancellation and restores its trigger", async ({
  page,
}) => {
  const root = await openComponent(page, "floating-panel");
  await root.evaluate((element) => {
    const trigger = document.createElement("button");
    trigger.id = "floating-panel-test-trigger";
    trigger.textContent = "Open inspector";
    element.parentElement?.prepend(trigger);
    const control = element as HTMLElement & {
      __blockClose?: boolean;
      __blockOpen?: boolean;
      close(options?: Record<string, unknown>): boolean;
    };
    control.close({ restoreFocus: false, source: "setup" });
    control.__blockOpen = true;
    control.__blockClose = false;
    control.addEventListener("a3s:floating-panel-before-open", (event) => {
      if (control.__blockOpen) event.preventDefault();
    });
    control.addEventListener("a3s:floating-panel-before-close", (event) => {
      if (control.__blockClose) event.preventDefault();
    });
    trigger.focus();
  });
  const trigger = page.locator("#floating-panel-test-trigger");
  const blocked = await root.evaluate((element) => {
    const control = element as HTMLElement & {
      open(options?: Record<string, unknown>): boolean;
    };
    return control.open({ trigger: document.activeElement, source: "test" });
  });
  expect(blocked).toBe(false);
  await expect(root).toBeHidden();

  await root.evaluate((element) => {
    const control = element as HTMLElement & {
      __blockOpen?: boolean;
      open(options?: Record<string, unknown>): boolean;
    };
    control.__blockOpen = false;
    control.open({ trigger: document.activeElement, source: "test" });
  });
  await expect(root).toBeVisible();
  await expect(root.getByRole("button", { name: "Close" })).toBeFocused();
  await root.evaluate((element) => {
    (element as HTMLElement & { __blockClose?: boolean }).__blockClose = true;
  });
  await page.keyboard.press("Escape");
  await expect(root).toBeVisible();
  await root.evaluate((element) => {
    (element as HTMLElement & { __blockClose?: boolean }).__blockClose = false;
  });
  await page.keyboard.press("Escape");
  await expect(root).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("Hotkey Input records, rejects, restores, and releases Tab", async ({
  page,
}) => {
  const root = (await openComponent(page, "hotkey-input")).first();
  const input = root.locator("input");
  const clear = root.locator("[data-hotkey-clear]");
  const feedback = page.locator("#hotkey-feedback-en");
  await root.evaluate((element) => {
    const control = element as HTMLElement & {
      __blockValue?: string;
      __changes?: string[];
      __rejectedValue?: string;
    };
    control.__blockValue = "Control+Shift+X";
    control.__changes = [];
    control.addEventListener("a3s:hotkey-before-change", (event) => {
      const detail = (
        event as CustomEvent<{
          reject: (message: string) => void;
          value: string;
        }>
      ).detail;
      if (detail.value === control.__blockValue) {
        detail.reject("Already assigned to Command palette.");
      }
    });
    control.addEventListener("a3s:hotkey-rejected", (event) => {
      control.__rejectedValue = (event as CustomEvent).detail.value;
    });
    control.addEventListener("a3s:hotkey-change", (event) => {
      control.__changes?.push((event as CustomEvent).detail.value);
    });
  });

  await expect(input).toHaveValue("Meta+K");
  await expect(clear).toHaveAttribute("tabindex", "-1");
  await expect(feedback).toHaveText(
    "Activate the field, then press one complete key combination.",
  );

  const stateMatrix = page.getByRole("button", {
    name: "View state acceptance matrix",
  });
  await stateMatrix.click();
  await expect(
    page.getByRole("dialog", { name: "Hotkey Input state acceptance" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(feedback).toHaveText(
    "Activate the field, then press one complete key combination.",
  );
  await expect(root).toHaveAttribute("data-state", "ready");
  await expect(root).not.toHaveAttribute("aria-invalid");

  await input.focus();
  await expect(root).toHaveAttribute("data-state", "recording");
  await expect(root).toHaveAttribute("aria-busy", "true");
  await input.press("Control");
  await expect(root).toHaveAttribute("data-state", "recording");
  await expect(feedback).toHaveText("Add a non-modifier key.");
  await input.press("Escape");
  await expect(root).toHaveAttribute("data-hotkey-value", "Meta+K");
  await expect(root).toHaveAttribute("data-state", "ready");
  await expect(input).toBeFocused();

  await input.press("Enter");
  await input.press("Control+Shift+X");
  await expect(root).toHaveAttribute("data-hotkey-value", "Meta+K");
  await expect(root).toHaveAttribute("data-state", "invalid");
  await expect(root).not.toHaveAttribute("aria-busy");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(feedback).toHaveText("Already assigned to Command palette.");
  await expect
    .poll(() =>
      root.evaluate(
        (element) =>
          (element as HTMLElement & { __rejectedValue?: string })
            .__rejectedValue,
      ),
    )
    .toBe("Control+Shift+X");

  await input.press("Enter");
  await expect(root).toHaveAttribute("data-state", "recording");
  await expect(input).not.toHaveAttribute("aria-invalid");
  await input.press("Control+Shift+P");
  await expect(root).toHaveAttribute("data-hotkey-value", "Control+Shift+P");
  await expect(root).toHaveAttribute("data-state", "ready");
  await expect(feedback).toHaveText(
    "Activate the field, then press one complete key combination.",
  );

  await input.press("Enter");
  await input.evaluate((element) => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        ctrlKey: true,
        key: "+",
      }),
    );
  });
  await expect(root).toHaveAttribute("data-hotkey-value", "Control+Plus");
  await expect(root.locator("[data-hotkey-preview]")).toContainText("+");

  await clear.click();
  await expect(root).toHaveAttribute("data-state", "recording");
  await expect(root).toHaveAttribute("data-hotkey-value", "");
  await expect
    .poll(() =>
      root.evaluate((element) =>
        (
          element as HTMLElement & {
            getValue(): string;
          }
        ).getValue(),
      ),
    )
    .toBe("Control+Plus");
  await input.press("Escape");
  await expect(root).toHaveAttribute("data-hotkey-value", "Control+Plus");
  await expect
    .poll(() =>
      root.evaluate(
        (element) =>
          (element as HTMLElement & { __changes?: string[] }).__changes,
      ),
    )
    .toEqual(["Control+Shift+P", "Control+Plus"]);

  await input.press("Enter");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(root).toHaveAttribute("data-state", "ready");
  await expect(root).not.toHaveAttribute("aria-busy");
  await expect(root).toHaveAttribute("data-hotkey-value", "Control+Plus");

  await input.press("Enter");
  await input.press("Tab");
  await expect(root).toHaveAttribute("data-hotkey-value", "Control+Plus");
  await expect(root).toHaveAttribute("data-state", "ready");
  await expect(input).not.toBeFocused();
  expect(
    await root.evaluate((element) => element.contains(document.activeElement)),
  ).toBe(false);

  await clear.click();
  await expect(root).toHaveAttribute("data-hotkey-value", "");
  await input.press("Tab");
  await expect(root).toHaveAttribute("data-state", "ready");
  await expect
    .poll(() =>
      root.evaluate((element) =>
        (
          element as HTMLElement & {
            getValue(): string;
          }
        ).getValue(),
      ),
    )
    .toBe("");
  await expect
    .poll(() =>
      root.evaluate(
        (element) =>
          (element as HTMLElement & { __changes?: string[] }).__changes,
      ),
    )
    .toEqual(["Control+Shift+P", "Control+Plus", ""]);
});

test("Hotkey Input normalizes API aliases without truncating malformed chords", async ({
  page,
}) => {
  const root = (await openComponent(page, "hotkey-input")).first();
  const input = root.locator("input");
  const result = await root.evaluate((element) => {
    const control = element as HTMLElement & {
      getValue(): string;
      setValue(value: string): boolean;
    };
    const aliasAccepted = control.setValue("Ctrl+ß");
    const aliasValue = control.getValue();
    const malformedAccepted = control.setValue("Control+K+P");
    return {
      aliasAccepted,
      aliasValue,
      malformedAccepted,
      valueAfterMalformed: control.getValue(),
    };
  });

  expect(result).toEqual({
    aliasAccepted: true,
    aliasValue: "Control+ß",
    malformedAccepted: false,
    valueAfterMalformed: "Control+ß",
  });
  await expect(root).toHaveAttribute("data-state", "invalid");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#hotkey-feedback-en")).toHaveText(
    "Enter one complete key combination at a time.",
  );
});

test("Hotkey Input documentation tools reflow without hidden actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openComponent(page, "hotkey-input");
  const preview = page.getByRole("region", {
    name: "Hotkey Input component preview",
  });
  const controls = preview.getByRole("group", { name: "Preview tools" });
  const geometry = await controls.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));

  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  await expect(
    controls.getByRole("button", { name: "View state acceptance matrix" }),
  ).toBeVisible();

  await controls.getByRole("button", { name: "Preview in dark mode" }).click();
  await controls
    .getByRole("button", { name: "Preview right-to-left layout" })
    .click();
  const compactGeometry = await preview
    .locator(".a3s-preview__canvas")
    .evaluate((canvas) => {
      const field = canvas.querySelector<HTMLElement>(".field");
      if (!field) throw new Error("Hotkey Input preview field is missing");
      const canvasBounds = canvas.getBoundingClientRect();
      const fieldBounds = field.getBoundingClientRect();
      return {
        canvasClientWidth: canvas.clientWidth,
        canvasScrollWidth: canvas.scrollWidth,
        fieldInsideInlineBounds:
          fieldBounds.left >= canvasBounds.left &&
          fieldBounds.right <= canvasBounds.right,
      };
    });

  expect(compactGeometry.canvasScrollWidth).toBeLessThanOrEqual(
    compactGeometry.canvasClientWidth + 1,
  );
  expect(compactGeometry.fieldInsideInlineBounds).toBe(true);
});

test("Hotkey Input authored invalid retry uses one recording boundary", async ({
  page,
}) => {
  await openComponent(page, "hotkey-input");
  const input = page.locator("#hotkey-invalid-en");
  const root = input.locator("xpath=..");

  await input.focus();
  await expect(root).toHaveAttribute("data-state", "recording");
  await expect(page.locator("#hotkey-invalid-feedback-en")).not.toHaveAttribute(
    "data-error",
  );
  await expect
    .poll(() =>
      root.evaluate((element) => {
        const probe = document.createElement("span");
        probe.style.border = "1px solid var(--ring)";
        probe.style.boxShadow = "var(--a3s-control-focus-shadow)";
        element.append(probe);
        const rootStyle = getComputedStyle(element);
        const probeStyle = getComputedStyle(probe);
        const result = {
          borderMatches: rootStyle.borderTopColor === probeStyle.borderTopColor,
          shadowMatches: rootStyle.boxShadow === probeStyle.boxShadow,
        };
        probe.remove();
        return result;
      }),
    )
    .toEqual({ borderMatches: true, shadowMatches: true });
});

test("Hotkey Input Chinese state examples keep localized retry feedback", async ({
  page,
}) => {
  await page.goto("components/hotkey-input.html", {
    waitUntil: "networkidle",
  });
  const invalid = page.locator("#hotkey-invalid-zh");
  const disabled = page.locator("#hotkey-disabled-zh");

  await expect(invalid.locator("xpath=..")).toHaveAttribute(
    "data-recorded-announcement",
    "当前快捷键",
  );
  await expect(disabled.locator("xpath=..")).toHaveAttribute(
    "data-recorded-announcement",
    "当前快捷键",
  );
  await invalid.focus();
  await expect(page.locator("#hotkey-invalid-feedback-zh")).toHaveText(
    "请按下一组完整组合键，按 Escape 取消。",
  );
});

test("Hotkey Input keeps touch targets and reduced motion explicit for coarse pointers", async ({
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
    const root = (await openComponent(page, "hotkey-input")).first();
    const input = root.locator("input");
    const clear = root.locator("[data-hotkey-clear]");
    const geometry = await root.evaluate((element) => {
      const clearButton = element.querySelector<HTMLElement>(
        "[data-hotkey-clear]",
      );
      const inputElement = element.querySelector<HTMLElement>("input");
      if (!clearButton || !inputElement) {
        throw new Error("Hotkey Input touch controls are missing");
      }
      const rootRect = element.getBoundingClientRect();
      const clearRect = clearButton.getBoundingClientRect();
      return {
        clearHeight: clearRect.height,
        clearWidth: clearRect.width,
        coarse: matchMedia("(pointer: coarse)").matches,
        inputFontSize: Number.parseFloat(
          getComputedStyle(inputElement).fontSize,
        ),
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        rootHeight: rootRect.height,
        transitionDuration: getComputedStyle(element).transitionDuration,
      };
    });

    expect(geometry.coarse).toBe(true);
    expect(geometry.reducedMotion).toBe(true);
    expect(geometry.rootHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.clearWidth).toBeGreaterThanOrEqual(44);
    expect(geometry.clearHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.inputFontSize).toBeGreaterThanOrEqual(16);
    expect(Number.parseFloat(geometry.transitionDuration)).toBeLessThanOrEqual(
      0.001,
    );

    await input.click();
    await expect(root).toHaveAttribute("data-state", "recording");
    await expect(clear).toBeHidden();
  } finally {
    await context.close();
  }
});

test("Hotkey Input reflows at a 200 percent equivalent viewport without clipping", async ({
  baseURL,
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  expect(baseURL).toBeTruthy();

  const context = await browser.newContext({
    baseURL,
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    viewport: { height: 450, width: 640 },
  });

  try {
    const page = await context.newPage();
    await openComponent(page, "hotkey-input");
    const preview = page.getByRole("region", {
      name: "Hotkey Input component preview",
    });
    await preview.getByRole("button", { name: "Preview in dark mode" }).click();
    await preview
      .getByRole("button", { name: "Preview right-to-left layout" })
      .click();

    const toolsGeometry = await preview
      .getByRole("group", { name: "Preview tools" })
      .evaluate((tools) => ({
        clientWidth: tools.clientWidth,
        scrollWidth: tools.scrollWidth,
      }));
    const geometry = await preview.evaluate((element) => {
      const canvas = element.querySelector<HTMLElement>(".a3s-preview__canvas");
      const field = canvas?.querySelector<HTMLElement>(".field");
      if (!canvas || !field) {
        throw new Error("Hotkey Input reflow surfaces are missing");
      }
      const canvasBounds = canvas.getBoundingClientRect();
      const fieldBounds = field.getBoundingClientRect();
      return {
        canvasClientWidth: canvas.clientWidth,
        canvasScrollWidth: canvas.scrollWidth,
        devicePixelRatio,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        fieldInsideInlineBounds:
          fieldBounds.left >= canvasBounds.left &&
          fieldBounds.right <= canvasBounds.right,
      };
    });

    expect(geometry.devicePixelRatio).toBe(2);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
      geometry.documentClientWidth + 1,
    );
    expect(toolsGeometry.scrollWidth).toBeLessThanOrEqual(
      toolsGeometry.clientWidth + 1,
    );
    expect(geometry.canvasScrollWidth).toBeLessThanOrEqual(
      geometry.canvasClientWidth + 1,
    );
    expect(geometry.fieldInsideInlineBounds).toBe(true);
  } finally {
    await context.close();
  }
});

test("Hotkey Input uses one system boundary in forced-colors recording and invalid states", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openComponent(page, "hotkey-input");
  const input = page.locator("#hotkey-invalid-en");
  const root = input.locator("xpath=..");

  await input.focus();
  await expect(root).toHaveAttribute("data-state", "recording");
  await expect
    .poll(() =>
      root.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderStyle: style.borderTopStyle,
          borderWidth: style.borderTopWidth,
          boxShadow: style.boxShadow,
          forcedColors: matchMedia("(forced-colors: active)").matches,
        };
      }),
    )
    .toEqual({
      borderStyle: "solid",
      borderWidth: "1px",
      boxShadow: "none",
      forcedColors: true,
    });

  await input.press("Escape");
  await expect(root).toHaveAttribute("data-state", "invalid");
  await expect(root).toHaveCSS("box-shadow", "none");
});

test("Image Viewer keeps a callable open API and complete transform lifecycle", async ({
  page,
}) => {
  const root = await openComponent(page, "image-viewer");
  await root.evaluate((element) => {
    const trigger = document.createElement("button");
    trigger.id = "image-viewer-test-trigger";
    trigger.textContent = "Open image";
    element.parentElement?.prepend(trigger);
    const viewer = element as HTMLDialogElement & {
      __blockOpen?: boolean;
      close(returnValue?: string, options?: Record<string, unknown>): boolean;
    };
    viewer.close("", { restoreFocus: false });
    viewer.__blockOpen = true;
    viewer.addEventListener("a3s:image-viewer-before-open", (event) => {
      if (viewer.__blockOpen) event.preventDefault();
    });
    trigger.focus();
  });
  const trigger = page.locator("#image-viewer-test-trigger");
  const blocked = await root.evaluate((element) => {
    const viewer = element as HTMLDialogElement & {
      open(source?: string, options?: Record<string, unknown>): boolean;
    };
    return {
      result: viewer.open("/UI/logo.png", {
        trigger: document.activeElement,
      }),
      type: typeof viewer.open,
    };
  });
  expect(blocked).toEqual({ result: false, type: "function" });
  await expect(root).not.toHaveAttribute("open");

  const transformed = await root.evaluate((element) => {
    const viewer = element as HTMLDialogElement & {
      __blockOpen?: boolean;
      getState(): {
        open: boolean;
        rotation: number;
        status: string;
        zoom: number;
      };
      open(source?: string, options?: Record<string, unknown>): boolean;
      reset(): { rotation: number; zoom: number };
      rotate(degrees?: number): number;
      zoom(value: number, options?: { relative?: boolean }): number;
    };
    viewer.__blockOpen = false;
    const opened = viewer.open("/UI/logo.png", {
      caption: "Official mark",
      trigger: document.activeElement,
    });
    const zoom = viewer.zoom(0.5, { relative: true });
    const rotation = viewer.rotate(90);
    const beforeReset = viewer.getState();
    const reset = viewer.reset();
    return { beforeReset, opened, reset, rotation, zoom };
  });
  expect(transformed.opened).toBe(true);
  expect(transformed.zoom).toBe(1.5);
  expect(transformed.rotation).toBe(90);
  expect(transformed.beforeReset).toMatchObject({ rotation: 90, zoom: 1.5 });
  expect(transformed.reset).toMatchObject({ rotation: 0, zoom: 1 });
  await expect(root).toHaveAttribute("open");
  await expect(root.locator("[data-image-viewer-caption]")).toHaveText(
    "Official mark",
  );

  await root.evaluate((element) =>
    element.setAttribute("data-dismissible", "false"),
  );
  await root.getByRole("button", { name: "Close" }).focus();
  await page.keyboard.press("Escape");
  await expect(root).toHaveAttribute("open");
  await root.evaluate((element) => element.removeAttribute("data-dismissible"));
  await page.keyboard.press("Escape");
  await expect(root).not.toHaveAttribute("open");
  await expect(root).toHaveAttribute("data-state", "closed");
  await expect(trigger).toBeFocused();
});

test("Image Viewer fits the initial asset and toolbar inside a compact preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const root = await openComponent(page, "image-viewer");
  const image = root.locator("img");
  await expect(image).toHaveJSProperty("complete", true);

  const geometry = await root.evaluate((element) => {
    const figure = element.querySelector("figure")!;
    const image = element.querySelector("img")!;
    const toolbar = element.querySelector<HTMLElement>(
      "[data-image-viewer-toolbar]",
    )!;
    const figureRect = figure.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const figureStyles = getComputedStyle(figure);
    const paddingInline =
      Number.parseFloat(figureStyles.paddingInlineStart) +
      Number.parseFloat(figureStyles.paddingInlineEnd);
    const paddingBlock =
      Number.parseFloat(figureStyles.paddingBlockStart) +
      Number.parseFloat(figureStyles.paddingBlockEnd);
    return {
      availableHeight: figureRect.height - paddingBlock,
      availableWidth: figureRect.width - paddingInline,
      imageHeight: imageRect.height,
      imageWidth: imageRect.width,
      toolbarOverflow: toolbar.scrollWidth - toolbar.clientWidth,
    };
  });

  expect(geometry.imageWidth).toBeGreaterThan(0);
  expect(geometry.imageHeight).toBeGreaterThan(0);
  expect(geometry.imageWidth).toBeLessThanOrEqual(geometry.availableWidth + 1);
  expect(geometry.imageHeight).toBeLessThanOrEqual(
    geometry.availableHeight + 1,
  );
  expect(geometry.toolbarOverflow).toBeLessThanOrEqual(1);
});

test("Sortable List restores a keyboard snapshot after rejected movement", async ({
  page,
}) => {
  const root = await openComponent(page, "sortable-list");
  const firstHandle = root.getByRole("button", { name: "Move Research" });
  await root.evaluate((element) => {
    const control = element as HTMLElement & {
      __blockLast?: boolean;
      __cancelCount?: number;
    };
    control.__blockLast = true;
    control.__cancelCount = 0;
    control.addEventListener("a3s:sortable-before-reorder", (event) => {
      if (control.__blockLast && (event as CustomEvent).detail.to === 2) {
        event.preventDefault();
      }
    });
    control.addEventListener("a3s:sortable-cancel", () => {
      control.__cancelCount = (control.__cancelCount ?? 0) + 1;
    });
  });
  await firstHandle.focus();
  await firstHandle.press("Space");
  await expect(root).toHaveAttribute("data-state", "keyboard");
  await firstHandle.press("ArrowDown");
  await expect
    .poll(() =>
      root.evaluate((element) =>
        (element as HTMLElement & { getOrder(): string[] }).getOrder(),
      ),
    )
    .toEqual(["review", "research", "publish"]);
  await firstHandle.press("End");
  await expect
    .poll(() =>
      root.evaluate((element) =>
        (element as HTMLElement & { getOrder(): string[] }).getOrder(),
      ),
    )
    .toEqual(["review", "research", "publish"]);
  await firstHandle.press("Escape");
  const cancelled = await root.evaluate((element) => {
    const control = element as HTMLElement & {
      __cancelCount?: number;
      getOrder(): string[];
    };
    return { count: control.__cancelCount, order: control.getOrder() };
  });
  expect(cancelled).toEqual({
    count: 1,
    order: ["research", "review", "publish"],
  });
  await expect(root).toHaveAttribute("data-state", "ready");
  await expect(firstHandle).toBeFocused();
  const disabledMove = await root.evaluate((element) => {
    const control = element as HTMLElement & {
      move(from: number, to: number): boolean;
    };
    control.setAttribute("data-disabled", "");
    return control.move(0, 1);
  });
  expect(disabledMove).toBe(false);
});

test("Streaming Text reports append, completion, and recoverable error state", async ({
  page,
}) => {
  const root = await openComponent(page, "streaming-text");
  const result = await root.evaluate((element) => {
    const control = element as HTMLElement & {
      append(value: string, options?: Record<string, unknown>): string;
      complete(options?: Record<string, unknown>): Record<string, unknown>;
      getState(): { message: string; state: string; text: string };
      setText(value: string, options?: Record<string, unknown>): string;
    };
    const chunks: string[] = [];
    const completions: string[] = [];
    control.addEventListener("a3s:streaming-text-update", (event) => {
      chunks.push((event as CustomEvent).detail.chunk);
    });
    control.addEventListener("a3s:streaming-text-complete", (event) => {
      completions.push((event as CustomEvent).detail.state);
    });
    control.setText("Review");
    control.append(" complete", { message: "Receiving" });
    const success = control.complete({ message: "Complete" });
    control.setText("Retrying", { state: "streaming" });
    const error = control.complete({
      error: "offline",
      message: "Retry",
      state: "error",
    });
    return { chunks, completions, error, final: control.getState(), success };
  });

  expect(result.chunks).toEqual(["Review", " complete", "Retrying"]);
  expect(result.completions).toEqual(["complete", "error"]);
  expect(result.success).toMatchObject({
    state: "complete",
    text: "Review complete",
  });
  expect(result.error).toMatchObject({ error: "offline", state: "error" });
  expect(result.final).toEqual({
    message: "Retry",
    state: "error",
    text: "Retrying",
  });
  await expect(root).toHaveAttribute("aria-busy", "false");
});

test("Table of Contents preserves current state when an unknown id is rejected", async ({
  page,
}) => {
  const root = await openComponent(page, "table-of-contents");
  const result = await root.evaluate((element) => {
    const control = element as HTMLElement & {
      getState(): { current: string; ids: string[] };
      setCurrent(value: string): boolean;
    };
    let changes = 0;
    control.addEventListener("a3s:table-of-contents-change", () => {
      changes += 1;
    });
    const accepted = control.setCurrent("contract");
    const rejected = control.setCurrent("missing-heading");
    return { accepted, changes, rejected, state: control.getState() };
  });

  expect(result).toEqual({
    accepted: true,
    changes: 1,
    rejected: false,
    state: {
      current: "contract",
      ids: ["overview", "contract", "accessibility"],
    },
  });
  await expect(root.locator('a[href="#contract"]')).toHaveAttribute(
    "aria-current",
    "location",
  );
});
