# Plan Step Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-12` |
| Decision | Compose |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/plan-step.html` |
| Stable selector | `[data-a3s-components~="plan-step"]` |
| Interaction scenario | `components-application-utilities.acl#plan-step` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-plan-step` |

## User problem

Plan Step is one observable unit inside a Task Plan. It presents a stable title, optional description, status, and one bounded action. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Compose**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Make Plan Step an owned part of Task Plan with shared Item and status anatomy. Retain its root as a compatibility hook, not an independent visual product.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `pending` — Plan Step communicates the `pending` condition with explicit text, structure, or native state rather than color alone.
- `active` — Plan Step exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.
- `complete` — Plan Step presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `blocked` — Plan Step explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Plan Step explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `skipped` — Plan Step communicates the `skipped` condition with explicit text, structure, or native state rather than color alone.

## Interaction contract

- Canonical root: `.plan-step` on `<li>`.
- Stable automation root: `[data-a3s-components~="plan-step"]`.
- Named parts: `action` (`button, a[href]`); `description` (`[data-step-description]`); `marker` (`[data-plan-marker]`); `status` (`[data-plan-step-status]`); `title` (`[data-step-identity] :is(h3, h4, strong)`).
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Pending/active/complete/blocked/error/skipped, long description, optional action, nested detail, reordered step, keyboard action, and no standalone generic adapter example.

## Accessibility

The canonical root uses `<li>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `blocked`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.plan-step` and is annotated by the runtime as `[data-a3s-components~="plan-step"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=plan-step]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Pending/active/complete/blocked/error/skipped, long description, optional action, nested detail, reordered step, keyboard action, and no standalone generic adapter example.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `plan-step`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-plan-step`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/plan-step.html`.
- Stable root target: `[data-a3s-components~="plan-step"]` inside `.a3s-preview[data-preview-component=plan-step][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/plan-step-states.png`.
- Per-state evidence selectors:
  - `pending`: `.a3s-component-state-matrix[open][data-component=plan-step] [data-state-specimen=pending]:has([data-a3s-components~='plan-step'][data-a3s-state~='pending'])`
  - `active`: `.a3s-component-state-matrix[open][data-component=plan-step] [data-state-specimen=active]:has([data-a3s-components~='plan-step'][data-a3s-state~='active'][data-active=true])`
  - `complete`: `.a3s-component-state-matrix[open][data-component=plan-step] [data-state-specimen=complete]:has([data-a3s-components~='plan-step'][data-a3s-state~='complete'])`
  - `blocked`: `.a3s-component-state-matrix[open][data-component=plan-step] [data-state-specimen=blocked]:has([data-a3s-components~='plan-step'][data-a3s-state~='blocked'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=plan-step] [data-state-specimen=error]:has([data-a3s-components~='plan-step'][data-a3s-state~='error'])`
  - `skipped`: `.a3s-component-state-matrix[open][data-component=plan-step] [data-state-specimen=skipped]:has([data-a3s-components~='plan-step'][data-a3s-state~='skipped'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
