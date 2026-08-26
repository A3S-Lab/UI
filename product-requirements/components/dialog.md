# Dialog Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `OV-02` |
| Decision | Keep |
| Priority | P0 |
| Category | `overlays` |
| Public route | `/en/components/dialog.html` |
| Stable selector | `[data-a3s-components~="dialog"]` |
| Interaction scenario | `components-navigation-overlays.acl#dialog` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-dialog` |

## User problem

Dialog contains focus within a short task that needs explicit confirmation or additional input, then returns users to the originating flow. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own a bounded modal task with title, description, content, actions, containment, and return focus. Complex page-scale work belongs in Drawer or App Page.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `open` — Dialog keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `closed` — Dialog keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.

## Interaction contract

- Canonical root: `dialog.dialog` on `<dialog>`.
- Stable automation root: `[data-a3s-components~="dialog"]`.
- Named parts: `action` (`button, .btn`); `content` (`:scope > div, :scope > article`); `description` (`[aria-describedby]`); `title` (`[aria-labelledby]`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `cancel`, `close`.
- Public methods: `close`, `showModal`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: No title rejection, long form, validation error, async save, dirty close, stacked overlay, scroll lock, mobile height, virtual keyboard, and restore focus after trigger removal.

## Accessibility

The canonical root uses `<dialog>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `dialog.dialog` and is annotated by the runtime as `[data-a3s-components~="dialog"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=dialog]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: No title rejection, long form, validation error, async save, dirty close, stacked overlay, scroll lock, mobile height, virtual keyboard, and restore focus after trigger removal.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-navigation-overlays.acl`, scenario `dialog`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-dialog`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/dialog.html`.
- Stable root target: `[data-a3s-components~="dialog"]` inside `.a3s-preview[data-preview-component=dialog][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/dialog-states.png`.
- Per-state evidence selectors:
  - `open`: `.a3s-component-state-matrix[open][data-component=dialog] [data-state-specimen=open]:has([data-a3s-components~='dialog'][data-a3s-state~='open']:is([open],[aria-expanded=true]))`
  - `closed`: `.a3s-component-state-matrix[open][data-component=dialog] [data-state-specimen=closed]:has([data-a3s-components~='dialog'][data-a3s-state~='closed']:is(:not([open]),[aria-expanded=false]))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
