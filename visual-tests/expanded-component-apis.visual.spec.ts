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
  const root = await openComponent(page, "hotkey-input");
  const input = root.locator("input");
  await root.evaluate((element) => {
    const control = element as HTMLElement & { __blockValue?: string };
    control.__blockValue = "Control+Shift+X";
    control.addEventListener("a3s:hotkey-before-change", (event) => {
      if ((event as CustomEvent).detail.value === control.__blockValue) {
        event.preventDefault();
      }
    });
  });

  await input.focus();
  await input.press("Control+Shift+X");
  await expect(root).toHaveAttribute("data-hotkey-value", "Meta+K");
  await input.press("Control+Shift+P");
  await expect(root).toHaveAttribute("data-hotkey-value", "Control+Shift+P");
  await input.press("Escape");
  await expect(root).toHaveAttribute("data-hotkey-value", "Meta+K");
  await expect(root).toHaveAttribute("data-state", "ready");

  await input.focus();
  await input.press("Control+K");
  await input.press("Tab");
  await expect(root).toHaveAttribute("data-hotkey-value", "Control+K");
  await expect(root).toHaveAttribute("data-state", "ready");
  await expect(input).not.toBeFocused();
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
