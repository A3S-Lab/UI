import { useMemo, useState } from 'react';
import {
  assertCompiled,
  type FormDocument,
  type JsonObject,
  type JsonSchema,
  type JsonValue,
  type UiNode,
} from '../../../../modules/form/src/core';
import { FormRenderer } from '../../../../modules/form/src/react';
import '../../../../modules/form/src/styles.css';
import '../../../../modules/form/src/a3s-flow.css';

export type DocumentedFieldWidget =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'password'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'url'
  | 'tel'
  | 'date-time'
  | 'time'
  | 'multi-select'
  | 'tags'
  | 'currency'
  | 'rating'
  | 'slider'
  | 'hidden'
  | 'calculated';

interface FieldExample {
  label: string;
  valueType: string;
  initialValue: JsonValue;
  schema: JsonSchema;
  node?: Partial<UiNode>;
}

const examples: Readonly<Record<DocumentedFieldWidget, FieldExample>> = {
  text: {
    label: '任务名称',
    valueType: 'string',
    initialValue: '同步客户数据',
    schema: { type: 'string', minLength: 2, maxLength: 80 },
    node: { placeholder: '输入任务名称' },
  },
  textarea: {
    label: '执行说明',
    valueType: 'string',
    initialValue: '失败时保留现场，并通知流程负责人。',
    schema: { type: 'string', maxLength: 500 },
    node: { placeholder: '补充执行条件或注意事项' },
  },
  number: {
    label: '重试次数',
    valueType: 'number | null',
    initialValue: 3,
    schema: { type: 'number', minimum: 0, maximum: 10 },
  },
  email: {
    label: '通知邮箱',
    valueType: 'string',
    initialValue: 'ops@a3s.dev',
    schema: { type: 'string', format: 'email' },
    node: { placeholder: 'name@example.com' },
  },
  password: {
    label: '临时凭证',
    valueType: 'string',
    initialValue: '',
    schema: { type: 'string', minLength: 8 },
    node: { placeholder: '输入一次性凭证' },
  },
  date: {
    label: '生效日期',
    valueType: 'string',
    initialValue: '2026-08-09',
    schema: { type: 'string', format: 'date' },
  },
  select: {
    label: '运行环境',
    valueType: 'JsonPrimitive',
    initialValue: 'staging',
    schema: { type: 'string', enum: ['development', 'staging', 'production'] },
    node: {
      options: [
        { label: '开发环境', value: 'development' },
        { label: '预发布环境', value: 'staging' },
        { label: '生产环境', value: 'production' },
      ],
    },
  },
  radio: {
    label: '执行策略',
    valueType: 'JsonPrimitive',
    initialValue: 'review',
    schema: { type: 'string', enum: ['direct', 'review'] },
    node: {
      options: [
        { label: '直接执行', value: 'direct' },
        { label: '人工确认后执行', value: 'review' },
      ],
    },
  },
  checkbox: {
    label: '失败时通知负责人',
    valueType: 'boolean',
    initialValue: true,
    schema: { type: 'boolean' },
  },
  switch: {
    label: '启用定时运行',
    valueType: 'boolean',
    initialValue: true,
    schema: { type: 'boolean' },
  },
  url: {
    label: '项目网址',
    valueType: 'string',
    initialValue: 'https://a3s.dev/form',
    schema: { type: 'string', format: 'uri' },
    node: { placeholder: 'https://example.com' },
  },
  tel: {
    label: '联系电话',
    valueType: 'string',
    initialValue: '+86 138 0000 0000',
    schema: { type: 'string', minLength: 6 },
    node: { placeholder: '+86 138 0000 0000' },
  },
  'date-time': {
    label: '任务开始时间',
    valueType: 'UTC string',
    initialValue: '2026-08-09T09:30:00Z',
    schema: { type: 'string', format: 'date-time' },
  },
  time: {
    label: '每日提醒时间',
    valueType: 'UTC string',
    initialValue: '09:15:00Z',
    schema: { type: 'string', format: 'time' },
  },
  'multi-select': {
    label: '参与角色',
    valueType: 'JsonPrimitive[]',
    initialValue: ['human', 'agent'],
    schema: {
      type: 'array',
      items: { type: 'string', enum: ['human', 'agent', 'reviewer', 'operator'] },
      minItems: 1,
      maxItems: 3,
      uniqueItems: true,
    },
    node: {
      options: [
        { label: '人类成员', value: 'human' },
        { label: 'Agent', value: 'agent' },
        { label: '审核人', value: 'reviewer' },
        { label: '运维人员', value: 'operator' },
      ],
    },
  },
  tags: {
    label: '技能标签',
    valueType: 'string[]',
    initialValue: ['Rust', 'TypeScript'],
    schema: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 5,
      uniqueItems: true,
    },
    node: { placeholder: '输入后按回车或逗号' },
  },
  currency: {
    label: '预算',
    valueType: 'number',
    initialValue: 1280.5,
    schema: { type: 'number', minimum: 0, maximum: 1000000 },
    node: { customProps: { currency: 'CNY', step: 0.01 } },
  },
  rating: {
    label: '协作体验',
    valueType: 'number',
    initialValue: 4,
    schema: { type: 'number', minimum: 1, maximum: 5 },
  },
  slider: {
    label: '自动化比例',
    valueType: 'number',
    initialValue: 65,
    schema: { type: 'number', minimum: 0, maximum: 100 },
    node: { customProps: { step: 5 } },
  },
  hidden: {
    label: '组织标识',
    valueType: 'JsonValue',
    initialValue: 'org-a3s-lab',
    schema: { type: 'string' },
  },
  calculated: {
    label: '预计总成本',
    valueType: 'JsonValue',
    initialValue: 2561,
    schema: { type: 'number' },
    node: { readOnly: true },
  },
};

function createExampleDocument(widget: DocumentedFieldWidget): FormDocument {
  const example = examples[widget];
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: `${example.label}示例`, locale: 'zh-CN' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: { value: example.schema },
      required: widget === 'hidden' || widget === 'calculated' ? [] : ['value'],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['value'] },
        {
          id: 'value',
          kind: 'field',
          label: example.label,
          widget,
          schemaPath: '/properties/value',
          ...example.node,
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

export function FieldDemo({ widget }: { widget: DocumentedFieldWidget }) {
  const example = examples[widget];
  const plan = useMemo(() => assertCompiled(createExampleDocument(widget)), [widget]);
  const initialValue = useMemo<JsonObject>(
    () => ({ value: structuredClone(example.initialValue) }),
    [example],
  );
  const [value, setValue] = useState<JsonObject>(initialValue);

  return (
    <section className="a3s-doc-field-demo" data-widget={widget}>
      <header>
        <div>
          <strong>实时示例</strong>
          <span>{example.valueType}</span>
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
        {widget === 'hidden' && (
          <p className="a3s-doc-field-demo__hidden-note">
            隐藏字段不占页面空间，值仍由宿主管理并保留在表单数据中。
          </p>
        )}
        <FormRenderer plan={plan} value={value} onChange={setValue} />
      </div>
      <div className="a3s-doc-field-demo__value">
        <span>受控值</span>
        <pre aria-live="polite">{JSON.stringify(value, null, 2)}</pre>
      </div>
    </section>
  );
}
