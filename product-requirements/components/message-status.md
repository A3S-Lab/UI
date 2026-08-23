# Message Status Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-07` |
| Decision | Compose |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/message-status.html` |
| Stable selector | `[data-a3s-components~="message-status"]` |
| Interaction scenario | `components-application-utilities.acl#message-status` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-message-status` |

## User problem

Message Status reports a bounded delivery or generation state beside one message. It does not make the whole transcript a live region. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Compose**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Define a transcript-local composition of Status Badge, concise text, and optional retry/stop action. It must never turn the whole transcript into a live region.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `sending` — Message Status preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `streaming` — Message Status preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `sent` — Message Status presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `queued` — Message Status communicates the `queued` condition with explicit text, structure, or native state rather than color alone.
- `stopped` — Message Status explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Message Status explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.message-status` on `<output>`.
- Stable automation root: `[data-a3s-components~="message-status"]`.
- Named parts: `indicator` (`[data-message-status-indicator]`); `label` (`[data-message-status-label]`); `metadata` (`time, [data-message-status-meta]`).
- This is a presentation contract. It must not invent click or keyboard behavior when the composed native elements do not own an action.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Sending/streaming/sent/queued/stopped/error, retry failure, rapid transitions, screen-reader announcement bounds, long status, dark mode, and touch-visible recovery.

## Accessibility

The canonical root uses `<output>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Any interactive descendants retain their own native names and keyboard behavior; the root does not add a false role. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `sending`, `streaming`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `stopped`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.message-status` and is annotated by the runtime as `[data-a3s-components~="message-status"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=message-status]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Sending/streaming/sent/queued/stopped/error, retry failure, rapid transitions, screen-reader announcement bounds, long status, dark mode, and touch-visible recovery.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `message-status`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-message-status`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/message-status.html`.
- Stable root target: `[data-a3s-components~="message-status"]` inside `.a3s-preview[data-preview-component=message-status][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/message-status-states.png`.
- Per-state evidence selectors:
  - `sending`: `.a3s-component-state-matrix[open][data-component=message-status] [data-state-specimen=sending]:has([data-a3s-components~='message-status'][data-a3s-state~='sending'][aria-busy=true])`
  - `streaming`: `.a3s-component-state-matrix[open][data-component=message-status] [data-state-specimen=streaming]:has([data-a3s-components~='message-status'][data-a3s-state~='streaming'][aria-busy=true])`
  - `sent`: `.a3s-component-state-matrix[open][data-component=message-status] [data-state-specimen=sent]:has([data-a3s-components~='message-status'][data-a3s-state~='sent'])`
  - `queued`: `.a3s-component-state-matrix[open][data-component=message-status] [data-state-specimen=queued]:has([data-a3s-components~='message-status'][data-a3s-state~='queued'])`
  - `stopped`: `.a3s-component-state-matrix[open][data-component=message-status] [data-state-specimen=stopped]:has([data-a3s-components~='message-status'][data-a3s-state~='stopped'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=message-status] [data-state-specimen=error]:has([data-a3s-components~='message-status'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
