# Badge Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `FB-02` |
| Decision | Narrow |
| Priority | P2 |
| Category | `feedback` |
| Public route | `/en/components/badge.html` |
| Stable selector | `[data-a3s-components~="badge"]` |
| Interaction scenario | `components-feedback-data.acl#badge` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-badge` |

## User problem

Badge labels a status, category, or count with short text so users can scan quickly without mistaking it for a primary action. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Narrow**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Limit Badge to compact categorization or metadata. Operational lifecycle belongs to Status Badge; clickable pills use Button or Filter semantics.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Badge is stable, named, and ready for its primary reading or interaction job.
- `secondary` — Badge communicates the `secondary` condition with explicit text, structure, or native state rather than color alone.
- `outline` — Badge communicates the `outline` condition with explicit text, structure, or native state rather than color alone.
- `destructive` — Badge explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.badge` on `<span>`.
- Stable automation root: `[data-a3s-components~="badge"]`.
- Named parts: none; consumers must not depend on incidental descendants.
- This is a presentation contract. It must not invent click or keyboard behavior when the composed native elements do not own an action.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Long text, numeric count, icon, removable misuse rejection, dark contrast, high contrast, wrapping policy, and no status-by-color assumption.

## Accessibility

The canonical root uses `<span>` semantics and exposes 0 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Any interactive descendants retain their own native names and keyboard behavior; the root does not add a false role. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `destructive`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.badge` and is annotated by the runtime as `[data-a3s-components~="badge"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=badge]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Long text, numeric count, icon, removable misuse rejection, dark contrast, high contrast, wrapping policy, and no status-by-color assumption.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `badge`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-badge`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/badge.html`.
- Stable root target: `[data-a3s-components~="badge"]` inside `.a3s-preview[data-preview-component=badge][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/badge-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=badge] [data-state-specimen=ready]:has([data-a3s-components~='badge'][data-a3s-state~='ready'])`
  - `secondary`: `.a3s-component-state-matrix[open][data-component=badge] [data-state-specimen=secondary]:has([data-a3s-components~='badge'][data-a3s-state~='secondary'])`
  - `outline`: `.a3s-component-state-matrix[open][data-component=badge] [data-state-specimen=outline]:has([data-a3s-components~='badge'][data-a3s-state~='outline'])`
  - `destructive`: `.a3s-component-state-matrix[open][data-component=badge] [data-state-specimen=destructive]:has([data-a3s-components~='badge'][data-a3s-state~='destructive'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
