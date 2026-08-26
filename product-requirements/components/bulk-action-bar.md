# Bulk Action Bar Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-03` |
| Decision | Keep |
| Priority | P1 |
| Category | `actions` |
| Public route | `/en/components/bulk-action-bar.html` |
| Stable selector | `[data-a3s-components~="bulk-action-bar"]` |
| Interaction scenario | `components-feedback-data.acl#bulk-action-bar` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-bulk-action-bar` |
| Deep review source | `product-requirements/component-details/bulk-action-bar.md` |

## User problem

Bulk Action Bar is a temporary command region for a collection with an active selection. It keeps the selected scope, eligibility, batch commands, and the way out of selection mode in one predictable place. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Appear only after selection, state the exact scope, separate eligible from ineligible actions, and keep clear-selection adjacent. Collapse secondary actions on phones without hiding scope.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `empty` — Bulk Action Bar states what is absent and why when known, then offers only a valid next action.
- `selected` — Bulk Action Bar exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.
- `loading` — Bulk Action Bar preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `disabled` — Bulk Action Bar remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.bulk-action-bar` on `<section>`.
- Stable automation root: `[data-a3s-components~="bulk-action-bar"]`.
- Named parts: `action` (`[data-bulk-actions] button, [data-bulk-actions] a[href]`); `actions` (`[data-bulk-actions]`); `clear` (`[data-bulk-clear]`); `selection` (`[data-bulk-selection]`); `summary` (`[data-bulk-summary]`).
- Supported interaction intents: `click`, `focus`, `press`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `a3s:bulk-action`, `a3s:bulk-action-complete`, `a3s:bulk-before-action`, `a3s:bulk-focus-restored`, `a3s:bulk-selection-change`, `basecoat:initialized`.
- Public methods: `clear`, `complete`, `getSelection`, `refresh`, `setPending`, `setSelection`, `setSummary`.
- Required root attributes: `aria-label=Selected item actions`, `role=region`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Zero/one/many selection, partial eligibility, remote rejection, sticky overlap, phone safe area, keyboard entry/exit, and restored selection.

## Accessibility

The canonical root uses `<section>` semantics and exposes 5 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus`, `press` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Deep review supplement

### Primary job and ownership

Bulk Action Bar is a temporary command region for a collection that already
has a meaningful selection. It answers four questions in one scan: what is
selected, which scope the selection represents, which commands are currently
eligible, and how to leave selection mode. It should disappear when there is
no selection instead of becoming a disabled toolbar with no task to perform.

The component owns:

- one named `.bulk-action-bar` region and its selection, summary, action, and
  clear parts;
- synchronized selection count and a small controlled selection snapshot;
- command intent, cancelable before-action hooks, pending state, completion
  state, and the temporary visibility of the region;
- joined layout, responsive reflow, sticky placement, overflow containment,
  and focus restoration when the region leaves the document order;
- a predictable escape path while an asynchronous command is pending when
  the host opts into keeping clear selection available.

The component does not own:

- collection data, row selection controls, permissions, authorization,
  transport, persistence, optimistic mutation, confirmation, retry policy, or
  analytics;
- a request, cancellation token, progress calculation, or undo operation;
- a second selection model inside React or Vue;
- command ordering, destructive confirmation, or the meaning of an action;
- focus policy outside the optional `data-bulk-focus-return` target or the
  documented Data Grid fallback.

### Grouping decision

Use Bulk Action Bar only when all of these are true:

1. A collection exposes an actual multi-selection state.
2. At least one command can operate on that selection as a bounded batch.
3. The selection scope and the way to leave selection mode need to remain
   visible while the user decides.

Use an ordinary Toolbar for persistent collection controls, a Data Grid for
selection ownership, an Alert Dialog for irreversible confirmation, and a
Toast or Alert for durable results. Do not use Bulk Action Bar as a generic
footer, a pagination row, or a place to hide unavailable commands.

### Semantic and DOM contract

The root is a `<section class="bulk-action-bar" role="region">` with a
collection-specific `aria-label` or `aria-labelledby`. The root receives
`data-state="empty|selected|loading|disabled"` and is hidden when the current
selection is empty unless a pending request is deliberately kept visible.

The named parts are:

- `selection`: `[data-bulk-selection]`, containing one or more
  `[data-selected-count]` outputs;
- `summary`: `[data-bulk-summary]`, for eligibility, progress, and bounded
  outcome text;
- `actions`: `[data-bulk-actions]`, containing native buttons or links;
- `action`: `[data-bulk-actions] button, [data-bulk-actions] a[href]`;
- `clear`: `[data-bulk-clear]`, the command that leaves selection mode.

Every command has a stable `data-bulk-action` value. Clear actions may omit
that value because `data-bulk-clear` resolves to `clear`, but using both is
recommended for automation. A host may provide
`data-bulk-focus-return="<selector>"` to identify the stable collection
control that should receive focus after the bar hides. A Data Grid parent
automatically falls back to its select-all control, identity heading, or
viewport.

### Information hierarchy and geometry

The visual order is selection, eligibility or status, commands, then clear.
At a wide owner the three regions share one row. Below 48rem of container
width, selection and commands remain on the first row and the summary receives
the full second row. Below 32rem, the component becomes three explicit rows:
selection, summary, and actions. The DOM order never changes.

The selection count is the only accent-colored value. The surrounding label
uses primary text so the count remains legible in light, dark, and forced
colors. Summary text may wrap at word or character boundaries; it must never
push a command outside the owner or create page-level horizontal overflow.
Actions may wrap within their own region. Clear remains visually secondary and
is placed after the batch commands in DOM order.

The selected surface may use the shared selection tint and one measured border.
It does not use a gradient, a generic glow, or a second card inside a
collection card. Sticky placement earns a soft offset shadow because content
can pass underneath it; inline placement stays flat.

### State and transition contract

| State | Required behavior | Valid transition |
| --- | --- | --- |
| `empty` | Root is hidden; no disabled empty toolbar remains in the reading order. | Host sets a non-empty selection. |
| `selected` | Count, scope, eligible commands, and clear are visible. Commands keep native names and states. | A command is activated, selection changes, or host enters loading. |
| `loading` | Root keeps geometry and the pending selection snapshot. The pending command and all contradictory commands are disabled. Clear stays available by default (`allowClear: true`) so a user can leave selection mode; hosts may set `allowClear: false`. | `complete()` resolves success or error, or `setPending(false)` cancels the local pending presentation. |
| `disabled` | Root remains understandable; every action is natively disabled or has equivalent `aria-disabled` semantics. | Host restores command availability. |
| `error` result | `data-result="error"` and summary text name the problem and a concrete recovery. Selection remains intact when recovery is possible. | Host calls `complete()` with a retry action or clears selection. |
| `success` result | Summary confirms the bounded result using the processed count when supplied. | Host clears selection or returns to `selected`. |

When clear is activated during loading, the component clears its local
selection while retaining the pending region and marks
`data-selection-cleared="true"`. The request is not canceled; the host owns
that decision. A completion call can remove the pending region, and the host
receives the original pending selection in the completion detail. If the host
does not want this escape path, it passes `{ allowClear: false }` to
`setPending()`.

### Focus and keyboard contract

The bar never steals focus when it appears. Every native command remains in the
normal Tab order and supports Enter or Space through its native element. A
cancelable `a3s:bulk-before-action` event runs before any command side effect.
Escape is not intercepted by the bar because it has no popup or modal layer.

When clear or a successful completion hides the bar while focus is inside it,
focus moves to the explicit `data-bulk-focus-return` target, the owning Data
Grid's stable control, or no target if the host has not provided one. Focus is
never left on a hidden button. The component emits
`a3s:bulk-focus-restored` only when it actually moved focus.

### Public controller contract

`getSelection()` returns a clone `{ count, values }`. `setSelection()` accepts
an array, a count, or that same object and emits
`a3s:bulk-selection-change` unless `emit: false` is passed. `clear()` is a
convenience for an empty selection and accepts `keepPending`, `restoreFocus`,
and `source` options. `setSummary()` updates the bounded status message.

`setPending(action, true, options)` stores the selected snapshot, marks the
root busy, and disables contradictory commands. Options include `message`,
`allowClear` (defaults to true), and host-owned metadata. `setPending(false)`
restores each action's original disabled and `aria-disabled` values.

`complete({ action, status, message, error, processedCount,
clearSelection })` ends pending state, publishes
`a3s:bulk-action-complete`, and optionally clears selection. `refresh()`
recollects dynamic action nodes without creating another selection model.

Events are `a3s:bulk-before-action`, `a3s:bulk-action`,
`a3s:bulk-action-complete`, `a3s:bulk-selection-change`,
`a3s:bulk-focus-restored`, and `basecoat:initialized`. The controller never
performs a network request.

### Responsive, localization, and input contract

- At 1440 × 1000, a normal command set remains one scanable row when its
  owner is wide enough; a documentation preview may use the two-row compact
  arrangement without clipping.
- At 390 × 844 and 320px content width, selection, summary, and actions are
  separate rows with no document-level horizontal overflow.
- Long English, German, Chinese, and Arabic labels wrap inside the action
  region. Counts use tabular numerals and never rely on a fixed button width.
- Coarse pointers keep every command at least 44 CSS pixels high. The visible
  compact style may remain smaller only on fine pointers.
- RTL reverses physical placement through grid and logical properties while
  retaining DOM and focus order. Directional icons mirror only when their
  meaning is spatial.
- At 200% zoom, the summary remains readable and the action group stays
  reachable. Reduced motion removes the pending spinner animation. Forced
  colors expose native button and focus differences.

### Framework parity

HTML, React, and Vue examples render the same section root, named parts,
selection semantics, pending options, focus-return attribute, and event/method
contract. `useBulkActionBar` and the Vue `useBulkActionBar` composable bind a
ref, expose readiness, subscribe to the same DOM events, and call only the
public methods. They do not mirror selection in framework-private state.

### Adversarial release matrix

| Risk | Required evidence |
| --- | --- |
| Visibility | Zero selection hides the whole region; one and many selections show the exact count and scope. |
| Eligibility | A partial eligible set states the actionable count and never silently skips unavailable items. |
| Loading | Pending action has a visible pending marker, contradictory commands are disabled, and clear behavior follows `allowClear`. |
| Failure and recovery | Error text names a recovery; selection and focus survive a rejected operation; retry can be activated. |
| Focus | Clear and `complete({ clearSelection: true })` restore focus to a stable host target when the bar disappears. |
| Layout | Wide, 48rem compact, 390px, 320px-equivalent, long Chinese, long German, dark, RTL, and sticky layouts avoid overflow. |
| Input preferences | Coarse pointer, reduced motion, forced colors, and keyboard activation preserve operation. |
| Frameworks | Integrated HTML, React, and Vue examples expose the same root, tabs, code, methods, and lifecycle events. |
| Browser health | Deterministic acceptance has empty console and page-error evidence; infrastructure failures are reported separately. |

### Remaining manual release gates

Automation cannot prove real iOS and Android touch targeting, switch-control
or voice-control activation, true browser 200% zoom, Windows forced-colors
rendering, or every screen-reader/browser pairing. Bulk Action Bar remains
**In review** until those smoke tests are recorded and accepted.



## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.bulk-action-bar` and is annotated by the runtime as `[data-a3s-components~="bulk-action-bar"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=bulk-action-bar]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Zero/one/many selection, partial eligibility, remote rejection, sticky overlap, phone safe area, keyboard entry/exit, and restored selection.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-feedback-data.acl`, scenario `bulk-action-bar`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-bulk-action-bar`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/bulk-action-bar.html`.
- Stable root target: `[data-a3s-components~="bulk-action-bar"]` inside `.a3s-preview[data-preview-component=bulk-action-bar][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/bulk-action-bar-states.png`.
- Per-state evidence selectors:
  - `empty`: `.a3s-component-state-matrix[open][data-component=bulk-action-bar] [data-state-specimen=empty]:has([data-a3s-components~='bulk-action-bar'][data-a3s-state~='empty'])`
  - `selected`: `.a3s-component-state-matrix[open][data-component=bulk-action-bar] [data-state-specimen=selected]:has([data-a3s-components~='bulk-action-bar'][data-a3s-state~='selected'][data-selected=true])`
  - `loading`: `.a3s-component-state-matrix[open][data-component=bulk-action-bar] [data-state-specimen=loading]:has([data-a3s-components~='bulk-action-bar'][data-a3s-state~='loading'][aria-busy=true])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=bulk-action-bar] [data-state-specimen=disabled]:has([data-a3s-components~='bulk-action-bar'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
