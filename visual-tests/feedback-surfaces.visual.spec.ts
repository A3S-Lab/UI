import { expect, test, type Page } from "@playwright/test";

type ToastHost = HTMLElement & {
  toast: (config?: Record<string, unknown>) => HTMLElement;
};

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

test("Card fills its preview and applies a genuinely compact small size", async ({
  page,
}) => {
  await openComponent(page, "card");

  const cards = page.locator(
    '.a3s-preview[data-preview-component="card"] .a3s-preview__canvas > .card',
  );
  await expect(cards).toHaveCount(4);

  const geometry = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const card = element as HTMLElement;
      const canvas = card.parentElement!;
      const header = card.querySelector<HTMLElement>(":scope > header")!;
      const section = card.querySelector<HTMLElement>(":scope > section");
      const action = header.querySelector<HTMLElement>(
        ":scope > .card-action, :scope > [data-slot='card-action']",
      );
      const title = header.querySelector<HTMLElement>(
        ":scope > h2, :scope > h3, :scope > .card-title, :scope > [data-title]",
      );
      const cardRect = card.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const actionRect = action?.getBoundingClientRect();
      const titleRect = title?.getBoundingClientRect();
      const direction = getComputedStyle(card).direction;
      const headerStyle = getComputedStyle(header);
      const sectionStyle = section ? getComputedStyle(section) : null;
      const sectionContentStyle = section?.firstElementChild
        ? getComputedStyle(section.firstElementChild)
        : null;

      return {
        actionGap:
          actionRect && titleRect
            ? direction === "rtl"
              ? titleRect.left - actionRect.right
              : actionRect.left - titleRect.right
            : null,
        cardWidth: cardRect.width,
        canvasWidth: canvasRect.width,
        headerPaddingBlock: Number.parseFloat(headerStyle.paddingTop),
        headerPaddingInline: Number.parseFloat(headerStyle.paddingLeft),
        horizontalOverflow: card.scrollWidth - card.clientWidth,
        sectionPaddingBlockEnd: sectionStyle
          ? Number.parseFloat(sectionStyle.paddingBottom)
          : null,
        sectionContentMargin: sectionContentStyle?.margin ?? null,
        size: card.dataset.size ?? "default",
      };
    }),
  );

  for (const card of geometry) {
    expect(Math.abs(card.cardWidth - card.canvasWidth)).toBeLessThanOrEqual(
      0.5,
    );
    expect(card.horizontalOverflow).toBeLessThanOrEqual(0);
    if (card.sectionContentMargin !== null) {
      expect(card.sectionContentMargin).toBe("0px");
    }
    if (card.actionGap !== null) {
      expect(card.actionGap).toBeGreaterThanOrEqual(8);
    }
  }

  const regular = geometry.find((card) => card.size === "default")!;
  const small = geometry.find((card) => card.size === "sm")!;
  expect(small.headerPaddingBlock).toBeLessThan(regular.headerPaddingBlock);
  expect(small.headerPaddingInline).toBeLessThan(regular.headerPaddingInline);
  expect(small.sectionPaddingBlockEnd).toBeLessThan(
    regular.sectionPaddingBlockEnd!,
  );

  await expect(
    page.locator('.a3s-preview[data-preview-component="card"]').first(),
  ).toHaveScreenshot("card-office-layout.png");
});

test("Toast contains compact document-safe text and both actions", async ({
  page,
}) => {
  await openComponent(page, "toast");

  await page.evaluate(() => {
    const state = window as Window & {
      __toastActionCount?: number;
      __toastCancelCount?: number;
    };
    state.__toastActionCount = 0;
    state.__toastCancelCount = 0;
    const toaster = document.querySelector<ToastHost>("#toaster")!;
    toaster.toast({
      action: {
        label: "Undo",
        onClick: () => {
          state.__toastActionCount! += 1;
        },
      },
      cancel: {
        label: "Dismiss",
        onClick: () => {
          state.__toastCancelCount! += 1;
        },
      },
      category: "success",
      description:
        "Your workspace preferences and supercalifragilisticexpialidocious token are ready.",
      duration: -1,
      title: '<img data-injected src="x"> Settings saved',
    });
  });
  await waitForSettledFrames(page);

  const toast = page.locator("#toaster .toast").last();
  await expect(toast).toBeVisible();
  const metrics = await toast.evaluate((element) => {
    const content = element.querySelector<HTMLElement>(".toast-content")!;
    const title = content.querySelector<HTMLElement>("h2")!;
    const description = content.querySelector<HTMLElement>("p")!;
    const contentRect = content.getBoundingClientRect();
    const titleStyle = getComputedStyle(title);
    const descriptionStyle = getComputedStyle(description);
    return {
      actionCount: content.querySelectorAll(
        "footer [data-toast-action], footer [data-toast-cancel]",
      ).length,
      contentHeight: contentRect.height,
      descriptionMargin: descriptionStyle.margin,
      descriptionOverflowWrap: descriptionStyle.overflowWrap,
      descriptionWordBreak: descriptionStyle.wordBreak,
      injectedImageCount: title.querySelectorAll("img").length,
      titleFontSize: Number.parseFloat(titleStyle.fontSize),
      titleMargin: titleStyle.margin,
      titlePadding: titleStyle.padding,
      titleText: title.textContent,
    };
  });

  expect(metrics.actionCount).toBe(2);
  expect(metrics.contentHeight).toBeLessThanOrEqual(112);
  expect(metrics.descriptionMargin).toBe("0px");
  expect(metrics.descriptionOverflowWrap).toBe("anywhere");
  expect(metrics.descriptionWordBreak).toBe("normal");
  expect(metrics.injectedImageCount).toBe(0);
  expect(metrics.titleFontSize).toBeLessThanOrEqual(14);
  expect(metrics.titleMargin).toBe("0px");
  expect(metrics.titlePadding).toBe("0px");
  expect(metrics.titleText).toBe('<img data-injected src="x"> Settings saved');

  await expect(toast).toHaveScreenshot("toast-office-feedback.png");
  await toast.locator("[data-toast-action]").click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __toastActionCount?: number })
            .__toastActionCount,
      ),
    )
    .toBe(1);
  await expect(toast).toBeHidden();
});

test("Toast timeout pauses for keyboard focus and resumes on focusout", async ({
  page,
}) => {
  await openComponent(page, "toast");

  await page.evaluate(() => {
    document.querySelector<ToastHost>("#toaster")!.toast({
      cancel: { label: "Dismiss" },
      description: "This toast stays while its control has focus.",
      duration: 250,
      title: "Keyboard pause",
    });
  });

  const toast = page.locator("#toaster .toast").last();
  await toast.locator("[data-toast-cancel]").focus();
  await page.waitForTimeout(350);
  await expect(toast).toBeVisible();

  await page.locator(".a3s-preview button").first().focus();
  await expect(toast).toBeHidden({ timeout: 1_000 });
});

test("Multiple toasters keep hover pause state independent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await openComponent(page, "toast");

  await page.evaluate(() => {
    const secondary = document.createElement("div");
    secondary.id = "secondary-toaster";
    secondary.className = "toaster";
    secondary.dataset.align = "start";
    document.body.append(secondary);
    (
      window as Window & {
        basecoat: { init: (component: string) => void };
      }
    ).basecoat.init("toaster");
  });

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          typeof document.querySelector<ToastHost>("#secondary-toaster")?.toast,
      ),
    )
    .toBe("function");

  await page.evaluate(() => {
    const config = {
      cancel: { label: "Dismiss" },
      description: "Independent timeout state.",
      duration: 1_000,
      title: "Container timer",
    };
    document.querySelector<ToastHost>("#toaster")!.toast(config);
    document.querySelector<ToastHost>("#secondary-toaster")!.toast(config);
  });

  const primaryToast = page.locator("#toaster .toast").last();
  const secondaryToast = page.locator("#secondary-toaster .toast").last();
  await page.waitForTimeout(250);
  await primaryToast.hover();
  await page.waitForTimeout(900);
  await expect(primaryToast).toBeVisible();
  await expect(secondaryToast).toBeHidden();

  await page.locator(".a3s-preview button").first().hover();
  await expect(primaryToast).toBeHidden({ timeout: 1_000 });
});
