import { canonicalize, compileForm, type FormDocument, type JsonObject } from '../src/core';
import {
  createFormReleaseRef,
  createInteractionRequest,
  createInteractionSubmission,
  digestInteractionRequest,
  digestInteractionValue,
  type FormInteractionRequest,
  type FormInteractionSubmission,
  type FormInteractionValidationContext,
  inspectFormReleaseRef,
  inspectInteractionRequest,
  inspectInteractionSubmission,
  validateInteractionSubmission,
} from '../src/workflow';
import interactionConformanceJson from './conformance/interaction-contract-v1.json';
import { createDocument } from './fixtures';

const NOW = '2026-08-09T08:30:00.000Z';

function published(): FormDocument {
  return compileForm(createDocument()).document as FormDocument;
}

function computedExpansionDocument(): FormDocument {
  const document = createDocument();
  document.schema = {
    type: 'object',
    properties: {
      source: { type: 'string' },
      expanded: { type: 'string' },
    },
    required: ['source'],
    additionalProperties: false,
  };
  document.ui.nodes = [
    { id: 'root', kind: 'root', children: ['source', 'expanded'] },
    {
      id: 'source',
      kind: 'field',
      schemaPath: '/properties/source',
      widget: 'text',
    },
    {
      id: 'expanded',
      kind: 'field',
      schemaPath: '/properties/expanded',
      widget: 'calculated',
      readOnly: true,
    },
  ];
  document.rules = [
    {
      id: 'expand-source',
      target: 'expanded',
      kind: 'computed',
      expression: {
        op: 'concat',
        values: [
          { op: 'field', path: 'source' },
          { op: 'literal', value: 'x'.repeat(64) },
        ],
      },
    },
  ];
  document.dataSources = [];
  document.actions = [];
  return document;
}

function requestFor(document = published()): FormInteractionRequest {
  const form = createFormReleaseRef(document, {
    organizationId: 'org-1',
    projectId: 'project-1',
    formId: 'approval-form',
    releaseId: 'approval-form-r3',
    uri: 'a3s://forms/approval-form/releases/approval-form-r3',
  });
  return createInteractionRequest({
    requestId: 'interaction-request-1',
    identity: {
      workflowRunId: 'workflow-run-1',
      flowRunId: 'flow-run-1',
      stepId: 'human-review',
      stepAttempt: 2,
      humanTaskId: 'human-task-1',
      flowHookId: 'human-review-2',
    },
    form,
    assignment: {
      policyId: 'approval-policy',
      policyRevision: 4,
      policyDigest: `sha256:${'1'.repeat(64)}`,
      claimedPrincipalId: 'user-reviewer',
    },
    task: {
      version: 7,
      createdAt: '2026-08-09T08:00:00.000Z',
      dueAt: '2026-08-09T09:00:00.000Z',
      expiresAt: '2026-08-09T10:00:00.000Z',
    },
    allowedOutcomes: ['approve', 'reject'],
    outputMapping: {
      kind: 'registry',
      registryKey: 'workflow.approval-decision',
      revision: 3,
      digest: `sha256:${'2'.repeat(64)}`,
    },
    maxValueBytes: 4_096,
    initialValue: { name: 'Ada' },
  });
}

function submissionFor(request: FormInteractionRequest): FormInteractionSubmission {
  return createInteractionSubmission(request, {
    submissionId: 'submission-1',
    principalId: 'user-reviewer',
    outcome: 'approve',
    idempotencyKey: 'approve-workflow-run-1-human-review-2',
    submittedAt: '2026-08-09T08:29:00.000Z',
    value: { name: 'Ada', age: 37 },
  });
}

function requestInput(request: FormInteractionRequest) {
  const { apiVersion: _apiVersion, digest: _digest, ...input } = request;
  return input;
}

function context(
  changes: Partial<FormInteractionValidationContext> = {},
): FormInteractionValidationContext {
  return {
    currentTime: NOW,
    authenticatedPrincipalId: 'user-reviewer',
    authorization: 'granted',
    taskStatus: 'claimed',
    taskVersion: 7,
    claimedPrincipalId: 'user-reviewer',
    ...changes,
  };
}

function codes(
  document: FormDocument,
  request: FormInteractionRequest,
  submission: FormInteractionSubmission,
  validationContext = context(),
): string[] {
  const result = validateInteractionSubmission(document, request, submission, validationContext);
  return result.ok ? [] : result.errors.map((error) => error.code);
}

describe('request-bound human interaction contract', () => {
  it('matches the shared v1 request and submission golden fixture', () => {
    const fixture = interactionConformanceJson;
    const request = fixture.request as unknown as FormInteractionRequest;
    const submission = fixture.submission as unknown as FormInteractionSubmission;
    const { apiVersion: _requestApiVersion, digest: _requestDigest, ...requestInput } = request;
    const {
      apiVersion: _submissionApiVersion,
      requestId: _requestId,
      requestDigest: _boundRequestDigest,
      identity: _identity,
      form: _form,
      assignment: _assignment,
      taskVersion: _taskVersion,
      valueDigest: _valueDigest,
      ...submissionInput
    } = submission;
    const { digest: _digest, ...requestContent } = request;

    expect(fixture.apiVersion).toBe('a3s.dev/form-interaction-conformance/v1');
    expect(inspectInteractionRequest(request)).toEqual([]);
    expect(inspectInteractionSubmission(submission)).toEqual([]);
    expect(canonicalize(requestContent as unknown as JsonObject)).toBe(
      fixture.requestContentCanonical,
    );
    expect(digestInteractionRequest(request)).toBe(fixture.requestDigest);
    expect(canonicalize(submission.value)).toBe(fixture.valueCanonical);
    expect(digestInteractionValue(submission.value)).toBe(fixture.valueDigest);
    expect(createInteractionRequest(requestInput)).toEqual(request);
    expect(createInteractionSubmission(request, submissionInput)).toEqual(submission);
  });

  it('builds immutable, digest-bound request and submission envelopes', () => {
    const document = published();
    const request = requestFor(document);
    const submission = submissionFor(request);

    expect(request.apiVersion).toBe('a3s.dev/form-interaction-request/v1');
    expect(request.form).toEqual(
      expect.objectContaining({
        apiVersion: 'a3s.dev/form-release-ref/v1',
        revision: document.revision,
        digest: document.digest,
        compilerRevision: 'a3s-form-core@0.1.0',
        schemaProfile: 'a3s.dev/form-schema-profile/1',
        mode: 'interaction',
      }),
    );
    expect(request.digest).toBe(digestInteractionRequest(request));
    expect(request.allowedOutcomes).toEqual(['approve', 'reject']);
    expect(submission).toEqual(
      expect.objectContaining({
        apiVersion: 'a3s.dev/form-interaction-submission/v1',
        requestId: request.requestId,
        requestDigest: request.digest,
        identity: request.identity,
        form: request.form,
        taskVersion: request.task.version,
        principalId: request.assignment.claimedPrincipalId,
        valueDigest: digestInteractionValue(submission.value),
      }),
    );

    const source = { name: 'Grace' };
    const clonedRequest = createInteractionRequest({
      ...requestInput(request),
      initialValue: source,
    });
    source.name = 'mutated';
    expect(clonedRequest.initialValue).toEqual({ name: 'Grace' });
  });

  it('validates the protected request, principal, task, form and value as one unit', () => {
    const document = published();
    const request = requestFor(document);
    const submission = submissionFor(request);
    expect(validateInteractionSubmission(document, request, submission, context())).toEqual(
      expect.objectContaining({
        ok: true,
        digest: document.digest,
        requestDigest: request.digest,
        valueDigest: digestInteractionValue(submission.value),
        outcome: 'approve',
        value: { name: 'Ada', age: 37 },
      }),
    );
  });

  it('rejects unsupported versions and any drift in request-bound identities', () => {
    const document = published();
    const request = requestFor(document);
    const submission = submissionFor(request);

    expect(
      codes(document, { ...request, apiVersion: 'unsupported' as never }, submission),
    ).toContain('interaction.request_api_version');
    expect(
      codes(document, request, { ...submission, apiVersion: 'unsupported' as never }),
    ).toContain('interaction.submission_api_version');
    expect(
      codes(document, { ...request, digest: `sha256:${'0'.repeat(64)}` }, submission),
    ).toContain('interaction.request_digest');
    expect(
      codes(document, request, {
        ...submission,
        identity: { ...submission.identity, workflowRunId: 'other-run' },
      }),
    ).toContain('interaction.binding');
    expect(
      codes(document, request, {
        ...submission,
        identity: { ...submission.identity, stepId: 'other-step' },
      }),
    ).toContain('interaction.binding');
    expect(
      codes(document, request, {
        ...submission,
        form: { ...submission.form, compilerRevision: 'other-compiler' },
      }),
    ).toContain('interaction.form_binding');
    expect(
      codes(document, request, {
        ...submission,
        assignment: { ...submission.assignment, policyRevision: 5 },
      }),
    ).toContain('interaction.assignment_binding');
    expect(codes(document, request, { ...submission, taskVersion: 8 })).toContain(
      'interaction.task_version',
    );
    expect(codes(document, request, { ...submission, outcome: 'submit' })).toContain(
      'interaction.outcome',
    );
    expect(
      codes(document, request, { ...submission, valueDigest: `sha256:${'3'.repeat(64)}` }),
    ).toContain('interaction.value_digest');
  });

  it('rejects stale, revoked, unclaimed, terminal, expired and future submissions', () => {
    const document = published();
    const request = requestFor(document);
    const submission = submissionFor(request);

    expect(codes(document, request, submission, context({ taskVersion: 8 }))).toContain(
      'interaction.task_version',
    );
    expect(codes(document, request, submission, context({ authorization: 'revoked' }))).toContain(
      'interaction.authorization',
    );
    expect(
      codes(document, request, submission, context({ authenticatedPrincipalId: 'user-other' })),
    ).toContain('interaction.claimant');
    expect(codes(document, request, submission, context({ taskStatus: 'ready' }))).toContain(
      'interaction.task_not_claimed',
    );
    expect(codes(document, request, submission, context({ taskStatus: 'completed' }))).toContain(
      'interaction.task_terminal',
    );
    expect(
      codes(document, request, submission, context({ currentTime: '2026-08-09T10:00:00.000Z' })),
    ).toContain('interaction.expired');
    expect(
      codes(document, request, { ...submission, submittedAt: '2026-08-09T08:31:00.000Z' }),
    ).toContain('interaction.timestamp');
  });

  it('rejects changed Form releases, invalid values and oversized canonical values', () => {
    const document = published();
    const request = requestFor(document);
    const submission = submissionFor(request);

    expect(
      codes(document, request, {
        ...submission,
        form: { ...submission.form, digest: `sha256:${'4'.repeat(64)}` },
      }),
    ).toContain('interaction.form_binding');
    expect(
      codes(
        document,
        request,
        createInteractionSubmission(request, {
          submissionId: 'submission-invalid',
          principalId: 'user-reviewer',
          outcome: 'approve',
          idempotencyKey: 'invalid-value',
          submittedAt: '2026-08-09T08:29:00.000Z',
          value: {},
        }),
      ),
    ).toContain('required');

    const bounded = createInteractionRequest({
      ...requestInput(request),
      initialValue: undefined,
      maxValueBytes: 32,
    });
    const oversized = createInteractionSubmission(bounded, {
      submissionId: 'submission-large',
      principalId: 'user-reviewer',
      outcome: 'approve',
      idempotencyKey: 'large-value',
      submittedAt: '2026-08-09T08:29:00.000Z',
      value: { name: 'A'.repeat(64) },
    });
    expect(codes(document, bounded, oversized)).toContain('interaction.value_size');
  });

  it('fails closed for invalid modes, times, duplicate outcomes and arbitrary mapping code', () => {
    const document = published();
    const request = requestFor(document);

    expect(() =>
      createInteractionRequest({
        ...requestInput(request),
        form: { ...request.form, mode: 'configuration' as never },
      }),
    ).toThrow('interaction Form release');
    expect(() =>
      createInteractionRequest({
        ...requestInput(request),
        allowedOutcomes: ['approve', 'approve'],
      }),
    ).toThrow('allowed outcomes');
    expect(() =>
      createInteractionRequest({
        ...requestInput(request),
        task: { ...request.task, createdAt: 'not-a-time' },
      }),
    ).toThrow('timestamp');
    expect(() =>
      createInteractionRequest({
        ...requestInput(request),
        outputMapping: { kind: 'javascript', source: 'return value' } as never,
      }),
    ).toThrow('output mapping');
  });

  it('rejects unknown fields and malformed identities or digests', () => {
    const document = published();
    const request = requestFor(document);
    const submission = submissionFor(request);

    expect(
      codes(document, { ...request, unknown: true } as FormInteractionRequest, submission),
    ).toContain('interaction.request_shape');
    expect(
      codes(document, request, {
        ...submission,
        unknown: true,
      } as FormInteractionSubmission),
    ).toContain('interaction.submission_shape');
    expect(
      codes(
        document,
        {
          ...request,
          identity: { ...request.identity, workflowRunId: ' workflow-run-1' },
        },
        submission,
      ),
    ).toContain('interaction.identity');
    expect(
      codes(
        document,
        {
          ...request,
          form: { ...request.form, digest: 'sha256:INVALID' },
        },
        submission,
      ),
    ).toContain('interaction.form_release');
    expect(
      codes(document, request, {
        ...submission,
        valueDigest: `sha256:${'A'.repeat(64)}`,
      }),
    ).toContain('interaction.value_digest');
    expect(() =>
      createInteractionRequest({ ...requestInput(request), requestId: ' request-1' }),
    ).toThrow('interaction request');
    expect(() =>
      createInteractionRequest({ ...requestInput(request), unknown: true } as never),
    ).toThrow('unknown fields');
    expect(() =>
      createInteractionSubmission(request, {
        submissionId: 'submission-unknown',
        principalId: 'user-reviewer',
        outcome: 'approve',
        idempotencyKey: 'unknown-field',
        submittedAt: '2026-08-09T08:29:00.000Z',
        value: { name: 'Ada' },
        unknown: true,
      } as never),
    ).toThrow('unknown fields');
  });

  it('fails closed for cyclic, accessor and Proxy values without invoking accessors', () => {
    const document = published();
    const request = requestFor(document);
    const submissionInput = {
      submissionId: 'submission-adversarial',
      principalId: 'user-reviewer',
      outcome: 'approve' as const,
      idempotencyKey: 'adversarial-value',
      submittedAt: '2026-08-09T08:29:00.000Z',
    };

    const cyclic: Record<string, unknown> = { name: 'Ada' };
    cyclic.self = cyclic;
    expect(() =>
      createInteractionSubmission(request, { ...submissionInput, value: cyclic as never }),
    ).toThrow(TypeError);

    let accessorReads = 0;
    const accessorValue: Record<string, unknown> = {};
    Object.defineProperty(accessorValue, 'name', {
      enumerable: true,
      get() {
        accessorReads += 1;
        return 'Ada';
      },
    });
    expect(() =>
      createInteractionSubmission(request, {
        ...submissionInput,
        value: accessorValue as never,
      }),
    ).toThrow(TypeError);
    expect(accessorReads).toBe(0);

    const proxyValue = new Proxy({ name: 'Ada' }, {});
    expect(() =>
      createInteractionSubmission(request, { ...submissionInput, value: proxyValue }),
    ).toThrow(TypeError);
    expect(codes(document, request, { ...submissionFor(request), value: proxyValue })).toContain(
      'interaction.submission_shape',
    );
  });

  it('rejects non-canonical current time and compiler or schema-profile drift', () => {
    const document = published();
    const request = requestFor(document);
    const submission = submissionFor(request);

    expect(
      codes(document, request, submission, context({ currentTime: '2026-08-09T08:30:00Z' })),
    ).toContain('interaction.timestamp');

    const compilerDrift = createInteractionRequest({
      ...requestInput(request),
      form: { ...request.form, compilerRevision: 'a3s-form-core@9.9.9' },
    });
    expect(codes(document, compilerDrift, submissionFor(compilerDrift))).toContain(
      'compiler_revision_mismatch',
    );

    const schemaDrift = createInteractionRequest({
      ...requestInput(request),
      form: { ...request.form, schemaProfile: 'a3s.dev/form-schema-profile/999' },
    });
    expect(codes(document, schemaDrift, submissionFor(schemaDrift))).toContain(
      'schema_profile_mismatch',
    );
  });

  it('enforces the value limit again after computed fields are materialized', () => {
    const document = compileForm(computedExpansionDocument()).document as FormDocument;
    const base = requestFor(document);
    const request = createInteractionRequest({
      ...requestInput(base),
      initialValue: undefined,
      maxValueBytes: 32,
    });
    const submission = createInteractionSubmission(request, {
      submissionId: 'submission-computed-expansion',
      principalId: 'user-reviewer',
      outcome: 'approve',
      idempotencyKey: 'computed-expansion',
      submittedAt: '2026-08-09T08:29:00.000Z',
      value: { source: 'A' },
    });

    expect(codes(document, request, submission)).toContain('interaction.value_size');
  });

  it('applies builder defaults and rejects invalid documents or outcomes', () => {
    const document = published();
    const request = requestFor(document);
    const defaultLimit = createInteractionRequest({
      ...requestInput(request),
      maxValueBytes: undefined,
      initialValue: undefined,
      outputMapping: { kind: 'identity' },
    });
    expect(defaultLimit.maxValueBytes).toBe(1_000_000);
    expect(defaultLimit.outputMapping).toEqual({ kind: 'identity' });

    expect(() =>
      createFormReleaseRef(
        { ...document, kind: 'invalid' as never },
        {
          organizationId: 'org-1',
          projectId: 'project-1',
          formId: 'approval-form',
          releaseId: 'approval-form-r3',
          uri: 'a3s://forms/approval-form/releases/approval-form-r3',
        },
      ),
    ).toThrow('invalid unpublished document');
    expect(() =>
      createInteractionSubmission(request, {
        submissionId: 'submission-not-allowed',
        principalId: 'user-reviewer',
        outcome: 'submit',
        idempotencyKey: 'not-allowed',
        submittedAt: '2026-08-09T08:29:00.000Z',
        value: { name: 'Ada' },
      }),
    ).toThrow('outcome is not allowed');
    expect(() =>
      createInteractionSubmission(request, {
        submissionId: 'submission-unsupported',
        principalId: 'user-reviewer',
        outcome: 'unsupported' as never,
        idempotencyKey: 'unsupported',
        submittedAt: '2026-08-09T08:29:00.000Z',
        value: { name: 'Ada' },
      }),
    ).toThrow('outcome is not allowed');
  });

  it('reports each malformed request and submission field at the wire boundary', () => {
    const request = requestFor();
    const submission = submissionFor(request);

    expect(inspectFormReleaseRef(null).map((error) => error.code)).toContain(
      'interaction.form_release',
    );
    expect(inspectInteractionRequest(null).map((error) => error.code)).toContain(
      'interaction.request_shape',
    );
    const malformedRequest = {
      ...request,
      assignment: { ...request.assignment, policyId: '' },
      task: { ...request.task, dueAt: '2026-08-09T07:59:00.000Z' },
      outputMapping: null,
      maxValueBytes: 0,
      initialValue: [],
      digest: 'invalid',
    } as unknown as FormInteractionRequest;
    const requestCodes = inspectInteractionRequest(malformedRequest).map((error) => error.code);
    expect(requestCodes).toEqual(
      expect.arrayContaining([
        'interaction.assignment',
        'interaction.timestamp',
        'interaction.output_mapping',
        'interaction.value_size',
        'interaction.request_shape',
        'interaction.request_digest',
      ]),
    );
    expect(
      inspectInteractionRequest({
        ...request,
        maxValueBytes: 1,
        initialValue: { name: 'Ada' },
      }).map((error) => error.code),
    ).toContain('interaction.value_size');

    const malformedSubmission = {
      ...submission,
      submissionId: ' submission-1',
      requestDigest: 'invalid',
      taskVersion: -1,
      outcome: 'unsupported',
      submittedAt: 'invalid',
      value: [],
    } as unknown as FormInteractionSubmission;
    expect(inspectInteractionSubmission(malformedSubmission).map((error) => error.code)).toEqual(
      expect.arrayContaining([
        'interaction.submission_shape',
        'interaction.request_digest',
        'interaction.task_version',
        'interaction.outcome',
        'interaction.timestamp',
      ]),
    );
  });

  it('rejects pre-creation time and pinned document revision or digest drift', () => {
    const document = published();
    const request = requestFor(document);
    const submission = submissionFor(request);
    expect(
      codes(document, request, {
        ...submission,
        submittedAt: '2026-08-09T07:59:00.000Z',
      }),
    ).toContain('interaction.timestamp');
    expect(codes({ ...document, kind: 'invalid' as never }, request, submission)).toContain(
      'invalid_document',
    );

    const revisionDrift = createInteractionRequest({
      ...requestInput(request),
      form: { ...request.form, revision: request.form.revision + 1 },
    });
    expect(codes(document, revisionDrift, submissionFor(revisionDrift))).toContain(
      'revision_mismatch',
    );
    const digestDrift = createInteractionRequest({
      ...requestInput(request),
      form: { ...request.form, digest: `sha256:${'f'.repeat(64)}` },
    });
    expect(codes(document, digestDrift, submissionFor(digestDrift))).toContain('digest_mismatch');
  });
});
