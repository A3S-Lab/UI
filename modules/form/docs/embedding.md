# Embedding A3S Form

A3S Form is a controlled engine, not a page framework. A host supplies the document, value, capabilities, errors, and action handlers. The engine compiles and renders the form but does not own storage, authentication, secrets, or network policy.

## Controlled settings panels

An embedding host keeps the current value in its own state and pins the published form by URI, revision, and digest. The same pattern works for inspectors, settings drawers, approval forms, and other bounded product surfaces.

```tsx
import { useMemo, useState } from 'react';
import {
  compileForm,
  type FieldError,
  type FormDocument,
  type FormRef,
  type JsonObject,
} from '@a3s-lab/ui/form/core';
import { FormRenderer } from '@a3s-lab/ui/form/react';
import '@a3s-lab/ui/form/a3s-ui.css';

function SettingsPanel(props: {
  document: FormDocument;
  form: FormRef;
  initialValue: JsonObject;
  onSave: (value: JsonObject) => Promise<void>;
}) {
  const [value, setValue] = useState(props.initialValue);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const compiled = useMemo(
    () => compileForm(props.document, { requireDigest: true }),
    [props.document],
  );

  if (
    !compiled.ok ||
    !compiled.document ||
    !compiled.plan ||
    compiled.document.revision !== props.form.revision ||
    compiled.document.digest !== props.form.digest
  ) {
    return <p role="alert">This panel references another form release.</p>;
  }

  return (
    <FormRenderer
      plan={compiled.plan}
      value={value}
      errors={errors.length > 0 ? errors : undefined}
      onChange={(next) => {
        setErrors([]);
        setValue(next);
      }}
      onAction={async (_actionId, validatedValue) => {
        setErrors([]);
        await props.onSave(validatedValue);
      }}
    />
  );
}
```

The host remains the only value owner. It should repeat the digest and submitted-value checks on the trusted commit path before accepting a change.

## Host responsibilities

The embedding host owns:

- the current value and persistence transaction;
- authentication, authorization, tenant boundaries, and secrets;
- data-source, asynchronous validation, and action implementations through `FormHostAdapter`;
- publication policy and access to the pinned `FormDocument`;
- product lifecycle, undo, audit, and deployment;
- durable wizard checkpoints and resume-token policy when a node or interaction form uses pages.

A3S Form owns compilation, synchronous validation, cancellation and stable mapping for host validation, field state, accessible rendering, adapter events, and the immutable plan derived from the pinned document. The host still owns the validation service, credentials, retry policy, and server-side commit check.

Every accepted plan identifies `a3s.dev/form-schema-profile/1`. An embedding host should treat a different `schemaProfile` as an unsupported contract instead of attempting to render it. See [Schema Profile 1](schema-profile-1.md) for the keyword and format boundary.

## Repeatable settings

Object arrays render as repeatable field groups when a `repeater` node owns child fields under its item schema. Add, edit, move, and remove operations still emit one complete controlled value through `onChange`. The engine does not add a hidden row ID to that value.

React keeps runtime row keys while the component remains mounted. If the host replaces rows with newly allocated objects, it can derive identity from an existing business key:

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

Use `UiNode.itemKey` only when the form schema intentionally declares that property as a required string. New rows receive a generated value because the document requested one. For settings without a business row key, omit `itemKey`; runtime identity or `identifyRepeaterItem` keeps engine metadata out of persisted values.

Nested fields receive concrete paths such as `routes.0.when.equals`. Host errors and field-level asynchronous validation must use those concrete paths. Row-scoped rules and data-source templates bind against the same ordered row indices without adding metadata to the value. See [Repeatable field groups](repeatable-field-groups.md) for the complete contract.

## Wizard state

Multi-page navigation is controlled independently from the form value. Persist `FormWizardCheckpoint` beside the host draft or interaction record, not inside the submitted value. The checkpoint pins the form digest and revision and identifies the current and completed pages. React uses `wizardCheckpoints` and `onWizardCheckpointChange`; Vue and Web Components forward the same boundary through their native event models.

Page visibility uses ordinary bounded rules. The Renderer validates the active page before advancing and sends `{ kind: 'page', nodeId }` to host validation. Final commit still validates the complete visible branch against the pinned plan. See [Multi-page wizards](wizards.md).

## Framework surfaces

React is the reference runtime. Vue and Web Components expose the same host-facing configuration where it applies: controlled values, wizard checkpoints, actions, external errors, locale catalogs, read-only state, host adapters, widget registries, and custom-node registries. The Designer adapters also accept compiler capabilities.

The locale catalog is host state, not form data. Keep organization wording, product terminology, and temporary copy changes outside `FormDocument`. See [Runtime localization](localization.md).

Web Components are registered explicitly:

```ts
import { defineA3SFormElements } from '@a3s-lab/ui/form/web-component';

defineA3SFormElements();

const renderer = document.querySelector('a3s-form-renderer');
renderer.plan = plan;
renderer.value = node.configuration;
renderer.errors = hostErrors;
renderer.hostAdapter = hostAdapter;
renderer.locale = organization.locale;
renderer.localeCatalog = organization.formLocaleCatalog;
renderer.readOnly = !permissions.canEditNode;
renderer.addEventListener('value-change', (event) => updateDraft(event.detail));
renderer.addEventListener('form-action', (event) => runHostAction(event.detail));
```

See [Host-owned asynchronous validation](async-validation.md) for the `validateValue` adapter contract and [Host-owned data sources](data-sources.md) for dependency-aware option loading, search, pagination, cache isolation, and cancellation.

For a row-scoped data source, inspect `request.scope.dependencies` and read the concrete bound path from `request.value`. The host receives both the document template and concrete path, so it never needs to infer a row from DOM state or private renderer keys.

The compiler records each field's value, rule, and data-source dependencies in `FormPlan.nodeSubscriptions`. The React runtime uses that index to skip unrelated field renders. Event handlers and pagination still read the latest whole controlled value, so skipped renders cannot overwrite another node setting.

## CSS boundary

Use `@a3s-lab/ui/form/a3s-ui.css` when the host wants the complete published A3S UI visual system. Use `@a3s-lab/ui/form/styles.css` when the host already loads A3S UI or requires strict CSS isolation. The isolated entry stays in the `a3s-form-*` namespace and component roots, does not ship a global preflight, and remains protected by the embedding size and selector checks.

Theme with host-level custom properties instead of overriding internal selectors:

```css
.settings-panel {
  --a3s-blue: #4f46e5;
  --a3s-panel: #ffffff;
  --a3s-line: #e5e7eb;
  --a3s-radius: 12px;
}
```
