# Workspace Scene Surface Product Requirements

| Field | Contract |
| --- | --- |
| Export | `WorkspaceSceneSurface` |
| Source | `site/theme/components/playground/WorkspaceSceneSurface.tsx` |
| Classification | `legacy-unmounted` |
| Canonical route | `/playground.html` |
| Route surface | `[data-product-surface=start]` |
| Route evidence | `tests/e2e/playground-route-contracts.acl#playground-route-start` |
| Boundary suite | `tests/e2e/playground-component-boundaries.acl` |
| Boundary scenario | `playground-legacy-workspace-scene-surface` |
| Boundary assertion | `legacy-workspace-absent` |

## User problem

Maintainers need to know that Workspace Scene Surface belongs only to the retired editor-style workspace tree so it cannot silently reappear in the current task-first Playground. This internal component is justified only as a reusable, deterministic composition boundary. Its requirements must describe the decision it supports rather than restating its export name or visual shape.

## Product boundary

Workspace Scene Surface may remain temporarily as source-compatible legacy code for its existing private consumers, while the current application owns no route, navigation item, product promise, or visible state for it. It is the retired editor scene canvas and has no role in the current route-specific task, project, resource, or session compositions.

The UI repository owns design tokens, accessible interaction contracts, framework adapters, documentation, and deterministic composition fixtures. A host product owns real services, domain routing, data authority, user permissions, storage, synchronization, and external effects. Fixture callbacks can demonstrate intent, but they cannot turn this component into a second product implementation.

## States

Required states are legacy-only and unmounted. The source may remain temporarily for private compatibility, but it has no ready, selected, loading, empty, error, route, or navigation state in the current Playground. A future removal must delete its contract and source together.

State changes preserve the user's last safe context. Visual styling never becomes the sole state signal, and hidden or inactive content leaves the pointer, keyboard, and accessibility paths consistently.

## Interaction contract

The export has no supported visible target. `tests/e2e/playground-component-boundaries.acl#playground-legacy-workspace-scene-surface` proves the current application renders without `.a3s-workspace-playground` at desktop and phone widths, while the generator rejects any active import of this legacy export.

No current user interaction may mount or reveal this export. Source-level admission is part of the contract because providers and icon renderers may produce no unique DOM root. The boundary test therefore combines import-graph rejection with visible proof that the retired workspace root is absent.

## Responsive behavior

The canonical route is verified at 1440 × 1000 and 390 × 844. Reading order and focus order follow the semantic DOM, the owning region controls scrolling, and primary actions remain visible without page-level horizontal overflow. Compact disclosure must retain the current value and a recovery route; desktop width cannot be used to hide missing hierarchy.

Component-specific adversarial requirement: The boundary test for Workspace Scene Surface must prove no current route brings back scene selection, editor chrome, or generic preview state through this component; a passing result cannot rely on hiding the obsolete workspace with CSS or renaming its visible chrome.

## Accessibility

Every active control has a durable accessible name and uses the closest native element. Selected, expanded, disabled, busy, invalid, and modal state are expressed with native properties, text, or documented ARIA in addition to color and iconography. Focus remains visible without a heavy double ring, touch targets stay usable, reduced-motion preferences are respected, and localized labels can wrap. Legacy-only exports must remain absent from both the visual and accessibility trees.

## Failure, empty, and loading cases

Loading preserves useful geometry and names the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable integration. Validation errors stay adjacent to the value that needs correction and retain non-sensitive input. Runtime failure preserves the last safe selection, exposes retry only when retry is valid, and never claims persistence or external completion. Denied, stale, malformed, oversized, unsupported, and untrusted inputs remain bounded by the owning region.

## Acceptance criteria

- The export inventory contains exactly one `WorkspaceSceneSurface` declaration in `site/theme/components/playground/WorkspaceSceneSurface.tsx` and exactly one matching PRD and coverage record.
- The canonical route `/playground.html` loads directly and passes `playground-route-start` with desktop and phone screenshots, accessibility evidence, console capture, and page-error capture.
- The generated boundary scenario `playground-legacy-workspace-scene-surface` proves the current Product Application does not mount the retired workspace root.
- Focus, selection, disclosure, disabled state, and cancellation remain semantically synchronized; transient layers restore focus to their exact trigger.
- Empty, pending, invalid, denied, stale, failed, and recovery cases keep prior context and never fabricate host authority or success.
- Desktop and compact layouts preserve the primary decision, visible focus, readable localized copy, bounded scrolling, and a reachable recovery action.
- The component-specific product boundary remains enforced: Workspace Scene Surface may remain temporarily as source-compatible legacy code for its existing private consumers, while the current application owns no route, navigation item, product promise, or visible state for it. It is the retired editor scene canvas and has no role in the current route-specific task, project, resource, or session compositions.
- The adversarial release condition passes without weakening selectors or assertions: The boundary test for Workspace Scene Surface must prove no current route brings back scene selection, editor chrome, or generic preview state through this component; a passing result cannot rely on hiding the obsolete workspace with CSS or renaming its visible chrome.
- Console and page-error evidence contain no unexpected runtime failures on the deterministic acceptance path.

## A3S Test mapping

- Direct route evidence: `tests/e2e/playground-route-contracts.acl#playground-route-start` at `http://127.0.0.1:4178/UI/playground.html`.
- Boundary evidence: `tests/e2e/playground-component-boundaries.acl#playground-legacy-workspace-scene-surface`, plus the generator's active-import rejection.
- Required evidence is desktop and phone visual capture, an interactive accessibility tree, console output, page errors, and at least one deterministic state-changing action for every active component.
