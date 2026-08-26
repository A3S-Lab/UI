import { expect, test, type Page } from "@playwright/test";

async function openInputGroup(page: Page, locale: "en" | "zh" = "en") {
  const localePath =
    locale === "zh"
      ? "components/input-group.html"
      : "en/components/input-group.html";
  await page.goto(localePath, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

function primaryPreview(page: Page) {
  return page
    .locator(
      ".a3s-preview[data-preview-component=input-group][data-preview-integration=complete]",
    )
    .first();
}

function expectNoOuterRing(boxShadow: string) {
  expect(boxShadow).not.toMatch(
    /0px 0px 0px (?:1px|2px|3px)(?![^,]*\binset\b)/u,
  );
}

test("Input Group keeps one named control, native events, and inert-addon focus forwarding", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await openInputGroup(page);

  const preview = primaryPreview(page);
  const field = preview.locator(".field");
  const group = field.locator(".input-group");
  const input = group.locator("#input-group-project-search-en");
  const prefix = group.locator('[data-align="inline-start"]');
  const status = group.locator("#input-group-project-search-status-en");

  await expect(field).toHaveCount(1);
  await expect(group).toHaveCount(1);
  await expect(group.locator(":scope > input")).toHaveCount(1);
  await expect(group).not.toHaveAttribute("role", "group");
  await expect(input).toHaveAccessibleName("Search projects");
  await expect(input).toHaveAccessibleDescription(
    "Search by project name or repository path.",
  );
  await expect(input).toHaveAttribute("type", "search");
  await expect(input).toHaveAttribute("name", "projectQuery");
  await expect(input).toHaveAttribute("autocomplete", "off");
  await expect(group).toHaveAttribute("data-input-group-initialized", "true");

  await input.evaluate((element) => {
    const control = element as HTMLInputElement & { __events?: string[] };
    control.__events = [];
    control.addEventListener("input", () => control.__events?.push("input"));
    control.addEventListener("change", () => control.__events?.push("change"));
  });
  await input.fill("runtime");
  await input.blur();
  await expect(input).toHaveValue("runtime");
  await expect(status).toHaveText("8 matching projects");
  await expect
    .poll(() =>
      input.evaluate(
        (element) =>
          (element as HTMLInputElement & { __events?: string[] }).__events,
      ),
    )
    .toEqual(["input", "change"]);

  await prefix.click();
  await expect(input).toBeFocused();
  await input.blur();
  await status.click();
  await expect(input).toBeFocused();

  await input.blur();
  await group.evaluate((element) => {
    const label = document.createElement("label");
    label.dataset.inputGroupNestedLabel = "";
    label.dataset.align = "inline-end";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "input-group-nested-label-checkbox";
    label.htmlFor = checkbox.id;
    label.append(checkbox, " Include archived");
    element.append(label);
  });
  const nestedLabel = group.locator("[data-input-group-nested-label]");
  const nestedCheckbox = nestedLabel.locator("input[type=checkbox]");
  await nestedLabel.click();
  await expect(nestedCheckbox).toBeChecked();
  await expect(input).not.toBeFocused();
  await nestedLabel.evaluate((element) => element.remove());

  await status.evaluate((element) => {
    element.style.userSelect = "text";
  });
  await status.selectText();
  await status.dispatchEvent("click");
  await expect(input).not.toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(() => ({
        collapsed: window.getSelection()?.isCollapsed ?? true,
        text: window.getSelection()?.toString() ?? "",
        type: window.getSelection()?.type ?? "None",
      })),
    )
    .toEqual({
      collapsed: false,
      text: "8 matching projects",
      type: "Range",
    });
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await status.evaluate((element) => {
    element.style.removeProperty("user-select");
  });
  expect(consoleErrors).toEqual([]);

  const restingBoundary = await group.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderColor: style.borderColor, boxShadow: style.boxShadow };
  });
  await expect(preview).toHaveScreenshot("input-group-primary.png");
  await input.focus();
  const focusedBoundary = await group.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderColor: style.borderColor, boxShadow: style.boxShadow };
  });
  expect(focusedBoundary.borderColor).not.toBe(restingBoundary.borderColor);
  expect(focusedBoundary.boxShadow).not.toBe(restingBoundary.boxShadow);
  expectNoOuterRing(focusedBoundary.boxShadow);
  await expect(preview).toHaveScreenshot("input-group-primary-focused.png");
});

test("Input Group does not redirect interactive addon actions", async ({
  page,
}) => {
  await openInputGroup(page);

  const actionPreview = page
    .locator(".a3s-preview")
    .filter({ has: page.locator("#input-group-repository-url-en") });
  const input = actionPreview.locator("#input-group-repository-url-en");
  const action = actionPreview.getByRole("button", {
    name: "Copy repository URL",
  });
  const feedback = actionPreview.locator("#input-group-copy-status-en");

  await action.click();
  await expect(action).toBeFocused();
  await expect(input).not.toBeFocused();
  await expect(feedback).toHaveText("Copy requested");
  await expect(action).toHaveAccessibleName("Copy repository URL");
});

test("Input Group validation preserves the value, focuses recovery, defers IME work, and resets cleanly", async ({
  page,
}) => {
  await openInputGroup(page);

  const form = page.locator("form[data-input-group-validation-demo=en]");
  const field = form.locator(".field");
  const group = form.locator(".input-group");
  const input = form.locator("#input-group-validation-en");
  const error = form.locator("#input-group-validation-error-en");
  const submit = form.getByRole("button", { name: "Save address" });

  await expect(input).toHaveAccessibleName("Workspace address");
  await expect(input).toHaveAttribute("required", "");
  await expect(input).toHaveAttribute("minlength", "3");
  await expect(input).toHaveAttribute("maxlength", "24");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(error).toBeHidden();

  await submit.click();
  await expect(input).toBeFocused();
  await expect(field).toHaveAttribute("data-invalid", "true");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "input-group-validation-help-en input-group-validation-error-en",
  );
  await expect(error).toBeVisible();
  await expect(error).toHaveAttribute("role", "alert");
  await expect(error).toHaveText(
    "Use 3 to 24 lowercase letters, numbers, or hyphens.",
  );

  await input.evaluate((element) => {
    const control = element as HTMLInputElement;
    control.dispatchEvent(
      new CompositionEvent("compositionstart", {
        bubbles: true,
        data: "runtime-lab",
      }),
    );
    control.value = "runtime-lab";
    const composingInput = new InputEvent("input", {
      bubbles: true,
      data: "runtime-lab",
      inputType: "insertCompositionText",
    });
    Object.defineProperty(composingInput, "isComposing", { value: true });
    control.dispatchEvent(composingInput);
  });
  await expect(field).toHaveAttribute("data-invalid", "true");
  await expect(group).toHaveCSS("border-style", "solid");
  await expect(error).toBeVisible();

  await input.evaluate((element) => {
    const control = element as HTMLInputElement;
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
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "input-group-validation-help-en",
  );
  await expect(error).toBeHidden();

  await input.fill("Runtime Lab");
  await submit.click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Runtime Lab");
  await expect(error).toBeVisible();
  expect(await input.evaluate((element) => element.checkValidity())).toBe(
    false,
  );

  await form.getByRole("button", { name: "Reset" }).click();
  await expect(input).toHaveValue("");
  await expect(field).not.toHaveAttribute("data-invalid", "true");
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAttribute(
    "aria-describedby",
    "input-group-validation-help-en",
  );
  await expect(error).toBeHidden();
});

test("Input Group state acceptance exposes six truthful independent states", async ({
  page,
}) => {
  await openInputGroup(page);

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
    name: "Input Group state acceptance",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-state-specimen]")).toHaveCount(6);

  const empty = dialog.locator("[data-state-specimen=empty]");
  const ready = dialog.locator("[data-state-specimen=ready]");
  const invalid = dialog.locator("[data-state-specimen=invalid]");
  const loading = dialog.locator("[data-state-specimen=loading]");
  const disabled = dialog.locator("[data-state-specimen=disabled]");
  const readonly = dialog.locator("[data-state-specimen=readonly]");

  await expect(empty.locator(".input-group > input")).toHaveValue("");
  await expect(empty.locator("[data-input-group-status]")).toHaveText(
    "No query",
  );
  await expect(empty.locator(".input-group")).not.toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(ready.locator(".input-group > input")).toHaveValue("runtime");
  await expect(ready.locator("[data-input-group-status]")).toHaveText(
    "8 matches",
  );
  await expect(invalid.locator(".input-group > input")).toHaveValue("r");
  await expect(invalid.locator(".input-group > input")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(invalid.locator(".input-group > input")).toHaveAttribute(
    "required",
    "",
  );
  await expect(invalid.getByRole("alert")).toContainText(
    "Use at least 3 characters",
  );
  await expect(invalid.locator("[data-input-group-status]")).toHaveText(
    "Not searched",
  );
  expect(
    await invalid
      .locator(".input-group > input")
      .evaluate((element) => element.checkValidity()),
  ).toBe(false);

  await expect(loading.locator(".input-group")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await expect(loading.locator(".input-group > input")).toHaveValue(
    "runtime",
  );
  await expect(loading.locator(".input-group > input")).not.toBeDisabled();
  await expect(loading.getByRole("status")).toContainText(
    "Searching projects",
  );
  await expect(disabled.locator(".input-group")).toHaveAttribute(
    "data-disabled",
    "",
  );
  await expect(disabled.locator(".input-group")).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(disabled.locator(".input-group > input")).toBeDisabled();
  await expect(disabled.locator(".input-group > input")).toHaveValue(
    "archived",
  );
  await expect(disabled.locator("[data-input-group-status]")).toHaveText(
    "Unavailable",
  );
  await expect(readonly.locator(".input-group")).toHaveAttribute(
    "data-readonly",
    "",
  );
  await expect(readonly.locator(".input-group")).not.toHaveAttribute(
    "aria-readonly",
    "true",
  );
  await expect(readonly.locator(".input-group > input")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(readonly.locator(".input-group > input")).toHaveValue(
    "release",
  );
  await expect(readonly.locator("[data-input-group-status]")).toHaveText(
    "8 matches",
  );

  const relationships = await dialog
    .locator(".a3s-component-state-matrix__field-specimen")
    .evaluateAll((fields) =>
      fields.map((field) => {
        const input = field.querySelector<HTMLInputElement>(
          ".input-group > input",
        );
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
  expect(relationships).toHaveLength(6);
  expect(
    relationships.every(
      ({ describedIds, descriptionsResolve, inputId, labelFor }) =>
        inputId.length > 0 &&
        labelFor === inputId &&
        describedIds.length > 0 &&
        descriptionsResolve,
    ),
  ).toBe(true);

  const bidi = await ready.evaluate((element) => {
    const field = element.querySelector<HTMLElement>(
      ".a3s-component-state-matrix__field-specimen",
    )!;
    const group = field.querySelector<HTMLElement>(".input-group")!;
    const control = group.querySelector<HTMLElement>("input")!;
    const label = field.querySelector<HTMLElement>("label")!;
    const status = group.querySelector<HTMLElement>(
      "[data-input-group-status]",
    )!;
    const description = field.querySelector<HTMLElement>(
      "[data-input-group-state-description]",
    )!;
    return {
      control: getComputedStyle(control).direction,
      description: getComputedStyle(description).direction,
      group: getComputedStyle(group).direction,
      label: getComputedStyle(label).direction,
      status: getComputedStyle(status).direction,
    };
  });
  expect(bidi).toEqual({
    control: "ltr",
    description: "ltr",
    group: "rtl",
    label: "ltr",
    status: "ltr",
  });

  await expect(dialog).toHaveScreenshot("input-group-states.png");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("Input Group keeps disabled and read-only form semantics distinct", async ({
  page,
}) => {
  await openInputGroup(page);

  const form = page.locator("form[data-input-group-availability=en]");
  const disabledGroup = form.locator("[data-input-group-disabled]");
  const readonlyGroup = form.locator("[data-input-group-readonly]");
  const disabled = form.locator("#input-group-disabled-en");
  const readonly = form.locator("#input-group-readonly-en");

  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveValue("archived-runtime");
  await expect(readonly).toHaveAttribute("readonly", "");
  await expect(readonly).not.toBeDisabled();
  await expect(readonly).toHaveValue("release-runtime");
  await readonly.focus();
  await expect(readonly).toBeFocused();

  const semantics = await form.evaluate((element) => ({
    disabledGroupOpacity: getComputedStyle(
      element.querySelector<HTMLElement>("[data-input-group-disabled]")!,
    ).opacity,
    readonlyGroupOpacity: getComputedStyle(
      element.querySelector<HTMLElement>("[data-input-group-readonly]")!,
    ).opacity,
    submitted: Object.fromEntries(new FormData(element as HTMLFormElement)),
  }));
  expect(semantics).toEqual({
    disabledGroupOpacity: "1",
    readonlyGroupOpacity: "1",
    submitted: { approvedFilter: "release-runtime" },
  });

  await readonly.blur();
  await disabledGroup.locator("[data-align=inline-start]").click();
  await expect(disabled).not.toBeFocused();
  await readonlyGroup.locator("[data-align=inline-start]").click();
  await expect(readonly).toBeFocused();
});

test("Input Group contains huge multiline input in a bounded native viewport", async ({
  page,
}) => {
  await openInputGroup(page);

  const textarea = page.locator("#input-group-handoff-en");
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
    const group = element.closest<HTMLElement>(".input-group");
    if (!group) throw new Error("Input Group textarea shell is missing");
    const groupBounds = group.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      groupWidth: groupBounds.width,
      height: bounds.height,
      overflowY: style.overflowY,
      resize: style.resize,
      scrollHeight: element.scrollHeight,
      width: bounds.width,
    };
  });
  expect(geometry.height).toBe(before.height);
  expect(geometry.width).toBe(before.width);
  expect(geometry.width).toBeLessThanOrEqual(geometry.groupWidth + 1);
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.height);
  expect(["auto", "scroll"]).toContain(geometry.overflowY);
  expect(geometry.resize).toBe("vertical");
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
    geometry.documentClientWidth + 1,
  );
});

test("Input Group integrates matching HTML, React, and Vue examples and stays localized", async ({
  page,
}) => {
  await openInputGroup(page);

  const preview = primaryPreview(page);
  await preview.getByRole("button", { name: "Show integration code" }).click();
  const integration = preview.locator(
    "[data-component-integration=input-group]",
  );
  await expect(integration).toContainText("input-group-project-search-html");
  await expect(integration).toContainText('data-align="inline-start"');
  await expect(integration).toContainText("data-input-group-status");
  await expect(integration).toContainText("addEventListener");

  await integration.getByRole("tab", { name: "React" }).click();
  await expect(integration).toContainText("useInputGroup");
  await expect(integration).toContainText("useState");
  await expect(integration).toContainText("ref={group.ref}");
  await expect(integration).toContainText("onChange");
  await expect(integration).toContainText("htmlFor");

  await integration.getByRole("tab", { name: "Vue" }).click();
  await expect(integration).toContainText("useInputGroup");
  await expect(integration).toContainText("componentRef");
  await expect(integration).toContainText("v-model");
  await expect(integration).toContainText("data-input-group-status");

  await openInputGroup(page, "zh");
  const zhPreview = primaryPreview(page);
  const zhInput = zhPreview.locator("#input-group-project-search-zh");
  await expect(zhInput).toHaveAccessibleName("搜索项目");
  await expect(zhInput).toHaveAccessibleDescription(
    "按项目名称或仓库路径搜索。",
  );
  await expect(
    page.getByRole("heading", { name: "校验与恢复" }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("shadcn");
  await expect(page.locator("main")).not.toContainText("Search In...");
});

test("Input Group survives coarse pointers, long localized addons, RTL, and reduced motion", async ({
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
    await openInputGroup(page);
    const preview = primaryPreview(page);
    await preview
      .getByRole("button", { name: "Preview right-to-left layout" })
      .click();
    const group = preview.locator(".input-group");
    const input = group.locator("#input-group-project-search-en");
    const status = group.locator("#input-group-project-search-status-en");
    await status.evaluate((element) => {
      element.textContent =
        "128 matching projects across a deliberately long localized workspace name";
    });
    await input.fill(
      "packages/a-very-long-project-name-that-must-remain-contained/runtime",
    );
    await input.focus();

    const geometry = await group.evaluate((element) => {
      const input = element.querySelector<HTMLInputElement>("input")!;
      const status = element.querySelector<HTMLElement>(
        "[data-input-group-status]",
      )!;
      const groupBounds = element.getBoundingClientRect();
      const inputBounds = input.getBoundingClientRect();
      const inputStyle = getComputedStyle(input);
      const groupStyle = getComputedStyle(element);
      const statusStyle = getComputedStyle(status);
      return {
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        groupHeight: groupBounds.height,
        groupInsideViewport:
          groupBounds.left >= 0 && groupBounds.right <= window.innerWidth,
        inputFontSize: Number.parseFloat(inputStyle.fontSize),
        inputInsideGroup:
          inputBounds.left >= groupBounds.left &&
          inputBounds.right <= groupBounds.right,
        inputDirection: inputStyle.direction,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        statusClientWidth: status.clientWidth,
        statusDirection: statusStyle.direction,
        statusDisplay: statusStyle.display,
        statusOverflow: statusStyle.overflow,
        statusScrollWidth: status.scrollWidth,
        statusTextOverflow: statusStyle.textOverflow,
        transitionDuration: groupStyle.transitionDuration,
      };
    });
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
      geometry.documentClientWidth + 1,
    );
    expect(geometry.groupHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.groupInsideViewport).toBe(true);
    expect(geometry.inputInsideGroup).toBe(true);
    expect(geometry.inputFontSize).toBeGreaterThanOrEqual(16);
    expect(geometry.inputDirection).toBe("ltr");
    expect(geometry.reducedMotion).toBe(true);
    expect(geometry.statusDisplay).toBe("block");
    expect(geometry.statusDirection).toBe("ltr");
    expect(Number.parseFloat(geometry.transitionDuration)).toBeLessThanOrEqual(
      0.001,
    );
    expect(["hidden", "clip"]).toContain(geometry.statusOverflow);
    expect(geometry.statusTextOverflow).toBe("ellipsis");
    expect(geometry.statusScrollWidth).toBeGreaterThan(
      geometry.statusClientWidth,
    );

    const action = page.getByRole("button", {
      name: "Copy repository URL",
    });
    const actionBounds = await action.boundingBox();
    if (!actionBounds) throw new Error("Input Group action is not rendered");
    expect(actionBounds.width).toBeGreaterThanOrEqual(44);
    expect(actionBounds.height).toBeGreaterThanOrEqual(44);
  } finally {
    await context.close();
  }
});

test("Input Group exposes a system focus boundary in forced colors", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openInputGroup(page);

  const group = primaryPreview(page).locator(".input-group");
  await group.locator("input").focus();
  const focus = await group.evaluate((element) => {
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

test("Input Group keeps one continuous boundary across compatibility style packs", async ({
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
      <label for="compat-input-group">Search projects</label>
      <div class="input-group">
        <input id="compat-input-group" class="input" type="search" value="runtime" aria-describedby="compat-input-group-help">
        <span data-align="inline-start" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" stroke-width="1.5"></circle><path d="m12.5 12.5 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg></span>
        <span data-align="inline-end">8 results</span>
        <button class="btn" data-align="inline-end" data-variant="ghost" type="button" aria-label="Clear project search">Clear</button>
      </div>
      <p id="compat-input-group-help">Search by project name or path.</p>
    </div>`;

  for (const stylePack of stylePacks) {
    await test.step(stylePack, async () => {
      await page.setContent(markup);
      await page.addStyleTag({
        path: new URL(`../dist/basecoat-${stylePack}.cdn.css`, import.meta.url)
          .pathname,
      });

      const group = page.locator(".input-group");
      const input = group.locator("input");
      const action = group.getByRole("button", {
        name: "Clear project search",
      });
      await input.focus();
      await expect(input).toBeFocused();
      const focused = await group.evaluate((element) => {
        const control = element.querySelector<HTMLInputElement>("input")!;
        const style = getComputedStyle(element);
        const controlStyle = getComputedStyle(control);
        return {
          controlBackground: controlStyle.backgroundColor,
          controlBorderWidth: Number.parseFloat(controlStyle.borderWidth),
          controlBoxShadow: controlStyle.boxShadow,
          controlOutlineStyle: controlStyle.outlineStyle,
          controlRadius: Number.parseFloat(controlStyle.borderRadius),
          groupBorderWidth: Number.parseFloat(style.borderWidth),
          groupBoxShadow: style.boxShadow,
          groupOutlineStyle: style.outlineStyle,
        };
      });
      expect(focused.groupBorderWidth).toBeGreaterThanOrEqual(1);
      expect(focused.controlBorderWidth).toBe(0);
      expect(focused.controlRadius).toBe(0);
      expect(focused.controlBoxShadow).toBe("none");
      expect(focused.controlOutlineStyle).toBe("none");
      expectNoOuterRing(focused.groupBoxShadow);

      await input.evaluate((element) =>
        element.setAttribute("aria-invalid", "true"),
      );
      const invalid = await group.evaluate((element) => ({
        boxShadow: getComputedStyle(element).boxShadow,
        controlBoxShadow: getComputedStyle(
          element.querySelector<HTMLInputElement>("input")!,
        ).boxShadow,
      }));
      expect(invalid.controlBoxShadow).toBe("none");
      expectNoOuterRing(invalid.boxShadow);

      await input.evaluate((element) => element.removeAttribute("aria-invalid"));
      await action.focus();
      await expect(action).toBeFocused();
      const actionFocus = await action.evaluate((element) => ({
        boxShadow: getComputedStyle(element).boxShadow,
        outlineStyle: getComputedStyle(element).outlineStyle,
      }));
      expectNoOuterRing(actionFocus.boxShadow);

      await input.evaluate((element) => {
        element.disabled = true;
      });
      const disabled = await group.evaluate((element) => ({
        groupOpacity: getComputedStyle(element).opacity,
        inputOpacity: getComputedStyle(
          element.querySelector<HTMLInputElement>("input")!,
        ).opacity,
      }));
      expect(disabled).toEqual({ groupOpacity: "1", inputOpacity: "1" });
    });
  }
});
