# A3S Form Integration Guide

## React

```tsx
import {
  assertCompiled,
  FORM_LOCALE_CATALOG_API_VERSION,
} from '@a3s-lab/ui/form/core';
import { FormDesigner, FormRenderer } from '@a3s-lab/ui/form/react';
import '@a3s-lab/ui/form/a3s-ui.css';

const plan = assertCompiled(document);

<FormDesigner
  document={document}
  value={previewValue}
  onChange={setDocument}
  onValueChange={setPreviewValue}
  onAction={handleAction}
/>

<FormRenderer
  plan={plan}
  value={value}
  errors={hostErrors}
  hostAdapter={hostAdapter}
  locale={locale}
  localeCatalog={{
    apiVersion: FORM_LOCALE_CATALOG_API_VERSION,
    messages: { selectPlaceholder: 'Choose a model' },
  }}
  readOnly={!canEdit}
  wizardCheckpoints={wizardCheckpoints}
  onChange={setValue}
  onAction={handleAction}
  onWizardCheckpointChange={({ checkpoint }) => {
    setWizardCheckpoints((current) => ({
      ...current,
      [checkpoint.wizardId]: checkpoint,
    }));
  }}
/>
```

Both components are controlled. Persist the next document or value in the host; internal component state is not a business source of truth.

Before accepting a workflow configuration or durable interaction, call the public `evaluateFormValue` path on the server or use the native `evaluate_form_value`/`evaluate_bytes` API. All of these enter the same Rust semantic core. See [Portable submitted-value evaluation](value-evaluation.md) for the versioned protocol and protected host sequence.

## A3S UI styles

Import `@a3s-lab/ui/form/a3s-ui.css` once in A3S products and standalone surfaces. It combines the published A3S UI 0.3.0 stylesheet with the Form layout layer. Fields use the documented A3S UI `field`, `input`, `textarea`, `select`, `fieldset`, `btn`, `tabs`, `accordion`, `table`, and `progress` contracts.

Use `@a3s-lab/ui/form/styles.css` when the host already loads A3S UI or must not receive document-level styles. This isolated entry stays inside `.a3s-form-designer` and `.a3s-form-renderer` and does not install a global preflight.

Use `--a3s-*` custom properties on a host container to theme an embedded form. Avoid overrides against internal class names.

## Workflow node configuration

The workflow host stores a controlled value and a configuration-mode `FormRef`. The form reference pins a published document by URI, revision, and digest.

```ts
import {
  createWorkflowNodeConfiguration,
  validateWorkflowNodeConfiguration,
} from '@a3s-lab/ui/form/workflow';

const configuration = createWorkflowNodeConfiguration({
  nodeType: 'llm',
  nodeId: 'llm-7',
  form: configurationFormRef,
  value: node.configuration,
  locale: organization.locale,
  readOnly: !permissions.canEditNode,
});

const result = validateWorkflowNodeConfiguration(publishedDocument, configuration, {
  capabilities: { widgets: Object.keys(nodeRegistry) },
});

if (!result.ok) {
  showNodeErrors(result.errors);
} else {
  await workflowHost.updateNode(configuration.nodeId, {
    ...configuration,
    value: result.value,
  });
}
```

The contract has no A3S Cloud, A3S Workflow service, or platform runtime dependency. See [Embedding A3S Form](embedding.md) and the tested [`WorkflowNodeSettingsHost`](../examples/workflow-node-settings-host.tsx).

### Repeated node parameters

Use a `repeater` node with child fields for an object-array parameter. The host still stores the array as ordinary configuration and receives the entire next value through `onChange`. A3S Form keeps local row keys outside the value.

When a host recreates or reorders row objects from another state store, provide `hostAdapter.identifyRepeaterItem` and return a stable business identity. Do not add an A3S-only property to node configuration just to satisfy React keying. If the document already has a required string identifier, it may declare that property as `itemKey` instead.

Use `scope: 'row'` for calculations, validation, visibility, or enablement that must run independently in each repeated node parameter. Expression paths keep `*` placeholders in the document; runtime errors, traces, and host validation continue to use concrete paths.

Set `layout: 'data-grid'` on that object repeater when users need to compare and edit a compact set of repeated parameters in columns. Direct children must be fields. Desktop and narrow side-panel presentations keep the same metadata-free object-array value and host callback.

See [Repeatable field groups](repeatable-field-groups.md) for the base contract and [Editable data grids](data-grids.md) for the table layout, responsive behavior, and current boundaries.

### Multi-page node and interaction forms

Use a `wizard` layout with direct `page` children when a form requires progress, previous/next navigation, per-page validation, branching, or a final review. Do not use tabs as a wizard substitute.

Wizard navigation is separate from the controlled value. Persist `FormWizardCheckpoint` in the workflow run, draft, or host session and pass checkpoints back through `wizardCheckpoints`. Checkpoints are pinned to the plan digest and revision; `restoreFormWizardCheckpoint` rejects stale state before it can reopen another contract.

The async validator receives `{ kind: 'page', nodeId }` when the user advances. Return only issues owned by that page. Final primary actions still run form-level validation and reopen an earlier page when it owns the first error.

See [Multi-page wizards](wizards.md) for the document structure, branching semantics, checkpoint helpers, review behavior, and adapter events.

## Custom nodes

`FormNodeRegistry` keeps a business component's catalog entry, default schema, design view, inspector, and runtime view under one approved registry key. Documents store the key and JSON configuration; they never store executable JavaScript.

```tsx
import {
  defineFormNodeRegistry,
  FormInspectorControl,
  FormInspectorToggle,
  type FormNodeDesignProps,
  type FormNodeInspectorProps,
  type FormNodeRenderProps,
} from '@a3s-lab/ui/form/react';

const nodeRegistry = defineFormNodeRegistry({
  'company.rating': {
    kind: 'field',
    catalog: {
      section: 'business',
      sectionLabel: 'Business',
      label: 'Rating',
      description: 'Collect a score from one to five.',
      glyph: 'R',
    },
    schema: { type: 'number', minimum: 1, maximum: 5 },
    defaults: { width: 6, customProps: { maximum: 5 } },
    design: RatingDesign,
    inspector: RatingInspector,
    render: RatingNode,
  },
});

function RatingDesign({ node }: FormNodeDesignProps) {
  return <div>{node.label}: 0 / 5</div>;
}

function RatingInspector({ node, onUpdate }: FormNodeInspectorProps) {
  return (
    <>
      <FormInspectorControl label="Maximum score" hint="3–10">
        <input
          type="number"
          min="3"
          max="10"
          value={Number(node.customProps?.maximum ?? 5)}
          onChange={(event) => {
            const maximum = Number(event.target.value);
            onUpdate({ node: { customProps: { maximum } }, schema: { maximum } });
          }}
        />
      </FormInspectorControl>
      <FormInspectorToggle
        label="Show score"
        checked={node.customProps?.showScore !== false}
        onChange={(showScore) =>
          onUpdate({ node: { customProps: { ...node.customProps, showScore } } })
        }
      />
    </>
  );
}

function RatingNode({ node, value, onChange }: FormNodeRenderProps) {
  return (
    <button type="button" onClick={() => onChange(5)}>
      {node.label}: {String(value ?? 0)} / 5
    </button>
  );
}
```

Pass the same registry to compilation, Designer, and Renderer. Unknown keys fail compilation.

Custom inspectors should compose `FormInspectorControl`, `FormInspectorSection`, `FormInspectorSettingGroup`, and `FormInspectorToggle` from `@a3s-lab/ui/form/react`. These primitives preserve the published A3S UI field, input, select, accordion, and switch contracts inside the Designer task pane.

## Vue 3

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { A3SFormRenderer } from '@a3s-lab/ui/form/vue';

const value = ref({});
</script>

<template>
  <A3SFormRenderer
    :plan="plan"
    v-model="value"
    :errors="hostErrors"
    :host-adapter="hostAdapter"
    :locale="locale"
    :locale-catalog="localeCatalog"
    :node-registry="nodeRegistry"
    :read-only="!canEdit"
    :widget-registry="widgetRegistry"
    :wizard-checkpoints="wizardCheckpoints"
    @action="({ actionId, value }) => handleAction(actionId, value)"
    @wizard-checkpoint-change="handleWizardCheckpoint"
  />
</template>
```

The Vue adapter unwraps reactive proxies before passing documents, plans, values, and registries into the runtime. The Designer adapter also accepts `compileOptions` and emits `action`.

## Web Components

```ts
import { defineA3SFormElements } from '@a3s-lab/ui/form/web-component';

defineA3SFormElements();

const renderer = document.querySelector('a3s-form-renderer');
renderer.plan = plan;
renderer.value = value;
renderer.errors = hostErrors;
renderer.hostAdapter = hostAdapter;
renderer.locale = locale;
renderer.localeCatalog = localeCatalog;
renderer.nodeRegistry = nodeRegistry;
renderer.readOnly = !canEdit;
renderer.widgetRegistry = widgetRegistry;
renderer.wizardCheckpoints = wizardCheckpoints;
renderer.addEventListener('value-change', (event) => updateValue(event.detail));
renderer.addEventListener('form-action', (event) => handleAction(event.detail));
renderer.addEventListener('wizard-checkpoint-change', (event) => {
  updateWizardCheckpoint(event.detail);
});
```

Registration is idempotent. Events bubble and are composed. Setting `plan` or `document` to `undefined` clears the mounted React surface.

## A3S Cloud host adapter

```ts
import { createA3SCloudFormAdapter } from '@a3s-lab/ui/form/cloud';

const hostAdapter = createA3SCloudFormAdapter({
  context: { organizationId, projectId, environmentId, locale },
  resolveDataSource: (context, request, signal) =>
    cloud.forms.resolveOptions(context, request, signal),
  invokeAction: (context, request, signal) =>
    cloud.forms.invokeAction(context, request, signal),
});
```

The adapter binds context only. Authorization, tenant isolation, rate limits, storage, secrets, and audit remain Cloud responsibilities.

## Dynamic option sources

`FormHostAdapter.resolveDataSource` accepts the source definition, the current controlled value, locale, optional search query and cursor, and a cancellation signal. It may return a legacy `UiOption[]` or a paginated `{ options, nextCursor? }` page.

Declare only the value paths that affect a source in `dependencies`. The Renderer then avoids refetching after unrelated edits, cancels work after dependency changes, and deduplicates matching requests within the current embedded instance. Search, focus triggers, TTL caching, pagination, and failure states use the same contract in React, Vue, and Web Components.

Repeated fields may declare templates such as `routes.*.provider`. Renderer requests include `scope.valuePath`, ordered `scope.rowIndices`, and `{ template, path }` dependency bindings. Use the concrete path to read the controlled value. The binding is request context, not data to persist in the workflow node.

See [Host-owned data sources](data-sources.md) for the complete contract and security boundary.

## Durable workflow interactions

```ts
import {
  createFormReleaseRef,
  createInteractionRequest,
  createInteractionSubmission,
  validateInteractionSubmission,
} from '@a3s-lab/ui/form/workflow';

const form = createFormReleaseRef(publishedDocument, {
  organizationId,
  projectId,
  formId,
  releaseId,
  uri: `a3s://forms/${formId}/releases/${releaseId}`,
});

const request = createInteractionRequest({
  requestId,
  identity: {
    workflowRunId,
    flowRunId,
    stepId,
    stepAttempt,
    humanTaskId,
    flowHookId,
  },
  form,
  assignment: {
    policyId,
    policyRevision,
    policyDigest,
    claimedPrincipalId,
  },
  task: {
    version: taskVersion,
    createdAt,
    dueAt,
    expiresAt,
  },
  allowedOutcomes: ['approve', 'reject'],
  outputMapping: {
    kind: 'registry',
    registryKey: 'workflow.approval-decision',
    revision: 3,
    digest: outputMappingDigest,
  },
  maxValueBytes: 4_096,
  initialValue,
});

const submission = createInteractionSubmission(request, {
  submissionId,
  principalId: authenticatedPrincipalId,
  outcome: 'approve',
  idempotencyKey,
  submittedAt: new Date().toISOString(),
  value,
});

const result = validateInteractionSubmission(
  publishedDocument,
  request,
  submission,
  {
    currentTime: new Date().toISOString(),
    authenticatedPrincipalId,
    authorization: 'granted',
    taskStatus: 'claimed',
    taskVersion,
    claimedPrincipalId,
  },
);
```

The v1 request is not a browser-generated convenience envelope. It binds the Cloud `WorkflowRun`, Flow run and hook, step attempt, `HumanTask`, exact `FormReleaseRef`, assignment policy, claimant, task version and deadlines, allowed outcomes, bounded output-mapping policy, and maximum canonical value size. Its digest covers every one of those fields.

The submission binds the original request digest, identities, Form release, assignment policy, task version, principal, outcome, idempotency key, timestamp, and canonical value digest. Validation also receives protected current authorization and task state; changing the submitted envelope cannot grant access or revive a terminal task.

Cloud remains responsible for locking the task aggregate, authenticating the principal, checking grants and idempotency, committing the immutable submission and decision, and resuming Flow through its Outbox. A3S Form validates and canonicalizes the bounded value but does not persist a task or call a Flow hook.

The wire identifiers are:

- `a3s.dev/form-release-ref/v1`
- `a3s.dev/form-interaction-request/v1`
- `a3s.dev/form-interaction-submission/v1`

TypeScript and native Rust verify the same canonical bytes and digests through [`interaction-contract-v1.json`](../tests/conformance/interaction-contract-v1.json). An in-flight run always uses its original request and Form release even after a newer release is published.

## CLI and coding-agent skill

```bash
node dist/form/cli.js sample --output form.json --pretty
node dist/form/cli.js validate form.json --pretty
node dist/form/cli.js compile form.json --output plan.json --pretty
node dist/form/cli.js diff before.json after.json --output change.patch.json --pretty
node dist/form/cli.js patch form.json change.patch.json --output candidate.json --pretty
```

The `$a3s-form` skill uses the CLI for validation and revision-bound patches. It does not infer a document by scraping Designer DOM.

## Compiler Worker

```ts
import { FormCompilerClient } from '@a3s-lab/ui/form';

const worker = new Worker(new URL('@a3s-lab/ui/form/compiler.worker.js', import.meta.url), {
  type: 'module',
});
const compiler = new FormCompilerClient(worker);
const result = await compiler.compile(document, options, abortSignal);
compiler.dispose();
```

Each request has a unique ID. Cancellation and disposal reject the matching promise and ignore stale Worker responses.
