import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FormDiagnostic, FormDocument } from '../src/core';
import { createWasmFormCore, PORTABLE_COMPILE_REQUEST_API_VERSION } from '../src/core';
import { compileForm as compileFormReference } from '../src/core/compiler-reference';
import semanticsConformanceJson from './conformance/compiler-semantics-v1.json';
import { type FixtureMutation, mutateForm, wireDiagnostics } from './portable-fixtures';

interface SemanticsCase {
  name: string;
  base: string;
  operations: FixtureMutation[];
  diagnostics: FormDiagnostic[];
}

interface SemanticsFixture {
  apiVersion: string;
  bases: Record<string, FormDocument>;
  cases: SemanticsCase[];
}

const fixture = semanticsConformanceJson as unknown as SemanticsFixture;
const binary = readFileSync(resolve(process.cwd(), 'src/wasm/form-core.wasm'));
const core = createWasmFormCore(binary);

describe('portable container, rule, and data-source diagnostics', () => {
  it('matches the complete TypeScript and WASM semantic contract', () => {
    expect(fixture.apiVersion).toBe('a3s.dev/form-compiler-semantics-conformance/v1');
    expect(core).toBeDefined();
    for (const testCase of fixture.cases) {
      const base = fixture.bases[testCase.base];
      expect(base, testCase.name).toBeDefined();
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
