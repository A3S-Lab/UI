# Field Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-07` |
| Decision | Keep |
| Priority | P0 |
| Category | `forms` |
| Public route | `/en/components/field.html` |
| Stable selector | `[data-a3s-components~="field"]` |
| Interaction scenario | `components-actions-forms.acl#field` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-field` |

## User problem

Field combines a label, control, guidance, and validation feedback into one input unit so state and errors stay next to their target. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Become the single owner of label, description, control, requirement, and local error relationships. Prevent nested Field and Input Group borders from inventing parallel grammars.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Field is stable, named, and ready for its primary reading or interaction job.
- `disabled` — Field remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `invalid` — Field explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `readonly` — Field remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.field` on `<div>`.
- Stable automation root: `[data-a3s-components~="field"]`.
- Named parts: `control` (`input, textarea, select, [role=combobox]`); `description` (`:scope > p, [data-field-description]`); `label` (`label, legend`); `message` (`[data-field-message]`).
- This is a presentation contract. It must not invent click or keyboard behavior when the composed native elements do not own an action.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Missing optional content, multiple controls, required/optional labels, read-only, disabled, long translated errors, and correct `id`/`aria-describedby` chains.

## Accessibility

The canonical root uses `<div>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Any interactive descendants retain their own native names and keyboard behavior; the root does not add a false role. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.field` and is annotated by the runtime as `[data-a3s-components~="field"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=field]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Missing optional content, multiple controls, required/optional labels, read-only, disabled, long translated errors, and correct `id`/`aria-describedby` chains.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `field`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-field`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/field.html`.
- Stable root target: `[data-a3s-components~="field"]` inside `.a3s-preview[data-preview-component=field][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/field-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=field] [data-state-specimen=ready]:has([data-a3s-components~='field'][data-a3s-state~='ready'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=field] [data-state-specimen=disabled]:has([data-a3s-components~='field'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=field] [data-state-specimen=invalid]:has([data-a3s-components~='field'][data-a3s-state~='invalid']:is([aria-invalid=true],[data-validation-state=invalid],:has([aria-invalid=true])))`
  - `readonly`: `.a3s-component-state-matrix[open][data-component=field] [data-state-specimen=readonly]:has([data-a3s-components~='field'][data-a3s-state~='readonly']:is([readonly],[aria-readonly=true],[data-readonly],:has([readonly])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
