import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { assertCompiled, compileForm, type FormDocument, type JsonObject } from '../src/core';
import { FormDesigner, FormRenderer } from '../src/react';
import { DESIGNER_CATALOG } from '../src/react/designer-catalog';
import { dateTimeInputValue, timeInputValue } from '../src/react/extended-widgets';
import { createDocument } from './fixtures';

const extendedFieldDocument: FormDocument = {
  kind: 'a3s.form',
  apiVersion: 'a3s.dev/form/v1alpha1',
  revision: 1,
  metadata: { title: 'Extended fields', locale: 'zh-CN' },
  schema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      website: { type: 'string', format: 'uri' },
      phone: { type: 'string' },
      startsAt: { type: 'string', format: 'date-time' },
      reminderAt: { type: 'string', format: 'time' },
      roles: {
        type: 'array',
        items: { type: 'string', enum: ['human', 'agent', 'reviewer'] },
        uniqueItems: true,
      },
      skills: { type: 'array', items: { type: 'string' }, uniqueItems: true },
      budget: { type: 'number', minimum: 0 },
      rating: { type: 'number', minimum: 1, maximum: 5 },
      automation: { type: 'number', minimum: 0, maximum: 100 },
      organizationId: { type: 'string' },
      total: { type: 'number' },
    },
    required: ['website', 'roles'],
    additionalProperties: false,
  },
  ui: {
    root: 'root',
    nodes: [
      {
        id: 'root',
        kind: 'root',
        children: [
          'website',
          'phone',
          'starts-at',
          'reminder-at',
          'roles',
          'skills',
          'budget',
          'rating',
          'automation',
          'organization-id',
          'total',
        ],
      },
      {
        id: 'website',
        kind: 'field',
        label: '网站',
        widget: 'url',
        schemaPath: '/properties/website',
      },
      {
        id: 'phone',
        kind: 'field',
        label: '联系电话',
        widget: 'tel',
        schemaPath: '/properties/phone',
      },
      {
        id: 'starts-at',
        kind: 'field',
        label: '开始时间',
        widget: 'date-time',
        schemaPath: '/properties/startsAt',
      },
      {
        id: 'reminder-at',
        kind: 'field',
        label: '提醒时间',
        widget: 'time',
        schemaPath: '/properties/reminderAt',
      },
      {
        id: 'roles',
        kind: 'field',
        label: '协作角色',
        widget: 'multi-select',
        schemaPath: '/properties/roles',
        options: [
          { label: '人类成员', value: 'human' },
          { label: 'Agent', value: 'agent' },
          { label: '审核人', value: 'reviewer' },
        ],
      },
      {
        id: 'skills',
        kind: 'field',
        label: '技能标签',
        widget: 'tags',
        schemaPath: '/properties/skills',
      },
      {
        id: 'budget',
        kind: 'field',
        label: '预算',
        widget: 'currency',
        schemaPath: '/properties/budget',
        customProps: { currency: 'CNY', step: 0.01 },
      },
      {
        id: 'rating',
        kind: 'field',
        label: '满意度',
        widget: 'rating',
        schemaPath: '/properties/rating',
      },
      {
        id: 'automation',
        kind: 'field',
        label: '自动化比例',
        widget: 'slider',
        schemaPath: '/properties/automation',
        customProps: { step: 5 },
      },
      {
        id: 'organization-id',
        kind: 'field',
        label: '组织标识',
        widget: 'hidden',
        schemaPath: '/properties/organizationId',
      },
      {
        id: 'total',
        kind: 'field',
        label: '总计',
        widget: 'calculated',
        schemaPath: '/properties/total',
        readOnly: true,
      },
    ],
  },
  rules: [],
  dataSources: [],
  actions: [],
};

function DesignerHarness() {
  const [document, setDocument] = useState(
    () => compileForm(createDocument()).document as FormDocument,
  );
  return (
    <>
      <FormDesigner document={document} onChange={setDocument} />
      <output data-testid="designer-document">{JSON.stringify(document)}</output>
    </>
  );
}

const extendedInitialValue: JsonObject = {
  website: 'https://a3s.dev',
  phone: '+86 138 0000 0000',
  startsAt: '2026-08-09T10:30:00Z',
  reminderAt: '09:15:00Z',
  roles: ['agent'],
  skills: ['Rust'],
  budget: 1200,
  rating: 4,
  automation: 50,
  organizationId: 'org-a3s',
  total: 2400,
};

function ExtendedFieldsHarness({
  document = extendedFieldDocument,
  initialValue = extendedInitialValue,
  readOnly = false,
  errors = [],
}: {
  document?: FormDocument;
  initialValue?: JsonObject;
  readOnly?: boolean;
  errors?: { path: string; code: string; message: string }[];
}) {
  const [value, setValue] = useState<JsonObject>(initialValue);
  return (
    <>
      <FormRenderer
        plan={assertCompiled(document)}
        value={value}
        errors={errors}
        readOnly={readOnly}
        onChange={setValue}
      />
      <output data-testid="form-value">{JSON.stringify(value)}</output>
    </>
  );
}

describe('extended built-in fields', () => {
  it('publishes the complete v0.3 field catalog with matching schema contracts', () => {
    const items = DESIGNER_CATALOG.flatMap((section) => section.items);
    expect(
      items
        .filter((item) => item.kind === 'field')
        .map((item) => item.widget)
        .filter((widget) =>
          [
            'url',
            'tel',
            'date-time',
            'time',
            'multi-select',
            'tags',
            'currency',
            'rating',
            'slider',
            'hidden',
            'calculated',
          ].includes(widget ?? ''),
        ),
    ).toEqual([
      'url',
      'tel',
      'date-time',
      'time',
      'multi-select',
      'tags',
      'currency',
      'rating',
      'slider',
      'hidden',
      'calculated',
    ]);
    expect(assertCompiled(extendedFieldDocument).nodeById['starts-at'].widget).toBe('date-time');
  });

  it('authors a field with its schema and keeps the schema aligned when the widget changes', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加网址字段' }));

    let document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    let field = document.ui.nodes.find((node) => node.widget === 'url');
    expect(field).toBeDefined();
    expect(document.schema.properties?.field_1).toEqual(
      expect.objectContaining({ type: 'string', format: 'uri', title: '网址' }),
    );

    fireEvent.change(screen.getByLabelText('字段组件'), { target: { value: 'slider' } });
    document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    field = document.ui.nodes.find((node) => node.id === field?.id);
    expect(field).toEqual(
      expect.objectContaining({
        widget: 'slider',
        customProps: { step: 1 },
      }),
    );
    expect(document.schema.properties?.field_1).toEqual(
      expect.objectContaining({ type: 'number', minimum: 0, maximum: 100, title: '网址' }),
    );
    expect(document.schema.properties?.field_1).not.toHaveProperty('format');
  });

  it('provides tailored authoring controls and canvas previews for extended fields', () => {
    const { container } = render(<DesignerHarness />);

    fireEvent.click(screen.getByRole('button', { name: '添加多选字段' }));
    expect(container.querySelector('.a3s-form-design-widget .a3s-form-multi-select')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('字段选项'), {
      target: { value: '成员\nAgent\n审核人' },
    });

    fireEvent.click(screen.getByRole('button', { name: '添加标签字段' }));
    expect(screen.getByText('示例标签')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '添加金额字段' }));
    expect(screen.getByLabelText('货币代码')).toBeTruthy();
    const currencyStep = screen.getByLabelText('金额输入步长') as HTMLInputElement;
    expect(currencyStep.value).toBe('0.01');
    expect(currencyStep.inputMode).toBe('decimal');
    expect(currencyStep.getAttribute('aria-valuetext')).toBe('0.01');
    fireEvent.change(screen.getByLabelText('货币代码'), { target: { value: 'usd' } });
    fireEvent.change(currencyStep, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: '添加滑块字段' }));
    expect(screen.getByLabelText('滑块步长')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('滑块步长'), { target: { value: '' } });
    expect(
      container.querySelector('.a3s-form-design-widget input.input[type="range"]'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '添加日期时间字段' }));
    expect(screen.getByText(/受控值按带/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '添加时间字段' }));
    expect(screen.getByText(/受控值按带/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '添加星级评分字段' }));
    expect(screen.getByText(/最高评分读取校验面板/)).toBeTruthy();
    expect(container.querySelectorAll('.a3s-form-design-widget .a3s-form-rating svg')).toHaveLength(
      5,
    );

    fireEvent.click(screen.getByRole('button', { name: '添加隐藏值字段' }));
    expect(screen.getByText('不在填写页显示，值会随表单提交。')).toBeTruthy();
    expect(screen.getByText(/隐藏值保留在受控数据中/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '添加计算结果字段' }));
    expect(container.querySelector('.a3s-form-design-widget .a3s-form-calculated')).toBeTruthy();
    expect(screen.getByText(/计算结果只读展示受控值/)).toBeTruthy();

    const document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    expect(document.schema.properties?.field_1?.items?.enum).toEqual([
      'option-1',
      'option-2',
      'option-3',
    ]);
    expect(
      document.ui.nodes
        .find((node) => node.widget === 'multi-select')
        ?.options?.map(({ label }) => label),
    ).toEqual(['成员', 'Agent', '审核人']);
    expect(document.ui.nodes.find((node) => node.widget === 'currency')?.customProps).toEqual({
      currency: 'USD',
    });
    expect(document.ui.nodes.find((node) => node.widget === 'slider')?.customProps).toEqual({});
  });

  it('renders accessible controlled inputs for every extended field', () => {
    const { container } = render(<ExtendedFieldsHarness />);
    expect((screen.getByLabelText('网站') as HTMLInputElement).type).toBe('url');
    expect((screen.getByLabelText('联系电话') as HTMLInputElement).type).toBe('tel');
    expect((screen.getByLabelText('开始时间') as HTMLInputElement).value).toBe('2026-08-09T10:30');
    expect((screen.getByLabelText('提醒时间') as HTMLInputElement).value).toBe('09:15');
    expect(screen.getByRole('group', { name: '协作角色' })).toBeTruthy();
    expect(screen.getByText('CNY')).toBeTruthy();
    const rating = screen.getByRole('radiogroup', { name: '满意度' });
    expect(rating.classList.contains('field')).toBe(true);
    expect(rating.dataset.orientation).toBe('horizontal');
    expect((screen.getByLabelText('自动化比例') as HTMLInputElement).type).toBe('range');
    expect(container.querySelector('.a3s-form-slider-scale')?.textContent).toBe('0100');
    expect(screen.getByLabelText('总计').textContent).toBe('2,400');
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"]');
    expect(hidden?.value).toBe('org-a3s');
    expect(screen.queryByText('组织标识')).toBeNull();

    fireEvent.change(screen.getByLabelText('网站'), {
      target: { value: 'https://a3s.dev/form' },
    });
    fireEvent.change(screen.getByLabelText('开始时间'), {
      target: { value: '2026-08-10T11:45:30' },
    });
    fireEvent.change(screen.getByLabelText('提醒时间'), {
      target: { value: '10:20:00' },
    });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Agent' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '人类成员' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '审核人' }));

    const tags = screen.getByRole('textbox', { name: '添加技能标签' });
    fireEvent.change(tags, { target: { value: 'TypeScript' } });
    fireEvent.keyDown(tags, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '移除标签 Rust' }));
    fireEvent.change(screen.getByLabelText('预算'), { target: { value: '1600.5' } });
    fireEvent.click(screen.getByRole('radio', { name: '5 分，共 5 分' }));
    fireEvent.change(screen.getByLabelText('自动化比例'), { target: { value: '75' } });

    expect(screen.getByTestId('form-value').textContent).toBe(
      JSON.stringify({
        website: 'https://a3s.dev/form',
        phone: '+86 138 0000 0000',
        startsAt: '2026-08-10T11:45:30Z',
        reminderAt: '10:20:00Z',
        roles: ['human', 'reviewer'],
        skills: ['TypeScript'],
        budget: 1600.5,
        rating: 5,
        automation: 75,
        organizationId: 'org-a3s',
        total: 2400,
      }),
    );
  });

  it('serializes hidden values and falls back to field identifiers when labels are absent', () => {
    const unlabeled = structuredClone(extendedFieldDocument);
    const rolesNode = unlabeled.ui.nodes.find((node) => node.id === 'roles');
    if (!rolesNode) throw new Error('Missing roles node.');
    delete rolesNode.label;
    const missingHiddenValue = structuredClone(extendedInitialValue);
    delete missingHiddenValue.organizationId;

    const firstRender = render(
      <ExtendedFieldsHarness document={unlabeled} initialValue={missingHiddenValue} />,
    );
    expect(screen.getByRole('group', { name: 'roles' })).toBeTruthy();
    expect(
      firstRender.container.querySelector<HTMLInputElement>('input[type="hidden"]')?.value,
    ).toBe('');
    firstRender.unmount();

    const objectValueDocument = structuredClone(extendedFieldDocument);
    if (!objectValueDocument.schema.properties) throw new Error('Missing form properties.');
    objectValueDocument.schema.properties.organizationId = {
      type: 'object',
      properties: { region: { type: 'string' } },
      additionalProperties: false,
    };
    const objectValue: JsonObject = {
      ...extendedInitialValue,
      organizationId: { region: 'cn' },
    };
    const secondRender = render(
      <ExtendedFieldsHarness document={objectValueDocument} initialValue={objectValue} />,
    );
    expect(
      secondRender.container.querySelector<HTMLInputElement>('input[type="hidden"]')?.value,
    ).toBe('{"region":"cn"}');
  });

  it('normalizes offset date-time and time values to the UTC editing surface', () => {
    expect(dateTimeInputValue('2026-08-09T10:30:00+08:00')).toBe('2026-08-09T02:30:00');
    expect(dateTimeInputValue('not-a-date')).toBe('');
    expect(timeInputValue('01:15:30+02:00')).toBe('23:15:30');
    expect(timeInputValue('23:45:00-02:30')).toBe('02:15:00');
  });

  it('enforces collection limits and explains duplicate or full tag sets', () => {
    const document = structuredClone(extendedFieldDocument);
    const roles = document.schema.properties?.roles;
    const skills = document.schema.properties?.skills;
    if (!roles || !skills) throw new Error('Missing collection schemas.');
    roles.maxItems = 2;
    skills.minItems = 1;
    skills.maxItems = 2;
    render(<ExtendedFieldsHarness document={document} />);

    fireEvent.click(screen.getByRole('checkbox', { name: '人类成员' }));
    expect(screen.getByText('已选择 2 项')).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: '审核人' }) as HTMLInputElement).disabled).toBe(
      true,
    );

    const input = screen.getByRole('textbox', { name: '添加技能标签' });
    fireEvent.change(input, { target: { value: 'Rust' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('标签 Rust 已存在。').getAttribute('role')).toBe('status');

    fireEvent.change(input, { target: { value: 'TypeScript' } });
    fireEvent.keyDown(input, { key: ',' });
    fireEvent.change(input, { target: { value: 'Go' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('当前已经达到最多项目数。').getAttribute('role')).toBe('status');

    fireEvent.click(screen.getByRole('button', { name: '移除标签 Rust' }));
    expect(
      (screen.getByRole('button', { name: '移除标签 TypeScript' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('localizes component copy and exposes invalid read-only states', () => {
    const english = structuredClone(extendedFieldDocument);
    english.metadata.locale = 'en-US';
    const { container, unmount } = render(<ExtendedFieldsHarness document={english} />);
    expect(screen.getByText('1 selected')).toBeTruthy();
    expect(screen.getByPlaceholderText('Type a tag and press Enter')).toBeTruthy();
    expect((screen.getByRole('radio', { name: '4 of 5' }) as HTMLInputElement).checked).toBe(true);
    expect(container.querySelectorAll('[title="UTC time"]')).toHaveLength(2);
    unmount();

    render(
      <ExtendedFieldsHarness
        readOnly
        errors={[
          { path: 'roles', code: 'roles.required', message: '至少选择一个协作角色。' },
          { path: 'rating', code: 'rating.invalid', message: '请重新评分。' },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: '协作角色' }).getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(screen.getByRole('radiogroup', { name: '满意度' }).getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect((screen.getByRole('checkbox', { name: 'Agent' }) as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(
      (screen.getByRole('radio', { name: '4 分，共 5 分' }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('textbox', { name: '添加技能标签' }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect((screen.getByLabelText('预算') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('自动化比例') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('至少选择一个协作角色。').getAttribute('role')).toBe('alert');
  });
});
