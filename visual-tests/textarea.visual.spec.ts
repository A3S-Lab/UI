import { expect, test, type Page } from "@playwright/test";

async function openTextarea(page: Page, locale: "en" | "zh" = "en") {
  const localePath =
    locale === "zh"
      ? "components/textarea.html"
      : "en/components/textarea.html";
  await page.goto(localePath, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

function primaryPreview(page: Page) {
  return page
    .locator(
      ".a3s-preview[data-preview-component=textarea][data-preview-integration=complete]",
    )
    .first();
}

function expectNoOuterRing(boxShadow: string) {
  expect(boxShadow).not.toMatch(
    /0px 0px 0px (?:1px|2px|3px)(?![^,]*\binset\b)/u,
  );
}

test("Textarea preserves a persistent label, multiline value, count, and native events", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await openTextarea(page);

  const preview = primaryPreview(page);
  const textarea = preview.locator("#textarea-release-note-en");
  const count = preview.locator("#textarea-release-note-count-en");
  await expect(preview.locator(".field")).toHaveCount(1);
  await expect(
    preview.locator('label[for="textarea-release-note-en"]'),
  ).toHaveText("Release note");
  await expect(textarea).toHaveAccessibleName("Release note");
  await expect(textarea).toHaveAccessibleDescription(
    "Include the result, how it was verified, and what to do if verification fails. Use no more than 320 characters.",
  );
  await expect(textarea).toHaveAttribute("name", "releaseNote");
  await expect(textarea).toHaveAttribute("rows", "5");
  await expect(textarea).toHaveAttribute("maxlength", "320");
  await expect(textarea).toHaveAttribute(
    "aria-describedby",
    "textarea-release-note-help-en",
  );
  await expect(count).toHaveAttribute("aria-label", "Character count");
  await expect(count).toHaveAttribute("aria-live", "off");

  await textarea.evaluate((element) => {
    const control = element as HTMLTextAreaElement & { __events?: string[] };
    control.__events = [];
    control.addEventListener("input", () => control.__events?.push("input"));
    control.addEventListener("change", () => control.__events?.push("change"));
  });
  const value = "Verification passed.\nRollback to version 0.2.9.";
  await textarea.fill(value);
  await textarea.blur();
  await expect(textarea).toHaveValue(value);
  await expect(count).toHaveText("47 / 320 characters");
  await expect
    .poll(() =>
      textarea.evaluate((element) =>
        (element as HTMLTextAreaElement & { __events?: string[] }).__events?.at(
          -1,
        ),
      ),
    )
    .toBe("change");
  const events = await textarea.evaluate(
    (element) =>
      (element as HTMLTextAreaElement & { __events?: string[] }).__events ?? [],
  );
  expect(events.at(0)).toBe("input");
  expect(events.at(-1)).toBe("change");
  expect(events.slice(0, -1).every((event) => event === "input")).toBe(true);
  expect(events.filter((event) => event === "change")).toHaveLength(1);
  expect(consoleErrors).toEqual([]);

  await expect(preview).toHaveScreenshot("textarea-primary.png");
  await textarea.focus();
  await expect(textarea).toBeFocused();
  await expect(preview).toHaveScreenshot("textarea-primary-focused.png");
});

test("Textarea validation preserves content, focuses recovery, defers IME work, and clears stale errors", async ({
  page,
}) => {
  await openTextarea(page);

  const form = page.locator("form[data-textarea-validation-demo=en]");
  const field = form.locator(".field");
  const textarea = form.locator("#textarea-validation-en");
  const error = form.locator("#textarea-validation-error-en");
  const count = form.locator("#textarea-validation-count-en");
  const submit = form.getByRole("button", { name: "Save handoff" });

  await expect(textarea).toHaveAccessibleName("Release handoff note");
  await expect(textarea).toHaveAttribute("required", "");
  await expect(textarea).toHaveAttribute("minlength", "40");
  await expect(textarea).toHaveAttribute("maxlength", "320");
  await expect(textarea).not.toHaveAttribute("aria-invalid", "true");
  await expect(error).toBeHidden();

  await submit.click();
  await expect(textarea).toBeFocused();
  await expect(textarea).toHaveValue("");
  await expect(field).toHaveAttribute("data-invalid", "true");
  await expect(textarea).toHaveAttribute("aria-invalid", "true");
  await expect(textarea).toHaveAttribute(
    "aria-describedby",
    "textarea-validation-help-en textarea-validation-error-en",
  );
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("role", "alert");
  await expect(error).toHaveText(
    "Add the verification result and the rollback steps to use if it fails.",
  );

  await textarea.evaluate((element) => {
    const control = element as HTMLTextAreaElement;
    control.dispatchEvent(
      new CompositionEvent("compositionstart", {
        bubbles: true,
        data: "Verification passed. Restore the previous release if needed.",
      }),
    );
    control.value =
      "Verification passed. Restore the previous release if needed.";
    const composingInput = new InputEvent("input", {
      bubbles: true,
      data: control.value,
      inputType: "insertCompositionText",
    });
    Object.defineProperty(composingInput, "isComposing", { value: true });
    control.dispatchEvent(composingInput);
  });
  await expect(field).toHaveAttribute("data-invalid", "true");
  await expect(textarea).toHaveAttribute("aria-invalid", "true");
  await expect(error).toBeVisible();

  await textarea.evaluate((element) => {
    const control = element as HTMLTextAreaElement;
    control.dispatchEvent(
      new CompositionEvent("compositionend", {
        bubbles: true,
        data: control.value,
      }),
    );
    control.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: control.value,
        inputType: "insertText",
      }),
    );
  });
  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(textarea).not.toHaveAttribute("aria-invalid", "true");
  await expect(textarea).toHaveAttribute(
    "aria-describedby",
    "textarea-validation-help-en",
  );
  await expect(error).toBeHidden();

  await textarea.fill("Verification passed.");
  await submit.click();
  await expect(textarea).toBeFocused();
  await expect(textarea).toHaveValue("Verification passed.");
  await expect(error).toBeVisible();
  expect(await textarea.evaluate((element) => element.checkValidity())).toBe(
    false,
  );

  await form.getByRole("button", { name: "Reset" }).click();
  await expect(textarea).toHaveValue("");
  await expect(textarea).not.toHaveAttribute("aria-invalid", "true");
  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(error).toBeHidden();
  await expect(count).toHaveText("0 / 320 characters");
});

test("Textarea contains huge pastes in one internally scrollable editing viewport", async ({
  page,
}) => {
  await openTextarea(page);

  const textarea = page.locator("#textarea-rtl-en");
  const before = await textarea.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, width: bounds.width };
  });
  const hugeValue = Array.from(
    { length: 180 },
    (_, index) => `${index + 1}. recovery-${"x".repeat(90)}-验证-استعادة`,
  ).join("\n");
  await textarea.evaluate((element, value) => {
    element.value = value;
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: value,
        inputType: "insertFromPaste",
      }),
    );
  }, hugeValue);

  await expect(textarea).toHaveValue(hugeValue);
  const geometry = await textarea.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const canvas = element.closest<HTMLElement>(".a3s-preview__canvas");
    if (!canvas) throw new Error("Textarea preview canvas is missing");
    const canvasBounds = canvas.getBoundingClientRect();
    const style = getComputedStyle(element);
    element.scrollTop = element.scrollHeight;
    return {
      clientHeight: element.clientHeight,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      height: bounds.height,
      insideCanvas:
        bounds.left >= canvasBounds.left && bounds.right <= canvasBounds.right,
      maxBlockSize: Number.parseFloat(style.maxBlockSize),
      overflowY: style.overflowY,
      resize: style.resize,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      width: bounds.width,
    };
  });
  expect(Math.abs(geometry.height - before.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.width - before.width)).toBeLessThanOrEqual(1);
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
  expect(geometry.scrollTop).toBeGreaterThan(0);
  expect(geometry.overflowY).toBe("auto");
  expect(geometry.resize).toBe("vertical");
  expect(geometry.maxBlockSize).toBeLessThanOrEqual(384);
  expect(geometry.insideCanvas).toBe(true);
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
    geometry.documentClientWidth + 1,
  );
});

test("Textarea state acceptance preserves five independent values, native semantics, and relationships", async ({
  page,
}) => {
  await openTextarea(page);

  const preview = primaryPreview(page);
  await preview
    .getByRole("button", { name: "Preview right-to-left layout" })
    .click();
  await preview.getByRole("button", { name: "Preview in dark mode" }).click();
  const trigger = preview.getByRole("button", {
    name: "View state acceptance matrix",
  });
  await trigger.click();

  const dialog = page.getByRole("dialog", {
    name: "Textarea state acceptance",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-state-specimen]")).toHaveCount(5);

  const empty = dialog.locator("[data-state-specimen=empty]");
  const ready = dialog.locator("[data-state-specimen=ready]");
  const disabled = dialog.locator("[data-state-specimen=disabled]");
  const invalid = dialog.locator("[data-state-specimen=invalid]");
  const readonly = dialog.locator("[data-state-specimen=readonly]");

  await expect(empty.locator("textarea.textarea")).toHaveValue("");
  await expect(empty.locator("textarea.textarea")).toHaveAttribute(
    "placeholder",
    "صف التغيير ونتيجة التحقق ومسار التراجع",
  );
  await expect(empty.locator("[data-state-specimen-feedback]")).toContainText(
    "لم تتم كتابة ملاحظات الإصدار",
  );
  await expect(ready.locator("textarea.textarea")).toContainText("");
  await expect(ready.locator("textarea.textarea")).toHaveValue(/دليل التحقق/u);
  await expect(ready.locator("textarea.textarea")).toHaveAccessibleName(
    "ملاحظات الإصدار",
  );
  await expect(disabled.locator("textarea.textarea")).toBeDisabled();
  await expect(disabled.locator("textarea.textarea")).toHaveValue(
    /ملاحظات الإصدار المؤرشفة/u,
  );
  await expect(disabled.locator("textarea.textarea")).toHaveCSS("opacity", "1");
  await expect(
    disabled.locator("[data-state-specimen-feedback]"),
  ).toContainText("مساحة العمل مؤرشفة");
  await expect(invalid.locator("textarea.textarea")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(invalid.locator("textarea.textarea")).toHaveAttribute(
    "required",
    "",
  );
  await expect(invalid.getByRole("alert")).toContainText("خطوات التراجع");
  expect(
    await invalid
      .locator("textarea.textarea")
      .evaluate((element) => element.checkValidity()),
  ).toBe(false);
  await expect(readonly.locator("textarea.textarea")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(readonly.locator("textarea.textarea")).not.toBeDisabled();
  await expect(
    readonly.locator("[data-state-specimen-feedback]"),
  ).toContainText("ضمن إرسال النموذج");
  await expect(invalid.locator("[data-state-specimen-mount]")).toHaveAttribute(
    "dir",
    "rtl",
  );
  await expect(invalid.locator("[data-state-specimen-mount]")).toHaveAttribute(
    "data-a3s-theme",
    "dark",
  );

  const relationships = await dialog
    .locator(".a3s-component-state-matrix__field-specimen")
    .evaluateAll((fields) =>
      fields.map((field) => {
        const textarea =
          field.querySelector<HTMLTextAreaElement>("textarea.textarea");
        const label = textarea
          ? field.querySelector<HTMLLabelElement>(`label[for="${textarea.id}"]`)
          : null;
        const describedIds = (textarea?.getAttribute("aria-describedby") ?? "")
          .split(/\s+/u)
          .filter(Boolean);
        return {
          describedIds,
          descriptionsResolve: describedIds.every((id) =>
            Boolean(field.querySelector(`#${CSS.escape(id)}`)),
          ),
          labelFor: label?.htmlFor ?? "",
          textareaId: textarea?.id ?? "",
        };
      }),
    );
  expect(relationships).toHaveLength(5);
  expect(
    relationships.every(
      ({ describedIds, descriptionsResolve, labelFor, textareaId }) =>
        describedIds.length === 1 &&
        descriptionsResolve &&
        textareaId.length > 0 &&
        labelFor === textareaId,
    ),
  ).toBe(true);

  await expect(dialog).toHaveScreenshot("textarea-states.png");
  await expect(readonly).toHaveScreenshot("textarea-readonly-state.png");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("Textarea integrates truthful HTML, React, and Vue examples and stays localized", async ({
  page,
}) => {
  await openTextarea(page);

  const preview = primaryPreview(page);
  await preview.getByRole("button", { name: "Show integration code" }).click();
  const integration = preview.locator("[data-component-integration=textarea]");
  await expect(integration).toContainText("textarea-release-note-html");
  await expect(integration).toContainText('rows="5"');
  await expect(integration).toContainText('maxlength="320"');
  await expect(integration).toContainText("addEventListener");
  await expect(integration).toContainText("input");
  await expect(integration).toContainText("change");

  await integration.getByRole("tab", { name: "React" }).click();
  await expect(integration).toContainText("useTextarea");
  await expect(integration).toContainText("useState");
  await expect(integration).toContainText("events");
  await expect(integration).toContainText("HTMLTextAreaElement");
  await expect(integration).toContainText("maxLength");
  await expect(integration).toContainText("htmlFor");

  await integration.getByRole("tab", { name: "Vue" }).click();
  await expect(integration).toContainText("useTextarea");
  await expect(integration).toContainText("componentRef");
  await expect(integration).toContainText("ref(");
  await expect(integration).toContainText("HTMLTextAreaElement");
  await expect(integration).toContainText("maxlength");

  await openTextarea(page, "zh");
  const zhPreview = primaryPreview(page);
  const zhTextarea = zhPreview.locator("#textarea-release-note-zh");
  await expect(zhTextarea).toHaveAccessibleName("发布说明");
  await expect(zhTextarea).toHaveAccessibleDescription(
    "写明变更结果、验证方式，以及验证失败后的处理步骤，最多 320 字。",
  );
  await expect(
    zhPreview.locator("#textarea-release-note-count-zh"),
  ).toHaveAttribute("aria-label", "字数统计");
  await expect(
    page.getByRole("heading", { name: "表单校验与恢复" }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    "Type your message here",
  );
  await expect(page.locator("main")).not.toContainText("Message is required");
  await expect(page.locator("main")).not.toContainText("Submit");
});

test("Textarea survives coarse pointers, reduced motion, and native availability semantics", async ({
  baseURL,
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  expect(baseURL).toBeTruthy();

  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
    viewport: { height: 844, width: 390 },
  });

  try {
    const page = await context.newPage();
    await openTextarea(page);
    const textarea = primaryPreview(page).locator("#textarea-release-note-en");
    await textarea.focus();
    const geometry = await textarea.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const canvas = element.closest<HTMLElement>(".a3s-preview__canvas");
      if (!canvas) throw new Error("Textarea preview canvas is missing");
      const canvasBounds = canvas.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        boxShadow: style.boxShadow,
        controlInsideCanvas:
          bounds.left >= canvasBounds.left &&
          bounds.right <= canvasBounds.right,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        fontSize: Number.parseFloat(style.fontSize),
        height: bounds.height,
        outlineStyle: style.outlineStyle,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        resize: style.resize,
        transitionDuration: style.transitionDuration,
      };
    });
    expect(geometry.controlInsideCanvas).toBe(true);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
      geometry.documentClientWidth + 1,
    );
    expect(geometry.height).toBeGreaterThanOrEqual(96);
    expect(geometry.fontSize).toBeGreaterThanOrEqual(16);
    expect(geometry.reducedMotion).toBe(true);
    expect(Number.parseFloat(geometry.transitionDuration)).toBeLessThanOrEqual(
      0.001,
    );
    expect(geometry.resize).toBe("vertical");
    expect(geometry.outlineStyle).toBe("none");
    expect(geometry.boxShadow).toContain("inset");
    expectNoOuterRing(geometry.boxShadow);

    const availability = page.locator("form[data-textarea-availability=en]");
    const disabled = availability.locator("#textarea-disabled-en");
    const readonly = availability.locator("#textarea-readonly-en");
    await expect(disabled).toBeDisabled();
    await expect(readonly).toHaveAttribute("readonly", "");
    await expect(readonly).not.toBeDisabled();
    await readonly.focus();
    await expect(readonly).toBeFocused();
    const availabilityState = await availability.evaluate((form) => ({
      disabledOpacity: getComputedStyle(
        form.querySelector<HTMLTextAreaElement>("#textarea-disabled-en")!,
      ).opacity,
      submitted: Object.fromEntries(new FormData(form as HTMLFormElement)),
    }));
    expect(availabilityState.disabledOpacity).toBe("1");
    expect(availabilityState.submitted).toEqual({
      approvedReleaseNote:
        "Verification passed. Restore the previous package and rerun the smoke suite if health checks fail.",
    });
  } finally {
    await context.close();
  }
});

test("Textarea exposes a system focus boundary in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openTextarea(page);

  const textarea = primaryPreview(page).locator("#textarea-release-note-en");
  await textarea.focus();
  const focus = await textarea.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      boxShadow: style.boxShadow,
      forcedColors: matchMedia("(forced-colors: active)").matches,
      outlineOffset: style.outlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(focus).toEqual({
    boxShadow: "none",
    forcedColors: true,
    outlineOffset: "2px",
    outlineStyle: "solid",
    outlineWidth: "2px",
  });
});

test("Textarea keeps one bounded focus boundary across compatibility style packs", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");

  const stylePacks = [
    "vega",
    "nova",
    "maia",
    "lyra",
    "mira",
    "luma",
    "sera",
    "rhea",
  ] as const;
  const markup = `
    <div class="field">
      <label for="compat-textarea">Release note</label>
      <textarea id="compat-textarea" class="textarea" aria-describedby="compat-textarea-help">Verification passed.</textarea>
      <p id="compat-textarea-help">Include a rollback path.</p>
    </div>
    <textarea id="compat-textarea-invalid" class="textarea" aria-invalid="true">Rollback missing.</textarea>
    <textarea id="compat-textarea-disabled" class="textarea" disabled>Archived note.</textarea>
    <textarea id="compat-textarea-readonly" class="textarea" readonly>Approved note.</textarea>`;

  for (const stylePack of stylePacks) {
    await test.step(stylePack, async () => {
      await page.setContent(markup);
      await page.addStyleTag({
        path: new URL(`../dist/basecoat-${stylePack}.cdn.css`, import.meta.url)
          .pathname,
      });

      const textarea = page.locator("#compat-textarea");
      const invalid = page.locator("#compat-textarea-invalid");
      const disabled = page.locator("#compat-textarea-disabled");
      const readonly = page.locator("#compat-textarea-readonly");
      await expect(textarea).toHaveAccessibleName("Release note");
      await expect(textarea).toHaveAccessibleDescription(
        "Include a rollback path.",
      );
      await textarea.focus();
      const focus = await textarea.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
          maxBlockSize: Number.parseFloat(style.maxBlockSize),
          minHeight: Number.parseFloat(style.minHeight),
          outlineStyle: style.outlineStyle,
          resize: style.resize,
        };
      });
      expect(focus.borderWidth).toBe("1px");
      expect(focus.outlineStyle).toBe("none");
      expect(focus.boxShadow).toContain("inset");
      expectNoOuterRing(focus.boxShadow);
      expect(focus.maxBlockSize).toBeLessThanOrEqual(384);
      expect(focus.minHeight).toBeGreaterThanOrEqual(64);
      expect(focus.resize).toBe("vertical");

      const invalidRestingShadow = await invalid.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      );
      expectNoOuterRing(invalidRestingShadow);
      await invalid.focus();
      const invalidFocusShadow = await invalid.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      );
      expect(invalidFocusShadow).toContain("inset");
      expectNoOuterRing(invalidFocusShadow);

      const availability = await page.evaluate(() => {
        const ready = getComputedStyle(
          document.querySelector<HTMLTextAreaElement>("#compat-textarea")!,
        );
        const disabled = getComputedStyle(
          document.querySelector<HTMLTextAreaElement>(
            "#compat-textarea-disabled",
          )!,
        );
        const readonly = getComputedStyle(
          document.querySelector<HTMLTextAreaElement>(
            "#compat-textarea-readonly",
          )!,
        );
        return {
          disabledColor: disabled.color,
          disabledOpacity: disabled.opacity,
          readyBackground: ready.backgroundColor,
          readyColor: ready.color,
          readonlyBackground: readonly.backgroundColor,
        };
      });
      expect(availability.disabledOpacity).toBe("1");
      expect(availability.disabledColor).not.toBe(availability.readyColor);
      expect(availability.readonlyBackground).not.toBe(
        availability.readyBackground,
      );
      await expect(disabled).toBeDisabled();
      await expect(readonly).toHaveAttribute("readonly", "");
    });
  }
});
