# Deterministic computed rules

Computed rules derive host-controlled form values without embedding JavaScript in a `FormDocument`. They use the same bounded expression engine in headless validation, React, Vue, Web Components, embedded configuration, and durable interaction validation.

## Define a computed field

A computed rule targets one value-bearing `field` or `repeater` node. Only one computed rule may target a node.

```json
{
  "id": "derive-total",
  "target": "total",
  "kind": "computed",
  "expression": {
    "op": "add",
    "left": { "op": "field", "path": "subtotal" },
    "right": { "op": "field", "path": "tax" }
  }
}
```

Every `field` path must resolve to a property declared by Schema Profile 1. Computed targets render as disabled controls and cannot be overridden through ordinary field interaction.

Rules are form-scoped by default. A rule that targets a field inside a repeater declares `scope: "row"` and uses `*` at each repeater boundary:

```json
{
  "id": "derive-line-total",
  "target": "line-total",
  "kind": "computed",
  "scope": "row",
  "expression": {
    "op": "multiply",
    "left": { "op": "field", "path": "orders.*.lines.*.quantity" },
    "right": { "op": "field", "path": "orders.*.lines.*.unitPrice" }
  }
}
```

The target must be nested under every repeater represented by its path template. A row expression may read:

- a global path such as `currency`;
- a field in an enclosing row such as `orders.*.taxRate`;
- a field in the current row such as `orders.*.lines.*.quantity`.

It cannot read a sibling repeater or a row nested below its target. The compiler rejects an unbindable dependency. `visible`, `enabled`, and `validate` use the same row-scope contract, so each repeated field can have independent state and errors.

## Expression operations

| Shape | Operations |
| --- | --- |
| Values | `literal`, `field` |
| Unary | `not`, `exists` |
| Boolean collections | `all`, `any` |
| Value collections | `coalesce`, `concat` |
| Comparison | `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `in` |
| Arithmetic | `add`, `subtract`, `multiply`, `divide` |
| Branch | `if` with `condition`, `whenTrue`, and `whenFalse` |

Arithmetic accepts finite numbers only. Division by zero and non-finite results are evaluation failures. `concat` accepts JSON primitives. Equality, membership, and containment use structural canonical JSON equality.

Expressions have a compiler-enforced operation limit. The selected limit is stored in the `FormPlan` as `expressionOperationLimit`, so compilation and runtime evaluation cannot disagree.

## Dependency order

The compiler builds a graph between computed targets. A computed rule depends on another computed target when its expression reads that target's value path. The compiler then emits a stable, lexically tie-broken topological order in `FormPlan.dependencyOrder`.

Self references, multi-node cycles, duplicate computed targets, layout-node targets, unknown field paths, malformed expressions, and unknown rule kinds fail compilation.

Visibility and enablement rules only read values. They do not create computed dependency edges and cannot produce false cycle diagnostics.

## Failure behavior

Use `evaluateComputedRules(plan, value)` to derive a new immutable value and inspect execution:

```ts
const result = evaluateComputedRules(plan, value, { includeValues: false });

result.value;
result.errors;
result.trace;
```

Trace status is one of `set`, `removed`, `unchanged`, `error`, or `skipped`.

When a rule fails, its previous output is removed. Rules that depend on that output are skipped and their previous outputs are also removed. This prevents stale derived configuration from surviving a failed recalculation. Errors use stable `rule.<id>.evaluation` and `rule.<id>.dependency` codes.

For a row-scoped rule, failure and dependency propagation use concrete paths. A failed `orders.0.lines.1.subtotal` does not suppress calculation in another line. Incremental caches also use the concrete target path, while `evaluatedRuleIds` and `reusedRuleIds` report unique rule IDs for the evaluation pass.

`includeValues` defaults to `false`. Enable it only for an authorized, short-lived inspection surface because previous and derived values may contain tenant data.

`evaluateFormValue(plan, value)` enters the package-embedded Rust/WASM evaluator, runs computed rules first, and then applies schema and `validate` rules to the derived value. `validateFormValue` returns the same error set. Workflow-node and interaction validation return the native evaluator-produced value after revision and digest verification. The TypeScript implementation is retained only for byte-exact conformance testing; see [Portable submitted-value evaluation](value-evaluation.md).

## Embedded runtime behavior

The renderer derives a runtime value before field state, validation, and host actions run. A user edit emits the derived controlled value through the framework adapter. Initial host values are not persisted automatically; the host still decides when to save or commit the node configuration.

This keeps React, Vue, and Web Components controlled while ensuring that a workflow node never submits an outdated calculation.
