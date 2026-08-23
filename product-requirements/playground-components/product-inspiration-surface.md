# Product Inspiration Surface Product Requirements

| Field | Contract |
| --- | --- |
| Export | `ProductInspirationSurface` |
| Source | `site/theme/components/playground/ProductInspirationSurface.tsx` |
| Classification | `active` |
| Canonical route | `/playground/resources/inspiration.html` |
| Route surface | `[data-product-surface=inspiration]` |
| Route evidence | `tests/e2e/playground-route-contracts.acl#playground-route-inspiration` |
| Behavioral suite | `tests/e2e/product-resource-surfaces.acl` |
| Behavioral scenario | `inspiration-gallery-to-task` |
| Behavior assertion | `inspiration-surface-boundary` |

## User problem

People using the composed application need to browse useful visual or document fragments, inspect provenance, favorite them, and turn one into deliberate task context without losing the task, resource, or decision context that made the action meaningful. This internal component is justified only as a reusable, deterministic composition boundary. Its requirements must describe the decision it supports rather than restating its export name or visual shape.

## Product boundary

Product Inspiration Surface owns search, type and favorite filtering, deterministic previews, detail dialog, provenance copy, favorite state, and start-task callback. It does not own product routing services, remote APIs, credentials, authorization, persistence, scheduling, or irreversible side effects.

The UI repository owns design tokens, accessible interaction contracts, framework adapters, documentation, and deterministic composition fixtures. A host product owns real services, domain routing, data authority, user permissions, storage, synchronization, and external effects. Fixture callbacks can demonstrate intent, but they cannot turn this component into a second product implementation.

## States

Required states are ready, focused, selected or expanded where applicable, compact, localized, dark, empty, unavailable, invalid, pending, successful, and failed. Only states owned by Product Inspiration Surface may change its local DOM; host-owned progress and outcomes remain explicit fixture inputs.

State changes preserve the user's last safe context. Visual styling never becomes the sole state signal, and hidden or inactive content leaves the pointer, keyboard, and accessibility paths consistently.

## Interaction contract

The component is exercised at `[data-product-surface=inspiration]` by `tests/e2e/product-resource-surfaces.acl#inspiration-gallery-to-task`. The uniquely assigned `inspiration-surface-boundary` action directly verifies this component inside that state-changing path; the route scenario independently owns direct-load, responsive, accessibility, console, page-error, and screenshot evidence.

Pointer and keyboard paths must reach the same decision. Focus enters through a named native control, movement follows the widget's documented orientation, Escape cancels a transient layer, and focus returns to the exact trigger. The component target is `[data-product-surface=inspiration]`; incidental descendants are not a supported automation API.

## Responsive behavior

The canonical route is verified at 1440 × 1000 and 390 × 844. Reading order and focus order follow the semantic DOM, the owning region controls scrolling, and primary actions remain visible without page-level horizontal overflow. Compact disclosure must retain the current value and a recovery route; desktop width cannot be used to hide missing hierarchy.

Component-specific adversarial requirement: Acceptance for Product Inspiration Surface must prove decorative previews never replace accessible names, empty filters remain recoverable, detail dialogs fit phones, and task conversion preserves the exact selected source; malformed, stale, denied, empty, and excessively long fixture data must remain contained without fabricating host success.

## Accessibility

Every active control has a durable accessible name and uses the closest native element. Selected, expanded, disabled, busy, invalid, and modal state are expressed with native properties, text, or documented ARIA in addition to color and iconography. Focus remains visible without a heavy double ring, touch targets stay usable, reduced-motion preferences are respected, and localized labels can wrap. Legacy-only exports must remain absent from both the visual and accessibility trees.

## Failure, empty, and loading cases

Loading preserves useful geometry and names the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable integration. Validation errors stay adjacent to the value that needs correction and retain non-sensitive input. Runtime failure preserves the last safe selection, exposes retry only when retry is valid, and never claims persistence or external completion. Denied, stale, malformed, oversized, unsupported, and untrusted inputs remain bounded by the owning region.

## Acceptance criteria

- The export inventory contains exactly one `ProductInspirationSurface` declaration in `site/theme/components/playground/ProductInspirationSurface.tsx` and exactly one matching PRD and coverage record.
- The canonical route `/playground/resources/inspiration.html` loads directly and passes `playground-route-inspiration` with desktop and phone screenshots, accessibility evidence, console capture, and page-error capture.
- The real interaction path `inspiration-gallery-to-task` explicitly targets `[data-product-surface=inspiration]`; its unique `inspiration-surface-boundary` assertion verifies this component while the same workflow proves a state-changing keyboard or pointer action.
- Focus, selection, disclosure, disabled state, and cancellation remain semantically synchronized; transient layers restore focus to their exact trigger.
- Empty, pending, invalid, denied, stale, failed, and recovery cases keep prior context and never fabricate host authority or success.
- Desktop and compact layouts preserve the primary decision, visible focus, readable localized copy, bounded scrolling, and a reachable recovery action.
- The component-specific product boundary remains enforced: Product Inspiration Surface owns search, type and favorite filtering, deterministic previews, detail dialog, provenance copy, favorite state, and start-task callback. It does not own product routing services, remote APIs, credentials, authorization, persistence, scheduling, or irreversible side effects.
- The adversarial release condition passes without weakening selectors or assertions: Acceptance for Product Inspiration Surface must prove decorative previews never replace accessible names, empty filters remain recoverable, detail dialogs fit phones, and task conversion preserves the exact selected source; malformed, stale, denied, empty, and excessively long fixture data must remain contained without fabricating host success.
- Console and page-error evidence contain no unexpected runtime failures on the deterministic acceptance path.

## A3S Test mapping

- Direct route evidence: `tests/e2e/playground-route-contracts.acl#playground-route-inspiration` at `http://127.0.0.1:4178/UI/playground/resources/inspiration.html`.
- Behavior evidence: `tests/e2e/product-resource-surfaces.acl#inspiration-gallery-to-task`, assertion `inspiration-surface-boundary`, with stable target `[data-product-surface=inspiration]`.
- Required evidence is desktop and phone visual capture, an interactive accessibility tree, console output, page errors, and at least one deterministic state-changing action for every active component.
