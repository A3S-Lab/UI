import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type CompiledNode,
  type JsonObject,
  type JsonSchema,
  type JsonValue,
  resolveFormLocaleCatalog,
  type UiNode,
  type UiOption,
} from '../src/core';
import {
  createWorkflowConfigurationWidgetRegistry,
  LangflowNodeConfigurationPanel,
  type WorkflowConfigurationWidgetCallbacks,
  WorkflowFieldAccessory,
} from '../src/react';
import type { FormDataSourceState } from '../src/react/data-source';
import type { FormWidgetProps } from '../src/react/native-widget';
import {
  createLangflowNodeDefaultValue,
  type LangflowNodeDefinition,
  requireLangflowNode,
  WORKFLOW_CONFIGURATION_WIDGETS,
} from '../src/workflow';

const idleDataSource: FormDataSourceState = {
  options: [],
  status: 'ready',
  query: '',
  searchable: false,
  hasMore: false,
  loadingMore: false,
  pageError: false,
  activate: () => undefined,
  setQuery: () => undefined,
  retry: () => undefined,
  loadMore: () => undefined,
};

interface WidgetHarnessProps {
  id: string;
  widget: string;
  initialValue?: JsonValue;
  schema?: JsonSchema;
  options?: UiOption[];
  customProps?: JsonObject;
  disabled?: boolean;
  callbacks?: WorkflowConfigurationWidgetCallbacks;
  labelledBy?: string;
  omitLabel?: boolean;
  omitPlaceholder?: boolean;
}

function WidgetHarness({
  id,
  widget,
  initialValue,
  schema = { type: 'string' },
  options = [],
  customProps,
  disabled = false,
  callbacks = {},
  labelledBy,
  omitLabel = false,
  omitPlaceholder = false,
}: WidgetHarnessProps) {
  const [value, setValue] = useState<JsonValue | undefined>(initialValue);
  const registry = useMemo(() => createWorkflowConfigurationWidgetRegistry(callbacks), [callbacks]);
  const Widget = registry[widget];
  if (!Widget) throw new Error(`Missing widget: ${widget}`);
  const node: UiNode = {
    id,
    kind: 'field',
    label: omitLabel ? undefined : id,
    widget,
    placeholder: omitPlaceholder ? undefined : `Enter ${id}`,
    customProps,
  };
  const props: FormWidgetProps = {
    id: `${id}-control`,
    node,
    valuePath: id,
    schema,
    value,
    disabled,
    invalid: false,
    options,
    dataSource: idleDataSource,
    messages: resolveFormLocaleCatalog('en').messages,
    locale: 'en',
    labelledBy,
    onChange: setValue,
  };
  return (
    <div>
      <Widget {...props} />
      <output data-testid={`${id}-value`}>{JSON.stringify(value)}</output>
    </div>
  );
}

function PanelHarness({
  node,
  callbacks,
  readOnly,
}: {
  node: LangflowNodeDefinition;
  callbacks?: WorkflowConfigurationWidgetCallbacks & {
    onApply?: (value: JsonObject) => void;
    onReset?: (value: JsonObject) => void;
  };
  readOnly?: boolean;
}) {
  const [value, setValue] = useState<JsonObject>(() => createLangflowNodeDefaultValue(node));
  return (
    <>
      <LangflowNodeConfigurationPanel
        node={node}
        value={value}
        onChange={setValue}
        onApply={(next) => callbacks?.onApply?.(next)}
        onReset={(next) => callbacks?.onReset?.(next)}
        onRequestConnection={callbacks?.onRequestConnection}
        onRefreshField={callbacks?.onRefreshField}
        onCopyField={callbacks?.onCopyField}
        onDataDisplayAction={callbacks?.onDataDisplayAction}
        readOnly={readOnly}
      />
      <output data-testid="panel-value">{JSON.stringify(value)}</output>
    </>
  );
}

describe('Langflow node configuration panel', () => {
  it('renders source-order fields, typed ports, advanced settings, and host actions', async () => {
    const node = requireLangflowNode('AMapComponent');
    const applied: JsonObject[] = [];
    const reset: JsonObject[] = [];
    const connections: string[][] = [];
    const refreshed: string[] = [];
    render(
      <PanelHarness
        node={node}
        callbacks={{
          onApply: (value) => applied.push(value),
          onReset: (value) => reset.push(value),
          onRequestConnection: (request) => connections.push([...request.inputTypes]),
          onRefreshField: (request) => refreshed.push(request.nodeId),
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: node.display_name })).toBeTruthy();
    expect(screen.getByText('Agentics')).toBeTruthy();
    expect(document.querySelector('.a3s-form-workflow-node-contract')).toBeTruthy();
    expect(document.querySelector('.a3s-form-workflow-node-ports')).toBeTruthy();
    expect(screen.queryByText('Developer details')).toBeNull();
    expect(
      screen.getByText(`${node.fields.filter((field) => field.show !== false).length} shown`),
    ).toBeTruthy();
    expect(screen.getByText(/advanced/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Reference' }).getAttribute('href')).toBe(
      node.documentation,
    );
    expect(screen.getAllByText('Message').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DataFrame').length).toBeGreaterThan(0);

    const details = document.querySelector('.a3s-form-collapse details');
    expect(details?.hasAttribute('open')).toBe(false);

    fireEvent.change(screen.getByLabelText('Instructions'), {
      target: { value: 'Return one verified result.' },
    });
    fireEvent.change(screen.getByLabelText('Language Model'), { target: { value: 'gpt-5' } });
    expect(screen.getByTestId('panel-value').textContent).toContain('verified result');

    fireEvent.click(screen.getByRole('button', { name: 'Connect Instructions' }));
    expect(connections.at(-1)).toEqual(['Message']);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Language Model' }));
    expect(refreshed).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Choose Input Table connection' }));
    expect(connections.at(-1)).toEqual(['DataFrame', 'Table']);
    expect(screen.getByRole('group', { name: 'Schema workflow input' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Connect Schema' }));
    expect(connections.at(-1)).toEqual(['DataFrame', 'Table']);

    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(applied.at(-1)?.instructions).toBe('Return one verified result.'));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(reset).toHaveLength(1);
    expect(screen.getByTestId('panel-value').textContent).not.toContain('verified result');
  });

  it('supports compact, read-only, beta, legacy, and compile-error states', () => {
    const base = requireLangflowNode('Prompt Template');
    const statusNode: LangflowNodeDefinition = {
      ...base,
      beta: true,
      legacy: true,
      input_types: [],
      output_types: [],
      outputs: [],
      fields: [],
    };
    const { unmount } = render(<PanelHarness node={statusNode} readOnly />);
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('Legacy')).toBeTruthy();
    expect(screen.getByText('No parameters')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Reset' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(document.querySelector('.a3s-form-workflow-node-ports')).toBeNull();
    unmount();

    const broken: LangflowNodeDefinition = {
      ...base,
      type: 'BrokenTable',
      display_name: 'Broken table',
      fields: [
        {
          name: 'rows',
          type: 'table',
          show: true,
          table_schema: [{ name: 'duplicate' }, { name: 'duplicate' }],
        },
      ],
    };
    render(<LangflowNodeConfigurationPanel node={broken} value={{}} onChange={() => undefined} />);
    expect(screen.getByRole('alert').textContent).toContain(
      'This node configuration could not be compiled.',
    );
  });

  it('resolves every workflow category icon with host-provided field configuration', () => {
    const base = requireLangflowNode('Prompt Template');
    const categories = [
      'Files',
      'Knowledge bases',
      'Data',
      'Cassandra',
      'Flow controls',
      'Inputs',
      'Tools',
      'Utilities',
      'Embeddings',
      'Search',
      'Processing',
      'Other',
    ];

    const markup = categories
      .map((category, index) => {
        const node: LangflowNodeDefinition = {
          ...base,
          type: `CategoryIconFixture${index}`,
          display_name: category,
          category,
          categoryLabel: category,
          icon: undefined,
          fields: [],
          input_types: [],
          output_types: [],
          outputs: [],
        };
        return renderToStaticMarkup(
          <LangflowNodeConfigurationPanel
            node={node}
            value={{}}
            buildConfig={{}}
            onChange={() => undefined}
          />,
        );
      })
      .join('');

    for (const index of categories.keys()) {
      expect(markup).toContain(`data-node-type="CategoryIconFixture${index}"`);
    }
  });

  it('describes one-sided node contracts without inventing missing ports', () => {
    const base = requireLangflowNode('Prompt Template');
    const inputOnly: LangflowNodeDefinition = {
      ...base,
      type: 'InputOnly',
      display_name: 'Input only',
      documentation: undefined,
      fields: [],
      input_types: ['Message'],
      output_types: [],
      outputs: [],
    };
    const { unmount } = render(<PanelHarness node={inputOnly} />);
    expect(screen.getByText('No typed outputs')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Reference' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    unmount();

    const outputOnly: LangflowNodeDefinition = {
      ...inputOnly,
      type: 'OutputOnly',
      display_name: 'Output only',
      input_types: [],
      output_types: ['Data'],
    };
    render(<PanelHarness node={outputOnly} />);
    expect(screen.getByText('No typed inputs')).toBeTruthy();
  });

  it('renders wrapped boolean parameters as one compact labelled switch row', () => {
    const base = requireLangflowNode('Prompt Template');
    const booleanNode: LangflowNodeDefinition = {
      ...base,
      type: 'BooleanLayoutFixture',
      display_name: 'Boolean layout fixture',
      fields: [
        {
          name: 'stream_results',
          display_name: 'Stream results',
          info: 'Send each result as soon as it is available.',
          type: 'bool',
          _input_type: 'BoolInput',
          value: true,
          show: true,
        },
      ],
    };

    render(<PanelHarness node={booleanNode} />);

    const control = screen.getByRole('switch', { name: 'Stream results' });
    const field = control.closest('.a3s-form-field');
    expect(field?.classList.contains('is-boolean')).toBe(true);
    expect(field?.getAttribute('data-orientation')).toBe('horizontal');
    expect(screen.getAllByText('Stream results')).toHaveLength(1);
    expect(screen.getAllByText('Send each result as soon as it is available.')).toHaveLength(1);
    expect(control.getAttribute('aria-describedby')?.split(' ')).toHaveLength(1);
  });

  it('keeps semantic group headings visible inside the advanced disclosure', () => {
    render(<PanelHarness node={requireLangflowNode('URLComponent')} />);

    const details = document.querySelector('.a3s-form-collapse details');
    expect(details).toBeTruthy();
    fireEvent.click(details?.querySelector('summary') as HTMLElement);

    expect(
      [
        ...(details?.querySelectorAll(':scope > .a3s-form-group .a3s-form-group > header h2') ??
          []),
      ].map((heading) => heading.textContent),
    ).toEqual(['Behavior', 'Output', 'Runtime', 'Input']);
  });

  it('expands and collapses long field help without duplicating the description', () => {
    const base = requireLangflowNode('Prompt Template');
    const description = 'Long field guidance. '.repeat(12);
    const node: LangflowNodeDefinition = {
      ...base,
      type: 'LongHelpFixture',
      display_name: 'Long help fixture',
      fields: [
        {
          name: 'query',
          display_name: 'Query',
          info: description,
          type: 'str',
          _input_type: 'StrInput',
          show: true,
        },
      ],
    };

    render(<PanelHarness node={node} />);
    const more = screen.getByRole('button', { name: 'Show more help for Query' });
    const help = document.getElementById(more.getAttribute('aria-controls') ?? '');
    fireEvent.click(more);
    expect(screen.getByRole('button', { name: 'Show less help for Query' })).toBeTruthy();
    expect(help?.getAttribute('data-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Show less help for Query' }));
    expect(screen.getByRole('button', { name: 'Show more help for Query' })).toBeTruthy();
    expect(document.querySelectorAll('.a3s-form-help-disclosure > .a3s-form-help')).toHaveLength(1);
  });

  it('routes descriptor copy and data-display actions through the panel host', () => {
    const base = requireLangflowNode('Prompt Template');
    const node: LangflowNodeDefinition = {
      ...base,
      type: 'PanelActionsFixture',
      display_name: 'Panel actions fixture',
      fields: [
        {
          name: 'endpoint',
          display_name: 'Endpoint',
          type: 'str',
          _input_type: 'StrInput',
          value: 'https://example.test/hooks/1',
          copy_field: true,
          show: true,
        },
        {
          name: 'agent_card',
          display_name: 'Agent card',
          type: 'data_display',
          _input_type: 'DataDisplayInput',
          value: { name: 'Research agent' },
          button_text: 'Open card',
          button_icon: 'id-card',
          show: true,
        },
      ],
    };
    const copied: JsonValue[] = [];
    const actions: string[] = [];

    render(
      <PanelHarness
        node={node}
        callbacks={{
          onCopyField: ({ value }) => copied.push(value ?? null),
          onDataDisplayAction: ({ buttonText }) => actions.push(buttonText),
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy Endpoint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open card' }));
    expect(copied).toEqual(['https://example.test/hooks/1']);
    expect(actions).toEqual(['Open card']);
  });
});

describe('Langflow workflow widgets', () => {
  it('combines native entry, connection, refresh, live, and tool-mode behavior', () => {
    const connected: string[][] = [];
    const refreshed: string[] = [];
    const callbacks = {
      onRequestConnection: (request: { inputTypes: readonly string[] }) =>
        connected.push([...request.inputTypes]),
      onRefreshField: (request: { nodeId: string }) => refreshed.push(request.nodeId),
    };
    render(
      <WidgetHarness
        id="Hybrid input"
        widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
        initialValue=""
        customProps={{
          controlWidget: 'text',
          inputTypes: ['Message'],
          refreshButton: true,
          realTimeRefresh: true,
          toolMode: true,
        }}
        callbacks={callbacks}
      />,
    );

    fireEvent.change(screen.getByLabelText('Hybrid input'), { target: { value: 'manual value' } });
    expect(screen.getByTestId('Hybrid input-value').textContent).toContain('manual value');
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Tool input')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Connect Hybrid input' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Hybrid input' }));
    expect(connected).toEqual([['Message']]);
    expect(refreshed).toEqual(['Hybrid input']);
  });

  it('renders pure connections and both model selector modes', () => {
    const connections: string[][] = [];
    const callbacks = {
      onRequestConnection: (request: { inputTypes: readonly string[] }) =>
        connections.push([...request.inputTypes]),
    };
    render(
      <>
        <WidgetHarness
          id="Source"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.connection}
          initialValue={null}
          customProps={{ inputTypes: ['Data', 'JSON'] }}
          callbacks={callbacks}
        />
        <WidgetHarness
          id="Connected source"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.connection}
          initialValue="upstream.output"
          callbacks={callbacks}
        />
        <WidgetHarness
          id="Model select"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.model}
          initialValue="gpt-5"
          options={[
            { label: 'GPT-5', value: 'gpt-5' },
            { label: 'Claude', value: 'claude' },
          ]}
        />
        <WidgetHarness
          id="Model input"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.model}
          initialValue=""
          customProps={{ modelType: 'embedding' }}
        />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose Source connection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Change Connected source connection' }));
    expect(connections).toEqual([['Data', 'JSON'], []]);
    fireEvent.change(screen.getByLabelText('Model select'), { target: { value: 'claude' } });
    expect(screen.getByTestId('Model select-value').textContent).toContain('claude');
    expect(screen.getByPlaceholderText('Enter Model input')).toBeTruthy();
  });

  it('supports tabs, sortable lists, durations, and action pickers', () => {
    render(
      <>
        <WidgetHarness
          id="Mode"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.tabs}
          initialValue="URL"
          options={[
            { label: 'URL', value: 'URL' },
            { label: 'cURL', value: 'cURL' },
          ]}
        />
        <WidgetHarness
          id="Operations"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.sortableList}
          initialValue={[{ name: 'Local', icon: 'hard-drive' }]}
          schema={{ type: 'array', items: {} }}
          customProps={{
            sourceOptions: [
              { name: 'Local', icon: 'hard-drive' },
              { name: 'AWS', icon: 'Amazon' },
            ],
          }}
        />
        <WidgetHarness
          id="Timeout"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.duration}
          initialValue={{ value: 3, unit: 'Days' }}
          schema={{ type: 'object' }}
          customProps={{ sourceOptions: ['Minutes', 'Hours', 'Days'] }}
        />
        <WidgetHarness
          id="Decisions"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.actionPicker}
          initialValue={['Approve', 'Reject']}
          schema={{ type: 'array', items: {} }}
        />
      </>,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'cURL' }));
    expect(screen.getByTestId('Mode-value').textContent).toContain('cURL');
    fireEvent.change(screen.getByLabelText('Add Operations'), { target: { value: 'AWS' } });
    expect(screen.getByTestId('Operations-value').textContent).toContain('AWS');
    fireEvent.click(screen.getByRole('button', { name: 'Move AWS up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move AWS down' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move AWS up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Local' }));
    expect(screen.getByTestId('Operations-value').textContent).not.toContain('Local');

    fireEvent.change(screen.getByLabelText('Timeout value'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Timeout unit'), { target: { value: 'Hours' } });
    expect(screen.getByTestId('Timeout-value').textContent).toContain('Hours');

    fireEvent.click(screen.getByRole('button', { name: 'Remove Reject' }));
    fireEvent.change(screen.getByPlaceholderText('Add a decision'), {
      target: { value: 'Escalate' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Add a decision'), { key: 'Enter' });
    expect(screen.getByTestId('Decisions-value').textContent).toContain('Escalate');
  });

  it('edits JSON, code, prompt variables, MCP configuration, and data displays', () => {
    render(
      <>
        <WidgetHarness
          id="JSON"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.json}
          initialValue={{ enabled: true }}
          schema={{ type: 'object' }}
        />
        <WidgetHarness
          id="JSON string"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.json}
          initialValue="raw"
        />
        <WidgetHarness
          id="Code"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.code}
          initialValue={'return 1;\nreturn 2;'}
        />
        <WidgetHarness
          id="Prompt"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.prompt}
          initialValue="Hello {{user.name}} and {team}"
        />
        <WidgetHarness
          id="MCP"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.mcp}
          initialValue={{ command: 'server' }}
          schema={{ type: 'object' }}
        />
        <WidgetHarness
          id="Display"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.dataDisplay}
          initialValue={{ rows: 2 }}
        />
        <WidgetHarness id="Empty display" widget={WORKFLOW_CONFIGURATION_WIDGETS.dataDisplay} />
      </>,
    );

    const json = screen.getByLabelText('JSON');
    fireEvent.change(json, { target: { value: '{invalid' } });
    expect(screen.getByText('Enter valid JSON to update this value.')).toBeTruthy();
    fireEvent.change(json, { target: { value: '{"enabled":false}' } });
    expect(screen.getByTestId('JSON-value').textContent).toContain('false');
    fireEvent.change(screen.getByLabelText('JSON string'), { target: { value: 'plain text' } });
    expect(screen.getByTestId('JSON string-value').textContent).toContain('plain text');
    expect(screen.getByText('2 lines')).toBeTruthy();
    const expandCode = screen.getByRole('button', { name: 'Expand Code editor' });
    fireEvent.click(expandCode);
    expect(expandCode.getAttribute('aria-expanded')).toBe('true');
    expect(
      expandCode.closest('.a3s-form-workflow-source-editor')?.getAttribute('data-expanded'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Code editor' }));
    expect(screen.getByText('user.name')).toBeTruthy();
    expect(screen.getByText('team')).toBeTruthy();
    expect(screen.getByText('Configuration ready')).toBeTruthy();
    expect((screen.getByLabelText('Display') as HTMLTextAreaElement).value).toContain('"rows": 2');
    expect((screen.getByLabelText('Empty display') as HTMLTextAreaElement).value).toBe(
      'No data available.',
    );
  });

  it('handles single and multiple file values plus disabled callback controls', () => {
    render(
      <>
        <WidgetHarness
          id="File"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.file}
          initialValue=""
          customProps={{ fileTypes: ['csv', '.json'] }}
        />
        <WidgetHarness
          id="Files"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.file}
          initialValue={[]}
          schema={{ type: 'array', items: { type: 'string' } }}
        />
        <WidgetHarness
          id="Disabled hybrid"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          initialValue=""
          disabled
          customProps={{ inputTypes: ['Message'], refreshButton: true }}
        />
      </>,
    );

    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    fireEvent.change(inputs[0], {
      target: { files: [new File(['a'], 'table.csv', { type: 'text/csv' })] },
    });
    fireEvent.change(inputs[1], {
      target: {
        files: [
          new File(['a'], 'one.txt', { type: 'text/plain' }),
          new File(['b'], 'two.txt', { type: 'text/plain' }),
        ],
      },
    });
    expect(screen.getByTestId('File-value').textContent).toContain('table.csv');
    expect(screen.getByTestId('Files-value').textContent).toContain('two.txt');
    expect(
      (screen.getByRole('button', { name: 'Connect Disabled hybrid' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Refresh Disabled hybrid' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('handles fallback values and edge interactions for every specialized control', () => {
    const connections: string[][] = [];
    render(
      <>
        <WidgetHarness
          id="Parameter connection"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          initialValue={null}
          customProps={{
            controlWidget: WORKFLOW_CONFIGURATION_WIDGETS.connection,
            inputTypes: ['Data'],
          }}
          omitLabel
          callbacks={{
            onRequestConnection: (request) => connections.push([...request.inputTypes]),
          }}
        />
        <WidgetHarness
          id="Fallback parameter"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.parameter}
          initialValue=""
          customProps={{ controlWidget: '' }}
        />
        <WidgetHarness
          id="Fallback model"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.model}
          initialValue={{}}
          customProps={{ modelType: 42 }}
          omitLabel
          omitPlaceholder
        />
        <WidgetHarness
          id="Empty operations"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.sortableList}
          initialValue="invalid"
          schema={{ type: 'array', items: {} }}
          customProps={{
            sourceOptions: [null, 7, 'Manual', { icon: 'cloud' }, { name: 'Remote' }],
          }}
          omitLabel
        />
        <WidgetHarness
          id="Fallback duration"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.duration}
          schema={{ type: 'object' }}
          omitLabel
        />
        <WidgetHarness
          id="Empty decisions"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.actionPicker}
          schema={{ type: 'array', items: {} }}
          omitLabel
        />
        <WidgetHarness
          id="Empty code"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.code}
          initialValue={{}}
        />
        <WidgetHarness
          id="Empty prompt"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.prompt}
          initialValue={null}
        />
        <WidgetHarness id="Unconfigured MCP" widget={WORKFLOW_CONFIGURATION_WIDGETS.mcp} />
        <WidgetHarness
          id="Scalar display"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.dataDisplay}
          initialValue={42}
        />
        <WidgetHarness
          id="No file"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.file}
          initialValue={{}}
        />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Choose Parameter connection connection' }));
    expect(connections).toEqual([['Data']]);
    expect(screen.getByLabelText('Fallback parameter')).toBeTruthy();
    expect(screen.getByPlaceholderText('Choose a language model')).toBeTruthy();

    expect(screen.getByText('No operations selected.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Add Empty operations'), {
      target: { value: 'Manual' },
    });
    fireEvent.change(screen.getByLabelText('Add Empty operations'), {
      target: { value: 'Remote' },
    });
    expect(screen.getByTestId('Empty operations-value').textContent).toContain('Remote');

    expect(screen.getByLabelText('Fallback duration unit')).toHaveProperty('value', 'Seconds');
    fireEvent.change(screen.getByLabelText('Fallback duration value'), {
      target: { value: '4' },
    });
    expect(screen.getByTestId('Fallback duration-value').textContent).toContain('Seconds');

    const decisionInput = screen.getByPlaceholderText('Add a decision');
    fireEvent.keyDown(decisionInput, { key: 'Tab' });
    fireEvent.change(decisionInput, { target: { value: 'Route' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(decisionInput, { target: { value: 'Route' } });
    fireEvent.keyDown(decisionInput, { key: 'Enter' });
    expect(screen.getByTestId('Empty decisions-value').textContent).toBe('["Route"]');

    expect(screen.getByText('Empty')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Empty code'), { target: { value: 'return 3;' } });
    fireEvent.change(screen.getByLabelText('Empty prompt'), {
      target: { value: 'Hello {name}' },
    });
    expect(screen.getByText('name')).toBeTruthy();
    expect(screen.getByText('Not configured')).toBeTruthy();
    expect((screen.getByLabelText('Scalar display') as HTMLTextAreaElement).value).toBe('42');

    const fileInput = screen.getByLabelText('No file');
    fireEvent.change(fileInput, { target: { files: null } });
    expect(screen.getByTestId('No file-value').textContent).toBe('""');
  });

  it('renders reusable field accessories for connected and runtime-managed inputs', () => {
    const connected: string[][] = [];
    const refreshed: string[] = [];
    const connectedNode: CompiledNode = {
      id: 'table-schema',
      kind: 'repeater',
      depth: 0,
      label: 'Table schema',
      customProps: { inputTypes: ['DataFrame', 'Table'] },
    };
    const runtimeNode: CompiledNode = {
      id: 'runtime-rows',
      kind: 'repeater',
      depth: 0,
      label: 'Runtime rows',
      customProps: { refreshButton: true, realTimeRefresh: true, toolMode: true },
    };
    const emptyNode: CompiledNode = {
      id: 'empty-rows',
      kind: 'repeater',
      depth: 0,
      label: 'Empty rows',
    };
    render(
      <>
        <WorkflowFieldAccessory
          node={connectedNode}
          valuePath="schema"
          disabled={false}
          callbacks={{
            onRequestConnection: (request) => connected.push([...request.inputTypes]),
          }}
        />
        <WorkflowFieldAccessory
          node={runtimeNode}
          valuePath="rows"
          disabled={false}
          callbacks={{ onRefreshField: (request) => refreshed.push(request.nodeId) }}
        />
        <WorkflowFieldAccessory node={connectedNode} valuePath="readonly" disabled />
        <WorkflowFieldAccessory node={emptyNode} valuePath="empty" disabled={false} />
      </>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Connect Table schema' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh Runtime rows' }));
    expect(connected).toEqual([['DataFrame', 'Table']]);
    expect(refreshed).toEqual(['runtime-rows']);
    expect(screen.getByText('Runtime configured')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Tool input')).toBeTruthy();
    expect(screen.queryByLabelText('Empty rows workflow input')).toBeNull();
    expect(
      (screen.getAllByRole('button', { name: 'Connect Table schema' })[1] as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('uses host-provided accessible labels across specialized controls', () => {
    render(
      <>
        <span id="external-control-label">External value</span>
        <WidgetHarness
          id="External tabs"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.tabs}
          initialValue="One"
          options={[{ label: 'One', value: 'One' }]}
          labelledBy="external-control-label"
        />
        <WidgetHarness
          id="External JSON"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.json}
          initialValue={{}}
          labelledBy="external-control-label"
        />
        <WidgetHarness
          id="External code"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.code}
          initialValue=""
          labelledBy="external-control-label"
        />
        <WidgetHarness
          id="External prompt"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.prompt}
          initialValue=""
          labelledBy="external-control-label"
        />
        <WidgetHarness
          id="External file"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.file}
          initialValue=""
          labelledBy="external-control-label"
        />
        <WidgetHarness
          id="External display"
          widget={WORKFLOW_CONFIGURATION_WIDGETS.dataDisplay}
          initialValue="value"
          labelledBy="external-control-label"
        />
      </>,
    );

    expect(screen.getAllByLabelText('External value')).toHaveLength(6);
  });
});
