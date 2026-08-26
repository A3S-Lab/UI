# Task Queue Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-13` |
| Decision | Narrow |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/task-queue.html` |
| Stable selector | `[data-a3s-components~="task-queue"]` |
| Interaction scenario | `components-application-utilities.acl#task-queue` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-task-queue` |

## User problem

Task Queue presents work waiting behind or alongside the active task. Scheduling, concurrency, prioritization, and cancellation remain application logic. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Narrow**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Show work waiting behind or beside the active task with clear active, blocked, paused, and cancellation scope. Scheduling and priority mutation remain host policy.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `idle` — Task Queue is stable, named, and ready for its primary reading or interaction job.
- `running` — Task Queue preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `paused` — Task Queue communicates the `paused` condition with explicit text, structure, or native state rather than color alone.
- `blocked` — Task Queue explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `complete` — Task Queue presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `error` — Task Queue explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.task-queue` on `<section>`.
- Stable automation root: `[data-a3s-components~="task-queue"]`.
- Named parts: `action` (`[data-queue-actions] button, [data-queue-actions] a[href]`); `item` (`:scope > ol > li`); `list` (`:scope > ol`); `status` (`[data-queue-status]`); `title` (`:scope > header :is(h2, h3)`).
- Supported interaction intents: `click`, `focus`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/one/many, concurrency, blocked reason, stale item, cancel rejection, reprioritization exclusion or explicit host action, phone list, keyboard, and live update stability.

## Accessibility

The canonical root uses `<section>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `running`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `blocked`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.task-queue` and is annotated by the runtime as `[data-a3s-components~="task-queue"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=task-queue]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/one/many, concurrency, blocked reason, stale item, cancel rejection, reprioritization exclusion or explicit host action, phone list, keyboard, and live update stability.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `task-queue`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-task-queue`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/task-queue.html`.
- Stable root target: `[data-a3s-components~="task-queue"]` inside `.a3s-preview[data-preview-component=task-queue][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/task-queue-states.png`.
- Per-state evidence selectors:
  - `idle`: `.a3s-component-state-matrix[open][data-component=task-queue] [data-state-specimen=idle]:has([data-a3s-components~='task-queue'][data-a3s-state~='idle'])`
  - `running`: `.a3s-component-state-matrix[open][data-component=task-queue] [data-state-specimen=running]:has([data-a3s-components~='task-queue'][data-a3s-state~='running'][aria-busy=true])`
  - `paused`: `.a3s-component-state-matrix[open][data-component=task-queue] [data-state-specimen=paused]:has([data-a3s-components~='task-queue'][data-a3s-state~='paused'])`
  - `blocked`: `.a3s-component-state-matrix[open][data-component=task-queue] [data-state-specimen=blocked]:has([data-a3s-components~='task-queue'][data-a3s-state~='blocked'])`
  - `complete`: `.a3s-component-state-matrix[open][data-component=task-queue] [data-state-specimen=complete]:has([data-a3s-components~='task-queue'][data-a3s-state~='complete'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=task-queue] [data-state-specimen=error]:has([data-a3s-components~='task-queue'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
