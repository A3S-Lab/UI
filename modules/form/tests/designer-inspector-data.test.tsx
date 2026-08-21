import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { FormDocument, JsonSchema, UiNode, UiOption } from '../src/core';
import { DataSourceControl, DefaultValueControl } from '../src/react/designer-inspector-data';

function DefaultValueHarness({
  initial,
  widget,
  options = [],
}: {
  initial: JsonSchema;
  widget: string;
  options?: UiOption[];
}) {
  const [schema, setSchema] = useState(initial);
  return (
    <>
      <DefaultValueControl
        schema={schema}
        widget={widget}
        options={options}
        onChange={(value) => setSchema((current) => ({ ...current, default: value }))}
      />
      <output data-testid="default-value">{JSON.stringify(schema.default)}</output>
    </>
  );
}

const sourceDocument: FormDocument = {
  kind: 'a3s.form',
  apiVersion: 'a3s.dev/form/v1alpha1',
  revision: 1,
  metadata: { title: 'Source settings' },
  schema: { type: 'object' },
  ui: { root: 'root', nodes: [{ id: 'root', kind: 'root', children: [] }] },
  dataSources: [{ id: 'models', registryKey: 'test.models' }],
};

function DataSourceHarness({ initial, schema }: { initial: UiNode; schema: JsonSchema }) {
  const [node, setNode] = useState(initial);
  return (
    <>
      <DataSourceControl
        document={sourceDocument}
        node={node}
        schema={schema}
        onUpdateNode={(changes) => setNode((current) => ({ ...current, ...changes }))}
      />
      <output data-testid="source-node">{JSON.stringify(node)}</output>
    </>
  );
}

describe('Designer Inspector value controls', () => {
  it('uses the same native UTC controls as the runtime', () => {
    const { unmount } = render(
      <DefaultValueHarness
        initial={{
          type: 'string',
          format: 'date-time',
          default: '2026-08-10T09:30:00Z',
        }}
        widget="date-time"
      />,
    );

    const dateTime = screen.getByLabelText('默认值') as HTMLInputElement;
    expect(dateTime.type).toBe('datetime-local');
    expect(dateTime.value).toBe('2026-08-10T09:30');
    expect(dateTime.classList.contains('input')).toBe(true);
    expect(dateTime.closest('.input-group')).toBeTruthy();
    expect(screen.getByTitle('协调世界时').textContent).toBe('UTC');
    fireEvent.change(dateTime, { target: { value: '2026-08-11T15:45:30' } });
    expect(screen.getByTestId('default-value').textContent).toBe('"2026-08-11T15:45:30Z"');

    unmount();
    render(
      <DefaultValueHarness
        initial={{ type: 'string', format: 'time', default: '09:15:00Z' }}
        widget="time"
      />,
    );
    const time = screen.getByLabelText('默认值') as HTMLInputElement;
    expect(time.type).toBe('time');
    expect(time.value).toBe('09:15');
    fireEvent.change(time, { target: { value: '18:20:05' } });
    expect(screen.getByTestId('default-value').textContent).toBe('"18:20:05Z"');
  });

  it('matches multiline defaults to the textarea component', () => {
    render(
      <DefaultValueHarness
        initial={{ type: 'string', default: '第一行\n第二行' }}
        widget="textarea"
      />,
    );

    const control = screen.getByLabelText('默认值');
    expect(control.tagName).toBe('TEXTAREA');
    expect(control.classList.contains('textarea')).toBe(true);
    fireEvent.change(control, { target: { value: '更新后的说明' } });
    expect(screen.getByTestId('default-value').textContent).toBe('"更新后的说明"');
  });

  it('allows a disabled option to be removed from an existing multi-select default', () => {
    render(
      <DefaultValueHarness
        initial={{ type: 'array', default: ['legacy'], items: { type: 'string' } }}
        widget="multi-select"
        options={[{ label: '历史选项', value: 'legacy', disabled: true }]}
      />,
    );

    const option = screen.getByRole('checkbox', {
      name: '默认选择：历史选项',
    }) as HTMLInputElement;
    expect(option.checked).toBe(true);
    expect(option.disabled).toBe(false);
    fireEvent.click(option);
    expect(screen.getByTestId('default-value').textContent).toBe('');
  });

  it('restores multi-select options from the array item enum', () => {
    render(
      <DataSourceHarness
        initial={{
          id: 'model',
          kind: 'field',
          widget: 'multi-select',
          schemaPath: '/properties/model',
          dataSource: 'models',
        }}
        schema={{
          type: 'array',
          items: { type: 'string', enum: ['small', 'large'] },
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText('选项来源'), { target: { value: '' } });
    expect(screen.getByTestId('source-node').textContent).toContain(
      '"options":[{"label":"small","value":"small"},{"label":"large","value":"large"}]',
    );
  });
});
