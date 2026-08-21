import { act, fireEvent, render, screen } from '@testing-library/react';
import { createA3SFlowExpression } from '../src/a3s-flow';
import type { FieldError, JsonObject } from '../src/core';
import { batchMember, renderedValue, WidgetHarness } from './a3s-flow-widget-interactions.helpers';

describe('A3S Flow batch widget interactions', () => {
  it('shows the localized empty state and creates the first complete member', () => {
    const chineseView = render(<WidgetHarness id="empty-batch" widget="batch" locale="zh-CN" />);

    expect(screen.getByText('0 个步骤')).toBeTruthy();
    expect(screen.getByText('批次中还没有步骤')).toBeTruthy();
    expect(screen.getByText('至少添加一个步骤后才能应用配置。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '添加步骤' }));
    expect(renderedValue('empty-batch-value')).toEqual([
      {
        step_key: 'member-1',
        step_name: 'task.run',
        input_mapping: createA3SFlowExpression({ op: 'field', path: 'input' }),
        max_attempts: 3,
        retry_delay_ms: 0,
        on_exhausted: 'fail_run',
      },
    ]);
    expect(screen.getByText('1 个步骤')).toBeTruthy();
    expect(screen.getByText('按列表顺序执行')).toBeTruthy();
    chineseView.unmount();

    const englishView = render(
      <WidgetHarness id="empty-batch-en" widget="batch" initialValue="legacy" />,
    );
    expect(screen.getByText('No steps in this batch')).toBeTruthy();
    expect(
      screen.getByText('Add at least one step before applying the configuration.'),
    ).toBeTruthy();
    englishView.unmount();

    render(<WidgetHarness id="legacy-member" widget="batch" initialValue={[null]} />);
    expect(screen.getByText('Step 1')).toBeTruthy();
  });

  it('normalizes legacy members and edits every member policy', () => {
    render(
      <WidgetHarness
        id="batch"
        widget="batch"
        initialValue={[
          {
            step_key: 7,
            step_name: null,
            input_mapping: null,
            max_attempts: 'many',
            retry_delay_ms: 'later',
            on_exhausted: 'legacy',
          },
          {
            step_key: 'member-3',
            step_name: 'email.send',
            input_mapping: createA3SFlowExpression({ op: 'field', path: 'input.email' }),
            max_attempts: 5,
            retry_delay_ms: 250,
            on_exhausted: 'continue_workflow',
          },
        ]}
      />,
    );

    expect(screen.getByText('Step 1')).toBeTruthy();
    expect(screen.getByText('3 attempts · immediate retry')).toBeTruthy();
    expect(screen.getByText('5 attempts · 250 ms')).toBeTruthy();
    expect((screen.getByLabelText(/^Member ID/) as HTMLInputElement).value).toBe('member-1');
    expect((screen.getByLabelText(/^Step handler/) as HTMLInputElement).value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
    expect((renderedValue('batch-value') as JsonObject[]).at(-1)?.step_key).toBe('member-4');

    fireEvent.change(screen.getByLabelText(/^Member ID/), { target: { value: 'prepare' } });
    fireEvent.change(screen.getByLabelText(/^Step handler/), {
      target: { value: 'task.prepare' },
    });
    const invalidMapping = screen.getByLabelText('Advanced expression JSON');
    expect((invalidMapping as HTMLTextAreaElement).value).toBe('null');
    expect(invalidMapping.getAttribute('aria-invalid')).toBe('true');
    expect((renderedValue('batch-value') as JsonObject[])[0]?.input_mapping).toBeNull();
    fireEvent.change(screen.getByLabelText('Value source'), { target: { value: 'source' } });
    fireEvent.change(screen.getByLabelText('Workflow field path'), {
      target: { value: 'input.payload' },
    });
    fireEvent.change(screen.getByLabelText('Maximum attempts'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Retry delay (ms)'), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText('If all attempts fail'), {
      target: { value: 'continue_workflow' },
    });
    expect((renderedValue('batch-value') as JsonObject[])[0]).toEqual({
      step_key: 'prepare',
      step_name: 'task.prepare',
      input_mapping: createA3SFlowExpression({ op: 'field', path: 'input.payload' }),
      max_attempts: 4,
      retry_delay_ms: 1000,
      on_exhausted: 'continue_workflow',
    });
  });

  it('reconciles externally replaced members and preserves empty numeric drafts', async () => {
    const first = batchMember('first', {
      max_attempts: null,
      retry_delay_ms: Number.NaN,
    });
    const growView = render(
      <WidgetHarness
        id="growing-batch"
        widget="batch"
        initialValue={[first]}
        replacementValue={[first, batchMember('second'), batchMember('third')]}
      />,
    );
    const attempts = screen.getByLabelText('Maximum attempts');
    expect((attempts as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Retry delay (ms)') as HTMLInputElement).value).toBe('');
    fireEvent.change(attempts, { target: { value: '4' } });
    fireEvent.change(attempts, { target: { value: '' } });
    expect((renderedValue('growing-batch-value') as JsonObject[])[0]?.max_attempts).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Replace growing-batch' }));
    await screen.findByText('3 steps');
    growView.unmount();

    render(
      <WidgetHarness
        id="shrinking-batch"
        widget="batch"
        initialValue={[batchMember('one'), batchMember('two'), batchMember('three')]}
        replacementValue={[batchMember('one')]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Replace shrinking-batch' }));
    await screen.findByText('1 steps');
  });

  it('maps nested host errors to the expanded member and its accessible controls', () => {
    let blurs = 0;
    let focuses = 0;
    const errors: FieldError[] = [
      { path: 'elsewhere', code: 'other', message: 'Unrelated.' },
      { path: 'steps.bad.step_key', code: 'bad-index', message: 'Bad index.' },
      { path: 'steps.-1.step_key', code: 'negative-index', message: 'Negative index.' },
      { path: 'steps.8.step_key', code: 'large-index', message: 'Large index.' },
      { path: 'steps.1.on_exhausted', code: 'policy', message: 'Choose a policy.' },
      { path: 'steps.1.step_key', code: 'key', message: 'Choose a unique ID.' },
      { path: 'steps.1.step_name', code: 'handler', message: 'Choose a handler.' },
      { path: 'steps.1.input_mapping', code: 'mapping', message: 'Fix the mapping.' },
      { path: 'steps.1.max_attempts', code: 'attempts', message: 'Fix attempts.' },
      { path: 'steps.1.retry_delay_ms', code: 'delay', message: 'Fix the delay.' },
    ];
    render(
      <WidgetHarness
        id="error-batch"
        widget="batch"
        initialValue={[batchMember('first'), batchMember('second')]}
        valuePath="steps"
        errors={errors}
        invalid
        labelledBy="batch-label"
        describedBy="batch-help"
        onBlur={() => {
          blurs += 1;
        }}
        onFocus={() => {
          focuses += 1;
        }}
      />,
    );

    const memberId = screen.getByLabelText(/^Member ID/);
    expect((memberId as HTMLInputElement).value).toBe('second');
    expect(memberId.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText(/^Step handler/).getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Maximum attempts').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('If all attempts fail').getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('.a3s-form-flow-batch-retry')?.hasAttribute('open')).toBe(true);
    const fieldset = document.getElementById('error-batch-control');
    if (!fieldset) throw new Error('Missing Batch fieldset');
    expect(fieldset.getAttribute('aria-describedby')).toBe('batch-help');
    expect(screen.getAllByRole('alert')).toHaveLength(errors.length);
    fireEvent.focus(fieldset);
    fireEvent.blur(fieldset, { relatedTarget: memberId });
    fireEvent.blur(fieldset, { relatedTarget: null });
    expect({ blurs, focuses }).toEqual({ blurs: 1, focuses: 1 });
  });

  it('toggles editors, reorders members, removes one, and ignores boundary moves', () => {
    render(
      <WidgetHarness
        id="ordered-batch"
        widget="batch"
        initialValue={[
          {
            step_key: 'first',
            step_name: 'task.first',
            input_mapping: createA3SFlowExpression({ op: 'field', path: 'input' }),
            max_attempts: 2,
            retry_delay_ms: 0,
            on_exhausted: 'fail_run',
          },
          {
            step_key: 'second',
            step_name: 'task.second',
            input_mapping: createA3SFlowExpression({ op: 'literal', value: {} }),
            max_attempts: 1,
            retry_delay_ms: 50,
            on_exhausted: 'continue_workflow',
          },
        ]}
      />,
    );

    const firstDetails = screen.getByText('task.first').closest('details');
    const secondDetails = screen.getByText('task.second').closest('details');
    if (!firstDetails || !secondDetails) throw new Error('Missing Batch details');
    act(() => {
      firstDetails.open = false;
      fireEvent(firstDetails, new Event('toggle', { bubbles: true }));
      secondDetails.open = false;
      fireEvent(secondDetails, new Event('toggle', { bubbles: true }));
      firstDetails.open = true;
      fireEvent(firstDetails, new Event('toggle', { bubbles: true }));
    });

    const firstMoveUp = screen.getByRole('button', { name: 'Move up' }) as HTMLButtonElement;
    expect(firstMoveUp.disabled).toBe(true);
    firstMoveUp.disabled = false;
    fireEvent.click(firstMoveUp);
    expect(
      (renderedValue('ordered-batch-value') as JsonObject[]).map((member) => member.step_key),
    ).toEqual(['first', 'second']);

    const secondSummary = screen.getByText('task.second').closest('summary');
    if (!secondSummary) throw new Error('Missing second Batch summary');
    fireEvent.click(secondSummary);
    expect((screen.getByLabelText(/^Member ID/) as HTMLInputElement).value).toBe('second');
    fireEvent.click(screen.getByRole('button', { name: 'Move up' }));
    expect(
      (renderedValue('ordered-batch-value') as JsonObject[]).map((member) => member.step_key),
    ).toEqual(['second', 'first']);

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(
      (renderedValue('ordered-batch-value') as JsonObject[]).map((member) => member.step_key),
    ).toEqual(['second']);
    const remainingSummary = screen.getByText('task.second').closest('summary');
    if (!remainingSummary) throw new Error('Missing remaining Batch summary');
    fireEvent.click(remainingSummary);
    expect((screen.getByRole('button', { name: 'Remove' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('localizes populated and disabled member controls', () => {
    render(
      <WidgetHarness
        id="disabled-batch"
        widget="batch"
        locale="zh"
        disabled
        initialValue={[
          {
            step_key: 'local',
            step_name: '',
            input_mapping: createA3SFlowExpression({ op: 'field', path: 'input' }),
            max_attempts: 2,
            retry_delay_ms: 500,
            on_exhausted: 'continue_workflow',
          },
        ]}
      />,
    );

    expect(screen.getByText('步骤 1')).toBeTruthy();
    expect(screen.getByText('2 次 · 500 ms')).toBeTruthy();
    expect(screen.getByText('失败与重试 · 最多 2 次')).toBeTruthy();
    expect((screen.getByRole('button', { name: '添加步骤' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByLabelText(/^成员标识/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/^步骤处理器/) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('工作流字段路径') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '上移' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '下移' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '删除' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
