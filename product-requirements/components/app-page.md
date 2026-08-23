# App Page Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `LW-02` |
| Decision | Narrow |
| Priority | P1 |
| Category | `application` |
| Public route | `/en/components/app-page.html` |
| Stable selector | `[data-a3s-components~="app-page"]` |
| Interaction scenario | `components-application-utilities.acl#app-page` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-app-page` |

## User problem

App Page provides an open, width-bounded page frame for projects, automations, catalogs, forms, and detail views inside App Shell. It keeps page identity and actions stable without adding a card around the whole view. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Narrow**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own page identity, width, actions, and state placement inside App Shell. Catalogs, settings, and task views supply content; App Page does not prescribe their business entities.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — App Page is stable, named, and ready for its primary reading or interaction job.
- `loading` — App Page preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `empty` — App Page states what is absent and why when known, then offers only a valid next action.
- `error` — App Page explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `permission-denied` — App Page explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.app-page` on `<section>`.
- Stable automation root: `[data-a3s-components~="app-page"]`.
- Named parts: `action` (`[data-page-actions] button, [data-page-actions] a[href]`); `actions` (`[data-page-actions]`); `content` (`[data-page-content]`); `identity` (`[data-page-identity]`).
- Supported interaction intents: `click`, `focus`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: No actions, many actions, loading/empty/error/denied, long title, breadcrumbs, narrow header, sticky action overlap, and open canvas without an outer card.

## Accessibility

The canonical root uses `<section>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`, `permission-denied`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.app-page` and is annotated by the runtime as `[data-a3s-components~="app-page"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=app-page]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: No actions, many actions, loading/empty/error/denied, long title, breadcrumbs, narrow header, sticky action overlap, and open canvas without an outer card.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `app-page`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-app-page`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/app-page.html`.
- Stable root target: `[data-a3s-components~="app-page"]` inside `.a3s-preview[data-preview-component=app-page][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/app-page-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=app-page] [data-state-specimen=ready]:has([data-a3s-components~='app-page'][data-a3s-state~='ready'])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=app-page] [data-state-specimen=loading]:has([data-a3s-components~='app-page'][data-a3s-state~='loading'][aria-busy=true])`
  - `empty`: `.a3s-component-state-matrix[open][data-component=app-page] [data-state-specimen=empty]:has([data-a3s-components~='app-page'][data-a3s-state~='empty'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=app-page] [data-state-specimen=error]:has([data-a3s-components~='app-page'][data-a3s-state~='error'])`
  - `permission-denied`: `.a3s-component-state-matrix[open][data-component=app-page] [data-state-specimen=permission-denied]:has([data-a3s-components~='app-page'][data-a3s-state~='permission-denied'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
