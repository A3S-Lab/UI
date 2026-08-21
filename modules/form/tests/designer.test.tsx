import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { compileForm, type FormDocument, type JsonObject } from '../src/core';
import { FormDesigner } from '../src/react';
import { scrollSelectedNodeIntoView } from '../src/react/designer-canvas';
import { createDocument, createObjectRepeaterDocument } from './fixtures';

function DesignerHarness({ initial = createDocument() }: { initial?: FormDocument }) {
  const [document, setDocument] = useState(() => compileForm(initial).document as FormDocument);
  return (
    <>
      <FormDesigner document={document} onChange={setDocument} />
      <output data-testid="designer-document">{JSON.stringify(document)}</output>
    </>
  );
}

function RawDesignerHarness({ initial }: { initial: FormDocument }) {
  const [document, setDocument] = useState(initial);
  return (
    <>
      <FormDesigner document={document} onChange={setDocument} />
      <output data-testid="designer-document">{JSON.stringify(document)}</output>
    </>
  );
}

function currentDocument(): FormDocument {
  return JSON.parse(screen.getByTestId('designer-document').textContent ?? '{}') as FormDocument;
}

function dragTransfer(): DataTransfer {
  const values = new Map<string, string>();
  return {
    effectAllowed: 'none',
    getData: (type: string) => values.get(type) ?? '',
    setData: (type: string, value: string) => values.set(type, value),
  } as unknown as DataTransfer;
}

function runCollectionAction(item: string, action: string) {
  fireEvent.click(screen.getByLabelText(`${item} 操作`));
  fireEvent.click(screen.getByRole('menuitem', { name: action }));
}

describe('React FormDesigner', () => {
  it('keeps a newly selected canvas node within the visible editing area', () => {
    const stage = document.createElement('div');
    const selected = document.createElement('article');
    selected.dataset.nodeId = 'field-20';
    stage.append(selected);
    Object.defineProperty(stage, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(stage, 'scrollTop', { configurable: true, writable: true, value: 120 });
    stage.getBoundingClientRect = () => ({ top: 100, bottom: 500, height: 400 }) as DOMRect;
    selected.getBoundingClientRect = () => ({ top: 680, bottom: 760, height: 80 }) as DOMRect;
    let request: ScrollToOptions | undefined;
    Object.defineProperty(stage, 'scrollTo', {
      configurable: true,
      value: (options: ScrollToOptions) => {
        request = options;
      },
    });

    expect(scrollSelectedNodeIntoView(stage, 'field-20')).toBe(true);
    expect(request).toEqual({ top: 540, behavior: 'smooth' });

    selected.getBoundingClientRect = () => ({ top: 220, bottom: 300, height: 80 }) as DOMRect;
    request = undefined;
    expect(scrollSelectedNodeIntoView(stage, 'field-20')).toBe(false);
    expect(request).toBeUndefined();
  });

  it('uses focused preview and restores the authoring panels', () => {
    render(<DesignerHarness />);
    const designer = screen.getByTestId('form-designer');
    expect(screen.getByRole('complementary', { name: '组件与表单结构' })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: '属性面板' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    expect(designer.getAttribute('data-mode')).toBe('preview');
    expect(screen.queryByRole('complementary', { name: '组件与表单结构' })).toBeNull();
    expect(screen.queryByRole('complementary', { name: '属性面板' })).toBeNull();
    expect(screen.getByLabelText('姓名')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '设计' }));
    expect(designer.getAttribute('data-mode')).toBe('design');
    expect(screen.getByRole('complementary', { name: '组件与表单结构' })).toBeTruthy();
    expect(screen.getByRole('complementary', { name: '属性面板' })).toBeTruthy();
  });

  it('uses a semantic toolbar and preserves independent desktop panel focus', () => {
    render(<DesignerHarness />);
    const designer = screen.getByTestId('form-designer');
    const toolbar = screen.getByRole('toolbar', { name: '表单设计器工具栏' });
    expect(toolbar).toBeTruthy();
    expect(designer.querySelector('.workspace-header')).toBeNull();
    expect(within(toolbar).getByRole('group', { name: '桌面面板' })).toBeTruthy();
    expect(within(toolbar).getByRole('group', { name: '编辑历史' })).toBeTruthy();
    expect(within(toolbar).getByRole('group', { name: '画布尺寸' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '收起组件面板' }));
    expect(designer.classList.contains('is-left-panel-collapsed')).toBe(true);
    expect(screen.getByRole('button', { name: '展开组件面板' }).getAttribute('aria-pressed')).toBe(
      'false',
    );

    fireEvent.click(screen.getByRole('button', { name: '收起设置面板' }));
    expect(designer.classList.contains('is-right-panel-collapsed')).toBe(true);
    expect(screen.getByRole('button', { name: '展开设置面板' }).getAttribute('aria-pressed')).toBe(
      'false',
    );

    fireEvent.click(screen.getByRole('button', { name: '展开组件面板' }));
    fireEvent.click(screen.getByRole('button', { name: '展开设置面板' }));
    expect(designer.classList.contains('is-left-panel-collapsed')).toBe(false);
    expect(designer.classList.contains('is-right-panel-collapsed')).toBe(false);
  });

  it('supports canvas undo and redo shortcuts without hijacking text inputs', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加单行文本字段' }));
    expect(screen.getByTestId('designer-document').textContent).toContain('field-1');

    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(screen.getByTestId('designer-document').textContent).not.toContain('field-1');
    fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
    expect(screen.getByTestId('designer-document').textContent).toContain('field-1');

    const title = screen.getByLabelText('字段标题');
    fireEvent.keyDown(title, { key: 'z', metaKey: true });
    expect(screen.getByTestId('designer-document').textContent).toContain('field-1');
  });

  it('filters the component catalog and recovers from an empty search', () => {
    render(<DesignerHarness />);
    const search = screen.getByLabelText('搜索组件');

    fireEvent.change(search, { target: { value: '日期' } });
    expect(screen.getByRole('button', { name: '添加日期字段' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '添加邮箱字段' })).toBeNull();

    fireEvent.change(search, { target: { value: '不存在的组件' } });
    expect(screen.getByText('没有匹配的组件')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '清空组件搜索' }));
    expect(screen.getByRole('button', { name: '添加邮箱字段' })).toBeTruthy();
  });

  it('supports complete keyboard navigation across editor and canvas tabs', () => {
    const document = createDocument();
    document.ui.nodes.push(
      {
        id: 'profile-tabs',
        kind: 'group',
        label: '资料标签',
        layout: 'tabs',
        children: ['profile-basic', 'profile-extra', 'profile-review'],
      },
      {
        id: 'profile-basic',
        kind: 'group',
        label: '基本资料',
        layout: 'tab',
        children: [],
      },
      {
        id: 'profile-extra',
        kind: 'group',
        label: '补充资料',
        layout: 'tab',
        children: [],
      },
      {
        id: 'profile-review',
        kind: 'group',
        label: '确认资料',
        layout: 'tab',
        children: [],
      },
    );
    document.ui.nodes[0].children?.push('profile-tabs');
    render(<DesignerHarness initial={document} />);

    const components = screen.getByRole('tab', { name: '组件' });
    fireEvent.keyDown(components, { key: 'End' });
    expect(screen.getByRole('tab', { name: '结构' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: '结构' }), { key: 'Home' });
    expect(components.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(components, { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('tab', { name: '结构' }), { key: 'ArrowRight' });
    fireEvent.keyDown(components, { key: 'PageDown' });
    expect(components.getAttribute('aria-selected')).toBe('true');

    const properties = screen.getByRole('tab', { name: '属性' });
    fireEvent.keyDown(properties, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Agent' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Agent' }), { key: 'Home' });
    fireEvent.keyDown(properties, { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Agent' }), { key: 'ArrowRight' });
    fireEvent.keyDown(properties, { key: 'PageDown' });
    expect(properties.getAttribute('aria-selected')).toBe('true');

    const basic = screen.getByRole('tab', { name: '基本资料' });
    fireEvent.keyDown(basic, { key: 'End' });
    expect(screen.getByRole('tab', { name: '确认资料' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    fireEvent.keyDown(screen.getByRole('tab', { name: '确认资料' }), { key: 'Home' });
    fireEvent.keyDown(basic, { key: 'ArrowLeft' });
    fireEvent.keyDown(screen.getByRole('tab', { name: '确认资料' }), { key: 'ArrowRight' });
    fireEvent.keyDown(basic, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: '补充资料' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    fireEvent.keyDown(screen.getByRole('tab', { name: '补充资料' }), { key: 'ArrowLeft' });
    fireEvent.keyDown(basic, { key: 'PageDown' });
    expect(basic.getAttribute('aria-selected')).toBe('true');
  });

  it('adds, configures, previews, deletes and restores fields in Chinese', () => {
    render(<DesignerHarness />);
    const designer = screen.getByTestId('form-designer');
    expect(designer).toBeTruthy();
    const insertionGuide = screen.getByRole('note');
    expect(insertionGuide.textContent).toContain('点击追加');
    expect(insertionGuide.textContent).toContain('拖拽可精确插入');
    expect(screen.getByText(/编译通过/)).toBeTruthy();
    expect(designer.querySelector('.workspace-header')).toBeNull();
    expect(designer.querySelector('.toolbar')).toBeTruthy();
    expect(designer.querySelector('[data-workspace-identity]')).toBeTruthy();
    expect(designer.querySelector('[data-workspace-actions]')).toBeTruthy();
    expect(
      screen.getByRole('complementary', { name: '组件与表单结构' }).matches('.task-pane.tabs'),
    ).toBe(true);
    expect(screen.getByRole('complementary', { name: '属性面板' }).matches('.task-pane.tabs')).toBe(
      true,
    );
    const undo = screen.getByRole('button', { name: '撤销' });
    expect(undo.classList.contains('btn')).toBe(true);
    expect(undo.getAttribute('data-variant')).toBe('ghost');
    expect(screen.getByLabelText('字段标题').closest('.field')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /单行文本/ }));
    expect(screen.getByTestId('designer-document').textContent).toContain('field-1');
    expect(screen.getByLabelText('字段组件').closest('.a3s-form-select-control')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('字段标题'), { target: { value: '联系电话' } });
    fireEvent.change(screen.getByLabelText('字段组件'), { target: { value: 'textarea' } });
    fireEvent.change(screen.getByLabelText('字段说明'), { target: { value: '请留下联系方式' } });
    fireEvent.change(screen.getByLabelText('占位提示'), { target: { value: '手机或座机' } });
    fireEvent.change(screen.getByLabelText('栅格宽度'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.click(screen.getByRole('switch', { name: '必填字段' }));
    expect(screen.getByRole('button', { name: /联系电话/ })).toBeTruthy();
    expect(screen.getByTestId('designer-document').textContent).toContain('请留下联系方式');

    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    fireEvent.change(screen.getByLabelText('联系电话'), { target: { value: '010-12345678' } });
    expect((screen.getByLabelText('联系电话') as HTMLTextAreaElement).value).toBe('010-12345678');
    fireEvent.click(screen.getByRole('button', { name: '设计' }));
    fireEvent.click(screen.getByRole('tab', { name: '属性' }));
    fireEvent.click(screen.getByRole('button', { name: '删除字段' }));
    expect(screen.queryByRole('button', { name: /联系电话/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '撤销' }));
    expect(screen.getByRole('button', { name: /联系电话/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '重做' }));
    expect(screen.queryByRole('button', { name: /联系电话/ })).toBeNull();
  });

  it('keeps common component settings visible and technical settings in A3S UI disclosures', () => {
    render(<DesignerHarness />);
    const inspector = screen.getByRole('complementary', { name: '属性面板' });
    const advancedHeading = within(inspector).getByText('高级配置');
    const advanced = advancedHeading.closest('details') as HTMLDetailsElement;
    const widget = within(inspector).getByLabelText('字段组件');

    expect(advanced.open).toBe(false);
    expect(widget.closest('details')).toBe(advanced);
    expect(within(inspector).getByLabelText('占位提示').closest('details')).not.toBe(advanced);
    fireEvent.click(advancedHeading.closest('summary') as HTMLElement);
    expect(advanced.open).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '添加星级评分字段' }));
    const ratingMinimum = within(inspector).getByLabelText('最低评分');
    const ratingMaximum = within(inspector).getByLabelText('最高评分');
    expect(ratingMinimum.classList.contains('input')).toBe(true);
    expect(ratingMinimum.closest('.a3s-form-inline-controls')).toBe(
      ratingMaximum.closest('.a3s-form-inline-controls'),
    );

    fireEvent.click(screen.getByRole('button', { name: '添加滑块字段' }));
    const sliderMinimum = within(inspector).getByLabelText('滑块最小值');
    const sliderMaximum = within(inspector).getByLabelText('滑块最大值');
    expect(sliderMinimum.closest('.a3s-form-inline-controls')).toBe(
      sliderMaximum.closest('.a3s-form-inline-controls'),
    );
    expect(within(inspector).getByLabelText('滑块步长').classList.contains('input')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '添加隐藏值字段' }));
    expect(within(inspector).queryByLabelText('字段标题')).toBeNull();
    expect(within(inspector).getByLabelText('默认值').closest('.field')).toBeTruthy();
  });

  it('uses authored repeater copy in the A3S UI runtime', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加重复项字段' }));
    fireEvent.change(screen.getByLabelText('重复项占位提示'), {
      target: { value: '输入路由标签' },
    });
    fireEvent.change(screen.getByLabelText('重复项添加按钮文案'), {
      target: { value: '添加标签' },
    });
    fireEvent.change(screen.getByLabelText('重复项空状态文案'), {
      target: { value: '还没有路由标签' },
    });

    fireEvent.change(screen.getByLabelText('重复项占位提示'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('重复项添加按钮文案'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('重复项空状态文案'), { target: { value: '' } });
    let repeater = currentDocument().ui.nodes.find((node) => node.kind === 'repeater');
    expect(repeater?.customProps?.itemPlaceholder).toBeUndefined();
    expect(repeater?.customProps?.addLabel).toBeUndefined();
    expect(repeater?.customProps?.emptyLabel).toBeUndefined();

    fireEvent.change(screen.getByLabelText('重复项占位提示'), {
      target: { value: '输入路由标签' },
    });
    fireEvent.change(screen.getByLabelText('重复项添加按钮文案'), {
      target: { value: '添加标签' },
    });
    fireEvent.change(screen.getByLabelText('重复项空状态文案'), {
      target: { value: '还没有路由标签' },
    });
    repeater = currentDocument().ui.nodes.find((node) => node.kind === 'repeater');
    expect(repeater?.customProps).toEqual(
      expect.objectContaining({
        itemPlaceholder: '输入路由标签',
        addLabel: '添加标签',
        emptyLabel: '还没有路由标签',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    expect(screen.getByText('还没有路由标签')).toBeTruthy();
    const add = screen.getByRole('button', { name: '添加标签' });
    expect(add.classList.contains('btn')).toBe(true);
    fireEvent.click(add);
    expect(screen.getByPlaceholderText('输入路由标签').classList.contains('input')).toBe(true);
  });

  it('edits schema defaults and switches option fields between static and host data sources', () => {
    render(<DesignerHarness />);

    fireEvent.click(screen.getByRole('button', { name: '选择姓名' }));
    fireEvent.change(screen.getByLabelText('默认值'), { target: { value: '未命名' } });
    expect(currentDocument().schema.properties?.name?.default).toBe('未命名');

    fireEvent.click(screen.getByRole('button', { name: '选择启用' }));
    fireEvent.change(screen.getByLabelText('默认状态'), { target: { value: 'true' } });
    expect(currentDocument().schema.properties?.active?.default).toBe(true);
    fireEvent.change(screen.getByLabelText('默认状态'), { target: { value: '' } });
    expect(currentDocument().schema.properties?.active?.default).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: '选择角色' }));
    const source = screen.getByLabelText('选项来源');
    expect((source as HTMLSelectElement).value).toBe('roles');
    expect(screen.getByText('test.roles')).toBeTruthy();

    fireEvent.change(source, { target: { value: '' } });
    let document = currentDocument();
    let role = document.ui.nodes.find((node) => node.id === 'role');
    expect(role?.dataSource).toBeUndefined();
    expect(role?.options).toEqual([
      { label: 'admin', value: 'admin' },
      { label: 'member', value: 'member' },
    ]);

    fireEvent.change(screen.getByLabelText('选项来源'), { target: { value: 'roles' } });
    document = currentDocument();
    role = document.ui.nodes.find((node) => node.id === 'role');
    expect(role?.dataSource).toBe('roles');
    expect(role?.options).toBeUndefined();
  });

  it('reviews revision-bound structured patches and rejects malformed input', () => {
    const document = compileForm(createDocument()).document as FormDocument;
    render(<DesignerHarness initial={document} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Agent' }));
    expect(screen.getByText('Agent 补丁')).toBeTruthy();
    expect(screen.getByText('载入模板或粘贴 Agent 生成的补丁。')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: '校验并应用补丁' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      within(screen.getByLabelText('FormPatch 当前状态')).getByText(String(document.revision)),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '载入空补丁' }));
    expect((screen.getByLabelText('FormPatch JSON') as HTMLTextAreaElement).value).toContain(
      `"baseRevision": ${document.revision}`,
    );
    const editor = screen.getByLabelText('FormPatch JSON');
    fireEvent.change(editor, {
      target: { value: JSON.stringify({ baseRevision: document.revision }) },
    });
    expect(screen.getByText('operations 必须是数组。')).toBeTruthy();
    fireEvent.change(editor, {
      target: { value: JSON.stringify({ baseRevision: 'current', operations: [] }) },
    });
    expect(screen.getByText('baseRevision 必须是数字。')).toBeTruthy();
    fireEvent.change(editor, { target: { value: '{invalid' } });
    fireEvent.click(screen.getByRole('button', { name: '校验并应用补丁' }));
    expect(screen.getByText('补丁不是有效 JSON，请检查后重试。')).toBeTruthy();

    fireEvent.change(editor, {
      target: {
        value: JSON.stringify({
          apiVersion: 'a3s.dev/form-patch/v1alpha1',
          baseRevision: document.revision,
          operations: [{ op: 'set', path: '/metadata/title', value: 'AI 审阅后的表单' }],
        }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '校验并应用补丁' }));
    expect(screen.getByText(/已应用 1 项受控变更/)).toBeTruthy();
    expect(screen.getByTestId('designer-document').textContent).toContain('AI 审阅后的表单');
  });

  it('forwards preview actions to the embedding host', async () => {
    let action = '';
    const document = compileForm(createDocument()).document as FormDocument;
    function Harness() {
      const [value, setValue] = useState<JsonObject>({ name: '张三' });
      return (
        <FormDesigner
          document={document}
          onChange={() => undefined}
          value={value}
          onValueChange={setValue}
          onAction={(id) => {
            action = id;
          }}
        />
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    await waitFor(() => expect(action).toBe('submit'));
  });

  it('creates mainstream layout presets and edits structural items', () => {
    render(<DesignerHarness />);
    const selectRoot = () => fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));

    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加两栏布局' }));
    let document = currentDocument();
    const columns = document.ui.nodes.find((node) => node.layout === 'columns');
    expect(columns?.children).toHaveLength(2);
    expect(
      columns?.children?.map((id) => document.ui.nodes.find((node) => node.id === id)?.width),
    ).toEqual([6, 6]);

    fireEvent.click(screen.getByRole('button', { name: '添加单行文本字段' }));
    document = currentDocument();
    const firstColumn = document.ui.nodes.find((node) => node.id === columns?.children?.[0]);
    expect(document.ui.nodes.find((node) => node.id === document.ui.root)?.children).toContain(
      'field-1',
    );
    expect(firstColumn?.children).not.toContain('field-1');

    const columnTransfer = dragTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: '添加数字字段' }), {
      dataTransfer: columnTransfer,
    });
    fireEvent.drop(screen.getByRole('button', { name: `插入到${firstColumn?.id}第1位` }), {
      dataTransfer: columnTransfer,
    });
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === firstColumn?.id)?.children).toContain(
      'field-2',
    );

    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加标签页' }));
    document = currentDocument();
    const tabs = document.ui.nodes.find((node) => node.layout === 'tabs');
    expect(tabs?.children).toHaveLength(2);
    fireEvent.click(
      within(screen.getByRole('complementary', { name: '属性面板' })).getByRole('button', {
        name: '添加标签页',
      }),
    );
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === tabs?.id)?.children).toHaveLength(3);

    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加多步向导' }));
    document = currentDocument();
    const wizard = document.ui.nodes.find((node) => node.layout === 'wizard');
    expect(wizard?.children).toHaveLength(3);
    expect(
      wizard?.children?.map((id) => document.ui.nodes.find((node) => node.id === id)?.pageRole),
    ).toEqual(['form', 'form', 'review']);
    expect(screen.getByLabelText('向导步骤')).toBeTruthy();
    fireEvent.click(
      within(screen.getByRole('complementary', { name: '属性面板' })).getByRole('button', {
        name: '添加步骤',
      }),
    );
    document = currentDocument();
    const wizardPages = document.ui.nodes.find((node) => node.id === wizard?.id)?.children ?? [];
    expect(wizardPages).toHaveLength(4);
    expect(document.ui.nodes.find((node) => node.id === wizardPages.at(-1))?.pageRole).toBe(
      'review',
    );

    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加折叠面板' }));
    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加卡片分组' }));
    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加分隔线' }));
    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加间距' }));
    document = currentDocument();
    expect(document.ui.nodes.some((node) => node.layout === 'collapse')).toBe(true);
    expect(document.ui.nodes.some((node) => node.layout === 'card')).toBe(true);
    expect(document.ui.nodes.some((node) => node.presentation === 'divider')).toBe(true);
    expect(document.ui.nodes.some((node) => node.presentation === 'spacer')).toBe(true);

    fireEvent.change(screen.getByLabelText('间距高度'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: '移动' }));
    expect(screen.getByTestId('designer-canvas').querySelector('.is-mobile')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    expect(screen.getByRole('tablist')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: '标签页 2' }));
  });

  it('manages column ratios, pages and the fixed wizard review step from the inspector', () => {
    render(<DesignerHarness />);
    const selectRoot = () => fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));

    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加两栏布局' }));
    const columnsId = currentDocument().ui.nodes.find((node) => node.layout === 'columns')?.id;
    fireEvent.change(screen.getByLabelText('栏位比例'), { target: { value: '4,8' } });
    let document = currentDocument();
    const columns = document.ui.nodes.find((node) => node.id === columnsId);
    expect(
      columns?.children?.map((id) => document.ui.nodes.find((node) => node.id === id)?.width),
    ).toEqual([4, 8]);

    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加标签页' }));
    const tabsId = currentDocument().ui.nodes.find((node) => node.layout === 'tabs')?.id;
    fireEvent.change(screen.getByLabelText('标签页 1 名称'), { target: { value: '概览' } });
    runCollectionAction('标签页 标签页 2', '上移标签页 标签页 2');
    runCollectionAction('标签页 概览', '复制标签页 概览');
    document = currentDocument();
    const tabs = document.ui.nodes.find((node) => node.id === tabsId);
    expect(
      tabs?.children?.map((id) => document.ui.nodes.find((node) => node.id === id)?.label),
    ).toEqual(['标签页 2', '概览', '概览 副本']);
    runCollectionAction('标签页 概览 副本', '删除标签页 概览 副本');
    expect(currentDocument().ui.nodes.find((node) => node.id === tabsId)?.children).toHaveLength(2);

    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加折叠面板' }));
    const collapseId = currentDocument().ui.nodes.find((node) => node.layout === 'collapse')?.id;
    fireEvent.change(screen.getByLabelText('折叠面板 1 名称'), {
      target: { value: '连接设置' },
    });
    runCollectionAction('折叠面板 面板 2', '上移折叠面板 面板 2');
    document = currentDocument();
    const collapse = document.ui.nodes.find((node) => node.id === collapseId);
    expect(
      collapse?.children?.map((id) => document.ui.nodes.find((node) => node.id === id)?.label),
    ).toEqual(['面板 2', '连接设置']);

    selectRoot();
    fireEvent.click(screen.getByRole('button', { name: '添加多步向导' }));
    fireEvent.change(screen.getByLabelText('步骤 1 名称'), { target: { value: '填写资料' } });
    const reviewActions = screen.getByLabelText('步骤 确认提交 操作');
    fireEvent.click(reviewActions);
    expect(
      screen.getByRole('menuitem', { name: '上移步骤 确认提交' }) as HTMLButtonElement,
    ).toHaveProperty('disabled', true);
    expect(
      screen.getByRole('menuitem', { name: '复制步骤 确认提交' }) as HTMLButtonElement,
    ).toHaveProperty('disabled', true);
    fireEvent.click(reviewActions);
    fireEvent.click(screen.getByRole('button', { name: '添加步骤' }));
    document = currentDocument();
    const wizard = document.ui.nodes.find((node) => node.layout === 'wizard');
    expect(
      wizard?.children?.map((id) => document.ui.nodes.find((node) => node.id === id)?.pageRole),
    ).toEqual(['form', 'form', 'form', 'review']);
  });

  it('keeps the wizard review role unique when step types change', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加多步向导' }));

    let document = currentDocument();
    const wizard = document.ui.nodes.find((node) => node.layout === 'wizard');
    const originalFirstId = wizard?.children?.[0];
    const originalReviewId = wizard?.children?.at(-1);
    fireEvent.change(screen.getByLabelText('步骤 1 类型'), { target: { value: 'review' } });

    document = currentDocument();
    let children = document.ui.nodes.find((node) => node.id === wizard?.id)?.children ?? [];
    expect(children.at(-1)).toBe(originalFirstId);
    expect(
      children.map((id) => document.ui.nodes.find((node) => node.id === id)?.pageRole),
    ).toEqual(['form', 'form', 'review']);
    expect(document.ui.nodes.find((node) => node.id === originalReviewId)?.pageRole).toBe('form');
    expect(screen.getByText('3 项 · 含确认步骤')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('步骤 3 类型'), { target: { value: 'form' } });
    expect(screen.getByText('3 项 · 无确认步骤')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '添加步骤' }));

    document = currentDocument();
    children = document.ui.nodes.find((node) => node.id === wizard?.id)?.children ?? [];
    expect(children).toHaveLength(4);
    expect(
      children.map((id) => document.ui.nodes.find((node) => node.id === id)?.pageRole),
    ).toEqual(['form', 'form', 'form', 'form']);

    fireEvent.click(screen.getByRole('button', { name: '多步向导' }));
    fireEvent.change(screen.getByLabelText('步骤 4 类型'), { target: { value: 'review' } });
    document = currentDocument();
    children = document.ui.nodes.find((node) => node.id === wizard?.id)?.children ?? [];
    expect(
      children.filter(
        (id) => document.ui.nodes.find((node) => node.id === id)?.pageRole === 'review',
      ),
    ).toHaveLength(1);
    expect(document.ui.nodes.find((node) => node.id === children.at(-1))?.pageRole).toBe('review');
  });

  it('supports palette drops, exact reordering and cross-container moves', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加两栏布局' }));
    const columns = currentDocument().ui.nodes.find((node) => node.layout === 'columns');
    const firstColumnId = columns?.children?.[0] as string;

    const fieldTransfer = dragTransfer();
    const nameNode = window.document.querySelector('[data-node-id="name"]') as HTMLElement;
    fireEvent.dragStart(nameNode, { dataTransfer: fieldTransfer });
    const columnDrop = screen.getByRole('button', { name: `插入到${firstColumnId}第1位` });
    fireEvent.dragEnter(columnDrop, { dataTransfer: fieldTransfer });
    expect(columnDrop.className).toContain('is-active');
    fireEvent.dragLeave(columnDrop, { dataTransfer: fieldTransfer });
    expect(columnDrop.className).not.toContain('is-active');
    fireEvent.dragEnter(columnDrop, { dataTransfer: fieldTransfer });
    fireEvent.drop(columnDrop, { dataTransfer: fieldTransfer });
    let document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === firstColumnId)?.children).toEqual(['name']);
    expect(document.ui.nodes.find((node) => node.id === document.ui.root)?.children).not.toContain(
      'name',
    );

    const catalogTransfer = dragTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: '添加数字字段' }), {
      dataTransfer: catalogTransfer,
    });
    fireEvent.drop(screen.getByRole('button', { name: `插入到${firstColumnId}第1位` }), {
      dataTransfer: catalogTransfer,
    });
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === firstColumnId)?.children?.[0]).toBe(
      'field-1',
    );

    const roleTransfer = dragTransfer();
    fireEvent.dragStart(window.document.querySelector('[data-node-id="role"]') as HTMLElement, {
      dataTransfer: roleTransfer,
    });
    fireEvent.drop(screen.getByRole('button', { name: '插入到root第1位' }), {
      dataTransfer: roleTransfer,
    });
    expect(currentDocument().ui.nodes.find((node) => node.id === 'root')?.children?.[0]).toBe(
      'role',
    );

    const reorderTransfer = dragTransfer();
    fireEvent.dragStart(window.document.querySelector('[data-node-id="role"]') as HTMLElement, {
      dataTransfer: reorderTransfer,
    });
    fireEvent.drop(screen.getByRole('button', { name: '插入到root第5位' }), {
      dataTransfer: reorderTransfer,
    });
    expect(
      currentDocument()
        .ui.nodes.find((node) => node.id === 'root')
        ?.children?.at(-1),
    ).toBe('role');
    fireEvent.click(screen.getByRole('button', { name: '下移节点' }));

    const rootTransfer = dragTransfer();
    rootTransfer.setData('application/x-a3s-form-node', 'root');
    fireEvent.drop(screen.getByRole('button', { name: '插入到root第1位' }), {
      dataTransfer: rootTransfer,
    });
    const selfTransfer = dragTransfer();
    selfTransfer.setData('application/x-a3s-form-node', firstColumnId);
    fireEvent.drop(screen.getByRole('button', { name: `插入到${firstColumnId}第1位` }), {
      dataTransfer: selfTransfer,
    });
    const missingTransfer = dragTransfer();
    missingTransfer.setData('application/x-a3s-form-node', 'missing-node');
    fireEvent.drop(screen.getByRole('button', { name: '插入到root第1位' }), {
      dataTransfer: missingTransfer,
    });

    const cycleTransfer = dragTransfer();
    fireEvent.dragStart(
      window.document.querySelector(`[data-node-id="${columns?.id}"]`) as HTMLElement,
      { dataTransfer: cycleTransfer },
    );
    const revision = currentDocument().revision;
    fireEvent.drop(screen.getByRole('button', { name: `插入到${firstColumnId}第2位` }), {
      dataTransfer: cycleTransfer,
    });
    expect(currentDocument().revision).toBe(revision);
  });

  it('duplicates nested layouts and configures options, rules and numeric constraints', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加两栏布局' }));
    const layout = currentDocument().ui.nodes.find((node) => node.layout === 'columns');
    const heading = window.document.querySelector(
      `[data-node-id="${layout?.id}"] .a3s-form-design-container-heading > button`,
    ) as HTMLButtonElement;
    fireEvent.click(heading);
    fireEvent.click(
      within(screen.getByRole('complementary', { name: '属性面板' })).getByRole('button', {
        name: '复制节点',
      }),
    );
    let document = currentDocument();
    expect(document.ui.nodes.filter((node) => node.layout === 'columns')).toHaveLength(2);
    expect(document.ui.nodes.filter((node) => node.layout === 'flow')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: '上移节点' }));
    fireEvent.click(screen.getByRole('button', { name: '下移节点' }));

    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加下拉选择字段' }));
    fireEvent.change(screen.getByLabelText('字段选项'), {
      target: { value: '研发部\n产品部\n运营部' },
    });
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.click(screen.getByRole('switch', { name: '必填字段' }));
    fireEvent.click(screen.getByRole('switch', { name: '只读字段' }));
    fireEvent.click(screen.getByRole('switch', { name: '默认隐藏' }));
    expect(screen.queryByLabelText('最小字符数')).toBeNull();
    document = currentDocument();
    const selectNode = document.ui.nodes.find(
      (node) => node.widget === 'select' && node.id.startsWith('field-'),
    );
    const selectProperty = selectNode?.schemaPath?.replace('/properties/', '') as string;
    expect(selectNode?.options?.map((option) => option.label)).toEqual([
      '研发部',
      '产品部',
      '运营部',
    ]);
    expect(selectNode?.readOnly).toBe(true);
    expect(selectNode?.hidden).toBe(true);
    expect(document.schema.properties?.[selectProperty]?.minLength).toBeUndefined();

    fireEvent.click(screen.getByRole('tab', { name: '属性' }));
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加单行文本字段' }));
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.change(screen.getByLabelText('最小字符数'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('最大字符数'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('格式规则'), { target: { value: '^[a-z-]+$' } });

    fireEvent.click(screen.getByRole('tab', { name: '属性' }));
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加数字字段' }));
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.change(screen.getByLabelText('最小值'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('最大值'), { target: { value: '99' } });
    fireEvent.change(screen.getByLabelText('数值步长'), { target: { value: '0.25' } });
    document = currentDocument();
    const numberNode = document.ui.nodes.find(
      (node) => node.widget === 'number' && node.id.startsWith('field-'),
    );
    const numberProperty = numberNode?.schemaPath?.replace('/properties/', '') as string;
    expect(document.schema.properties?.[numberProperty]?.minimum).toBe(1);
    expect(document.schema.properties?.[numberProperty]?.maximum).toBe(99);
    expect(document.schema.properties?.[numberProperty]?.multipleOf).toBe(0.25);

    fireEvent.click(screen.getByRole('tab', { name: '属性' }));
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加标签字段' }));
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.change(screen.getByLabelText('最少标签数'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('最多标签数'), { target: { value: '8' } });
    expect(screen.queryByRole('switch', { name: '标签不可重复' })).toBeNull();
    document = currentDocument();
    const tagsNode = document.ui.nodes.find(
      (node) => node.widget === 'tags' && node.id.startsWith('field-'),
    );
    const tagsProperty = tagsNode?.schemaPath?.replace('/properties/', '') as string;
    expect(document.schema.properties?.[tagsProperty]).toEqual(
      expect.objectContaining({ minItems: 1, maxItems: 8, uniqueItems: true }),
    );
  });

  it('keeps choice values stable while labels, order and availability change', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加下拉选择字段' }));

    fireEvent.change(screen.getByLabelText('选项 1 标签'), {
      target: { value: '研发部' },
    });
    let document = currentDocument();
    let field = document.ui.nodes.find(
      (node) => node.widget === 'select' && node.id.startsWith('field-'),
    );
    expect(field?.options).toEqual([
      { label: '研发部', value: 'option-1' },
      { label: '选项二', value: 'option-2' },
    ]);

    const firstValue = screen.getByLabelText('选项 1 提交值');
    fireEvent.change(firstValue, { target: { value: 'engineering' } });
    fireEvent.blur(firstValue);
    document = currentDocument();
    field = document.ui.nodes.find((node) => node.id === field?.id);
    let property = field?.schemaPath?.replace('/properties/', '') as string;
    expect(field?.options?.[0]?.value).toBe('engineering');
    expect(document.schema.properties?.[property]?.enum).toEqual(['engineering', 'option-2']);

    const secondValue = screen.getByLabelText('选项 2 提交值');
    fireEvent.change(secondValue, { target: { value: 'engineering' } });
    fireEvent.blur(secondValue);
    expect(screen.getByRole('alert').textContent).toBe('提交值必须唯一。');
    document = currentDocument();
    field = document.ui.nodes.find((node) => node.id === field?.id);
    expect(field?.options?.[1]?.value).toBe('option-2');

    runCollectionAction('选项 研发部', '下移选项 研发部');
    document = currentDocument();
    field = document.ui.nodes.find((node) => node.id === field?.id);
    property = field?.schemaPath?.replace('/properties/', '') as string;
    expect(field?.options?.map(({ value }) => value)).toEqual(['option-2', 'engineering']);
    expect(document.schema.properties?.[property]?.enum).toEqual(['option-2', 'engineering']);

    runCollectionAction('选项 研发部', '停用选项 研发部');
    document = currentDocument();
    field = document.ui.nodes.find((node) => node.id === field?.id);
    expect(field?.options?.find(({ value }) => value === 'engineering')?.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '添加选项' }));
    document = currentDocument();
    field = document.ui.nodes.find((node) => node.id === field?.id);
    expect(field?.options?.at(-1)).toEqual({ label: '新选项 3', value: 'option-3' });
  });

  it('keeps choice defaults aligned with edited and removed submitted values', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加下拉选择字段' }));
    fireEvent.change(screen.getByLabelText('默认选项'), {
      target: { value: JSON.stringify('option-1') },
    });

    let submittedValue = screen.getByLabelText('选项 1 提交值');
    fireEvent.change(submittedValue, { target: { value: 'engineering' } });
    fireEvent.blur(submittedValue);
    let document = currentDocument();
    let field = document.ui.nodes.find(
      (node) => node.widget === 'select' && node.id.startsWith('field-'),
    );
    let property = field?.schemaPath?.replace('/properties/', '') as string;
    expect(document.schema.properties?.[property]?.default).toBe('engineering');

    runCollectionAction('选项 选项一', '删除选项 选项一');
    document = currentDocument();
    field = document.ui.nodes.find((node) => node.id === field?.id);
    property = field?.schemaPath?.replace('/properties/', '') as string;
    expect(document.schema.properties?.[property]?.default).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加多选字段' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '默认选择：选项一' }));
    submittedValue = screen.getByLabelText('选项 1 提交值');
    fireEvent.change(submittedValue, { target: { value: 'primary' } });
    fireEvent.blur(submittedValue);
    document = currentDocument();
    field = document.ui.nodes.find(
      (node) => node.widget === 'multi-select' && node.id.startsWith('field-'),
    );
    property = field?.schemaPath?.replace('/properties/', '') as string;
    expect(document.schema.properties?.[property]?.default).toEqual(['primary']);

    runCollectionAction('选项 选项一', '删除选项 选项一');
    document = currentDocument();
    field = document.ui.nodes.find((node) => node.id === field?.id);
    property = field?.schemaPath?.replace('/properties/', '') as string;
    expect(document.schema.properties?.[property]?.default).toBeUndefined();
  });

  it('keeps dynamic option fields explicit and seeds static options when the source changes', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '选择角色' }));
    expect(screen.getByText('test.roles')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('选项来源'), { target: { value: '' } });

    expect((screen.getByLabelText('选项 1 标签') as HTMLInputElement).value).toBe('admin');
    expect((screen.getByLabelText('选项 2 标签') as HTMLInputElement).value).toBe('member');
    fireEvent.click(screen.getByRole('button', { name: '添加选项' }));

    const document = currentDocument();
    const field = document.ui.nodes.find((node) => node.id === 'role');
    const property = field?.schemaPath?.replace('/properties/', '') as string;
    expect(field?.options?.at(-1)).toEqual({ label: '新选项 3', value: 'option-3' });
    expect(document.schema.properties?.[property]?.enum).toEqual(['admin', 'member', 'option-3']);
  });

  it('keeps the final static option instead of applying an invalid empty enum', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加下拉选择字段' }));

    runCollectionAction('选项 选项一', '删除选项 选项一');

    fireEvent.click(screen.getByLabelText('选项 选项二 操作'));
    expect(
      (screen.getByRole('menuitem', { name: '删除选项 选项二' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('avoids empty settings sections and duplicate boolean labels on the canvas', () => {
    const { container } = render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加开关字段' }));

    expect(screen.getByRole('heading', { name: '字段内容' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '组件与数据' })).toBeNull();
    expect(screen.getByRole('heading', { name: '组件类型与初始值' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /设置$/ })).toBeNull();
    expect(screen.getByRole('heading', { name: '位置与宽度' })).toBeTruthy();
    expect(screen.queryByLabelText('占位提示')).toBeNull();
    expect(screen.queryByLabelText('字段选项')).toBeNull();
    const toggle = container.querySelector<HTMLInputElement>(
      '.a3s-form-design-widget input[role="switch"]',
    );
    expect(toggle).toBeTruthy();
    expect(toggle?.disabled).toBe(false);
    const field = toggle?.parentElement;
    expect(field?.classList.contains('field')).toBe(true);
    expect(field?.getAttribute('data-orientation')).toBe('horizontal');
    expect(field?.getAttribute('data-preview-state')).toBe('sample');
    expect(field?.hasAttribute('inert')).toBe(true);
    expect(Array.from(field?.children ?? []).map((child) => child.tagName)).toEqual([
      'INPUT',
      'LABEL',
    ]);
  });

  it('does not expose contradictory availability settings for fixed-output fields', () => {
    render(<DesignerHarness />);

    fireEvent.click(screen.getByRole('button', { name: '添加隐藏值字段' }));
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    expect(screen.getByRole('switch', { name: '必填字段' })).toBeTruthy();
    expect(screen.queryByRole('switch', { name: '只读字段' })).toBeNull();
    expect(screen.queryByRole('switch', { name: '默认隐藏' })).toBeNull();
    expect(screen.getByText('隐藏值没有可见控件。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '添加计算结果字段' }));
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    expect(screen.getByRole('switch', { name: '必填字段' })).toBeTruthy();
    expect(screen.queryByRole('switch', { name: '只读字段' })).toBeNull();
    expect(screen.queryByRole('switch', { name: '默认隐藏' })).toBeNull();
    expect(screen.getByText('计算结果固定为只读输出。')).toBeTruthy();
  });

  it('shows computed-rule ownership and preserves imported column ratios', () => {
    const imported = createDocument();
    if (!imported.schema.properties) throw new Error('Missing schema properties.');
    imported.schema.properties.total = { type: 'number', default: 0 };
    imported.ui.nodes[0].children?.push('total', 'custom-columns');
    imported.ui.nodes.push(
      {
        id: 'total',
        kind: 'field',
        label: '合计',
        schemaPath: '/properties/total',
        widget: 'calculated',
        readOnly: true,
      },
      {
        id: 'custom-columns',
        kind: 'group',
        label: '自定义栏位',
        layout: 'columns',
        children: ['custom-left', 'custom-right'],
      },
      {
        id: 'custom-left',
        kind: 'group',
        label: '左栏',
        layout: 'flow',
        width: 5,
        children: [],
      },
      {
        id: 'custom-right',
        kind: 'group',
        label: '右栏',
        layout: 'flow',
        children: [],
      },
    );
    imported.rules = [
      ...(imported.rules ?? []),
      {
        id: 'calculate-total',
        target: 'total',
        kind: 'computed',
        expression: { op: 'literal', value: 0 },
      },
    ];

    render(<DesignerHarness initial={imported} />);
    fireEvent.click(screen.getByRole('button', { name: '选择合计' }));
    expect(screen.getByText('由表单计算规则更新')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '自定义栏位' }));
    const ratio = screen.getByLabelText('栏位比例') as HTMLSelectElement;
    expect(ratio.value).toBe('5,12');
    expect(within(ratio).getByRole('option', { name: '当前比例' })).toBeTruthy();
  });

  it('makes required collection fields reject an empty array', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加多选字段' }));
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));

    const required = screen.getByRole('switch', { name: '必填字段' });
    fireEvent.click(required);
    let document = currentDocument();
    let field = document.ui.nodes.find((node) => node.widget === 'multi-select');
    let property = field?.schemaPath?.split('/').at(-1) as string;
    expect(document.schema.properties?.[property]?.minItems).toBe(1);

    fireEvent.click(required);
    document = currentDocument();
    field = document.ui.nodes.find((node) => node.widget === 'multi-select');
    property = field?.schemaPath?.split('/').at(-1) as string;
    expect(document.schema.properties?.[property]?.minItems).toBe(0);
  });

  it('keeps rating boundaries inside the supported A3S UI range', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加星级评分字段' }));
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));

    const minimum = screen.getByLabelText('最小值');
    const maximum = screen.getByLabelText('最大值');
    for (const control of [minimum, maximum]) {
      expect(control.getAttribute('min')).toBe('1');
      expect(control.getAttribute('max')).toBe('10');
      expect(control.getAttribute('step')).toBe('1');
      expect(control.classList.contains('input')).toBe(true);
    }
  });

  it('covers layout settings, remaining native components and canvas actions', () => {
    render(<DesignerHarness />);
    const selectRoot = () => fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    const addAtRoot = (name: string) => {
      selectRoot();
      fireEvent.click(screen.getByRole('button', { name }));
    };

    selectRoot();
    fireEvent.change(screen.getByLabelText('表单标题'), { target: { value: '供应商登记' } });
    fireEvent.change(screen.getByLabelText('表单说明'), { target: { value: '请完善企业资料' } });
    fireEvent.change(screen.getByLabelText('画布栏数'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('画布间距'), { target: { value: '8' } });

    addAtRoot('添加栅格容器');
    fireEvent.change(screen.getByLabelText('容器标题'), { target: { value: '联系人信息' } });
    fireEvent.change(screen.getByLabelText('容器说明'), { target: { value: '主要联系人' } });
    fireEvent.change(screen.getByLabelText('内部栏数'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('内部间距'), { target: { value: '24' } });
    addAtRoot('添加三栏布局');
    addAtRoot('添加单选项字段');
    fireEvent.change(screen.getByLabelText('字段选项'), { target: { value: '甲\n乙' } });
    addAtRoot('添加开关字段');
    addAtRoot('添加重复项字段');

    let document = currentDocument();
    const repeater = document.ui.nodes.find((node) => node.kind === 'repeater');
    const repeaterView = window.document.querySelector(
      `[data-node-id="${repeater?.id}"]`,
    ) as HTMLElement;
    fireEvent.click(within(repeaterView).getByRole('button', { name: '复制节点' }));
    document = currentDocument();
    const repeaterCopy = document.ui.nodes.find(
      (node) => node.kind === 'repeater' && node.id !== repeater?.id,
    );
    const repeaterCopyView = window.document.querySelector(
      `[data-node-id="${repeaterCopy?.id}"]`,
    ) as HTMLElement;
    fireEvent.click(within(repeaterCopyView).getByRole('button', { name: '删除节点' }));

    addAtRoot('添加邮箱字段');
    addAtRoot('添加密码字段');
    addAtRoot('添加日期字段');
    addAtRoot('添加说明文字');
    fireEvent.change(screen.getByLabelText('说明文字内容'), { target: { value: '提交前请核对' } });
    addAtRoot('添加分隔线');
    fireEvent.change(screen.getByLabelText('分隔线标题'), { target: { value: '补充资料' } });
    addAtRoot('添加折叠面板');
    fireEvent.click(
      within(screen.getByRole('complementary', { name: '属性面板' })).getByRole('button', {
        name: '添加折叠面板',
      }),
    );

    expect(currentDocument().metadata.title).toBe('供应商登记');
    expect(currentDocument().ui.nodes.some((node) => node.layout === 'grid')).toBe(true);
    expect(
      currentDocument()
        .ui.nodes.filter((node) => node.layout === 'columns')
        .at(-1)?.children,
    ).toHaveLength(3);
    expect(screen.getByText('主要联系人')).toBeTruthy();
    expect(screen.getByText('提交前请核对')).toBeTruthy();
    expect(screen.getByText('补充资料')).toBeTruthy();
  });

  it('authors object repeater templates with nested field schemas', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加重复字段组' }));

    let document = currentDocument();
    const repeater = document.ui.nodes.find(
      (node) =>
        node.kind === 'repeater' &&
        node.schemaPath &&
        document.schema.properties?.[node.schemaPath.split('/').at(-1) as string]?.items?.type ===
          'object',
    );
    expect(repeater).toBeTruthy();
    const repeaterProperty = repeater?.schemaPath?.replace('/properties/', '') as string;
    expect(document.schema.properties?.[repeaterProperty]?.items?.type).toBe('object');

    const fieldTransfer = dragTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: '添加单行文本字段' }), {
      dataTransfer: fieldTransfer,
    });
    fireEvent.drop(screen.getByRole('button', { name: `插入到${repeater?.id}第1位` }), {
      dataTransfer: fieldTransfer,
    });
    fireEvent.change(screen.getByLabelText('字段标题'), { target: { value: '联系人姓名' } });
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.click(screen.getByRole('switch', { name: '必填字段' }));

    document = currentDocument();
    const updatedRepeater = document.ui.nodes.find((node) => node.id === repeater?.id);
    const child = document.ui.nodes.find((node) => updatedRepeater?.children?.includes(node.id));
    expect(child?.schemaPath).toMatch(
      new RegExp(`^/properties/${repeaterProperty}/items/properties/`),
    );
    const childProperty = child?.schemaPath?.split('/').at(-1) as string;
    const itemSchema = document.schema.properties?.[repeaterProperty]?.items;
    expect(itemSchema?.properties?.[childProperty]?.title).toBe('单行文本');
    expect(itemSchema?.required).toContain(childProperty);
    expect(compileForm(document).ok).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    fireEvent.click(screen.getByRole('button', { name: '添加一项' }));
    expect(screen.getByLabelText('联系人姓名')).toBeTruthy();
  });

  it('authors an immediately usable editable data grid and switches its row layout', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加数据表格' }));

    let document = currentDocument();
    const grid = document.ui.nodes.find(
      (node) => node.kind === 'repeater' && node.layout === 'data-grid',
    );
    expect(grid?.children).toHaveLength(3);
    expect(
      grid?.children?.map((id) => document.ui.nodes.find((node) => node.id === id)?.label),
    ).toEqual(['名称', '数量', '备注']);
    expect(compileForm(document).ok).toBe(true);
    expect(screen.getByRole('table', { name: '数据表格设计预览' })).toBeTruthy();
    expect(
      Array.from(
        screen
          .getByRole('table', { name: '数据表格设计预览' })
          .querySelectorAll<HTMLTableCellElement>('tbody td'),
      ).map((cell) => cell.dataset.columnLabel),
    ).toEqual(['名称', '数量', '备注']);

    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    expect(screen.getByRole('table', { name: '数据表格' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '添加一行' }));
    expect(screen.getByLabelText('名称')).toBeTruthy();
    expect(screen.getByLabelText('数量')).toBeTruthy();
    expect(screen.getByLabelText('备注')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '设计' }));
    fireEvent.click(screen.getByRole('button', { name: '数据表格' }));
    fireEvent.change(screen.getByLabelText('表格编辑方式'), { target: { value: 'dialog' } });
    fireEvent.click(screen.getByRole('switch', { name: '启用虚拟滚动' }));
    fireEvent.change(screen.getByLabelText('虚拟滚动区域高度'), {
      target: { value: '560' },
    });
    fireEvent.click(screen.getByText('批处理').closest('summary') as HTMLElement);
    fireEvent.click(screen.getByRole('switch', { name: '允许多行选择' }));
    fireEvent.click(screen.getByRole('switch', { name: '允许批量粘贴' }));
    fireEvent.click(screen.getByRole('switch', { name: '允许向下填充' }));
    fireEvent.click(screen.getByText('当前视图').closest('summary') as HTMLElement);
    fireEvent.click(screen.getByRole('switch', { name: '允许单列排序' }));
    fireEvent.click(screen.getByRole('switch', { name: '显示跨列筛选' }));
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid).toEqual({
      editMode: 'dialog',
      selection: 'multiple',
      paste: 'append',
      fill: 'down',
      sorting: 'single',
      filtering: 'search',
      virtualization: {
        mode: 'rows',
        viewportHeight: 560,
      },
    });

    fireEvent.click(screen.getByRole('switch', { name: '允许批量粘贴' }));
    fireEvent.click(screen.getByRole('switch', { name: '允许向下填充' }));
    fireEvent.click(screen.getByRole('switch', { name: '允许单列排序' }));
    fireEvent.click(screen.getByRole('switch', { name: '显示跨列筛选' }));
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid).toMatchObject({
      paste: 'none',
      fill: 'none',
      sorting: 'none',
      filtering: 'none',
    });

    fireEvent.click(screen.getByRole('switch', { name: '启用虚拟滚动' }));
    document = currentDocument();
    expect(
      document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid?.virtualization,
    ).toBeUndefined();
    fireEvent.click(screen.getByRole('switch', { name: '启用虚拟滚动' }));
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid).toMatchObject({
      editMode: 'dialog',
      virtualization: { mode: 'rows', viewportHeight: 480 },
    });

    fireEvent.click(screen.getByRole('switch', { name: '允许多行选择' }));
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid).toMatchObject({
      selection: 'none',
      fill: 'none',
    });
    fireEvent.click(screen.getByRole('switch', { name: '允许向下填充' }));
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid).toMatchObject({
      selection: 'multiple',
      fill: 'down',
    });

    fireEvent.change(screen.getByLabelText('表格编辑方式'), { target: { value: 'inline' } });
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid).toMatchObject({
      editMode: 'inline',
    });
    expect(
      document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid?.virtualization,
    ).toBeUndefined();
    fireEvent.click(screen.getByRole('switch', { name: '启用虚拟滚动' }));
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid).toMatchObject({
      editMode: 'dialog',
      virtualization: { mode: 'rows', viewportHeight: 480 },
    });

    fireEvent.change(screen.getByLabelText('行展示方式'), { target: { value: 'flow' } });
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.layout).toBe('flow');
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.dataGrid).toBeUndefined();

    fireEvent.change(screen.getByLabelText('行展示方式'), { target: { value: 'data-grid' } });
    document = currentDocument();
    expect(document.ui.nodes.find((node) => node.id === grid?.id)?.layout).toBe('data-grid');
  });

  it('keeps unlabeled and incomplete imported data grids recoverable in Designer', () => {
    const unlabeled = createObjectRepeaterDocument();
    const grid = unlabeled.ui.nodes.find((node) => node.id === 'recipients');
    const column = unlabeled.ui.nodes.find((node) => node.id === 'recipient-name');
    if (!grid || !column) throw new Error('Missing data-grid fixture nodes.');
    grid.layout = 'data-grid';
    delete grid.label;
    delete column.label;

    const { unmount } = render(<DesignerHarness initial={unlabeled} />);
    expect(screen.getByRole('table', { name: 'recipients设计预览' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'recipient-name' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    expect(screen.getByRole('table', { name: 'recipients' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'recipient-name' })).toBeTruthy();
    unmount();

    const incomplete = createObjectRepeaterDocument();
    const incompleteGrid = incomplete.ui.nodes.find((node) => node.id === 'recipients');
    if (!incompleteGrid) throw new Error('Missing incomplete data-grid fixture node.');
    incompleteGrid.layout = 'data-grid';
    incompleteGrid.children = undefined;
    delete incompleteGrid.label;

    render(<RawDesignerHarness initial={incomplete} />);
    const group = screen.getByRole('group', { name: 'recipients' });
    expect(within(group).getByText('列标题来自字段名称，窄屏按行展示。')).toBeTruthy();
    expect(within(group).queryByRole('table')).toBeNull();
    fireEvent.click(within(group).getByRole('button', { name: '布局容器' }));
    expect(
      (
        screen.getByRole('option', {
          name: '数据表格（先添加直接字段）',
        }) as HTMLOptionElement
      ).disabled,
    ).toBe(true);
  });

  it('edits repeatable-group limits through the validation inspector', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加重复字段组' }));
    let document = currentDocument();
    const repeater = document.ui.nodes.find(
      (node) =>
        node.kind === 'repeater' &&
        node.schemaPath &&
        document.schema.properties?.[node.schemaPath.split('/').at(-1) as string]?.items?.type ===
          'object',
    );
    if (!repeater?.schemaPath) throw new Error('Missing authored repeater.');

    fireEvent.click(screen.getByRole('button', { name: repeater.label }));
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.change(screen.getByLabelText('最少列表项数'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('最多列表项数'), { target: { value: '4' } });

    document = currentDocument();
    const schema = document.schema.properties?.[repeater.schemaPath.split('/').at(-1) as string];
    expect(schema?.minItems).toBe(1);
    expect(schema?.maxItems).toBe(4);
    expect(compileForm(document).ok).toBe(true);

    fireEvent.change(screen.getByLabelText('最少列表项数'), { target: { value: '' } });
    expect(
      currentDocument().schema.properties?.[repeater.schemaPath.split('/').at(-1) as string]
        ?.minItems,
    ).toBeUndefined();
  });

  it('moves schemas across repeater scope and duplicates complete row templates', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加重复字段组' }));
    const authored = currentDocument();
    const repeater = authored.ui.nodes.find(
      (node) =>
        node.kind === 'repeater' &&
        node.schemaPath &&
        authored.schema.properties?.[node.schemaPath.split('/').at(-1) as string]?.items?.type ===
          'object',
    );
    if (!repeater) throw new Error('Missing authored repeater.');

    const moveInto = dragTransfer();
    fireEvent.dragStart(window.document.querySelector('[data-node-id="name"]') as HTMLElement, {
      dataTransfer: moveInto,
    });
    fireEvent.drop(screen.getByRole('button', { name: `插入到${repeater.id}第1位` }), {
      dataTransfer: moveInto,
    });
    let document = currentDocument();
    const nestedName = document.ui.nodes.find((node) => node.id === 'name');
    expect(nestedName?.schemaPath).toBe(`${repeater.schemaPath}/items/properties/name`);
    expect(document.schema.properties?.name).toBeUndefined();
    expect(
      document.schema.properties?.[repeater.schemaPath?.split('/').at(-1) as string]?.items
        ?.required,
    ).toContain('name');
    expect(compileForm(document).ok).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: repeater.label }));
    fireEvent.click(
      within(screen.getByRole('complementary', { name: '属性面板' })).getByRole('button', {
        name: '复制节点',
      }),
    );
    document = currentDocument();
    const repeaters = document.ui.nodes.filter(
      (node) =>
        node.kind === 'repeater' &&
        node.schemaPath &&
        document.schema.properties?.[node.schemaPath.split('/').at(-1) as string]?.items?.type ===
          'object',
    );
    expect(repeaters).toHaveLength(2);
    const clone = repeaters.find((node) => node.id !== repeater.id);
    const clonedName = document.ui.nodes.find((node) => clone?.children?.includes(node.id));
    expect(clonedName?.schemaPath?.startsWith(`${clone?.schemaPath}/items/`)).toBe(true);
    expect(compileForm(document).ok).toBe(true);
  });

  it('duplicates required fields with collision-safe schema keys and protects the last panel', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '选择姓名' }));
    const inspector = screen.getByRole('complementary', { name: '属性面板' });
    fireEvent.click(within(inspector).getByRole('button', { name: '复制节点' }));
    fireEvent.click(screen.getByRole('button', { name: '选择姓名' }));
    fireEvent.click(within(inspector).getByRole('button', { name: '复制节点' }));
    let document = currentDocument();
    expect(document.schema.properties?.name_copy).toBeTruthy();
    expect(document.schema.properties?.name_copy_2).toBeTruthy();
    expect(document.schema.required).toEqual(expect.arrayContaining(['name_copy', 'name_copy_2']));

    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加折叠面板' }));
    document = currentDocument();
    const collapse = document.ui.nodes.find((node) => node.layout === 'collapse');
    const firstPanel = document.ui.nodes.find((node) => node.id === collapse?.children?.[0]);
    const secondPanel = document.ui.nodes.find((node) => node.id === collapse?.children?.[1]);
    fireEvent.click(screen.getByRole('button', { name: firstPanel?.label }));
    fireEvent.click(within(inspector).getByRole('button', { name: '删除节点' }));
    fireEvent.click(screen.getByRole('button', { name: secondPanel?.label }));
    const revision = currentDocument().revision;
    fireEvent.click(within(inspector).getByRole('button', { name: '删除节点' }));
    expect(currentDocument().revision).toBe(revision);
  });

  it('renders sparse layout labels and widget defaults while keeping inspectors editable', async () => {
    const sparse = createDocument();
    sparse.schema = {
      type: 'object',
      properties: {
        choice: { type: 'string' },
        enabled: { type: 'boolean' },
        rows: { type: 'array', items: { type: 'string' } },
        amount: { type: 'number', minimum: 1 },
      },
      required: [],
    };
    sparse.rules = undefined;
    sparse.dataSources = undefined;
    sparse.ui.nodes = [
      {
        id: 'root',
        kind: 'root',
        children: [
          'tabs',
          'collapse',
          'group',
          'radio',
          'switch',
          'repeater',
          'plain-content',
          'spacer',
          'amount',
        ],
      },
      { id: 'tabs', kind: 'group', layout: 'tabs', children: ['tab'] },
      { id: 'tab', kind: 'group', layout: 'tab', children: [] },
      { id: 'collapse', kind: 'group', layout: 'collapse', children: ['panel'] },
      { id: 'panel', kind: 'group', layout: 'collapse-panel', children: [] },
      { id: 'group', kind: 'section', description: '无标题分组', children: [] },
      { id: 'radio', kind: 'field', schemaPath: '/properties/choice', widget: 'radio' },
      { id: 'switch', kind: 'field', schemaPath: '/properties/enabled', widget: 'switch' },
      { id: 'repeater', kind: 'repeater', schemaPath: '/properties/rows' },
      { id: 'plain-content', kind: 'content' },
      { id: 'spacer', kind: 'content', presentation: 'spacer' },
      { id: 'amount', kind: 'field', schemaPath: '/properties/amount', widget: 'number' },
    ];
    render(<RawDesignerHarness initial={sparse} />);
    expect(screen.getByRole('tab', { name: '未命名标签' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '未命名面板' })).toBeTruthy();
    expect(screen.getByText('无标题分组')).toBeTruthy();
    const repeaterPreview = screen.getByRole('group', { name: 'repeater' });
    expect(within(repeaterPreview).getByDisplayValue('列表项').classList.contains('input')).toBe(
      true,
    );
    const previewActions = within(repeaterPreview).getAllByRole('button');
    expect(previewActions).toHaveLength(4);
    expect(previewActions.every((button) => button.classList.contains('btn'))).toBe(true);
    expect(previewActions.at(-1)?.textContent).toContain('添加一项');
    expect(screen.getByText('启用')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: '未命名标签' }));
    expect(within(screen.getByTestId('designer-canvas')).getByText('标签页内容')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '未命名面板' }));
    expect(screen.getAllByRole('button', { name: '删除节点' })).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: '选择plain-content' }));
    expect((screen.getByLabelText('说明文字内容') as HTMLTextAreaElement).value).toBe('');
    fireEvent.change(screen.getByLabelText('说明文字内容'), { target: { value: '说明' } });
    fireEvent.click(screen.getByRole('button', { name: '选择spacer' }));
    expect((screen.getByLabelText('间距高度') as HTMLSelectElement).value).toBe('24');

    const groupHeading = window.document.querySelector(
      '[data-node-id="group"] .a3s-form-design-container-heading > button',
    ) as HTMLButtonElement;
    fireEvent.click(groupHeading);
    expect((screen.getByLabelText('内部栏数') as HTMLSelectElement).value).toBe('12');
    expect((screen.getByLabelText('内部间距') as HTMLSelectElement).value).toBe('16');

    fireEvent.click(screen.getByRole('button', { name: '选择root' }));
    expect((screen.getByRole('tab', { name: '校验' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '选择amount' }));
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.change(screen.getByLabelText('最小值'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '选择root' }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: '属性' }).getAttribute('aria-selected')).toBe('true'),
    );
  });

  it('fails closed for orphan field editing while covering missing schema defaults', () => {
    const orphan = createDocument();
    orphan.schema = { type: 'object', properties: {}, required: [] };
    orphan.rules = undefined;
    orphan.ui.nodes = [
      { id: 'root', kind: 'root', children: [] },
      {
        id: 'orphan-select',
        kind: 'field',
        schemaPath: '/properties/missing',
        widget: 'select',
      },
    ];
    render(<RawDesignerHarness initial={orphan} />);
    fireEvent.change(screen.getByLabelText('字段选项'), { target: { value: '孤立选项' } });
    fireEvent.click(
      within(screen.getByRole('complementary', { name: '属性面板' })).getByRole('button', {
        name: '复制节点',
      }),
    );
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    fireEvent.click(screen.getByRole('switch', { name: '必填字段' }));
    fireEvent.click(screen.getByRole('tab', { name: '属性' }));
    fireEvent.click(screen.getByRole('button', { name: '删除字段' }));
    expect(currentDocument().ui.nodes.map((node) => node.id)).toEqual(['root']);
  });

  it('renders raw fallback, missing-reference and cycle states without recursing forever', () => {
    const fallback = createDocument();
    fallback.metadata.description = undefined;
    fallback.ui.nodes = [
      {
        id: 'root',
        kind: 'root',
        children: [
          'missing',
          'loop',
          'empty-group',
          'empty-tabs',
          'empty-collapse',
          'plain-content',
          'spacer',
        ],
      },
      { id: 'loop', kind: 'group', children: ['loop'] },
      { id: 'orphan-loop', kind: 'group', children: ['orphan-loop'] },
      { id: 'empty-group', kind: 'section', description: '空分组说明' },
      { id: 'empty-tabs', kind: 'group', layout: 'tabs' },
      { id: 'empty-collapse', kind: 'group', layout: 'collapse' },
      { id: 'plain-content', kind: 'content' },
      { id: 'spacer', kind: 'content', presentation: 'spacer' },
    ];
    render(<RawDesignerHarness initial={fallback} />);
    expect(screen.getByText('请填写以下信息')).toBeTruthy();
    expect(screen.getByText('布局存在循环：loop')).toBeTruthy();
    expect(screen.getByText('空分组说明')).toBeTruthy();
    expect(screen.getByText('在属性面板中编辑说明文字。')).toBeTruthy();
    expect(screen.getByText('间距 24px')).toBeTruthy();
    expect(screen.getAllByText('组件点击会加到表单末尾').length).toBeGreaterThan(2);
    fireEvent.click(screen.getByRole('tab', { name: '结构' }));
    expect(screen.getByRole('treeitem', { name: '选择loop' })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: '组件' }));
    const unknownTransfer = dragTransfer();
    unknownTransfer.setData('application/x-a3s-form-catalog', 'unknown-component');
    const rootDrop = screen.getByRole('button', { name: '插入到root第1位' });
    fireEvent.dragOver(rootDrop, { dataTransfer: unknownTransfer });
    fireEvent.drop(rootDrop, { dataTransfer: unknownTransfer });
    const emptyTransfer = dragTransfer();
    fireEvent.drop(rootDrop, { dataTransfer: emptyTransfer });
  });

  it('adds clicked fields at the form root, allocates unique ids and reports patch conflicts', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('tab', { name: '结构' }));
    fireEvent.click(screen.getByRole('treeitem', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('tab', { name: '组件' }));
    fireEvent.click(screen.getByRole('button', { name: '添加单行文本字段' }));
    fireEvent.click(screen.getByRole('button', { name: '添加单行文本字段' }));
    expect(screen.getByTestId('designer-document').textContent).toContain('field-1');
    expect(screen.getByTestId('designer-document').textContent).toContain('field-2');
    const root = currentDocument().ui.root;
    expect(currentDocument().ui.nodes.find((node) => node.id === root)?.children).toEqual(
      expect.arrayContaining(['field-1', 'field-2']),
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Agent' }));
    fireEvent.change(screen.getByLabelText('FormPatch JSON'), {
      target: {
        value: JSON.stringify({
          apiVersion: 'a3s.dev/form-patch/v1alpha1',
          baseRevision: 0,
          operations: [{ op: 'set', path: '/metadata/title', value: '过期补丁' }],
        }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '校验并应用补丁' }));
    expect(screen.getByText(/补丁基于 revision 0/)).toBeTruthy();
    expect(screen.getByTestId('designer-document').textContent).not.toContain('过期补丁');
  });

  it('rejects incompatible direct children before a data-grid mutation', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加数据表格' }));
    const document = currentDocument();
    const grid = document.ui.nodes.find((node) => node.layout === 'data-grid');
    expect(grid).toBeTruthy();

    const transfer = dragTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: '添加折叠面板' }), {
      dataTransfer: transfer,
    });
    fireEvent.drop(
      screen.getByRole('button', {
        name: `插入到${grid?.id}第${(grid?.children?.length ?? 0) + 1}位`,
      }),
      { dataTransfer: transfer },
    );

    expect(currentDocument().revision).toBe(document.revision);
    expect(screen.getByRole('alert').textContent).toContain('数据表格只能直接包含字段');
    expect(screen.queryByText(/may contain only direct field columns/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '添加折叠面板' }));
    const beforeMove = currentDocument();
    const collapse = beforeMove.ui.nodes.find((node) => node.layout === 'collapse');
    const nodeTransfer = dragTransfer();
    fireEvent.dragStart(
      screen
        .getByTestId('form-designer')
        .querySelector(`[data-node-id="${collapse?.id}"]`) as Element,
      { dataTransfer: nodeTransfer },
    );
    fireEvent.drop(
      screen.getByRole('button', {
        name: `插入到${grid?.id}第${(grid?.children?.length ?? 0) + 1}位`,
      }),
      { dataTransfer: nodeTransfer },
    );

    expect(currentDocument().revision).toBe(beforeMove.revision);
    expect(screen.getByRole('alert').textContent).toContain('数据表格只能直接包含字段');
  });

  it('shows compiler diagnostics and an empty inspector for invalid documents', () => {
    const invalid = createDocument();
    invalid.ui.root = 'missing';
    invalid.ui.nodes = [];
    render(<FormDesigner document={invalid} onChange={() => undefined} className="invalid-form" />);
    expect(screen.getByTestId('form-designer').className).toContain('invalid-form');
    expect(screen.getByRole('alert').textContent).toContain('编译诊断');
    expect(screen.getByText('选择一个节点以编辑属性。')).toBeTruthy();
    const preview = screen.getByRole('button', { name: '预览' }) as HTMLButtonElement;
    expect(preview.disabled).toBe(true);
    expect(preview.title).toBe('修复编译问题后再预览');
    fireEvent.click(preview);
    expect(screen.getByTestId('form-designer').getAttribute('data-mode')).toBe('design');
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('keeps sparse optional metadata editable through documented defaults', () => {
    const sparse = createDocument();
    sparse.schema.required = undefined;
    sparse.rules = [];
    sparse.dataSources = [];
    sparse.ui.nodes = [
      { id: 'root', kind: 'root', children: ['name'] },
      { id: 'name', kind: 'field', schemaPath: '/properties/name' },
    ];

    render(<DesignerHarness initial={sparse} />);
    fireEvent.click(screen.getByRole('tab', { name: '结构' }));
    expect(screen.getByRole('treeitem', { name: '选择root' })).toBeTruthy();
    expect(screen.getByRole('treeitem', { name: '选择name' })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: '属性' }));
    expect((screen.getByLabelText('字段标题') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('字段组件') as HTMLSelectElement).value).toBe('text');
    expect((screen.getByLabelText('栅格宽度') as HTMLSelectElement).value).toBe('12');

    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    const required = screen.getByRole('switch', { name: '必填字段' });
    fireEvent.click(required);
    expect(screen.getByTestId('designer-document').textContent).toContain('"required":["name"]');
    fireEvent.click(required);
    expect(screen.getByTestId('designer-document').textContent).toContain('"required":[]');
  });

  it('fails closed for invalid mutations and safely removes cyclic unmapped nodes', () => {
    const invalid = createDocument();
    invalid.ui.root = 'missing-root';
    render(<FormDesigner document={invalid} onChange={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '添加数字字段' }));
    expect(screen.getByText('插入位置不可用，请重新选择画布位置。')).toBeTruthy();

    const cyclic = createDocument();
    cyclic.rules = [];
    cyclic.ui.nodes = [
      { id: 'root', kind: 'root', label: '根节点', children: ['orphan'] },
      { id: 'orphan', kind: 'field', label: '孤立字段', children: ['orphan'] },
    ];
    let changed: FormDocument | undefined;
    const view = render(
      <FormDesigner
        document={cyclic}
        onChange={(next) => {
          changed = next;
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '删除字段' }));
    expect(changed?.ui.nodes.map((node) => node.id)).toEqual(['root']);
    view.unmount();
  });
});
