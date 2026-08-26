import { expect, test, type Page } from "@playwright/test";

async function openComponent(page: Page, component: string) {
  await page.goto(`en/components/${component}.html`, {
    waitUntil: "networkidle",
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");
}

test("Data Grid controlled APIs are cancellable and return exact snapshots", async ({
  page,
}) => {
  await openComponent(page, "data-grid");
  const grid = page.locator("#data-grid-demo-en");

  const result = await grid.evaluate((element) => {
    const root = element as HTMLElement & {
      getSelection(): { selectedCount: number; values: string[] };
      getSort(): { direction: string; key: string };
      getState(): { name: string };
      setSelection(values: string[]): boolean;
      setSort(key: string, direction: string): boolean;
      setState(name: string): { name: string };
    };
    let blockedSelection = 0;
    let blockedSort = 0;
    root.addEventListener("a3s:data-grid-before-selection-change", (event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.current.values.includes("staging")) {
        blockedSelection += 1;
        event.preventDefault();
      }
    });
    root.addEventListener("a3s:data-grid-before-sort", (event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.current.direction === "descending") {
        blockedSort += 1;
        event.preventDefault();
      }
    });
    const rejectedSelection = root.setSelection(["production", "staging"]);
    const rejectedSnapshot = root.getSelection();
    const acceptedSelection = root.setSelection(["preview"]);
    const acceptedSnapshot = root.getSelection();
    const acceptedSort = root.setSort("name", "ascending");
    const rejectedSort = root.setSort("name", "descending");
    const sort = root.getSort();
    root.setState("loading");
    return {
      acceptedSelection,
      acceptedSort,
      afterAcceptedSelection: {
        selectedCount: acceptedSnapshot.selectedCount,
        values: acceptedSnapshot.values,
      },
      afterRejectedSelection: {
        selectedCount: rejectedSnapshot.selectedCount,
        values: rejectedSnapshot.values,
      },
      blockedSelection,
      blockedSort,
      rejectedSelection,
      rejectedSort,
      sort,
      state: root.getState().name,
    };
  });

  expect(result).toEqual({
    acceptedSelection: true,
    acceptedSort: true,
    afterAcceptedSelection: { selectedCount: 1, values: ["preview"] },
    afterRejectedSelection: { selectedCount: 1, values: ["production"] },
    blockedSelection: 1,
    blockedSort: 1,
    rejectedSelection: false,
    rejectedSort: false,
    sort: { direction: "ascending", key: "name" },
    state: "loading",
  });
  await expect(grid).toHaveAttribute("aria-busy", "true");
  await expect(
    grid.locator('[data-grid-select][value="preview"]'),
  ).toBeChecked();
  await expect(
    grid.locator('[data-grid-select][value="production"]'),
  ).not.toBeChecked();
});

test("Filter Bar restores rejected queries and emits one native input", async ({
  page,
}) => {
  await openComponent(page, "filter-bar");
  const root = page.locator("#filter-bar-demo-en");
  const search = root.locator('input[name="query"]');

  const result = await root.evaluate((element) => {
    const filters = element as HTMLElement & {
      getState(): {
        filters: Array<{ name: string; value: string }>;
        search: Record<string, string>;
      };
      resetFilters(): boolean;
      setFilters(values: Array<{ name: string; value: string }>): boolean;
      setSearch(value: Record<string, string>): boolean;
    };
    let customEvents = 0;
    let inputEvents = 0;
    filters.addEventListener("a3s:filter-before-change", (event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.current.search.query === "blocked") event.preventDefault();
    });
    filters.addEventListener("a3s:filter-change", () => {
      customEvents += 1;
    });
    filters
      .querySelector('input[name="query"]')
      ?.addEventListener("input", () => {
        inputEvents += 1;
      });
    const rejected = filters.setSearch({ query: "blocked" });
    const afterRejected = filters.getState();
    const accepted = filters.setSearch({ query: "release" });
    filters.setFilters([{ name: "state", value: "paused" }]);
    const controlled = filters.getState();
    filters.resetFilters();
    return {
      accepted,
      afterRejected,
      controlled,
      customEvents,
      inputEvents,
      rejected,
      reset: filters.getState(),
    };
  });

  expect(result.rejected).toBe(false);
  expect(result.afterRejected.search.query).toBe("");
  expect(result.accepted).toBe(true);
  expect(result.controlled).toEqual({
    filters: [{ name: "state", value: "paused" }],
    search: { query: "release" },
  });
  expect(result.inputEvents).toBe(1);
  expect(result.customEvents).toBe(3);
  expect(result.reset).toEqual({
    filters: [{ name: "state", value: "active" }],
    search: { query: "" },
  });
  await expect(search).toHaveValue("");
});

test("Context Menu exposes cancellable open, select, and close lifecycles", async ({
  page,
}) => {
  await openComponent(page, "context-menu");
  const root = page.locator("#context-menu-demo-en");
  const trigger = root.locator(":scope > [data-context-trigger]");
  const menu = root.locator(":scope > [data-context-content]");

  await root.evaluate((element) => {
    const target = element as HTMLElement & {
      __blockClose?: boolean;
      __blockOpen?: boolean;
      __blockSelect?: boolean;
    };
    target.__blockOpen = true;
    target.__blockSelect = true;
    target.__blockClose = true;
    target.addEventListener("a3s:context-menu-before-open", (event) => {
      if (target.__blockOpen) event.preventDefault();
    });
    target.addEventListener("a3s:context-menu-before-select", (event) => {
      if (
        target.__blockSelect &&
        (event as CustomEvent).detail.value === "delete"
      ) {
        event.preventDefault();
      }
    });
    target.addEventListener("a3s:context-menu-before-close", (event) => {
      if (target.__blockClose) event.preventDefault();
    });
  });

  await trigger.focus();
  await trigger.press("Shift+F10");
  await expect(menu).toHaveAttribute("aria-hidden", "true");
  await root.evaluate((element) => {
    (element as HTMLElement & { __blockOpen?: boolean }).__blockOpen = false;
  });
  await trigger.press("Shift+F10");
  await expect(menu).toHaveAttribute("aria-hidden", "false");
  await menu.getByRole("menuitem", { name: "Delete" }).click();
  await expect(menu).toHaveAttribute("aria-hidden", "false");
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-hidden", "false");
  await root.evaluate((element) => {
    const target = element as HTMLElement & {
      __blockClose?: boolean;
      __blockSelect?: boolean;
      close(options: { reason: string }): boolean;
      getState(): { open: boolean };
      setChecked(value: string, checked: boolean): boolean;
    };
    target.__blockClose = false;
    target.__blockSelect = false;
    target.setChecked("watch", false);
    target.close({ reason: "test" });
    return target.getState();
  });
  await expect(menu).toHaveAttribute("aria-hidden", "true");
  await expect(
    menu.locator('[role="menuitemcheckbox"][data-value="watch"]'),
  ).toHaveAttribute("aria-checked", "false");
});

test("Bulk Action Bar restores disabled state and reports async completion", async ({
  page,
}) => {
  await openComponent(page, "bulk-action-bar");
  const root = page.locator("#bulk-action-bar-demo-en");
  const bar = root.locator(":scope > .bulk-action-bar");
  const archive = bar.locator('[data-bulk-action="archive"]');
  const remove = bar.locator('[data-bulk-action="delete"]');

  await remove.evaluate((element) => {
    (element as HTMLButtonElement).disabled = true;
  });
  const pending = await bar.evaluate((element) => {
    const bar = element as HTMLElement & {
      complete(result: Record<string, unknown>): Record<string, unknown>;
      getSelection(): { count: number; values: string[] };
      setPending(action: string, options: { message: string }): void;
      setSelection(values: string[]): void;
    };
    bar.setSelection(["alpha", "beta", "gamma"]);
    bar.setPending("archive", { message: "Archiving selected items…" });
    return bar.getSelection();
  });
  expect(pending).toEqual({ count: 3, values: ["alpha", "beta", "gamma"] });
  await expect(bar).toHaveAttribute("data-state", "loading");
  await expect(archive).toHaveAttribute("data-pending", "true");
  await expect(archive).toBeDisabled();

  const completion = await bar.evaluate((element) => {
    const bar = element as HTMLElement & {
      complete(result: Record<string, unknown>): Record<string, unknown>;
    };
    return bar.complete({
      action: "archive",
      message: "Archive failed. Try again.",
      processedCount: 0,
      status: "error",
    });
  });
  expect(completion.status).toBe("error");
  await expect(bar).toHaveAttribute("data-result", "error");
  await expect(bar).toHaveAttribute("data-state", "selected");
  await expect(archive).toBeEnabled();
  await expect(remove).toBeDisabled();
  await expect(bar.locator("[data-bulk-summary]")).toHaveText(
    "Archive failed. Try again.",
  );
});

test("Bulk Action Bar restores focus without stealing a host redirect", async ({
  page,
}) => {
  await openComponent(page, "bulk-action-bar");
  const root = page.locator("#bulk-action-bar-demo-en");
  const bar = root.locator(":scope > .bulk-action-bar");
  const clear = bar.locator("[data-bulk-clear]");
  const target = page.locator("#bulk-action-bar-collection-en");

  const firstClear = await bar.evaluate((element) => {
    const bar = element as HTMLElement & {
      clear(options?: Record<string, unknown>): boolean;
      setSelection(values: string[]): boolean;
    };
    const clear = bar.querySelector("[data-bulk-clear]") as HTMLElement;
    const events: string[] = [];
    bar.addEventListener("a3s:bulk-focus-restored", () => {
      events.push("restored");
    });
    bar.setSelection(["alpha", "beta"]);
    clear.focus();
    bar.clear({ source: "test" });
    return new Promise((resolve) =>
      queueMicrotask(() =>
        resolve({
          activeId: document.activeElement?.id || "",
          events,
          hidden: bar.hidden,
        }),
      ),
    );
  });
  expect(firstClear).toEqual({
    activeId: "bulk-action-bar-collection-en",
    events: ["restored"],
    hidden: true,
  });
  await expect(target).toBeFocused();

  const redirected = await bar.evaluate((element) => {
    const bar = element as HTMLElement & {
      clear(options?: Record<string, unknown>): boolean;
      setSelection(values: string[]): boolean;
    };
    const clear = bar.querySelector("[data-bulk-clear]") as HTMLElement;
    const outside = document.createElement("button");
    outside.type = "button";
    outside.id = "bulk-focus-host-redirect";
    outside.textContent = "Host redirect";
    bar.parentElement?.append(outside);
    const events: string[] = [];
    bar.addEventListener("a3s:bulk-focus-restored", () => {
      events.push("restored");
    });
    bar.setSelection(["alpha"]);
    clear.focus();
    bar.clear({ source: "test" });
    outside.focus();
    return new Promise((resolve) =>
      queueMicrotask(() =>
        resolve({
          activeId: document.activeElement?.id || "",
          events,
        }),
      ),
    );
  });
  expect(redirected).toEqual({
    activeId: "bulk-focus-host-redirect",
    events: [],
  });
});

test("Bulk Action Bar preserves pending escape and restores the completion snapshot", async ({
  page,
}) => {
  await openComponent(page, "bulk-action-bar");
  const root = page.locator("#bulk-action-bar-demo-en");
  const bar = root.locator(":scope > .bulk-action-bar");
  const clear = bar.locator("[data-bulk-clear]");
  const archive = bar.locator('[data-bulk-action="archive"]');
  const target = page.locator("#bulk-action-bar-collection-en");

  await bar.evaluate((element) => {
    const bar = element as HTMLElement & {
      setSelection(values: string[]): boolean;
      setPending(
        action: string | boolean,
        pending?: boolean | Record<string, unknown>,
        options?: Record<string, unknown>,
      ): void;
    };
    bar.setSelection(["alpha", "beta"]);
    bar.setPending("archive", true, { allowClear: true, message: "Working" });
  });
  await expect(archive).toBeDisabled();
  await expect(clear).toBeEnabled();

  await clear.focus();
  await clear.click();
  await expect(bar).toBeVisible();
  await expect(bar).toHaveAttribute("data-state", "loading");
  await expect(bar).toHaveAttribute("data-selection-cleared", "true");
  await expect(clear).toBeFocused();

  const completion = await bar.evaluate((element) => {
    const bar = element as HTMLElement & {
      complete(result: Record<string, unknown>): Record<string, unknown>;
      getSelection(): { count: number; values: string[] };
    };
    const events: Array<Record<string, unknown>> = [];
    bar.addEventListener("a3s:bulk-focus-restored", () => {
      events.push({ type: "focus" });
    });
    let detail: Record<string, unknown> | null = null;
    bar.addEventListener("a3s:bulk-action-complete", (event) => {
      detail = (event as CustomEvent).detail;
    });
    const result = bar.complete({
      action: "archive",
      clearSelection: true,
      processedCount: 2,
      status: "success",
      message: "Done",
    });
    return new Promise((resolve) =>
      queueMicrotask(() => resolve({ detail, events, result, selection: bar.getSelection() })),
    );
  });
  expect(completion.result).toMatchObject({
    action: "archive",
    status: "success",
    processedCount: 2,
    selection: { count: 2, values: ["alpha", "beta"] },
  });
  expect(completion.detail).toMatchObject({
    action: "archive",
    selection: { count: 2, values: ["alpha", "beta"] },
  });
  expect(completion.events).toEqual([{ type: "focus" }]);
  await expect(bar).toBeHidden();
  await expect(target).toBeFocused();

  await bar.evaluate((element) => {
    const bar = element as HTMLElement & {
      setSelection(values: string[]): boolean;
      setPending(
        action: string | boolean,
        pending?: boolean | Record<string, unknown>,
        options?: Record<string, unknown>,
      ): void;
    };
    bar.setSelection(["alpha"]);
    bar.setPending("archive", true, { allowClear: false });
  });
  await expect(clear).toBeDisabled();
  await expect(archive).toBeDisabled();
});

test("File Explorer protects selection, restores filters, and recovers rename errors", async ({
  page,
}) => {
  await openComponent(page, "file-explorer");
  const root = page.locator("#file-explorer-demo-en");
  const app = root.locator(
    '[role="treeitem"][data-value="src/components/App.tsx"]',
  );
  const status = root.locator(
    '[role="treeitem"][data-value="src/components/Status.tsx"]',
  );
  const tests = root.locator('[role="treeitem"][data-value="tests"]');

  await expect(root).toHaveAttribute("data-file-explorer-initialized", "true");
  await root.evaluate((element) => {
    const explorer = element as HTMLElement & { __blockStatus?: boolean };
    explorer.__blockStatus = true;
    explorer.addEventListener("a3s:file-before-selection-change", (event) => {
      if (
        explorer.__blockStatus &&
        (event as CustomEvent).detail.current.value.endsWith("Status.tsx")
      ) {
        event.preventDefault();
      }
    });
  });
  await status.locator(":scope > [data-tree-row]").click();
  await expect(app).toHaveAttribute("aria-selected", "true");
  await root.evaluate((element) => {
    (element as HTMLElement & { __blockStatus?: boolean }).__blockStatus =
      false;
  });
  await status.locator(":scope > [data-tree-row]").click();
  await expect(status).toHaveAttribute("aria-selected", "true");

  await root.evaluate((element) => {
    const explorer = element as HTMLElement & {
      clearFilter(): boolean;
      getFilter(): string;
      setFilter(value: string): boolean;
    };
    explorer.setFilter("status");
  });
  await expect(root).toHaveAttribute("data-filter", "results");
  await expect(root.locator("[data-file-filter-count]")).toHaveText("1");
  await expect(status).toBeVisible();
  await expect(tests).toBeHidden();
  await root.evaluate((element) => {
    (element as HTMLElement & { clearFilter(): boolean }).clearFilter();
  });
  await expect(tests).toBeVisible();
  await expect(tests).toHaveAttribute("aria-expanded", "false");
  await expect(root.locator("[data-file-filter-count]")).toHaveText("5");

  await root.evaluate((element) => {
    const explorer = element as HTMLElement & {
      beginRename(value?: string): boolean;
      commitRename(value: string): boolean;
    };
    explorer.beginRename("src/components/Status.tsx");
    explorer.commitRename("bad/name.tsx");
  });
  const editor = status.locator("[data-file-editor]");
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute("aria-invalid", "true");
  await editor.fill("Health.tsx");
  await editor.press("Enter");
  await expect(status.locator("[data-tree-label]")).toHaveText("Health.tsx");
  await expect(status).toBeFocused();

  await root.evaluate((element) => {
    const explorer = element as HTMLElement & {
      setRenameError(message: string): boolean;
    };
    explorer.setRenameError("A file with this name already exists.");
  });
  await expect(status.locator("[data-file-editor]")).toHaveValue("Health.tsx");
  await expect(status.locator("[data-file-rename-error]")).toHaveText(
    "A file with this name already exists.",
  );
  await status.locator("[data-file-editor]").press("Escape");
  await expect(status.locator("[data-tree-label]")).toHaveText("Status.tsx");

  await root.evaluate((element) => {
    (
      element as HTMLElement & { setReadonly(value: boolean): boolean }
    ).setReadonly(true);
  });
  await expect(root.locator('[data-file-action="new-file"]')).toBeHidden();
  await expect(
    root.locator('[data-context-content] [data-value="rename"]'),
  ).toHaveAttribute("hidden", "");
  await expect(
    root.locator('[data-context-content] [data-value="open"]'),
  ).not.toHaveAttribute("hidden", "");
});
