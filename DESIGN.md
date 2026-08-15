---
name: A3S UI
description: A precise, framework-independent interface system for intelligent work.
reference:
  componentSite: "https://ui.lobehub.com/"
  componentRepository: "https://github.com/lobehub/lobe-ui"
  componentVersion: "5.29.3"
  componentRevision: "f1d2a7e7b342f76ffc64602e32f3cb47ae96e0aa"
  documentationRepository: "https://github.com/A3S-Lab/Test"
  documentationRevision: "b74c008826aea8c1251ca9366f7ada67ee18fa7c"
colors:
  light:
    canvas: "#ffffff"
    surface: "#ffffff"
    surfaceMuted: "#f7f7f8"
    surfaceHover: "#f4f4f5"
    surfaceActive: "#eeeeef"
    selectionSurface: "#eef4ff"
    code: "#fafafa"
    text: "#111113"
    textSecondary: "#52525b"
    textSubtle: "#71717a"
    borderSubtle: "#e9e9eb"
    border: "#dedee1"
    borderStrong: "#c9c9ce"
    accent: "#1456f0"
    accentHover: "#0f46c7"
    accentContrast: "#ffffff"
    brandBlue: "#243a9a"
    success: "#16845b"
    warning: "#a86412"
    danger: "#c93d45"
  dark:
    canvas: "#0d0d0f"
    surface: "#151518"
    surfaceMuted: "#19191d"
    surfaceHover: "#202024"
    surfaceActive: "#26262b"
    selectionSurface: "#17223b"
    code: "#121214"
    text: "#f4f4f5"
    textSecondary: "#b4b4bc"
    textSubtle: "#888891"
    borderSubtle: "#26262b"
    border: "#333338"
    borderStrong: "#45454b"
    accent: "#4380f9"
    accentHover: "#6ca3ff"
    accentContrast: "#0d0d0f"
    brandBlue: "#7aa2f7"
    success: "#57c795"
    warning: "#e7ad55"
    danger: "#ef7a82"
typography:
  sans: '"Geist", "HarmonyOS Sans SC", "PingFang SC", ui-sans-serif, system-ui, sans-serif'
  mono: '"Geist Mono", "SFMono-Regular", Consolas, ui-monospace, monospace'
  display: "clamp(2rem, 4vw, 2.5rem) / 1.08 / 680"
  pageTitle: "1.5rem / 1.2 / 660"
  sectionTitle: "1.25rem / 1.3 / 650"
  body: "0.9375rem / 1.7 / 400"
  ui: "0.875rem / 1.4 / 520"
  annotation: "0.8125rem / 1.45 / 450"
  micro: "0.75rem / 1.4 / 560"
radii:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
spacing:
  unit: "4px"
  controlHeight: "36px"
  compactControlHeight: "28px"
  touchTarget: "44px"
  headerHeight: "64px"
  sidebarWidth: "320px"
  readingWidth: "920px"
  outlineWidth: "268px"
  shellMaxWidth: "1380px"
motion:
  fast: "120ms"
  normal: "160ms"
  slow: "220ms"
---

# A3S UI Design System

## 1. Direction

### Creative north star: Focused Intelligence

A3S UI is a quiet, exact surface for intelligent work. It combines the restraint of a professional developer tool with the clarity of an editorial document. The interface starts with white or near-black space, establishes hierarchy with type and alignment, and introduces color only for identity, focus, state, or a deliberate moment of emphasis.

The component direction is grounded in the pinned public catalog and its v5.29.3 source, while the documentation shell follows the pinned A3S Test Rspress system. The documentation reference supplies geometry, editorial rhythm, continuous boundaries, and responsive behavior—not its green palette. Preserve the official A3S OS logo, semantic HTML API, framework independence, product vocabulary, and blue-to-violet brand relationship. Do not copy reference branding, mascots, product names, or React-specific DOM.

The system must feel recognizably related to the reference through mechanics that users can perceive:

- A 64px, low-contrast top bar, a 320px persistent documentation rail, and a 268px page outline on wide screens.
- Geist typography, strong compact headings, generous reading space, and short secondary copy.
- White and near-black canvases with four tonal surface steps instead of gray card grids.
- Small 4/6/8/12px radii, thin boundaries, 36px controls, and precise icon sizing.
- Framed component demos with a quiet title bar, live preview, highlighted source, and copy action.
- A restrained A3S OS blue accent, subtle ambient color near landmark surfaces, and blue primary controls.
- Dense capability without visual noise: controls appear where the task needs them and recede at rest.

### Product invariants

Visual fidelity never removes the properties that make A3S UI usable as infrastructure:

1. Public markup is semantic HTML with one stable root class.
2. CSS owns appearance; a small idempotent controller owns only behavior that native HTML cannot provide.
3. React and Vue adapters render the same contract and expose matching controller hooks.
4. Light, dark, RTL, reduced motion, coarse pointers, 200% zoom, and 320px layouts are release targets.
5. Documentation examples use the same package assets and runtime that consumers receive.
6. Every stateful action has a complete path through pending, success, failure, cancellation, and recovery.

## 2. Visual language

### 2.1 Color architecture

The neutral scale carries the interface. In light mode the canvas and raised surface are both white; spacing and borders decide whether they need separation. Muted, hover, and active surfaces advance through `#f7f7f8`, `#f4f4f5`, and `#eeeeef`. In dark mode the same roles advance through `#0d0d0f`, `#151518`, `#19191d`, `#202024`, and `#26262b`. Selected or user-authored regions may step out to the blue surfaces `#eef4ff` and `#17223b`; those surfaces do not become generic card backgrounds.

Text has three durable roles:

- Primary text names the task, value, or decision.
- Secondary text explains it and must retain at least 4.5:1 contrast at body size.
- Subtle text is reserved for timestamps, metadata, and nonessential annotations.

Borders also have three roles:

- Subtle borders separate regions that already differ by spacing or tone.
- Default borders define controls, preview frames, tables, and overlays.
- Strong borders indicate a selected edge or a boundary that must survive dense content.

The default accent is the A3S OS workspace blue: `#1456f0` in light mode and `#4380f9` in dark mode. It owns focus rings, current navigation, links, selection, and the primary action in a bounded region. The deeper `#243a9a` identity blue belongs to the mark and brand lockups. Violet remains an optional accent and a supporting color in the official blue-to-violet identity, never the default interaction color. No accent may flood ordinary cards or whole application panes.

An accent choice remaps the complete interaction contract together: primary action, hover, focus ring, current navigation, links, selection surface, and accessible foreground. It must not recolor success, warning, or danger semantics.

Success, warning, and danger colors communicate outcomes only. Every semantic state also needs text, an icon, or structure. Never use color as the only status channel.

### 2.2 Ambient color and gradients

Ambient color belongs to landmark surfaces: the documentation home, an empty start surface, a branded loading moment, or an optional showcase background. Use large, low-opacity violet, cyan, and rose radial fields that dissolve into the canvas. They must not reduce text contrast or sit behind dense controls.

A spectral gradient may appear in the official mark, a single showcase accent, or a deliberately branded action. It is not a default button fill, heading treatment, card border, or technical decoration. Product workspaces remain neutral so state colors keep their meaning.

### 2.3 Typography

Use Geist first, followed by high-quality CJK and system fallbacks. Use Geist Mono only for code, commands, file paths, shortcuts, identifiers, and measurements.

| Role          | Size and line height            | Weight | Use                                     |
| ------------- | ------------------------------- | ------ | --------------------------------------- |
| Display       | `clamp(32px, 4vw, 40px)` / 1.08 | 680    | Documentation and empty-state landmarks |
| Page title    | 24px / 1.2                      | 660    | Product page identity                   |
| Section title | 20px / 1.3                      | 650    | Major document and application sections |
| Subsection    | 16px / 1.4                      | 620    | Bounded groups and inspector regions    |
| Body          | 15px / 1.7                      | 400    | Documentation and long-form task output |
| UI            | 14px / 1.4                      | 520    | Controls, navigation, tables, and menus |
| Annotation    | 13px / 1.45                     | 450    | Metadata and descriptions               |
| Micro         | 12px / 1.4                      | 560    | Rare dense labels and measurements      |

Display tracking stays between `-0.035em` and `-0.02em`; UI labels use normal tracking. Headings receive more space above than below. Documentation body measure stays between 65 and 75 characters. Chinese and English use equivalent roles without forced uppercase. Section labels in a navigation rail may use uppercase English only when they are genuinely metadata rather than the primary name.

### 2.4 Spacing and layout

Use a 4px base. Common internal gaps are 4, 6, 8, 12, and 16px. Region gaps are 24, 32, 48, 64, and 96px. Do not invent intermediate values without a measured layout need.

Product controls are 36px high by default and 28px when explicitly compact. Every coarse-pointer target is at least 44px even when the visible control is smaller. Page padding is 16px on phones, 24px on tablets, and 32–48px on desktop.

Documentation uses the A3S Test shell geometry: a maximum 1380px frame, a 320px sidebar, a content region capped at 920px, an optional 268px outline, and 80px desktop content padding. At intermediate widths content padding becomes 36px; phones use 24px page margins. Product applications use stable context at an edge, an open central task canvas, and an optional inspector. A pane must declare its scroll owner; document and transcript scrolling may not compete.

At 900px, secondary inspectors become overlays or drawers. At 768px, persistent navigation becomes a dismissible sheet and is inert while closed. At 520px, headers keep only identity and essential actions, controls expand to touch targets, and safe-area padding protects bottom actions.

### 2.5 Shape, boundaries, and depth

Use 4px for tiny internal controls, 6px for buttons and fields, 8px for ordinary surfaces, and 12px for overlays and major preview frames. Pills are reserved for status, compact filters, switch tracks, and circular actions.

Static layout surfaces are flat. A component earns a shadow only when it floats above content or remains anchored while content passes underneath it.

- Control shadow: `0 1px 2px rgb(0 0 0 / 4%), 0 1px 6px rgb(0 0 0 / 3%)`.
- Floating panel shadow: `0 8px 16px -4px rgb(0 0 0 / 20%)`.
- Dialog shadow: `0 20px 20px -8px rgb(0 0 0 / 24%)`.
- Dark mode increases shadow opacity instead of adding bright borders.

Avoid a visible border plus a generic shadow on the same edge. Preview frames may use a default border and a nearly imperceptible downward shadow because they represent an embedded surface.

### 2.6 Iconography

Use a coherent outline icon set with 1.75–2px strokes, round joins, and optical sizes of 14, 16, 18, or 20px. The official A3S OS logo is the only site and product mark. Do not substitute emoji, Unicode glyphs, or third-party product logos for interface icons. Provider logos remain host-owned assets rendered through the generic Icon or Avatar contract.

## 3. Interaction language

### 3.1 Motion

Local feedback lasts 120–160ms. Menus, popovers, and contained sheets may take up to 220ms. Use exponential ease-out and begin from a usable visible state. Motion explains origin, continuity, or completion; it does not make static cards hover upward.

Reduced motion removes travel, blur animation, and looping decoration while preserving state changes. Streaming and loading states must still be understandable with all animation disabled.

### 3.2 Focus and keyboard

Every operable element receives a visible 2px accent outline with a 2–3px offset. Compound controls use `:focus-within` without suppressing the focused descendant. Roving-tabindex components support Home, End, and orientation-aware arrows. Escape closes only the topmost dismissible layer and returns focus to its trigger.

Native reading order is the keyboard order. Responsive CSS may change placement but never the meaningful DOM sequence. RTL reverses directional navigation and physical placement through logical properties; object icons do not mirror.

### 3.3 State and recovery

Each component implements only the states its job can reach, but it implements those states completely.

| Family         | Required states                                                |
| -------------- | -------------------------------------------------------------- |
| Actions        | default, hover, focus-visible, active, disabled, loading       |
| Fields         | empty, populated, focus, invalid, disabled, read-only, loading |
| Choice         | unchecked, checked, indeterminate when valid, focus, disabled  |
| Navigation     | default, hover, current, expanded, collapsed, unavailable      |
| Overlay        | closed, opening, open, loading, empty, error, closing          |
| Collection     | ready, loading, empty, partial, error, selected, read-only     |
| Task execution | queued, running, waiting, approval, success, cancelled, error  |
| Remote surface | loading, offline, permission denied, retrying, recovered       |

Errors name the problem and the recovery. Empty states explain what belongs in the region and offer an action only when one is valid. Loading preserves layout and does not erase user input. A rejected optimistic action restores the prior state and focus context.

## 4. Component architecture

### 4.1 Public contract

Every public component has one canonical contract:

- A stable kebab-case slug and one root class.
- A meaningful native root element whenever the platform provides one.
- Documented parts expressed through semantic descendants or `data-*` attributes.
- ARIA that describes actual behavior rather than compensating for the wrong element.
- An idempotent controller only for composite interaction.
- `before-*` cancelable events for host authorization and completed events for observation.
- Snapshot and controlled-update methods for stateful controllers.
- No hidden transport, persistence, permissions, routing, or business entities.

React and Vue adapters are generated from the manifest. They must expose the same root, attributes, events, controller methods, and `use<Component>` hook when the component has behavior. Framework adapters must not invent props that cannot be expressed by the canonical DOM contract.

### 4.2 Coverage decisions

The pinned reference catalog is an inventory, not a license to import unsuitable architecture. Every public reference page must appear exactly once in `LOBEUI_COVERAGE.md` under one of these decisions:

- **Direct**: the same durable job exists as an A3S component.
- **Adapt**: the job exists, but its contract is redesigned for semantic HTML and A3S product needs.
- **Compose**: existing primitives express the job; publish and test the composition instead of adding a duplicate root.
- **Foundation**: the reference item is a token, provider, motion, typography, or localization capability.
- **Brand substitute**: replace reference-specific identity with the official A3S asset and Brand Lockup contract.
- **Host integration**: provider logos, comments, remote renderers, and other externally owned behavior remain host integrations with a documented slot.

Coverage is incomplete when any reference document is missing, mapped to `TBD`, or points only to a visual placeholder. A Direct or Adapt mapping is complete only when source, package export, manifest entry, bilingual docs, React/Vue usage, relevant hook, and tests agree. A Compose or Host integration mapping requires a documented, tested example with an explicit ownership boundary.

### 4.3 Primitive families

#### Actions

Buttons use A3S OS blue for the default primary treatment. A bounded region keeps one unmistakable primary action; surrounding actions use tonal, outlined, ghost, or link treatments. Filled, tonal, outlined, ghost, danger, link, icon-only, split, copy, and download actions share the same height, focus, loading, and disabled rules. Icon-only actions always have an accessible name.

#### Fields and choice controls

Inputs use a white or raised surface, a default border, 6px radius, and concise labels. Focus increases border contrast and adds the accent ring. Compound fields align prefix, value, suffix, validation, and loading without nested borders. Date, shortcut, color, image, and emoji selection extend the same field grammar rather than inventing standalone visual worlds.

#### Navigation

Navigation is quiet at rest. Current rows use the active tonal surface, stronger text, and `aria-current`; accent may appear as a small icon or focus signal. Tabs, segmented controls, side navigation, breadcrumbs, pagination, table of contents, and mobile tab bars share explicit current, disabled, overflow, and keyboard behavior.

#### Overlays

Menus, context menus, popovers, tooltips, drawers, floating panels, and dialogs share one layer stack, viewport collision rules, Escape semantics, focus restoration, and reduced-motion policy. A sheet is a responsive presentation of an existing task, not a new component job.

#### Feedback

Alerts, toasts, badges, progress, skeletons, loading dots, empty states, and branded loading moments state what changed. Avoid decorative loading metaphors when a spinner, skeleton, or progress value communicates more clearly.

#### Content and media

Cards, blocks, lists, tables, diffs, code, Markdown, diagrams, images, video, file icons, snippets, and document callouts use the same neutral surfaces and typography. Code is left-to-right, syntax highlighted, scrollable, and paired with a copy action when users are expected to reuse it.

#### Layout and collections

Flex and grid are layout utilities, not semantic components. App Shell, Split Pane, Data Grid, Sortable List, File Explorer, Catalog, Settings Layout, and other task-scale contracts own real interaction boundaries. Collections expose loading, empty, partial, error, selection, bulk action, filter, and recovery states without replacing host data ownership.

#### Harness

Harness components support authoring, conversation, execution, review, evidence, files, terminal output, and device preview. They are provider-neutral. The host owns models, transport, authorization, persistence, remote execution, and trusted results.

## 5. Key component specifications

### Component preview

A preview is evidence, not decoration. It has one 12px frame, a compact title bar, a live stage, and a source region. The toolbar includes only meaningful controls: viewport, appearance, direction, source, copy, and optional external open. Source uses real syntax highlighting and a working copy action. Preview height adapts to content and names loading or runtime failure. Each preview declares or derives one layout intent: centered control, flowing content, bounded overlay, or edge-to-edge workspace. Phone and tablet modes render inside isolated CSS viewports so component media queries respond to the selected width instead of the documentation window.

### Button and Action Icon

Default height is 36px, compact height is 28px, horizontal padding is 12–14px, and icon gaps are 6–8px. Pressed state moves no more than 1px. Loading preserves label width. Action Icon is the icon-only Button composition, not a separate behavioral contract.

### Form and Field

Form owns grouping, submission state, and summary-level validation. Field owns label, description, control, and local error association. Form Modal composes Dialog and Form. Inline editing exposes explicit edit, save, cancel, pending, and error states and never commits merely because focus moved.

### Menus and command surfaces

Dropdown Menu and Context Menu share menu semantics; Command adds search and grouped results. Editor Slash Menu is a Command composition anchored to an editor caret. Menus support disabled and checked items, nested paths, typeahead, collision handling, and focus return.

### Chat and task transcript

The transcript is a chronological list, not a stack of generic cards. User content may use a quiet tinted bubble; assistant content reads on the canvas. Actions appear on focus or hover without becoming inaccessible to touch. Editing, regeneration, citations, attachments, tool calls, and status stay inside the owning turn. Back to Bottom appears only after the reading position leaves the live edge and announces unread additions without forcing scroll.

### Composer

Composer combines a growing text area, context, attachments, tools, status, queue, and one send/stop action in a single 12px surface. It preserves drafts through loading, offline, rejection, and responsive transitions. Mobile uses safe-area padding and keeps the primary action reachable above the virtual keyboard.

### Code, Markdown, and preview content

Highlighter and Snippet use the code surface, Geist Mono, theme-aware syntax tokens, copy feedback, and horizontal scrolling. Markdown establishes safe typography and delegates diagrams, math, raw HTML, media, and remote links to explicit host renderers. HTML Preview is sandboxed and belongs in Device Simulator when viewport controls or remote navigation are required.

Device Simulator keeps the iframe at the exact selected CSS viewport and places hardware geometry outside that measurement. Phones expose an edge rail, sensor treatment, and gesture region; tablets expose a bezel and camera; laptops expose a display frame, hinge, and base; desktop monitors expose a bezel, chin, and stand. The complete shell scales as one unit to fit its workspace and remains a visual boundary only: it does not claim to emulate user agents, pixel density, touch, safe areas, network conditions, or operating-system browser behavior.

### Data Grid and Sortable List

Data Grid owns navigation, sort intent, selection, and local presentation state; the host owns data queries and mutations. Sortable List provides pointer and keyboard reordering, a visible destination, cancel, and a completed reorder event. Both preserve selection and scroll context after rejected remote actions.

### Brand and provider identity

Brand Lockup renders the official A3S OS logo, product name, and optional description. Monochrome and compact treatments derive from the same asset contract. Third-party provider marks are host-supplied images or SVGs in Icon, Avatar, or Brand Lockup slots; A3S UI does not redistribute unrelated brand libraries.

## 6. Documentation system

Documentation and product experience are separate information architectures.

The documentation site shares the visual grammar of A3S Test while retaining A3S UI identity:

- Use a 64px Rspress navigation bar, blue-gray `#f5f7fb` light canvas, near-black `#0d1118` dark canvas, and the A3S OS blue interaction accent.
- Keep sidebar, article, and outline regions on one continuous editorial grid. Separation comes from spacing and 1px boundaries, not a stack of floating cards.
- Use 16px for major document surfaces, 12px for component preview frames, and 8px for controls. Do not inflate ordinary controls into pills.
- Cap the article region at 920px while keeping paragraph measure between 65 and 75 characters. Use 80px desktop padding, 36px intermediate padding, and 24px phone margins.
- Disable generic content entrance animation. Motion is reserved for control feedback, disclosure continuity, and state transitions.
- Closed mobile navigation and outline regions are invisible and inert. Their tree lines, arrows, and focusable descendants must not leak into article space.
- Every code example uses syntax highlighting and a persistent localized copy action. Component previews use the same code block system instead of a parallel highlighter.
- Home, documentation, and Playground use the same tokens, typography, borders, and responsive breakpoints even though they remain separate routes and information architectures.

- `site/docs/` contains guides, foundations, component contracts, Harness documentation, and composition patterns only.
- Playground is a standalone custom route under `site/pages/`, linked from top navigation and absent from documentation sidebars, section indexes, search grouping, and previous/next ordering.
- Simplified Chinese is the default locale; English mirrors every public contract.
- Version switching retains the same route when that version contains it and falls back transparently when it does not.

Every component document follows this order:

1. Name and one-sentence job.
2. Install or import path.
3. Live default example.
4. Variants that correspond to real decisions.
5. Loading, empty, error, disabled, selected, narrow, dark, and RTL states where applicable.
6. Native HTML contract.
7. JavaScript controller and events when present.
8. React usage and hook.
9. Vue usage and hook.
10. Accessibility and ownership boundaries.

Do not publish an inert control, fabricated API, or visual-only state. Code examples must be highlighted and copyable.

## 7. Accessibility and resilience

Release checks include WCAG AA contrast, keyboard completion, screen-reader names and relationships, focus containment and restoration, touch targets, reduced motion, RTL, 200% zoom, 320px width, long German labels, Chinese copy, long paths, empty data, partial data, offline state, and permission denial.

Use `aria-live` only for bounded status changes. Do not make whole transcripts, tables, or application shells live regions. Hidden navigation and overlays are inert. Scroll shadows are supplemental and never the only indication that content continues.

## 8. Delivery contract

A component or composition is finished only when all applicable evidence exists:

- Authored CSS and optional controller source.
- Package build inclusion and stable export.
- Manifest definition with selector, parts, actions, states, methods, hooks, and events.
- Generated React and Vue adapters with equivalent hooks and types.
- Aligned Chinese and English documentation.
- Semantic, interaction, visual, dark, RTL, responsive, and accessibility tests.
- Inclusion in the standalone Playground when it participates in an application composition.
- No stale generated files edited by hand.

The release audit compares the pinned 160-page reference inventory with `LOBEUI_COVERAGE.md`, then compares every A3S mapping with source, exports, manifest, docs, adapters, and tests. Strict evidence uses one of six explicit kinds: component, composition, foundation, brand, integration, or standalone route. `check:framework-docs` verifies React and Vue parity, while `check:boundaries` verifies applicable hooks, ownership, official identity, prohibited public references, and the separate Playground information architecture. Passing a narrow build does not prove full coverage.

## 9. Do and do not

### Do

- Use neutral space, precise type, and alignment before adding a container.
- Keep one obvious primary action in each bounded task region.
- Use A3S OS blue by default for focus, current state, links, and deliberate action.
- Keep controls compact while preserving 44px coarse-pointer targets.
- Give every mutation a complete state and recovery cycle.
- Make framework adapters thin reflections of the semantic contract.
- Test real content and failure states in every supported layout direction and theme.

### Do not

- Do not copy another product's logo, mascot, name, provider assumptions, or React DOM.
- Do not use a grid of identical cards as the default page structure.
- Do not nest cards to create hierarchy that spacing and typography should provide.
- Do not use gradients, glow, glass, or monospace as generic technology decoration.
- Do not make every button a pill or every surface float.
- Do not hide focus, selection, validation, or recovery behind color alone.
- Do not put Playground inside documentation chapters or sidebars.
- Do not call a mapping complete until its public contract and evidence agree.
