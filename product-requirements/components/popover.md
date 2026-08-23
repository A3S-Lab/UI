# Popover Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `OV-06` |
| Decision | Keep |
| Priority | P0 |
| Category | `overlays` |
| Public route | `/en/components/popover.html` |
| Stable selector | `[data-a3s-components~="popover"]` |
| Interaction scenario | `components-navigation-overlays.acl#popover` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-popover` |

## User problem

Popover presents a small amount of supporting content or lightweight controls near its trigger without interrupting the page's primary task. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own non-modal supporting content anchored to a trigger. Interactive content has an explicit entry and exit path; simple labels remain Tooltip.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `expanded` — Popover keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `collapsed` — Popover keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.

## Interaction contract

- Canonical root: `.popover` on `<div>`.
- Stable automation root: `[data-a3s-components~="popover"]`.
- Named parts: `content` (`[data-popover]`); `trigger` (`button[aria-controls]`).
- Supported interaction intents: `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `basecoat:initialized`.
- Public methods: `close`, `open`, `refresh`, `toggle`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Four edges, collision/flip, long content, form fields, outside click, Escape, nested menu, scroll container, trigger removal, touch, and RTL alignment.

## Accessibility

The canonical root uses `<div>` semantics and exposes 2 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.popover` and is annotated by the runtime as `[data-a3s-components~="popover"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=popover]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Four edges, collision/flip, long content, form fields, outside click, Escape, nested menu, scroll container, trigger removal, touch, and RTL alignment.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-navigation-overlays.acl`, scenario `popover`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-popover`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/popover.html`.
- Stable root target: `[data-a3s-components~="popover"]` inside `.a3s-preview[data-preview-component=popover][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/popover-states.png`.
- Per-state evidence selectors:
  - `expanded`: `.a3s-component-state-matrix[open][data-component=popover] [data-state-specimen=expanded]:has([data-a3s-components~='popover'][data-a3s-state~='expanded']:is([open],[aria-expanded=true]))`
  - `collapsed`: `.a3s-component-state-matrix[open][data-component=popover] [data-state-specimen=collapsed]:has([data-a3s-components~='popover'][data-a3s-state~='collapsed']:is(:not([open]),[aria-expanded=false]))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
