# File Type Icon Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `DC-05` |
| Decision | Narrow |
| Priority | P2 |
| Category | `data-display` |
| Public route | `/en/components/file-type-icon.html` |
| Stable selector | `[data-a3s-components~="file-type-icon"]` |
| Interaction scenario | `components-expanded-contracts.acl#file-type-icon` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-file-type-icon` |

## User problem

Provides a stable, restrained type cue in file lists and attachments while the actual filename remains the primary identifier. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Narrow**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Provide a secondary type cue while the filename remains primary. Use a restrained finite mapping and a host slot for unknown or branded types.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — File Type Icon is stable, named, and ready for its primary reading or interaction job.
- `generic` — File Type Icon communicates the `generic` condition with explicit text, structure, or native state rather than color alone.
- `known` — File Type Icon communicates the `known` condition with explicit text, structure, or native state rather than color alone.
- `host-provided` — File Type Icon communicates the `host-provided` condition with explicit text, structure, or native state rather than color alone.

## Interaction contract

- Canonical root: `.file-type-icon` on `<span>`.
- Stable automation root: `[data-a3s-components~="file-type-icon"]`.
- Named parts: `extension` (`[data-file-extension]`); `graphic` (`svg, img`).
- This is a presentation contract. It must not invent click or keyboard behavior when the composed native elements do not own an action.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Unknown/no extension, compound extension, uppercase, hidden file, provider icon, dark contrast, dense tree alignment, and no type-by-color-only meaning.

## Accessibility

The canonical root uses `<span>` semantics and exposes 2 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Any interactive descendants retain their own native names and keyboard behavior; the root does not add a false role. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.file-type-icon` and is annotated by the runtime as `[data-a3s-components~="file-type-icon"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=file-type-icon]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Unknown/no extension, compound extension, uppercase, hidden file, provider icon, dark contrast, dense tree alignment, and no type-by-color-only meaning.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-expanded-contracts.acl`, scenario `file-type-icon`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-file-type-icon`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/file-type-icon.html`.
- Stable root target: `[data-a3s-components~="file-type-icon"]` inside `.a3s-preview[data-preview-component=file-type-icon][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/file-type-icon-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=file-type-icon] [data-state-specimen=ready]:has([data-a3s-components~='file-type-icon'][data-a3s-state~='ready'])`
  - `generic`: `.a3s-component-state-matrix[open][data-component=file-type-icon] [data-state-specimen=generic]:has([data-a3s-components~='file-type-icon'][data-a3s-state~='generic'])`
  - `known`: `.a3s-component-state-matrix[open][data-component=file-type-icon] [data-state-specimen=known]:has([data-a3s-components~='file-type-icon'][data-a3s-state~='known'])`
  - `host-provided`: `.a3s-component-state-matrix[open][data-component=file-type-icon] [data-state-specimen=host-provided]:has([data-a3s-components~='file-type-icon'][data-a3s-state~='host-provided'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
