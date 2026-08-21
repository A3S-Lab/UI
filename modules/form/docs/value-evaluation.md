# Portable submitted-value evaluation

A3S Form Core is the semantic authority for both compilation and submitted-value evaluation. Browser, Node, Worker, CLI, native Rust, and Cloud hosts use the same bounded evaluator rather than maintaining an independent server validator.

## Versioned byte protocol

The native and WASM adapters accept `a3s.dev/form-core/evaluate-request/v1alpha1` and return `a3s.dev/form-core/evaluate-response/v1alpha1`.

An evaluation request contains the exact compiler-produced `FormPlan`, a JSON-object value, and optional evaluation settings:

```json
{
  "apiVersion": "a3s.dev/form-core/evaluate-request/v1alpha1",
  "formPlan": {},
  "value": {},
  "options": {
    "includeValues": false,
    "locale": "en-US",
    "localeCatalog": {
      "apiVersion": "a3s.dev/form-locale-catalog/v1",
      "messages": {
        "validationRequired": "Required by the workflow host."
      }
    }
  }
}
```

The response identifies the exact compiler revision and contains the derived value, deterministic computed-rule trace, and ordered validation errors:

```json
{
  "apiVersion": "a3s.dev/form-core/evaluate-response/v1alpha1",
  "compilerRevision": "a3s-form-core@0.1.0",
  "ok": true,
  "value": {},
  "trace": [],
  "errors": []
}
```

`ok` is false when evaluation or validation produces any error. A valid request still returns the normalized value and trace when `ok` is false. Protocol failures omit `value`, return an empty trace, and expose one stable `protocol.<code>` error.

Both request and response use the same bounded buffers as compilation. Duplicate JSON keys, unsupported protocol or plan versions, non-object values, invalid locales, oversized input, and invalid plan limits fail closed. JavaScript adapters reject cyclic graphs, accessors, proxies, unsupported prototypes, sparse arrays, and non-finite numbers before serialization.

## Evaluation order

One pass performs these operations in order:

1. evaluate computed rules in the compiler-produced dependency order;
2. expand row-scoped `*` paths to concrete array indices;
3. remove failed computed outputs and skip only their concrete dependants;
4. validate the derived value against Schema Profile 1;
5. evaluate form- and row-scoped `validate` rules;
6. remove errors owned exclusively by hidden wizard pages; and
7. encode the normalized value, trace, and errors as canonical JSON bytes.

Expression operation limits come from the pinned `FormPlan`. Arithmetic accepts finite numbers only. Structural equality, `enum`, `const`, `uniqueItems`, membership, and containment use canonical JSON equality. Locale messages resolve from the plan locale, an explicit request locale, and an optional versioned host override.

## Adapters

Native Rust hosts use `evaluate_form_value` for parsed values or `evaluate_bytes` for the wire protocol. The native CLI reads a request from standard input:

```bash
a3s-form-core evaluate < evaluate-request.json
```

JavaScript hosts normally call `evaluateFormValue(plan, value, options)`. That function enters the package-embedded Rust/WASM core synchronously. `WasmFormCore.evaluateBytes` exposes the canonical byte protocol, while `WasmFormCore.evaluate` provides the typed object adapter.

The TypeScript evaluator is retained only as a conformance reference. Incremental TypeScript computation may optimize controlled rendering, but every workflow configuration, action submission, asynchronous validation boundary, and durable interaction acceptance runs the native evaluator before the host accepts a value.

## Durable host acceptance

A protected Cloud or workflow command must:

1. load the immutable Form release;
2. compile it on the server with the pinned compiler revision and Schema Profile;
3. verify the release revision and digest;
4. evaluate the candidate value through native Form Core;
5. reject every returned error;
6. enforce the canonical output-size limit again; and
7. persist and digest only the evaluator-produced value.

Browser validation is feedback, not authorization. A browser-produced plan or derived value is never sufficient to complete a HumanTask or resume Flow.

## Conformance evidence

[`value-evaluation-v1.json`](../tests/conformance/value-evaluation-v1.json) is the shared golden corpus. It covers computed chains, row wildcards, failure propagation, Schema Profile validation, locale overrides, wizard filtering, every expression operator, canonical object equality, and inspectable traces. Native Rust, direct WASM bytes, the TypeScript reference, and the public Node adapter must match its canonical response bytes exactly.
