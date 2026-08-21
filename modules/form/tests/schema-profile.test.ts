import {
  A3S_FORM_SCHEMA_PROFILE_1,
  assertCompiled,
  compileForm,
  inspectSchemaProfile,
  isSchemaFormatValid,
  jsonValuesEqual,
  SUPPORTED_SCHEMA_FORMATS,
  validateFormValue,
} from '../src/core';
import { createDocument } from './fixtures';

function diagnosticCodes(document: ReturnType<typeof createDocument>): string[] {
  return compileForm(document).diagnostics.map((item) => item.code);
}

describe('A3S Form Schema Profile 1', () => {
  it('publishes the active profile and records it in every compiled plan', () => {
    const result = compileForm(createDocument());
    expect(result.ok).toBe(true);
    expect(result.plan?.schemaProfile).toBe(A3S_FORM_SCHEMA_PROFILE_1.id);
    expect(A3S_FORM_SCHEMA_PROFILE_1.dialect).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(A3S_FORM_SCHEMA_PROFILE_1.keywords).toContain('additionalProperties');
    expect(A3S_FORM_SCHEMA_PROFILE_1.keywords).toContain('multipleOf');
    expect(SUPPORTED_SCHEMA_FORMATS).toEqual(
      expect.arrayContaining(['email', 'uri', 'date', 'date-time', 'time', 'uuid']),
    );
    expect(Object.isFrozen(A3S_FORM_SCHEMA_PROFILE_1)).toBe(true);
  });

  it('rejects unsupported keywords at any schema depth with an exact path', () => {
    const document = createDocument();
    const name = document.schema.properties?.name as Record<string, unknown>;
    name.oneOf = [{ type: 'string' }];
    const result = compileForm(document);
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'schema.keyword.unsupported',
        path: '/schema/properties/name/oneOf',
      }),
    );

    const reference = createDocument();
    (reference.schema.properties?.name as Record<string, unknown>).$ref = '#/$defs/name';
    expect(diagnosticCodes(reference)).toContain('schema.keyword.unsupported');
  });

  it('rejects malformed keyword values instead of accepting silent behavior', () => {
    const malformedProperties = createDocument();
    malformedProperties.schema.properties = [] as never;
    expect(diagnosticCodes(malformedProperties)).toContain('schema.keyword.invalid');

    const malformedRequired = createDocument();
    malformedRequired.schema.required = ['name', 'name'];
    expect(diagnosticCodes(malformedRequired)).toContain('schema.keyword.invalid');

    const malformedBounds = createDocument();
    const name = malformedBounds.schema.properties?.name;
    if (!name) throw new Error('Missing name schema fixture.');
    name.minLength = 5;
    name.maxLength = 2;
    expect(diagnosticCodes(malformedBounds)).toContain('schema.keyword.invalid');

    const malformedPattern = createDocument();
    const broken = malformedPattern.schema.properties?.name;
    if (!broken) throw new Error('Missing name schema fixture.');
    broken.pattern = '[';
    expect(diagnosticCodes(malformedPattern)).toContain('schema.pattern.invalid');

    const unsupportedFormat = createDocument();
    const formatted = unsupportedFormat.schema.properties?.name;
    if (!formatted) throw new Error('Missing name schema fixture.');
    formatted.format = 'company-id';
    expect(diagnosticCodes(unsupportedFormat)).toContain('schema.format.unsupported');
  });

  it.each([
    ['$id with a non-string value', { $id: 42 }, 'schema.keyword.invalid'],
    ['$id with a relative value', { $id: 'forms/profile' }, 'schema.keyword.invalid'],
    ['an unknown type', { type: 'decimal' }, 'schema.keyword.invalid'],
    ['a non-string type', { type: ['string'] }, 'schema.keyword.invalid'],
    ['a non-string title', { title: 1 }, 'schema.keyword.invalid'],
    ['a non-string description', { description: false }, 'schema.keyword.invalid'],
    ['a non-JSON default', { default: Number.NaN }, 'document.json_value'],
    ['a non-JSON const', { const: () => undefined }, 'document.json_value'],
    ['a non-array enum', { enum: 'one' }, 'schema.keyword.invalid'],
    ['an empty enum', { enum: [] }, 'schema.keyword.invalid'],
    ['an enum with non-JSON data', { enum: [undefined] }, 'document.json_value'],
    ['an enum with duplicates', { enum: [{ id: 1 }, { id: 1 }] }, 'schema.keyword.invalid'],
    ['non-string required entries', { required: [1] }, 'schema.keyword.invalid'],
    ['a non-schema items value', { items: true }, 'schema.keyword.invalid'],
    ['invalid additional properties', { additionalProperties: [] }, 'schema.keyword.invalid'],
    ['a negative minLength', { minLength: -1 }, 'schema.keyword.invalid'],
    ['a fractional maxLength', { maxLength: 1.5 }, 'schema.keyword.invalid'],
    ['a negative minItems', { minItems: -1 }, 'schema.keyword.invalid'],
    ['a fractional maxItems', { maxItems: 1.5 }, 'schema.keyword.invalid'],
    ['reversed item bounds', { minItems: 3, maxItems: 2 }, 'schema.keyword.invalid'],
    ['a non-finite minimum', { minimum: Number.NaN }, 'document.json_value'],
    ['a non-number maximum', { maximum: '10' }, 'schema.keyword.invalid'],
    ['reversed numeric bounds', { minimum: 10, maximum: 2 }, 'schema.keyword.invalid'],
    ['a zero multipleOf', { multipleOf: 0 }, 'schema.keyword.invalid'],
    ['a negative multipleOf', { multipleOf: -0.5 }, 'schema.keyword.invalid'],
    ['a non-finite multipleOf', { multipleOf: Number.NaN }, 'document.json_value'],
    ['a non-boolean uniqueItems', { uniqueItems: 'yes' }, 'schema.keyword.invalid'],
    ['a non-string pattern', { pattern: 1 }, 'schema.keyword.invalid'],
    ['a non-string format', { format: 1 }, 'schema.format.unsupported'],
  ])('rejects %s', (_label, schema, code) => {
    const document = createDocument();
    Object.assign(document.schema as Record<string, unknown>, schema);
    expect(diagnosticCodes(document)).toContain(code);
  });

  it('rejects invalid child schemas and nested dialect declarations', () => {
    const child = createDocument();
    child.schema.properties = { broken: null as never };
    expect(compileForm(child).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'schema.definition.invalid',
        path: '/schema/properties/broken',
      }),
    );

    const nestedDialect = createDocument();
    const name = nestedDialect.schema.properties?.name;
    if (!name) throw new Error('Missing name schema fixture.');
    name.$schema = 'https://json-schema.org/draft/2020-12/schema';
    expect(diagnosticCodes(nestedDialect)).toContain('schema.dialect');

    expect(inspectSchemaProfile(null as never, '/custom')).toContainEqual(
      expect.objectContaining({ code: 'schema.definition.invalid', path: '/custom' }),
    );
  });

  it('keeps property names compatible with deterministic value paths', () => {
    const dotted = createDocument();
    dotted.schema.properties = { 'model.name': { type: 'string' } };
    dotted.schema.required = ['model.name'];
    expect(compileForm(dotted).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'schema.property.invalid',
        path: '/schema/properties/model.name',
      }),
    );

    const empty = createDocument();
    empty.schema.properties = { '': { type: 'string' } };
    empty.schema.required = [];
    expect(compileForm(empty).diagnostics).toContainEqual(
      expect.objectContaining({ code: 'schema.property.invalid', path: '/schema/properties/' }),
    );

    const wildcard = createDocument();
    wildcard.schema.properties = { '*': { type: 'string' } };
    wildcard.schema.required = ['*'];
    expect(compileForm(wildcard).diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'schema.property.invalid',
        path: '/schema/properties/*',
      }),
    );

    const undeclared = createDocument();
    undeclared.schema.required = ['missing'];
    expect(diagnosticCodes(undeclared)).toContain('schema.keyword.invalid');
  });

  it('treats undefined optional members as omitted and supports JSON equality defensively', () => {
    const document = createDocument();
    Object.assign(document.schema, {
      $id: 'https://example.com/schemas/profile',
      $schema: 'https://json-schema.org/draft/2020-12/schema#',
      required: undefined,
      futureUndefinedKeyword: undefined,
    });
    expect(compileForm(document).ok).toBe(true);
    expect(jsonValuesEqual({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true);
    expect(jsonValuesEqual(undefined, null)).toBe(false);
    expect(jsonValuesEqual(null, undefined)).toBe(false);
  });

  it('fails closed for unknown formats and malformed date/network values', () => {
    expect(isSchemaFormatValid('unknown', 'anything')).toBe(false);
    expect(isSchemaFormatValid('date', 'not-a-date')).toBe(false);
    expect(isSchemaFormatValid('date', '9999-99-99')).toBe(false);
    expect(isSchemaFormatValid('date-time', '2023-02-29T12:00:00Z')).toBe(false);
    expect(isSchemaFormatValid('date-time', '2026-08-08T25:00:00Z')).toBe(false);
    expect(isSchemaFormatValid('hostname', `${'a'.repeat(254)}.com`)).toBe(false);
    expect(isSchemaFormatValid('ipv4', '192.0.2')).toBe(false);
  });

  it('validates const and enum values with structural JSON equality', () => {
    const document = createDocument();
    document.schema.properties = {
      ...document.schema.properties,
      settings: {
        type: 'object',
        const: { mode: 'safe', limits: [1, 2] },
      },
      selection: {
        type: 'object',
        enum: [{ id: 'primary', enabled: true }],
      },
    };
    const plan = assertCompiled(document);
    expect(
      validateFormValue(plan, {
        name: 'Ada',
        settings: { limits: [1, 2], mode: 'safe' },
        selection: { enabled: true, id: 'primary' },
      }),
    ).toEqual([]);
    expect(
      validateFormValue(plan, {
        name: 'Ada',
        settings: { mode: 'unsafe', limits: [1, 2] },
        selection: { id: 'secondary', enabled: true },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'settings', code: 'const' }),
        expect.objectContaining({ path: 'selection', code: 'enum' }),
      ]),
    );
  });

  it('counts string limits by Unicode code point', () => {
    const document = createDocument();
    const name = document.schema.properties?.name;
    if (!name) throw new Error('Missing name schema fixture.');
    name.minLength = 1;
    name.maxLength = 1;
    const plan = assertCompiled(document);
    expect(validateFormValue(plan, { name: '😀' })).toEqual([]);
    expect(validateFormValue(plan, { name: '😀😀' })).toContainEqual(
      expect.objectContaining({ path: 'name', code: 'maxLength' }),
    );
  });

  it('enforces unique arrays and both additionalProperties modes', () => {
    const document = createDocument();
    document.schema = {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        ...document.schema.properties,
        tags: {
          type: 'array',
          uniqueItems: true,
          items: { type: 'object' },
        },
      },
    };
    const closedPlan = assertCompiled(document);
    expect(
      validateFormValue(closedPlan, {
        name: 'Ada',
        unknown: true,
        tags: [{ id: 1 }, { id: 1 }],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'unknown', code: 'additionalProperties' }),
        expect.objectContaining({ path: 'tags', code: 'uniqueItems' }),
      ]),
    );

    const typed = createDocument();
    typed.schema.additionalProperties = { type: 'integer', minimum: 1 };
    const typedPlan = assertCompiled(typed);
    expect(validateFormValue(typedPlan, { name: 'Ada', retries: 0 })).toContainEqual(
      expect.objectContaining({ path: 'retries', code: 'minimum' }),
    );
    expect(validateFormValue(typedPlan, { name: 'Ada', retries: 2 })).toEqual([]);
  });

  it.each([
    ['email', 'owner@example.com', 'owner@invalid'],
    ['uri', 'https://example.com/forms/1', 'not a uri'],
    ['date', '2024-02-29', '2023-02-29'],
    ['date-time', '2026-08-08T15:30:00Z', '2026-08-08 15:30:00'],
    ['time', '15:30:00+08:00', '25:30:00Z'],
    ['hostname', 'workflow.example.com', '-workflow.example.com'],
    ['ipv4', '192.0.2.10', '300.0.0.1'],
    ['ipv6', '2001:db8::1', '2001:not-ipv6::1'],
    ['uuid', '123e4567-e89b-12d3-a456-426614174000', '123e4567'],
  ])('validates the %s format consistently', (format, valid, invalid) => {
    expect(isSchemaFormatValid(format, valid)).toBe(true);
    expect(isSchemaFormatValid(format, invalid)).toBe(false);
    const document = createDocument();
    document.schema.properties = {
      ...document.schema.properties,
      value: { type: 'string', format },
    };
    document.schema.required = ['value'];
    document.ui.nodes[1].schemaPath = '/properties/value';
    const plan = assertCompiled(document);
    expect(validateFormValue(plan, { value: valid })).toEqual([]);
    expect(validateFormValue(plan, { value: invalid })).toContainEqual(
      expect.objectContaining({ path: 'value', code: `format.${format}` }),
    );
  });
});
