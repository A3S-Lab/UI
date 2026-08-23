# Date Picker Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `SS-05` |
| Decision | Narrow |
| Priority | P1 |
| Category | `forms` |
| Public route | `/en/components/date-picker.html` |
| Stable selector | `[data-a3s-components~="date-picker"]` |
| Interaction scenario | `components-expanded-contracts.acl#date-picker` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-date-picker` |

## User problem

Collects one calendar date through the native input, preserving the browser, locale, and mobile platform selection experience. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Narrow**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Default to native `input[type=date]`; own presentation and validation only. Time zones, date ranges, recurrence, and business calendars remain separate host problems.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Date Picker is stable, named, and ready for its primary reading or interaction job.
- `disabled` — Date Picker remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `invalid` — Date Picker explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `read-only` — Date Picker remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `input.date-picker` on `<input>`.
- Stable automation root: `[data-a3s-components~="date-picker"]`.
- Named parts: none; consumers must not depend on incidental descendants.
- Supported interaction intents: `fill`, `focus`, `press`, `select`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `change`, `input`.
- Required root attributes: `type=date`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Locale order, min/max, leap day, empty/invalid, read-only, mobile picker, keyboard entry, and no accidental UTC conversion.

## Accessibility

The canonical root uses `<input>` semantics and exposes 0 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `fill`, `focus`, `press`, `select` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `input.date-picker` and is annotated by the runtime as `[data-a3s-components~="date-picker"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=date-picker]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Locale order, min/max, leap day, empty/invalid, read-only, mobile picker, keyboard entry, and no accidental UTC conversion.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-expanded-contracts.acl`, scenario `date-picker`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-date-picker`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/date-picker.html`.
- Stable root target: `[data-a3s-components~="date-picker"]` inside `.a3s-preview[data-preview-component=date-picker][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/date-picker-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=date-picker] [data-state-specimen=ready]:has([data-a3s-components~='date-picker'][data-a3s-state~='ready'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=date-picker] [data-state-specimen=disabled]:has([data-a3s-components~='date-picker'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=date-picker] [data-state-specimen=invalid]:has([data-a3s-components~='date-picker'][data-a3s-state~='invalid']:is([aria-invalid=true],[data-validation-state=invalid],:has([aria-invalid=true])))`
  - `read-only`: `.a3s-component-state-matrix[open][data-component=date-picker] [data-state-specimen=read-only]:has([data-a3s-components~='date-picker'][data-a3s-state~='read-only']:is([readonly],[aria-readonly=true],[data-readonly],:has([readonly])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
