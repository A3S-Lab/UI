# Flow 1.0 DAG Node Configuration Product Requirements

| Field | Contract |
| --- | --- |
| Surface group | `workflow` |
| Route | `/components/form-system/workflow-node-embedding.html` |
| Stable selector | `.a3s-doc-workflow-studio[data-panel-open=true]` |
| A3S Test suite | `tests/e2e/workflow-surface-contracts.acl` |
| A3S Test scenario | `workflow-dag-embedding` |

## User problem

Workflow authors need one coherent library, canvas-node, and inspector contract for selecting and configuring a typed DAG node without losing graph context.

## Product boundary

The embedded studio owns node discovery, selected-node presentation, controlled field editing, inspector disclosure, and local demonstration results. Flow owns graph validation and execution ordering; the host owns manifests beyond the built-in catalog, credentials, authorization, persistence, compilation, and execution.

## States

The required state vocabulary is ready, library closed or open, node selected, inspector open or closed, editing, validating, running, succeeded, failed, and read-only. State transitions preserve prior user context, never fabricate host success, and keep selection, focus, and disclosure synchronized with semantic attributes.

## Interaction contract

The stable acceptance root is `.a3s-doc-workflow-studio[data-panel-open=true]`. Pointer and keyboard users must reach the same primary actions. Keyboard focus enters through named controls, activation uses native Enter or Space behavior, Escape or a repeated toggle closes transient layers where applicable, and focus returns to the control that opened the layer. Resizing or dragging always has a keyboard-accessible preset or command.

Workflow-specific acceptance: Open the node library, filter and select Condition, edit and invalidate its expression, recover defaults without changing selection, then close, reopen, and run that same DAG node.

## Responsive behavior

Desktop evidence uses 1440 × 1000 and compact evidence uses 390 × 844. The semantic reading order remains stable, the owning region controls scrolling, mobile navigation becomes inert while closed, and no primary value or recovery action is hidden behind clipping. The canvas, node library, and inspector must stay synchronized by node type; closing and reopening the inspector must preserve focus and selection; mobile layout must not create an unreachable fixed panel.

## Accessibility

The surface has a named region or application landmark, real headings, labeled controls, visible focus, and state expressed through native properties or documented ARIA. Closed navigation and modal layers are removed from the keyboard path. Status changes use bounded announcements, reduced motion is respected, and visual tone never carries meaning alone.

## Failure, empty, and loading cases

Loading preserves geometry and identifies the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable host integration. Errors retain the last safe context, state the failed operation, and expose retry only when deterministic recovery exists. Denied, offline, stale, malformed, and unsupported cases remain explicit and cannot silently become success.

## Acceptance criteria

- The route resolves directly on first load and exposes `.a3s-doc-workflow-studio[data-panel-open=true]` after hydration.
- The primary user job and current state are understandable before any secondary detail is opened.
- Keyboard focus and activation prove the primary interaction boundary without depending on drag, hover, or precise pointing.
- Desktop and compact screenshots show complete, aligned content with no page-level horizontal overflow.
- Accessibility evidence contains the named surface, its controls, and truthful expanded, selected, disabled, or inert state.
- Console and page-error evidence contain no runtime failures.
- Component-specific edit, rejection, recovery, panel disclosure, focus return, running, and successful-result transitions are deterministic where this surface owns them. The exact workflow proof is: Open the node library, filter and select Condition, edit and invalidate its expression, recover defaults without changing selection, then close, reopen, and run that same DAG node.
- Product-specific risk is covered: The canvas, node library, and inspector must stay synchronized by node type; closing and reopening the inspector must preserve focus and selection; mobile layout must not create an unreachable fixed panel.

## A3S Test mapping

- Suite: `tests/e2e/workflow-surface-contracts.acl`.
- Scenario: `workflow-dag-embedding`.
- Preview URL: `http://127.0.0.1:4178/UI/components/form-system/workflow-node-embedding.html`.
- Stable target: `.a3s-doc-workflow-studio[data-panel-open=true]`.
- Evidence: desktop screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log. An additional invalid-state screenshot is required at `workflow/contracts/workflow-dag-embedding-invalid.png`. Harness and Workflow interaction scenarios additionally prove their component-specific keyboard state transitions, invalid-state focus, reset recovery, disclosure focus return, and running-to-result transition.
