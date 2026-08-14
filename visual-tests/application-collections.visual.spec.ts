import { expect, test, type Page } from "@playwright/test";

async function openComponent(page: Page, component: string) {
  await page.goto(`en/components/${component}.html`, {
    waitUntil: "networkidle",
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");
}

test("Data Grid synchronizes partial, full, cleared, and sorted state", async ({
  page,
}) => {
  await openComponent(page, "data-grid");
  const grid = page.locator("#data-grid-demo-en");
  const selectAll = grid.locator("[data-grid-select-all]");
  const rowCheckboxes = grid.locator("[data-grid-select]");
  const bulkBar = grid.locator(".bulk-action-bar");

  await expect(grid).toHaveAttribute("data-data-grid-initialized", "true");
  await expect(grid).toHaveAttribute("data-selection", "some");
  await expect(selectAll).not.toBeChecked();
  await expect
    .poll(() =>
      selectAll.evaluate(
        (element) => (element as HTMLInputElement).indeterminate,
      ),
    )
    .toBe(true);
  await expect(bulkBar).toBeVisible();
  await expect(bulkBar.locator("[data-selected-count]")).toHaveText("1");

  await grid.evaluate((element) => {
    const root = element as HTMLElement & {
      __selectionEvents?: Array<{ selectedCount: number; values: string[] }>;
      __sortEvents?: Array<{ direction: string; key: string }>;
    };
    root.__selectionEvents = [];
    root.__sortEvents = [];
    root.addEventListener("a3s:data-grid-selection-change", (event) => {
      const detail = (event as CustomEvent).detail;
      root.__selectionEvents?.push({
        selectedCount: detail.selectedCount,
        values: detail.values,
      });
    });
    root.addEventListener("a3s:data-grid-sort", (event) => {
      root.__sortEvents?.push((event as CustomEvent).detail);
    });
  });

  await selectAll.check();
  await expect(rowCheckboxes).toHaveCount(3);
  await expect
    .poll(() =>
      rowCheckboxes.evaluateAll((inputs) =>
        inputs.every((input) => (input as HTMLInputElement).checked),
      ),
    )
    .toBe(true);
  await expect(grid).toHaveAttribute("data-selection", "all");
  await expect(bulkBar.locator("[data-selected-count]")).toHaveText("3");

  await rowCheckboxes.nth(1).uncheck();
  await expect(grid).toHaveAttribute("data-selection", "some");
  await expect
    .poll(() =>
      selectAll.evaluate(
        (element) => (element as HTMLInputElement).indeterminate,
      ),
    )
    .toBe(true);

  const sort = grid.locator("[data-grid-sort=name]");
  const header = sort.locator("xpath=ancestor::th");
  await sort.click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await sort.click();
  await expect(header).toHaveAttribute("aria-sort", "descending");

  await grid.locator("[data-grid-clear-selection]").click();
  await expect(grid).toHaveAttribute("data-selection", "none");
  await expect(bulkBar).toBeHidden();
  await expect(selectAll).not.toBeChecked();
  await expect
    .poll(() =>
      selectAll.evaluate(
        (element) => (element as HTMLInputElement).indeterminate,
      ),
    )
    .toBe(false);

  const events = await grid.evaluate((element) => {
    const root = element as HTMLElement & {
      __selectionEvents?: Array<{ selectedCount: number; values: string[] }>;
      __sortEvents?: Array<{ direction: string; key: string }>;
    };
    return {
      selection: root.__selectionEvents,
      sort: root.__sortEvents,
    };
  });
  expect(events.selection?.map((event) => event.selectedCount)).toEqual([
    3, 2, 0,
  ]);
  expect(events.selection?.at(-1)?.values).toEqual([]);
  expect(events.sort).toEqual([
    { direction: "ascending", key: "name" },
    { direction: "descending", key: "name" },
  ]);
});

test("Filter Bar keeps required selection and clears compound search", async ({
  page,
}) => {
  await openComponent(page, "filter-bar");
  const filters = page.locator("#filter-bar-demo-en");
  const search = filters.locator("input[type=search]");
  const all = filters.locator("[data-filter-toggle][data-filter-value=all]");
  const active = filters.locator(
    "[data-filter-toggle][data-filter-value=active]",
  );
  const paused = filters.locator(
    "[data-filter-toggle][data-filter-value=paused]",
  );
  const chip = filters.locator("[data-filter-chip]");

  await expect(filters).toHaveAttribute("data-filter-bar-initialized", "true");
  await filters.evaluate((element) => {
    const root = element as HTMLElement & {
      __filterEvents?: Array<Record<string, unknown>>;
    };
    root.__filterEvents = [];
    root.addEventListener("a3s:filter-change", (event) => {
      root.__filterEvents?.push((event as CustomEvent).detail);
    });
  });

  await paused.click();
  await expect(paused).toHaveAttribute("aria-pressed", "true");
  await expect(active).toHaveAttribute("aria-pressed", "false");
  await expect(chip).toBeHidden();

  await active.click();
  await expect(chip).toBeVisible();
  await chip.locator("[data-filter-remove]").click();
  await expect(all).toHaveAttribute("aria-pressed", "true");
  await expect(active).toHaveAttribute("aria-pressed", "false");
  await expect(chip).toBeHidden();
  await expect(active).toBeFocused();

  await search.fill("release");
  await expect(search).toHaveValue("release");
  await filters.locator("[data-filter-clear]").click();
  await expect(search).toHaveValue("");
  await expect(all).toHaveAttribute("aria-pressed", "true");

  const events = await filters.evaluate((element) => {
    const root = element as HTMLElement & {
      __filterEvents?: Array<Record<string, unknown>>;
    };
    return root.__filterEvents;
  });
  expect(
    events?.some(
      (event) => event.kind === "search" && event.value === "release",
    ),
  ).toBe(true);
  expect(events?.at(-1)?.kind).toBe("clear");
});

test("Context Menu supports pointer and complete keyboard navigation", async ({
  page,
}) => {
  await openComponent(page, "context-menu");
  const root = page.locator("#context-menu-demo-en");
  const trigger = root.locator(":scope > [data-context-trigger]");
  const menu = root.locator(":scope > [data-context-content]");
  const submenu = root.locator("[data-context-submenu-content]");

  await expect(root).toHaveAttribute("data-context-menu-initialized", "true");
  await root.evaluate((element) => {
    const target = element as HTMLElement & { __selectedValue?: string };
    target.addEventListener("a3s:context-menu-select", (event) => {
      target.__selectedValue = (event as CustomEvent).detail.value;
    });
  });

  await trigger.click({ button: "right", position: { x: 32, y: 24 } });
  await expect(menu).toHaveAttribute("aria-hidden", "false");
  await expect(
    menu.getByRole("menuitem", { name: /Open Enter/ }),
  ).toBeFocused();
  await page.keyboard.press("Escape");

  await trigger.focus();
  await trigger.press("Shift+F10");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: /Open with/ })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(submenu).toHaveAttribute("aria-hidden", "false");
  await expect(
    submenu.getByRole("menuitemradio", { name: "Text editor" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    submenu.getByRole("menuitemradio", { name: "Diff view" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
  await expect
    .poll(() =>
      root.evaluate(
        (element) =>
          (element as HTMLElement & { __selectedValue?: string })
            .__selectedValue,
      ),
    )
    .toBe("diff");

  await trigger.press("Shift+F10");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Delete" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("File Explorer composes Tree and Context Menu without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openComponent(page, "file-explorer");
  const preview = page.locator(
    ".a3s-preview[data-preview-component=file-explorer]",
  );
  const explorer = preview.locator(".file-explorer");
  const tree = explorer.locator(".tree");
  const statusFile = tree.locator('[data-value="src/components/Status.tsx"]');
  const menu = explorer.locator("[data-context-content]");

  await expect(tree).toHaveAttribute("data-tree-initialized", "true");
  await explorer.evaluate((element) => {
    const root = element as HTMLElement & { __fileAction?: string };
    root.addEventListener("a3s:context-menu-select", (event) => {
      root.__fileAction = (event as CustomEvent).detail.value;
    });
  });

  await statusFile.locator(":scope > [data-tree-row]").click();
  await expect(statusFile).toHaveAttribute("aria-selected", "true");
  await expect(statusFile).toBeFocused();
  await statusFile
    .locator(":scope > [data-tree-row]")
    .click({ button: "right" });
  await expect(menu).toHaveAttribute("aria-hidden", "false");
  await menu.getByRole("menuitem", { name: "Copy relative path" }).click();
  await expect(statusFile).toBeFocused();
  await expect
    .poll(() =>
      explorer.evaluate(
        (element) =>
          (element as HTMLElement & { __fileAction?: string }).__fileAction,
      ),
    )
    .toBe("copy-path");

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
  await expect(explorer).toBeVisible();
});
