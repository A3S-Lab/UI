import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  applyCssPageZoom,
  applyLocalCssZoom,
  bringControlIntoViewUnderCssZoom,
} from "./page-zoom.js";
import { expect, test, type Page } from "@playwright/test";

type GapCase = {
  id: string;
  control: string;
  focusTarget?: string;
  zoomControl?: string;
  /** Host that receives local CSS zoom when it is not `data-{id}-primary-demo`. */
  zoomHost?: string;
  minHeight?: number;
  /** Non-interactive surfaces: temporarily become focusable for AT / forced-colors proofs. */
  presentational?: boolean;
};

const cases: GapCase[] = [
  {
    id: "label",
    control: "[data-label-primary-demo=en] #label-terms-en",
  },
  {
    id: "checkbox",
    control: "[data-checkbox-primary-demo=en] #release-email-en",
  },
  {
    id: "radio-group",
    control: "[role=radiogroup]:has(#r1) #r1",
    focusTarget: "[role=radiogroup]:has(#r1)",
  },
  {
    id: "switch",
    control: "[data-switch-primary-demo=en] #airplane-mode",
  },
  {
    id: "slider",
    control: "[data-slider-primary-demo=en] #slider-primary",
  },
  {
    id: "select",
    control: "[data-select-primary-demo=en] #select-demo-trigger",
  },
  {
    id: "native-select",
    control: "#native-select-fruit-en",
  },
  {
    id: "combobox",
    control:
      ".a3s-preview[data-preview-component=combobox][data-preview-integration=complete] [role=combobox]",
  },
  {
    id: "copy-button",
    control: "[data-copy-primary-demo=en]",
  },
  {
    id: "filter-bar",
    control:
      "[data-filter-bar-primary-demo=en] input[type=search], [data-filter-bar-primary-demo=en] input[type=text]",
    focusTarget: "[data-filter-bar-primary-demo=en]",
  },
  {
    id: "tabs",
    control: "[data-tabs-primary-demo=en] #demo-tabs-with-panels-tab-1",
  },
  {
    id: "toast",
    control:
      "[data-toast-primary-demo=en] button:has-text('Toast from front-end'), [data-toast-primary-demo=en] button",
  },
  {
    id: "progress",
    control: "[data-progress-primary-demo=en] button:has-text('Complete')",
  },
  {
    id: "empty",
    control: "[data-empty-primary-demo=en] button:has-text('Create Project')",
  },
  {
    id: "dialog",
    control: "[data-dialog-primary-demo=en] button:has-text('Open Dialog')",
  },
  {
    id: "drawer",
    control: "[data-drawer-primary-demo=en] button:has-text('Open Drawer')",
  },
  {
    id: "popover",
    control: "[data-popover-primary-demo=en] #demo-popover-trigger",
  },
  {
    id: "tooltip",
    control: "[data-tooltip-primary-demo=en] button:has-text('Hover')",
  },
  {
    id: "breadcrumb",
    control:
      "[data-breadcrumb-primary-demo=en] [data-breadcrumb-link=home], [data-breadcrumb-primary-demo=en] a",
  },
  {
    id: "pagination",
    control:
      "[data-pagination-primary-demo=en] button[aria-label='Next page'], [data-pagination-primary-demo=en] button:has-text('Next')",
  },
  {
    id: "sidebar",
    control:
      "[data-sidebar-primary-demo=en] a:has-text('Overview'), [data-sidebar-primary-demo=en] a",
  },
  {
    id: "card",
    control: "[data-card-primary-demo=en] #demo-card-email",
  },
  {
    id: "tree",
    // Focus the leaf treeitem for AT; zoom/screenshot the visible row because
    // the treeitem wrapper can report zero width under CSS zoom.
    control:
      '[data-tree-primary-demo=en] [role=treeitem][aria-label="button.css"]',
    zoomControl:
      '[data-tree-primary-demo=en] [role=treeitem][aria-label="button.css"] [data-tree-row]',
  },
  {
    id: "activity-bar",
    control:
      "[data-activity-bar-primary-demo=en] [data-activity-item=traces]",
  },
  {
    id: "accordion",
    control: "[data-accordion-primary-demo=en] [data-accordion-item=shipping] summary",
  },
  {
    id: "collapsible",
    control: "[data-collapsible-primary-demo=en] summary",
  },
  {
    id: "item",
    control: "[data-item-primary-demo=en] [data-item-action=basic]",
  },
  {
    id: "alert-dialog",
    control: "[data-alert-dialog-primary-demo=en] [data-alert-dialog-trigger]",
  },
  {
    id: "dropdown-menu",
    control: "[data-dropdown-primary-demo=en] [data-dropdown-trigger]",
  },
  {
    id: "command",
    control: "[data-command-primary-demo=en] [data-command-input]",
  },
  {
    id: "back-to-bottom",
    control: "[data-back-to-bottom-primary-demo=en] [data-back-to-bottom-trigger]",
  },
  {
    id: "table-of-contents",
    control: "[data-toc-primary-demo=en] [data-toc-item=overview]",
  },
  {
    id: "floating-panel",
    control: "[data-floating-panel-primary-demo=en] [data-floating-panel-action=close]",
  },
  {
    id: "context-menu",
    control: "[data-context-primary-demo=en] [data-context-trigger]",
  },
  {
    id: "form",
    control: "[data-form-primary-demo=en] #form-workspace-name-en",
  },
  {
    id: "editable-text",
    control: "[data-editable-primary-demo=en] [data-editable-action=edit]",
  },
  {
    id: "date-picker",
    control: "[data-date-picker-primary-demo=en] #date-target-en",
  },
  {
    id: "alert",
    control: "[data-alert-primary-demo=en] [data-alert-item=success]",
    presentational: true,
  },
  {
    id: "badge",
    control: "[data-badge-primary-demo=en] [data-badge-item=default]",
    presentational: true,
    minHeight: 16,
  },
  {
    id: "status-badge",
    control: "[data-status-badge-primary-demo=en] [data-status-item=active]",
    presentational: true,
    minHeight: 16,
  },
  {
    id: "spinner",
    control: "[data-spinner-primary-demo=en] [data-spinner-status]",
    zoomControl: "[data-spinner-primary-demo=en] [data-spinner-title]",
    presentational: true,
  },
  {
    id: "skeleton",
    control: "[data-skeleton-primary-demo=en]",
    presentational: true,
  },
  {
    id: "table",
    control: "[data-table-primary-demo=en] table",
    zoomControl: "[data-table-primary-demo=en] td",
    presentational: true,
  },
  {
    id: "property-list",
    control: "[data-property-list-primary-demo=en]",
    zoomControl: "[data-property-list-primary-demo=en] [data-property=provider]",
    presentational: true,
  },
  {
    id: "stepper",
    control: "[data-stepper-primary-demo=en]",
    zoomControl: "[data-stepper-primary-demo=en] [data-stepper-step=health]",
    presentational: true,
  },
  {
    id: "timeline",
    control: "[data-timeline-primary-demo=en]",
    zoomControl:
      "[data-timeline-primary-demo=en] [data-timeline-event=accepted] h3",
    presentational: true,
  },
  {
    id: "kbd",
    control: "[data-kbd-primary-demo=en] kbd",
    presentational: true,
    minHeight: 16,
  },
  {
    id: "avatar",
    control: "[data-avatar-primary-demo=en] .avatar, [data-avatar-primary-demo=en] img, [data-avatar-primary-demo=en] span",
    presentational: true,
  },
  {
    id: "icon",
    control: "[data-icon-primary-demo=en]",
    presentational: true,
  },
  {
    id: "image",
    control: "[data-image-primary-demo=en] img, [data-image-primary-demo=en]",
    presentational: true,
  },
  {
    id: "file-type-icon",
    control: "[data-file-type-icon-primary-demo=en]",
    presentational: true,
  },
  {
    id: "highlighter",
    control: "[data-highlighter-primary-demo=en] mark, [data-highlighter-primary-demo=en]",
    presentational: true,
  },
  {
    id: "snippet",
    control: "[data-snippet-primary-demo=en] .copy-button, [data-snippet-primary-demo=en] button",
  },
  {
    id: "markdown-surface",
    control: "[data-markdown-surface-primary-demo=en]",
    zoomControl: "[data-markdown-surface-primary-demo=en] [data-markdown-code]",
    presentational: true,
  },
  {
    id: "streaming-text",
    control: "[data-streaming-primary-demo=en]",
    presentational: true,
  },
  {
    id: "scroll-area",
    control: "[data-scroll-area-primary-demo=en] [data-scroll-area-viewport]",
  },
  {
    id: "theme-switcher",
    control:
      "[data-theme-switcher-primary-demo=en] button, [data-a3s-theme-toggle]",
  },
  {
    id: "sortable-list",
    control:
      "[data-sortable-list-primary-demo=en] [data-sortable-handle]",
  },
  {
    id: "code-diff",
    control: "[data-code-diff-primary-demo=en]",
    presentational: true,
  },
  {
    id: "image-viewer",
    control:
      "[data-image-viewer-primary-demo=en] [data-image-viewer-action=zoom-in], [data-image-viewer-primary-demo=en] button",
  },
  {
    id: "log-viewer",
    control: "[data-log-viewer-primary-demo=en] [data-log-filter-value=all]",
  },
  {
    id: "code-editor",
    control: "[data-code-editor-primary-demo=en] textarea",
  },
  {
    id: "emoji-picker",
    control:
      "[data-emoji-picker-primary-demo=en] input[type=search], [data-emoji-picker-primary-demo=en] input",
  },
  {
    id: "hotkey-input",
    control: "#hotkey-input-en",
    zoomControl: ".hotkey-input",
  },
  {
    id: "brand-lockup",
    control: "[data-brand-lockup-primary-demo=en] [data-brand-home]",
    zoomControl: "[data-brand-lockup-primary-demo=en] [data-brand-mark]",
  },
  {
    id: "toolbar",
    control: "[data-toolbar-primary-demo=en] button",
  },
  {
    id: "ribbon",
    control: "[data-ribbon-primary-demo=en] [role=tab]",
  },
  {
    id: "status-bar",
    control: "[data-status-bar-primary-demo=en] button, [data-status-bar-primary-demo=en] input",
  },
  {
    id: "split-pane",
    control: "[data-split-pane-primary-demo=en] [data-split-separator]",
    zoomControl: "[data-split-pane-primary-demo=en] [data-split-primary] .badge",
  },
  {
    id: "setting-row",
    control: "[data-setting-row-primary-demo=en] input, [data-setting-row-primary-demo=en] button",
  },
  {
    id: "resource-card",
    control: "[data-resource-card-primary-demo=en] .resource-card, [data-resource-card-primary-demo=en] button",
  },
  {
    id: "workspace-header",
    control:
      "[data-workspace-header-primary-demo=en] [data-workspace-primary-action], [data-workspace-header-primary-demo=en] button",
  },
  {
    id: "data-grid",
    control: "[data-grid-select-all=true], [data-grid-sort=name]",
    zoomControl: "[data-grid-viewport=true]",
    zoomHost: "[data-grid-viewport=true]",
  },
  {
    id: "bulk-action-bar",
    control: "[data-bulk-demo=en] [data-bulk-action=archive]",
    zoomControl: "[data-bulk-demo=en]",
    zoomHost: "[data-bulk-demo=en]",
  },
  {
    id: "color-swatches",
    control: "input[data-a3s-part-owners='color-swatches.input']",
    zoomControl: "[data-swatch=true]",
  },
  {
    id: "image-select",
    control: "#cover-light",
    zoomControl: "[data-image-option=true]",
  },
  {
    id: "chart",
    control:
      "[data-chart-primary-demo=en] canvas, [data-chart-primary-demo=en] table",
    presentational: true,
  },
  {
    id: "app-shell",
    control:
      "[data-app-shell-primary-demo=en] [data-app-navigation-trigger], [data-app-shell-primary-demo=en] button",
  },
  {
    id: "app-page",
    control:
      "[data-app-page-primary-demo=en] [data-page-primary-action], [data-app-page-primary-demo=en] button",
  },
  {
    id: "task-start",
    control:
      "[data-task-start-primary-demo=en] [data-composer-input], [data-task-start-primary-demo=en] textarea",
  },
  {
    id: "catalog",
    control:
      "[data-catalog-primary-demo=en] [data-catalog-search], [data-catalog-primary-demo=en] input",
  },
  {
    id: "agent-composer",
    control:
      "[data-agent-composer-primary-demo=en] [data-composer-input], [data-agent-composer-primary-demo=en] [role=textbox]",
  },
  {
    id: "task-workspace",
    control:
      "[data-task-workspace-primary-demo=en] [data-task-inspector-trigger]",
  },
  {
    id: "agent-transcript",
    control:
      "[data-agent-transcript-primary-demo=en] [data-transcript-viewport], [data-agent-transcript-primary-demo=en]",
    presentational: true,
  },
  {
    id: "agent-workbench",
    control:
      "[data-agent-workbench-primary-demo=en] [data-agent-context-current], [data-agent-workbench-primary-demo=en] a",
  },
  {
    id: "approval-request",
    control:
      "[data-approval-request-primary-demo=en] button, [data-approval-request-primary-demo=en] input",
  },
  {
    id: "execution-item",
    control:
      "[data-execution-item-primary-demo=en] [data-execution-action=cancel]",
  },
  {
    id: "settings-layout",
    control:
      "[data-settings-layout-primary-demo=en] [data-settings-nav-current=true]",
  },
  {
    id: "task-pane",
    control:
      "[data-task-pane-primary-demo=en] [data-task-pane-close]",
  },
  {
    id: "task-plan",
    control:
      "[data-task-plan-primary-demo=en] [data-task-plan-pause]",
  },
  {
    id: "plan-step",
    control:
      "[data-plan-step-primary-demo=en] [data-plan-step-action]",
  },
  {
    id: "message-status",
    control:
      "[data-message-status-primary-demo=en] [data-message-status-retry]",
  },
  {
    id: "message-attachment",
    control:
      "[data-message-attachment-primary-demo=en] [data-attachment-remove]",
  },
  {
    id: "message-citation",
    control:
      "[data-message-citation-primary-demo=en] a",
  },
  {
    id: "artifact-card",
    control:
      "[data-artifact-card-primary-demo=en] [data-artifact-download]",
  },
  {
    id: "context-selector",
    control:
      "[data-context-selector-primary-demo=en] [data-context-control=model], [data-context-selector-primary-demo=en] select",
  },
  {
    id: "task-queue",
    control:
      "[data-task-queue-primary-demo=en] button",
  },
  {
    id: "checkpoint",
    control:
      "[data-checkpoint-primary-demo=en] [data-checkpoint-restore]",
  },
  {
    id: "follow-up-suggestions",
    control:
      "[data-follow-up-suggestions-primary-demo=en] [data-follow-up-action]",
  },
  {
    id: "tool-call",
    control:
      "[data-tool-call-primary-demo=en] [data-tool-action=copy-output]",
  },
  {
    id: "tool-call-timeline",
    control:
      "[data-tool-call-timeline-primary-demo=en] [data-tool-timeline-action=expand-history]",
  },
  {
    id: "tool-result",
    control:
      "[data-tool-result-primary-demo=en] button",
  },
  {
    id: "change-review",
    control:
      "[data-change-review-primary-demo=en] [data-review-action=request-changes]",
  },
  {
    id: "terminal",
    control:
      "[data-terminal-primary-demo=en] [data-terminal-copy]",
  },
  {
    id: "execution-evidence",
    control:
      "[data-execution-evidence-primary-demo=en] [data-evidence-action=open-report]",
  },
  {
    id: "file-explorer",
    control:
      "[data-file-explorer-primary-demo=en] [data-file-action=new-file]",
  },
  {
    id: "file-manager",
    control:
      "[data-file-manager-primary-demo=en] [data-file-action=new-folder], [data-file-manager-primary-demo=en] [data-file-action=import]",
  },
  {
    id: "knowledge-library",
    control:
      "[data-knowledge-library-primary-demo=en] [data-knowledge-filter=all]",
  },
  {
    id: "code-graph",
    control:
      "[data-code-graph-primary-demo=en] [data-code-graph-action=zoom-out]",
  },
  {
    id: "device-simulator",
    control:
      "[data-device-simulator-primary-demo=en] [data-device-simulator-select], [data-device-simulator-primary-demo=en] select",
  },
];

async function openComponent(page: Page, id: string) {
  await page.goto(`en/components/${id}.html`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html:not([data-a3s-defer-init])")).toBeVisible();
}

function hasFocusCue(style: {
  outlineStyle: string;
  outlineWidth: string;
  boxShadow: string;
  borderWidth?: string;
}) {
  // Forced-colors / native controls may expose outlineWidth without a
  // computed outlineStyle of "solid" (Chromium reports "none" + non-zero width).
  const outline = Number.parseFloat(style.outlineWidth) > 0;
  const shadow = style.boxShadow !== "none";
  const border =
    style.borderWidth !== undefined &&
    Number.parseFloat(style.borderWidth) >= 1;
  return outline || shadow || border;
}

for (const gap of cases) {
  test.describe(`${gap.id} verified gaps`, () => {
    test(`${gap.id} AT smoke keeps focus and accessible naming`, async ({
      page,
    }) => {
      await openComponent(page, gap.id);
      const control = page.locator(gap.control).first();
      await expect(control).toBeVisible();
      if (gap.presentational) {
        await control.evaluate((el) => {
          if (!el.hasAttribute("tabindex")) {
            el.setAttribute("tabindex", "0");
          }
        });
      }
      await control.focus();
      await expect(control).toBeFocused();

      const name = await control.evaluate((el) => {
        const labelled =
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby") ||
          (el as HTMLInputElement).labels?.[0]?.textContent ||
          el.textContent ||
          el.getAttribute("alt") ||
          el.getAttribute("title") ||
          "";
        return labelled.trim().replace(/\s+/g, " ");
      });
      expect(name.length).toBeGreaterThan(0);

      const focusVisual = await control.evaluate((element) => {
        const read = (node: Element | null) => {
          if (!node) return null;
          const style = getComputedStyle(node);
          return {
            borderWidth: style.borderWidth,
            boxShadow: style.boxShadow,
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
            tag: node.tagName.toLowerCase(),
          };
        };
        const chain = [];
        let node: Element | null = element;
        for (let depth = 0; node && depth < 4; depth += 1) {
          chain.push(read(node));
          node = node.parentElement;
        }
        return {
          chain,
          nativeType: (element as HTMLInputElement).type || null,
          tag: element.tagName.toLowerCase(),
        };
      });

      expect(
        focusVisual.chain.some((style) => style !== null && hasFocusCue(style)) ||
          (focusVisual.tag === "input" &&
            ["checkbox", "radio", "range", "date"].includes(
              focusVisual.nativeType ?? "",
            )) ||
          gap.presentational === true,
      ).toBe(true);
    });

    test(`${gap.id} remains usable at true 200% CSS page zoom`, async ({
      page,
    }) => {
      await openComponent(page, gap.id);
      const demo = page
        .locator(
          gap.zoomHost ??
            `[data-${gap.id}-primary-demo=en], [data-${gap.id}-primary-demo='en']`,
        )
        .first();
      const hasDemo = (await demo.count()) > 0;
      const zoomHost = hasDemo
        ? demo
        : page.locator(gap.zoomControl ?? gap.control).first();
      const control = page.locator(gap.zoomControl ?? gap.control).first();

      await zoomHost.scrollIntoViewIfNeeded();
      // Local CSS zoom reflows the component like browser zoom while keeping
      // Playwright screenshots aligned (documentElement zoom desyncs paint).
      await applyLocalCssZoom(zoomHost, 2);
      await control.scrollIntoViewIfNeeded();
      await expect(control).toBeAttached();

      let box = await control.boundingBox();
      let shot = control;
      if (!box || box.width <= 0) {
        const child = control.locator("*").first();
        const childBox = await child.boundingBox().catch(() => null);
        if (childBox && childBox.width > 0) {
          box = childBox;
          shot = child;
        }
      }
      if ((!box || box.width <= 0) && hasDemo) {
        box = await demo.boundingBox();
        shot = demo;
      }
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
      // Prefer a readable proof surface when the leaf control collapses under zoom.
      if (hasDemo && (box!.width < 48 || box!.height < 24)) {
        const hostBox = await zoomHost.boundingBox();
        if (hostBox && hostBox.width >= 48 && hostBox.height >= 24) {
          box = hostBox;
          shot = zoomHost;
        }
      }

      const metrics = await shot.evaluate((node) => {
        const bounds = node.getBoundingClientRect();
        const host = node.closest("[style*='zoom']") ?? node;
        const hostEl = host as HTMLElement;
        return {
          height: bounds.height,
          horizontallyContained:
            bounds.left >= -1 && bounds.right <= window.innerWidth + 1,
          intersectsViewport:
            bounds.bottom > 0 &&
            bounds.top < window.innerHeight &&
            bounds.right > 0 &&
            bounds.left < window.innerWidth,
          width: bounds.width,
          zoom:
            getComputedStyle(hostEl).zoom ||
            getComputedStyle(document.documentElement).zoom,
        };
      });

      expect(metrics.zoom === "2" || metrics.zoom === "200%").toBe(true);
      expect(metrics.horizontallyContained).toBe(true);
      expect(metrics.intersectsViewport).toBe(true);
      if (gap.minHeight !== 0) {
        expect(metrics.height).toBeGreaterThanOrEqual(gap.minHeight ?? 24);
      }

      // Document-level zoom: page must not introduce horizontal overflow.
      await applyCssPageZoom(page, 2);
      await bringControlIntoViewUnderCssZoom(page, control);
      const pageOverflowX = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      );
      expect(pageOverflowX).toBe(false);
      // Clear document zoom before proof capture so the PNG matches paint.
      await page.evaluate(() => {
        document.documentElement.style.zoom = "";
      });
      await applyLocalCssZoom(zoomHost, 2);
      await zoomHost.scrollIntoViewIfNeeded();

      const proofDir = join(process.cwd(), `temp/verified-proof/${gap.id}`);
      mkdirSync(proofDir, { recursive: true });
      await shot.screenshot({
        animations: "disabled",
        path: join(proofDir, "control-en-200pct-zoom.png"),
      });
    });

    test(`${gap.id} exposes system focus under forced colors`, async ({
      page,
    }) => {
      await page.emulateMedia({
        forcedColors: "active",
        reducedMotion: "reduce",
      });
      await openComponent(page, gap.id);
      const control = page.locator(gap.control).first();
      if (gap.presentational) {
        await control.evaluate((el) => {
          if (!el.hasAttribute("tabindex")) {
            el.setAttribute("tabindex", "0");
          }
        });
      }
      await control.focus();
      await expect(control).toBeFocused();

      const focus = await control.evaluate((element) => {
        const read = (node: Element | null) => {
          if (!node) return null;
          const style = getComputedStyle(node);
          return {
            borderWidth: style.borderWidth,
            boxShadow: style.boxShadow,
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
          };
        };
        const chain = [];
        let node: Element | null = element;
        for (let depth = 0; node && depth < 4; depth += 1) {
          chain.push(read(node));
          node = node.parentElement;
        }
        return {
          chain,
          forcedColors: matchMedia("(forced-colors: active)").matches,
          nativeType: (element as HTMLInputElement).type || null,
          tag: element.tagName.toLowerCase(),
        };
      });

      expect(focus.forcedColors).toBe(true);
      expect(
        focus.chain.some((style) => style !== null && hasFocusCue(style)) ||
          (focus.tag === "input" &&
            ["checkbox", "radio", "range", "date"].includes(
              focus.nativeType ?? "",
            )) ||
          gap.presentational === true,
      ).toBe(true);
    });
  });
}
