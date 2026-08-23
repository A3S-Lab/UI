# Scroll Area Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `UT-01` |
| Decision | Demote |
| Priority | P0 |
| Category | `utilities` |
| Public route | `/en/components/scroll-area.html` |
| Stable selector | `[data-a3s-components~="scroll-area"]` |
| Interaction scenario | `components-application-utilities.acl#scroll-area` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-scroll-area` |

## User problem

Scroll Area bounds long content while preserving its reading order and a discoverable, native-feeling scroll path. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Demote**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Treat `.scrollbar` and `.scrollbar-sm` as native overflow styling utilities, not a framework component or controller. Keep scroll ownership with the consuming region.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Scroll Area is stable, named, and ready for its primary reading or interaction job.

## Interaction contract

- Canonical root: `.scrollbar, .scrollbar-sm` on `<div>`.
- Stable automation root: `[data-a3s-components~="scroll-area"]`.
- Named parts: none; consumers must not depend on incidental descendants.
- Supported interaction intents: `focus`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `scroll`.
- Required root attributes: `tabindex=0`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Native wheel/touch/keyboard, horizontal/vertical, nested owners, forced colors, platform scrollbars, RTL, reduced motion, no generic adapter wrapper, and major-version manifest migration.

## Accessibility

The canonical root uses `<div>` semantics and exposes 0 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `focus`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.scrollbar, .scrollbar-sm` and is annotated by the runtime as `[data-a3s-components~="scroll-area"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=scroll-area]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Native wheel/touch/keyboard, horizontal/vertical, nested owners, forced colors, platform scrollbars, RTL, reduced motion, no generic adapter wrapper, and major-version manifest migration.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `scroll-area`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-scroll-area`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/scroll-area.html`.
- Stable root target: `[data-a3s-components~="scroll-area"]` inside `.a3s-preview[data-preview-component=scroll-area][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/scroll-area-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=scroll-area] [data-state-specimen=ready]:has([data-a3s-components~='scroll-area'][data-a3s-state~='ready'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
