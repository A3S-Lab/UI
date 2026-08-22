# Migrating from v0.1 to the `next` Runtime

The `next` line tightens contracts that v0.1 treated permissively. Migrate and compile documents in a test environment before pinning a new digest in workflow nodes or durable interactions.

## Migration checklist

1. Compile every document against Schema Profile 1. Remove unsupported JSON Schema keywords instead of relying on them being ignored.
2. Review every `computed` rule. The runtime now evaluates it, removes stale outputs after dependency failures, and includes the derived value in validation and actions.
3. Move remote option loading behind `FormHostAdapter.resolveDataSource`. Declare dependencies, triggers, cache TTL, search, and pagination in the document; keep credentials in the host.
4. Move business validation behind `FormHostAdapter.validateValue` and return stable issue codes and concrete field paths.
5. Import `@a3s-lab/ui/form/a3s-ui.css` for the complete A3S UI bundle, or keep `@a3s-lab/ui/form/styles.css` when the host already loads A3S UI or requires strict CSS isolation.
6. Pass locale overrides as `a3s.dev/form-locale-catalog/v1` host state rather than serializing product copy into documents.
7. For object arrays, replace JSON widgets with [repeatable field groups](repeatable-field-groups.md) without changing the stored value shape.
8. Add `scope: "row"` to repeated-field rules that require per-row state. Replace manual row-index substitution in data sources with wildcard dependencies and consume the concrete `DataSourceRequest.scope` binding in the host.
9. Replace tab-based step flows with a `wizard` container and direct `page` children. Keep navigation outside the form value and restore only checkpoints accepted for the current plan digest and revision.
10. For compact object-array editing, add `layout: "data-grid"` only after every direct repeater child is a field. The schema and stored array remain unchanged.
11. Existing data grids remain inline, unselected, unsorted, and unfiltered by default. Add `dataGrid.editMode: "dialog"` only when row changes should commit as a validated draft. Enable `selection: "multiple"`, `sorting: "single"`, or `filtering: "search"` independently; each is local UI state and does not change the controlled value shape.
12. Replace legacy positional interaction helpers with `createFormReleaseRef`, the request-object form of `createInteractionRequest`, and `createInteractionSubmission`. Pass the original request and protected Cloud task context to `validateInteractionSubmission`; never validate a detached submission by Form revision alone.

## Repeater identity changes

Primitive repeaters remain compatible. Object repeaters use runtime-owned keys by default and do not add metadata to values. If an older custom renderer inserted `_id`, `rowId`, or a similar engine-only property, remove it from new workflow-node values unless it is a real business field.

Use `identifyRepeaterItem` to derive stable identity during controlled external replacements. Declare `UiNode.itemKey` only when the item schema already owns a required string identifier and persistence of that identifier is intentional.

## Compatibility and publication

Document digests change after normalization or contract edits. Publish a new form revision and update configuration-mode `FormRef` values explicitly. Existing workflow nodes remain pinned to their original revision and digest; never rewrite those references in place.

Durable human interactions now use the request-bound `a3s.dev/form-interaction-request/v1` and `a3s.dev/form-interaction-submission/v1` protocols. Do not translate an in-flight legacy envelope in place. Create a new task generation and request that pins the exact `FormReleaseRef`, Workflow and Flow identities, assignment policy, task version, deadlines, allowed outcomes, output mapping, and value-size policy. Persist the request bytes and digest with the owning task so retries and recovery validate the same contract.

Use [`tests/conformance/interaction-contract-v1.json`](../tests/conformance/interaction-contract-v1.json) when implementing a native or service adapter. The TypeScript and Rust implementations must produce the fixture's exact canonical request bytes, request digest, canonical value bytes, and value digest.

Run the complete package check before publication:

```bash
npm run form:check
```

The check covers formatting rules, type contracts, coverage, builds, runtime performance, embedding isolation, the CLI, and Rspress documentation.
