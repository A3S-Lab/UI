---
name: A3S UI
description: A calm, framework-agnostic interface system for task-centered A3S products.
colors:
  canvas: "#f8f9fb"
  paper: "#ffffff"
  ink: "#17191d"
  muted-ink: "#667085"
  hairline: "#e6e8ec"
  primary: "#2864e8"
  primary-soft: "#eef4ff"
  success: "#15815a"
  warning: "#a85f0c"
  danger: "#c9363c"
typography:
  display:
    fontFamily: '"Geist Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  headline:
    fontFamily: '"Geist Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Geist Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '"Geist Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.25
  mono:
    fontFamily: '"Geist Mono", ui-monospace, monospace'
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.5
  scale:
    micro: "0.6875rem"
    annotation: "0.75rem"
    ui: "0.8125rem"
    body: "0.875rem"
    section: "1rem"
    page: "1.5rem"
rounded:
  control: "6px"
  surface: "10px"
  elevated: "14px"
spacing:
  unit: "4px"
  control-height: "36px"
  touch-target: "44px"
  navigation-width: "248px"
  reading-width: "760px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "{spacing.control-height}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "{spacing.control-height}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "{spacing.control-height}"
  navigation-item:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 9px"
    height: "38px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "16px"
---

# Design System: A3S UI

## Overview

**Creative North Star: "The Clear Workbench"**

A3S UI is a task-centered work surface. It gives durable context a quiet fixed home, lets the current task occupy an open canvas, and raises only the controls that need immediate attention. The system feels calm, exact, and familiar under long sessions; hierarchy comes from position, whitespace, type, and one-pixel boundaries rather than decorative containers.

The visual language is original to A3S: cool neutral surfaces, a deliberately scarce A3S blue, Geist typography, and semantic status colors used only when state matters. It does not use promotional modules, mascots, ornamental gradients, or a green product palette. Application patterns preserve semantic HTML, native controls, and small idempotent JavaScript controllers.

**Key Characteristics:**

- Fixed task context beside an open primary canvas.
- One elevated input surface; most content remains flat.
- Cool daylight neutrals with blue reserved for action, selection, and focus.
- Compact controls inside generous page and section spacing.
- Complete interaction states across light, dark, narrow, RTL, and reduced-motion contexts.

## Colors

The palette is a cool neutral field with one precise blue voice. Semantic colors report state; they never become page themes.

### Primary

- **A3S Signal Blue:** The only product accent. Use it for the primary action, selected navigation, links, progress, and focus. It should occupy no more than about 10% of a typical screen.
- **Blue Mist:** The selected or user-authored surface. Use it for active navigation backgrounds, selected rows, and restrained user messages; never stack it behind another blue surface.

### Secondary

- **Completion Green:** Successful execution, availability, and completed steps only.
- **Attention Amber:** Pending approval or recoverable caution only.
- **Blocking Red:** Destructive actions, invalid fields, and failed execution only.

### Neutral

- **Cool Canvas:** The application background. It separates the product from paper surfaces without appearing gray or heavy.
- **Working Paper:** Composer, overlays, menus, inspector, and other surfaces that must stand above the canvas.
- **Workbench Ink:** Primary copy and icons.
- **Slate Annotation:** Secondary copy, timestamps, descriptions, and inactive navigation.
- **Hairline:** Separators and structural borders. Prefer tonal contrast when a boundary is not needed.

**The Ten Percent Rule.** A3S Signal Blue is rare enough that its appearance always means action, selection, progress, or focus.

**The Semantic Reserve Rule.** Green, amber, and red may describe state but may not brand navigation, whole cards, or page regions.

**The Dark Theme Rule.** Dark mode preserves the same hierarchy with a near-black canvas, charcoal paper, cool light text, and a lighter A3S blue; it does not invert every neutral mechanically.

## Typography

**Display Font:** Geist Sans with the established CJK and system fallbacks
**Body Font:** Geist Sans with the established CJK and system fallbacks
**Label/Mono Font:** Geist Mono for code, paths, commands, measurements, and tabular data only

**Character:** Geist supplies a compact, neutral work voice without looking like browser defaults. Weight and spacing, rather than font switching, create hierarchy. Chinese and English share equivalent visual roles and do not depend on all-caps labels.

### Hierarchy

- **Display** (650, `clamp(1.75rem, 3vw, 2.5rem)`, 1.15): empty and start surfaces only; keep to one or two lines.
- **Page headline** (650, 1.5rem, 1.25): catalog, project, automation, and settings titles.
- **Section title** (650, 1rem, 1.35): content groups and inspector regions.
- **Body** (400, 0.875rem, 1.55): task content and descriptions; readable content stays within 65–75 characters per line.
- **UI label** (550–650, 0.8125rem, 1.25): controls, navigation, compact cards, and field labels.
- **Annotation** (400–550, 0.75rem, 1.35): timestamps and secondary metadata; never use low contrast to simulate hierarchy.
- **Micro** (500, 0.6875rem, 1.35): rare dense metadata and code labels, not primary controls.

**The Open Transcript Rule.** Assistant output reads as document content on the canvas. Do not put every response inside a bordered message card.

**The Mono Means Data Rule.** Monospace communicates code, commands, paths, or measurement; it is never decorative technical styling.

## Layout

The spatial system uses a 4px base rhythm and three scales: 4–8px inside tight controls, 12–16px inside components, and 24–40px between page regions. Headings receive more space above than below. Desktop task applications use a fixed 248px navigation region, a flexible main canvas, and an optional 320–380px inspector. Primary task content is centered within a maximum 760px reading column; catalogs may expand to a 1200–1280px content region.

The application shell fills its bounded host with `min-height: 100dvh` only when it owns the viewport. Navigation and inspectors scroll independently from the task transcript. The composer follows the transcript in DOM order and may become sticky at the bottom of the main region. Start surfaces place one large composer near the visual center with substantial empty canvas around it.

At 900px and below, inspectors become contained overlays. At 768px and below, primary navigation becomes an inert off-canvas drawer when closed. At 520px and below, the header exposes only task identity and essential actions, inspectors open as bottom drawers, the composer uses the full available width, and controls maintain 44px hit targets. No breakpoint may change meaningful reading or keyboard order, and no public pattern may create document-level horizontal overflow.

RTL uses logical properties throughout. Navigation and inspectors exchange physical sides naturally; only directional icons flip. Dense strings, long paths, German labels, Chinese copy, 200% zoom, and a 320px viewport are required stress cases.

**The Context-and-Canvas Rule.** Persistent context owns a stable edge; the current task owns the open center. Do not turn navigation, transcript, and inspector into equal floating cards.

**The One Scroll Owner Rule.** Every application region declares its scroll owner. Avoid nested transcript and page scrolling.

## Elevation & Depth

The system is flat by default. Canvas, navigation, transcript, catalogs, and setting rows use tonal layers or one-pixel hairlines. Elevation is structural and limited to the composer, menus, command panels, dialogs, drawers, toasts, and overlay inspectors.

### Shadow Vocabulary

- **Control:** no shadow at rest; border and tone define the control.
- **Composer:** a low ambient shadow with downward offset, used only when the composer is docked or floating over scrolling content.
- **Overlay:** a medium ambient shadow for menus, popovers, command panels, and drawers.
- **Dialog:** the strongest bounded shadow in the system, paired with a neutral scrim.

**The Earned Elevation Rule.** A surface receives shadow only when it floats above content or must remain perceptually anchored while the content scrolls beneath it.

**The Single Boundary Rule.** Use a border or a broad shadow to express one edge. Do not combine a visible card border with a generic shadow by default.

Motion lasts 120–180ms for local feedback and up to 220ms for contained drawers. Use transform, opacity, and clip-path; preserve the final state with motion removed. Pressed controls may translate by 1px. Cards do not hop upward on hover.

## Shapes

The radius system has three primary roles: gently curved controls (6px), stable surfaces (10px), and elevated or major surfaces (14px). Small status dots, switch tracks, avatars, and circular icon actions may be fully round because their geometry carries meaning. Tags and ordinary buttons do not become pills by default.

Borders are one pixel. Iconography uses a consistent 1.75–2px outline with rounded joins, normally 16–20px inside a 36px control or 44px hit area. Avoid emoji and Unicode symbols as interface icons. Directional glyphs mirror in RTL; object glyphs do not.

**The Radius Follows Hierarchy Rule.** Inner controls are never rounder than the surface containing them unless the control is explicitly circular.

## Components

### Buttons

- **Shape:** Gently curved rectangle (6px) with a 36px default height and 44px coarse-pointer target.
- **Primary:** A3S Signal Blue with white text; reserve for the main action in the current region.
- **Secondary:** Neutral tonal surface with clear ink; use for adjacent alternatives.
- **Outline:** Hairline boundary on paper; use when surface distinction is necessary.
- **Ghost / text:** No resting container; use for navigation utilities and low-priority actions.
- **Hover / focus / active:** Shift tone on hover, use a visible blue focus ring, and translate 1px on press. Never remove focus in favor of hover.
- **Disabled / loading:** Preserve label width and purpose. Disabled state lowers emphasis while maintaining readable text; loading replaces only the leading icon or adds inline status without changing layout.

### Chips

- **Style:** Compact 28–32px segmented or filter controls with 6px corners. Tags are quiet annotations rather than miniature buttons.
- **State:** Selected filters use Blue Mist plus blue ink or a subtle boundary. Unselected filters use transparent or neutral surfaces. Wrap or scroll intentionally; never squeeze labels.

### Cards / Containers

- **Corner Style:** Stable surface radius (10–14px).
- **Background:** Working Paper or a deliberate pale category tint.
- **Shadow Strategy:** Flat at rest. Interactive catalog cards shift border and tone, not vertical position.
- **Border:** Hairline when separation is needed; omit when spacing and tone already define the group.
- **Internal Padding:** 16–20px for catalog resources, 12–16px for compact project and automation rows.
- **States:** Selected, installed, unavailable, loading, error, and empty states remain legible without depending on color alone.

### Inputs / Fields

- **Style:** 36px control height, Working Paper or transparent background, hairline input boundary, 6px corners, and concise labels above or inline on stable setting rows.
- **Focus:** Blue border plus a clearly visible outer ring; `:focus-visible` for individual controls and `:focus-within` for compound controls.
- **Error / disabled:** Error includes a direct message and recovery; disabled controls keep their reason nearby. Placeholders meet body-text contrast requirements.

### Navigation

- **Desktop:** Fixed 248px task navigation with product lockup, primary destinations, contextual task/project groups, and account/settings actions at the bottom.
- **Rows:** 36–40px high with a 6px active tonal surface. Active state uses `aria-current` or `aria-pressed` plus visible blue or strong ink.
- **Mobile:** Contained drawer with scrim, focus return, Escape dismissal, and `inert` while closed. A compact top bar replaces the permanently visible rail.

### Task Composer

The composer is the most visually prominent control. It uses one paper surface, a multiline text area, a clear tool row, and exactly one submit action. Model, permission, and workspace menus are anchored overlays. Attachments and queued instructions stay inside the same root without introducing nested cards. Error, streaming, queued, disabled, and offline states preserve the input and explain the next action.

### Task Transcript

The transcript is a chronological document. User messages align to the inline end on Blue Mist; assistant messages align to the inline start on the canvas. System notices, execution evidence, approvals, citations, and artifacts are structured blocks within the corresponding turn. Do not make the whole transcript a live region; announce only bounded status updates.

### Command Panel and Anchored Menus

Global search uses a centered command dialog with a search field, grouped results, recent items, keyboard hints, empty, loading, and error states. Filters, model choice, permission choice, and workspace selection use anchored menus sized to their content and constrained to the viewport. Escape closes the topmost layer and restores focus.

### Settings Center

Settings use a wide native dialog with fixed secondary navigation and an independently scrolling content panel. Setting rows align labels, descriptions, controls, and validation on a stable grid. At narrow widths, navigation becomes a horizontally scrollable section list or a separate drawer before content becomes cramped.

### Catalogs, Projects, and Automations

Capability catalogs share one page skeleton: title, tab set, search, optional featured strip, category filters, result count, sort, and a resource grid. Card content changes by resource type without changing fundamental rhythm. Project pages combine existing project management with template-based creation. Automation pages cover template empty state, schedules, run history, execution status, and a full-page creation form.

### State Matrix

| Family | Required states |
| --- | --- |
| Actions | default, hover, focus-visible, active, disabled, loading |
| Fields | empty, populated, focus, invalid, disabled, read-only, loading |
| Choice controls | unchecked, checked, indeterminate where valid, focus, disabled |
| Navigation | default, hover, current, expanded, collapsed, unavailable |
| Overlays | closed, opening, open, empty, loading, error, closing |
| Resources | default, hover, selected, installed, unavailable, loading, error |
| Task execution | queued, running, waiting, approval, success, cancelled, error |
| Surfaces | normal, empty, partial data, offline, permission denied |

## Do's and Don'ts

### Do:

- **Do** keep the task, its transcript, and its input in one continuous workspace.
- **Do** use whitespace and stable regions before adding another container.
- **Do** keep one obvious primary action per region and use blue consistently for it.
- **Do** preserve semantic landmarks, native elements, logical properties, and predictable keyboard behavior.
- **Do** document and test empty, loading, error, disabled, selected, open, narrow, dark, and RTL states.
- **Do** let cards differ by content and status while sharing one catalog skeleton.
- **Do** use exact A3S product language and real workflow-shaped example data.

### Don't:

- **Don't** mention or imitate another product's brand, palette, copy, mascot, promotional modules, or illustrations.
- **Don't** wrap assistant messages, settings sections, page regions, and cards inside progressively larger cards.
- **Don't** use green, purple, gradients, or glow as a general technology aesthetic.
- **Don't** add shadow to static containers or lift cards on hover.
- **Don't** use pills for ordinary buttons, tags, tabs, and navigation rows.
- **Don't** hide selection, error, approval, or focus state behind color alone.
- **Don't** let compact desktop controls fall below 44px hit targets on coarse pointers.
- **Don't** make mobile a scaled-down desktop; close navigation, collapse inspectors, and keep the composer usable above the safe area.
