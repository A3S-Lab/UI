import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createWasmFormCore,
  PORTABLE_COMPILE_REQUEST_API_VERSION,
  type PortableCompileRequest,
} from '../src/core';
import protocolConformanceJson from './conformance/protocol-v1.json';
import { createDocument } from './fixtures';

interface ProtocolCase {
  name: string;
  requestJson: string;
  responseJson: string;
}

const fixture = protocolConformanceJson as {
  apiVersion: string;
  cases: ProtocolCase[];
};
const binary = readFileSync(resolve(process.cwd(), 'src/wasm/form-core.wasm'));
const core = createWasmFormCore(binary);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe('portable Form Core byte protocol', () => {
  it('returns byte-identical bounded failure responses from WASM', () => {
    expect(fixture.apiVersion).toBe('a3s.dev/form-core-protocol-conformance/v1');
    expect(core).toBeDefined();
    for (const testCase of fixture.cases) {
      const response = core?.compileBytes(encoder.encode(testCase.requestJson));
      expect(response, testCase.name).toBeDefined();
      expect(decoder.decode(response), testCase.name).toBe(testCase.responseJson);
    }
  });

  it('reports requests beyond the raw WASM input boundary without trapping', () => {
    const request = new Uint8Array((core?.inputCapacity ?? 0) + 1);
    const response = core?.compileBytes(request);
    expect(response).toBeDefined();
    expect(decoder.decode(response)).toBe(
      '{"apiVersion":"a3s.dev/form-core/compile-response/v1alpha1","compilerRevision":"a3s-form-core@0.1.0","diagnostics":[{"code":"protocol.request_size","message":"compile request is 5242881 bytes; the hard limit is 5242880 bytes","path":"","severity":"error"}],"ok":false}',
    );
  });

  it('fails closed when a JavaScript request cannot be encoded as JSON', () => {
    const request: PortableCompileRequest & { self?: unknown } = {
      apiVersion: PORTABLE_COMPILE_REQUEST_API_VERSION,
      document: createDocument(),
    };
    request.self = request;

    expect(() => core?.compile(request)).not.toThrow();
    expect(core?.compile(request)).toEqual({
      apiVersion: 'a3s.dev/form-core/compile-response/v1alpha1',
      compilerRevision: 'a3s-form-core@0.1.0',
      ok: false,
      diagnostics: [
        {
          code: 'protocol.request_encoding',
          message: 'compile request must be an acyclic JSON value that can be encoded.',
          path: '',
          severity: 'error',
        },
      ],
    });
  });
});
