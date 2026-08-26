# Alert Dialog Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `OV-01` |
| Decision | Keep |
| Priority | P0 |
| Category | `overlays` |
| Public route | `/en/components/alert-dialog.html` |
| Stable selector | `[data-a3s-components~="alert-dialog"]` |
| Interaction scenario | `components-navigation-overlays.acl#alert-dialog` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-alert-dialog` |

## User problem

Alert Dialog requires an explicit choice before a high-risk or irreversible action. Use it only when continuing without a response would be unsafe. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Reserve for a decision that blocks continuation. Name the consequence, make cancel safe and visible, and prevent accidental dismissal when explicit acknowledgment is required.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `open` — Alert Dialog keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `closed` — Alert Dialog keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.

## Interaction contract

- Canonical root: `dialog.alert-dialog` on `<dialog>`.
- Stable automation root: `[data-a3s-components~="alert-dialog"]`.
- Named parts: `action` (`button, .btn`); `description` (`[aria-describedby]`); `title` (`[aria-labelledby]`).
- Supported interaction intents: `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `cancel`, `close`.
- Public methods: `close`, `showModal`.
- Required root attributes: `role=alertdialog`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Destructive and non-destructive cases, async confirmation, failure after confirm, Escape policy, initial focus, return focus, long copy, phone layout, and nested-dialog rejection.

## Accessibility

The canonical root uses `<dialog>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `dialog.alert-dialog` and is annotated by the runtime as `[data-a3s-components~="alert-dialog"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=alert-dialog]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Destructive and non-destructive cases, async confirmation, failure after confirm, Escape policy, initial focus, return focus, long copy, phone layout, and nested-dialog rejection.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-navigation-overlays.acl`, scenario `alert-dialog`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-alert-dialog`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/alert-dialog.html`.
- Stable root target: `[data-a3s-components~="alert-dialog"]` inside `.a3s-preview[data-preview-component=alert-dialog][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/alert-dialog-states.png`.
- Per-state evidence selectors:
  - `open`: `.a3s-component-state-matrix[open][data-component=alert-dialog] [data-state-specimen=open]:has([data-a3s-components~='alert-dialog'][data-a3s-state~='open']:is([open],[aria-expanded=true]))`
  - `closed`: `.a3s-component-state-matrix[open][data-component=alert-dialog] [data-state-specimen=closed]:has([data-a3s-components~='alert-dialog'][data-a3s-state~='closed']:is(:not([open]),[aria-expanded=false]))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
