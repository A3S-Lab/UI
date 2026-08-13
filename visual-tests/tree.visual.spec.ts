import { expect, test, type Page } from "@playwright/test";

async function openTree(page: Page, locale = "en/") {
  await page.goto(`${locale}components/tree.html`);
  await page.evaluate(() => document.fonts.ready);
  const tree = page.locator("#tree-demo");
  await expect(tree).toHaveAttribute("data-tree-initialized", "true");
  return tree;
}

test("Tree keeps hierarchy, selection, and focus on one continuous surface", async ({
  page,
}) => {
  const tree = await openTree(page);
  const selected = tree.locator("#tree-demo-tree-css");
  const selectedRow = selected.locator(":scope > [data-tree-row]");
  const nestedGroup = tree
    .locator("#tree-demo-components")
    .locator(":scope > [role=group]");

  await expect(selected).toHaveAttribute("aria-selected", "true");
  await expect(selected).toHaveAttribute("tabindex", "0");
  await expect(nestedGroup).toBeVisible();

  const geometry = await selectedRow.evaluate((row) => {
    const style = getComputedStyle(row);
    const groupStyle = getComputedStyle(
      row.parentElement!.parentElement as HTMLElement,
    );
    return {
      backgroundColor: style.backgroundColor,
      height: row.getBoundingClientRect().height,
      guideWidth: groupStyle.borderInlineStartWidth,
    };
  });
  expect(geometry.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(geometry.height).toBeGreaterThanOrEqual(31);
  expect(geometry.guideWidth).toBe("1px");

  await selected.focus();
  await expect(selected).toBeFocused();
  const focus = await selectedRow.evaluate((row) => {
    const style = getComputedStyle(row);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focus.outlineStyle).toBe("solid");
  expect(focus.outlineWidth).toBe("2px");

  await page.locator("html").evaluate((html) => html.classList.add("dark"));
  await expect(selectedRow).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("Tree implements keyboard, disabled-node, typeahead, click, and RTL behavior", async ({
  page,
}) => {
  const tree = await openTree(page);
  const src = tree.locator("#tree-demo-src");
  const components = tree.locator("#tree-demo-components");
  const buttonCss = tree.getByRole("treeitem", { name: "button.css" });
  const treeCss = tree.locator("#tree-demo-tree-css");
  const tests = tree.locator("#tree-demo-tests");
  const packageJson = tree.getByRole("treeitem", { name: "package.json" });

  await src.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(src).toHaveAttribute("aria-expanded", "false");
  await expect(components).toBeHidden();

  await page.keyboard.press("ArrowRight");
  await expect(src).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowRight");
  await expect(components).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(buttonCss).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(treeCss).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(tests).toBeFocused();

  await tests.locator(":scope > [data-tree-row]").click();
  await expect(tests).toHaveAttribute("aria-expanded", "true");
  await expect(tests).toHaveAttribute("aria-selected", "true");
  await tests.locator(":scope > [data-tree-row]").click();
  await expect(tests).toHaveAttribute("aria-expanded", "false");

  await src.focus();
  await page.keyboard.press("p");
  await expect(packageJson).toBeFocused();

  const rtlTree = page.locator("#tree-demo-rtl");
  await expect(rtlTree).toHaveAttribute("data-tree-initialized", "true");
  const rtlBranch = rtlTree.getByRole("treeitem", { name: "المصدر" });
  await rtlBranch.focus();
  await page.keyboard.press("ArrowRight");
  await expect(rtlBranch).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("ArrowLeft");
  await expect(rtlBranch).toHaveAttribute("aria-expanded", "true");
});
