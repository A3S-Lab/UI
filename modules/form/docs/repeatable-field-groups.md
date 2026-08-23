# Repeatable Field Groups

Repeatable field groups render an array of objects as editable rows. They are intended for workflow routes, recipients, tool parameters, approval steps, and other node settings that should not be edited as one JSON blob.

## Primitive repeater

Use a compact repeater when every array item is a scalar value. The runtime renders one A3S UI input per row with add, move, and remove actions.

```ts
schema: {
  type: 'array',
  minItems: 1,
  maxItems: 6,
  uniqueItems: true,
  items: { type: 'string' },
},
ui: {
  id: 'labels',
  kind: 'repeater',
  label: 'Route labels',
  schemaPath: '/properties/labels',
}
```

| Property | Type | Purpose |
| --- | --- | --- |
| `kind` | `"repeater"` | Selects the repeatable runtime |
| `schemaPath` | JSON Pointer | Binds the scalar array schema |
| `label` | `string` | Names the list and row inputs |
| `description` | `string` | Explains ordering or entry rules |
| Schema `items` | scalar schema | Defines each controlled row value |
| Schema `minItems` / `maxItems` | `number` | Controls removal and insertion boundaries |
| Schema `uniqueItems` | `boolean` | Rejects duplicate values when enabled |

## Document contract

The array lives in the schema. The repeater binds to that array, and its children bind to properties below `items`.

```ts
const document: FormDocument = {
  kind: 'a3s.form',
  apiVersion: 'a3s.dev/form/v1alpha1',
  revision: 1,
  metadata: { title: 'Router settings', locale: 'en-US' },
  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      routes: {
        type: 'array',
        minItems: 0,
        maxItems: 12,
        items: {
          type: 'object',
          properties: {
            match: { type: 'string', default: 'customer' },
            route: { type: 'string', minLength: 1, default: 'customer' },
          },
          required: ['match', 'route'],
          additionalProperties: false,
        },
      },
    },
    required: ['routes'],
    additionalProperties: false,
  },
  ui: {
    root: 'root',
    nodes: [
      { id: 'root', kind: 'root', children: ['routes'] },
      {
        id: 'routes',
        kind: 'repeater',
        label: 'Routes',
        schemaPath: '/properties/routes',
        children: ['route-match', 'route-name'],
      },
      {
        id: 'route-match',
        kind: 'field',
        label: 'Match',
        schemaPath: '/properties/routes/items/properties/match',
        width: 6,
      },
      {
        id: 'route-name',
        kind: 'field',
        label: 'Route',
        schemaPath: '/properties/routes/items/properties/route',
        width: 6,
      },
    ],
  },
  rules: [],
  dataSources: [],
  actions: [],
};
```

The compiler records `routes.*.match` and `routes.*.route` as value-path templates. The renderer resolves them to concrete paths such as `routes.2.match`; custom widgets receive that concrete `valuePath` and the ordered `rowIndices` for nested repeaters.

An object repeater may contain another object repeater. Each nested `items` segment adds one row index. Validation errors, host errors, and field-level asynchronous validation always use the concrete path.

## Row identity

The default is runtime-owned identity. Insert, edit, move, and remove operations preserve React field state while the renderer stays mounted, but no key is written into the controlled form value.

For controlled replacements from an external store, derive identity from business data:

```ts
const hostAdapter: FormHostAdapter = {
  identifyRepeaterItem({ node, item }) {
    if (node.id !== 'recipients' || !item || typeof item !== 'object' || Array.isArray(item)) {
      return undefined;
    }
    return typeof item.email === 'string' ? item.email : undefined;
  },
};
```

The callback is advisory. It must be deterministic for the current host boundary, return unique values among sibling rows, and never mutate `item`. Invalid, missing, duplicate, or thrown identities fall back to runtime-owned keys.

`itemKey` is the declarative alternative. The compiler accepts it only when the item schema declares that property as a required string. When a user adds a row, the runtime generates a value for the declared property. Use it only when the identifier is part of the business contract; do not introduce it as hidden engine metadata.

## Designer and runtime behavior

- Designer creates an object-array schema and a real row-template container.
- Fields and nested groups can be added inside the template or moved across root and item scopes.
- Duplicating a repeater copies the complete item schema and its child nodes with collision-safe paths.
- `minItems` disables removal at the lower bound. `maxItems` disables insertion at the upper bound.
- Read-only state disables row fields, ordering controls, insertion, removal, and form actions.
- At narrow container widths, every row field spans one column; the host page width is not used as a proxy.

Primitive repeaters remain supported. An array with scalar `items` and no child nodes keeps the compact one-input-per-row renderer.

## Row-scoped rules

Set `scope: 'row'` when a repeated field needs independent calculation, validation, visibility, or enablement:

```ts
const rule: FormRule = {
  id: 'route-must-differ-from-default',
  target: 'route-name',
  kind: 'validate',
  scope: 'row',
  expression: {
    op: 'ne',
    left: { op: 'field', path: 'routes.*.route' },
    right: { op: 'field', path: 'default' },
  },
  message: 'A route must differ from the default branch.',
};
```

Each `*` consumes one outer-to-inner row index. Dependencies may point to the current row, an enclosing row, or a global path. Validation errors and computed traces always report concrete paths such as `routes.2.route`. A calculation failure removes only that row's stale output and skips only concrete dependants of that output.

## Row-scoped data sources

A row field may declare a dependency such as `routes.*.provider`. The Renderer binds it to `routes.2.provider` and sends both forms in `DataSourceRequest.scope`. Read the concrete binding in the host resolver; do not store the row index or an internal key in the form value.

Request caching, cancellation, search, and pagination are isolated by concrete row path. An edit in one row does not refetch a sibling whose subscriptions did not change.

## Current limits

- Set `layout: "data-grid"` when direct field children should render as a compact editable table; see [Editable Data Grids](data-grids.md).
- Shared-option matrices use the dedicated `matrix-single` or `matrix-multiple` field widgets. Dialog edit grids, column operations, and spreadsheet-style bulk editing remain separate roadmap capabilities.
- A form-scoped `visible` or `enabled` rule may still target a repeated field when one shared result for every row is intentional. Wildcard dependencies require explicit row scope.
- Schema property names cannot be `*`; the segment is reserved for repeater templates.

## Migrating from JSON or primitive repeaters

Existing primitive repeaters require no change. To replace an object-array JSON editor:

1. Keep the existing array schema and controlled value shape.
2. Change the array's UI node to `kind: 'repeater'` and remove the JSON widget key.
3. Add child field nodes whose `schemaPath` points below the array's `items` schema.
4. Keep persistence and actions in the host; no submission or node configuration migration is required.
5. Omit `itemKey` unless the existing item schema already has a required string identifier. Use `identifyRepeaterItem` when the host can derive a stable business key.
6. Recompile every stored document. Fix `node.dynamic_scope`, `repeater.items_type`, or `repeater.item_key` diagnostics before publishing.

The documented routing example follows this migration: `routes` remains the same metadata-free business array, but each condition is edited through a repeatable row with row-level validation and a host-owned branch data source.
