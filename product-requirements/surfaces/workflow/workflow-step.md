# Run Step Product Requirements

| Field | Contract |
| --- | --- |
| Surface group | `workflow` |
| Route | `/components/form-system/a3s-flow/step.html` |
| Stable selector | `.a3s-form-workflow-node-preview[data-node-type='flow.step']` |
| A3S Test suite | `tests/e2e/workflow-surface-contracts.acl` |
| A3S Test scenario | `workflow-node-step` |

## User problem

Workflow authors need to schedule one durable task with explicit input, retry, and exhausted-attempt behavior without editing an untyped configuration blob or guessing which ports are available.

## Product boundary

The node surface owns the typed manifest presentation, local field validation, port explanation, selected state, and controlled configuration callback. Flow owns graph and runtime semantics; the host owns credentials, authorization, persistence, compilation, registered handlers, and side effects.

## States

The required state vocabulary is ready, selected, editing, invalid, read-only, running, succeeded, and failed where applicable. State transitions preserve prior user context, never fabricate host success, and keep selection, focus, and disclosure synchronized with semantic attributes.

## Interaction contract

The stable acceptance root is `.a3s-form-workflow-node-preview[data-node-type='flow.step']`. Pointer and keyboard users must reach the same primary actions. Keyboard focus enters through named controls, activation uses native Enter or Space behavior, Escape or a repeated toggle closes transient layers where applicable, and focus returns to the control that opened the layer. Resizing or dragging always has a keyboard-accessible preset or command.

Workflow-specific acceptance: Edit and apply the registered step handler, reject an empty handler with focused textual validation, then recover the safe default before running the node.

## Responsive behavior

Desktop evidence uses 1440 × 1000 and compact evidence uses 390 × 844. The semantic reading order remains stable, the owning region controls scrolling, mobile navigation becomes inert while closed, and no primary value or recovery action is hidden behind clipping. Compatibility-node pages must remain explicit migration surfaces, preserve the node discriminator and unknown fields, and never imply that a visual example executes or persists a workflow.

## Accessibility

The surface has a named region or application landmark, real headings, labeled controls, visible focus, and state expressed through native properties or documented ARIA. Closed navigation and modal layers are removed from the keyboard path. Status changes use bounded announcements, reduced motion is respected, and visual tone never carries meaning alone.

## Failure, empty, and loading cases

Loading preserves geometry and identifies the pending scope. Empty states distinguish first use, no results, missing fixture data, and unavailable host integration. Errors retain the last safe context, state the failed operation, and expose retry only when deterministic recovery exists. Denied, offline, stale, malformed, and unsupported cases remain explicit and cannot silently become success.

## Acceptance criteria

- The route resolves directly on first load and exposes `.a3s-form-workflow-node-preview[data-node-type='flow.step']` after hydration.
- The primary user job and current state are understandable before any secondary detail is opened.
- Keyboard focus and activation prove the primary interaction boundary without depending on drag, hover, or precise pointing.
- Desktop and compact screenshots show complete, aligned content with no page-level horizontal overflow.
- Accessibility evidence contains the named surface, its controls, and truthful expanded, selected, disabled, or inert state.
- Console and page-error evidence contain no runtime failures.
- Component-specific edit, rejection, recovery, panel disclosure, focus return, running, and successful-result transitions are deterministic where this surface owns them. The exact workflow proof is: Edit and apply the registered step handler, reject an empty handler with focused textual validation, then recover the safe default before running the node.
- Product-specific risk is covered: Compatibility-node pages must remain explicit migration surfaces, preserve the node discriminator and unknown fields, and never imply that a visual example executes or persists a workflow.

## A3S Test mapping

- Suite: `tests/e2e/workflow-surface-contracts.acl`.
- Scenario: `workflow-node-step`.
- Preview URL: `http://127.0.0.1:4178/UI/components/form-system/a3s-flow/step.html`.
- Stable target: `.a3s-form-workflow-node-preview[data-node-type='flow.step']`.
- Evidence: desktop screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log. An additional invalid-state screenshot is required at `workflow/contracts/workflow-step-invalid.png`. Harness and Workflow interaction scenarios additionally prove their component-specific keyboard state transitions, invalid-state focus, reset recovery, disclosure focus return, and running-to-result transition.
