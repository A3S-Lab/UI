import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import {
  type A3SFlowCoreNodeDefinition,
  createA3SFlowExpression,
  createA3SFlowNodeDefaultValue,
  localizeA3SFlowCoreNode,
  requireA3SFlowCoreNode,
} from '../src/a3s-flow';
import type { JsonObject } from '../src/core';
import { A3SFlowNodeConfigurationPanel } from '../src/react';

describe('A3S Flow panel adapter branches', () => {
  it('preserves unknown catalog metadata while localizing known options and columns', () => {
    const step = requireA3SFlowCoreNode('flow.step');
    const futureField = { ...step.fields[0], name: 'future_field' };
    const localizedStep = localizeA3SFlowCoreNode(
      {
        ...step,
        fields: [
          ...step.fields.map((field) =>
            field.name === 'on_exhausted'
              ? {
                  ...field,
                  options: [
                    'raw',
                    null,
                    [],
                    { label: 'No value' },
                    { value: 'fail_run', label: 'Old' },
                    { value: 'future', label: 'Future' },
                  ],
                }
              : field,
          ),
          futureField,
        ],
      },
      'zh-CN',
    );
    const options = localizedStep.fields.find((field) => field.name === 'on_exhausted')?.options;
    expect(options).toContain('raw');
    expect(options).toContainEqual({ value: 'fail_run', label: '终止并标记失败' });
    expect(options).toContainEqual({ value: 'future', label: 'Future' });
    expect(localizedStep.fields.at(-1)?.name).toBe('future_field');

    const batch = requireA3SFlowCoreNode('flow.batch');
    const steps = batch.fields.find((field) => field.name === 'steps');
    const columns = Array.isArray(steps?.table_schema) ? steps.table_schema : undefined;
    const column = columns?.[0];
    if (!steps || !column) throw new Error('Missing Batch table schema');
    const input = batch.ports.inputs[0];
    const output = batch.ports.outputs[0];
    const result = batch.outputs[0];
    if (!input || !output || !result) throw new Error('Missing Batch contract');
    const localizedBatch = localizeA3SFlowCoreNode(
      {
        ...batch,
        fields: batch.fields.map((field) =>
          field.name === 'steps'
            ? {
                ...field,
                table_schema: [
                  ...(Array.isArray(field.table_schema) ? field.table_schema : []),
                  { ...column, name: 'future' },
                ],
              }
            : field,
        ),
        outputs: [...batch.outputs, { ...result, name: 'future' }],
        ports: {
          inputs: [...batch.ports.inputs, { ...input, id: 'future-input', label: 'Future input' }],
          outputs: [
            ...batch.ports.outputs,
            { ...output, id: 'future-output', label: 'Future output' },
          ],
        },
      },
      'zh',
    );
    const localizedColumns = localizedBatch.fields[0]?.table_schema;
    expect(
      Array.isArray(localizedColumns) ? localizedColumns.at(-1)?.display_name : undefined,
    ).toBe(column.display_name);
    expect(localizedBatch.outputs.at(-1)?.display_name).toBe(result.display_name);
    expect(localizedBatch.ports.inputs.at(-1)?.label).toBe('Future input');
    expect(localizedBatch.ports.outputs.at(-1)?.label).toBe('Future output');

    const futureNode = { ...step, type: 'flow.future' } as A3SFlowCoreNodeDefinition;
    expect(localizeA3SFlowCoreNode(futureNode, 'zh')).toBe(futureNode);
  });

  it('localizes semantic errors and applies without an optional host validator', async () => {
    const hook = requireA3SFlowCoreNode('flow.hook');
    const invalidHook = {
      ...createA3SFlowNodeDefaultValue(hook),
      token_expression: createA3SFlowExpression({ op: 'literal', value: 'shared-token' }),
    };
    const invalidView = render(
      <A3SFlowNodeConfigurationPanel
        node={hook}
        value={invalidHook}
        locale="zh-CN"
        onChange={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '应用配置' }));
    await screen.findByText('回调令牌必须来自工作流字段，不能使用共享固定值。');
    invalidView.unmount();

    const step = requireA3SFlowCoreNode('flow.step');
    let applied = false;
    function ValidPanel() {
      const [value, setValue] = useState<JsonObject>(() => createA3SFlowNodeDefaultValue(step));
      return (
        <A3SFlowNodeConfigurationPanel
          node={step}
          value={value}
          onChange={setValue}
          buildConfig={{}}
          onApply={() => {
            applied = true;
          }}
        />
      );
    }
    render(<ValidPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    await waitFor(() => expect(applied).toBe(true));
  });
});
