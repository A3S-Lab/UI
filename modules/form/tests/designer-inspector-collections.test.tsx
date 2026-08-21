import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import type { UiMatrixColumn, UiMatrixRow, UiNode, UiOption } from '../src/core';
import {
  LayoutItemEditor,
  MatrixDefinitionEditor,
  OptionEditor,
} from '../src/react/designer-inspector-collections';

function runCollectionAction(item: string, action: string) {
  fireEvent.click(screen.getByLabelText(`${item} 操作`));
  fireEvent.click(
    within(screen.getByLabelText(`${item} 操作菜单`)).getByRole('menuitem', { name: action }),
  );
}

function OptionEditorHarness({ initial }: { initial: UiOption[] }) {
  const [options, setOptions] = useState(initial);
  return (
    <>
      <OptionEditor options={options} onChange={setOptions} onBulkChange={() => undefined} />
      <output data-testid="option-values">
        {JSON.stringify(options.map(({ value }) => value))}
      </output>
    </>
  );
}

function MatrixEditorHarness({
  initialRows,
  initialColumns,
}: {
  initialRows: UiMatrixRow[];
  initialColumns: UiMatrixColumn[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [columns, setColumns] = useState(initialColumns);
  return (
    <>
      <MatrixDefinitionEditor
        rows={rows}
        columns={columns}
        onRowsChange={setRows}
        onColumnsChange={setColumns}
        onBulkRowsChange={() => undefined}
        onBulkColumnsChange={() => undefined}
      />
      <output data-testid="matrix-rows">{JSON.stringify(rows)}</output>
      <output data-testid="matrix-columns">{JSON.stringify(columns)}</output>
    </>
  );
}

describe('designer collection value editors', () => {
  it('shows an actionable empty state for an imported choice without static options', () => {
    render(<OptionEditorHarness initial={[]} />);

    expect(screen.getByText('暂无静态选项，可逐项添加或使用批量编辑。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '添加选项' }));
    expect(screen.getByTestId('option-values').textContent).toBe('["option-1"]');
  });

  it('validates and commits numeric submitted values with keyboard controls', () => {
    render(
      <OptionEditorHarness
        initial={[
          { label: 'One', value: 1 },
          { label: 'Two', value: 2 },
        ]}
      />,
    );

    let input = screen.getByLabelText('选项 1 提交值') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.inputMode).toBe('decimal');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toBe('提交值不能为空。');

    fireEvent.change(input, { target: { value: '1e309' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert').textContent).toBe('请输入有效数字。');

    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert').textContent).toBe('提交值必须唯一。');

    fireEvent.change(input, { target: { value: '3.5' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('option-values').textContent).toBe('[3.5,2]');

    input = screen.getByLabelText('选项 1 提交值') as HTMLInputElement;
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('3.5');
    expect(screen.getByTestId('option-values').textContent).toBe('[3.5,2]');
  });

  it('supports boolean submitted values and renders null as a stable token', () => {
    const { unmount } = render(
      <OptionEditorHarness initial={[{ label: 'Disabled', value: false }]} />,
    );

    fireEvent.change(screen.getByLabelText('选项 1 提交值'), { target: { value: 'true' } });
    expect(screen.getByTestId('option-values').textContent).toBe('[true]');
    fireEvent.click(screen.getByRole('button', { name: '添加选项' }));
    expect(screen.getByTestId('option-values').textContent).toBe('[true,false]');
    expect((screen.getByRole('button', { name: '添加选项' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.change(screen.getByLabelText('选项 1 提交值'), { target: { value: 'false' } });
    expect(screen.getByRole('alert').textContent).toBe('提交值必须唯一。');

    unmount();
    render(<OptionEditorHarness initial={[{ label: 'Unset', value: null }]} />);
    expect(screen.getByText('提交值 · null')).toBeTruthy();
    expect(screen.getAllByText('null')).toHaveLength(2);
  });

  it('validates matrix row identifiers and keeps boolean column values typed', () => {
    render(
      <MatrixEditorHarness
        initialRows={[
          { id: 'quality', label: 'Quality' },
          { id: 'speed', label: 'Speed' },
        ]}
        initialColumns={[{ label: 'No', value: false }]}
      />,
    );

    let input = screen.getByLabelText('矩阵行 1 行 ID') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toBe('行 ID 不能为空。');

    fireEvent.change(input, { target: { value: ' quality ' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert').textContent).toBe('行 ID 首尾不能有空格。');

    fireEvent.change(input, { target: { value: 'quality.current' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert').textContent).toBe('行 ID 不能包含句点或使用 *。');

    fireEvent.change(input, { target: { value: '*' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert').textContent).toBe('行 ID 不能包含句点或使用 *。');

    fireEvent.change(input, { target: { value: 'speed' } });
    fireEvent.blur(input);
    expect(screen.getByRole('alert').textContent).toBe('行 ID 必须唯一。');

    fireEvent.change(input, { target: { value: 'accuracy' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('matrix-rows').textContent).toContain('"id":"accuracy"');

    input = screen.getByLabelText('矩阵行 1 行 ID') as HTMLInputElement;
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: 'temporary' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('accuracy');

    runCollectionAction('矩阵行 Quality', '停用矩阵行 Quality');
    runCollectionAction('矩阵行 Quality', '启用矩阵行 Quality');

    fireEvent.click(screen.getByRole('button', { name: '添加矩阵列' }));
    expect(screen.getByTestId('matrix-columns').textContent).toBe(
      '[{"label":"No","value":false},{"label":"新矩阵列 2","value":true}]',
    );
    expect((screen.getByRole('button', { name: '添加矩阵列' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('keeps sparse wizard items editable and exposes every structural action', () => {
    const actions: string[] = [];
    let update: { id: string; changes: Partial<UiNode> } | undefined;

    render(
      <LayoutItemEditor
        layout="wizard"
        items={[
          { id: 'step-1', kind: 'group', layout: 'page', children: [] },
          { id: 'step-2', kind: 'group', label: '详情', layout: 'page', children: [] },
        ]}
        onAdd={() => actions.push('add')}
        onSelect={(id) => actions.push(`select:${id}`)}
        onUpdate={(id, changes) => {
          update = { id, changes };
        }}
        onMove={(id, offset) => actions.push(`move:${id}:${offset}`)}
        onDuplicate={(id) => actions.push(`duplicate:${id}`)}
        onRemove={(id) => actions.push(`remove:${id}`)}
      />,
    );

    expect(screen.getByText('2 项 · 无确认步骤')).toBeTruthy();
    expect((screen.getByLabelText('步骤 1 名称') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('步骤 1 类型') as HTMLSelectElement).value).toBe('form');

    fireEvent.change(screen.getByLabelText('步骤 1 名称'), { target: { value: '开始' } });
    expect(update).toEqual({ id: 'step-1', changes: { label: '开始' } });
    fireEvent.change(screen.getByLabelText('步骤 1 类型'), { target: { value: 'review' } });
    expect(update).toEqual({ id: 'step-1', changes: { pageRole: 'review' } });

    runCollectionAction('步骤 未命名步骤', '编辑内容');
    runCollectionAction('步骤 未命名步骤', '下移步骤 未命名步骤');
    runCollectionAction('步骤 详情', '复制步骤 详情');
    runCollectionAction('步骤 详情', '删除步骤 详情');
    fireEvent.click(screen.getByRole('button', { name: '添加步骤' }));

    expect(actions).toEqual([
      'select:step-1',
      'move:step-1:1',
      'duplicate:step-2',
      'remove:step-2',
      'add',
    ]);
  });
});
