import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { compileForm, createFormDocument, type FormDocument } from '../src/core';
import {
  createFileUploadNodeRegistry,
  createSignatureNodeRegistry,
  FormDesigner,
} from '../src/react';
import { createDesignerCatalog } from '../src/react/designer-catalog';
import {
  PRODUCTION_NODE_UX_PROFILE_IDS,
  PRODUCTION_NODE_UX_PROFILES,
  type ProductionNodeUxProfileId,
} from '../src/react/designer-node-profiles';
import { createDocument } from './fixtures';

const fileUploadRegistry = createFileUploadNodeRegistry({
  service: {
    upload: async ({ file }) => ({
      id: `test-${file.name}`,
      name: file.name,
      size: file.size,
      mediaType: file.type || 'application/octet-stream',
    }),
    remove: async () => undefined,
  },
});

const signatureRegistry = createSignatureNodeRegistry({
  service: {
    save: async ({ capture }) => ({
      id: 'test-signature',
      method: capture.method,
      signedAt: '2026-08-10T00:00:00.000Z',
    }),
    remove: async () => undefined,
  },
});

const productionNodeRegistry = {
  ...fileUploadRegistry,
  ...signatureRegistry,
};

const productionCatalogIds = [
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

type InspectorExpectation =
  | { kind: 'control'; name: string }
  | { kind: 'button'; name: string }
  | { kind: 'text'; name: string };

const inspectorExpectations = {
  text: { kind: 'control', name: '占位提示' },
  textarea: { kind: 'control', name: '占位提示' },
  number: { kind: 'control', name: '占位提示' },
  email: { kind: 'control', name: '占位提示' },
  password: { kind: 'control', name: '占位提示' },
  date: { kind: 'control', name: '默认值' },
  url: { kind: 'control', name: '占位提示' },
  tel: { kind: 'control', name: '占位提示' },
  'date-time': { kind: 'control', name: '默认值' },
  time: { kind: 'control', name: '默认值' },
  select: { kind: 'control', name: '选项 1 标签' },
  radio: { kind: 'control', name: '选项 1 标签' },
  checkbox: { kind: 'control', name: '默认状态' },
  switch: { kind: 'control', name: '默认状态' },
  'multi-select': { kind: 'control', name: '选项 1 标签' },
  'matrix-single': { kind: 'control', name: '矩阵行 1 标题' },
  'matrix-multiple': { kind: 'control', name: '矩阵列 1 标题' },
  tags: { kind: 'control', name: '占位提示' },
  'data-grid': { kind: 'control', name: '表格编辑方式' },
  'repeater-group': { kind: 'control', name: '行展示方式' },
  repeater: { kind: 'control', name: '重复项占位提示' },
  currency: { kind: 'control', name: '货币代码' },
  rating: { kind: 'control', name: '最高评分' },
  slider: { kind: 'control', name: '滑块步长' },
  hidden: { kind: 'control', name: '默认值' },
  calculated: { kind: 'text', name: '由宿主写入受控值' },
  grid: { kind: 'control', name: '内部栏数' },
  'columns-2': { kind: 'control', name: '栏位比例' },
  'columns-3': { kind: 'control', name: '栏位比例' },
  card: { kind: 'control', name: '内部栏数' },
  wizard: { kind: 'button', name: '添加步骤' },
  tabs: { kind: 'button', name: '添加标签页' },
  collapse: { kind: 'button', name: '添加折叠面板' },
  content: { kind: 'control', name: '说明文字内容' },
  divider: { kind: 'control', name: '分隔线标题' },
  spacer: { kind: 'control', name: '间距高度' },
  'custom:a3s.file-upload': { kind: 'control', name: '允许的文件类型' },
  'custom:a3s.signature': { kind: 'control', name: '签名方式' },
} as const satisfies Record<ProductionNodeUxProfileId, InspectorExpectation>;

function ProductionCatalogHarness() {
  const [document, setDocument] = useState<FormDocument>(
    () => compileForm(createDocument()).document as FormDocument,
  );
  return (
    <>
      <FormDesigner
        document={document}
        onChange={setDocument}
        compileOptions={{ capabilities: { widgets: Object.keys(productionNodeRegistry) } }}
        nodeRegistry={productionNodeRegistry}
      />
      <output data-testid="production-node-document">{JSON.stringify(document)}</output>
    </>
  );
}

function BlankCatalogHarness() {
  const [document, setDocument] = useState<FormDocument>(() =>
    createFormDocument({ title: '全节点审查' }),
  );
  return (
    <>
      <FormDesigner
        document={document}
        onChange={setDocument}
        compileOptions={{ capabilities: { widgets: Object.keys(productionNodeRegistry) } }}
        nodeRegistry={productionNodeRegistry}
      />
      <output data-testid="blank-node-document">{JSON.stringify(document)}</output>
    </>
  );
}

describe('production node UX coverage', () => {
  it('defines an explicit configuration contract for every production node', () => {
    expect(PRODUCTION_NODE_UX_PROFILE_IDS).toEqual(productionCatalogIds);
    expect(Object.keys(PRODUCTION_NODE_UX_PROFILES)).toHaveLength(38);

    for (const id of productionCatalogIds) {
      const profile = PRODUCTION_NODE_UX_PROFILES[id];
      expect(profile.typeLabel.trim()).not.toBe('');
      expect(profile.category.trim()).not.toBe('');
      expect(profile.purpose.trim()).not.toBe('');
      expect(profile.primary.length).toBeGreaterThan(0);
      expect(profile.advanced.length).toBeGreaterThan(0);
      expect(['standard', 'collection', 'structured', 'host']).toContain(profile.editor);
    }
  });

  it('keeps the complete 38-node production catalog explicit', () => {
    const items = createDesignerCatalog(productionNodeRegistry).flatMap((section) => section.items);
    expect(items.map(({ id }) => id)).toEqual(productionCatalogIds);
    expect(items).toHaveLength(38);
    for (const item of items) {
      expect(item.label.trim()).not.toBe('');
      expect(item.description.trim()).not.toBe('');
    }
    for (const definition of Object.values(productionNodeRegistry)) {
      expect(definition.design).toBeTypeOf('function');
      expect(definition.render).toBeTypeOf('function');
      expect(definition.inspector).toBeTypeOf('function');
    }
  });

  it('adds consecutive field presets beside the current field', () => {
    render(<BlankCatalogHarness />);

    const fields = [
      ['添加单行文本字段', 'text'],
      ['添加多行文本字段', 'textarea'],
      ['添加数字字段', 'number'],
      ['添加邮箱字段', 'email'],
      ['添加密码字段', 'password'],
      ['添加日期字段', 'date'],
      ['添加网址字段', 'url'],
      ['添加电话字段', 'tel'],
      ['添加日期时间字段', 'date-time'],
      ['添加时间字段', 'time'],
      ['添加下拉选择字段', 'select'],
      ['添加单选项字段', 'radio'],
      ['添加复选框字段', 'checkbox'],
      ['添加开关字段', 'switch'],
      ['添加多选字段', 'multi-select'],
      ['添加单选矩阵字段', 'matrix-single'],
      ['添加多选矩阵字段', 'matrix-multiple'],
      ['添加标签字段', 'tags'],
    ] as const;
    for (const [name] of fields) {
      fireEvent.click(screen.getByRole('button', { name }));
    }

    const document = JSON.parse(
      screen.getByTestId('blank-node-document').textContent ?? '{}',
    ) as FormDocument;
    const root = document.ui.nodes.find((node) => node.id === document.ui.root);
    const added = (root?.children ?? []).map(
      (id) => document.ui.nodes.find((node) => node.id === id)?.widget,
    );

    expect(added).toEqual(fields.map(([, widget]) => widget));
  });

  it('authors every production preset and opens the complete document in the real runtime', () => {
    const { container } = render(<ProductionCatalogHarness />);
    const items = createDesignerCatalog(productionNodeRegistry).flatMap((section) => section.items);

    for (const item of items) {
      fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
      const fieldSuffix =
        item.kind === 'field' ||
        (item.kind === 'repeater' &&
          item.preset !== 'repeater-group' &&
          item.preset !== 'data-grid')
          ? '字段'
          : '';
      fireEvent.click(screen.getByRole('button', { name: `添加${item.label}${fieldSuffix}` }));
      const summary = screen.getByTestId('designer-node-profile');
      expect(summary.getAttribute('data-profile-id')).toBe(item.id);
      expect(summary.textContent).toContain(
        PRODUCTION_NODE_UX_PROFILES[item.id as ProductionNodeUxProfileId].typeLabel,
      );
      const inspector = screen.getByRole('complementary', { name: '属性面板' });
      const expectation = inspectorExpectations[item.id as ProductionNodeUxProfileId];
      if (expectation.kind === 'control') {
        const control = within(inspector).getByLabelText(expectation.name);
        expect(
          control.matches('.input, .textarea, .select') ||
            control.querySelector('.input, .textarea, .select'),
        ).toBeTruthy();
      } else if (expectation.kind === 'button') {
        expect(within(inspector).getByRole('button', { name: expectation.name })).toBeTruthy();
      } else {
        expect(within(inspector).getByText(expectation.name)).toBeTruthy();
      }
      const validation = within(inspector).getByRole('tab', { name: '校验' });
      const validates = item.kind === 'field' || item.kind === 'repeater';
      expect((validation as HTMLButtonElement).disabled).toBe(!validates);
    }

    const document = JSON.parse(
      screen.getByTestId('production-node-document').textContent ?? '{}',
    ) as FormDocument;
    const result = compileForm(document, {
      capabilities: { widgets: Object.keys(productionNodeRegistry) },
    });
    expect(result.ok).toBe(true);
    expect(container.querySelectorAll('[data-node-type]').length).toBeGreaterThanOrEqual(38);

    const preview = screen.getByRole('button', { name: '预览' }) as HTMLButtonElement;
    expect(preview.disabled).toBe(false);
    fireEvent.click(preview);
    expect(screen.getByTestId('form-designer').getAttribute('data-mode')).toBe('preview');
    expect(container.querySelector('.a3s-form-renderer')).toBeTruthy();
    expect(screen.queryByRole('alert', { name: /编译诊断/ })).toBeNull();
  });
});
