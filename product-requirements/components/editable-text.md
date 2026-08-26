# Editable Text Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-05` |
| Decision | Keep |
| Priority | P1 |
| Category | `forms` |
| Public route | `/en/components/editable-text.html` |
| Stable selector | `[data-a3s-components~="editable-text"]` |
| Interaction scenario | `components-expanded-contracts.acl#editable-text` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-editable-text` |

## User problem

Moves safely between reading and editing a short value while retaining save, cancel, validation, and focus-return paths. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Require explicit edit, save, and cancel. Never save merely because focus moved; preserve the prior value until asynchronous acceptance succeeds.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `display` — Editable Text is stable, named, and ready for its primary reading or interaction job.
- `editing` — Editable Text communicates the `editing` condition with explicit text, structure, or native state rather than color alone.
- `saving` — Editable Text preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `error` — Editable Text explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `disabled` — Editable Text remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.editable-text` on `<div>`.
- Stable automation root: `[data-a3s-components~="editable-text"]`.
- Named parts: `action` (`[data-editable-action]`); `display` (`[data-editable-display]`); `form` (`[data-editable-form]`); `input` (`input, textarea`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:editable-text-before-commit`, `a3s:editable-text-cancel`, `a3s:editable-text-change`, `a3s:editable-text-edit`, `basecoat:initialized`.
- Public methods: `beginEdit`, `cancel`, `commit`, `getState`, `setValue`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty value, long value, Escape, invalid input, slow save, rejected save, unmount during save, and focus return to the edit trigger.

## Accessibility

The canonical root uses `<div>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `saving`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.editable-text` and is annotated by the runtime as `[data-a3s-components~="editable-text"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=editable-text]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty value, long value, Escape, invalid input, slow save, rejected save, unmount during save, and focus return to the edit trigger.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-expanded-contracts.acl`, scenario `editable-text`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-editable-text`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/editable-text.html`.
- Stable root target: `[data-a3s-components~="editable-text"]` inside `.a3s-preview[data-preview-component=editable-text][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/editable-text-states.png`.
- Per-state evidence selectors:
  - `display`: `.a3s-component-state-matrix[open][data-component=editable-text] [data-state-specimen=display]:has([data-a3s-components~='editable-text'][data-a3s-state~='display'])`
  - `editing`: `.a3s-component-state-matrix[open][data-component=editable-text] [data-state-specimen=editing]:has([data-a3s-components~='editable-text'][data-a3s-state~='editing'])`
  - `saving`: `.a3s-component-state-matrix[open][data-component=editable-text] [data-state-specimen=saving]:has([data-a3s-components~='editable-text'][data-a3s-state~='saving'][aria-busy=true])`
  - `error`: `.a3s-component-state-matrix[open][data-component=editable-text] [data-state-specimen=error]:has([data-a3s-components~='editable-text'][data-a3s-state~='error'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=editable-text] [data-state-specimen=disabled]:has([data-a3s-components~='editable-text'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
