# Message Citation Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-09` |
| Decision | Keep |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/message-citation.html` |
| Stable selector | `[data-a3s-components~="message-citation"]` |
| Interaction scenario | `components-application-utilities.acl#message-citation` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-message-citation` |

## User problem

Message Citation links one claim to a named source without interrupting the reading flow. Source retrieval and preview behavior belong to the application. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Link a claim to a named source with compact provenance. Preview is a host-owned Popover or navigation action; unavailable sources remain explicit.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Message Citation is stable, named, and ready for its primary reading or interaction job.
- `visited` — Message Citation exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.
- `unavailable` — Message Citation explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Message Citation explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.message-citation` on `<a>`.
- Stable automation root: `[data-a3s-components~="message-citation"]`.
- Named parts: `index` (`[data-citation-index]`); `source` (`[data-citation-source]`); `title` (`[data-citation-title]`).
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: `href=#`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: One/many citations, duplicate source, long title/URL, unavailable/visited, keyboard link, touch preview, RTL text, screen-reader context, and malicious URL policy.

## Accessibility

The canonical root uses `<a>` semantics and exposes 3 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `unavailable`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.message-citation` and is annotated by the runtime as `[data-a3s-components~="message-citation"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=message-citation]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: One/many citations, duplicate source, long title/URL, unavailable/visited, keyboard link, touch preview, RTL text, screen-reader context, and malicious URL policy.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `message-citation`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-message-citation`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/message-citation.html`.
- Stable root target: `[data-a3s-components~="message-citation"]` inside `.a3s-preview[data-preview-component=message-citation][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/message-citation-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=message-citation] [data-state-specimen=ready]:has([data-a3s-components~='message-citation'][data-a3s-state~='ready'])`
  - `visited`: `.a3s-component-state-matrix[open][data-component=message-citation] [data-state-specimen=visited]:has([data-a3s-components~='message-citation'][data-a3s-state~='visited'][aria-current])`
  - `unavailable`: `.a3s-component-state-matrix[open][data-component=message-citation] [data-state-specimen=unavailable]:has([data-a3s-components~='message-citation'][data-a3s-state~='unavailable']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
  - `error`: `.a3s-component-state-matrix[open][data-component=message-citation] [data-state-specimen=error]:has([data-a3s-components~='message-citation'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
