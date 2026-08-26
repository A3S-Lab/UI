# Log Viewer Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-24` |
| Decision | Keep |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/log-viewer.html` |
| Stable selector | `[data-a3s-components~="log-viewer"]` |
| Interaction scenario | `components-feedback-data.acl#log-viewer` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-log-viewer` |

## User problem

Log Viewer is a bounded, framework-agnostic surface for build output, workload logs, and Agent execution streams. The host application owns transport, filtering, retention, and reconnection. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own readable append-only output, pause/follow, severity presentation, search/filter slots, and empty/error states. Transport, retention, reconnection, and query stay host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Log Viewer is stable, named, and ready for its primary reading or interaction job.
- `streaming` — Log Viewer preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `paused` — Log Viewer communicates the `paused` condition with explicit text, structure, or native state rather than color alone.
- `error` — Log Viewer explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `empty` — Log Viewer states what is absent and why when known, then offers only a valid next action.

## Interaction contract

- Canonical root: `.log-viewer` on `<section>`.
- Stable automation root: `[data-a3s-components~="log-viewer"]`.
- Named parts: `filter` (`[data-log-actions] button, [data-log-filter]`); `gap` (`[data-log-gap]`); `record` (`[data-log-record]`); `viewport` (`[data-log-viewport], [role=log]`).
- Supported interaction intents: `click`, `focus`, `press`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: `role=log`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/streaming/paused/error, burst volume, long line, ANSI/plain text, follow while user reads history, filter no-results, copy, screen reader, phone, and virtualization boundary.

## Accessibility

The canonical root uses `<section>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `streaming`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.log-viewer` and is annotated by the runtime as `[data-a3s-components~="log-viewer"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=log-viewer]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/streaming/paused/error, burst volume, long line, ANSI/plain text, follow while user reads history, filter no-results, copy, screen reader, phone, and virtualization boundary.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `log-viewer`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-log-viewer`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/log-viewer.html`.
- Stable root target: `[data-a3s-components~="log-viewer"]` inside `.a3s-preview[data-preview-component=log-viewer][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/log-viewer-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=log-viewer] [data-state-specimen=ready]:has([data-a3s-components~='log-viewer'][data-a3s-state~='ready'])`
  - `streaming`: `.a3s-component-state-matrix[open][data-component=log-viewer] [data-state-specimen=streaming]:has([data-a3s-components~='log-viewer'][data-a3s-state~='streaming'][aria-busy=true])`
  - `paused`: `.a3s-component-state-matrix[open][data-component=log-viewer] [data-state-specimen=paused]:has([data-a3s-components~='log-viewer'][data-a3s-state~='paused'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=log-viewer] [data-state-specimen=error]:has([data-a3s-components~='log-viewer'][data-a3s-state~='error'])`
  - `empty`: `.a3s-component-state-matrix[open][data-component=log-viewer] [data-state-specimen=empty]:has([data-a3s-components~='log-viewer'][data-a3s-state~='empty'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
