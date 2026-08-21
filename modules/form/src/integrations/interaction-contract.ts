import { compileForm } from '../core/compiler';
import type { CompileOptions, FormDocument } from '../core/types';
import {
  cloneInteractionJson,
  digestInteractionRequestContent,
  digestInteractionValue,
} from './interaction-digest';
import {
  inspectFormReleaseRef,
  inspectInteractionRequest,
  inspectInteractionSubmission,
} from './interaction-inspection';
import {
  type CreateFormInteractionRequestInput,
  type CreateFormInteractionSubmissionInput,
  type CreateFormReleaseRefInput,
  DEFAULT_INTERACTION_MAX_VALUE_BYTES,
  FORM_INTERACTION_OUTCOMES,
  FORM_INTERACTION_REQUEST_API_VERSION,
  FORM_INTERACTION_SUBMISSION_API_VERSION,
  FORM_RELEASE_REF_API_VERSION,
  type FormInteractionRequest,
  type FormInteractionSubmission,
  type FormReleaseRef,
} from './interaction-types';

function assertOnlyContractKeys(
  input: unknown,
  allowed: readonly string[],
  label: string,
): asserts input is Record<string, unknown> {
  if (
    input === null ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !allowed.includes(key))
  ) {
    throw new TypeError(`Invalid ${label}: unknown fields or invalid shape.`);
  }
}

function assertNoContractErrors(
  errors: ReturnType<typeof inspectInteractionRequest>,
  label: string,
): void {
  if (errors.length === 0) return;
  const first = errors[0];
  if (first.code === 'interaction.form_release') {
    throw new TypeError(`Invalid interaction Form release: ${first.message}`);
  }
  if (first.code === 'interaction.outcomes') {
    throw new TypeError(`Invalid interaction allowed outcomes: ${first.message}`);
  }
  if (first.code === 'interaction.timestamp') {
    throw new TypeError(`Invalid interaction timestamp: ${first.message}`);
  }
  if (first.code === 'interaction.output_mapping') {
    throw new TypeError(`Invalid interaction output mapping: ${first.message}`);
  }
  throw new TypeError(`Invalid ${label}: ${first.message}`);
}

export function createFormReleaseRef(
  document: FormDocument,
  identity: CreateFormReleaseRefInput,
  options?: CompileOptions,
): FormReleaseRef {
  const portableIdentity = cloneInteractionJson(identity, 'Form release identity');
  assertOnlyContractKeys(
    portableIdentity,
    ['organizationId', 'projectId', 'formId', 'releaseId', 'uri'],
    'Form release identity',
  );
  const compiled = compileForm(document, { ...options, requireDigest: true });
  const digest = compiled.document?.digest;
  if (!compiled.ok || !compiled.document || !compiled.plan || !digest) {
    throw new TypeError('Cannot create a FormReleaseRef from an invalid unpublished document.');
  }
  const reference: FormReleaseRef = {
    apiVersion: FORM_RELEASE_REF_API_VERSION,
    ...portableIdentity,
    revision: compiled.document.revision,
    digest,
    compilerRevision: compiled.compilerRevision,
    schemaProfile: compiled.plan.schemaProfile,
    mode: 'interaction',
  };
  assertNoContractErrors(inspectFormReleaseRef(reference), 'Form release reference');
  return reference;
}

export function createInteractionRequest(
  input: CreateFormInteractionRequestInput,
): FormInteractionRequest {
  const portableInput = cloneInteractionJson(input, 'Interaction request input');
  assertOnlyContractKeys(
    portableInput,
    [
      'requestId',
      'identity',
      'form',
      'assignment',
      'task',
      'allowedOutcomes',
      'outputMapping',
      'maxValueBytes',
      'initialValue',
    ],
    'interaction request input',
  );
  const allowedOutcomes = [...portableInput.allowedOutcomes].sort(
    (left, right) =>
      FORM_INTERACTION_OUTCOMES.indexOf(left) - FORM_INTERACTION_OUTCOMES.indexOf(right),
  );
  const request = {
    apiVersion: FORM_INTERACTION_REQUEST_API_VERSION,
    requestId: portableInput.requestId,
    identity: portableInput.identity,
    form: portableInput.form,
    assignment: portableInput.assignment,
    task: portableInput.task,
    allowedOutcomes,
    outputMapping: portableInput.outputMapping,
    maxValueBytes: portableInput.maxValueBytes ?? DEFAULT_INTERACTION_MAX_VALUE_BYTES,
    ...(portableInput.initialValue === undefined
      ? {}
      : { initialValue: portableInput.initialValue }),
  } as Omit<FormInteractionRequest, 'digest'>;
  const candidate = { ...request, digest: `sha256:${'0'.repeat(64)}` };
  const errors = inspectInteractionRequest(candidate).filter(
    (item) => item.code !== 'interaction.request_digest',
  );
  assertNoContractErrors(errors, 'interaction request');
  return { ...request, digest: digestInteractionRequestContent(request) };
}

export function createInteractionSubmission(
  request: FormInteractionRequest,
  input: CreateFormInteractionSubmissionInput,
): FormInteractionSubmission {
  const portableRequest = cloneInteractionJson(request, 'Interaction request');
  const portableInput = cloneInteractionJson(input, 'Interaction submission input');
  assertOnlyContractKeys(
    portableInput,
    ['submissionId', 'principalId', 'outcome', 'idempotencyKey', 'submittedAt', 'value'],
    'interaction submission input',
  );
  assertNoContractErrors(inspectInteractionRequest(portableRequest), 'interaction request');
  if (
    !FORM_INTERACTION_OUTCOMES.includes(portableInput.outcome) ||
    !portableRequest.allowedOutcomes.includes(portableInput.outcome)
  ) {
    throw new TypeError('Invalid interaction submission: outcome is not allowed.');
  }
  const value = portableInput.value;
  const submission: FormInteractionSubmission = {
    apiVersion: FORM_INTERACTION_SUBMISSION_API_VERSION,
    submissionId: portableInput.submissionId,
    requestId: portableRequest.requestId,
    requestDigest: portableRequest.digest,
    identity: portableRequest.identity,
    form: portableRequest.form,
    assignment: {
      policyId: portableRequest.assignment.policyId,
      policyRevision: portableRequest.assignment.policyRevision,
      policyDigest: portableRequest.assignment.policyDigest,
    },
    taskVersion: portableRequest.task.version,
    principalId: portableInput.principalId,
    outcome: portableInput.outcome,
    idempotencyKey: portableInput.idempotencyKey,
    submittedAt: portableInput.submittedAt,
    value,
    valueDigest: digestInteractionValue(value),
  };
  assertNoContractErrors(inspectInteractionSubmission(submission), 'interaction submission');
  return submission;
}
