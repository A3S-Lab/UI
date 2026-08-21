import { performance } from 'node:perf_hooks';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  compileForm,
  evaluateFormValue,
  IncrementalComputedRuleEvaluator,
} from '../../../dist/form/core.js';
import { FormRenderer } from '../../../dist/form/react.js';

const CASES = Object.freeze([
  {
    nodes: 100,
    budgets: { compile: 100, evaluate: 50, incremental: 15, render: 150 },
  },
  {
    nodes: 500,
    budgets: { compile: 300, evaluate: 300, incremental: 50, render: 800 },
  },
  {
    nodes: 1_000,
    budgets: { compile: 700, evaluate: 1_200, incremental: 120, render: 1_800 },
  },
]);

function createBenchmarkDocument(nodeCount) {
  const fieldCount = nodeCount - 1;
  const properties = {};
  const children = [];
  const nodes = [{ id: 'root', kind: 'root', children }];
  const rules = [];
  const value = {};

  for (let index = 0; index < fieldCount; index += 1) {
    const name = `field${index}`;
    properties[name] = { type: 'string' };
    children.push(name);
    nodes.push({
      id: name,
      kind: 'field',
      label: `Field ${index + 1}`,
      schemaPath: `/properties/${name}`,
    });
    if (index % 2 === 0) value[name] = `value-${index}`;
    else {
      rules.push({
        id: `compute-${name}`,
        target: name,
        kind: 'computed',
        expression: { op: 'field', path: `field${index - 1}` },
      });
    }
  }

  return {
    document: {
      kind: 'a3s.form',
      apiVersion: 'a3s.dev/form/v1alpha1',
      revision: 1,
      metadata: { title: `${nodeCount}-node benchmark`, locale: 'en-US' },
      schema: { type: 'object', properties, additionalProperties: false },
      ui: { root: 'root', nodes },
      dataSources: [],
      actions: [],
      rules,
    },
    value,
  };
}

function createVirtualGridBenchmark(rowCount) {
  return {
    document: {
      kind: 'a3s.form',
      apiVersion: 'a3s.dev/form/v1alpha1',
      revision: 1,
      metadata: { title: `${rowCount}-row virtual grid`, locale: 'en-US' },
      schema: {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            maxItems: rowCount,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                status: { type: 'string' },
              },
              required: ['id', 'name', 'status'],
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
            layout: 'data-grid',
            label: 'Rows',
            schemaPath: '/properties/rows',
            itemKey: 'id',
            dataGrid: {
              editMode: 'dialog',
              virtualization: { mode: 'rows', viewportHeight: 480 },
            },
            children: ['name', 'status'],
          },
          {
            id: 'name',
            kind: 'field',
            label: 'Name',
            schemaPath: '/properties/rows/items/properties/name',
          },
          {
            id: 'status',
            kind: 'field',
            label: 'Status',
            schemaPath: '/properties/rows/items/properties/status',
          },
        ],
      },
      rules: [],
      dataSources: [],
      actions: [],
    },
    value: {
      rows: Array.from({ length: rowCount }, (_, index) => ({
        id: `row-${index}`,
        name: `Row ${index}`,
        status: index % 2 === 0 ? 'ready' : 'waiting',
      })),
    },
  };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function measure(rounds, operation) {
  operation();
  const samples = [];
  for (let index = 0; index < rounds; index += 1) {
    const startedAt = performance.now();
    operation(index);
    samples.push(performance.now() - startedAt);
  }
  return median(samples);
}

const results = [];
const failures = [];
for (const benchmark of CASES) {
  const fixture = createBenchmarkDocument(benchmark.nodes);
  let plan;
  const compile = measure(3, () => {
    const result = compileForm(fixture.document);
    if (!result.ok || !result.plan) throw new Error(`Could not compile ${benchmark.nodes} nodes.`);
    plan = result.plan;
  });

  const evaluate = measure(5, () => evaluateFormValue(plan, fixture.value));
  const evaluator = new IncrementalComputedRuleEvaluator();
  let current = evaluator.evaluate(plan, fixture.value).value;
  const incremental = measure(10, (index) => {
    current = evaluator.evaluate(plan, {
      ...current,
      field0: index % 2 === 0 ? 'updated-a' : 'updated-b',
    }).value;
  });
  let markupLength = 0;
  const render = measure(3, () => {
    markupLength = renderToStaticMarkup(
      createElement(FormRenderer, {
        plan,
        value: fixture.value,
        onChange: () => undefined,
      }),
    ).length;
  });

  const metrics = { compile, evaluate, incremental, render };
  results.push({ nodes: benchmark.nodes, markupLength, ...metrics });
  for (const [metric, elapsed] of Object.entries(metrics)) {
    const budget = benchmark.budgets[metric];
    if (elapsed > budget) {
      failures.push(
        `${benchmark.nodes} nodes ${metric}: ${elapsed.toFixed(1)} ms exceeds ${budget} ms`,
      );
    }
  }
}

const virtualGridFixture = createVirtualGridBenchmark(1_000);
const virtualGridCompilation = compileForm(virtualGridFixture.document);
if (!virtualGridCompilation.ok || !virtualGridCompilation.plan) {
  throw new Error('Could not compile the 1,000-row virtual grid benchmark.');
}
let virtualGridMarkup = '';
const virtualGridRender = measure(5, () => {
  virtualGridMarkup = renderToStaticMarkup(
    createElement(FormRenderer, {
      plan: virtualGridCompilation.plan,
      value: virtualGridFixture.value,
      onChange: () => undefined,
    }),
  );
});
const virtualGridRows = (virtualGridMarkup.match(/data-row-key=/g) ?? []).length;
const virtualGridMetrics = {
  renderMs: virtualGridRender,
  markupBytes: virtualGridMarkup.length,
  renderedRows: virtualGridRows,
};
if (virtualGridRender > 100) {
  failures.push(`1,000 virtual rows render: ${virtualGridRender.toFixed(1)} ms exceeds 100 ms`);
}
if (virtualGridMarkup.length > 120_000) {
  failures.push(
    `1,000 virtual rows markup: ${virtualGridMarkup.length} bytes exceeds 120000 bytes`,
  );
}
if (virtualGridRows > 32) {
  failures.push(`1,000 virtual rows DOM window: ${virtualGridRows} rows exceeds 32 rows`);
}

console.table(
  results.map(({ nodes, markupLength, ...metrics }) => ({
    nodes,
    compileMs: metrics.compile.toFixed(1),
    evaluateMs: metrics.evaluate.toFixed(1),
    incrementalMs: metrics.incremental.toFixed(1),
    renderMs: metrics.render.toFixed(1),
    markupBytes: markupLength,
  })),
);

console.table([
  {
    case: '1,000 virtual grid rows',
    renderMs: virtualGridMetrics.renderMs.toFixed(1),
    markupBytes: virtualGridMetrics.markupBytes,
    renderedRows: virtualGridMetrics.renderedRows,
  },
]);

if (failures.length > 0) {
  throw new Error(`A3S Form performance budget failed:\n${failures.join('\n')}`);
}
