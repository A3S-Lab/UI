import type { FormDocument } from '../src/core';
import { compileForm, inspectSchemaProfile } from '../src/core';
import { hasPortableJsonGraph } from '../src/core/portable-input';
import { isJsonValue } from '../src/core/schema-profile';
import { createDocument } from './fixtures';

const invalidJsonDiagnostic = {
  code: 'document.json_value',
  severity: 'error',
  message: 'Form document must be an acyclic, bounded JSON value without accessor properties.',
  path: '/document',
};

function expectInvalidJson(input: unknown): void {
  expect(() => compileForm(input)).not.toThrow();
  expect(compileForm(input)).toEqual({
    compilerRevision: 'a3s-form-core@0.1.0',
    ok: false,
    diagnostics: [invalidJsonDiagnostic],
  });
}

describe('adversarial compiler inputs', () => {
  it('rejects cycles at the document, schema, and data-source parameter boundaries', () => {
    const rootCycle = createDocument() as FormDocument & { self?: unknown };
    rootCycle.self = rootCycle;
    expectInvalidJson(rootCycle);

    const schemaCycle = createDocument();
    (schemaCycle.schema as Record<string, unknown>).cycle = schemaCycle.schema;
    expectInvalidJson(schemaCycle);

    const parameterCycle = createDocument();
    const parameters: Record<string, unknown> = {};
    parameters.self = parameters;
    parameterCycle.dataSources = [
      {
        id: 'cyclic',
        registryKey: 'test.cyclic',
        parameters: parameters as never,
      },
    ];
    expectInvalidJson(parameterCycle);
  });

  it('rejects over-deep object graphs before recursive compiler passes', () => {
    const document = createDocument();
    const metadata = document.metadata as typeof document.metadata & { nested?: unknown };
    const nested: Record<string, unknown> = {};
    metadata.nested = nested;
    let cursor = nested;
    for (let depth = 0; depth < 140; depth += 1) {
      const child: Record<string, unknown> = {};
      cursor.child = child;
      cursor = child;
    }
    expectInvalidJson(document);
  });

  it('rejects accessors without invoking them', () => {
    const document = createDocument();
    let calls = 0;
    Object.defineProperty(document.metadata, 'description', {
      enumerable: true,
      get() {
        calls += 1;
        throw new Error('must not run');
      },
    });

    expectInvalidJson(document);
    expect(calls).toBe(0);
  });

  it('fails closed for throwing and revoked proxies', () => {
    const throwing = new Proxy(createDocument(), {
      get() {
        throw new Error('unreadable');
      },
    });
    expectInvalidJson(throwing);

    const revocable = Proxy.revocable(createDocument(), {});
    revocable.revoke();
    expectInvalidJson(revocable.proxy);
  });

  it('allows shared acyclic JSON subgraphs', () => {
    const document = createDocument();
    const shared = { value: 'shared' };
    const metadata = document.metadata as typeof document.metadata & {
      first?: unknown;
      second?: unknown;
    };
    metadata.first = shared;
    metadata.second = shared;

    expect(compileForm(document).ok).toBe(true);
  });

  it('fails closed when schema helpers receive non-finite or cyclic values directly', () => {
    expect(isJsonValue(Number.NaN)).toBe(false);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(isJsonValue(cyclic)).toBe(false);
    expect(inspectSchemaProfile({ default: Number.NaN } as never)).toContainEqual(
      expect.objectContaining({ code: 'schema.keyword.invalid', path: '/schema/default' }),
    );
  });

  it('closes non-JSON primitives, prototypes, keys, arrays, and graph sizes', () => {
    expect(hasPortableJsonGraph(undefined)).toBe(false);
    expect(hasPortableJsonGraph({ omitted: undefined })).toBe(true);
    expect(hasPortableJsonGraph(Number.NaN)).toBe(false);
    expect(hasPortableJsonGraph(() => undefined)).toBe(false);
    expect(hasPortableJsonGraph(Symbol('value'))).toBe(false);
    expect(hasPortableJsonGraph(1n)).toBe(false);
    expect(hasPortableJsonGraph(new Date())).toBe(false);

    const symbolKey = { value: true, [Symbol('hidden')]: true };
    expect(hasPortableJsonGraph(symbolKey)).toBe(false);
    expect(hasPortableJsonGraph(new Array(1))).toBe(false);

    const hidden = {};
    Object.defineProperty(hidden, 'value', { value: true, enumerable: false });
    expect(hasPortableJsonGraph(hidden)).toBe(false);

    const malformedArray = new Proxy(new Array(1), {
      ownKeys: () => ['length', '01'],
      getOwnPropertyDescriptor(target, key) {
        if (key === 'length') return Reflect.getOwnPropertyDescriptor(target, key);
        return { configurable: true, enumerable: true, writable: true, value: 'invalid-index' };
      },
    });
    expect(hasPortableJsonGraph(malformedArray)).toBe(false);

    expect(hasPortableJsonGraph(Array.from({ length: 100_001 }, () => null))).toBe(false);
  });
});
