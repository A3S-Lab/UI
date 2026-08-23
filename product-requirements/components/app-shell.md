# App Shell Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `LW-01` |
| Decision | Keep |
| Priority | P0 |
| Category | `application` |
| Public route | `/en/components/app-shell.html` |
| Stable selector | `[data-a3s-components~="app-shell"]` |
| Interaction scenario | `components-application-utilities.acl#app-shell` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-app-shell` |

## User problem

The App Shell establishes persistent task context beside an open product canvas. It can own a bounded preview or the full visual viewport. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own application regions, navigation disclosure, and one declared scroll topology. It must not add private product state or become another generic card around the page.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — App Shell is stable, named, and ready for its primary reading or interaction job.
- `expanded` — App Shell keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `collapsed` — App Shell keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `hidden` — App Shell keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `mobile-open` — App Shell keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.

## Interaction contract

- Canonical root: `.app-shell` on `<div>`.
- Stable automation root: `[data-a3s-components~="app-shell"]`.
- Named parts: `content` (`[data-app-content]`); `main` (`[data-app-main]`); `navigation` (`[data-app-navigation]`); `trigger` (`[data-app-navigation-trigger]`).
- Supported interaction intents: `click`, `focus`, `press`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:app-navigation-change`, `basecoat:initialized`.
- Public methods: `closeNavigation`, `collapseNavigation`, `expandNavigation`, `hideNavigation`, `openNavigation`, `refresh`, `toggleNavigation`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Full-viewport and embedded use, collapsed/hidden navigation, two instances, breakpoint resize, mobile inertness, inspector coexistence, 200% zoom, and nested-scroll rejection.

## Accessibility

The canonical root uses `<div>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.app-shell` and is annotated by the runtime as `[data-a3s-components~="app-shell"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=app-shell]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Full-viewport and embedded use, collapsed/hidden navigation, two instances, breakpoint resize, mobile inertness, inspector coexistence, 200% zoom, and nested-scroll rejection.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `app-shell`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-app-shell`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/app-shell.html`.
- Stable root target: `[data-a3s-components~="app-shell"]` inside `.a3s-preview[data-preview-component=app-shell][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/app-shell-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=app-shell] [data-state-specimen=ready]:has([data-a3s-components~='app-shell'][data-a3s-state~='ready'])`
  - `expanded`: `.a3s-component-state-matrix[open][data-component=app-shell] [data-state-specimen=expanded]:has([data-a3s-components~='app-shell'][data-a3s-state~='expanded']:is([open],[aria-expanded=true]))`
  - `collapsed`: `.a3s-component-state-matrix[open][data-component=app-shell] [data-state-specimen=collapsed]:has([data-a3s-components~='app-shell'][data-a3s-state~='collapsed']:is(:not([open]),[aria-expanded=false]))`
  - `hidden`: `.a3s-component-state-matrix[open][data-component=app-shell] [data-state-specimen=hidden]:has([data-a3s-components~='app-shell'][data-a3s-state~='hidden'][hidden])`
  - `mobile-open`: `.a3s-component-state-matrix[open][data-component=app-shell] [data-state-specimen=mobile-open]:has([data-a3s-components~='app-shell'][data-a3s-state~='mobile-open']:is([open],[aria-expanded=true]))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
