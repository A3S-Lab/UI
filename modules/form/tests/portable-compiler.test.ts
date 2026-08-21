import type { FormDocument } from '../src/core';
import { canonicalize, compileForm, sha256JavaScript } from '../src/core';
import compilerFoundationJson from './conformance/compiler-foundation-v1.json';

interface CompilerCase {
  name: string;
  inputJson: string;
  normalizedDocumentSha256: string;
  digest: string;
  formPlanSha256: string;
  diagnostics: Array<{ code: string; severity: string; path: string }>;
}

interface CompilerFixture {
  apiVersion: string;
  cases: CompilerCase[];
}

const fixture = compilerFoundationJson as CompilerFixture;

describe('portable compiler foundation', () => {
  it('matches the shared normalized document and FormPlan identities', () => {
    expect(fixture.apiVersion).toBe('a3s.dev/form-compiler-foundation-conformance/v1');
    for (const testCase of fixture.cases) {
      const result = compileForm(JSON.parse(testCase.inputJson) as FormDocument);
      expect(result.ok, testCase.name).toBe(true);
      expect(result.compilerRevision, testCase.name).toBe('a3s-form-core@0.1.0');
      expect(result.document?.digest, testCase.name).toBe(testCase.digest);
      expect(sha256JavaScript(canonicalize(result.document as FormDocument)), testCase.name).toBe(
        testCase.normalizedDocumentSha256,
      );
      expect(sha256JavaScript(canonicalize(result.plan as never)), testCase.name).toBe(
        testCase.formPlanSha256,
      );
      expect(
        result.diagnostics.map(({ code, severity, path }) => ({ code, severity, path })),
        testCase.name,
      ).toEqual(testCase.diagnostics);
    }
  });
});
