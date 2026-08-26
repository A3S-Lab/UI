# Brand Lockup Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `LW-05` |
| Decision | Keep |
| Priority | P0 |
| Category | `application` |
| Public route | `/en/components/brand-lockup.html` |
| Stable selector | `[data-a3s-components~="brand-lockup"]` |
| Interaction scenario | `components-application-utilities.acl#brand-lockup` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-brand-lockup` |

## User problem

Brand Lockup combines the official mark, product name, and an optional description into a stable identity for application headers, authentication entry points, and product navigation. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Render only the official mark, product name, and optional description through one asset contract. Compact and monochrome modes derive from the same identity source.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Brand Lockup is stable, named, and ready for its primary reading or interaction job.

## Interaction contract

- Canonical root: `.brand-lockup` on `<a>`.
- Stable automation root: `[data-a3s-components~="brand-lockup"]`.
- Named parts: `description` (`[data-brand-description]`); `identity` (`[data-brand-identity]`); `mark` (`[data-brand-mark]`); `name` (`[data-brand-name]`).
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Missing image, dark/light, monochrome, compact header, long product name, high DPI, accessible name, and rejection of third-party marks as built-ins.

## Accessibility

The canonical root uses `<a>` semantics and exposes 4 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.brand-lockup` and is annotated by the runtime as `[data-a3s-components~="brand-lockup"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=brand-lockup]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Missing image, dark/light, monochrome, compact header, long product name, high DPI, accessible name, and rejection of third-party marks as built-ins.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `brand-lockup`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-brand-lockup`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/brand-lockup.html`.
- Stable root target: `[data-a3s-components~="brand-lockup"]` inside `.a3s-preview[data-preview-component=brand-lockup][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/brand-lockup-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=brand-lockup] [data-state-specimen=ready]:has([data-a3s-components~='brand-lockup'][data-a3s-state~='ready'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
