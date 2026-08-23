# Bulk Action Bar Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-03` |
| Decision | Keep |
| Priority | P1 |
| Category | `actions` |
| Public route | `/en/components/bulk-action-bar.html` |
| Stable selector | `[data-a3s-components~="bulk-action-bar"]` |
| Interaction scenario | `components-feedback-data.acl#bulk-action-bar` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-bulk-action-bar` |

## User problem

Bulk Action Bar appears only after selection and keeps selection scope, eligibility, commands, and clear selection in one temporary task region. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Appear only after selection, state the exact scope, separate eligible from ineligible actions, and keep clear-selection adjacent. Collapse secondary actions on phones without hiding scope.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `empty` — Bulk Action Bar states what is absent and why when known, then offers only a valid next action.
- `selected` — Bulk Action Bar exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.
- `loading` — Bulk Action Bar preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `disabled` — Bulk Action Bar remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.bulk-action-bar` on `<section>`.
- Stable automation root: `[data-a3s-components~="bulk-action-bar"]`.
- Named parts: `action` (`[data-bulk-actions] button, [data-bulk-actions] a[href]`); `actions` (`[data-bulk-actions]`); `clear` (`[data-bulk-clear]`); `selection` (`[data-bulk-selection]`); `summary` (`[data-bulk-summary]`).
- Supported interaction intents: `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:bulk-action`, `a3s:bulk-action-complete`, `a3s:bulk-before-action`, `a3s:bulk-selection-change`, `basecoat:initialized`.
- Public methods: `clear`, `complete`, `getSelection`, `refresh`, `setPending`, `setSelection`, `setSummary`.
- Required root attributes: `aria-label=Selected item actions`, `role=region`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Zero/one/many selection, partial eligibility, remote rejection, sticky overlap, phone safe area, keyboard entry/exit, and restored selection.

## Accessibility

The canonical root uses `<section>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.bulk-action-bar` and is annotated by the runtime as `[data-a3s-components~="bulk-action-bar"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=bulk-action-bar]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Zero/one/many selection, partial eligibility, remote rejection, sticky overlap, phone safe area, keyboard entry/exit, and restored selection.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `bulk-action-bar`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-bulk-action-bar`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/bulk-action-bar.html`.
- Stable root target: `[data-a3s-components~="bulk-action-bar"]` inside `.a3s-preview[data-preview-component=bulk-action-bar][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/bulk-action-bar-states.png`.
- Per-state evidence selectors:
  - `empty`: `.a3s-component-state-matrix[open][data-component=bulk-action-bar] [data-state-specimen=empty]:has([data-a3s-components~='bulk-action-bar'][data-a3s-state~='empty'])`
  - `selected`: `.a3s-component-state-matrix[open][data-component=bulk-action-bar] [data-state-specimen=selected]:has([data-a3s-components~='bulk-action-bar'][data-a3s-state~='selected'][data-selected=true])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=bulk-action-bar] [data-state-specimen=loading]:has([data-a3s-components~='bulk-action-bar'][data-a3s-state~='loading'][aria-busy=true])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=bulk-action-bar] [data-state-specimen=disabled]:has([data-a3s-components~='bulk-action-bar'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
