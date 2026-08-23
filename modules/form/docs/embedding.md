# Embedding A3S Form

A3S Form is a controlled engine, not a page framework. A host supplies the document, value, capabilities, external errors, and action handlers. The engine compiles and renders the form but does not own storage, authentication, authorization, secrets, or network policy.

## Controlled React host

```tsx
import { useMemo, useState } from 'react';
import {
  assertCompiled,
  type FieldError,
  type FormDocument,
  type FormHostAdapter,
  type JsonObject,
} from '@a3s-lab/ui/form/core';
import { FormRenderer } from '@a3s-lab/ui/form/react';
import '@a3s-lab/ui/form/a3s-ui.css';

function EmbeddedForm(props: {
  document: FormDocument;
  initialValue: JsonObject;
  onSubmit: (value: JsonObject) => Promise<void>;
}) {
  const plan = useMemo(() => assertCompiled(props.document), [props.document]);
  const [value, setValue] = useState(props.initialValue);
  const [errors, setErrors] = useState<FieldError[]>([]);

  return (
    <FormRenderer
      plan={plan}
      value={value}
      errors={errors.length > 0 ? errors : undefined}
      onChange={(nextValue) => {
        setErrors([]);
        setValue(nextValue);
      }}
      onAction={async (_actionId, validatedValue) => {
        setErrors([]);
        await props.onSubmit(validatedValue);
      }}
    />
  );
}
```

The host remains the value owner. It must revalidate submitted values at the trusted commit boundary and map rejected fields back through the public `FieldError` contract.

## Host responsibilities

The embedding host owns:

- the current value and persistence transaction;
- authentication, authorization, tenant boundaries, and secrets;
- data-source, asynchronous-validation, file, signature, and action implementations;
- publication policy and access to the immutable `FormDocument`;
- durable wizard checkpoints, audit records, and recovery policy.

A3S Form owns deterministic compilation, synchronous validation, stable host-error mapping, field state, accessible rendering, adapter events, and the immutable plan derived from the document. Every accepted plan identifies its schema profile and compiler revision. Hosts should reject an unsupported profile instead of attempting a partial render.

## Repeatable values

Object arrays render as repeatable field groups when a `repeater` node owns child fields under its item schema. Add, edit, move, and remove operations emit one complete controlled value through `onChange`; the engine does not add hidden row IDs to submitted data.

React keeps runtime row keys while the component remains mounted. If a host recreates row objects from another state store, it can derive identity from an existing business key:

```tsx
const hostAdapter: FormHostAdapter = {
  identifyRepeaterItem({ node, item }) {
    if (node.id !== 'routes' || !item || typeof item !== 'object' || Array.isArray(item)) {
      return undefined;
    }
    return typeof item.route === 'string' ? item.route : undefined;
  },
};
```

Use `UiNode.itemKey` only when the schema intentionally declares that property as a required string. Runtime identity or `identifyRepeaterItem` keeps engine metadata out of persisted values. Nested fields receive concrete paths such as `routes.0.when.equals`; external errors and field-level asynchronous validation must use the same paths.

## Wizard state

Multi-page navigation is controlled independently from form values. Persist `FormWizardCheckpoint` beside the host draft or task, not inside the submitted value. The checkpoint pins the form digest and revision and identifies the current and completed pages. React uses `wizardCheckpoints` and `onWizardCheckpointChange`; Vue and Web Components forward the same boundary through their native event models.

The Renderer validates the active page before advancing. Final submission still validates the complete visible branch against the pinned plan. See [Multi-page wizards](wizards.md).

## Framework surfaces

React is the reference runtime. Vue and Web Components expose the same controlled values, wizard checkpoints, actions, external errors, locale catalogs, read-only state, host adapters, widget registries, and custom-node registries. Designer adapters also accept compiler capabilities.

Web Components are registered explicitly:

```ts
import { defineA3SFormElements } from '@a3s-lab/ui/form/web-component';

defineA3SFormElements();

const renderer = document.querySelector('a3s-form-renderer');
renderer.plan = plan;
renderer.value = value;
renderer.errors = hostErrors;
renderer.hostAdapter = hostAdapter;
renderer.locale = organization.locale;
renderer.readOnly = !permissions.canEdit;
renderer.addEventListener('value-change', (event) => updateDraft(event.detail));
renderer.addEventListener('form-action', (event) => runHostAction(event.detail));
```

See [Host-owned asynchronous validation](async-validation.md) and [Host-owned data sources](data-sources.md) for cancellation, dependency-aware loading, search, pagination, cache isolation, and error recovery.

## CSS boundary

Use `@a3s-lab/ui/form/a3s-ui.css` when the host wants the complete published A3S UI visual system. Use `@a3s-lab/ui/form/styles.css` when the host already loads A3S UI or requires strict CSS isolation. The isolated entry stays in the `a3s-form-*` namespace and component roots, does not ship a global preflight, and remains protected by embedding size and selector checks.

Theme the host boundary with documented custom properties instead of overriding internal selectors:

```css
.embedded-form {
  --a3s-blue: #2563eb;
  --a3s-panel: #ffffff;
  --a3s-line: #e5e7eb;
  --a3s-radius: 12px;
}
```
