# Slider Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `SS-12` |
| Decision | Keep |
| Priority | P1 |
| Category | `forms` |
| Public route | `/en/components/slider.html` |
| Stable selector | `[data-a3s-components~="slider"]` |
| Interaction scenario | `components-actions-forms.acl#slider` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-slider` |

## User problem

Slider adjusts an approximate value within a bounded range. Use it when users can perceive the result immediately and relative position matters more than typing an exact number. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Use for bounded approximate numeric adjustment and pair it with an output. Exact high-stakes values require an Input fallback.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Slider is stable, named, and ready for its primary reading or interaction job.
- `disabled` — Slider remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `input.input[type=range]` on `<input>`.
- Stable automation root: `[data-a3s-components~="slider"]`.
- Named parts: none; consumers must not depend on incidental descendants.
- Supported interaction intents: `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `change`, `input`.
- Required root attributes: `max=100`, `min=0`, `type=range`, `value=50`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Min/max/step, arrow/Page/Home/End, vertical/RTL mapping, coarse touch, exact-value entry, disabled, long unit, and no fill-only meaning.

## Accessibility

The canonical root uses `<input>` semantics and exposes 0 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `input.input[type=range]` and is annotated by the runtime as `[data-a3s-components~="slider"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=slider]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Min/max/step, arrow/Page/Home/End, vertical/RTL mapping, coarse touch, exact-value entry, disabled, long unit, and no fill-only meaning.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `slider`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-slider`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/slider.html`.
- Stable root target: `[data-a3s-components~="slider"]` inside `.a3s-preview[data-preview-component=slider][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/slider-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=slider] [data-state-specimen=ready]:has([data-a3s-components~='slider'][data-a3s-state~='ready'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=slider] [data-state-specimen=disabled]:has([data-a3s-components~='slider'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
