import type { JsonSchema, UiNodeKind, UiOption } from '../core';
import type { FormNodeDefinition, FormNodeRegistry } from './node-registry';

export type DesignerPreset =
  | 'grid'
  | 'columns-2'
  | 'columns-3'
  | 'card'
  | 'wizard'
  | 'tabs'
  | 'collapse'
  | 'data-grid'
  | 'repeater-group'
  | 'divider'
  | 'spacer';

export interface DesignerCatalogItem {
  id: string;
  label: string;
  description: string;
  glyph: string;
  kind: UiNodeKind;
  preset?: DesignerPreset;
  widget?: string;
  schema?: JsonSchema;
  options?: UiOption[];
  extensionKey?: string;
  defaults?: FormNodeDefinition['defaults'];
}

export interface DesignerCatalogSection {
  id: string;
  label: string;
  items: readonly DesignerCatalogItem[];
}

const choiceOptions: UiOption[] = [
  { label: '选项一', value: 'option-1' },
  { label: '选项二', value: 'option-2' },
];

const matrixRows = [
  { id: 'quality', label: '结果质量' },
  { id: 'speed', label: '响应速度' },
  { id: 'usability', label: '使用体验' },
];

const matrixColumns = [
  { label: '待改进', value: 'low' },
  { label: '符合预期', value: 'expected' },
  { label: '表现出色', value: 'excellent' },
];

function matrixSchema(multiple: boolean): JsonSchema {
  const rowSchema = (label: string): JsonSchema =>
    multiple
      ? {
          type: 'array',
          title: label,
          default: [],
          items: { type: 'string', enum: matrixColumns.map(({ value }) => value) },
          minItems: 1,
          maxItems: 2,
          uniqueItems: true,
        }
      : {
          type: 'string',
          title: label,
          enum: matrixColumns.map(({ value }) => value),
        };
  return {
    type: 'object',
    default: {},
    properties: Object.fromEntries(matrixRows.map((row) => [row.id, rowSchema(row.label)])),
    required: matrixRows.map(({ id }) => id),
    additionalProperties: false,
  };
}

export const DESIGNER_CATALOG: readonly DesignerCatalogSection[] = [
  {
    id: 'basic',
    label: '常用字段',
    items: [
      {
        id: 'text',
        label: '单行文本',
        description: '姓名、标题等短文本',
        glyph: 'T',
        kind: 'field',
        widget: 'text',
        schema: { type: 'string' },
      },
      {
        id: 'textarea',
        label: '多行文本',
        description: '备注、说明等长文本',
        glyph: '¶',
        kind: 'field',
        widget: 'textarea',
        schema: { type: 'string' },
      },
      {
        id: 'number',
        label: '数字',
        description: '整数或小数',
        glyph: '12',
        kind: 'field',
        widget: 'number',
        schema: { type: 'number' },
      },
      {
        id: 'email',
        label: '邮箱',
        description: '带格式校验的邮箱',
        glyph: '@',
        kind: 'field',
        widget: 'email',
        schema: { type: 'string', format: 'email' },
      },
      {
        id: 'password',
        label: '密码',
        description: '掩码文本输入',
        glyph: '••',
        kind: 'field',
        widget: 'password',
        schema: { type: 'string' },
      },
      {
        id: 'date',
        label: '日期',
        description: '选择年月日',
        glyph: '日',
        kind: 'field',
        widget: 'date',
        schema: { type: 'string', format: 'date' },
      },
      {
        id: 'url',
        label: '网址',
        description: '带 URI 格式校验的网址',
        glyph: '↗',
        kind: 'field',
        widget: 'url',
        schema: { type: 'string', format: 'uri' },
      },
      {
        id: 'tel',
        label: '电话',
        description: '适配移动设备键盘的联系电话',
        glyph: '☎',
        kind: 'field',
        widget: 'tel',
        schema: { type: 'string' },
      },
      {
        id: 'date-time',
        label: '日期时间',
        description: '选择日期和时间，按 UTC 写入',
        glyph: '时',
        kind: 'field',
        widget: 'date-time',
        schema: { type: 'string', format: 'date-time' },
      },
      {
        id: 'time',
        label: '时间',
        description: '选择一天中的时间，按 UTC 写入',
        glyph: '钟',
        kind: 'field',
        widget: 'time',
        schema: { type: 'string', format: 'time' },
      },
    ],
  },
  {
    id: 'choice',
    label: '选择与集合',
    items: [
      {
        id: 'select',
        label: '下拉选择',
        description: '从选项中选择一项',
        glyph: '⌄',
        kind: 'field',
        widget: 'select',
        schema: { type: 'string', enum: ['option-1', 'option-2'] },
        options: choiceOptions,
      },
      {
        id: 'radio',
        label: '单选项',
        description: '平铺展示单选选项',
        glyph: '◉',
        kind: 'field',
        widget: 'radio',
        schema: { type: 'string', enum: ['option-1', 'option-2'] },
        options: choiceOptions,
      },
      {
        id: 'checkbox',
        label: '复选框',
        description: '确认或同意状态',
        glyph: '✓',
        kind: 'field',
        widget: 'checkbox',
        schema: { type: 'boolean' },
      },
      {
        id: 'switch',
        label: '开关',
        description: '启用或关闭状态',
        glyph: '↔',
        kind: 'field',
        widget: 'switch',
        schema: { type: 'boolean' },
      },
      {
        id: 'multi-select',
        label: '多选',
        description: '从选项中选择多项',
        glyph: '☷',
        kind: 'field',
        widget: 'multi-select',
        schema: {
          type: 'array',
          default: [],
          items: { type: 'string', enum: ['option-1', 'option-2'] },
          uniqueItems: true,
        },
        options: choiceOptions,
      },
      {
        id: 'matrix-single',
        label: '单选矩阵',
        description: '多行共用一组单选等级',
        glyph: 'M',
        kind: 'field',
        widget: 'matrix-single',
        schema: matrixSchema(false),
        defaults: {
          matrix: {
            rows: matrixRows.map((row) => ({ ...row })),
            columns: matrixColumns.map((column) => ({ ...column })),
          },
        },
      },
      {
        id: 'matrix-multiple',
        label: '多选矩阵',
        description: '每一行可选择多个共用选项',
        glyph: 'M',
        kind: 'field',
        widget: 'matrix-multiple',
        schema: matrixSchema(true),
        defaults: {
          matrix: {
            rows: matrixRows.map((row) => ({ ...row })),
            columns: matrixColumns.map((column) => ({ ...column })),
          },
        },
      },
      {
        id: 'tags',
        label: '标签',
        description: '输入并管理一组唯一标签',
        glyph: '#',
        kind: 'field',
        widget: 'tags',
        schema: {
          type: 'array',
          default: [],
          items: { type: 'string' },
          uniqueItems: true,
        },
      },
      {
        id: 'data-grid',
        label: '数据表格',
        description: '按行编辑名称、数量和备注',
        glyph: '▦',
        kind: 'repeater',
        preset: 'data-grid',
        schema: {
          type: 'array',
          default: [],
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', default: '' },
              quantity: { type: 'number', title: '数量', minimum: 0, default: 1 },
              notes: { type: 'string', title: '备注', default: '' },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
      },
      {
        id: 'repeater-group',
        label: '重复字段组',
        description: '可增删和排序的一组字段',
        glyph: '▤',
        kind: 'repeater',
        preset: 'repeater-group',
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
        },
      },
      {
        id: 'repeater',
        label: '重复项',
        description: '可增删的文本列表',
        glyph: '≡',
        kind: 'repeater',
        schema: { type: 'array', items: { type: 'string' } },
      },
    ],
  },
  {
    id: 'advanced',
    label: '业务与计算',
    items: [
      {
        id: 'currency',
        label: '金额',
        description: '带货币代码的精确数值输入',
        glyph: '¥',
        kind: 'field',
        widget: 'currency',
        schema: { type: 'number', default: 0 },
        defaults: { customProps: { currency: 'CNY', step: 0.01 } },
      },
      {
        id: 'rating',
        label: '星级评分',
        description: '使用键盘可操作的等级评分',
        glyph: '★',
        kind: 'field',
        widget: 'rating',
        schema: { type: 'number', minimum: 1, maximum: 5 },
      },
      {
        id: 'slider',
        label: '滑块',
        description: '在明确范围内选择数值',
        glyph: '━',
        kind: 'field',
        widget: 'slider',
        schema: { type: 'number', minimum: 0, maximum: 100, default: 50 },
        defaults: { customProps: { step: 1 } },
      },
      {
        id: 'hidden',
        label: '隐藏值',
        description: '随受控值提交但不展示给填写者',
        glyph: '◌',
        kind: 'field',
        widget: 'hidden',
        schema: { type: 'string', default: '' },
      },
      {
        id: 'calculated',
        label: '计算结果',
        description: '只读展示宿主值或 computed 规则结果',
        glyph: '∑',
        kind: 'field',
        widget: 'calculated',
        schema: { type: 'number', default: 0 },
        defaults: { readOnly: true },
      },
    ],
  },
  {
    id: 'layout',
    label: '布局容器',
    items: [
      {
        id: 'grid',
        label: '栅格容器',
        description: '自由组合字段宽度',
        glyph: '▦',
        kind: 'group',
        preset: 'grid',
      },
      {
        id: 'columns-2',
        label: '两栏布局',
        description: '两个等宽投放区域',
        glyph: 'Ⅱ',
        kind: 'group',
        preset: 'columns-2',
      },
      {
        id: 'columns-3',
        label: '三栏布局',
        description: '三个等宽投放区域',
        glyph: 'Ⅲ',
        kind: 'group',
        preset: 'columns-3',
      },
      {
        id: 'card',
        label: '卡片分组',
        description: '带标题和说明的区块',
        glyph: '▣',
        kind: 'section',
        preset: 'card',
      },
      {
        id: 'wizard',
        label: '多步向导',
        description: '分步校验、分支与确认页',
        glyph: '步',
        kind: 'group',
        preset: 'wizard',
      },
      {
        id: 'tabs',
        label: '标签页',
        description: '并列切换内容，不参与分步校验',
        glyph: '页',
        kind: 'group',
        preset: 'tabs',
      },
      {
        id: 'collapse',
        label: '折叠面板',
        description: '按需展开内容分组',
        glyph: '⌄',
        kind: 'group',
        preset: 'collapse',
      },
    ],
  },
  {
    id: 'content',
    label: '辅助内容',
    items: [
      {
        id: 'content',
        label: '说明文字',
        description: '静态提示和帮助内容',
        glyph: 'Aa',
        kind: 'content',
      },
      {
        id: 'divider',
        label: '分隔线',
        description: '分隔相邻内容区域',
        glyph: '—',
        kind: 'content',
        preset: 'divider',
      },
      {
        id: 'spacer',
        label: '间距',
        description: '留出可调节的垂直空间',
        glyph: '↕',
        kind: 'content',
        preset: 'spacer',
      },
    ],
  },
];

export const FIELD_WIDGETS = DESIGNER_CATALOG.flatMap((section) => section.items)
  .filter((item) => item.kind === 'field')
  .map((item) => ({ label: item.label, value: item.widget as string }));

export function createDesignerCatalog(
  registry: FormNodeRegistry = {},
): readonly DesignerCatalogSection[] {
  const sections: DesignerCatalogSection[] = DESIGNER_CATALOG.map((section) => ({
    ...section,
    items: [...section.items],
  }));
  for (const [extensionKey, definition] of Object.entries(registry)) {
    let section = sections.find((candidate) => candidate.id === definition.catalog.section);
    if (!section) {
      section = {
        id: definition.catalog.section,
        label: definition.catalog.sectionLabel,
        items: [],
      };
      sections.push(section);
    }
    (section.items as DesignerCatalogItem[]).push({
      id: `custom:${extensionKey}`,
      label: definition.catalog.label,
      description: definition.catalog.description,
      glyph: definition.catalog.glyph,
      kind: definition.kind,
      widget: extensionKey,
      schema: definition.schema,
      extensionKey,
      defaults: definition.defaults,
    });
  }
  return sections;
}

export function fieldWidgets(catalog: readonly DesignerCatalogSection[]) {
  return catalog
    .flatMap((section) => section.items)
    .filter((item) => item.kind === 'field')
    .map((item) => ({ label: item.label, value: item.widget as string }));
}

export function findCatalogItem(
  id: string,
  catalog: readonly DesignerCatalogSection[] = DESIGNER_CATALOG,
): DesignerCatalogItem | undefined {
  return catalog.flatMap((section) => section.items).find((item) => item.id === id);
}
