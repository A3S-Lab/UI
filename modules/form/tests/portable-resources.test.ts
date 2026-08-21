import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FormDiagnostic, FormDocument } from '../src/core';
import {
  canonicalize,
  createWasmFormCore,
  PORTABLE_COMPILE_REQUEST_API_VERSION,
  sha256JavaScript,
} from '../src/core';
import { compileForm as compileFormReference } from '../src/core/compiler-reference';
import resourceConformanceJson from './conformance/compiler-resources-v1.json';
import { wireDiagnostics } from './portable-fixtures';

interface ResourceCase {
  name: string;
  nodeCount: number;
  maxNodes: number;
  ok: boolean;
  normalizedDocumentSha256?: string;
  digest?: string;
  formPlanSha256?: string;
  diagnostics: FormDiagnostic[];
}

interface ResourceFixture {
  apiVersion: string;
  generator: string;
  cases: ResourceCase[];
}

const fixture = resourceConformanceJson as ResourceFixture;
const binary = readFileSync(resolve(process.cwd(), 'src/wasm/form-core.wasm'));
const core = createWasmFormCore(binary);

function resourceDocument(nodeCount: number): FormDocument {
  const names = Array.from(
    { length: nodeCount - 1 },
    (_, index) => `field${String(index + 1).padStart(4, '0')}`,
  );
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: `Resource corpus ${nodeCount}`, locale: 'en-US' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: Object.fromEntries(names.map((name) => [name, { type: 'string' as const }])),
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: names },
        ...names.map((name) => ({
          id: name,
          kind: 'field' as const,
          schemaPath: `/properties/${name}`,
          widget: 'text',
        })),
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

describe('portable compiler resource boundaries', () => {
  it('matches 100, 500, and 1,000-node golden identities and failures', () => {
    expect(fixture.apiVersion).toBe('a3s.dev/form-compiler-resource-conformance/v1');
    expect(fixture.generator).toBe('flat-string-fields-v1');
    expect(core).toBeDefined();
    for (const testCase of fixture.cases) {
      const document = resourceDocument(testCase.nodeCount);
      const options = { limits: { maxNodes: testCase.maxNodes } };
      const reference = compileFormReference(document, options);
      expect(reference.ok, testCase.name).toBe(testCase.ok);
      expect(wireDiagnostics(reference.diagnostics), testCase.name).toEqual(testCase.diagnostics);

      const response = core?.compile({
        apiVersion: PORTABLE_COMPILE_REQUEST_API_VERSION,
        document,
        options,
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
