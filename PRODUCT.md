# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A3S product engineers, frontend developers, and product designers use A3S UI while building agent workspaces, operational consoles, document tools, and other dense A3S product surfaces. They evaluate components in the documentation site, copy semantic HTML, and integrate the CSS and small vanilla JavaScript controllers without adopting a framework-specific component runtime.

## Product Purpose

A3S UI is the framework-agnostic design system for A3S products. It turns interaction patterns refined in A3S Office into reusable foundations, primitive controls, state-rich components, and application-scale patterns. Success means an A3S product can ship a coherent, accessible interface from semantic HTML while the public examples remain truthful representations of the package.

## Positioning

A3S UI combines shadcn/ui-aligned concepts with a smaller semantic HTML contract and Office-derived application patterns. It is not a React, Radix, Base UI, `cn-*`, or `data-slot` DOM port, and it does not require a runtime framework.

## Operating Context

Users work in code editors and browsers, inspect bilingual versioned documentation, compare light and dark themes, copy HTML examples, and assemble both compact controls and full application shells. The repository publishes package bundles and a GitHub Pages documentation site from `main`. The documentation includes live component previews and an Office workbench that must exercise the same public component contract consumers receive.

## Capabilities and Constraints

- Framework-agnostic CSS with small, idempotent vanilla JavaScript controllers where behavior requires it.
- Semantic public APIs built around one root class, meaningful child elements, and documented ARIA or data attributes.
- Primitive controls, overlays, feedback, data display, utilities, and Office-derived application patterns.
- Light and dark themes, responsive layouts, localization, RTL where supported, and keyboard-accessible interaction states.
- Backward compatibility for existing package exports, default bundle behavior, routes, public markup, and versioned documentation contracts.
- Simplified Chinese is the default documentation locale, with aligned English and supported version trees.
- Generated build outputs are produced by repository scripts and are not edited by hand.

## Brand Commitments

- Preserve the A3S name, blue brand accent, existing A3S UI mark, and the visual relationship to A3S Office.
- Keep the voice concise, technical, concrete, and bilingual.
- Favor familiar, trustworthy product affordances over decorative novelty.
- Make the system visibly authored for A3S rather than interchangeable with a default shadcn-style theme.

## Evidence on Hand

- Product and integration truth in `README.md`, `AGENTS.md`, `ROADMAP.md`, and `CHANGELOG.md`.
- Existing component, style, and controller sources under `src/css/` and `src/js/`.
- Bilingual, versioned component documentation under `site/docs/`.
- The A3S UI mark and documentation imagery under `site/docs/public/` and `assets/readme/`.
- Playwright visual coverage and A3S Test ACL suites under `visual-tests/` and `tests/e2e/`.
- No customer, benchmark, adoption, or performance claims are available and none should be fabricated.

## Product Principles

1. A live preview is product evidence, so it must use the same public assets and behavior as a consumer integration.
2. Semantic HTML and browser-native behavior are the default; JavaScript exists only where interaction requires it.
3. Every interactive component ships a coherent cycle of default, hover, focus, active, disabled, loading, error, selected, and open states where applicable.
4. Dense product work benefits from consistent hierarchy, predictable controls, and clear state more than decorative spectacle.
5. Documentation, source, tests, and generated package entrypoints stay synchronized as one public contract.

## Accessibility & Inclusion

Keyboard operation, visible focus, semantic landmarks and labels, adequate contrast, reduced-motion behavior, touch-target sizing, responsive structure, localization, and RTL support are release requirements rather than optional polish.
