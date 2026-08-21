import { canonicalize } from './canonical';
import type { FormDiagnostic, JsonSchema, JsonValue } from './types';

export const A3S_FORM_SCHEMA_PROFILE_1_ID = 'a3s.dev/form-schema-profile/1' as const;
export const JSON_SCHEMA_2020_12_DIALECT = 'https://json-schema.org/draft/2020-12/schema' as const;

export const SUPPORTED_SCHEMA_FORMATS = Object.freeze([
  'email',
  'uri',
  'date',
  'date-time',
  'time',
  'hostname',
  'ipv4',
  'ipv6',
  'uuid',
] as const);

export type SupportedSchemaFormat = (typeof SUPPORTED_SCHEMA_FORMATS)[number];

const SUPPORTED_SCHEMA_TYPES = Object.freeze([
  'null',
  'boolean',
  'object',
  'array',
  'number',
  'integer',
  'string',
] as const);

const SUPPORTED_SCHEMA_KEYWORDS = Object.freeze([
  '$schema',
  '$id',
  'type',
  'title',
  'description',
  'default',
  'enum',
  'const',
  'properties',
  'required',
  'items',
  'additionalProperties',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems',
] as const);

export const A3S_FORM_SCHEMA_PROFILE_1 = Object.freeze({
  id: A3S_FORM_SCHEMA_PROFILE_1_ID,
  dialect: JSON_SCHEMA_2020_12_DIALECT,
  keywords: SUPPORTED_SCHEMA_KEYWORDS,
  formats: SUPPORTED_SCHEMA_FORMATS,
});

const keywordSet = new Set<string>(SUPPORTED_SCHEMA_KEYWORDS);
const typeSet = new Set<string>(SUPPORTED_SCHEMA_TYPES);
const formatSet = new Set<string>(SUPPORTED_SCHEMA_FORMATS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isJsonValue(value: unknown): value is JsonValue {
  const ancestors = new Set<object>();
  const pending: Array<{ value: unknown; exit: boolean; depth: number }> = [
    { value, exit: false, depth: 0 },
  ];
  try {
    while (pending.length > 0) {
      const current = pending.pop() as (typeof pending)[number];
      const candidate = current.value;
      if (candidate === null || typeof candidate === 'string' || typeof candidate === 'boolean') {
        continue;
      }
      if (typeof candidate === 'number') {
        if (!Number.isFinite(candidate)) return false;
        continue;
      }
      if (typeof candidate !== 'object') return false;
      if (current.exit) {
        ancestors.delete(candidate);
        continue;
      }
      if (current.depth > 256 || ancestors.has(candidate)) return false;
      ancestors.add(candidate);
      pending.push({ value: candidate, exit: true, depth: current.depth });
      const values = Array.isArray(candidate)
        ? Array.from(candidate)
        : Object.values(candidate as Record<string, unknown>);
      for (let index = values.length - 1; index >= 0; index -= 1) {
        pending.push({ value: values[index], exit: false, depth: current.depth + 1 });
      }
    }
    return true;
  } catch {
    return false;
  }
}

function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function schemaDiagnostic(
  code: string,
  message: string,
  path: string,
  hint?: string,
): FormDiagnostic {
  return { code, severity: 'error', message, path, hint };
}

function invalidKeyword(
  diagnostics: FormDiagnostic[],
  path: string,
  keyword: string,
  expectation: string,
): void {
  diagnostics.push(
    schemaDiagnostic(
      'schema.keyword.invalid',
      `Schema keyword ${keyword} ${expectation}.`,
      `${path}/${pointerToken(keyword)}`,
    ),
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function inspectSchema(
  schema: Record<string, unknown>,
  path: string,
  diagnostics: FormDiagnostic[],
): void {
  for (const keyword of Object.keys(schema)) {
    if (schema[keyword] !== undefined && !keywordSet.has(keyword)) {
      diagnostics.push(
        schemaDiagnostic(
          'schema.keyword.unsupported',
          `Schema keyword ${keyword} is not supported by A3S Form Schema Profile 1.`,
          `${path}/${pointerToken(keyword)}`,
          `Use one of: ${SUPPORTED_SCHEMA_KEYWORDS.join(', ')}.`,
        ),
      );
    }
  }

  if (schema.$schema !== undefined) {
    const dialect = schema.$schema;
    if (
      path !== '/schema' ||
      (dialect !== JSON_SCHEMA_2020_12_DIALECT && dialect !== `${JSON_SCHEMA_2020_12_DIALECT}#`)
    ) {
      diagnostics.push(
        schemaDiagnostic(
          'schema.dialect',
          `Schema dialect must be ${JSON_SCHEMA_2020_12_DIALECT} at the document root.`,
          `${path}/$schema`,
        ),
      );
    }
  }
  if (schema.$id !== undefined && (typeof schema.$id !== 'string' || !URL.canParse(schema.$id))) {
    invalidKeyword(diagnostics, path, '$id', 'must be an absolute URI');
  }
  if (schema.type !== undefined && (typeof schema.type !== 'string' || !typeSet.has(schema.type))) {
    invalidKeyword(diagnostics, path, 'type', 'must be a supported singular JSON type');
  }
  for (const keyword of ['title', 'description'] as const) {
    if (schema[keyword] !== undefined && typeof schema[keyword] !== 'string') {
      invalidKeyword(diagnostics, path, keyword, 'must be a string');
    }
  }
  for (const keyword of ['default', 'const'] as const) {
    if (schema[keyword] !== undefined && !isJsonValue(schema[keyword])) {
      invalidKeyword(diagnostics, path, keyword, 'must be a finite JSON value');
    }
  }
  if (schema.enum !== undefined) {
    const values = schema.enum;
    if (
      !Array.isArray(values) ||
      values.length === 0 ||
      !values.every(isJsonValue) ||
      new Set(values.map((value) => canonicalize(value as JsonValue))).size !== values.length
    ) {
      invalidKeyword(diagnostics, path, 'enum', 'must contain unique finite JSON values');
    }
  }

  if (schema.properties !== undefined) {
    if (!isRecord(schema.properties)) {
      invalidKeyword(diagnostics, path, 'properties', 'must be an object of child schemas');
    } else {
      for (const [name, child] of Object.entries(schema.properties)) {
        const childPath = `${path}/properties/${pointerToken(name)}`;
        if (name.length === 0 || name.includes('.') || name === '*') {
          diagnostics.push(
            schemaDiagnostic(
              'schema.property.invalid',
              'Property names must be non-empty and cannot contain dots or the reserved * segment.',
              childPath,
              'A3S Form uses dot-separated paths and * for repeater rows.',
            ),
          );
        }
        if (!isRecord(child)) {
          diagnostics.push(
            schemaDiagnostic(
              'schema.definition.invalid',
              'Every properties entry must be a schema object.',
              childPath,
            ),
          );
        } else inspectSchema(child, childPath, diagnostics);
      }
    }
  }
  if (schema.required !== undefined) {
    const required = schema.required;
    if (
      !Array.isArray(required) ||
      !required.every((value) => typeof value === 'string' && value.length > 0) ||
      new Set(required).size !== required.length
    ) {
      invalidKeyword(diagnostics, path, 'required', 'must contain unique, non-empty strings');
    } else if (
      !isRecord(schema.properties) ||
      required.some((name) => !Object.hasOwn(schema.properties as Record<string, unknown>, name))
    ) {
      invalidKeyword(diagnostics, path, 'required', 'must reference declared properties');
    }
  }
  if (schema.items !== undefined) {
    if (!isRecord(schema.items)) {
      invalidKeyword(diagnostics, path, 'items', 'must be a schema object');
    } else inspectSchema(schema.items, `${path}/items`, diagnostics);
  }
  if (
    schema.additionalProperties !== undefined &&
    typeof schema.additionalProperties !== 'boolean'
  ) {
    if (!isRecord(schema.additionalProperties)) {
      invalidKeyword(diagnostics, path, 'additionalProperties', 'must be a boolean or schema');
    } else {
      inspectSchema(schema.additionalProperties, `${path}/additionalProperties`, diagnostics);
    }
  }

  for (const keyword of ['minLength', 'maxLength', 'minItems', 'maxItems'] as const) {
    if (schema[keyword] !== undefined && !isNonNegativeInteger(schema[keyword])) {
      invalidKeyword(diagnostics, path, keyword, 'must be a non-negative safe integer');
    }
  }
  if (
    typeof schema.minLength === 'number' &&
    typeof schema.maxLength === 'number' &&
    schema.minLength > schema.maxLength
  ) {
    invalidKeyword(diagnostics, path, 'maxLength', 'must be greater than or equal to minLength');
  }
  if (
    typeof schema.minItems === 'number' &&
    typeof schema.maxItems === 'number' &&
    schema.minItems > schema.maxItems
  ) {
    invalidKeyword(diagnostics, path, 'maxItems', 'must be greater than or equal to minItems');
  }
  for (const keyword of ['minimum', 'maximum'] as const) {
    if (
      schema[keyword] !== undefined &&
      (typeof schema[keyword] !== 'number' || !Number.isFinite(schema[keyword]))
    ) {
      invalidKeyword(diagnostics, path, keyword, 'must be a finite number');
    }
  }
  if (
    schema.multipleOf !== undefined &&
    (typeof schema.multipleOf !== 'number' ||
      !Number.isFinite(schema.multipleOf) ||
      schema.multipleOf <= 0)
  ) {
    invalidKeyword(diagnostics, path, 'multipleOf', 'must be a finite number greater than zero');
  }
  if (
    typeof schema.minimum === 'number' &&
    typeof schema.maximum === 'number' &&
    schema.minimum > schema.maximum
  ) {
    invalidKeyword(diagnostics, path, 'maximum', 'must be greater than or equal to minimum');
  }
  if (schema.uniqueItems !== undefined && typeof schema.uniqueItems !== 'boolean') {
    invalidKeyword(diagnostics, path, 'uniqueItems', 'must be a boolean');
  }
  if (schema.pattern !== undefined) {
    if (typeof schema.pattern !== 'string') {
      invalidKeyword(diagnostics, path, 'pattern', 'must be a string');
    } else {
      try {
        new RegExp(schema.pattern, 'u');
      } catch {
        diagnostics.push(
          schemaDiagnostic(
            'schema.pattern.invalid',
            'Schema pattern must be a valid ECMAScript Unicode regular expression.',
            `${path}/pattern`,
          ),
        );
      }
    }
  }
  if (schema.format !== undefined) {
    if (typeof schema.format !== 'string' || !formatSet.has(schema.format)) {
      diagnostics.push(
        schemaDiagnostic(
          'schema.format.unsupported',
          `Schema format ${String(schema.format)} is not supported by A3S Form Schema Profile 1.`,
          `${path}/format`,
          `Use one of: ${SUPPORTED_SCHEMA_FORMATS.join(', ')}.`,
        ),
      );
    }
  }
}

export function inspectSchemaProfile(schema: JsonSchema, path = '/schema'): FormDiagnostic[] {
  const diagnostics: FormDiagnostic[] = [];
  if (!isRecord(schema)) {
    diagnostics.push(
      schemaDiagnostic('schema.definition.invalid', 'Schema must be an object.', path),
    );
    return diagnostics;
  }
  inspectSchema(schema, path, diagnostics);
  return diagnostics;
}

export function jsonValuesEqual(left: unknown, right: unknown): boolean {
  if (!isJsonValue(left) || !isJsonValue(right)) return false;
  return canonicalize(left) === canonicalize(right);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

const timePattern =
  /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

const formatValidators: Readonly<Record<SupportedSchemaFormat, (value: string) => boolean>> =
  Object.freeze({
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    uri: (value) => URL.canParse(value) && /^[A-Za-z][A-Za-z\d+.-]*:/.test(value),
    date: validDate,
    'date-time': (value) => {
      const match = /^(\d{4}-\d{2}-\d{2})T(.+)$/.exec(value);
      return match !== null && validDate(match[1]) && timePattern.test(match[2]);
    },
    time: (value) => timePattern.test(value),
    hostname: (value) =>
      value.length <= 253 &&
      /^(?=.{1,253}\.?$)(?:[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?\.)*[A-Za-z\d](?:[A-Za-z\d-]{0,61}[A-Za-z\d])?\.?$/.test(
        value,
      ),
    ipv4: (value) =>
      /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) &&
      value.split('.').every((part) => Number(part) <= 255),
    ipv6: (value) => URL.canParse(`http://[${value}]/`),
    uuid: (value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  });

export function isSchemaFormatValid(format: string, value: string): boolean {
  return formatSet.has(format) && formatValidators[format as SupportedSchemaFormat](value);
}
