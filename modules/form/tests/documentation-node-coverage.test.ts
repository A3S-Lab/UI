import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PRODUCTION_NODE_UX_PROFILE_IDS,
  type ProductionNodeUxProfileId,
} from '../src/react/designer-node-profiles';

interface DocumentationEntry {
  file: string;
  demo: string;
  heading: string;
}

const fieldEntry = (widget: string, title: string): DocumentationEntry => ({
  file: 'fields.mdx',
  demo: `<FieldDemo widget="${widget}" />`,
  heading: `### ${title} \`${widget}\``,
});

const layoutEntry = (example: string, title: string): DocumentationEntry => ({
  file: 'layouts.mdx',
  demo: `<LayoutDemo example="${example}" />`,
  heading: `## ${title} \`${example}\``,
});

const documentation = {
  text: fieldEntry('text', '单行文本'),
  textarea: fieldEntry('textarea', '多行文本'),
  number: fieldEntry('number', '数字'),
  email: fieldEntry('email', '邮箱'),
  password: fieldEntry('password', '密码'),
  date: fieldEntry('date', '日期'),
  url: fieldEntry('url', '网址'),
  tel: fieldEntry('tel', '电话'),
  'date-time': fieldEntry('date-time', '日期时间'),
  time: fieldEntry('time', '时间'),
  select: fieldEntry('select', '下拉选择'),
  radio: fieldEntry('radio', '单选项'),
  checkbox: fieldEntry('checkbox', '复选框'),
  switch: fieldEntry('switch', '开关'),
  'multi-select': fieldEntry('multi-select', '多选'),
  'matrix-single': {
    file: 'matrix-fields.mdx',
    demo: '<MatrixDemo mode="single" />',
    heading: '## 单选矩阵 `matrix-single`',
  },
  'matrix-multiple': {
    file: 'matrix-fields.mdx',
    demo: '<MatrixDemo mode="multiple" />',
    heading: '## 多选矩阵 `matrix-multiple`',
  },
  tags: fieldEntry('tags', '标签'),
  'data-grid': {
    file: 'data-grids.mdx',
    demo: '<DataGridDemo />',
    heading: '# 可编辑数据表格',
  },
  'repeater-group': {
    file: 'repeatable-field-groups.mdx',
    demo: '<RepeaterDemo />',
    heading: '## 对象重复字段组 `repeater-group`',
  },
  repeater: {
    file: 'repeatable-field-groups.mdx',
    demo: '<ScalarRepeaterDemo />',
    heading: '## 基础值重复项 `repeater`',
  },
  currency: fieldEntry('currency', '金额'),
  rating: fieldEntry('rating', '评分'),
  slider: fieldEntry('slider', '滑块'),
  hidden: fieldEntry('hidden', '隐藏值'),
  calculated: fieldEntry('calculated', '计算结果'),
  grid: layoutEntry('grid', '栅格容器'),
  'columns-2': layoutEntry('columns-2', '两栏布局'),
  'columns-3': layoutEntry('columns-3', '三栏布局'),
  card: layoutEntry('card', '卡片分组'),
  wizard: { file: 'wizards.mdx', demo: '<WizardDemo />', heading: '# 多步向导' },
  tabs: layoutEntry('tabs', '标签页'),
  collapse: layoutEntry('collapse', '折叠面板'),
  content: layoutEntry('content', '说明文字'),
  divider: layoutEntry('divider', '分隔线'),
  spacer: layoutEntry('spacer', '间距'),
  'custom:a3s.file-upload': {
    file: 'file-upload.mdx',
    demo: '<FileUploadDemo />',
    heading: '# 文件上传',
  },
  'custom:a3s.signature': {
    file: 'signature.mdx',
    demo: '<SignatureDemo />',
    heading: '# 签名',
  },
} satisfies Record<ProductionNodeUxProfileId, DocumentationEntry>;

function readSection(content: string, heading: string): string {
  const start = content.indexOf(`${heading}\n`);
  if (start < 0) return '';
  const level = heading.match(/^#+/)?.[0].length ?? 1;
  const bodyStart = start + heading.length + 1;
  const rest = content.slice(bodyStart);
  const nextHeading = rest.search(new RegExp(`^#{1,${level}}\\s`, 'm'));
  return content.slice(start, nextHeading < 0 ? undefined : bodyStart + nextHeading);
}

describe('production node MDX coverage', () => {
  it('keeps a live example and property documentation for all 38 nodes', () => {
    expect(Object.keys(documentation)).toEqual(PRODUCTION_NODE_UX_PROFILE_IDS);
    const guideRoot = join(process.cwd(), 'apps/docs/docs/next/guide');
    const cache = new Map<string, string>();

    for (const id of PRODUCTION_NODE_UX_PROFILE_IDS) {
      const entry = documentation[id];
      const content = cache.get(entry.file) ?? readFileSync(join(guideRoot, entry.file), 'utf8');
      cache.set(entry.file, content);
      const section = readSection(content, entry.heading);
      expect(section, `${id} must have its own documentation section`).not.toBe('');
      expect(section, `${id} must have an MDX live example in its section`).toContain(entry.demo);
      expect(section, `${id} must document properties in its section`).toMatch(
        /\|[^\n]+\|\n\| ---/,
      );
    }
  });
});
