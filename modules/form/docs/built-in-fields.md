# Built-in Field Contract

A3S Form ships 23 built-in widgets. JSON Schema owns value type and validation. The UI node owns presentation, labels, options, and widget-specific display properties. All widgets remain controlled by the embedding host.

## Shared UI node properties

| Property | Type | Contract |
| --- | --- | --- |
| `id` | `string` | Unique stable node identifier |
| `kind` | `"field"` | Required field-node kind |
| `schemaPath` | JSON Pointer | Binds the field to its Schema |
| `widget` | `string` | Selects the built-in widget; omitted values use `text` |
| `label` | `string` | Visible label and accessible name |
| `description` | `string` | Supporting field copy |
| `placeholder` | `string` | Input hint for text-like controls |
| `width` | `1 \| 2 \| 3 \| 4 \| 6 \| 12` | Width in the 12-column layout |
| `options` | `UiOption[]` | Static select, radio, or multi-select options |
| `customProps` | `JsonObject` | Widget-specific display configuration |
| `matrix` | `UiMatrixDefinition` | Explicit rows and columns for matrix widgets |
| `dataSource` | `string` | Host-owned dynamic option source |
| `readOnly` | `boolean` | Marks a read-only field purpose |

Required state comes from the parent object Schema's `required` array. Constraints such as `minimum`, `maximum`, `multipleOf`, `minItems`, and `maxItems` remain Schema properties.

## Widget matrix

| Widget | Controlled value | Recommended Schema | Specific configuration |
| --- | --- | --- | --- |
| `text` | `string` | `type: "string"` | `placeholder` |
| `textarea` | `string` | `type: "string"` | `placeholder` |
| `number` | `number \| null` | `type: "number"` | `minimum`, `maximum`, `multipleOf` |
| `email` | `string` | `type: "string", format: "email"` | `placeholder` |
| `password` | `string` | `type: "string"` | `minLength`, `maxLength` |
| `date` | `string` | `type: "string", format: "date"` | None |
| `url` | `string` | `type: "string", format: "uri"` | `placeholder` |
| `tel` | `string` | `type: "string"` | `pattern`, `placeholder` |
| `date-time` | UTC `string` | `type: "string", format: "date-time"` | None |
| `time` | UTC `string` | `type: "string", format: "time"` | None |
| `select` | `JsonPrimitive` | Scalar `enum` | `options` or `dataSource` |
| `radio` | `JsonPrimitive` | Scalar `enum` | `options` |
| `checkbox` | `boolean` | `type: "boolean"` | None |
| `switch` | `boolean` | `type: "boolean"` | None |
| `multi-select` | `JsonPrimitive[]` | Array with typed `items.enum` | `options`, `minItems`, `maxItems` |
| `matrix-single` | `Record<string, JsonPrimitive>` | Object with one scalar `enum` property per row | `matrix.rows`, `matrix.columns` |
| `matrix-multiple` | `Record<string, JsonPrimitive[]>` | Object with one unique typed array property per row | `matrix.rows`, `matrix.columns` |
| `tags` | `string[]` | Unique string array | `minItems`, `maxItems` |
| `currency` | `number \| null` | `type: "number"` | `customProps.currency`, `customProps.step` |
| `rating` | `number` by default | `minimum: 1`, `maximum: 1..10` | Optional `options` override |
| `slider` | `number` | `minimum`, `maximum` | `customProps.step` |
| `hidden` | `JsonValue` | Schema matching the host value | No visible field shell |
| `calculated` | `JsonValue` | Schema matching the computed output | Normally `readOnly: true` |

## Extended widget behavior

### URL and phone

`url` renders a native URL input and uses the Profile 1 `uri` format. `tel` renders a native phone input without rewriting locale-specific phone formats. Products that require a fixed phone format must declare a Schema `pattern` or provide an audited custom widget.

### Date-time and time

Both widgets expose a UTC editing surface. Values with an explicit offset are normalized to UTC before display. Edited values are emitted with a `Z` suffix. A schedule defined in a user's local timezone must store an IANA timezone separately and should use a host-specific widget.

### Multi-select

The widget renders an accessible checkbox group instead of native `select[multiple]`. Option values use strict identity, so numeric `1` and string `"1"` remain distinct. Unchecked options become disabled at `maxItems`; selected options remain removable.

### Single- and multiple-choice matrices

`matrix-single` emits one JSON primitive per row. `matrix-multiple` emits one primitive array per row. Both widgets require an object Schema whose property names exactly match `matrix.rows[].id`; undeclared or missing row properties fail compilation.

```ts
const matrixNode = {
  id: 'assessment',
  kind: 'field',
  widget: 'matrix-single',
  schemaPath: '/properties/assessment',
  matrix: {
    rows: [
      { id: 'handoff', label: 'Task handoff is clear' },
      { id: 'recovery', label: 'Failure recovery is predictable' },
    ],
    columns: [
      { label: 'Needs work', value: 'low' },
      { label: 'Meets expectations', value: 'expected' },
      { label: 'Excellent', value: 'excellent' },
    ],
  },
};
```

| Matrix property | Type | Contract |
| --- | --- | --- |
| `rows` | `UiMatrixRow[]` | 1–50 stable rows; `id` also names the bound object property |
| `rows[].label` | `string` | Visible row heading and part of every control's accessible name |
| `rows[].description` | `string` | Optional help text linked through `aria-describedby` |
| `rows[].disabled` | `boolean` | Disables the complete row without deleting its controlled value |
| `columns` | `UiMatrixColumn[]` | 1–20 columns with unique values of one primitive type |
| `columns[].label` | `string` | Visible column heading and part of every control's accessible name |
| `columns[].value` | `string \| number \| boolean` | Stable value emitted for a selected cell |
| `columns[].disabled` | `boolean` | Disables the column across every row |

Single-choice row Schemas use a scalar type and an `enum` equal to the column values. Multiple-choice row Schemas use `type: "array"`, matching `items.enum`, `uniqueItems: true`, and optional `minItems` or `maxItems`. Matrix nodes do not accept `options` or `dataSource`; this keeps the row-column contract deterministic.

Native radio groups provide Tab and arrow-key behavior for single-choice rows. Multiple-choice rows use checkboxes; after `maxItems`, unselected controls in that row are disabled while selected values remain removable. Every control is named as `row label: column label`, row errors bind to the exact object-property path, and disabled or read-only values remain visible.

The compiler accepts at most 50 rows, 20 columns, and 500 cells. Containers wider than 520 px use a semantic table. Narrower containers retain table semantics while presenting each row as a labeled card. Values contain no runtime keys or component state and can be embedded as ordinary controlled host configuration.

### Tags

Enter, comma, or the add button commits a trimmed tag. Duplicate tags are rejected with a live status message. `minItems` disables removal at the lower bound, and `maxItems` reports the collection limit.

### Currency

`customProps.currency` accepts a three-letter ISO 4217 display code and defaults to `CNY`. `customProps.step` accepts a positive number and defaults to `0.01`. The controlled value is a JavaScript number; accounting-grade decimal precision requires a string or minor-unit custom contract.

### Rating

The default radio group uses Schema `maximum` as its scale, clamped to 1 through 10. A supplied `options` array replaces the numeric scale. Native radio semantics provide focus and arrow-key behavior.

### Slider

The range comes from Schema `minimum` and `maximum`; `customProps.step` defaults to `1`. The widget exposes the current value visually and through `aria-valuetext`. Precise manual entry should use `number` or `currency` instead.

### Hidden and calculated

`hidden` renders only a hidden input and preserves the controlled value. Hidden values are inspectable and must never contain secrets or authorization decisions. `calculated` renders a read-only `output`; numeric values are formatted for the active locale without changing the raw value.

## Adapter parity

React owns the built-in renderer. The Vue and Web Component adapters forward controlled values, host errors, locale catalogs, read-only state, data sources, widget registries, and node registries into that renderer. The same field contract therefore applies to all three adapters.

The interactive Chinese references are built from MDX and the real `FormRenderer` at `site/docs/next/zh/components/form-system/fields.mdx` and `site/docs/next/zh/components/form-system/matrix-fields.mdx` in the repository root.
