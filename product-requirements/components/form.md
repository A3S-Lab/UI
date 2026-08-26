# Form Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-06` |
| Decision | Keep |
| Priority | P0 |
| Category | `forms` |
| Public route | `/en/components/form.html` |
| Stable selector | `[data-a3s-components~="form"]` |
| Interaction scenario | `components-expanded-contracts.acl#form` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-form` |

## User problem

Organizes related fields, validation summary, and submission into one recoverable task while preserving native browser semantics. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own semantic grouping, submission state, and summary validation, not data persistence. Preserve entered values and focus the first actionable error after failure.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Form is stable, named, and ready for its primary reading or interaction job.
- `submitting` — Form preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `success` — Form presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `invalid` — Form explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Form explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `read-only` — Form remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `form.form` on `<form>`.
- Stable automation root: `[data-a3s-components~="form"]`.
- Named parts: `action` (`:scope > footer button, [type=submit], [type=reset]`); `error` (`[data-form-error], [role=alert]`); `field` (`.field, [data-form-field]`); `summary` (`[data-form-summary]`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `reset`, `submit`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Native and server validation, duplicate submit, offline submit, partial failure, read-only mode, long error summary, and recovery without data loss.

## Accessibility

The canonical root uses `<form>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `submitting`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `form.form` and is annotated by the runtime as `[data-a3s-components~="form"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=form]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Native and server validation, duplicate submit, offline submit, partial failure, read-only mode, long error summary, and recovery without data loss.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-expanded-contracts.acl`, scenario `form`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-form`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/form.html`.
- Stable root target: `[data-a3s-components~="form"]` inside `.a3s-preview[data-preview-component=form][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/form-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=form] [data-state-specimen=ready]:has([data-a3s-components~='form'][data-a3s-state~='ready'])`
  - `submitting`: `.a3s-component-state-matrix[open][data-component=form] [data-state-specimen=submitting]:has([data-a3s-components~='form'][data-a3s-state~='submitting'][aria-busy=true])`
  - `success`: `.a3s-component-state-matrix[open][data-component=form] [data-state-specimen=success]:has([data-a3s-components~='form'][data-a3s-state~='success'])`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=form] [data-state-specimen=invalid]:has([data-a3s-components~='form'][data-a3s-state~='invalid']:is([aria-invalid=true],[data-validation-state=invalid],:has([aria-invalid=true])))`
  - `error`: `.a3s-component-state-matrix[open][data-component=form] [data-state-specimen=error]:has([data-a3s-components~='form'][data-a3s-state~='error'])`
  - `read-only`: `.a3s-component-state-matrix[open][data-component=form] [data-state-specimen=read-only]:has([data-a3s-components~='form'][data-a3s-state~='read-only']:is([readonly],[aria-readonly=true],[data-readonly],:has([readonly])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
