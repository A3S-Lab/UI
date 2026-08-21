import { useMemo, useState } from 'react';
import {
  assertCompiled,
  type FormDocument,
  type JsonObject,
  type JsonSchema,
} from '../../../src/core';
import { FormRenderer } from '../../../src/react';
import '../../../src/a3s-ui.css';

type MatrixMode = 'single' | 'multiple';

const rows = [
  { id: 'coordination', label: '成员与 Agent 的任务交接是否清晰' },
  { id: 'traceability', label: '执行结果是否容易追溯', description: '包含输入、输出和失败原因。' },
  { id: 'recovery', label: '异常恢复是否符合预期' },
];

const columns = [
  { label: '待改进', value: 'low' },
  { label: '基本可用', value: 'usable' },
  { label: '符合预期', value: 'expected' },
  { label: '表现出色', value: 'excellent' },
];

function rowSchema(mode: MatrixMode, label: string): JsonSchema {
  if (mode === 'multiple') {
    return {
      type: 'array',
      title: label,
      items: { type: 'string', enum: columns.map(({ value }) => value) },
      minItems: 1,
      maxItems: 2,
      uniqueItems: true,
    };
  }
  return {
    type: 'string',
    title: label,
    enum: columns.map(({ value }) => value),
  };
}

function createDocument(mode: MatrixMode): FormDocument {
  const widget = mode === 'multiple' ? 'matrix-multiple' : 'matrix-single';
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: mode === 'multiple' ? '能力覆盖' : '协作体验', locale: 'zh-CN' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        assessment: {
          type: 'object',
          properties: Object.fromEntries(rows.map((row) => [row.id, rowSchema(mode, row.label)])),
          required: rows.map(({ id }) => id),
          additionalProperties: false,
        },
      },
      required: ['assessment'],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['assessment'] },
        {
          id: 'assessment',
          kind: 'field',
          label: mode === 'multiple' ? '各环节具备哪些特征' : '协作体验评估',
          description:
            mode === 'multiple' ? '每行选择一至两项。' : '每行选择一个最符合实际情况的答案。',
          widget,
          schemaPath: '/properties/assessment',
          matrix: {
            rows: rows.map((row) => ({ ...row })),
            columns: columns.map((column) => ({ ...column })),
          },
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

const initialValues: Readonly<Record<MatrixMode, JsonObject>> = {
  single: {
    assessment: {
      coordination: 'expected',
      traceability: 'usable',
      recovery: 'expected',
    },
  },
  multiple: {
    assessment: {
      coordination: ['usable', 'expected'],
      traceability: ['expected'],
      recovery: ['usable'],
    },
  },
};

export function MatrixDemo({ mode }: { mode: MatrixMode }) {
  const plan = useMemo(() => assertCompiled(createDocument(mode)), [mode]);
  const initialValue = useMemo(() => structuredClone(initialValues[mode]), [mode]);
  const [value, setValue] = useState<JsonObject>(initialValue);
  const valueType =
    mode === 'multiple' ? 'Record<string, JsonPrimitive[]>' : 'Record<string, JsonPrimitive>';

  return (
    <section className="a3s-doc-field-demo a3s-doc-matrix-demo" data-widget={`matrix-${mode}`}>
      <header>
        <div>
          <strong>实时示例</strong>
          <span>{valueType}</span>
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
