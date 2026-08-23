# A3S Form Schema Profile 1

A3S Form Schema Profile 1 is the closed JSON Schema contract accepted by the v0.2 development compiler. Its identifier is:

```text
a3s.dev/form-schema-profile/1
```

The profile uses the JSON Schema 2020-12 dialect but implements a deliberate subset. A keyword not listed here is a compile error at any depth. The compiler does not preserve unsupported keywords as annotations and does not ignore them.

## Supported keywords

| Group | Keywords |
| --- | --- |
| Dialect and identity | `$schema`, `$id` |
| Type and annotations | `type`, `title`, `description`, `default` |
| Value constraints | `enum`, `const` |
| Objects | `properties`, `required`, `additionalProperties` |
| Arrays | `items`, `minItems`, `maxItems`, `uniqueItems` |
| Strings | `minLength`, `maxLength`, `pattern`, `format` |
| Numbers | `minimum`, `maximum`, `multipleOf` |

`type` accepts one of `null`, `boolean`, `object`, `array`, `number`, `integer`, or `string`. Union types are not part of Profile 1.

`properties`, `items`, and schema-valued `additionalProperties` are inspected recursively. Invalid child schemas report their exact JSON Pointer path.

Property names must be non-empty and cannot contain dots because runtime value paths are dot-separated. Every `required` entry must reference a declared property.

## Supported formats

Profile 1 asserts these formats during headless, browser, Worker, CLI, and host-side validation:

```text
email
uri
date
date-time
time
hostname
ipv4
ipv6
uuid
```

Unknown formats fail compilation. `date`, `date-time`, and `time` use calendar-aware RFC 3339-style values. `date-time` and `time` require `Z` or an explicit numeric offset.

## Value semantics

- `const` and `enum` use structural canonical JSON equality. Object key order does not change the result.
- `uniqueItems` also uses structural JSON equality, including arrays and objects.
- `additionalProperties: false` rejects undeclared object keys at their full value path.
- A schema-valued `additionalProperties` validates every undeclared key against that schema.
- `pattern` must be a valid ECMAScript Unicode regular expression. Invalid expressions fail compilation.
- `multipleOf` must be a finite number greater than zero. Decimal multiples use tolerance-aware validation so values such as `0.3` satisfy `multipleOf: 0.1`.
- String length is counted in Unicode code points. Length and item limits must be non-negative safe integers. Minimum values cannot exceed their matching maximum values.
- Optional fields may use `null` as an empty controlled-input value. For a property listed in `required`, a missing value, `null`, or an empty string produces a `required` error.
- `default` is an annotation. Validation does not inject it into a host-controlled value.

Every successful `FormPlan` records the active profile in `schemaProfile`. Hosts can reject a plan with a profile identifier they do not support.

## Deliberately unsupported

Profile 1 rejects references and schema composition, including `$ref`, `$defs`, `allOf`, `anyOf`, `oneOf`, `not`, `if`, `then`, `else`, `dependentSchemas`, `contains`, `prefixItems`, `patternProperties`, and `unevaluatedProperties`.

These capabilities can only enter a later profile with compiler, browser, server, Worker, CLI, migration, and conformance coverage. Until then, use explicit child schemas and bounded A3S Form rules.

## Example

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/service-settings",
  "type": "object",
  "properties": {
    "endpoint": {
      "type": "string",
      "format": "uri"
    },
    "retries": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10,
      "multipleOf": 1
    },
    "labels": {
      "type": "array",
      "items": { "type": "string" },
      "uniqueItems": true
    }
  },
  "required": ["endpoint"],
  "additionalProperties": false
}
```

Use `compileForm`, the compiler Worker, or `a3s-form validate` as the authority. All three execute the package-embedded Rust/WASM Form Core and return its exact `compilerRevision`. Do not preflight a document with a different validator and assume that it is accepted by A3S Form.
