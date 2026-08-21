import { embeddedWasmFormCore, type WasmFormCore } from './portable-core';
import { hasPortableJsonGraph } from './portable-input';
import type {
  ComputedRuleTraceEntry,
  FormPlan,
  FormValueEvaluation,
  FormValueEvaluationOptions,
  JsonObject,
  JsonValue,
} from './types';

function evaluationFailure(
  value: JsonObject,
  code: string,
  message: string,
  path = '',
): FormValueEvaluation {
  return {
    value: structuredClone(value),
    trace: [],
    errors: [{ path, code, message }],
  };
}

function portableInputFailure(path: string, subject: string): FormValueEvaluation {
  return {
    value: {},
    trace: [],
    errors: [
      {
        path,
        code: 'evaluator.json_value',
        message: `${subject} must be an acyclic, bounded JSON value without accessor properties.`,
      },
    ],
  };
}

function restoreEvaluationValueOrder(
  nativeValue: JsonValue,
  sourceValue: JsonValue | undefined,
  trace: readonly ComputedRuleTraceEntry[],
  path = '',
): JsonValue {
  if (Array.isArray(nativeValue)) {
    const source = Array.isArray(sourceValue) ? sourceValue : [];
    return nativeValue.map((item, index) =>
      restoreEvaluationValueOrder(item, source[index], trace, `${path}.${index}`),
    );
  }
  if (nativeValue === null || typeof nativeValue !== 'object') return nativeValue;

  const source =
    sourceValue !== null && typeof sourceValue === 'object' && !Array.isArray(sourceValue)
      ? sourceValue
      : {};
  const remaining = Object.keys(nativeValue).filter((key) => !Object.hasOwn(source, key));
  const traceRank = (key: string): number => {
    const childPath = path ? `${path}.${key}` : key;
    const index = trace.findIndex(
      (entry) => entry.path === childPath || entry.path.startsWith(`${childPath}.`),
    );
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  remaining.sort((left, right) => traceRank(left) - traceRank(right));
  const keys = [
    ...Object.keys(source).filter((key) => Object.hasOwn(nativeValue, key)),
    ...remaining,
  ];
  return Object.fromEntries(
    keys.map((key) => {
      const childPath = path ? `${path}.${key}` : key;
      return [key, restoreEvaluationValueOrder(nativeValue[key], source[key], trace, childPath)];
    }),
  );
}

/** Evaluates submitted values through an explicit native/WASM Form Core. */
export function evaluateFormValueWithCore(
  core: WasmFormCore | undefined,
  plan: FormPlan,
  value: JsonObject,
  options: FormValueEvaluationOptions = {},
): FormValueEvaluation {
  if (!hasPortableJsonGraph(plan)) return portableInputFailure('/formPlan', 'Form plan');
  if (!hasPortableJsonGraph(value)) return portableInputFailure('/value', 'Form value');
  if (!hasPortableJsonGraph(options)) return portableInputFailure('/options', 'Form options');
  if (!core) {
    return evaluationFailure(
      value,
      'evaluator.unavailable',
      'The portable A3S Form semantic core is unavailable.',
    );
  }
  const response = core.evaluate({
    apiVersion: 'a3s.dev/form-core/evaluate-request/v1alpha1',
    formPlan: plan,
    value,
    options: {
      includeValues: options.includeValues,
      locale: options.locale,
      localeCatalog: options.localeCatalog,
    },
  });
  if (
    response?.value &&
    !Array.isArray(response.value) &&
    typeof response.value === 'object' &&
    Array.isArray(response.trace) &&
    Array.isArray(response.errors)
  ) {
    return {
      value: restoreEvaluationValueOrder(response.value, value, response.trace) as JsonObject,
      trace: response.trace,
      errors: response.errors,
    };
  }
  if (Array.isArray(response?.errors) && response.errors.length > 0) {
    return {
      value: structuredClone(value),
      trace: [],
      errors: response.errors,
    };
  }
  return evaluationFailure(
    value,
    'evaluator.response',
    'The portable A3S Form semantic core did not return a complete evaluation response.',
  );
}

export function evaluateFormValue(
  plan: FormPlan,
  value: JsonObject,
  options: FormValueEvaluationOptions = {},
): FormValueEvaluation {
  return evaluateFormValueWithCore(embeddedWasmFormCore(), plan, value, options);
}
