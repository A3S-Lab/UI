# Host-owned data sources

A3S Form documents describe which option source a field needs, but they never contain an endpoint, credential, or executable resolver. The embedding host implements `FormHostAdapter.resolveDataSource` and remains responsible for tenant isolation, authorization, network policy, rate limits, and audit.

## Document contract

```json
{
  "dataSources": [
    {
      "id": "models",
      "registryKey": "workflow.models",
      "parameters": { "capability": "chat" },
      "dependencies": ["provider"],
      "trigger": "focus",
      "searchable": true,
      "debounceMs": 180,
      "pageSize": 25,
      "cacheTtlMs": 30000
    }
  ]
}
```

A field references the source by ID:

```json
{
  "id": "model",
  "kind": "field",
  "schemaPath": "/properties/model",
  "widget": "select",
  "dataSource": "models"
}
```

The compiler applies these defaults:

| Property | Default | Boundary |
| --- | ---: | --- |
| `parameters` | `{}` | finite JSON object |
| `dependencies` | `[]` | unique declared value paths, at most 32 |
| `trigger` | `mount` | `mount` or `focus` |
| `searchable` | `false` | boolean |
| `debounceMs` | `250` | integer, 0–5,000 ms |
| `pageSize` | `50` | integer, 1–200 |
| `cacheTtlMs` | `0` | integer, 0–86,400,000 ms |

Invalid source IDs, duplicate IDs, missing dependency paths, and out-of-range controls fail compilation with an exact document path.

For a source attached inside a repeater, dependency paths may use the same `*` templates as row-scoped rules:

```json
{
  "id": "models",
  "registryKey": "workflow.models",
  "dependencies": ["routes.*.provider"]
}
```

The dependency's repeater scope must be the same as, or an outer scope of, every field that uses the source. A source attached to a root field cannot read `routes.*.provider`.

## Host adapter

```ts
const hostAdapter = {
  async resolveDataSource(request, signal) {
    const providerBinding = request.scope?.dependencies.find(
      (binding) => binding.template === 'routes.*.provider',
    );
    const result = await catalog.findModels({
      tenantId,
      provider: providerBinding
        ? getAtPath(request.value, providerBinding.path)
        : request.value.provider,
      query: request.query,
      cursor: request.cursor,
      limit: request.limit,
      signal,
    });

    return {
      options: result.items.map((item) => ({
        label: item.displayName,
        value: item.id,
        disabled: !item.available,
      })),
      nextCursor: result.nextCursor,
    };
  },
};
```

The Renderer supplies a concrete request scope for every attached field:

```ts
request.scope = {
  nodeId: 'route-model',
  valuePath: 'routes.2.model',
  rowIndices: [2],
  dependencies: [
    { template: 'routes.*.provider', path: 'routes.2.provider' },
  ],
};
```

`scope` remains optional on `DataSourceRequest` for direct host calls outside a Renderer. A renderer-originated request always includes it. The host should read a declared binding's concrete `path`; it should never parse or replace `*` itself.

Legacy `UiOption[]` responses remain accepted. Paginated responses use `{ options, nextCursor? }`. Both shapes are validated before they reach a widget: option labels must be non-empty, values must be JSON primitives, string-converted values must be unique, and unknown response fields are rejected.

## Runtime behavior

- A source does not run until every declared dependency has a usable value.
- An unrelated controlled-value change does not refetch the source.
- A dependency, row path, locale, search query, cursor, plan digest, or source definition change creates a new request key.
- Superseded requests are released and aborted after their final consumer leaves.
- Identical in-flight requests inside one Renderer are deduplicated.
- TTL cache entries are immutable consumer copies, remain local to one Renderer and one resolver identity, and use a 128-entry least-recently-used bound.
- Search uses the source debounce; pagination appends unique options by their string-converted value.
- Loading, empty, dependency-blocked, failure, retry, and load-more states are rendered with accessible status semantics.
- Invalid responses and host failures fail closed without showing upstream exception details.

The host must still authorize every request. A document-controlled registry key, parameter, dependency value, query, or cursor is untrusted input.

Repeated rows have separate keys even when their dependency values are equal. Form-scoped fields can still deduplicate an identical shared source. This prevents one row's cancellation, pagination, or host context from taking over another row while preserving the existing shared-catalog optimization.

## Custom widgets

Custom React widgets and custom-node renderers receive `dataSource` alongside `options`. It exposes the current status, query, search setter, activation, retry, and pagination callbacks. Vue and Web Components use the same React runtime and therefore retain identical orchestration semantics.

For a workflow node settings panel, create one stable resolver per mounted host boundary and keep the node value controlled by the workflow editor. Replace the resolver when tenant context changes. Never use a module-global cache for organization-scoped options.
