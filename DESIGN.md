# A3S UI Design Contract

This document records the incumbent A3S UI visual language. It is a preservation contract, not a redesign proposal.

## Direction

- Product surfaces operate at `DESIGN_VARIANCE 5`, `MOTION_INTENSITY 3`, and `VISUAL_DENSITY 5`.
- Documentation is primarily a Read surface. Component previews and application patterns are Operate surfaces.
- The visual character is clean, technical, compact, and trustworthy. Product structure and interaction state carry more weight than decoration.
- A3S Office is the visual source of truth for application-scale patterns.

## Color

The default light theme uses `#f7f7f8` for the canvas, `#ffffff` for paper, `#17181a` for primary text, and `#2864e8` for the A3S accent. The default dark theme uses `#101118` for the canvas, `#171820` for paper, `#f2f3f5` for primary text, and `#6ca3ff` for the accent.

Semantic success, warning, danger, and agent colors remain secondary to the main neutral hierarchy. Accent customization changes semantic tokens, not one-off component colors. New work must use the existing tokens in `src/css/styles/a3s-foundation.css` and `site/theme/index.css`.

## Typography

- Documentation uses Geist Sans with the existing system fallbacks.
- Geist Mono is reserved for code, measurements, compact labels, and token specimens.
- Product controls use the shared `--a3s-font-size-ui`, `--a3s-font-size-compact`, and `--a3s-font-size-micro` tokens.
- Long-form documentation remains readable and visually distinct from dense component chrome.

## Size and Spacing

- Default controls are 36px high, with established 24px, 28px, 32px, and 40px variants where the component API calls for them.
- Application patterns use `--a3s-control-height*`, workspace-header, ribbon, and status-bar tokens instead of local heights.
- Compact visual controls may sit inside a 44px coarse-pointer hit area. Do not enlarge every desktop control to mobile dimensions.
- Related controls use tight gaps. Sections and major content groups use visibly larger separation.
- The documentation navigation is 64px high. The homepage content container is 1280px wide and the documentation reading column is capped at 920px.

## Shape and Elevation

- Preserve the established R06 / R10 / R14 component language and the current sharp, balanced, and rounded theme variants.
- Controls, surfaces, and overlays use the shared radius tokens. Do not introduce a replacement radius scale in individual components.
- Borders define most component structure. Shadows are reserved for real elevation such as workbench windows and overlays.
- Focus rings remain visible and use semantic focus tokens in both themes.

## Layout and Adaptation

- Desktop documentation keeps stable navigation, reading content, and contextual outline regions.
- The homepage hero uses the established split composition and collapses to a linear reading order on narrow screens.
- Multi-column application patterns must declare their narrow-screen collapse in the owning component CSS.
- Closed off-canvas navigation and outlines are `inert` and removed from the accessibility tree.
- No page or preview may create document-level horizontal overflow. Deliberate internal scrolling is allowed for code, tables, and scroll-area examples.
- Visual order, DOM order, and keyboard order must remain aligned at mobile, tablet, desktop, zoomed, and localized states.

## Components and Interaction

- Public components use semantic HTML, one meaningful root class, documented ARIA state, and small idempotent controllers only where browser behavior is insufficient.
- Default, hover, focus, active, disabled, loading, invalid, selected, empty, and open states remain part of the component contract where applicable.
- A visible control must either work or be marked as non-interactive specimen chrome.
- Buttons and labels do not wrap unexpectedly at supported component sizes.
- Selection and disclosure state must be expressed semantically as well as visually.

## Overlays and Effects

- Dialogs, drawers, menus, popovers, combobox lists, tooltips, and toasts must remain inside the viewport and above the content that launched them.
- Overlay positioning must survive scrolling, resizing, nested previews, narrow viewports, and transformed ancestors.
- Motion lasts 120-150ms by default, communicates feedback or state, and uses transform or opacity when practical.
- Reduced-motion mode removes non-essential movement without hiding state changes.

## Documentation Previews

- A live preview is product evidence and must load the same public CSS and runtime consumers receive.
- The A3S runtime initializes only after React has hydrated preview markup. The mutation observer then handles later route and preview changes.
- Component previews must produce no browser warnings, page errors, unnamed controls, clipped content, or accidental small touch targets.

## Change Boundary

Layout, responsive behavior, component dimensions, positioning, stacking, state effects, and interaction defects may be refined within this visual world. Palette, typography, radius language, shadow character, brand mark, information architecture, and public component markup require explicit redesign approval before they change.

## Release Verification

Every UI release verifies package and documentation builds, all public component routes, desktop and compact viewports, light and dark themes, coarse-pointer targets, keyboard focus order, overlay open states, console diagnostics, and the published GitHub Pages artifact.
