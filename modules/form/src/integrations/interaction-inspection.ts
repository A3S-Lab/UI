import type { FieldError } from '../core/types';
import {
  digestInteractionRequest,
  interactionCanonicalBytes,
  tryCloneInteractionJson,
} from './interaction-digest';
import {
  ABSOLUTE_INTERACTION_MAX_VALUE_BYTES,
  FORM_INTERACTION_OUTCOMES,
  FORM_INTERACTION_REQUEST_API_VERSION,
  FORM_INTERACTION_SUBMISSION_API_VERSION,
  FORM_RELEASE_REF_API_VERSION,
  type FormInteractionOutcome,
  type FormInteractionRequest,
} from './interaction-types';

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const canonicalTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const maxIdentityBytes = 512;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every((key) => keys.has(key));
}

function isBoundedIdentity(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim() === value &&
    value.length > 0 &&
    new TextEncoder().encode(value).length <= maxIdentityBytes
  );
}

function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function isCanonicalInteractionTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    canonicalTimestampPattern.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}

export function interactionError(code: string, path: string, message: string): FieldError {
  return { code, path, message };
}

export function inspectFormReleaseRef(input: unknown): FieldError[] {
  const path = '/form';
  input = tryCloneInteractionJson(input);
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, [
      'apiVersion',
      'organizationId',
      'projectId',
      'formId',
      'releaseId',
      'uri',
      'revision',
      'digest',
      'compilerRevision',
      'schemaProfile',
      'mode',
    ])
  ) {
    return [
      interactionError(
        'interaction.form_release',
        path,
        'Interaction Form release shape is invalid.',
      ),
    ];
  }
  const valid =
    input.apiVersion === FORM_RELEASE_REF_API_VERSION &&
    isBoundedIdentity(input.organizationId) &&
    isBoundedIdentity(input.projectId) &&
    isBoundedIdentity(input.formId) &&
    isBoundedIdentity(input.releaseId) &&
    isBoundedIdentity(input.uri) &&
    URL.canParse(input.uri) &&
    isRevision(input.revision) &&
    typeof input.digest === 'string' &&
    digestPattern.test(input.digest) &&
    isBoundedIdentity(input.compilerRevision) &&
    isBoundedIdentity(input.schemaProfile) &&
    input.mode === 'interaction';
  return valid
    ? []
    : [
        interactionError(
          'interaction.form_release',
          path,
          'Interaction Form release fields are invalid.',
        ),
      ];
}

function inspectIdentity(input: unknown): FieldError[] {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, [
      'workflowRunId',
      'flowRunId',
      'stepId',
      'stepAttempt',
      'humanTaskId',
      'flowHookId',
    ]) ||
    !isBoundedIdentity(input.workflowRunId) ||
    !isBoundedIdentity(input.flowRunId) ||
    !isBoundedIdentity(input.stepId) ||
    !isRevision(input.stepAttempt) ||
    !isBoundedIdentity(input.humanTaskId) ||
    !isBoundedIdentity(input.flowHookId)
  ) {
    return [
      interactionError(
        'interaction.identity',
        '/identity',
        'Workflow interaction identity is invalid.',
      ),
    ];
  }
  return [];
}

function inspectAssignment(input: unknown, claimed: boolean): FieldError[] {
  const allowed = claimed
    ? ['policyId', 'policyRevision', 'policyDigest', 'claimedPrincipalId']
    : ['policyId', 'policyRevision', 'policyDigest'];
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, allowed) ||
    !isBoundedIdentity(input.policyId) ||
    !isRevision(input.policyRevision) ||
    typeof input.policyDigest !== 'string' ||
    !digestPattern.test(input.policyDigest) ||
    (claimed && !isBoundedIdentity(input.claimedPrincipalId))
  ) {
    return [
      interactionError(
        'interaction.assignment',
        '/assignment',
        'Interaction assignment binding is invalid.',
      ),
    ];
  }
  return [];
}

function inspectTask(input: unknown): FieldError[] {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, ['version', 'createdAt', 'dueAt', 'expiresAt']) ||
    !isRevision(input.version) ||
    !isCanonicalInteractionTimestamp(input.createdAt) ||
    (input.dueAt !== undefined && !isCanonicalInteractionTimestamp(input.dueAt)) ||
    (input.expiresAt !== undefined && !isCanonicalInteractionTimestamp(input.expiresAt))
  ) {
    return [
      interactionError('interaction.timestamp', '/task', 'Interaction task timestamp is invalid.'),
    ];
  }
  if (
    (typeof input.dueAt === 'string' && input.dueAt < input.createdAt) ||
    (typeof input.expiresAt === 'string' && input.expiresAt < input.createdAt)
  ) {
    return [
      interactionError(
        'interaction.timestamp',
        '/task',
        'Interaction task deadlines cannot precede creation.',
      ),
    ];
  }
  return [];
}

function inspectOutcomes(input: unknown): FieldError[] {
  if (
    !Array.isArray(input) ||
    input.length === 0 ||
    input.some((item) => !FORM_INTERACTION_OUTCOMES.includes(item as FormInteractionOutcome)) ||
    new Set(input).size !== input.length
  ) {
    return [
      interactionError(
        'interaction.outcomes',
        '/allowedOutcomes',
        'Interaction allowed outcomes must be unique supported values.',
      ),
    ];
  }
  return [];
}

function inspectOutputMapping(input: unknown): FieldError[] {
  if (!isRecord(input)) {
    return [
      interactionError(
        'interaction.output_mapping',
        '/outputMapping',
        'Interaction output mapping is invalid.',
      ),
    ];
  }
  const identity = input.kind === 'identity' && hasOnlyKeys(input, ['kind']);
  const registry =
    input.kind === 'registry' &&
    hasOnlyKeys(input, ['kind', 'registryKey', 'revision', 'digest']) &&
    isBoundedIdentity(input.registryKey) &&
    isRevision(input.revision) &&
    typeof input.digest === 'string' &&
    digestPattern.test(input.digest);
  return identity || registry
    ? []
    : [
        interactionError(
          'interaction.output_mapping',
          '/outputMapping',
          'Interaction output mapping is invalid.',
        ),
      ];
}

export function inspectInteractionRequest(input: unknown): FieldError[] {
  input = tryCloneInteractionJson(input);
  if (!isRecord(input)) {
    return [
      interactionError('interaction.request_shape', '', 'Interaction request must be an object.'),
    ];
  }
  const errors: FieldError[] = [];
  if (
    !hasOnlyKeys(input, [
      'apiVersion',
      'requestId',
      'identity',
      'form',
      'assignment',
      'task',
      'allowedOutcomes',
      'outputMapping',
      'maxValueBytes',
      'initialValue',
      'digest',
    ])
  ) {
    errors.push(
      interactionError('interaction.request_shape', '', 'Interaction request has unknown fields.'),
    );
  }
  if (input.apiVersion !== FORM_INTERACTION_REQUEST_API_VERSION) {
    errors.push(
      interactionError(
        'interaction.request_api_version',
        '/apiVersion',
        'Unsupported interaction request API version.',
      ),
    );
  }
  if (!isBoundedIdentity(input.requestId)) {
    errors.push(
      interactionError('interaction.request_shape', '/requestId', 'Request ID is invalid.'),
    );
  }
  errors.push(...inspectIdentity(input.identity));
  errors.push(...inspectFormReleaseRef(input.form));
  errors.push(...inspectAssignment(input.assignment, true));
  errors.push(...inspectTask(input.task));
  errors.push(...inspectOutcomes(input.allowedOutcomes));
  errors.push(...inspectOutputMapping(input.outputMapping));
  if (
    !Number.isSafeInteger(input.maxValueBytes) ||
    (input.maxValueBytes as number) < 1 ||
    (input.maxValueBytes as number) > ABSOLUTE_INTERACTION_MAX_VALUE_BYTES
  ) {
    errors.push(
      interactionError(
        'interaction.value_size',
        '/maxValueBytes',
        'Interaction value limit is invalid.',
      ),
    );
  }
  if (input.initialValue !== undefined) {
    const size = interactionCanonicalBytes(input.initialValue);
    if (!isRecord(input.initialValue) || size === undefined) {
      errors.push(
        interactionError(
          'interaction.request_shape',
          '/initialValue',
          'Initial value must be a JSON object.',
        ),
      );
    } else if (typeof input.maxValueBytes === 'number' && size > input.maxValueBytes) {
      errors.push(
        interactionError(
          'interaction.value_size',
          '/initialValue',
          'Initial value exceeds the request limit.',
        ),
      );
    }
  }
  if (typeof input.digest !== 'string' || !digestPattern.test(input.digest)) {
    errors.push(
      interactionError('interaction.request_digest', '/digest', 'Request digest is invalid.'),
    );
  } else if (errors.length === 0) {
    try {
      if (digestInteractionRequest(input as unknown as FormInteractionRequest) !== input.digest) {
        errors.push(
          interactionError(
            'interaction.request_digest',
            '/digest',
            'Request digest does not match.',
          ),
        );
      }
    } catch {
      errors.push(
        interactionError(
          'interaction.request_digest',
          '/digest',
          'Request digest cannot be verified.',
        ),
      );
    }
  }
  return errors;
}

export function inspectInteractionSubmission(input: unknown): FieldError[] {
  input = tryCloneInteractionJson(input);
  if (!isRecord(input)) {
    return [
      interactionError(
        'interaction.submission_shape',
        '',
        'Interaction submission must be an object.',
      ),
    ];
  }
  const errors: FieldError[] = [];
  if (
    !hasOnlyKeys(input, [
      'apiVersion',
      'submissionId',
      'requestId',
      'requestDigest',
      'identity',
      'form',
      'assignment',
      'taskVersion',
      'principalId',
      'outcome',
      'idempotencyKey',
      'submittedAt',
      'value',
      'valueDigest',
    ])
  ) {
    errors.push(
      interactionError(
        'interaction.submission_shape',
        '',
        'Interaction submission has unknown fields.',
      ),
    );
  }
  if (input.apiVersion !== FORM_INTERACTION_SUBMISSION_API_VERSION) {
    errors.push(
      interactionError(
        'interaction.submission_api_version',
        '/apiVersion',
        'Unsupported interaction submission API version.',
      ),
    );
  }
  for (const [key, path] of [
    ['submissionId', '/submissionId'],
    ['requestId', '/requestId'],
    ['principalId', '/principalId'],
    ['idempotencyKey', '/idempotencyKey'],
  ] as const) {
    if (!isBoundedIdentity(input[key])) {
      errors.push(interactionError('interaction.submission_shape', path, `${key} is invalid.`));
    }
  }
  if (typeof input.requestDigest !== 'string' || !digestPattern.test(input.requestDigest)) {
    errors.push(
      interactionError(
        'interaction.request_digest',
        '/requestDigest',
        'Request digest is invalid.',
      ),
    );
  }
  errors.push(...inspectIdentity(input.identity));
  errors.push(...inspectFormReleaseRef(input.form));
  errors.push(...inspectAssignment(input.assignment, false));
  if (!isRevision(input.taskVersion)) {
    errors.push(
      interactionError('interaction.task_version', '/taskVersion', 'Task version is invalid.'),
    );
  }
  if (!FORM_INTERACTION_OUTCOMES.includes(input.outcome as FormInteractionOutcome)) {
    errors.push(
      interactionError('interaction.outcome', '/outcome', 'Submission outcome is unsupported.'),
    );
  }
  if (!isCanonicalInteractionTimestamp(input.submittedAt)) {
    errors.push(
      interactionError('interaction.timestamp', '/submittedAt', 'Submission timestamp is invalid.'),
    );
  }
  if (!isRecord(input.value) || interactionCanonicalBytes(input.value) === undefined) {
    errors.push(
      interactionError('interaction.submission_shape', '/value', 'Submission value must be JSON.'),
    );
  }
  if (typeof input.valueDigest !== 'string' || !digestPattern.test(input.valueDigest)) {
    errors.push(
      interactionError('interaction.value_digest', '/valueDigest', 'Value digest is invalid.'),
    );
  }
  return errors;
}
