# Host-owned asynchronous validation

A3S Form keeps asynchronous validation behind the host boundary. A form document cannot declare a URL, send credentials, or execute validation code. The embedding host provides one optional `validateValue` function through `FormHostAdapter` and remains responsible for authorization, network policy, retries, and server-side enforcement.

## Adapter contract

```ts
import type { FormHostAdapter } from '@a3s-lab/ui/form/core';

const hostAdapter: FormHostAdapter = {
  async validateValue(request, signal) {
    const response = await fetch('/api/forms/validate', {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        formDigest: request.plan.sourceDigest,
        scope: request.scope,
        trigger: request.trigger,
        value: request.value,
      }),
    });
    const body = await response.json();
    return {
      issues: body.issues.map((issue: { field?: string; code: string; message: string }) => ({
        path: issue.field,
        code: issue.code,
        message: issue.message,
      })),
    };
  },
};
```

The request contains the immutable `FormPlan`, a cloned value snapshot, locale, trigger, and one scope:

- `{ kind: "field", nodeId, path }` runs after that field loses focus;
- `{ kind: "page", nodeId }` runs before a wizard advances from that page;
- `{ kind: "form" }` runs before a primary submit action.

Synchronous computed, schema, and expression validation runs first. A synchronous error in the requested scope prevents the network call. Draft and secondary actions are not blocked by submit validation.

## Stable issue mapping

The adapter returns only an `issues` array:

```ts
{
  issues: [
    {
      path: 'model',
      code: 'model_unavailable',
      message: 'Choose a model available in this environment.'
    }
  ]
}
```

Issue codes use lowercase letters, digits, dots, underscores, or hyphens and begin with a letter. The runtime maps `model_unavailable` to the stable `FieldError` code `async.model_unavailable`. An omitted path falls back to the current field for field validation and to the form root for form validation. Duplicate issues are removed.

Malformed responses fail closed as `async.invalid_response`. Adapter failures become `async.unavailable`; exception details are not rendered or copied into a field error. A mismatched field or page scope becomes `async.invalid_scope`. A page-scoped response that points to another page is also rejected as invalid.

## Cancellation and race behavior

Every field path owns its current `AbortController`. A later validation of the same field aborts the earlier request. Any controlled value, plan, or host-adapter change cancels all pending validation and clears results that belong to the previous snapshot.

Page and submit validation have separate controllers. While either is pending, the relevant navigation or action is disabled and the form exposes `aria-busy`. A late response is ignored even when an adapter does not stop immediately after receiving the abort signal. Unmounting the Renderer aborts all validation owned by that instance.

React is the reference implementation. Vue and Web Components forward the same `FormHostAdapter`, so their field, submit, cancellation, and error behavior is identical.

## Headless validation

Use the same contract outside a Renderer:

```ts
const controller = new AbortController();
const result = await validateFormValueAsync(
  plan,
  value,
  hostAdapter.validateValue,
  { scope: { kind: 'form' }, trigger: 'submit', locale: 'en-US' },
  controller.signal,
);

if (result.status === 'valid') {
  await commit(result.value);
}
```

`status` is `valid`, `invalid`, `cancelled`, or `unavailable`. `result.errors` contains synchronous and mapped asynchronous errors; `result.asyncErrors` contains only host-boundary results.

Client-side success is never an authorization decision. The product host must repeat its protected business checks in the server-side commit transaction and keep the form revision and digest pinned there.
