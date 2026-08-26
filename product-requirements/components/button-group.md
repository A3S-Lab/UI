# Button Group Product Requirements

| Field | Contract |
| --- | --- |
| Contract ID | `IA-02` |
| Decision | Compose |
| Priority | P0 |
| Category | `actions` |
| Public route | `/en/components/button-group.html` |
| Stable selector | `[data-a3s-components~="button-group"]` |
| Interaction scenario | `components-actions-forms.acl#button-group` |
| Evidence scenario | `tests/e2e/component-contracts.acl#component-contract-button-group` |
| Deep review source | `product-requirements/component-details/button-group.md` |

## User problem

Button Group joins adjacent actions that operate on the same object and have the same hierarchy, while every action keeps its own name, focus, and native behavior. The component is justified only when this repeated job remains clearer and safer than raw native markup or an existing composition. Its product decision is **Compose**, so implementation must preserve that scope instead of expanding into a parallel product surface.

## Product boundary

Own adjacency and shared sizing only. Native buttons retain action semantics; single-select groups use radio or tab semantics, and split actions declare their menu relationship explicitly.

The host application continues to own domain data, authorization, transport, persistence, analytics, and irreversible side effects unless this contract explicitly names a local browser behavior. The component owns only the semantic root, documented parts, local interaction state, and integration events or methods listed below.

## States

- `ready` — Button Group is stable, named, and ready for its primary reading or interaction job.
- `disabled` — Button Group remains understandable but cannot be changed; native disabled or read-only semantics must match the visual treatment.

## Interaction contract

- Canonical root: `.button-group` on `<div>`.
- Stable automation root: `[data-a3s-components~="button-group"]`.
- Named parts: `action` (`:scope > button, :scope > a, :scope > .btn, :scope > :is(.dropdown-menu, .popover, .select) > button`).
- Supported interaction intents: `focus`, `click`. Each intent targets the documented root or named part and must remain scoped to one instance.
- Required root attributes: `role=group`.

Keyboard operation must use the native element or the documented composite-widget pattern. Focus entry, movement, cancellation, and return must remain deterministic when content changes or an operation is rejected.

## Responsive behavior

The same user job must remain complete at 390 × 844 and 1440 × 1000 without page-level horizontal overflow. Reading order and focus order follow the semantic DOM; compact layouts may stack, scroll within the owning region, or disclose secondary actions, but may not hide the primary value or recovery path. Touch targets remain reachable, long localized content can wrap without collision, and direction-aware layout is verified in RTL.

Component-specific adversarial coverage: Mixed labels, icon groups, split menu, disabled middle item, horizontal overflow, RTL order, and no double borders at 200% zoom.

## Accessibility

The canonical root uses `<div>` semantics and exposes 1 named part. State must be available through native properties, text, or documented ARIA rather than color, motion, or icon shape alone. Keyboard users must be able to complete `focus`, `click` without a precise pointer. Focus indicators use the shared focus contract, reduced-motion preferences are respected, and names remain meaningful in both supported locales.

## Deep review supplement

### Primary job and ownership

Button Group makes two or more adjacent actions read as one related command cluster. It exists only when those actions operate on the same object, have the same hierarchy, and benefit from joined edges more than they benefit from independent spacing.

Button Group owns:

- one `.button-group` layout root with a task-specific group name;
- horizontal or vertical adjacency using logical edges;
- one-pixel seams, joined radii, and equal cross-axis sizing;
- independent child focus stacking so an outline remains visible without moving neighbors;
- containment for long labels, narrow owners, RTL, coarse pointers, reduced motion, and forced colors;
- the visual seam between a split action and a separately composed menu trigger.

Button Group does not own:

- domain action state, authorization, confirmation, transport, persistence, analytics, retry, undo, or result feedback;
- roving tabindex, arrow-key navigation, selection, pressed state, or a shared value;
- Button loading or pressed behavior;
- Dropdown Menu popup behavior, collision handling, focus containment, or focus return;
- Input Group value context, Pagination navigation, Toolbar command organization, Tabs view selection, Toggle Group formatting state, Select value choice, or Popover disclosure;
- a JavaScript controller, custom event, method, React hook, or Vue composable.

### Grouping decision

All three questions must be true before using Button Group:

1. Do the actions operate on the same current object or bounded task?
2. Are the actions peers, or a truthful primary action and its explicitly named alternate-action menu?
3. Does one continuous boundary improve scanning without hiding a difference in consequence, state, or keyboard model?

If any answer is no, use separate Buttons or the owning composite. Do not group unrelated commands merely to reduce space. Do not use Button Group as a visual substitute for Toolbar, Pagination, Tabs, Toggle Group, Radio Group, Select, or Input Group.

### Semantic and DOM contract

The authored HTML root is `<div role="group" class="button-group">`. It receives `aria-label` or `aria-labelledby` unless a native relationship already supplies an unambiguous group name. React and Vue adapters render the same `div`, add `role="group"`, and accept the task-specific accessible name from the caller.

Direct action children are native `<button>`, `<a href>`, or `.btn` roots. Navigation remains an anchor. Every action has an independent accessible name, native activation, Tab stop, disabled state, and focus indicator. Button Group does not collapse the children into one Tab stop and does not intercept Enter, Space, or arrow keys.

A direct `hr[role="separator"]` is visual only and carries `aria-hidden="true"`. It is reserved for a split action whose trigger follows it. A direct Dropdown Menu, Popover, or Select wrapper may participate in joined geometry for compatibility, but the nested component continues to own its semantics and behavior. Documentation promotes only the compositions that pass the grouping decision.

### Geometry and focus contract

- Horizontal groups remove duplicate inline borders and inner radii. Vertical groups remove duplicate block borders and inner radii.
- The first and last visible action retain the outer radius in LTR and RTL through logical properties. DOM order does not change.
- Text actions use `flex-shrink: 1`, `min-inline-size: 0`, normal white space, and anywhere wrapping so a constrained group can fit without page overflow. Icon-only actions remain square and do not shrink.
- All children stretch to the same cross-axis size. A wrapped label increases the row height for the entire group rather than clipping itself or misaligning a neighbor.
- Hover and active feedback never translate one child away from the seam. Pressed movement owned by Button is suppressed inside Button Group when it would open a gap.
- Focus remains on the active child. The child renders one shared 2px offset outline and receives a local stacking context; the root renders no focus outline, border-color change, or box-shadow halo.
- An open nested overlay elevates only the owning group enough to escape surrounding preview content. It does not create a permanent stacking layer.

### State and transition contract

| State                   | Root and child contract                                                                                                       | Valid transition                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ready`                 | Named group; every available child is independently enabled and focusable; seams and labels are complete                      | Pointer, Enter, or Space activates only the focused child and leaves result ownership with the host             |
| `partially unavailable` | One or more children are natively disabled and legible; a persistent nearby reason identifies the unavailable command         | The owning permission, lifecycle, prerequisite, or history state enables that child without replacing the group |
| `disabled`              | Every child is natively disabled; the root stays a non-interactive group and does not receive `aria-disabled` as a substitute | Only the owning host condition enables individual children                                                      |
| `menu open`             | The split trigger exposes `aria-expanded="true"`; the Dropdown Menu owns focus and popup geometry                             | Escape closes the popup and restores focus to the trigger; selection delegates the requested action to the host |

Hover, focus, and active are transient interaction conditions, not business states. Loading and pressed belong to the individual Button. A busy child preserves the group's joined geometry and disables duplicate activation without making neighboring actions falsely busy.

### Split-action contract

A split action contains one main command, one visual separator, and one menu trigger. The main command executes immediately. The trigger has a different accessible name that describes the alternate choices, `aria-haspopup="menu"`, `aria-controls`, and synchronized `aria-expanded`.

The menu cannot merely repeat the main action without adding meaningful alternatives. Menu items retain Dropdown Menu keyboard navigation and disabled semantics. The popup may extend beyond the Button Group and preview stage, but it must remain above adjacent content, collide within the viewport, and restore trigger focus after Escape or dismissal.

### Responsive, localization, and input contract

- At 1440 × 1000, ordinary command clusters remain compact and scan as one unit.
- At 390 × 844 and 320px content width, a three-action text group shrinks and wraps inside its owner without document-level horizontal overflow.
- Long German, English, and Chinese labels may increase the group height. They never ellipsize an action whose consequence would become ambiguous.
- Coarse pointers preserve at least 44 × 44 CSS-pixel targets for every child. Joined borders do not reduce the hit area or create overlapping activation regions.
- RTL keeps DOM and focus order stable while swapping logical outer corners. Only spatially directional icons mirror.
- At 200% zoom, seams remain one device-independent CSS pixel where the browser can represent them; focus does not become a double boundary and menu content stays reachable.
- Reduced motion removes nonessential transitions. Forced colors retains a system-visible child focus outline and native disabled distinction.

### Framework parity

HTML, React, and Vue render the same group root, child order, orientation, accessible names, disabled semantics, and split-menu relationships. Button Group has no dedicated `useButtonGroup` hook or Vue composable because it has no controller state to synchronize. Framework state owns action results and child availability through ordinary click handlers and native attributes.

The generated React and Vue adapters supply `role="group"` and the `button-group` class without another wrapper. They must not add a selection model, roving tabindex, synthetic action event, or framework-only orientation behavior.

### Upstream disposition

The upstream component supports orientation, size examples, nesting, separators, inputs, Input Group, Dropdown Menu, Select, Popover, and RTL. A3S UI intentionally narrows the documented product boundary:

- **Drift fixed:** adapters now default to `role="group"`; nested trigger actions are visible to the manifest; text actions may shrink at constrained widths.
- **Intentional divergence:** documentation promotes related actions, orientation, truthful split actions, disabled children, long-label containment, and RTL. Input, Input Group, Select, Popover, Pagination, and nested command rows remain owned and documented by their respective components.
- **Compatibility retained:** existing structural selectors for direct text, input, and overlay children remain available so current consumers do not break, but they are not evidence that Button Group owns those product behaviors.
- **Deferred:** removing compatibility selectors or changing existing public markup requires a separately approved migration.

### Adversarial release matrix

| Risk                 | Required evidence                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grouping semantics   | One named `role="group"`; three independently named native buttons; no roving tabindex or false selection state                                           |
| Joined geometry      | Horizontal, vertical, primary, outline, disabled-middle, and split-menu groups keep one-pixel seams and correct outer radii                               |
| Focus                | Every available child receives one offset outline, keeps the resting border, stays above neighbors, and produces no root halo                             |
| Activation           | Pointer, Enter, and Space request only the owning child action; disabled children do not activate                                                         |
| Split menu           | Trigger name describes the alternate action, Enter opens the menu, first item becomes available to keyboard navigation, and Escape restores trigger focus |
| Responsive           | 390px, 320px-equivalent content width, long English, long Chinese, dark RTL, and 200% zoom avoid page overflow and clipped action meaning                 |
| Input preferences    | Coarse pointers expose 44px targets; reduced motion and forced colors preserve operation and focus                                                        |
| Frameworks           | Integrated HTML, React, and Vue examples use the same root and state contract and explicitly contain no `useButtonGroup` hook                             |
| Compatibility styles | A3S, Vega, Nova, Maia, Lyra, Mira, Luma, Sera, and Rhea keep joined edges, contained labels, legible disabled state, and one child focus boundary         |
| Browser health       | Deterministic interaction produces empty console and page-error evidence                                                                                  |

### Remaining manual release gates

Automation cannot prove real iOS and Android touch targeting, switch-control or voice-control activation, true browser 200% zoom, Windows forced-colors rendering, or screen-reader and browser combinations. Button Group remains **In review** until those smoke tests are recorded and accepted.



## Failure, empty, and loading cases

- Progress states: not owned by this component. They preserve geometry and user context, announce bounded status changes, and prevent duplicate actions.
- Empty state: not a distinct component state. Absence must be explained by the component only when absence belongs to this contract.
- Failure and unavailable states: represented by the host or a composed feedback component. Recoverable failures retain the prior value or selection and return focus to the recovery action; unrecoverable failures stay explicit and do not fabricate success.
- Malformed, excessively long, stale, denied, or host-untrusted content must remain contained. The component never interprets trusted business meaning beyond its documented boundary.

## Acceptance criteria

- The user can identify the primary value, current state, and next valid action without relying on decoration.
- The public root matches `.button-group` and is annotated by the runtime as `[data-a3s-components~="button-group"]`.
- Every documented state above has an independent specimen cloned from the live public root; no fixture may claim mutually exclusive states on one instance.
- The state acceptance matrix opens at `.a3s-component-state-matrix[open][data-component=button-group]`, preserves hidden roots in the DOM contract, and restores focus to its trigger after Escape.
- Pointer and keyboard paths produce the same outcome for every applicable action.
- The public-root live preview uses the same public assets and contract as a consumer integration.
- HTML, React, and Vue examples remain in the page's integrated code panel and preserve the same semantic root, states, events, and methods.
- Light, dark, LTR, RTL, desktop, and compact layouts preserve reading order, visible focus, and recovery.
- The adversarial cases are treated as release requirements: Mixed labels, icon groups, split menu, disabled middle item, horizontal overflow, RTL order, and no double borders at 200% zoom.
- Console and page-error evidence are empty for the deterministic acceptance path.

## A3S Test mapping

- Behavioral regression: `components-actions-forms.acl`, scenario `button-group`.
- Cross-framework, keyboard, responsive, theme, direction, and visual contract: `tests/e2e/component-contracts.acl`, scenario `component-contract-button-group`.
- Route under test: `http://127.0.0.1:4178/UI/en/components/button-group.html`.
- Stable root target: `[data-a3s-components~="button-group"]` inside `.a3s-preview[data-preview-component=button-group][data-preview-integration=complete]`.
- State-matrix screenshot: `components/contracts/button-group-states.png`.
- Per-state evidence selectors:
  - `ready`: `.a3s-component-state-matrix[open][data-component=button-group] [data-state-specimen=ready]:has([data-a3s-components~='button-group'][data-a3s-state~='ready'])`
  - `disabled`: `.a3s-component-state-matrix[open][data-component=button-group] [data-state-specimen=disabled]:has([data-a3s-components~='button-group'][data-a3s-state~='disabled']:is([disabled],[aria-disabled=true],:has([disabled]),:has([aria-disabled=true])))`
- Required evidence: desktop light screenshot, state-matrix screenshot, desktop dark/RTL screenshot, compact screenshot, interactive accessibility tree, console log, and page-error log.
