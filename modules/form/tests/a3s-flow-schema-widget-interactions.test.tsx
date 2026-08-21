import { fireEvent, render, screen, within } from '@testing-library/react';
import type { JsonObject } from '../src/core';
import { renderedValue, WidgetHarness } from './a3s-flow-widget-interactions.helpers';

describe('A3S Flow schema widget interactions', () => {
  it('validates names, renames required fields, changes types, and removes fields', () => {
    render(
      <WidgetHarness
        id="schema"
        widget="schema"
        initialValue={{
          type: 'object',
          additionalProperties: true,
          properties: {
            alpha: { type: 'number', minimum: 0 },
            beta: { type: 'string' },
          },
          required: ['alpha', 'beta', 7],
        }}
      />,
    );

    const fields = screen.getByRole('list', { name: 'Input fields' });
    let rows = within(fields).getAllByRole('listitem');
    const alphaName = within(rows[0]).getByLabelText('Field name');
    fireEvent.blur(alphaName);
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.change(alphaName, { target: { value: ' ' } });
    fireEvent.blur(alphaName);
    expect(screen.getByRole('alert').textContent).toContain('non-empty and unique');
    fireEvent.click(screen.getByLabelText('Allow additional fields'));
    expect(renderedValue('schema-value')).toMatchObject([
      { __a3s_form_invalid_schema_draft__: 'field-name', fieldNames: ['alpha'] },
    ]);
    fireEvent.change(alphaName, { target: { value: 'beta' } });
    fireEvent.keyDown(alphaName, { key: 'Escape' });
    fireEvent.keyDown(alphaName, { key: 'Enter' });
    expect(screen.getByRole('alert')).toBeTruthy();

    fireEvent.change(alphaName, { target: { value: 'total' } });
    fireEvent.keyDown(alphaName, { key: 'Enter' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(renderedValue('schema-value')).toMatchObject({
      properties: { total: { type: 'number', minimum: 0 }, beta: { type: 'string' } },
      required: ['total', 'beta'],
    });

    rows = within(screen.getByRole('list', { name: 'Input fields' })).getAllByRole('listitem');
    const betaRow = rows[1];
    fireEvent.change(within(betaRow).getByLabelText('Type'), { target: { value: 'boolean' } });
    fireEvent.click(within(betaRow).getByLabelText('Required'));
    expect(renderedValue('schema-value')).toMatchObject({
      properties: { beta: { type: 'boolean' } },
      required: ['total'],
    });

    fireEvent.click(within(betaRow).getByRole('button', { name: 'Remove field beta' }));
    expect(renderedValue('schema-value')).toMatchObject({
      properties: { total: { type: 'number', minimum: 0 } },
      required: ['total'],
    });

    const totalRow = screen.getByRole('listitem');
    fireEvent.click(within(totalRow).getByLabelText('Required'));
    expect((renderedValue('schema-value') as JsonObject).required).toEqual([]);
  });

  it('normalizes legacy properties, avoids generated-name collisions, and toggles extras', () => {
    render(
      <WidgetHarness
        id="legacy-schema"
        widget="schema"
        initialValue={{
          type: 'object',
          additionalProperties: false,
          properties: {
            field_4: null,
            custom: { type: 'legacy' },
            amount: { type: 'integer' },
          },
          required: 'amount',
        }}
      />,
    );

    const types = screen.getAllByLabelText('Type') as HTMLSelectElement[];
    expect(types.map((select) => select.value)).toEqual(['string', 'string', 'integer']);
    fireEvent.click(screen.getByRole('button', { name: 'Add input field' }));
    expect(renderedValue('legacy-schema-value')).toMatchObject({
      properties: { field_5: { type: 'string' } },
      required: [],
    });

    const extras = screen.getByLabelText('Allow additional fields');
    expect((extras as HTMLInputElement).checked).toBe(false);
    fireEvent.click(extras);
    expect(renderedValue('legacy-schema-value')).toMatchObject({ additionalProperties: true });
  });

  it('accepts object JSON, rejects arrays and malformed JSON, and localizes errors', () => {
    const { unmount } = render(
      <WidgetHarness id="empty-schema" widget="schema" initialValue={[{}]} locale="zh-CN" />,
    );
    expect(screen.getByText('暂未限定输入字段')).toBeTruthy();
    expect(screen.getByText('当前允许传入任意 JSON 字段。')).toBeTruthy();
    expect(screen.getByRole('button', { name: '添加输入字段' })).toBeTruthy();
    const chineseEditor = screen.getByLabelText('输入规则 JSON');
    expect(screen.getByText('用于嵌套对象、数组约束等高级 JSON Schema 设置。')).toBeTruthy();
    fireEvent.change(chineseEditor, { target: { value: '[]' } });
    expect(screen.getByRole('alert').textContent).toContain('JSON 无效');
    fireEvent.change(chineseEditor, { target: { value: 'null' } });
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.change(chineseEditor, { target: { value: '{"type":"object","maxProperties":2}' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(renderedValue('empty-schema-value')).toEqual({ type: 'object', maxProperties: 2 });
    fireEvent.click(screen.getByRole('button', { name: '添加输入字段' }));
    const chineseName = screen.getByLabelText('字段名');
    fireEvent.change(chineseName, { target: { value: '' } });
    fireEvent.blur(chineseName);
    expect(screen.getByRole('alert').textContent).toContain('字段名不能为空');
    unmount();

    render(<WidgetHarness id="bad-schema" widget="schema" initialValue={{}} />);
    fireEvent.change(screen.getByLabelText('Input schema JSON'), { target: { value: '{' } });
    expect(screen.getByRole('alert').textContent).toContain('Invalid JSON');
  });

  it('restores legacy invalid-name drafts and exposes host errors and focus metadata', () => {
    let blurs = 0;
    let focuses = 0;
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    render(
      <WidgetHarness
        id="sentinel-schema"
        widget="schema"
        initialValue={[
          {
            __a3s_form_invalid_schema_draft__: 'field-name',
            schema,
            fieldName: 'name',
          },
        ]}
        valuePath="input_schema"
        errors={[{ path: 'input_schema', code: 'schema.invalid', message: 'Review the schema.' }]}
        labelledBy="schema-label"
        describedBy="schema-help"
        invalid
        onBlur={() => {
          blurs += 1;
        }}
        onFocus={() => {
          focuses += 1;
        }}
      />,
    );

    const name = screen.getByLabelText('Field name');
    const fieldset = document.getElementById('sentinel-schema-control');
    if (!fieldset) throw new Error('Missing schema fieldset');
    expect(fieldset.getAttribute('aria-invalid')).toBe('true');
    expect(fieldset.getAttribute('aria-labelledby')).toBe('schema-label');
    expect(screen.getByRole('alert').textContent).toBe('Review the schema.');
    fireEvent.focus(fieldset);
    fireEvent.blur(fieldset, { relatedTarget: name });
    fireEvent.blur(fieldset, { relatedTarget: null });
    expect({ blurs, focuses }).toEqual({ blurs: 1, focuses: 1 });
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'number' } });
    expect(renderedValue('sentinel-schema-value')).toMatchObject([
      { __a3s_form_invalid_schema_draft__: 'field-name', fieldNames: ['name'] },
    ]);
    fireEvent.change(screen.getByLabelText('Input schema JSON'), { target: { value: '{' } });
    fireEvent.blur(name);
    expect(renderedValue('sentinel-schema-value')).toMatchObject({
      properties: { name: { type: 'number' } },
    });
  });

  it('disables both structured and advanced schema controls', () => {
    render(
      <WidgetHarness
        id="disabled-schema"
        widget="schema"
        disabled
        locale="zh"
        initialValue={{ properties: { name: { type: 'string' } }, required: ['name'] }}
      />,
    );

    expect((screen.getByLabelText('字段名') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('数据类型') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('必填') as HTMLInputElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: '删除字段 name' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByLabelText('输入规则 JSON') as HTMLTextAreaElement).disabled).toBe(true);
  });
});
