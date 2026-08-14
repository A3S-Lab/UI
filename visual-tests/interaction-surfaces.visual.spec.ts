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
    input.value = String(nextValue);
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

  const slider = page
    .locator(".a3s-preview[data-preview-component=slider]")
    .first()
    .locator('input[type="range"]');
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

  const rtlSlider = page.locator('[data-slider-demo="standalone"][dir="rtl"]');
  await setSliderValue(rtlSlider, 80);
  await expect
    .poll(async () => await readSliderFillState(rtlSlider))
    .toMatchObject({
      direction: "rtl",
      fillOffset: -4.2,
      value: "80",
      valuePercent: "80%",
    });
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
  await expect(englishPreview).toHaveAttribute(
    "aria-label",
    "Interactive component preview",
  );
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
  await expect(chinesePreview).toHaveAttribute("aria-label", "交互式组件预览");
  await expect(chinesePreview.locator(".a3s-preview__header")).toContainText(
    "实时预览",
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
  const sourceDetails = htmlPreview.locator(
    "details[data-preview-source-panel]",
  );
  const sourceSummary = sourceDetails.getByText("View source", {
    exact: true,
  });
  await expect(htmlPreview).toHaveAttribute("data-preview-source", "ready");
  await expect(sourceDetails).not.toHaveAttribute("open", "");
  await sourceSummary.click();
  await expect(sourceDetails).toHaveAttribute("open", "");
  await expect(sourceDetails).toContainText('<button type="button"');
  await expect(sourceDetails).toContainText('class="btn"');
  await expect(sourceDetails).toContainText('data-variant="outline"');
  await expect(htmlPreview.locator("[data-reactroot]")).toHaveCount(0);
  await expect
    .poll(() => sourceDetails.locator(".line span[style]").count())
    .toBeGreaterThan(0);

  const copyButton = sourceDetails.locator(".rp-code-copy-button");
  await expect(copyButton).toHaveAccessibleName("Copy code");
  await copyButton.click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('class="btn"');

  await sourceDetails.locator("summary").focus();
  await page.keyboard.press("Space");
  await expect(sourceDetails).not.toHaveAttribute("open", "");
  await expect(
    htmlPreview.getByRole("button", { name: "Button", exact: true }),
  ).toBeVisible();

  await openComponent(page, "slider");
  const reactPreview = page
    .locator(
      '.a3s-preview[data-preview-component=slider]:has([data-slider-demo="standalone"])',
    )
    .first();
  const reactSource = reactPreview.locator(
    "details[data-preview-source-panel]",
  );
  await reactSource.locator("summary").click();
  await expect(reactSource).toContainText('type="range"');
  await expect(reactSource).not.toContainText("SliderDemo");
  await expect(reactSource).not.toContainText("data-range-initialized");

  await page.goto("components/button.html", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const chinesePreview = page
    .locator(".a3s-preview[data-preview-component=button]")
    .first();
  await expect(
    chinesePreview.locator("details[data-preview-source-panel] > summary"),
  ).toContainText("查看源码");
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

  await preset.selectOption("laptop");
  await expect(simulator).toHaveAttribute("data-device-kind", "desktop");
  await expect(simulator).toHaveAttribute("data-orientation", "landscape");
  await expect(width).toHaveValue("1440");
  await expect(height).toHaveValue("900");

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
});

test("Button Group preserves joined edges while hovering and nesting", async ({
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

  const nested = page.getByRole("group", { name: "Pagination controls" });
  const pageFive = nested.getByRole("button", { name: "5", exact: true });
  const previous = nested.getByRole("button", { name: "Previous page" });
  const seam = await pageFive.evaluate(
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
    await previous.elementHandle(),
  );
  expect(seam.gap).toBeCloseTo(8, 1);
  expect(Number.parseFloat(seam.leftEndRadius)).toBeGreaterThan(0);
  expect(seam.rightBorderStart).toBe("1px");
  expect(Number.parseFloat(seam.rightStartRadius)).toBeGreaterThan(0);

  const menuTrigger = page.locator("#dropdown-menu-609880-trigger");
  const menuRoot = page.locator("#dropdown-menu-609880");
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
  await expect(page.locator("#dropdown-menu-609880-popover")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(menuTrigger).toBeFocused();

  const previews = page.locator(
    ".a3s-preview[data-preview-component=button-group]",
  );
  await expect(previews.nth(2)).toHaveScreenshot(
    "button-group-sizes-office.png",
  );
  await expect(previews.nth(7)).toHaveScreenshot(
    "button-group-input-office.png",
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
