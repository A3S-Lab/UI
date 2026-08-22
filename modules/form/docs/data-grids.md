# Editable Data Grids

Editable data grids present an array of objects as a compact table without changing the controlled value contract. They are intended for order lines, routing rules, inspection results, pricing inputs, and workflow-node settings where each row has the same field set.

## Document contract

A data grid is an object repeater with `layout: "data-grid"`. Its direct children are the editable columns.

```ts
const document: FormDocument = {
  kind: 'a3s.form',
  apiVersion: 'a3s.dev/form/v1alpha1',
  revision: 1,
  metadata: { title: 'Order lines', locale: 'en-US' },
  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      lines: {
        type: 'array',
        maxItems: 500,
        items: {
          type: 'object',
          properties: {
            product: { type: 'string', minLength: 1 },
            quantity: { type: 'integer', minimum: 1, default: 1 },
            note: { type: 'string', default: '' },
          },
          required: ['product', 'quantity'],
          additionalProperties: false,
        },
      },
    },
    required: ['lines'],
    additionalProperties: false,
  },
  ui: {
    root: 'root',
    nodes: [
      { id: 'root', kind: 'root', children: ['lines'] },
      {
        id: 'lines',
        kind: 'repeater',
        layout: 'data-grid',
        label: 'Order lines',
        schemaPath: '/properties/lines',
        dataGrid: {
          editMode: 'dialog',
          selection: 'multiple',
          sorting: 'single',
          filtering: 'search',
          paste: 'append',
          fill: 'down',
          virtualization: {
            mode: 'rows',
            viewportHeight: 480,
          },
        },
        children: ['line-product', 'line-quantity', 'line-note'],
      },
      {
        id: 'line-product',
        kind: 'field',
        label: 'Product',
        schemaPath: '/properties/lines/items/properties/product',
        width: 6,
      },
      {
        id: 'line-quantity',
        kind: 'field',
        label: 'Quantity',
        schemaPath: '/properties/lines/items/properties/quantity',
        widget: 'number',
        width: 2,
      },
      {
        id: 'line-note',
        kind: 'field',
        label: 'Note',
        schemaPath: '/properties/lines/items/properties/note',
        width: 4,
      },
    ],
  },
  rules: [],
  dataSources: [],
  actions: [],
};
```

The compiler rejects a data grid when it is not a repeater, does not bind an object array, has no columns, or contains a direct child other than a field. Nested property paths remain valid: a column may bind to `routes.*.when.equals` while still being a direct UI child of the grid.

## Runtime behavior

The Renderer emits a native table with localized column headers, row headers, and one action column. Add, remove, move up, and move down operations emit the complete controlled array. `minItems`, `maxItems`, read-only state, synchronous errors, host validation, row-scoped rules, and row-bound data sources use the same contracts as card-style repeatable groups.

`dataGrid.editMode` selects `inline` or `dialog` editing. Inline is the compatibility default. Dialog mode clones a row into a local draft, keeps cancellation out of the controlled value, validates the concrete row before save, and rejects a save when the host replaced that same row while the editor was open.

`dataGrid.selection: "multiple"` enables stable row selection, select-all, and a two-step bulk delete. Selection is runtime-only and never appears in the form value. A bulk delete is disabled when it would violate `minItems`.

`dataGrid.sorting: "single"` adds a three-state control to each column: ascending, descending, and original order. Numbers use numeric comparison, text uses a locale-aware natural order, and empty values remain last. The narrow row-card layout exposes the same contract through a compact sort selector because its visual table header is hidden.

`dataGrid.filtering: "search"` matches normalized, case-insensitive tokens across the formatted text of visible columns. It does not inspect undisclosed object properties. Result counts, no-match recovery, and control labels come from the versioned locale catalog.

Sorting and filtering are local view state. They never reorder or replace the controlled array. Row edits, deletion, validation, and error focus continue to use source indices. Move controls are disabled while either view transformation is active; users restore the full original view before changing source order. Inline rows remain pinned while focus is inside the row and are re-sorted only after focus leaves, preventing a field from moving during text entry.

Select-all affects only filtered rows and preserves selections that are temporarily hidden. Adding a row clears the filter so the new row remains visible. Validation errors also clear the filter before error focus runs. Read-only grids keep view controls available while value-changing controls remain disabled.

`dataGrid.paste: "append"` opens a protected native dialog for tab-separated rows. It does not request clipboard permissions. The dialog lists the exact editable-column order, parses the input, reports row and column errors, and previews up to four rows before commit. Hidden, calculated, and matrix widgets are excluded from the paste contract; nested properties remain valid through each column's relative value path.

TSV input accepts LF and CRLF row endings, quoted tabs and line breaks, and doubled quotes. Each operation is bounded to 1,000 rows and 256 KiB and must also fit `maxItems`. String cells remain text. Number, integer, boolean, object, array, null, and enum schemas apply typed conversion. Empty non-string cells preserve item defaults. Object and array cells require valid JSON.

Paste is atomic. Parsed items are appended to the latest controlled array and the complete candidate value runs through schema validation, rules, and computed evaluation. Any error leaves the controlled value unchanged. A successful operation emits the evaluated full array once.

`dataGrid.fill: "down"` requires `selection: "multiple"`. The first visible selected row is the source and the remaining visible selected rows are targets. Sorting and filtering determine visible order; selected rows hidden by a filter are never modified. The dialog copies one editable column, including nested object or array values, then validates the complete array atomically.

Fill captures source and target row snapshots when the dialog opens. A host replacement, removal, or update to any captured row causes an explicit conflict instead of overwriting current data. A missing source property removes that property from each target. Designer enables multiple selection with fill-down and disables fill-down when multiple selection is turned off; compiler diagnostics remain authoritative for imported documents.

`dataGrid.virtualization: { mode: "rows" }` renders only the measured row window inside a bounded scroll viewport. It requires `editMode: "dialog"`, so focused inputs and row drafts never depend on a virtual row remaining mounted. `viewportHeight` is an integer from 240 to 960 CSS pixels and defaults to `480`; `overscan` is an integer from 2 to 24 rows and defaults to `6`.

Sorting, filtering, selection, paste, fill, validation, and controlled updates continue to operate on the complete array or filtered result rather than the mounted window. Desktop rows and narrow-container cards are measured with `ResizeObserver`. Server rendering uses the same deterministic initial window, while `aria-rowcount` and global `aria-rowindex` preserve the complete semantic row model. Error-summary navigation scrolls an unmounted row into the window before opening its dialog and focusing the invalid field.

The focused viewport handles `Home`, `End`, `Page Up`, and `Page Down` directly. These keys move to the start, end, previous viewport, or next viewport without relying on page-level browser scrolling.

Column `width` values are relative weights. They do not alter schema data. A grid with widths `6`, `2`, and `4` gives the first column half of the editable space while reserving fixed room for row numbers and actions.

At narrow Form container widths, each table row becomes a labeled row card. This is driven by the embedded Form container rather than the browser viewport, so the grid also adapts inside a workflow side panel. Field labels remain available to assistive technology in both layouts.

## Identity and controlled ownership

Data grids do not add keys to form values. Runtime-owned keys preserve mounted field state during local row operations. Hosts that replace controlled rows may derive identity through `identifyRepeaterItem`; `itemKey` remains available only when a required string identifier is an intentional business field.

Persistence, authorization, CSV file handling, export, and remote lookup stay host-owned. A grid column may use an approved widget or data source registry key, but the document must not contain endpoints, credentials, or executable code.

## Designer workflow

The **Data grid** catalog preset creates three real columns—Name, Quantity, and Notes—plus their object-array schema. Authors can rename, reorder, duplicate, remove, or replace those columns with normal Designer operations. The row-display control switches an eligible object repeater between card rows and a data grid without changing its schema or value shape. Data-grid settings select inline or dialog editing and enable measured row virtualization, multiple selection, paste append, fill down, single-column sorting, and cross-column search. Enabling virtualization selects dialog editing and exposes the bounded viewport height; selecting inline editing removes virtualization.

The Designer prevents switching to table layout until the repeater has at least one direct field. Compiler validation remains authoritative for imported documents and agent-authored patches.

## Workflow-node embedding

The documented Router workflow-node example uses a virtualized data grid for `routes`. Its value remains the ordinary metadata-free `{ when, route }[]` node configuration. Per-row validation and host-owned branch options keep their existing wildcard dependency paths and concrete request bindings. The sample also exercises typed TSV append and visible-selection fill-down without adding engine metadata to route objects.

## Current limits

This milestone covers inline and dialog row editing, explicit add/remove/reorder controls, single-column sorting, cross-column filtering, multiple selection, confirmed bounded deletion, TSV append, visible-selection fill-down, and measured row virtualization. CSV file import/export stays host-owned. Hosts should use pagination or another host-owned data strategy when the complete controlled array itself is too large to keep in memory. Shared-option matrix questions use the dedicated `matrix-single` or `matrix-multiple` field widgets instead of data-grid layout.
