import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LangflowWorkflowNodePreview } from '../src/react';
import {
  type LangflowNodeDefinition,
  langflowNodeCatalog,
  requireLangflowNode,
} from '../src/workflow';

describe('Langflow workflow node preview', () => {
  it('renders field-level input ports and declared output ports', () => {
    const base = requireLangflowNode('Prompt Template');
    const node: LangflowNodeDefinition = {
      ...base,
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

    render(<LangflowWorkflowNodePreview node={node} />);

    expect(
      screen.getByRole('article', { name: 'Preview fixture workflow node preview' }),
    ).toBeTruthy();
    expect(screen.getByText('Language model')).toBeTruthy();
    expect(screen.queryByText('Hidden context')).toBeNull();
    expect(screen.getAllByText('Message')).toHaveLength(2);
  });

  it('renders all 131 catalog nodes through the reusable graph-node surface', () => {
    const failures = langflowNodeCatalog.flatMap((node) => {
      const markup = renderToStaticMarkup(<LangflowWorkflowNodePreview node={node} />);
      return markup.includes(`data-node-type="${node.type}"`) ? [] : [node.type];
    });

    expect(failures).toEqual([]);
  });

  it('renders descriptor fallbacks, unselected nodes, and empty port contracts', () => {
    const base = requireLangflowNode('Prompt Template');
    const fieldFallback: LangflowNodeDefinition = {
      ...base,
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
    const contractFallback: LangflowNodeDefinition = {
      ...base,
      type: 'ContractFallbackPreview',
      display_name: 'Contract fallback preview',
      fields: [],
      input_types: ['Data'],
      output_types: ['Message'],
      outputs: [],
      legacy: true,
    };
    const empty: LangflowNodeDefinition = {
      ...contractFallback,
      type: 'EmptyPreview',
      display_name: 'Empty preview',
      input_types: [],
      output_types: [],
      legacy: false,
    };

    const { rerender } = render(
      <LangflowWorkflowNodePreview node={fieldFallback} selected={false} />,
    );
    expect(screen.getByText('source')).toBeTruthy();
    expect(screen.getByText('result')).toBeTruthy();
    expect(screen.getByText('Any')).toBeTruthy();
    expect(
      screen
        .getByRole('article', { name: 'Field fallback preview workflow node preview' })
        .getAttribute('data-selected'),
    ).toBeNull();

    rerender(<LangflowWorkflowNodePreview node={contractFallback} />);
    expect(screen.getByText('Input')).toBeTruthy();
    expect(screen.getByText('Output')).toBeTruthy();
    expect(screen.getByText('Legacy')).toBeTruthy();

    rerender(<LangflowWorkflowNodePreview node={empty} />);
    expect(screen.getByText('This node has no typed ports.')).toBeTruthy();
  });
});
