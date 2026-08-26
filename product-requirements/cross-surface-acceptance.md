# Cross-Surface Acceptance Contract

This document consolidates repeated product requirements that apply across the documentation site, public components, Harness examples, and the standalone Product Application. A change is incomplete when it satisfies only a local selector while violating one of these cross-surface invariants.

## Scope and ownership

- `site/docs/` is documentation only. It contains guides, foundations, component contracts, and Harness documentation.
- Playground is a standalone route family under `site/pages/`; it is not a documentation chapter, sidebar group, or component preview.
- `apps/desktop` is outside this repository's implementation scope. Shared visual intent may be observed, but code must not be duplicated or modified there.
- Harness examples own layout composition only. Their editor, logs, device simulator, file tree, and graph content reuse the same Product Application components as Playground.
- UI copy never names products used only as visual references.

## Required acceptance matrix

| Invariant | Acceptance condition | Deterministic evidence |
| --- | --- | --- |
| First-load navigation | Primary and nested documentation navigation remain operable before client hydration; no invisible overlay intercepts links. | `tests/e2e/documentation-ui.acl#first-load-responsive-navigation`, `#first-load-sidebar-navigation` |
| Information architecture | Navigation order is Guide, Foundations, Components, Harness, Playground; Playground stays outside documentation search, previous/next, and sidebars. | `tests/e2e/documentation-ui.acl`, `tests/reference-boundaries.mjs` |
| Locale and version | Simplified Chinese is the default; English and historical versions preserve equivalent routes or use an explicit fallback. | `tests/e2e/documentation-ui.acl#responsive-documentation-navigation` |
| Official identity | Header logo and favicon use the official A3S OS assets without stretching, replacement marks, or mismatched aspect ratios. | `tests/reference-boundaries.mjs`, documentation visual evidence |
| Integrated examples | The default component Preview owns one source workspace with HTML, React, and Vue tabs, installation context, syntax highlighting, and a copy action. Detached quick-start cards are prohibited. | `tests/e2e/component-framework-docs.acl`, `scripts/generate-framework-docs.mjs` |
| Overlay escape | Dropdowns, popovers, selects, comboboxes, and menus escape preview clipping and remain above owning content at desktop and phone widths. | `tests/e2e/components-navigation-overlays.acl`, `tests/e2e/focus-boundaries.acl` |
| Calm focus | Persistent search and compound composer fields use one restrained focus owner; concentric rings, default browser outlines, and broad blue halos are prohibited. | `tests/e2e/focus-boundaries.acl`, `visual-tests/playground.visual.spec.ts` |
| Full-height application | The Product Application fills the available viewport; its sidebar and main task canvas stretch together without inherited wrapping, gaps, or top alignment. | `tests/e2e/playground-route-contracts.acl` and full-viewport screenshots |
| Production composer | Task input uses the TipTap editor, supports `@` files, `$` skills, model, effort, permissions, research, assistant and connector context, and copies uploaded files into the selected workspace before attaching them. | `tests/e2e/product-composer-controls.acl`, `tests/e2e/product-task-creation.acl` |
| Single run-policy source | Model, effort, deep research, execution target, and permission mode each have one owning control and one current value. Duplicate controls are prohibited. | `tests/e2e/product-composer-controls.acl`, `tests/e2e/product-model-settings.acl` |
| Workspace files | Workspace and task artifacts share one file identity system; preview uses a movable, fullscreen-capable dialog and Office formats delegate to `@a3s-lab/office`. | `tests/e2e/product-workspace-capabilities.acl`, `tests/e2e/product-project-asset-preview.acl` |
| Device preview | Phone, tablet, laptop, and desktop previews include recognizable external hardware geometry while keeping the selected CSS viewport exact and exposing the bounded `a3s-webview` command. | `tests/e2e/product-automation-and-preview.acl`, `tests/e2e/components-application-utilities.acl` |
| Session evidence | Logs, code editing, tool calls, diffs, files, device preview, and 3D graph remain inside the task-first session hierarchy rather than a generic editor shell. | `tests/e2e/product-session-detail.acl`, `tests/e2e/workflow-removal-boundaries.acl` |
| Memory graph | Memory relationships reuse the public 3D Code Graph controller with Canvas, list fallback, filtering, selection events, keyboard rotation, and zoom. Domain nodes retain memory provenance and selection handoff. | `tests/e2e/product-workspace-capabilities.acl#memory-evolution-workflow` |
| Expert identity | Seeded experts use stable, distinct composed avatars across catalog, picker, chip, and detail contexts; portraits remain decorative beside durable names. | `tests/e2e/product-icon-semantics.acl#expert-avatar-composition` |
| Harness fidelity | Dock, Grid, Split, and Pane surfaces reuse real Product Application fixtures. Skeleton panels and look-alike markup fail acceptance even if panel roots exist. | `tests/e2e/harness-workspaces.acl` |
| Responsive completion | Every route is usable at 1440 × 1000 and 390 × 844, with one scroll owner, no page-level horizontal overflow, and reachable close or recovery actions. | route-specific A3S Test suites and `tests/e2e/playground-route-contracts.acl` |
| Theme consistency | The default A3S blue theme, light and dark neutrals, borders, icon stroke, radii, and focus behavior remain consistent across docs, Harness, and Playground. | `tests/e2e/theme-visual-acceptance.acl`, route screenshots |
| Error evidence | Every deterministic route or interaction scenario captures console and page errors; visual success cannot hide runtime failure. | All active A3S Test ACL suites |

## Release rule

Each reported defect class becomes a focused deterministic scenario or a stronger assertion in an existing scenario. DOM presence alone is insufficient for production fixtures: screenshots must show usable content, ACL selectors must target the real reusable component, and console plus page-error evidence must remain clean. Generated PRDs and coverage maps are regenerated only from their source scripts and are never edited by hand.
