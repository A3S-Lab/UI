import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FormDiagnostic, FormDocument, UiNode } from '../src/core';
import {
  canonicalize,
  createWasmFormCore,
  PORTABLE_COMPILE_REQUEST_API_VERSION,
  sha256JavaScript,
} from '../src/core';
import { compileForm as compileFormReference } from '../src/core/compiler-reference';
import depthConformanceJson from './conformance/compiler-depth-v1.json';
import { wireDiagnostics } from './portable-fixtures';

interface DepthCase {
  name: string;
  depth: number;
  maxDepth: number;
  ok: boolean;
  normalizedDocumentSha256?: string;
  digest?: string;
  formPlanSha256?: string;
  diagnostics: FormDiagnostic[];
}

const fixture = depthConformanceJson as {
  apiVersion: string;
  generator: string;
  cases: DepthCase[];
};
const binary = readFileSync(resolve(process.cwd(), 'src/wasm/form-core.wasm'));
const core = createWasmFormCore(binary);

function depthDocument(depth: number): FormDocument {
  const ids = Array.from(
    { length: depth },
    (_, index) => `level${String(index + 1).padStart(4, '0')}`,
  );
  const nodes: UiNode[] = [{ id: 'root', kind: 'root', children: ids.length > 0 ? [ids[0]] : [] }];
  for (const [index, id] of ids.entries()) {
    nodes.push(
      index === ids.length - 1
        ? { id, kind: 'content', content: 'End' }
        : { id, kind: 'group', children: [ids[index + 1]] },
    );
  }
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: `Depth corpus ${depth}`, locale: 'en-US' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    ui: { root: 'root', nodes },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

describe('portable compiler layout-depth boundary', () => {
  it('matches the depth-32 golden identity and depth-33 failure', () => {
    expect(fixture.apiVersion).toBe('a3s.dev/form-compiler-depth-conformance/v1');
    expect(fixture.generator).toBe('linear-layout-v1');
    expect(core).toBeDefined();
    for (const testCase of fixture.cases) {
      const document = depthDocument(testCase.depth);
      const options = { limits: { maxDepth: testCase.maxDepth } };
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
