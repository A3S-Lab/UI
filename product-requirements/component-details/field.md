## Deep review supplement

### Primary job and ownership

Field keeps the persistent name, requirement, ordinary guidance, current local error, and one form control in a single understandable relationship. It exists to prevent labels, descriptions, and recovery feedback from drifting away from the value they explain.

Field owns:

- one ordinary `.field` root with no implied widget or grouping role;
- one persistent visible label associated through native `for` and `id`;
- visible required or optional guidance aligned with the control's native constraint;
- persistent description IDs and the current local error ID in `aria-describedby`;
- visual availability markers that agree with native `disabled` or `readonly` semantics;
- vertical, horizontal, and responsive layout without changing semantic or focus order.

Field does not own:

- the control's editing, selection, autofill, input method, value, or native events;
- multi-control questions, which require native `fieldset` and `legend` or the owning composite widget;
- domain validation, server validation, sanitization, authorization, persistence, submission, analytics, or error-summary focus;
- prefixes, suffixes, units, inline actions, or shared control borders, which belong to Input Group;
- card choices, selection movement, or radio-group validation, which belong to Radio Group;
- form-level pending, success, cancellation, or failure, which belong to Form and the host.

### Semantic contract

The canonical single-field root is `<div class="field">`. It must not receive `role="group"` merely for styling. A single native control already exposes its accessible name, description, required state, invalid state, and availability; an extra unnamed group adds navigation noise without conveying new information.

The root contains exactly one primary control. Its canonical parts are:

1. A direct `<label>` or a label inside a direct content `<section>`.
2. One direct native `input`, `textarea`, or `select`, or one direct documented composite control.
3. Zero or more persistent descriptions marked with `data-field-description` and referenced from the control.
4. At most one current local message marked with `data-field-message`; an error uses a bounded `role="alert"` and joins `aria-describedby` only while relevant.

When multiple controls answer one question, use one native `<fieldset class="fieldset">` and `<legend>`. Each descendant control remains in its own ordinary Field. Do not nest Field roots to manufacture spacing, and do not place a legend inside a Field root.

### State and transition contract

| State      | Control and relationship contract                                                                                                                                    | Required explanation                                                                    | Valid transition                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `empty`    | The control is empty and enabled; the label and ordinary description remain associated; no authored invalid state appears before validation                          | Guidance states what belongs in the field and any truthful constraint                   | User input moves to `ready`; an attempted required submission may move to `invalid`                                   |
| `ready`    | The control contains or accepts a value under neutral semantics; the ordinary description remains associated                                                         | Description explains use, format, consequence, or scope without repeating the label     | Editing may remain `ready`; failed native or host validation moves to `invalid`                                       |
| `invalid`  | The attempted value is preserved; the control receives `aria-invalid="true"`; the root receives `data-invalid="true"`; the visible error ID joins `aria-describedby` | Error names the exact problem and a concrete recovery; color is supplementary           | Valid input removes stale error semantics immediately; reset returns to neutral `empty` or the authored initial value |
| `disabled` | The control is natively disabled, leaves focus and `FormData`, and retains a legible value; the root receives `data-disabled="true"`                                 | Adjacent description names the policy, lifecycle, permission, or unavailable dependency | Only the owning host condition may enable it                                                                          |
| `readonly` | A supported control is natively read-only, remains focusable, selectable, copyable, and submitted; the root receives `data-readonly="true"`                          | Adjacent description explains why editing is unavailable and who or what can change it  | Only the owning host permission or lifecycle change may make it editable                                              |

Focus, hover, autofill, and IME composition are interaction conditions, not parallel business states. Field does not declare loading because it cannot independently load a value or authorize a mutation. A Form or host may visually preserve the Field while a form-level operation is pending.

### Requirement and validation contract

1. Visible required or optional copy appears once, adjacent to the label. The native `required` attribute remains the machine-readable source of truth.
2. A required empty control remains visually neutral before the workflow's first validation attempt unless the product explicitly validates on blur.
3. On failed validation, retain the attempted value, reveal one specific local error, focus the first actionable invalid control, set `aria-invalid="true"`, set `data-invalid="true"`, and append the error ID after persistent description IDs.
4. During recovery, do not remove ordinary guidance. When the value becomes valid, remove `aria-invalid`, `data-invalid`, the error ID, and error visibility together.
5. Reset restores the authored initial value and neutral semantics without immediately re-running validation.
6. Server errors may use the same local relationship only after the host confirms the response still matches the current value. Stale responses must not overwrite newer user input.
7. Do not trim, transform, validate, or submit during IME composition. Wait for composition to end.

### Visual and responsive contract

- Label, control, description, and message use one vertical rhythm. Requirement copy has lower emphasis than the label without falling below body-text contrast requirements.
- Ordinary descriptions remain secondary. Only the current error message and invalid control boundary use the danger color; the whole Field must not become an undifferentiated red block.
- Disabled and read-only treatments stay distinguishable through native behavior, surface, cursor, and explanatory text rather than opacity alone.
- Horizontal and responsive orientations keep exactly one control relationship. Responsive placement may change, but DOM and focus order do not.
- At 390px, long Chinese, German, Arabic, identifiers, values, and errors wrap or remain contained without document overflow. Coarse-pointer control geometry follows the owning control contract.
- RTL uses logical spacing and placement. User-authored free text uses `dir="auto"` when its direction is unknown; email addresses, URLs, paths, and other machine values may remain left-to-right inside an RTL Field while surrounding content follows the layout direction.
- Reduced motion removes nonessential transitions. Forced-colors mode preserves a system-visible focus and invalid boundary through the owning control.

### Framework parity

HTML, React, and Vue render the same `.field` root, label, control, description, message, IDs, and native state. Field has no controller, methods, events, or framework-specific hook. React and Vue may own form state, but the adapter must not add `role="group"`, another wrapper, a private validation protocol, or a parallel error model.

### Adversarial release matrix

| Risk                       | Required evidence                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relationship drift         | Every visible label targets the one control; every described ID resolves inside the same Field; hidden errors are absent from `aria-describedby`  |
| Validation recovery        | Neutral start, failed submit, preserved value, focused recovery, valid edit, repeated failure, reset, and no stale error                          |
| Requirement clarity        | Required and optional fields use visible copy that agrees with native constraints and does not duplicate screen-reader announcements              |
| Availability               | Disabled and read-only values retain reasons; only the disabled value leaves focus and `FormData`                                                 |
| Grouping                   | Single Fields expose no unnecessary group role; related controls use one named native Fieldset without nested unnamed groups                      |
| Long and localized content | Long labels, descriptions, values, and recovery copy survive Chinese, Arabic RTL, 390px, dark mode, and 200% zoom without collision or overflow   |
| Frameworks                 | Integrated HTML, React, and Vue examples expose the same root and relationships and explicitly state that no Field hook exists                    |
| Accessibility              | Exact name and description, invalid relationship, keyboard focus, screen-reader structure, forced colors, and empty console/page-error evidence   |
| State specimens            | Empty, ready, disabled, invalid, and read-only specimens preserve distinct values, native semantics, explanatory text, dark mode, and RTL context |

### Remaining manual release gates

Automated browser evidence cannot prove real iOS and Android virtual keyboards, physical CJK IME behavior, browser autofill overlays, password-manager injection, true 200% browser zoom, Windows forced-colors hardware, or screen-reader/browser combinations. Field remains **In review** until those smoke tests are recorded and manually accepted.
