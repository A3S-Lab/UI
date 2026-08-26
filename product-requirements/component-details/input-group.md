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
