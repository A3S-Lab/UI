import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { playgroundNodeRegistry } from '../apps/playground/src/custom-nodes';
import { sampleForm } from '../apps/playground/src/sample';
import { compileForm, type FormDocument, type JsonObject } from '../src/core';
import {
  defineFormNodeRegistry,
  FormDesigner,
  type FormNodeDesignProps,
  type FormNodeInspectorProps,
  type FormNodeRegistry,
  type FormNodeRenderProps,
} from '../src/react';
import { createDocument } from './fixtures';

function dragTransfer(): DataTransfer {
  const values = new Map<string, string>();
  return {
    effectAllowed: 'none',
    getData: (type: string) => values.get(type) ?? '',
    setData: (type: string, value: string) => values.set(type, value),
  } as unknown as DataTransfer;
}

function RatingDesign({ node }: FormNodeDesignProps) {
  return <div data-testid="rating-design">{node.label} · ☆☆☆☆☆</div>;
}

function RatingRenderer({ node, value, onChange }: FormNodeRenderProps) {
  return (
    <div className="demo-rating-node">
      <strong>{node.label}</strong>
      <button type="button" onClick={() => onChange(4)}>
        设置 4 星
      </button>
      <output>{String(value ?? 0)} 星</output>
    </div>
  );
}

function RatingInspector({ node, onUpdateNode }: FormNodeInspectorProps) {
  return (
    <label>
      最大星数
      <input
        aria-label="最大星数"
        type="number"
        value={Number(node.customProps?.maximum ?? 5)}
        onChange={(event) =>
          onUpdateNode({
            customProps: {
              ...node.customProps,
              maximum: Number(event.target.value),
            },
          })
        }
      />
    </label>
  );
}

function PanelDesign({ node }: FormNodeDesignProps) {
  return <strong data-testid="panel-design">{node.label}</strong>;
}

function PanelRenderer({ node, children }: FormNodeRenderProps) {
  return (
    <section aria-label={node.label}>
      <h2>{node.label}</h2>
      {children}
    </section>
  );
}

function NoticeRenderer({ onChange }: FormNodeRenderProps) {
  return (
    <button type="button" onClick={() => onChange('ignored')}>
      触发无绑定更新
    </button>
  );
}

const nodeRegistry: FormNodeRegistry = defineFormNodeRegistry({
  'company.rating': {
    kind: 'field',
    catalog: {
      section: 'business',
      sectionLabel: '业务组件',
      label: '评分',
      description: '采集一到五星评分',
      glyph: '☆',
    },
    schema: { type: 'number', minimum: 1, maximum: 5 },
    defaults: { width: 6, customProps: { maximum: 5 } },
    design: RatingDesign,
    render: RatingRenderer,
    inspector: RatingInspector,
  },
  'company.panel': {
    kind: 'group',
    catalog: {
      section: 'business',
      sectionLabel: '业务组件',
      label: '业务面板',
      description: '可接收其他字段的业务容器',
      glyph: '▣',
    },
    defaults: { layout: 'flow', columns: 12, gap: 12, width: 12 },
    design: PanelDesign,
    render: PanelRenderer,
  },
  'company.notice': {
    kind: 'content',
    catalog: {
      section: 'business',
      sectionLabel: '业务组件',
      label: '说明',
      description: '展示不绑定表单值的业务说明',
      glyph: '注',
    },
    render: NoticeRenderer,
  },
});

function Harness() {
  const [document, setDocument] = useState<FormDocument>(
    () => compileForm(createDocument()).document as FormDocument,
  );
  const [value, setValue] = useState<JsonObject>({});
  return (
    <>
      <FormDesigner
        document={document}
        onChange={setDocument}
        value={value}
        onValueChange={setValue}
        nodeRegistry={nodeRegistry}
      />
      <output data-testid="custom-document">{JSON.stringify(document)}</output>
      <output data-testid="custom-value">{JSON.stringify(value)}</output>
    </>
  );
}

function PlaygroundHarness() {
  const [document, setDocument] = useState<FormDocument>(() => structuredClone(sampleForm));
  return (
    <FormDesigner
      document={document}
      onChange={setDocument}
      compileOptions={{ capabilities: { widgets: Object.keys(playgroundNodeRegistry) } }}
      nodeRegistry={playgroundNodeRegistry}
    />
  );
}

describe('custom form nodes', () => {
  it('adds the Playground rating extension to the product sample', () => {
    let changed: FormDocument | undefined;
    render(
      <FormDesigner
        document={sampleForm}
        onChange={(next) => {
          changed = next;
        }}
        nodeRegistry={playgroundNodeRegistry}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '添加评分字段' }));
    expect(changed?.ui.nodes.some((node) => node.widget === 'a3s.rating')).toBe(true);
  });

  it('renders the Playground rating extension in interactive preview', () => {
    render(<PlaygroundHarness />);

    expect(screen.getByText(/编译通过/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '选择入职信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加评分字段' }));
    fireEvent.change(screen.getByLabelText('评分最大星数'), { target: { value: '7' } });

    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    expect(screen.getByRole('radio', { name: '4 星' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '7 星' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: '4 星' }));
    expect(screen.getByText('4 / 7')).toBeTruthy();
  });

  it('registers catalog, design, inspector and runtime behavior as one extension', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { name: '业务组件' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '添加评分字段' }));
    expect(screen.getByTestId('rating-design')).toBeTruthy();
    expect(screen.getByTestId('custom-document').textContent).toContain('company.rating');

    fireEvent.change(screen.getByLabelText('最大星数'), { target: { value: '10' } });
    expect(screen.getByTestId('custom-document').textContent).toContain('"maximum":10');

    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    fireEvent.click(screen.getByRole('button', { name: '设置 4 星' }));
    expect(screen.getByTestId('custom-value').textContent).toContain(':4');
    expect(screen.getByText('4 星')).toBeTruthy();
  });

  it('uses the catalog label when a custom node has no instance label', () => {
    const source = createDocument();
    source.ui.nodes.push({
      id: 'custom-notice',
      kind: 'content',
      widget: 'company.notice',
      width: 12,
    });
    source.ui.nodes[0].children?.push('custom-notice');

    const { container } = render(
      <FormDesigner document={source} onChange={() => undefined} nodeRegistry={nodeRegistry} />,
    );

    expect(screen.getByRole('button', { name: '选择custom-notice' })).toBeTruthy();
    expect(container.querySelector('[data-node-type="company.notice"] strong')?.textContent).toBe(
      '说明',
    );
  });

  it('supports custom container nodes with nested drag targets and runtime children', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: '选择基础信息' }));
    fireEvent.click(screen.getByRole('button', { name: '添加业务面板' }));
    expect(screen.getByTestId('panel-design')).toBeTruthy();

    const transfer = dragTransfer();
    fireEvent.dragStart(screen.getByRole('button', { name: '添加单行文本字段' }), {
      dataTransfer: transfer,
    });
    fireEvent.drop(screen.getByRole('button', { name: '插入到custom-1第1位' }), {
      dataTransfer: transfer,
    });
    const documentText = screen.getByTestId('custom-document').textContent ?? '';
    expect(documentText).toContain('company.panel');
    expect(documentText).toContain('"children":["field-1"]');

    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    expect(screen.getByRole('region', { name: '业务面板' })).toBeTruthy();
    expect(screen.getByLabelText('单行文本')).toBeTruthy();
  });

  it('provides a safe design fallback and ignores value updates for unbound nodes', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: '添加说明' }));
    expect(screen.getAllByText('展示不绑定表单值的业务说明').length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    fireEvent.click(screen.getByRole('button', { name: '触发无绑定更新' }));
    expect(screen.getByTestId('custom-value').textContent).toBe('{}');
  });
});
