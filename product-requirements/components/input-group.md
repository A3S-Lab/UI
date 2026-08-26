# Input Group Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-09` |
| Decision | Narrow |
| Priority | P0 |
| Category | `forms` |
| Public route | `/en/components/input-group.html` |
| Stable selector | `[data-a3s-components~="input-group"]` |
| Interaction scenario | `components-actions-forms.acl#input-group` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-input-group` |
| Deep review source | `product-requirements/component-details/input-group.md` |

## User problem

Input Group presents one editable value and the context needed to interpret or act on that value inside one continuous boundary. It does not replace Field, validation, suggestions, rich editing, or application state. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Narrow**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own one shared boundary around exactly one primary value control and only the prefixes, suffixes, units, status, or bounded actions needed to interpret or operate that value. Field retains the label, guidance, and recovery message; higher composites retain suggestions, rich authoring, attachments, and request state.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `empty` — Input Group states what is absent and why when known, then offers only a valid next action.
- `ready` — Input Group is stable, named, and ready for its primary reading or interaction job.
- `invalid` — Input Group explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `loading` — Input Group preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `disabled` — Input Group remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `readonly` — Input Group remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.input-group` on `<div>`.
- Stable automation root: `[data-a3s-components~="input-group"]`.
- Named parts: `action` (`:scope > button, :scope > [role=group] button, :scope > header button, :scope > footer button, :scope > .popover button, :scope > .dropdown-menu button`); `addon` (`:scope > [data-align]`); `control` (`:scope > input, :scope > textarea, :scope > select, :scope > [data-control]`); `prefix` (`:scope > :is([data-align=start], [data-align=inline-start], [data-align=block-start])`); `status` (`:scope > :is([data-input-group-status], [role=status]), :scope > [data-align] [role=status]`); `suffix` (`:scope > :is([data-align=end], [data-align=inline-end], [data-align=block-end])`).
- Supported interaction intents: `fill`, `focus`, `type`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `basecoat:initialized`.
- Required root attributes: none beyond the documented native semantics and states.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/ready/invalid/loading/disabled/read-only, inert-addon focus forwarding, stale async results, multiple addons/actions, bounded multiline input, long localized suffixes, coarse pointers, 390px, RTL, forced colors, and no nested borders or outer rings.

## Accessibility

The canonical root uses `<div>` semantics and exposes 6 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `fill`, `focus`, `type` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Deep review supplement

### Primary job and ownership

Input Group presents one primary value control and its inseparable local context inside one continuous control boundary. It exists when a prefix, suffix, unit, status, shortcut, or bounded action would otherwise look detached from the value it qualifies.

Input Group owns:

- one `.input-group` shell and one direct primary `input`, `textarea`, `select`, or documented `[data-control]`;
- inline-start, inline-end, block-start, and block-end addon placement using logical direction;
- one container-owned hover, focus, invalid, disabled, read-only, and busy treatment;
- pointer forwarding from non-interactive shell space to the primary control;
- containment of long values, localized addons, and bounded multiline editing.

Input Group does not own:

- the persistent visible label, ordinary description, requirement copy, or current error, which remain one surrounding Field relationship;
- value state, form submission, validation policy, formatting, parsing, persistence, authorization, analytics, or asynchronous request reconciliation;
- suggestion navigation, remote results, token selection, commands, rich text, attachments, or queued submission, which belong to higher-level components;
- an arbitrary toolbar. Every action inside the boundary must directly inspect, reveal, clear, copy, choose a unit for, or submit the one primary value.

If the composition does not need one shared boundary, use the native control and adjacent content instead. If it needs more than one primary value, use Fieldset, Form, or a purpose-built composite rather than placing multiple controls in one Input Group.

### Semantic and DOM contract

The canonical root is `<div class="input-group">` with no default widget role. The direct primary control supplies its own accessible name, value, editing semantics, and keyboard behavior. Do not add `role="group"` merely to obtain styling; add a named group role only when assistive-technology users need a relationship that the control, its label, and descriptions cannot already express.

The recommended DOM order is:

1. the primary control;
2. inline or block addons in reading order;
3. bounded actions where they are encountered in keyboard order.

Visual alignment may use `data-align="inline-start|inline-end|block-start|block-end"` without changing DOM or focus order. The legacy `start` and `end` values remain aliases for `inline-start` and `inline-end`. Block placement makes the shell vertical; `data-orientation="vertical"` remains a compatibility hint, not a separate component mode.

Direct addon elements may be `span`, `kbd`, `svg`, `header`, `footer`, or a named action group. Decorative icons use `aria-hidden="true"`. Status text uses an explicit status element or live region only when the message changes asynchronously. An icon never supplies the only meaning of validation, availability, progress, or an action.

The runtime forwards a pointer click on inert shell or addon space to the direct primary control. It must not:

- intercept clicks from the primary control or an interactive descendant;
- override native label activation, including a label authored inside an addon;
- activate, submit, clear, or change the value;
- focus a disabled control;
- steal focus from a popover, menu, active text Range selection, or another nested widget;
- reorder keyboard focus or synthesize keyboard behavior.

### State and transition contract

| State | Control and shell contract | Required explanation | Valid transition |
| --- | --- | --- | --- |
| `empty` | Enabled primary control with an empty value; no authored error before validation | Field guidance explains the value purpose and any stable constraint | Input moves to `ready`; a failed validation attempt may move to `invalid` |
| `ready` | Enabled value or neutral editable control; shell owns one resting boundary | Ordinary Field guidance remains associated | Editing stays `ready`; validation may move to `invalid`; host work may move to `loading` |
| `invalid` | Attempted value is preserved; primary control receives `aria-invalid="true"`; shell reflects the descendant state | One Field error names the exact problem and a concrete recovery; the error ID joins `aria-describedby` | A valid edit clears stale error semantics; reset returns to neutral `empty` or the authored initial value |
| `loading` | Shell receives `aria-busy="true"`; value, focus, geometry, and editing context remain stable; a bounded visible status explains the operation | Status names the actual work, such as “Searching projects”; duplicate actions are disabled individually | Latest accepted response returns to `ready`; failure becomes a host or Field error without replacing newer input |
| `disabled` | Primary control and every related action are natively disabled; the shell is not focusable; value remains legible | Field guidance names the policy, permission, lifecycle, or unavailable dependency | Only the owning host condition may enable the group |
| `readonly` | Supported text control is natively read-only, focusable, selectable, copyable, and submitted; mutating actions are removed or disabled | Field guidance explains why editing is unavailable and who or what can change it | Only the owning host permission or lifecycle may restore editing |

Focus and hover are interaction conditions within these states, not parallel business states. Browser autofill, IME composition, selection, and native search clearing remain browser behavior. Loading is not a generic dimmed appearance and never implies that a query field must stop accepting newer input.

### Addons and actions

- A prefix or suffix carries information that is inseparable from interpreting the value, such as a protocol, unit, domain, or current result count. General instructions remain outside the boundary in Field guidance.
- Inline text is concise and normally stays on one line. When a localized suffix cannot fit, the primary value keeps the available width and the addon truncates or the composition moves to a block addon; the document must not overflow.
- A keyboard hint describes an existing shortcut. It is not an action and does not replace an accessible label.
- Icon-only actions require an accessible name and at least a 44 by 44 CSS-pixel hit target on coarse pointers. Their visible geometry may remain compact on precise pointers.
- A clear action appears only when the host owns clearing behavior, is named “Clear …”, preserves focus in the primary control, and emits the same native input/change contract the host would receive from direct editing.
- Password reveal controls preserve the password value, selection, autocomplete purpose, paste, and password-manager behavior. The pressed state and label must identify whether the password is currently shown.
- Dropdowns and popovers inside the shell retain their own trigger, popup, focus return, and collision behavior. Their overlays may escape the shell visually; they must not be clipped by the Input Group boundary.

### Validation, loading, and recovery

Input Group does not validate business meaning. Native constraints and the host determine validity. Before validation, an empty required control stays neutral. After failure, preserve the attempted value, focus the actionable invalid control, set `aria-invalid="true"`, append the current Field error ID to `aria-describedby`, and show one specific recovery message outside the shell. A valid edit removes the stale error relationship immediately unless validation is intentionally deferred until submission.

Asynchronous query or validation work must be revision-aware in the host. A stale response cannot overwrite a newer value, result count, error, or loading status. The shell may expose `aria-busy="true"`, while a nearby `role="status"` announces a bounded transition. Do not announce an animated spinner, result count, and status sentence separately.

During IME composition, the component never formats, trims, validates, clears, submits, or starts a value-dependent operation. The host waits for composition to end before acting on a committed query or value.

### Multiline compatibility

A direct native `<textarea>` remains supported for compact plain-text compositions with a block count or narrowly related action. It follows the Textarea contract:

- an authored initial height with a bounded maximum;
- internal vertical scrolling for large pastes;
- vertical resize instead of automatic unbounded growth;
- native newlines, selection, undo, spellcheck, dictation, drag selection, and IME behavior;
- no rich text, syntax editing, attachments, mentions, submission queue, or general-purpose toolbar.

Code editing, rich authoring, and task composition use their purpose-built components. A block header and footer cannot turn Input Group into an editor shell.

### Visual and responsive contract

- The shell is the only visual boundary. Direct Input, Textarea, Native Select, and custom controls remove their own border, radius, outline, background, and shadow inside it.
- Resting, hover, focused, invalid, disabled, read-only, and loading treatments preserve the active style pack’s radius and density while retaining the same semantic hierarchy.
- Focus keeps the existing 1px border and adds one contiguous inset pixel. No state uses a detached zero-offset ring or a second square child boundary.
- Invalid rest uses a danger border plus Field error text. Invalid focus uses the same inset boundary in the danger color; it does not add a persistent outer halo.
- Disabled content remains legible at full shell and control opacity. A quiet surface, native disabled cursor/behavior, disabled actions, and visible reason communicate unavailability.
- Read-only uses a quiet surface distinct from disabled while preserving selection and focus. Actions that only inspect or copy may remain enabled; mutation actions may not.
- Loading preserves width and height. Status text and spinner reserve space or replace an existing suffix without shifting the primary control.
- The control owns remaining inline space with `min-width: 0`. Long values scroll in their native editing viewport. Addons use logical padding and cannot force document overflow.
- At 390px and on coarse pointers, editable text is at least 16px, the primary control and actions are at least 44px tall, and block addons wrap without changing semantic order.
- RTL reverses logical placement, not technical content. URLs, paths, email addresses, code, and units may use a local left-to-right direction while labels and shell placement remain logical.
- Reduced motion removes spinner or transition motion that is not needed to understand progress. Forced-colors mode replaces inset shadows with a 2px system `Highlight` outline and keeps invalid state distinguishable.

### Framework parity

HTML, React, and Vue render the same `.input-group` root, direct primary control, addon alignment attributes, native states, and Field relationship. The small runtime owns only inert-area pointer focus forwarding and idempotent initialization. It does not create a value model, validation protocol, asynchronous request layer, or framework-only state.

React and Vue adapters may expose readiness for runtime-backed behavior, but application state remains in the host. Controlled values, result counts, loading state, errors, and action callbacks use each framework’s ordinary form and state facilities. The documentation’s three integration examples must implement the same search job and preserve the same accessible name, status relationship, value, and result count.

### Adversarial release matrix

| Risk | Required evidence |
| --- | --- |
| Boundary integrity | Native and classed Input, Textarea, Select, and `[data-control]` descendants never draw a second border, radius, shadow, or focus ring across A3S and all eight compatibility style packs |
| Pointer focus | Clicking inert start/end/block addons or shell padding focuses the primary control; clicking a label, button, popup item, link, disabled group, or text with an active Range selection does not redirect or activate another target |
| State truth | Empty, ready, invalid, loading, disabled, and read-only specimens preserve distinct values, native semantics, reasons, and recovery text |
| Validation recovery | Neutral start, failed submission, preserved value, focused recovery, valid edit, repeated failure, reset, and no stale `aria-describedby` relationship |
| Async safety | Loading retains value and geometry, exposes one bounded status, accepts a newer query when valid, and cannot let a stale result replace it |
| Multiline containment | A paste larger than 5,000 characters stays inside a bounded, internally scrollable, vertically resizable textarea without increasing document width |
| Localization | Long Chinese, German, Arabic RTL, emoji, URLs, units, and result counts remain understandable at 390px and 200% zoom without collision or document overflow |
| Input methods | Coarse pointer geometry, 16px editable text, IME-safe updates, native search clearing, selection, paste, and password-manager behavior remain intact |
| Frameworks | Integrated HTML, React, and Vue examples expose the same root, direct control, addon order, status, native events, and runtime readiness contract |
| Accessibility | Persistent Field label and guidance, exact action names, one live status, native disabled/read-only/invalid state, keyboard order, forced colors, accessibility tree, and empty console/page-error evidence |

### Remaining manual release gates

Automation cannot prove real iOS and Android virtual keyboards, physical CJK IME candidate flows, browser search-clear affordances, password-manager overlays, touch selection handles, true 200% browser zoom, Windows forced-colors hardware, or screen-reader/browser combinations. Input Group remains **In review** until those smoke tests are recorded and accepted.



## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.input-group` and is annotated by the runtime as `[data-a3s-components~="input-group"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=input-group]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/ready/invalid/loading/disabled/read-only, inert-addon focus forwarding, stale async results, multiple addons/actions, bounded multiline input, long localized suffixes, coarse pointers, 390px, RTL, forced colors, and no nested borders or outer rings.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `input-group`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-input-group`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/input-group.html`.
- Stable root target: `[data-a3s-components~="input-group"]` inside `.a3s-preview[data-preview-component=input-group][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/input-group-states.png`.
- Per-state evidence selectors:
  - `empty`: `.a3s-component-state-matrix[open][data-component=input-group] [data-state-specimen=empty]:has([data-a3s-components~='input-group'][data-a3s-state~='empty']:not([aria-busy]):has(> input[value='']:not([aria-invalid]):not(:disabled):not([readonly])))`
  - `ready`: `.a3s-component-state-matrix[open][data-component=input-group] [data-state-specimen=ready]:has([data-a3s-components~='input-group'][data-a3s-state~='ready']:not([aria-busy]):has(> input[value='runtime']:not([aria-invalid]):not(:disabled):not([readonly])))`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=input-group] [data-state-specimen=invalid]:has([data-a3s-components~='input-group'][data-a3s-state~='invalid']:has(> input[required][minlength='3'][aria-invalid=true][value='r']:invalid))`
  - `loading`: `.a3s-component-state-matrix[open][data-component=input-group] [data-state-specimen=loading]:has([data-a3s-components~='input-group'][data-a3s-state~='loading'][aria-busy=true]:has(> input[value='runtime']:not(:disabled):not([readonly])):has(> [data-input-group-status][role=status]))`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=input-group] [data-state-specimen=disabled]:has([data-a3s-components~='input-group'][data-a3s-state~='disabled'][data-disabled]:not([aria-disabled]):has(> input[disabled][value='archived']))`
  - `readonly`: `.a3s-component-state-matrix[open][data-component=input-group] [data-state-specimen=readonly]:has([data-a3s-components~='input-group'][data-a3s-state~='readonly'][data-readonly]:not([aria-readonly]):has(> input[readonly][value='release']))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
