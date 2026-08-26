import { expect, test, type Locator, type Page } from "@playwright/test";

async function openField(page: Page, locale: "en" | "zh" = "en") {
  const localePath =
    locale === "zh" ? "components/field.html" : "en/components/field.html";
  await page.goto(localePath, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html:not([data-a3s-defer-init])")).toBeVisible();
}

function primaryPreview(page: Page) {
  return page
    .locator(
      ".a3s-preview[data-preview-component=field][data-preview-integration=complete]",
    )
    .first();
}

function primaryField(page: Page) {
  return primaryPreview(page).locator(".field").first();
}

function expectNoOuterRing(boxShadow: string) {
  expect(boxShadow).not.toMatch(
    /0px 0px 0px (?:1px|2px|3px)(?![^,]*\binset\b)/u,
  );
}

async function describedIdsResolve(field: Locator, controlSelector: string) {
  return field.evaluate((element, selector) => {
    const control = element.querySelector<HTMLElement>(selector);
    const ids = (control?.getAttribute("aria-describedby") ?? "")
      .split(/\s+/u)
      .filter(Boolean);
    return {
      ids,
      resolve: ids.every((id) =>
        Boolean(element.querySelector(`#${CSS.escape(id)}`)),
      ),
    };
  }, controlSelector);
}

test("Field exposes one control relationship without false group semantics", async ({
  page,
}) => {
  await openField(page);

  const preview = primaryPreview(page);
  const field = primaryField(page);
  const label = field.locator('label[for="field-workspace-name-en"]');
  const input = field.locator("#field-workspace-name-en");
  const description = field.locator("#field-workspace-name-description-en");
  const message = field.locator("#field-workspace-name-error-en");

  await expect(preview).toHaveAttribute("data-preview-integration", "complete");
  await expect(field).toHaveAttribute("data-a3s-components", /\bfield\b/u);
  await expect(field).not.toHaveAttribute("role", "group");
  await expect(label).toHaveAttribute("data-a3s-parts", /\blabel\b/u);
  await expect(input).toHaveAttribute("data-a3s-parts", /\bcontrol\b/u);
  await expect(description).toHaveAttribute(
    "data-a3s-parts",
    /\bdescription\b/u,
  );
  await expect(message).toHaveAttribute("data-a3s-parts", /\bmessage\b/u);
  await expect(message).not.toHaveAttribute(
    "data-a3s-parts",
    /\bdescription\b/u,
  );

  await expect(input).toHaveAccessibleName("Workspace display name");
  await expect(input).toHaveAccessibleDescription(
    "Shown in navigation, invitations, and audit history. Use 2 to 40 characters.",
  );
  await expect(input).toHaveAttribute("required", "");
  await expect(input).toHaveAttribute("minlength", "2");
  await expect(input).toHaveAttribute("maxlength", "40");
  await expect(input).toHaveAttribute("autocomplete", "organization");
  await expect(input).toHaveAttribute("dir", "auto");
  await expect(input).toHaveValue("Agent Runtime");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "field-workspace-name-description-en",
  );
  await expect(message).toBeHidden();

  const relationships = await page
    .locator("main .field")
    .evaluateAll((fields) =>
      fields.map((field) => ({
        directControls: field.querySelectorAll(
          ":scope > input, :scope > textarea, :scope > select, :scope > [role=combobox]",
        ).length,
        nestedFields: field.querySelectorAll(":scope .field").length,
        role: field.getAttribute("role"),
      })),
    );
  expect(relationships.length).toBeGreaterThanOrEqual(9);
  expect(
    relationships.every(
      ({ directControls, nestedFields, role }) =>
        directControls === 1 && nestedFields === 0 && role === null,
    ),
  ).toBe(true);
  expect(await describedIdsResolve(field, "#field-workspace-name-en")).toEqual({
    ids: ["field-workspace-name-description-en"],
    resolve: true,
  });
});

test("Field validation preserves the value, focuses recovery, and clears stale relationships", async ({
  page,
}) => {
  await openField(page);

  const form = page.locator('form[data-field-primary-demo="en"]');
  const field = form.locator(".field");
  const input = form.locator("#field-workspace-name-en");
  const error = form.locator("#field-workspace-name-error-en");
  const submit = form.getByRole("button", { name: "Save name" });

  await input.fill("");
  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(error).toBeHidden();

  await input.evaluate((element) => {
    const control = element as HTMLInputElement;
    control.dispatchEvent(
      new CompositionEvent("compositionstart", {
        bubbles: true,
        data: "A",
      }),
    );
    control.value = "A";
    const composingInput = new InputEvent("input", {
      bubbles: true,
      data: "A",
      inputType: "insertCompositionText",
    });
    Object.defineProperty(composingInput, "isComposing", { value: true });
    control.dispatchEvent(composingInput);
  });
  await form.evaluate((element) =>
    (element as HTMLFormElement).requestSubmit(),
  );
  await expect(input).toHaveValue("A");
  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(error).toBeHidden();
  await input.evaluate((element) => {
    element.dispatchEvent(
      new CompositionEvent("compositionend", {
        bubbles: true,
        data: "A",
      }),
    );
  });
  await input.fill("");

  await submit.click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("");
  await expect(field).toHaveAttribute("data-invalid", "true");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "field-workspace-name-description-en field-workspace-name-error-en",
  );
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("role", "alert");
  await expect(error).toHaveText(
    "Enter a workspace name between 2 and 40 characters.",
  );

  await input.fill("A");
  await expect(field).toHaveAttribute("data-invalid", "true");
  await expect(error).toBeVisible();

  await input.evaluate((element) => {
    const control = element as HTMLInputElement;
    control.dispatchEvent(
      new CompositionEvent("compositionstart", {
        bubbles: true,
        data: "Runtime Core",
      }),
    );
    control.value = "Runtime Core";
    const composingInput = new InputEvent("input", {
      bubbles: true,
      data: "Runtime Core",
      inputType: "insertCompositionText",
    });
    Object.defineProperty(composingInput, "isComposing", { value: true });
    control.dispatchEvent(composingInput);
  });
  await expect(input).toHaveValue("Runtime Core");
  await expect(field).toHaveAttribute("data-invalid", "true");
  await expect(error).toBeVisible();

  await input.evaluate((element) => {
    const control = element as HTMLInputElement;
    control.dispatchEvent(
      new CompositionEvent("compositionend", {
        bubbles: true,
        data: "Runtime Core",
      }),
    );
    control.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: "Runtime Core",
        inputType: "insertText",
      }),
    );
  });
  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "field-workspace-name-description-en",
  );
  await expect(error).toBeHidden();

  await input.fill("A");
  await submit.click();
  await expect(input).toBeFocused();
  await expect(error).toBeVisible();
  await form.getByRole("button", { name: "Reset" }).click();
  await expect(input).toHaveValue("Agent Runtime");
  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(error).toBeHidden();
});

test("Field state acceptance keeps five independent native states and complete relationships", async ({
  page,
}) => {
  await openField(page);

  const preview = primaryPreview(page);
  await preview
    .getByRole("button", { name: "Preview right-to-left layout" })
    .click();
  await preview.getByRole("button", { name: "Preview in dark mode" }).click();
  const trigger = preview.getByRole("button", {
    name: "View state acceptance matrix",
  });
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Field state acceptance" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-state-specimen]")).toHaveCount(5);

  const empty = dialog.locator("[data-state-specimen=empty]");
  const ready = dialog.locator("[data-state-specimen=ready]");
  const disabled = dialog.locator("[data-state-specimen=disabled]");
  const invalid = dialog.locator("[data-state-specimen=invalid]");
  const readonly = dialog.locator("[data-state-specimen=readonly]");

  await expect(empty.locator(".field > input")).toHaveValue("");
  await expect(empty.locator(".field")).not.toHaveAttribute("aria-invalid");
  await expect(empty.locator("[data-field-description]")).toContainText(
    "No workspace name has been entered",
  );
  await expect(empty.locator("[data-field-message]")).toBeHidden();

  await expect(ready.locator(".field > input")).toHaveValue("Agent Runtime");
  await expect(ready.locator(".field > input")).toHaveAccessibleName(
    "Workspace display name",
  );
  await expect(ready.locator("[data-field-message]")).toBeHidden();

  await expect(disabled.locator(".field")).toHaveAttribute(
    "data-disabled",
    "true",
  );
  await expect(disabled.locator(".field")).not.toHaveAttribute("aria-disabled");
  await expect(disabled.locator(".field > input")).toBeDisabled();
  await expect(disabled.locator(".field > input")).toHaveValue(
    "Archived Runtime",
  );
  await expect(disabled.locator("[data-field-description]")).toContainText(
    "cannot be edited after archival",
  );

  await expect(invalid.locator(".field")).toHaveAttribute(
    "data-invalid",
    "true",
  );
  await expect(invalid.locator(".field")).not.toHaveAttribute("aria-invalid");
  await expect(invalid.locator(".field > input")).toHaveValue("A");
  await expect(invalid.locator(".field > input")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(invalid.locator("[data-field-message]")).toBeVisible();
  await expect(invalid.locator("[data-field-message]")).toHaveAttribute(
    "role",
    "alert",
  );
  expect(
    await invalid
      .locator(".field > input")
      .evaluate((element) => (element as HTMLInputElement).checkValidity()),
  ).toBe(false);

  await expect(readonly.locator(".field")).toHaveAttribute(
    "data-readonly",
    "true",
  );
  await expect(readonly.locator(".field")).not.toHaveAttribute("aria-readonly");
  await expect(readonly.locator(".field > input")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(readonly.locator(".field > input")).toHaveValue(
    "Production Runtime",
  );
  await expect(readonly.locator("[data-field-description]")).toContainText(
    "selectable and copyable",
  );

  const bidiStyles = await dialog
    .locator("[data-field-description], [data-field-message]")
    .evaluateAll((elements) =>
      Array.from(
        new Set(
          elements.map((element) => getComputedStyle(element).unicodeBidi),
        ),
      ),
    );
  expect(bidiStyles).toEqual(["plaintext"]);
  await expect(ready.locator(".field > input")).toHaveAttribute("dir", "auto");
  expect(
    await ready
      .locator(".field > input")
      .evaluate((element) => getComputedStyle(element).direction),
  ).toBe("ltr");

  const specimenContracts = await dialog
    .locator(".field")
    .evaluateAll((fields) =>
      fields.map((field) => {
        const input = field.querySelector<HTMLInputElement>(":scope > input");
        const label = input
          ? field.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)
          : null;
        const ids = (input?.getAttribute("aria-describedby") ?? "")
          .split(/\s+/u)
          .filter(Boolean);
        return {
          ids,
          idsResolve: ids.every((id) =>
            Boolean(field.querySelector(`#${CSS.escape(id)}`)),
          ),
          inputId: input?.id ?? "",
          labelFor: label?.htmlFor ?? "",
          messageVisible: !field.querySelector<HTMLElement>(
            "[data-field-message]",
          )?.hidden,
          role: field.getAttribute("role"),
        };
      }),
    );
  expect(specimenContracts).toHaveLength(5);
  expect(
    specimenContracts.every(
      ({ ids, idsResolve, inputId, labelFor, role }) =>
        ids.length >= 1 &&
        idsResolve &&
        inputId.length > 0 &&
        labelFor === inputId &&
        role === null,
    ),
  ).toBe(true);
  expect(
    specimenContracts.filter(({ messageVisible }) => messageVisible),
  ).toHaveLength(1);

  await expect(invalid.locator("[data-state-specimen-mount]")).toHaveAttribute(
    "dir",
    "rtl",
  );
  await expect(invalid.locator("[data-state-specimen-mount]")).toHaveAttribute(
    "data-a3s-theme",
    "dark",
  );

  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("Field distinguishes requirements, native availability, and related-control grouping", async ({
  page,
}) => {
  await openField(page);

  const required = page.locator("#field-required-owner-en");
  const optional = page.locator("#field-optional-reference-en");
  await expect(required).toHaveAccessibleName("Workspace owner");
  await expect(required).toHaveAttribute("required", "");
  await expect(optional).toHaveAccessibleName("Internal reference Optional");
  await expect(optional).not.toHaveAttribute("required");

  const availability = page.locator('form[data-field-availability="en"]');
  const disabled = availability.locator("#field-disabled-slug-en");
  const readonly = availability.locator("#field-readonly-owner-en");
  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveValue("legacy-runtime");
  await expect(disabled).toHaveAccessibleDescription(
    "Archived identifiers remain visible for audit history and cannot be submitted.",
  );
  await expect(readonly).toHaveAttribute("readonly", "");
  await expect(readonly).not.toBeDisabled();
  await expect(readonly).toHaveValue("owner@example.com");
  await expect(readonly).toHaveAccessibleDescription(
    "This value remains selectable and submitted; only an organization transfer can change it.",
  );
  await readonly.focus();
  await expect(readonly).toBeFocused();
  expect(
    await availability.evaluate((form) =>
      Object.fromEntries(new FormData(form as HTMLFormElement)),
    ),
  ).toEqual({ organizationOwner: "owner@example.com" });

  const fieldset = page.locator(
    "fieldset.fieldset:has(#field-release-date-en)",
  );
  await expect(fieldset).toHaveAccessibleName("Release window");
  await expect(fieldset).toHaveAccessibleDescription(
    "Used to schedule the production handoff.",
  );
  await expect(fieldset.locator(".field")).toHaveCount(2);
  await expect(fieldset.locator('[role="group"]')).toHaveCount(0);
  await expect(fieldset.locator("#field-release-date-en")).toHaveAccessibleName(
    "Date",
  );
  await expect(fieldset.locator("#field-release-time-en")).toHaveAccessibleName(
    "Local time",
  );
});

test("Field integrates truthful HTML, React, and Vue without a fabricated hook", async ({
  page,
}) => {
  await openField(page);

  const preview = primaryPreview(page);
  await preview.getByRole("button", { name: "Show integration code" }).click();
  const integration = preview.locator("[data-component-integration=field]");
  await expect(integration).toContainText("data-field-description");
  await expect(integration).toContainText("data-field-message");
  await expect(integration).toContainText("aria-describedby");
  await expect(integration).toContainText('dir="auto"');
  await expect(integration).toContainText("compositionstart");
  await expect(integration).toContainText("novalidate");
  await expect(integration).not.toContainText('role="group"');

  await integration.getByRole("tab", { name: "React" }).click();
  await expect(integration).toContainText(
    'import { Field } from "@a3s-lab/ui/react"',
  );
  await expect(integration).toContainText("useRef");
  await expect(integration).toContainText("useState");
  await expect(integration).toContainText("composingRef");
  await expect(integration).toContainText("onCompositionStart");
  await expect(integration).toContainText("htmlFor");
  await expect(integration).toContainText("noValidate");
  await expect(integration).not.toContainText("useField");

  await integration.getByRole("tab", { name: "Vue" }).click();
  await expect(integration).toContainText(
    'import { Field } from "@a3s-lab/ui/vue"',
  );
  await expect(integration).toContainText(
    "ref<HTMLInputElement | null>(null)",
  );
  await expect(integration).toContainText("const composing = ref(false)");
  await expect(integration).toContainText(
    '@compositionstart="startComposition"',
  );
  await expect(integration).toContainText("novalidate");
  await expect(integration).toContainText("@submit.prevent");
  await expect(integration).not.toContainText("useField");

  await expect(integration).toContainText(
    "This component needs no framework-specific hook.",
  );
});

test("Field stays contained with Chinese copy, long recovery text, dark RTL, and a coarse pointer", async ({
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
    await openField(page, "zh");
    const preview = primaryPreview(page);
    await preview.getByRole("button", { name: "切换为从右到左布局" }).click();
    await preview.getByRole("button", { name: "切换为深色预览" }).click();

    const field = primaryField(page);
    const input = field.locator("#field-workspace-name-zh");
    const error = field.locator("#field-workspace-name-error-zh");
    await expect(field).not.toHaveAttribute("role", "group");
    await expect(input).toHaveAccessibleName("工作区显示名称");
    await expect(input).toHaveAccessibleDescription(
      "用于导航、邀请和审计记录，长度为 2 到 40 个字符。",
    );
    await input.fill("");
    await page.getByRole("button", { name: "保存名称" }).click();
    await error.evaluate((element) => {
      element.textContent =
        "请输入一个能在导航、邀请、审计记录和窄屏设备中保持清晰可辨的工作区名称，长度必须在 2 到 40 个字符之间。";
    });
    await expect(error).toBeVisible();
    await expect(input).toBeFocused();

    const geometry = await field.evaluate((element) => {
      const input = element.querySelector<HTMLInputElement>("input")!;
      const error = element.querySelector<HTMLElement>("[data-field-message]")!;
      const fieldBounds = element.getBoundingClientRect();
      const inputBounds = input.getBoundingClientRect();
      const canvas = element.closest<HTMLElement>(".a3s-preview__canvas")!;
      const canvasBounds = canvas.getBoundingClientRect();
      const inputStyle = getComputedStyle(input);
      const errorStyle = getComputedStyle(error);
      return {
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        errorWidth: error.scrollWidth,
        errorWrap: errorStyle.overflowWrap,
        fieldInsideCanvas:
          fieldBounds.left >= canvasBounds.left &&
          fieldBounds.right <= canvasBounds.right,
        inputInsideField:
          inputBounds.left >= fieldBounds.left &&
          inputBounds.right <= fieldBounds.right,
        inputFontSize: Number.parseFloat(inputStyle.fontSize),
        inputHeight: inputBounds.height,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        transitionDuration: inputStyle.transitionDuration,
      };
    });
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
      geometry.documentClientWidth + 1,
    );
    expect(geometry.fieldInsideCanvas).toBe(true);
    expect(geometry.inputInsideField).toBe(true);
    expect(geometry.errorWidth).toBeLessThanOrEqual(
      await field.evaluate((element) => element.clientWidth + 1),
    );
    expect(["anywhere", "break-word"]).toContain(geometry.errorWrap);
    expect(geometry.inputHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.inputFontSize).toBeGreaterThanOrEqual(16);
    expect(geometry.reducedMotion).toBe(true);
    expect(Number.parseFloat(geometry.transitionDuration)).toBeLessThanOrEqual(
      0.001,
    );
  } finally {
    await context.close();
  }
});

test("Field keeps local error emphasis and one control boundary across compatibility styles", async ({
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
    <div class="field" data-invalid="true">
      <label for="compat-field-invalid">Workspace display name</label>
      <input id="compat-field-invalid" value="A" minlength="2" aria-invalid="true" aria-describedby="compat-field-help compat-field-error">
      <p id="compat-field-help" data-field-description>Use 2 to 40 characters.</p>
      <p id="compat-field-error" data-field-message role="alert">Enter a workspace name between 2 and 40 characters.</p>
    </div>
    <div class="field">
      <label for="compat-field-ready">Workspace display name</label>
      <input id="compat-field-ready" value="Agent Runtime" aria-describedby="compat-field-ready-help">
      <p id="compat-field-ready-help" data-field-description>Use 2 to 40 characters.</p>
    </div>`;

  for (const stylePack of stylePacks) {
    await test.step(stylePack, async () => {
      await page.setContent(markup);
      await page.addStyleTag({
        path: new URL(`../dist/basecoat-${stylePack}.cdn.css`, import.meta.url)
          .pathname,
      });

      const invalidField = page.locator(".field").first();
      const input = invalidField.locator("#compat-field-invalid");
      const label = invalidField.locator("label");
      const readyLabel = page.locator('label[for="compat-field-ready"]');
      const description = invalidField.locator("[data-field-description]");
      const message = invalidField.locator("[data-field-message]");
      await expect(invalidField).not.toHaveAttribute("role");
      await expect(input).toHaveAccessibleName("Workspace display name");
      await expect(input).toHaveAccessibleDescription(
        "Use 2 to 40 characters. Enter a workspace name between 2 and 40 characters.",
      );
      await expect(message).toBeVisible();

      const metrics = await invalidField.evaluate((element) => {
        const input = element.querySelector<HTMLInputElement>("input")!;
        const label = element.querySelector<HTMLLabelElement>("label")!;
        const description = element.querySelector<HTMLElement>(
          "[data-field-description]",
        )!;
        const message = element.querySelector<HTMLElement>(
          "[data-field-message]",
        )!;
        const readyLabel = document.querySelector<HTMLLabelElement>(
          'label[for="compat-field-ready"]',
        )!;
        return {
          descriptionColor: getComputedStyle(description).color,
          gap: getComputedStyle(element).rowGap,
          inputBorderColor: getComputedStyle(input).borderColor,
          labelColor: getComputedStyle(label).color,
          messageColor: getComputedStyle(message).color,
          readyLabelColor: getComputedStyle(readyLabel).color,
        };
      });
      expect(Number.parseFloat(metrics.gap)).toBeGreaterThanOrEqual(8);
      expect(metrics.labelColor).toBe(metrics.readyLabelColor);
      expect(metrics.messageColor).not.toBe(metrics.labelColor);
      expect(metrics.descriptionColor).not.toBe(metrics.messageColor);

      await input.focus();
      const focus = await input.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          boxShadow: style.boxShadow,
          outlineStyle: style.outlineStyle,
        };
      });
      expect(focus.outlineStyle).toBe("none");
      expectNoOuterRing(focus.boxShadow);
    });
  }
});
