# Hotkey Input Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-10` |
| Decision | Keep |
| Priority | P1 |
| Category | `forms` |
| Public route | `/en/components/hotkey-input.html` |
| Stable selector | `[data-a3s-components~="hotkey-input"]` |
| Interaction scenario | `components-expanded-contracts.acl#hotkey-input` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-hotkey-input` |

## User problem

Records one normalized keyboard chord and makes the current value, conflict state, and clear path visible before submission. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Record one normalized chord with visible recording, conflict, clear, and cancel paths. Platform labels are presentation; the stored chord remains canonical.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Hotkey Input is stable, named, and ready for its primary reading or interaction job.
- `recording` — Hotkey Input preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `disabled` — Hotkey Input remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `invalid` — Hotkey Input explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.hotkey-input` on `<div>`.
- Stable automation root: `[data-a3s-components~="hotkey-input"]`.
- Named parts: `clear` (`[data-hotkey-clear]`); `input` (`input`); `preview` (`[data-hotkey-preview]`).
- Supported interaction intents: `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:hotkey-before-change`, `a3s:hotkey-change`, `a3s:hotkey-recording-change`, `basecoat:initialized`.
- Public methods: `clear`, `getValue`, `setValue`, `start`, `stop`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Modifier-only input, reserved OS shortcut, duplicate binding, Escape cancellation, international keyboard, screen reader, and lost-window-focus recovery.

## Accessibility

The canonical root uses `<div>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `recording`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.hotkey-input` and is annotated by the runtime as `[data-a3s-components~="hotkey-input"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=hotkey-input]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Modifier-only input, reserved OS shortcut, duplicate binding, Escape cancellation, international keyboard, screen reader, and lost-window-focus recovery.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-expanded-contracts.acl`, scenario `hotkey-input`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-hotkey-input`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/hotkey-input.html`.
- Stable root target: `[data-a3s-components~="hotkey-input"]` inside `.a3s-preview[data-preview-component=hotkey-input][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/hotkey-input-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=hotkey-input] [data-state-specimen=ready]:has([data-a3s-components~='hotkey-input'][data-a3s-state~='ready'])`
  - `recording`: `.a3s-component-state-matrix[open][data-component=hotkey-input] [data-state-specimen=recording]:has([data-a3s-components~='hotkey-input'][data-a3s-state~='recording'][aria-busy=true])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=hotkey-input] [data-state-specimen=disabled]:has([data-a3s-components~='hotkey-input'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=hotkey-input] [data-state-specimen=invalid]:has([data-a3s-components~='hotkey-input'][data-a3s-state~='invalid']:is([aria-invalid=true],[data-validation-state=invalid],:has([aria-invalid=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
