# Execution Evidence Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-19` |
| Decision | Keep |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/execution-evidence.html` |
| Stable selector | `[data-a3s-components~="execution-evidence"]` |
| Interaction scenario | `components-application-utilities.acl#execution-evidence` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-execution-evidence` |

## User problem

Execution Evidence records one verifiable result such as a test run, screenshot, report, trace, or accessibility snapshot. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Record one verifiable result with type, source, time, status, and open/copy action. Evidence is distinct from live execution and durable artifacts.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `capturing` — Execution Evidence preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `verified` — Execution Evidence presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `unverified` — Execution Evidence explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `expired` — Execution Evidence explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Execution Evidence explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.execution-evidence` on `<article>`.
- Stable automation root: `[data-a3s-components~="execution-evidence"]`.
- Named parts: `action` (`:scope > footer button, :scope > footer a[href]`); `content` (`:scope > section`); `metadata` (`[data-evidence-meta]`); `result` (`[data-evidence-result]`); `title` (`:scope > header :is(h3, h4, strong)`).
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Capturing/verified/unverified/expired/error, screenshot/report/trace/a11y data, missing file, stale evidence, long path, trust warning, phone, keyboard, and no fabricated verification.

## Accessibility

The canonical root uses `<article>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `capturing`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `unverified`, `expired`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.execution-evidence` and is annotated by the runtime as `[data-a3s-components~="execution-evidence"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=execution-evidence]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Capturing/verified/unverified/expired/error, screenshot/report/trace/a11y data, missing file, stale evidence, long path, trust warning, phone, keyboard, and no fabricated verification.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `execution-evidence`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-execution-evidence`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/execution-evidence.html`.
- Stable root target: `[data-a3s-components~="execution-evidence"]` inside `.a3s-preview[data-preview-component=execution-evidence][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/execution-evidence-states.png`.
- Per-state evidence selectors:
  - `capturing`: `.a3s-component-state-matrix[open][data-component=execution-evidence] [data-state-specimen=capturing]:has([data-a3s-components~='execution-evidence'][data-a3s-state~='capturing'][aria-busy=true])`
  - `verified`: `.a3s-component-state-matrix[open][data-component=execution-evidence] [data-state-specimen=verified]:has([data-a3s-components~='execution-evidence'][data-a3s-state~='verified'])`
  - `unverified`: `.a3s-component-state-matrix[open][data-component=execution-evidence] [data-state-specimen=unverified]:has([data-a3s-components~='execution-evidence'][data-a3s-state~='unverified'])`
  - `expired`: `.a3s-component-state-matrix[open][data-component=execution-evidence] [data-state-specimen=expired]:has([data-a3s-components~='execution-evidence'][data-a3s-state~='expired'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=execution-evidence] [data-state-specimen=error]:has([data-a3s-components~='execution-evidence'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
