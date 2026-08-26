# Context Menu Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `OV-05` |
| Decision | Keep |
| Priority | P1 |
| Category | `overlays` |
| Public route | `/en/components/context-menu.html` |
| Stable selector | `[data-a3s-components~="context-menu"]` |
| Interaction scenario | `components-navigation-overlays.acl#context-menu` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-context-menu` |

## User problem

Context Menu exposes commands tied to a file, canvas node, or data row. It supports right click, `Shift + F10`, the Menu key, arrow navigation, submenus, disabled items, and focus restoration. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Reuse the menu kernel and add invocation location, Shift+F10/Menu-key support, and context ownership. Split positioning, navigation, and lifecycle out of the current oversized controller.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `open` — Context Menu keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `closed` — Context Menu keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `disabled` — Context Menu remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.context-menu` on `<div>`.
- Stable automation root: `[data-a3s-components~="context-menu"]`.
- Named parts: `content` (`[data-context-content]`); `item` (`[role^=menuitem]`); `menu` (`[role=menu]`); `submenu` (`[data-context-submenu-content]`); `trigger` (`[data-context-trigger]`).
- Supported interaction intents: `click`, `focus`, `press`, `select`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:context-menu-before-close`, `a3s:context-menu-before-open`, `a3s:context-menu-before-select`, `a3s:context-menu-close`, `a3s:context-menu-open`, `a3s:context-menu-select`, `basecoat:initialized`.
- Public methods: `close`, `focusItem`, `getState`, `open`, `openAt`, `refresh`, `select`, `setChecked`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Right click, keyboard invocation, canvas edge, scrolled container, submenu, async unavailable action, focus return, two menus, and stale target removal.

## Accessibility

The canonical root uses `<div>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press`, `select` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.context-menu` and is annotated by the runtime as `[data-a3s-components~="context-menu"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=context-menu]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Right click, keyboard invocation, canvas edge, scrolled container, submenu, async unavailable action, focus return, two menus, and stale target removal.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-navigation-overlays.acl`, scenario `context-menu`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-context-menu`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/context-menu.html`.
- Stable root target: `[data-a3s-components~="context-menu"]` inside `.a3s-preview[data-preview-component=context-menu][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/context-menu-states.png`.
- Per-state evidence selectors:
  - `open`: `.a3s-component-state-matrix[open][data-component=context-menu] [data-state-specimen=open]:has([data-a3s-components~='context-menu'][data-a3s-state~='open']:has([data-context-trigger][aria-expanded=true]))`
  - `closed`: `.a3s-component-state-matrix[open][data-component=context-menu] [data-state-specimen=closed]:has([data-a3s-components~='context-menu'][data-a3s-state~='closed']:has([data-context-trigger][aria-expanded=false]))`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=context-menu] [data-state-specimen=disabled]:has([data-a3s-components~='context-menu'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
