import { expect, test, type Page } from '@playwright/test';

async function openComponent(page: Page, component: string) {
  await page.goto(`en/components/${component}.html`);
  await page.evaluate(() => document.fonts.ready);
}

async function readBox(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

test('App Shell keeps Office navigation geometry and a contained mobile drawer', async ({
  page,
}) => {
  const compact = page.viewportSize()!.width <= 768;
  await openComponent(page, 'app-shell');

  const preview = page.locator(
    '.a3s-preview[data-preview-component=app-shell]',
  );
  const shell = preview.locator('.app-shell');
  const navigation = shell.locator(':scope > [data-app-navigation]');
  const main = shell.locator(':scope > [data-app-main]');
  const toggle = shell.locator('[data-app-navigation-trigger]');
  const [shellBox, navigationBox, mainBox] = await Promise.all([
    readBox(page, '.a3s-preview[data-preview-component=app-shell] .app-shell'),
    navigation.boundingBox(),
    main.boundingBox(),
  ]);
  expect(navigationBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(shellBox.height).toBeGreaterThanOrEqual(479);
  expect(shellBox.height).toBeLessThanOrEqual(481);

  if (!compact) {
    expect(navigationBox!.width).toBeLessThanOrEqual(shellBox.width * 0.39);
    expect(mainBox!.width).toBeGreaterThanOrEqual(shellBox.width * 0.6);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAccessibleName('Collapse navigation');

    await toggle.click();
    await expect(shell).toHaveAttribute('data-navigation', 'collapsed');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAccessibleName('Expand navigation');
    const collapsedNavigationBox = await navigation.boundingBox();
    expect(collapsedNavigationBox).not.toBeNull();
    expect(collapsedNavigationBox!.width).toBeGreaterThanOrEqual(45);
    expect(collapsedNavigationBox!.width).toBeLessThanOrEqual(47);
    await expect(preview).toHaveScreenshot('app-shell-office.png');

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAccessibleName('Open navigation');
  } else {
    await expect(navigation).toHaveCSS('position', 'absolute');
    await expect(navigation).toHaveCSS('visibility', 'hidden');
    await expect(navigation).toHaveCSS('pointer-events', 'none');
    await expect(navigation).toHaveAttribute('inert', '');
    await expect(navigation).toHaveAttribute('aria-hidden', 'true');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAccessibleName('Open navigation');
    expect(navigationBox!.y).toBeCloseTo(shellBox.y, 0);
    expect(navigationBox!.height).toBeCloseTo(shellBox.height, 0);

    await toggle.click();
    await expect(shell).toHaveAttribute('data-mobile-navigation', 'open');
    await expect(navigation).toHaveCSS('visibility', 'visible');
    await expect(navigation).toHaveCSS('pointer-events', 'auto');
    await expect(navigation).not.toHaveAttribute('inert', '');
    await expect(navigation).not.toHaveAttribute('aria-hidden', 'true');
    await expect(navigation).toHaveCSS('opacity', '1');
    await expect(toggle).toHaveAccessibleName('Close navigation');
    await expect(navigation.getByRole('link').first()).toBeFocused();
    const [openShellBox, openNavigationBox] = await Promise.all([
      shell.boundingBox(),
      navigation.boundingBox(),
    ]);
    expect(openShellBox).not.toBeNull();
    expect(openNavigationBox).not.toBeNull();
    expect(openNavigationBox!.x).toBeCloseTo(openShellBox!.x, 0);
    expect(openNavigationBox!.height).toBeCloseTo(shellBox.height, 0);
    await expect(preview).toHaveScreenshot('app-shell-office.png');

    await page.keyboard.press('Escape');
    await expect(shell).not.toHaveAttribute('data-mobile-navigation', 'open');
    await expect(navigation).toHaveCSS('visibility', 'hidden');
    await expect(toggle).toBeFocused();
  }
});

test('Activity Bar keeps a compact command rhythm and updates its current item', async ({
  page,
}) => {
  await openComponent(page, 'activity-bar');

  const preview = page.locator(
    '.a3s-preview[data-preview-component=activity-bar]',
  );
  const activityBar = preview.locator('.activity-bar');
  const header = activityBar.locator(':scope > header');
  const footer = activityBar.locator(':scope > footer');
  const overview = activityBar.locator('a[href="#activity-overview"]');
  const traces = activityBar.locator('a[href="#activity-traces"]');
  const [barBox, headerBox, footerBox, overviewBox] = await Promise.all([
    activityBar.boundingBox(),
    header.boundingBox(),
    footer.boundingBox(),
    overview.boundingBox(),
  ]);
  expect(barBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(overviewBox).not.toBeNull();
  expect(headerBox!.height).toBeGreaterThanOrEqual(39);
  expect(headerBox!.height).toBeLessThanOrEqual(41);
  expect(overviewBox!.height).toBeGreaterThanOrEqual(37);
  expect(overviewBox!.height).toBeLessThanOrEqual(39);
  const footerInset =
    barBox!.y + barBox!.height - (footerBox!.y + footerBox!.height);
  expect(footerInset).toBeGreaterThanOrEqual(11);
  expect(footerInset).toBeLessThanOrEqual(13);

  const currentTreatment = await overview.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      fontWeight: Number.parseInt(style.fontWeight, 10),
    };
  });
  expect(currentTreatment.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(currentTreatment.fontWeight).toBeGreaterThanOrEqual(600);

  await traces.click();
  await expect(traces).toHaveAttribute('aria-current', 'page');
  await expect(overview).not.toHaveAttribute('aria-current', 'page');
  await expect(traces).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(preview).toHaveScreenshot('activity-bar-office.png');
});

test('Workspace Header stays at the Office title-bar height without MDX typography leakage', async ({
  page,
}) => {
  if (page.viewportSize()!.width <= 768) {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await openComponent(page, 'workspace-header');

  const preview = page.locator(
    '.a3s-preview[data-preview-component=workspace-header]',
  );
  const header = preview.locator('.workspace-header');
  const title = header.locator('[data-workspace-identity] > h1');
  const metadata = header.locator('[data-workspace-identity] > span');
  const deploy = header.getByRole('button', { name: 'Deploy' });
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.height).toBeGreaterThanOrEqual(49);
  expect(headerBox!.height).toBeLessThanOrEqual(51);
  await expect(title).toHaveCSS('font-size', '13px');
  await expect(title).toHaveCSS('line-height', '20px');
  await expect(metadata).toHaveCSS('font-size', '11px');
  await expect(deploy).toBeVisible();
  expect(
    await header.evaluate((element) => element.scrollWidth),
  ).toBeLessThanOrEqual(
    await header.evaluate((element) => element.clientWidth),
  );

  if (page.viewportSize()!.width <= 640) {
    const secondaryActions = header.locator('[data-collapse="mobile"]');
    await expect(secondaryActions).toHaveCount(2);
    for (const secondaryAction of await secondaryActions.all()) {
      await expect(secondaryAction).toBeHidden();
    }
  } else {
    await expect(header.getByText('Healthy', { exact: true })).toBeVisible();
    await expect(
      header.getByRole('button', { name: 'Validate' }),
    ).toBeVisible();
  }

  await expect(preview).toHaveScreenshot('workspace-header-office.png');
});

test('Toolbar preserves Office command sizes and scrolls without shrinking controls', async ({
  page,
}) => {
  if (page.viewportSize()!.width <= 768) {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await openComponent(page, 'toolbar');

  const preview = page.locator('.a3s-preview[data-preview-component=toolbar]');
  const toolbar = preview.locator('.toolbar');
  const bold = toolbar.getByRole('button', { name: 'Bold' });
  const code = toolbar.getByRole('button', { name: 'Code' });
  const [toolbarBox, firstButtonBox] = await Promise.all([
    toolbar.boundingBox(),
    toolbar.getByRole('button').first().boundingBox(),
  ]);
  expect(toolbarBox).not.toBeNull();
  expect(firstButtonBox).not.toBeNull();
  expect(toolbarBox!.height).toBeGreaterThanOrEqual(42);
  expect(toolbarBox!.height).toBeLessThanOrEqual(44);
  expect(firstButtonBox!.width).toBeGreaterThanOrEqual(28);
  expect(firstButtonBox!.width).toBeLessThanOrEqual(30);
  expect(firstButtonBox!.height).toBeGreaterThanOrEqual(28);
  expect(firstButtonBox!.height).toBeLessThanOrEqual(30);
  await expect(toolbar).toHaveCSS('overflow-y', 'hidden');

  await bold.click();
  await expect(bold).toHaveAttribute('aria-pressed', 'true');
  await expect(preview).toHaveScreenshot('toolbar-office.png');

  if (page.viewportSize()!.width <= 640) {
    const dimensions = await toolbar.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
    await code.focus();
    await expect(code).toBeFocused();
    await expect
      .poll(() => toolbar.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
  }
});
