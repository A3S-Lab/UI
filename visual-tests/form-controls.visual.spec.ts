import { expect, test, type Locator, type Page } from "@playwright/test";

async function openComponent(page: Page, component: string) {
  await page.goto(`en/components/${component}.html`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
}

function expectNoOuterRing(boxShadow: string) {
  expect(boxShadow).not.toMatch(
    /0px 0px 0px (?:1px|2px|3px)(?![^,]*\binset\b)/u,
  );
}

async function settleElementAnimations(element: Locator) {
  await element.evaluate(async (node) => {
    await Promise.all(
      node
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

async function readNativeSelectStyle(select: Locator) {
  return select.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      backgroundPosition: style.backgroundPosition,
      paddingInlineEnd: style.paddingInlineEnd,
      paddingInlineStart: style.paddingInlineStart,
    };
  });
}

test("Native Select keeps its logical chevron across Office states", async ({
  page,
}) => {
  await openComponent(page, "native-select");

  const preview = page
    .locator(".a3s-preview[data-preview-component=native-select]")
    .first();
  const select = preview.locator("select");
  const ltr = await readNativeSelectStyle(select);
  expect(ltr.backgroundImage).not.toBe("none");
  expect(ltr.paddingInlineStart).toBe("10px");
  expect(ltr.paddingInlineEnd).toBe("32px");

  await select.hover();
  expect((await readNativeSelectStyle(select)).backgroundImage).not.toBe(
    "none",
  );

  await preview.evaluate((element) => {
    element.setAttribute("dir", "rtl");
  });
  const rtl = await readNativeSelectStyle(select);
  expect(rtl.backgroundImage).not.toBe("none");
  expect(rtl.backgroundPosition).not.toBe(ltr.backgroundPosition);
  expect(rtl.paddingInlineStart).toBe("10px");
  expect(rtl.paddingInlineEnd).toBe("32px");

  await page.evaluate(() => window.a3sUI.theme.set("dark"));
  const dark = await readNativeSelectStyle(select);
  expect(dark.backgroundImage).not.toBe("none");
  expect(dark.backgroundColor).not.toBe("rgb(255, 255, 255)");
});

test("Native Select keeps one canonical, labeled native form contract across states and frameworks", async ({
  page,
}) => {
  await openComponent(page, "native-select");

  const preview = page
    .locator(
      ".a3s-preview[data-preview-component=native-select][data-preview-integration=complete]",
    )
    .first();
  const select = preview.locator("select.native-select");
  await expect(select).toHaveCount(1);
  await expect(select).not.toHaveClass(/(?:^|\s)select(?:\s|$)/);
  await expect(select).toHaveAttribute("id", "native-select-fruit-en");
  await expect(
    preview.locator('label[for="native-select-fruit-en"]'),
  ).toHaveText("Fruit");
  await expect(select).toHaveAttribute(
    "aria-describedby",
    "native-select-fruit-help-en",
  );

  await select.evaluate((element) => {
    const control = element as HTMLSelectElement & {
      __nativeEvents?: string[];
    };
    control.__nativeEvents = [];
    control.addEventListener("input", () =>
      control.__nativeEvents?.push("input"),
    );
    control.addEventListener("change", () =>
      control.__nativeEvents?.push("change"),
    );
  });
  await select.selectOption("banana");
  await expect(select).toHaveValue("banana");
  await expect
    .poll(() =>
      select.evaluate(
        (element) =>
          (element as HTMLSelectElement & { __nativeEvents?: string[] })
            .__nativeEvents,
      ),
    )
    .toEqual(["input", "change"]);

  const grouped = page.locator("#native-select-food-en");
  await expect(grouped.locator('optgroup[label="Unavailable"]')).toBeDisabled();

  const disabled = page.locator("#native-select-disabled-en");
  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveValue("apple");
  await expect(disabled).toHaveAttribute(
    "aria-describedby",
    "native-select-disabled-reason-en",
  );
  await expect(page.locator("#native-select-disabled-reason-en")).toHaveText(
    "This choice is managed by workspace policy.",
  );

  const invalid = page.locator("#native-select-invalid-en");
  await expect(invalid).toHaveAttribute("required", "");
  await expect(invalid).toHaveAttribute("aria-invalid", "true");
  await expect(invalid).toHaveAttribute(
    "aria-describedby",
    "native-select-invalid-error-en",
  );
  expect(await invalid.evaluate((element) => element.checkValidity())).toBe(
    false,
  );
  await expect(page.locator("#native-select-invalid-error-en")).toHaveText(
    "Choose a fruit before continuing.",
  );

  await preview.getByRole("button", { name: "Show integration code" }).click();
  const integration = preview.locator(
    "[data-component-integration=native-select]",
  );
  await integration.getByRole("tab", { name: "React" }).click();
  await expect(integration).toContainText("useNativeSelect");
  await expect(integration).toContainText("htmlFor");
  await expect(integration).toContainText("native-select-fruit-react");
  await integration.getByRole("tab", { name: "Vue" }).click();
  await expect(integration).toContainText("useNativeSelect");
  await expect(integration).toContainText("componentRef");
  await expect(integration).toContainText("native-select-fruit-vue");
});

test("Native Select state acceptance keeps empty, populated, disabled, and invalid fields truthful", async ({
  page,
}) => {
  await openComponent(page, "native-select");

  const preview = page
    .locator(
      ".a3s-preview[data-preview-component=native-select][data-preview-integration=complete]",
    )
    .first();
  const trigger = preview.getByRole("button", {
    name: "View state acceptance matrix",
  });
  await trigger.click();

  const dialog = page.getByRole("dialog", {
    name: "Native Select state acceptance",
  });
  await expect(dialog).toBeVisible();
  const empty = dialog.locator("[data-state-specimen=empty]");
  const ready = dialog.locator("[data-state-specimen=ready]");
  const disabled = dialog.locator("[data-state-specimen=disabled]");
  const invalid = dialog.locator("[data-state-specimen=invalid]");
  await expect(dialog.locator("[data-state-specimen]")).toHaveCount(4);
  await expect(empty.locator("select.native-select")).toHaveValue("");
  await expect(empty.locator("[data-state-specimen-feedback]")).toContainText(
    "No fruit is selected",
  );
  await expect(ready.locator("select.native-select")).toHaveValue("apple");
  await expect(disabled.locator("select.native-select")).toBeDisabled();
  await expect(disabled.locator("select.native-select")).toHaveValue("apple");
  await expect(
    disabled.locator("[data-state-specimen-feedback]"),
  ).toContainText("workspace policy");
  await expect(invalid.locator("select.native-select")).toHaveAttribute(
    "required",
    "",
  );
  await expect(invalid.locator("select.native-select")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(
    await invalid
      .locator("select.native-select")
      .evaluate((element) => element.checkValidity()),
  ).toBe(false);
  await expect(invalid.getByRole("alert")).toContainText(
    "Choose a fruit before continuing",
  );

  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("Native Select preserves touch geometry, readable input text, and long-value containment", async ({
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
    await openComponent(page, "native-select");
    const preview = page
      .locator(
        ".a3s-preview[data-preview-component=native-select][data-preview-integration=complete]",
      )
      .first();
    const select = preview.locator("select.native-select");
    await select.selectOption("long-label");

    const geometry = await select.evaluate((element) => {
      const control = element as HTMLSelectElement;
      const controlBounds = control.getBoundingClientRect();
      const canvas = control.closest<HTMLElement>(".a3s-preview__canvas");
      if (!canvas) throw new Error("Native Select preview canvas is missing");
      const canvasBounds = canvas.getBoundingClientRect();
      const style = getComputedStyle(control);
      return {
        controlInsideCanvas:
          controlBounds.left >= canvasBounds.left &&
          controlBounds.right <= canvasBounds.right,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        fontSize: Number.parseFloat(style.fontSize),
        height: controlBounds.height,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        textOverflow: style.textOverflow,
        transitionDuration: style.transitionDuration,
        value: control.value,
      };
    });

    expect(geometry.value).toBe("long-label");
    expect(geometry.controlInsideCanvas).toBe(true);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
      geometry.documentClientWidth + 1,
    );
    expect(geometry.height).toBeGreaterThanOrEqual(44);
    expect(geometry.fontSize).toBeGreaterThanOrEqual(16);
    expect(geometry.reducedMotion).toBe(true);
    expect(geometry.textOverflow).toBe("ellipsis");
    expect(Number.parseFloat(geometry.transitionDuration)).toBeLessThanOrEqual(
      0.001,
    );
  } finally {
    await context.close();
  }
});

test("Native Select keeps a visible system focus boundary in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openComponent(page, "native-select");

  const select = page
    .locator(
      ".a3s-preview[data-preview-component=native-select][data-preview-integration=complete] select.native-select",
    )
    .first();
  await select.focus();
  const focus = await select.evaluate((element) => {
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

test("Select keeps one named trigger and skips disabled options across keyboard paths", async ({
  page,
}) => {
  await openComponent(page, "select");

  const root = page.locator("#select-demo");
  const trigger = page.locator("#select-demo-trigger");
  const hiddenInput = root.locator('input[type="hidden"]');
  await expect(trigger).toHaveAccessibleName("Fruit");

  await trigger.focus();
  await page.keyboard.press("End");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAttribute(
    "aria-activedescendant",
    "select-demo-option-5",
  );
  await page.keyboard.press("Enter");
  await expect(hiddenInput).toHaveValue("pineapple");
  await expect(trigger).toBeFocused();
  await expect(trigger).not.toHaveAttribute("aria-activedescendant", /.+/);

  await page.keyboard.type("bb", { delay: 10 });
  await expect(trigger).toHaveAttribute(
    "aria-activedescendant",
    "select-demo-option-3",
  );
  await page.keyboard.press("Escape");
  await expect(hiddenInput).toHaveValue("pineapple");
  await expect(trigger).toBeFocused();

  await root.evaluate((element) => {
    const option = document.createElement("div");
    option.setAttribute("role", "option");
    option.dataset.value = "acai";
    option.textContent = "Áçaí";
    element.querySelector('[role="listbox"]')?.append(option);
    (element as HTMLElement & { refresh(): void }).refresh();
  });
  await page.keyboard.type("ac", { delay: 10 });
  await expect(trigger).toHaveAttribute(
    "aria-activedescendant",
    "select-demo-option-6",
  );
  await page.keyboard.press("Escape");

  const disabledOptionRoot = page.locator("#select-disabled-option");
  const disabledOptionTrigger = page.locator("#select-disabled-option-trigger");
  const disabledOptionInput = disabledOptionRoot.locator(
    'input[type="hidden"]',
  );
  const disabledOption = disabledOptionRoot.locator(
    '[role="option"][data-value="grapes"]',
  );
  await disabledOptionTrigger.click();
  await expect(disabledOption).toHaveAttribute("aria-disabled", "true");
  await expect(disabledOption).toHaveCSS("pointer-events", "none");
  await expect(disabledOptionInput).toHaveValue("");
  await expect(disabledOptionTrigger).toHaveAttribute("aria-expanded", "true");

  await disabledOptionTrigger.focus();
  await page.keyboard.press("Home");
  await expect(disabledOptionTrigger).toHaveAttribute(
    "aria-activedescendant",
    "select-disabled-option-option-1",
  );
  await page.keyboard.press("ArrowDown");
  await expect(disabledOptionTrigger).toHaveAttribute(
    "aria-activedescendant",
    "select-disabled-option-option-3",
  );
  await page.keyboard.press("Enter");
  await expect(disabledOptionInput).toHaveValue("pineapple");
  await expect(disabledOptionTrigger).toBeFocused();
});

test("Office choice controls reserve space only for overlaid indicators", async ({
  page,
}) => {
  await openComponent(page, "select");

  const trigger = page.locator("#select-demo-trigger");
  const readTriggerGeometry = () =>
    trigger.evaluate((button) => {
      const label = button.querySelector<HTMLElement>("span")!;
      const icon = button.querySelector<SVGElement>("svg")!;
      const buttonRect = button.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const style = getComputedStyle(button);
      const isRtl = style.direction === "rtl";

      return {
        iconEndInset: isRtl
          ? iconRect.left - buttonRect.left
          : buttonRect.right - iconRect.right,
        labelIconGap: isRtl
          ? labelRect.left - iconRect.right
          : iconRect.left - labelRect.right,
        paddingInlineEnd: style.paddingInlineEnd,
        paddingInlineStart: style.paddingInlineStart,
      };
    });

  expect(await readTriggerGeometry()).toEqual({
    iconEndInset: 11,
    labelIconGap: 6,
    paddingInlineEnd: "10px",
    paddingInlineStart: "10px",
  });

  await trigger.locator("span").evaluate((label) => {
    label.textContent =
      "A deliberately long option label that must truncate before the chevron";
  });
  expect((await readTriggerGeometry()).labelIconGap).toBe(6);

  await trigger.evaluate((button) => {
    button.closest<HTMLElement>(".select")!.dir = "rtl";
  });
  expect(await readTriggerGeometry()).toEqual({
    iconEndInset: 11,
    labelIconGap: 6,
    paddingInlineEnd: "10px",
    paddingInlineStart: "10px",
  });

  await trigger.evaluate((button) => {
    button.closest<HTMLElement>(".select")!.dir = "ltr";
    button.querySelector("span")!.textContent = "Select a fruit";
  });
  await trigger.click();
  await page
    .locator('#select-demo-listbox [role="option"][data-value="apple"]')
    .click();
  await trigger.click();

  const selectedOption = page.locator(
    '#select-demo-listbox [role="option"][aria-selected="true"]',
  );
  await expect(selectedOption).toHaveCSS("padding-inline-end", "32px");
  await expect(selectedOption).not.toHaveCSS("background-image", "none");

  await openComponent(page, "combobox");
  const combobox = page.locator("#framework-combobox");
  const comboboxGeometry = await combobox.evaluate((root) => {
    const input = root.querySelector<HTMLInputElement>(
      'input[role="combobox"]',
    )!;
    const icon = root.querySelector<SVGElement>(".combobox-trigger-icon")!;
    const inputRect = input.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    const style = getComputedStyle(input);
    return {
      iconEndInset: inputRect.right - iconRect.right,
      paddingInlineEnd: style.paddingInlineEnd,
      paddingInlineStart: style.paddingInlineStart,
    };
  });
  expect(comboboxGeometry).toEqual({
    iconEndInset: 10,
    paddingInlineEnd: "32px",
    paddingInlineStart: "10px",
  });
});

test("MDX form previews preserve mutable native checked state", async ({
  page,
}) => {
  await openComponent(page, "checkbox");
  const checkedCheckbox = page.getByRole("checkbox", {
    name: "Email",
    exact: true,
  });
  await expect(checkedCheckbox).toBeChecked();
  await checkedCheckbox.uncheck();
  await expect(checkedCheckbox).not.toBeChecked();
  await checkedCheckbox.check();
  await expect(checkedCheckbox).toBeChecked();

  await openComponent(page, "radio-group");
  const radioGroup = page.locator('[role="radiogroup"]:has(#r1)');
  const defaultRadio = page.locator("#r1");
  const comfortableRadio = page.locator("#r2");
  const compactRadio = page.locator("#r3");
  await expect(radioGroup).toBeVisible();
  await expect(radioGroup).toHaveAccessibleName("View density");
  await expect(
    page.getByRole("radiogroup", { name: "View density" }).first(),
  ).toBeVisible();
  await expect(radioGroup.locator('[role="group"]')).toHaveCount(0);
  await expect(comfortableRadio).toBeChecked();
  await defaultRadio.check();
  await expect(defaultRadio).toBeChecked();
  await expect(comfortableRadio).not.toBeChecked();
  await comfortableRadio.check();
  await expect(comfortableRadio).toBeChecked();

  await comfortableRadio.focus();
  await page.keyboard.press("ArrowRight");
  await expect(compactRadio).toBeChecked();
  await expect(compactRadio).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(defaultRadio).toBeChecked();
  await page.keyboard.press("ArrowLeft");
  await expect(compactRadio).toBeChecked();

  const disabledRadio = page.locator("#disabled-1");
  const standardRadio = page.locator("#disabled-2");
  const remoteRadio = page.locator("#disabled-3");
  await expect(disabledRadio).toBeDisabled();
  await expect(disabledRadio).toHaveAttribute(
    "aria-describedby",
    "disabled-1-reason",
  );
  await expect(page.locator("#disabled-1-reason")).toContainText(
    "No compatible device",
  );
  await standardRadio.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(remoteRadio).toBeChecked();
  await expect(remoteRadio).toBeFocused();

  const invalidGroup = page.locator("fieldset:has(#invalid-email)");
  const invalidEmail = page.locator("#invalid-email");
  const invalidError = page.locator("#notification-preference-error-en");
  await expect(invalidGroup).toHaveAccessibleName("Notification preference");
  await expect(invalidEmail).not.toBeChecked();
  await expect(invalidEmail).toHaveAttribute("required", "");
  await expect(invalidEmail).not.toHaveAttribute("aria-invalid", "true");
  await expect(invalidEmail).toHaveAttribute(
    "aria-describedby",
    "notification-preference-error-en",
  );
  await expect(invalidError).toHaveAttribute("role", "alert");
  await expect(invalidError).toBeHidden();
  await expect(invalidError).toHaveText(
    "Choose one delivery method before continuing.",
  );
  expect(
    await invalidEmail.evaluate((element) => element.checkValidity()),
  ).toBe(false);

  const labelGeometry = await page
    .locator('label[for="r1"]')
    .evaluate((label) => {
      const labelRect = label.getBoundingClientRect();
      const inputRect = document.getElementById("r1")!.getBoundingClientRect();
      const style = getComputedStyle(label);
      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: labelRect.left - inputRect.right,
        minHeight: style.minHeight,
      };
    });
  expect(labelGeometry).toEqual({
    fontSize: "14px",
    fontWeight: "500",
    gap: 8,
    minHeight: "24px",
  });

  await openComponent(page, "settings-layout");
  const settingsSwitch = page
    .locator(".a3s-preview[data-preview-component=settings-layout]")
    .first()
    .locator('input[role="switch"]');
  await expect(settingsSwitch).toBeChecked();
  await settingsSwitch.uncheck();
  await expect(settingsSwitch).not.toBeChecked();
});

test("Office Radio keeps its hit target, selected dot, and visible focus ring", async ({
  page,
}) => {
  await openComponent(page, "radio-group");

  const uncheckedRadio = page.locator("#r1");
  const checkedRadio = page.locator("#r2");
  const readRadioState = (radio: Locator) =>
    radio.evaluate((element) => {
      const control = getComputedStyle(element);
      const indicator = getComputedStyle(element, "::before");
      const ring = getComputedStyle(element, "::after");
      const rect = element.getBoundingClientRect();

      return {
        control: {
          boxShadow: control.boxShadow,
          height: rect.height,
          width: rect.width,
        },
        indicator: {
          backgroundColor: indicator.backgroundColor,
          height: indicator.height,
          width: indicator.width,
          zIndex: indicator.zIndex,
        },
        ring: {
          backgroundColor: ring.backgroundColor,
          borderColor: ring.borderColor,
          height: ring.height,
          outlineColor: ring.outlineColor,
          outlineOffset: ring.outlineOffset,
          outlineStyle: ring.outlineStyle,
          outlineWidth: ring.outlineWidth,
          width: ring.width,
          zIndex: ring.zIndex,
        },
      };
    });

  for (const theme of ["light", "dark"] as const) {
    await test.step(theme, async () => {
      await page.evaluate((value) => window.a3sUI.theme.set(value), theme);

      await uncheckedRadio.focus();
      await expect(uncheckedRadio).toBeFocused();
      const unchecked = await readRadioState(uncheckedRadio);
      expect(unchecked.control).toEqual({
        boxShadow: "none",
        height: 24,
        width: 24,
      });
      expect(unchecked.ring).toMatchObject({
        height: "15px",
        outlineOffset: "2px",
        outlineStyle: "solid",
        outlineWidth: "2px",
        width: "15px",
        zIndex: "1",
      });

      await checkedRadio.focus();
      await expect(checkedRadio).toBeChecked();
      await expect(checkedRadio).toBeFocused();
      const checked = await readRadioState(checkedRadio);
      expect(checked.control).toEqual({
        boxShadow: "none",
        height: 24,
        width: 24,
      });
      expect(checked.indicator).toMatchObject({
        height: "7px",
        width: "7px",
        zIndex: "2",
      });
      expect(checked.indicator.backgroundColor).not.toBe(
        checked.ring.backgroundColor,
      );
      expect(Number(checked.indicator.zIndex)).toBeGreaterThan(
        Number(checked.ring.zIndex),
      );

      await checkedRadio.evaluate((element) =>
        element.setAttribute("aria-invalid", "true"),
      );
      const invalid = await readRadioState(checkedRadio);
      expect(invalid.ring.outlineColor).toBe(invalid.ring.borderColor);
      await checkedRadio.evaluate((element) =>
        element.removeAttribute("aria-invalid"),
      );
    });
  }
});

test("Radio Group keeps live selection isolated and makes validation recoverable", async ({
  page,
}) => {
  await openComponent(page, "radio-group");

  const preview = page
    .locator(
      ".a3s-preview[data-preview-component=radio-group][data-preview-integration=complete]",
    )
    .first();
  const liveGroup = preview.locator(".radio-group").first();
  const selectedOption = liveGroup.locator(
    'input[type="radio"][value="comfortable"]',
  );

  await expect(liveGroup).toHaveAttribute("role", "radiogroup");
  await expect(liveGroup).toHaveAccessibleName("View density");
  await expect(
    preview.getByRole("radiogroup", { name: "View density" }),
  ).toBeVisible();
  await expect(selectedOption).toBeChecked();
  await expect(
    liveGroup.locator('[role="group"], [role="radiogroup"]'),
  ).toHaveCount(0);

  const stateTrigger = preview.locator("[data-preview-control=states]");
  await stateTrigger.click();
  const matrix = page.locator(
    ".a3s-component-state-matrix[open][data-component=radio-group]",
  );
  await expect(matrix).toBeVisible();

  const ready = matrix.locator(
    "[data-state-specimen=ready] [data-state-specimen-root]",
  );
  const disabled = matrix.locator(
    "[data-state-specimen=disabled] [data-state-specimen-root]",
  );
  const invalid = matrix.locator(
    "[data-state-specimen=invalid] [data-state-specimen-root]",
  );
  await expect(
    ready.locator('input[type="radio"][value="comfortable"]'),
  ).toBeChecked();
  await expect(
    disabled.locator('input[type="radio"][value="comfortable"]'),
  ).toBeChecked();
  await expect(disabled.locator('input[type="radio"]:disabled')).toHaveCount(3);
  await expect(invalid.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(
    invalid.locator('input[type="radio"][required][aria-invalid="true"]'),
  ).toHaveCount(3);
  await expect(
    invalid.locator('[data-state-specimen-feedback][role="alert"]'),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(stateTrigger).toBeFocused();
  await expect(selectedOption).toBeChecked();

  const validationForm = page.locator(
    "form[data-radio-group-validation-demo=en]",
  );
  const validationGroup = validationForm.locator("fieldset");
  const validationError = validationForm.locator(
    "#notification-preference-error-en",
  );
  const validationOptions = validationForm.locator('input[type="radio"]');
  await expect(validationForm).toBeVisible();
  await expect(validationOptions).toHaveCount(3);
  await expect(
    validationForm.locator('input[type="radio"]:checked'),
  ).toHaveCount(0);
  await expect(validationGroup).not.toHaveAttribute("data-invalid", "");
  await expect(validationError).toBeHidden();

  await validationForm.locator("#notification-preference-submit-en").click();
  await expect(validationGroup).toHaveAttribute("data-invalid", "");
  await expect(
    validationForm.locator('input[type="radio"][aria-invalid="true"]'),
  ).toHaveCount(3);
  await expect(validationError).toBeVisible();
  await expect(validationForm.locator("#invalid-email")).toBeFocused();

  await validationForm.locator("#notification-preference-reset-en").click();
  await expect(
    validationForm.locator('input[type="radio"]:checked'),
  ).toHaveCount(0);
  await expect(validationGroup).not.toHaveAttribute("data-invalid", "");
  await expect(
    validationForm.locator('input[type="radio"][aria-invalid="true"]'),
  ).toHaveCount(0);
  await expect(validationError).toBeHidden();

  await validationForm.locator("#notification-preference-submit-en").click();
  await expect(validationGroup).toHaveAttribute("data-invalid", "");
  await expect(
    validationForm.locator('input[type="radio"][aria-invalid="true"]'),
  ).toHaveCount(3);
  await expect(validationError).toBeVisible();
  await expect(validationForm.locator("#invalid-email")).toBeFocused();

  await validationForm.locator("#invalid-email").check();
  await expect(validationGroup).not.toHaveAttribute("data-invalid", "");
  await expect(
    validationForm.locator('input[type="radio"][aria-invalid="true"]'),
  ).toHaveCount(0);
  await expect(validationError).toBeHidden();
  expect(
    await validationForm
      .locator("#invalid-email")
      .evaluate((element) => (element as HTMLInputElement).checkValidity()),
  ).toBe(true);

  await validationForm.locator("#notification-preference-reset-en").click();
  await expect(
    validationForm.locator('input[type="radio"]:checked'),
  ).toHaveCount(0);
  await expect(validationGroup).not.toHaveAttribute("data-invalid", "");
  await expect(validationError).toBeHidden();
});

test("Radio choice cards own one complete pointer and keyboard focus boundary", async ({
  page,
}) => {
  await openComponent(page, "radio-group");

  const choicePreview = page
    .locator(".a3s-preview")
    .filter({ has: page.locator("#plus-plan") });
  const cards = choicePreview.locator('.field[data-variant="choice-card"]');
  const proCard = cards.filter({ has: page.locator("#pro-plan") });
  const proOption = proCard.locator("#pro-plan");

  await expect(cards).toHaveCount(3);
  await expect(proCard).toBeVisible();
  await expect(proOption).toHaveAccessibleName("Pro");
  await expect(proOption).toHaveAccessibleDescription(
    "Adds team controls and a shared audit history.",
  );
  const resting = await proCard.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      borderRadius: style.borderRadius,
      borderStyle: style.borderStyle,
      borderWidth: style.borderWidth,
      paddingBlock: style.paddingBlock,
      paddingInline: style.paddingInline,
    };
  });
  expect(resting).toEqual({
    borderRadius: "8px",
    borderStyle: "solid",
    borderWidth: "1px",
    paddingBlock: "12px",
    paddingInline: "12px",
  });

  const proDescription = choicePreview.locator("#pro-plan-description");
  await proDescription.scrollIntoViewIfNeeded();
  const descriptionBounds = await proDescription.boundingBox();
  if (!descriptionBounds) throw new Error("Pro description is not rendered");
  await page.mouse.click(
    descriptionBounds.x + descriptionBounds.width / 2,
    descriptionBounds.y + descriptionBounds.height / 2,
  );
  await expect(proOption).toBeChecked();
  await expect(choicePreview.locator("#plus-plan")).not.toBeChecked();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(proOption).toBeFocused();
  const focused = await proCard.evaluate((element) => {
    const control = element.querySelector<HTMLInputElement>(
      'input[type="radio"]',
    )!;
    const card = getComputedStyle(element);
    const indicator = getComputedStyle(control, "::after");
    return {
      cardOutlineOffset: card.outlineOffset,
      cardOutlineStyle: card.outlineStyle,
      cardOutlineWidth: card.outlineWidth,
      controlOutlineStyle: indicator.outlineStyle,
    };
  });
  expect(focused).toEqual({
    cardOutlineOffset: "2px",
    cardOutlineStyle: "solid",
    cardOutlineWidth: "2px",
    controlOutlineStyle: "none",
  });

  const validFocusColor = await proCard.evaluate(
    (element) => getComputedStyle(element).outlineColor,
  );
  await proOption.evaluate((element) =>
    element.setAttribute("aria-invalid", "true"),
  );
  await expect
    .poll(() =>
      proCard.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.borderColor === style.outlineColor;
      }),
    )
    .toBe(true);
  const invalidFocus = await proCard.evaluate((element) => ({
    outlineColor: getComputedStyle(element).outlineColor,
  }));
  expect(invalidFocus.outlineColor).not.toBe(validFocusColor);
  await proOption.evaluate((element) =>
    element.removeAttribute("aria-invalid"),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await choicePreview
    .locator("#enterprise-plan-description")
    .evaluate((node) => {
      node.textContent =
        "Keeps organization-wide policies, delegated access, audit history, and recovery guidance understandable across a deliberately long localized label.";
    });
  const containment = await cards.evaluateAll((elements) =>
    elements.map((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })),
  );
  expect(
    containment.every(
      ({ clientWidth, scrollWidth }) => scrollWidth <= clientWidth,
    ),
  ).toBe(true);
});

test("Radio choice cards remain complete across every compatibility style pack", async ({
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
    <div class="radio-group" role="radiogroup" aria-label="Workspace plan">
      <div class="field" data-orientation="horizontal" data-variant="choice-card">
        <section>
          <label for="compat-plus">Plus</label>
          <p id="compat-plus-description">For individuals and small teams.</p>
        </section>
        <input class="input" id="compat-plus" name="compat-plan" type="radio" value="plus" aria-describedby="compat-plus-description" checked>
      </div>
      <div class="field" data-orientation="horizontal" data-variant="choice-card">
        <section>
          <label for="compat-pro">Pro</label>
          <p id="compat-pro-description">Adds team controls and a shared audit trail.</p>
        </section>
        <input class="input" id="compat-pro" name="compat-plan" type="radio" value="pro" aria-describedby="compat-pro-description">
      </div>
    </div>`;

  for (const stylePack of stylePacks) {
    await test.step(stylePack, async () => {
      await page.setContent(markup);
      await page.addStyleTag({
        path: new URL(`../dist/basecoat-${stylePack}.cdn.css`, import.meta.url)
          .pathname,
      });

      const group = page.locator(".radio-group");
      const plusCard = group.locator(".field").filter({
        has: page.locator("#compat-plus"),
      });
      const proCard = group.locator(".field").filter({
        has: page.locator("#compat-pro"),
      });
      const proOption = proCard.locator("#compat-pro");

      await expect(group).toHaveAccessibleName("Workspace plan");
      await expect(
        page.getByRole("radiogroup", { name: "Workspace plan" }),
      ).toBeVisible();
      await expect(proOption).toHaveAccessibleName("Pro");
      await expect(proOption).toHaveAccessibleDescription(
        "Adds team controls and a shared audit trail.",
      );

      const unselected = await proCard.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderWidth: Number.parseFloat(style.borderWidth),
          paddingBlock: Number.parseFloat(style.paddingBlockStart),
        };
      });
      expect(unselected.borderWidth).toBe(1);
      expect(unselected.paddingBlock).toBeGreaterThanOrEqual(8);

      const proDescription = proCard.locator("#compat-pro-description");
      await proDescription.scrollIntoViewIfNeeded();
      const descriptionBounds = await proDescription.boundingBox();
      if (!descriptionBounds) {
        throw new Error(`${stylePack} choice-card description is not rendered`);
      }
      await page.mouse.click(
        descriptionBounds.x + descriptionBounds.width / 2,
        descriptionBounds.y + descriptionBounds.height / 2,
      );
      await expect(proOption).toBeChecked();
      await expect(plusCard.locator("#compat-plus")).not.toBeChecked();
      const selected = await proCard.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
        };
      });
      expect(
        selected.backgroundColor !== unselected.backgroundColor ||
          selected.borderColor !== unselected.borderColor,
      ).toBe(true);

      const restingCardShadow = await proCard.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      );
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(proOption).toBeFocused();
      const focused = await proCard.evaluate((element) => {
        const option = element.querySelector<HTMLInputElement>(
          'input[type="radio"]',
        )!;
        const card = getComputedStyle(element);
        return {
          cardBoxShadow: card.boxShadow,
          cardOutlineStyle: card.outlineStyle,
          cardOutlineWidth: Number.parseFloat(card.outlineWidth),
          inputBoxShadow: getComputedStyle(option).boxShadow,
          inputOutlineStyle: getComputedStyle(option).outlineStyle,
        };
      });
      expect(
        (focused.cardOutlineStyle !== "none" &&
          focused.cardOutlineWidth >= 1) ||
          focused.cardBoxShadow !== restingCardShadow,
      ).toBe(true);
      const inputShadowLengths =
        focused.inputBoxShadow.match(/-?\d+(?:\.\d+)?px/gu);
      expect(
        (inputShadowLengths ?? []).every(
          (length) => Number.parseFloat(length) === 0,
        ),
      ).toBe(true);
      expect(focused.inputOutlineStyle).toBe("none");

      await proOption.evaluate((element) => {
        element.setAttribute("aria-invalid", "true");
      });
      const invalidBorder = await proCard.evaluate(
        (element) => getComputedStyle(element).borderColor,
      );
      expect(invalidBorder).not.toBe(selected.borderColor);

      await proOption.evaluate((element) => {
        element.removeAttribute("aria-invalid");
        element.disabled = true;
      });
      const disabled = await proCard.evaluate((element) => {
        const option = element.querySelector<HTMLInputElement>(
          'input[type="radio"]',
        )!;
        return {
          cardCursor: getComputedStyle(element).cursor,
          cardOpacity: Number.parseFloat(getComputedStyle(element).opacity),
          inputOpacity: Number.parseFloat(getComputedStyle(option).opacity),
        };
      });
      expect(disabled).toEqual({
        cardCursor: "not-allowed",
        cardOpacity: 0.5,
        inputOpacity: 1,
      });
    });
  }
});

test("Button Group leaves one focus boundary on the owning action", async ({
  page,
}) => {
  await openComponent(page, "button-group");

  const preview = page
    .locator(
      ".a3s-preview[data-preview-component=button-group][data-preview-integration=complete]",
    )
    .first();
  const group = preview.getByRole("group", {
    name: "Message actions",
    exact: true,
  });
  const button = group.getByRole("button", { name: "Archive", exact: true });
  const neighbor = group.getByRole("button", { name: "Snooze", exact: true });
  const readFocusState = () =>
    group.evaluate((element) => {
      const button = element.querySelector<HTMLButtonElement>("button")!;
      const groupStyle = getComputedStyle(element);
      const buttonStyle = getComputedStyle(button);

      return {
        buttonBorderColor: buttonStyle.borderColor,
        buttonOutlineOffset: buttonStyle.outlineOffset,
        buttonOutlineStyle: buttonStyle.outlineStyle,
        buttonOutlineWidth: buttonStyle.outlineWidth,
        buttonShadow: buttonStyle.boxShadow,
        groupOutlineStyle: groupStyle.outlineStyle,
        groupShadow: groupStyle.boxShadow,
      };
    });

  for (const theme of ["light", "dark"] as const) {
    await test.step(theme, async () => {
      await page.evaluate((value) => window.a3sUI.theme.set(value), theme);
      await settleElementAnimations(button);

      const restingBorderColor = await button.evaluate(
        (element) => getComputedStyle(element).borderColor,
      );
      await button.focus();
      await settleElementAnimations(button);
      await expect(button).toBeFocused();
      const focusedButton = await readFocusState();
      expect(focusedButton.buttonBorderColor).toBe(restingBorderColor);
      expect(focusedButton.buttonOutlineStyle).toBe("solid");
      expect(focusedButton.buttonOutlineWidth).toBe("2px");
      expect(focusedButton.buttonOutlineOffset).toBe("2px");
      expectNoOuterRing(focusedButton.buttonShadow);
      expect(focusedButton.groupShadow).toBe("none");
      expect(focusedButton.groupOutlineStyle).toBe("none");

      const seam = await button.evaluate(
        (left, right) => {
          const leftBounds = left.getBoundingClientRect();
          const rightBounds = right.getBoundingClientRect();
          return {
            gap: rightBounds.left - leftBounds.right,
            heightDelta: Math.abs(leftBounds.height - rightBounds.height),
          };
        },
        await neighbor.elementHandle(),
      );
      expect(seam.gap).toBeCloseTo(0, 1);
      expect(seam.heightDelta).toBeLessThanOrEqual(1);
    });
  }
});

test("Search Input Group owns one restrained neutral focus boundary", async ({
  page,
}) => {
  await openComponent(page, "input-group");

  const group = page
    .locator(".a3s-preview[data-preview-component=input-group] .input-group")
    .first();
  const input = group.locator("input");
  await expect(input).toHaveAttribute("type", "search");

  const readBoundaries = () =>
    group.evaluate((element) => {
      const control = element.querySelector<HTMLInputElement>("input")!;
      const groupStyle = getComputedStyle(element);
      const style = getComputedStyle(control);
      return {
        control: {
          background: style.backgroundColor,
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
          outlineStyle: style.outlineStyle,
          radius: style.borderRadius,
        },
        group: {
          borderColor: groupStyle.borderColor,
          borderWidth: groupStyle.borderWidth,
          boxShadow: groupStyle.boxShadow,
          outlineStyle: groupStyle.outlineStyle,
        },
      };
    });

  for (const theme of ["light", "dark"] as const) {
    await test.step(theme, async () => {
      await page.evaluate((value) => window.a3sUI.theme.set(value), theme);
      await input.evaluate((element) => element.classList.remove("input"));
      await input.focus();
      await expect(input).toBeFocused();
      const focusedBorderColor =
        theme === "light" ? "rgb(200, 200, 200)" : "rgb(74, 74, 78)";
      await expect(group).toHaveCSS("border-color", focusedBorderColor);
      const nativeBoundary = await readBoundaries();

      await input.evaluate((element) => element.classList.add("input"));
      const classedBoundary = await readBoundaries();
      await input.evaluate((element) =>
        element.setAttribute("aria-invalid", "true"),
      );
      const invalidBoundary = await readBoundaries();

      expect(nativeBoundary.group).toEqual({
        borderColor: focusedBorderColor,
        borderWidth: "1px",
        boxShadow: "none",
        outlineStyle: "none",
      });
      expect(nativeBoundary.control).toEqual({
        background: "rgba(0, 0, 0, 0)",
        borderWidth: "0px",
        boxShadow: "none",
        outlineStyle: "none",
        radius: "0px",
      });
      expect(classedBoundary).toEqual(nativeBoundary);
      expect(invalidBoundary.control).toEqual(nativeBoundary.control);
      expect(invalidBoundary.group.borderColor).not.toBe(
        nativeBoundary.group.borderColor,
      );
      await input.evaluate((element) =>
        element.removeAttribute("aria-invalid"),
      );
    });
  }
});
