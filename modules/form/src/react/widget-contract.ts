import type { JsonObject, JsonSchema, JsonValue, UiNode } from '../core';

export const BOOLEAN_FIELD_WIDGETS = new Set(['checkbox', 'switch']);

export const MATRIX_FIELD_WIDGETS = new Set(['matrix-single', 'matrix-multiple']);

export const COMPOSITE_FIELD_WIDGETS = new Set([
  'multi-select',
  'radio',
  'rating',
  'tags',
  ...MATRIX_FIELD_WIDGETS,
]);

export const OPTION_FIELD_WIDGETS = new Set(['select', 'radio', 'multi-select']);

export const PLACEHOLDER_FIELD_WIDGETS = new Set([
  'text',
  'textarea',
  'number',
  'email',
  'password',
  'url',
  'tel',
  'select',
  'tags',
  'currency',
]);

export const ALWAYS_READ_ONLY_WIDGETS = new Set(['hidden', 'calculated']);

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function matrixPreviewValue(node: UiNode): JsonObject {
  const value: JsonObject = {};
  const first = node.matrix?.columns.find((column) => !column.disabled)?.value;
  if (first === undefined) return value;
  for (const row of node.matrix?.rows ?? []) {
    if (row.disabled) continue;
    value[row.id] = node.widget === 'matrix-multiple' ? [first] : first;
  }
  return value;
}

/** A stable, representative value used only by the non-interactive Designer canvas. */
export function designerWidgetValue(node: UiNode, schema: JsonSchema | undefined): JsonValue {
  if (schema?.default !== undefined) {
    const emptyArray = Array.isArray(schema.default) && schema.default.length === 0;
    const emptyObject =
      schema.default !== null &&
      typeof schema.default === 'object' &&
      !Array.isArray(schema.default) &&
      Object.keys(schema.default).length === 0;
    if (!emptyArray && !emptyObject) return structuredClone(schema.default);
  }
  const firstOption = node.options?.find((option) => !option.disabled)?.value;
  switch (node.widget) {
    case 'checkbox':
    case 'switch':
      return true;
    case 'select':
    case 'radio':
      return firstOption ?? '';
    case 'multi-select':
      return firstOption === undefined ? [] : [firstOption];
    case 'tags':
      return ['示例标签'];
    case 'number':
    case 'currency':
      return finiteNumber(schema?.minimum) ?? 0;
    case 'rating': {
      const minimum = Math.max(1, Math.ceil(finiteNumber(schema?.minimum) ?? 1));
      const maximum = Math.max(
        minimum,
        Math.min(10, Math.floor(finiteNumber(schema?.maximum) ?? 5)),
      );
      return Math.max(minimum, maximum - 1);
    }
    case 'slider': {
      const minimum = finiteNumber(schema?.minimum) ?? 0;
      const maximum = Math.max(minimum, finiteNumber(schema?.maximum) ?? 100);
      return minimum + (maximum - minimum) / 2;
    }
    case 'matrix-single':
    case 'matrix-multiple':
      return matrixPreviewValue(node);
    case 'date':
      return '2026-08-09';
    case 'date-time':
      return '2026-08-09T09:30:00Z';
    case 'time':
      return '09:30:00Z';
    case 'calculated':
      return 0;
    default:
      return '';
  }
}
