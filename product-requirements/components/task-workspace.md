# Task Workspace Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-02` |
| Decision | Keep |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/task-workspace.html` |
| Stable selector | `[data-a3s-components~="task-workspace"]` |
| Interaction scenario | `components-application-utilities.acl#task-workspace` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-task-workspace` |

## User problem

Task Workspace keeps the title, chronological transcript, bottom composer, and optional artifact inspector in one bounded application region. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own one active task's title, chronological transcript, composer, bounded status, and optional artifact inspector with one scroll topology. App Shell owns product navigation.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Task Workspace is stable, named, and ready for its primary reading or interaction job.
- `streaming` — Task Workspace preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `waiting` — Task Workspace preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `complete` — Task Workspace presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `error` — Task Workspace explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `inspector-open` — Task Workspace keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.

## Interaction contract

- Canonical root: `.task-workspace` on `<section>`.
- Stable automation root: `[data-a3s-components~="task-workspace"]`.
- Named parts: `composer` (`.agent-composer`); `header` (`:scope > .workspace-header, :scope > header`); `inspector` (`[data-task-inspector]`); `inspectorTrigger` (`[data-task-inspector-trigger]`); `transcript` (`.agent-transcript`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`, `type`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:task-inspector-change`, `basecoat:initialized`, `submit`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/start/streaming/waiting/complete/error, inspector open/closed, huge transcript, restored task, mobile drawer, composer safe area, 200% zoom, and no competing scroll owners.

## Accessibility

The canonical root uses `<section>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press`, `type`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `streaming`, `waiting`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.task-workspace` and is annotated by the runtime as `[data-a3s-components~="task-workspace"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=task-workspace]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/start/streaming/waiting/complete/error, inspector open/closed, huge transcript, restored task, mobile drawer, composer safe area, 200% zoom, and no competing scroll owners.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `task-workspace`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-task-workspace`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/task-workspace.html`.
- Stable root target: `[data-a3s-components~="task-workspace"]` inside `.a3s-preview[data-preview-component=task-workspace][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/task-workspace-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=task-workspace] [data-state-specimen=ready]:has([data-a3s-components~='task-workspace'][data-a3s-state~='ready'])`
  - `streaming`: `.a3s-component-state-matrix[open][data-component=task-workspace] [data-state-specimen=streaming]:has([data-a3s-components~='task-workspace'][data-a3s-state~='streaming'][aria-busy=true])`
  - `waiting`: `.a3s-component-state-matrix[open][data-component=task-workspace] [data-state-specimen=waiting]:has([data-a3s-components~='task-workspace'][data-a3s-state~='waiting'][aria-busy=true])`
  - `complete`: `.a3s-component-state-matrix[open][data-component=task-workspace] [data-state-specimen=complete]:has([data-a3s-components~='task-workspace'][data-a3s-state~='complete'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=task-workspace] [data-state-specimen=error]:has([data-a3s-components~='task-workspace'][data-a3s-state~='error'])`
  - `inspector-open`: `.a3s-component-state-matrix[open][data-component=task-workspace] [data-state-specimen=inspector-open]:has([data-a3s-components~='task-workspace'][data-a3s-state~='inspector-open']:is([open],[aria-expanded=true]))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
