import { expect, test, type Page } from "@playwright/test";

async function openInput(page: Page, locale: "en" | "zh" = "en") {
  const localePath =
    locale === "zh" ? "components/input.html" : "en/components/input.html";
  await page.goto(localePath, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
}

function expectNoOuterRing(boxShadow: string) {
  expect(boxShadow).not.toMatch(
    /0px 0px 0px (?:1px|2px|3px)(?![^,]*\binset\b)/u,
  );
}

function primaryPreview(page: Page) {
  return page
    .locator(
      ".a3s-preview[data-preview-component=input][data-preview-integration=complete]",
    )
    .first();
}

test("Input exposes one persistent label, useful input hints, and native events", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await openInput(page);

  const preview = primaryPreview(page);
  const input = preview.locator("#input-notification-email-en");
  const currentValue = preview.locator("[data-input-current-value]");
  await expect(preview.locator(".field")).toHaveCount(1);
  await expect(
    preview.locator('label[for="input-notification-email-en"]'),
  ).toHaveText("Notification email");
  await expect(input).toHaveAccessibleName("Notification email");
  await expect(input).toHaveAccessibleDescription(
    "Used for release notices and account recovery.",
  );
  await expect(input).toHaveAttribute("name", "notificationEmail");
  await expect(input).toHaveAttribute("autocomplete", "email");
  await expect(input).toHaveAttribute("inputmode", "email");
  await expect(input).toHaveAttribute("enterkeyhint", "next");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "input-notification-email-help-en",
  );
  await expect(currentValue).toHaveCSS("font-size", "13px");
  await expect(currentValue).toHaveCSS("overflow-wrap", "anywhere");

  await input.evaluate((element) => {
    const control = element as HTMLInputElement & { __events?: string[] };
    control.__events = [];
    control.addEventListener("input", () => control.__events?.push("input"));
    control.addEventListener("change", () => control.__events?.push("change"));
  });
  await input.fill("tester@example.test");
  await input.blur();
  await expect(input).toHaveValue("tester@example.test");
  await expect
    .poll(() =>
      input.evaluate(
        (element) =>
          (element as HTMLInputElement & { __events?: string[] }).__events,
      ),
    )
    .toEqual(["input", "change"]);
  expect(consoleErrors).toEqual([]);
});

test("Input validation names the problem, focuses recovery, and clears stale errors", async ({
  page,
}) => {
  await openInput(page);

  const form = page.locator("form[data-input-validation-demo=en]");
  const input = form.locator("#input-validation-email-en");
  const field = form.locator(".field");
  const error = form.locator("#input-validation-email-error-en");
  const submit = form.getByRole("button", { name: "Save address" });

  await expect(input).toHaveAccessibleName("Workspace owner email");
  await expect(input).toHaveAttribute("required", "");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "input-validation-email-hint-en",
  );
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(error).toBeHidden();

  await submit.click();
  await expect(input).toBeFocused();
  await expect(field).toHaveAttribute("data-invalid", "true");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "input-validation-email-hint-en input-validation-email-error-en",
  );
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("role", "alert");
  await expect(error).toHaveText(
    "Enter a complete email address, such as owner@example.com.",
  );

  await input.fill("owner@example.com");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "input-validation-email-hint-en",
  );
  await expect(error).toBeHidden();
  expect(await input.evaluate((element) => element.checkValidity())).toBe(true);

  await input.fill("owner@");
  await submit.click();
  await expect(input).toBeFocused();
  await expect(error).toBeVisible();
  expect(await input.evaluate((element) => element.checkValidity())).toBe(
    false,
  );

  await form.getByRole("button", { name: "Reset" }).click();
  await expect(input).toHaveValue("");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(error).toBeHidden();
});

test("Input defers authored validation while an IME composition is active", async ({
  page,
}) => {
  await openInput(page);

  const form = page.locator("form[data-input-validation-demo=en]");
  const input = form.locator("#input-validation-email-en");
  const field = form.locator(".field");
  const error = form.locator("#input-validation-email-error-en");

  await form.getByRole("button", { name: "Save address" }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(error).toBeVisible();

  await input.evaluate((element) => {
    const control = element as HTMLInputElement;
    control.dispatchEvent(
      new CompositionEvent("compositionstart", {
        bubbles: true,
        data: "owner@example.com",
      }),
    );
    control.value = "owner@example.com";
    const composingInput = new InputEvent("input", {
      bubbles: true,
      data: "owner@example.com",
      inputType: "insertCompositionText",
    });
    Object.defineProperty(composingInput, "isComposing", { value: true });
    control.dispatchEvent(composingInput);
  });

  await expect(input).toHaveValue("owner@example.com");
  await expect(field).toHaveAttribute("data-invalid", "true");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(error).toBeVisible();

  await input.evaluate((element) => {
    const control = element as HTMLInputElement;
    control.dispatchEvent(
      new CompositionEvent("compositionend", {
        bubbles: true,
        data: "owner@example.com",
      }),
    );
    control.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: "owner@example.com",
        inputType: "insertText",
      }),
    );
  });

  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "input-validation-email-hint-en",
  );
  await expect(error).toBeHidden();
});

test("Input state acceptance preserves value, semantics, reasons, and recovery", async ({
  page,
}) => {
  await openInput(page);

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
    name: "Input state acceptance",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-state-specimen]")).toHaveCount(5);

  const empty = dialog.locator("[data-state-specimen=empty]");
  const ready = dialog.locator("[data-state-specimen=ready]");
  const disabled = dialog.locator("[data-state-specimen=disabled]");
  const invalid = dialog.locator("[data-state-specimen=invalid]");
  const readonly = dialog.locator("[data-state-specimen=readonly]");

  await expect(empty.locator("input.input")).toHaveValue("");
  await expect(empty.locator("[data-state-specimen-feedback]")).toContainText(
    "No notification address has been entered",
  );
  await expect(ready.locator("input.input")).toHaveValue("alex@example.com");
  await expect(ready.locator("input.input")).toHaveAccessibleName(
    "Notification email",
  );
  await expect(disabled.locator("input.input")).toBeDisabled();
  await expect(disabled.locator("input.input")).toHaveValue(
    "archived@example.com",
  );
  await expect(
    disabled.locator("[data-state-specimen-feedback]"),
  ).toContainText("workspace policy");
  await expect(invalid.locator("input.input")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(invalid.locator("input.input")).toHaveAttribute("required", "");
  await expect(invalid.locator("input.input")).toHaveValue("owner@");
  await expect(invalid.locator("[data-state-specimen-mount]")).toHaveAttribute(
    "dir",
    "rtl",
  );
  await expect(invalid.locator("[data-state-specimen-mount]")).toHaveAttribute(
    "data-a3s-theme",
    "dark",
  );
  await expect(
    invalid.locator(".a3s-component-state-matrix__field-specimen"),
  ).toHaveCSS("direction", "rtl");
  await expect(invalid.locator("input.input")).toHaveCSS("direction", "ltr");
  await expect(invalid.getByRole("alert")).toContainText(
    "Enter a complete email address",
  );
  expect(
    await invalid
      .locator("input.input")
      .evaluate((element) => element.checkValidity()),
  ).toBe(false);
  await expect(readonly.locator("input.input")).toHaveAttribute("readonly", "");
  await expect(readonly.locator("input.input")).toHaveValue(
    "account-owner@example.com",
  );
  await expect(
    readonly.locator("[data-state-specimen-feedback]"),
  ).toContainText("selectable and included in form submission");

  const relationships = await dialog
    .locator(".a3s-component-state-matrix__field-specimen")
    .evaluateAll((fields) =>
      fields.map((field) => {
        const input = field.querySelector<HTMLInputElement>("input.input");
        const label = input
          ? field.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)
          : null;
        const describedIds = (input?.getAttribute("aria-describedby") ?? "")
          .split(/\s+/u)
          .filter(Boolean);
        return {
          describedIds,
          descriptionsResolve: describedIds.every((id) =>
            Boolean(field.querySelector(`#${CSS.escape(id)}`)),
          ),
          inputId: input?.id ?? "",
          labelFor: label?.htmlFor ?? "",
        };
      }),
    );
  expect(relationships).toHaveLength(5);
  expect(
    relationships.every(
      ({ describedIds, descriptionsResolve, inputId, labelFor }) =>
        inputId.length > 0 &&
        labelFor === inputId &&
        describedIds.length > 0 &&
        descriptionsResolve,
    ),
  ).toBe(true);

  const stateRegion = dialog.getByRole("region", {
    name: "Component state specimens",
  });
  await expect(stateRegion).toHaveAttribute("tabindex", "0");

  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("Input state acceptance stays keyboard-scrollable in a short viewport", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1280");
  await page.setViewportSize({ height: 600, width: 390 });
  await openInput(page);

  const preview = primaryPreview(page);
  const trigger = preview.getByRole("button", {
    name: "View state acceptance matrix",
  });
  await trigger.click();

  const stateRegion = page.getByRole("region", {
    name: "Component state specimens",
  });
  await stateRegion.focus();
  const metrics = await stateRegion.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    scrollTop: element.scrollTop,
  }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  await page.keyboard.press("End");
  await expect
    .poll(() => stateRegion.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(metrics.scrollTop);

  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("Input integrates truthful HTML, React, and Vue examples and stays localized", async ({
  page,
}) => {
  await openInput(page);

  const preview = primaryPreview(page);
  await preview.getByRole("button", { name: "Show integration code" }).click();
  const integration = preview.locator("[data-component-integration=input]");
  await expect(integration).toContainText("input-notification-email-en");
  await expect(integration).toContainText('autocomplete="email"');
  await expect(integration).toContainText('inputmode="email"');
  await expect(integration).toContainText('enterkeyhint="next"');

  await integration.getByRole("tab", { name: "React" }).click();
  await expect(integration).toContainText("useInput");
  await expect(integration).toContainText("useState");
  await expect(integration).toContainText("events");
  await expect(integration).toContainText("HTMLInputElement");
  await expect(integration).toContainText("htmlFor");
  await expect(integration).toContainText('inputMode="email"');
  await expect(integration).toContainText('enterKeyHint="next"');

  await integration.getByRole("tab", { name: "Vue" }).click();
  await expect(integration).toContainText("useInput");
  await expect(integration).toContainText("componentRef");
  await expect(integration).toContainText('ref("")');
  await expect(integration).toContainText("HTMLInputElement");
  await expect(integration).toContainText('inputmode="email"');
  await expect(integration).toContainText('enterkeyhint="next"');

  await openInput(page, "zh");
  const zhPreview = primaryPreview(page);
  const zhInput = zhPreview.locator("#input-notification-email-zh");
  await expect(zhInput).toHaveAccessibleName("通知邮箱");
  await expect(zhInput).toHaveAccessibleDescription(
    "用于接收发布通知和恢复账户。",
  );
  await expect(
    page.getByRole("heading", { name: "表单校验与恢复" }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Email Recommended");
  await expect(page.locator("main")).not.toContainText("Username");
  await expect(page.locator("main")).not.toContainText("Submit");
});

test("Input survives coarse pointers, long values, reduced motion, and form availability semantics", async ({
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
    await openInput(page);
    const input = primaryPreview(page).locator("#input-notification-email-en");
    await input.fill(
      "a-very-long-notification-address-that-must-remain-contained@example.test",
    );
    await input.focus();

    const geometry = await input.evaluate((element) => {
      const input = element as HTMLInputElement;
      const inputBounds = input.getBoundingClientRect();
      const canvas = input.closest<HTMLElement>(".a3s-preview__canvas");
      if (!canvas) throw new Error("Input preview canvas is missing");
      const canvasBounds = canvas.getBoundingClientRect();
      const style = getComputedStyle(input);
      return {
        boxShadow: style.boxShadow,
        controlInsideCanvas:
          inputBounds.left >= canvasBounds.left &&
          inputBounds.right <= canvasBounds.right,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        fontSize: Number.parseFloat(style.fontSize),
        height: inputBounds.height,
        outlineStyle: style.outlineStyle,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        transitionDuration: style.transitionDuration,
      };
    });
    expect(geometry.controlInsideCanvas).toBe(true);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
      geometry.documentClientWidth + 1,
    );
    expect(geometry.height).toBeGreaterThanOrEqual(44);
    expect(geometry.fontSize).toBeGreaterThanOrEqual(16);
    expect(geometry.reducedMotion).toBe(true);
    expect(Number.parseFloat(geometry.transitionDuration)).toBeLessThanOrEqual(
      0.001,
    );
    expect(geometry.outlineStyle).toBe("none");
    expect(geometry.boxShadow).toContain("inset");

    const availability = page.locator("form[data-input-availability=en]");
    const disabled = availability.locator("#input-disabled-en");
    const readonly = availability.locator("#input-readonly-en");
    await expect(disabled).toBeDisabled();
    await expect(disabled).toHaveValue("policy-managed@example.com");
    await expect(readonly).toHaveAttribute("readonly", "");
    await expect(readonly).not.toBeDisabled();
    await expect(readonly).toHaveValue("release-owner@example.com");
    const availabilityState = await availability.evaluate((form) => ({
      disabledOpacity: getComputedStyle(
        form.querySelector<HTMLInputElement>("#input-disabled-en")!,
      ).opacity,
      submitted: Object.fromEntries(new FormData(form as HTMLFormElement)),
    }));
    expect(availabilityState.disabledOpacity).toBe("1");
    expect(availabilityState.submitted).toEqual({
      releaseOwner: "release-owner@example.com",
    });
  } finally {
    await context.close();
  }
});

test("Input exposes a system focus boundary in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openInput(page);

  const input = primaryPreview(page).locator("#input-notification-email-en");
  await input.focus();
  const focus = await input.evaluate((element) => {
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

test("Input keeps one continuous focus boundary across compatibility style packs", async ({
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
    <div class="field" dir="rtl">
      <label for="compat-input">Notification email</label>
      <input id="compat-input" class="input" type="email" value="owner@example.com" aria-describedby="compat-input-help">
      <p id="compat-input-help">Used for release notices.</p>
    </div>`;

  for (const stylePack of stylePacks) {
    await test.step(stylePack, async () => {
      await page.setContent(markup);
      await page.addStyleTag({
        path: new URL(`../dist/basecoat-${stylePack}.cdn.css`, import.meta.url)
          .pathname,
      });

      const input = page.locator("#compat-input");
      await expect(input).toHaveAccessibleName("Notification email");
      await expect(input).toHaveAccessibleDescription(
        "Used for release notices.",
      );
      await input.focus();
      const focus = await input.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          borderWidth: style.borderWidth,
          boxShadow: style.boxShadow,
          direction: style.direction,
          outlineStyle: style.outlineStyle,
        };
      });
      expect(focus.borderWidth).toBe("1px");
      expect(focus.direction).toBe("ltr");
      expect(focus.outlineStyle).toBe("none");
      expect(focus.boxShadow).toContain("inset");
      expectNoOuterRing(focus.boxShadow);

      await input.blur();
      await input.evaluate((element) =>
        element.setAttribute("aria-invalid", "true"),
      );
      const invalidRestingShadow = await input.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      );
      expectNoOuterRing(invalidRestingShadow);
      await input.focus();
      const invalidFocusShadow = await input.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      );
      expect(invalidFocusShadow).toContain("inset");
      expectNoOuterRing(invalidFocusShadow);
    });
  }
});
