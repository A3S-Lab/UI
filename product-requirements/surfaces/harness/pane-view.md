# Pane View Product Requirements

| Field | Contract |
| --- | --- |
| Surface group | `harness` |
| Route | `/harness/pane-view.html` |
| Stable selector | `.dockview-demo[data-mode=pane][data-ready=true]` |
| A3S Test suite | `tests/e2e/harness-workspaces.acl` |
| A3S Test scenario | `pane-view` |

## User problem

Tool inspectors need titled regions that can be expanded, collapsed, and resized independently while keeping their identity visible and their content available on demand.

## Product boundary

Pane View owns pane headings, expansion state, size allocation, expand-all and collapse-all commands, and responsive stacking. The host owns the files, symbols, history data, and persistence of user preferences.

## Production fixture contract

Workspace files, the 3D dependency graph, and ordered test output reuse the exact Product Application components from the standalone Playground. Expanded panes must expose usable production content rather than a title, skeleton, or generic filler surface.


## States

The required state vocabulary is initializing, mixed expansion, all collapsed, one expanded, all expanded, wide, and compact. State transitions preserve prior user context, never fabricate host success, and keep selection, focus, and disclosure synchronized with semantic attributes.

## Interaction contract

The stable acceptance root is `.dockview-demo[data-mode=pane][data-ready=true]`. Pointer and keyboard users must reach the same primary actions. Keyboard focus enters through named controls, activation uses native Enter or Space behavior, Escape or a repeated toggle closes transient layers where applicable, and focus returns to the control that opened the layer. Resizing or dragging always has a keyboard-accessible preset or command.

## Responsive behavior

Desktop evidence uses 1440 × 1000 and compact evidence uses 390 × 844. The semantic reading order remains stable, the owning region controls scrolling, mobile navigation becomes inert while closed, and no primary value or recovery action is hidden behind clipping. Headings must remain real buttons with synchronized aria-expanded state, expanded bodies must receive usable height, and compact screenshots must prove content rather than title-only panes.

## Accessibility

The surface has a named region or application landmark, real headings, labeled controls, visible focus, and state expressed through native properties or documented ARIA. Closed navigation and modal layers are removed from the keyboard path. Status changes use bounded announcements, reduced motion is respected, and visual tone never carries meaning alone.

## Failure, empty, and loading cases

Loading preserves geometry and identifies the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable host integration. Errors retain the last safe context, state the failed operation, and expose retry only when deterministic recovery exists. Denied, offline, stale, malformed, and unsupported cases remain explicit and cannot silently become success.

## Acceptance criteria

- The route resolves directly on first load and exposes `.dockview-demo[data-mode=pane][data-ready=true]` after hydration.
- The primary user job and current state are understandable before any secondary detail is opened.
- Keyboard focus and activation prove the primary interaction boundary without depending on drag, hover, or precise pointing.
- Desktop and compact screenshots show complete, aligned content with no page-level horizontal overflow.
- Accessibility evidence contains the named surface, its controls, and truthful expanded, selected, disabled, or inert state.
- Console and page-error evidence contain no runtime failures.
- Component-specific edit, rejection, recovery, disclosure, and focus-return transitions are deterministic where this surface owns them.
- Harness content reuses the named Product Application components and the rendered root contains no skeleton or look-alike panel markup.
- Product-specific risk is covered: Headings must remain real buttons with synchronized aria-expanded state, expanded bodies must receive usable height, and compact screenshots must prove content rather than title-only panes.

## A3S Test mapping

- Suite: `tests/e2e/harness-workspaces.acl`.
- Scenario: `pane-view`.
- Preview URL: `http://127.0.0.1:4178/UI/harness/pane-view.html`.
- Stable target: `.dockview-demo[data-mode=pane][data-ready=true]`.
- Evidence: desktop screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log. Harness scenarios additionally prove their component-specific keyboard state transitions and focus recovery.
