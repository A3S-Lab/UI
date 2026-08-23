# Roadmap

## Shipped in v0.1.0

- [x] A3S visual foundations for color, typography, spacing, shape, elevation, motion, and accessibility.
- [x] Semantic primitive component catalog with live previews and documented parameters.
- [x] Office-derived App Shell, Activity Bar, Workspace Header, Toolbar, Ribbon, Settings Layout, Resource Card, and Split Pane patterns.
- [x] Framework-agnostic CSS, vanilla JavaScript controllers, and Nunjucks/Jinja templates.
- [x] Rspress documentation with Simplified Chinese as the default, English localization, and `next` / `v0.1.0` version switching.
- [x] GitHub Pages deployment from `main`.

## Shipped in v0.2.0

- [x] Added per-route component geometry, state, and browser diagnostic regression coverage without changing the established A3S visual language.
- [x] Deferred component initialization until live documentation previews finish React hydration.
- [x] Aligned A3S foundations, control density, interaction states, overlays, and application chrome with the A3S Office visual contract.
- [x] Added independently reusable Task Pane and Status Bar contracts with localized documentation.
- [x] Rebuilt the homepage specimen from public components instead of private look-alike styles.
- [x] Added browser visual-regression coverage for the Office-derived workbench and application patterns.
- [x] Promoted the validated `next` visual contract into the v0.2.0 stable documentation snapshot.
- [x] Added a publish-time package export and tarball contract check.
- [x] Published `@a3s-lab/ui@0.2.0` to the public npm registry.

## Next

- [x] Added a framework-agnostic Code Editor with native editing fallback, line and cursor status, indentation shortcuts, JSON validation, read-only state, and a public value API.
- [x] Extracted Agent Workbench, Log Viewer, Property List, Status Badge, and Timeline contracts from A3S agent and operational evidence surfaces.
- [x] Extracted Brand Lockup and Stepper contracts from repeated A3S identity and bounded process-path surfaces.
- [x] Added Agent Composer, Agent Transcript, Execution Item, and Approval Request contracts with Task Workspace and New Task compositions.
- [x] Added App Page, Task Start, Task Workspace, Catalog, and Setting Row contracts with bilingual Capability Catalog, Settings Center, Projects, and Automations patterns.
- [x] Added the 14 detailed task-workflow contracts for plans, message state, artifacts, context, queues, checkpoints, follow-ups, tools, change review, terminal output, and execution evidence.
- [x] Added the 116-component machine manifest, semantic DOM runtime, optional React and Vue adapters, isolated package checks, and deterministic per-component A3S Test coverage.
- [x] Added the Harness information architecture for task, conversation, execution, review, and tooling components.
- [x] Added Device Simulator with phone, tablet, desktop, custom-size, orientation, iframe, and trusted native-preview integrations.
- [x] Rebuilt the documentation on Rspress with Chinese-first bilingual navigation, version-aware switching, highlighted source panels, and copy controls.
- [x] Added owned-part/action/state selector helpers, all-component framework export and type checks, real client mounting, and source disclosure for every bilingual component example.
- [x] Added Data Grid, Filter Bar, Context Menu, Bulk Action Bar, and File Explorer after a product-level reuse and ownership review.
- [x] Added aligned React and Vue examples for all 116 component guides plus `useA3SLocale`, `useA3STheme`, and `useA3SMotion` runtime configuration APIs.
- [x] Integrated Form into `@a3s-lab/ui/form` with its deterministic Core, Designer, Renderer, Cloud adapter, interaction contracts, CLI, Web Component, React Hook Form, and native Vue composables; published its guides in the unified component catalog and its designer in the shared Playground route family.
- [x] Closed the 160-item reference audit with checked component, composition, foundation, brand, integration, and standalone-route evidence instead of promoting every source concept into a component.
- [x] Rebuilt the standalone Playground as a task-first A3S product application that combines the established desktop information architecture with shared A3S composer, session, file, editor, Knowledge, Memory, extension, automation, and settings workflows.
- [ ] Execute the first-principles and adversarial component review in [COMPONENT_OPTIMIZATION_PLAN.md](./COMPONENT_OPTIMIZATION_PLAN.md), promoting each contract only after its product, interaction, visual, framework, and regression evidence is complete.
- [ ] Expand design tokens and application patterns only as A3S products adopt them, keeping Office parity through visual baselines.
- [ ] Add migration guidance for Basecoat consumers moving to the A3S theme.

## Application Pattern Acceptance Gate

Candidate patterns are promoted only when they repeat across workflows, carry stable product meaning, work without private application state, and add a complete interaction or accessibility contract.

| Decision                         | Patterns                                                              | Product rationale                                                                           |
| -------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Public component                 | Data Grid, Filter Bar, Context Menu, Bulk Action Bar, File Explorer   | Reusable tasks with clear ownership and missing system coverage                             |
| Compose from existing components | Row actions, source-control status, resizable regions, inline notices | Better expressed by Data Grid, File Explorer, Split Pane, Alert, Dialog, and Toolbar        |
| Keep application-owned           | Workflow board, message inbox, branch management panel                | Single-workflow usage or inseparable transport, repository, permission, and lifecycle state |
