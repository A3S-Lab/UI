import { useMemo, useState } from 'react';
import {
  assertCompiled,
  type FormDocument,
  type JsonObject,
  type JsonSchema,
  type UiNode,
} from '../../../../modules/form/src/core';
import { FormRenderer } from '../../../../modules/form/src/react';
import '../../../../modules/form/src/styles.css';

export type DocumentedLayoutExample =
  | 'grid'
  | 'columns-2'
  | 'columns-3'
  | 'card'
  | 'tabs'
  | 'collapse'
  | 'content'
  | 'divider'
  | 'spacer';

interface LayoutExample {
  summary: string;
  document: FormDocument;
  initialValue: JsonObject;
}

function createDocument(
  title: string,
  properties: Record<string, JsonSchema>,
  nodes: UiNode[],
): FormDocument {
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title, locale: 'zh-CN' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [{ id: 'root', kind: 'root', children: [nodes[0].id] }, ...nodes],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

const examples: Readonly<Record<DocumentedLayoutExample, LayoutExample>> = {
  grid: {
    summary: '12 列栅格 · 字段宽度 · 容器间距',
    document: createDocument(
      '栅格容器示例',
      {
        model: { type: 'string', enum: ['small', 'large'] },
        timeout: { type: 'number', minimum: 1, maximum: 300 },
      },
      [
        {
          id: 'runtime-grid',
          kind: 'group',
          label: '运行参数',
          description: '字段按 12 列宽度排列。',
          layout: 'grid',
          columns: 12,
          gap: 16,
          children: ['model', 'timeout'],
        },
        {
          id: 'model',
          kind: 'field',
          label: '模型规格',
          widget: 'select',
          schemaPath: '/properties/model',
          options: [
            { label: '轻量', value: 'small' },
            { label: '高性能', value: 'large' },
          ],
          width: 8,
        },
        {
          id: 'timeout',
          kind: 'field',
          label: '超时秒数',
          widget: 'number',
          schemaPath: '/properties/timeout',
          width: 4,
        },
      ],
    ),
    initialValue: { model: 'large', timeout: 60 },
  },
  'columns-2': {
    summary: '两个等宽投放区 · 各栏独立布局',
    document: createDocument(
      '两栏布局示例',
      {
        endpoint: { type: 'string', format: 'uri' },
        retries: { type: 'number', minimum: 0, maximum: 10 },
      },
      [
        {
          id: 'two-columns',
          kind: 'group',
          label: '连接设置',
          layout: 'columns',
          columns: 12,
          gap: 16,
          children: ['left-column', 'right-column'],
        },
        {
          id: 'left-column',
          kind: 'group',
          label: '服务地址',
          layout: 'flow',
          columns: 12,
          width: 6,
          children: ['endpoint'],
        },
        {
          id: 'endpoint',
          kind: 'field',
          label: 'Endpoint',
          widget: 'url',
          schemaPath: '/properties/endpoint',
        },
        {
          id: 'right-column',
          kind: 'group',
          label: '失败处理',
          layout: 'flow',
          columns: 12,
          width: 6,
          children: ['retries'],
        },
        {
          id: 'retries',
          kind: 'field',
          label: '重试次数',
          widget: 'number',
          schemaPath: '/properties/retries',
        },
      ],
    ),
    initialValue: { endpoint: 'https://api.a3s.dev', retries: 3 },
  },
  'columns-3': {
    summary: '三个等宽投放区 · 窄容器自动改单列',
    document: createDocument(
      '三栏布局示例',
      {
        region: { type: 'string' },
        concurrency: { type: 'number', minimum: 1, maximum: 32 },
        timeout: { type: 'number', minimum: 1, maximum: 300 },
      },
      [
        {
          id: 'three-columns',
          kind: 'group',
          label: '执行资源',
          layout: 'columns',
          columns: 12,
          gap: 12,
          children: ['region-column', 'concurrency-column', 'timeout-column'],
        },
        {
          id: 'region-column',
          kind: 'group',
          layout: 'flow',
          columns: 12,
          width: 4,
          children: ['region'],
        },
        {
          id: 'region',
          kind: 'field',
          label: '区域',
          schemaPath: '/properties/region',
        },
        {
          id: 'concurrency-column',
          kind: 'group',
          layout: 'flow',
          columns: 12,
          width: 4,
          children: ['concurrency'],
        },
        {
          id: 'concurrency',
          kind: 'field',
          label: '并发数',
          widget: 'number',
          schemaPath: '/properties/concurrency',
        },
        {
          id: 'timeout-column',
          kind: 'group',
          layout: 'flow',
          columns: 12,
          width: 4,
          children: ['timeout'],
        },
        {
          id: 'timeout',
          kind: 'field',
          label: '超时秒数',
          widget: 'number',
          schemaPath: '/properties/timeout',
        },
      ],
    ),
    initialValue: { region: 'ap-east-1', concurrency: 4, timeout: 90 },
  },
  card: {
    summary: '语义分组 · 标题与说明 · A3S UI Card',
    document: createDocument(
      '卡片分组示例',
      {
        service: { type: 'string' },
        enabled: { type: 'boolean' },
      },
      [
        {
          id: 'service-card',
          kind: 'section',
          label: '服务配置',
          description: '修改当前节点使用的服务和状态。',
          layout: 'card',
          columns: 12,
          gap: 16,
          children: ['service', 'enabled'],
        },
        {
          id: 'service',
          kind: 'field',
          label: '服务名称',
          schemaPath: '/properties/service',
          width: 8,
        },
        {
          id: 'enabled',
          kind: 'field',
          label: '启用服务',
          widget: 'switch',
          schemaPath: '/properties/enabled',
          width: 4,
        },
      ],
    ),
    initialValue: { service: 'knowledge-search', enabled: true },
  },
  tabs: {
    summary: '标准 Tab 语义 · 键盘切换 · 本地活动状态',
    document: createDocument(
      '标签页示例',
      {
        displayName: { type: 'string' },
        temperature: { type: 'number', minimum: 0, maximum: 2 },
      },
      [
        {
          id: 'settings-tabs',
          kind: 'group',
          label: '节点设置',
          layout: 'tabs',
          children: ['general-tab', 'model-tab'],
        },
        {
          id: 'general-tab',
          kind: 'group',
          label: '基础',
          layout: 'tab',
          columns: 12,
          children: ['display-name'],
        },
        {
          id: 'display-name',
          kind: 'field',
          label: '显示名称',
          schemaPath: '/properties/displayName',
        },
        {
          id: 'model-tab',
          kind: 'group',
          label: '模型',
          layout: 'tab',
          columns: 12,
          children: ['temperature'],
        },
        {
          id: 'temperature',
          kind: 'field',
          label: 'Temperature',
          widget: 'number',
          schemaPath: '/properties/temperature',
        },
      ],
    ),
    initialValue: { displayName: '知识检索', temperature: 0.4 },
  },
  collapse: {
    summary: '原生 Details 语义 · 独立展开状态',
    document: createDocument(
      '折叠面板示例',
      {
        systemPrompt: { type: 'string' },
        maxTokens: { type: 'number', minimum: 1, maximum: 8192 },
      },
      [
        {
          id: 'advanced-settings',
          kind: 'group',
          label: '高级设置',
          layout: 'collapse',
          children: ['prompt-panel', 'limits-panel'],
        },
        {
          id: 'prompt-panel',
          kind: 'group',
          label: '提示词',
          layout: 'collapse-panel',
          columns: 12,
          children: ['system-prompt'],
        },
        {
          id: 'system-prompt',
          kind: 'field',
          label: '系统提示词',
          widget: 'textarea',
          schemaPath: '/properties/systemPrompt',
        },
        {
          id: 'limits-panel',
          kind: 'group',
          label: '输出限制',
          layout: 'collapse-panel',
          columns: 12,
          children: ['max-tokens'],
        },
        {
          id: 'max-tokens',
          kind: 'field',
          label: '最大 Token 数',
          widget: 'number',
          schemaPath: '/properties/maxTokens',
        },
      ],
    ),
    initialValue: { systemPrompt: '只返回可核验的信息。', maxTokens: 2048 },
  },
  content: {
    summary: '静态说明 · 不写入受控值',
    document: createDocument('说明文字示例', {}, [
      {
        id: 'runtime-note',
        kind: 'content',
        presentation: 'text',
        content: '仅在连接成功后启用自动执行。',
      },
    ]),
    initialValue: {},
  },
  divider: {
    summary: '内容分隔 · 可选标题',
    document: createDocument('分隔线示例', {}, [
      {
        id: 'divider-group',
        kind: 'group',
        layout: 'flow',
        columns: 12,
        children: ['before-divider', 'advanced-divider', 'after-divider'],
      },
      {
        id: 'before-divider',
        kind: 'content',
        presentation: 'text',
        content: '基础参数',
      },
      {
        id: 'advanced-divider',
        kind: 'content',
        presentation: 'divider',
        content: '高级参数',
      },
      {
        id: 'after-divider',
        kind: 'content',
        presentation: 'text',
        content: '失败重试与超时设置',
      },
    ]),
    initialValue: {},
  },
  spacer: {
    summary: '固定垂直间距 · 对辅助技术隐藏',
    document: createDocument('间距示例', {}, [
      {
        id: 'spacer-group',
        kind: 'group',
        layout: 'flow',
        columns: 12,
        children: ['before-spacer', 'content-spacer', 'after-spacer'],
      },
      {
        id: 'before-spacer',
        kind: 'content',
        presentation: 'text',
        content: '上方内容',
      },
      {
        id: 'content-spacer',
        kind: 'content',
        presentation: 'spacer',
        gap: 32,
      },
      {
        id: 'after-spacer',
        kind: 'content',
        presentation: 'text',
        content: '下方内容',
      },
    ]),
    initialValue: {},
  },
};

export function LayoutDemo({ example }: { example: DocumentedLayoutExample }) {
  const definition = examples[example];
  const plan = useMemo(() => assertCompiled(definition.document), [definition]);
  const initialValue = useMemo(
    () => structuredClone(definition.initialValue),
    [definition.initialValue],
  );
  const [value, setValue] = useState<JsonObject>(initialValue);

  return (
    <section className="a3s-doc-field-demo" data-widget={`layout-${example}`}>
      <header>
        <div>
          <strong>实时示例</strong>
          <span>{definition.summary}</span>
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
