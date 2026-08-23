# Breadcrumb Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `NV-02` |
| Decision | Keep |
| Priority | P1 |
| Category | `navigation` |
| Public route | `/en/components/breadcrumb.html` |
| Stable selector | `[data-a3s-components~="breadcrumb"]` |
| Interaction scenario | `components-navigation-overlays.acl#breadcrumb` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-breadcrumb` |

## User problem

Breadcrumb shows the current location within an information hierarchy and provides direct paths back to parent pages. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Communicate hierarchical location, not browsing history. Current location is not a redundant link; collapse preserves the first useful ancestor and immediate parent.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Breadcrumb is stable, named, and ready for its primary reading or interaction job.

## Interaction contract

- Canonical root: `.breadcrumb` on `<nav>`.
- Stable automation root: `[data-a3s-components~="breadcrumb"]`.
- Named parts: `current` (`[aria-current=page]`); `item` (`li`); `link` (`a[href]`).
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: `aria-label=Breadcrumb`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Deep path, long filename, one level, inaccessible ancestor, collapsed menu, RTL separators, 320px overflow, and 200% zoom.

## Accessibility

The canonical root uses `<nav>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.breadcrumb` and is annotated by the runtime as `[data-a3s-components~="breadcrumb"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=breadcrumb]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Deep path, long filename, one level, inaccessible ancestor, collapsed menu, RTL separators, 320px overflow, and 200% zoom.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-navigation-overlays.acl`, scenario `breadcrumb`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-breadcrumb`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/breadcrumb.html`.
- Stable root target: `[data-a3s-components~="breadcrumb"]` inside `.a3s-preview[data-preview-component=breadcrumb][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/breadcrumb-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=breadcrumb] [data-state-specimen=ready]:has([data-a3s-components~='breadcrumb'][data-a3s-state~='ready'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
