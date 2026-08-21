import { compileForm } from '../core/compiler';
import { evaluateFormValue } from '../core/state';
import type {
  CompileOptions,
  FieldError,
  FormDocument,
  FormPlan,
  FormRef,
  JsonObject,
} from '../core/types';

export interface WorkflowFormBinding {
  form: FormRef;
  configuration: JsonObject;
}

export interface WorkflowNodeConfiguration {
  apiVersion: 'a3s.dev/workflow-node-configuration/v1alpha1';
  nodeType: string;
  nodeId: string;
  form: FormRef;
  value: JsonObject;
  locale?: string;
  readOnly?: boolean;
}

export type CreateWorkflowNodeConfigurationInput = Omit<WorkflowNodeConfiguration, 'apiVersion'>;

export type WorkflowNodeConfigurationValidation =
  | {
      ok: true;
      document: FormDocument;
      plan: FormPlan;
      digest: string;
      value: JsonObject;
    }
  | {
      ok: false;
      errors: FieldError[];
      digest?: string;
    };

export type PinnedFormVerification =
  | { ok: true; document: FormDocument; plan: FormPlan; digest: string }
  | {
      ok: false;
      code: 'invalid_document' | 'revision_mismatch' | 'digest_mismatch';
      message: string;
    };

export function verifyPinnedForm(
  document: FormDocument,
  reference: FormRef,
  options?: CompileOptions,
): PinnedFormVerification {
  const result = compileForm(document, { ...options, requireDigest: true });
  if (!result.ok || !result.document || !result.plan) {
    return { ok: false, code: 'invalid_document', message: '表单文档未通过发布态编译校验。' };
  }
  if (result.document.revision !== reference.revision) {
    return { ok: false, code: 'revision_mismatch', message: 'FormRef revision 与表单文档不一致。' };
  }
  if (result.document.digest !== reference.digest) {
    return { ok: false, code: 'digest_mismatch', message: 'FormRef digest 与表单文档不一致。' };
  }
  return {
    ok: true,
    document: result.document,
    plan: result.plan,
    digest: result.document.digest,
  };
}

export function createWorkflowFormBinding(
  form: FormRef,
  configuration: JsonObject,
): WorkflowFormBinding {
  if (form.mode !== 'configuration')
    throw new Error('Workflow node configuration requires a configuration FormRef.');
  return { form: structuredClone(form), configuration: structuredClone(configuration) };
}

export function createWorkflowNodeConfiguration(
  input: CreateWorkflowNodeConfigurationInput,
): WorkflowNodeConfiguration {
  if (input.nodeType.trim().length === 0)
    throw new Error('Workflow node configuration requires a non-empty nodeType.');
  if (input.nodeId.trim().length === 0)
    throw new Error('Workflow node configuration requires a non-empty nodeId.');
  if (input.form.mode !== 'configuration')
    throw new Error('Workflow node configuration requires a configuration FormRef.');

  return {
    apiVersion: 'a3s.dev/workflow-node-configuration/v1alpha1',
    nodeType: input.nodeType,
    nodeId: input.nodeId,
    form: structuredClone(input.form),
    value: structuredClone(input.value),
    locale: input.locale,
    readOnly: input.readOnly,
  };
}

export function validateWorkflowNodeConfiguration(
  document: FormDocument,
  descriptor: WorkflowNodeConfiguration,
  options?: CompileOptions,
): WorkflowNodeConfigurationValidation {
  if (descriptor.apiVersion !== 'a3s.dev/workflow-node-configuration/v1alpha1') {
    return {
      ok: false,
      errors: [
        {
          path: '',
          code: 'invalid_api_version',
          message: 'Unsupported workflow node configuration API version.',
        },
      ],
    };
  }
  if (descriptor.nodeType.trim().length === 0 || descriptor.nodeId.trim().length === 0) {
    return {
      ok: false,
      errors: [
        {
          path: '',
          code: 'invalid_node_identity',
          message: 'Workflow node type and instance ID must both be present.',
        },
      ],
    };
  }
  if (descriptor.form.mode !== 'configuration') {
    return {
      ok: false,
      errors: [
        {
          path: '',
          code: 'invalid_form_mode',
          message: 'Workflow node configuration requires a configuration FormRef.',
        },
      ],
    };
  }

  const verification = verifyPinnedForm(document, descriptor.form, options);
  if (!verification.ok) {
    return {
      ok: false,
      errors: [{ path: '', code: verification.code, message: verification.message }],
    };
  }

  const evaluation = evaluateFormValue(verification.plan, descriptor.value, {
    locale: descriptor.locale,
  });
  if (evaluation.errors.length > 0) {
    return { ok: false, errors: evaluation.errors, digest: verification.digest };
  }

  return {
    ok: true,
    document: verification.document,
    plan: verification.plan,
    digest: verification.digest,
    value: evaluation.value,
  };
}
