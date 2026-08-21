import { evaluateExpression, expressionFieldPaths } from './expression';
import { formatFormMessage, resolveFormLocaleCatalog } from './locale';
import {
  expandValuePathTemplate,
  getAtPath,
  matchValuePathTemplate,
  removeAtPath,
  resolveValuePathTemplate,
  setAtPath,
} from './pointer';
import { isSchemaFormatValid, jsonValuesEqual } from './schema-profile';
import type {
  ComputedRuleEvaluation,
  ComputedRuleEvaluationOptions,
  ComputedRuleTraceEntry,
  FieldError,
  FormLocaleMessages,
  FormPlan,
  FormRule,
  FormValueEvaluation,
  FormValueEvaluationOptions,
  IncrementalComputedRuleEvaluation,
  JsonObject,
  JsonSchema,
  JsonValue,
} from './types';
import { evaluateFormValue } from './value-evaluator';
import { formWizardValuePathOwners, valuePathBelongsToWizardPage } from './wizard';

export { evaluateFormValue, evaluateFormValueWithCore } from './value-evaluator';

interface DependencySnapshot {
  path: string;
  present: boolean;
  value?: JsonValue;
}

interface CachedComputedRule {
  dependencies: DependencySnapshot[];
  outputPresent: boolean;
  output?: JsonValue;
}

interface RuleInvocation {
  targetPath: string;
  rowIndices: number[];
  dependencies: string[];
}

function validateSchema(
  schema: JsonSchema,
  value: unknown,
  path: string,
  errors: FieldError[],
  messages: Readonly<FormLocaleMessages>,
): void {
  if (value === undefined || value === null) return;
  const typeMatches =
    !schema.type ||
    (schema.type === 'string' && typeof value === 'string') ||
    (schema.type === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
    (schema.type === 'integer' && typeof value === 'number' && Number.isInteger(value)) ||
    (schema.type === 'boolean' && typeof value === 'boolean') ||
    (schema.type === 'array' && Array.isArray(value)) ||
    (schema.type === 'object' && typeof value === 'object' && !Array.isArray(value));
  if (!typeMatches) {
    errors.push({
      path,
      code: 'type',
      message: formatFormMessage(messages, 'validationType', { type: schema.type ?? '' }),
    });
    return;
  }
  if (typeof value === 'string') {
    const length = [...value].length;
    if (schema.minLength !== undefined && length < schema.minLength)
      errors.push({
        path,
        code: 'minLength',
        message: formatFormMessage(messages, 'validationMinLength', {
          minimum: schema.minLength,
        }),
      });
    if (schema.maxLength !== undefined && length > schema.maxLength)
      errors.push({
        path,
        code: 'maxLength',
        message: formatFormMessage(messages, 'validationMaxLength', {
          maximum: schema.maxLength,
        }),
      });
    if (schema.pattern) {
      try {
        if (!new RegExp(schema.pattern, 'u').test(value))
          errors.push({ path, code: 'pattern', message: messages.validationPattern });
      } catch {
        errors.push({
          path,
          code: 'pattern.invalid',
          message: messages.validationInvalidPattern,
        });
      }
    }
    if (schema.format && !isSchemaFormatValid(schema.format, value))
      errors.push({
        path,
        code: `format.${schema.format}`,
        message: formatFormMessage(messages, 'validationFormat', { format: schema.format }),
      });
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum)
      errors.push({
        path,
        code: 'minimum',
        message: formatFormMessage(messages, 'validationMinimum', {
          minimum: schema.minimum,
        }),
      });
    if (schema.maximum !== undefined && value > schema.maximum)
      errors.push({
        path,
        code: 'maximum',
        message: formatFormMessage(messages, 'validationMaximum', {
          maximum: schema.maximum,
        }),
      });
    if (schema.multipleOf !== undefined) {
      const quotient = value / schema.multipleOf;
      const tolerance = Number.EPSILON * Math.max(1, Math.abs(quotient)) * 8;
      if (Math.abs(quotient - Math.round(quotient)) > tolerance)
        errors.push({
          path,
          code: 'multipleOf',
          message: formatFormMessage(messages, 'validationMultipleOf', {
            multipleOf: schema.multipleOf,
          }),
        });
    }
  }
  if (schema.const !== undefined && !jsonValuesEqual(schema.const, value))
    errors.push({ path, code: 'const', message: messages.validationConst });
  if (schema.enum && !schema.enum.some((item) => jsonValuesEqual(item, value)))
    errors.push({ path, code: 'enum', message: messages.validationEnum });
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      errors.push({
        path,
        code: 'minItems',
        message: formatFormMessage(messages, 'validationMinItems', {
          minimum: schema.minItems,
        }),
      });
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      errors.push({
        path,
        code: 'maxItems',
        message: formatFormMessage(messages, 'validationMaxItems', {
          maximum: schema.maxItems,
        }),
      });
    if (
      schema.uniqueItems &&
      value.some((item, index) =>
        value.slice(0, index).some((previous) => jsonValuesEqual(previous, item)),
      )
    )
      errors.push({ path, code: 'uniqueItems', message: messages.validationUniqueItems });
    if (schema.items)
      value.forEach((item, index) => {
        validateSchema(schema.items as JsonSchema, item, `${path}.${index}`, errors, messages);
      });
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const object = value as Record<string, unknown>;
    for (const required of schema.required ?? []) {
      if (object[required] === undefined || object[required] === null || object[required] === '')
        errors.push({
          path: path ? `${path}.${required}` : required,
          code: 'required',
          message: messages.validationRequired,
        });
    }
    for (const [key, child] of Object.entries(schema.properties ?? {}))
      validateSchema(child, object[key], path ? `${path}.${key}` : key, errors, messages);
    for (const [key, childValue] of Object.entries(object)) {
      if (key in (schema.properties ?? {})) continue;
      const childPath = path ? `${path}.${key}` : key;
      if (schema.additionalProperties === false) {
        errors.push({
          path: childPath,
          code: 'additionalProperties',
          message: messages.validationAdditionalProperties,
        });
      } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        validateSchema(schema.additionalProperties, childValue, childPath, errors, messages);
      }
    }
  }
}

function valuesEqual(left: JsonValue | undefined, right: JsonValue | undefined): boolean {
  return left === undefined && right === undefined ? true : jsonValuesEqual(left, right);
}

function traceValues(
  entry: ComputedRuleTraceEntry,
  previousValue: JsonValue | undefined,
  nextValue: JsonValue | undefined,
  includeValues: boolean,
): ComputedRuleTraceEntry {
  if (!includeValues) return entry;
  if (previousValue !== undefined) entry.previousValue = structuredClone(previousValue);
  if (nextValue !== undefined) entry.nextValue = structuredClone(nextValue);
  return entry;
}

function snapshotDependencies(value: JsonObject, paths: readonly string[]): DependencySnapshot[] {
  return paths.map((path) => {
    const dependency = getAtPath(value, path) as JsonValue | undefined;
    return dependency === undefined
      ? { path, present: false }
      : { path, present: true, value: structuredClone(dependency) };
  });
}

function dependencySnapshotsEqual(
  left: readonly DependencySnapshot[],
  right: readonly DependencySnapshot[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const candidate = right[index];
    if (!candidate || entry.path !== candidate.path || entry.present !== candidate.present) {
      return false;
    }
    return !entry.present || jsonValuesEqual(entry.value, candidate.value);
  });
}

function applyComputedOutput(
  value: JsonObject,
  path: string,
  nextValue: JsonValue | undefined,
  unchanged: boolean,
): JsonObject {
  if (unchanged) return value;
  return nextValue === undefined ? removeAtPath(value, path) : setAtPath(value, path, nextValue);
}

function ruleDependencyPaths(plan: FormPlan, rule: FormRule): string[] {
  return [...(plan.ruleDependencies?.[rule.id] ?? expressionFieldPaths(rule.expression).sort())];
}

function ruleInvocations(plan: FormPlan, rule: FormRule, value: JsonObject): RuleInvocation[] {
  const node = plan.nodeById[rule.target];
  const template = node?.valuePathTemplate ?? node?.valuePath;
  const dependencyTemplates = ruleDependencyPaths(plan, rule);
  if (rule.scope !== 'row') {
    const targetPath =
      node?.valuePath ?? (template && !template.includes('*') ? template : rule.target);
    return targetPath ? [{ targetPath, rowIndices: [], dependencies: dependencyTemplates }] : [];
  }
  if (!template) return [];
  return expandValuePathTemplate(value, template).map((targetPath) => {
    const rowIndices = matchValuePathTemplate(template, targetPath) ?? [];
    return {
      targetPath,
      rowIndices,
      dependencies: dependencyTemplates.map(
        (dependency) => resolveValuePathTemplate(dependency, rowIndices) ?? dependency,
      ),
    };
  });
}

function expressionOptionsForInvocation(
  plan: FormPlan,
  rule: FormRule,
  rowIndices: readonly number[],
) {
  return {
    maxOperations: plan.expressionOperationLimit,
    ...(rule.scope === 'row'
      ? {
          resolveFieldPath: (path: string) => resolveValuePathTemplate(path, rowIndices),
        }
      : {}),
  };
}

function cacheKey(rule: FormRule, path: string): string {
  return JSON.stringify([rule.id, path]);
}

interface ComputedRunResult extends ComputedRuleEvaluation {
  evaluatedRuleIds: string[];
  reusedRuleIds: string[];
}

function runComputedRules(
  plan: FormPlan,
  value: JsonObject,
  options: ComputedRuleEvaluationOptions,
  cache?: Map<string, CachedComputedRule>,
): ComputedRunResult {
  let current = structuredClone(value);
  const trace: ComputedRuleTraceEntry[] = [];
  const errors: FieldError[] = [];
  const evaluatedRuleIds = new Set<string>();
  const reusedRuleIds = new Set<string>();
  const activeCacheKeys = new Set<string>();
  const failedTargets = new Set<string>();
  const computedRules = new Map(
    plan.rules.filter((rule) => rule.kind === 'computed').map((rule) => [rule.target, rule]),
  );

  for (const target of plan.dependencyOrder) {
    const rule = computedRules.get(target);
    if (!rule) continue;
    for (const invocation of ruleInvocations(plan, rule, current)) {
      const { dependencies, rowIndices, targetPath: path } = invocation;
      const key = cacheKey(rule, path);
      activeCacheKeys.add(key);
      const previousValue = getAtPath(current, path) as JsonValue | undefined;
      if (dependencies.some((dependency) => failedTargets.has(dependency))) {
        cache?.delete(key);
        current = removeAtPath(current, path);
        failedTargets.add(path);
        const message = `Computed rule ${rule.id} was skipped because a dependency failed.`;
        errors.push({ path, code: `rule.${rule.id}.dependency`, message });
        trace.push(
          traceValues(
            {
              ruleId: rule.id,
              target,
              path,
              dependencies,
              status: 'skipped',
              error: message,
            },
            previousValue,
            undefined,
            Boolean(options.includeValues),
          ),
        );
        continue;
      }

      const dependencySnapshot = snapshotDependencies(current, dependencies);
      const cached = cache?.get(key);
      try {
        const reused = Boolean(
          cached && dependencySnapshotsEqual(cached.dependencies, dependencySnapshot),
        );
        const nextValue = reused
          ? cached?.outputPresent
            ? structuredClone(cached.output as JsonValue)
            : undefined
          : evaluateExpression(
              rule.expression,
              current,
              expressionOptionsForInvocation(plan, rule, rowIndices),
            );
        if (cache) {
          if (reused) reusedRuleIds.add(rule.id);
          else {
            evaluatedRuleIds.add(rule.id);
            cache.set(key, {
              dependencies: dependencySnapshot,
              outputPresent: nextValue !== undefined,
              ...(nextValue === undefined ? {} : { output: structuredClone(nextValue) }),
            });
          }
        }
        const unchanged = valuesEqual(previousValue, nextValue);
        const status = unchanged ? 'unchanged' : nextValue === undefined ? 'removed' : 'set';
        current = applyComputedOutput(current, path, nextValue, unchanged);
        trace.push(
          traceValues(
            { ruleId: rule.id, target, path, dependencies, status },
            previousValue,
            nextValue,
            Boolean(options.includeValues),
          ),
        );
      } catch (error) {
        cache?.delete(key);
        if (cache) evaluatedRuleIds.add(rule.id);
        current = removeAtPath(current, path);
        failedTargets.add(path);
        const message = String(error);
        errors.push({ path, code: `rule.${rule.id}.evaluation`, message });
        trace.push(
          traceValues(
            {
              ruleId: rule.id,
              target,
              path,
              dependencies,
              status: 'error',
              error: message,
            },
            previousValue,
            undefined,
            Boolean(options.includeValues),
          ),
        );
      }
    }
  }

  if (cache) {
    for (const key of cache.keys()) {
      if (!activeCacheKeys.has(key)) cache.delete(key);
    }
  }
  return {
    value: current,
    trace,
    errors,
    evaluatedRuleIds: [...evaluatedRuleIds],
    reusedRuleIds: [...reusedRuleIds],
  };
}

export class IncrementalComputedRuleEvaluator {
  #plan?: FormPlan;
  #cache = new Map<string, CachedComputedRule>();

  clear(): void {
    this.#plan = undefined;
    this.#cache.clear();
  }

  evaluate(
    plan: FormPlan,
    value: JsonObject,
    options: ComputedRuleEvaluationOptions = {},
  ): IncrementalComputedRuleEvaluation {
    this.#setPlan(plan);
    return runComputedRules(plan, value, options, this.#cache);
  }

  #setPlan(plan: FormPlan): void {
    if (this.#plan === plan) return;
    this.clear();
    this.#plan = plan;
  }
}

export function evaluateComputedRules(
  plan: FormPlan,
  value: JsonObject,
  options: ComputedRuleEvaluationOptions = {},
): ComputedRuleEvaluation {
  const {
    evaluatedRuleIds: _evaluated,
    reusedRuleIds: _reused,
    ...result
  } = runComputedRules(plan, value, options);
  return result;
}

/** TypeScript conformance reference retained during the native-core migration. */
export function evaluateFormValueReference(
  plan: FormPlan,
  value: JsonObject,
  options: FormValueEvaluationOptions = {},
): FormValueEvaluation {
  const computed = evaluateComputedRules(plan, value, options);
  const errors = [...computed.errors];
  const messages = resolveFormLocaleCatalog(
    options.locale ?? plan.metadata.locale,
    options.localeCatalog,
  ).messages;
  validateSchema(plan.schema, computed.value, '', errors, messages);
  for (const rule of plan.rules) {
    if (rule.kind !== 'validate') continue;
    for (const invocation of ruleInvocations(plan, rule, computed.value)) {
      let valid = false;
      try {
        valid = Boolean(
          evaluateExpression(
            rule.expression,
            computed.value,
            expressionOptionsForInvocation(plan, rule, invocation.rowIndices),
          ),
        );
      } catch (error) {
        errors.push({
          path: invocation.targetPath,
          code: `rule.${rule.id}.evaluation`,
          message: String(error),
        });
        continue;
      }
      if (!valid) {
        errors.push({
          path: invocation.targetPath,
          code: `rule.${rule.id}`,
          message: rule.message ?? messages.validationRule,
        });
      }
    }
  }
  return { ...computed, errors: filterInactiveWizardPageErrors(plan, computed.value, errors) };
}

export function filterInactiveWizardPageErrors(
  plan: FormPlan,
  value: JsonObject,
  errors: readonly FieldError[],
): FieldError[] {
  return errors.filter((error) => {
    if (!error.path) return true;
    const owners = formWizardValuePathOwners(plan, error.path);
    if (owners.outsideWizard || owners.pageIds.length === 0) return true;
    return owners.pageIds.some((pageId) => fieldState(plan, pageId, value).visible);
  });
}

export function evaluateWizardPageValue(
  plan: FormPlan,
  value: JsonObject,
  pageId: string,
  options: FormValueEvaluationOptions = {},
): FormValueEvaluation {
  const evaluation = evaluateFormValue(plan, value, options);
  if (plan.nodeById[pageId]?.layout !== 'page') {
    return {
      ...evaluation,
      errors: [
        {
          path: '',
          code: 'wizard.page_missing',
          message: `Wizard page ${pageId} is not present in this plan.`,
        },
      ],
    };
  }
  return {
    ...evaluation,
    errors: evaluation.errors.filter((error) =>
      valuePathBelongsToWizardPage(plan, pageId, error.path),
    ),
  };
}

export function validateFormValue(
  plan: FormPlan,
  value: JsonObject,
  options: FormValueEvaluationOptions = {},
): FieldError[] {
  return evaluateFormValue(plan, value, options).errors;
}

export function fieldState(
  plan: FormPlan,
  nodeId: string,
  value: JsonObject,
  rowIndices: readonly number[] = [],
): { visible: boolean; enabled: boolean } {
  let visible = !plan.nodeById[nodeId]?.hidden;
  let enabled = !plan.nodeById[nodeId]?.readOnly;
  for (const rule of plan.rules) {
    if (rule.target !== nodeId) continue;
    try {
      if (rule.kind === 'visible')
        visible = Boolean(
          evaluateExpression(
            rule.expression,
            value,
            expressionOptionsForInvocation(plan, rule, rowIndices),
          ),
        );
      if (rule.kind === 'enabled')
        enabled = Boolean(
          evaluateExpression(
            rule.expression,
            value,
            expressionOptionsForInvocation(plan, rule, rowIndices),
          ),
        );
    } catch {
      if (rule.kind === 'visible') visible = false;
      if (rule.kind === 'enabled') enabled = false;
    }
  }
  if (plan.rules.some((rule) => rule.kind === 'computed' && rule.target === nodeId))
    enabled = false;
  return { visible, enabled };
}

export function updateFormValue(value: JsonObject, path: string, next: JsonValue): JsonObject {
  return setAtPath(value, path, next);
}

export function readFormValue(value: JsonObject, path: string): JsonValue | undefined {
  return getAtPath(value, path) as JsonValue | undefined;
}
