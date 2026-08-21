import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo, useState } from 'react';
import {
  assertCompiled,
  compileForm,
  evaluateComputedRules,
  evaluateFormValue,
  type FormDocument,
  type FormExpression,
  type FormHostAdapter,
  fieldState,
  getAtPath,
  IncrementalComputedRuleEvaluator,
  type JsonObject,
} from '../src/core';
import { FormRenderer } from '../src/react';

function field(path: string): FormExpression {
  return { op: 'field', path };
}

function literal(value: unknown): FormExpression {
  return { op: 'literal', value: value as never };
}

function binary(
  op: 'add' | 'multiply' | 'lte' | 'gt',
  left: FormExpression,
  right: FormExpression,
): FormExpression {
  return { op, left, right } as FormExpression;
}

function createRowScopedDocument(): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: 'Order lines', locale: 'en-US' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        globalLimit: { type: 'number', minimum: 0 },
        note: { type: 'string' },
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              taxRate: { type: 'number', minimum: 0 },
              lines: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    quantity: { type: 'number', minimum: 0 },
                    unitPrice: { type: 'number', minimum: 0 },
                    subtotal: { type: 'number' },
                    total: { type: 'number' },
                    reviewNote: { type: 'string' },
                  },
                  required: ['quantity', 'unitPrice', 'subtotal', 'total'],
                  additionalProperties: false,
                },
              },
            },
            required: ['taxRate', 'lines'],
            additionalProperties: false,
          },
        },
      },
      required: ['globalLimit', 'orders'],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['global-limit', 'orders'] },
        {
          id: 'global-limit',
          kind: 'field',
          label: 'Global limit',
          schemaPath: '/properties/globalLimit',
          widget: 'number',
        },
        {
          id: 'orders',
          kind: 'repeater',
          label: 'Orders',
          schemaPath: '/properties/orders',
          children: ['order-tax-rate', 'order-lines'],
        },
        {
          id: 'order-tax-rate',
          kind: 'field',
          label: 'Tax rate',
          schemaPath: '/properties/orders/items/properties/taxRate',
          widget: 'number',
        },
        {
          id: 'order-lines',
          kind: 'repeater',
          label: 'Lines',
          schemaPath: '/properties/orders/items/properties/lines',
          children: [
            'line-quantity',
            'line-unit-price',
            'line-subtotal',
            'line-total',
            'line-review-note',
          ],
        },
        {
          id: 'line-quantity',
          kind: 'field',
          label: 'Quantity',
          schemaPath: '/properties/orders/items/properties/lines/items/properties/quantity',
          widget: 'number',
          width: 3,
        },
        {
          id: 'line-unit-price',
          kind: 'field',
          label: 'Unit price',
          schemaPath: '/properties/orders/items/properties/lines/items/properties/unitPrice',
          widget: 'number',
          width: 3,
        },
        {
          id: 'line-subtotal',
          kind: 'field',
          label: 'Subtotal',
          schemaPath: '/properties/orders/items/properties/lines/items/properties/subtotal',
          widget: 'number',
          width: 3,
        },
        {
          id: 'line-total',
          kind: 'field',
          label: 'Total',
          schemaPath: '/properties/orders/items/properties/lines/items/properties/total',
          widget: 'number',
          width: 3,
        },
        {
          id: 'line-review-note',
          kind: 'field',
          label: 'Review note',
          schemaPath: '/properties/orders/items/properties/lines/items/properties/reviewNote',
          widget: 'text',
        },
      ],
    },
    rules: [
      {
        id: 'derive-line-subtotal',
        target: 'line-subtotal',
        kind: 'computed',
        scope: 'row',
        expression: binary(
          'multiply',
          field('orders.*.lines.*.quantity'),
          field('orders.*.lines.*.unitPrice'),
        ),
      },
      {
        id: 'derive-line-total',
        target: 'line-total',
        kind: 'computed',
        scope: 'row',
        expression: binary(
          'add',
          field('orders.*.lines.*.subtotal'),
          binary('multiply', field('orders.*.lines.*.subtotal'), field('orders.*.taxRate')),
        ),
      },
      {
        id: 'limit-line-total',
        target: 'line-total',
        kind: 'validate',
        scope: 'row',
        expression: binary('lte', field('orders.*.lines.*.total'), field('globalLimit')),
        message: 'Line total exceeds the configured limit.',
      },
      {
        id: 'show-review-note',
        target: 'line-review-note',
        kind: 'visible',
        scope: 'row',
        expression: binary('gt', field('orders.*.lines.*.total'), literal(100)),
      },
      {
        id: 'enable-review-note',
        target: 'line-review-note',
        kind: 'enabled',
        scope: 'row',
        expression: binary('gt', field('orders.*.lines.*.quantity'), literal(1)),
      },
    ],
    dataSources: [],
    actions: [{ id: 'submit', registryKey: 'test.submit', label: 'Submit', tone: 'primary' }],
  };
}

function createRowDataSourceDocument(): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: 'Row model selectors', locale: 'en-US' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              provider: { type: 'string' },
              model: { type: 'string' },
            },
            required: ['provider'],
            additionalProperties: false,
          },
        },
      },
      required: ['rows'],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['rows'] },
        {
          id: 'rows',
          kind: 'repeater',
          label: 'Model rows',
          schemaPath: '/properties/rows',
          children: ['row-provider', 'row-model'],
        },
        {
          id: 'row-provider',
          kind: 'field',
          label: 'Provider',
          schemaPath: '/properties/rows/items/properties/provider',
          widget: 'select',
          options: [
            { label: 'OpenAI', value: 'openai' },
            { label: 'Anthropic', value: 'anthropic' },
          ],
          width: 6,
        },
        {
          id: 'row-model',
          kind: 'field',
          label: 'Model',
          schemaPath: '/properties/rows/items/properties/model',
          widget: 'select',
          dataSource: 'models',
          width: 6,
        },
      ],
    },
    rules: [],
    dataSources: [
      {
        id: 'models',
        registryKey: 'workflow.models',
        dependencies: ['rows.*.provider'],
      },
    ],
    actions: [],
  };
}

const sourceValue: JsonObject = {
  globalLimit: 200,
  note: 'unrelated',
  orders: [
    {
      taxRate: 0.1,
      lines: [
        { quantity: 2, unitPrice: 50 },
        { quantity: 1, unitPrice: 200 },
      ],
    },
    { taxRate: 0.2, lines: [{ quantity: 3, unitPrice: 10 }] },
  ],
};

describe('row-scoped rules', () => {
  it('compiles nested row scopes, concrete subscriptions, and stable dependency order', () => {
    const plan = assertCompiled(createRowScopedDocument());

    expect(plan.dependencyOrder).toEqual(['line-subtotal', 'line-total']);
    expect(plan.ruleDependencies['derive-line-total']).toEqual([
      'orders.*.lines.*.subtotal',
      'orders.*.taxRate',
    ]);
    expect(plan.nodeSubscriptions['line-total']).toEqual([
      'globalLimit',
      'orders.*.lines.*.subtotal',
      'orders.*.lines.*.total',
      'orders.*.taxRate',
    ]);
  });

  it('evaluates nested rows independently and reports concrete validation paths', () => {
    const plan = assertCompiled(createRowScopedDocument());
    const result = evaluateFormValue(plan, sourceValue, { includeValues: true });

    expect(sourceValue.orders).toEqual([
      {
        taxRate: 0.1,
        lines: [
          { quantity: 2, unitPrice: 50 },
          { quantity: 1, unitPrice: 200 },
        ],
      },
      { taxRate: 0.2, lines: [{ quantity: 3, unitPrice: 10 }] },
    ]);
    expect(result.value.orders).toEqual([
      {
        taxRate: 0.1,
        lines: [
          { quantity: 2, unitPrice: 50, subtotal: 100, total: 110 },
          { quantity: 1, unitPrice: 200, subtotal: 200, total: 220 },
        ],
      },
      { taxRate: 0.2, lines: [{ quantity: 3, unitPrice: 10, subtotal: 30, total: 36 }] },
    ]);
    expect(result.errors).toContainEqual({
      path: 'orders.0.lines.1.total',
      code: 'rule.limit-line-total',
      message: 'Line total exceeds the configured limit.',
    });
    expect(result.trace.map((entry) => [entry.ruleId, entry.path, entry.status])).toEqual([
      ['derive-line-subtotal', 'orders.0.lines.0.subtotal', 'set'],
      ['derive-line-subtotal', 'orders.0.lines.1.subtotal', 'set'],
      ['derive-line-subtotal', 'orders.1.lines.0.subtotal', 'set'],
      ['derive-line-total', 'orders.0.lines.0.total', 'set'],
      ['derive-line-total', 'orders.0.lines.1.total', 'set'],
      ['derive-line-total', 'orders.1.lines.0.total', 'set'],
    ]);
    expect(result.trace[3].dependencies).toEqual(['orders.0.lines.0.subtotal', 'orders.0.taxRate']);
  });

  it('isolates failures and incremental caches to one concrete row', () => {
    const plan = assertCompiled(createRowScopedDocument());
    const broken = structuredClone(sourceValue);
    const orders = broken.orders as JsonObject[];
    const firstLines = orders[0].lines as JsonObject[];
    firstLines[0].quantity = 'invalid';
    const failed = evaluateComputedRules(plan, broken);

    expect(getAtPath(failed.value, 'orders.0.lines.0.subtotal')).toBeUndefined();
    expect(getAtPath(failed.value, 'orders.0.lines.0.total')).toBeUndefined();
    expect(getAtPath(failed.value, 'orders.0.lines.1.total')).toBe(220);
    expect(getAtPath(failed.value, 'orders.1.lines.0.total')).toBe(36);
    expect(failed.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'orders.0.lines.0.subtotal',
          code: 'rule.derive-line-subtotal.evaluation',
        }),
        expect.objectContaining({
          path: 'orders.0.lines.0.total',
          code: 'rule.derive-line-total.dependency',
        }),
      ]),
    );

    const evaluator = new IncrementalComputedRuleEvaluator();
    const first = evaluator.evaluate(plan, sourceValue);
    expect(first.trace.every((entry) => entry.status === 'set')).toBe(true);
    const unrelated = evaluator.evaluate(plan, { ...first.value, note: 'changed' });
    expect(unrelated.evaluatedRuleIds).toEqual([]);
    expect(unrelated.reusedRuleIds).toEqual(['derive-line-subtotal', 'derive-line-total']);

    const changed = structuredClone(unrelated.value);
    const changedOrders = changed.orders as JsonObject[];
    const changedLines = changedOrders[1].lines as JsonObject[];
    changedLines[0].quantity = 4;
    const incremental = evaluator.evaluate(plan, changed);
    expect(
      incremental.trace.find((entry) => entry.path === 'orders.1.lines.0.subtotal')?.status,
    ).toBe('set');
    expect(
      incremental.trace.find((entry) => entry.path === 'orders.0.lines.0.subtotal')?.status,
    ).toBe('unchanged');
    expect(getAtPath(incremental.value, 'orders.1.lines.0.total')).toBe(48);

    const shortened = structuredClone(incremental.value);
    (shortened.orders as JsonObject[]).splice(1, 1);
    evaluator.evaluate(plan, shortened);
    const restored = structuredClone(shortened);
    (restored.orders as JsonObject[]).push({
      taxRate: 0.2,
      lines: [{ quantity: 4, unitPrice: 10 }],
    });
    expect(evaluator.evaluate(plan, restored).evaluatedRuleIds).toEqual([
      'derive-line-subtotal',
      'derive-line-total',
    ]);
  });

  it('evaluates visibility and enablement in the concrete row and keeps computed controls read-only', () => {
    const plan = assertCompiled(createRowScopedDocument());
    const value = evaluateComputedRules(plan, sourceValue).value;

    expect(fieldState(plan, 'line-review-note', value, [0, 0]).visible).toBe(true);
    expect(fieldState(plan, 'line-review-note', value, [1, 0]).visible).toBe(false);
    expect(fieldState(plan, 'line-review-note', value, [0, 0]).enabled).toBe(true);
    expect(fieldState(plan, 'line-review-note', value, [0, 1]).enabled).toBe(false);
    expect(fieldState(plan, 'line-total', value, [0, 0]).enabled).toBe(false);
  });

  it('renders derived row values and focuses validation on the failing row', async () => {
    function Harness() {
      const document = useMemo(() => createRowScopedDocument(), []);
      const plan = useMemo(() => assertCompiled(document), [document]);
      const [value, setValue] = useState(sourceValue);
      return (
        <>
          <FormRenderer plan={plan} value={value} onChange={setValue} />
          <output data-testid="row-value">{JSON.stringify(value)}</output>
        </>
      );
    }

    render(<Harness />);
    const subtotals = screen.getAllByLabelText('Subtotal') as HTMLInputElement[];
    expect(subtotals).toHaveLength(3);
    expect(subtotals.map((input) => [input.value, input.disabled])).toEqual([
      ['100', true],
      ['200', true],
      ['30', true],
    ]);
    const reviewNotes = screen.getAllByLabelText('Review note') as HTMLInputElement[];
    expect(reviewNotes).toHaveLength(2);
    expect(reviewNotes.map((input) => input.disabled)).toEqual([false, true]);

    fireEvent.change(screen.getAllByLabelText('Quantity')[0], { target: { value: '3' } });
    await waitFor(() =>
      expect(screen.getByTestId('row-value').textContent).toContain('"subtotal":150'),
    );
    expect((screen.getAllByLabelText('Total')[0] as HTMLInputElement).value).toBe('165');

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Line total exceeds the configured limit.')).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getAllByLabelText('Total')[1].closest('[data-a3s-form-path]'),
      ),
    );
  });
});

describe('row-scoped data sources', () => {
  it('binds dependency templates and host request scope independently per row', async () => {
    const requests: Array<Parameters<NonNullable<FormHostAdapter['resolveDataSource']>>[0]> = [];
    const hostAdapter: FormHostAdapter = {
      resolveDataSource: async (request) => {
        requests.push(request);
        const dependency = request.scope?.dependencies[0];
        const provider = dependency ? getAtPath(request.value, dependency.path) : undefined;
        return provider === 'anthropic'
          ? [{ label: 'Claude Sonnet', value: 'claude-sonnet' }]
          : [{ label: 'GPT-5', value: 'gpt-5' }];
      },
    };

    function Harness() {
      const document = useMemo(() => createRowDataSourceDocument(), []);
      const plan = useMemo(() => assertCompiled(document), [document]);
      const [value, setValue] = useState<JsonObject>({
        rows: [
          { provider: 'openai', model: '' },
          { provider: 'anthropic', model: '' },
        ],
      });
      return (
        <FormRenderer plan={plan} value={value} onChange={setValue} hostAdapter={hostAdapter} />
      );
    }

    render(<Harness />);
    expect(await screen.findByRole('option', { name: 'GPT-5' })).toBeTruthy();
    expect(await screen.findByRole('option', { name: 'Claude Sonnet' })).toBeTruthy();
    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.scope)).toEqual([
      {
        nodeId: 'row-model',
        valuePath: 'rows.0.model',
        rowIndices: [0],
        dependencies: [{ template: 'rows.*.provider', path: 'rows.0.provider' }],
      },
      {
        nodeId: 'row-model',
        valuePath: 'rows.1.model',
        rowIndices: [1],
        dependencies: [{ template: 'rows.*.provider', path: 'rows.1.provider' }],
      },
    ]);

    fireEvent.change(screen.getAllByLabelText('Provider')[0], {
      target: { value: 'anthropic' },
    });
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].scope?.valuePath).toBe('rows.0.model');
    expect(requests[2].scope?.dependencies[0].path).toBe('rows.0.provider');

    fireEvent.change(screen.getAllByLabelText('Model')[0], {
      target: { value: 'claude-sonnet' },
    });
    expect(requests).toHaveLength(3);
  });

  it('rejects a row dependency when the source is attached outside that row scope', () => {
    const document = createRowDataSourceDocument();
    const model = document.ui.nodes.find((node) => node.id === 'row-model');
    if (!model) throw new Error('Missing row model node.');
    model.schemaPath = '/properties/rows';
    const result = compileForm(document);

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'data_source.dependency_scope' }),
    );
  });
});
