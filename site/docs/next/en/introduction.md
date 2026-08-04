# Introduction

A3S UI is the framework-agnostic design system for A3S products, coding-agent workspaces, operational consoles, and document tools.

It turns the strongest interaction patterns from A3S Office Playground into a reusable system without coupling applications to React. The public API is semantic HTML, CSS variables, documented `data-*` attributes, and a small vanilla JavaScript runtime for composite interactions.

## What is included?

- Foundations for color, typography, spacing, shape, elevation, motion, and accessibility.
- More than 40 Basecoat-compatible primitives for actions, forms, navigation, overlays, feedback, and data display.
- Office-derived application patterns: App Shell, Activity Bar, Workspace Header, Toolbar, Ribbon, Settings Layout, Resource Card, Split Pane, Task Pane, Status Bar, and Resource Workbench.
- The A3S light and dark themes plus eight preserved Basecoat style packs.
- Nunjucks and Jinja templates for server-rendered applications.
- A documentation site with live previews, parameters, variants, states, and accessibility notes.

## Design principles

1. **Semantic first.** Native elements and ARIA contracts define behavior before styling.
2. **Framework independent.** The same markup works in Astro, React, Vue, Rails, Django, Laravel, or plain HTML.
3. **Product density with clarity.** Controls stay compact while labels, status, and focus remain legible.
4. **Configuration through components.** Operational settings use structured form controls; raw source editing is an optional escape hatch.
5. **Composable layers.** Foundations feed primitives; primitives compose into application patterns.

## Lineage

A3S UI is built on [Basecoat](https://github.com/hunvreus/basecoat), preserving its semantic shadcn/ui-inspired component model and MIT license. A3S adds its product theme, Office-derived patterns, grouped documentation, and workbench-focused interaction contracts.

[Install A3S UI](/installation) or browse the [component catalog](/components/).

## Contributing

- [Source](https://github.com/A3S-Lab/UI)
- [Issues](https://github.com/A3S-Lab/UI/issues)
- [Pull requests](https://github.com/A3S-Lab/UI/pulls)
