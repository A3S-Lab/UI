import type { CompilerLimits } from './types';

export const DEFAULT_COMPILER_LIMITS: CompilerLimits = Object.freeze({
  maxSerializedBytes: 1_000_000,
  maxNodes: 1_000,
  maxDepth: 32,
  maxRules: 1_000,
  maxExpressionOperations: 256,
  maxPatchOperations: 256,
});

export const MATRIX_LIMITS = Object.freeze({
  maxRows: 50,
  maxColumns: 20,
  maxCells: 500,
});

export const DEFAULT_WIDGETS = Object.freeze([
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'checkbox',
  'switch',
  'date',
  'email',
  'password',
  'url',
  'tel',
  'date-time',
  'time',
  'multi-select',
  'tags',
  'currency',
  'rating',
  'slider',
  'hidden',
  'calculated',
  'matrix-single',
  'matrix-multiple',
]);

export const DATA_SOURCE_LIMITS = Object.freeze({
  maxDependencies: 32,
  maxCacheTtlMs: 86_400_000,
  maxDebounceMs: 5_000,
  maxPageSize: 200,
});
