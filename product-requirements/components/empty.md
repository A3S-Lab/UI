# Empty Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `FB-04` |
| Decision | Keep |
| Priority | P1 |
| Category | `feedback` |
| Public route | `/en/components/empty.html` |
| Stable selector | `[data-a3s-components~="empty"]` |
| Interaction scenario | `components-feedback-data.acl#empty` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-empty` |

## User problem

Empty state explains why content is absent and, when a next step is available, offers one clear recovery action. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Explain what belongs in a region, why it is empty when known, and the next valid action. Distinguish first-use, no-results, denied, offline, and error emptiness.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `empty` — Empty states what is absent and why when known, then offers only a valid next action.
- `error` — Empty explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `permission-denied` — Empty explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `offline` — Empty explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.empty` on `<section>`.
- Stable automation root: `[data-a3s-components~="empty"]`.
- Named parts: `action` (`button, a[href]`); `description` (`p`); `icon` (`figure`); `title` (`h2, h3`).
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Truly empty, filtered empty, permission denied, offline, recoverable error, no valid action, long explanation, compact panel, and no decorative illustration requirement.

## Accessibility

The canonical root uses `<section>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`, `permission-denied`, `offline`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.empty` and is annotated by the runtime as `[data-a3s-components~="empty"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=empty]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Truly empty, filtered empty, permission denied, offline, recoverable error, no valid action, long explanation, compact panel, and no decorative illustration requirement.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `empty`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-empty`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/empty.html`.
- Stable root target: `[data-a3s-components~="empty"]` inside `.a3s-preview[data-preview-component=empty][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/empty-states.png`.
- Per-state evidence selectors:
  - `empty`: `.a3s-component-state-matrix[open][data-component=empty] [data-state-specimen=empty]:has([data-a3s-components~='empty'][data-a3s-state~='empty'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=empty] [data-state-specimen=error]:has([data-a3s-components~='empty'][data-a3s-state~='error'])`
  - `permission-denied`: `.a3s-component-state-matrix[open][data-component=empty] [data-state-specimen=permission-denied]:has([data-a3s-components~='empty'][data-a3s-state~='permission-denied'])`
  - `offline`: `.a3s-component-state-matrix[open][data-component=empty] [data-state-specimen=offline]:has([data-a3s-components~='empty'][data-a3s-state~='offline'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
