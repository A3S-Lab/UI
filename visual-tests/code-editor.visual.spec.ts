import { expect, test, type Page } from "@playwright/test";

async function openCodeEditor(page: Page) {
  await page.goto("en/components/code-editor.html");
  await page.evaluate(() => document.fonts.ready);
  const editor = page.locator("#code-editor-demo");
  await expect(editor).toHaveAttribute("data-code-editor-initialized", "true");
  return editor;
}

test("code editor reports document state and preserves editing shortcuts", async ({
  page,
}) => {
  const editor = await openCodeEditor(page);
  const input = editor.locator(":scope > section > textarea");

  await input.fill("const value = 1;\nreturn value;");
  await expect(editor).toHaveAttribute("data-dirty", "true");
  await expect(editor.locator("[data-code-editor-lines]")).toHaveText(
    "2 lines",
  );
  await expect(editor.locator("[data-code-editor-characters]")).toHaveText(
    "29 characters",
  );
  await expect(editor.locator("[data-code-editor-position]")).toHaveText(
    "Ln 2, Col 14",
  );
  await expect(editor).toHaveAttribute("role", "group");

  const gutterOffset = await editor.evaluate((root) => {
    const gutterLine = root.querySelector(
      "[data-code-editor-gutter] > [data-line='1']",
    );
    const textarea = root.querySelector("textarea");
    if (!gutterLine || !textarea) return Number.POSITIVE_INFINITY;
    const lineTop = gutterLine.getBoundingClientRect().top;
    const textareaTop = textarea.getBoundingClientRect().top;
    const paddingTop = Number.parseFloat(getComputedStyle(textarea).paddingTop);
    return Math.abs(lineTop - textareaTop - paddingTop);
  });
  expect(gutterOffset).toBeLessThan(1);

  await page.evaluate(() => {
    const root = document.querySelector("#code-editor-demo");
    window.__codeSaveDetail = null;
    window.__codeCleanDetail = null;
    root?.addEventListener("a3s:code-save", (event) => {
      window.__codeSaveDetail = event.detail;
    });
    root?.addEventListener("a3s:code-clean", (event) => {
      window.__codeCleanDetail = event.detail;
    });
  });
  await input.press("Control+s");
  await expect
    .poll(() => page.evaluate(() => window.__codeSaveDetail?.value))
    .toBe("const value = 1;\nreturn value;");

  await editor.evaluate((root) => root.markClean());
  await expect(editor).toHaveAttribute("data-dirty", "false");
  await expect
    .poll(() => page.evaluate(() => window.__codeCleanDetail?.lines))
    .toBe(2);

  await input.evaluate((textarea) => textarea.setSelectionRange(0, 0));
  await input.press("Tab");
  await expect(input).toHaveValue("  const value = 1;\nreturn value;");
  await input.press("Shift+Tab");
  await expect(input).toHaveValue("const value = 1;\nreturn value;");

  await input.fill("first\n    second");
  await input.evaluate((textarea) => {
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  });
  await input.press("Shift+Tab");
  await expect(input).toHaveValue("first\n  second");
});

test("JSON validation, read-only state, and the public value API stay synchronized", async ({
  page,
}) => {
  await openCodeEditor(page);
  const editor = page.locator("#code-editor-json");
  const input = editor.locator(":scope > section > textarea");

  await expect(editor).toHaveAttribute("data-code-editor-initialized", "true");
  await input.fill('{"enabled": }');
  await expect(editor).toHaveAttribute("data-validation-state", "invalid");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(editor.locator("[data-code-editor-message]")).toContainText(
    "Invalid JSON near",
  );

  await input.fill('{"enabled": true}');
  await expect(editor).toHaveAttribute("data-validation-state", "valid");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(editor.locator("[data-code-editor-message]")).toHaveText(
    "Valid JSON",
  );

  await editor.evaluate((root) =>
    root.setValue('{"enabled": false}', { clean: true }),
  );
  await expect(input).toHaveValue('{"enabled": false}');
  await expect(editor).toHaveAttribute("data-dirty", "false");

  await editor.evaluate((root) => {
    delete root.dataset.validation;
    root.dataset.language = "text";
    root.refresh();
  });
  await expect(editor).not.toHaveAttribute("data-validation-state");
  await expect(input).not.toHaveAttribute("aria-invalid");
  await expect(editor.locator("[data-code-editor-message]")).toBeHidden();

  const readOnlyEditor = page.locator("#code-editor-readonly");
  await expect(readOnlyEditor).toHaveAttribute(
    "data-code-editor-initialized",
    "true",
  );
  await expect(readOnlyEditor.locator("textarea")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(readOnlyEditor.locator("[data-code-editor-state]")).toHaveText(
    "Read only",
  );

  await readOnlyEditor.evaluate((root) => {
    const textarea = root.querySelector("textarea");
    if (textarea) textarea.disabled = true;
    root.refresh();
  });
  await expect(readOnlyEditor).toHaveAttribute("data-disabled", "true");
  await expect(readOnlyEditor.locator("[data-code-editor-state]")).toHaveText(
    "Disabled",
  );

  await readOnlyEditor.evaluate((root) => {
    const textarea = root.querySelector("textarea");
    if (textarea) textarea.disabled = false;
    root.refresh();
  });
  await expect(readOnlyEditor).toHaveAttribute("data-disabled", "false");
  await expect(readOnlyEditor.locator("[data-code-editor-state]")).toHaveText(
    "Read only",
  );
});

test("Chinese validation messages use the localized cursor position", async ({
  page,
}) => {
  await page.goto("components/code-editor.html");
  await page.evaluate(() => document.fonts.ready);
  const editor = page.locator("#code-editor-json");
  const input = editor.locator(":scope > section > textarea");

  await expect(editor).toHaveAttribute("data-code-editor-initialized", "true");
  await input.fill('{"enabled": }');
  await expect(editor.locator("[data-code-editor-message]")).toContainText(
    "第 1 行，第",
  );
});

declare global {
  interface Window {
    __codeSaveDetail: { value?: string } | null;
    __codeCleanDetail: { lines?: number } | null;
  }

  interface HTMLElement {
    markClean(): void;
    refresh(): void;
    setValue(value: string, options?: { clean?: boolean }): void;
  }
}
