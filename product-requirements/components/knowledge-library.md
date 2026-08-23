# Knowledge Library Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-29` |
| Decision | Keep |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/knowledge-library.html` |
| Stable selector | `[data-a3s-components~="knowledge-library"]` |
| Interaction scenario | `components-application-utilities.acl#knowledge-library` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-knowledge-library` |

## User problem

Knowledge Library manages durable source collections, indexing state, search, pinned libraries, recovery, and per-library settings without pretending that a visual component owns ingestion, embeddings, storage, or permissions. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own the understandable catalog and management surface for knowledge bases, sources, ingestion state, freshness, access, and task attachment. Retrieval, embedding, indexing, permissions, storage, and source connectors remain host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Knowledge Library is stable, named, and ready for its primary reading or interaction job.
- `loading` — Knowledge Library preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `empty` — Knowledge Library states what is absent and why when known, then offers only a valid next action.
- `partial` — Knowledge Library communicates the `partial` condition with explicit text, structure, or native state rather than color alone.
- `error` — Knowledge Library explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `offline` — Knowledge Library explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `permission-denied` — Knowledge Library explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.knowledge-library` on `<section>`.
- Stable automation root: `[data-a3s-components~="knowledge-library"]`.
- Named parts: `action` (`[data-knowledge-action]`); `detail` (`[data-knowledge-library-detail]`); `filter` (`[data-knowledge-filter]`); `item` (`[data-knowledge-item]`); `navigation` (`[data-knowledge-library-navigation]`); `search` (`[data-knowledge-library-search] input, input[data-knowledge-library-search]`); `state` (`[data-knowledge-library-state]`); `status` (`[data-knowledge-library-status]`); `viewport` (`[data-knowledge-library-viewport]`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`, `select`, `type`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:knowledge-action`, `a3s:knowledge-before-action`, `a3s:knowledge-before-filter-change`, `a3s:knowledge-before-selection-change`, `a3s:knowledge-filter-change`, `a3s:knowledge-phase-change`, `a3s:knowledge-selection-change`, `a3s:knowledge-state-change`, `basecoat:initialized`.
- Public methods: `clearFilter`, `clearSelection`, `getFilter`, `getSelection`, `getState`, `refresh`, `runAction`, `select`, `setFilter`, `setPhase`, `setState`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/loading/partial/error/denied/offline, many bases and sources, stale or failed ingestion, duplicate source, destructive removal, search/filter, keyboard management, phone master-detail, and recovery without losing context.

## Accessibility

The canonical root uses `<section>` semantics and exposes 9 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press`, `select`, `type`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`, `offline`, `permission-denied`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.knowledge-library` and is annotated by the runtime as `[data-a3s-components~="knowledge-library"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=knowledge-library]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/loading/partial/error/denied/offline, many bases and sources, stale or failed ingestion, duplicate source, destructive removal, search/filter, keyboard management, phone master-detail, and recovery without losing context.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `knowledge-library`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-knowledge-library`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/knowledge-library.html`.
- Stable root target: `[data-a3s-components~="knowledge-library"]` inside `.a3s-preview[data-preview-component=knowledge-library][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/knowledge-library-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=knowledge-library] [data-state-specimen=ready]:has([data-a3s-components~='knowledge-library'][data-a3s-state~='ready'])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=knowledge-library] [data-state-specimen=loading]:has([data-a3s-components~='knowledge-library'][data-a3s-state~='loading'][aria-busy=true])`
  - `empty`: `.a3s-component-state-matrix[open][data-component=knowledge-library] [data-state-specimen=empty]:has([data-a3s-components~='knowledge-library'][data-a3s-state~='empty'])`
  - `partial`: `.a3s-component-state-matrix[open][data-component=knowledge-library] [data-state-specimen=partial]:has([data-a3s-components~='knowledge-library'][data-a3s-state~='partial'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=knowledge-library] [data-state-specimen=error]:has([data-a3s-components~='knowledge-library'][data-a3s-state~='error'])`
  - `offline`: `.a3s-component-state-matrix[open][data-component=knowledge-library] [data-state-specimen=offline]:has([data-a3s-components~='knowledge-library'][data-a3s-state~='offline'])`
  - `permission-denied`: `.a3s-component-state-matrix[open][data-component=knowledge-library] [data-state-specimen=permission-denied]:has([data-a3s-components~='knowledge-library'][data-a3s-state~='permission-denied'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
