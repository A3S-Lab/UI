import type { FormDocument, UiNode } from '../core';
import { schemaForNode } from './designer-schema';
import type { FormNodeRegistry } from './node-registry';

export type DesignerNodeEditor = 'standard' | 'collection' | 'structured' | 'host';

export interface DesignerNodeUxProfile {
  typeLabel: string;
  category: string;
  purpose: string;
  primary: readonly string[];
  advanced: readonly string[];
  editor: DesignerNodeEditor;
}

export interface ResolvedDesignerNodeUxProfile extends DesignerNodeUxProfile {
  id: string;
  glyph: string;
}

export const PRODUCTION_NODE_UX_PROFILE_IDS = [
  'text',
  'textarea',
  'number',
  'email',
  'password',
  'date',
  'url',
  'tel',
  'date-time',
  'time',
  'select',
  'radio',
  'checkbox',
  'switch',
  'multi-select',
  'matrix-single',
  'matrix-multiple',
  'tags',
  'data-grid',
  'repeater-group',
  'repeater',
  'currency',
  'rating',
  'slider',
  'hidden',
  'calculated',
  'grid',
  'columns-2',
  'columns-3',
  'card',
  'wizard',
  'tabs',
  'collapse',
  'content',
  'divider',
  'spacer',
  'custom:a3s.file-upload',
  'custom:a3s.signature',
] as const;

export type ProductionNodeUxProfileId = (typeof PRODUCTION_NODE_UX_PROFILE_IDS)[number];

function profile(
  typeLabel: string,
  category: string,
  purpose: string,
  primary: readonly string[],
  advanced: readonly string[],
  editor: DesignerNodeEditor = 'standard',
): DesignerNodeUxProfile {
  return { typeLabel, category, purpose, primary, advanced, editor };
}

export const PRODUCTION_NODE_UX_PROFILES: Readonly<
  Record<ProductionNodeUxProfileId, DesignerNodeUxProfile>
> = {
  text: profile(
    '单行文本',
    '常用字段',
    '收集姓名、标题和其他短文本。',
    ['标题与说明', '占位提示'],
    ['字段绑定', '位置与宽度', '文本校验'],
  ),
  textarea: profile(
    '多行文本',
    '常用字段',
    '收集备注、描述和其他长文本。',
    ['标题与说明', '占位提示'],
    ['字段绑定', '位置与宽度', '文本校验'],
  ),
  number: profile(
    '数字',
    '常用字段',
    '录入整数或小数。',
    ['标题与说明', '占位提示'],
    ['步长与范围', '字段绑定', '位置与宽度'],
  ),
  email: profile(
    '邮箱',
    '常用字段',
    '录入并校验邮箱地址。',
    ['标题与说明', '占位提示'],
    ['字段绑定', '位置与宽度', '文本校验'],
  ),
  password: profile(
    '密码',
    '常用字段',
    '录入需要掩码显示的文本。',
    ['标题与说明', '占位提示'],
    ['字段绑定', '位置与宽度', '文本校验'],
  ),
  date: profile(
    '日期',
    '常用字段',
    '选择一个自然日。',
    ['标题与说明'],
    ['字段绑定', '位置与宽度', '必填状态'],
  ),
  url: profile(
    '网址',
    '常用字段',
    '录入并校验网页地址。',
    ['标题与说明', '占位提示'],
    ['字段绑定', '位置与宽度', '文本校验'],
  ),
  tel: profile(
    '电话',
    '常用字段',
    '录入联系电话并适配移动键盘。',
    ['标题与说明', '占位提示'],
    ['字段绑定', '位置与宽度', '文本校验'],
  ),
  'date-time': profile(
    '日期时间',
    '常用字段',
    '选择日期与时间并保存 UTC 值。',
    ['标题与说明'],
    ['字段绑定', '位置与宽度', '必填状态'],
  ),
  time: profile(
    '时间',
    '常用字段',
    '选择一天中的时间并保存 UTC 值。',
    ['标题与说明'],
    ['字段绑定', '位置与宽度', '必填状态'],
  ),
  select: profile(
    '下拉选择',
    '选择与集合',
    '从一组稳定选项中选择一项。',
    ['标题与说明', '选项'],
    ['提交值', '字段绑定', '位置与宽度'],
    'collection',
  ),
  radio: profile(
    '单选项',
    '选择与集合',
    '平铺展示互斥选项。',
    ['标题与说明', '选项'],
    ['提交值', '字段绑定', '位置与宽度'],
    'collection',
  ),
  checkbox: profile(
    '复选框',
    '选择与集合',
    '记录确认、同意或完成状态。',
    ['标题与说明'],
    ['字段绑定', '位置与宽度', '必填状态'],
  ),
  switch: profile(
    '开关',
    '选择与集合',
    '切换启用或关闭状态。',
    ['标题与说明'],
    ['字段绑定', '位置与宽度', '默认状态'],
  ),
  'multi-select': profile(
    '多选',
    '选择与集合',
    '从稳定选项中选择多项。',
    ['标题与说明', '选项'],
    ['数量限制', '提交值', '字段绑定'],
    'collection',
  ),
  'matrix-single': profile(
    '单选矩阵',
    '选择与集合',
    '让多行问题共用一组单选等级。',
    ['标题与说明', '矩阵行', '矩阵列'],
    ['行标识', '提交值', '逐行校验'],
    'structured',
  ),
  'matrix-multiple': profile(
    '多选矩阵',
    '选择与集合',
    '让每一行从同一组列中选择多项。',
    ['标题与说明', '矩阵行', '矩阵列'],
    ['行标识', '逐行数量限制', '提交值'],
    'structured',
  ),
  tags: profile(
    '标签',
    '选择与集合',
    '录入并管理一组唯一短标签。',
    ['标题与说明', '占位提示'],
    ['数量限制', '字段绑定', '位置与宽度'],
    'collection',
  ),
  'data-grid': profile(
    '数据表格',
    '选择与集合',
    '按行编辑可比较的对象数组。',
    ['行模板', '编辑与容量', '当前视图'],
    ['批处理', '数组校验', '位置与宽度'],
    'structured',
  ),
  'repeater-group': profile(
    '重复字段组',
    '选择与集合',
    '重复录入一组结构相同的字段。',
    ['行展示方式', '行模板'],
    ['行标识', '数量限制', '位置与宽度'],
    'structured',
  ),
  repeater: profile(
    '重复项',
    '选择与集合',
    '维护一组可增删和排序的基础值。',
    ['标题与说明', '项目文案'],
    ['数量限制', '唯一性', '字段绑定'],
    'collection',
  ),
  currency: profile(
    '金额',
    '业务与计算',
    '录入带货币代码的数值。',
    ['标题与说明', '货币代码', '输入步长'],
    ['数值范围', '字段绑定', '位置与宽度'],
  ),
  rating: profile(
    '星级评分',
    '业务与计算',
    '用可键盘操作的星级记录评分。',
    ['标题与说明', '评分范围'],
    ['初始值', '字段绑定', '位置与宽度'],
  ),
  slider: profile(
    '滑块',
    '业务与计算',
    '在明确范围内选择一个数值。',
    ['标题与说明', '数值范围', '步长'],
    ['初始值', '字段绑定', '位置与宽度'],
  ),
  hidden: profile(
    '隐藏值',
    '业务与计算',
    '保留随表单提交但不显示的值。',
    ['隐藏值'],
    ['字段绑定', '值结构', '提交状态'],
  ),
  calculated: profile(
    '计算结果',
    '业务与计算',
    '只读展示宿主值或规则计算结果。',
    ['标题与说明', '计算来源'],
    ['字段绑定', '值结构', '位置与宽度'],
  ),
  grid: profile(
    '栅格容器',
    '布局容器',
    '按十二栏栅格组织不同宽度的节点。',
    ['容器名称', '内部栏数', '内部间距'],
    ['容器宽度', '子节点顺序'],
  ),
  'columns-2': profile(
    '两栏布局',
    '布局容器',
    '把内容放入两个等宽区域。',
    ['容器名称', '栏位比例'],
    ['容器宽度', '栏间距'],
  ),
  'columns-3': profile(
    '三栏布局',
    '布局容器',
    '把短字段放入三个等宽区域。',
    ['容器名称', '栏位比例'],
    ['容器宽度', '栏间距'],
  ),
  card: profile(
    '卡片分组',
    '布局容器',
    '用标题和说明组织一组相关字段。',
    ['分组标题', '分组说明'],
    ['内部栅格', '容器宽度', '内部间距'],
  ),
  wizard: profile(
    '多步向导',
    '布局容器',
    '按步骤填写、校验并确认表单。',
    ['步骤管理', '确认步骤'],
    ['步骤内容', '分支规则', '容器宽度'],
    'structured',
  ),
  tabs: profile(
    '标签页',
    '布局容器',
    '在同一层级切换多组内容。',
    ['页面管理', '标签页内容'],
    ['页面顺序', '容器宽度', '内部间距'],
    'structured',
  ),
  collapse: profile(
    '折叠面板',
    '布局容器',
    '按需展开低频或高级内容。',
    ['页面管理', '面板内容'],
    ['面板顺序', '容器宽度', '内部间距'],
    'structured',
  ),
  content: profile(
    '说明文字',
    '辅助内容',
    '在表单中显示静态提示。',
    ['文字内容'],
    ['内容宽度', '上下间距'],
  ),
  divider: profile(
    '分隔线',
    '辅助内容',
    '分隔相邻内容区域。',
    ['可选文字'],
    ['内容宽度', '上下间距'],
  ),
  spacer: profile(
    '间距',
    '辅助内容',
    '在相邻内容之间留出稳定空白。',
    ['间距高度'],
    ['内容宽度', '响应式行为'],
  ),
  'custom:a3s.file-upload': profile(
    '文件上传',
    '宿主能力',
    '通过宿主文件服务接收并保存文件。',
    ['文件类型', '单文件上限', '并发上传'],
    ['文件数量', '受控引用', '宿主边界'],
    'host',
  ),
  'custom:a3s.signature': profile(
    '签名',
    '宿主能力',
    '采集签名并保存宿主管理的不可变引用。',
    ['签名方式', '笔迹颜色'],
    ['数量限制', '受控引用', '宿主边界'],
    'host',
  ),
};

const CONTEXT_PROFILES: Readonly<Record<string, DesignerNodeUxProfile>> = {
  root: profile(
    '表单',
    '文档',
    '设置表单名称、说明和基础布局。',
    ['表单标题', '表单说明'],
    ['画布栏数', '字段间距'],
  ),
  column: profile(
    '布局栏',
    '布局容器',
    '承载当前多栏布局中的一组节点。',
    ['栏名称', '栏内容'],
    ['栏宽度', '内部间距'],
  ),
  page: profile(
    '向导步骤',
    '布局容器',
    '承载一个填写步骤或确认页。',
    ['步骤标题', '步骤类型'],
    ['步骤说明', '内部布局'],
  ),
  tab: profile(
    '标签页页面',
    '布局容器',
    '承载一个标签页中的内容。',
    ['标签名称', '页面内容'],
    ['页面说明', '内部布局'],
  ),
  'collapse-panel': profile(
    '折叠面板页面',
    '布局容器',
    '承载一个可展开面板中的内容。',
    ['面板标题', '面板内容'],
    ['面板说明', '内部布局'],
  ),
  group: profile(
    '内容容器',
    '布局容器',
    '组织一组相关节点。',
    ['容器标题', '容器内容'],
    ['容器宽度', '内部布局'],
  ),
};

export function productionProfileIdForNode(
  node: UiNode,
  document: FormDocument,
): ProductionNodeUxProfileId | undefined {
  if (node.widget) {
    const customId = `custom:${node.widget}` as ProductionNodeUxProfileId;
    if (customId in PRODUCTION_NODE_UX_PROFILES) return customId;
  }
  if (node.kind === 'field' && node.widget && node.widget in PRODUCTION_NODE_UX_PROFILES) {
    return node.widget as ProductionNodeUxProfileId;
  }
  if (node.kind === 'repeater') {
    if (node.layout === 'data-grid') return 'data-grid';
    if (schemaForNode(document, node)?.items?.type === 'object') return 'repeater-group';
    return 'repeater';
  }
  if (node.kind === 'content') {
    if (node.presentation === 'divider') return 'divider';
    if (node.presentation === 'spacer') return 'spacer';
    return 'content';
  }
  if (node.layout === 'card') return 'card';
  if (node.layout === 'wizard') return 'wizard';
  if (node.layout === 'tabs') return 'tabs';
  if (node.layout === 'collapse') return 'collapse';
  if (node.layout === 'grid') return 'grid';
  if (node.layout === 'columns') {
    const childCount = (node.children ?? []).filter((id) =>
      document.ui.nodes.some((candidate) => candidate.id === id),
    ).length;
    if (childCount === 2) return 'columns-2';
    if (childCount === 3) return 'columns-3';
  }
  return undefined;
}

export function resolveDesignerNodeUxProfile(
  node: UiNode,
  document: FormDocument,
  registry: FormNodeRegistry = {},
): ResolvedDesignerNodeUxProfile {
  const productionId = productionProfileIdForNode(node, document);
  if (productionId) {
    const definition = node.widget ? registry[node.widget] : undefined;
    return {
      id: productionId,
      ...PRODUCTION_NODE_UX_PROFILES[productionId],
      glyph: definition?.catalog.glyph ?? '',
    };
  }

  if (node.widget && registry[node.widget]) {
    const definition = registry[node.widget];
    return {
      id: `custom:${node.widget}`,
      typeLabel: definition.catalog.label,
      category: definition.catalog.sectionLabel,
      purpose: definition.catalog.description,
      primary: ['标题与说明', '组件设置'],
      advanced: ['字段绑定', '校验', '位置与宽度'],
      editor: 'host',
      glyph: definition.catalog.glyph,
    };
  }

  const contextId =
    node.kind === 'root'
      ? 'root'
      : node.layout === 'page'
        ? 'page'
        : node.layout === 'tab'
          ? 'tab'
          : node.layout === 'collapse-panel'
            ? 'collapse-panel'
            : node.layout === 'flow'
              ? 'column'
              : 'group';
  return { id: contextId, ...CONTEXT_PROFILES[contextId], glyph: '' };
}
