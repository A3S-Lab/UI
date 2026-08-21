import type { FieldError, FormDocument, FormPlan, JsonObject } from '../core/types';

export const FORM_RELEASE_REF_API_VERSION = 'a3s.dev/form-release-ref/v1' as const;
export const FORM_INTERACTION_REQUEST_API_VERSION = 'a3s.dev/form-interaction-request/v1' as const;
export const FORM_INTERACTION_SUBMISSION_API_VERSION =
  'a3s.dev/form-interaction-submission/v1' as const;
export const DEFAULT_INTERACTION_MAX_VALUE_BYTES = 1_000_000;
export const ABSOLUTE_INTERACTION_MAX_VALUE_BYTES = 4 * 1024 * 1024;
export const FORM_INTERACTION_OUTCOMES = ['submit', 'approve', 'reject'] as const;

export type FormInteractionOutcome = (typeof FORM_INTERACTION_OUTCOMES)[number];

export interface FormReleaseRef {
  apiVersion: typeof FORM_RELEASE_REF_API_VERSION;
  organizationId: string;
  projectId: string;
  formId: string;
  releaseId: string;
  uri: string;
  revision: number;
  digest: string;
  compilerRevision: string;
  schemaProfile: string;
  mode: 'interaction';
}

export type CreateFormReleaseRefInput = Pick<
  FormReleaseRef,
  'organizationId' | 'projectId' | 'formId' | 'releaseId' | 'uri'
>;

export interface WorkflowInteractionIdentity {
  workflowRunId: string;
  flowRunId: string;
  stepId: string;
  stepAttempt: number;
  humanTaskId: string;
  flowHookId: string;
}

export interface FormInteractionAssignment {
  policyId: string;
  policyRevision: number;
  policyDigest: string;
  claimedPrincipalId: string;
}

export interface FormInteractionTaskBinding {
  version: number;
  createdAt: string;
  dueAt?: string;
  expiresAt?: string;
}

export type FormInteractionOutputMapping =
  | { kind: 'identity' }
  | {
      kind: 'registry';
      registryKey: string;
      revision: number;
      digest: string;
    };

export interface FormInteractionRequest {
  apiVersion: typeof FORM_INTERACTION_REQUEST_API_VERSION;
  requestId: string;
  identity: WorkflowInteractionIdentity;
  form: FormReleaseRef;
  assignment: FormInteractionAssignment;
  task: FormInteractionTaskBinding;
  allowedOutcomes: FormInteractionOutcome[];
  outputMapping: FormInteractionOutputMapping;
  maxValueBytes: number;
  initialValue?: JsonObject;
  digest: string;
}

export type CreateFormInteractionRequestInput = Omit<
  FormInteractionRequest,
  'apiVersion' | 'digest' | 'maxValueBytes'
> & {
  maxValueBytes?: number;
};

export interface FormInteractionSubmissionAssignment {
  policyId: string;
  policyRevision: number;
  policyDigest: string;
}

export interface FormInteractionSubmission {
  apiVersion: typeof FORM_INTERACTION_SUBMISSION_API_VERSION;
  submissionId: string;
  requestId: string;
  requestDigest: string;
  identity: WorkflowInteractionIdentity;
  form: FormReleaseRef;
  assignment: FormInteractionSubmissionAssignment;
  taskVersion: number;
  principalId: string;
  outcome: FormInteractionOutcome;
  idempotencyKey: string;
  submittedAt: string;
  value: JsonObject;
  valueDigest: string;
}

export interface CreateFormInteractionSubmissionInput {
  submissionId: string;
  principalId: string;
  outcome: FormInteractionOutcome;
  idempotencyKey: string;
  submittedAt: string;
  value: JsonObject;
}

export type FormInteractionTaskStatus =
  | 'pending_activation'
  | 'ready'
  | 'claimed'
  | 'completed'
  | 'expired'
  | 'cancelled';

export interface FormInteractionValidationContext {
  currentTime: string;
  authenticatedPrincipalId: string;
  authorization: 'granted' | 'revoked';
  taskStatus: FormInteractionTaskStatus;
  taskVersion: number;
  claimedPrincipalId?: string;
}

export type FormInteractionValidation =
  | {
      ok: true;
      document: FormDocument;
      plan: FormPlan;
      digest: string;
      requestDigest: string;
      value: JsonObject;
      valueDigest: string;
      outcome: FormInteractionOutcome;
    }
  | {
      ok: false;
      errors: FieldError[];
      digest?: string;
      requestDigest?: string;
    };
