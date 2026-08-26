# Select Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `SS-02` |
| Decision | Keep |
| Priority | P0 |
| Category | `forms` |
| Public route | `/en/components/select.html` |
| Stable selector | `[data-a3s-components~="select"]` |
| Interaction scenario | `components-actions-forms.acl#select` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-select` |

## User problem

Select provides a styled single-choice list when the product needs a consistent popup or richer option content. Use Combobox when users need to search or create values. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Use only when options need richer rendering or interaction than native Select. Share the overlay and choice kernels; the trigger always states the current value.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Select is stable, named, and ready for its primary reading or interaction job.
- `disabled` — Select remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `expanded` — Select keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `collapsed` — Select keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `invalid` — Select explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.select:not(select)` on `<div>`.
- Stable automation root: `[data-a3s-components~="select"]`.
- Named parts: `option` (`[role=option]`); `popup` (`[role=listbox], [data-popover]`); `trigger` (`button[aria-haspopup=listbox]`); `value` (`button[aria-haspopup=listbox] > span`).
- Supported interaction intents: `click`, `focus`, `press`, `select`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `change`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Typeahead, Home/End, disabled options, empty/loading/error, collision, touch sheet presentation, outside click, Escape, and focus restoration.

## Accessibility

The canonical root uses `<div>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press`, `select` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.select:not(select)` and is annotated by the runtime as `[data-a3s-components~="select"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=select]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Typeahead, Home/End, disabled options, empty/loading/error, collision, touch sheet presentation, outside click, Escape, and focus restoration.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `select`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-select`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/select.html`.
- Stable root target: `[data-a3s-components~="select"]` inside `.a3s-preview[data-preview-component=select][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/select-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=select] [data-state-specimen=ready]:has([data-a3s-components~='select'][data-a3s-state~='ready'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=select] [data-state-specimen=disabled]:has([data-a3s-components~='select'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
  - `expanded`: `.a3s-component-state-matrix[open][data-component=select] [data-state-specimen=expanded]:has([data-a3s-components~='select'][data-a3s-state~='expanded']:has(button[aria-haspopup=listbox][aria-expanded=true]))`
  - `collapsed`: `.a3s-component-state-matrix[open][data-component=select] [data-state-specimen=collapsed]:has([data-a3s-components~='select'][data-a3s-state~='collapsed']:has(button[aria-haspopup=listbox][aria-expanded=false]))`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=select] [data-state-specimen=invalid]:has([data-a3s-components~='select'][data-a3s-state~='invalid']:is([aria-invalid=true],[data-validation-state=invalid],:has([aria-invalid=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
