import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { a3sFlowDagNodeManifestCatalog } from '../src/a3s-flow';
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
    expect(screen.getByText('Any')).toBeTruthy();

    const emptyNode: WorkflowNodeDefinition = {
      ...previewBase,
      type: 'LocalizedEmptyPreview',
      display_name: 'Localized empty preview',
    };
    rerender(<WorkflowNodePreview node={emptyNode} locale="zh-CN" technical={false} />);
    expect(screen.getByText('这个节点没有连接端口。')).toBeTruthy();
    expect(screen.getByText('0 个输入 · 0 个输出')).toBeTruthy();
  });
});
