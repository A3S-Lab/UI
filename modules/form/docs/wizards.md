# Multi-page wizards

A wizard is a semantic layout, not a tab style. It controls which page is mounted, validates the current page before advancing, exposes progress and review UI, and keeps navigation state outside the submitted form value.

## Document structure

Declare a `group`, `section`, or root node with `layout: "wizard"`. Every direct child must be a group or section with `layout: "page"`.

```json
{
  "id": "onboarding",
  "kind": "group",
  "label": "Create workspace",
  "layout": "wizard",
  "children": ["identity-page", "contact-page", "review-page"]
}
```

A page defaults to `pageRole: "form"`. A wizard may have one `review` page, and that page must be last.

```json
[
  {
    "id": "identity-page",
    "kind": "group",
    "label": "Workspace",
    "layout": "page",
    "pageRole": "form",
    "children": ["workspace-name"]
  },
  {
    "id": "contact-page",
    "kind": "group",
    "label": "Contact",
    "layout": "page",
    "pageRole": "form",
    "children": ["contact-email"]
  },
  {
    "id": "review-page",
    "kind": "group",
    "label": "Review",
    "layout": "page",
    "pageRole": "review",
    "children": []
  }
]
```

The compiler rejects empty wizards, non-page children, orphan pages, nested wizards, pages inside repeaters, multiple review pages, and a review page that is not last.

## Branching

Use the existing bounded `visible` rule on a page. The runtime computes the visible page sequence from the controlled value, so progress, previous/next navigation, review output, and checkpoints all use the same branch.

```json
{
  "id": "show-enterprise-verification",
  "target": "verification-page",
  "kind": "visible",
  "expression": {
    "op": "eq",
    "left": { "op": "field", "path": "organizationType" },
    "right": { "op": "literal", "value": "enterprise" }
  }
}
```

Synchronous errors owned only by an invisible wizard page do not block the branch. The same rule applies in headless `evaluateFormValue` calls, so browser and server validation remain aligned. If another visible node outside the hidden page owns the same value path, its error remains active.

## Page validation

Selecting **Next** validates only the fields owned by the current page. Required fields on later pages do not appear early. A failed page remains mounted, its inline errors are rendered, the summary is updated, and focus moves to the first invalid control.

Use `evaluateWizardPageValue` for the same behavior outside React:

```ts
import { evaluateWizardPageValue } from '@a3s-lab/ui/form/core';

const result = evaluateWizardPageValue(plan, value, 'contact-page', {
  locale: 'en-US',
});

if (result.errors.length > 0) {
  showPageErrors(result.errors);
}
```

When `hostAdapter.validateValue` is present, the Renderer follows synchronous validation with a cancellable request whose scope is:

```ts
{
  kind: 'page',
  nodeId: 'contact-page',
}
```

The host may return field issues for that page or a page-level issue with no path. An issue that points to another page is rejected as an invalid response. Value changes, navigation, unmounting, and a newer validation request cancel stale work.

```ts
const hostAdapter = {
  validateValue: async (request, signal) => {
    if (request.scope.kind !== 'page' || request.scope.nodeId !== 'contact-page') {
      return { issues: [] };
    }
    return checkContactPage(request.value, signal);
  },
};
```

Primary form actions appear only on the final visible page. Their existing form-level validation still runs before submission. If final validation finds an error on an earlier page, the Renderer opens that page before focusing the control. Pressing Enter on an earlier page follows the same page-validation path as the Next button.

## Controlled checkpoints

Wizard progress is not written into the form value. The host can persist a separate `FormWizardCheckpoint`:

```ts
interface FormWizardCheckpoint {
  apiVersion: 'a3s.dev/form-wizard-checkpoint/v1alpha1';
  sourceDigest: string;
  sourceRevision: number;
  wizardId: string;
  pageId: string;
  completedPageIds: string[];
}
```

The digest and revision prevent a checkpoint from silently reopening a different form contract. Create and restore checkpoints through the core helpers:

```ts
import {
  createFormWizardCheckpoint,
  restoreFormWizardCheckpoint,
} from '@a3s-lab/ui/form/core';

const created = createFormWizardCheckpoint(
  plan,
  'onboarding',
  'contact-page',
  ['identity-page'],
);

if (created.ok) {
  await checkpointStore.put(runId, created.checkpoint);
}

const restored = restoreFormWizardCheckpoint(plan, savedCheckpoint);
if (!restored.ok) {
  discardStaleCheckpoint(restored.code);
}
```

In React, pass a map keyed by wizard node ID. If `wizardCheckpoints` is omitted, the Renderer keeps temporary navigation state for the mounted instance. Once the prop is supplied, it is controlled and the host must apply emitted changes.

```tsx
<FormRenderer
  plan={plan}
  value={value}
  onChange={setValue}
  wizardCheckpoints={checkpoints}
  onWizardCheckpointChange={({ checkpoint, reason }) => {
    setCheckpoints((current) => ({
      ...current,
      [checkpoint.wizardId]: checkpoint,
    }));
    void saveCheckpoint({ checkpoint, reason });
  }}
/>
```

Reasons are `next`, `previous`, `jump`, and `reconcile`. They describe navigation only; they do not authorize persistence, publication, or a form action.

Vue exposes the same `wizardCheckpoints` prop and `wizardCheckpointChange` event. The Web Component uses the `wizardCheckpoints` property and emits `wizard-checkpoint-change` as a bubbling, composed event.

## Review pages

A `review` page lists visible, value-bearing fields from the active branch in document order. Static option values use their labels, booleans use localized copy, arrays and objects use bounded item counts, and password values are masked. Repeater child fields are not expanded into a second nested form; the parent repeater is summarized by item count.

Each review row includes an edit action that returns to the owning page. The controlled form value is retained throughout navigation.

## Host boundaries

- The form value contains business data only.
- The checkpoint contains navigation state only and is pinned to a plan digest and revision.
- Durable checkpoint storage, resume tokens, identity, authorization, and retention remain host-owned.
- A checkpoint does not bypass page validation or final submission validation.
- Page visibility uses bounded Form expressions; documents do not contain executable JavaScript.
- A hidden branch is excluded from synchronous form validation, but hosts may still enforce organization policy during final form-level validation.

The Form component guides include the **Organization onboarding wizard** example with conditional enterprise verification, page-scoped host validation, a review page, and host-controlled checkpoint updates.
