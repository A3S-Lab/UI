# Icon Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `DC-04` |
| Decision | Keep |
| Priority | P0 |
| Category | `data-display` |
| Public route | `/en/components/icon.html` |
| Stable selector | `[data-a3s-components~="icon"]` |
| Interaction scenario | `components-expanded-contracts.acl#icon` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-icon` |

## User problem

Provides a consistent size, stroke, and alignment slot for decorative cues or independently named graphics supplied by the host. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Establish the single optical size, stroke, alignment, decorative, labeled, and host-slot contract used by all controls. Do not redistribute unrelated provider assets.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Icon is stable, named, and ready for its primary reading or interaction job.
- `decorative` — Icon communicates the `decorative` condition with explicit text, structure, or native state rather than color alone.
- `labeled` — Icon communicates the `labeled` condition with explicit text, structure, or native state rather than color alone.
- `host-provided` — Icon communicates the `host-provided` condition with explicit text, structure, or native state rather than color alone.

## Interaction contract

- Canonical root: `.icon` on `<span>`.
- Stable automation root: `[data-a3s-components~="icon"]`.
- Named parts: `graphic` (`svg, img, [data-icon-slot]`).
- This is a presentation contract. It must not invent click or keyboard behavior when the composed native elements do not own an action.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: SVG/image/slot, missing icon, 14–20px sizes, RTL mirroring rules, high contrast, decorative hiding, standalone label, and baseline alignment with mixed scripts.

## Accessibility

The canonical root uses `<span>` semantics and exposes 1 named part. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Any interactive descendants retain their own native names and keyboard behavior; the root does not add a false role. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.icon` and is annotated by the runtime as `[data-a3s-components~="icon"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=icon]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: SVG/image/slot, missing icon, 14–20px sizes, RTL mirroring rules, high contrast, decorative hiding, standalone label, and baseline alignment with mixed scripts.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-expanded-contracts.acl`, scenario `icon`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-icon`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/icon.html`.
- Stable root target: `[data-a3s-components~="icon"]` inside `.a3s-preview[data-preview-component=icon][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/icon-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=icon] [data-state-specimen=ready]:has([data-a3s-components~='icon'][data-a3s-state~='ready'])`
  - `decorative`: `.a3s-component-state-matrix[open][data-component=icon] [data-state-specimen=decorative]:has([data-a3s-components~='icon'][data-a3s-state~='decorative'])`
  - `labeled`: `.a3s-component-state-matrix[open][data-component=icon] [data-state-specimen=labeled]:has([data-a3s-components~='icon'][data-a3s-state~='labeled'])`
  - `host-provided`: `.a3s-component-state-matrix[open][data-component=icon] [data-state-specimen=host-provided]:has([data-a3s-components~='icon'][data-a3s-state~='host-provided'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
