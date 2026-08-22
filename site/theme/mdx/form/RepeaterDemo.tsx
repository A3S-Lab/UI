import { useMemo, useState } from 'react';
import { assertCompiled, type FormDocument, type JsonObject } from '../../../../modules/form/src/core';
import { FormRenderer } from '../../../../modules/form/src/react';
import '../../../../modules/form/src/styles.css';
import '../../../../modules/form/src/a3s-flow.css';

const objectDocument: FormDocument = {
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
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            match: { type: 'string', minLength: 1 },
            destination: { type: 'string', enum: ['sales', 'support', 'review'] },
          },
          required: ['id', 'match', 'destination'],
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
        label: '路由规则',
        description: '规则按顺序匹配，最多添加四条。',
        schemaPath: '/properties/routes',
        itemKey: 'id',
        children: ['route-match', 'route-destination'],
      },
      {
        id: 'route-match',
        kind: 'field',
        label: '匹配条件',
        placeholder: '例如：customer.level = vip',
        schemaPath: '/properties/routes/items/properties/match',
        width: 6,
      },
      {
        id: 'route-destination',
        kind: 'field',
        label: '目标分支',
        widget: 'select',
        schemaPath: '/properties/routes/items/properties/destination',
        options: [
          { label: '销售处理', value: 'sales' },
          { label: '支持处理', value: 'support' },
          { label: '人工复核', value: 'review' },
        ],
        width: 6,
      },
    ],
  },
  rules: [],
  dataSources: [],
  actions: [],
};

const objectInitialValue: JsonObject = {
  routes: [
    { id: 'vip', match: 'customer.level = vip', destination: 'sales' },
    { id: 'fallback', match: 'execution.status = failed', destination: 'review' },
  ],
};

const scalarDocument: FormDocument = {
  kind: 'a3s.form',
  apiVersion: 'a3s.dev/form/v1alpha1',
  revision: 1,
  metadata: { title: '路由标签', locale: 'zh-CN' },
  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      labels: {
        type: 'array',
        minItems: 1,
        maxItems: 6,
        uniqueItems: true,
        items: { type: 'string' },
      },
    },
    required: ['labels'],
    additionalProperties: false,
  },
  ui: {
    root: 'root',
    nodes: [
      { id: 'root', kind: 'root', children: ['labels'] },
      {
        id: 'labels',
        kind: 'repeater',
        label: '路由标签',
        description: '按匹配优先级排列，最多六项。',
        schemaPath: '/properties/labels',
      },
    ],
  },
  rules: [],
  dataSources: [],
  actions: [],
};

const scalarInitialValue: JsonObject = {
  labels: ['priority', 'external'],
};

function RepeaterExample({
  document,
  initialValue,
  summary,
  widget,
}: {
  document: FormDocument;
  initialValue: JsonObject;
  summary: string;
  widget: string;
}) {
  const plan = useMemo(() => assertCompiled(document), [document]);
  const resetValue = useMemo(() => structuredClone(initialValue), [initialValue]);
  const [value, setValue] = useState<JsonObject>(resetValue);

  return (
    <section className="a3s-doc-field-demo" data-widget={widget}>
      <header>
        <div>
          <strong>实时示例</strong>
          <span>{summary}</span>
        </div>
        <button
          type="button"
          className="btn"
          data-size="sm"
          data-variant="secondary"
          onClick={() => setValue(structuredClone(resetValue))}
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

export function RepeaterDemo() {
  return (
    <RepeaterExample
      document={objectDocument}
      initialValue={objectInitialValue}
      summary="添加 · 排序 · 删除 · 响应式字段布局"
      widget="repeater-group"
    />
  );
}

export function ScalarRepeaterDemo() {
  return (
    <RepeaterExample
      document={scalarDocument}
      initialValue={scalarInitialValue}
      summary="基础值数组 · 添加 · 排序 · 删除"
      widget="repeater"
    />
  );
}
