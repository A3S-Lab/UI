# File Manager Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-28` |
| Decision | Keep |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/file-manager.html` |
| Stable selector | `[data-a3s-components~="file-manager"]` |
| Interaction scenario | `components-application-utilities.acl#file-manager` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-file-manager` |

## User problem

File Manager presents workspace locations, folder navigation, multi-selection, search, grid or list views, Quick Look, and recoverable file actions in one bounded surface. The trusted host still owns filesystem I/O, permissions, persistence, downloads, and trash recovery. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own a Finder-like projection of location, hierarchy, selection, view mode, search, sorting, and file-operation intent. File Explorer remains the compact tree primitive; storage, permissions, transfer, conflict resolution, and undo stay host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — File Manager is stable, named, and ready for its primary reading or interaction job.
- `loading` — File Manager preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `empty` — File Manager states what is absent and why when known, then offers only a valid next action.
- `partial` — File Manager communicates the `partial` condition with explicit text, structure, or native state rather than color alone.
- `error` — File Manager explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `offline` — File Manager explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `permission-denied` — File Manager explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `readonly` — File Manager remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.file-manager` on `<section>`.
- Stable automation root: `[data-a3s-components~="file-manager"]`.
- Named parts: `action` (`[data-file-action]`); `item` (`[data-file-item]`); `navigation` (`[data-file-manager-navigation]`); `preview` (`[data-file-manager-preview]`); `search` (`[data-file-manager-search] input, input[data-file-manager-search]`); `selection` (`[data-file-manager-selection]`); `state` (`[data-file-manager-state]`); `status` (`[data-file-manager-status]`); `toolbar` (`[data-file-manager-toolbar]`); `viewport` (`[data-file-manager-viewport]`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`, `select`, `type`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:file-manager-action`, `a3s:file-manager-before-action`, `a3s:file-manager-before-filter-change`, `a3s:file-manager-before-selection-change`, `a3s:file-manager-filter-change`, `a3s:file-manager-preview-change`, `a3s:file-manager-selection-change`, `a3s:file-manager-state-change`, `a3s:file-manager-view-change`, `basecoat:initialized`.
- Public methods: `clearFilter`, `clearSelection`, `closePreview`, `getFilter`, `getSelection`, `getState`, `getView`, `openPreview`, `refresh`, `runAction`, `select`, `setFilter`, `setReadonly`, `setState`, `setView`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/loading/error/denied/read-only, huge folders, list/grid modes with filename and type on distinct bounded lines, multi-selection, rename/move/delete conflicts, upload progress, external changes, keyboard navigation, phone drill-down, RTL, and rejected-operation rollback.

## Accessibility

The canonical root uses `<section>` semantics and exposes 10 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press`, `select`, `type`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`, `offline`, `permission-denied`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.file-manager` and is annotated by the runtime as `[data-a3s-components~="file-manager"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=file-manager]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/loading/error/denied/read-only, huge folders, list/grid modes with filename and type on distinct bounded lines, multi-selection, rename/move/delete conflicts, upload progress, external changes, keyboard navigation, phone drill-down, RTL, and rejected-operation rollback.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `file-manager`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-file-manager`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/file-manager.html`.
- Stable root target: `[data-a3s-components~="file-manager"]` inside `.a3s-preview[data-preview-component=file-manager][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/file-manager-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=file-manager] [data-state-specimen=ready]:has([data-a3s-components~='file-manager'][data-a3s-state~='ready'])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=file-manager] [data-state-specimen=loading]:has([data-a3s-components~='file-manager'][data-a3s-state~='loading'][aria-busy=true])`
  - `empty`: `.a3s-component-state-matrix[open][data-component=file-manager] [data-state-specimen=empty]:has([data-a3s-components~='file-manager'][data-a3s-state~='empty'])`
  - `partial`: `.a3s-component-state-matrix[open][data-component=file-manager] [data-state-specimen=partial]:has([data-a3s-components~='file-manager'][data-a3s-state~='partial'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=file-manager] [data-state-specimen=error]:has([data-a3s-components~='file-manager'][data-a3s-state~='error'])`
  - `offline`: `.a3s-component-state-matrix[open][data-component=file-manager] [data-state-specimen=offline]:has([data-a3s-components~='file-manager'][data-a3s-state~='offline'])`
  - `permission-denied`: `.a3s-component-state-matrix[open][data-component=file-manager] [data-state-specimen=permission-denied]:has([data-a3s-components~='file-manager'][data-a3s-state~='permission-denied'])`
  - `readonly`: `.a3s-component-state-matrix[open][data-component=file-manager] [data-state-specimen=readonly]:has([data-a3s-components~='file-manager'][data-a3s-state~='readonly']:is([readonly],[aria-readonly=true],[data-readonly],:has([readonly])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
