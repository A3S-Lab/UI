# Back to Bottom Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `NV-03` |
| Decision | Keep |
| Priority | P1 |
| Category | `navigation` |
| Public route | `/en/components/back-to-bottom.html` |
| Stable selector | `[data-a3s-components~="back-to-bottom"]` |
| Interaction scenario | `components-expanded-contracts.acl#back-to-bottom` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-back-to-bottom` |

## User problem

Back to Bottom appears only in an append-only scroll region, letting people return to the live edge without losing the number of updates that arrived while they read earlier content. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Appear only when the reader leaves the live edge, report bounded unread additions, and return without stealing focus or forcing future scroll.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `hidden` — Back to Bottom keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `visible` — Back to Bottom keeps disclosure, placement, focus, and visibility synchronized so pointer, keyboard, and assistive-technology users receive the same state.
- `unread` — Back to Bottom communicates the `unread` condition with explicit text, structure, or native state rather than color alone.

## Interaction contract

- Canonical root: `.back-to-bottom` on `<button>`.
- Stable automation root: `[data-a3s-components~="back-to-bottom"]`.
- Named parts: `count` (`[data-unread-count]`); `label` (`[data-back-to-bottom-label]`).
- Supported interaction intents: `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:back-to-bottom-activate`, `a3s:back-to-bottom-visibility-change`, `basecoat:initialized`.
- Public methods: `getState`, `refresh`, `scrollToBottom`, `setUnread`.
- Required root attributes: `type=button`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Rapid stream, user selection, zero/many unread, reduced motion, keyboard activation, nested scroll owner, mobile composer overlap, and resumed live edge.

## Accessibility

The canonical root uses `<button>` semantics and exposes 2 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.back-to-bottom` and is annotated by the runtime as `[data-a3s-components~="back-to-bottom"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=back-to-bottom]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Rapid stream, user selection, zero/many unread, reduced motion, keyboard activation, nested scroll owner, mobile composer overlap, and resumed live edge.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-expanded-contracts.acl`, scenario `back-to-bottom`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-back-to-bottom`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/back-to-bottom.html`.
- Stable root target: `[data-a3s-components~="back-to-bottom"]` inside `.a3s-preview[data-preview-component=back-to-bottom][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/back-to-bottom-states.png`.
- Per-state evidence selectors:
  - `hidden`: `.a3s-component-state-matrix[open][data-component=back-to-bottom] [data-state-specimen=hidden]:has([data-a3s-components~='back-to-bottom'][data-a3s-state~='hidden'][hidden])`
  - `visible`: `.a3s-component-state-matrix[open][data-component=back-to-bottom] [data-state-specimen=visible]:has([data-a3s-components~='back-to-bottom'][data-a3s-state~='visible']:not([hidden]))`
  - `unread`: `.a3s-component-state-matrix[open][data-component=back-to-bottom] [data-state-specimen=unread]:has([data-a3s-components~='back-to-bottom'][data-a3s-state~='unread'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
