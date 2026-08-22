# Changelog

## Unreleased

### Added

- Integrated the complete Form source, deterministic Rust/WASM core, Designer, Renderer, A3S Flow configuration, CLI, Cloud and Workflow contracts into `@a3s-lab/ui/form`; added React Hook Form bindings and native Vue composables with shared A3S Core validation; moved every current Form guide into the A3S UI component catalog; and placed the interactive designer under `/UI/playground/forms/` without a separate Form site.
- Added bilingual persistent current-task sessions to the product application, preserving composer context, follow-ups, recent-task navigation, recovery states, and task artifacts across route changes and refreshes.
- Added the complete Dockview 8.1 MIT integration through native, React, and Vue entrypoints, including Dockview, Gridview, Splitview, Paneview, the A3S light/dark theme, versioned layout persistence, framework hooks, bilingual MDX guides, and a real dockable Playground workspace.
- Added framework-agnostic Agent Composer, Agent Transcript, Execution Item, and Approval Request contracts with responsive, accessible, bilingual documentation.
- Added production File Manager and Knowledge Library contracts with multi-selection, search, views, preview, indexing phases, recovery, cancelable host authorization, generated React/Vue hooks, bilingual documentation, and Playground compositions.
- Added App Page, Task Start, Task Workspace, Catalog, and Setting Row contracts plus complete Task Workspace, New Task, Capability Catalog, Settings Center, Projects, and Automations composition guides.
- Added Task Plan, Plan Step, Message Status, Message Attachment, Message Citation, Artifact Card, Context Selector, Task Queue, Checkpoint, Follow-up Suggestions, Tool Call, Change Review, Terminal, and Execution Evidence contracts.
- Added the root `DESIGN.md` contract for task-centered application geometry, typography, color, elevation, responsive behavior, and component states.
- Added a machine-readable 116-component manifest, DOM semantic runtime, optional React and Vue adapters, package-isolated adapter verification, and one deterministic component scenario per public guide.
- Added 22 product-admitted contracts for code and Markdown reading, images, compact selection, inline editing, reusable forms, navigation recovery, floating inspection, sorting, and streaming output, with split CSS, controllers where behavior is required, and bilingual React and Vue guidance.
- Added Device Simulator with phone, tablet, desktop, custom-size, orientation, URL navigation, iframe preview, and a cancelable structured event for trusted `a3s-webview` hosts.
- Added the Harness documentation and manifest category for task, conversation, execution, review, evidence, and developer-tool components.
- Added owned-part, per-action, per-state, and ready selectors plus an importable selector helper for deterministic browser tests.
- Added clean semantic HTML generation, native source disclosure, syntax highlighting, copy feedback, and keyboard operation to every bilingual MDX preview.
- Added all-export SSR, TypeScript consumer, and isolated client-mount checks for the React and Vue adapters, including refs, readiness callbacks, semantic annotations, and controller initialization.
- Added route-level geometry, state, and browser diagnostic regression coverage for every public component guide.
- Added package-owned App Shell navigation and Task Workspace inspector controllers with responsive ARIA/inert synchronization, Escape and backdrop dismissal, focus return, public methods, events, and split imports.
- Added Data Grid, Filter Bar, Context Menu, Bulk Action Bar, and File Explorer with selection, sorting, keyboard menus, responsive records, file state, bilingual guides, and split controller imports.
- Added a standalone bilingual `/playground` route for exercising eight complete workspace compositions across desktop, tablet, phone, recovery, inspector, dark-theme, and RTL states without placing it in the documentation hierarchy.
- Added `useA3SLocale`, `useA3STheme`, and `useA3SMotion` to both framework packages, with shared root-DOM state, media-query observation, typed setters, lifecycle cleanup, and bilingual runtime-configuration guidance.
- Added strict evidence validation for all 160 pinned reference mappings, including bilingual component guides, framework usage, applicable hooks, ownership boundaries, official identity, and the standalone Playground route.

### Changed

- Completed the Playground collaborative-document connection lifecycle with explicit permission consent, browser persistence, bounded connection feedback, storage-failure recovery, task-context handoff, and a focus-restoring disconnect confirmation across desktop and mobile layouts.
- Completed the Playground agent-mailbox path with browser-persisted activation, explicit permission disclosure, recoverable storage and clipboard feedback, a focus-restoring disconnect confirmation, and a truthful handoff that attaches the mailbox to a new task.
- Rebuilt the Playground capability catalog around scenario-led assistant discovery, rotating skill recommendations, dense connector browsing, stable visual identities, focus-contained detail dialogs, reviewed setup lifecycles, and direct handoff into a new task across desktop, mobile, dark mode, and both locales.
- Unified every component Preview's HTML, React, and Vue guidance into one compact code workspace with a copyable install row and entry/example file tabs.
- Integrated the persistent HTML, React, and Vue quick start into the first live Preview of all 116 bilingual component guides and all four Harness layout guides, so installation, setup, highlighted examples, framework hooks, source disclosure, and current-example copying share one 14px frame; variant previews remain scoped to their authored HTML, and no detached framework surface remains.
- Retired the standalone Patterns documentation chapter across current and historical version trees; reusable contracts remain under Components and Harness, while app-scale compositions remain in Playground.
- Rebuilt Playground Automations around predictable next-run timestamps, anchored and time-zoned schedules, persisted model/effort/permission boundaries, truthful per-run steps and durations, recoverable filtered retries, manual execution while schedules are paused, and focus-safe compact navigation.
- Rebuilt Playground Memory as a traceable, human-reviewed workflow with real scope and type filtering, relationship zoom, durable candidate acceptance, source evidence, reversible removal requests, mobile detail drawers, settings ownership, and task-context reuse.
- Rebuilt Playground knowledge management around source roots and indexed-item counts, with validated source creation, recoverable disconnects that retain workspace files, per-source reindexing, keyboard-complete detail tabs, and retry completion that reconciles every source state.
- Rebuilt Playground Inspiration as a screenshot-led four-column masonry library with coherent filters and favorites, a centered single-task detail dialog, responsive embedded previews, and a tested handoff that retains the selected template in the task composer.
- Reordered bilingual documentation navigation by learning dependency—Guide, Foundations, Components, Harness, then Playground—and kept Resources last while limiting each stable version to sections it actually publishes.
- Replaced the legacy workspace-composition Playground with a bilingual task-first product application that unifies durable sessions, project work, the production composer, execution review, local files and editors, Knowledge, Memory, extensions, automations, and settings under canonical `/playground` routes.
- Rebuilt model settings as a production configuration workspace with host-managed and custom providers, connection fields, credential visibility, model capabilities and limits, default selection, staged save/reset behavior, and compact-screen operation without inventing vendor-specific models.
- Rebuilt the project workspace as a complete task surface with Activity, Plan, Tasks, and Assets views, scoped filtering and search, project configuration, collaboration state, and a context-aware TipTap composer; widened the application shell and conversation geometry for production-scale work.
- Rebuilt documentation previews around centered-control, flowing-content, bounded-overlay, and edge-to-edge-workspace layouts; phone and tablet controls now use isolated CSS viewports so responsive media queries evaluate against the selected width.
- Reworked Device Simulator previews with scaled phone, tablet, and desktop hardware shells while preserving exact iframe viewport dimensions, orientation, and native preview arguments.
- Rebuilt the documentation theme around Rspress routing with Chinese as the default language, page-preserving language and version switching, an official A3S logo, and first-load navigation that works before hydration.
- Reorganized the bilingual documentation into eight responsibility-based general-component groups and seven workflow-stage Harness groups.
- Added a first-principles product admission gate to `DESIGN.md`, separating durable components from extracted patterns, compositions, and rejected application-specific implementations.
- Deepened Data Grid, Filter Bar, Context Menu, Bulk Action Bar, and File Explorer with cancelable precondition hooks, controlled snapshots, source-aware completion events, asynchronous recovery, read-only behavior, filtering, and reversible inline rename.
- Aligned the bilingual foundation guides, Theme Customizer, actions, fields, choice controls, tabs, overlays, application chrome, and documentation previews with the Playground neutral surface system, 6/8/10/14-pixel radii, neutral primary commands, A3S OS blue interaction states, and 120/160/220-millisecond motion system; canonical component-family styles now remain authoritative over the earlier Office refinement layer.
- Exposed Tabs, Alert Dialog, Dialog, Drawer, Dropdown Menu, and Popover controller methods through the manifest and generated React hooks and Vue composables.

### Fixed

- Aligned documentation Preview and Playground action icons with their next operation: fluid width no longer masquerades as a desktop preset, appearance and direction controls expose their target state, secret visibility uses eye/eye-off, and graph expansion uses expand/contract semantics.
- Replaced the decorative Color Swatches selection halo with a bounded selected surface and consolidated floating utility shadows onto the shared overlay depth token.
- Kept all canonical buttons, fields, choice controls, menus, tabs, and navigation rows at 44-pixel targets for coarse pointers by applying input-method guarantees after every visual family.
- Replaced the nested solid outline in the Playground composer with a restrained focus boundary on the compound control while preserving a visible keyboard focus state.
- Extended the shared visual quality floor to all 116 documented components, corrected compact File Manager and Knowledge Library composition, and restored production-sized targets for labels, ranges, Data Grid selection, Setting Row switches, and Agent Composer status controls.
- Kept project configuration and artifact inspectors visible by default on desktop while presenting them as focus-contained, Escape-dismissible drawers on compact screens, preserving trigger focus and usable conversation width at 1280px and 390px.
- Added a sidebar-anchored capability chooser with shared URL and page-tab state, complete arrow-key navigation, Escape focus return, outside dismissal, and responsive bilingual behavior.
- Connected project cards to dedicated bilingual project-workspace and child-session routes, kept project context current in the sidebar, and added production checks for conversation search, TipTap input, artifact inspection, desktop, mobile, and dark appearance.
- Kept session-detail routes focused on the conversation, moved generated files into an in-context artifact inspector with responsive and keyboard-complete behavior, and preserved legacy workspace URLs as session aliases.
- Made responsive primary, resource, language, and version navigation progressively operable before hydration, and removed legacy Playground selectors that conflicted with the dockable responsive workspace.
- Made nested documentation sidebar disclosures operable before hydration through native details and summary semantics at every hierarchy level.
- Kept Agent Composer status synchronization idempotent so its DOM observer cannot enter a self-triggering loop that freezes Playground and other composed surfaces after hydration.
- Distinguished the site navigation from embedded workspace navigation with unambiguous accessible names and responsive navbar-to-Playground regression coverage.
- Kept assistant output open on the task canvas, flattened embedded execution disclosures, removed active-navigation side stripes, and synchronized homepage, package, framework, and site counts with the 116-component contract while preserving historical version counts.
- Made component-specific browser scenarios serial by default to prevent shared-browser resource contention from introducing nondeterministic control-state failures.

- Deferred the A3S component runtime until React has hydrated live previews, preventing Combobox initialization from causing recoverable hydration errors and client-side re-rendering.
- Removed decorative overlay blur, restored a visible line-tab indicator and checkbox indeterminate state, and documented framework controller usage with tested method unions and runtime calls.
- Restored A3S OS blue as the default action, focus, link, and selection theme in light and dark modes; kept violet as an optional persisted accent; and added A3S Test visual acceptance for desktop, mobile, reset, focus, and cross-route persistence.

## [0.3.0] - 2026-08-12

### Added

- Published `@a3s-lab/ui@0.3.0` to the public npm registry and created the `v0.3.0` GitHub release.
- Added Agent Workbench, Log Viewer, Property List, Status Badge, and Timeline contracts extracted from A3S agent execution, build, evidence, status, and event-stream surfaces, with responsive CSS and bilingual documentation.
- Added Brand Lockup and Stepper contracts extracted from shared A3S identity and bounded process-path surfaces, with responsive CSS, bilingual documentation, and browser regression coverage.
- Added a first-class Tree component with hierarchical selection, expandable branches, RTL-aware keyboard navigation, typeahead, disabled-item handling, split CSS and JavaScript entrypoints, and bilingual documentation.
- Added a framework-agnostic Code Editor with native editing fallback, line and cursor status, indentation shortcuts, JSON validation, read-only state, and a public value API.
- Added a bilingual, interactive Monaco workbench example with multi-file models, A3S ACL language services, TypeScript and JSON diagnostics, command and bottom panels, responsive layout, and synchronized themes.

### Fixed

- Preserved localized JSON error positions when newer browser engines omit numeric offsets from `JSON.parse` error messages.
- Made horizontally overflowing Stepper and bounded Log Viewer regions keyboard-scrollable with visible focus treatment, exposed log filter state with `aria-pressed`, corrected the 60-component homepage count, and restored catalog links for both utility components.
- Unified Radio selection and focus visuals, made joined Button Group inputs share one focus boundary, and replaced machine-translated Chinese component terminology with standard UI language.

## [0.2.1] - 2026-08-08

### Added

- Published `@a3s-lab/ui@0.2.1` to the public npm registry and created the `v0.2.1` GitHub release.

### Fixed

- Kept Input Group as the single focus and validation boundary when direct input, textarea, or select children retain their standalone control classes.

## [0.2.0] - 2026-08-07

### Added

- Published `@a3s-lab/ui@0.2.0` to the public npm registry with validated exports and tarball contents.

### Changed

- Aligned Breadcrumb, Tabs, Pagination, and Sidebar with compact Office navigation geometry, bounded single-row overflow, 32-pixel pagination commands, and a 240-pixel mobile drawer specimen.
- Aligned Ribbon, Task Pane, Status Bar, and the homepage workbench specimen with the A3S Office geometry: 36-pixel tabs, a 74-pixel command panel, 320–380-pixel task panes, responsive pane overlays, and a fixed 28-pixel status edge.
- Aligned App Shell, Activity Bar, Workspace Header, and Toolbar geometry with A3S Office: a 46-pixel collapsed rail, 34-pixel navigation commands, a fixed 50-pixel title bar, and a 43-pixel toolbar with 29-pixel commands.
- Replaced the flat component directory and page outline with localized, keyboard-operable disclosure groups that keep the active category and section immediately available.
- Raised shared A3S secondary-text and semantic-status tokens to WCAG AA contrast in light and dark themes, established 12-pixel compact and 11-pixel micro type floors, and strengthened focus and validation states.
- Preserved compact desktop controls while providing 44-pixel form, button, tab, and sidebar targets for coarse pointers and intentional reduced-motion feedback.
- Raised documentation metadata contrast, minimum text sizes, and primary touch-target sizes while preserving the compact A3S Office visual language.
- Moved the component catalog directly after the homepage hero, collapsed the optional product preview on mobile, and replaced repeated section numbering with clearer topic labels and an editorial principles layout.

### Fixed

- Restored the Native Select chevron through Office hover, dark, and RTL states; aligned the Radio Group preview with Office field spacing and typography; and kept preselected MDX form controls interactive.
- Corrected Card interior spacing, Toast layout and lifecycle behavior, and Switch thumb travel across desktop, touch, and RTL states.
- Corrected RTL tab arrow order, kept long breadcrumbs and tablists inside their own scroll boundaries, and synchronized Sidebar focus, dismissal, and independent desktop/mobile state across its breakpoint.
- Kept dropdown menus, popovers, selects, and combobox lists inside the visual viewport with shared collision flipping, logical RTL alignment, constrained available height, and live scroll/resize repositioning.
- Contained the compact App Shell drawer inside its shell, removed its closed state from pointer and keyboard interaction, restored focus on Escape, and prevented mobile documentation typography from leaking into component previews.
- Added localized open and close states, focus entry and return, and explicit panel ownership to the mobile primary navigation.
- Removed closed mobile documentation navigation and outlines from the accessibility tree, added focus entry and return behavior, and supported Escape dismissal.
- Made the mobile documentation search control keyboard accessible with a localized label and a 44-pixel target.
- Kept the hydrated Rspress theme context authoritative while preserving the pre-hydration A3S theme bridge.
- Corrected nested homepage landmarks and headings, and removed non-functional specimen controls from keyboard and assistive-technology interaction paths.
- Added explicit, recoverable feedback when copying the installation command fails.

## [0.1.0] - 2026-08-04

### Added

- Added the A3S visual foundation and application-scale components for activity bars, application shells, workspace headers, toolbars, ribbons, settings layouts, resource cards, and resizable split panes.
- Added Task Pane and Status Bar component contracts, bilingual documentation, and application-shell examples.
- Added package entrypoints for the complete A3S theme, individual component CSS, and the Split Pane controller.
- Added a Rspress documentation site with Chinese as the default language, English localization, `next` and `v0.1.0` version switching, design foundations, grouped component APIs, and live previews.
- Added GitHub Pages deployment for the versioned documentation site.
- Added Playwright visual regression coverage for the Office workbench, Ribbon, Task Pane, and Status Bar at desktop and compact breakpoints.
- Added built-site regression checks for preview layer ordering, refreshed theme tokens, and homepage interaction semantics.
- Added a persistent homepage theme customizer for appearance, accent, radius, and interface density.
- Added component-specific A3S Test E2E scenarios for every documented component.
- Added precompiled CSS package entrypoints for consumers that do not run Tailwind.

### Changed

- Rebranded the package as `@a3s-lab/ui` and made the complete A3S style bundle the default export.
- Aligned the A3S theme's tokens, control density, interaction states, overlays, data displays, and application patterns with the A3S Office visual language.
- Migrated the documentation build from Astro and ReallySimpleDocs to the same Rspress, React, and TypeScript stack used by the A3S Code website.
- Rebuilt the repository homepage around public A3S UI components so its responsive, interactive Office Workbench specimen exercises the package contract directly.
- Refined the A3S light and dark palettes with a clearer primary action hierarchy and more cohesive product surfaces.
- Reworked the documentation homepage into a focused product overview with an interactive install command.
- Re-aligned the A3S foundation and documentation surfaces with the exact neutral palette, action hierarchy, density, radii, and elevation tokens used by A3S Office.
- Exposed the public JavaScript lifecycle through `window.a3sUI` and the `@a3s-lab/ui/runtime` package entrypoint while retaining legacy compatibility internally.
- Removed upstream branding from the public website and made documentation demos use A3S UI runtime names and local image assets.

### Fixed

- Fixed the Rspress mobile language selector collapsing to zero height and overlapping the version selector.
- Prevented Rspress's inactive search listener from intercepting Enter on interactive controls, and made theme controls keyboard accessible with localized labels.
- Fixed collapsed App Shell layouts retaining the activity-bar column at compact breakpoints.
- Fixed Rspress reset-layer ordering and documentation prose styles overriding live component previews.
- Fixed documentation asset compilation on Windows with Node.js 24 by invoking the Tailwind CLI through Node directly.
- Fixed narrow-screen overflow in documentation content and improved dark-theme contrast for the homepage call to action.
- Made documentation theme switching pre-hydration safe, restored the Rspress bootstrap after the component runtime script, and kept a user-visible switch at common desktop widths.
- Removed the remaining Rspress overflow ancestor and promoted open MDX preview popovers without relying solely on `:has()`, preventing selects, comboboxes, and dropdown menus from being clipped or painted below following content.
- Replaced the non-executing Progress demo script, removed the inactive HTMX Toast control, added a contained Sidebar preview, and identified the current Pagination page accessibly.

## [1.0.2] - 2026-07-06

### Added

- Added `data-size="sm"` support to Alert Dialog for the compact upstream size.

### Changed

- Removed global font smoothing from Basecoat's package CSS so `antialiased` remains an application-level choice.

## [1.0.1] - 2026-06-28

### Added

- Added explicit `force: true` support to `window.basecoat.init()` and `window.basecoat.initAll()` for rehydrating restored DOM after framework or navigation cache restores.

### Fixed

- Reinitialized Basecoat components after HTMX history restores in the docs site.

## [1.0.0] - 2026-06-27

### Breaking Changes

- Removed the CLI workspace from the repo. Template files now ship with `basecoat-css` under `templates/nunjucks` and `templates/jinja`; copy them from `node_modules/basecoat-css/templates/*` instead of installing `basecoat-cli`.

### Added

- Added Nunjucks and Jinja template files to the `basecoat-css` package.
- Added a custom docs 404 page for Cloudflare static asset fallback.

### Changed

- Narrowed dark-mode generated selectors to `html.dark` to reduce broad style recalculation work.
- Switched the docs site to Astro's sitemap integration and updated `robots.txt` to point at the generated sitemap index.

### Fixed

- Updated Scroll Area examples to use Card surfaces so framed examples inherit style-pack radius and border treatment.

## [1.0.0-beta.7] - 2026-06-25

### Added

- Added a beta Drawer component with native `<dialog>` markup, side placement, animated close behavior, backdrop and Escape handling, style-pack visuals, JavaScript entrypoints, and docs.

### Changed

- Updated the docs dependency to `reallysimpledocs@^1.0.2`.
- Marked Chart and Drawer as beta components in the docs navigation.
- Promoted the Chart docs warning from alpha to beta.
- Updated installation CDN examples for `basecoat-css@1.0.0-beta.7`.

### Fixed

- Aligned Drawer examples more closely with upstream shadcn/ui while avoiding Chart API coupling in Drawer docs.

## [1.0.0-beta.6] - 2026-06-23

### Changed

- Updated docs dependency to the published `reallysimpledocs@1.0.0-beta.5` package.
- Refined component documentation examples across the docs site, including Select, Table, Tabs, Switch, and Theme Switcher.
- Clarified CDN and npm installation guidance for default and named style bundles.
- Updated Table examples to avoid inline overlay menus inside scrollable table containers and documented the overflow limitation.

### Fixed

- Fixed dark-mode unchecked Switch thumb colors across all style packs to match upstream shadcn/ui behavior.

## [1.0.0-beta.5] - 2026-06-22

### Added

- Added a dedicated Accordion component with native `<details>` markup, single-item JavaScript behavior, `data-multiple`, disabled item handling, style-pack spacing, and docs.
- Added a dedicated Breadcrumb component with semantic `nav`/`ol` markup, style-pack visuals, collapsed and dropdown examples, and docs.
- Added documented Card action support with `.card-action`.
- Added Combobox clear button, popup trigger, and input-group support, with docs aligned to upstream examples.

### Fixed

- Fixed Combobox single selection reopening immediately after selection and filtering the reopened list to the selected value.
- Improved Combobox multiple chips and remove buttons to match style-pack button sizing more closely.

## [1.0.0-beta.4] - 2026-06-20

### Changed

- Renamed the compact scrollbar utility from `scrollbar-thin` to `scrollbar-sm`; `scrollbar-thin` remains available through the compatibility stylesheet.

## [1.0.0-beta.3] - 2026-06-20

### Breaking Changes

- Changed Button, Badge, Card, Avatar, and Alert visual APIs to use a canonical root class plus data attributes instead of composed visual classes. For example, use `class="btn" data-variant="outline"`, `class="badge" data-variant="secondary"`, `class="card" data-size="sm"`, `class="avatar" data-size="lg"`, and `class="alert" data-variant="destructive"`. Legacy aliases are available only through the optional compatibility stylesheet.
- Changed icon-only Button sizing from `data-icon="only"` plus optional `data-size` to upstream-aligned `data-size="icon|icon-xs|icon-sm|icon-lg"`.

### Added

- Added an opt-in `basecoat-css/compat` stylesheet for pre-1.0 default Basecoat class aliases.
- Added an optional Chart.js helper with `window.basecoat.chart()`, chart CSS, generated tooltips, generated legends, and docs.
- Added shared Alert action layout support for direct child `<footer>` action regions.
- Added dedicated Avatar and Avatar Group component styles and docs.
- Added dedicated Progress component styles and docs with label, controlled, and RTL examples.

## [1.0.0-beta.2] - 2026-06-14

### Breaking Changes

- Removed the `.form` convenience selector for Basecoat 1.0. Use explicit component classes (`label`, `input`, `textarea`, `select`) or compose fields with `.field` / `.fieldset`.
- Changed Combobox markup and behavior to an input-first structure. The visible input now filters options, the hidden input stores the submitted value, single select stores the selected value, and multiple select stores a JSON array.
- Removed Combobox `data-multiple`; use `aria-multiselectable="true"` on the Combobox listbox, matching Select.
- Changed Command markup to the migrated Basecoat structure: `.command-dialog` wraps `.command`, the search input lives in the command header, and items use role-based menu markup with `role="menuitem"`.
- Removed Combobox-specific search-header behavior from Select. Use the dedicated Combobox component for editable/filterable selection.
- Removed built-in document command events for Toast, Sidebar, and Theme. Use element methods instead: `toaster.toast(config)`, `sidebar.open()`, `sidebar.close()`, `sidebar.toggle()`, and `window.basecoat.theme.*`.
- Reworked style loading for style packs. Non-default styles are standalone bundles and should not be loaded on top of the default/Vega bundle.

### Added

- Added standalone style packs: Vega, Nova, Maia, Lyra, Mira, Luma, Sera, and Rhea.
- Added dedicated Empty component styles and docs.
- Added dedicated Item component styles and docs.
- Added dedicated Input Group component styles and docs.
- Added dedicated Spinner docs and examples using `animate-spin` and `size-4` patterns.
- Added style-specific package entrypoints such as `basecoat-css/nova` and styleless base entrypoints for custom themes.
- Added `window.basecoat.refresh(element)` as a generic dispatcher for components that expose `refresh()`.
- Added `refresh()` methods to Command, Select, Combobox, Dropdown Menu, and Tabs for dynamic child lists.
- Added method APIs for Sidebar, Toast, and Theme.
- Added `data-format="object"` to Select and Combobox for opt-in hidden input serialization as `{ value, label }` objects.
- Added `selected` details to Select and Combobox change events and JavaScript properties.
- Added `data-filter="manual"` to Command and Combobox for app-owned remote or local-search result filtering.

### Changed

- Changed `window.basecoat.init(name)` and `window.basecoat.initAll()` to initialize uninitialized components only, instead of forcing global reinitialization.
- Added internal destroy hooks for JavaScript components so removed component roots clean up event listeners and runtime state.
- Reworked component CSS so shared component files own structure and behavior hooks while style-pack files own visual treatment.
- Updated Button, Button Group, Input, Textarea, Select, Combobox, Command, Dialog, Dropdown Menu, Popover, Field, Tabs, Table, Card, Alert, Badge, Kbd, Label, Skeleton, Radio, Switch, Empty, Item, and Input Group toward current shadcn/ui styles.
- Split Native Select documentation from custom Select documentation.
- Updated docs to use Basecoat-specific HTML usage instead of React/shadcn composition APIs.
- Updated docs site styling, navigation, fonts, and style switcher for the 1.0 style system.
- Migrated the docs build to ReallySimpleDocs/Astro while keeping Basecoat's Nunjucks source examples as a pre-render step.
- Changed docs build scripts so local Basecoat package assets are generated before ReallySimpleDocs resolves `basecoat-css`.

### Removed

- Removed the old Form component page. Form layout should now be composed with Field, Fieldset, Input, Textarea, Select, Native Select, Checkbox, Radio, and Switch.

### Fixed

- Fixed destructive Alert descriptions/content using muted text instead of destructive text across all style packs.

### Migration Notes

To keep the previous `.form` wrapper behavior, define it in your own Tailwind CSS:

```css
.form label {
  @apply label;
}
.form input {
  @apply input;
}
.form textarea {
  @apply textarea;
}
.form select {
  @apply select;
}
```

To keep the previous document-event command APIs, add bridge listeners in your app:

```js
document.addEventListener("basecoat:toast", (event) => {
  document.getElementById("toaster")?.toast(event.detail?.config || {});
});

document.addEventListener("basecoat:sidebar", (event) => {
  const sidebar = document.getElementById(event.detail?.id || "sidebar");
  const action = event.detail?.action || "toggle";
  if (["open", "close", "toggle"].includes(action)) sidebar?.[action]();
});

document.addEventListener("basecoat:theme", (event) => {
  const mode = event.detail?.mode;
  mode ? window.basecoat.theme.set(mode) : window.basecoat.theme.toggle();
});
```
