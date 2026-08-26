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
