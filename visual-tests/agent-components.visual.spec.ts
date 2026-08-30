import { expect, test, type Locator, type Page } from "@playwright/test";

async function openComponent(page: Page, component: string) {
  if (page.viewportSize()!.width <= 768) {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.goto(`en/components/${component}.html`);
  await page.evaluate(() => document.fonts.ready);
  return page.locator(`.a3s-preview[data-preview-component=${component}]`);
}

async function requiredBox(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

test("Agent Workbench preserves region order and responsive geometry", async ({
  page,
}) => {
  const preview = await openComponent(page, "agent-workbench");
  const workbench = preview.locator(".agent-workbench");
  const context = workbench.locator(":scope > [data-agent-context]");
  const canvas = workbench.locator(":scope > [data-agent-canvas]");
  const inspector = workbench.locator(":scope > [data-agent-inspector]");
  const activity = workbench.locator(":scope > [data-agent-activity]");

  await expect(workbench).toHaveAccessibleName("Coding Agent workbench");
  expect(await canvas.evaluate((element) => element.tagName)).toBe("ARTICLE");
  await expect(preview.getByRole("main")).toHaveCount(0);
  await expect(
    canvas.getByRole("textbox", { name: "Agent configuration" }),
  ).toBeVisible();
  await expect(inspector.getByLabel("Provider")).toBeVisible();
  await expect(
    activity.getByRole("list", { name: "Execution activity" }),
  ).toBeVisible();

  const [workbenchBox, contextBox, canvasBox, inspectorBox, activityBox] =
    await Promise.all([
      requiredBox(workbench),
      requiredBox(context),
      requiredBox(canvas),
      requiredBox(inspector),
      requiredBox(activity),
    ]);

  if (workbenchBox.width < 532) {
    expect(contextBox.y).toBeLessThan(canvasBox.y);
    expect(canvasBox.y).toBeLessThan(inspectorBox.y);
    expect(inspectorBox.y).toBeLessThan(activityBox.y);
    for (const box of [contextBox, canvasBox, inspectorBox, activityBox]) {
      expect(box.x).toBeCloseTo(workbenchBox.x, 0);
      expect(box.width).toBeCloseTo(workbenchBox.width, 0);
    }
  } else if (workbenchBox.width < 784) {
    expect(contextBox.y).toBeCloseTo(canvasBox.y, 0);
    expect(contextBox.x).toBeLessThan(canvasBox.x);
    expect(inspectorBox.y).toBeGreaterThan(canvasBox.y);
    expect(inspectorBox.x).toBeCloseTo(workbenchBox.x, 0);
    expect(inspectorBox.width).toBeCloseTo(workbenchBox.width, 0);
  } else {
    expect(contextBox.x).toBeLessThan(canvasBox.x);
    expect(canvasBox.x).toBeLessThan(inspectorBox.x);
    expect(activityBox.y).toBeGreaterThan(canvasBox.y);
  }

  expect(activityBox.x).toBeCloseTo(workbenchBox.x, 0);
  expect(activityBox.y).toBeGreaterThan(inspectorBox.y);
  expect(activityBox.width).toBeCloseTo(workbenchBox.width, 0);

  const overflow = await workbench.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(preview).toHaveScreenshot("agent-workbench.png");
});

test("Agent Composer keeps context, queue, and submission controls bounded", async ({
  page,
}) => {
  const preview = await openComponent(page, "agent-composer");
  const composer = preview.locator("form.agent-composer");

  await expect(composer).toHaveAccessibleName("Message the coding agent");
  await expect(
    composer.getByRole("textbox", { name: "Instruction" }),
  ).toBeVisible();
  await expect(
    composer
      .getByRole("list", { name: "Attached context" })
      .locator(":scope > li"),
  ).toHaveCount(2);
  await expect(
    composer
      .getByRole("list", { name: "Queued messages" })
      .locator(":scope > li"),
  ).toHaveCount(1);
  await expect(
    composer.getByRole("button", { name: "Queue message" }),
  ).toBeVisible();

  const overflow = await composer.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("Agent Composer keeps a nested editor input bounded and internally scrollable", async ({
  page,
}) => {
  const preview = await openComponent(page, "agent-composer");
  await preview.evaluate((host) => {
    const form = document.createElement("form");
    form.className = "agent-composer";
    form.setAttribute("aria-label", "Nested editor composer");

    const editor = document.createElement("section");
    editor.className = "agent-composer-editor";
    editor.dataset.composerEditor = "";
    const message = document.createElement("p");
    message.dataset.composerEditorMessage = "";
    message.setAttribute("role", "status");
    message.textContent = "Drop a file here";
    const intermediate = document.createElement("div");
    const input = document.createElement("textarea");
    input.dataset.composerInput = "";
    input.setAttribute("aria-label", "Nested instruction");
    input.rows = 2;
    input.value = "long-unbroken-token-".repeat(400);
    intermediate.append(input);
    editor.append(message, intermediate);
    form.append(editor);
    host.append(form);
  });

  const composer = preview.locator("form[aria-label='Nested editor composer']");
  const editor = composer.locator("[data-composer-editor]");
  const input = composer.getByRole("textbox", { name: "Nested instruction" });
  await expect(input).toBeVisible();
  const [documentOverflow, composerOverflow, editorOverflow] = await Promise.all([
    page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
    composer.evaluate((element) => element.scrollWidth - element.clientWidth),
    editor.evaluate((element) => element.scrollWidth - element.clientWidth),
  ]);
  expect(documentOverflow).toBeLessThanOrEqual(0);
  expect(composerOverflow).toBeLessThanOrEqual(0);
  expect(editorOverflow).toBeLessThanOrEqual(0);

  const geometry = await input.evaluate((element) => {
    const parent = element.parentElement;
    const editor = parent?.parentElement;
    const style = getComputedStyle(element);
    return {
      editorMinWidth: editor ? getComputedStyle(editor).minWidth : "",
      inputOverflowY: style.overflowY,
      inputScrollHeight: element.scrollHeight,
      inputClientHeight: element.clientHeight,
      inputWidth: element.getBoundingClientRect().width,
      parentMinWidth: parent ? getComputedStyle(parent).minWidth : "",
      parentWidth: parent?.getBoundingClientRect().width ?? 0,
      wrap: style.overflowWrap,
    };
  });
  expect(geometry.editorMinWidth).toBe("0px");
  expect(geometry.parentMinWidth).toBe("0px");
  expect(geometry.inputWidth).toBeLessThanOrEqual(geometry.parentWidth);
  expect(geometry.inputOverflowY).toBe("auto");
  expect(geometry.inputScrollHeight).toBeGreaterThan(geometry.inputClientHeight);
  expect(geometry.wrap).toBe("anywhere");
});

test("Agent Transcript preserves chronological roles and bounded rich content", async ({
  page,
}) => {
  const preview = await openComponent(page, "agent-transcript");
  const transcript = preview.locator(".agent-transcript");
  const turns = transcript.locator("[data-transcript-viewport] > li");

  await expect(transcript).toHaveAccessibleName("Conversation");
  await expect(turns).toHaveCount(3);
  await expect(turns.nth(0)).toHaveAttribute("data-role", "user");
  await expect(turns.nth(1)).toHaveAttribute("data-role", "agent");
  await expect(turns.nth(2)).toHaveAttribute("data-role", "system");
  await expect(transcript.locator(".execution-item")).toHaveCount(1);
  await expect(
    transcript.locator("[data-transcript-viewport]"),
  ).toHaveAttribute("tabindex", "0");

  const overflow = await transcript.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("Execution Item exposes native disclosure and textual execution state", async ({
  page,
}) => {
  const preview = await openComponent(page, "execution-item");
  const items = preview.locator("details.execution-item");
  const running = items.first();

  await expect(items).toHaveCount(2);
  await expect(running).toHaveAttribute("open", "");
  await expect(running.locator("summary")).toContainText("Run focused tests");
  await expect(running.locator("[data-execution-status]")).toHaveText(
    "Running",
  );
  await running.locator("summary").click();
  await expect(running).not.toHaveAttribute("open", "");
  await running.locator("summary").focus();
  await expect(running.locator("summary")).toBeFocused();
});

test("Approval Request names the decision and groups permission scopes", async ({
  page,
}) => {
  const preview = await openComponent(page, "approval-request");
  const request = preview.locator(".approval-request");

  await expect(request).toHaveAccessibleName(
    "Allow a command outside the project?",
  );
  await expect(request).toHaveAttribute("data-state", "pending");
  await expect(
    request.getByRole("group", { name: "Permission scope" }),
  ).toBeVisible();
  await expect(request.getByRole("radio")).toHaveCount(2);
  await expect(
    request.getByRole("radio", { name: /Allow once/ }),
  ).toBeChecked();
  await expect(
    request.getByRole("button", { name: "Allow command" }),
  ).toBeVisible();
});

test("Brand Lockup preserves textual identity and compact proportions", async ({
  page,
}) => {
  const preview = await openComponent(page, "brand-lockup");
  const lockups = preview.locator(".brand-lockup");
  const linked = lockups.first();
  const compact = lockups.nth(1);

  await expect(lockups).toHaveCount(2);
  await expect(linked).toHaveAccessibleName("A3S OS home");
  await expect(linked.locator("[data-brand-name]")).toHaveText("A3S OS");
  await expect(compact.locator("[data-brand-name]")).toHaveText("A3S Cloud");
  await expect(compact.locator("[data-brand-description]")).toHaveText(
    "Control plane",
  );

  const [defaultMark, compactMark] = await Promise.all([
    requiredBox(linked.locator("[data-brand-mark]")),
    requiredBox(compact.locator("[data-brand-mark]")),
  ]);
  expect(defaultMark.width).toBeGreaterThan(compactMark.width);
  expect(defaultMark.height).toBeGreaterThan(compactMark.height);

  const overflow = await preview.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(preview).toHaveScreenshot("brand-lockup.png");

  await linked.focus();
  await expect(linked).toBeFocused();
  expect(
    await linked.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
});

test("Property List keeps native terms, definitions, and wrapping", async ({
  page,
}) => {
  const preview = await openComponent(page, "property-list");
  const list = preview.locator("dl.property-list");

  await expect(list.locator(":scope > div")).toHaveCount(4);
  await expect(list.locator("dt")).toHaveCount(4);
  await expect(list.locator("dd")).toHaveCount(4);
  await expect(list.locator("dt").first()).toHaveText("Provider");
  await expect(list.locator("dd").first()).toHaveText("A3S Code");
  await expect(list).toHaveCSS("display", "grid");

  const dimensions = await list.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await expect(preview).toHaveScreenshot("property-list.png");

  await list.locator("dd").last().evaluate((element) => {
    element.textContent = `sha256:${"0123456789abcdef".repeat(12)}`;
  });
  const stressed = await list.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(stressed.scrollWidth).toBeLessThanOrEqual(stressed.clientWidth);
});

test("Stepper keeps bounded process stages ordered and internally scrollable", async ({
  page,
}) => {
  const preview = await openComponent(page, "stepper");
  const stepper = preview.getByRole("list", {
    name: "Deployment convergence",
  });
  const stages = stepper.locator(":scope > li");
  const completed = stages.first();
  const current = stages.nth(2);
  const pending = stages.last();

  await expect(stages).toHaveCount(4);
  await expect(completed).toHaveAttribute("data-state", "success");
  await expect(current).toHaveAttribute("data-state", "active");
  await expect(current).toHaveAttribute("aria-current", "step");
  await expect(pending).not.toHaveAttribute("data-state", /.+/);
  await expect(stepper).toHaveCSS("display", "flex");
  await expect(stepper).toHaveCSS("overflow-x", "auto");

  const treatments = await Promise.all(
    [completed, current, pending].map((stage) =>
      stage.locator("[data-step-marker]").evaluate((element) => {
        const style = getComputedStyle(element);
        return `${style.color}|${style.backgroundColor}|${style.borderColor}`;
      }),
    ),
  );
  expect(new Set(treatments).size).toBe(3);

  const documentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(documentOverflow).toBeLessThanOrEqual(0);
  await expect(preview).toHaveScreenshot("stepper.png");

  await expect(stepper).toHaveAttribute("tabindex", "0");
  await stepper.focus();
  await expect(stepper).toBeFocused();
  expect(
    await stepper.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
});

test("Status Badge keeps operational states textual and visually distinct", async ({
  page,
}) => {
  const preview = await openComponent(page, "status-badge");
  const badges = preview.locator(".status-badge");

  await expect(badges).toHaveCount(5);
  await expect(badges).toHaveText([
    "Queued",
    "Running",
    "Completed",
    "Retrying",
    "Failed",
  ]);

  const treatments = await badges.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return `${style.color}|${style.backgroundColor}|${style.borderColor}`;
    }),
  );
  expect(new Set(treatments).size).toBe(5);

  const indicators = await badges.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element, "::before").content),
  );
  expect(indicators.every((content) => content !== "none")).toBe(true);
  await expect(preview).toHaveScreenshot("status-badge.png");
});

test("Timeline distinguishes completed and current semantic events", async ({
  page,
}) => {
  const preview = await openComponent(page, "timeline");
  const timeline = preview.getByRole("list", {
    name: "Agent execution history",
  });
  const completed = timeline.locator(":scope > li[data-state=success]");
  const current = timeline.locator(":scope > li[aria-current=step]");

  await expect(timeline.locator(":scope > li")).toHaveCount(3);
  await expect(current).toHaveAttribute("data-state", "active");
  const markerStyles = await Promise.all(
    [completed, current].map((item) =>
      item.evaluate((element) => {
        const style = getComputedStyle(element, "::before");
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
          content: style.content,
        };
      }),
    ),
  );
  expect(markerStyles[0].content).toContain("1");
  expect(markerStyles[1].content).toContain("2");
  expect(markerStyles[0].backgroundColor).not.toBe(
    markerStyles[1].backgroundColor,
  );
  expect(markerStyles[0].color).not.toBe(markerStyles[0].backgroundColor);
  await expect(preview).toHaveScreenshot("timeline.png");
});

test("Log Viewer bounds ordered records and preserves compact stream metadata", async ({
  page,
}) => {
  const phone = page.viewportSize()!.width <= 768;
  const preview = await openComponent(page, "log-viewer");
  const viewer = preview.locator(".log-viewer");
  const log = viewer.getByRole("log");

  await expect(viewer).toHaveAccessibleName("Build output");
  await expect(
    viewer.getByRole("group", { name: "Stream filter" }),
  ).toBeVisible();
  await expect(log).toHaveAccessibleName("Ordered build output");
  await expect(log).toHaveAttribute("tabindex", "0");
  await expect(
    viewer.getByRole("button", { name: "All" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    viewer.getByRole("button", { name: "stdout" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(log.locator("[data-log-record]")).toHaveCount(3);
  await expect(log.locator("[data-log-gap]")).toContainText("3 entries");
  await expect(log).toHaveCSS("overflow-y", "auto");
  await expect(log).toHaveCSS("background-color", "rgb(16, 24, 40)");

  const viewport = await requiredBox(log);
  expect(viewport.height).toBeGreaterThanOrEqual(176);
  expect(viewport.height).toBeLessThanOrEqual(256);
  if (phone) {
    const firstRecord = log.locator("[data-log-record]").first();
    await expect(firstRecord.locator("pre")).toHaveCSS("grid-column", "1 / -1");
  }
  await expect(preview).toHaveScreenshot("log-viewer.png");

  await log.focus();
  await expect(log).toBeFocused();
  expect(
    await log.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
  await log.locator("[data-log-record] pre").last().evaluate((element) => {
    element.textContent = "registry.connection.retry=".repeat(24);
  });
  const documentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(documentOverflow).toBeLessThanOrEqual(0);
});

test("Extracted components remain bounded with dark RTL presentation", async ({
  page,
}) => {
  test.slow();
  const routes = [
    "agent-workbench",
    "brand-lockup",
    "log-viewer",
    "property-list",
    "status-badge",
    "stepper",
    "timeline",
  ] as const;

  for (const route of routes) {
    await test.step(route, async () => {
      const preview = await openComponent(page, route);
      await preview.evaluate((element) => {
        document.documentElement.classList.add("dark", "rp-dark");
        document.documentElement.dir = "rtl";
        element.dir = "rtl";
      });
      const metrics = await preview.evaluate((element) => ({
        direction: getComputedStyle(element).direction,
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        previewOverflow: element.scrollWidth - element.clientWidth,
      }));
      expect(metrics.direction).toBe("rtl");
      expect(metrics.documentOverflow).toBeLessThanOrEqual(0);
      expect(metrics.previewOverflow).toBeLessThanOrEqual(0);
    });
  }
});
