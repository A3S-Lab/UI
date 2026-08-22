import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { a3sFlowDagNodeManifestCatalog, requireA3SFlowDagNodeManifest } from '../src/a3s-flow';
import { WorkflowNodePreview } from '../src/react';
import type { WorkflowNodeDefinition } from '../src/workflow';

const previewBase: WorkflowNodeDefinition = {
  category: 'workflow',
  categoryLabel: 'Workflow',
  type: 'PreviewBase',
  display_name: 'Preview base',
  description: 'Workflow preview fixture.',
  beta: false,
  legacy: false,
  official: true,
  tool_mode: false,
  base_classes: ['WorkflowNode'],
  input_types: [],
  output_types: [],
  fields: [],
  outputs: [],
};

describe('Workflow node preview', () => {
  it('renders field-level input ports and declared output ports', () => {
    const node: WorkflowNodeDefinition = {
      ...previewBase,
      type: 'PreviewFixture',
      display_name: 'Preview fixture',
      fields: [
        {
          name: 'model',
          display_name: 'Language model',
          type: 'other',
          input_types: ['LanguageModel'],
          show: true,
        },
        {
          name: 'hidden_context',
          display_name: 'Hidden context',
          type: 'other',
          input_types: ['Data'],
          show: false,
        },
      ],
      outputs: [
        {
          name: 'message',
          display_name: 'Message',
          types: ['Message'],
          group_outputs: false,
          allows_loop: false,
          tool_mode: false,
        },
      ],
    };

    render(<WorkflowNodePreview node={node} />);

    expect(
      screen.getByRole('article', { name: 'Preview fixture workflow node preview' }),
    ).toBeTruthy();
    expect(screen.getByText('Language model')).toBeTruthy();
    expect(screen.queryByText('Hidden context')).toBeNull();
    expect(screen.getAllByText('Message')).toHaveLength(2);
  });

  it('renders every A3S Flow manifest through the reusable graph-node surface', () => {
    const failures = a3sFlowDagNodeManifestCatalog.flatMap((node) => {
      const markup = renderToStaticMarkup(<WorkflowNodePreview node={node} />);
      return markup.includes(`data-node-type="${node.type}"`) ? [] : [node.type];
    });

    expect(failures).toEqual([]);
  });

  it('assigns every public Flow node to an explicit visual family', () => {
    const expectedFamilies: Readonly<Record<string, string>> = {
      'flow.start': 'entry',
      'flow.condition': 'branch',
      'flow.complete': 'terminal',
      'flow.fail': 'terminal',
      'flow.step': 'action',
      'flow.batch': 'action',
      'flow.wait': 'suspension',
      'flow.hook': 'suspension',
      'flow.cancel': 'terminal',
      'flow.timeout': 'terminal',
      'flow.continue-as-new': 'action',
      'flow.progress': 'action',
      'flow.child-operation': 'action',
      'flow.child-workflow': 'action',
      'flow.child-workflows': 'action',
      'flow.signal': 'suspension',
      iteration: 'container',
      loop: 'container',
    };

    const visibleManifests = a3sFlowDagNodeManifestCatalog.filter((manifest) => !manifest.internal);
    expect(visibleManifests).toHaveLength(18);
    for (const manifest of visibleManifests) {
      const markup = renderToStaticMarkup(
        <WorkflowNodePreview node={manifest} ports={manifest.ports} />,
      );
      expect(markup).toContain(`data-node-family="${expectedFamilies[manifest.type]}"`);
    }
  });

  it('renders descriptor fallbacks, unselected nodes, and empty port contracts', () => {
    const fieldFallback: WorkflowNodeDefinition = {
      ...previewBase,
      type: 'FieldFallbackPreview',
      display_name: 'Field fallback preview',
      fields: [
        {
          name: 'source',
          type: 'other',
          input_types: ['Data'],
          show: true,
        },
      ],
      outputs: [
        {
          name: 'result',
          display_name: '',
          types: [],
          group_outputs: false,
          allows_loop: false,
          tool_mode: false,
        },
      ],
    };
    const contractFallback: WorkflowNodeDefinition = {
      ...previewBase,
      type: 'ContractFallbackPreview',
      display_name: 'Contract fallback preview',
      fields: [],
      input_types: ['Data'],
      output_types: ['Message'],
      outputs: [],
      legacy: true,
    };
    const empty: WorkflowNodeDefinition = {
      ...contractFallback,
      type: 'EmptyPreview',
      display_name: 'Empty preview',
      input_types: [],
      output_types: [],
      legacy: false,
    };

    const { rerender } = render(<WorkflowNodePreview node={fieldFallback} selected={false} />);
    expect(screen.getByText('source')).toBeTruthy();
    expect(screen.getByText('result')).toBeTruthy();
    expect(screen.getByText('Any')).toBeTruthy();
    expect(
      screen
        .getByRole('article', { name: 'Field fallback preview workflow node preview' })
        .getAttribute('data-selected'),
    ).toBeNull();

    rerender(<WorkflowNodePreview node={contractFallback} />);
    expect(screen.getByText('Input')).toBeTruthy();
    expect(screen.getByText('Output')).toBeTruthy();
    expect(screen.getByText('Legacy')).toBeTruthy();

    rerender(<WorkflowNodePreview node={empty} />);
    expect(screen.getByText('This node has no typed ports.')).toBeTruthy();
  });

  it('localizes compact previews and resolves the complete workflow category icon set', () => {
    const categories = [
      'Agents',
      'Files',
      'Data',
      'Tools',
      'Embeddings',
      'Processing',
      'Workflow',
      'Other',
    ];
    const markup = categories
      .map((category, index) =>
        renderToStaticMarkup(
          <WorkflowNodePreview
            node={{
              ...previewBase,
              type: `CategoryPreview${index}`,
              display_name: category,
              category,
              categoryLabel: category,
            }}
          />,
        ),
      )
      .join('');

    for (const index of categories.keys()) {
      expect(markup).toContain(`data-node-type="CategoryPreview${index}"`);
    }

    const runtimeNode = {
      ...previewBase,
      type: 'BoundPreview',
      display_name: 'Bound preview',
      beta: true,
      runtimeBinding: 'flow.step',
    } as WorkflowNodeDefinition & { runtimeBinding: string };
    const { rerender } = render(
      <WorkflowNodePreview
        node={runtimeNode}
        locale="zh-CN"
        ports={{
          inputs: [{ id: 'command', label: 'Command', types: [], kind: 'control' }],
          outputs: [{ id: 'result', label: 'Result', types: ['Message'], kind: 'data' }],
        }}
      />,
    );

    expect(screen.getByRole('article', { name: 'Bound preview节点预览' })).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('flow.step')).toBeTruthy();
    expect(screen.getByText('任意类型')).toBeTruthy();

    const emptyNode: WorkflowNodeDefinition = {
      ...previewBase,
      type: 'LocalizedEmptyPreview',
      display_name: 'Localized empty preview',
    };
    rerender(<WorkflowNodePreview node={emptyNode} locale="zh-CN" technical={false} />);
    expect(screen.getByText('这个节点没有连接端口。')).toBeTruthy();
    expect(screen.getByText('0 个输入 · 0 个输出')).toBeTruthy();
  });

  it('renders a concise current-configuration summary without replacing port semantics', () => {
    const node: WorkflowNodeDefinition = {
      ...previewBase,
      type: 'SummaryPreview',
      display_name: 'Summary preview',
      output_types: ['FlowControl'],
    };

    const { container } = render(
      <WorkflowNodePreview
        node={node}
        summary={[
          { id: 'handler', label: 'Handler', value: 'task.run' },
          { id: 'input', label: 'Input', value: 'input.order' },
        ]}
      />,
    );

    const summary = container.querySelector('.a3s-form-workflow-node-preview-summary');
    expect(summary?.getAttribute('aria-label')).toBe('Current configuration');
    expect(summary?.querySelector('[data-summary-id="handler"]')?.textContent).toContain(
      'task.run',
    );
    expect(summary?.querySelector('[data-summary-id="input"]')?.textContent).toContain(
      'input.order',
    );
    expect(screen.getByRole('region', { name: 'Output ports' })).toBeTruthy();
  });

  it('behaves like a selectable canvas node without hiding its workflow identity', () => {
    let selections = 0;
    const node: WorkflowNodeDefinition = {
      ...previewBase,
      type: 'flow.condition',
      display_name: 'Condition',
      description: 'Choose the next branch from workflow data.',
      fields: [
        {
          name: 'value',
          display_name: 'Value',
          type: 'other',
          input_types: ['JsonValue'],
          show: true,
        },
      ],
      outputs: [
        {
          name: 'matched',
          display_name: 'Matched',
          types: ['FlowControl'],
          group_outputs: false,
          allows_loop: false,
          tool_mode: false,
        },
        {
          name: 'otherwise',
          display_name: 'Otherwise',
          types: ['FlowControl'],
          group_outputs: false,
          allows_loop: false,
          tool_mode: false,
        },
      ],
    };

    const { rerender } = render(
      <WorkflowNodePreview
        node={node}
        onSelect={() => {
          selections += 1;
        }}
        status="running"
        technical={false}
      />,
    );

    const preview = screen.getByRole('button', {
      name: 'Condition workflow node preview',
    });
    expect(preview.getAttribute('data-node-shape')).toBe('branch');
    expect(preview.getAttribute('data-node-tone')).toBe('cyan');
    expect(preview.getAttribute('data-status')).toBe('running');
    expect(screen.getByText('Choose the next branch from workflow data.')).toBeTruthy();

    fireEvent.click(preview);
    expect(preview.tagName).toBe('BUTTON');
    expect(selections).toBe(1);

    rerender(
      <WorkflowNodePreview
        node={node}
        onSelect={() => undefined}
        status="error"
        technical={false}
      />,
    );
    expect(screen.getByRole('status', { name: 'Failed' })).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Condition workflow node preview' })
        .getAttribute('data-status'),
    ).toBe('error');
  });

  it('offers next-node actions only from control-flow outputs', () => {
    const condition = requireA3SFlowDagNodeManifest('flow.condition');
    const requested: string[] = [];
    render(
      <WorkflowNodePreview
        node={condition}
        ports={condition.ports}
        technical={false}
        onRequestNext={(port) => requested.push(port.id)}
      />,
    );

    const matched = screen.getByRole('button', { name: 'Add next node from Matched' });
    expect(screen.getByRole('button', { name: 'Add next node from Otherwise' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Value/u })).toBeNull();
    fireEvent.click(matched);
    expect(requested).toEqual(['matched']);
  });

  it('keeps terminal outputs closed and renders structural nodes as scoped canvases', () => {
    for (const type of ['flow.complete', 'flow.fail', 'flow.cancel', 'flow.timeout']) {
      const terminal = requireA3SFlowDagNodeManifest(type);
      const markup = renderToStaticMarkup(
        <WorkflowNodePreview
          node={terminal}
          ports={terminal.ports}
          onRequestNext={() => undefined}
        />,
      );
      expect(markup).toContain('data-node-family="terminal"');
      expect(markup).not.toContain('a3s-form-workflow-node-preview-next');
    }

    const iteration = requireA3SFlowDagNodeManifest('iteration');
    render(
      <WorkflowNodePreview
        node={iteration}
        ports={iteration.ports}
        locale="zh-CN"
        technical={false}
        onRequestNext={() => undefined}
      />,
    );
    expect(screen.getByRole('region', { name: '容器内部画布' })).toBeTruthy();
    expect(screen.getByText('容器起点')).toBeTruthy();
    expect(screen.getByRole('button', { name: '从「Done」添加下一个节点' })).toBeTruthy();
  });
});
