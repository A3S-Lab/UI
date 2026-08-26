# Timeline Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `DC-20` |
| Decision | Keep |
| Priority | P1 |
| Category | `data-display` |
| Public route | `/en/components/timeline.html` |
| Stable selector | `[data-a3s-components~="timeline"]` |
| Interaction scenario | `components-feedback-data.acl#timeline` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-timeline` |

## User problem

Timeline orders durable operations, deployments, and semantic Agent events without prescribing application state management. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Represent durable chronological events with timestamps and semantic outcomes. It does not imply a future plan or expose internal reasoning.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Timeline is stable, named, and ready for its primary reading or interaction job.
- `active` — Timeline exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.
- `success` — Timeline presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `warning` — Timeline explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `danger` — Timeline explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.timeline` on `<ol>`.
- Stable automation root: `[data-a3s-components~="timeline"]`.
- Named parts: `item` (`:scope > li`); `marker` (`[data-marker]`).
- This is a presentation contract. It must not invent click or keyboard behavior when the composed native elements do not own an action.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Same timestamp, missing time, grouped day, long event, active stream, error, thousands of events, phone, RTL, color blindness, and Item composition.

## Accessibility

The canonical root uses `<ol>` semantics and exposes 2 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Any interactive descendants retain their own native names and keyboard behavior; the root does not add a false role. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `warning`, `danger`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.timeline` and is annotated by the runtime as `[data-a3s-components~="timeline"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=timeline]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Same timestamp, missing time, grouped day, long event, active stream, error, thousands of events, phone, RTL, color blindness, and Item composition.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `timeline`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-timeline`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/timeline.html`.
- Stable root target: `[data-a3s-components~="timeline"]` inside `.a3s-preview[data-preview-component=timeline][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/timeline-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=timeline] [data-state-specimen=ready]:has([data-a3s-components~='timeline'][data-a3s-state~='ready'])`
  - `active`: `.a3s-component-state-matrix[open][data-component=timeline] [data-state-specimen=active]:has([data-a3s-components~='timeline'][data-a3s-state~='active'][data-active=true])`
  - `success`: `.a3s-component-state-matrix[open][data-component=timeline] [data-state-specimen=success]:has([data-a3s-components~='timeline'][data-a3s-state~='success'])`
  - `warning`: `.a3s-component-state-matrix[open][data-component=timeline] [data-state-specimen=warning]:has([data-a3s-components~='timeline'][data-a3s-state~='warning'])`
  - `danger`: `.a3s-component-state-matrix[open][data-component=timeline] [data-state-specimen=danger]:has([data-a3s-components~='timeline'][data-a3s-state~='danger'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
