## Deep review supplement

### Primary job and ownership

Textarea lets a person author and revise one plain-text value whose line breaks are meaningful. It exists when a single-line Input would hide the shape of the value, while a rich editor would introduce tools, document structure, or submission behavior that the task does not need.

Textarea owns:

- one native `<textarea class="textarea">` root and the browser's multiline editing contract;
- a stable, internally scrollable editing viewport with a useful minimum height, a bounded maximum height, and vertical resize;
- visible empty, ready, invalid, disabled, read-only, hover, and focus conditions;
- native `input` and `change` events exposed through the thin `useTextarea` framework adapter;
- containment for long lines, large pastes, localized text, and zoomed layouts.

Textarea does not own:

- labels, descriptions, requirement copy, local error messages, or form layout, which belong to Field;
- rich text, Markdown structure, mentions, slash commands, attachments, toolbars, or queued submission, which belong to an editor or Composer contract;
- unbounded automatic growth, draft persistence, autosave, transport, validation policy, sanitization, authorization, analytics, or domain mutation;
- character-count policy or error wording, although it must render correctly when the host associates those elements through Field.

### Semantic contract

The canonical root is a native `<textarea class="textarea">`. It keeps the browser's selection, caret, undo, paste, drag-selection, spellcheck, writing-direction, form, and input-method behavior. It must not be replaced by `contenteditable`, a generic role, or a framework-only wrapper.

A production instance has one persistent visible label supplied by Field. Placeholder text may demonstrate expected content but never supplies the only accessible name. Ordinary guidance, including a stable length policy, remains associated through `aria-describedby`; a current validation error joins that relationship only while it is relevant. A dynamic visible count has its own localized label, stays outside that description relationship, and does not announce every keystroke. Native constraints such as `required`, `minlength`, and `maxlength` are used only when they match the real data contract.

`rows` expresses the authored initial viewport. The default component remains bounded even when `rows` is omitted. The component does not apply `field-sizing: content` and does not silently auto-grow from arbitrary input. A host that deliberately implements auto-growth must cap the height, preserve an internal scroll fallback, avoid caret jumps, and keep the page stable through paste, undo, IME composition, and responsive transitions.

### State and transition contract

| State      | Native and relationship contract                                                                                                                | Required explanation                                                                   | Valid transition                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `empty`    | The editable value is empty; label and ordinary guidance remain available; no authored invalid state appears before validation                  | Guidance states what belongs in the value and any truthful length or format constraint | Input moves to `ready`; an attempted required submission may move to `invalid`                                         |
| `ready`    | The value is editable under neutral native semantics and the viewport scrolls internally after its height limit                                 | Persistent guidance explains purpose, consequence, or limits                           | Editing remains `ready`; failed native or host validation moves to `invalid`                                           |
| `invalid`  | The attempted text and line breaks are preserved; the root receives `aria-invalid="true"`; a specific visible error joins `aria-describedby`    | Error names the exact missing or malformed requirement and a concrete recovery         | Valid input removes stale error semantics immediately; reset restores the authored initial value and neutral semantics |
| `disabled` | The native `disabled` attribute removes focus, editing, validation, and `FormData` participation while the retained value remains fully legible | Adjacent copy names the policy, lifecycle, permission, or unavailable dependency       | Only the owning host condition may enable it                                                                           |
| `readonly` | The native `readonly` attribute prevents mutation while retaining focus, selection, copying, scrolling, and `FormData` participation            | Adjacent copy explains why editing is unavailable and who or what can change it        | Only the owning host permission or lifecycle change may make it editable                                               |

Focus, hover, selection, spellcheck, autofill, and IME composition are interaction conditions rather than parallel business states. Textarea does not declare loading because it cannot independently fetch, authorize, or submit a value.

### Editing, sizing, and validation contract

1. The default viewport has a stable minimum height and a maximum block size no larger than the available task context; overflow becomes an internal scrollbar instead of increasing page height without limit.
2. Vertical native resize remains available. Horizontal resize is disabled because it can break the owning Field and page grid.
3. Pasting thousands of characters does not change the authored viewport height, create page-level horizontal overflow, discard text, or move unrelated controls.
4. Newlines, emoji, CJK text, Arabic text, combining marks, and long unbroken tokens remain editable and contained. Length indicators count the same units as the host's stated policy; a code-point or grapheme policy must not be mislabeled as the native UTF-16 `maxlength` behavior.
5. Failed validation retains the attempted value, reveals one specific local error, focuses the Textarea when recovery starts, sets `aria-invalid="true"`, and appends the error ID after the persistent guidance ID.
6. During recovery, valid input removes `aria-invalid`, the stale error ID, and error visibility together without removing ordinary guidance.
7. Do not trim, transform, validate business rules, autosave, or submit while an IME composition is active. Wait for composition to end.
8. Reset restores the authored initial value, count, and neutral validation relationships. A stale server response must not overwrite newer text.

### Visual and responsive contract

- The native border is the only outer control boundary. Focus adds one continuous inset boundary; invalid focus uses the same geometry in the danger color. No style pack may add a 2–3px external halo.
- The default viewport shows approximately four to six lines, uses a readable line height, and exposes the browser's resize affordance without making it the dominant visual element.
- Disabled state keeps opacity at `1` and uses surface, border, text color, cursor, and adjacent reason to communicate unavailability. Read-only remains visually quieter than editable content without looking disabled.
- At coarse-pointer sizes, editable text is at least 16px to prevent iOS focus zoom. The control remains at least 44px tall, with enough padding for selection handles and a virtual keyboard.
- At 390px, 200% zoom, and inside a narrow Preview, the control, its long value, character count, and recovery message remain inside the owning Field without document overflow.
- RTL follows the authored text direction. Mixed technical tokens may opt into local left-to-right direction without reversing the surrounding Field.
- Reduced motion removes color and shadow transitions. Forced-colors mode replaces the inset visual boundary with a system-visible outline and preserves a distinguishable invalid state.

### Framework parity

HTML, React, and Vue render the same native root and attributes. `useTextarea` is a thin ref-and-events adapter because the manifest exposes native `input` and `change` events. It may observe those events but must not create a second value model, auto-grow behavior, validation protocol, or submission lifecycle. Controlled values, draft persistence, and validation remain host state.

### Adversarial release matrix

| Risk                        | Required evidence                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unbounded growth            | A paste larger than 5,000 characters preserves the viewport height, creates internal vertical overflow, and does not increase document width                       |
| Multiline editing           | Newlines, selection, undo, native `input` and `change`, and a long unbroken token retain their values                                                              |
| Validation recovery         | Neutral start, failed submit, preserved value, focused recovery, valid edit, repeated failure, reset, and no stale error relationship                              |
| IME safety                  | Composing input does not clear an existing error, validate, transform, persist, or submit until composition ends                                                   |
| Availability                | Disabled and read-only values retain visible reasons; only disabled leaves focus and `FormData`; read-only remains scrollable, selectable, copyable, and submitted |
| Input methods               | Coarse pointer uses at least 16px text; real mobile keyboard, CJK IME, dictation, spellcheck, drag selection, and paste remain manual release gates                |
| Visual consistency          | A3S and all eight compatibility style packs use one inset focus boundary, no resting invalid halo, full disabled opacity, vertical resize, and bounded height      |
| Localization and resilience | Chinese, Arabic RTL, emoji, long German guidance, dark mode, 390px, 200% zoom, reduced motion, and forced colors remain contained and understandable               |
| Frameworks                  | Integrated HTML, React, and Vue examples use the native root, matching constraints, `useTextarea`, and native event payloads                                       |
| Accessibility               | Persistent label, stable guidance and current error relationships, a quiet independently named count, native invalid/disabled/read-only semantics, keyboard focus, accessibility tree, and empty browser errors |

### Remaining manual release gates

Automation cannot prove real iOS and Android virtual-keyboard behavior, physical CJK IME candidate flows, dictation, browser spellcheck menus, touch selection handles, true 200% browser zoom, Windows forced-colors hardware, or screen-reader/browser combinations. Textarea remains **In review** until those smoke tests are recorded and accepted.
