# Code Editor Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-22` |
| Decision | Host boundary |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/code-editor.html` |
| Stable selector | `[data-a3s-components~="code-editor"]` |
| Interaction scenario | `components-actions-forms.acl#code-editor` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-code-editor` |

## User problem

Code Editor has two layers: A3S UI provides a framework-agnostic native editing contract, while the full workbench below shows how to integrate the real Monaco Editor for a multi-file experience close to VS Code. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Host boundary**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own the editor frame, file identity, status, diagnostics slots, theme bridge, and native fallback contract. The host owns the editor engine, models, language services, commands, persistence, and trust.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Code Editor is stable, named, and ready for its primary reading or interaction job.
- `dirty` — Code Editor communicates the `dirty` condition with explicit text, structure, or native state rather than color alone.
- `invalid` — Code Editor explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `readonly` — Code Editor remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.code-editor` on `<div>`.
- Stable automation root: `[data-a3s-components~="code-editor"]`.
- Named parts: `control` (`textarea`); `gutter` (`[data-code-editor-gutter]`); `message` (`[data-code-editor-message]`); `position` (`[data-code-editor-position]`); `status` (`[data-code-editor-state]`).
- Supported interaction intents: `fill`, `focus`, `press`, `type`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:code-clean`, `a3s:code-save`.
- Required root attributes: `role=group`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Engine missing/slow/error, read-only, dirty/invalid, huge file, binary file, diagnostics, theme change, IME, mobile fallback, resize, multiple files, and unmount without leaked models.

## Accessibility

The canonical root uses `<div>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `fill`, `focus`, `press`, `type` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.code-editor` and is annotated by the runtime as `[data-a3s-components~="code-editor"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=code-editor]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Engine missing/slow/error, read-only, dirty/invalid, huge file, binary file, diagnostics, theme change, IME, mobile fallback, resize, multiple files, and unmount without leaked models.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `code-editor`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-code-editor`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/code-editor.html`.
- Stable root target: `[data-a3s-components~="code-editor"]` inside `.a3s-preview[data-preview-component=code-editor]:has(.code-editor[aria-label='Workflow code editor'])`.
- State-matrix screenshot: `components/contracts/code-editor-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=code-editor] [data-state-specimen=ready]:has([data-a3s-components~='code-editor'][data-a3s-state~='ready'][data-dirty=false])`
  - `dirty`: `.a3s-component-state-matrix[open][data-component=code-editor] [data-state-specimen=dirty]:has([data-a3s-components~='code-editor'][data-a3s-state~='dirty'][data-dirty=true])`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=code-editor] [data-state-specimen=invalid] [data-a3s-components~='code-editor'][data-a3s-state~='invalid'][data-validation-state=invalid]:has(textarea[aria-invalid=true])`
  - `readonly`: `.a3s-component-state-matrix[open][data-component=code-editor] [data-state-specimen=readonly] [data-a3s-components~='code-editor'][data-a3s-state~='readonly'][data-readonly]:has(textarea[readonly])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
