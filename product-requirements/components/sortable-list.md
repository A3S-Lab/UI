# Sortable List Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `DC-18` |
| Decision | Keep |
| Priority | P1 |
| Category | `data-display` |
| Public route | `/en/components/sortable-list.html` |
| Stable selector | `[data-a3s-components~="sortable-list"]` |
| Interaction scenario | `components-expanded-contracts.acl#sortable-list` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-sortable-list` |

## User problem

Reorders a bounded ordered collection and gives pointer and keyboard paths the same result, cancellation, and status announcement. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Provide pointer and keyboard reordering with a visible destination, cancel path, live status, and completed event. Persistence and authorization remain host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Sortable List is stable, named, and ready for its primary reading or interaction job.
- `dragging` — Sortable List communicates the `dragging` condition with explicit text, structure, or native state rather than color alone.
- `keyboard` — Sortable List communicates the `keyboard` condition with explicit text, structure, or native state rather than color alone.
- `disabled` — Sortable List remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.sortable-list` on `<ol>`.
- Stable automation root: `[data-a3s-components~="sortable-list"]`.
- Named parts: `handle` (`[data-sortable-handle]`); `item` (`[data-sortable-item]`); `status` (`[data-sortable-status]`).
- Supported interaction intents: `drag`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:sortable-before-reorder`, `a3s:sortable-cancel`, `a3s:sortable-reorder`, `basecoat:initialized`.
- Public methods: `cancel`, `getOrder`, `move`, `refresh`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: First/last move, long list, disabled item, nested interactive content, pointer cancel, keyboard reorder, remote rejection rollback, auto-scroll, RTL, and touch.

## Accessibility

The canonical root uses `<ol>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `drag`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.sortable-list` and is annotated by the runtime as `[data-a3s-components~="sortable-list"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=sortable-list]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: First/last move, long list, disabled item, nested interactive content, pointer cancel, keyboard reorder, remote rejection rollback, auto-scroll, RTL, and touch.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-expanded-contracts.acl`, scenario `sortable-list`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-sortable-list`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/sortable-list.html`.
- Stable root target: `[data-a3s-components~="sortable-list"]` inside `.a3s-preview[data-preview-component=sortable-list][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/sortable-list-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=sortable-list] [data-state-specimen=ready]:has([data-a3s-components~='sortable-list'][data-a3s-state~='ready'])`
  - `dragging`: `.a3s-component-state-matrix[open][data-component=sortable-list] [data-state-specimen=dragging]:has([data-a3s-components~='sortable-list'][data-a3s-state~='dragging'])`
  - `keyboard`: `.a3s-component-state-matrix[open][data-component=sortable-list] [data-state-specimen=keyboard]:has([data-a3s-components~='sortable-list'][data-a3s-state~='keyboard'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=sortable-list] [data-state-specimen=disabled]:has([data-a3s-components~='sortable-list'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
