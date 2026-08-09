import { expect, test, type Locator, type Page } from "@playwright/test";

async function openComponent(page: Page, component: string) {
  await page.goto(`en/components/${component}.html`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
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

test("MDX form previews preserve mutable native checked state", async ({
  page,
}) => {
  await openComponent(page, "checkbox");
  const checkedCheckbox = page.locator("#terms-checkbox-2");
  await expect(checkedCheckbox).toBeChecked();
  await checkedCheckbox.uncheck();
  await expect(checkedCheckbox).not.toBeChecked();
  await checkedCheckbox.check();
  await expect(checkedCheckbox).toBeChecked();

  await openComponent(page, "radio-group");
  const defaultRadio = page.locator("#r1");
  const comfortableRadio = page.locator("#r2");
  await expect(comfortableRadio).toBeChecked();
  await defaultRadio.check();
  await expect(defaultRadio).toBeChecked();
  await expect(comfortableRadio).not.toBeChecked();
  await comfortableRadio.check();
  await expect(comfortableRadio).toBeChecked();

  const labelGeometry = await page.locator('label[for="r1"]').evaluate(
    (label) => {
      const labelRect = label.getBoundingClientRect();
      const inputRect = document
        .getElementById("r1")!
        .getBoundingClientRect();
      const style = getComputedStyle(label);
      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        gap: labelRect.left - inputRect.right,
        minHeight: style.minHeight,
      };
    },
  );
  expect(labelGeometry).toEqual({
    fontSize: "12px",
    fontWeight: "600",
    gap: 6,
    minHeight: "24px",
  });

  await openComponent(page, "field");
  const fieldCheckbox = page.locator("#checkout-same-as-shipping");
  await expect(fieldCheckbox).toBeChecked();
  await fieldCheckbox.uncheck();
  await expect(fieldCheckbox).not.toBeChecked();

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

test("Button Group presents one focus boundary for composite inputs", async ({
  page,
}) => {
  await openComponent(page, "button-group");

  const group = page.getByRole("group", { name: "Search", exact: true });
  const input = group.getByRole("textbox", { name: "Search messages" });
  const button = group.getByRole("button", { name: "Search", exact: true });
  const readFocusState = () =>
    group.evaluate((element) => {
      const input = element.querySelector<HTMLInputElement>("input")!;
      const button = element.querySelector<HTMLButtonElement>("button")!;
      const groupStyle = getComputedStyle(element);
      const inputStyle = getComputedStyle(input);
      const buttonStyle = getComputedStyle(button);
      const hasVisibleShadow = (shadow: string) =>
        Array.from(shadow.matchAll(/(-?\d+(?:\.\d+)?)px/g), (match) =>
          Number(match[1]),
        ).some((value) => Math.abs(value) > 0);

      return {
        buttonShadow: buttonStyle.boxShadow,
        groupHasVisibleShadow: hasVisibleShadow(groupStyle.boxShadow),
        groupShadow: groupStyle.boxShadow,
        inputEndRadius: inputStyle.borderEndEndRadius,
        inputShadow: inputStyle.boxShadow,
      };
    });

  for (const theme of ["light", "dark"] as const) {
    await test.step(theme, async () => {
      await page.evaluate((value) => window.a3sUI.theme.set(value), theme);

      await input.focus();
      await expect(input).toBeFocused();
      const focusedInput = await readFocusState();
      expect(focusedInput.groupHasVisibleShadow).toBe(true);
      expect(focusedInput.inputEndRadius).toBe("0px");
      expect(focusedInput.inputShadow).toBe("none");

      await input.evaluate((element) =>
        element.setAttribute("aria-invalid", "true"),
      );
      const invalidInput = await readFocusState();
      expect(invalidInput.groupHasVisibleShadow).toBe(true);
      expect(invalidInput.groupShadow).not.toBe(focusedInput.groupShadow);
      expect(invalidInput.inputShadow).toBe("none");
      await input.evaluate((element) =>
        element.removeAttribute("aria-invalid"),
      );

      await button.focus();
      await expect(button).toBeFocused();
      const focusedButton = await readFocusState();
      expect(focusedButton.buttonShadow).toBe("none");
      expect(focusedButton.groupHasVisibleShadow).toBe(true);
    });
  }
});

test("Input Group owns focus when its child keeps a standalone control class", async ({
  page,
}) => {
  await openComponent(page, "input-group");

  const group = page
    .locator(".a3s-preview[data-preview-component=input-group] .input-group")
    .first();
  const input = group.locator("input");
  const readControlBoundary = () =>
    input.evaluate((control) => {
      const style = getComputedStyle(control);
      return {
        background: style.backgroundColor,
        borderWidth: style.borderWidth,
        hasVisibleShadow: Array.from(
          style.boxShadow.matchAll(/(-?\d+(?:\.\d+)?)px/g),
          (match) => Number(match[1]),
        ).some((value) => Math.abs(value) > 0),
        outlineStyle: style.outlineStyle,
        radius: style.borderRadius,
      };
    });

  for (const theme of ["light", "dark"] as const) {
    await test.step(theme, async () => {
      await page.evaluate((value) => window.a3sUI.theme.set(value), theme);
      await input.evaluate((element) => element.classList.remove("input"));
      await input.focus();
      await expect(input).toBeFocused();
      const nativeBoundary = await readControlBoundary();

      await input.evaluate((element) => element.classList.add("input"));
      const classedBoundary = await readControlBoundary();
      await input.evaluate((element) =>
        element.setAttribute("aria-invalid", "true"),
      );
      const invalidBoundary = await readControlBoundary();
      const focusState = await group.evaluate((element) => {
        const control = element.querySelector<HTMLInputElement>("input")!;
        const groupShadow = getComputedStyle(element).boxShadow;
        return {
          groupHasVisibleShadow: Array.from(
            groupShadow.matchAll(/(-?\d+(?:\.\d+)?)px/g),
            (match) => Number(match[1]),
          ).some((value) => Math.abs(value) > 0),
          inputIsFocusVisible: control.matches(":focus-visible"),
        };
      });

      expect(focusState.inputIsFocusVisible).toBe(true);
      expect(focusState.groupHasVisibleShadow).toBe(true);
      expect(nativeBoundary.background).toBe("rgba(0, 0, 0, 0)");
      expect(nativeBoundary.borderWidth).toBe("0px");
      expect(nativeBoundary.hasVisibleShadow).toBe(false);
      expect(nativeBoundary.radius).toBe("0px");
      expect(nativeBoundary.outlineStyle).toBe("none");
      expect(classedBoundary).toEqual(nativeBoundary);
      expect(invalidBoundary).toEqual(nativeBoundary);
      await input.evaluate((element) =>
        element.removeAttribute("aria-invalid"),
      );
    });
  }
});
