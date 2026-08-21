import { compileForm } from '../core/compiler';
import { evaluateFormValue } from '../core/state';
import type { CompileOptions, FieldError, FormDocument } from '../core/types';
import {
  digestInteractionValue,
  interactionCanonicalBytes,
  interactionSameJson,
} from './interaction-digest';
import {
  inspectInteractionRequest,
  inspectInteractionSubmission,
  interactionError,
  isCanonicalInteractionTimestamp,
} from './interaction-inspection';
import type {
  FormInteractionRequest,
  FormInteractionSubmission,
  FormInteractionValidation,
  FormInteractionValidationContext,
} from './interaction-types';

function protectedContextErrors(
  request: FormInteractionRequest,
  submission: FormInteractionSubmission,
  context: FormInteractionValidationContext,
): FieldError[] {
  const errors: FieldError[] = [];
  if (
    !isCanonicalInteractionTimestamp(context.currentTime) ||
    submission.submittedAt > context.currentTime
  ) {
    errors.push(
      interactionError(
        'interaction.timestamp',
        '/submittedAt',
        'Submission timestamp is in the future.',
      ),
    );
  }
  if (submission.submittedAt < request.task.createdAt) {
    errors.push(
      interactionError(
        'interaction.timestamp',
        '/submittedAt',
        'Submission predates task creation.',
      ),
    );
  }
  if (
    request.task.expiresAt !== undefined &&
    (context.currentTime >= request.task.expiresAt ||
      submission.submittedAt >= request.task.expiresAt)
  ) {
    errors.push(
      interactionError('interaction.expired', '/submittedAt', 'Interaction task has expired.'),
    );
  }
  if (context.authorization !== 'granted') {
    errors.push(
      interactionError('interaction.authorization', '', 'Interaction access has been revoked.'),
    );
  }
  if (
    context.authenticatedPrincipalId !== submission.principalId ||
    context.authenticatedPrincipalId !== request.assignment.claimedPrincipalId ||
    context.claimedPrincipalId !== request.assignment.claimedPrincipalId
  ) {
    errors.push(
      interactionError('interaction.claimant', '/principalId', 'Principal does not own this task.'),
    );
  }
  if (
    context.taskVersion !== request.task.version ||
    submission.taskVersion !== request.task.version
  ) {
    errors.push(
      interactionError('interaction.task_version', '/taskVersion', 'Task version is stale.'),
    );
  }
  if (['completed', 'expired', 'cancelled'].includes(context.taskStatus)) {
    errors.push(
      interactionError('interaction.task_terminal', '', 'Interaction task is already terminal.'),
    );
  } else if (context.taskStatus !== 'claimed') {
    errors.push(
      interactionError('interaction.task_not_claimed', '', 'Interaction task is not claimed.'),
    );
  }
  return errors;
}

export function validateInteractionSubmission(
  document: FormDocument,
  request: FormInteractionRequest,
  submission: FormInteractionSubmission,
  context: FormInteractionValidationContext,
  options?: CompileOptions,
): FormInteractionValidation {
  const errors = [
    ...inspectInteractionRequest(request),
    ...inspectInteractionSubmission(submission),
  ];
  if (errors.length > 0) return { ok: false, errors };

  if (
    submission.requestId !== request.requestId ||
    submission.requestDigest !== request.digest ||
    !interactionSameJson(submission.identity, request.identity)
  ) {
    errors.push(
      interactionError('interaction.binding', '', 'Submission targets a different interaction.'),
    );
  }
  if (!interactionSameJson(submission.form, request.form)) {
    errors.push(
      interactionError(
        'interaction.form_binding',
        '/form',
        'Submission Form release does not match request.',
      ),
    );
  }
  const requestAssignment = {
    policyId: request.assignment.policyId,
    policyRevision: request.assignment.policyRevision,
    policyDigest: request.assignment.policyDigest,
  };
  if (!interactionSameJson(submission.assignment, requestAssignment)) {
    errors.push(
      interactionError(
        'interaction.assignment_binding',
        '/assignment',
        'Submission assignment policy does not match request.',
      ),
    );
  }
  if (!request.allowedOutcomes.includes(submission.outcome)) {
    errors.push(
      interactionError('interaction.outcome', '/outcome', 'Submission outcome is not allowed.'),
    );
  }
  const rawSize = interactionCanonicalBytes(submission.value);
  if (rawSize === undefined || rawSize > request.maxValueBytes) {
    errors.push(
      interactionError(
        'interaction.value_size',
        '/value',
        'Submission value exceeds the request limit.',
      ),
    );
  }
  if (digestInteractionValue(submission.value) !== submission.valueDigest) {
    errors.push(
      interactionError(
        'interaction.value_digest',
        '/valueDigest',
        'Submission value digest drifted.',
      ),
    );
  }
  errors.push(...protectedContextErrors(request, submission, context));
  if (errors.length > 0) {
    return { ok: false, errors, requestDigest: request.digest };
  }

  const compiled = compileForm(document, { ...options, requireDigest: true });
  const digest = compiled.document?.digest;
  if (!compiled.ok || !compiled.document || !compiled.plan || !digest) {
    return {
      ok: false,
      errors: [
        interactionError('invalid_document', '/form', 'Published Form document is invalid.'),
      ],
      requestDigest: request.digest,
    };
  }
  if (compiled.document.revision !== request.form.revision) {
    errors.push(
      interactionError('revision_mismatch', '/form/revision', 'Form revision does not match.'),
    );
  }
  if (digest !== request.form.digest) {
    errors.push(interactionError('digest_mismatch', '/form/digest', 'Form digest does not match.'));
  }
  if (compiled.compilerRevision !== request.form.compilerRevision) {
    errors.push(
      interactionError(
        'compiler_revision_mismatch',
        '/form/compilerRevision',
        'Form compiler revision does not match.',
      ),
    );
  }
  if (compiled.plan.schemaProfile !== request.form.schemaProfile) {
    errors.push(
      interactionError(
        'schema_profile_mismatch',
        '/form/schemaProfile',
        'Form schema profile does not match.',
      ),
    );
  }
  if (errors.length > 0) {
    return { ok: false, errors, digest, requestDigest: request.digest };
  }

  const evaluation = evaluateFormValue(compiled.plan, submission.value);
  if (evaluation.errors.length > 0) {
    return {
      ok: false,
      errors: evaluation.errors,
      digest,
      requestDigest: request.digest,
    };
  }
  const acceptedSize = interactionCanonicalBytes(evaluation.value);
  if (acceptedSize === undefined || acceptedSize > request.maxValueBytes) {
    return {
      ok: false,
      errors: [
        interactionError(
          'interaction.value_size',
          '/value',
          'Validated value exceeds the request limit.',
        ),
      ],
      digest,
      requestDigest: request.digest,
    };
  }
  return {
    ok: true,
    document: compiled.document,
    plan: compiled.plan,
    digest,
    requestDigest: request.digest,
    value: evaluation.value,
    valueDigest: digestInteractionValue(evaluation.value),
    outcome: submission.outcome,
  };
}
