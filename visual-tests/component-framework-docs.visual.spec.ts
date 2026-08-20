import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    __frameworkQuickStartCopiedSource?: string;
  }
}

async function openComponentGuide(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  await expect(page.locator("html")).not.toHaveAttribute("data-a3s-defer-init");
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

  test("HTML, React, and Vue share one complete, copyable quick start", async ({
    page,
  }) => {
    await openComponentGuide(page, "components/button.html");

    const quickStart = page.locator(
      '.component-intro[data-component-intro="button"][data-mode="complete"]',
    );
    await expect(quickStart).toBeVisible();
    await expect(quickStart.getByRole("tab")).toHaveCount(3);
    await expect(quickStart.locator(".component-intro__step")).toHaveCount(3);
    await expect(quickStart.locator(".rp-codeblock")).toHaveCount(3);
    await expect(quickStart.locator(".rp-code-copy-button")).toHaveCount(3);
    await expect(quickStart.locator(".rp-code-wrap-button")).toHaveCount(0);
    await expect(quickStart).toContainText("安装");
    await expect(quickStart).toContainText("项目入口");
    await expect(quickStart).toContainText("最小示例");
    await expect(
      page.getByRole("heading", { level: 2, name: /^(React|Vue)$/ }),
    ).toHaveCount(0);
    await expect(page.locator(".a3s-framework-tabs")).toHaveCount(0);
    await expect
      .poll(() =>
        quickStart
          .locator(".component-intro__example .line span[style]")
          .count(),
      )
      .toBeGreaterThan(0);

    const htmlTab = quickStart.getByRole("tab", { name: "HTML" });
    await htmlTab.focus();
    await page.keyboard.press("ArrowRight");
    const reactTab = quickStart.getByRole("tab", { name: "React" });
    await expect(reactTab).toHaveAttribute("aria-selected", "true");
    await expect(
      quickStart.locator(".component-intro__install code"),
    ).toHaveText("npm install @a3s-lab/ui react react-dom");
    await expect(quickStart.locator(".component-intro__setup code")).toHaveText(
      'import "@a3s-lab/ui/a3s.css";',
    );
    await expect(
      quickStart.locator(".component-intro__example code"),
    ).toContainText("SaveButton");
    await expect(
      quickStart.locator(".component-intro__example code"),
    ).toContainText('from "@a3s-lab/ui/react"');
    await expect(quickStart.locator(".component-intro__note")).toContainText(
      "没有框架私有 Hook",
    );

    const exampleCode = (
      await quickStart.locator(".component-intro__example code").innerText()
    ).trim();
    await quickStart
      .locator(".component-intro__example .rp-code-copy-button")
      .click();
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (await navigator.clipboard.readText()).trim(),
        ),
      )
      .toBe(exampleCode);

    await quickStart.getByRole("tab", { name: "Vue" }).click();
    await expect(
      quickStart.locator(".component-intro__example code"),
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

    const chineseQuickStart = page.locator(
      '.component-intro[data-component-intro="tabs"]',
    );
    await expect(
      chineseQuickStart.getByRole("tab", { name: "Vue" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      chineseQuickStart.locator(".component-intro__example code"),
    ).toContainText("useTabs");
    await expect(
      chineseQuickStart.locator(".component-intro__note code"),
    ).toHaveText("useTabs");
    await expect(
      chineseQuickStart.locator(".component-intro__note"),
    ).toContainText("组合式函数");

    await openComponentGuide(page, "en/components/tabs.html");
    const englishQuickStart = page.locator(
      '.component-intro[data-component-intro="tabs"]',
    );
    await expect(
      englishQuickStart.getByRole("tab", { name: "Vue" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(englishQuickStart).toContainText("Install");
    await expect(englishQuickStart).toContainText("Project entry");
    await expect(englishQuickStart).toContainText("Minimal example");
    await expect(
      englishQuickStart.locator(".component-intro__note"),
    ).toContainText("Composable");
    await expect(
      englishQuickStart.locator(".component-intro__note code"),
    ).toHaveText("useTabs");
  });

  test("published versions keep complete semantic framework examples without inventing adapters", async ({
    page,
  }) => {
    await openComponentGuide(page, "v0.3.0/components/tabs.html");

    const quickStart = page.locator(
      '.component-intro[data-component-intro="tabs"][data-mode="complete"]',
    );
    await expect(quickStart).toHaveAttribute(
      "data-framework-contract",
      "semantic",
    );
    await quickStart.getByRole("tab", { name: "React" }).click();
    await expect(
      quickStart.locator(".component-intro__install code"),
    ).toHaveText("npm install @a3s-lab/ui@0.3.0 react react-dom");
    await expect(
      quickStart.locator(".component-intro__setup code"),
    ).toContainText('import "@a3s-lab/ui/all";');
    await expect(
      quickStart.locator(".component-intro__example code"),
    ).toContainText("TabsExample");
    await expect(
      quickStart.locator(".component-intro__example code"),
    ).not.toContainText("@a3s-lab/ui/react");
    await expect(quickStart.locator(".component-intro__note")).toContainText(
      "尚未提供框架适配器",
    );

    await openComponentGuide(page, "v0.2.0/components/agent-workbench.html");
    await expect(page.locator(".component-intro")).toHaveCount(0);
    await expect(page.getByText("v0.2.0 不包含此组件")).toBeVisible();
  });

  test("the complete quick start reflows without horizontal page overflow", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1280");
    await page.setViewportSize({ width: 390, height: 844 });
    await openComponentGuide(page, "components/agent-composer.html");

    const quickStart = page.locator(
      '.component-intro[data-component-intro="agent-composer"]',
    );
    await expect(quickStart).toBeVisible();
    await expect(quickStart.getByRole("tab")).toHaveCount(3);
    await quickStart.getByRole("tab", { name: "React" }).click();
    await expect(quickStart.locator(".component-intro__note code")).toHaveText(
      "useAgentComposer",
    );
    await expect(
      quickStart.locator(".component-intro__example code"),
    ).toContainText("useAgentComposerEditor");
    await expect(
      quickStart.locator(".component-intro__install code"),
    ).toContainText("@tiptap/react");

    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    const quickStartBox = await quickStart.boundingBox();
    const tabListBox = await quickStart.getByRole("tablist").boundingBox();
    expect(quickStartBox).not.toBeNull();
    expect(tabListBox).not.toBeNull();
    expect(tabListBox!.width).toBeLessThanOrEqual(quickStartBox!.width);
  });

  test("integration components keep their peer dependencies inside the active framework tab", async ({
    page,
  }) => {
    await openComponentGuide(page, "components/chart.html");
    const chartQuickStart = page.locator(
      '.component-intro[data-component-intro="chart"]',
    );
    await expect(
      chartQuickStart.locator(".component-intro__install code"),
    ).toContainText("chart.js");

    await openComponentGuide(page, "harness/grid-view.html");
    const harnessQuickStart = page.locator(".a3s-framework-tabs");
    await expect(harnessQuickStart).toBeVisible();
    await expect(harnessQuickStart.getByRole("tab")).toHaveCount(3);
    await expect(harnessQuickStart.locator(".rp-code-wrap-button")).toHaveCount(
      0,
    );
    await harnessQuickStart.getByRole("tab", { name: "Vue" }).click();
    await expect(
      harnessQuickStart.locator(".a3s-framework-tabs__install code"),
    ).toContainText("dockview-vue@8.1.0");
    await expect(
      harnessQuickStart.locator(".a3s-framework-tabs__example code"),
    ).toContainText("useGridview");

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
