import {
  type AsyncValidationRequest,
  type AsyncValidationResponse,
  assertCompiled,
  mapAsyncValidationIssues,
  validateFormValueAsync,
} from '../src/core';
import { createDocument, createObjectRepeaterDocument } from './fixtures';

describe('host-owned asynchronous validation', () => {
  const plan = () => assertCompiled(createDocument());

  it('sends a derived snapshot and maps host issues to stable field errors', async () => {
    let received: AsyncValidationRequest | undefined;
    const result = await validateFormValueAsync(
      plan(),
      { name: 'Taken name' },
      async (request): Promise<AsyncValidationResponse> => {
        received = request;
        request.value.name = 'mutated by host adapter';
        return {
          issues: [
            { path: 'name', code: 'name_taken', message: 'This name is already in use.' },
            { path: 'name', code: 'name_taken', message: 'This name is already in use.' },
            { code: 'reserved', message: 'Choose another name.' },
          ],
        };
      },
      {
        scope: { kind: 'field', nodeId: 'name', path: 'name' },
        trigger: 'blur',
        locale: 'en-US',
      },
    );

    expect(received).toEqual(
      expect.objectContaining({
        scope: { kind: 'field', nodeId: 'name', path: 'name' },
        trigger: 'blur',
        locale: 'en-US',
      }),
    );
    expect(result.value).toEqual({ name: 'Taken name' });
    expect(result.status).toBe('invalid');
    expect(result.asyncErrors).toEqual([
      { path: 'name', code: 'async.name_taken', message: 'This name is already in use.' },
      { path: 'name', code: 'async.reserved', message: 'Choose another name.' },
    ]);
    expect(result.errors).toEqual(result.asyncErrors);
  });

  it('does not call the host when synchronous errors already block the requested scope', async () => {
    let calls = 0;
    const validator = async (): Promise<AsyncValidationResponse> => {
      calls += 1;
      return { issues: [] };
    };

    const field = await validateFormValueAsync(plan(), {}, validator, {
      scope: { kind: 'field', nodeId: 'name', path: 'name' },
      trigger: 'blur',
    });
    const form = await validateFormValueAsync(plan(), {}, validator);

    expect(calls).toBe(0);
    expect(field.status).toBe('invalid');
    expect(field.asyncErrors).toEqual([]);
    expect(field.errors).toContainEqual(
      expect.objectContaining({ path: 'name', code: 'required' }),
    );
    expect(form.status).toBe('invalid');

    const nestedDocument = createDocument();
    if (!nestedDocument.schema.properties) throw new Error('Missing fixture properties.');
    nestedDocument.schema.properties.name = {
      type: 'object',
      properties: { first: { type: 'string' } },
      required: ['first'],
    };
    const nested = await validateFormValueAsync(
      assertCompiled(nestedDocument),
      { name: {} },
      validator,
      { scope: { kind: 'field', nodeId: 'name', path: 'name' }, trigger: 'blur' },
    );
    expect(nested.status).toBe('invalid');
    expect(nested.errors).toContainEqual(expect.objectContaining({ path: 'name.first' }));
    expect(calls).toBe(0);
  });

  it('fails closed for adapter failures, malformed responses, and invalid scopes', async () => {
    const unavailable = await validateFormValueAsync(plan(), { name: 'Valid' }, async () => {
      throw new Error('private upstream detail');
    });
    expect(unavailable.status).toBe('unavailable');
    expect(unavailable.asyncErrors).toEqual([
      expect.objectContaining({ path: '', code: 'async.unavailable' }),
    ]);
    expect(unavailable.asyncErrors[0].message).not.toContain('private upstream detail');

    const malformed = await validateFormValueAsync(
      plan(),
      { name: 'Valid' },
      async () => ({ errors: [] }) as never,
    );
    expect(malformed.status).toBe('unavailable');
    expect(malformed.asyncErrors).toEqual([
      expect.objectContaining({ path: '', code: 'async.invalid_response' }),
    ]);

    const invalidCode = await validateFormValueAsync(plan(), { name: 'Valid' }, async () => ({
      issues: [{ code: 'NOT STABLE', message: 'Bad code.' }],
    }));
    expect(invalidCode.asyncErrors[0].code).toBe('async.invalid_response');

    const invalidScope = await validateFormValueAsync(
      plan(),
      { name: 'Valid' },
      async () => ({ issues: [] }),
      { scope: { kind: 'field', nodeId: 'age', path: 'name' }, trigger: 'blur' },
    );
    expect(invalidScope.status).toBe('unavailable');
    expect(invalidScope.asyncErrors[0].code).toBe('async.invalid_scope');
  });

  it('returns cancellation without applying a late host response', async () => {
    const controller = new AbortController();
    let resolve: ((value: AsyncValidationResponse) => void) | undefined;
    const pending = validateFormValueAsync(
      plan(),
      { name: 'First value' },
      () =>
        new Promise<AsyncValidationResponse>((next) => {
          resolve = next;
        }),
      {},
      controller.signal,
    );

    controller.abort();
    resolve?.({ issues: [{ path: 'name', code: 'stale', message: 'Stale response.' }] });
    const result = await pending;

    expect(result.status).toBe('cancelled');
    expect(result.asyncErrors).toEqual([]);
    expect(result.errors).toEqual([]);

    const alreadyAborted = new AbortController();
    alreadyAborted.abort();
    let called = false;
    const immediate = await validateFormValueAsync(
      plan(),
      { name: 'Valid' },
      async () => {
        called = true;
        return { issues: [] };
      },
      {},
      alreadyAborted.signal,
    );
    expect(immediate.status).toBe('cancelled');
    expect(called).toBe(false);

    const abortedFailure = new AbortController();
    const rejected = await validateFormValueAsync(
      plan(),
      { name: 'Valid' },
      async () => {
        abortedFailure.abort();
        throw new Error('ignored after cancellation');
      },
      {},
      abortedFailure.signal,
    );
    expect(rejected.status).toBe('cancelled');
  });

  it('validates a concrete field instance inside an object repeater row', async () => {
    const repeaterPlan = assertCompiled(createObjectRepeaterDocument());
    let received: AsyncValidationRequest | undefined;
    const result = await validateFormValueAsync(
      repeaterPlan,
      {
        recipients: [{ rowId: 'recipient-1', name: 'Ada', email: 'ada@example.test' }],
      },
      async (request) => {
        received = request;
        return { issues: [{ code: 'reserved', message: 'Use another recipient.' }] };
      },
      {
        scope: {
          kind: 'field',
          nodeId: 'recipient-email',
          path: 'recipients.0.email',
        },
        trigger: 'blur',
      },
    );

    expect(received?.scope).toEqual({
      kind: 'field',
      nodeId: 'recipient-email',
      path: 'recipients.0.email',
    });
    expect(result.status).toBe('invalid');
    expect(result.asyncErrors).toEqual([
      {
        path: 'recipients.0.email',
        code: 'async.reserved',
        message: 'Use another recipient.',
      },
    ]);
  });

  it('accepts an absent validator and enforces the closed issue response shape', async () => {
    await expect(validateFormValueAsync(plan(), { name: 'Valid' })).resolves.toEqual(
      expect.objectContaining({ status: 'valid', asyncErrors: [] }),
    );
    expect(
      mapAsyncValidationIssues(
        { issues: [{ path: '', code: 'form_conflict', message: '  Resolve the conflict.  ' }] },
        { kind: 'form' },
      ),
    ).toEqual([{ path: '', code: 'async.form_conflict', message: 'Resolve the conflict.' }]);

    for (const response of [
      null,
      [],
      { issues: 'invalid' },
      { issues: [], extra: true },
      { issues: [null] },
      { issues: [{ code: 'invalid', message: 'Invalid.', extra: true }] },
      { issues: [{ path: 'profile..name', code: 'invalid', message: 'Invalid.' }] },
      { issues: [{ path: 2, code: 'invalid', message: 'Invalid.' }] },
      { issues: [{ code: 2, message: 'Invalid.' }] },
      { issues: [{ code: 'invalid', message: 2 }] },
      { issues: [{ code: 'invalid', message: '  ' }] },
    ]) {
      expect(() => mapAsyncValidationIssues(response, { kind: 'form' })).toThrow(TypeError);
    }

    const localizedDocument = createDocument();
    localizedDocument.metadata.locale = 'fr-FR';
    const localizedPlan = assertCompiled(localizedDocument);
    let request: AsyncValidationRequest | undefined;
    const defaulted = await validateFormValueAsync(
      localizedPlan,
      { name: 'Valid' },
      async (next) => {
        request = next;
        return { issues: [] };
      },
      { scope: { kind: 'field', nodeId: 'name', path: 'name' } },
    );
    expect(defaulted.status).toBe('valid');
    expect(request).toEqual(expect.objectContaining({ trigger: 'blur', locale: 'fr-FR' }));

    const fallbackPlan = structuredClone(plan());
    delete fallbackPlan.metadata.locale;
    let fallbackRequest: AsyncValidationRequest | undefined;
    await validateFormValueAsync(fallbackPlan, { name: 'Valid' }, async (next) => {
      fallbackRequest = next;
      return { issues: [] };
    });
    expect(fallbackRequest?.locale).toBe('en-US');
  });
});
