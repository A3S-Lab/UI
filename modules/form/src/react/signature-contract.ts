import type { JsonObject, JsonSchema } from '../core';

export const FORM_SIGNATURE_LIMITS = Object.freeze({
  maxReferenceIdLength: 512,
  maxTypedLength: 120,
  maxStrokes: 128,
  maxPoints: 4_096,
});

export type FormSignatureMethod = 'drawn' | 'typed';
export type FormSignatureCaptureMode = FormSignatureMethod | 'drawn-or-typed';
export type FormSignaturePenColor = 'ink' | 'blue';

export interface FormSignatureReference extends JsonObject {
  id: string;
  method: FormSignatureMethod;
  signedAt: string;
}

export interface FormSignaturePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface FormSignatureStroke {
  points: readonly FormSignaturePoint[];
}

export interface FormDrawnSignatureCapture {
  method: 'drawn';
  strokes: readonly FormSignatureStroke[];
}

export interface FormTypedSignatureCapture {
  method: 'typed';
  text: string;
}

export type FormSignatureCapture = FormDrawnSignatureCapture | FormTypedSignatureCapture;

export interface CreateFormSignatureSchemaOptions {
  required?: boolean;
}

const REFERENCE_KEYS = new Set(['id', 'method', 'signedAt']);
const RFC_3339_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

function referenceSchema(): JsonSchema {
  return {
    type: 'object',
    properties: {
      id: { type: 'string', minLength: 1, maxLength: FORM_SIGNATURE_LIMITS.maxReferenceIdLength },
      method: { type: 'string', enum: ['drawn', 'typed'] },
      signedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'method', 'signedAt'],
    additionalProperties: false,
  };
}

export function createFormSignatureSchema(
  options: CreateFormSignatureSchemaOptions = {},
): JsonSchema {
  return {
    type: 'array',
    default: [],
    minItems: options.required ? 1 : 0,
    maxItems: 1,
    uniqueItems: true,
    items: referenceSchema(),
  };
}

export function normalizeFormSignatureReference(
  value: unknown,
): FormSignatureReference | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const keys = Object.keys(source);
  if (keys.length !== REFERENCE_KEYS.size || keys.some((key) => !REFERENCE_KEYS.has(key))) {
    return undefined;
  }
  if (
    typeof source.id !== 'string' ||
    source.id.trim().length === 0 ||
    source.id.length > FORM_SIGNATURE_LIMITS.maxReferenceIdLength ||
    (source.method !== 'drawn' && source.method !== 'typed') ||
    typeof source.signedAt !== 'string' ||
    !RFC_3339_DATE_TIME.test(source.signedAt) ||
    !Number.isFinite(Date.parse(source.signedAt))
  ) {
    return undefined;
  }
  return {
    id: source.id,
    method: source.method,
    signedAt: source.signedAt,
  };
}

export function isFormSignatureReference(value: unknown): value is FormSignatureReference {
  return normalizeFormSignatureReference(value) !== undefined;
}

export function formSignatureReferenceKey(reference: FormSignatureReference | undefined): string {
  return reference ? `${reference.id}\u0000${reference.method}\u0000${reference.signedAt}` : '';
}

export function normalizeSignatureCaptureMode(value: unknown): FormSignatureCaptureMode {
  return value === 'drawn' || value === 'typed' || value === 'drawn-or-typed'
    ? value
    : 'drawn-or-typed';
}

export function normalizeSignaturePenColor(value: unknown): FormSignaturePenColor {
  return value === 'blue' ? 'blue' : 'ink';
}

export function boundedTypedSignature(value: string): string {
  return value.trim().slice(0, FORM_SIGNATURE_LIMITS.maxTypedLength);
}

export function signaturePointCount(strokes: readonly FormSignatureStroke[]): number {
  return strokes.reduce((total, stroke) => total + stroke.points.length, 0);
}
