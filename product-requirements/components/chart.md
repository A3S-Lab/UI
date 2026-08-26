# Chart Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `DC-14` |
| Decision | Host boundary |
| Priority | P1 |
| Category | `data-display` |
| Public route | `/en/components/chart.html` |
| Stable selector | `[data-a3s-components~="chart"]` |
| Interaction scenario | `components-feedback-data.acl#chart` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-chart` |

## User problem

Chart turns numeric relationships into comparable visual structure. Use it for trends, differences, and composition—not as a substitute for exact data or as decoration for an empty surface. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Host boundary**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own theme tokens, responsive frame, legend/tooltip integration, loading/empty/error, and an accessible data alternative. The chart engine and data semantics remain host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Chart is stable, named, and ready for its primary reading or interaction job.
- `loading` — Chart preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `empty` — Chart states what is absent and why when known, then offers only a valid next action.
- `error` — Chart explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.chart` on `<div>`.
- Stable automation root: `[data-a3s-components~="chart"]`.
- Named parts: `canvas` (`canvas`); `legend` (`+ .chart-legend`); `state` (`[data-chart-state]`).
- Supported interaction intents: `focus`, `hover`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Zero/one/many series, negative/null values, huge dataset, resize, color blindness, dark mode, print, keyboard data access, reduced motion, and engine-load failure.

## Accessibility

The canonical root uses `<div>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `focus`, `hover` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.chart` and is annotated by the runtime as `[data-a3s-components~="chart"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=chart]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Zero/one/many series, negative/null values, huge dataset, resize, color blindness, dark mode, print, keyboard data access, reduced motion, and engine-load failure.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `chart`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-chart`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/chart.html`.
- Stable root target: `[data-a3s-components~="chart"]` inside `.a3s-preview[data-preview-component=chart][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/chart-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=chart] [data-state-specimen=ready]:has([data-a3s-components~='chart'][data-a3s-state~='ready'])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=chart] [data-state-specimen=loading]:has([data-a3s-components~='chart'][data-a3s-state~='loading'][aria-busy=true])`
  - `empty`: `.a3s-component-state-matrix[open][data-component=chart] [data-state-specimen=empty]:has([data-a3s-components~='chart'][data-a3s-state~='empty'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=chart] [data-state-specimen=error]:has([data-a3s-components~='chart'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
