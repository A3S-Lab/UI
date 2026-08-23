# Context Selector Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-06` |
| Decision | Narrow |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/context-selector.html` |
| Stable selector | `[data-a3s-components~="context-selector"]` |
| Interaction scenario | `components-application-utilities.acl#context-selector` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-context-selector` |

## User problem

Context Selector provides one compact contract for model, permission, and workspace choices. Native Select is preferred when options fit ordinary selection behavior. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Narrow**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Coordinate a compact set of model, workspace, and permission choices only when their dependency is meaningful. Ordinary independent choices remain native Select or Combobox.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Context Selector is stable, named, and ready for its primary reading or interaction job.
- `loading` — Context Selector preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `disabled` — Context Selector remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `invalid` — Context Selector explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `unavailable` — Context Selector explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.context-selector` on `<label>`.
- Stable automation root: `[data-a3s-components~="context-selector"]`.
- Named parts: `control` (`select, button[aria-haspopup]`); `description` (`[data-context-description]`); `label` (`[data-context-label]`).
- Supported interaction intents: `click`, `focus`, `select`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `change`, `input`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: One/many dimensions, unavailable choice, dependency reset, loading/error, long model name, permission warning, keyboard navigation, phone sheet, and host-controlled value updates.

## Accessibility

The canonical root uses `<label>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `select` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`, `unavailable`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.context-selector` and is annotated by the runtime as `[data-a3s-components~="context-selector"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=context-selector]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: One/many dimensions, unavailable choice, dependency reset, loading/error, long model name, permission warning, keyboard navigation, phone sheet, and host-controlled value updates.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `context-selector`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-context-selector`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/context-selector.html`.
- Stable root target: `[data-a3s-components~="context-selector"]` inside `.a3s-preview[data-preview-component=context-selector][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/context-selector-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=context-selector] [data-state-specimen=ready]:has([data-a3s-components~='context-selector'][data-a3s-state~='ready'])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=context-selector] [data-state-specimen=loading]:has([data-a3s-components~='context-selector'][data-a3s-state~='loading'][aria-busy=true])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=context-selector] [data-state-specimen=disabled]:has([data-a3s-components~='context-selector'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=context-selector] [data-state-specimen=invalid]:has([data-a3s-components~='context-selector'][data-a3s-state~='invalid']:is([aria-invalid=true],[data-validation-state=invalid],:has([aria-invalid=true])))`
  - `unavailable`: `.a3s-component-state-matrix[open][data-component=context-selector] [data-state-specimen=unavailable]:has([data-a3s-components~='context-selector'][data-a3s-state~='unavailable']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
