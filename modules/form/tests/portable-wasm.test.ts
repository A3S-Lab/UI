import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FormDocument } from '../src/core';
import {
  canonicalize,
  createBase64WasmFormCore,
  createWasmFormCore,
  describePortableFormCore,
  embeddedWasmFormCore,
  PORTABLE_COMPILE_REQUEST_API_VERSION,
  portableFormCoreStatus,
  sha256JavaScript,
} from '../src/core';
import compilerFoundationJson from './conformance/compiler-foundation-v1.json';

interface CompilerCase {
  name: string;
  inputJson: string;
  normalizedDocumentSha256: string;
  digest: string;
  formPlanSha256: string;
}

const binary = readFileSync(resolve(process.cwd(), 'src/wasm/form-core.wasm'));
const core = createWasmFormCore(binary);
const cases = compilerFoundationJson.cases as CompilerCase[];

function runtimeWithOutputLength(outputLength: number, outputCapacity = 4): typeof WebAssembly {
  const memory = new WebAssembly.Memory({ initial: 1 });
  class Module {}
  class Instance {
    exports = {
      memory,
      engine_version: () => 0x01_00_00,
      compiler_version: () => 0x00_01_00,
      input_ptr: () => 0,
      input_capacity: () => 4096,
      output_ptr: () => 32,
      output_capacity: () => outputCapacity,
      compile_request: () => outputLength,
      evaluate_request: () => outputLength,
    };
  }
  return { Module, Instance } as never;
}

function runtimeWithoutExport(missing: 'compile_request' | 'evaluate_request'): typeof WebAssembly {
  const memory = new WebAssembly.Memory({ initial: 1 });
  class Module {}
  class Instance {
    exports: Record<string, unknown> = {
      memory,
      engine_version: () => 0x01_00_00,
      compiler_version: () => 0x00_01_00,
      input_ptr: () => 0,
      input_capacity: () => 4096,
      output_ptr: () => 32,
      output_capacity: () => 4096,
      compile_request: () => 0,
      evaluate_request: () => 0,
    };

    constructor() {
      delete this.exports[missing];
    }
  }
  return { Module, Instance } as never;
}

describe('portable Form Core WASM adapter', () => {
  it('exposes bounded compiler memory and a version', () => {
    expect(core).toBeDefined();
    expect(core?.version).toBe('1.0.0');
    expect(core?.inputCapacity).toBe(5 * 1024 * 1024);
    expect(core?.outputCapacity).toBe(16 * 1024 * 1024);
    expect(createWasmFormCore(new Uint8Array([0]))).toBeUndefined();
    expect(createWasmFormCore(binary, null)).toBeUndefined();
    expect(
      createWasmFormCore(new Uint8Array(), runtimeWithoutExport('compile_request')),
    ).toBeUndefined();
    expect(
      createWasmFormCore(new Uint8Array(), runtimeWithoutExport('evaluate_request')),
    ).toBeUndefined();
    expect(createBase64WasmFormCore(Buffer.from(binary).toString('base64'))?.version).toBe('1.0.0');
    expect(createBase64WasmFormCore('', null)).toBeUndefined();
    expect(createBase64WasmFormCore('', WebAssembly, undefined)).toBeUndefined();
    expect(
      createBase64WasmFormCore('', WebAssembly, () => {
        throw new Error('decode failed');
      }),
    ).toBeUndefined();

    expect(embeddedWasmFormCore()).toBe(embeddedWasmFormCore());
    expect(describePortableFormCore(core)).toEqual({
      available: true,
      engine: 'rust-wasm',
      version: '1.0.0',
      compilerRevision: 'a3s-form-core@0.1.0',
    });
    expect(describePortableFormCore(undefined)).toEqual({
      available: false,
      engine: 'unavailable',
    });
    expect(portableFormCoreStatus()).toEqual(describePortableFormCore(core));
  });

  it('matches native and TypeScript compiler foundation identities', () => {
    for (const testCase of cases) {
      const response = core?.compile({
        apiVersion: PORTABLE_COMPILE_REQUEST_API_VERSION,
        document: JSON.parse(testCase.inputJson) as FormDocument,
      });
      expect(response?.ok, testCase.name).toBe(true);
      expect(response?.digest, testCase.name).toBe(testCase.digest);
      expect(sha256JavaScript(response?.normalizedDocumentJson ?? ''), testCase.name).toBe(
        testCase.normalizedDocumentSha256,
      );
      expect(sha256JavaScript(canonicalize(response?.formPlan as never)), testCase.name).toBe(
        testCase.formPlanSha256,
      );
      expect(response?.diagnostics, testCase.name).toEqual([]);
    }
  });

  it('returns bounded protocol diagnostics instead of trapping', () => {
    const response = core?.compileBytes(
      new TextEncoder().encode('{"apiVersion":"unsupported","document":{}}'),
    );
    expect(response).toBeDefined();
    const decoded = JSON.parse(new TextDecoder().decode(response)) as {
      ok: boolean;
      diagnostics: Array<{ code: string }>;
    };
    expect(decoded.ok).toBe(false);
    expect(decoded.diagnostics[0]?.code).toBe('protocol.api_version');

    const unencodable = core?.compile({ toJSON: () => undefined } as never);
    expect(unencodable?.diagnostics[0]?.code).toBe('protocol.request_encoding');
    const unencodableEvaluation = core?.evaluate({ toJSON: () => undefined } as never);
    expect(unencodableEvaluation?.errors[0]?.code).toBe('protocol.request_encoding');
    const cyclicEvaluation: Record<string, unknown> = {};
    cyclicEvaluation.self = cyclicEvaluation;
    expect(core?.evaluate(cyclicEvaluation as never)?.errors[0]?.code).toBe(
      'protocol.request_encoding',
    );

    const noOutput = createWasmFormCore(new Uint8Array(), runtimeWithOutputLength(0));
    expect(noOutput?.compileBytes(new Uint8Array())).toBeUndefined();
    expect(
      noOutput?.compile({
        apiVersion: PORTABLE_COMPILE_REQUEST_API_VERSION,
        document: JSON.parse(cases[0].inputJson) as FormDocument,
      }),
    ).toBeUndefined();
    expect(noOutput?.evaluate({} as never)).toBeUndefined();

    const oversizedEvaluation = noOutput?.evaluateBytes(new Uint8Array(4097));
    expect(oversizedEvaluation).toBeDefined();
    expect(JSON.parse(new TextDecoder().decode(oversizedEvaluation)).errors[0]?.code).toBe(
      'protocol.request_size',
    );

    const excessiveOutput = createWasmFormCore(new Uint8Array(), runtimeWithOutputLength(5, 4));
    expect(excessiveOutput?.compileBytes(new Uint8Array())).toBeUndefined();
    expect(excessiveOutput?.evaluateBytes(new Uint8Array())).toBeUndefined();
  });
});
