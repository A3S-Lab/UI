# Split View Product Requirements

| Field | Contract |
| --- | --- |
| Surface group | `harness` |
| Route | `/harness/split-view.html` |
| Stable selector | `.dockview-demo[data-mode=split][data-ready=true]` |
| A3S Test suite | `tests/e2e/harness-workspaces.acl` |
| A3S Test scenario | `split-view` |

## User problem

Ordered context, canvas, and preview regions need one-dimensional resizing when every region remains simultaneously meaningful and tabs would hide necessary context.

## Product boundary

Split View owns ordered panes, separators, minimum sizes, balanced and focus presets, and container adaptation. The host owns pane content, process state, persistence, and any decision to add or remove regions.

## States

The required state vocabulary is initializing, ready, balanced, focus-canvas, wide, and compact. State transitions preserve prior user context, never fabricate host success, and keep selection, focus, and disclosure synchronized with semantic attributes.

## Interaction contract

The stable acceptance root is `.dockview-demo[data-mode=split][data-ready=true]`. Pointer and keyboard users must reach the same primary actions. Keyboard focus enters through named controls, activation uses native Enter or Space behavior, Escape or a repeated toggle closes transient layers where applicable, and focus returns to the control that opened the layer. Resizing or dragging always has a keyboard-accessible preset or command.

## Responsive behavior

Desktop evidence uses 1440 × 1000 and compact evidence uses 390 × 844. The semantic reading order remains stable, the owning region controls scrolling, mobile navigation becomes inert while closed, and no primary value or recovery action is hidden behind clipping. Separator and preset behavior must be keyboard reachable, DOM order must stay truthful, and the narrow topology must preserve all three regions without nested page scrolling.

## Accessibility

The surface has a named region or application landmark, real headings, labeled controls, visible focus, and state expressed through native properties or documented ARIA. Closed navigation and modal layers are removed from the keyboard path. Status changes use bounded announcements, reduced motion is respected, and visual tone never carries meaning alone.

## Failure, empty, and loading cases

Loading preserves geometry and identifies the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable host integration. Errors retain the last safe context, state the failed operation, and expose retry only when deterministic recovery exists. Denied, offline, stale, malformed, and unsupported cases remain explicit and cannot silently become success.

## Acceptance criteria

- The route resolves directly on first load and exposes `.dockview-demo[data-mode=split][data-ready=true]` after hydration.
- The primary user job and current state are understandable before any secondary detail is opened.
- Keyboard focus and activation prove the primary interaction boundary without depending on drag, hover, or precise pointing.
- Desktop and compact screenshots show complete, aligned content with no page-level horizontal overflow.
- Accessibility evidence contains the named surface, its controls, and truthful expanded, selected, disabled, or inert state.
- Console and page-error evidence contain no runtime failures.
- Component-specific edit, rejection, recovery, panel disclosure, focus return, running, and successful-result transitions are deterministic where this surface owns them.
- Product-specific risk is covered: Separator and preset behavior must be keyboard reachable, DOM order must stay truthful, and the narrow topology must preserve all three regions without nested page scrolling.

## A3S Test mapping

- Suite: `tests/e2e/harness-workspaces.acl`.
- Scenario: `split-view`.
- Preview URL: `http://127.0.0.1:4178/UI/harness/split-view.html`.
- Stable target: `.dockview-demo[data-mode=split][data-ready=true]`.
- Evidence: desktop screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log. Harness interaction scenarios additionally prove their component-specific keyboard state transitions.
