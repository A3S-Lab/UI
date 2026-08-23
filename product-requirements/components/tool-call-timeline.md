# Tool Call Timeline Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-26` |
| Decision | Compose |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/tool-call-timeline.html` |
| Stable selector | `[data-a3s-components~="tool-call-timeline"]` |
| Interaction scenario | `components-application-utilities.acl#tool-call-timeline` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-tool-call-timeline` |

## User problem

Tool Call Timeline orders the calls in one task and summarizes running, attention, completed, and problem counts. It answers where the task is blocked; it does not replace a searchable audit log. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Compose**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Compose Timeline and Execution Item into a chronological, provider-neutral account of observable tool activity. It owns ordering and grouping only; execution, retries, authorization, and retention remain host responsibilities.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `idle` — Tool Call Timeline is stable, named, and ready for its primary reading or interaction job.
- `running` — Tool Call Timeline preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `attention` — Tool Call Timeline communicates the `attention` condition with explicit text, structure, or native state rather than color alone.
- `problem` — Tool Call Timeline explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `complete` — Tool Call Timeline presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.

## Interaction contract

- Canonical root: `.tool-call-timeline` on `<section>`.
- Stable automation root: `[data-a3s-components~="tool-call-timeline"]`.
- Named parts: `action` (`[data-tool-timeline-action]`); `call` (`[data-tool-call-list] > li > .tool-call`); `list` (`[data-tool-call-list]`); `status` (`[data-tool-timeline-status]`); `summary` (`[data-tool-timeline-summary]`).
- Supported interaction intents: `click`, `focus`, `press`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:tool-timeline-change`, `a3s:tool-timeline-visibility-change`, `basecoat:initialized`.
- Public methods: `collapseHistory`, `expandHistory`, `getSummary`, `refresh`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/one/many calls, parallel and nested calls, queued/running/waiting/success/cancelled/error, long names, secret redaction, delayed results, keyboard disclosure, phone order, and bounded live announcements.

## Accessibility

The canonical root uses `<section>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `running`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `problem`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.tool-call-timeline` and is annotated by the runtime as `[data-a3s-components~="tool-call-timeline"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=tool-call-timeline]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/one/many calls, parallel and nested calls, queued/running/waiting/success/cancelled/error, long names, secret redaction, delayed results, keyboard disclosure, phone order, and bounded live announcements.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `tool-call-timeline`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-tool-call-timeline`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/tool-call-timeline.html`.
- Stable root target: `[data-a3s-components~="tool-call-timeline"]` inside `.a3s-preview[data-preview-component=tool-call-timeline][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/tool-call-timeline-states.png`.
- Per-state evidence selectors:
  - `idle`: `.a3s-component-state-matrix[open][data-component=tool-call-timeline] [data-state-specimen=idle]:has([data-a3s-components~='tool-call-timeline'][data-a3s-state~='idle'])`
  - `running`: `.a3s-component-state-matrix[open][data-component=tool-call-timeline] [data-state-specimen=running]:has([data-a3s-components~='tool-call-timeline'][data-a3s-state~='running'][aria-busy=true])`
  - `attention`: `.a3s-component-state-matrix[open][data-component=tool-call-timeline] [data-state-specimen=attention]:has([data-a3s-components~='tool-call-timeline'][data-a3s-state~='attention'])`
  - `problem`: `.a3s-component-state-matrix[open][data-component=tool-call-timeline] [data-state-specimen=problem]:has([data-a3s-components~='tool-call-timeline'][data-a3s-state~='problem'])`
  - `complete`: `.a3s-component-state-matrix[open][data-component=tool-call-timeline] [data-state-specimen=complete]:has([data-a3s-components~='tool-call-timeline'][data-a3s-state~='complete'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
