# Status Bar Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `LW-13` |
| Decision | Keep |
| Priority | P1 |
| Category | `application` |
| Public route | `/en/components/status-bar.html` |
| Stable selector | `[data-a3s-components~="status-bar"]` |
| Interaction scenario | `components-application-utilities.acl#status-bar` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-status-bar` |

## User problem

A Status Bar keeps document state, view controls, and zoom information available without competing with the primary workspace. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Present durable workspace status and view controls without competing with the task. Group by meaning and hide low-value detail before truncating critical state.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Status Bar is stable, named, and ready for its primary reading or interaction job.
- `busy` — Status Bar preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `offline` — Status Bar explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Status Bar explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.status-bar` on `<div>`.
- Stable automation root: `[data-a3s-components~="status-bar"]`.
- Named parts: `action` (`[data-status-actions] button, [data-status-actions] input`); `actions` (`[data-status-actions]`); `info` (`[data-status-info]`).
- Supported interaction intents: `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Busy/offline/error, long branch/path, zoom control, many segments, phone reduction, keyboard controls, live announcements, high contrast, and safe-area padding.

## Accessibility

The canonical root uses `<div>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `busy`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `offline`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.status-bar` and is annotated by the runtime as `[data-a3s-components~="status-bar"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=status-bar]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Busy/offline/error, long branch/path, zoom control, many segments, phone reduction, keyboard controls, live announcements, high contrast, and safe-area padding.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `status-bar`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-status-bar`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/status-bar.html`.
- Stable root target: `[data-a3s-components~="status-bar"]` inside `.a3s-preview[data-preview-component=status-bar][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/status-bar-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=status-bar] [data-state-specimen=ready]:has([data-a3s-components~='status-bar'][data-a3s-state~='ready'])`
  - `busy`: `.a3s-component-state-matrix[open][data-component=status-bar] [data-state-specimen=busy]:has([data-a3s-components~='status-bar'][data-a3s-state~='busy'][aria-busy=true])`
  - `offline`: `.a3s-component-state-matrix[open][data-component=status-bar] [data-state-specimen=offline]:has([data-a3s-components~='status-bar'][data-a3s-state~='offline'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=status-bar] [data-state-specimen=error]:has([data-a3s-components~='status-bar'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
