import { getAtPath } from './pointer';
import { isJsonValue, jsonValuesEqual } from './schema-profile';
import type { FormExpression, JsonObject, JsonPrimitive, JsonValue } from './types';

export interface ExpressionOptions {
  maxOperations?: number;
  /** Resolves a declared field-path template for the current evaluation scope. */
  resolveFieldPath?: (path: string) => string | undefined;
}

export interface ExpressionAnalysis {
  size: number;
  fieldPaths: string[];
}

const unaryOperators = new Set(['not', 'exists']);
const collectionOperators = new Set(['all', 'any', 'coalesce', 'concat']);
const binaryOperators = new Set([
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'in',
  'add',
  'subtract',
  'multiply',
  'divide',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertOnlyKeys(node: Record<string, unknown>, allowed: readonly string[]): void {
  const allowedKeys = new Set(allowed);
  const unexpected = Object.keys(node).find(
    (key) => node[key] !== undefined && !allowedKeys.has(key),
  );
  if (unexpected) throw new TypeError(`Expression contains unexpected property ${unexpected}.`);
}

export function analyzeExpression(input: unknown): ExpressionAnalysis {
  const fieldPaths = new Set<string>();
  let size = 0;
  const visit = (value: unknown): void => {
    if (!isRecord(value) || typeof value.op !== 'string') {
      throw new TypeError('Expression must be an object with a supported operator.');
    }
    size += 1;
    if (value.op === 'literal') {
      assertOnlyKeys(value, ['op', 'value']);
      if (!isJsonValue(value.value))
        throw new TypeError('Expression literal must be a JSON value.');
      return;
    }
    if (value.op === 'field') {
      assertOnlyKeys(value, ['op', 'path']);
      if (
        typeof value.path !== 'string' ||
        value.path.length === 0 ||
        value.path.split('.').some((segment) => segment.length === 0)
      ) {
        throw new TypeError('Expression field path must contain non-empty dot-separated segments.');
      }
      fieldPaths.add(value.path);
      return;
    }
    if (unaryOperators.has(value.op)) {
      assertOnlyKeys(value, ['op', 'value']);
      visit(value.value);
      return;
    }
    if (collectionOperators.has(value.op)) {
      assertOnlyKeys(value, ['op', 'values']);
      if (!Array.isArray(value.values)) {
        throw new TypeError(`Expression ${value.op} values must be an array.`);
      }
      for (const child of value.values) visit(child);
      return;
    }
    if (value.op === 'if') {
      assertOnlyKeys(value, ['op', 'condition', 'whenTrue', 'whenFalse']);
      visit(value.condition);
      visit(value.whenTrue);
      visit(value.whenFalse);
      return;
    }
    if (binaryOperators.has(value.op)) {
      assertOnlyKeys(value, ['op', 'left', 'right']);
      visit(value.left);
      visit(value.right);
      return;
    }
    throw new TypeError(`Unsupported expression operator ${value.op}.`);
  };
  visit(input);
  return { size, fieldPaths: [...fieldPaths] };
}

export function expressionFieldPaths(expression: FormExpression): string[] {
  return analyzeExpression(expression).fieldPaths;
}

function comparable(value: unknown): string | number | boolean | null | undefined {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
    ? value
    : undefined;
}

function finiteNumber(value: JsonValue | undefined, operator: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Expression ${operator} operands must be finite numbers.`);
  }
  return value;
}

function finiteResult(value: number, operator: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Expression ${operator} result must be a finite number.`);
  }
  return value;
}

function scalarText(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    throw new TypeError('Expression concat values must be JSON primitives.');
  }
  return String(value as JsonPrimitive);
}

export function evaluateExpression(
  expression: FormExpression,
  value: JsonObject,
  options: ExpressionOptions = {},
): JsonValue | undefined {
  const limit = options.maxOperations ?? 256;
  let operations = 0;
  const evaluate = (node: FormExpression): JsonValue | undefined => {
    operations += 1;
    if (operations > limit) throw new Error(`Expression operation limit exceeded (${limit}).`);
    switch (node.op) {
      case 'literal':
        return node.value;
      case 'field': {
        const path = options.resolveFieldPath ? options.resolveFieldPath(node.path) : node.path;
        if (!path) throw new Error(`Expression field path ${node.path} could not be resolved.`);
        return getAtPath(value, path) as JsonValue | undefined;
      }
      case 'not':
        return !evaluate(node.value);
      case 'exists': {
        const result = evaluate(node.value);
        return result !== undefined && result !== null && result !== '';
      }
      case 'all':
        return node.values.every((item) => Boolean(evaluate(item)));
      case 'any':
        return node.values.some((item) => Boolean(evaluate(item)));
      case 'coalesce': {
        for (const item of node.values) {
          const result = evaluate(item);
          if (result !== undefined && result !== null) return result;
        }
        return undefined;
      }
      case 'concat':
        return node.values.map((item) => scalarText(evaluate(item))).join('');
      case 'if':
        return evaluate(node.condition) ? evaluate(node.whenTrue) : evaluate(node.whenFalse);
      default: {
        const left = evaluate(node.left);
        const right = evaluate(node.right);
        switch (node.op) {
          case 'eq':
            return jsonValuesEqual(left, right);
          case 'ne':
            return !jsonValuesEqual(left, right);
          case 'gt':
            return (comparable(left) as never) > (comparable(right) as never);
          case 'gte':
            return (comparable(left) as never) >= (comparable(right) as never);
          case 'lt':
            return (comparable(left) as never) < (comparable(right) as never);
          case 'lte':
            return (comparable(left) as never) <= (comparable(right) as never);
          case 'contains':
            return typeof left === 'string'
              ? left.includes(String(right ?? ''))
              : Array.isArray(left) && left.some((item) => jsonValuesEqual(item, right));
          case 'in':
            return Array.isArray(right) && right.some((item) => jsonValuesEqual(item, left));
          case 'add':
            return finiteResult(
              finiteNumber(left, node.op) + finiteNumber(right, node.op),
              node.op,
            );
          case 'subtract':
            return finiteResult(
              finiteNumber(left, node.op) - finiteNumber(right, node.op),
              node.op,
            );
          case 'multiply':
            return finiteResult(
              finiteNumber(left, node.op) * finiteNumber(right, node.op),
              node.op,
            );
          case 'divide': {
            const divisor = finiteNumber(right, node.op);
            if (divisor === 0) throw new RangeError('Expression cannot divide by zero.');
            return finiteResult(finiteNumber(left, node.op) / divisor, node.op);
          }
        }
      }
    }
  };
  return evaluate(expression);
}
