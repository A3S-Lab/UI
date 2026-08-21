---
name: a3s-form
description: Inspect, validate, compile, diff, and safely update A3S FormDocument JSON through the deterministic a3s-form CLI. Use when creating or changing A3S forms, reviewing AI-generated FormPatch operations, diagnosing compiler diagnostics, producing pinned FormRef metadata, or preparing forms for A3S Workflow and A3S Cloud.
---

# A3S Form

Use the `a3s-form` CLI as the authority for document semantics. Do not infer validity from JSON shape alone.

## Workflow

1. Run `a3s-form validate <form.json> --pretty` before editing.
2. Read [references/contract.md](references/contract.md) only when authoring schema, UI nodes, rules, or patches.
3. Keep the host boundary intact: never place credentials, arbitrary code, remote component URLs, persistence, or side effects in a form document.
4. Prepare changes as a typed `FormPatch` bound to the current `revision`. Add field preconditions for changes that could overwrite human edits.
5. Run `a3s-form patch <form.json> <patch.json> --output <candidate.json> --pretty`.
6. Run `a3s-form validate <candidate.json> --pretty` and inspect every diagnostic.
7. Run `a3s-form diff <form.json> <candidate.json> --pretty` so the user can review the exact bounded change.
8. Replace the original only after validation succeeds and the requested change is fully represented.

## Commands

```text
a3s-form validate form.json --pretty
a3s-form compile form.json --output plan.json --pretty
a3s-form digest form.json
a3s-form diff before.json after.json --output change.patch.json --pretty
a3s-form patch form.json change.patch.json --output candidate.json --pretty
a3s-form sample --output form.json --pretty
```

All commands emit JSON. Artifact-producing commands write the document, plan, or patch directly so the output can be used by the next command. Treat exit code `0` as success, `1` as a document/patch rejection, and `2` as usage, input, or runtime failure.

## Guardrails

- Never edit `revision`, `digest`, `kind`, or `apiVersion` through patch operations.
- Never suppress compiler errors or fabricate a digest. The compiler reseals accepted documents.
- Keep Designer and runtime behavior aligned by compiling both through the same `FormPlan`.
- Resolve widgets, data sources, validators, and actions only through host-provided registry keys.
- Preserve controlled data ownership: the renderer emits values and actions; the host persists and authorizes them.
- Keep repeater values metadata-free unless a row identifier is an explicit business field. Use row scope and host request bindings instead of inserting engine IDs.
- Model an editable table as an object repeater with `layout: "data-grid"`. Keep direct children to field columns and preserve the ordinary object-array value; do not add table state or row keys to business data.
- Model a multi-page flow as one `layout: "wizard"` container whose direct children use `layout: "page"`; do not imitate a wizard with tabs or persist its active page inside business values.
- Keep wizard checkpoints separate from form values. Restore only checkpoints accepted for the compiled plan's exact revision and digest.
- Treat page advance as a page-scoped validation boundary. Do not run future hidden-page requirements early or accept host issues owned by another page.
- Pin Workflow and Cloud integration with the compiler-produced revision and digest.
