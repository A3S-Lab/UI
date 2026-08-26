# Tool Call Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-17` |
| Decision | Compose |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/tool-call.html` |
| Stable selector | `[data-a3s-components~="tool-call"]` |
| Interaction scenario | `components-application-utilities.acl#tool-call` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-tool-call` |

## User problem

Tool Call turns one external capability execution into an auditable name, input, progress, result, and recovery path. Its collapsed summary answers what is happening, which integration owns it, and its current state; potentially long input and output stay behind the disclosure. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Compose**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Specialize Execution Item with structured tool identity, input, output, and provider-neutral metadata. Reuse the disclosure and execution-state kernel instead of a parallel card.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `preparing` — Tool Call preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `awaiting` — Tool Call preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `running` — Tool Call preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `succeeded` — Tool Call presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `failed` — Tool Call explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `denied` — Tool Call explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `timed-out` — Tool Call explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `interrupted` — Tool Call communicates the `interrupted` condition with explicit text, structure, or native state rather than color alone.
- `queued` — Tool Call communicates the `queued` condition with explicit text, structure, or native state rather than color alone.
- `waiting` — Tool Call preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `success` — Tool Call presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `cancelled` — Tool Call explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Tool Call explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.tool-call` on `<details>`.
- Stable automation root: `[data-a3s-components~="tool-call"]`.
- Named parts: `action` (`[data-tool-action]`); `args` (`[data-tool-args], [data-tool-input]`); `content` (`[data-tool-content]`); `duration` (`[data-tool-duration]`); `error` (`[data-tool-error]`); `input` (`[data-tool-input]`); `operation` (`[data-tool-operation]`); `output` (`[data-tool-output]`); `progress` (`[data-tool-progress]`); `status` (`[data-tool-status]`); `trigger` (`:scope > summary`).
- Supported interaction intents: `click`, `focus`, `press`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:tool-action`, `a3s:tool-before-action`, `a3s:tool-output-change`, `a3s:tool-state-change`, `basecoat:initialized`, `toggle`.
- Public methods: `appendOutput`, `close`, `getState`, `openCall`, `refresh`, `runAction`, `setOutput`, `setProgress`, `setState`, `toggle`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Secret redaction, empty/huge structured data, queued/running/waiting/success/cancelled/error, retry, nested output, copy, phone, and screen-reader summary before details.

## Accessibility

The canonical root uses `<details>` semantics and exposes 11 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `preparing`, `awaiting`, `running`, `waiting`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `failed`, `denied`, `timed-out`, `cancelled`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.tool-call` and is annotated by the runtime as `[data-a3s-components~="tool-call"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=tool-call]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Secret redaction, empty/huge structured data, queued/running/waiting/success/cancelled/error, retry, nested output, copy, phone, and screen-reader summary before details.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `tool-call`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-tool-call`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/tool-call.html`.
- Stable root target: `[data-a3s-components~="tool-call"]` inside `.a3s-preview[data-preview-component=tool-call][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/tool-call-states.png`.
- Per-state evidence selectors:
  - `preparing`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=preparing]:has([data-a3s-components~='tool-call'][data-a3s-state~='preparing'][aria-busy=true])`
  - `awaiting`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=awaiting]:has([data-a3s-components~='tool-call'][data-a3s-state~='awaiting'][aria-busy=true])`
  - `running`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=running]:has([data-a3s-components~='tool-call'][data-a3s-state~='running'][aria-busy=true])`
  - `succeeded`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=succeeded]:has([data-a3s-components~='tool-call'][data-a3s-state~='succeeded'])`
  - `failed`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=failed]:has([data-a3s-components~='tool-call'][data-a3s-state~='failed'])`
  - `denied`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=denied]:has([data-a3s-components~='tool-call'][data-a3s-state~='denied'])`
  - `timed-out`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=timed-out]:has([data-a3s-components~='tool-call'][data-a3s-state~='timed-out'])`
  - `interrupted`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=interrupted]:has([data-a3s-components~='tool-call'][data-a3s-state~='interrupted'])`
  - `queued`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=queued]:has([data-a3s-components~='tool-call'][data-a3s-state~='queued'])`
  - `waiting`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=waiting]:has([data-a3s-components~='tool-call'][data-a3s-state~='waiting'][aria-busy=true])`
  - `success`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=success]:has([data-a3s-components~='tool-call'][data-a3s-state~='success'])`
  - `cancelled`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=cancelled]:has([data-a3s-components~='tool-call'][data-a3s-state~='cancelled'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=tool-call] [data-state-specimen=error]:has([data-a3s-components~='tool-call'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
