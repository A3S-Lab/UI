import { expect, test } from "@playwright/test";
import { components } from "../src/ai/manifest/index.js";

declare global {
  interface Window {
    __previewCopiedSource?: string;
  }
}

const locales = [
  { code: "en", path: "en/", previewLabel: "Preview", codeLabel: "Code" },
  { code: "zh", path: "", previewLabel: "预览", codeLabel: "代码" },
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
      test(`${locale.code}/${component.slug} exposes clean, switchable, copyable source`, async ({
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
        await expect(previews.locator('[data-preview-view="preview"]')).toHaveCount(
          previewCount,
        );
        await expect(previews.locator('[data-preview-view="code"]')).toHaveCount(
          previewCount,
        );
        await expect(previews.locator("[data-preview-copy]")).toHaveCount(
          previewCount,
        );

        const sources = await previews
          .locator(".a3s-preview__source code")
          .allTextContents();
        expect(sources).toHaveLength(previewCount);
        sources.forEach((source, index) => {
          expect(
            source.trim().length,
            `${locale.code}/${component.slug} preview ${index + 1} source must not be empty`,
          ).toBeGreaterThan(0);
          expect(
            source,
            `${locale.code}/${component.slug} preview ${index + 1} source must omit runtime annotations`,
          ).not.toMatch(runtimeAttributePattern);
        });

        const firstPreview = previews.first();
        const previewTab = firstPreview.getByRole("tab", {
          name: locale.previewLabel,
          exact: true,
        });
        const codeTab = firstPreview.getByRole("tab", {
          name: locale.codeLabel,
          exact: true,
        });
        await codeTab.click();
        await expect(codeTab).toHaveAttribute("aria-selected", "true");
        await expect(firstPreview.locator(".a3s-preview__source")).toBeVisible();

        const copyButton = firstPreview.locator("[data-preview-copy]");
        await copyButton.click();
        await expect(copyButton).toHaveAttribute("data-copy-state", "copied");
        await expect
          .poll(() => page.evaluate(() => navigator.clipboard.readText()))
          .toBe(sources[0]);

        await previewTab.click();
        await expect(previewTab).toHaveAttribute("aria-selected", "true");
        await expect(firstPreview.locator(".a3s-preview__stage")).toBeVisible();
      });
    }
  }
});
