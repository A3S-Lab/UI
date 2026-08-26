# Task Plan Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-11` |
| Decision | Keep |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/task-plan.html` |
| Stable selector | `[data-a3s-components~="task-plan"]` |
| Interaction scenario | `components-application-utilities.acl#task-plan` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-task-plan` |

## User problem

Task Plan exposes a bounded sequence of work without turning internal reasoning into interface copy. The host owns plan creation, step transitions, persistence, and cancellation. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Present an observable bounded work plan and overall status without exposing private reasoning. The host owns creation, mutation, ordering, persistence, and cancellation.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `draft` — Task Plan communicates the `draft` condition with explicit text, structure, or native state rather than color alone.
- `active` — Task Plan exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.
- `paused` — Task Plan communicates the `paused` condition with explicit text, structure, or native state rather than color alone.
- `complete` — Task Plan presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `error` — Task Plan explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.task-plan` on `<section>`.
- Stable automation root: `[data-a3s-components~="task-plan"]`.
- Named parts: `action` (`:scope > footer button, :scope > footer a[href]`); `progress` (`:scope > header [role=progressbar]`); `status` (`:scope > header [data-plan-status]`); `step` (`:scope > ol > .plan-step`); `steps` (`:scope > ol`); `title` (`:scope > header :is(h2, h3)`).
- Supported interaction intents: `click`, `focus`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Draft/active/paused/complete/error, no steps, many steps, changed plan, failed step, retry/cancel, phone, screen-reader progress, and distinction from Stepper and Timeline.

## Accessibility

The canonical root uses `<section>` semantics and exposes 6 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.task-plan` and is annotated by the runtime as `[data-a3s-components~="task-plan"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=task-plan]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Draft/active/paused/complete/error, no steps, many steps, changed plan, failed step, retry/cancel, phone, screen-reader progress, and distinction from Stepper and Timeline.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `task-plan`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-task-plan`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/task-plan.html`.
- Stable root target: `[data-a3s-components~="task-plan"]` inside `.a3s-preview[data-preview-component=task-plan][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/task-plan-states.png`.
- Per-state evidence selectors:
  - `draft`: `.a3s-component-state-matrix[open][data-component=task-plan] [data-state-specimen=draft]:has([data-a3s-components~='task-plan'][data-a3s-state~='draft'])`
  - `active`: `.a3s-component-state-matrix[open][data-component=task-plan] [data-state-specimen=active]:has([data-a3s-components~='task-plan'][data-a3s-state~='active'][data-active=true])`
  - `paused`: `.a3s-component-state-matrix[open][data-component=task-plan] [data-state-specimen=paused]:has([data-a3s-components~='task-plan'][data-a3s-state~='paused'])`
  - `complete`: `.a3s-component-state-matrix[open][data-component=task-plan] [data-state-specimen=complete]:has([data-a3s-components~='task-plan'][data-a3s-state~='complete'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=task-plan] [data-state-specimen=error]:has([data-a3s-components~='task-plan'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
