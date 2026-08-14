import { expect, test, type Page } from "@playwright/test";
import { components } from "../src/ai/manifest/index.js";

function collectBrowserDiagnostics(page: Page) {
  const diagnostics: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      diagnostics.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.push(`pageerror: ${error.message}`);
  });

  return diagnostics;
}

test.describe("public component machine contracts", () => {
  for (const component of components) {
    test(`${component.slug} exposes its semantic root and state`, async ({
      page,
    }) => {
      const diagnostics = collectBrowserDiagnostics(page);
      await page.goto(`en/components/${component.slug}.html`);
      await expect(page.locator("html")).not.toHaveAttribute(
        "data-a3s-defer-init",
      );
      await expect
        .poll(() => page.evaluate(() => Boolean(window.a3sAI)), {
          message: "The component machine runtime must be ready",
        })
        .toBe(true);

      const previews = page.locator(
        `.a3s-preview[data-preview-component="${component.slug}"]`,
      );
      const preview = previews.first();
      await expect(preview.first()).toBeVisible();
      if (component.slug === "toast") {
        await preview.first().getByRole("button").click();
      }
      await page.evaluate(() => {
        window.a3sAI.scan(document);
      });

      const roots = previews.locator(
        `[data-a3s-components~="${component.slug}"][data-a3s-state]`,
      );
      await expect
        .poll(() => roots.count(), {
          message: `${component.slug} page must render a matching semantic root`,
        })
        .toBeGreaterThan(0);

      const states = await roots.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-a3s-state")),
      );
      expect(states.every(Boolean)).toBe(true);

      for (const part of Object.keys(component.parts)) {
        const selector = component.test.parts[part];
        const expectedPartCount = await previews
          .locator(component.selector)
          .evaluateAll(
            (elements, partSelector) =>
              elements.reduce((count, element) => {
                try {
                  return (
                    count +
                    (element.matches(partSelector) ? 1 : 0) +
                    element.querySelectorAll(partSelector).length
                  );
                } catch {
                  return count;
                }
              }, 0),
            component.parts[part],
          );
        expect(
          await previews.locator(selector).count(),
          `${component.slug}.${part} semantic annotations must match the rendered part count`,
        ).toBe(expectedPartCount);
      }

      for (const action of component.actions) {
        const actionTargets = previews.locator(component.test.actions[action]);
        expect(
          await actionTargets.count(),
          `${component.slug}.${action} must resolve to a rendered action target`,
        ).toBeGreaterThan(0);
      }

      const machineSnapshot = await roots.first().evaluate((element) =>
        window.a3sAI.snapshot(element),
      );
      expect(
        machineSnapshot.some((entry) =>
          entry.components.includes(component.slug),
        ),
      ).toBe(true);
      expect(diagnostics).toEqual([]);
    });
  }
});

test("semantic annotations follow dynamic root, part, and state changes", async ({
  page,
}) => {
  await page.goto("en/components/task-workspace.html");
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-a3s-defer-init",
  );

  const result = await page.evaluate(async () => {
    const root = document.createElement("section");
    root.className = "task-workspace";
    root.innerHTML = `
      <header class="workspace-header"></header>
      <section class="agent-transcript"><ol data-transcript-viewport></ol></section>
      <form class="agent-composer"><textarea></textarea><footer><div data-composer-actions><button type="submit">Send</button></div></footer></form>
      <aside data-task-inspector hidden></aside>
    `;
    document.body.append(root);
    window.a3sAI.scan(root);

    const initial = {
      parts: window.a3sAI.snapshot(root)[0]?.parts ?? [],
      root: root.getAttribute("data-a3s-components"),
      state: root.getAttribute("data-a3s-state"),
    };
    root.dataset.inspector = "open";
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const openState = root.getAttribute("data-a3s-state");

    root.querySelector("[data-task-inspector]")?.remove();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const removedInspector = window.a3sAI.find("task-workspace", {
      part: "inspector",
      root,
    }).length;

    root.classList.remove("task-workspace");
    window.a3sAI.scan(root);
    const removedRoot = {
      component: root.getAttribute("data-a3s-component"),
      components: root.getAttribute("data-a3s-components"),
      state: root.getAttribute("data-a3s-state"),
    };
    root.remove();
    return { initial, openState, removedInspector, removedRoot };
  });

  expect(result.initial.root).toContain("task-workspace");
  expect(result.initial.state).toBe("ready");
  expect(result.initial.parts.some((part) => part.parts.includes("inspector"))).toBe(true);
  expect(result.openState).toContain("inspector-open");
  expect(result.removedInspector).toBe(0);
  expect(result.removedRoot).toEqual({
    component: null,
    components: null,
    state: null,
  });
});
