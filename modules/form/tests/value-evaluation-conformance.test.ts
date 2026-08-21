import {
  canonicalize,
  embeddedWasmFormCore,
  evaluateFormValueWithCore,
  type FormValueEvaluationOptions,
  type JsonObject,
  type JsonValue,
  type PortableEvaluateRequest,
  type PortableEvaluateResponse,
  type WasmFormCore,
} from '../src/core';
import { evaluateFormValueReference } from '../src/core/state';
import fixtureJson from './conformance/value-evaluation-v1.json';

interface EvaluationCase {
  name: string;
  request: PortableEvaluateRequest;
  response: {
    apiVersion: string;
    compilerRevision: string;
    ok: boolean;
    value?: JsonObject;
    trace: JsonValue[];
    errors: JsonValue[];
  };
}

const cases = fixtureJson.cases as unknown as EvaluationCase[];

function evaluatorCore(response: PortableEvaluateResponse | undefined): WasmFormCore {
  return {
    version: '1.0.0',
    compilerRevision: 'a3s-form-core@0.1.0',
    inputCapacity: 1024,
    outputCapacity: 1024,
    compileBytes: () => undefined,
    compile: () => undefined,
    evaluateBytes: () => undefined,
    evaluate: () => response,
  };
}

describe('portable submitted-value evaluation conformance', () => {
  it('matches native/WASM response bytes, the TypeScript reference, and the public adapter', () => {
    const core = embeddedWasmFormCore();
    expect(core).toBeDefined();
    for (const testCase of cases) {
      const requestBytes = new TextEncoder().encode(canonicalize(testCase.request as never));
      const nativeBytes = core?.evaluateBytes(requestBytes);
      expect(nativeBytes, testCase.name).toBeDefined();
      expect(new TextDecoder().decode(nativeBytes), testCase.name).toBe(
        canonicalize(testCase.response as never),
      );

      const reference = evaluateFormValueReference(
        testCase.request.formPlan,
        testCase.request.value,
        testCase.request.options as FormValueEvaluationOptions,
      );
      expect(
        canonicalize({
          apiVersion: 'a3s.dev/form-core/evaluate-response/v1alpha1',
          compilerRevision: core?.compilerRevision ?? '',
          ok: reference.errors.length === 0,
          ...reference,
        } as never),
        testCase.name,
      ).toBe(canonicalize(testCase.response as never));

      const publicResult = evaluateFormValueWithCore(
        core,
        testCase.request.formPlan,
        testCase.request.value,
        testCase.request.options as FormValueEvaluationOptions,
      );
      expect(canonicalize(publicResult as never), testCase.name).toBe(
        canonicalize({
          value: testCase.response.value,
          trace: testCase.response.trace,
          errors: testCase.response.errors,
        } as never),
      );
    }
  });

  it('fails closed when the native evaluator or a portable JSON graph is unavailable', () => {
    const first = cases[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(
      evaluateFormValueWithCore(undefined, first.request.formPlan, first.request.value).errors[0]
        ?.code,
    ).toBe('evaluator.unavailable');

    const cyclic = {} as JsonObject;
    (cyclic as Record<string, unknown>).self = cyclic;
    expect(
      evaluateFormValueWithCore(embeddedWasmFormCore(), first.request.formPlan, cyclic).errors[0]
        ?.code,
    ).toBe('evaluator.json_value');

    const invalidPlan = structuredClone(first.request.formPlan);
    (invalidPlan as unknown as Record<string, unknown>).cycle = invalidPlan;
    expect(
      evaluateFormValueWithCore(embeddedWasmFormCore(), invalidPlan, first.request.value).errors[0]
        ?.path,
    ).toBe('/formPlan');

    const invalidOptions: Record<string, unknown> = {};
    invalidOptions.self = invalidOptions;
    expect(
      evaluateFormValueWithCore(
        embeddedWasmFormCore(),
        first.request.formPlan,
        first.request.value,
        invalidOptions as FormValueEvaluationOptions,
      ).errors[0]?.path,
    ).toBe('/options');

    let accessorCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, 'value', {
      enumerable: true,
      get() {
        accessorCalls += 1;
        return 'must not run';
      },
    });
    expect(
      evaluateFormValueWithCore(embeddedWasmFormCore(), first.request.formPlan, accessor).errors[0]
        ?.code,
    ).toBe('evaluator.json_value');
    expect(accessorCalls).toBe(0);
  });

  it('preserves source ordering and fails closed on incomplete native responses', () => {
    const first = cases[0];
    expect(first).toBeDefined();
    if (!first) return;

    const ordered = evaluateFormValueWithCore(
      evaluatorCore({
        apiVersion: 'a3s.dev/form-core/evaluate-response/v1alpha1',
        compilerRevision: 'a3s-form-core@0.1.0',
        ok: true,
        value: JSON.parse(
          '{"addedWithoutTrace":{"nested":true},"rows":[{"computed":2,"source":1}],"original":true,"addedWithTrace":3,"toString":"safe","__proto__":"safe"}',
        ) as JsonObject,
        trace: [
          {
            ruleId: 'add-field',
            target: 'addedWithTrace',
            path: 'addedWithTrace',
            dependencies: [],
            status: 'set',
          },
          {
            ruleId: 'add-row-field',
            target: 'computed',
            path: 'rows.0.computed',
            dependencies: [],
            status: 'set',
          },
        ],
        errors: [],
      }),
      first.request.formPlan,
      { original: true, rows: [{ source: 1 }] },
    );
    expect(Object.keys(ordered.value)).toEqual([
      'original',
      'rows',
      'addedWithTrace',
      'addedWithoutTrace',
      'toString',
      '__proto__',
    ]);
    expect(Object.hasOwn(ordered.value, 'toString')).toBe(true);
    expect(Object.hasOwn(ordered.value, '__proto__')).toBe(true);
    expect(Object.keys((ordered.value.rows as JsonObject[])[0] ?? {})).toEqual([
      'source',
      'computed',
    ]);

    const nativeFailure = evaluateFormValueWithCore(
      evaluatorCore({
        apiVersion: 'a3s.dev/form-core/evaluate-response/v1alpha1',
        compilerRevision: 'a3s-form-core@0.1.0',
        ok: false,
        trace: [],
        errors: [{ path: '', code: 'protocol.invalid', message: 'invalid request' }],
      }),
      first.request.formPlan,
      first.request.value,
    );
    expect(nativeFailure.errors[0]?.code).toBe('protocol.invalid');
    expect(nativeFailure.value).toEqual(first.request.value);
    expect(nativeFailure.value).not.toBe(first.request.value);

    expect(
      evaluateFormValueWithCore(
        evaluatorCore({
          apiVersion: 'a3s.dev/form-core/evaluate-response/v1alpha1',
          compilerRevision: 'a3s-form-core@0.1.0',
          ok: true,
          trace: [],
          errors: [],
        }),
        first.request.formPlan,
        first.request.value,
      ).errors[0]?.code,
    ).toBe('evaluator.response');

    expect(
      evaluateFormValueWithCore(
        evaluatorCore({
          apiVersion: 'a3s.dev/form-core/evaluate-response/v1alpha1',
          compilerRevision: 'a3s-form-core@0.1.0',
          ok: false,
        } as unknown as PortableEvaluateResponse),
        first.request.formPlan,
        first.request.value,
      ).errors[0]?.code,
    ).toBe('evaluator.response');
  });
});
