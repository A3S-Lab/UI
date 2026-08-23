# Terminal Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-23` |
| Decision | Host boundary |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/terminal.html` |
| Stable selector | `[data-a3s-components~="terminal"]` |
| Interaction scenario | `components-application-utilities.acl#terminal` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-terminal` |

## User problem

Terminal presents one bounded command session with a stable title, command, output viewport, and execution state. Shell transport and process control remain application logic. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Host boundary**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own a bounded session frame with title, command, output viewport, state, and accessible fallback. The host owns shell, process, input transport, permissions, secrets, and termination.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `idle` — Terminal is stable, named, and ready for its primary reading or interaction job.
- `running` — Terminal preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `waiting` — Terminal preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `success` — Terminal presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `cancelled` — Terminal explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Terminal explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.terminal` on `<section>`.
- Stable automation root: `[data-a3s-components~="terminal"]`.
- Named parts: `action` (`:scope > header button, :scope > footer button`); `command` (`[data-terminal-command]`); `output` (`[data-terminal-output]`); `status` (`[data-terminal-status]`); `title` (`:scope > header :is(h2, h3, strong)`).
- Supported interaction intents: `click`, `focus`, `press`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Idle/running/waiting/success/cancelled/error, huge/ANSI output, secret redaction, resize, copy/select, keyboard input boundary, phone read-only mode, reconnect, and process-exit clarity.

## Accessibility

The canonical root uses `<section>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `running`, `waiting`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `cancelled`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.terminal` and is annotated by the runtime as `[data-a3s-components~="terminal"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=terminal]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Idle/running/waiting/success/cancelled/error, huge/ANSI output, secret redaction, resize, copy/select, keyboard input boundary, phone read-only mode, reconnect, and process-exit clarity.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `terminal`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-terminal`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/terminal.html`.
- Stable root target: `[data-a3s-components~="terminal"]` inside `.a3s-preview[data-preview-component=terminal][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/terminal-states.png`.
- Per-state evidence selectors:
  - `idle`: `.a3s-component-state-matrix[open][data-component=terminal] [data-state-specimen=idle]:has([data-a3s-components~='terminal'][data-a3s-state~='idle'])`
  - `running`: `.a3s-component-state-matrix[open][data-component=terminal] [data-state-specimen=running]:has([data-a3s-components~='terminal'][data-a3s-state~='running'][aria-busy=true])`
  - `waiting`: `.a3s-component-state-matrix[open][data-component=terminal] [data-state-specimen=waiting]:has([data-a3s-components~='terminal'][data-a3s-state~='waiting'][aria-busy=true])`
  - `success`: `.a3s-component-state-matrix[open][data-component=terminal] [data-state-specimen=success]:has([data-a3s-components~='terminal'][data-a3s-state~='success'])`
  - `cancelled`: `.a3s-component-state-matrix[open][data-component=terminal] [data-state-specimen=cancelled]:has([data-a3s-components~='terminal'][data-a3s-state~='cancelled'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=terminal] [data-state-specimen=error]:has([data-a3s-components~='terminal'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
