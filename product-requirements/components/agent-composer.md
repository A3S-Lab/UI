# Agent Composer Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-03` |
| Decision | Keep |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/agent-composer.html` |
| Stable selector | `[data-a3s-components~="agent-composer"]` |
| Interaction scenario | `components-application-utilities.acl#agent-composer` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-agent-composer` |

## User problem

Task Composer turns an instruction, file context, source selections, skills, run settings, and follow-up messages into one recoverable submission. The primary input is always backed by TipTap. A plain `textarea` cannot reliably support Markdown, structured triggers, composition input, selection, and controlled drafts, so it is not part of the production contract. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own draft entry, attachments/context summary, queue indication, and one send-or-stop action. Drafts survive offline, loading, rejection, and responsive transitions.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Agent Composer is stable, named, and ready for its primary reading or interaction job.
- `submitting` — Agent Composer preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `streaming` — Agent Composer preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `queued` — Agent Composer communicates the `queued` condition with explicit text, structure, or native state rather than color alone.
- `stopping` — Agent Composer preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `loading` — Agent Composer preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `offline` — Agent Composer explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Agent Composer explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `disabled` — Agent Composer remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `invalid` — Agent Composer explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.agent-composer` on `<form>`.
- Stable automation root: `[data-a3s-components~="agent-composer"]`.
- Named parts: `action` (`[data-composer-action]`); `actions` (`[data-composer-actions]`); `attachment` (`[data-composer-resources] > li, [data-composer-context] > li`); `context` (`[data-composer-resources], [data-composer-context]`); `editor` (`[data-composer-editor]`); `input` (`[data-composer-input]`); `menu` (`[data-composer-suggestions]`); `option` (`[data-composer-suggestions] [role=option], [data-composer-suggestions] [role=treeitem]`); `queue` (`[data-composer-queue]`); `queueItem` (`[data-composer-queue] li`); `setting` (`[data-composer-setting]`); `status` (`[data-composer-status]`); `submit` (`button[type=submit]`); `tools` (`[data-composer-tools]`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`, `select`, `type`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:composer-action`, `a3s:composer-before-action`, `a3s:composer-before-submit`, `a3s:composer-draft-change`, `a3s:composer-queue-action`, `a3s:composer-state-change`, `a3s:composer-submit`, `a3s:composer-trigger-change`, `input`, `submit`, `basecoat:initialized`.
- Public methods: `clearDraft`, `closeSuggestions`, `focusInput`, `getDraft`, `getState`, `openSuggestions`, `refresh`, `runAction`, `setDraft`, `setError`, `setState`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/huge draft, IME, attachments uploading/error, context overflow, queued input, send-to-stop transition, rejected send, phone keyboard, and restored focus/draft.

## Accessibility

The canonical root uses `<form>` semantics and exposes 14 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press`, `select`, `type` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `submitting`, `streaming`, `stopping`, `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `offline`, `error`, `invalid`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.agent-composer` and is annotated by the runtime as `[data-a3s-components~="agent-composer"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=agent-composer]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/huge draft, IME, attachments uploading/error, context overflow, queued input, send-to-stop transition, rejected send, phone keyboard, and restored focus/draft.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `agent-composer`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-agent-composer`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/agent-composer.html`.
- Stable root target: `[data-a3s-components~="agent-composer"]` inside `.a3s-preview[data-preview-component=agent-composer][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/agent-composer-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=ready]:has([data-a3s-components~='agent-composer'][data-a3s-state~='ready'])`
  - `submitting`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=submitting]:has([data-a3s-components~='agent-composer'][data-a3s-state~='submitting'][aria-busy=true])`
  - `streaming`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=streaming]:has([data-a3s-components~='agent-composer'][data-a3s-state~='streaming'][aria-busy=true])`
  - `queued`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=queued]:has([data-a3s-components~='agent-composer'][data-a3s-state~='queued'])`
  - `stopping`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=stopping]:has([data-a3s-components~='agent-composer'][data-a3s-state~='stopping'][aria-busy=true])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=loading]:has([data-a3s-components~='agent-composer'][data-a3s-state~='loading'][aria-busy=true])`
  - `offline`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=offline]:has([data-a3s-components~='agent-composer'][data-a3s-state~='offline'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=error]:has([data-a3s-components~='agent-composer'][data-a3s-state~='error'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=disabled]:has([data-a3s-components~='agent-composer'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=agent-composer] [data-state-specimen=invalid]:has([data-a3s-components~='agent-composer'][data-a3s-state~='invalid']:is([aria-invalid=true],[data-validation-state=invalid],:has([aria-invalid=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
