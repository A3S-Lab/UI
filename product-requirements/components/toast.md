# Toast Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `FB-09` |
| Decision | Keep |
| Priority | P0 |
| Category | `feedback` |
| Public route | `/en/components/toast.html` |
| Stable selector | `[data-a3s-components~="toast"]` |
| Interaction scenario | `components-feedback-data.acl#toast` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-toast` |

## User problem

Toast provides brief, non-blocking result feedback while work continues and keeps important follow-up actions accessible. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Report brief outcomes without becoming the only record of critical state. Queue, deduplicate, pause, dismiss, and action behavior remain predictable and keyboard reachable.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `open` — Toast keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `closing` — Toast preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `closed` — Toast keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `success` — Toast presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `warning` — Toast explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `danger` — Toast explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.toast` on `<div>`.
- Stable automation root: `[data-a3s-components~="toast"]`.
- Named parts: `action` (`button, a[href]`); `description` (`p`); `title` (`strong`).
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `basecoat:initialized`.
- Required root attributes: `role=status`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Burst of ten, duplicate message, long text, action failure, timeout pause, reduced motion, screen reader announcement, mobile safe area, Dialog coexistence, and persistent-error alternative.

## Accessibility

The canonical root uses `<div>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `closing`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `warning`, `danger`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.toast` and is annotated by the runtime as `[data-a3s-components~="toast"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=toast]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Burst of ten, duplicate message, long text, action failure, timeout pause, reduced motion, screen reader announcement, mobile safe area, Dialog coexistence, and persistent-error alternative.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `toast`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-toast`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/toast.html`.
- Stable root target: `[data-a3s-components~="toast"]` inside `.a3s-preview[data-preview-component=toast][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/toast-states.png`.
- Per-state evidence selectors:
  - `open`: `.a3s-component-state-matrix[open][data-component=toast] [data-state-specimen=open]:has([data-a3s-components~='toast'][data-a3s-state~='open']:is([open],[aria-expanded=true]))`
  - `closing`: `.a3s-component-state-matrix[open][data-component=toast] [data-state-specimen=closing]:has([data-a3s-components~='toast'][data-a3s-state~='closing'][aria-busy=true])`
  - `closed`: `.a3s-component-state-matrix[open][data-component=toast] [data-state-specimen=closed]:has([data-a3s-components~='toast'][data-a3s-state~='closed']:is(:not([open]),[aria-expanded=false]))`
  - `success`: `.a3s-component-state-matrix[open][data-component=toast] [data-state-specimen=success]:has([data-a3s-components~='toast'][data-a3s-state~='success'])`
  - `warning`: `.a3s-component-state-matrix[open][data-component=toast] [data-state-specimen=warning]:has([data-a3s-components~='toast'][data-a3s-state~='warning'])`
  - `danger`: `.a3s-component-state-matrix[open][data-component=toast] [data-state-specimen=danger]:has([data-a3s-components~='toast'][data-a3s-state~='danger'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
