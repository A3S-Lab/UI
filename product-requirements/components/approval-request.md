# Approval Request Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-14` |
| Decision | Keep |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/approval-request.html` |
| Stable selector | `[data-a3s-components~="approval-request"]` |
| Interaction scenario | `components-application-utilities.acl#approval-request` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-approval-request` |

## User problem

Approval Request explains why an Agent needs additional authority and collects one bounded permission decision. The host application owns policy evaluation, expiration, persistence, and execution after approval. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Explain the exact requested authority, reason, scope, duration, and consequence before presenting approve and deny. The safe choice and expiration stay unambiguous.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `pending` — Approval Request communicates the `pending` condition with explicit text, structure, or native state rather than color alone.
- `approved` — Approval Request presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `denied` — Approval Request explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `expired` — Approval Request explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Approval Request explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.approval-request` on `<section>`.
- Stable automation root: `[data-a3s-components~="approval-request"]`.
- Named parts: `action` (`button`); `approve` (`button[type=submit], [data-approval=approve]`); `deny` (`[data-approval=deny]`); `scope` (`input[type=radio]`); `title` (`:scope > header :is(h2, h3, h4)`).
- Supported interaction intents: `check`, `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `submit`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Missing scope rejection, pending/approved/denied/expired/error, async decision, policy change, repeated request, destructive authority, phone, keyboard focus, and audit detail.

## Accessibility

The canonical root uses `<section>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `check`, `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `denied`, `expired`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.approval-request` and is annotated by the runtime as `[data-a3s-components~="approval-request"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=approval-request]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Missing scope rejection, pending/approved/denied/expired/error, async decision, policy change, repeated request, destructive authority, phone, keyboard focus, and audit detail.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `approval-request`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-approval-request`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/approval-request.html`.
- Stable root target: `[data-a3s-components~="approval-request"]` inside `.a3s-preview[data-preview-component=approval-request][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/approval-request-states.png`.
- Per-state evidence selectors:
  - `pending`: `.a3s-component-state-matrix[open][data-component=approval-request] [data-state-specimen=pending]:has([data-a3s-components~='approval-request'][data-a3s-state~='pending'])`
  - `approved`: `.a3s-component-state-matrix[open][data-component=approval-request] [data-state-specimen=approved]:has([data-a3s-components~='approval-request'][data-a3s-state~='approved'])`
  - `denied`: `.a3s-component-state-matrix[open][data-component=approval-request] [data-state-specimen=denied]:has([data-a3s-components~='approval-request'][data-a3s-state~='denied'])`
  - `expired`: `.a3s-component-state-matrix[open][data-component=approval-request] [data-state-specimen=expired]:has([data-a3s-components~='approval-request'][data-a3s-state~='expired'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=approval-request] [data-state-specimen=error]:has([data-a3s-components~='approval-request'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
