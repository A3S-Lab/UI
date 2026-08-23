# Spinner Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `FB-07` |
| Decision | Demote |
| Priority | P0 |
| Category | `feedback` |
| Public route | `/en/components/spinner.html` |
| Stable selector | `[data-a3s-components~="spinner"]` |
| Interaction scenario | `components-feedback-data.acl#spinner` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-spinner` |

## User problem

There is no dedicated Spinner component in A3S UI. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Demote**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Resolve the contradiction by treating spinner as an Icon/Progress recipe and motion utility, not a standalone adapter component. Keep `.animate-spin` compatibility and publish migration guidance.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `loading` — Spinner preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.

## Interaction contract

- Canonical root: `.animate-spin[role=status]` on `<span>`.
- Stable automation root: `[data-a3s-components~="spinner"]`.
- Named parts: none; consumers must not depend on incidental descendants.
- This is a presentation contract. It must not invent click or keyboard behavior when the composed native elements do not own an action.
- Required root attributes: `aria-label=Loading`, `role=status`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Reduced motion with nearby status text, button/badge/input composition, accessible name policy, no empty generic framework wrapper, and manifest/export removal only at a major boundary.

## Accessibility

The canonical root uses `<span>` semantics and exposes 0 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Any interactive descendants retain their own native names and keyboard behavior; the root does not add a false role. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.animate-spin[role=status]` and is annotated by the runtime as `[data-a3s-components~="spinner"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=spinner]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Reduced motion with nearby status text, button/badge/input composition, accessible name policy, no empty generic framework wrapper, and manifest/export removal only at a major boundary.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `spinner`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-spinner`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/spinner.html`.
- Stable root target: `[data-a3s-components~="spinner"]` inside `.a3s-preview[data-preview-component=spinner][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/spinner-states.png`.
- Per-state evidence selectors:
  - `loading`: `.a3s-component-state-matrix[open][data-component=spinner] [data-state-specimen=loading]:has([data-a3s-components~='spinner'][data-a3s-state~='loading'][aria-busy=true])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
