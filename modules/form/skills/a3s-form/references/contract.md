# A3S Form contract reference

## Canonical document

```json
{
  "kind": "a3s.form",
  "apiVersion": "a3s.dev/form/v1alpha1",
  "schema": { "$schema": "https://json-schema.org/draft/2020-12/schema", "type": "object" },
  "ui": { "root": "root", "nodes": [] },
  "rules": [],
  "dataSources": [],
  "actions": [],
  "metadata": { "title": "表单", "locale": "zh-CN" },
  "revision": 0,
  "digest": "sha256:..."
}
```

`digest` is canonical SHA-256 over the publishable document without the digest field. Never calculate or edit it manually.

## UI nodes

Supported kinds are `root`, `section`, `group`, `field`, `repeater`, and `content`. Layout nodes reference children by stable ID. Field and repeater nodes bind a JSON Schema property through a JSON Pointer such as `/properties/profile/properties/name`.

Built-in widget keys are `text`, `textarea`, `number`, `select`, `radio`, `checkbox`, `switch`, `date`, `email`, and `password`. Custom keys require a trusted host registry.

### Editable data-grid layout

An editable data grid is a `repeater` node with `layout: "data-grid"`. It must bind an array whose `items` schema is an object, have at least one direct child, and use only `field` nodes as direct children. Each direct field becomes a column and may bind a nested property inside the repeated item. Column `width` values are relative presentation weights.

Grid values remain ordinary object arrays. Do not persist row keys, selection, sorting, or other runtime state in business data. Add, remove, reorder, `minItems`, `maxItems`, validation, row-scoped rules, row-bound data sources, `itemKey`, and `identifyRepeaterItem` use the standard repeater contracts. Desktop renders a semantic table; narrow form containers render labeled row cards without changing the document or value shape.

### Wizard and page layouts

A multi-page flow uses a `root`, `group`, or `section` node with `layout: "wizard"`. Every direct child must be a `group` or `section` with `layout: "page"`. Page nodes default to `pageRole: "form"`; at most one page may use `pageRole: "review"`, and it must be the final child.

Use a normal `visible` rule on a page to define a branch. The active page sequence, progress, review content, and checkpoint reconciliation all follow the visible branch. Empty wizards, non-page children, orphan pages, nested wizards, wizards inside repeaters, and misplaced or duplicate review pages are compiler errors.

Do not store active or completed page IDs in the form value. Navigation state uses a separate `FormWizardCheckpoint` with API version `a3s.dev/form-wizard-checkpoint/v1alpha1`, the plan's `sourceDigest` and `sourceRevision`, a `wizardId`, a `pageId`, and ordered `completedPageIds`. Create and restore it through `createFormWizardCheckpoint` and `restoreFormWizardCheckpoint`; discard any checkpoint rejected for a stale digest, revision, wizard, or page.

## Pure expressions

- Values: `{ "op": "literal", "value": ... }`, `{ "op": "field", "path": "profile.name" }`
- Unary: `not`, `exists`
- Collections: `all`, `any`, `coalesce`, `concat`
- Binary: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`, `add`, `subtract`, `multiply`, `divide`
- Branch: `if` with `condition`, `whenTrue`, and `whenFalse`

Rules use `visible`, `enabled`, `computed`, or `validate` and target a node ID. Computed rules target value-bearing nodes, run in compiler-defined dependency order, and fail closed by removing stale dependent outputs. Rules are form-scoped by default. A repeated target uses `"scope": "row"`; each array boundary is represented by `*`, for example `routes.*.provider`. Row dependencies may read the current row, an enclosing row, or a global path. Expressions cannot execute JavaScript or import modules.

## Typed patch

```json
{
  "apiVersion": "a3s.dev/form-patch/v1alpha1",
  "baseRevision": 3,
  "description": "Rename the contact field",
  "preconditions": [
    { "path": "/ui/nodes/1/label", "equals": "联系人" }
  ],
  "operations": [
    { "op": "set", "path": "/ui/nodes/1/label", "value": "主要联系人" }
  ]
}
```

Operations are:

- `set`: replace or add an object property at `path`.
- `remove`: remove an existing property or array member.
- `insert`: insert `value` at `index` into the array at `path`.
- `move`: remove the value at `from` and insert it into the array at `path`, optionally at `index`.

A revision mismatch, failed precondition, unsafe pointer, invalid reference, cycle, unsupported capability, or resource-limit violation rejects the entire patch atomically.

## Integration reference

Use a pinned reference only after validation:

```json
{
  "uri": "a3s://forms/customer-onboarding",
  "revision": 4,
  "digest": "sha256:...",
  "mode": "configuration"
}
```

Modes are `configuration`, `interaction`, and `read-only`. The host owns storage, identity, authorization, data sources, submission, and audit.

## Host validation

`FormHostAdapter.validateValue` receives a cloned value, the immutable plan, locale, trigger, and a field, page, or form scope. It returns `{ "issues": [{ "path": "field", "code": "stable_code", "message": "..." }] }`. Codes map to `async.<code>`. Do not put endpoints, credentials, or executable validation logic in `FormDocument`.

Field validation runs on blur. Wizard page validation runs before advancing with `{ "kind": "page", "nodeId": "page-id" }`; it may return issues owned by that page or a page-level issue with an empty path, but an issue owned by another page is an invalid response. Hidden-page synchronous errors do not block the active branch. Form validation runs before a primary submit action and may reopen an earlier visible page to focus its first error. A controlled value change, navigation, unmount, or newer request aborts pending work, and late responses must not update the current form. Protected business rules must run again inside the host's server-side commit transaction.

## Host data sources

Data-source definitions use a stable `id` and host-approved `registryKey`. Optional controls are `parameters`, declared `dependencies`, `trigger` (`mount` or `focus`), `searchable`, `debounceMs`, `pageSize`, and `cacheTtlMs`. A UI node references the definition through `dataSource`.

Do not put URLs, tokens, headers, or executable resolver logic in a document. The host resolver owns authorization and may return `UiOption[]` or `{ "options": [...], "nextCursor": "..." }`. Dependency paths must exist in the schema; unrelated value paths must not be added merely to force broad refreshes.

A source attached to a repeated field may declare a compatible template such as `routes.*.provider`. Renderer requests include `scope.nodeId`, the concrete `scope.valuePath`, ordered `scope.rowIndices`, and `{ template, path }` dependency bindings. Hosts read the concrete path from the controlled request value and never persist row indices or renderer keys.
