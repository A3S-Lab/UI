import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FormDiagnostic, FormDocument, JsonSchema } from '../src/core';
import {
  canonicalize,
  createWasmFormCore,
  PORTABLE_COMPILE_REQUEST_API_VERSION,
  sha256JavaScript,
} from '../src/core';
import { compileForm as compileFormReference } from '../src/core/compiler-reference';
import schemaConformanceJson from './conformance/compiler-schema-profile-v1.json';
import { wireDiagnostics } from './portable-fixtures';

interface SchemaCase {
  name: string;
  schemaInputJson: string;
  ok: boolean;
  normalizedDocumentSha256?: string;
  digest?: string;
  formPlanSha256?: string;
  diagnostics: FormDiagnostic[];
}

const fixture = schemaConformanceJson as {
  apiVersion: string;
  generator: string;
  cases: SchemaCase[];
};
const binary = readFileSync(resolve(process.cwd(), 'src/wasm/form-core.wasm'));
const core = createWasmFormCore(binary);

function schemaDocument(testCase: SchemaCase): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: `Schema ${testCase.name}`, locale: 'en-US' },
    schema: JSON.parse(testCase.schemaInputJson) as JsonSchema,
    ui: { root: 'root', nodes: [{ id: 'root', kind: 'root', children: [] }] },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

describe('portable compiler Schema Profile 1', () => {
  it('matches every supported keyword family and rejected shape', () => {
    expect(fixture.apiVersion).toBe('a3s.dev/form-compiler-schema-profile-conformance/v1');
    expect(fixture.generator).toBe('root-only-form-v1');
    expect(core).toBeDefined();
    for (const testCase of fixture.cases) {
      const document = schemaDocument(testCase);
      const reference = compileFormReference(document);
      expect(reference.ok, testCase.name).toBe(testCase.ok);
      expect(wireDiagnostics(reference.diagnostics), testCase.name).toEqual(testCase.diagnostics);
      const response = core?.compile({
        apiVersion: PORTABLE_COMPILE_REQUEST_API_VERSION,
        document,
      });
      expect(response?.ok, testCase.name).toBe(testCase.ok);
      expect(response?.diagnostics, testCase.name).toEqual(testCase.diagnostics);
      if (!testCase.ok) continue;
      expect(reference.document?.digest, testCase.name).toBe(testCase.digest);
      expect(sha256JavaScript(canonicalize(reference.document as never)), testCase.name).toBe(
        testCase.normalizedDocumentSha256,
      );
      expect(sha256JavaScript(canonicalize(reference.plan as never)), testCase.name).toBe(
        testCase.formPlanSha256,
      );
      expect(response?.digest, testCase.name).toBe(testCase.digest);
      expect(sha256JavaScript(response?.normalizedDocumentJson ?? ''), testCase.name).toBe(
        testCase.normalizedDocumentSha256,
      );
      expect(sha256JavaScript(canonicalize(response?.formPlan as never)), testCase.name).toBe(
        testCase.formPlanSha256,
      );
    }
  });
});
