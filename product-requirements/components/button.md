# Button Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-01` |
| Decision | Keep |
| Priority | P0 |
| Category | `actions` |
| Public route | `/en/components/button.html` |
| Stable selector | `[data-a3s-components~="button"]` |
| Interaction scenario | `components-actions-forms.acl#button` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-button` |

## User problem

Buttons trigger actions in the current interface. Use a link with `href`, styled as a button, when the outcome is navigation. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Make one action unmistakable without turning every action blue. Unify filled, tonal, outline, ghost, danger, link, icon, loading, and compact treatments on one height and focus contract.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Button is stable, named, and ready for its primary reading or interaction job.
- `disabled` — Button remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `loading` — Button preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `pressed` — Button exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.

## Interaction contract

- Canonical root: `.btn` on `<button>`.
- Stable automation root: `[data-a3s-components~="button"]`.
- Named parts: none; consumers must not depend on incidental descendants.
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: `type=button`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Long labels, icon-only names, rapid repeat, loading width, disabled submission, touch target, dark focus, and one-primary-action screenshots.

## Accessibility

The canonical root uses `<button>` semantics and exposes 0 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.btn` and is annotated by the runtime as `[data-a3s-components~="button"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=button]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Long labels, icon-only names, rapid repeat, loading width, disabled submission, touch target, dark focus, and one-primary-action screenshots.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `button`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-button`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/button.html`.
- Stable root target: `[data-a3s-components~="button"]` inside `.a3s-preview[data-preview-component=button][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/button-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=button] [data-state-specimen=ready]:has([data-a3s-components~='button'][data-a3s-state~='ready'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=button] [data-state-specimen=disabled]:has([data-a3s-components~='button'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
  - `loading`: `.a3s-component-state-matrix[open][data-component=button] [data-state-specimen=loading]:has([data-a3s-components~='button'][data-a3s-state~='loading'][aria-busy=true])`
  - `pressed`: `.a3s-component-state-matrix[open][data-component=button] [data-state-specimen=pressed]:has([data-a3s-components~='button'][data-a3s-state~='pressed'][aria-pressed=true])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
