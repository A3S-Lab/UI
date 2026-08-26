import { expect, test, type Locator, type Page } from "@playwright/test";

declare global {
  interface Window {
    __devicePreviewDetail?: {
      args: string[];
      command: string;
      executable: string;
      height: number;
      title: string;
      url: string;
      width: number;
    } | null;
    __previewCopiedSource?: string;
  }
}

interface SwitchGeometry {
  checked: boolean;
  control: { height: number; width: number };
  direction: string;
  thumb: {
    height: number;
    left: number;
    top: number;
    translate: string;
    width: number;
  };
  track: { height: number; left: number; top: number; width: number };
}

interface SliderFillState {
  direction: string;
  fillOffset: number;
  thumbSize: number;
  value: string;
  valuePercent: string;
}

async function readSwitchGeometry(control: Locator): Promise<SwitchGeometry> {
  return control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const physicalBox = (style: CSSStyleDeclaration) => {
      const matrix =
        style.transform === "none"
          ? new DOMMatrixReadOnly()
          : new DOMMatrixReadOnly(style.transform);
      const width = Number.parseFloat(style.width);
      const height = Number.parseFloat(style.height);
      const computedLeft = Number.parseFloat(style.left);
      const computedRight = Number.parseFloat(style.right);
      const computedTop = Number.parseFloat(style.top);
      const left = Number.isFinite(computedLeft)
        ? computedLeft
        : rect.width - computedRight - width;

      return {
        height,
        left: left + matrix.m41,
        top: computedTop + matrix.m42,
        width,
      };
    };
    const trackStyle = getComputedStyle(element, "::after");
    const thumbStyle = getComputedStyle(element, "::before");

    return {
      checked: (element as HTMLInputElement).checked,
      control: { height: rect.height, width: rect.width },
      direction: getComputedStyle(element).direction,
      thumb: {
        ...physicalBox(thumbStyle),
        translate: thumbStyle.translate,
      },
      track: physicalBox(trackStyle),
    };
  });
}

function expectSwitchThumbAtEndpoint(geometry: SwitchGeometry) {
  const leftGap = geometry.thumb.left - geometry.track.left;
  const rightGap =
    geometry.track.left +
    geometry.track.width -
    geometry.thumb.left -
    geometry.thumb.width;
  const inlineStartGap = geometry.direction === "rtl" ? rightGap : leftGap;
  const inlineEndGap = geometry.direction === "rtl" ? leftGap : rightGap;
  const endpointGap = geometry.checked ? inlineEndGap : inlineStartGap;
  const oppositeGap = geometry.checked ? inlineStartGap : inlineEndGap;
  const expectedEndpointGap =
    (geometry.track.height - geometry.thumb.height) / 2;

  expect(["none", "0px", "0px 0px"]).toContain(geometry.thumb.translate);
  expect(endpointGap).toBeCloseTo(expectedEndpointGap, 1);
  expect(oppositeGap).toBeCloseTo(
    geometry.track.width - geometry.thumb.width - expectedEndpointGap,
    1,
  );
  expect(
    geometry.thumb.top +
      geometry.thumb.height / 2 -
      (geometry.track.top + geometry.track.height / 2),
  ).toBeCloseTo(0, 1);
}

async function openComponent(page: Page, component: string) {
  if (page.viewportSize()!.width <= 768) {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.goto(`en/components/${component}.html`, {
    waitUntil: "networkidle",
  });
  await page.evaluate(() => document.fonts.ready);
}

async function waitForSettledFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }),
  );
}

async function readSliderFillState(slider: Locator): Promise<SliderFillState> {
  return slider.evaluate((element) => {
    const input = element as HTMLInputElement;
    const style = getComputedStyle(input);
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const lengthInPixels = (value: string) => {
      const numericValue = Number.parseFloat(value);
      const pixels = value.endsWith("rem")
        ? numericValue * rootFontSize
        : numericValue;
      return Number(pixels.toFixed(2));
    };
    return {
      direction: style.direction,
      fillOffset: lengthInPixels(
        style.getPropertyValue("--slider-fill-offset").trim(),
      ),
      thumbSize: lengthInPixels(
        style.getPropertyValue("--slider-thumb-size").trim(),
      ),
      value: input.value,
      valuePercent: style.getPropertyValue("--slider-value").trim(),
    };
  });
}

async function setSliderValue(slider: Locator, value: number) {
  await slider.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    if (!valueSetter) {
      throw new Error("Native range value setter is unavailable");
    }
    valueSetter.call(input, String(nextValue));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}

test("Switch keeps Office track geometry and mutable MDX state", async ({
  page,
}) => {
  await openComponent(page, "switch");

  const preview = page
    .locator(".a3s-preview[data-preview-component=switch]")
    .first();
  const control = preview.locator("#airplane-mode");
  const geometry = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const label = element.labels?.[0]?.getBoundingClientRect();
    const track = getComputedStyle(element, "::after");
    const thumb = getComputedStyle(element, "::before");
    return {
      gap: label ? label.left - rect.right : 0,
      height: rect.height,
      thumbHeight: Number.parseFloat(thumb.height),
      thumbWidth: Number.parseFloat(thumb.width),
      trackHeight: Number.parseFloat(track.height),
      trackWidth: Number.parseFloat(track.width),
      width: rect.width,
    };
  });
  expect(geometry.width).toBeCloseTo(34, 0);
  expect(geometry.height).toBeCloseTo(24, 0);
  expect(geometry.gap).toBeCloseTo(8, 0);
  expect(geometry.trackWidth).toBeCloseTo(30, 0);
  expect(geometry.trackHeight).toBeCloseTo(18, 0);
  expect(geometry.thumbWidth).toBeCloseTo(12, 0);
  expect(geometry.thumbHeight).toBeCloseTo(12, 0);

  const uncheckedGeometry = await readSwitchGeometry(control);
  expectSwitchThumbAtEndpoint(uncheckedGeometry);
  await control.check();
  await expect(control).toBeChecked();
  await expect
    .poll(async () => {
      const current = await readSwitchGeometry(control);
      return current.thumb.left - uncheckedGeometry.thumb.left;
    })
    .toBeCloseTo(12, 1);
  const checkedGeometry = await readSwitchGeometry(control);
  expectSwitchThumbAtEndpoint(checkedGeometry);
  expect(checkedGeometry.thumb.left - uncheckedGeometry.thumb.left).toBeCloseTo(
    12,
    1,
  );

  const small = page.locator("#switch-size-sm");
  const smallGeometry = await small.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const track = getComputedStyle(element, "::after");
    const thumb = getComputedStyle(element, "::before");
    return {
      height: rect.height,
      thumbHeight: Number.parseFloat(thumb.height),
      trackHeight: Number.parseFloat(track.height),
      trackWidth: Number.parseFloat(track.width),
      width: rect.width,
    };
  });
  expect(smallGeometry.width).toBeCloseTo(28, 0);
  expect(smallGeometry.height).toBeCloseTo(20, 0);
  expect(smallGeometry.trackWidth).toBeCloseTo(24, 0);
  expect(smallGeometry.trackHeight).toBeCloseTo(14, 0);
  expect(smallGeometry.thumbHeight).toBeCloseTo(10, 0);

  const smallUncheckedGeometry = await readSwitchGeometry(small);
  expectSwitchThumbAtEndpoint(smallUncheckedGeometry);
  await small.check();
  await expect(small).toBeChecked();
  await expect
    .poll(async () => {
      const current = await readSwitchGeometry(small);
      return current.thumb.left - smallUncheckedGeometry.thumb.left;
    })
    .toBeCloseTo(10, 1);
  const smallCheckedGeometry = await readSwitchGeometry(small);
  expectSwitchThumbAtEndpoint(smallCheckedGeometry);
  expect(
    smallCheckedGeometry.thumb.left - smallUncheckedGeometry.thumb.left,
  ).toBeCloseTo(10, 1);

  const rtl = page.locator("#switch-rtl");
  const rtlCheckedGeometry = await readSwitchGeometry(rtl);
  expectSwitchThumbAtEndpoint(rtlCheckedGeometry);
  await rtl.uncheck();
  await expect(rtl).not.toBeChecked();
  await expect
    .poll(async () => {
      const current = await readSwitchGeometry(rtl);
      return rtlCheckedGeometry.thumb.left - current.thumb.left;
    })
    .toBeCloseTo(-12, 1);
  const rtlUncheckedGeometry = await readSwitchGeometry(rtl);
  expectSwitchThumbAtEndpoint(rtlUncheckedGeometry);
  expect(
    rtlCheckedGeometry.thumb.left - rtlUncheckedGeometry.thumb.left,
  ).toBeCloseTo(-12, 1);

  const choiceGroup = page.getByRole("group", { name: "Focus settings" });
  const initiallyEnabled = choiceGroup.locator('input[role="switch"]').nth(1);
  await expect(initiallyEnabled).toBeChecked();
  await initiallyEnabled.uncheck();
  await expect(initiallyEnabled).not.toBeChecked();
  await expect(preview).toHaveScreenshot("switch-office-checked.png");
});

test("Switch centers its visual track inside a coarse touch target", async ({
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
    await openComponent(page, "switch");
    await expect
      .poll(() => page.evaluate(() => matchMedia("(pointer: coarse)").matches))
      .toBe(true);

    const control = page.locator("#airplane-mode").first();
    const uncheckedGeometry = await readSwitchGeometry(control);
    expect(uncheckedGeometry.control.width).toBeCloseTo(44, 0);
    expect(uncheckedGeometry.control.height).toBeCloseTo(44, 0);
    expect(uncheckedGeometry.track.width).toBeCloseTo(30, 0);
    expect(uncheckedGeometry.track.height).toBeCloseTo(18, 0);
    expectSwitchThumbAtEndpoint(uncheckedGeometry);

    await control.check();
    await expect(control).toBeChecked();
    await expect
      .poll(async () => {
        const current = await readSwitchGeometry(control);
        return current.thumb.left - uncheckedGeometry.thumb.left;
      })
      .toBeCloseTo(12, 1);
    const checkedGeometry = await readSwitchGeometry(control);
    expectSwitchThumbAtEndpoint(checkedGeometry);
    expect(
      checkedGeometry.thumb.left - uncheckedGeometry.thumb.left,
    ).toBeCloseTo(12, 1);
  } finally {
    await context.close();
  }
});

test("Slider keeps its visual fill synchronized across intermediate and RTL values", async ({
  page,
}, testInfo) => {
  await openComponent(page, "slider");

  const preview = page.locator(".a3s-preview:has(#slider-primary)");
  const slider = preview.locator("#slider-primary");
  const output = preview.locator("output");
  await expect(slider).toHaveAccessibleName("Temperature");
  await expect(slider).toHaveAttribute("aria-valuetext", "50 degrees Celsius");
  await expect(output).toHaveText("50 °C");
  const tokens = await slider.evaluate((element) => {
    const style = getComputedStyle(element);
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const lengthInPixels = (value: string) => {
      const numericValue = Number.parseFloat(value);
      return value.endsWith("rem") ? numericValue * rootFontSize : numericValue;
    };
    return {
      cursor: style.cursor,
      height: element.getBoundingClientRect().height,
      thumbSize: lengthInPixels(
        style.getPropertyValue("--slider-thumb-size").trim(),
      ),
      trackHeight: lengthInPixels(
        style.getPropertyValue("--slider-track-height").trim(),
      ),
    };
  });
  expect(tokens.cursor).toBe("pointer");
  expect(tokens.height).toBeCloseTo(24, 0);
  expect(tokens.trackHeight).toBeCloseTo(4, 1);
  expect(tokens.thumbSize).toBeCloseTo(14, 1);

  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("51");
  await expect(slider).toHaveAttribute("aria-valuetext", "51 degrees Celsius");
  await expect(output).toHaveText("51 °C");
  await expect
    .poll(() =>
      slider.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--slider-value").trim(),
      ),
    )
    .toBe("51%");
  await expect
    .poll(async () => (await readSliderFillState(slider)).fillOffset)
    .toBeCloseTo(-0.14, 2);

  await setSliderValue(slider, 20);
  await expect(slider).toHaveValue("20");
  await expect
    .poll(async () => await readSliderFillState(slider))
    .toMatchObject({
      direction: "ltr",
      fillOffset: 4.2,
      thumbSize: 14,
      valuePercent: "20%",
    });
  await testInfo.attach("slider-fill-20", {
    body: await slider.screenshot(),
    contentType: "image/png",
  });

  await setSliderValue(slider, 80);
  await expect(slider).toHaveValue("80");
  await expect
    .poll(async () => await readSliderFillState(slider))
    .toMatchObject({
      direction: "ltr",
      fillOffset: -4.2,
      thumbSize: 14,
      valuePercent: "80%",
    });
  await testInfo.attach("slider-fill-80", {
    body: await slider.screenshot(),
    contentType: "image/png",
  });

  await page.keyboard.press("Home");
  await expect(slider).toHaveValue("0");
  await expect
    .poll(() =>
      slider.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--slider-value").trim(),
      ),
    )
    .toBe("0%");
  await expect
    .poll(async () => (await readSliderFillState(slider)).fillOffset)
    .toBeCloseTo(7, 2);
  await expect(slider).toHaveScreenshot("slider-thumb-start-office.png");

  await page.keyboard.press("End");
  await expect(slider).toHaveValue("100");
  await expect
    .poll(() =>
      slider.evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--slider-value").trim(),
      ),
    )
    .toBe("100%");
  await expect
    .poll(async () => (await readSliderFillState(slider)).fillOffset)
    .toBeCloseTo(-7, 2);
  await expect(slider).toHaveScreenshot("slider-thumb-end-office.png");

  const rtlSlider = page.locator("#slider-rtl");
  await expect(rtlSlider).toHaveAttribute("aria-valuetext", "50 بالمائة");
  await rtlSlider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(rtlSlider).toHaveValue("49");
  await expect(rtlSlider).toHaveAttribute("aria-valuetext", "49 بالمائة");
  await page.keyboard.press("ArrowLeft");
  await expect(rtlSlider).toHaveValue("50");
  await setSliderValue(rtlSlider, 80);
  await expect(rtlSlider).toHaveAttribute("aria-valuetext", "80 بالمائة");
  await expect
    .poll(async () => await readSliderFillState(rtlSlider))
    .toMatchObject({
      direction: "rtl",
      fillOffset: -4.2,
      value: "80",
      valuePercent: "80%",
    });

  const disabledPreview = page.locator(".a3s-preview:has(#slider-disabled)");
  const disabledSlider = disabledPreview.locator("#slider-disabled");
  await expect(disabledSlider).toBeDisabled();
  await expect(disabledSlider).toHaveAccessibleName("Temperature");
  await expect(disabledPreview.locator("output")).toHaveText("50 °C");
  await expect(disabledPreview).toContainText(
    "This limit is managed by the workspace policy.",
  );
});

test("Field composition reuses a localized mutable Slider demo", async ({
  page,
}) => {
  await openComponent(page, "field");

  const englishPreview = page.locator(
    'section.a3s-preview:has([data-slider-demo="field"])',
  );
  const englishSlider = englishPreview.getByRole("slider", {
    name: "Price range",
  });
  const englishOutput = englishPreview.locator("output");
  await expect(englishPreview).toHaveAccessibleName("Slider component preview");
  await expect(englishOutput).toHaveText("$800");
  await expect(englishSlider).toHaveAttribute("aria-valuetext", "$800");
  await englishSlider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(englishSlider).toHaveValue("810");
  await expect(englishOutput).toHaveText("$810");
  await expect(englishSlider).toHaveAttribute("aria-valuetext", "$810");
  await expect
    .poll(async () => await readSliderFillState(englishSlider))
    .toMatchObject({ fillOffset: -4.34, valuePercent: "81%" });

  await page.goto("components/field.html", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const chinesePreview = page.locator(
    'section.a3s-preview:has([data-slider-demo="field"])',
  );
  const chineseSlider = chinesePreview.getByRole("slider", {
    name: "价格范围",
  });
  await expect(chinesePreview).toHaveAccessibleName("滑块组件预览");
  await expect(chinesePreview.locator(".a3s-preview__header")).toContainText(
    "滑块",
  );
  await expect(chineseSlider).toHaveAttribute("aria-valuetext", "US$800");
  await expect(chinesePreview.locator("output")).toHaveText("US$800");
});

test("every Preview exposes keyboard-operable semantic source and copy feedback", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: async () => window.__previewCopiedSource ?? "",
        writeText: async (value: string) => {
          window.__previewCopiedSource = value;
        },
      },
    });
  });
  await openComponent(page, "button");

  const htmlPreview = page
    .locator(".a3s-preview[data-preview-component=button]")
    .first();
  const sourcePanel = htmlPreview.locator("[data-preview-source-panel]");
  const sourceToggle = htmlPreview.locator(
    ".a3s-preview__controls button[aria-controls]",
  );
  await expect(htmlPreview).toHaveAttribute("data-preview-source", "ready");
  await expect(htmlPreview).toHaveAccessibleName(
    "Common actions component preview",
  );
  const previewCopyButton = htmlPreview.locator(
    ".a3s-preview__controls button[data-state]",
  );
  await expect(previewCopyButton).toHaveAccessibleName("Copy current code");
  await expect(previewCopyButton).toContainText("Copy");
  await previewCopyButton.click();
  await expect(previewCopyButton).toHaveAccessibleName("Code copied");
  await expect(previewCopyButton).toContainText("Copied");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Save changes");
  await expect(sourceToggle).toHaveAttribute("aria-expanded", "false");
  await expect(sourceToggle).toHaveAccessibleName("Show integration code");
  await expect(sourcePanel).toBeHidden();
  await sourceToggle.click();
  await expect(sourceToggle).toHaveAttribute("aria-expanded", "true");
  await expect(sourcePanel).toBeVisible();
  await expect(sourcePanel).toContainText("Install");
  await expect(sourcePanel).toContainText("Example");
  await expect(sourcePanel).toContainText("Entry");
  await expect(sourcePanel).toContainText('<button type="button"');
  await expect(sourcePanel).toContainText('class="btn"');
  await expect(htmlPreview.locator("[data-reactroot]")).toHaveCount(0);
  await expect
    .poll(() => sourcePanel.locator(".line span[style]").count())
    .toBeGreaterThan(0);

  const copyButton = sourcePanel.locator(
    '.a3s-preview-integration__source[data-code-file="example"] .rp-code-copy-button',
  );
  await expect(copyButton).toHaveAccessibleName("Copy code");
  await copyButton.click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('class="btn"');

  await sourceToggle.focus();
  await page.keyboard.press("Space");
  await expect(sourceToggle).toHaveAttribute("aria-expanded", "false");
  await expect(sourcePanel).toBeHidden();
  await expect(
    htmlPreview.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeVisible();

  const phoneViewport = htmlPreview.getByRole("button", {
    name: "Phone width",
  });
  await phoneViewport.click();
  await expect(phoneViewport).toHaveAttribute("aria-pressed", "true");
  await expect(htmlPreview).toHaveAttribute("data-preview-viewport", "phone");
  const phoneShell = htmlPreview.locator(".a3s-preview__viewport-shell");
  const phoneFrame = htmlPreview.locator(
    '[data-preview-emulated-viewport="phone"]',
  );
  await expect(phoneShell).toBeVisible();
  await expect(phoneFrame).toBeVisible();
  const [previewBox, phoneShellBox] = await Promise.all([
    htmlPreview.boundingBox(),
    phoneShell.boundingBox(),
  ]);
  expect(previewBox).not.toBeNull();
  expect(phoneShellBox).not.toBeNull();
  expect(phoneShellBox!.x).toBeGreaterThanOrEqual(previewBox!.x - 1);
  expect(phoneShellBox!.x + phoneShellBox!.width).toBeLessThanOrEqual(
    previewBox!.x + previewBox!.width + 1,
  );
  expect(phoneShellBox!.height).toBeLessThanOrEqual(282);
  const responsiveDocument = htmlPreview.frameLocator("iframe");
  await expect(
    responsiveDocument.getByRole("button", {
      name: "Save changes",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      responsiveDocument
        .locator("html")
        .evaluate(() => Math.round(window.innerWidth)),
    )
    .toBe(390);

  const tabletViewport = htmlPreview.getByRole("button", {
    name: "Tablet width",
  });
  await tabletViewport.click();
  await expect(tabletViewport).toHaveAttribute("aria-pressed", "true");
  await expect(htmlPreview).toHaveAttribute("data-preview-viewport", "tablet");
  await expect(
    htmlPreview.locator('[data-preview-emulated-viewport="tablet"]'),
  ).toBeVisible();
  await expect
    .poll(() =>
      responsiveDocument
        .locator("html")
        .evaluate(() => Math.round(window.innerWidth)),
    )
    .toBe(768);

  const themeToggle = htmlPreview.getByRole("button", {
    name: "Preview in dark mode",
  });
  await themeToggle.click();
  await expect(
    htmlPreview.getByRole("button", { name: "Use documentation theme" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(htmlPreview).toHaveAttribute("data-preview-scheme", "dark");
  await expect(responsiveDocument.locator("html")).toHaveClass(/\bdark\b/);

  const directionToggle = htmlPreview.getByRole("button", {
    name: "Preview right-to-left layout",
  });
  await directionToggle.click();
  await expect(
    htmlPreview.getByRole("button", { name: "Use left-to-right layout" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(htmlPreview).toHaveAttribute("data-preview-direction", "rtl");
  await expect(responsiveDocument.locator("html")).toHaveAttribute(
    "dir",
    "rtl",
  );

  await openComponent(page, "slider");
  const variantPreview = page
    .locator(
      '.a3s-preview[data-preview-component=slider]:has([data-slider-demo="standalone"])',
    )
    .nth(1);
  const variantSource = variantPreview.locator("[data-preview-source-panel]");
  await variantPreview
    .getByRole("button", { name: "Show source", exact: true })
    .click();
  await expect(variantSource).toContainText('type="range"');
  await expect(variantSource).not.toContainText("SliderDemo");
  await expect(variantSource).not.toContainText("data-range-initialized");

  await page.goto("components/button.html", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const chinesePreview = page
    .locator(".a3s-preview[data-preview-component=button]")
    .first();
  await expect(chinesePreview).toHaveAccessibleName("常用操作组件预览");
  await expect(chinesePreview.locator(".a3s-preview__header")).toContainText(
    "常用操作",
  );
  await expect(
    chinesePreview.getByRole("button", { name: "展开接入代码" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    chinesePreview.locator("[data-preview-source-panel]"),
  ).toBeHidden();
  await expect(
    chinesePreview.getByRole("button", { name: "复制当前代码" }),
  ).toContainText("复制");
});

test("responsive previews preserve canvas pixels and omit Monaco internals", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openComponent(page, "chart");

  const chartPreview = page
    .locator(".a3s-preview[data-preview-component=chart]")
    .first();
  await chartPreview.getByRole("button", { name: "Phone width" }).click();
  const chartSnapshot = chartPreview
    .frameLocator("iframe")
    .locator("[data-preview-canvas-snapshot]");
  await expect(chartSnapshot).toBeVisible();
  expect(
    await chartSnapshot.evaluate((element) => {
      const image = element as HTMLImageElement;
      return (
        image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
      );
    }),
  ).toBe(true);

  await openComponent(page, "code-editor");
  const workbenchPreview = page
    .locator(".a3s-preview[data-preview-component=code-editor]")
    .filter({ has: page.locator(".monaco-workbench") })
    .first();
  await workbenchPreview.getByRole("button", { name: "Phone width" }).click();
  const workbenchDocument = workbenchPreview.frameLocator("iframe");
  await expect(
    workbenchDocument.locator(".a3s-preview-editor-snapshot"),
  ).toBeVisible();
  await expect(workbenchDocument.locator(".monaco-editor")).toHaveCount(0);
  expect(
    await workbenchDocument
      .locator("body")
      .evaluate((element) => element.innerHTML.length),
  ).toBeLessThan(150_000);
});

test("Device Simulator keeps real viewport dimensions and a structured native boundary", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: async () => window.__previewCopiedSource ?? "",
        writeText: async (value: string) => {
          window.__previewCopiedSource = value;
        },
      },
    });
  });
  await openComponent(page, "device-simulator");

  const simulator = page.locator(".device-simulator").first();
  const preset = simulator.locator("[data-device-simulator-select]");
  const width = simulator.locator("[data-device-simulator-width]");
  const height = simulator.locator("[data-device-simulator-height]");
  const preview = simulator.locator("[data-device-simulator-preview]");
  const status = simulator.locator("[data-device-simulator-status]");
  await expect(simulator).toHaveAttribute(
    "data-device-simulator-initialized",
    "true",
  );
  await expect(width).toHaveValue("393");
  await expect(height).toHaveValue("852");
  await expect
    .poll(() =>
      preview.evaluate((element) => ({
        height: (element as HTMLIFrameElement).clientHeight,
        width: (element as HTMLIFrameElement).clientWidth,
      })),
    )
    .toEqual({ height: 852, width: 393 });

  const phoneShell = await simulator.evaluate((element) => {
    const canvas = element.querySelector<HTMLElement>(
      "[data-device-simulator-canvas]",
    )!;
    const frame = element.querySelector<HTMLElement>(
      "[data-device-simulator-frame]",
    )!;
    const iframe = element.querySelector<HTMLElement>(
      "[data-device-simulator-preview]",
    )!;
    const canvasRect = canvas.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const sensor = getComputedStyle(frame, "::before");
    const gesture = getComputedStyle(frame, "::after");
    return {
      canvasHeight: canvasRect.height,
      canvasWidth: canvasRect.width,
      frameHeight: frame.offsetHeight,
      frameRenderedHeight: frameRect.height,
      frameRenderedWidth: frameRect.width,
      frameWidth: frame.offsetWidth,
      gesture: {
        bottom: gesture.bottom,
        content: gesture.content,
        height: gesture.height,
      },
      preview: {
        height: iframe.clientHeight,
        left: iframe.offsetLeft,
        top: iframe.offsetTop,
        width: iframe.clientWidth,
      },
      sensor: {
        content: sensor.content,
        height: sensor.height,
        top: sensor.top,
        width: sensor.width,
      },
    };
  });
  expect(phoneShell.frameWidth).toBe(413);
  expect(phoneShell.frameHeight).toBe(872);
  expect(phoneShell.preview).toEqual({
    height: 852,
    left: 10,
    top: 10,
    width: 393,
  });
  expect(phoneShell.sensor).toMatchObject({
    height: "30px",
    top: "20px",
    width: "112px",
  });
  expect(phoneShell.sensor.content).not.toBe("none");
  expect(phoneShell.gesture.height).toBe("5px");
  expect(phoneShell.gesture.bottom).toBe("20px");
  expect(phoneShell.gesture.content).not.toBe("none");
  expect(phoneShell.canvasWidth).toBeCloseTo(phoneShell.frameRenderedWidth, 1);
  expect(phoneShell.canvasHeight).toBeCloseTo(
    phoneShell.frameRenderedHeight,
    1,
  );

  await preset.selectOption("ipad-mini");
  await expect(simulator).toHaveAttribute("data-device-kind", "tablet");
  const tabletShell = await simulator.evaluate((element) => {
    const frame = element.querySelector<HTMLElement>(
      "[data-device-simulator-frame]",
    )!;
    const iframe = element.querySelector<HTMLElement>(
      "[data-device-simulator-preview]",
    )!;
    const camera = getComputedStyle(frame, "::before");
    return {
      camera: {
        content: camera.content,
        height: camera.height,
        top: camera.top,
        width: camera.width,
      },
      frame: { height: frame.offsetHeight, width: frame.offsetWidth },
      preview: {
        height: iframe.clientHeight,
        left: iframe.offsetLeft,
        top: iframe.offsetTop,
        width: iframe.clientWidth,
      },
    };
  });
  expect(tabletShell.frame).toEqual({ height: 1052, width: 796 });
  expect(tabletShell.preview).toEqual({
    height: 1024,
    left: 14,
    top: 14,
    width: 768,
  });
  expect(tabletShell.camera).toMatchObject({
    height: "7px",
    top: "4px",
    width: "7px",
  });
  expect(tabletShell.camera.content).not.toBe("none");
  await testInfo.attach("device-simulator-tablet-shell", {
    body: await simulator.screenshot(),
    contentType: "image/png",
  });

  await preset.selectOption("laptop");
  await expect(simulator).toHaveAttribute("data-device-kind", "desktop");
  await expect(simulator).toHaveAttribute("data-orientation", "landscape");
  await expect(width).toHaveValue("1440");
  await expect(height).toHaveValue("900");

  const laptopShell = await simulator.evaluate((element) => {
    const frame = element.querySelector<HTMLElement>(
      "[data-device-simulator-frame]",
    )!;
    const iframe = element.querySelector<HTMLElement>(
      "[data-device-simulator-preview]",
    )!;
    const chassis = getComputedStyle(frame, "::before");
    const base = getComputedStyle(frame, "::after");
    return {
      base: { content: base.content, height: base.height },
      chassis: { content: chassis.content, height: chassis.height },
      frame: { height: frame.offsetHeight, width: frame.offsetWidth },
      preview: {
        height: iframe.clientHeight,
        left: iframe.offsetLeft,
        top: iframe.offsetTop,
        width: iframe.clientWidth,
      },
    };
  });
  expect(laptopShell.frame).toEqual({ height: 986, width: 1468 });
  expect(laptopShell.preview).toEqual({
    height: 900,
    left: 14,
    top: 18,
    width: 1440,
  });
  expect(laptopShell.chassis).toMatchObject({ height: "928px" });
  expect(laptopShell.chassis.content).not.toBe("none");
  expect(laptopShell.base).toMatchObject({ height: "60px" });
  expect(laptopShell.base.content).not.toBe("none");
  await testInfo.attach("device-simulator-laptop-shell", {
    body: await simulator.screenshot(),
    contentType: "image/png",
  });

  await preset.selectOption("desktop");
  await expect(simulator).toHaveAttribute("data-device", "desktop");
  await expect(width).toHaveValue("1920");
  await expect(height).toHaveValue("1080");
  const monitorShell = await simulator.evaluate((element) => {
    const frame = element.querySelector<HTMLElement>(
      "[data-device-simulator-frame]",
    )!;
    const iframe = element.querySelector<HTMLElement>(
      "[data-device-simulator-preview]",
    )!;
    const chassis = getComputedStyle(frame, "::before");
    const stand = getComputedStyle(frame, "::after");
    return {
      chassis: { content: chassis.content, height: chassis.height },
      frame: { height: frame.offsetHeight, width: frame.offsetWidth },
      preview: {
        height: iframe.clientHeight,
        left: iframe.offsetLeft,
        top: iframe.offsetTop,
        width: iframe.clientWidth,
      },
      stand: { content: stand.content, height: stand.height },
    };
  });
  expect(monitorShell.frame).toEqual({ height: 1212, width: 1948 });
  expect(monitorShell.preview).toEqual({
    height: 1080,
    left: 14,
    top: 14,
    width: 1920,
  });
  expect(monitorShell.chassis).toMatchObject({ height: "1136px" });
  expect(monitorShell.chassis.content).not.toBe("none");
  expect(monitorShell.stand).toMatchObject({ height: "78px" });
  expect(monitorShell.stand.content).not.toBe("none");
  await testInfo.attach("device-simulator-monitor-shell", {
    body: await simulator.screenshot(),
    contentType: "image/png",
  });

  await preset.selectOption("laptop");

  await simulator
    .locator('[data-device-simulator-orientation-value="portrait"]')
    .click();
  await expect(width).toHaveValue("900");
  await expect(height).toHaveValue("1440");

  await width.fill("500");
  await width.evaluate((element) =>
    element.dispatchEvent(new Event("change", { bubbles: true })),
  );
  await height.fill("700");
  await height.evaluate((element) =>
    element.dispatchEvent(new Event("change", { bubbles: true })),
  );
  await expect(preset).toHaveValue("custom");
  await expect(simulator).toHaveAttribute("data-width", "500");
  await expect(simulator).toHaveAttribute("data-height", "700");

  const url = simulator.locator("[data-device-simulator-url]");
  await url.fill("javascript:alert(1)");
  await simulator.getByRole("button", { name: "Open", exact: true }).click();
  await expect(simulator).toHaveAttribute("data-state", "error");
  await expect(status).toContainText("HTTP, HTTPS, file, or relative URL");

  await url.fill("../../device-preview.html?lang=en");
  await simulator.getByRole("button", { name: "Open", exact: true }).click();
  await expect(simulator).toHaveAttribute("data-state", "ready");
  await expect(status).toContainText("500 × 700");

  await page.evaluate(() => {
    const root = document.querySelector(".device-simulator");
    window.__devicePreviewDetail = null;
    root?.addEventListener(
      "a3s:device-preview-request",
      (event) => {
        event.preventDefault();
        window.__devicePreviewDetail = (event as CustomEvent).detail;
      },
      { once: true },
    );
  });
  await simulator.getByRole("button", { name: "Native preview" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__devicePreviewDetail))
    .not.toBeNull();
  const capturedDetail = await page.evaluate(
    () => window.__devicePreviewDetail,
  );
  if (!capturedDetail)
    throw new Error("Native preview detail was not captured.");
  expect(capturedDetail).toMatchObject({
    executable: "a3s-webview",
    height: 700,
    title: "A3S responsive preview",
    width: 500,
  });
  expect(capturedDetail.args).toEqual([
    "--url",
    capturedDetail.url,
    "--width",
    "500",
    "--height",
    "700",
    "--title",
    "A3S responsive preview",
  ]);
  await expect(status).toHaveText("Native preview requested.");

  await simulator.getByRole("button", { name: "Native preview" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("a3s-webview");
  await expect(status).toHaveText("Native preview command copied.");

  const refreshContract = await simulator.evaluate((element) => {
    const root = element as HTMLElement & {
      refresh?: () => void;
      refreshPreview?: () => void;
    };
    const before = root.querySelector<HTMLIFrameElement>(
      "[data-device-simulator-preview]",
    )?.src;
    const runtime = (
      window as unknown as {
        a3sUI?: { refresh: (target: Element) => void };
      }
    ).a3sUI;
    runtime?.refresh(root);
    const after = root.querySelector<HTMLIFrameElement>(
      "[data-device-simulator-preview]",
    )?.src;
    return {
      hasLegacyRefresh: typeof root.refresh === "function",
      hasPreviewRefresh: typeof root.refreshPreview === "function",
      preservedUrl: before === after,
    };
  });
  expect(refreshContract).toEqual({
    hasLegacyRefresh: false,
    hasPreviewRefresh: true,
    preservedUrl: true,
  });

  await preset.selectOption("pixel-8");
  await testInfo.attach("device-simulator-phone", {
    body: await simulator.screenshot(),
    contentType: "image/png",
  });
  await simulator
    .locator('[data-device-simulator-orientation-value="landscape"]')
    .click();
  const landscapePhoneShell = await simulator.evaluate((element) => {
    const frame = element.querySelector<HTMLElement>(
      "[data-device-simulator-frame]",
    )!;
    const sensor = getComputedStyle(frame, "::before");
    const gesture = getComputedStyle(frame, "::after");
    const iframe = element.querySelector<HTMLElement>(
      "[data-device-simulator-preview]",
    )!;
    return {
      frame: { height: frame.offsetHeight, width: frame.offsetWidth },
      gesture: {
        height: gesture.height,
        right: gesture.right,
        width: gesture.width,
      },
      preview: {
        height: iframe.clientHeight,
        left: iframe.offsetLeft,
        top: iframe.offsetTop,
        width: iframe.clientWidth,
      },
      sensor: { height: sensor.height, left: sensor.left, width: sensor.width },
    };
  });
  expect(landscapePhoneShell.frame).toEqual({ height: 432, width: 935 });
  expect(landscapePhoneShell.preview).toEqual({
    height: 412,
    left: 10,
    top: 10,
    width: 915,
  });
  expect(landscapePhoneShell.sensor).toEqual({
    height: "18px",
    left: "20px",
    width: "18px",
  });
  expect(landscapePhoneShell.gesture).toEqual({
    height: "112px",
    right: "20px",
    width: "5px",
  });
  await testInfo.attach("device-simulator-phone-landscape-shell", {
    body: await simulator.screenshot(),
    contentType: "image/png",
  });
});

test("Button Group preserves joined edges, constrained labels, and split-menu focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openComponent(page, "button-group");

  const preview = page
    .locator(".a3s-preview[data-preview-component=button-group]")
    .first();
  const primaryGroup = preview.locator(".button-group").first();
  const primaryButtons = primaryGroup.locator(":scope > .btn");
  await primaryButtons.first().hover();
  await page.waitForTimeout(200);
  const [hoveredBox, neighborBox] = await Promise.all([
    primaryButtons.first().boundingBox(),
    primaryButtons.nth(1).boundingBox(),
  ]);
  expect(hoveredBox).not.toBeNull();
  expect(neighborBox).not.toBeNull();
  expect(hoveredBox!.y).toBeCloseTo(neighborBox!.y, 1);

  const alignmentIssues = await page
    .locator(".a3s-preview[data-preview-component=button-group]")
    .evaluateAll((previews) =>
      previews.flatMap((preview, previewIndex) => {
        const previewRect = preview.getBoundingClientRect();
        return [
          ...preview.querySelectorAll<HTMLElement>(".button-group"),
        ].flatMap((group, groupIndex) => {
          const groupRect = group.getBoundingClientRect();
          const vertical = group.dataset.orientation === "vertical";
          const issues: string[] = [];

          if (
            groupRect.left < previewRect.left - 1 ||
            groupRect.right > previewRect.right + 1
          ) {
            issues.push("overflows its preview width");
          }

          for (const child of [...group.children] as HTMLElement[]) {
            if (child.matches('hr[role="separator"]')) continue;
            const control = child.matches(".dropdown-menu,.popover,.select")
              ? child.querySelector<HTMLElement>(":scope > button")
              : child;
            if (!control) continue;

            const controlRect = control.getBoundingClientRect();
            const aligned = vertical
              ? Math.abs(controlRect.left - groupRect.left) <= 1 &&
                Math.abs(controlRect.right - groupRect.right) <= 1
              : Math.abs(controlRect.top - groupRect.top) <= 1 &&
                Math.abs(controlRect.bottom - groupRect.bottom) <= 1;
            if (!aligned) {
              issues.push(
                `${child.tagName.toLowerCase()}.${child.className} is ${controlRect.width}x${controlRect.height} inside ${groupRect.width}x${groupRect.height}`,
              );
            }
          }

          return issues.map(
            (issue) => `preview ${previewIndex}, group ${groupIndex}: ${issue}`,
          );
        });
      }),
    );
  expect(alignmentIssues).toEqual([]);

  const defaultIconSizes = await page
    .locator(
      '.button-group > .btn[data-size="icon"], .button-group > :is(.dropdown-menu, .popover) > .btn[data-size="icon"]',
    )
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return { height: rect.height, width: rect.width };
      }),
    );
  expect(defaultIconSizes.length).toBeGreaterThan(0);
  for (const size of defaultIconSizes) {
    expect(size.height).toBeCloseTo(36, 0);
    expect(size.width).toBeCloseTo(36, 0);
  }

  const constrained = page.locator("[data-button-group-long-labels=en]");
  const constrainedButtons = constrained.locator(":scope > .btn");
  const constrainedGeometry = await constrained.evaluate((group) => {
    const groupRect = group.getBoundingClientRect();
    const canvasRect = group
      .closest<HTMLElement>(".a3s-preview__canvas")!
      .getBoundingClientRect();
    const buttons = [...group.querySelectorAll<HTMLElement>(":scope > .btn")];
    const heights = buttons.map(
      (button) => button.getBoundingClientRect().height,
    );
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      groupInsideCanvas:
        groupRect.left >= canvasRect.left - 1 &&
        groupRect.right <= canvasRect.right + 1,
      heightDelta: Math.max(...heights) - Math.min(...heights),
    };
  });
  await expect(constrainedButtons).toHaveCount(3);
  expect(constrainedGeometry.groupInsideCanvas).toBe(true);
  expect(constrainedGeometry.heightDelta).toBeLessThanOrEqual(1);
  expect(constrainedGeometry.documentScrollWidth).toBeLessThanOrEqual(
    constrainedGeometry.documentClientWidth + 1,
  );

  const seam = await constrainedButtons.first().evaluate(
    (left, right) => {
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      const leftStyle = getComputedStyle(left);
      const rightStyle = getComputedStyle(right);
      return {
        gap: rightRect.left - leftRect.right,
        leftEndRadius: leftStyle.borderEndEndRadius,
        rightBorderStart: rightStyle.borderInlineStartWidth,
        rightStartRadius: rightStyle.borderStartStartRadius,
      };
    },
    await constrainedButtons.nth(1).elementHandle(),
  );
  expect(seam.gap).toBeCloseTo(0, 1);
  expect(seam.leftEndRadius).toBe("0px");
  expect(seam.rightBorderStart).toBe("0px");
  expect(seam.rightStartRadius).toBe("0px");

  const menuTrigger = page.locator("#button-group-publish-trigger-en");
  const menuRoot = page.locator("#button-group-publish-menu-en");
  await expect
    .poll(() =>
      menuRoot.evaluate((element) =>
        ["close", "open", "refresh", "toggle"].every(
          (method) =>
            typeof (element as HTMLElement & Record<string, unknown>)[
              method
            ] === "function",
        ),
      ),
    )
    .toBe(true);
  await menuRoot.evaluate((element) => {
    const controller = element as HTMLElement & {
      open(initialSelection?: false | "first" | "last"): void;
      refresh(): void;
    };
    controller.refresh();
    controller.open("first");
  });
  await expect(menuTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#button-group-publish-popover-en")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(menuTrigger).toBeFocused();

  const previews = page.locator(
    ".a3s-preview[data-preview-component=button-group]",
  );
  await expect(previews.nth(2)).toHaveScreenshot(
    "button-group-split-office.png",
  );
  await expect(previews.nth(3)).toHaveScreenshot(
    "button-group-long-labels-office.png",
  );
});

test("Popover uses Office spacing and deterministic focus lifecycle", async ({
  page,
}) => {
  await openComponent(page, "popover");

  const trigger = page.locator("#demo-popover-trigger");
  const popover = page.locator("#demo-popover-popover");
  const firstInput = page.locator("#demo-popover-width");
  await trigger.click();
  await waitForSettledFrames(page);
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id))
    .toBe("demo-popover-width");

  const geometry = await popover.evaluate((element) => {
    const trigger = document.getElementById("demo-popover-trigger")!;
    const rect = element.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      gap: rect.top - triggerRect.bottom,
      paddingInline: Number.parseFloat(style.paddingInlineStart),
      viewportBottom: innerHeight - rect.bottom,
      viewportLeft: rect.left,
      viewportRight: innerWidth - rect.right,
      viewportTop: rect.top,
    };
  });
  expect(geometry.gap).toBeGreaterThanOrEqual(7.75);
  expect(geometry.gap).toBeLessThanOrEqual(8.25);
  expect(geometry.paddingInline).toBeCloseTo(12, 0);
  expect(
    Math.min(geometry.viewportLeft, geometry.viewportRight),
  ).toBeGreaterThanOrEqual(7);
  expect(geometry.viewportTop).toBeGreaterThanOrEqual(7);
  expect(geometry.viewportBottom).toBeGreaterThanOrEqual(7);

  await firstInput.fill("72%");
  await expect(firstInput).toHaveValue("72%");
  await expect(popover).toHaveScreenshot("popover-open-office.png");
  await page.keyboard.press("Escape");
  await expect(popover).toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();

  const root = page.locator("#demo-popover");
  await expect
    .poll(() =>
      root.evaluate((element) =>
        ["close", "open", "refresh", "toggle"].every(
          (method) =>
            typeof (element as HTMLElement & Record<string, unknown>)[
              method
            ] === "function",
        ),
      ),
    )
    .toBe(true);
  await root.evaluate((element) => {
    const controller = element as HTMLElement & {
      open(focus?: boolean): void;
      refresh(): void;
    };
    controller.refresh();
    controller.open(false);
  });
  await expect(popover).toHaveAttribute("aria-hidden", "false");
  await root.evaluate((element) => {
    (element as HTMLElement & { toggle(focus?: boolean): void }).toggle(false);
  });
  await expect(popover).toHaveAttribute("aria-hidden", "true");

  await page.evaluate(() => {
    const outside = document.createElement("button");
    outside.id = "popover-outside-target";
    outside.textContent = "Outside target";
    outside.style.position = "fixed";
    outside.style.inset = "auto auto 4px 4px";
    outside.style.zIndex = "1000";
    document.body.append(outside);
  });
  await trigger.click();
  await page.locator("#popover-outside-target").click();
  await expect(popover).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#popover-outside-target")).toBeFocused();
});

test("Dialog removes double padding and restores trigger focus", async ({
  page,
}) => {
  await openComponent(page, "dialog");

  const compact = page.viewportSize()!.width <= 520;
  const trigger = page.getByRole("button", { name: "Open Dialog" }).first();
  const dialog = page.locator("#demo-dialog-edit-profile");
  await trigger.click();
  const geometry = await dialog.evaluate((element) => {
    const panel = element.firstElementChild!;
    const header = panel.querySelector(":scope > header")!;
    const section = panel.querySelector(":scope > section")!;
    const footer = panel.querySelector(":scope > footer")!;
    const panelRect = panel.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const sectionStyle = getComputedStyle(section);
    const panelStyle = getComputedStyle(panel);
    const footerStyle = getComputedStyle(footer);
    return {
      footerDirection: footerStyle.flexDirection,
      footerInset: footer.getBoundingClientRect().left - panelRect.left,
      headerInset: headerRect.left - panelRect.left,
      headerPadding: Number.parseFloat(
        getComputedStyle(header).paddingInlineStart,
      ),
      panelPadding: panelStyle.padding,
      panelWidth: panelRect.width,
      sectionInset: section.getBoundingClientRect().left - panelRect.left,
      sectionOverflow: sectionStyle.overflowY,
    };
  });
  expect(geometry.panelPadding).toBe("0px");
  expect(geometry.headerInset).toBeCloseTo(1, 0);
  expect(geometry.sectionInset).toBeCloseTo(1, 0);
  expect(geometry.footerInset).toBeCloseTo(1, 0);
  expect(geometry.headerPadding).toBe(compact ? 16 : 24);
  expect(geometry.footerDirection).toBe("row");
  expect(geometry.sectionOverflow).toBe("auto");
  expect(geometry.panelWidth).toBeLessThanOrEqual(440);

  const nameInput = page.locator("#demo-dialog-edit-profile-name");
  await nameInput.fill("A3S Operator");
  await expect(nameInput).toHaveValue("A3S Operator");
  await expect(dialog.locator(":scope > *")).toHaveScreenshot(
    "dialog-open-office.png",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toHaveAttribute("open", "");
  await expect(trigger).toBeFocused();
});

test("Alert Dialog keeps Office width, semantics, and horizontal actions", async ({
  page,
}) => {
  await openComponent(page, "alert-dialog");

  const compact = page.viewportSize()!.width <= 520;
  const trigger = page.getByRole("button", { name: "Show Dialog" }).first();
  const dialog = page.locator("#demo-alert-dialog");
  await trigger.click();
  await expect(dialog).toHaveAttribute("role", "alertdialog");
  const geometry = await dialog.evaluate((element) => {
    const panel = element.firstElementChild!;
    const header = panel.querySelector(":scope > header")!;
    const footer = panel.querySelector(":scope > footer")!;
    const panelRect = panel.getBoundingClientRect();
    return {
      footerDirection: getComputedStyle(footer).flexDirection,
      headerInset: header.getBoundingClientRect().left - panelRect.left,
      panelPadding: getComputedStyle(panel).padding,
      textAlign: getComputedStyle(header).textAlign,
      width: (panel as HTMLElement).offsetWidth,
    };
  });
  expect(geometry.panelPadding).toBe("0px");
  expect(geometry.headerInset).toBeCloseTo(1, 0);
  expect(geometry.footerDirection).toBe("row");
  expect(["left", "start"]).toContain(geometry.textAlign);
  expect(geometry.width).toBeCloseTo(compact ? 370 : 440, 0);

  const cancel = dialog.getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeFocused();
  await expect(dialog.locator(":scope > *")).toHaveScreenshot(
    "alert-dialog-open-office.png",
  );
  await cancel.click();
  await expect(dialog).not.toHaveAttribute("open", "");
  await expect(trigger).toBeFocused();
});

test("Drawer keeps a bounded Office sheet and returns focus after close", async ({
  page,
}) => {
  await openComponent(page, "drawer");

  const trigger = page.getByRole("button", { name: "Open Drawer" }).first();
  const drawer = page.locator("#demo-drawer");
  await trigger.click();
  await expect
    .poll(() =>
      drawer.evaluate((element) =>
        Math.abs(
          innerHeight -
            element.firstElementChild!.getBoundingClientRect().bottom,
        ),
      ),
    )
    .toBeLessThanOrEqual(1);
  const geometry = await drawer.evaluate((element) => {
    const panel = element.firstElementChild!;
    const section = panel.querySelector(":scope > section")!;
    const footer = panel.querySelector(":scope > footer")!;
    const panelRect = panel.getBoundingClientRect();
    const panelStyle = getComputedStyle(panel);
    return {
      bottom: innerHeight - panelRect.bottom,
      bottomLeftRadius: panelStyle.borderBottomLeftRadius,
      bottomRightRadius: panelStyle.borderBottomRightRadius,
      footerDirection: getComputedStyle(footer).flexDirection,
      footerGap: getComputedStyle(footer).gap,
      maxHeight: panelRect.height / innerHeight,
      sectionOverflow: getComputedStyle(section).overflowY,
      topLeftRadius: panelStyle.borderTopLeftRadius,
    };
  });
  expect(Math.abs(geometry.bottom)).toBeLessThanOrEqual(0.5);
  expect(geometry.bottomLeftRadius).toBe("0px");
  expect(geometry.bottomRightRadius).toBe("0px");
  expect(geometry.topLeftRadius).toBe("12px");
  expect(geometry.footerDirection).toBe("row");
  expect(geometry.footerGap).toBe("8px");
  expect(geometry.maxHeight).toBeLessThanOrEqual(0.8);
  expect(geometry.sectionOverflow).toBe("auto");

  await expect(drawer.locator(":scope > *")).toHaveScreenshot(
    "drawer-open-office.png",
  );

  await drawer.getByRole("button", { name: "Cancel" }).click();
  await expect(drawer).not.toHaveAttribute("open", "");
  await expect(trigger).toBeFocused();
});
