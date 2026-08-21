import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FormDiagnostic, FormDocument } from '../src/core';
import { createWasmFormCore, PORTABLE_COMPILE_REQUEST_API_VERSION } from '../src/core';
import { compileForm as compileFormReference } from '../src/core/compiler-reference';
import matrixConformanceJson from './conformance/compiler-matrix-v1.json';
import { type FixtureMutation, mutateForm, wireDiagnostics } from './portable-fixtures';

interface MatrixCase {
  name: string;
  operations: FixtureMutation[];
  diagnostics: FormDiagnostic[];
}

interface MatrixFixture {
  apiVersion: string;
  baseInputJson: string;
  cases: MatrixCase[];
}

const fixture = matrixConformanceJson as MatrixFixture;
const binary = readFileSync(resolve(process.cwd(), 'src/wasm/form-core.wasm'));
const core = createWasmFormCore(binary);

describe('portable matrix compiler diagnostics', () => {
  it('matches the complete TypeScript and WASM diagnostic contract', () => {
    expect(fixture.apiVersion).toBe('a3s.dev/form-compiler-matrix-conformance/v1');
    expect(core).toBeDefined();
    const base = JSON.parse(fixture.baseInputJson) as FormDocument;
    for (const testCase of fixture.cases) {
      const document = mutateForm(base, testCase.operations);
      const reference = compileFormReference(document);
      expect(reference.ok, testCase.name).toBe(false);
      expect(wireDiagnostics(reference.diagnostics), testCase.name).toEqual(testCase.diagnostics);

      const response = core?.compile({
        apiVersion: PORTABLE_COMPILE_REQUEST_API_VERSION,
        document,
      });
      expect(response?.ok, testCase.name).toBe(false);
      expect(response?.diagnostics, testCase.name).toEqual(testCase.diagnostics);
    }
  });
});
