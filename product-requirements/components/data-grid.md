# Data Grid Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `DC-16` |
| Decision | Keep |
| Priority | P0 |
| Category | `data-display` |
| Public route | `/en/components/data-grid.html` |
| Stable selector | `[data-a3s-components~="data-grid"]` |
| Interaction scenario | `components-feedback-data.acl#data-grid` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-data-grid` |

## User problem

Data Grid handles resource collections that need sorting, selection, bulk actions, and remote pagination. It builds on Table, Checkbox, Filter Bar, and Pagination without owning queries, authorization, or data fetching. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own local grid navigation, presentation sort intent, selection, column visibility, and bulk-action coordination. Queries, authorization, mutations, and virtualization policy remain host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Data Grid is stable, named, and ready for its primary reading or interaction job.
- `loading` — Data Grid preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `empty` — Data Grid states what is absent and why when known, then offers only a valid next action.
- `error` — Data Grid explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `permission-denied` — Data Grid explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `partial` — Data Grid communicates the `partial` condition with explicit text, structure, or native state rather than color alone.
- `selected` — Data Grid exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.

## Interaction contract

- Canonical root: `.data-grid` on `<section>`.
- Stable automation root: `[data-a3s-components~="data-grid"]`.
- Named parts: `action` (`[data-grid-actions] button, [data-grid-actions] a[href]`); `bulkActions` (`:scope > .bulk-action-bar`); `row` (`tbody > tr`); `select` (`input[data-grid-select], input[data-grid-select-all]`); `sort` (`[data-grid-sort]`); `table` (`table`); `viewport` (`[data-grid-viewport]`).
- Supported interaction intents: `check`, `click`, `focus`, `press`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:data-grid-before-row-action`, `a3s:data-grid-before-selection-change`, `a3s:data-grid-before-sort`, `a3s:data-grid-row-action`, `a3s:data-grid-selection-change`, `a3s:data-grid-sort`, `a3s:data-grid-state-change`, `basecoat:initialized`.
- Public methods: `clearSelection`, `getSelection`, `getSort`, `getState`, `refresh`, `selectAll`, `setSelection`, `setSort`, `setState`, `toggleSelection`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Loading/empty/error/partial/denied, thousands of rows, remote sort failure, mixed selection, sticky regions, keyboard grid navigation, phone alternative, 200% zoom, and preserved focus/scroll.

## Accessibility

The canonical root uses `<section>` semantics and exposes 7 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `check`, `click`, `focus`, `press`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`, `permission-denied`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.data-grid` and is annotated by the runtime as `[data-a3s-components~="data-grid"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=data-grid]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Loading/empty/error/partial/denied, thousands of rows, remote sort failure, mixed selection, sticky regions, keyboard grid navigation, phone alternative, 200% zoom, and preserved focus/scroll.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `data-grid`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-data-grid`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/data-grid.html`.
- Stable root target: `[data-a3s-components~="data-grid"]` inside `.a3s-preview[data-preview-component=data-grid][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/data-grid-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=data-grid] [data-state-specimen=ready]:has([data-a3s-components~='data-grid'][data-a3s-state~='ready'])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=data-grid] [data-state-specimen=loading]:has([data-a3s-components~='data-grid'][data-a3s-state~='loading'][aria-busy=true])`
  - `empty`: `.a3s-component-state-matrix[open][data-component=data-grid] [data-state-specimen=empty]:has([data-a3s-components~='data-grid'][data-a3s-state~='empty'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=data-grid] [data-state-specimen=error]:has([data-a3s-components~='data-grid'][data-a3s-state~='error'])`
  - `permission-denied`: `.a3s-component-state-matrix[open][data-component=data-grid] [data-state-specimen=permission-denied]:has([data-a3s-components~='data-grid'][data-a3s-state~='permission-denied'])`
  - `partial`: `.a3s-component-state-matrix[open][data-component=data-grid] [data-state-specimen=partial]:has([data-a3s-components~='data-grid'][data-a3s-state~='partial'])`
  - `selected`: `.a3s-component-state-matrix[open][data-component=data-grid] [data-state-specimen=selected]:has([data-a3s-components~='data-grid'][data-a3s-state~='selected'][data-selected=true])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
