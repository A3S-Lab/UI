<p align="center">
  <img src="./assets/readme/hero.svg" alt="A3S UI — one design system for every A3S surface" width="1200">
</p>

<p align="center">
  A framework-agnostic design system for task workspaces, document tools, and operational consoles.
</p>

<p align="center">
  <a href="https://a3s-lab.github.io/UI/"><img alt="Documentation in Simplified Chinese" src="https://img.shields.io/badge/docs-简体中文-315fc4?style=flat-square"></a>
  <a href="https://a3s-lab.github.io/UI/en/"><img alt="Documentation in English" src="https://img.shields.io/badge/docs-English-5f6875?style=flat-square"></a>
  <a href="https://a3s-lab.github.io/UI/playground.html"><img alt="A3S UI Playground" src="https://img.shields.io/badge/try-Playground-2864e8?style=flat-square"></a>
  <a href="https://github.com/A3S-Lab/UI/actions/workflows/pages.yml"><img alt="GitHub Pages deployment" src="https://img.shields.io/github/actions/workflow/status/A3S-Lab/UI/pages.yml?branch=main&style=flat-square&label=pages"></a>
  <a href="./LICENSE.md"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-28a978?style=flat-square"></a>
</p>

## One visual language, from controls to workbenches

A3S UI turns the interaction patterns refined in A3S Office into reusable, semantic HTML. It combines Tailwind CSS v4, native browser elements, and small vanilla JavaScript controllers—without requiring React, Radix, or a framework runtime.

The system now exposes 111 public component contracts. Eighty-six general components cover controls, navigation, content, overlays, and product structure, while the 25-component Harness groups task, conversation, execution, review, evidence, file navigation, editing, terminal, log, and device-preview workflows for Coding Agents.

<p align="center">
  <a href="https://a3s-lab.github.io/UI/"><img src="./assets/readme/docs-home.png" alt="A3S UI Chinese documentation homepage with the Office Workbench component specimen" width="1280"></a>
</p>

## Start in three steps

Install the public package from npm:

```bash
npm install @a3s-lab/ui
```

Load Tailwind and the complete A3S bundle:

```css
@import "tailwindcss";
@import "@a3s-lab/ui";
```

Applications that do not run Tailwind can load the precompiled bundle instead:

```css
@import "@a3s-lab/ui/cdn.css";
```

Import the runtime only when the interface uses interactive composites:

```js
import "@a3s-lab/ui/all";
```

Then compose the interface with semantic markup:

```html
<header class="workspace-header">
  <div data-workspace-identity>
    <h1>Production gateway</h1>
    <span>Configuration saved</span>
  </div>
  <div data-workspace-actions>
    <button type="button" class="btn">Deploy</button>
  </div>
</header>
```

See the [installation guide](https://a3s-lab.github.io/UI/installation.html) for split CSS imports, controller-level JavaScript imports, and server-rendered templates.

## Component families

| Family               | Included patterns                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Input and actions    | Button, Button Group, Bulk Action Bar, Copy Button, Editable Text, Form, Field, Input, Input Group, Hotkey Input, Textarea, and Label                                                                                                                                                                                                                                                             |
| Selection and search | Native Select, Select, Combobox, Filter Bar, Date Picker, Color Swatches, Image Select, Emoji Picker, Checkbox, Radio Group, Switch, and Slider                                                                                                                                                                                                                                                   |
| Navigation           | Activity Bar, Breadcrumb, Back to Bottom, Tabs, Pagination, Sidebar, and Table of Contents                                                                                                                                                                                                                                                                                                        |
| Overlays             | Alert Dialog, Dialog, Drawer, Dropdown Menu, Context Menu, Popover, Floating Panel, Image Viewer, Command, and Tooltip                                                                                                                                                                                                                                                                            |
| Feedback and status  | Alert, Badge, Status Badge, Empty, Progress, Skeleton, Spinner, Streaming Text, and Toast                                                                                                                                                                                                                                                                                                         |
| Data and content     | Accordion, Collapsible, Avatar, Icon, File Type Icon, Image, Card, Item, Kbd, Markdown Surface, Highlighter, Code Diff, Snippet, Chart, Property List, Data Grid, Table, Sortable List, Stepper, Timeline, and Tree                                                                                                                                                                               |
| Layout and workspace | App Shell, App Page, Catalog, Setting Row, Brand Lockup, Workspace Header, Toolbar, Ribbon, Settings Layout, Resource Card, Split Pane, Task Pane, and Status Bar                                                                                                                                                                                                                                 |
| Harness              | Task Start, Task Workspace, Agent Composer, Agent Transcript, Agent Workbench, Context Selector, Message Status, Message Attachment, Message Citation, Follow-up Suggestions, Task Plan, Plan Step, Task Queue, Approval Request, Execution Item, Checkpoint, Tool Call, Change Review, Execution Evidence, Artifact Card, File Explorer, Code Editor, Terminal, Log Viewer, and Device Simulator |
| Utilities            | Scroll Area and Theme Switcher                                                                                                                                                                                                                                                                                                                                                                    |

Every component guide includes a live preview, minimal usage, public parameters, states and variants, and accessibility notes. Browse the [complete component catalog](https://a3s-lab.github.io/UI/components/).

## Design foundations

The A3S theme is a complete design system rather than a palette layered over unrelated controls:

- **Color** — white and near-black product surfaces with scarce iris focus, A3S brand blue, and reserved semantic states.
- **Typography** — application-first hierarchy with dense labels and readable long-form documentation.
- **Spacing** — a consistent rhythm for controls, panels, toolbars, and document canvases.
- **Shape and elevation** — restrained radii, borders, and shadows that preserve information density.
- **Motion** — short, purposeful transitions with reduced-motion support.
- **Accessibility** — semantic elements, explicit ARIA state, keyboard interactions, RTL-aware layout, and light/dark themes.

## Application-scale patterns and Harness

The task application layer is where A3S UI differs from a primitive-only kit:

```text
App Shell
├── Activity Bar
├── Workspace Header
├── App Page
│   ├── Catalog
│   └── Settings Layout + Setting Row
├── Resource Card + Split Pane + Task Pane
└── Status Bar

Harness
├── Task Start + Task Workspace
├── Agent Composer + Agent Transcript + Agent Workbench
├── Task Plan + Plan Step + Task Queue
├── Approval Request + Execution Item + Tool Call
├── Change Review + Execution Evidence + Artifact Card + Checkpoint
└── File Explorer + Code Editor + Terminal + Log Viewer + Device Simulator
```

These patterns are independently reusable, but their tokens and layout contracts are designed to compose into document editors, task workspaces, and observability consoles. The default task geometry uses a 248-pixel navigation region, a 760-pixel reading column, a 320–380-pixel optional inspector, 36-pixel controls, and 44-pixel coarse-pointer targets. Responsive navigation becomes a contained drawer below 768 pixels; inspectors become overlays below 900 pixels and bottom drawers below 520 pixels.

The bilingual pattern guides cover Task Workspace, New Task, Capability Catalog, Settings Center, Projects, and Automations. Applications continue to own repository, terminal, browser, transport, scheduling, persistence, and policy logic.

The standalone [Playground](https://a3s-lab.github.io/UI/playground.html) exercises eight complete workspace compositions across device sizes, recovery states, inspectors, dark mode, and RTL. It is a separate application route and does not appear in the documentation chapter hierarchy.

## Documentation languages and versions

The documentation site uses the same Rspress, React, and TypeScript stack as the A3S Code website. Simplified Chinese is the default language; every published version also provides English documentation.

| Version  | 简体中文                                               | English                                                   |
| -------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `next`   | [Default documentation](https://a3s-lab.github.io/UI/) | [English documentation](https://a3s-lab.github.io/UI/en/) |
| `v0.3.0` | [Stable Chinese](https://a3s-lab.github.io/UI/v0.3.0/) | [Stable English](https://a3s-lab.github.io/UI/v0.3.0/en/) |
| `v0.2.0` | [Stable Chinese](https://a3s-lab.github.io/UI/v0.2.0/) | [Stable English](https://a3s-lab.github.io/UI/v0.2.0/en/) |
| `v0.1.0` | [Stable Chinese](https://a3s-lab.github.io/UI/v0.1.0/) | [Stable English](https://a3s-lab.github.io/UI/v0.1.0/en/) |

Language and version switches preserve the current page whenever that route exists in the destination tree.

## Package entrypoints

| Import                              | Purpose                                                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `@a3s-lab/ui`                       | Complete default A3S CSS bundle                                                                                              |
| `@a3s-lab/ui/base`                  | Tokens, utilities, and structural component CSS without a visual style                                                       |
| `@a3s-lab/ui/components/{name}.css` | One component's structural CSS                                                                                               |
| `@a3s-lab/ui/styles/a3s.css`        | A3S visual foundation for split-import builds                                                                                |
| `@a3s-lab/ui/runtime`               | Shared lifecycle and controller registry                                                                                     |
| `@a3s-lab/ui/all`                   | Shared runtime plus all auto-initialized controllers except Chart                                                            |
| `@a3s-lab/ui/{controller}`          | One JavaScript controller, such as `app-shell`, `task-workspace`, `tabs`, `split-pane`, `code-editor`, or `device-simulator` |
| `@a3s-lab/ui/manifest`              | Machine-readable metadata for all 111 public components                                                                      |
| `@a3s-lab/ui/components.json`       | JSON component selectors, parts, actions, states, and test selectors                                                         |
| `@a3s-lab/ui/ai`                    | DOM annotation, discovery, selector, and snapshot helpers                                                                    |
| `@a3s-lab/ui/a3s-test`              | Ready-to-run deterministic workflow example                                                                                  |
| `@a3s-lab/ui/a3s-test/selectors`    | Component, part, action, ready, and state selector helpers                                                                   |
| `@a3s-lab/ui/react`                 | Optional thin React adapters and typed controller hooks; React remains a peer dependency                                     |
| `@a3s-lab/ui/vue`                   | Optional thin Vue adapters and typed controller composables; Vue remains a peer dependency                                   |
| `@a3s-lab/ui/templates/*`           | Nunjucks and Jinja templates for server-rendered applications                                                                |

The public runtime namespace is `window.a3sUI`. Legacy runtime aliases remain available for compatibility.

The optional semantic runtime annotates matching roots with `data-a3s-components`, parts with `data-a3s-parts`, exact part ownership with `data-a3s-part-owners`, and current state with `data-a3s-state`. It does not replace application behavior or introduce a framework runtime. See the bilingual [Integration guide](https://a3s-lab.github.io/UI/integration.html) for native HTML, React, Vue, and deterministic test examples.

React and Vue also expose `useA3SLocale`, `useA3STheme`, and `useA3SMotion`. These hooks and composables observe the same root `lang`, `dir`, `data-theme`, `.dark`, and media-query contract as native HTML; translation resources, persistence, and server negotiation remain application-owned.

The runtime also keeps open `[data-popover]` surfaces inside the visual viewport. Dropdown menus, popovers, selects, and comboboxes share collision flipping, constrained available height, live scroll/resize positioning, and logical RTL alignment.

## Development

```bash
npm ci
npm ci --prefix site
npm run build
npm run check:coverage:strict
npm run check:framework-docs
npm run check:boundaries
npm run check:package
npm run docs:build
npm run test:e2e:a3s:check
npx playwright install chromium
npm run test:visual
```

Run the documentation site locally with `npm run docs:dev`. The static build is written to `site/doc_build` and deployed to GitHub Pages from `main`.

Run the component-specific browser suites with `npm run test:e2e:a3s`. Scenarios run serially by default so stateful previews stay deterministic; set `A3S_TEST_MAX_PARALLEL` only when the browser adapter has enough isolated capacity. The command expects `a3s-test` on `PATH`; use `A3S_TEST_BIN`, `A3S_TEST_BROWSER_DRIVER`, and `A3S_TEST_BROWSER_EXECUTABLE` when a local adapter needs explicit paths.

Visual checks use Playwright with platform-specific desktop and compact baselines. Every public component route also has a component-root geometry and state contract plus browser diagnostic coverage. Set `A3S_UI_VISUAL_CHROMIUM_EXECUTABLE` to reuse a system Chromium installation and `A3S_UI_VISUAL_PORT` when the default local port is occupied; these checks are intentionally not part of CI.

## Lineage and license

A3S UI builds on [Basecoat](https://github.com/hunvreus/basecoat), created by [Ronan Berder](https://github.com/hunvreus), and retains its semantic HTML interpretation of the [shadcn/ui](https://ui.shadcn.com/) visual language. The A3S theme and workbench components extend that foundation for A3S products.

Released under the [MIT License](./LICENSE.md).
