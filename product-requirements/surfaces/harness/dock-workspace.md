# Dock Workspace Product Requirements

| Field | Contract |
| --- | --- |
| Surface group | `harness` |
| Route | `/harness/dock-workspace.html` |
| Stable selector | `.dockview-demo[data-mode=dock][data-ready=true]` |
| A3S Test suite | `tests/e2e/harness-workspaces.acl` |
| A3S Test scenario | `dock-workspace` |

## User problem

Professional work surfaces need task context, an editor, preview, output, and resources to remain available while users rearrange their attention without losing state.

## Product boundary

The workspace owns panel composition, docking intent, tab focus, size constraints, maximize and restore, compact overflow, and a serializable view layout. The host owns panel data, permissions, business routing, popout security, and persistence policy.

## States

The required state vocabulary is ready, docked, floating preview, maximized, restored, wide, and compact single-group. State transitions preserve prior user context, never fabricate host success, and keep selection, focus, and disclosure synchronized with semantic attributes.

## Interaction contract

The stable acceptance root is `.dockview-demo[data-mode=dock][data-ready=true]`. Pointer and keyboard users must reach the same primary actions. Keyboard focus enters through named controls, activation uses native Enter or Space behavior, Escape or a repeated toggle closes transient layers where applicable, and focus returns to the control that opened the layer. Resizing or dragging always has a keyboard-accessible preset or command.

## Responsive behavior

Desktop evidence uses 1440 × 1000 and compact evidence uses 390 × 844. The semantic reading order remains stable, the owning region controls scrolling, mobile navigation becomes inert while closed, and no primary value or recovery action is hidden behind clipping. Dragging cannot be the only layout path; keyboard actions must float, maximize, restore, and reset, while compact mode keeps all five business tabs discoverable.

## Accessibility

The surface has a named region or application landmark, real headings, labeled controls, visible focus, and state expressed through native properties or documented ARIA. Closed navigation and modal layers are removed from the keyboard path. Status changes use bounded announcements, reduced motion is respected, and visual tone never carries meaning alone.

## Failure, empty, and loading cases

Loading preserves geometry and identifies the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable host integration. Errors retain the last safe context, state the failed operation, and expose retry only when deterministic recovery exists. Denied, offline, stale, malformed, and unsupported cases remain explicit and cannot silently become success.

## Acceptance criteria

- The route resolves directly on first load and exposes `.dockview-demo[data-mode=dock][data-ready=true]` after hydration.
- The primary user job and current state are understandable before any secondary detail is opened.
- Keyboard focus and activation prove the primary interaction boundary without depending on drag, hover, or precise pointing.
- Desktop and compact screenshots show complete, aligned content with no page-level horizontal overflow.
- Accessibility evidence contains the named surface, its controls, and truthful expanded, selected, disabled, or inert state.
- Console and page-error evidence contain no runtime failures.
- Component-specific edit, rejection, recovery, panel disclosure, focus return, running, and successful-result transitions are deterministic where this surface owns them.
- Product-specific risk is covered: Dragging cannot be the only layout path; keyboard actions must float, maximize, restore, and reset, while compact mode keeps all five business tabs discoverable.

## A3S Test mapping

- Suite: `tests/e2e/harness-workspaces.acl`.
- Scenario: `dock-workspace`.
- Preview URL: `http://127.0.0.1:4178/UI/harness/dock-workspace.html`.
- Stable target: `.dockview-demo[data-mode=dock][data-ready=true]`.
- Evidence: desktop screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log. Harness interaction scenarios additionally prove their component-specific keyboard state transitions.
