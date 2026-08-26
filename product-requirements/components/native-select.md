# Native Select Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `SS-01` |
| Decision | Keep |
| Priority | P0 |
| Category | `forms` |
| Public route | `/en/components/native-select.html` |
| Stable selector | `[data-a3s-components~="native-select"]` |
| Interaction scenario | `components-actions-forms.acl#native-select` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-native-select` |

## User problem

Native Select lets users choose one value from a short fixed list while preserving familiar operating-system interaction and accessibility. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Make the native control the default for ordinary finite choice. Add a canonical class distinct from custom Select while retaining the current alias through migration.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `empty` — Native Select states what is absent and why when known, then offers only a valid next action.
- `ready` — Native Select is stable, named, and ready for its primary reading or interaction job.
- `disabled` — Native Select remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `invalid` — Native Select explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `select.native-select` on `<select>`.
- Stable automation root: `[data-a3s-components~="native-select"]`.
- Named parts: none; consumers must not depend on incidental descendants.
- Supported interaction intents: `focus`, `select`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `change`, `input`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: iOS/Android picker, long option, disabled group, invalid state, high contrast, RTL, autofill, and 200% zoom.

## Accessibility

The canonical root uses `<select>` semantics and exposes 0 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `focus`, `select` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `select.native-select` and is annotated by the runtime as `[data-a3s-components~="native-select"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=native-select]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: iOS/Android picker, long option, disabled group, invalid state, high contrast, RTL, autofill, and 200% zoom.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `native-select`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-native-select`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/native-select.html`.
- Stable root target: `[data-a3s-components~="native-select"]` inside `.a3s-preview[data-preview-component=native-select][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/native-select-states.png`.
- Per-state evidence selectors:
  - `empty`: `.a3s-component-state-matrix[open][data-component=native-select] [data-state-specimen=empty]:has([data-a3s-components~='native-select'][data-a3s-state~='empty'])`
  - `ready`: `.a3s-component-state-matrix[open][data-component=native-select] [data-state-specimen=ready]:has([data-a3s-components~='native-select'][data-a3s-state~='ready'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=native-select] [data-state-specimen=disabled]:has([data-a3s-components~='native-select'][data-a3s-state~='disabled'][disabled])`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=native-select] [data-state-specimen=invalid]:has([data-a3s-components~='native-select'][data-a3s-state~='invalid'][required][aria-invalid=true]:invalid)`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
