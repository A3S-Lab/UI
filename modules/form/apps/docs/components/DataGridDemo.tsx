import { useMemo, useState } from 'react';
import { assertCompiled, type FormDocument, type JsonObject } from '../../../src/core';
import { FormRenderer } from '../../../src/react';
import '../../../src/a3s-ui.css';

function createDocument(virtualized = false): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: '路由规则', locale: 'zh-CN' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        routes: {
          type: 'array',
          minItems: 1,
          maxItems: virtualized ? 600 : 6,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              condition: { type: 'string', minLength: 1, maxLength: 80 },
              operator: { type: 'string', enum: ['equals', 'contains', 'exists'] },
              destination: { type: 'string', enum: ['sales', 'support', 'review'] },
            },
            required: ['id', 'condition', 'operator', 'destination'],
            additionalProperties: false,
          },
        },
      },
      required: ['routes'],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['routes'] },
        {
          id: 'routes',
          kind: 'repeater',
          layout: 'data-grid',
          label: '分流规则',
          description: '逐行确认条件与目标；选择多行后可以批量删除。',
          schemaPath: '/properties/routes',
          itemKey: 'id',
          dataGrid: {
            editMode: 'dialog',
            selection: 'multiple',
            sorting: 'single',
            filtering: 'search',
            paste: 'append',
            fill: 'down',
            ...(virtualized
              ? {
                  virtualization: {
                    mode: 'rows' as const,
                    viewportHeight: 420,
                  },
                }
              : {}),
          },
          children: ['condition', 'operator', 'destination'],
        },
        {
          id: 'condition',
          kind: 'field',
          label: '条件值',
          schemaPath: '/properties/routes/items/properties/condition',
          width: 6,
        },
        {
          id: 'operator',
          kind: 'field',
          label: '比较方式',
          widget: 'select',
          schemaPath: '/properties/routes/items/properties/operator',
          options: [
            { label: '等于', value: 'equals' },
            { label: '包含', value: 'contains' },
            { label: '存在', value: 'exists' },
          ],
          width: 3,
        },
        {
          id: 'destination',
          kind: 'field',
          label: '目标分支',
          widget: 'select',
          schemaPath: '/properties/routes/items/properties/destination',
          options: [
            { label: '销售处理', value: 'sales' },
            { label: '支持处理', value: 'support' },
            { label: '人工复核', value: 'review' },
          ],
          width: 3,
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

const initialValue: JsonObject = {
  routes: [
    { id: 'vip', condition: 'customer.level = vip', operator: 'equals', destination: 'sales' },
    {
      id: 'failed',
      condition: 'execution.status',
      operator: 'equals',
      destination: 'review',
    },
    {
      id: 'support',
      condition: 'message.category',
      operator: 'contains',
      destination: 'support',
    },
  ],
};

const virtualInitialValue: JsonObject = {
  routes: Array.from({ length: 500 }, (_, index) => ({
    id: `route-${String(index + 1).padStart(3, '0')}`,
    condition: `payload.segment.${String(index + 1).padStart(3, '0')}`,
    operator: ['equals', 'contains', 'exists'][index % 3],
    destination: ['sales', 'support', 'review'][index % 3],
  })),
};

function virtualValueSummary(value: JsonObject) {
  const routes = Array.isArray(value.routes) ? value.routes : [];
  return {
    rows: routes.length,
    first: routes[0] ?? null,
    last: routes.at(-1) ?? null,
  };
}

export function DataGridDemo() {
  const plan = useMemo(() => assertCompiled(createDocument()), []);
  const [value, setValue] = useState<JsonObject>(() => structuredClone(initialValue));

  return (
    <section className="a3s-doc-field-demo" data-widget="data-grid-dialog">
      <header>
        <div>
          <strong>实时示例</strong>
          <span>批量粘贴 · 向下填充 · 排序筛选 · 对话框草稿</span>
        </div>
        <button
          type="button"
          className="btn"
          data-size="sm"
          data-variant="secondary"
          onClick={() => setValue(structuredClone(initialValue))}
        >
          重置
        </button>
      </header>
      <div className="a3s-doc-field-demo__preview">
        <FormRenderer plan={plan} value={value} onChange={setValue} />
      </div>
      <div className="a3s-doc-field-demo__value">
        <span>受控值</span>
        <pre aria-live="polite">{JSON.stringify(value, null, 2)}</pre>
      </div>
    </section>
  );
}

export function VirtualDataGridDemo() {
  const plan = useMemo(() => assertCompiled(createDocument(true)), []);
  const [value, setValue] = useState<JsonObject>(() => structuredClone(virtualInitialValue));

  return (
    <section className="a3s-doc-field-demo" data-widget="data-grid-virtualized">
      <header>
        <div>
          <strong>500 行实时示例</strong>
          <span>动态行高 · 固定表头 · 视口窗口 · 完整受控数组</span>
        </div>
        <button
          type="button"
          className="btn"
          data-size="sm"
          data-variant="secondary"
          onClick={() => setValue(structuredClone(virtualInitialValue))}
        >
          重置
        </button>
      </header>
      <div className="a3s-doc-field-demo__preview">
        <FormRenderer plan={plan} value={value} onChange={setValue} />
      </div>
      <div className="a3s-doc-field-demo__value">
        <span>受控值摘要</span>
        <pre aria-live="polite">{JSON.stringify(virtualValueSummary(value), null, 2)}</pre>
      </div>
    </section>
  );
}
