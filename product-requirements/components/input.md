# Input Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-08` |
| Decision | Keep |
| Priority | P0 |
| Category | `forms` |
| Public route | `/en/components/input.html` |
| Stable selector | `[data-a3s-components~="input"]` |
| Interaction scenario | `components-actions-forms.acl#input` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-input` |
| Deep review source | `product-requirements/component-details/input.md` |

## User problem

Input captures one native single-line value. It preserves browser editing, selection, validation, autofill, password-manager, input-method, and form behavior while A3S UI supplies a consistent visual contract. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own the visual contract for one native single-line value without taking over Field labels and feedback, Input Group adornments and actions, File Upload queues, or Task Composer rich input. Preserve type-specific affordances, autofill, password managers, IME, native events, and browser validation.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `empty` — Input states what is absent and why when known, then offers only a valid next action.
- `ready` — Input is stable, named, and ready for its primary reading or interaction job.
- `disabled` — Input remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `invalid` — Input explains the unavailable or failed outcome without discarding prior context and exposes recovery only when recovery is valid.
- `readonly` — Input remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `input.input:not([type=checkbox]):not([type=radio]):not([type=range])` on `<input>`.
- Stable automation root: `[data-a3s-components~="input"]`.
- Named parts: none; consumers must not depend on incidental descendants.
- Supported interaction intents: `fill`, `focus`, `type`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Public events: `change`, `input`.
- Required root attributes: `type=text`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Empty/ready/invalid/disabled/read-only, autofill colors, Chinese IME, password managers, search clear, long unbroken values, native form submission, 200% zoom, coarse pointers, forced colors, and mobile keyboard types.

## Accessibility

The canonical root uses `<input>` semantics and exposes 0 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `fill`, `focus`, `type` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Deep review supplement

### Primary job and ownership

Input captures one native single-line value. It owns a stable visual treatment for supported `<input>` types and preserves the browser's editing, selection, form, autofill, validation, input-method, and accessibility behavior.

The surrounding composition owns everything that is not intrinsic to that one value:

- Field owns the persistent visible label, requirement text, description, error text, and the `id`/`for`/`aria-describedby` relationships.
- Input Group owns prefixes, suffixes, icons, units, status marks, password reveal controls, and other actions inside one shared control boundary.
- File Upload owns drag and drop, file queues, progress, rejection, retry, removal, and upload policy. Native `type="file"` remains a compatibility input, not the production upload workflow.
- Task Composer owns rich text, Markdown, mentions, commands, attachments, queued submissions, and IME-aware send behavior.
- The host owns domain validation, server validation, sanitization, persistence, authorization, analytics, and irreversible effects.

### State and transition contract

| State      | Native value and semantics                                                                                | Required explanation                                                                                                               | Valid transition                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `empty`    | Empty string; enabled; no fabricated error before validation                                              | The Field description states what the value is used for                                                                            | User input moves to `ready`; an attempted required submission may move to `invalid`         |
| `ready`    | Enabled value that satisfies current native constraints                                                   | Ordinary description remains associated                                                                                            | Editing remains `ready`; failed native or host validation moves to `invalid`                |
| `invalid`  | Prior user value is preserved; `aria-invalid="true"`; native constraints remain truthful                  | Error names the exact problem and one recovery example; authored error participates in `aria-describedby` and uses a bounded alert | Valid input immediately clears stale authored error state; reset returns to neutral `empty` |
| `disabled` | Native `disabled`; value remains readable but is excluded from focus, editing, validation, and `FormData` | Adjacent text explains the policy or unavailable dependency                                                                        | Only a host policy or dependency change may enable it                                       |
| `readonly` | Native `readonly`; value remains focusable, selectable, copyable, and included in `FormData`              | Adjacent text explains why editing is unavailable                                                                                  | Only a host permission or lifecycle change may make it editable                             |

Hover and focus are interaction conditions within enabled states, not separate business states. Autofill is a browser-managed value source, not a state that the component may disguise.

### Native type semantics

| User value               | Recommended contract                                                            | Product constraint                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| General single-line text | `type="text"` plus a truthful `autocomplete` token when one exists              | Do not use a placeholder as the only name                                                                     |
| Email address            | `type="email"`, normally `autocomplete="email"` and `inputmode="email"`         | Multiple addresses require an explicit product decision and parsing contract                                  |
| Telephone number         | `type="tel"` and `autocomplete="tel"` when applicable                           | Formatting and regional validation remain host concerns                                                       |
| URL                      | `type="url"` and `inputmode="url"`                                              | Validation must state whether a scheme is required                                                            |
| Password                 | `type="password"` with the correct `autocomplete` token                         | Never block password managers or paste; reveal is an Input Group action                                       |
| Search query             | `type="search"` for a simple labeled form value                                 | Embedded icons, clear actions, shortcuts, and result coordination belong to Input Group, Combobox, or Command |
| Measurable number        | `type="number"` only when native stepping and numeric constraints match the job | Identifiers, accounts, leading-zero values, and high-precision decimals remain text values                    |
| Local date or time       | Native date/time types when the browser picker meets the product requirement    | Locale display, time zones, ranges, and complex scheduling belong to a higher-level component                 |

Unsupported text-like experiments must not be added as styling variants. `button`, `submit`, `reset`, `image`, `hidden`, `checkbox`, `radio`, `range`, and `color` have separate contracts or native presentation.

### Naming, guidance, and validation

1. A production example starts with a visible `<label>` whose `for` matches the input `id`.
2. Placeholder text is optional format guidance. It never repeats or replaces the label and disappears without removing the accessible name.
3. `name`, `autocomplete`, `inputmode`, `enterkeyhint`, `min`, `max`, `step`, `minlength`, `maxlength`, and `pattern` are selected from the real data and workflow, not added as decoration.
4. Before submission, a required empty field remains visually neutral unless the workflow explicitly validates on blur.
5. After failed validation, preserve the attempted value, focus the first actionable invalid input, set `aria-invalid="true"`, append the error ID to `aria-describedby`, and reveal specific recovery copy.
6. When the value becomes valid, remove stale `aria-invalid`, Field invalid state, error visibility, and the error ID while retaining ordinary guidance.
7. Reset restores the authored initial value and neutral semantics. A reset must not immediately re-run validation.
8. Server errors may reuse the same Field error relationship, but the host must reconcile stale responses with the latest value before presenting them.

### Event and input-method contract

- Native `input` reports every accepted edit and is the integration point for live derived UI.
- Native `change` reports a committed value according to browser semantics, commonly after focus leaves a text input.
- Framework hooks subscribe to these same bubbling native events. They do not create a second value protocol or replace React/Vue form state.
- The component never mutates case, trims, formats, filters, submits, or validates business rules during `compositionstart` through `compositionend`.
- Enter behavior remains native. Form submission, next-field progression, and search execution are owned by the form or host workflow.

### Visual and responsive contract

- Resting, hover, focus, invalid, disabled, and read-only treatments retain the selected style pack's radius, density, and surface language.
- An isolated focused Input uses one continuous boundary: the existing 1px border plus one inset focus pixel. It must not add a detached 2px or 3px halo.
- A resting invalid Input uses the error border and associated error text without a red outer ring. Invalid focus uses the same single-boundary mechanism in the error color.
- Disabled values remain legible at full element opacity. A quiet surface, cursor, native semantics, and explanatory text communicate availability.
- Read-only values use a distinct quiet surface while remaining selectable and visibly focusable.
- At coarse-pointer breakpoints, text-like inputs are at least 44px high and use at least 16px text to avoid forced mobile zoom.
- Long unbroken values scroll inside the native editing viewport and never expand the Field or document width.
- Email, telephone, and URL values retain left-to-right editing direction inside RTL fields so punctuation and prefixes keep their authored order; labels, descriptions, and field placement still follow logical layout direction.
- Reduced motion removes nonessential control transitions. Forced-colors mode uses a 2px system `Highlight` outline with 2px offset because shadows may be suppressed.

### Framework parity

HTML, React, and Vue examples must expose the same `<input>` root, visible label, description, attributes, value, and native `input`/`change` events. React uses `useInput` with `ref` and reads `event.currentTarget` as `HTMLInputElement`. Vue uses `useInput`, `componentRef`, and an application-owned `ref("")`. Neither adapter may invent component methods because Input declares none.

### Adversarial release matrix

| Risk                        | Required evidence                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Empty and malformed values  | Neutral initial state, failed submit, focused recovery, valid edit, repeated failure, and reset                                    |
| Availability                | Disabled value/reason and read-only value/reason; `FormData` excludes only the disabled value                                      |
| Long and international text | Long unbroken email-like value, CJK, emoji, Arabic layout direction, stable LTR machine identifiers, and no document overflow      |
| Input methods               | Chinese IME composition completes without premature formatting, validation, or submission                                          |
| Browser value sources       | Autofill and password-manager values remain readable; browser affordances are not hidden                                           |
| Responsive input            | 390px coarse-pointer geometry, at least 16px text, virtual-keyboard-safe layout, and correct `inputmode`                           |
| Accessibility               | Visible label, exact accessible name and description, keyboard editing, forced-colors focus, and empty console/page-error evidence |
| Compatibility styles        | Vega, Nova, Maia, Lyra, Mira, Luma, Sera, and Rhea preserve their identity while using the same continuous focus mechanism         |

### Remaining manual release gates

Automated browser evidence does not prove real iOS and Android keyboard layouts, native autofill overlays, password-manager injection, 200% browser zoom, Chinese IME on physical input methods, or screen-reader/browser combinations. Input remains **In review** until those smoke tests are recorded and manually accepted.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: `empty`. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: `invalid`. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `input.input:not([type=checkbox]):not([type=radio]):not([type=range])` and is annotated by the runtime as `[data-a3s-components~="input"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=input]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Empty/ready/invalid/disabled/read-only, autofill colors, Chinese IME, password managers, search clear, long unbroken values, native form submission, 200% zoom, coarse pointers, forced colors, and mobile keyboard types.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `input`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-input`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/input.html`.
- Stable root target: `[data-a3s-components~="input"]` inside `.a3s-preview[data-preview-component=input][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/input-states.png`.
- Per-state evidence selectors:
  - `empty`: `.a3s-component-state-matrix[open][data-component=input] [data-state-specimen=empty]:has([data-a3s-components~='input'][data-a3s-state~='empty'][value=''])`
  - `ready`: `.a3s-component-state-matrix[open][data-component=input] [data-state-specimen=ready]:has([data-a3s-components~='input'][data-a3s-state~='ready'][value='alex@example.com'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=input] [data-state-specimen=disabled]:has([data-a3s-components~='input'][data-a3s-state~='disabled'][disabled][value='archived@example.com'])`
  - `invalid`: `.a3s-component-state-matrix[open][data-component=input] [data-state-specimen=invalid]:has([data-a3s-components~='input'][data-a3s-state~='invalid'][required][aria-invalid=true][value='owner@']:invalid)`
  - `readonly`: `.a3s-component-state-matrix[open][data-component=input] [data-state-specimen=readonly]:has([data-a3s-components~='input'][data-a3s-state~='readonly'][readonly][value='account-owner@example.com'])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
