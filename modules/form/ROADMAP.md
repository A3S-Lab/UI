# A3S Form Product Roadmap

A3S Form is a governed form engine for AI-native products. People and agents edit the same versioned contract, the compiler remains the semantic authority, and production side effects stay behind host-owned capabilities.

This roadmap describes product outcomes and release gates. It does not assign calendar dates. A milestone is complete only when its acceptance criteria pass in code, tests, documentation, and reference host examples.

## Product Scope

| Capability layer | A3S Form owns | Host platform owns |
| --- | --- | --- |
| **Form Core** | Schema profile, compilation, rules, validation, immutable plans, patches, revisions, and digests | Durable storage and distributed coordination |
| **Runtime** | Field state, rendering contracts, layouts, data-source and action ports, accessibility, and localization | Identity, authorization, secrets, network policy, and side effects |
| **Studio** | Visual design, preview, rule and integration configuration, diagnostics, and change review | Organization-specific catalogs and publishing policy |
| **Governance** | Draft/release contracts, diffs, provenance, approval hooks, and audit events | User directory, RBAC decisions, retention, and compliance storage |
| **Agent interface** | Inspect, propose, patch, simulate, validate, test, and publish request contracts | Model access, credentials, approval decisions, and execution policy |
| **Product services** | Stable integration contracts | Submissions, files, payments, email, webhooks, analytics, PDF generation, and connectors through trusted product hosts |

## Product Principles

1. **One semantic authority.** Designer, Renderer, CLI, Worker, and agents must use the same compiler and validation behavior.
2. **No silent support.** Every accepted schema keyword and rule kind must have defined runtime semantics. Unsupported input fails with an actionable diagnostic.
3. **No arbitrary code in documents.** Form definitions use bounded expressions and host-approved registry keys, never embedded JavaScript.
4. **Controlled data and side effects.** Values, persistence, credentials, authorization, and external actions remain host-owned.
5. **Reviewable agent changes.** Agents propose revision-bound patches. Simulation, policy checks, and approval precede publication.
6. **Complexity must be measurable.** Large-form performance, accessibility, browser parity, and migration compatibility are release gates.
7. **Embeddability is permanent.** Form Core has no platform dependency; UI adapters remain controlled; styles stay inside Form roots; the host owns persistence, identity, secrets, network policy, and side effects.

## v0.1 — Contract Foundation (Current)

The current release proves the architecture and embedding model:

- versioned `FormDocument`, deterministic compiler, immutable `FormPlan`, canonical SHA-256 digest, and bounded input limits;
- visual Designer with a component catalog, structure tree, nested layouts, drag and drop, preview, undo/redo, and custom-node registration;
- controlled React Renderer with native fields, layouts, primitive repeaters, validation summaries, host-resolved option sources, and host actions;
- React, React-backed Vue, and Web Component adapters;
- A3S Cloud and host interaction contracts with revision and digest pinning;
- revision-bound `FormPatch`, JSON CLI, compiler Worker, and the `$a3s-form` coding-agent skill;
- validated Designer import and export flow for embedding hosts.

Known boundaries are intentional roadmap inputs, not completed capabilities:

- the accepted JSON Schema 2020-12 subset is not yet enforced as a closed profile, so some unsupported keywords can be accepted without runtime validation;
- `visible`, `enabled`, and `validate` rules run today; `computed` exists in the protocol but does not yet have runtime evaluation semantics;
- data sources resolve option arrays, but dependency triggers, cache TTL, pagination, and first-class loading/error state are not implemented;
- repeaters contain primitive values rather than nested field groups;
- the runtime does not yet provide field-level subscriptions or a large-form performance contract;
- locale metadata does not yet provide complete translated content and runtime messages;

## v0.2 — Runtime Integrity

**Outcome:** every accepted contract feature behaves consistently in the compiler, browser runtime, Worker, CLI, and server-side validation.

### Current development baseline (unreleased)

- The native Rust Form Core and package-embedded WASM build are now the single semantic authority for browser, Node, Worker, CLI, and native compilation and submitted-value evaluation. Every result identifies the exact compiler revision, while former TypeScript implementations remain test-only behind byte-exact conformance fixtures.
- Host-neutral embedding, digest-pinned validation, controlled adapter parity, scoped CSS, and package budgets are implemented and covered by reference hosts.
- A3S Form Schema Profile 1 is enforced recursively. Unsupported keywords fail compilation; `const`, structural `enum`, `uniqueItems`, `additionalProperties`, and nine approved formats have runtime coverage.
- Computed fields use a stable topological order, bounded arithmetic and branching, stale-output removal, dependency failure propagation, and an opt-in value trace.
- Host-owned field and form validation is cancellable, rejects stale responses, maps server issues to stable codes, and has React, Vue, Web Component, Cloud, and workflow-host coverage.
- React Hook Form bindings and native Vue form, field, field-array, context, validation, submission, and Renderer composables now expose the same deterministic A3S Form Core semantics through optional package subpaths.
- Host-owned data sources now provide declared dependencies, mount/focus triggers, per-host TTL caching, in-flight deduplication, cancellation, debounced search, cursor pagination, strict response validation, and accessible loading/empty/error/retry states.
- Compiled field subscriptions now limit React updates to a field's own value, targeted rule dependencies, and declared data-source dependencies. Computed rules reuse cached outputs until those dependencies change.
- Runtime copy and synchronous validation use the versioned `a3s.dev/form-locale-catalog/v1` contract. English and Chinese ship with the package; React, Vue, Web Components, and Designer preview accept host overrides.
- CI now benchmarks compilation, validation, incremental evaluation, and server rendering for 100, 500, and 1,000-node forms against explicit budgets.
- The request-bound human-interaction v1 baseline binds WorkflowRun, Flow run/hook, step attempt, HumanTask, exact Form release, assignment policy, claimant, task version and time bounds, allowed outcomes, output mapping, idempotency, and canonical value digests. TypeScript and native Rust pass one shared golden fixture and reject adversarial JavaScript shapes.
- The versioned native evaluation protocol now normalizes computed output, validates Schema Profile 1 and business rules, applies locale overrides and wizard visibility, and returns deterministic traces and errors. Native Rust, WASM, the TypeScript reference, and the public Node adapter pass one canonical golden corpus byte for byte; durable interaction acceptance uses this path.
- Remaining v0.2 work is release hardening: Cloud/Flow compatibility review, final browser evidence, and package publication.

### Release-candidate capabilities

- Stabilize and publish **A3S Form Schema Profile 1** with its explicit keyword allowlist, canonical semantics, conformance fixtures, and diagnostics for every unsupported keyword.
- Publish host-neutral configuration forms with a configuration-mode `FormRef`, controlled values, locale/read-only context, and digest-pinned validation.
- Remove host-global CSS resets, enforce stylesheet size budgets, and keep A3S UI-compatible tokens scoped to Designer and Renderer roots.
- Align host-facing value, action, error, locale, read-only, adapter, widget, and node-registry capabilities across React, Vue, and Web Components.
- Stabilize the complete `visible`, `enabled`, `computed`, and `validate` rule runtime for release, including deterministic dependency evaluation, cycle diagnostics, and an inspectable execution trace.
- Stabilize and publish cancellable field-level and form-level asynchronous validation with stable server-error mapping.
- Stabilize and publish data-source dependencies and triggers, `cacheTtlMs`, request deduplication, debounce, cancellation, search, pagination, and loading/empty/error/retry states.
- Release field-level subscriptions and incremental rule evaluation so unrelated edits do not rerender or refetch unrelated nodes.
- Release versioned runtime locale catalogs and host overrides without serializing organization copy into form documents.
- Publish the repeatable compiler, validation, incremental-update, and render benchmark for 100, 500, and 1,000-node documents.

### Exit criteria

- Every schema keyword accepted by the compiler has browser/server validation parity; every other keyword is rejected.
- The tested reference host can render and commit a configuration form without importing product runtime services or global UI resets.
- Package checks reject global selectors and fail when the embedding stylesheet exceeds its raw or gzip budget.
- Computed-rule chains and rule failures have deterministic integration coverage.
- Editing an unrelated field neither refetches an independent data source nor rerenders unaffected field components.
- Request cancellation, stale responses, async validation races, and host failures have regression coverage.
- The performance suite runs in CI with an explicit regression budget.

## v0.3 — Complex Forms and Complete Studio

**Outcome:** product teams can author mainstream operational forms without raw JSON or application-specific forks.

### Current development baseline (unreleased)

- The compiler resolves object-array fields to concrete row paths and supports arbitrarily nested repeatable groups.
- React rows can be added, removed, and reordered with `minItems` and `maxItems` enforcement, concrete field errors, and responsive single-column fallback.
- Runtime-owned React keys preserve local field state without changing the controlled value. Documents may declare a required string `itemKey`, or hosts may derive identity with `identifyRepeaterItem`.
- Designer treats an object repeater as a real container: fields can be authored inside it, moved across scopes, duplicated with the complete item schema, and previewed without raw JSON editing.
- `scope: "row"` binds computed, validation, visibility, and enablement expressions to concrete nested rows. Global, enclosing-row, and current-row dependencies are checked by the compiler; execution traces, failures, and incremental caches remain isolated by concrete path.
- Data-source dependencies accept compatible row templates and Renderer requests expose the concrete node path, row indices, and dependency bindings without adding engine metadata to controlled values.
- Object repeaters can opt into `layout: "data-grid"`: direct field children render as a semantic table on desktop and labeled row cards in narrow embedded containers while preserving ordinary object-array values.
- Data-grid rows reuse stable runtime identity, add/remove/reorder controls, `minItems` and `maxItems`, row-scoped rules, validation, and host-owned data sources. Designer can create the complete grid schema and switch eligible object repeaters between card and table presentation.
- Data grids can opt into validated dialog drafts and stable multiple selection. Cancelled edits never change controlled values, same-row host replacements fail with an explicit conflict, and confirmed bulk deletion remains bounded by `minItems`.
- Data grids can opt into locale-aware single-column sorting and normalized cross-column filtering. Both remain local view state, preserve the controlled array order, keep inline rows stable during focused edits, expose a narrow-container sort control, and constrain select-all to visible rows.
- Data grids can append bounded TSV rows with schema-directed type conversion, explicit column order, preview, and atomic whole-array validation. Fill-down copies one editable column from the first visible selected row to the remaining visible selected rows, excludes filtered-out selections, and rejects stale host snapshots.
- Data grids can opt into measured row virtualization inside a bounded viewport. Server rendering emits a deterministic row window, desktop rows and narrow-container cards update from real measurements, complete view operations remain array-wide, and offscreen error navigation reveals the row before opening its dialog.
- Wizard and page layouts now provide visible-rule branches, progress, previous/next navigation, page-scoped synchronous and host validation, a localized review step, and earlier-page error recovery.
- Navigation checkpoints are controlled, pinned to the plan digest and revision, and forwarded across React, Vue, Web Components, and Designer preview without adding engine metadata to form values.
- The documented Organization onboarding form demonstrates a skipped branch, review flow, page validation, and host-controlled checkpoint updates.
- The committed A3S Test flow covers required-field focus, Enter-to-advance, personal and enterprise branches, page-scoped host validation, retained review values, review editing, semantic output, and desktop/390 px layouts in Chrome. Firefox/WebKit evidence and a formal WCAG 2.2 AA audit remain release work.
- The 23-widget built-in field catalog includes URL, phone, date-time, time, multi-select, single-choice matrix, multiple-choice matrix, tags, currency, rating, slider, hidden, and calculated widgets. Designer authors their matching schemas, Renderer preserves typed controlled values, and the Chinese MDX reference renders every field with its properties and usage contract.
- Designer settings are grouped by authoring task and limited to controls supported by the selected node. Each of the 38 production nodes now declares its label, category, purpose, common-setting order, advanced-setting order, and editor density in one UX profile registry. The inspector exposes typed defaults where the value contract permits them, uses the runtime's native UTC controls for date-time and time, switches option fields between static and host-owned sources, and widens structured, collection, and host editors without breaking compact panels. The complete catalog is exercised through an explicit 38-entry configuration contract and one authoring-to-runtime smoke matrix. Native controls and application panels use the published A3S UI toolbar, task-pane, tabs, accordion, item, badge, input, input-group, textarea, select, button, field, and fieldset contracts. Public Inspector primitives keep extension settings on the same A3S UI contract. Design previews use inert runtime components instead of washing every field out as disabled. Common copy and component behavior stay visible; component type, initial value, data binding, and placement remain in a compact advanced disclosure. Structured choice and matrix actions use low-density menus, repeaters expose authored runtime copy, column presets edit real ratios, and tabs, collapse panels, and wizard steps can be renamed, ordered, duplicated, removed, and opened from one manager while the final review step remains fixed.
- Catalog clicks now append to the root form in a predictable order, while drag and drop is reserved for exact nested placement. Data-grid drops reject non-field children before mutation, mobile Designer previews render columns as labeled cards, and Checkbox, Switch, Alert, Accordion, Field, and Table states remain owned by the published A3S UI package rather than duplicated Form CSS.
- The Chinese MDX reference renders every production field, scalar and object repeaters, grid, two-column, three-column, card, tabs, collapse, content, divider, spacer, wizard, file-upload, and signature component. A documentation coverage gate requires each node's own section to contain both a live MDX example and a property table.
- Single- and multiple-choice matrices use explicit typed rows and columns, exact object-Schema alignment, row-level errors, native keyboard semantics, per-row selection limits, and container-responsive table or card presentation.
- A committed A3S Test flow covers matrix controlled values, native radio keyboard behavior, multiple-choice limits, accessible names, the 390 px layout, and both generated documentation-version routes.
- The official file-upload extension keeps browser files, credentials, temporary URLs, and request state outside controlled values. A typed host service owns upload, deletion, optional opening, authorization, and storage while React manages bounded concurrency, progress, cancellation, retry, preflight checks, read-only behavior, and unmount cleanup.
- Designer authors the closed file-reference array Schema and upload settings. React, Vue, and Web Component regression coverage plus a live Chinese MDX reference define the properties, host contract, accessibility behavior, and security boundary.
- The official signature extension keeps normalized pointer strokes, typed signing names, previews, credentials, and request state outside controlled values. A typed host service owns save, atomic replacement, deletion, optional viewing, authorization, policy, and audit while the runtime provides bounded drawing, keyboard-accessible typed capture, cancellation, retry, conflict protection, read-only behavior, and unmount cleanup.
- Designer authors the closed single-reference array Schema and signature method settings. React, Vue, and Web Component regression coverage plus a live Chinese MDX reference define the value contract, host requests, properties, accessibility behavior, and security boundary.
- Host-owned file import/export remains planned work.

### Planned capabilities

- Extend the implemented nested repeatable-group and data-grid baseline with deeper object authoring.
- Stabilize multi-page forms and wizards with branching, progress, page validation, review steps, resumable checkpoints, cross-browser evidence, and WCAG coverage.
- Audited official extensions for address lookup, rich text, and CAPTCHA where host services or security policy are required.
- Visual editors for conditions, calculations, validation rules, data sources, actions, and payload mappings.
- Rule dependency visualization, sample-data simulation, execution tracing, and compiler diagnostics linked back to the relevant Studio control.
- Reusable fragments, nested form references, templates, design tokens, and theme configuration.
- Localized labels, descriptions, options, and validation messages with RTL support.
- Documented render and runtime budgets for React, Vue, and Web Components as the complex field set expands.
- WCAG 2.2 AA interaction baseline with automated accessibility and keyboard regression coverage.

### Exit criteria

- Onboarding, approval, order-entry, inspection, and survey reference forms can be built without editing raw JSON.
- A branched wizard can be paused and resumed without losing page or validation state.
- Complex array rows retain identity and field state through insert, move, and delete operations.
- All first-party fields pass the localization, keyboard, screen-reader semantics, and validation matrix.
- Visual rule configuration round-trips through the canonical document without semantic loss.

## v0.4 — Lifecycle, Collaboration, and Governance

**Outcome:** teams can safely evolve forms across environments while preserving history, active submissions, and policy decisions.

### Planned capabilities

- Separate mutable `FormDraft` from immutable `FormRelease`, with explicit publication and compatibility metadata.
- Version history with actor, timestamp, change note, structured diff, restore, rollback, and digest-pinned submission rendering.
- Environment promotion and approval hooks for development, test, and production.
- Host-neutral collaboration contracts for presence, locks, patch rebasing, and explicit conflict review. Realtime transport remains host-owned.
- Autosave, durable resume tokens, offline queues, idempotent synchronization, and conflict handling.
- Audit-event and policy-decision contracts for design, review, publish, data access, and action execution.
- PII classification, redaction hints, retention metadata, signed release artifacts, and version-pinned component/data-source registries.
- Migration tooling for standard JSON Schema plus supported Form.io, SurveyJS, and Formily subsets.

### Exit criteria

- Concurrent edits are either merged without loss or presented as explicit, reviewable conflicts.
- Restore and rollback create new history and never mutate an existing release.
- A submission can always render against its original form digest after later releases.
- Offline changes synchronize idempotently and never overwrite a newer draft silently.
- Every publish and privileged host action emits a complete, attributable audit event.

## v1.0 — AI-Native Production Contract

**Outcome:** A3S Form becomes the stable form contract shared by people, coding agents, A3S Cloud, and product hosts.

### Planned capabilities

- Stable v1 document, plan, patch, interaction, and release contracts with compatibility policy and migration tooling.
- Agent tools for `inspect`, `propose`, `diff`, `simulate`, `validate`, `test`, and policy-bound `publish` requests.
- Natural-language requests converted into bounded patches with a visual diff, rule explanation, risk report, generated fixtures, and regression tests.
- Change provenance covering actor, agent, model, reason, source revision, policy result, reviewer, and release digest.
- Reference A3S Cloud lifecycle integration for drafts, releases, permissions, audit, submissions, files, and analytics.
- Reference host integration for durable human tasks, approvals, timeouts, retries, and digest-pinned resumptions.
- Published conformance suite for third-party renderers, registries, host adapters, and migration tools.

### Exit criteria

- No v1 contract changes ship without a compatibility decision and migration path.
- An agent cannot publish or invoke privileged capabilities without an explicit host policy decision.
- Human and agent edits use the same compiler, simulation, test, review, and release path.
- The reference Cloud and Workflow integrations pass lifecycle, security, accessibility, performance, and recovery suites.

## Explicit Non-Goals

- A3S Form Core will not execute arbitrary JavaScript stored in a form document.
- A3S Form Core will not become a second identity, authorization, secrets, payment, submission, or analytics platform.
- A3S Form will not require A3S Cloud or another platform runtime in order to render or validate a form.
- The package will not claim full JSON Schema compatibility while unsupported keywords are ignored.
- Tabs will not be marketed as a replacement for a true multi-page or wizard runtime.
- Browser `localStorage` will not be presented as enterprise persistence, collaboration, or offline synchronization.

## Release Gates

Every milestone must include:

- focused unit and integration tests for modified behavior;
- browser and server conformance fixtures for shared semantics;
- A3S Test coverage for critical Designer-to-runtime workflows;
- accessibility, keyboard, performance, and failure-state checks appropriate to the milestone;
- an embedding conformance check covering controlled ownership, adapter parity, host CSS isolation, package budgets, and a neutral settings host;
- security-boundary review for every new registry, data source, action, file, or agent capability;
- documentation, runnable examples, and migration notes before a capability is marked stable.
