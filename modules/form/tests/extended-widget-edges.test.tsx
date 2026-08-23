import { fireEvent, render, screen } from '@testing-library/react';
import {
  type JsonSchema,
  type JsonValue,
  resolveFormLocaleCatalog,
  type UiNode,
  type UiOption,
} from '../src/core';
import {
  CalculatedWidget,
  CurrencyWidget,
  dateTimeFormValue,
  dateTimeInputValue,
  MultiSelectWidget,
  RatingWidget,
  SliderWidget,
  TagsWidget,
  TimeWidget,
  timeFormValue,
  timeInputValue,
} from '../src/react/extended-widgets';
import { type FormWidgetProps, NativeWidget } from '../src/react/native-widget';

const messages = resolveFormLocaleCatalog('zh-CN').messages;

function fieldNode(widget: string, overrides: Partial<UiNode> = {}): UiNode {
  return {
    id: `${widget}-field`,
    kind: 'field',
    widget,
    ...overrides,
  };
}

function createWidgetProps(overrides: Partial<FormWidgetProps> = {}) {
  const events = {
    blurs: 0,
    changes: [] as JsonValue[],
    focuses: 0,
  };
  const props: FormWidgetProps = {
    id: 'field-control',
    node: fieldNode('text'),
    schema: { type: 'string' },
    value: undefined,
    disabled: false,
    invalid: false,
    required: false,
    describedBy: undefined,
    options: [],
    dataSource: {
      options: [],
      status: 'static',
      query: '',
      searchable: false,
      hasMore: false,
      loadingMore: false,
      pageError: false,
      activate: () => undefined,
      setQuery: () => undefined,
      retry: () => undefined,
      loadMore: () => undefined,
    },
    messages,
    locale: 'zh-CN',
    onChange: (value) => events.changes.push(value),
    onBlur: () => {
      events.blurs += 1;
    },
    onFocus: () => {
      events.focuses += 1;
    },
    ...overrides,
  };
  return { events, props };
}

describe('extended widget edge behavior', () => {
  it('normalizes empty, local, offset, and invalid temporal values', () => {
    expect(dateTimeInputValue(undefined)).toBe('');
    expect(dateTimeInputValue('2026-08-09T10:30')).toBe('2026-08-09T10:30');
    expect(dateTimeInputValue('2026-13-09T10:30:00Z')).toBe('');
    expect(dateTimeFormValue('')).toBe('');
    expect(dateTimeFormValue('2026-08-09T10:30')).toBe('2026-08-09T10:30:00Z');
    expect(dateTimeFormValue('2026-08-09T10:30:45')).toBe('2026-08-09T10:30:45Z');

    expect(timeInputValue(null)).toBe('');
    expect(timeInputValue('25:00')).toBe('');
    expect(timeInputValue('09:15')).toBe('09:15');
    expect(timeInputValue('09:15:30Z')).toBe('09:15:30');
    expect(timeFormValue('')).toBe('');
    expect(timeFormValue('09:15')).toBe('09:15:00Z');
    expect(timeFormValue('09:15:30')).toBe('09:15:30Z');
  });

  it('renders empty and limited multi-select groups without coercing option values', () => {
    const empty = createWidgetProps({
      id: 'empty-roles',
      node: fieldNode('multi-select'),
      schema: { type: 'array', items: { type: 'string' } },
      value: null,
      invalid: true,
      required: true,
    });
    const firstRender = render(<MultiSelectWidget {...empty.props} />);
    const emptyGroup = screen.getByRole('group', { name: 'multi-select-field' });
    expect(screen.getByText('暂无可用选项。')).toBeTruthy();
    expect(screen.getByText('此项为必填项。')).toBeTruthy();
    expect(emptyGroup.getAttribute('data-required')).toBe('true');
    expect(emptyGroup.getAttribute('aria-describedby')).toContain('empty-roles-requirement');
    expect(emptyGroup.getAttribute('aria-invalid')).toBe('true');
    fireEvent.focus(emptyGroup);
    fireEvent.blur(emptyGroup, { relatedTarget: null });
    expect(empty.events.focuses).toBe(1);
    expect(empty.events.blurs).toBe(1);
    firstRender.unmount();

    const options: UiOption[] = [
      { label: '数字一', value: 1 },
      { label: '字符串一', value: '1' },
      { label: '停用项', value: 2, disabled: true },
    ];
    const limited = createWidgetProps({
      id: 'limited-roles',
      labelledBy: 'limited-roles-label',
      node: fieldNode('multi-select', { label: '角色' }),
      schema: { type: 'array', items: { type: 'string' }, maxItems: 1 },
      value: [1],
      options,
    });
    render(
      <>
        <span id="limited-roles-label">可选角色</span>
        <MultiSelectWidget {...limited.props} />
      </>,
    );
    const numberOption = screen.getByRole('checkbox', { name: '数字一' });
    const stringOption = screen.getByRole('checkbox', { name: '字符串一' });
    expect((numberOption as HTMLInputElement).checked).toBe(true);
    expect((stringOption as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox', { name: '停用项' }) as HTMLInputElement).disabled).toBe(
      true,
    );
    fireEvent.blur(numberOption, { relatedTarget: stringOption });
    expect(limited.events.blurs).toBe(0);
    fireEvent.click(numberOption);
    expect(limited.events.changes).toEqual([[]]);
  });

  it('handles empty drafts, mixed controlled values, focus boundaries, and tag limits', () => {
    const empty = createWidgetProps({
      id: 'empty-tags',
      node: fieldNode('tags'),
      schema: { type: 'array', items: { type: 'string' } },
      value: undefined,
      required: true,
    });
    const firstRender = render(<TagsWidget {...empty.props} />);
    const fieldset = firstRender.container.querySelector('.a3s-form-tags');
    const input = screen.getByRole('textbox', { name: '添加tags-field' });
    const add = screen.getByRole('button', { name: '添加' });
    expect(fieldset?.classList.contains('fieldset')).toBe(true);
    expect(fieldset?.getAttribute('data-required')).toBe('true');
    expect(fieldset?.getAttribute('aria-describedby')).toContain('empty-tags-requirement');
    expect(input.closest('.input-group')?.classList.contains('a3s-form-tag-entry')).toBe(true);
    expect(add.dataset.variant).toBe('ghost');
    expect((add as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input, { relatedTarget: add });
    expect(empty.events.blurs).toBe(0);
    fireEvent.change(input, { target: { value: '  Go  ' } });
    fireEvent.click(add);
    expect(empty.events.changes).toEqual([['Go']]);
    fireEvent.blur(add, { relatedTarget: null });
    expect(empty.events.blurs).toBe(1);
    firstRender.unmount();

    const limited = createWidgetProps({
      id: 'limited-tags',
      node: fieldNode('tags', { label: '技能', placeholder: '添加一项技能' }),
      schema: { type: 'array', items: { type: 'string' }, minItems: 1 },
      value: [1, 'Rust'],
      describedBy: 'skills-help',
      onBlur: undefined,
    });
    const limitedRender = render(<TagsWidget {...limited.props} />);
    expect(screen.getByPlaceholderText('添加一项技能')).toBeTruthy();
    expect(screen.queryByText('1')).toBeNull();
    const remove = screen.getByRole('button', { name: '移除标签 Rust' }) as HTMLButtonElement;
    expect(remove.disabled).toBe(true);
    expect(remove.closest('.badge')?.getAttribute('data-variant')).toBe('secondary');
    expect(
      limitedRender.container.querySelector('.a3s-form-tag')?.classList.contains('badge'),
    ).toBe(true);
    expect(screen.getByRole('textbox', { name: '添加技能' }).getAttribute('aria-describedby')).toBe(
      'skills-help limited-tags-tag-feedback',
    );
    fireEvent.blur(screen.getByRole('textbox', { name: '添加技能' }), { relatedTarget: null });
  });

  it('sanitizes currency settings and preserves number or empty controlled values', () => {
    const invalid = createWidgetProps({
      id: 'budget',
      node: fieldNode('currency', {
        customProps: { currency: 12, step: 'invalid' },
      }),
      schema: { type: 'number', minimum: -5, maximum: 5 },
      value: null,
      describedBy: 'budget-help',
    });
    const firstRender = render(<CurrencyWidget {...invalid.props} />);
    const input = screen.getByRole('spinbutton', { name: 'currency-field' });
    expect(screen.getByText('CNY')).toBeTruthy();
    expect(input.getAttribute('step')).toBe('0.01');
    expect(input.getAttribute('min')).toBe('-5');
    expect(input.getAttribute('max')).toBe('5');
    expect(input.getAttribute('aria-describedby')).toBe('budget-help budget-currency');
    fireEvent.change(input, { target: { value: '2' } });
    expect(invalid.events.changes).toEqual([2]);
    firstRender.unmount();

    const clearRender = render(<CurrencyWidget {...invalid.props} value={2} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'currency-field' }), {
      target: { value: '' },
    });
    expect(invalid.events.changes).toEqual([2, null]);
    clearRender.unmount();

    const valid = createWidgetProps({
      id: 'price',
      node: fieldNode('currency', {
        label: '价格',
        customProps: { currency: 'usd', step: 0 },
      }),
      schema: { type: 'number' },
      value: 'not-a-number',
      describedBy: undefined,
    });
    render(<CurrencyWidget {...valid.props} />);
    expect(screen.getByText('USD')).toBeTruthy();
    expect((screen.getByRole('spinbutton', { name: '价格' }) as HTMLInputElement).value).toBe('');
  });

  it('falls back from malformed currency codes and labels temporal controls by node id', () => {
    const invalidCurrency = createWidgetProps({
      id: 'currency-code',
      node: fieldNode('currency', { customProps: { currency: 'yuan' } }),
      value: 12,
    });
    const currency = render(<CurrencyWidget {...invalidCurrency.props} />);
    expect(screen.getByText('CNY')).toBeTruthy();
    currency.unmount();

    const time = createWidgetProps({
      id: 'time-control',
      node: { id: 'scheduled-at', kind: 'field', widget: 'time' },
      value: '09:30:00Z',
    });
    render(<TimeWidget {...time.props} />);
    expect(screen.getByLabelText('scheduled-at')).toBeTruthy();
  });

  it('supports custom rating options, bounded defaults, and group focus behavior', () => {
    const custom = createWidgetProps({
      id: 'priority',
      node: fieldNode('rating'),
      schema: { type: 'number', maximum: 50 },
      value: 'low',
      required: true,
      invalid: true,
      options: [
        { label: '低', value: 'low' },
        { label: '高', value: 'high' },
        { label: '停用', value: 'disabled', disabled: true },
      ],
    });
    const firstRender = render(<RatingWidget {...custom.props} />);
    const group = screen.getByRole('radiogroup', { name: 'rating-field' });
    const low = screen.getByRole('radio', { name: '低 分，共 3 分' });
    const high = screen.getByRole('radio', { name: '高 分，共 3 分' });
    expect(group.getAttribute('aria-required')).toBe('true');
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect((low as HTMLInputElement).checked).toBe(true);
    expect(
      (screen.getByRole('radio', { name: '停用 分，共 3 分' }) as HTMLInputElement).disabled,
    ).toBe(true);
    fireEvent.blur(low, { relatedTarget: high });
    expect(custom.events.blurs).toBe(0);
    fireEvent.click(high);
    expect(custom.events.changes).toEqual(['high']);
    fireEvent.blur(high, { relatedTarget: null });
    expect(custom.events.blurs).toBe(1);
    firstRender.unmount();

    const bounded = createWidgetProps({
      id: 'bounded-rating',
      node: fieldNode('rating', { label: '等级' }),
      schema: { type: 'number', maximum: 0 },
      options: [],
    });
    render(<RatingWidget {...bounded.props} />);
    expect(screen.getAllByRole('radio')).toHaveLength(1);
  });

  it('clamps slider configuration and reports empty and out-of-range controlled states', () => {
    const empty = createWidgetProps({
      id: 'threshold',
      node: fieldNode('slider', { customProps: { step: 'invalid' } }),
      schema: { type: 'number', minimum: 10, maximum: 5 },
      value: undefined,
    });
    const firstRender = render(<SliderWidget {...empty.props} />);
    const input = screen.getByRole('slider', { name: 'slider-field' });
    expect(input.getAttribute('min')).toBe('10');
    expect(input.getAttribute('max')).toBe('10');
    expect(input.getAttribute('step')).toBe('1');
    expect(input.getAttribute('aria-valuetext')).toBe('slider-field：10');
    expect(
      firstRender.container
        .querySelector<HTMLElement>('.a3s-form-slider')
        ?.style.getPropertyValue('--a3s-form-slider-progress'),
    ).toBe('0%');
    firstRender.unmount();

    const high = createWidgetProps({
      id: 'high-threshold',
      node: fieldNode('slider', { label: '阈值', customProps: { step: 0 } }),
      schema: { type: 'number', minimum: 10, maximum: 5 },
      value: 50,
    });
    const secondRender = render(<SliderWidget {...high.props} />);
    expect(
      secondRender.container
        .querySelector<HTMLElement>('.a3s-form-slider')
        ?.style.getPropertyValue('--a3s-form-slider-progress'),
    ).toBe('100%');
  });

  it('formats empty, string, number, and structured calculated values', () => {
    const calculated = createWidgetProps({
      id: 'total',
      node: fieldNode('calculated'),
      value: undefined,
      invalid: true,
    });
    const view = render(<CalculatedWidget {...calculated.props} />);
    expect(screen.getByLabelText('calculated-field').textContent).toBe('尚未计算');
    expect(screen.getByLabelText('calculated-field').getAttribute('aria-invalid')).toBe('true');

    view.rerender(<CalculatedWidget {...calculated.props} value="ready" />);
    expect(screen.getByLabelText('calculated-field').textContent).toBe('ready');
    view.rerender(<CalculatedWidget {...calculated.props} value={1200} />);
    expect(screen.getByLabelText('calculated-field').textContent).toBe('1,200');
    view.rerender(<CalculatedWidget {...calculated.props} value={{ currency: 'CNY' }} />);
    expect(screen.getByLabelText('calculated-field').textContent).toBe('{"currency":"CNY"}');
  });

  it('keeps native radio values typed and fires blur only after focus leaves the group', () => {
    const radio = createWidgetProps({
      id: 'native-choice',
      node: fieldNode('radio'),
      schema: { type: 'number' } as JsonSchema,
      value: 1,
      required: true,
      options: [
        { label: '一', value: 1 },
        { label: '二', value: 2 },
        { label: '三', value: 3, disabled: true },
      ],
    });
    render(<NativeWidget {...radio.props} />);
    const group = screen.getByRole('radiogroup', { name: 'radio-field' });
    const first = screen.getByRole('radio', { name: '一' });
    const second = screen.getByRole('radio', { name: '二' });
    expect((first as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: '三' }) as HTMLInputElement).disabled).toBe(true);
    fireEvent.blur(first, { relatedTarget: second });
    expect(radio.events.blurs).toBe(0);
    fireEvent.click(second);
    expect(radio.events.changes).toEqual([2]);
    fireEvent.blur(second, { relatedTarget: group.parentElement });
    expect(radio.events.blurs).toBe(1);
  });
});
