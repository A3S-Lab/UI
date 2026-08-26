# Code Graph Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `HR-30` |
| Decision | Host boundary |
| Priority | P0 |
| Category | `harness` |
| Public route | `/en/components/code-graph.html` |
| Stable selector | `[data-a3s-components~="code-graph"]` |
| Interaction scenario | `components-application-utilities.acl#code-graph` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-code-graph` |

## User problem

3D Code Graph reveals entry points, modules, components, tests, and configuration relationships in a large codebase. It combines spatial exploration, search, neighbourhood highlighting, and property inspection while keeping an operable list fallback. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Host boundary**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own the inspectable graph frame, legend, selection, navigation controls, loading/error fallback, and accessible textual alternative. Repository analysis, graph construction, layout engine, 3D renderer, source trust, and navigation remain host-owned.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Code Graph is stable, named, and ready for its primary reading or interaction job.
- `loading` — Code Graph preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `empty` — Code Graph states what is absent and why when known, then offers only a valid next action.
- `error` — Code Graph explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `unsupported` — Code Graph explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `partial` — Code Graph communicates the `partial` condition with explicit text, structure, or native state rather than color alone.

## Interaction contract

- Canonical root: `.code-graph` on `<section>`.
- Stable automation root: `[data-a3s-components~="code-graph"]`.
- Named parts: `action` (`[data-code-graph-action]`); `canvas` (`[data-code-graph-canvas]`); `edge` (`[data-code-edge]`); `inspector` (`[data-code-graph-inspector]`); `legend` (`[data-code-graph-legend]`); `list` (`[data-code-graph-list]`); `node` (`[data-code-node]`); `search` (`[data-code-graph-search]`); `status` (`[data-code-graph-status]`); `viewport` (`[data-code-graph-viewport]`).
- Supported interaction intents: `click`, `fill`, `focus`, `press`, `type`, `wheel`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:code-graph-before-filter-change`, `a3s:code-graph-before-selection-change`, `a3s:code-graph-filter-change`, `a3s:code-graph-selection-change`, `a3s:code-graph-state-change`, `a3s:code-graph-view-change`, `basecoat:initialized`.
- Public methods: `clearFilter`, `clearSelection`, `getFilter`, `getSelection`, `getState`, `refresh`, `resetView`, `select`, `setData`, `setFilter`, `setState`, `setView`, `zoomIn`, `zoomOut`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/huge/disconnected graphs, slow or failed analysis, WebGL unavailable, reduced motion, keyboard selection, zoom/pan reset, long labels, dark contrast, phone fallback, stale nodes, and deterministic cleanup after source changes.

## Accessibility

The canonical root uses `<section>` semantics and exposes 10 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `fill`, `focus`, `press`, `type`, `wheel` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.



## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `error`, `unsupported`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.code-graph` and is annotated by the runtime as `[data-a3s-components~="code-graph"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=code-graph]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/huge/disconnected graphs, slow or failed analysis, WebGL unavailable, reduced motion, keyboard selection, zoom/pan reset, long labels, dark contrast, phone fallback, stale nodes, and deterministic cleanup after source changes.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-application-utilities.acl`, scenario `code-graph`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-code-graph`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/code-graph.html`.
- Stable root target: `[data-a3s-components~="code-graph"]` inside `.a3s-preview[data-preview-component=code-graph][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/code-graph-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=code-graph] [data-state-specimen=ready]:has([data-a3s-components~='code-graph'][data-a3s-state~='ready'])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=code-graph] [data-state-specimen=loading]:has([data-a3s-components~='code-graph'][data-a3s-state~='loading'][aria-busy=true])`
  - `empty`: `.a3s-component-state-matrix[open][data-component=code-graph] [data-state-specimen=empty]:has([data-a3s-components~='code-graph'][data-a3s-state~='empty'])`
  - `error`: `.a3s-component-state-matrix[open][data-component=code-graph] [data-state-specimen=error]:has([data-a3s-components~='code-graph'][data-a3s-state~='error'])`
  - `unsupported`: `.a3s-component-state-matrix[open][data-component=code-graph] [data-state-specimen=unsupported]:has([data-a3s-components~='code-graph'][data-a3s-state~='unsupported'])`
  - `partial`: `.a3s-component-state-matrix[open][data-component=code-graph] [data-state-specimen=partial]:has([data-a3s-components~='code-graph'][data-a3s-state~='partial'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
