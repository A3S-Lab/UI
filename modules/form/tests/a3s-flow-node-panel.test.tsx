import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import {
  A3S_FLOW_EXPRESSION_API_VERSION,
  createA3SFlowExpression,
  createA3SFlowNodeDefaultValue,
  createA3SFlowNodeForm,
  requireA3SFlowCoreNode,
} from '../src/a3s-flow';
import type { FormDocument, JsonObject } from '../src/core';
import { A3SFlowNodeConfigurationPanel, A3SFlowNodePreview } from '../src/react';
import { WORKFLOW_CONFIGURATION_WIDGETS } from '../src/workflow';

function ControlledPanel({
  type,
  locale = 'en',
  initialValue,
}: {
  type: string;
  locale?: string;
  initialValue?: JsonObject;
}) {
  const node = requireA3SFlowCoreNode(type);
  const [value, setValue] = useState<JsonObject>(
    () => initialValue ?? createA3SFlowNodeDefaultValue(node),
  );
  return (
    <>
      <A3SFlowNodeConfigurationPanel
        node={node}
        value={value}
        onChange={setValue}
        locale={locale}
      />
      <output data-testid="a3s-panel-value">{JSON.stringify(value)}</output>
    </>
  );
}

function controlledValue(): JsonObject {
  return JSON.parse(screen.getByTestId('a3s-panel-value').textContent ?? '{}') as JsonObject;
}

describe('A3S Flow core-node React surfaces', () => {
  it('keeps technical details collapsed in task mode and applies an A3S Flow document', async () => {
    const node = requireA3SFlowCoreNode('flow.step');
    let appliedDocument: FormDocument | undefined;
    let hostValidated = false;

    function Harness() {
      const [value, setValue] = useState<JsonObject>(() => createA3SFlowNodeDefaultValue(node));
      return (
        <A3SFlowNodeConfigurationPanel
          node={node}
          value={value}
          onChange={setValue}
          hostAdapter={{
            validateValue: async () => {
              hostValidated = true;
              return { issues: [] };
            },
          }}
          onApply={(_nextValue, document) => {
            appliedDocument = document;
          }}
        />
      );
    }

    render(<Harness />);

    expect(screen.getByRole('heading', { name: 'Run Step' })).toBeTruthy();
    expect(document.querySelector('.a3s-form-flow-node-panel')).toBeTruthy();
    expect(document.querySelector('.a3s-form-workflow-node-contract')).toBeNull();
    expect(document.querySelector('.a3s-form-workflow-node-ports')).toBeNull();
    const developerDetails = document.querySelector('.a3s-form-workflow-node-developer-details');
    expect(developerDetails?.hasAttribute('open')).toBe(false);
    expect(developerDetails?.textContent).toContain('schedule_step');
    expect(developerDetails?.textContent).toContain('flow.step');
    expect(screen.queryByText('StepResult')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() =>
      expect(appliedDocument?.metadata.compatibility).toEqual([
        'a3s-workflow/v1',
        'a3s-flow/0.4.2',
      ]),
    );
    expect(hostValidated).toBe(true);
  });

  it('renders named ports without visible runtime bindings or type contracts', () => {
    const node = requireA3SFlowCoreNode('flow.wait');
    render(<A3SFlowNodePreview node={node} />);

    const preview = screen.getByLabelText('Wait Until workflow node preview');
    expect(preview.getAttribute('data-runtime-binding')).toBe('wait_until');
    expect(screen.queryByText('wait_until')).toBeNull();
    expect(screen.queryByText('FlowControl')).toBeNull();
    expect(screen.queryByText('DateTime')).toBeNull();
    expect(screen.getByText('In')).toBeTruthy();
    expect(screen.getByText('Resume at')).toBeTruthy();
    expect(screen.getByText('Resumed')).toBeTruthy();
  });

  it('localizes A3S Flow node, field, group, and action copy in Chinese', () => {
    render(<ControlledPanel type="flow.step" locale="zh-CN" />);

    expect(screen.getByRole('heading', { name: '执行步骤' })).toBeTruthy();
    expect(screen.getByText('执行一个已注册任务，按配置重试，并保存执行结果。')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '执行内容' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '节点设置' })).toBeNull();
    expect(screen.getByLabelText('步骤处理器')).toBeTruthy();
    expect(screen.getByText('选择发送给步骤处理器的工作流数据。')).toBeTruthy();
    expect(screen.getByRole('button', { name: '应用配置' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '查看文档' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '恢复默认值' }));
    expect(screen.getByRole('button', { name: '再次点击确认恢复' })).toBeTruthy();
  });

  it('shows recoverable ports only when retry exhaustion continues replay', () => {
    const node = requireA3SFlowCoreNode('flow.step');
    const value = createA3SFlowNodeDefaultValue(node);
    const { rerender } = render(<A3SFlowNodePreview node={node} value={value} />);

    expect(screen.queryByText('Recoverable failure')).toBeNull();
    expect(screen.queryByText('Recoverable error')).toBeNull();

    rerender(
      <A3SFlowNodePreview node={node} value={{ ...value, on_exhausted: 'continue_workflow' }} />,
    );
    expect(screen.getByText('Recoverable failure')).toBeTruthy();
    expect(screen.getByText('Recoverable error')).toBeTruthy();
  });

  it('blocks Apply and displays node-semantic validation errors', async () => {
    const node = requireA3SFlowCoreNode('flow.hook');
    const value = {
      ...createA3SFlowNodeDefaultValue(node),
      token_expression: createA3SFlowExpression({ op: 'literal', value: 'shared-token' }),
    };
    let applied = false;

    render(
      <A3SFlowNodeConfigurationPanel
        node={node}
        value={value}
        onChange={() => undefined}
        onApply={() => {
          applied = true;
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await screen.findByText(
      'Hook token must reference at least one field; shared literals are invalid.',
    );
    expect(applied).toBe(false);
  });

  it('updates comparison and source modes without dropping the expression envelope', () => {
    render(<ControlledPanel type="flow.condition" />);

    fireEvent.change(screen.getByLabelText('Field to evaluate'), {
      target: { value: 'input.score' },
    });
    fireEvent.change(screen.getByLabelText('Comparison operator'), {
      target: { value: 'gt' },
    });
    fireEvent.change(screen.getByLabelText('Comparison value'), {
      target: { value: '10' },
    });
    expect(controlledValue().expression).toEqual({
      apiVersion: A3S_FLOW_EXPRESSION_API_VERSION,
      expression: {
        op: 'gt',
        left: { op: 'field', path: 'input.score' },
        right: { op: 'literal', value: 10 },
      },
    });

    fireEvent.change(screen.getByLabelText('Value source'), {
      target: { value: 'source' },
    });
    fireEvent.change(screen.getByLabelText('Workflow field path'), {
      target: { value: 'steps.review.result' },
    });
    expect(controlledValue().expression).toEqual({
      apiVersion: A3S_FLOW_EXPRESSION_API_VERSION,
      expression: { op: 'field', path: 'steps.review.result' },
    });
  });

  it('keeps an empty structured expression draft in place for focused validation', async () => {
    render(<ControlledPanel type="flow.condition" />);

    const field = screen.getByLabelText('Field to evaluate');
    fireEvent.change(field, { target: { value: '' } });

    expect(screen.getByLabelText('Field to evaluate')).toHaveProperty('value', '');
    expect(screen.queryByLabelText('Advanced expression JSON')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Field to evaluate').getAttribute('aria-invalid')).toBe('true'),
    );
    await waitFor(() => expect(document.activeElement).toBe(field));
  });

  it('updates fixed UTC and template modes inside the expression envelope', () => {
    const { unmount } = render(<ControlledPanel type="flow.wait" />);

    fireEvent.change(screen.getByLabelText('Value source'), {
      target: { value: 'value' },
    });
    fireEvent.change(screen.getByLabelText('Fixed UTC time'), {
      target: { value: '2026-09-01T08:30:00Z' },
    });
    expect(controlledValue().resume_at).toEqual({
      apiVersion: A3S_FLOW_EXPRESSION_API_VERSION,
      expression: { op: 'literal', value: '2026-09-01T08:30:00Z' },
    });
    unmount();

    render(<ControlledPanel type="flow.fail" />);
    fireEvent.change(screen.getByLabelText('Failure message template'), {
      target: { value: 'Step failed: {{input.errorCode}}' },
    });
    expect(controlledValue().error_expression).toEqual({
      apiVersion: A3S_FLOW_EXPRESSION_API_VERSION,
      expression: {
        op: 'concat',
        values: [
          { op: 'literal', value: 'Step failed: ' },
          { op: 'field', path: 'input.errorCode' },
        ],
      },
    });
  });

  it('edits the Start input schema without requiring raw JSON', () => {
    render(<ControlledPanel type="flow.start" />);

    fireEvent.click(screen.getByRole('button', { name: 'Add input field' }));
    const name = screen.getByLabelText('Field name');
    fireEvent.change(name, { target: { value: 'amount' } });
    fireEvent.blur(name);
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'number' } });
    fireEvent.click(screen.getByLabelText('Required'));

    expect(controlledValue().input_schema).toEqual({
      type: 'object',
      additionalProperties: true,
      properties: { amount: { type: 'number' } },
      required: ['amount'],
    });
  });

  it('uses the dedicated Batch editor for object-valued input mappings', () => {
    const node = requireA3SFlowCoreNode('flow.batch');
    const documentDefinition = createA3SFlowNodeForm(node);
    const batchField = documentDefinition.ui.nodes.find(
      (candidate) => candidate.schemaPath === '/properties/steps',
    );

    expect(batchField).toMatchObject({
      kind: 'field',
      widget: WORKFLOW_CONFIGURATION_WIDGETS.flowBatch,
    });
    expect(
      documentDefinition.ui.nodes.some(
        (candidate) =>
          candidate.schemaPath === '/properties/steps/items/properties/input_mapping' &&
          candidate.widget === 'text',
      ),
    ).toBe(false);

    render(<ControlledPanel type="flow.batch" />);
    expect(document.querySelector('.a3s-form-flow-batch')).toBeTruthy();
    expect((screen.getByLabelText('Workflow field path') as HTMLInputElement).value).toBe('input');
  });

  it('adds, reorders, and maps Batch members as structured values', () => {
    render(<ControlledPanel type="flow.batch" />);

    fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
    expect((controlledValue().steps as JsonObject[]).map((member) => member.step_key)).toEqual([
      'member-1',
      'member-2',
    ]);

    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    fireEvent.change(screen.getAllByLabelText('Workflow field path')[0], {
      target: { value: 'input.items' },
    });

    const members = controlledValue().steps as JsonObject[];
    expect(members.map((member) => member.step_key)).toEqual(['member-2', 'member-1']);
    expect(members[0]?.input_mapping).toEqual({
      apiVersion: A3S_FLOW_EXPRESSION_API_VERSION,
      expression: { op: 'field', path: 'input.items' },
    });
  });

  it('renders and focuses nested Batch member errors after Apply', async () => {
    render(<ControlledPanel type="flow.batch" />);

    const memberId = screen.getByLabelText(/^Member ID/);
    fireEvent.change(memberId, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));

    await waitFor(() => expect(memberId.getAttribute('aria-invalid')).toBe('true'));
    expect(memberId.closest('li')?.getAttribute('data-invalid')).toBe('true');
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    await waitFor(() => expect(document.activeElement).toBe(memberId));
  });
});
