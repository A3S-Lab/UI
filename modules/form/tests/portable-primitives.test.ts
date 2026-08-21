import type { FormExpression, JsonSchema } from '../src/core';
import {
  analyzeExpression,
  inspectSchemaProfile,
  isValuePathScopeCompatible,
  schemaPointerToValuePathTemplate,
} from '../src/core';
import semanticPrimitivesJson from './conformance/semantic-primitives-v1.json';

interface ExpectedDiagnostic {
  code: string;
  path: string;
}

interface SchemaCase {
  name: string;
  inputJson: string;
  diagnostics: ExpectedDiagnostic[];
}

interface ExpressionCase {
  name: string;
  inputJson: string;
  ok: boolean;
  size?: number;
  fieldPaths?: string[];
}

interface PointerCase {
  name: string;
  pointer: string;
  template: string | null;
}

interface ScopeCase {
  target: string;
  dependency: string;
  compatible: boolean;
}

interface SemanticPrimitivesFixture {
  apiVersion: string;
  schemaCases: SchemaCase[];
  expressionCases: ExpressionCase[];
  pointerCases: PointerCase[];
  scopeCases: ScopeCase[];
}

const fixture = semanticPrimitivesJson as SemanticPrimitivesFixture;

describe('portable semantic primitives', () => {
  it('matches Schema Profile 1 diagnostics', () => {
    expect(fixture.apiVersion).toBe('a3s.dev/form-semantic-primitives-conformance/v1');
    for (const testCase of fixture.schemaCases) {
      const schema = JSON.parse(testCase.inputJson) as JsonSchema;
      const diagnostics = inspectSchemaProfile(schema).map(({ code, path }) => ({ code, path }));
      expect(diagnostics, testCase.name).toEqual(testCase.diagnostics);
    }
  });

  it('matches expression analysis', () => {
    for (const testCase of fixture.expressionCases) {
      const expression = JSON.parse(testCase.inputJson) as FormExpression;
      if (!testCase.ok) {
        expect(() => analyzeExpression(expression), testCase.name).toThrow();
        continue;
      }
      expect(analyzeExpression(expression), testCase.name).toEqual({
        size: testCase.size,
        fieldPaths: testCase.fieldPaths,
      });
    }
  });

  it('matches pointer conversion and row-scope compatibility', () => {
    for (const testCase of fixture.pointerCases) {
      expect(schemaPointerToValuePathTemplate(testCase.pointer), testCase.name).toBe(
        testCase.template ?? undefined,
      );
    }
    for (const testCase of fixture.scopeCases) {
      expect(
        isValuePathScopeCompatible(testCase.target, testCase.dependency),
        `${testCase.target} <- ${testCase.dependency}`,
      ).toBe(testCase.compatible);
    }
  });
});
