import { resolveFormLocaleCatalog } from './locale';
import { matchValuePathTemplate } from './pointer';
import { evaluateFormValue } from './state';
import type {
  AsyncValidationEvaluation,
  AsyncValidationIssue,
  AsyncValidationOptions,
  AsyncValidationResponse,
  AsyncValidationScope,
  FieldError,
  FormAsyncValidator,
  FormPlan,
  FormValueEvaluation,
  JsonObject,
} from './types';
import { valuePathBelongsToWizardPage } from './wizard';

const issueCodePattern = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fallbackPath(scope: AsyncValidationScope): string {
  return scope.kind === 'field' ? scope.path : '';
}

function isValuePath(path: string): boolean {
  return path === '' || path.split('.').every((segment) => segment.length > 0);
}

function isScopeValid(plan: FormPlan, scope: AsyncValidationScope): boolean {
  if (scope.kind === 'form') return true;
  if (scope.kind === 'page') return plan.nodeById[scope.nodeId]?.layout === 'page';
  const node = plan.nodeById[scope.nodeId];
  return (
    node?.valuePath === scope.path ||
    matchValuePathTemplate(node?.valuePathTemplate, scope.path) !== undefined
  );
}

function hasBlockingErrors(
  plan: FormPlan,
  evaluation: FormValueEvaluation,
  scope: AsyncValidationScope,
): boolean {
  if (scope.kind === 'form') return evaluation.errors.length > 0;
  if (scope.kind === 'page') {
    return evaluation.errors.some((error) =>
      valuePathBelongsToWizardPage(plan, scope.nodeId, error.path),
    );
  }
  return evaluation.errors.some(
    (error) => error.path === scope.path || error.path.startsWith(`${scope.path}.`),
  );
}

function validationFailure(
  evaluation: FormValueEvaluation,
  scope: AsyncValidationScope,
  code: 'invalid_scope' | 'invalid_response' | 'unavailable',
  message: string,
): AsyncValidationEvaluation {
  const asyncErrors = [{ path: fallbackPath(scope), code: `async.${code}`, message }];
  return {
    ...evaluation,
    errors: [...evaluation.errors, ...asyncErrors],
    asyncErrors,
    status: 'unavailable',
  };
}

export function mapAsyncValidationIssues(
  response: unknown,
  scope: AsyncValidationScope,
): FieldError[] {
  if (
    !isRecord(response) ||
    Object.keys(response).some((key) => key !== 'issues' && response[key] !== undefined) ||
    !Array.isArray(response.issues)
  ) {
    throw new TypeError('Async validation response must contain only an issues array.');
  }

  const errors: FieldError[] = [];
  const seen = new Set<string>();
  for (const input of response.issues) {
    if (
      !isRecord(input) ||
      Object.keys(input).some(
        (key) => !['path', 'code', 'message'].includes(key) && input[key] !== undefined,
      )
    ) {
      throw new TypeError('Async validation issues must use the closed issue shape.');
    }
    const issue = input as unknown as AsyncValidationIssue;
    const path = issue.path ?? fallbackPath(scope);
    if (
      typeof path !== 'string' ||
      !isValuePath(path) ||
      typeof issue.code !== 'string' ||
      !issueCodePattern.test(issue.code) ||
      typeof issue.message !== 'string' ||
      issue.message.trim().length === 0
    ) {
      throw new TypeError('Async validation issue fields are invalid.');
    }
    const error = { path, code: `async.${issue.code}`, message: issue.message.trim() };
    const identity = `${error.path}\u0000${error.code}\u0000${error.message}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    errors.push(error);
  }
  return errors;
}

export async function validateFormValueAsync(
  plan: FormPlan,
  value: JsonObject,
  validator?: FormAsyncValidator,
  options: AsyncValidationOptions = {},
  signal: AbortSignal = new AbortController().signal,
): Promise<AsyncValidationEvaluation> {
  const evaluation = evaluateFormValue(plan, value, options);
  const messages = resolveFormLocaleCatalog(
    options.locale ?? plan.metadata.locale,
    options.localeCatalog,
  ).messages;
  const scope = options.scope ?? { kind: 'form' };
  if (!isScopeValid(plan, scope)) {
    return validationFailure(evaluation, scope, 'invalid_scope', messages.asyncInvalidScope);
  }
  const scopedEvaluation =
    scope.kind === 'page'
      ? {
          ...evaluation,
          errors: evaluation.errors.filter((error) =>
            valuePathBelongsToWizardPage(plan, scope.nodeId, error.path),
          ),
        }
      : evaluation;
  if (hasBlockingErrors(plan, scopedEvaluation, scope)) {
    return { ...scopedEvaluation, asyncErrors: [], status: 'invalid' };
  }
  if (signal.aborted) return { ...scopedEvaluation, asyncErrors: [], status: 'cancelled' };
  if (!validator) return { ...scopedEvaluation, asyncErrors: [], status: 'valid' };

  const request = {
    plan,
    value: structuredClone(scopedEvaluation.value),
    scope,
    trigger: options.trigger ?? (scope.kind === 'field' ? 'blur' : 'submit'),
    locale: options.locale ?? plan.metadata.locale ?? 'en-US',
  } as const;
  let response: AsyncValidationResponse;
  try {
    response = await validator(request, signal);
  } catch {
    if (signal.aborted) return { ...scopedEvaluation, asyncErrors: [], status: 'cancelled' };
    return validationFailure(scopedEvaluation, scope, 'unavailable', messages.asyncUnavailable);
  }
  if (signal.aborted) return { ...scopedEvaluation, asyncErrors: [], status: 'cancelled' };

  let asyncErrors: FieldError[];
  try {
    asyncErrors = mapAsyncValidationIssues(response, scope);
  } catch {
    return validationFailure(
      scopedEvaluation,
      scope,
      'invalid_response',
      messages.asyncInvalidResponse,
    );
  }
  if (
    scope.kind === 'page' &&
    asyncErrors.some(
      (error) => error.path !== '' && !valuePathBelongsToWizardPage(plan, scope.nodeId, error.path),
    )
  ) {
    return validationFailure(
      scopedEvaluation,
      scope,
      'invalid_response',
      messages.asyncInvalidResponse,
    );
  }
  return {
    ...scopedEvaluation,
    errors: [...scopedEvaluation.errors, ...asyncErrors],
    asyncErrors,
    status: asyncErrors.length > 0 ? 'invalid' : 'valid',
  };
}
