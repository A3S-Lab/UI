# Execution Item Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-15` |
| Decision | Keep |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/execution-item.html` |
| Stable selector | `[data-a3s-components~="execution-item"]` |
| Interaction scenario | `components-application-utilities.acl#execution-item` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-execution-item` |

## User problem

Execution Item is a native disclosure for one command, tool call, edit, search, browser action, or MCP invocation. It keeps the integration contract stable while applications supply domain-specific details. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Become the generic disclosure anatomy for one observable execution event: identity, status, summary, timing, input/output summary, and bounded actions. Specialist details compose inside it.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `queued` — Execution Item communicates the `queued` condition with explicit text, structure, or native state rather than color alone.
- `running` — Execution Item preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `waiting` — Execution Item preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `success` — Execution Item presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `cancelled` — Execution Item explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Execution Item explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.execution-item` on `<details>`.
- Stable automation root: `[data-a3s-components~="execution-item"]`.
- Named parts: `content` (`:scope > :not(summary)`); `disclosure` (`[data-execution-disclosure]`); `status` (`[data-execution-status]`); `trigger` (`:scope > summary`).
- Supported interaction intents: `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `toggle`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Queued/running/waiting/success/cancelled/error, no output, huge output, retry/stop, nested disclosure, live update, phone, keyboard, and status not conveyed by spinner alone.

## Accessibility

The canonical root uses `<details>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `running`, `waiting`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `cancelled`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.execution-item` and is annotated by the runtime as `[data-a3s-components~="execution-item"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=execution-item]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Queued/running/waiting/success/cancelled/error, no output, huge output, retry/stop, nested disclosure, live update, phone, keyboard, and status not conveyed by spinner alone.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `execution-item`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-execution-item`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/execution-item.html`.
- Stable root target: `[data-a3s-components~="execution-item"]` inside `.a3s-preview[data-preview-component=execution-item][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/execution-item-states.png`.
- Per-state evidence selectors:
  - `queued`: `.a3s-component-state-matrix[open][data-component=execution-item] [data-state-specimen=queued]:has([data-a3s-components~='execution-item'][data-a3s-state~='queued'])`
  - `running`: `.a3s-component-state-matrix[open][data-component=execution-item] [data-state-specimen=running]:has([data-a3s-components~='execution-item'][data-a3s-state~='running'][aria-busy=true])`
  - `waiting`: `.a3s-component-state-matrix[open][data-component=execution-item] [data-state-specimen=waiting]:has([data-a3s-components~='execution-item'][data-a3s-state~='waiting'][aria-busy=true])`
  - `success`: `.a3s-component-state-matrix[open][data-component=execution-item] [data-state-specimen=success]:has([data-a3s-components~='execution-item'][data-a3s-state~='success'])`
  - `cancelled`: `.a3s-component-state-matrix[open][data-component=execution-item] [data-state-specimen=cancelled]:has([data-a3s-components~='execution-item'][data-a3s-state~='cancelled'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=execution-item] [data-state-specimen=error]:has([data-a3s-components~='execution-item'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
