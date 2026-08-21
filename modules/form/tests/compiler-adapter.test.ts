import type { PortableCompileRequest, PortableCompileResponse, WasmFormCore } from '../src/core';
import {
  assertCompiled,
  compileFormWithCore,
  embeddedWasmFormCore,
  PORTABLE_COMPILE_REQUEST_API_VERSION,
} from '../src/core';
import { createDocument } from './fixtures';

function fakeCore(
  compile: (request: PortableCompileRequest) => PortableCompileResponse | undefined,
): WasmFormCore {
  return {
    version: '1.0.0',
    compilerRevision: 'a3s-form-core@test',
    inputCapacity: 1,
    outputCapacity: 1,
    compileBytes: () => undefined,
    compile,
    evaluateBytes: () => undefined,
    evaluate: () => undefined,
  };
}

function portableSuccess(): PortableCompileResponse {
  const core = embeddedWasmFormCore();
  if (!core) throw new Error('Embedded Form Core is unavailable.');
  const response = core.compile({
    apiVersion: PORTABLE_COMPILE_REQUEST_API_VERSION,
    document: createDocument(),
  });
  if (!response?.ok) throw new Error('Portable success fixture did not compile.');
  return response;
}

describe('default portable compiler adapter', () => {
  it('reports root diagnostics through assertCompiled', () => {
    expect(() => assertCompiled(null)).toThrow('/: Form document must be a JSON object.');
  });

  it('fails explicitly when no semantic core is available', () => {
    expect(compileFormWithCore(undefined, createDocument())).toEqual({
      compilerRevision: 'a3s-form-core@unavailable',
      ok: false,
      diagnostics: [
        {
          code: 'compiler.unavailable',
          severity: 'error',
          message: 'The portable A3S Form semantic core is unavailable.',
          path: '',
        },
      ],
    });
  });

  it('converts iterable capabilities and partial limits into the portable request', () => {
    const success = portableSuccess();
    let captured: PortableCompileRequest | undefined;
    const core = fakeCore((request) => {
      captured = request;
      return success;
    });
    const result = compileFormWithCore(core, createDocument(), {
      capabilities: {
        widgets: new Set(['test.widget']),
        dataSources: new Set(['test.source']),
        actions: new Set(['test.action']),
      },
      limits: { maxNodes: 10 },
      requireDigest: true,
    });

    expect(result.ok).toBe(true);
    expect(result.compilerRevision).toBe('a3s-form-core@0.1.0');
    expect(result.document && Object.isFrozen(result.document)).toBe(true);
    expect(result.plan && Object.isFrozen(result.plan)).toBe(true);
    expect(captured?.options).toEqual({
      capabilities: {
        widgets: ['test.widget'],
        dataSources: ['test.source'],
        actions: ['test.action'],
      },
      limits: {
        maxSerializedBytes: undefined,
        maxNodes: 10,
        maxDepth: undefined,
        maxRules: undefined,
        maxExpressionOperations: undefined,
        maxPatchOperations: undefined,
      },
      requireDigest: true,
    });

    compileFormWithCore(core, createDocument(), { capabilities: {} });
    expect(captured?.options?.capabilities).toBeUndefined();
    expect(captured?.options?.limits).toBeUndefined();
  });

  it('maps absent, failed, and malformed core responses without throwing', () => {
    const noResponse = compileFormWithCore(
      fakeCore(() => undefined),
      createDocument(),
    );
    expect(noResponse.diagnostics[0]?.code).toBe('compiler.response');

    const ordinaryFailure = compileFormWithCore(
      fakeCore(() => ({
        apiVersion: 'a3s.dev/form-core/compile-response/v1alpha1',
        compilerRevision: 'a3s-form-core@test',
        ok: false,
        diagnostics: [
          { code: 'test.failure', severity: 'error', message: 'failed', path: '/test' },
        ],
      })),
      createDocument(),
    );
    expect(ordinaryFailure.diagnostics[0]?.code).toBe('test.failure');

    const encodingFailure = compileFormWithCore(
      fakeCore(() => ({
        apiVersion: 'a3s.dev/form-core/compile-response/v1alpha1',
        compilerRevision: 'a3s-form-core@test',
        ok: false,
        diagnostics: [
          {
            code: 'protocol.request_encoding',
            severity: 'error',
            message: 'unencodable',
            path: '',
          },
        ],
      })),
      createDocument(),
    );
    expect(encodingFailure.diagnostics[0]?.code).toBe('document.json_value');

    const thrown = compileFormWithCore(
      fakeCore(() => {
        throw new Error('trap');
      }),
      createDocument(),
    );
    expect(thrown.diagnostics[0]?.message).toContain('could not be decoded');
  });

  it.each([
    'normalizedDocumentJson',
    'formPlan',
    'digest',
    'schemaProfile',
  ] as const)('rejects a success response without %s', (field) => {
    const incomplete = portableSuccess();
    Reflect.deleteProperty(incomplete, field);
    const result = compileFormWithCore(
      fakeCore(() => incomplete),
      createDocument(),
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain('incomplete success response');
  });

  it('rejects normalized output that cannot be decoded', () => {
    const malformed = { ...portableSuccess(), normalizedDocumentJson: '{' };
    const result = compileFormWithCore(
      fakeCore(() => malformed),
      createDocument(),
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.message).toContain('could not be decoded');
  });
});
