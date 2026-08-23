# Agent Workbench Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-05` |
| Decision | Compose |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/agent-workbench.html` |
| Stable selector | `[data-a3s-components~="agent-workbench"]` |
| Interaction scenario | `components-application-utilities.acl#agent-workbench` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-agent-workbench` |

## User problem

Agent Workbench provides the responsive regions needed to author, configure, run, and inspect an Agent. It is provider-neutral: A3S Code may be the native provider, but execution state and provider APIs remain in the host application. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Compose**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Specify an App Shell + task/configuration + run/evidence inspector recipe. Do not maintain a parallel shell, header, pane, or status grammar.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Agent Workbench is stable, named, and ready for its primary reading or interaction job.
- `running` — Agent Workbench preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `waiting` — Agent Workbench preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `complete` — Agent Workbench presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `error` — Agent Workbench explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `inspector-open` — Agent Workbench keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `context-open` — Agent Workbench keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.

## Interaction contract

- Canonical root: `.agent-workbench` on `<section>`.
- Stable automation root: `[data-a3s-components~="agent-workbench"]`.
- Named parts: `activity` (`[data-agent-activity]`); `canvas` (`[data-agent-canvas]`); `context` (`[data-agent-context]`); `inspector` (`[data-agent-inspector]`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`, `select`, `type`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Author-only, run-only, inspector-only, waiting/complete/error, compact breakpoint, nested Task Workspace, multiple scroll regions, keyboard landmarks, and no duplicated primary action.

## Accessibility

The canonical root uses `<section>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press`, `select`, `type`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `running`, `waiting`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.agent-workbench` and is annotated by the runtime as `[data-a3s-components~="agent-workbench"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=agent-workbench]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Author-only, run-only, inspector-only, waiting/complete/error, compact breakpoint, nested Task Workspace, multiple scroll regions, keyboard landmarks, and no duplicated primary action.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `agent-workbench`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-agent-workbench`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/agent-workbench.html`.
- Stable root target: `[data-a3s-components~="agent-workbench"]` inside `.a3s-preview[data-preview-component=agent-workbench][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/agent-workbench-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=agent-workbench] [data-state-specimen=ready]:has([data-a3s-components~='agent-workbench'][data-a3s-state~='ready'])`
  - `running`: `.a3s-component-state-matrix[open][data-component=agent-workbench] [data-state-specimen=running]:has([data-a3s-components~='agent-workbench'][data-a3s-state~='running'][aria-busy=true])`
  - `waiting`: `.a3s-component-state-matrix[open][data-component=agent-workbench] [data-state-specimen=waiting]:has([data-a3s-components~='agent-workbench'][data-a3s-state~='waiting'][aria-busy=true])`
  - `complete`: `.a3s-component-state-matrix[open][data-component=agent-workbench] [data-state-specimen=complete]:has([data-a3s-components~='agent-workbench'][data-a3s-state~='complete'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=agent-workbench] [data-state-specimen=error]:has([data-a3s-components~='agent-workbench'][data-a3s-state~='error'])`
  - `inspector-open`: `.a3s-component-state-matrix[open][data-component=agent-workbench] [data-state-specimen=inspector-open]:has([data-a3s-components~='agent-workbench'][data-a3s-state~='inspector-open']:is([open],[aria-expanded=true]))`
  - `context-open`: `.a3s-component-state-matrix[open][data-component=agent-workbench] [data-state-specimen=context-open]:has([data-a3s-components~='agent-workbench'][data-a3s-state~='context-open']:is([open],[aria-expanded=true]))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
