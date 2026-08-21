import {
  assertCompiled,
  compileForm,
  createFormRef,
  evaluateComputedRules,
  evaluateFormValue,
  type FormDocument,
  type FormExpression,
  fieldState,
  IncrementalComputedRuleEvaluator,
  type JsonObject,
  validateFormValue,
} from '../src/core';
import {
  createWorkflowNodeConfiguration,
  validateWorkflowNodeConfiguration,
} from '../src/workflow';
import { createDocument } from './fixtures';

function field(path: string): FormExpression {
  return { op: 'field', path };
}

function literal(value: unknown): FormExpression {
  return { op: 'literal', value: value as never };
}

function operation(
  op: 'add' | 'subtract' | 'multiply' | 'divide',
  left: FormExpression,
  right: FormExpression,
): FormExpression {
  return { op, left, right } as FormExpression;
}

function computedDocument(): FormDocument {
  const document = createDocument();
  document.schema = {
    type: 'object',
    properties: {
      quantity: { type: 'number', minimum: 0 },
      unitPrice: { type: 'number', minimum: 0 },
      taxRate: { type: 'number', minimum: 0, maximum: 1 },
      subtotal: { type: 'number' },
      tax: { type: 'number' },
      total: { type: 'number' },
      summary: { type: 'string' },
    },
    required: ['quantity', 'unitPrice', 'total'],
    additionalProperties: false,
  };
  document.ui.nodes = [
    {
      id: 'root',
      kind: 'root',
      children: ['quantity', 'unit-price', 'tax-rate', 'subtotal', 'tax', 'total', 'summary'],
    },
    { id: 'quantity', kind: 'field', schemaPath: '/properties/quantity', widget: 'number' },
    { id: 'unit-price', kind: 'field', schemaPath: '/properties/unitPrice', widget: 'number' },
    { id: 'tax-rate', kind: 'field', schemaPath: '/properties/taxRate', widget: 'number' },
    { id: 'subtotal', kind: 'field', schemaPath: '/properties/subtotal', widget: 'number' },
    { id: 'tax', kind: 'field', schemaPath: '/properties/tax', widget: 'number' },
    { id: 'total', kind: 'field', schemaPath: '/properties/total', widget: 'number' },
    { id: 'summary', kind: 'field', schemaPath: '/properties/summary', widget: 'text' },
  ];
  document.dataSources = [];
  document.actions = [];
  document.rules = [
    {
      id: 'derive-summary',
      target: 'summary',
      kind: 'computed',
      expression: {
        op: 'concat',
        values: [literal('Total: '), field('total')],
      } as FormExpression,
    },
    {
      id: 'derive-total',
      target: 'total',
      kind: 'computed',
      expression: operation('add', field('subtotal'), field('tax')),
    },
    {
      id: 'derive-tax',
      target: 'tax',
      kind: 'computed',
      expression: operation('multiply', field('subtotal'), field('taxRate')),
    },
    {
      id: 'derive-subtotal',
      target: 'subtotal',
      kind: 'computed',
      expression: operation('multiply', field('quantity'), field('unitPrice')),
    },
  ];
  return document;
}

function codes(document: FormDocument): string[] {
  return compileForm(document).diagnostics.map((item) => item.code);
}

describe('computed form rules', () => {
  it('compiles a stable topological order independent of source rule order', () => {
    const plan = assertCompiled(computedDocument());
    expect(plan.dependencyOrder).toEqual(['subtotal', 'tax', 'total', 'summary']);
    expect(plan.expressionOperationLimit).toBeGreaterThan(0);
  });

  it('evaluates chains immutably and emits an inspectable deterministic trace', () => {
    const plan = assertCompiled(computedDocument());
    const source: JsonObject = { quantity: 2, unitPrice: 50, taxRate: 0.1 };
    const result = evaluateComputedRules(plan, source, { includeValues: true });

    expect(source).toEqual({ quantity: 2, unitPrice: 50, taxRate: 0.1 });
    expect(result.value).toEqual({
      quantity: 2,
      unitPrice: 50,
      taxRate: 0.1,
      subtotal: 100,
      tax: 10,
      total: 110,
      summary: 'Total: 110',
    });
    expect(result.errors).toEqual([]);
    expect(result.trace.map((entry) => [entry.ruleId, entry.status])).toEqual([
      ['derive-subtotal', 'set'],
      ['derive-tax', 'set'],
      ['derive-total', 'set'],
      ['derive-summary', 'set'],
    ]);
    expect(result.trace[2]).toEqual(
      expect.objectContaining({
        target: 'total',
        path: 'total',
        dependencies: ['subtotal', 'tax'],
        nextValue: 110,
      }),
    );

    const repeated = evaluateComputedRules(plan, result.value, { includeValues: true });
    expect(repeated.trace.every((entry) => entry.status === 'unchanged')).toBe(true);
  });

  it('reuses computed outputs until a declared dependency changes', () => {
    const document = computedDocument();
    if (!document.schema.properties) throw new Error('Missing computed schema properties.');
    document.schema.properties.note = { type: 'string' };
    const plan = assertCompiled(document);
    const evaluator = new IncrementalComputedRuleEvaluator();
    const base: JsonObject = { quantity: 2, unitPrice: 50, taxRate: 0.1, note: 'first' };

    const first = evaluator.evaluate(plan, base);
    expect(first.evaluatedRuleIds).toEqual([
      'derive-subtotal',
      'derive-tax',
      'derive-total',
      'derive-summary',
    ]);
    expect(first.reusedRuleIds).toEqual([]);

    const unrelated = evaluator.evaluate(plan, { ...first.value, note: 'second' });
    expect(unrelated.evaluatedRuleIds).toEqual([]);
    expect(unrelated.reusedRuleIds).toEqual(first.evaluatedRuleIds);
    expect(unrelated.value.total).toBe(110);

    const changed = evaluator.evaluate(plan, { ...unrelated.value, quantity: 3 });
    expect(changed.evaluatedRuleIds).toEqual(first.evaluatedRuleIds);
    expect(changed.reusedRuleIds).toEqual([]);
    expect(changed.value).toEqual(expect.objectContaining({ subtotal: 150, tax: 15, total: 165 }));

    evaluator.clear();
    expect(evaluator.evaluate(plan, changed.value).evaluatedRuleIds).toEqual(
      first.evaluatedRuleIds,
    );
  });

  it('removes stale outputs and skips dependent rules after an evaluation failure', () => {
    const plan = assertCompiled(computedDocument());
    const invalidValue = {
      quantity: 'invalid',
      unitPrice: 50,
      taxRate: 0.1,
      subtotal: 999,
      tax: 99,
      total: 1098,
      summary: 'stale',
    } as never;
    const result = evaluateComputedRules(plan, invalidValue);

    expect(result.value).toEqual({ quantity: 'invalid', unitPrice: 50, taxRate: 0.1 });
    expect(result.trace.map((entry) => entry.status)).toEqual([
      'error',
      'skipped',
      'skipped',
      'skipped',
    ]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'subtotal', code: 'rule.derive-subtotal.evaluation' }),
        expect.objectContaining({ path: 'tax', code: 'rule.derive-tax.dependency' }),
      ]),
    );

    const evaluator = new IncrementalComputedRuleEvaluator();
    evaluator.evaluate(plan, { quantity: 2, unitPrice: 50, taxRate: 0.1 });
    const incremental = evaluator.evaluate(plan, invalidValue, { includeValues: true });
    expect(incremental.value).toEqual({ quantity: 'invalid', unitPrice: 50, taxRate: 0.1 });
    expect(incremental.trace.map((entry) => entry.status)).toEqual([
      'error',
      'skipped',
      'skipped',
      'skipped',
    ]);
    expect(incremental.evaluatedRuleIds).toEqual(['derive-subtotal']);
    expect(incremental.reusedRuleIds).toEqual([]);
    expect(incremental.trace[0]).toEqual(
      expect.objectContaining({ previousValue: 999, error: expect.any(String) }),
    );
  });

  it('removes undefined results and keeps an already absent result unchanged', () => {
    const document = computedDocument();
    if (!document.schema.properties) throw new Error('Missing computed schema properties.');
    document.schema.properties.missing = { type: 'number' };
    document.rules = [
      {
        id: 'derive-summary',
        target: 'summary',
        kind: 'computed',
        expression: field('missing'),
      },
    ];
    const plan = assertCompiled(document);
    const removed = evaluateComputedRules(
      plan,
      { quantity: 1, unitPrice: 1, total: 1, summary: 'stale' },
      { includeValues: true },
    );
    expect(removed.value.summary).toBeUndefined();
    expect(removed.trace[0]).toEqual(
      expect.objectContaining({ status: 'removed', previousValue: 'stale' }),
    );
    expect(removed.trace[0]).not.toHaveProperty('nextValue');

    const unchanged = evaluateComputedRules(plan, removed.value, { includeValues: true });
    expect(unchanged.trace[0].status).toBe('unchanged');
    expect(unchanged.trace[0]).not.toHaveProperty('previousValue');
    expect(unchanged.trace[0]).not.toHaveProperty('nextValue');

    const evaluator = new IncrementalComputedRuleEvaluator();
    const incrementalRemoved = evaluator.evaluate(plan, {
      quantity: 1,
      unitPrice: 1,
      total: 1,
      summary: 'stale',
    });
    const incrementalReused = evaluator.evaluate(plan, incrementalRemoved.value);
    expect(incrementalReused.reusedRuleIds).toEqual(['derive-summary']);
    expect(incrementalReused.value.summary).toBeUndefined();
  });

  it('fails closed when validation and field-state expressions cannot run', () => {
    const validation = computedDocument();
    validation.rules = [
      {
        id: 'broken-validation',
        target: 'total',
        kind: 'validate',
        expression: operation('divide', literal(1), literal(0)),
      },
    ];
    expect(
      validateFormValue(assertCompiled(validation), {
        quantity: 1,
        unitPrice: 1,
        total: 1,
      }),
    ).toContainEqual(
      expect.objectContaining({ path: 'total', code: 'rule.broken-validation.evaluation' }),
    );

    const state = computedDocument();
    state.rules = [
      {
        id: 'broken-visible',
        target: 'quantity',
        kind: 'visible',
        expression: operation('divide', literal(1), literal(0)),
      },
      {
        id: 'broken-enabled',
        target: 'quantity',
        kind: 'enabled',
        expression: operation('divide', literal(1), literal(0)),
      },
    ];
    expect(fieldState(assertCompiled(state), 'quantity', {})).toEqual({
      visible: false,
      enabled: false,
    });
  });

  it('ignores stale dependency-order entries in a manually transported plan', () => {
    const plan = structuredClone(assertCompiled(computedDocument()));
    const legacyPlan = structuredClone(plan);
    delete (legacyPlan as Partial<typeof legacyPlan>).ruleDependencies;
    expect(
      new IncrementalComputedRuleEvaluator().evaluate(legacyPlan, {
        quantity: 2,
        unitPrice: 50,
        taxRate: 0.1,
      }).value.total,
    ).toBe(110);
    plan.dependencyOrder.unshift('missing-target');
    expect(() => evaluateComputedRules(plan, { quantity: 1, unitPrice: 1 })).not.toThrow();
    const evaluator = new IncrementalComputedRuleEvaluator();
    expect(() => evaluator.evaluate(plan, { quantity: 1, unitPrice: 1 })).not.toThrow();

    delete plan.nodeById.subtotal.valuePath;
    expect(() => evaluateComputedRules(plan, { quantity: 1, unitPrice: 1 })).not.toThrow();
    evaluator.clear();
    expect(() => evaluator.evaluate(plan, { quantity: 1, unitPrice: 1 })).not.toThrow();
  });

  it('uses computed values for validation and digest-pinned workflow commits', () => {
    const compiled = compileForm(computedDocument());
    if (!compiled.document || !compiled.plan) throw new Error('Expected a compiled document.');
    const value = { quantity: 2, unitPrice: 50, taxRate: 0.1 };
    const evaluation = evaluateFormValue(compiled.plan, value);
    expect(evaluation.errors).toEqual([]);
    expect(evaluation.value.total).toBe(110);
    expect(validateFormValue(compiled.plan, value)).toEqual([]);

    const form = createFormRef(
      compiled.document,
      'a3s://forms/workflow/order-node',
      'configuration',
    );
    const descriptor = createWorkflowNodeConfiguration({
      nodeType: 'order',
      nodeId: 'order-1',
      form,
      value,
    });
    const validation = validateWorkflowNodeConfiguration(compiled.document, descriptor);
    expect(validation).toEqual(
      expect.objectContaining({ ok: true, value: expect.objectContaining({ total: 110 }) }),
    );
  });

  it('keeps computed targets read-only in runtime field state', () => {
    const plan = assertCompiled(computedDocument());
    expect(fieldState(plan, 'total', { quantity: 1, unitPrice: 1 })).toEqual({
      visible: true,
      enabled: false,
    });
  });

  it('rejects duplicate, non-field, self-referential and mutually cyclic computed targets', () => {
    const duplicate = computedDocument();
    duplicate.rules?.push({
      id: 'derive-total-again',
      target: 'total',
      kind: 'computed',
      expression: literal(0),
    });
    expect(codes(duplicate)).toContain('rules.computed_target_duplicate');

    const layoutTarget = computedDocument();
    (layoutTarget.rules as NonNullable<FormDocument['rules']>)[0].target = 'root';
    expect(codes(layoutTarget)).toContain('rules.computed_target');

    const selfCycle = computedDocument();
    selfCycle.rules = [
      {
        id: 'self-total',
        target: 'total',
        kind: 'computed',
        expression: field('total'),
      },
    ];
    expect(codes(selfCycle)).toContain('rules.cycle');

    const mutualCycle = computedDocument();
    mutualCycle.rules = [
      { id: 'subtotal-from-tax', target: 'subtotal', kind: 'computed', expression: field('tax') },
      { id: 'tax-from-subtotal', target: 'tax', kind: 'computed', expression: field('subtotal') },
    ];
    const result = compileForm(mutualCycle);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'rules.cycle',
        message: expect.stringContaining('subtotal'),
      }),
    );
  });

  it('does not report read-only visibility dependencies as computed cycles', () => {
    const document = computedDocument();
    document.rules = [
      { id: 'show-tax', target: 'tax', kind: 'visible', expression: field('total') },
      { id: 'show-total', target: 'total', kind: 'visible', expression: field('tax') },
    ];
    expect(compileForm(document).ok).toBe(true);
  });

  it('rejects unknown rule kinds, malformed expressions and empty identifiers', () => {
    const unknownKind = computedDocument();
    (unknownKind.rules as NonNullable<FormDocument['rules']>)[0].kind = 'effect' as never;
    expect(codes(unknownKind)).toContain('rule.kind');

    const malformedExpression = computedDocument();
    (malformedExpression.rules as NonNullable<FormDocument['rules']>)[0].expression = {
      op: 'multiply',
      left: field('quantity'),
    } as never;
    expect(codes(malformedExpression)).toContain('rule.expression');

    const emptyId = computedDocument();
    (emptyId.rules as NonNullable<FormDocument['rules']>)[0].id = '';
    expect(codes(emptyId)).toContain('rule.definition');

    const unknownField = computedDocument();
    (unknownField.rules as NonNullable<FormDocument['rules']>)[0].expression = field('missing');
    expect(codes(unknownField)).toContain('rule.field_reference');
  });
});
