# Product Session Surface Product Requirements

| Field | Contract |
| --- | --- |
| Export | `ProductSessionSurface` |
| Source | `site/theme/components/playground/ProductSessionSurface.tsx` |
| Classification | `active` |
| Canonical route | `/playground/sessions/fix-session-recovery.html` |
| Route surface | `[data-product-surface=session]` |
| Route evidence | `tests/e2e/playground-route-contracts.acl#playground-route-session` |
| Behavioral suite | `tests/e2e/product-task-creation.acl` |
| Behavioral scenario | `create-task-desktop` |
| Behavior assertion | `session-ready` |

## User problem

People using the composed application need to continue a seeded or locally created task through conversation, execution evidence, details, search, and follow-up composition without losing the task, resource, or decision context that made the action meaningful. This internal component is justified only as a reusable, deterministic composition boundary. Its requirements must describe the decision it supports rather than restating its export name or visual shape.

## Product boundary

Product Session Surface owns session state recovery, header and search, message list, execution composition, inspector, follow-up queue, task composer, stop intent, and local persistence status copy. It does not own product routing services, remote APIs, credentials, authorization, persistence, scheduling, or irreversible side effects.

The UI repository owns design tokens, accessible interaction contracts, framework adapters, documentation, and deterministic composition fixtures. A host product owns real services, domain routing, data authority, user permissions, storage, synchronization, and external effects. Fixture callbacks can demonstrate intent, but they cannot turn this component into a second product implementation.

## States

Required states are ready, focused, selected or expanded where applicable, compact, localized, dark, empty, unavailable, invalid, pending, successful, and failed. Only states owned by Product Session Surface may change its local DOM; host-owned progress and outcomes remain explicit fixture inputs.

State changes preserve the user's last safe context. Visual styling never becomes the sole state signal, and hidden or inactive content leaves the pointer, keyboard, and accessibility paths consistently.

## Interaction contract

The component is exercised at `[data-product-surface=session]` by `tests/e2e/product-task-creation.acl#create-task-desktop`. The uniquely assigned `session-ready` action directly verifies this component inside that state-changing path; the route scenario independently owns direct-load, responsive, accessibility, console, page-error, and screenshot evidence.

Pointer and keyboard paths must reach the same decision. Focus enters through a named native control, movement follows the widget's documented orientation, Escape cancels a transient layer, and focus returns to the exact trigger. The component target is `[data-product-surface=session]`; incidental descendants are not a supported automation API.

## Responsive behavior

The canonical route is verified at 1440 × 1000 and 390 × 844. Reading order and focus order follow the semantic DOM, the owning region controls scrolling, and primary actions remain visible without page-level horizontal overflow. Compact disclosure must retain the current value and a recovery route; desktop width cannot be used to hide missing hierarchy.

Component-specific adversarial requirement: Acceptance for Product Session Surface must prove missing local sessions expose recovery, stopping does not erase queued work, compact inspector focus is deterministic without animation-frame timing, compact composer remains visible, and deterministic completion cannot be confused with a live backend run; malformed, stale, denied, empty, and excessively long fixture data must remain contained without fabricating host success.

## Accessibility

Every active control has a durable accessible name and uses the closest native element. Selected, expanded, disabled, busy, invalid, and modal state are expressed with native properties, text, or documented ARIA in addition to color and iconography. Focus remains visible without a heavy double ring, touch targets stay usable, reduced-motion preferences are respected, and localized labels can wrap. Legacy-only exports must remain absent from both the visual and accessibility trees.

## Failure, empty, and loading cases

Loading preserves useful geometry and names the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable integration. Validation errors stay adjacent to the value that needs correction and retain non-sensitive input. Runtime failure preserves the last safe selection, exposes retry only when retry is valid, and never claims persistence or external completion. Denied, stale, malformed, oversized, unsupported, and untrusted inputs remain bounded by the owning region.

## Acceptance criteria

- The export inventory contains exactly one `ProductSessionSurface` declaration in `site/theme/components/playground/ProductSessionSurface.tsx` and exactly one matching PRD and coverage record.
- The canonical route `/playground/sessions/fix-session-recovery.html` loads directly and passes `playground-route-session` with desktop and phone screenshots, accessibility evidence, console capture, and page-error capture.
- The real interaction path `create-task-desktop` explicitly targets `[data-product-surface=session]`; its unique `session-ready` assertion verifies this component while the same workflow proves a state-changing keyboard or pointer action.
- Focus, selection, disclosure, disabled state, and cancellation remain semantically synchronized; transient layers restore focus to their exact trigger.
- Empty, pending, invalid, denied, stale, failed, and recovery cases keep prior context and never fabricate host authority or success.
- Desktop and compact layouts preserve the primary decision, visible focus, readable localized copy, bounded scrolling, and a reachable recovery action.
- The component-specific product boundary remains enforced: Product Session Surface owns session state recovery, header and search, message list, execution composition, inspector, follow-up queue, task composer, stop intent, and local persistence status copy. It does not own product routing services, remote APIs, credentials, authorization, persistence, scheduling, or irreversible side effects.
- The adversarial release condition passes without weakening selectors or assertions: Acceptance for Product Session Surface must prove missing local sessions expose recovery, stopping does not erase queued work, compact inspector focus is deterministic without animation-frame timing, compact composer remains visible, and deterministic completion cannot be confused with a live backend run; malformed, stale, denied, empty, and excessively long fixture data must remain contained without fabricating host success.
- Console and page-error evidence contain no unexpected runtime failures on the deterministic acceptance path.

## A3S Test mapping

- Direct route evidence: `tests/e2e/playground-route-contracts.acl#playground-route-session` at `http://127.0.0.1:4178/UI/playground/sessions/fix-session-recovery.html`.
- Behavior evidence: `tests/e2e/product-task-creation.acl#create-task-desktop`, assertion `session-ready`, with stable target `[data-product-surface=session]`.
- Required evidence is desktop and phone visual capture, an interactive accessibility tree, console output, page errors, and at least one deterministic state-changing action for every active component.
