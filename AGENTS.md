# Agent Rules

## Communication
- Keep answers concise, technical, and to the point.
- Do not use filler or glazing openers.
- Keep explanations MECE: separate facts, decisions, risks, and open questions.
- If scope is partial, state exactly what was not included.
- Challenge incorrect assumptions with evidence from code, docs, or upstream sources.

## Project Intent
- A3S UI is the framework-agnostic design system for A3S products, extracted from the interaction patterns refined in A3S Office.
- It combines inherited Basecoat primitives with application-scale patterns such as App Shell, Activity Bar, Ribbon, Settings Layout, Resource Card, and Split Pane.
- A3S UI maps shadcn/ui concepts onto simpler semantic markup; it is not a React, Radix, Base UI, `cn-*`, or `data-slot` DOM port.
- Prefer the browser platform: native elements, semantic HTML, CSS state selectors, and small vanilla JS only when needed.

## Desktop Ownership Boundary
- `../../apps/desktop` is the canonical product application and an A3S UI consumer. The dependency direction is Desktop to A3S UI; A3S UI must not depend on or reproduce Desktop.
- A3S UI owns reusable tokens, semantic markup contracts, component CSS, small behavior controllers, server-rendered templates, documentation, and deterministic component specimens.
- Desktop owns routes, projects, sessions, permissions, model and capability configuration, persistence, runtime orchestration, native-host integration, automation state, workspace file operations, knowledge-base state, and other product workflows.
- Do not copy complete React components, route screens, product stores, fixtures that mimic production state, or application-specific styles from Desktop into A3S UI.
- Documentation examples may compose several public components to validate layout, responsiveness, accessibility, and interaction contracts, but they must not become a parallel product application or a second implementation of Desktop workflows.
- Before adding an application-scale component, search Desktop for an existing implementation and classify the change. Extract only the smallest reusable visual or interaction contract; keep business-specific behavior in Desktop.
- When a defect is reusable, fix it in A3S UI and let Desktop consume the package change. When a defect depends on Desktop state or integration, leave the fix in Desktop.
- Treat Desktop as read-only during A3S UI work unless the user explicitly places Desktop changes in scope. Never overwrite its dirty worktree.

## Source Boundaries
- Do not hand-edit build outputs:
  - `dist/**`
  - `templates/**`
  - `site/doc_build/**`
  - `site/docs/public/assets/a3s-ui.css`
  - `site/docs/public/assets/all.min.js`
- Generated source entrypoints such as `src/css/basecoat-vega.css` are committed, but must be regenerated through `scripts/generate-css-entrypoints.js` or build scripts, not manually maintained.

## Public API and Markup
- Keep public component APIs small: usually one root class, semantic child elements, documented ARIA/data attributes only when needed, and minimal JS for behavior.
- Avoid required child classes when meaningful markup can identify children: `input`, `textarea`, `select`, `button`, `a`, `label`, `fieldset`, `legend`, `header`, `section`, `footer`, `svg`, `kbd`, `hr`.
- Add new child classes, wrappers, `data-*` attributes, macro arguments, or public selectors only as intentional API.
- Do not add roles for styling; ARIA must describe behavior or accessibility state.
- Prefer intentional divergence over awkward imitation when upstream markup does not map cleanly to Basecoat.

## Accessibility
- Start with the native element that matches the control.
- Use `<fieldset>` and `<legend>` for grouped form controls when appropriate.
- Use native `<dialog>` where possible.
- Keep composite-widget keyboard behavior predictable: skip disabled items, respect orientation, and handle Escape/Enter/Space according to role.
- Disabled custom items must be skipped by pointer and keyboard interactions.
- Use logical CSS utilities/properties for RTL; flip only icons whose meaning is directional.

## CSS
- Component CSS in `src/css/components/*.css` owns structure, layout primitives, accessibility selectors, and behavior hooks.
- Style-pack CSS in `src/css/styles/*.css` owns visual choices: color, radius, shadow/ring, typography, spacing, variants, and state visuals.
- Each style bundle must stand alone. Do not load Vega/default and then undo it in another style.
- Avoid defensive resets that only compensate for another style pack.
- Prefer Tailwind logical utilities (`ps`, `pe`, `ms`, `me`, `start`, `end`, `rounded-s`, `rounded-e`) over physical left/right utilities.
- Prefer `border` for lines and separators.
- Avoid `!important`; if unavoidable, keep the selector narrow and document why.

## JavaScript
- JavaScript is behavior only; do not use JS to paper over CSS architecture issues.
- Register JS components with `window.basecoat.register()` and make initialization idempotent with `data-*-initialized` flags.
- Component init functions must return before attaching listeners or mutating DOM when the root already has its initialized flag.
- Keep generated DOM minimal and aligned with documented HTML.
- Prefer native browser APIs and events.
- Keep scroll management scoped to component containers. Do not use `scrollIntoView()` when it can scroll the page unexpectedly.
- Emit custom events only for meaningful integration points.

## Upstream Migration
- Always check the upstream shadcn/ui repo before changing a migrated component: `https://github.com/shadcn-ui/ui`.
- Use a local copy of the upstream repo for migration work.
- Review these upstream repo paths:
  - components: `apps/v4/registry/bases/base/ui/`
  - docs: `apps/v4/content/docs/components/`
  - examples: `apps/v4/registry/bases/base/examples/`
  - styles: `apps/v4/registry/styles/style-{vega,nova,maia,lyra,mira,luma,sera,rhea}.css`
- Review Basecoat files in the same pass:
  - component CSS: `src/css/components/<component>.css`
  - style packs: `src/css/styles/{vega,nova,maia,lyra,mira,luma,sera,rhea}.css`
  - JS: `src/js/<component>.js` when behavior changes
  - templates: `src/templates/nunjucks/*.njk` and `src/templates/jinja/*.html.jinja` when markup changes
  - docs: `site/docs/next/{zh,en}/components/<component>.mdx`
- Map upstream concepts, not implementation details. Do not port `cn-*` selectors directly.
- Classify differences as `drift fixed`, `intentional`, or `deferred`.

## Docs
- Docs are A3S UI API docs, not React docs.
- The Rspress site defaults to Simplified Chinese and mirrors every public page under English and each supported version tree.
- Keep `site/docs/next/zh` and `site/docs/next/en` aligned when public APIs change; stable version trees represent their published contracts.
- Update docs when supported markup, variants, states, JS behavior, templates, or macros change.
- Prefer concrete HTML examples over abstract composition trees.
- Do not include React-only APIs such as `asChild`.
- Do not add "Composition" sections unless they describe stable Basecoat markup.
- Do not add API Reference sections for native/CSS-only components unless there is a real Basecoat API.
- Structure component docs as: title and live preview, `## Usage`, `### Parameters`, optional `### JavaScript API`, `## States and variants`, and `## Accessibility`.
- Keep `Usage` focused on the minimal working snippet and important Basecoat/upstream differences; put variants, states, RTL, and richer patterns under `Examples`.
- Keep snippets minimal and aligned with current behavior.
- In HTML snippets, keep text-only elements on one line, such as `<p>Text</p>`; use multiline formatting when the element contains child elements or when line length would hurt readability.
- In HTML examples, keep icons as single-line `<svg ...>...</svg>` elements, keep simple text-only or inline-formatting elements on one line, and avoid blank separator lines between adjacent markup parts.
- Document intentional differences from upstream near the relevant example.

## Validation
- Run `npm run build` after source/package changes.
- Run `npm run docs:build` after docs or docs asset changes.
- Use A3S Test locally for release interaction checks; do not add it to the GitHub Pages workflow.
- Verify changed components across light/dark mode, localization, supported versions, responsive layouts, RTL when supported, and relevant interaction states.

## Change Management
- Ask before removing intentional functionality or public API.
- Preserve backward compatibility when the repo already depends on it, especially package exports and default `basecoat.css` behavior.
- Keep generated outputs and docs consistent with source changes.
- Remove stale comments/docs during refactors.
- Keep commits focused and imperative.
- Keep release-visible changes in `CHANGELOG.md` under `## [Unreleased]`; put backlog or incomplete work in `TODO.md` or the migration tracker.
