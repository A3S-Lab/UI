import { expect, test, type Page } from "@playwright/test";

const installedExtensionsStorageKey = "a3s-playground-installed-extensions";

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("extension review owns install, persistence, and reversible removal", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 1478, height: 900 });
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("playground/extensions.html", { waitUntil: "networkidle" });

  const marketplace = page.locator("[data-product-surface=marketplace]");
  await expect(marketplace).toHaveAttribute("data-hydrated", "true");
  const dependencyCard = marketplace.locator(
    "[data-extension-id=dependency-watch]",
  );
  await expect(dependencyCard).toHaveAttribute("data-installed", "false");
  await dependencyCard.locator("[data-extension-review]").click();

  const detail = marketplace.locator(".product-marketplace__detail");
  await expect(detail.locator("[data-extension-permissions]")).toBeVisible();
  await expect(detail.locator("dd[data-installed=false]")).toBeVisible();
  await detail.getByRole("button", { name: "确认并安装" }).click();
  await expect(detail.locator("button[aria-busy=true]")).toBeDisabled();
  await expect(dependencyCard).toHaveAttribute("data-installed", "true");
  await expect
    .poll(() =>
      page.evaluate(
        (storageKey) => localStorage.getItem(storageKey),
        installedExtensionsStorageKey,
      ),
    )
    .toContain("dependency-watch");

  await page.reload({ waitUntil: "networkidle" });
  const restoredCard = page.locator("[data-extension-id=dependency-watch]");
  await expect(restoredCard).toHaveAttribute("data-installed", "true");
  await restoredCard.locator("[data-extension-review]").click();
  await page.getByRole("button", { name: "卸载", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "卸载这个扩展？" });
  await expect(confirmation).toContainText("任务内容和证据不会被删除");
  await confirmation.getByRole("button", { name: "取消" }).click();
  await expect(
    page.locator(".product-marketplace__detail button[data-danger]"),
  ).toBeFocused();

  await page.getByRole("button", { name: "卸载", exact: true }).click();
  await confirmation.getByRole("button", { name: "确认卸载" }).click();
  await expect(restoredCard).toHaveAttribute("data-installed", "false");
  await page
    .getByRole("combobox", { name: "扩展排序" })
    .selectOption("updated");
  await expect(
    marketplace.locator(".product-marketplace__directory article").first(),
  ).toHaveAttribute("data-extension-id", "dependency-watch");

  expect(runtimeErrors).toEqual([]);
});

test("phone extension details are complete, bounded, and restore focus", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ width: 390, height: 844 });
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("playground/extensions.html", { waitUntil: "networkidle" });

  const trigger = page.locator(
    "[data-extension-id=dependency-watch] [data-extension-review]",
  );
  await trigger.click();
  const dialog = page.locator("[data-extension-detail-dialog][open]");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-extension-permissions]")).toBeVisible();
  await expect(dialog.locator("[data-extension-detail-close]")).toBeFocused();

  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(runtimeErrors).toEqual([]);
});

test("English dark mode preserves source validation and host boundaries", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.addInitScript(() => {
    localStorage.setItem("rspress-theme-appearance", "dark");
    localStorage.setItem("themeMode", "dark");
  });
  await page.setViewportSize({ width: 1478, height: 900 });
  const runtimeErrors = collectRuntimeErrors(page);
  await page.goto("en/playground/extensions.html", {
    waitUntil: "networkidle",
  });

  await expect(page.locator("html")).toHaveClass(/dark/u);
  await page.getByRole("tab", { name: "Sources" }).click();
  await page.getByRole("button", { name: "Refresh sources" }).click();
  await expect(
    page.locator("button[data-source-refresh-state=refreshing]"),
  ).toBeDisabled();
  await expect(
    page.locator("button[data-source-refresh-state=ready]"),
  ).toBeEnabled();

  await page.getByRole("button", { name: "Add source" }).click();
  await page
    .getByRole("textbox", { name: "Source name" })
    .fill("Design registry");
  const address = page.getByRole("textbox", { name: "Source address" });
  await address.fill("http://extensions.example.com");
  await address.press("Enter");
  await expect(page.getByText("Remote sources must use HTTPS")).toBeVisible();
  await address.fill("https://extensions.example.com");
  await address.press("Enter");
  await expect(page.locator("[data-source-id=custom-3]")).toContainText(
    "Pending review",
  );

  await testInfo.attach("marketplace-dark-english", {
    body: await page.screenshot({ animations: "disabled", fullPage: false }),
    contentType: "image/png",
  });
  expect(runtimeErrors).toEqual([]);
});
