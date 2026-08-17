import { expect, test } from "@playwright/test";

test("composition patterns open from a task-oriented catalog", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  if (page.viewportSize()!.width <= 768) {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.goto("en/patterns/index.html");
  await page.evaluate(() => document.fonts.ready);

  const catalog = page.locator("[data-pattern-catalog]");
  await expect(catalog).toBeVisible();
  await expect(
    catalog.getByRole("heading", { level: 1, name: "Composition patterns" }),
  ).toBeVisible();

  const menu = catalog.getByRole("complementary", { name: "Pattern menu" });
  const mobileMenu = catalog.getByRole("button", { name: "Open pattern menu" });
  if (page.viewportSize()!.width <= 768) {
    await expect(menu).toBeHidden();
    await expect(mobileMenu).toBeVisible();
    await mobileMenu.click();
    await expect(menu).toBeVisible();
    await expect(
      catalog.getByRole("button", { name: "Close pattern menu" }).first(),
    ).toBeVisible();
    await expect
      .poll(async () => Math.abs((await menu.boundingBox())!.x))
      .toBeLessThanOrEqual(1);
    await catalog
      .getByRole("button", { name: "Close pattern menu" })
      .last()
      .click();
    await expect(mobileMenu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeHidden();
  } else {
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    expect(menuBox).not.toBeNull();
    expect(menuBox!.width).toBeGreaterThanOrEqual(240);
    expect(menuBox!.width).toBeLessThanOrEqual(300);

    const more = menu.locator(".pattern-menu__more");
    await more.locator("summary").click();
    await expect(more.getByRole("menu")).toBeVisible();
    await expect(more.getByRole("menuitem")).toHaveCount(4);
    await expect(more.getByRole("separator")).toHaveCount(1);

    const filterButton = menu.getByRole("button", {
      name: "Filter patterns",
    });
    await filterButton.click();
    await expect(
      menu.getByRole("region", { name: "Pattern filters" }),
    ).toBeVisible();
    await filterButton.click();
  }

  const recommendedPattern = catalog.locator(
    ".pattern-catalog__recommended [data-pattern-link]",
  );
  await expect(recommendedPattern).toHaveAttribute(
    "href",
    "/UI/en/patterns/task-workspace.html",
  );

  const patternLinks = catalog.locator("[data-pattern-link]");
  await expect(patternLinks).toHaveCount(9);

  if (page.viewportSize()!.width <= 768) {
    const firstResultBox = await catalog
      .locator("[data-pattern-result]")
      .first()
      .boundingBox();
    expect(firstResultBox).not.toBeNull();
    expect(page.viewportSize()!.height - firstResultBox!.y).toBeGreaterThan(64);
  }

  const search = catalog.getByRole("searchbox", { name: "Search patterns" });
  const results = catalog.locator("#pattern-catalog-results");
  const resultsTopBeforeSearch = await results.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  await search.fill("settings");
  const resultsTopAfterSearch = await results.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(Math.abs(resultsTopAfterSearch - resultsTopBeforeSearch)).toBeLessThan(
    1,
  );
  await expect(recommendedPattern).toBeVisible();
  await expect(catalog.locator("[data-pattern-result]")).toHaveCount(1);
  await expect(
    catalog.getByRole("link", { name: /Settings center/ }),
  ).toBeVisible();

  await search.fill("");
  await catalog
    .getByRole("group", { name: "Filter by responsibility" })
    .getByRole("button", { name: "Integration" })
    .click();
  await expect(catalog.locator("[data-pattern-result]")).toHaveCount(3);
  await expect(
    catalog.getByRole("link", { name: /Host integrations/ }),
  ).toBeVisible();

  const layout = await catalog.evaluate((element) => ({
    overflow: element.scrollWidth - element.clientWidth,
    width: element.getBoundingClientRect().width,
  }));
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.width).toBeGreaterThan(0);

  if (page.viewportSize()!.width <= 768) {
    await mobileMenu.click();
  }
  const secondaryMenu = menu.locator(".pattern-menu__more");
  await secondaryMenu.locator("summary").click();
  await secondaryMenu
    .getByRole("menuitem", { name: "Settings center" })
    .click();
  await expect(page).toHaveURL(/\/en\/patterns\/settings-center\.html$/u);
  expect(runtimeErrors).toEqual([]);
});
