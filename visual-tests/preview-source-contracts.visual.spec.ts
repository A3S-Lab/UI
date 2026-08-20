import { expect, test } from "@playwright/test";
import { components } from "../src/ai/manifest/index.js";

declare global {
  interface Window {
    __previewCopiedSource?: string;
  }
}

const locales = [
  {
    code: "en",
    integrationLabel: "Show integration code",
    path: "en/",
  },
  { code: "zh", integrationLabel: "展开接入代码", path: "" },
] as const;

const runtimeAttributePattern =
  /\b(?:data-reactroot|data-basecoat-component|data-a3s-(?:component|components|part-owners|parts|positioned|state)|data-[a-z0-9-]+-initialized)\b/;

test.describe("component preview source contracts", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          readText: async () => window.__previewCopiedSource ?? "",
          writeText: async (value: string) => {
            window.__previewCopiedSource = value;
          },
        },
      });
    });
  });

  for (const locale of locales) {
    for (const component of components) {
      test(`${locale.code}/${component.slug} exposes clean, collapsible, copyable source`, async ({
        page,
      }) => {
        await page.goto(`${locale.path}components/${component.slug}.html`);
        await expect(page.locator("html")).not.toHaveAttribute(
          "data-a3s-defer-init",
        );

        const previews = page.locator(
          `.a3s-preview[data-preview-component="${component.slug}"]`,
        );
        await expect
          .poll(() => previews.count(), {
            message: `${locale.code}/${component.slug} must document at least one live preview`,
          })
          .toBeGreaterThan(0);
        await expect
          .poll(
            () =>
              previews.evaluateAll((elements) =>
                elements.every(
                  (element) =>
                    element.getAttribute("data-preview-source") === "ready",
                ),
              ),
            {
              message: `${locale.code}/${component.slug} previews must finish generating source`,
            },
          )
          .toBe(true);

        const previewCount = await previews.count();
        await expect(
          previews.locator("[data-preview-source-panel]"),
        ).toHaveCount(previewCount);
        await expect(previews.locator(".rp-code-copy-button")).toHaveCount(
          previewCount + 2,
        );

        const firstPreview = previews.first();
        await expect(firstPreview).toHaveAttribute(
          "data-preview-integration",
          "complete",
        );
        await expect(firstPreview.locator(".rp-code-copy-button")).toHaveCount(
          3,
        );
        const sources: string[] = [];
        for (let index = 0; index < previewCount; index += 1) {
          const source =
            (await previews
              .nth(index)
              .locator(
                index === 0
                  ? ".a3s-preview-integration__example code"
                  : ".a3s-preview__source code",
              )
              .textContent()) ?? "";
          sources.push(source);
          expect(
            source.trim().length,
            `${locale.code}/${component.slug} preview ${index + 1} source must not be empty`,
          ).toBeGreaterThan(0);
          expect(
            source,
            `${locale.code}/${component.slug} preview ${index + 1} source must omit runtime annotations`,
          ).not.toMatch(runtimeAttributePattern);
        }

        const sourcePanel = firstPreview.locator("[data-preview-source-panel]");
        const sourceToggle = firstPreview.locator(
          ".a3s-preview__controls button[aria-controls]",
        );
        await expect(sourceToggle).toHaveAccessibleName(
          locale.integrationLabel,
        );
        await expect(sourceToggle).toHaveAttribute("aria-expanded", "false");
        await expect(sourcePanel).toBeHidden();
        await sourceToggle.click();
        await expect(sourceToggle).toHaveAttribute("aria-expanded", "true");
        await expect(sourcePanel).toBeVisible();
        await expect(firstPreview.locator(".a3s-preview__stage")).toBeVisible();
        await expect
          .poll(() => sourcePanel.locator(".line span[style]").count())
          .toBeGreaterThan(0);

        const copyButton = sourcePanel.locator(
          ".a3s-preview-integration__example .rp-code-copy-button",
        );
        await copyButton.click();
        await expect
          .poll(() =>
            page.evaluate(async () =>
              (await navigator.clipboard.readText()).trim(),
            ),
          )
          .toBe(sources[0].trim());

        await sourceToggle.click();
        await expect(sourceToggle).toHaveAttribute("aria-expanded", "false");
        await expect(sourcePanel).toBeHidden();
        await expect(firstPreview.locator(".a3s-preview__stage")).toBeVisible();
      });
    }
  }
});
