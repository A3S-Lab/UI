import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FormDiagnostic, FormDocument, PortableCompileRequest } from '../src/core';
import { createWasmFormCore, PORTABLE_COMPILE_REQUEST_API_VERSION } from '../src/core';
import { compileForm as compileFormReference } from '../src/core/compiler-reference';
import diagnosticsConformanceJson from './conformance/compiler-diagnostics-v1.json';
import { type FixtureMutation, mutateForm, wireDiagnostics } from './portable-fixtures';

interface DiagnosticCase {
  name: string;
  operations: FixtureMutation[];
  options?: NonNullable<PortableCompileRequest['options']>;
  diagnostics: FormDiagnostic[];
}

interface DiagnosticsFixture {
  apiVersion: string;
  baseInputJson: string;
  cases: DiagnosticCase[];
}

const fixture = diagnosticsConformanceJson as DiagnosticsFixture;
const binary = readFileSync(resolve(process.cwd(), 'src/wasm/form-core.wasm'));
const core = createWasmFormCore(binary);

describe('portable compiler failure diagnostics', () => {
  it('matches the complete TypeScript and WASM diagnostic contract', () => {
    expect(fixture.apiVersion).toBe('a3s.dev/form-compiler-diagnostics-conformance/v1');
    expect(core).toBeDefined();
    const base = JSON.parse(fixture.baseInputJson) as FormDocument;
    for (const testCase of fixture.cases) {
      const document = mutateForm(base, testCase.operations);
      const reference = compileFormReference(document, testCase.options);
      expect(reference.ok, testCase.name).toBe(false);
      expect(wireDiagnostics(reference.diagnostics), testCase.name).toEqual(testCase.diagnostics);

      const response = core?.compile({
        apiVersion: PORTABLE_COMPILE_REQUEST_API_VERSION,
        document,
        ...(testCase.options ? { options: testCase.options } : {}),
      });
      expect(response?.ok, testCase.name).toBe(false);
      expect(response?.diagnostics, testCase.name).toEqual(testCase.diagnostics);
    }
  });
});
