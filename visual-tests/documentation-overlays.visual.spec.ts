import { expect, test, type Page } from "@playwright/test";

const overlayCases = [
  {
    popover: "#demo-dropdown-menu-popover",
    route: "dropdown-menu",
    trigger: "#demo-dropdown-menu-trigger",
  },
  {
    popover: "#demo-popover-popover",
    route: "popover",
    trigger: "#demo-popover-trigger",
  },
  {
    popover: "#select-demo-popover",
    route: "select",
    trigger: "#select-demo-trigger",
  },
  {
    popover: "#framework-combobox-popover",
    route: "combobox",
    trigger: "#framework-combobox > input[role=combobox]",
  },
] as const;

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

for (const overlayCase of overlayCases) {
  test(`${overlayCase.route} overlay is fully visible above its preview`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openDocumentationPage(page, overlayCase.route);

    const popover = page.locator(overlayCase.popover);
    const preview = popover.locator(
      "xpath=ancestor::section[contains(concat(' ', normalize-space(@class), ' '), ' a3s-preview ')][1]",
    );
    const stage = preview.locator(".a3s-preview__stage");

    await preview.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ behavior: "auto", top });
    });
    await page.locator(overlayCase.trigger).click();
    await expect(popover).toBeVisible();
    await expect(preview).toHaveAttribute("data-overlay-open", "");
    await waitForSettledFrames(page);

    const geometry = await popover.evaluate((element) => {
      const overlay = element as HTMLElement;
      const overlayRect = overlay.getBoundingClientRect();
      const previewStage = overlay.closest(
        ".a3s-preview__stage",
      ) as HTMLElement;
      const stageRect = previewStage.getBoundingClientRect();
      const stageStyle = getComputedStyle(previewStage);
      const inset = Math.min(3, overlayRect.width / 4, overlayRect.height / 4);
      const points = [
        [overlayRect.left + inset, overlayRect.top + inset],
        [overlayRect.right - inset, overlayRect.top + inset],
        [overlayRect.left + inset, overlayRect.bottom - inset],
        [overlayRect.right - inset, overlayRect.bottom - inset],
      ];

      return {
        cornersOwnTopLayer: points.map(([x, y]) => {
          const topElement = document.elementFromPoint(x, y);
          return Boolean(
            topElement &&
            (topElement === overlay || overlay.contains(topElement)),
          );
        }),
        overlay: overlayRect.toJSON(),
        stage: stageRect.toJSON(),
        stageOverflowX: stageStyle.overflowX,
        stageOverflowY: stageStyle.overflowY,
      };
    });

    expect(geometry.stageOverflowX).toBe("visible");
    expect(geometry.stageOverflowY).toBe("visible");
    expect(geometry.cornersOwnTopLayer).toEqual([true, true, true, true]);
    expect(geometry.overlay.top).toBeGreaterThanOrEqual(geometry.stage.top - 1);
    expect(geometry.overlay.bottom).toBeLessThanOrEqual(
      geometry.stage.bottom + 1,
    );
  });
}
