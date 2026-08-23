import {
  type DataSourceCoordinator,
  type FieldError,
  type FormHostAdapter,
  type FormPlan,
  getAtPath,
  type JsonObject,
  jsonValuesEqual,
  resolveValuePathTemplate,
} from '../core';
import { NESTED_ERROR_FIELD_WIDGETS } from './widget-contract';

export interface SubscribedNodeRenderProps {
  plan: FormPlan;
  nodeId: string;
  value: JsonObject;
  errorMap: ReadonlyMap<string, readonly FieldError[]>;
  validatingPaths: ReadonlySet<string>;
  dataSourceCoordinator: DataSourceCoordinator;
  getValue: () => JsonObject;
  onChange: (value: JsonObject) => void;
  onFieldBlur: (nodeId: string, path: string) => void;
  prefix: string;
  hostAdapter?: FormHostAdapter;
  widgetRegistry?: unknown;
  nodeRegistry?: unknown;
  renderNodeAccessory?: unknown;
  readOnly?: boolean;
  locale?: string;
  messages: unknown;
  rowIndices?: readonly number[];
  rowKeys?: readonly string[];
  suppressHeading?: boolean;
}

function arraysEqual<T>(left: readonly T[] | undefined, right: readonly T[] | undefined): boolean {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function valuesAtPathEqual(left: JsonObject, right: JsonObject, path: string): boolean {
  const leftValue = getAtPath(left, path);
  const rightValue = getAtPath(right, path);
  if (leftValue === undefined || rightValue === undefined) return leftValue === rightValue;
  return jsonValuesEqual(leftValue, rightValue);
}

function errorsAtPathEqual(
  left: ReadonlyMap<string, readonly FieldError[]>,
  right: ReadonlyMap<string, readonly FieldError[]>,
  path: string | undefined,
): boolean {
  if (!path) return true;
  const leftErrors = left.get(path) ?? [];
  const rightErrors = right.get(path) ?? [];
  if (leftErrors === rightErrors) return true;
  if (leftErrors.length !== rightErrors.length) return false;
  return leftErrors.every((error, index) => {
    const candidate = rightErrors[index];
    return (
      candidate !== undefined &&
      error.path === candidate.path &&
      error.code === candidate.code &&
      error.message === candidate.message
    );
  });
}

function pathIsWithinScope(path: string, scope: string): boolean {
  return path === scope || path.startsWith(`${scope}.`);
}

function errorsWithinScopeEqual(
  left: ReadonlyMap<string, readonly FieldError[]>,
  right: ReadonlyMap<string, readonly FieldError[]>,
  scope: string,
): boolean {
  const paths = new Set(
    [...left.keys(), ...right.keys()].filter((path) => pathIsWithinScope(path, scope)),
  );
  return [...paths].every((path) => errorsAtPathEqual(left, right, path));
}

function validatingWithinScopeEqual(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
  scope: string,
): boolean {
  const leftPaths = [...left].filter((path) => pathIsWithinScope(path, scope)).sort();
  const rightPaths = [...right].filter((path) => pathIsWithinScope(path, scope)).sort();
  return arraysEqual(leftPaths, rightPaths);
}

export function subscribedNodePropsEqual(
  left: Readonly<SubscribedNodeRenderProps>,
  right: Readonly<SubscribedNodeRenderProps>,
): boolean {
  if (
    left.plan !== right.plan ||
    left.nodeId !== right.nodeId ||
    left.dataSourceCoordinator !== right.dataSourceCoordinator ||
    left.getValue !== right.getValue ||
    left.onChange !== right.onChange ||
    left.onFieldBlur !== right.onFieldBlur ||
    left.prefix !== right.prefix ||
    left.hostAdapter !== right.hostAdapter ||
    left.widgetRegistry !== right.widgetRegistry ||
    left.nodeRegistry !== right.nodeRegistry ||
    left.renderNodeAccessory !== right.renderNodeAccessory ||
    left.readOnly !== right.readOnly ||
    left.locale !== right.locale ||
    left.messages !== right.messages ||
    !arraysEqual(left.rowIndices, right.rowIndices) ||
    !arraysEqual(left.rowKeys, right.rowKeys) ||
    left.suppressHeading !== right.suppressHeading
  ) {
    return false;
  }

  const node = left.plan.nodeById[left.nodeId];
  const valuePath = node?.valuePathTemplate?.includes('*')
    ? resolveValuePathTemplate(node.valuePathTemplate, left.rowIndices)
    : node?.valuePath;
  if (valuePath) {
    if (
      node?.kind === 'repeater' ||
      node?.widget === 'matrix-single' ||
      node?.widget === 'matrix-multiple' ||
      NESTED_ERROR_FIELD_WIDGETS.has(node?.widget ?? '')
    ) {
      if (!errorsWithinScopeEqual(left.errorMap, right.errorMap, valuePath)) return false;
      if (!validatingWithinScopeEqual(left.validatingPaths, right.validatingPaths, valuePath)) {
        return false;
      }
    } else {
      if (!errorsAtPathEqual(left.errorMap, right.errorMap, valuePath)) return false;
      if (left.validatingPaths.has(valuePath) !== right.validatingPaths.has(valuePath))
        return false;
    }
  }
  const subscriptions = left.plan.nodeSubscriptions?.[left.nodeId];
  if (!subscriptions) return false;
  return subscriptions.every((path) => {
    const resolved = resolveValuePathTemplate(path, left.rowIndices);
    return resolved ? valuesAtPathEqual(left.value, right.value, resolved) : false;
  });
}
