import { expect, test, type Locator, type Page } from "@playwright/test";

declare global {
  interface Window {
    __frameworkQuickStartCopiedSource?: string;
  }
}

async function openComponentGuide(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");
}

function integratedPreview(page: Page, slug: string) {
  return page
    .locator(
      `.a3s-preview[data-preview-component="${slug}"][data-preview-integration="complete"]`,
    )
    .first();
}

async function revealIntegration(
  preview: Locator,
  language: "en" | "zh" = "zh",
) {
  await preview
    .getByRole("button", {
      name: language === "zh" ? "展开接入代码" : "Show integration code",
    })
    .click();
  const integration = preview.locator(
    ".a3s-preview__source > .a3s-preview-integration",
  );
  await expect(integration).toBeVisible();
  return integration;
}

test.describe("component framework quick starts", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          readText: async () => window.__frameworkQuickStartCopiedSource ?? "",
          writeText: async (value: string) => {
            window.__frameworkQuickStartCopiedSource = value;
          },
        },
      });
    });
  });

  test("HTML, React, and Vue share the live preview's copyable source disclosure", async ({
    page,
  }) => {
    await openComponentGuide(page, "components/button.html");

    const preview = integratedPreview(page, "button");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("data-framework-contract", "adapter");
    await expect(page.locator(".component-intro")).toHaveCount(0);
    const sourceToggle = preview.getByRole("button", {
      name: "展开接入代码",
    });
    await sourceToggle.focus();
    await page.keyboard.press("Enter");
    const integration = preview.locator(
      ".a3s-preview__source > .a3s-preview-integration",
    );
    await expect(integration).toBeVisible();
    await expect(
      integration.getByRole("tab", { name: "HTML", exact: true }),
    ).toBeFocused();
    await expect(
      integration.locator(".a3s-preview-integration__tabs").getByRole("tab"),
    ).toHaveCount(3);
    await expect(
      integration.locator(".a3s-preview-integration__workspace"),
    ).toHaveCount(1);
    await expect(integration.locator(".rp-codeblock")).toHaveCount(3);
    await expect(integration.locator(".rp-codeblock:visible")).toHaveCount(2);
    await expect(integration.locator(".rp-code-copy-button")).toHaveCount(3);
    await expect(integration.locator(".rp-code-wrap-button")).toHaveCount(0);
    await expect(integration).toContainText("安装");
    await expect(
      integration.locator('.a3s-preview-integration__files [role="tab"]'),
    ).toHaveCount(2);
    await expect(
      integration.locator(
        '.a3s-preview-integration__source[data-code-file="example"]',
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /^(React|Vue)$/ }),
    ).toHaveCount(0);
    await expect(page.locator(".a3s-framework-tabs")).toHaveCount(0);
    await expect
      .poll(() =>
        integration
          .locator(".a3s-preview-integration__source .line span[style]")
          .count(),
      )
      .toBeGreaterThan(0);

    const htmlTab = integration.getByRole("tab", {
      name: "HTML",
      exact: true,
    });
    await htmlTab.focus();
    await page.keyboard.press("ArrowRight");
    const reactTab = integration.getByRole("tab", {
      name: "React",
      exact: true,
    });
    await expect(reactTab).toHaveAttribute("aria-selected", "true");
    await expect(
      integration.locator(".a3s-preview-integration__install code"),
    ).toHaveText("npm install @a3s-lab/ui react react-dom");
    await expect(
      integration.locator(
        ".a3s-preview-integration__source:not([hidden]) code",
      ),
    ).toContainText("SaveButton");
    await expect(
      integration.locator(
        ".a3s-preview-integration__source:not([hidden]) code",
      ),
    ).toContainText('from "@a3s-lab/ui/react"');
    await expect(
      integration.locator(".a3s-preview-integration__note"),
    ).toContainText("没有框架私有 Hook");

    const exampleCode = (
      await integration
        .locator(".a3s-preview-integration__source:not([hidden]) code")
        .innerText()
    ).trim();
    await integration
      .locator(
        ".a3s-preview-integration__source:not([hidden]) .rp-code-copy-button",
      )
      .click();
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (await navigator.clipboard.readText()).trim(),
        ),
      )
      .toBe(exampleCode);
    await preview
      .locator(".a3s-preview__header")
      .getByRole("button", { name: "复制当前代码" })
      .click();
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (await navigator.clipboard.readText()).trim(),
        ),
      )
      .toBe(exampleCode);

    const entryTab = integration.getByRole("tab", { name: /入口.*main\.ts/u });
    await entryTab.click();
    await expect(
      integration.locator(
        '.a3s-preview-integration__source[data-code-file="setup"] code',
      ),
    ).toHaveText('import "@a3s-lab/ui/a3s.css";');
    await expect(
      preview.getByRole("button", { name: "复制当前代码" }),
    ).toBeVisible();

    await integration.getByRole("tab", { name: "Vue", exact: true }).click();
    await integration.getByRole("tab", { name: /示例.*Example\.vue/u }).click();
    await expect(
      integration.locator(
        ".a3s-preview-integration__source:not([hidden]) code",
      ),
    ).toContainText('<script setup lang="ts">');
    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem("a3s-ui-docs-framework")),
      )
      .toBe("vue");
  });

  test("framework selection persists and controller hooks stay equivalent", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("a3s-ui-docs-framework", "vue");
    });
    await openComponentGuide(page, "components/tabs.html");

    const chinesePreview = integratedPreview(page, "tabs");
    const chineseQuickStart = await revealIntegration(chinesePreview);
    await expect(
      chineseQuickStart.getByRole("tab", { name: "Vue", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      chineseQuickStart.locator(
        ".a3s-preview-integration__source:not([hidden]) code",
      ),
    ).toContainText("useTabs");
    await expect(
      chineseQuickStart.locator(".a3s-preview-integration__note code"),
    ).toHaveText("useTabs");
    await expect(
      chineseQuickStart.locator(".a3s-preview-integration__note"),
    ).toContainText("组合式函数");

    await openComponentGuide(page, "en/components/tabs.html");
    const englishPreview = integratedPreview(page, "tabs");
    const englishQuickStart = await revealIntegration(englishPreview, "en");
    await expect(
      englishQuickStart.getByRole("tab", { name: "Vue", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(englishQuickStart).toContainText("Install");
    await expect(englishQuickStart).toContainText("Example");
    await expect(englishQuickStart).toContainText("Entry");
    await expect(
      englishQuickStart.locator(".a3s-preview-integration__note"),
    ).toContainText("Composable");
    await expect(
      englishQuickStart.locator(".a3s-preview-integration__note code"),
    ).toHaveText("useTabs");
  });

  test("published versions keep complete semantic framework examples without inventing adapters", async ({
    page,
  }) => {
    await openComponentGuide(page, "v0.3.0/components/tabs.html");

    const preview = integratedPreview(page, "tabs");
    await expect(preview).toHaveAttribute(
      "data-framework-contract",
      "semantic",
    );
    const quickStart = await revealIntegration(preview);
    await quickStart.getByRole("tab", { name: "React", exact: true }).click();
    await expect(
      quickStart.locator(".a3s-preview-integration__install code"),
    ).toHaveText("npm install @a3s-lab/ui@0.3.0 react react-dom");
    await expect(
      quickStart.locator(".a3s-preview-integration__source:not([hidden]) code"),
    ).toContainText("TabsExample");
    await expect(
      quickStart.locator(".a3s-preview-integration__source:not([hidden]) code"),
    ).not.toContainText("@a3s-lab/ui/react");
    await quickStart.getByRole("tab", { name: /入口.*main\.ts/u }).click();
    await expect(
      quickStart.locator(".a3s-preview-integration__source:not([hidden]) code"),
    ).toContainText('import "@a3s-lab/ui/all";');
    await expect(
      quickStart.locator(".a3s-preview-integration__note"),
    ).toContainText("尚未提供框架适配器");

    await openComponentGuide(page, "v0.2.0/components/agent-workbench.html");
    await expect(
      page.locator('[data-preview-integration="complete"]'),
    ).toHaveCount(0);
    await expect(page.getByText("v0.2.0 不包含此组件")).toBeVisible();
  });

  test("the complete quick start reflows without horizontal page overflow", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1280");
    await page.setViewportSize({ width: 390, height: 844 });
    await openComponentGuide(page, "components/agent-composer.html");

    const preview = integratedPreview(page, "agent-composer");
    await expect(preview).toBeVisible();
    const quickStart = await revealIntegration(preview);
    await expect(
      quickStart.locator(".a3s-preview-integration__tabs").getByRole("tab"),
    ).toHaveCount(3);
    await quickStart.getByRole("tab", { name: "React", exact: true }).click();
    await expect(
      quickStart.locator(".a3s-preview-integration__note code"),
    ).toHaveText("useAgentComposer");
    await expect(
      quickStart.locator(".a3s-preview-integration__source:not([hidden]) code"),
    ).toContainText("useAgentComposerEditor");
    await expect(
      quickStart.getByRole("tab", { name: /示例.*AgentComposerExample\.tsx/u }),
    ).toHaveAttribute("title", "AgentComposerExample.tsx");
    await expect(
      quickStart.locator(".a3s-preview-integration__install code"),
    ).toContainText("@tiptap/react");

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    const quickStartBox = await preview.boundingBox();
    const tabListBox = await quickStart
      .locator(".a3s-preview-integration__tabs")
      .boundingBox();
    expect(quickStartBox).not.toBeNull();
    expect(tabListBox).not.toBeNull();
    expect(tabListBox!.width).toBeLessThanOrEqual(quickStartBox!.width);
  });

  test("integration components keep their peer dependencies inside the active framework tab", async ({
    page,
  }) => {
    await openComponentGuide(page, "components/chart.html");
    const chartQuickStart = await revealIntegration(
      integratedPreview(page, "chart"),
    );
    await expect(
      chartQuickStart.locator(".a3s-preview-integration__install code"),
    ).toContainText("chart.js");

    for (const guide of [
      {
        dependency: "dockview-react@8.1.0",
        framework: "React",
        hook: "useDockviewLayout",
        slug: "dock-workspace",
      },
      {
        dependency: "dockview-react@8.1.0",
        framework: "React",
        hook: "usePaneview",
        slug: "pane-view",
      },
      {
        dependency: "dockview-react@8.1.0",
        framework: "React",
        hook: "useSplitview",
        slug: "split-view",
      },
      {
        dependency: "dockview-vue@8.1.0",
        framework: "Vue",
        hook: "useGridview",
        slug: "grid-view",
      },
    ] as const) {
      await openComponentGuide(page, `harness/${guide.slug}.html`);
      const harnessPreview = integratedPreview(page, guide.slug);
      await expect(harnessPreview).toBeVisible();
      await expect(page.locator(".a3s-framework-tabs")).toHaveCount(0);
      const harnessQuickStart = await revealIntegration(harnessPreview);
      await expect(
        harnessQuickStart
          .locator(".a3s-preview-integration__tabs")
          .getByRole("tab"),
      ).toHaveCount(3);
      await expect(
        harnessQuickStart.locator(".rp-code-wrap-button"),
      ).toHaveCount(0);
      await harnessQuickStart
        .getByRole("tab", { name: guide.framework, exact: true })
        .click();
      await expect(
        harnessQuickStart.locator(".a3s-preview-integration__install code"),
      ).toContainText(guide.dependency);
      await expect(
        harnessQuickStart.locator(
          ".a3s-preview-integration__source:not([hidden]) code",
        ),
      ).toContainText(guide.hook);
      await expect(
        harnessQuickStart.locator(".a3s-preview-integration__note code"),
      ).toHaveText(guide.hook);
      await harnessQuickStart
        .getByRole("tab", { name: /入口.*main\.ts/u })
        .click();
      await expect(
        harnessQuickStart.locator(
          ".a3s-preview-integration__source:not([hidden]) code",
        ),
      ).toHaveText('import "@a3s-lab/ui/a3s.css";');
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    const navOwnsTopLayer = await page.evaluate(() => {
      const demo = document.querySelector<HTMLElement>(".dockview-demo");
      const nav = document.querySelector<HTMLElement>(".rp-nav");
      const sash = document.querySelector<HTMLElement>(
        ".dockview-demo .dv-split-view-container.dv-horizontal > .dv-sash-container > .dv-sash",
      );
      if (!demo || !nav || !sash) return false;

      document.documentElement.style.scrollBehavior = "auto";
      const navRect = nav.getBoundingClientRect();
      window.scrollTo(
        0,
        demo.getBoundingClientRect().bottom +
          window.scrollY -
          (navRect.bottom + 72),
      );

      const sashRect = sash.getBoundingClientRect();
      const topLayer = document.elementFromPoint(
        sashRect.left + sashRect.width / 2,
        navRect.top + navRect.height / 2,
      );
      return topLayer?.closest(".rp-nav") === nav;
    });
    expect(navOwnsTopLayer).toBe(true);
  });
});
