# Message Attachment Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-08` |
| Decision | Keep |
| Priority | P1 |
| Category | `harness` |
| Public route | `/en/components/message-attachment.html` |
| Stable selector | `[data-a3s-components~="message-attachment"]` |
| Interaction scenario | `components-application-utilities.acl#message-attachment` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-message-attachment` |

## User problem

Message Attachment presents a file, image, source range, or URL associated with one message. Upload and persistence remain application responsibilities. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Present one attachment's identity, type, size/source, state, and bounded action. Upload, download, authorization, preview, and retention stay host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Message Attachment is stable, named, and ready for its primary reading or interaction job.
- `uploading` — Message Attachment preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `complete` — Message Attachment presents the completed outcome with durable text or semantics and leaves the next valid action unambiguous.
- `missing` — Message Attachment explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `error` — Message Attachment explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.message-attachment` on `<article>`.
- Stable automation root: `[data-a3s-components~="message-attachment"]`.
- Named parts: `action` (`button, a[href]`); `media` (`:scope > figure`); `metadata` (`[data-attachment-meta]`); `title` (`[data-attachment-identity] :is(h3, h4, strong)`).
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Uploading/complete/missing/error, huge file, image/path/URL/source range, unsafe filename, denied preview, retry/remove, phone width, and keyboard action order.

## Accessibility

The canonical root uses `<article>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `uploading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `missing`, `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.message-attachment` and is annotated by the runtime as `[data-a3s-components~="message-attachment"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=message-attachment]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Uploading/complete/missing/error, huge file, image/path/URL/source range, unsafe filename, denied preview, retry/remove, phone width, and keyboard action order.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `message-attachment`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-message-attachment`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/message-attachment.html`.
- Stable root target: `[data-a3s-components~="message-attachment"]` inside `.a3s-preview[data-preview-component=message-attachment][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/message-attachment-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=message-attachment] [data-state-specimen=ready]:has([data-a3s-components~='message-attachment'][data-a3s-state~='ready'])`
  - `uploading`: `.a3s-component-state-matrix[open][data-component=message-attachment] [data-state-specimen=uploading]:has([data-a3s-components~='message-attachment'][data-a3s-state~='uploading'][aria-busy=true])`
  - `complete`: `.a3s-component-state-matrix[open][data-component=message-attachment] [data-state-specimen=complete]:has([data-a3s-components~='message-attachment'][data-a3s-state~='complete'])`
  - `missing`: `.a3s-component-state-matrix[open][data-component=message-attachment] [data-state-specimen=missing]:has([data-a3s-components~='message-attachment'][data-a3s-state~='missing'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=message-attachment] [data-state-specimen=error]:has([data-a3s-components~='message-attachment'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
