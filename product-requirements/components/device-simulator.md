# Device Simulator Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-25` |
| Decision | Host boundary |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/device-simulator.html` |
| Stable selector | `[data-a3s-components~="device-simulator"]` |
| Interaction scenario | `components-application-utilities.acl#device-simulator` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-device-simulator` |

## User problem

Device Simulator switches between phone, tablet, and desktop viewports inside a bounded workbench and renders the matching hardware shell for each class. Browser mode uses a real-size `iframe`; native mode hands safe arguments to a trusted host that can launch `a3s-webview`. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Host boundary**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own presets, custom dimensions, orientation, scale, chrome, loading/error, and a trusted preview slot. Integrate with A3S WebView through an explicit bridge; navigation, remote content, device capabilities, and security stay host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Device Simulator is stable, named, and ready for its primary reading or interaction job.
- `loading` — Device Simulator preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `error` — Device Simulator explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.

## Interaction contract

- Canonical root: `.device-simulator` on `<section>`.
- Stable automation root: `[data-a3s-components~="device-simulator"]`.
- Named parts: `action` (`[data-device-simulator-actions] button, [data-device-simulator-navigation] button, :scope > footer button`); `command` (`[data-device-simulator-command]`); `control` (`[data-device-simulator-select], [data-device-simulator-width], [data-device-simulator-height], [data-device-simulator-orientation] button`); `input` (`[data-device-simulator-url]`); `preview` (`[data-device-simulator-preview]`); `status` (`[data-device-simulator-status], [data-device-simulator-screen-status]`); `viewport` (`[data-device-simulator-workspace]`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`, `select`, `type`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:device-change`, `a3s:device-navigate`, `a3s:device-preview-request`, `basecoat:initialized`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Phone/tablet/desktop/custom, rotate, min/max dimensions, cross-origin frame, load failure, permission denial, WebView unavailable, keyboard controls, responsive container, high DPI, zoom, dark chrome, and cleanup on source change.

## Accessibility

The canonical root uses `<section>` semantics and exposes 7 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press`, `select`, `type`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.device-simulator` and is annotated by the runtime as `[data-a3s-components~="device-simulator"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=device-simulator]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Phone/tablet/desktop/custom, rotate, min/max dimensions, cross-origin frame, load failure, permission denial, WebView unavailable, keyboard controls, responsive container, high DPI, zoom, dark chrome, and cleanup on source change.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `device-simulator`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-device-simulator`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/device-simulator.html`.
- Stable root target: `[data-a3s-components~="device-simulator"]` inside `.a3s-preview[data-preview-component=device-simulator][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/device-simulator-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=device-simulator] [data-state-specimen=ready]:has([data-a3s-components~='device-simulator'][data-a3s-state~='ready'])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=device-simulator] [data-state-specimen=loading]:has([data-a3s-components~='device-simulator'][data-a3s-state~='loading'][aria-busy=true])`
  - `error`: `.a3s-component-state-matrix[open][data-component=device-simulator] [data-state-specimen=error]:has([data-a3s-components~='device-simulator'][data-a3s-state~='error'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
