# Floating Panel Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `OV-07` |
| Decision | Narrow |
| Priority | P1 |
| Category | `overlays` |
| Public route | `/en/components/floating-panel.html` |
| Stable selector | `[data-a3s-components~="floating-panel"]` |
| Interaction scenario | `components-expanded-contracts.acl#floating-panel` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-floating-panel` |

## User problem

Keeps an inspector, helper, or temporary context beside the primary task and naturally becomes a bottom sheet on narrow screens. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Narrow**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own a movable or dockable auxiliary workspace only when continuity beside the main task matters. Sheet mode is responsive presentation; docking persistence stays host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `open` — Floating Panel keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `closed` — Floating Panel keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `floating` — Floating Panel keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `docked` — Floating Panel keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `sheet` — Floating Panel keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.

## Interaction contract

- Canonical root: `.floating-panel` on `<aside>`.
- Stable automation root: `[data-a3s-components~="floating-panel"]`.
- Named parts: `action` (`button, a[href]`); `content` (`:scope > section`); `header` (`:scope > header`); `resizeHandle` (`[data-floating-panel-resize]`).
- Supported interaction intents: `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:floating-panel-before-close`, `a3s:floating-panel-before-open`, `a3s:floating-panel-close`, `a3s:floating-panel-open`, `basecoat:initialized`.
- Public methods: `close`, `getState`, `open`, `toggle`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Drag boundaries, keyboard alternative, docking, resize, reduced motion, phone sheet, content error, multiple panels, z-index with Dialog, and return to trigger.

## Accessibility

The canonical root uses `<aside>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.floating-panel` and is annotated by the runtime as `[data-a3s-components~="floating-panel"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=floating-panel]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Drag boundaries, keyboard alternative, docking, resize, reduced motion, phone sheet, content error, multiple panels, z-index with Dialog, and return to trigger.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-expanded-contracts.acl`, scenario `floating-panel`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-floating-panel`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/floating-panel.html`.
- Stable root target: `[data-a3s-components~="floating-panel"]` inside `.a3s-preview[data-preview-component=floating-panel][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/floating-panel-states.png`.
- Per-state evidence selectors:
  - `open`: `.a3s-component-state-matrix[open][data-component=floating-panel] [data-state-specimen=open]:has([data-a3s-components~='floating-panel'][data-a3s-state~='open']:is([open],[aria-expanded=true]))`
  - `closed`: `.a3s-component-state-matrix[open][data-component=floating-panel] [data-state-specimen=closed]:has([data-a3s-components~='floating-panel'][data-a3s-state~='closed']:is(:not([open]),[aria-expanded=false]))`
  - `floating`: `.a3s-component-state-matrix[open][data-component=floating-panel] [data-state-specimen=floating]:has([data-a3s-components~='floating-panel'][data-a3s-state~='floating'])`
  - `docked`: `.a3s-component-state-matrix[open][data-component=floating-panel] [data-state-specimen=docked]:has([data-a3s-components~='floating-panel'][data-a3s-state~='docked'])`
  - `sheet`: `.a3s-component-state-matrix[open][data-component=floating-panel] [data-state-specimen=sheet]:has([data-a3s-components~='floating-panel'][data-a3s-state~='sheet'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
