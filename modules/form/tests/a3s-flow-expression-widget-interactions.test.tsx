import { fireEvent, render, screen } from '@testing-library/react';
import { A3S_FLOW_EXPRESSION_API_VERSION, createA3SFlowExpression } from '../src/a3s-flow';
import type { JsonObject } from '../src/core';
import {
  ExpressionHarness,
  expressionValue,
  renderedValue,
  WidgetHarness,
} from './a3s-flow-widget-interactions.helpers';

describe('A3S Flow expression widget interactions', () => {
  it('validates advanced JSON and writes only expressions with an operator', () => {
    const legacyView = render(
      <ExpressionHarness
        id="legacy-expression"
        initialValue={{ apiVersion: 'legacy', expression: { op: 'field', path: 'old' } }}
      />,
    );
    const legacyEditor = screen.getByLabelText('Advanced expression JSON');
    expect((legacyEditor as HTMLTextAreaElement).value).toContain('"path": "old"');
    expect(legacyEditor.getAttribute('aria-invalid')).toBe('true');
    expect(renderedValue('legacy-expression-value')).toEqual({
      apiVersion: 'legacy',
      expression: { op: 'field', path: 'old' },
    });
    legacyView.unmount();

    const malformedView = render(
      <ExpressionHarness
        id="malformed-expression"
        initialValue={{
          apiVersion: A3S_FLOW_EXPRESSION_API_VERSION,
          expression: null,
        }}
      />,
    );
    const malformedEditor = screen.getByLabelText('Advanced expression JSON');
    expect((malformedEditor as HTMLTextAreaElement).value).toBe('null');
    expect(malformedEditor.getAttribute('aria-invalid')).toBe('true');
    expect(renderedValue('malformed-expression-value')).toEqual({
      apiVersion: A3S_FLOW_EXPRESSION_API_VERSION,
      expression: null,
    });
    malformedView.unmount();

    const extraView = render(
      <ExpressionHarness
        id="extra-expression"
        initialValue={{
          ...createA3SFlowExpression({ op: 'field', path: 'input' }),
          extra: true,
        }}
      />,
    );
    expect(screen.getByLabelText('Advanced expression JSON').getAttribute('aria-invalid')).toBe(
      'true',
    );
    extraView.unmount();

    const markerView = render(<ExpressionHarness id="marker-expression" initialValue={[{}]} />);
    expect(screen.getByLabelText('Advanced expression JSON')).toBeTruthy();
    markerView.unmount();

    render(
      <>
        <span id="expression-help">Expression help</span>
        <ExpressionHarness
          id="advanced"
          initialValue={expressionValue({
            op: 'not',
            value: { op: 'literal', value: false },
          })}
          invalid
          describedBy="expression-help"
        />
      </>,
    );

    const editor = screen.getByLabelText('Advanced expression JSON');
    expect(editor.getAttribute('aria-invalid')).toBe('true');
    expect(editor.getAttribute('aria-describedby')).toBe('expression-help');
    expect(screen.getByText('Evaluate the advanced expression.')).toBeTruthy();

    fireEvent.change(editor, { target: { value: '{' } });
    expect(screen.getByRole('alert').textContent).toContain('Invalid expression JSON');
    expect(renderedValue('advanced-value')).toEqual([
      { __a3s_form_invalid_expression_draft__: '{' },
    ]);

    fireEvent.change(editor, { target: { value: 'null' } });
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.change(editor, { target: { value: '{"value":true}' } });
    expect(screen.getByRole('alert')).toBeTruthy();

    fireEvent.change(editor, {
      target: { value: '{"op":"not","value":{"op":"literal","value":true}}' },
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(renderedValue('advanced-value')).toEqual(
      expressionValue({ op: 'not', value: { op: 'literal', value: true } }),
    );
  });

  it('supports host-generated run IDs and Chinese source/preview copy', () => {
    render(
      <ExpressionHarness
        id="run-id"
        purpose="run-id"
        locale="zh-CN"
        initialValue={createA3SFlowExpression({ op: 'literal', value: null })}
      />,
    );

    expect(screen.getByText('无需填写，接入系统会在启动时生成运行 ID。')).toBeTruthy();
    expect(screen.getByText('每次启动时由接入系统创建运行 ID。')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('取值方式'), { target: { value: 'source' } });
    fireEvent.change(screen.getByLabelText('工作流字段路径'), {
      target: { value: 'input.runId' },
    });
    expect(screen.getByText('使用字段 input.runId 的值。')).toBeTruthy();
    expect(renderedValue('run-id-value')).toEqual(
      createA3SFlowExpression({ op: 'field', path: 'input.runId' }),
    );

    fireEvent.change(screen.getByLabelText('取值方式'), { target: { value: 'none' } });
    expect(renderedValue('run-id-value')).toEqual(
      createA3SFlowExpression({ op: 'literal', value: null }),
    );
  });

  it('preserves non-lossless comparisons until the user chooses the structured editor', () => {
    render(
      <ExpressionHarness
        id="condition"
        purpose="condition"
        locale="zh-CN"
        initialValue={expressionValue({
          op: 'gt',
          left: { op: 'literal', value: 1 },
          right: { op: 'field', path: 'input.limit' },
        })}
      />,
    );

    expect(screen.getByLabelText('高级表达式 JSON')).toBeTruthy();
    expect(screen.getByText('… 大于 …')).toBeTruthy();
    expect(renderedValue('condition-value')).toEqual(
      expressionValue({
        op: 'gt',
        left: { op: 'literal', value: 1 },
        right: { op: 'field', path: 'input.limit' },
      }),
    );

    fireEvent.change(screen.getByLabelText('取值方式'), { target: { value: 'source' } });
    fireEvent.change(screen.getByLabelText('取值方式'), { target: { value: 'compare' } });
    expect((screen.getByLabelText('要判断的字段') as HTMLInputElement).value).toBe('input.value');
    expect((screen.getByLabelText('比较值') as HTMLInputElement).value).toBe('true');

    fireEvent.change(screen.getByLabelText('判断方式'), { target: { value: 'contains' } });
    fireEvent.change(screen.getByLabelText('要判断的字段'), {
      target: { value: 'input.tags' },
    });
    fireEvent.change(screen.getByLabelText('比较值'), { target: { value: '   ' } });
    expect(renderedValue('condition-value')).toEqual(
      expressionValue({
        op: 'contains',
        left: { op: 'field', path: 'input.tags' },
        right: { op: 'literal', value: '' },
      }),
    );
    fireEvent.change(screen.getByLabelText('比较值'), { target: { value: 'plain text' } });
    expect((renderedValue('condition-value') as JsonObject).expression).toMatchObject({
      right: { op: 'literal', value: 'plain text' },
    });
  });

  it('preserves non-lossless templates until the user chooses template mode', () => {
    render(
      <ExpressionHarness
        id="error"
        purpose="error"
        locale="zh"
        initialValue={expressionValue({
          op: 'concat',
          values: [
            { op: 'field', path: 'input.code' },
            { op: 'literal', value: null },
            { op: 'not', value: { op: 'literal', value: false } },
          ],
        })}
      />,
    );

    expect(screen.getByLabelText('高级表达式 JSON')).toBeTruthy();
    expect(screen.getByText('生成文本：{{input.code}}{{advanced}}')).toBeTruthy();
    expect(renderedValue('error-value')).toEqual(
      expressionValue({
        op: 'concat',
        values: [
          { op: 'field', path: 'input.code' },
          { op: 'literal', value: null },
          { op: 'not', value: { op: 'literal', value: false } },
        ],
      }),
    );

    fireEvent.change(screen.getByLabelText('取值方式'), { target: { value: 'template' } });
    const template = screen.getByLabelText('失败信息模板');
    expect((template as HTMLTextAreaElement).value).toBe('Workflow failed: {{input.reason}}');

    fireEvent.change(template, { target: { value: '' } });
    expect(renderedValue('error-value')).toEqual(
      expressionValue({ op: 'concat', values: [{ op: 'literal', value: '' }] }),
    );
    fireEvent.change(template, { target: { value: '{{ input.reason }} tail' } });
    expect(renderedValue('error-value')).toEqual(
      expressionValue({
        op: 'concat',
        values: [
          { op: 'field', path: 'input.reason' },
          { op: 'literal', value: ' tail' },
        ],
      }),
    );

    fireEvent.change(screen.getByLabelText('取值方式'), { target: { value: 'value' } });
    fireEvent.change(screen.getByLabelText('固定值'), { target: { value: '{"raw":true}' } });
    expect(renderedValue('error-value')).toEqual(
      expressionValue({ op: 'literal', value: '{"raw":true}' }),
    );
    fireEvent.change(screen.getByLabelText('取值方式'), { target: { value: 'template' } });
    expect(renderedValue('error-value')).toEqual(
      createA3SFlowExpression({
        op: 'concat',
        values: [
          { op: 'literal', value: 'Workflow failed: ' },
          { op: 'field', path: 'input.reason' },
        ],
      }),
    );
  });

  it('localizes advanced validation and fixed datetime modes', () => {
    const advancedView = render(
      <ExpressionHarness
        id="advanced-zh"
        locale="zh-CN"
        initialValue={createA3SFlowExpression({
          op: 'not',
          value: { op: 'literal', value: true },
        })}
      />,
    );

    const advanced = screen.getByLabelText('高级表达式 JSON');
    expect(advanced.getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByText('使用高级表达式计算结果。')).toBeTruthy();
    expect(screen.getByText('仅在结构化编辑器无法表达当前规则时使用。')).toBeTruthy();
    fireEvent.change(advanced, { target: { value: '{' } });
    expect(advanced.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toContain('表达式 JSON 无效');
    advancedView.unmount();

    render(
      <ExpressionHarness
        id="datetime-zh"
        locale="zh"
        purpose="datetime"
        initialValue={createA3SFlowExpression({
          op: 'literal',
          value: '2026-10-01T00:00:00Z',
        })}
      />,
    );
    expect(screen.getByLabelText('固定 UTC 时间')).toBeTruthy();
    expect(screen.getByText('使用固定值：2026-10-01T00:00:00Z')).toBeTruthy();
  });

  it('chooses defaults for datetime, output, token, and unknown purposes', () => {
    const datetimeView = render(
      <ExpressionHarness
        id="datetime"
        purpose="datetime"
        initialValue={createA3SFlowExpression({ op: 'field', path: 'input.resumeAt' })}
      />,
    );
    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'value' } });
    expect((screen.getByLabelText('Fixed UTC time') as HTMLInputElement).value).toBe(
      '2026-08-10T12:30:00Z',
    );
    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'source' } });
    expect(renderedValue('datetime-value')).toEqual(
      createA3SFlowExpression({ op: 'field', path: 'input.resumeAt' }),
    );
    datetimeView.unmount();

    const outputView = render(
      <ExpressionHarness
        id="output"
        purpose="output"
        initialValue={createA3SFlowExpression({ op: 'field', path: 'steps.task.result' })}
      />,
    );
    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'value' } });
    expect(renderedValue('output-value')).toEqual(
      createA3SFlowExpression({ op: 'literal', value: {} }),
    );
    fireEvent.change(screen.getByLabelText('Fixed value'), {
      target: { value: '{"accepted":true}' },
    });
    expect(renderedValue('output-value')).toEqual(
      createA3SFlowExpression({ op: 'literal', value: { accepted: true } }),
    );
    outputView.unmount();

    const tokenView = render(
      <ExpressionHarness
        id="token"
        purpose="token"
        initialValue={createA3SFlowExpression({ op: 'field', path: 'input.token' })}
      />,
    );
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Workflow field',
      'Advanced expression',
    ]);
    tokenView.unmount();

    render(<ExpressionHarness id="unknown" purpose="custom-purpose" />);
    expect((screen.getByLabelText('Workflow field path') as HTMLInputElement).value).toBe('input');
  });

  it('forwards wrapper metadata, disabled state, and focus boundaries', () => {
    let blurs = 0;
    let focuses = 0;
    const { unmount } = render(
      <WidgetHarness
        id="wrapped"
        widget="expression"
        initialValue={createA3SFlowExpression({ op: 'field', path: 'input.value' })}
        customProps={{ expressionPurpose: 'input' }}
        disabled
        invalid
        labelledBy="wrapped-label"
        describedBy="wrapped-help"
        onBlur={() => {
          blurs += 1;
        }}
        onFocus={() => {
          focuses += 1;
        }}
      />,
    );
    const source = screen.getByLabelText('Workflow field path');
    expect((source as HTMLInputElement).disabled).toBe(true);
    expect(source.getAttribute('aria-invalid')).toBe('true');
    expect(source.getAttribute('aria-describedby')).toBe('wrapped-help');
    const fieldset = source.closest('fieldset');
    if (!fieldset) throw new Error('Missing expression fieldset');
    expect(fieldset.getAttribute('aria-labelledby')).toBe('wrapped-label');
    fireEvent.focus(fieldset);
    fireEvent.blur(fieldset, { relatedTarget: source });
    fireEvent.blur(fieldset, { relatedTarget: null });
    expect({ blurs, focuses }).toEqual({ blurs: 1, focuses: 1 });
    unmount();

    render(
      <WidgetHarness
        id="wrapped-default"
        widget="expression"
        initialValue={createA3SFlowExpression({ op: 'field', path: 'input' })}
        customProps={{ expressionPurpose: 3 }}
      />,
    );
    expect(screen.getByLabelText('Workflow field path')).toBeTruthy();
  });
});
