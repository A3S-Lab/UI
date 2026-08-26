# Button Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-01` |
| Decision | Keep |
| Priority | P0 |
| Category | `actions` |
| Public route | `/en/components/button.html` |
| Stable selector | `[data-a3s-components~="button"]` |
| Interaction scenario | `components-actions-forms.acl#button` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-button` |
| Deep review source | `product-requirements/component-details/button.md` |

## User problem

Buttons trigger actions in the current interface. Use a link with `href`, styled as a button, when the outcome is navigation. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Keep**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Make one action unmistakable without turning every action blue. Unify filled, tonal, outline, ghost, danger, link, icon, loading, and compact treatments on one height and focus contract.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Button is stable, named, and ready for its primary reading or interaction job.
- `disabled` — Button remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.
- `loading` — Button preserves the user's context, communicates that work is still in progress, and prevents duplicate or contradictory actions.
- `pressed` — Button exposes this choice or current-state relationship through native state or ARIA in addition to visual treatment.

## Interaction contract

- Canonical root: `.btn` on `<button>`.
- Stable automation root: `[data-a3s-components~="button"]`.
- Named parts: none; consumers must not depend on incidental descendants.
- Supported interaction intents: `click`, `focus`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: `type=button`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Long labels, icon-only names, rapid repeat, loading width, disabled submission, touch target, dark focus, and one-primary-action screenshots.

## Accessibility

The canonical root uses `<button>` semantics and exposes 0 named parts. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `click`, `focus` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Deep review supplement

### Primary job and ownership

Button lets a person deliberately trigger one action in the current context. It exists to make the action, hierarchy, availability, and immediate execution state understandable before and after activation without taking ownership of the business operation.

Button owns:

- one native `<button class="btn" type="button">` root for actions, or the same visual class on an `<a href>` when the outcome is navigation;
- compact, readable geometry across text, leading-icon, trailing-icon, and icon-only presentations;
- visible ready, hover, focus-visible, active, disabled, loading, and pressed treatments;
- native activation equivalence for pointer, Enter, and Space;
- containment for long localized labels, RTL layout, coarse pointers, reduced motion, and forced colors.

Button does not own:

- authorization, validation, transport, persistence, analytics, retry policy, success routing, or irreversible side effects;
- a private loading controller, timer, promise wrapper, React hook, or Vue composable;
- navigation implemented through a click handler, which belongs on an `<a href>`;
- confirmation, which belongs to Alert Dialog when the consequence requires an interrupting decision;
- menu, disclosure, selection, or form semantics beyond the native and ARIA attributes supplied by the owning composition.

### Semantic and hierarchy contract

1. Use `<button type="button">` for an action. Use `type="submit"` or `type="reset"` only when the button intentionally participates in its owning form.
2. Use `<a class="btn" href="…">` for navigation so open-in-new-tab, copy-link, history, status-bar destination, and no-JavaScript behavior remain native. Do not put `role="button"` on that link.
3. Every bounded decision region has at most one primary action. Supporting actions use secondary, outline, ghost, or link treatment according to consequence and proximity, not arbitrary color variety.
4. Destructive styling communicates consequence; it does not replace precise copy, authorization, undo, or confirmation.
5. Icon-only buttons require an accessible name. Decorative icons remain hidden from assistive technology and never replace the visible action label when space permits text.
6. `aria-pressed` is reserved for a two-state toggle button. A momentary action does not become pressed after activation, and a disclosure uses `aria-expanded` instead.

### State and transition contract

| State      | Native and visible contract                                                                                                                         | Valid transition and host responsibility                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ready`    | Enabled native button; concise action label; one clear hierarchy treatment                                                                          | Pointer, Enter, or Space requests the same action; a synchronous action returns to `ready` after its bounded feedback     |
| `disabled` | Native `disabled`; full-opacity legible label; quiet surface and cursor; no click, focus, form submission, or fabricated tooltip-only explanation   | Only the owning permission, lifecycle, validation, or dependency change may enable it                                     |
| `loading`  | Native `disabled` plus `aria-busy="true"`; visible spinner and progress verb; prior button width and surrounding layout remain stable               | Enter synchronously before starting asynchronous work; reject rapid repeats; leave only after success, failure, or cancel |
| `pressed`  | Native button with `aria-pressed="true"`; visible state label or state icon plus a tonal treatment that is distinguishable without relying on color | The owning controlled state changes it back to `false`; it must not be used as a generic active animation                 |

Hover, focus-visible, and pointer-active are transient interaction conditions inside enabled states. Loading is not simulated by opacity, an unannounced spinner, or a button that remains repeatedly actionable. A disabled action that needs an explanation receives adjacent persistent copy from the owning composition; a disabled element alone cannot expose a hover-only explanation to keyboard and touch users.

### Async action and feedback contract

1. Set the duplicate-submission guard synchronously at activation, before awaiting host work. Repeated pointer events, Enter, Space, programmatic activation, or a slow render must produce one request.
2. Preserve the button's inline size when the label changes from the action verb to the progress verb. A hidden measurement label, stable grid stack, or captured pre-action size is valid; a fixed width that clips translations is not.
3. Keep the progress verb specific to the operation, such as “Saving…” or “Publishing…”. “Loading…” is insufficient when the action is known.
4. Pair `aria-busy="true"` with a visible progress label and a bounded nearby polite status when the result matters outside the button. Do not make an entire form or page a live region.
5. On success, expose a concise confirmation in the owning region, restore the ordinary action label, and preserve the user's focus context. Do not move focus merely to announce success.
6. On recoverable failure, restore the action, retain the user's prior input and context, name the problem and recovery nearby, and return focus only when the workflow requires an explicit recovery decision.
7. If cancellation is supported, it is a separate truthful action or an intentional stop-state contract; changing “Save” into “Cancel” without matching semantics is not allowed.

### Visual, responsive, and input contract

- Default text-button height is 36px, compact height is 28px, and large height is 40px. Text buttons use minimum rather than fixed block size so a localized label can wrap and increase height without clipping.
- Horizontal padding communicates density, not importance. Primary, outline, destructive, loading, and pressed variants keep the same geometry for a given size.
- The label may wrap for extreme content and remains centered with `overflow-wrap`; the root never creates document-level horizontal overflow. Icon-only sizes remain square on fine pointers.
- On coarse pointers, every Button exposes at least a 44 × 44px target, including compact and icon-only presentations. Adjacent targets retain enough separation to prevent accidental activation.
- Focus-visible uses one 2px offset outline in the interaction accent. Compatibility style packs may retain their own color and shape, but none may add a detached 1–3px box-shadow halo.
- Disabled state keeps `opacity: 1`; availability is communicated through native behavior, a quiet surface, border, text, and adjacent reason instead of making the label unreadable.
- Pressed state moves no more than 1px and changes visible content or shape in addition to tone. Loading preserves geometry and does not use a pulsing or glowing container.
- RTL follows logical icon and label order. Directional arrows mirror only when their meaning is spatial; status, brand, and object icons do not mirror.
- Reduced motion removes nonessential transitions and spinner animation. Forced-colors mode preserves a system-visible focus outline, disabled state, and pressed boundary.

### Framework parity

HTML, React, and Vue render the same native root, variants, sizes, states, and accessible names. Button has no controller, methods, custom events, dedicated `useButton` hook, or Vue composable. Framework code uses native click events and framework-owned state, with a synchronous duplicate guard when an asynchronous action can be triggered more than once before rendering catches up.

React and Vue adapters must not add a wrapper, replace a link with a button, invent an `isLoading` protocol that cannot be expressed in HTML, or hide the visible progress label. A convenience application hook may coordinate domain work outside the design-system adapter, but it is not part of the Button contract.

### Adversarial release matrix

| Risk                          | Required evidence                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activation equivalence        | Pointer, Enter, and Space request the same action once; focus remains predictable                                                                               |
| Duplicate submission          | Ten rapid activations during a delayed action produce one request and one bounded completion                                                                    |
| Async geometry                | Ready, loading, success, failure, long English, and long Chinese labels do not shift adjacent controls or overflow their container                              |
| Native semantics              | Action button, submit button, disabled button, navigation link, toggle button, disclosure button, and icon-only button expose the correct role, name, and state |
| State distinction             | Ready, disabled, loading, and pressed specimens have different visible content or treatment and matching native or ARIA semantics                               |
| Responsive and localization   | 390px, Chinese, long German, Arabic RTL, emoji, dark mode, and 200% zoom preserve content, order, and containment                                               |
| Input and display preferences | Coarse pointers provide 44px targets; reduced motion and forced colors preserve operation and focus                                                             |
| Compatibility styles          | A3S, Vega, Nova, Maia, Lyra, Mira, Luma, Sera, and Rhea keep their identity while sharing full-opacity disabled state and one outline focus boundary            |
| Frameworks                    | Integrated HTML, React, and Vue examples expose the same async guard, visible status, stable label geometry, and explicit absence of a component-specific hook  |
| Browser health                | Deterministic interaction produces empty console and page-error evidence                                                                                        |

### Remaining manual release gates

Automation cannot prove switch-control and voice-control activation, real iOS and Android touch ergonomics, true 200% browser zoom, Windows forced-colors hardware, or screen-reader/browser combinations. Button remains **In review** until those smoke tests are recorded and accepted.



## Failure, empty, and loading cases

- Progress states: `loading`. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.btn` and is annotated by the runtime as `[data-a3s-components~="button"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=button]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Long labels, icon-only names, rapid repeat, loading width, disabled submission, touch target, dark focus, and one-primary-action screenshots.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `button`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-button`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/button.html`.
- Stable root target: `[data-a3s-components~="button"]` inside `.a3s-preview[data-preview-component=button][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/button-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=button] [data-state-specimen=ready]:has([data-a3s-components~='button'][data-a3s-state~='ready'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=button] [data-state-specimen=disabled]:has([data-a3s-components~='button'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
  - `loading`: `.a3s-component-state-matrix[open][data-component=button] [data-state-specimen=loading]:has([data-a3s-components~='button'][data-a3s-state~='loading'][aria-busy=true])`
  - `pressed`: `.a3s-component-state-matrix[open][data-component=button] [data-state-specimen=pressed]:has([data-a3s-components~='button'][data-a3s-state~='pressed'][aria-pressed=true])`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
