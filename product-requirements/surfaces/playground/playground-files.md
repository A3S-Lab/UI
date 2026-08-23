# My Files Product Requirements

| Field | Contract |
| --- | --- |
| Surface group | `playground` |
| Route | `/playground/resources/files.html` |
| Stable selector | `[data-product-application][data-view=resources] [data-product-surface=files]` |
| A3S Test suite | `tests/e2e/playground-route-contracts.acl` |
| A3S Test scenario | `playground-route-files` |

## User problem

People evaluating the composition need to navigate workspace files, select and preview resources, and express file-operation intent through a bounded manager.

## Product boundary

This route is a deterministic, in-memory integration fixture for reusable UI contracts. It may demonstrate host callbacks and recovery states, but it does not own real routing services, APIs, persistence, permissions, filesystem authority, scheduling, or domain orchestration.

## States

The required state vocabulary is ready plus route-specific empty, loading, partial, error, selected, open, compact-navigation, and recovery states. State transitions preserve prior user context, never fabricate host success, and keep selection, focus, and disclosure synchronized with semantic attributes.

## Interaction contract

The stable acceptance root is `[data-product-application][data-view=resources] [data-product-surface=files]`. Pointer and keyboard users must reach the same primary actions. Keyboard focus enters through named controls, activation uses native Enter or Space behavior, Escape or a repeated toggle closes transient layers where applicable, and focus returns to the control that opened the layer. Resizing or dragging always has a keyboard-accessible preset or command.

## Responsive behavior

Desktop evidence uses 1440 × 1000 and compact evidence uses 390 × 844. The semantic reading order remains stable, the owning region controls scrolling, mobile navigation becomes inert while closed, and no primary value or recovery action is hidden behind clipping. The route must preserve one task-first information hierarchy, keep global navigation separate from the work canvas, expose truthful empty and failure states, and remain usable at 390px without imitating a second production backend.

## Accessibility

The surface has a named region or application landmark, real headings, labeled controls, visible focus, and state expressed through native properties or documented ARIA. Closed navigation and modal layers are removed from the keyboard path. Status changes use bounded announcements, reduced motion is respected, and visual tone never carries meaning alone.

## Failure, empty, and loading cases

Loading preserves geometry and identifies the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable host integration. Errors retain the last safe context, state the failed operation, and expose retry only when deterministic recovery exists. Denied, offline, stale, malformed, and unsupported cases remain explicit and cannot silently become success.

## Acceptance criteria

- The route resolves directly on first load and exposes `[data-product-application][data-view=resources] [data-product-surface=files]` after hydration.
- The primary user job and current state are understandable before any secondary detail is opened.
- Keyboard focus and activation prove the primary interaction boundary without depending on drag, hover, or precise pointing.
- Desktop and compact screenshots show complete, aligned content with no page-level horizontal overflow.
- Accessibility evidence contains the named surface, its controls, and truthful expanded, selected, disabled, or inert state.
- Console and page-error evidence contain no runtime failures.
- Component-specific edit, rejection, recovery, disclosure, and focus-return transitions are deterministic where this surface owns them.
- Product-specific risk is covered: The route must preserve one task-first information hierarchy, keep global navigation separate from the work canvas, expose truthful empty and failure states, and remain usable at 390px without imitating a second production backend.

## A3S Test mapping

- Suite: `tests/e2e/playground-route-contracts.acl`.
- Scenario: `playground-route-files`.
- Preview URL: `http://127.0.0.1:4178/UI/playground/resources/files.html`.
- Stable target: `[data-product-application][data-view=resources] [data-product-surface=files]`.
- Evidence: desktop screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log. Harness scenarios additionally prove their component-specific keyboard state transitions and focus recovery.
