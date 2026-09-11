# Changelog

## Unreleased

## [0.4.1] - 2026-09-11

### Added

- Completed Windows **Verified** admission for all **116** public components with Playwright AT / forced-colors / true CSS zoom 200% coverage (`visual-tests/verified-gaps.visual.spec.ts`), focused A3S Test run evidence, and zoom proof PNGs.
- Added shared Playwright CSS-zoom helpers (`visual-tests/page-zoom.ts`) and style-pack path resolution for Windows hosts.

### Changed

- Remaining harness/runtime components (Task Workspace, Agent Transcript/Workbench, Approval Request, Execution Item, Settings Layout, Task Pane/Plan, Plan Step, Message Status/Attachment/Citation, Artifact Card, Context Selector, Task Queue, Checkpoint, Follow-up Suggestions, Tool Call/Timeline/Result, Change Review, Terminal, Execution Evidence, File Explorer/Manager, Knowledge Library, Code Graph, Device Simulator) reached **Verified** via `visual-tests/verified-gaps.visual.spec.ts` plus existing focused A3S Test evidence.
- Bulk Action Bar, Color Swatches, Image Select, and Data Grid reached **Verified** via `verified-gaps.visual.spec.ts` plus focused A3S Test runs `a3s-test-27492-1` / `a3s-test-30964-1` / `a3s-test-29472-1` / `a3s-test-10704-1`.
- Markdown Surface, Scroll Area, Log Viewer, Code Editor, Hotkey Input, Brand Lockup, and Split Pane reached **Verified** after closing CSS-zoom proof capture (local demo `zoom` + document overflow check) via `verified-gaps.visual.spec.ts`, with focused A3S Test evidence including `a3s-test-2888-1` / `a3s-test-32424-1` / `a3s-test-4852-1`.
- Icon, Image, File Type Icon, Highlighter, Snippet, Streaming Text, Theme Switcher, Sortable List, Code Diff, Image Viewer, Emoji Picker, Toolbar, Ribbon, Status Bar, Setting Row, Resource Card, and Workspace Header reached **Verified** via `visual-tests/verified-gaps.visual.spec.ts` plus focused A3S Test evidence (including `a3s-test-15868-1` / `a3s-test-15020-1`).
- Accordion, Collapsible, Item, Alert Dialog, Dropdown Menu, Command, Back to Bottom, Table of Contents, Floating Panel, Context Menu, Form, Editable Text, Date Picker, Alert, Badge, Status Badge, Spinner, Skeleton, Table, Property List, Stepper, Timeline, Kbd, and Avatar reached **Verified** via `visual-tests/verified-gaps.visual.spec.ts` (72/72 wave-3) plus focused A3S Test evidence including `a3s-test-31668-1` / `a3s-test-24300-1` / `a3s-test-32048-1` and prior focused runs for the rest of the batch.
- Tabs, Toast, Progress, Empty, Dialog, Drawer, Popover, Tooltip, Breadcrumb, Pagination, Sidebar, Card, Tree, and Activity Bar reached **Verified** via `visual-tests/verified-gaps.visual.spec.ts` (42/42 wave-2) plus focused A3S Test runs `a3s-test-29780-1` / `a3s-test-9156-1` / `a3s-test-20660-1` / `a3s-test-29892-1` / `a3s-test-12004-1` / `a3s-test-26480-1` / `a3s-test-31596-1` / `a3s-test-15064-1` / `a3s-test-30412-1` / `a3s-test-23208-1` / `a3s-test-30040-1` / `a3s-test-24024-1` / `a3s-test-32620-1` / `a3s-test-24664-1`. CSS zoom scroll now uses Playwright `scrollIntoViewIfNeeded`; Tree zoom proof targets the visible `[data-tree-row]`.
- Label, Checkbox, Radio Group, Switch, Slider, Select, Native Select, Combobox, Copy Button, and Filter Bar reached **Verified** via `visual-tests/verified-gaps.visual.spec.ts` (30/30) plus focused A3S Test runs `a3s-test-16784-1` / `a3s-test-15772-1` / `a3s-test-22784-1` / `a3s-test-32084-1` / `a3s-test-14596-1` / `a3s-test-27400-1` / `a3s-test-4212-1` / `a3s-test-11620-1` / `a3s-test-15536-1` / `a3s-test-1012-1`.
- Button (`IA-01`), Button Group (`IA-02`), Field (`IA-07`), Input (`IA-08`), Textarea (`IA-11`), and Input Group (`IA-09`) reached **Verified** on the Windows docs web surface with Playwright zoom/AT/forced-colors coverage, proof PNGs under `temp/verified-proof/`, and A3S Test runs `a3s-test-29028-1` / `a3s-test-19552-1` / `a3s-test-16564-1` / `a3s-test-32712-1` / `a3s-test-32092-1` / `a3s-test-5148-1`. Docs Button async save timer lengthened to 3500ms so disabled-repeat clicks are not raced.
- Sidebar (`NV-06`) demos now use scoped primary markers and toggle controls; docs preview installs native-only `data-preview-onclick` / `data-preview-onchange` so toggle-style demos no longer double-fire. Deterministic A3S Test run `a3s-test-30636-1` captures desktop toggle, state matrix, and 390px Chinese Escape restore evidence.
- Alert Dialog (`OV-01`) ACL now covers cancel-first focus, trigger restore, open/closed state matrix, and 390px Chinese destructive confirmation; deterministic A3S Test run `a3s-test-28932-1` captures the evidence bundle.
- Dialog (`OV-02`) ACL now covers profile edit, Escape restore, open/closed state matrix, and 390px Chinese editing; deterministic A3S Test run `a3s-test-28892-1` captures the evidence bundle.
- Drawer (`OV-03`) demos now use scoped primary markers plus trigger/cancel/submit controls; deterministic A3S Test run `a3s-test-16220-1` captures desktop Escape restore, state matrix, and 390px Chinese cancel evidence.
- Dropdown Menu (`OV-04`) demos now use scoped item markers; deterministic A3S Test run `a3s-test-15260-1` captures Profile select, disabled API, Escape restore, state matrix, and 390px Chinese logout evidence.
- Popover (`OV-06`) demos now use scoped primary/field markers with localized Chinese copy; deterministic A3S Test run `a3s-test-4768-1` captures autofocus edit, Escape restore, state matrix, and 390px Chinese evidence.
- Command (`OV-09`) demos now use scoped primary/input/item markers; deterministic A3S Test run `a3s-test-20060-1` captures Calendar filter, disabled Calculator, empty recovery, state matrix, and 390px Chinese settings evidence.
- Tooltip (`OV-10`) demos now use scoped primary/trigger markers with localized Chinese copy; deterministic A3S Test run `a3s-test-11076-1` captures hover/focus, state matrix, and 390px Chinese evidence.
- Context Menu (`OV-05`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-25808-1` captures nested Diff View select, Watch preserve, Escape restore, state matrix, and 390px Chinese open evidence.
- Activity Bar (`NV-01`) demos now use scoped primary/item markers, live status, and compact icon-only rail; docs preview updates current destination status on activation. Deterministic A3S Test run `a3s-test-14960-1` captures the evidence bundle.
- Breadcrumb (`NV-02`) demos now use scoped primary/link/current markers; deterministic A3S Test run `a3s-test-4772-1` captures desktop ancestor focus, state matrix, and 390px Chinese path evidence.
- Pagination (`NV-05`) demos now use scoped primary markers with live status; docs preview syncs `aria-current` with outline/ghost variants and previous/next. Deterministic A3S Test run `a3s-test-13824-1` captures the evidence bundle.
- Back to Bottom (`NV-03`) demos now use scoped primary markers with live status; deterministic A3S Test run `a3s-test-9760-1` captures unread clear, state matrix, and 390px Chinese evidence.
- Floating Panel (`OV-07`) demos now include reopen triggers and live status; deterministic A3S Test run `a3s-test-20844-1` captures close/reopen, state matrix, and 390px Chinese evidence.
- Table of Contents (`NV-07`) demos now use scoped primary/item markers with localized Chinese labels; deterministic A3S Test run `a3s-test-24180-1` captures location updates, state matrix, and 390px Chinese evidence.
- Toast (`FB-09`) demos now use scoped primary/toaster markers with live status; deterministic A3S Test run `a3s-test-11356-1` captures create/dismiss, state matrix, and 390px Chinese evidence.
- Card (`DC-07`) demos now use scoped primary/field/action markers with live status; deterministic A3S Test run `a3s-test-20388-1` captures login readiness, state matrix, and 390px Chinese review evidence.
- Tree (`DC-21`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-25180-1` captures hierarchy/selection, state matrix, and Chinese localization evidence.
- Alert (`FB-01`) demos now use scoped primary/item markers; deterministic A3S Test run `a3s-test-2156-1` captures success/info variants, state matrix, and 390px Chinese evidence.
- Accordion (`DC-01`) demos now use scoped primary/item markers; deterministic A3S Test run `a3s-test-26436-1` captures keyboard disclosure, state matrix, and 390px Chinese evidence.
- Progress (`FB-05`) demos now include complete/reset controls with live status; deterministic A3S Test run `a3s-test-25064-1` captures value sync, state matrix, and 390px Chinese evidence.
- Empty (`FB-04`) demos now use scoped primary/action markers with create status; deterministic A3S Test run `a3s-test-13516-1` captures recovery activate, state matrix, and 390px Chinese evidence.
- Status Badge (`FB-03`) demos now use scoped primary/item markers for all five states; deterministic A3S Test run `a3s-test-25200-1` captures state matrix and 390px Chinese labels.
- Item (`DC-08`) demos now use scoped primary/action markers with live status; deterministic A3S Test run `a3s-test-16976-1` captures action activate, state matrix, and 390px Chinese evidence.
- Spinner (`FB-07`) demos now use scoped primary markers with localized Chinese loading copy; deterministic A3S Test run `a3s-test-7536-1` captures state matrix and 390px Chinese evidence.
- Table (`DC-17`) demos now use scoped primary/caption markers; deterministic A3S Test run `a3s-test-23648-1` captures scroll readability, state matrix, and 390px Chinese evidence.
- Collapsible (`DC-02`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-24192-1` captures keyboard disclosure, state matrix, and 390px Chinese evidence.
- Property List (`DC-15`) demos now use scoped primary/property markers; deterministic A3S Test run `a3s-test-24696-1` captures metadata pairs, state matrix, and 390px Chinese evidence.
- Stepper (`DC-19`) demos now use scoped primary/step markers; deterministic A3S Test run `a3s-test-22608-1` captures stages, state matrix, and 390px Chinese evidence.
- Timeline (`DC-20`) demos now use scoped primary/event markers; deterministic A3S Test run `a3s-test-29228-1` captures history stages, state matrix, and 390px Chinese evidence.
- Badge (`FB-02`) demos now use scoped primary/item markers; deterministic A3S Test run `a3s-test-13284-1` captures variants, state matrix, and 390px Chinese evidence.
- Skeleton (`FB-06`) demos now use scoped primary markers with busy labels; deterministic A3S Test run `a3s-test-29304-1` captures state matrix and 390px Chinese evidence.
- Avatar (`DC-03`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-30064-1` captures imagery, state matrix, and 390px Chinese evidence.
- Kbd (`DC-09`) demos now use scoped primary/chord markers; deterministic A3S Test run `a3s-test-21120-1` captures tokens, state matrix, and 390px Chinese evidence.
- Icon (`DC-04`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-24740-1` captures named graphic, state matrix, and 390px Chinese evidence.
- Scroll Area (`UT-01`) demos now use scoped primary/viewport markers; deterministic A3S Test run `a3s-test-7344-1` captures keyboard scroll, state matrix, and 390px Chinese evidence.
- Theme Switcher (`UT-02`) demos now use scoped primary markers with `data-preview-onclick`; deterministic A3S Test run `a3s-test-20048-1` captures site toggle, state matrix, and 390px Chinese evidence.
- Image (`DC-06`) demos now use scoped primary/caption markers; deterministic A3S Test run `a3s-test-31480-1` captures alt/caption, state matrix, and 390px Chinese evidence.
- Chart (`DC-14`) demos now mark primary Chart.js figures; deterministic A3S Test run `a3s-test-17996-1` captures canvas summary, state matrix, and 390px Chinese evidence.
- Streaming Text (`FB-08`) demos now use scoped primary markers with localized Chinese stream copy; deterministic A3S Test run `a3s-test-30944-1` captures streaming/complete/paused/error matrix and 390px Chinese evidence.
- Markdown Surface (`DC-10`) demos now use scoped heading/code/callout markers; deterministic A3S Test run `a3s-test-2888-1` captures focus path, state matrix, and 390px Chinese evidence.
- Snippet (`DC-13`) demos now use scoped primary markers with localized Chinese copy label; deterministic A3S Test run `a3s-test-30492-1` captures copy action, state matrix, and 390px Chinese evidence.
- Sortable List (`DC-18`) demos now use scoped primary markers with localized Chinese items; deterministic A3S Test run `a3s-test-30644-1` captures keyboard reorder, state matrix, and 390px Chinese evidence.
- Code Diff (`DC-12`) demos now use scoped primary/scroller markers with localized Chinese caption; deterministic A3S Test run `a3s-test-11144-1` captures addition/removal focus, state matrix, and 390px Chinese evidence.
- Highlighter (`DC-11`) demos now use scoped primary/mark markers with localized Chinese mark copy; deterministic A3S Test run `a3s-test-30852-1` captures focus path, state matrix, and 390px Chinese evidence.
- File Type Icon (`DC-05`) demos now use scoped primary markers with localized Chinese accessible names; deterministic A3S Test run `a3s-test-27860-1` captures type cue, state matrix, and 390px Chinese evidence.
- Image Viewer (`OV-08`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-30388-1` captures zoom-in, open/closed/loading matrix, and 390px Chinese evidence.
- Brand Lockup (`LW-05`) demos now use scoped primary/home/compact markers; deterministic A3S Test run `a3s-test-26392-1` captures identity focus, ready matrix, and 390px Chinese evidence.
- Setting Row (`LW-04`) demos now use scoped primary/row markers; deterministic A3S Test run `a3s-test-4488-1` captures language/theme controls, state matrix, and 390px Chinese evidence.
- Resource Card (`LW-10`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-15680-1` captures document focus, state matrix, and 390px Chinese evidence.
- Status Bar (`LW-13`) demos now use scoped primary/saved markers; deterministic A3S Test run `a3s-test-31668-1` captures zoom keyboard path, state matrix, and 390px Chinese evidence.
- Message Status (`HR-07`) demos now use scoped primary/retry markers; deterministic A3S Test run `a3s-test-20592-1` captures streaming/sent/error, state matrix, and 390px Chinese evidence.
- Workspace Header (`LW-06`) demos now use scoped primary/Deploy markers; deterministic A3S Test run `a3s-test-17744-1` captures identity focus, state matrix, and 390px Chinese evidence.
- Toolbar (`LW-07`) demos now use scoped primary markers with `data-preview-onclick` Bold toggle; deterministic A3S Test run `a3s-test-31288-1` captures pressed state, state matrix, and 390px Chinese evidence.
- Message Attachment (`HR-08`) demos now use scoped primary/remove markers; deterministic A3S Test run `a3s-test-2868-1` captures complete/upload actions, state matrix, and 390px Chinese evidence.
- Message Citation (`HR-09`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-21088-1` captures prose focus, state matrix, and 390px Chinese evidence.
- Ribbon (`LW-08`) demos now use scoped primary/tab markers; deterministic A3S Test run `a3s-test-23848-1` captures Insert→Review keyboard path, ready/disabled matrix, and 390px Chinese tabs.
- Settings Layout (`LW-09`) demos now use scoped primary/nav markers with localized Chinese nav; deterministic A3S Test run `a3s-test-17840-1` captures nav focus, ready/loading/error matrix, and 390px Chinese evidence.
- Split Pane (`LW-11`) demos now use scoped primary/separator markers; deterministic A3S Test run `a3s-test-4852-1` captures ArrowRight resize, ready/disabled matrix, and 390px Chinese separator label.
- Task Pane (`LW-12`) demos now use scoped primary/paper markers; deterministic A3S Test run `a3s-test-23448-1` captures paper select, overlay + state matrix, and 390px Chinese 页面设置.
- Task Plan (`HR-11`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-29916-1` captures Pause → paused, state matrix, and 390px Chinese 发布计划.
- Plan Step (`HR-12`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-12524-1` captures open checks, state matrix, and 390px Chinese evidence.
- Artifact Card (`HR-20`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-3032-1` captures open action, state matrix, and 390px Chinese 发布就绪报告.
- Checkpoint (`HR-16`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-27504-1` captures Restore → restoring, state matrix, and 390px Chinese evidence.
- Follow-up Suggestions (`HR-10`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-28188-1` captures selection, state matrix, and 390px Chinese evidence.
- Tool Call (`HR-17`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-8396-1` captures Stop → interrupted, lifecycle matrix, and 390px Chinese evidence.
- Tool Call Timeline (`HR-26`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-32468-1` captures expand/collapse, state matrix, and 390px Chinese evidence.
- Tool Result (`HR-27`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-32508-1` captures Output/Metadata tabs, state matrix, and 390px Chinese evidence.
- Context Selector (`HR-06`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-29420-1` captures model select, state matrix, and 390px Chinese 运行时发布.
- Approval Request (`HR-14`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-21920-1` captures session-scope approve, state matrix, and 390px Chinese evidence.
- Execution Item (`HR-15`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-24560-1` captures Stop → cancelled, state matrix, and 390px Chinese evidence.
- Task Queue (`HR-13`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-23056-1` captures queue interaction, state matrix, and 390px Chinese evidence.
- Change Review (`HR-18`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-22604-1` captures review action, state matrix, and 390px Chinese evidence.
- Execution Evidence (`HR-19`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-31088-1` captures open report, state matrix, and 390px Chinese evidence.
- App Shell (`LW-01`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-15652-1` captures collapse/compact drawer, state matrix, and 390px Chinese open-nav.
- App Page (`LW-02`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-30504-1` captures New project, state matrix, and 390px Chinese evidence.
- Catalog (`LW-03`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-31272-1` captures Development filter, state matrix, and 390px Chinese evidence.
- Task Start (`HR-01`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-24624-1` captures suggestion apply, state matrix, and 390px Chinese evidence.
- Task Workspace (`HR-02`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-6780-1` captures Attach, state matrix, and 390px Chinese evidence.
- Agent Composer (`HR-03`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-4948-1` captures Stop → ready, state matrix, and 390px Chinese evidence.
- Agent Transcript (`HR-04`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-12060-1` captures jump-to-latest, state matrix, and 390px Chinese evidence.
- Agent Workbench (`HR-05`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-8248-1` captures build release, state matrix, and 390px Chinese evidence.
- Terminal (`HR-23`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-16180-1` captures copy status, state matrix, and 390px Chinese evidence.
- Log Viewer (`HR-24`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-30340-1` captures stderr filter, state matrix, and 390px Chinese evidence.
- Code Editor (`HR-22`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-29436-1` captures edit path, state matrix, and 390px Chinese evidence.
- File Explorer (`HR-21`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-26352-1` captures filter/rename, state matrix, and 390px Chinese evidence.
- File Manager (`HR-28`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-8508-1` captures Quick Look, state matrix, and 390px Chinese grid metadata.
- Knowledge Library (`HR-29`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-12052-1` captures select/detail, state matrix, and 390px Chinese evidence.
- Code Graph (`HR-30`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-12004-1` captures list fallback, state matrix, and 390px Chinese evidence.
- Device Simulator (`HR-25`) demos now use scoped primary markers; deterministic A3S Test run `a3s-test-10788-1` captures shell/orientation, state matrix, and 390px Chinese evidence.
- AI docs runtime (`a3s-ui.ai.js`) is now a self-contained Windows-safe bundle (CRLF-tolerant `createRuntimeBundle`); docs no longer request missing `/assets/manifest/index.js`.
- Playwright visual style-pack fixtures use `fileURLToPath` via `visual-tests/style-pack-path.ts` so Windows hosts load `dist/basecoat-*.cdn.css` correctly. Button desktop-1280 suite is green (7/7), including forced-colors and compatibility packs.
- Select (`SS-02`) demos now cover named trigger keyboard selection with live status, typeahead Escape cancel, disabled-option skipping, invalid/disabled presentation, and Chinese confirmation; docs preview binds Select `change` status on `[data-select-primary-demo]`. Deterministic A3S Test run `a3s-test-17856-1` captures the evidence bundle.
- Label (`IA-12`) demos now cover wrap click-to-check, for/id association focus, required marker, and disabled presentation; deterministic A3S Test run `a3s-test-25248-1` captures desktop association/state-matrix and 390px Chinese wrap evidence.
- Combobox (`SS-03`) ACL now covers Astro filter/select, empty-search Escape recovery, disabled/invalid presentation, state matrix, and 390px Chinese selection; deterministic A3S Test run `a3s-test-26772-1` captures the evidence bundle.
- Switch (`SS-11`) demos now cover live toggle status, deterministic remote accept/reject restore, disabled reason, and Chinese phone activation; docs preview binds native `data-preview-onchange`. Deterministic A3S Test run `a3s-test-29968-1` captures the evidence bundle.
- Slider (`SS-12`) demos wrap localized primary markers; deterministic A3S Test run `a3s-test-15600-1` captures Home/End unit-aware keyboard, RTL mapping, state matrix, and 390px Chinese evidence.
- Filter Bar (`SS-04`) ACL now covers required chip-removal fallback, compound search clear, state matrix, and 390px Chinese reset; deterministic A3S Test run `a3s-test-27076-1` captures the evidence bundle.
- Tabs (`NV-04`) ACL now covers Home/End panel switching, disabled-tab skip, state matrix, 390px Chinese activation, and RTL wrap; deterministic A3S Test run `a3s-test-9612-1` captures the evidence bundle.
- Date Picker (`SS-05`) demos now cover min/max, leap day, empty/overflow recovery, disabled/readonly availability, and Chinese confirmation via locale-safe date fixtures; docs preview binds `data-preview-onsubmit` / `data-preview-onclick` natively. Deterministic A3S Test run `a3s-test-26824-1` captures the evidence bundle.
- Emoji Picker (`SS-08`) demos now cover searchable selection with live status, empty recovery, and disabled availability; deterministic A3S Test run `a3s-test-16548-1` captures desktop filter/select/empty/state-matrix and 390px Chinese evidence.
- Checkbox (`SS-09`) demos now cover channel toggling with disabled lock, live indeterminate select-all, and confirmation invalid/success/reset; deterministic A3S Test run `a3s-test-7696-1` captures the evidence bundle.
- Form (`IA-06`) docs demos now exercise summary validation, duplicate-submit protection (`aria-busy` + disabled submit), success retention, reset, and read-only presentation; deterministic A3S Test run `a3s-test-25412-1` captures desktop invalid/success/state-matrix and 390px Chinese evidence.
- Editable Text (`IA-05`) adds `data-editable-required` / `data-editable-save-delay`, `aria-busy` while saving, and EN/ZH primary demos; deterministic A3S Test run `a3s-test-4728-1` covers Escape cancel, empty rejection, async save, state matrix, and 390px Chinese commit.
- Copy Button (`IA-04`) rejects empty sources, blocks repeat while copying, and ships EN/ZH primary/empty demos; deterministic A3S Test run `a3s-test-25524-1` covers keyboard copy, empty error, reset, state matrix, and 390px Chinese feedback.
- Wave 0 Demote framing: README moves Spinner and Scroll Area into compatibility recipes; EN/ZH guides state React/Vue exports are aliases until the next major, and Scroll Area copy no longer calls utility classes a “component.”
- Theme Switcher publishes canonical `.theme-switcher` (with `[data-a3s-theme-toggle]` alias) in the manifest, runtime recognition, and next EN/ZH docs.

## [0.4.0] - 2026-09-10

### Added

- Published `@a3s-lab/ui@0.4.0` to the public npm registry and created the `v0.4.0` GitHub release.
- Integrated the complete Form source, deterministic Rust/WASM core, Designer, Renderer, durable interaction contracts, CLI, and Cloud adapter into `@a3s-lab/ui/form`; added React Hook Form bindings and native Vue composables with shared A3S Core validation; and moved every current Form guide and interactive example into the A3S UI component catalog without a separate Form site or demo route.
- Added bilingual persistent current-task sessions to the product application, preserving composer context, follow-ups, recent-task navigation, recovery states, and task artifacts across route changes and refreshes.
- Added the complete Dockview 8.1 MIT integration through native, React, and Vue entrypoints, including Dockview, Gridview, Splitview, Paneview, the A3S light/dark theme, versioned layout persistence, framework hooks, bilingual MDX guides, and a real dockable Playground workspace.
- Added framework-agnostic Agent Composer, Agent Transcript, Execution Item, and Approval Request contracts with responsive, accessible, bilingual documentation.
- Added production File Manager and Knowledge Library contracts with multi-selection, search, views, preview, indexing phases, recovery, cancelable host authorization, generated React/Vue hooks, bilingual documentation, and Playground compositions.
- Added App Page, Task Start, Task Workspace, Catalog, and Setting Row contracts plus complete Task Workspace, New Task, Capability Catalog, Settings Center, Projects, and Automations composition guides.
- Added Task Plan, Plan Step, Message Status, Message Attachment, Message Citation, Artifact Card, Context Selector, Task Queue, Checkpoint, Follow-up Suggestions, Tool Call, Change Review, Terminal, and Execution Evidence contracts.
- Added the root `DESIGN.md` contract for task-centered application geometry, typography, color, elevation, responsive behavior, and component states.
- Added a machine-readable 116-component manifest, DOM semantic runtime, optional React and Vue adapters, package-isolated adapter verification, and one deterministic component scenario per public guide.
- Added 22 product-admitted contracts for code and Markdown reading, images, compact selection, inline editing, reusable forms, navigation recovery, floating inspection, sorting, and streaming output, with split CSS, controllers where behavior is required, and bilingual React and Vue guidance.
- Added Device Simulator with phone, tablet, desktop, custom-size, orientation, URL navigation, iframe preview, and a cancelable structured event for trusted `a3s-webview` hosts.
- Added the Harness documentation and manifest category for task, conversation, execution, review, evidence, and developer-tool components.
- Added owned-part, per-action, per-state, and ready selectors plus an importable selector helper for deterministic browser tests.
- Added clean semantic HTML generation, native source disclosure, syntax highlighting, copy feedback, and keyboard operation to every bilingual MDX preview.
- Added all-export SSR, TypeScript consumer, and isolated client-mount checks for the React and Vue adapters, including refs, readiness callbacks, semantic annotations, and controller initialization.
- Added route-level geometry, state, and browser diagnostic regression coverage for every public component guide.
- Added package-owned App Shell navigation and Task Workspace inspector controllers with responsive ARIA/inert synchronization, Escape and backdrop dismissal, focus return, public methods, events, and split imports.
- Added Data Grid, Filter Bar, Context Menu, Bulk Action Bar, and File Explorer with selection, sorting, keyboard menus, responsive records, file state, bilingual guides, and split controller imports.
- Added a standalone bilingual `/playground` route for exercising eight complete workspace compositions across desktop, tablet, phone, recovery, inspector, dark-theme, and RTL states without placing it in the documentation hierarchy.
- Added `useA3SLocale`, `useA3STheme`, and `useA3SMotion` to both framework packages, with shared root-DOM state, media-query observation, typed setters, lifecycle cleanup, and bilingual runtime-configuration guidance.
- Added strict evidence validation for all 160 pinned reference mappings, including bilingual component guides, framework usage, applicable hooks, ownership boundaries, official identity, and the standalone Playground route.
- Added one substantive product requirements document and deterministic A3S Test mapping for every public component, Playground export, and Harness or Playground surface: 230 PRDs backed by the checked ACL inventory.

### Changed

- Feedback Empty and Table e2e scenarios wait for complete preview readiness and target Empty’s primary recovery button before focus evidence, reducing long-suite race failures without softening visibility asserts.
- Code workbench keyboard save marks the public editor clean immediately on `a3s:code-save`, and the workspace intake e2e refocuses the editor before Ctrl+S so dirty→clean evidence does not race suite load.
- Dialog and Drawer contract scenarios refocus the open surface before Escape so dark/compact close waits do not hang after screenshots move focus.
- React and Vue adapters now lazy-load `basecoat.js` plus only the controller for the mounted slug instead of `js/all.js`, with a generate-time guard against regressing to the full bundle.
- Resolved Wave 0 public-contract contradictions: Spinner and Scroll Area docs now state they are presentation utilities; Radio Group and Theme Switcher use canonical roots (`.radio-group` / `[data-a3s-theme-toggle]`) without incidental `data-slot` or onclick-string selectors; style packs and radio/card CSS drop `data-slot` leakage.
- Popover open/close no longer interpolates opacity or scale. Closed surfaces use `visibility` only (opacity stays 1) with `transition: none !important`, and documentation `prepare:assets` mirrors CSS/JS into `doc_build/` so rspress preview e2e does not keep a stale stylesheet.
- Dropdown menu ignores synthetic `click` events (`detail === 0`) after Enter/Space so keyboard open no longer immediately toggles closed.
- Overlay documentation previews keep the top inset on `.a3s-preview__canvas` instead of stage padding so near-miss pointer clicks no longer hit an empty stage dead zone above the control.
- Pagination live previews use buttons for in-page page selection so keyboard activation matches the documentation demo contract without hash navigation.
- App Shell compact navigation no longer fades opacity while opening; discrete open/closed state uses clip-path and visibility so assistive and test clients do not race partial opacity.
- Scroll Area documentation previews keep the overflow host focusable (`tabindex="0"`) and document that keyboard scrolling requires a focusable host.
- File Explorer starts inline rename with **F2** on the focused or selected item (in addition to Context Menu), avoiding Chromium’s habit of stealing Shift+F10 for browser chrome under CDP.
- Navigation and documentation overlay e2e contracts prefer focus + Enter/Space (and scoped preview-control selectors) so a3s-test CDP hit-target near-misses do not overfit the product to pointer geometry.
- Phone-width preview tooling asserts a framed `iframe[title$='phone preview']` instead of a demo-specific title string that drifts when preview content changes.
- File Manager root keyboard handling no longer steals Enter/Space from toolbar actions, view toggles, or search fields; listbox shortcuts still apply when focus is on a file item.
- Playground Product Application compact shell state also tracks `resize`, `visualViewport`, and document `ResizeObserver` updates so CDP viewport overrides still synchronize sidebar `inert`.
- Playground route contracts wait for compact closed/open navigation state after viewport and keyboard open instead of one-shot expects that race React commit.
- Product task-creation evidence prefers keyboard activation for composer controls with stable CSS targets, and waits for settings dialog sections before appearance changes.
- Input Group focus-boundary evidence fills the current documentation placeholder (`Project name or repository path`); Dock workspace evidence targets the `explorer` panel id.
- Application-utilities Code Graph and Tool Result evidence prefer focus + Enter/ArrowRight with waits instead of CDP click/`End` paths that near-miss or race tab selection.
- Component-contract generation avoids nested `:has()` inside `:has()` (invalid CSS) by using descendant selectors for qualified state specimens, and Tree expanded/collapsed evidence matches `treeitem` aria-expanded state on the public root.
- Documentation preview appearance control always forces an explicit dark preview from inherit (instead of the opposite of the site theme), so dark/RTL contract evidence is theme-invariant.
- Transient Dialog/Drawer/Toast public-root activation in component contracts uses focus + Enter on `button.btn[data-preview-onclick]` instead of role()-targeted focus or CDP click near-misses.
- Input Group state-matrix detail expects use the specimen description/error nodes (`data-input-group-state-*`) rather than a non-existent feedback attribute.
- Component-contract open/expanded/collapsed evidence matches real specimen DOM: Accordion uses `details[open]`, Collapsible uses relative `> summary`, Combobox uses `input[role=combobox]`, and application shells use stamped `data-a3s-state` when triggers live outside the public root.
- Bulk Action Bar empty evidence asserts `hidden` instead of `visible` on the intentionally hidden region.
- Bulk Action Bar loading specimens stamp conflicting actions `disabled` while keeping clear operable, even when cloned roots lack controller methods.
- Drawer public-root evidence waits on the open drawer's content panel (`> article`), matching Dialog, so `[open]` alone cannot race a not-visible dialog root.
- Feedback Toast dismissal evidence targets cancelable created toasts only, so the durable state-matrix specimen in the same toaster cannot false-fail dismiss.
- Data Grid sort evidence uses focus + Enter instead of CDP click for ascending/descending toggles.
- Documentation responsive language/version navigation uses focus + Enter so sticky chrome left by prior theme scenarios cannot intercept CDP clicks.
- Product action-icon evidence waits for the start composer after mail/inspiration handoff, and assistant picker options assert expert avatars instead of a generic assistant glyph.
- Capability navigation evidence waits on catalog tab URL state and focus restoration after destructive confirmation cancel, instead of racing CDP tab clicks and immediate `:focus` expects.
- Project asset PDF readiness waits on the office host ready marker and page-number field presence; React controlled inputs do not expose a reliable `value` attribute for CSS matching.
- Mobile project PDF page changes poll the page-number field after EmbedPDF finishes navigation (async), prove the selected thumbnail while the drawer is reopened, then restore page one through the page-number field because previous/next page steppers are intentionally hidden under the mobile overflow menu.
- Memory evolution graph evidence keeps the wide desktop reading-pane inspector (no compact dismiss control), asserts selection copy, and leaves compact inspector dismiss coverage to the dedicated mobile/compact scenarios.
- Code Graph React mounts no longer hardcode `data-view="graph"`, so the controller-owned list/graph view survives parent re-renders.
- Code Editor compact framing evidence measures the visible phone preview shell after scroll-into-view, at a compact viewport height that can geometrically admit ≥75% coverage.
- Copy Button state-matrix specimens keep copy semantics and stamp `aria-busy` for copying; Toast live previews mount a durable `.toast` source for state acceptance.
- Browser driver function keys (`F1`–`F24`) and `ContextMenu` now emit non-zero Windows VK codes, and non-printable presses use CDP `rawKeyDown`.

- Narrowed Button Group to its first-principles responsibility of joining peer actions: React and Vue now emit the same named `div[role="group"]`, constrained text labels wrap without page overflow, split-menu triggers expose stable active-item semantics, and bilingual docs, PRD detail, state specimens, and Playwright/A3S Test coverage now share the same focus and ownership contract.
- Composed the public Code Editor into the Playground file workbench and the public Log Viewer into session execution records, including real edit, find, format, preview, save, ordered-stream, and copy-feedback paths instead of detached showcase-only examples.
- Established `apps/desktop` as the sole owner of product routing, persistence, permissions, domain state, and orchestration; A3S UI now limits Playground work to deterministic integration fixtures and reuses the public Artifact Card, Highlighter, Copy Button, File Explorer, Code Diff, Device Simulator, and Code Graph contracts instead of maintaining parallel implementations.
- Rebuilt the Playground task-detail overview on the public Task Pane, Task Plan, Plan Step, Property List, and Status Badge contracts; replaced the mobile dashboard-card stack with a dense divider-led inspector and added the reusable plain Task Plan variant.
- Refined the Playground project Plan into a dense status-grouped work surface with reference-aligned scope and view controls, actionable empty groups, controlled assignee/date/density options, deterministic task identifiers, one-row mobile actions, and host-owned saved-view requests.
- Completed the Playground collaborative-document connection lifecycle with explicit permission consent, browser persistence, bounded connection feedback, storage-failure recovery, task-context handoff, and a focus-restoring disconnect confirmation across desktop and mobile layouts.
- Completed the Playground agent-mailbox path with browser-persisted activation, explicit permission disclosure, recoverable storage and clipboard feedback, a focus-restoring disconnect confirmation, and a truthful handoff that attaches the mailbox to a new task.
- Rebuilt the Playground capability catalog around scenario-led assistant discovery, rotating skill recommendations, dense connector browsing, stable visual identities, focus-contained detail dialogs, reviewed setup lifecycles, and direct handoff into a new task across desktop, mobile, dark mode, and both locales.
- Unified every component Preview's HTML, React, and Vue guidance into one compact code workspace with a copyable install row and entry/example file tabs.
- Integrated the persistent HTML, React, and Vue quick start into the first live Preview of all 116 bilingual component guides and all four Harness layout guides, so installation, setup, highlighted examples, framework hooks, source disclosure, and current-example copying share one 14px frame; variant previews remain scoped to their authored HTML, and no detached framework surface remains.
- Retired the standalone Patterns documentation chapter across current and historical version trees; reusable contracts remain under Components and Harness, while app-scale compositions remain in Playground.
- Rebuilt Playground Automations around predictable next-run timestamps, anchored and time-zoned schedules, persisted model/effort/permission boundaries, truthful per-run steps and durations, recoverable filtered retries, manual execution while schedules are paused, and focus-safe compact navigation.
- Rebuilt Playground Memory as a traceable, human-reviewed workflow with real scope and type filtering, relationship zoom, durable candidate acceptance, source evidence, reversible removal requests, mobile detail drawers, settings ownership, and task-context reuse.
- Rebuilt Playground knowledge management around source roots and indexed-item counts, with validated source creation, recoverable disconnects that retain workspace files, per-source reindexing, keyboard-complete detail tabs, and retry completion that reconciles every source state.
- Rebuilt Playground Inspiration as a screenshot-led four-column masonry library with coherent filters and favorites, a centered single-task detail dialog, responsive embedded previews, and a tested handoff that retains the selected template in the task composer.
- Reordered bilingual documentation navigation by learning dependency—Guide, Foundations, Components, Harness, then Playground—and kept Resources last while limiting each stable version to sections it actually publishes.
- Replaced the legacy workspace-composition Playground with a bilingual task-first product application that unifies durable sessions, project work, the production composer, execution review, local files and editors, Knowledge, Memory, extensions, automations, and settings under canonical `/playground` routes.
- Rebuilt model settings as a production configuration workspace with host-managed and custom providers, connection fields, credential visibility, model capabilities and limits, default selection, staged save/reset behavior, and compact-screen operation without inventing vendor-specific models.
- Rebuilt the project workspace as a complete task surface with Activity, Plan, Tasks, and Assets views, scoped filtering and search, project configuration, collaboration state, and a context-aware TipTap composer; widened the application shell and conversation geometry for production-scale work.
- Rebuilt documentation previews around centered-control, flowing-content, bounded-overlay, and edge-to-edge-workspace layouts; phone and tablet controls now use isolated CSS viewports so responsive media queries evaluate against the selected width.
- Reworked Device Simulator previews with scaled phone, tablet, and desktop hardware shells while preserving exact iframe viewport dimensions, orientation, and native preview arguments.
- Rebuilt the documentation theme around Rspress routing with Chinese as the default language, page-preserving language and version switching, an official A3S logo, and first-load navigation that works before hydration.
- Reorganized the bilingual documentation into eight responsibility-based general-component groups and seven workflow-stage Harness groups.
- Added a first-principles product admission gate to `DESIGN.md`, separating durable components from extracted patterns, compositions, and rejected application-specific implementations.
- Deepened Data Grid, Filter Bar, Context Menu, Bulk Action Bar, and File Explorer with cancelable precondition hooks, controlled snapshots, source-aware completion events, asynchronous recovery, read-only behavior, filtering, and reversible inline rename.
- Aligned the bilingual foundation guides, Theme Customizer, actions, fields, choice controls, tabs, overlays, application chrome, and documentation previews with the Playground neutral surface system, 6/8/10/14-pixel radii, neutral primary commands, A3S OS blue interaction states, and 120/160/220-millisecond motion system; canonical component-family styles now remain authoritative over the earlier Office refinement layer.
- Exposed Tabs, Alert Dialog, Dialog, Drawer, Dropdown Menu, and Popover controller methods through the manifest and generated React hooks and Vue composables.

### Removed

- Removed the standalone Workflow documentation group, its DAG editor and node catalog, the associated React APIs and styles, package entry points, examples, tests, PRDs, deterministic suites, and generated routes.

### Fixed

- Code Editor A3S Test scenarios wait on `domcontentloaded` plus Monaco/workbench readiness instead of `networkidle`, because Monaco workers keep the network active after first paint and caused false page-ready timeouts.
- Button duplicate-protection evidence targets the busy control with an explicit click after native `disabled` drops keyboard focus, instead of pressing Enter on whichever element inherited focus.
- Popovers open instantly (no enter opacity/visibility animation) and no longer toggle `visibility`, so open state is observable as soon as `aria-hidden` becomes false.
- Toast open is immediate: removed the off-viewport `toast-up` entrance so a newly created toast is observable as soon as it is announced (exit may still collapse with reduced-motion awareness).
- Replaced generic action glyphs in the Playground workspace file manager with a coherent folder and file-family icon system, readable extension labels, consistent grid/list/Quick Look identity, and compact six-column desktop and two-column mobile layouts.
- Positioned conditionally mounted, already-open popovers through the shared collision runtime, keeping Composer file, model, assistant, and connector panels fully inside short desktop viewports while preserving mobile bottom sheets; compacted short mobile suggestion lists, corrected context-sensitive keyboard guidance, added explicit panel dismissal, and restored each control trigger after Escape.
- Kept Code Graph labels inside the visible canvas when narrow inspectors or phone viewports leave insufficient room on a node's preferred side.
- Compressed project Activity into actor-action-target rows, kept supporting detail assistive-only, replaced removable configuration categories with host-owned configuration requests, and made the phone configuration inspector cover inactive application chrome.
- Replaced saturated and double-layer search focus rings with one container-owned neutral boundary across the public Input Group, documentation catalog, and every Playground search field; added focused desktop and phone regression evidence for each surface.
- Hardened Bulk Action Bar and Data Grid focus recovery so clear, pending completion, and rejected batch operations preserve the original selection snapshot, honor host redirects, and return to the explicit target or the Data Grid select-all control without leaving focus on hidden actions; added long-copy, 390/320px, dark RTL, and ACL regression evidence.
- Aligned documentation Preview and Playground action icons with their next operation: fluid width no longer masquerades as a desktop preset, appearance and direction controls expose their target state, secret visibility uses eye/eye-off, and graph expansion uses expand/contract semantics.
- Replaced the decorative Color Swatches selection halo with a bounded selected surface and consolidated floating utility shadows onto the shared overlay depth token.
- Kept all canonical buttons, fields, choice controls, menus, tabs, and navigation rows at 44-pixel targets for coarse pointers by applying input-method guarantees after every visual family.
- Replaced the nested solid outline in the Playground composer with a restrained focus boundary on the compound control while preserving a visible keyboard focus state.
- Extended the shared visual quality floor to all 116 documented components, corrected compact File Manager and Knowledge Library composition, and restored production-sized targets for labels, ranges, Data Grid selection, Setting Row switches, and Agent Composer status controls.
- Kept project configuration and artifact inspectors visible when the primary canvas remains wide enough, while presenting them as focus-contained, Escape-dismissible drawers before application chrome makes the task area unreasonably narrow; mobile asset selection now owns the bottom action slot without leaving covered composer controls operable.
- Simplified project task rows to title, status, collaborators, progress, and one truthful navigation action; mobile task filters now meet the 44-pixel target, and full-screen project inspectors no longer expose inactive application chrome behind their modal focus boundary.
- Added a sidebar-anchored capability chooser with shared URL and page-tab state, complete arrow-key navigation, Escape focus return, outside dismissal, and responsive bilingual behavior.
- Connected project cards to dedicated bilingual project-workspace and child-session routes, kept project context current in the sidebar, and added production checks for conversation search, TipTap input, artifact inspection, desktop, mobile, and dark appearance.
- Kept session-detail routes focused on the conversation, moved generated files into an in-context artifact inspector with responsive and keyboard-complete behavior, and preserved legacy workspace URLs as session aliases.
- Made responsive primary, resource, language, and version navigation progressively operable before hydration, and removed legacy Playground selectors that conflicted with the dockable responsive workspace.
- Made nested documentation sidebar disclosures operable before hydration through native details and summary semantics at every hierarchy level.
- Kept Agent Composer status synchronization idempotent so its DOM observer cannot enter a self-triggering loop that freezes Playground and other composed surfaces after hydration.
- Distinguished the site navigation from embedded workspace navigation with unambiguous accessible names and responsive navbar-to-Playground regression coverage.
- Kept assistant output open on the task canvas, flattened embedded execution disclosures, removed active-navigation side stripes, and synchronized homepage, package, framework, and site counts with the 116-component contract while preserving historical version counts.
- Made component-specific browser scenarios serial by default to prevent shared-browser resource contention from introducing nondeterministic control-state failures.
- Separated File Manager grid identity from file type at compact widths, removed comparison-only metadata from constrained grid cards, and added deterministic geometry assertions for grid metadata and the compact project-assets sticky header.
- Made the project asset preview follow the native dialog close lifecycle so Escape restores the exact file trigger and subsequent search input cannot enter a browser key-event loop.
- Made compact project and task inspectors restore their exact trigger focus without depending on animation-frame scheduling, so Escape remains deterministic in background and automated browser contexts.
- Preloaded the project asset workspace's current Document and PDF previewers on entry, retained per-file pointer and focus intent preloading, and moved dialog focus restoration to an unthrottled post-commit microtask so cold loads and keyboard dismissal remain deterministic across pointer and touch input.
- Restored automation editor and compact run-detail triggers through unthrottled post-commit focus handoffs, keeping Cancel and Back deterministic in background browser contexts.

- Deferred the A3S component runtime until React has hydrated live previews, preventing Combobox initialization from causing recoverable hydration errors and client-side re-rendering.
- Removed decorative overlay blur, restored a visible line-tab indicator and checkbox indeterminate state, and documented framework controller usage with tested method unions and runtime calls.
- Restored A3S OS blue as the default action, focus, link, and selection theme in light and dark modes; kept violet as an optional persisted accent; and added A3S Test visual acceptance for desktop, mobile, reset, focus, and cross-route persistence.
- Kept nested Agent Composer editors shrinkable and internally scrollable when hosts add intermediate wrappers or long unbroken input text.

## [0.3.0] - 2026-08-12

### Added

- Published `@a3s-lab/ui@0.3.0` to the public npm registry and created the `v0.3.0` GitHub release.
- Added Agent Workbench, Log Viewer, Property List, Status Badge, and Timeline contracts extracted from A3S agent execution, build, evidence, status, and event-stream surfaces, with responsive CSS and bilingual documentation.
- Added Brand Lockup and Stepper contracts extracted from shared A3S identity and bounded process-path surfaces, with responsive CSS, bilingual documentation, and browser regression coverage.
- Added a first-class Tree component with hierarchical selection, expandable branches, RTL-aware keyboard navigation, typeahead, disabled-item handling, split CSS and JavaScript entrypoints, and bilingual documentation.
- Added a framework-agnostic Code Editor with native editing fallback, line and cursor status, indentation shortcuts, JSON validation, read-only state, and a public value API.
- Added a bilingual, interactive Monaco workbench example with multi-file models, A3S ACL language services, TypeScript and JSON diagnostics, command and bottom panels, responsive layout, and synchronized themes.

### Fixed

- Preserved localized JSON error positions when newer browser engines omit numeric offsets from `JSON.parse` error messages.
- Made horizontally overflowing Stepper and bounded Log Viewer regions keyboard-scrollable with visible focus treatment, exposed log filter state with `aria-pressed`, corrected the 60-component homepage count, and restored catalog links for both utility components.
- Unified Radio selection and focus visuals, made joined Button Group inputs share one focus boundary, and replaced machine-translated Chinese component terminology with standard UI language.

## [0.2.1] - 2026-08-08

### Added

- Published `@a3s-lab/ui@0.2.1` to the public npm registry and created the `v0.2.1` GitHub release.

### Fixed

- Kept Input Group as the single focus and validation boundary when direct input, textarea, or select children retain their standalone control classes.

## [0.2.0] - 2026-08-07

### Added

- Published `@a3s-lab/ui@0.2.0` to the public npm registry with validated exports and tarball contents.

### Changed

- Aligned Breadcrumb, Tabs, Pagination, and Sidebar with compact Office navigation geometry, bounded single-row overflow, 32-pixel pagination commands, and a 240-pixel mobile drawer specimen.
- Aligned Ribbon, Task Pane, Status Bar, and the homepage workbench specimen with the A3S Office geometry: 36-pixel tabs, a 74-pixel command panel, 320–380-pixel task panes, responsive pane overlays, and a fixed 28-pixel status edge.
- Aligned App Shell, Activity Bar, Workspace Header, and Toolbar geometry with A3S Office: a 46-pixel collapsed rail, 34-pixel navigation commands, a fixed 50-pixel title bar, and a 43-pixel toolbar with 29-pixel commands.
- Replaced the flat component directory and page outline with localized, keyboard-operable disclosure groups that keep the active category and section immediately available.
- Raised shared A3S secondary-text and semantic-status tokens to WCAG AA contrast in light and dark themes, established 12-pixel compact and 11-pixel micro type floors, and strengthened focus and validation states.
- Preserved compact desktop controls while providing 44-pixel form, button, tab, and sidebar targets for coarse pointers and intentional reduced-motion feedback.
- Raised documentation metadata contrast, minimum text sizes, and primary touch-target sizes while preserving the compact A3S Office visual language.
- Moved the component catalog directly after the homepage hero, collapsed the optional product preview on mobile, and replaced repeated section numbering with clearer topic labels and an editorial principles layout.

### Fixed

- Restored the Native Select chevron through Office hover, dark, and RTL states; aligned the Radio Group preview with Office field spacing and typography; and kept preselected MDX form controls interactive.
- Corrected Card interior spacing, Toast layout and lifecycle behavior, and Switch thumb travel across desktop, touch, and RTL states.
- Corrected RTL tab arrow order, kept long breadcrumbs and tablists inside their own scroll boundaries, and synchronized Sidebar focus, dismissal, and independent desktop/mobile state across its breakpoint.
- Kept dropdown menus, popovers, selects, and combobox lists inside the visual viewport with shared collision flipping, logical RTL alignment, constrained available height, and live scroll/resize repositioning.
- Contained the compact App Shell drawer inside its shell, removed its closed state from pointer and keyboard interaction, restored focus on Escape, and prevented mobile documentation typography from leaking into component previews.
- Added localized open and close states, focus entry and return, and explicit panel ownership to the mobile primary navigation.
- Removed closed mobile documentation navigation and outlines from the accessibility tree, added focus entry and return behavior, and supported Escape dismissal.
- Made the mobile documentation search control keyboard accessible with a localized label and a 44-pixel target.
- Kept the hydrated Rspress theme context authoritative while preserving the pre-hydration A3S theme bridge.
- Corrected nested homepage landmarks and headings, and removed non-functional specimen controls from keyboard and assistive-technology interaction paths.
- Added explicit, recoverable feedback when copying the installation command fails.

## [0.1.0] - 2026-08-04

### Added

- Added the A3S visual foundation and application-scale components for activity bars, application shells, workspace headers, toolbars, ribbons, settings layouts, resource cards, and resizable split panes.
- Added Task Pane and Status Bar component contracts, bilingual documentation, and application-shell examples.
- Added package entrypoints for the complete A3S theme, individual component CSS, and the Split Pane controller.
- Added a Rspress documentation site with Chinese as the default language, English localization, `next` and `v0.1.0` version switching, design foundations, grouped component APIs, and live previews.
- Added GitHub Pages deployment for the versioned documentation site.
- Added Playwright visual regression coverage for the Office workbench, Ribbon, Task Pane, and Status Bar at desktop and compact breakpoints.
- Added built-site regression checks for preview layer ordering, refreshed theme tokens, and homepage interaction semantics.
- Added a persistent homepage theme customizer for appearance, accent, radius, and interface density.
- Added component-specific A3S Test E2E scenarios for every documented component.
- Added precompiled CSS package entrypoints for consumers that do not run Tailwind.

### Changed

- Rebranded the package as `@a3s-lab/ui` and made the complete A3S style bundle the default export.
- Aligned the A3S theme's tokens, control density, interaction states, overlays, data displays, and application patterns with the A3S Office visual language.
- Migrated the documentation build from Astro and ReallySimpleDocs to the same Rspress, React, and TypeScript stack used by the A3S Code website.
- Rebuilt the repository homepage around public A3S UI components so its responsive, interactive Office Workbench specimen exercises the package contract directly.
- Refined the A3S light and dark palettes with a clearer primary action hierarchy and more cohesive product surfaces.
- Reworked the documentation homepage into a focused product overview with an interactive install command.
- Re-aligned the A3S foundation and documentation surfaces with the exact neutral palette, action hierarchy, density, radii, and elevation tokens used by A3S Office.
- Exposed the public JavaScript lifecycle through `window.a3sUI` and the `@a3s-lab/ui/runtime` package entrypoint while retaining legacy compatibility internally.
- Removed upstream branding from the public website and made documentation demos use A3S UI runtime names and local image assets.

### Fixed

- Fixed the Rspress mobile language selector collapsing to zero height and overlapping the version selector.
- Prevented Rspress's inactive search listener from intercepting Enter on interactive controls, and made theme controls keyboard accessible with localized labels.
- Fixed collapsed App Shell layouts retaining the activity-bar column at compact breakpoints.
- Fixed Rspress reset-layer ordering and documentation prose styles overriding live component previews.
- Fixed documentation asset compilation on Windows with Node.js 24 by invoking the Tailwind CLI through Node directly.
- Fixed narrow-screen overflow in documentation content and improved dark-theme contrast for the homepage call to action.
- Made documentation theme switching pre-hydration safe, restored the Rspress bootstrap after the component runtime script, and kept a user-visible switch at common desktop widths.
- Removed the remaining Rspress overflow ancestor and promoted open MDX preview popovers without relying solely on `:has()`, preventing selects, comboboxes, and dropdown menus from being clipped or painted below following content.
- Replaced the non-executing Progress demo script, removed the inactive HTMX Toast control, added a contained Sidebar preview, and identified the current Pagination page accessibly.

## [1.0.2] - 2026-07-06

### Added

- Added `data-size="sm"` support to Alert Dialog for the compact upstream size.

### Changed

- Removed global font smoothing from Basecoat's package CSS so `antialiased` remains an application-level choice.

## [1.0.1] - 2026-06-28

### Added

- Added explicit `force: true` support to `window.basecoat.init()` and `window.basecoat.initAll()` for rehydrating restored DOM after framework or navigation cache restores.

### Fixed

- Reinitialized Basecoat components after HTMX history restores in the docs site.

## [1.0.0] - 2026-06-27

### Breaking Changes

- Removed the CLI workspace from the repo. Template files now ship with `basecoat-css` under `templates/nunjucks` and `templates/jinja`; copy them from `node_modules/basecoat-css/templates/*` instead of installing `basecoat-cli`.

### Added

- Added Nunjucks and Jinja template files to the `basecoat-css` package.
- Added a custom docs 404 page for Cloudflare static asset fallback.

### Changed

- Narrowed dark-mode generated selectors to `html.dark` to reduce broad style recalculation work.
- Switched the docs site to Astro's sitemap integration and updated `robots.txt` to point at the generated sitemap index.

### Fixed

- Updated Scroll Area examples to use Card surfaces so framed examples inherit style-pack radius and border treatment.

## [1.0.0-beta.7] - 2026-06-25

### Added

- Added a beta Drawer component with native `<dialog>` markup, side placement, animated close behavior, backdrop and Escape handling, style-pack visuals, JavaScript entrypoints, and docs.

### Changed

- Updated the docs dependency to `reallysimpledocs@^1.0.2`.
- Marked Chart and Drawer as beta components in the docs navigation.
- Promoted the Chart docs warning from alpha to beta.
- Updated installation CDN examples for `basecoat-css@1.0.0-beta.7`.

### Fixed

- Aligned Drawer examples more closely with upstream shadcn/ui while avoiding Chart API coupling in Drawer docs.

## [1.0.0-beta.6] - 2026-06-23

### Changed

- Updated docs dependency to the published `reallysimpledocs@1.0.0-beta.5` package.
- Refined component documentation examples across the docs site, including Select, Table, Tabs, Switch, and Theme Switcher.
- Clarified CDN and npm installation guidance for default and named style bundles.
- Updated Table examples to avoid inline overlay menus inside scrollable table containers and documented the overflow limitation.

### Fixed

- Fixed dark-mode unchecked Switch thumb colors across all style packs to match upstream shadcn/ui behavior.

## [1.0.0-beta.5] - 2026-06-22

### Added

- Added a dedicated Accordion component with native `<details>` markup, single-item JavaScript behavior, `data-multiple`, disabled item handling, style-pack spacing, and docs.
- Added a dedicated Breadcrumb component with semantic `nav`/`ol` markup, style-pack visuals, collapsed and dropdown examples, and docs.
- Added documented Card action support with `.card-action`.
- Added Combobox clear button, popup trigger, and input-group support, with docs aligned to upstream examples.

### Fixed

- Fixed Combobox single selection reopening immediately after selection and filtering the reopened list to the selected value.
- Improved Combobox multiple chips and remove buttons to match style-pack button sizing more closely.

## [1.0.0-beta.4] - 2026-06-20

### Changed

- Renamed the compact scrollbar utility from `scrollbar-thin` to `scrollbar-sm`; `scrollbar-thin` remains available through the compatibility stylesheet.

## [1.0.0-beta.3] - 2026-06-20

### Breaking Changes

- Changed Button, Badge, Card, Avatar, and Alert visual APIs to use a canonical root class plus data attributes instead of composed visual classes. For example, use `class="btn" data-variant="outline"`, `class="badge" data-variant="secondary"`, `class="card" data-size="sm"`, `class="avatar" data-size="lg"`, and `class="alert" data-variant="destructive"`. Legacy aliases are available only through the optional compatibility stylesheet.
- Changed icon-only Button sizing from `data-icon="only"` plus optional `data-size` to upstream-aligned `data-size="icon|icon-xs|icon-sm|icon-lg"`.

### Added

- Added an opt-in `basecoat-css/compat` stylesheet for pre-1.0 default Basecoat class aliases.
- Added an optional Chart.js helper with `window.basecoat.chart()`, chart CSS, generated tooltips, generated legends, and docs.
- Added shared Alert action layout support for direct child `<footer>` action regions.
- Added dedicated Avatar and Avatar Group component styles and docs.
- Added dedicated Progress component styles and docs with label, controlled, and RTL examples.

## [1.0.0-beta.2] - 2026-06-14

### Breaking Changes

- Removed the `.form` convenience selector for Basecoat 1.0. Use explicit component classes (`label`, `input`, `textarea`, `select`) or compose fields with `.field` / `.fieldset`.
- Changed Combobox markup and behavior to an input-first structure. The visible input now filters options, the hidden input stores the submitted value, single select stores the selected value, and multiple select stores a JSON array.
- Removed Combobox `data-multiple`; use `aria-multiselectable="true"` on the Combobox listbox, matching Select.
- Changed Command markup to the migrated Basecoat structure: `.command-dialog` wraps `.command`, the search input lives in the command header, and items use role-based menu markup with `role="menuitem"`.
- Removed Combobox-specific search-header behavior from Select. Use the dedicated Combobox component for editable/filterable selection.
- Removed built-in document command events for Toast, Sidebar, and Theme. Use element methods instead: `toaster.toast(config)`, `sidebar.open()`, `sidebar.close()`, `sidebar.toggle()`, and `window.basecoat.theme.*`.
- Reworked style loading for style packs. Non-default styles are standalone bundles and should not be loaded on top of the default/Vega bundle.

### Added

- Added standalone style packs: Vega, Nova, Maia, Lyra, Mira, Luma, Sera, and Rhea.
- Added dedicated Empty component styles and docs.
- Added dedicated Item component styles and docs.
- Added dedicated Input Group component styles and docs.
- Added dedicated Spinner docs and examples using `animate-spin` and `size-4` patterns.
- Added style-specific package entrypoints such as `basecoat-css/nova` and styleless base entrypoints for custom themes.
- Added `window.basecoat.refresh(element)` as a generic dispatcher for components that expose `refresh()`.
- Added `refresh()` methods to Command, Select, Combobox, Dropdown Menu, and Tabs for dynamic child lists.
- Added method APIs for Sidebar, Toast, and Theme.
- Added `data-format="object"` to Select and Combobox for opt-in hidden input serialization as `{ value, label }` objects.
- Added `selected` details to Select and Combobox change events and JavaScript properties.
- Added `data-filter="manual"` to Command and Combobox for app-owned remote or local-search result filtering.

### Changed

- Changed `window.basecoat.init(name)` and `window.basecoat.initAll()` to initialize uninitialized components only, instead of forcing global reinitialization.
- Added internal destroy hooks for JavaScript components so removed component roots clean up event listeners and runtime state.
- Reworked component CSS so shared component files own structure and behavior hooks while style-pack files own visual treatment.
- Updated Button, Button Group, Input, Textarea, Select, Combobox, Command, Dialog, Dropdown Menu, Popover, Field, Tabs, Table, Card, Alert, Badge, Kbd, Label, Skeleton, Radio, Switch, Empty, Item, and Input Group toward current shadcn/ui styles.
- Split Native Select documentation from custom Select documentation.
- Updated docs to use Basecoat-specific HTML usage instead of React/shadcn composition APIs.
- Updated docs site styling, navigation, fonts, and style switcher for the 1.0 style system.
- Migrated the docs build to ReallySimpleDocs/Astro while keeping Basecoat's Nunjucks source examples as a pre-render step.
- Changed docs build scripts so local Basecoat package assets are generated before ReallySimpleDocs resolves `basecoat-css`.

### Removed

- Removed the old Form component page. Form layout should now be composed with Field, Fieldset, Input, Textarea, Select, Native Select, Checkbox, Radio, and Switch.

### Fixed

- Fixed destructive Alert descriptions/content using muted text instead of destructive text across all style packs.

### Migration Notes

To keep the previous `.form` wrapper behavior, define it in your own Tailwind CSS:

```css
.form label {
  @apply label;
}
.form input {
  @apply input;
}
.form textarea {
  @apply textarea;
}
.form select {
  @apply select;
}
```

To keep the previous document-event command APIs, add bridge listeners in your app:

```js
document.addEventListener("basecoat:toast", (event) => {
  document.getElementById("toaster")?.toast(event.detail?.config || {});
});

document.addEventListener("basecoat:sidebar", (event) => {
  const sidebar = document.getElementById(event.detail?.id || "sidebar");
  const action = event.detail?.action || "toggle";
  if (["open", "close", "toggle"].includes(action)) sidebar?.[action]();
});

document.addEventListener("basecoat:theme", (event) => {
  const mode = event.detail?.mode;
  mode ? window.basecoat.theme.set(mode) : window.basecoat.theme.toggle();
});
```
