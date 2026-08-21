import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import {
  assertCompiled,
  compileForm,
  type FormDocument,
  type JsonObject,
  MATRIX_LIMITS,
  resolveFormLocaleCatalog,
  validateFormValue,
} from '../src/core';
import { FormDesigner, FormRenderer } from '../src/react';
import { MatrixDefinitionEditor } from '../src/react/designer-inspector-collections';
import { MatrixWidget } from '../src/react/matrix-widget';
import type { FormWidgetProps } from '../src/react/native-widget';
import { createDocument } from './fixtures';

const matrixRows = [
  { id: 'usability', label: '界面易用性' },
  { id: 'reliability', label: '运行稳定性', description: '包含失败恢复与结果一致性' },
  { id: 'support', label: '支持质量', disabled: true },
] as const;

const matrixColumns = [
  { label: '待改进', value: 'low' },
  { label: '符合预期', value: 'expected' },
  { label: '表现出色', value: 'excellent', disabled: true },
] as const;

function matrixDocument(widget: 'matrix-single' | 'matrix-multiple'): FormDocument {
  const multiple = widget === 'matrix-multiple';
  const rowSchema = () =>
    multiple
      ? {
          type: 'array' as const,
          items: { type: 'string' as const, enum: matrixColumns.map(({ value }) => value) },
          minItems: 1,
          maxItems: 2,
          uniqueItems: true,
        }
      : {
          type: 'string' as const,
          enum: matrixColumns.map(({ value }) => value),
        };
  return {
    kind: 'a3s.form',
    apiVersion: 'a3s.dev/form/v1alpha1',
    revision: 1,
    metadata: { title: '体验评估', locale: 'zh-CN' },
    schema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        answers: {
          type: 'object',
          properties: Object.fromEntries(matrixRows.map((row) => [row.id, rowSchema()])),
          required: matrixRows.map(({ id }) => id),
          additionalProperties: false,
        },
      },
      required: ['answers'],
      additionalProperties: false,
    },
    ui: {
      root: 'root',
      nodes: [
        { id: 'root', kind: 'root', children: ['answers'] },
        {
          id: 'answers',
          kind: 'field',
          label: multiple ? '能力覆盖' : '整体体验',
          description: multiple ? '每行最多选择两项。' : '每行选择一个答案。',
          widget,
          schemaPath: '/properties/answers',
          matrix: {
            rows: matrixRows.map((row) => ({ ...row })),
            columns: matrixColumns.map((column) => ({ ...column })),
          },
        },
      ],
    },
    rules: [],
    dataSources: [],
    actions: [],
  };
}

function diagnosticCodes(document: unknown): string[] {
  return compileForm(document).diagnostics.map(({ code }) => code);
}

function directWidgetProps(overrides: Partial<FormWidgetProps> = {}): FormWidgetProps {
  return {
    id: 'direct-matrix',
    node: {
      id: 'direct-matrix',
      kind: 'field',
      widget: 'matrix-single',
      matrix: { rows: [], columns: [] },
    },
    value: undefined,
    disabled: false,
    invalid: false,
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
    messages: resolveFormLocaleCatalog('zh-CN').messages,
    locale: 'zh-CN',
    onChange: () => undefined,
    ...overrides,
  };
}

function RuntimeHarness({
  document,
  initialValue,
  readOnly = false,
  errors = [],
}: {
  document: FormDocument;
  initialValue: JsonObject;
  readOnly?: boolean;
  errors?: { path: string; code: string; message: string }[];
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <>
      <FormRenderer
        plan={assertCompiled(document)}
        value={value}
        onChange={setValue}
        readOnly={readOnly}
        errors={errors}
      />
      <output data-testid="matrix-value">{JSON.stringify(value)}</output>
    </>
  );
}

function DesignerHarness({ initialDocument }: { initialDocument?: FormDocument } = {}) {
  const [document, setDocument] = useState(
    () => compileForm(initialDocument ?? createDocument()).document as FormDocument,
  );
  return (
    <>
      <FormDesigner document={document} onChange={setDocument} />
      <output data-testid="designer-document">{JSON.stringify(document)}</output>
    </>
  );
}

describe('matrix field contract', () => {
  it('compiles canonical single-choice and multiple-choice matrix documents', () => {
    const single = assertCompiled(matrixDocument('matrix-single'));
    const multiple = assertCompiled(matrixDocument('matrix-multiple'));

    expect(single.nodeById.answers.matrix?.rows).toHaveLength(3);
    expect(single.nodeById.answers.matrix?.columns).toHaveLength(3);
    expect(multiple.nodeById.answers.schema?.properties?.usability).toEqual(
      expect.objectContaining({ type: 'array', minItems: 1, maxItems: 2, uniqueItems: true }),
    );
  });

  it('rejects ambiguous configuration, schema drift and bounded-size violations', () => {
    const missing = matrixDocument('matrix-single');
    delete missing.ui.nodes[1].matrix;
    expect(diagnosticCodes(missing)).toContain('matrix.definition');

    const duplicateRow = matrixDocument('matrix-single');
    duplicateRow.ui.nodes[1].matrix?.rows.push({ id: 'usability', label: '重复行' });
    expect(diagnosticCodes(duplicateRow)).toContain('matrix.row_duplicate');

    const duplicateColumn = matrixDocument('matrix-single');
    duplicateColumn.ui.nodes[1].matrix?.columns.push({ label: '重复列', value: 'low' });
    expect(diagnosticCodes(duplicateColumn)).toContain('matrix.column_duplicate');

    const driftedSchema = matrixDocument('matrix-multiple');
    const usability = driftedSchema.schema.properties?.answers?.properties?.usability;
    if (!usability?.items) throw new Error('Missing matrix row schema.');
    usability.items.enum = ['low', 'expected'];
    expect(diagnosticCodes(driftedSchema)).toContain('matrix.row_schema');

    const extraProperty = matrixDocument('matrix-single');
    const answers = extraProperty.schema.properties?.answers;
    if (!answers?.properties) throw new Error('Missing matrix schema.');
    answers.properties.orphan = { type: 'string', enum: ['low', 'expected', 'excellent'] };
    expect(diagnosticCodes(extraProperty)).toContain('matrix.schema_properties');

    const oversized = matrixDocument('matrix-single');
    oversized.ui.nodes[1].matrix = {
      rows: Array.from({ length: MATRIX_LIMITS.maxRows + 1 }, (_, index) => ({
        id: `row_${index}`,
        label: `第 ${index + 1} 行`,
      })),
      columns: matrixColumns.map((column) => ({ ...column })),
    };
    expect(diagnosticCodes(oversized)).toContain('matrix.limits');

    const ordinary = createDocument();
    ordinary.ui.nodes[1].matrix = {
      rows: [{ id: 'row', label: '行' }],
      columns: [{ label: '列', value: 'column' }],
    };
    expect(diagnosticCodes(ordinary)).toContain('matrix.scope');
  });

  it('validates matrix structure, primitive types and exact row schemas', () => {
    const container = matrixDocument('matrix-single');
    container.ui.nodes[1].kind = 'content';
    expect(diagnosticCodes(container)).toContain('matrix.container');

    const staticOptions = matrixDocument('matrix-single');
    staticOptions.ui.nodes[1].options = [{ label: '冲突选项', value: 'conflict' }];
    expect(diagnosticCodes(staticOptions)).toContain('matrix.options_source');

    const remoteOptions = matrixDocument('matrix-single');
    remoteOptions.ui.nodes[1].dataSource = 'remote-options';
    expect(diagnosticCodes(remoteOptions)).toContain('matrix.options_source');

    const invalidDefinition = matrixDocument('matrix-single');
    invalidDefinition.ui.nodes[1].matrix = { rows: 'invalid', columns: [] } as never;
    expect(diagnosticCodes(invalidDefinition)).toContain('matrix.definition');

    const empty = matrixDocument('matrix-single');
    empty.ui.nodes[1].matrix = { rows: [], columns: [] };
    expect(diagnosticCodes(empty)).toEqual(
      expect.arrayContaining(['matrix.rows', 'matrix.columns']),
    );

    const invalidRow = matrixDocument('matrix-single');
    if (!invalidRow.ui.nodes[1].matrix) throw new Error('Missing matrix definition.');
    invalidRow.ui.nodes[1].matrix.rows[0] = { id: '*', label: '' };
    expect(diagnosticCodes(invalidRow)).toContain('matrix.row');

    const invalidColumn = matrixDocument('matrix-single');
    if (!invalidColumn.ui.nodes[1].matrix) throw new Error('Missing matrix definition.');
    invalidColumn.ui.nodes[1].matrix.columns[0] = { label: '', value: null } as never;
    expect(diagnosticCodes(invalidColumn)).toContain('matrix.column');

    const mixedColumns = matrixDocument('matrix-single');
    if (!mixedColumns.ui.nodes[1].matrix) throw new Error('Missing matrix definition.');
    mixedColumns.ui.nodes[1].matrix.columns[1].value = 2;
    expect(diagnosticCodes(mixedColumns)).toContain('matrix.column_type');

    const openObject = matrixDocument('matrix-single');
    const openSchema = openObject.schema.properties?.answers;
    if (!openSchema) throw new Error('Missing matrix schema.');
    openSchema.additionalProperties = true;
    expect(diagnosticCodes(openObject)).toContain('matrix.schema_type');

    const missingRowSchema = matrixDocument('matrix-single');
    const missingProperties = missingRowSchema.schema.properties?.answers?.properties;
    if (!missingProperties) throw new Error('Missing matrix row schemas.');
    delete missingProperties.usability;
    expect(diagnosticCodes(missingRowSchema)).toEqual(
      expect.arrayContaining(['matrix.schema_properties', 'matrix.row_schema']),
    );

    const excessiveSelection = matrixDocument('matrix-multiple');
    const multipleRow = excessiveSelection.schema.properties?.answers?.properties?.usability;
    if (!multipleRow) throw new Error('Missing multiple-choice row schema.');
    multipleRow.minItems = matrixColumns.length + 1;
    multipleRow.maxItems = matrixColumns.length + 1;
    expect(diagnosticCodes(excessiveSelection)).toContain('matrix.row_schema');

    for (const [values, schemaTypes] of [
      [
        [true, false],
        ['boolean', 'boolean', 'boolean'],
      ],
      [
        [1, 2],
        ['integer', 'number', 'number'],
      ],
    ] as const) {
      const typed = matrixDocument('matrix-single');
      if (!typed.ui.nodes[1].matrix) throw new Error('Missing typed matrix definition.');
      typed.ui.nodes[1].matrix.columns = values.map((value, index) => ({
        label: `选项 ${index + 1}`,
        value,
      }));
      const properties = typed.schema.properties?.answers?.properties;
      if (!properties) throw new Error('Missing typed matrix schemas.');
      Object.values(properties).forEach((schema, index) => {
        schema.type = schemaTypes[index];
        schema.enum = [...values];
      });
      expect(compileForm(typed).ok).toBe(true);
    }
  });
});

describe('matrix field runtime', () => {
  it('emits a canonical object for every single-choice row', () => {
    render(
      <RuntimeHarness
        document={matrixDocument('matrix-single')}
        initialValue={{ answers: { usability: 'expected', reliability: 'low' } }}
      />,
    );

    const table = screen.getByRole('table', { name: '整体体验' });
    const firstRadio = screen.getByRole('radio', { name: '界面易用性：符合预期' });
    expect(table.classList.contains('table')).toBe(true);
    expect(table.parentElement?.classList.contains('table-container')).toBe(true);
    expect(table.closest('fieldset')?.classList.contains('fieldset')).toBe(true);
    expect(firstRadio.classList.contains('input')).toBe(true);
    expect(within(table).getByRole('columnheader', { name: '符合预期' })).toBeTruthy();
    expect(within(table).getByRole('rowheader', { name: /运行稳定性/ })).toBeTruthy();
    expect((firstRadio as HTMLInputElement).checked).toBe(true);
    expect(
      (screen.getByRole('radio', { name: '支持质量：待改进' }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('radio', { name: '界面易用性：表现出色' }) as HTMLInputElement).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: '界面易用性：待改进' }));
    fireEvent.click(screen.getByRole('radio', { name: '运行稳定性：符合预期' }));
    expect(screen.getByTestId('matrix-value').textContent).toBe(
      JSON.stringify({
        answers: { usability: 'low', reliability: 'expected' },
      }),
    );
  });

  it('enforces per-row multiple-choice limits while keeping selected values removable', () => {
    render(
      <RuntimeHarness
        document={matrixDocument('matrix-multiple')}
        initialValue={{ answers: { usability: ['low'], reliability: ['expected'] } }}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '界面易用性：符合预期' }));
    expect(screen.getByText('已选择 2 项 · 最多 2 项')).toBeTruthy();
    expect(
      (screen.getByRole('checkbox', { name: '界面易用性：表现出色' }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('checkbox', { name: '界面易用性：待改进' }) as HTMLInputElement).disabled,
    ).toBe(false);

    fireEvent.click(screen.getByRole('checkbox', { name: '界面易用性：待改进' }));
    expect(screen.getByTestId('matrix-value').textContent).toBe(
      JSON.stringify({ answers: { usability: ['expected'], reliability: ['expected'] } }),
    );
  });

  it('binds row errors to the exact path and exposes invalid and read-only states', () => {
    const document = matrixDocument('matrix-single');
    const value: JsonObject = { answers: { usability: 'expected' } };
    expect(validateFormValue(assertCompiled(document), value)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'answers.reliability', code: 'required' }),
      ]),
    );

    const { rerender } = render(
      <RuntimeHarness
        document={document}
        initialValue={value}
        errors={[
          {
            path: 'answers.reliability',
            code: 'required',
            message: '请选择运行稳定性的答案。',
          },
        ]}
      />,
    );
    const reliabilityRow = screen.getByRole('radio', { name: '运行稳定性：待改进' }).closest('tr');
    expect(reliabilityRow?.getAttribute('data-a3s-form-path')).toBe('answers.reliability');
    expect(reliabilityRow?.getAttribute('data-invalid')).toBe('true');
    expect(within(reliabilityRow as HTMLElement).getByRole('alert').textContent).toBe(
      '请选择运行稳定性的答案。',
    );

    rerender(<RuntimeHarness document={document} initialValue={value} readOnly />);
    expect(
      screen.getAllByRole('radio').every((input) => (input as HTMLInputElement).disabled),
    ).toBe(true);
  });

  it('keeps defensive and optional matrix states semantic', () => {
    let blurCount = 0;
    let focusCount = 0;
    const onBlur = () => {
      blurCount += 1;
    };
    const onFocus = () => {
      focusCount += 1;
    };
    const { rerender } = render(
      <MatrixWidget {...directWidgetProps({ onBlur, onFocus, invalid: true })} />,
    );
    const empty = screen.getByRole('group', { name: 'direct-matrix' });
    expect(within(empty).getByText('矩阵尚未配置行或列。')).toBeTruthy();
    expect(empty.getAttribute('aria-invalid')).toBe('true');
    fireEvent.focus(empty);
    fireEvent.blur(empty, { relatedTarget: null });
    expect(focusCount).toBe(1);
    expect(blurCount).toBe(1);

    const changes: unknown[] = [];
    const onChange: FormWidgetProps['onChange'] = (value) => {
      changes.push(value);
    };
    rerender(
      <MatrixWidget
        {...directWidgetProps({
          node: {
            id: 'optional-matrix',
            kind: 'field',
            widget: 'matrix-single',
            matrix: {
              rows: [{ id: 'optional', label: '可选问题' }],
              columns: [{ label: '同意', value: true }],
            },
          },
          schema: {
            type: 'object',
            properties: { optional: { type: 'boolean', enum: [true] } },
            additionalProperties: false,
          },
          value: [],
          onChange,
        })}
      />,
    );
    const radio = screen.getByRole('radio', { name: '可选问题：同意' });
    expect(radio.getAttribute('aria-describedby')).toBeNull();
    expect((radio as HTMLInputElement).required).toBe(false);
    fireEvent.click(radio);
    expect(changes).toContainEqual({ optional: true });

    rerender(
      <MatrixWidget
        {...directWidgetProps({
          node: {
            id: 'multiple-matrix',
            kind: 'field',
            label: '多项矩阵',
            widget: 'matrix-multiple',
            matrix: {
              rows: [{ id: 'row', label: '多选问题' }],
              columns: [{ label: '选项', value: 'option' }],
            },
          },
          schema: {
            type: 'object',
            properties: {
              row: {
                type: 'array',
                items: { type: 'string', enum: ['option'] },
                minItems: 1,
                uniqueItems: true,
              },
            },
            additionalProperties: false,
          },
          valuePath: 'answers',
          value: { row: 'not-an-array' },
          errors: [{ path: 'answers', code: 'matrix', message: '矩阵值无效。' }],
          onChange,
        })}
      />,
    );
    expect(screen.getByRole('alert').textContent).toBe('矩阵值无效。');
    expect(screen.queryByTitle('必选')).toBeNull();
    const checkbox = screen.getByRole('checkbox', { name: '多选问题：选项' });
    expect((checkbox as HTMLInputElement).disabled).toBe(false);
    fireEvent.click(checkbox);
    expect(changes.at(-1)).toEqual({ row: ['option'] });
  });
});

describe('matrix field designer', () => {
  it('keeps collection actions accessible while a matrix title is empty', () => {
    render(
      <MatrixDefinitionEditor
        rows={[{ id: 'untitled', label: '' }]}
        columns={[{ label: '同意', value: true }]}
        onRowsChange={() => undefined}
        onColumnsChange={() => undefined}
        onBulkRowsChange={() => undefined}
        onBulkColumnsChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByLabelText('矩阵行 未命名矩阵行 操作'));
    expect(screen.getByRole('menuitem', { name: '删除矩阵行 未命名矩阵行' })).toBeTruthy();
  });

  it('keeps row ids and column values aligned with Schema while editing and reordering', () => {
    render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加单选矩阵字段' }));

    fireEvent.change(screen.getByLabelText('矩阵行 1 标题'), {
      target: { value: '结果准确性' },
    });
    const rowId = screen.getByLabelText('矩阵行 1 行 ID');
    fireEvent.change(rowId, { target: { value: 'accuracy' } });
    fireEvent.blur(rowId);
    fireEvent.click(screen.getByLabelText('矩阵行 结果准确性 操作'));
    fireEvent.click(screen.getByRole('menuitem', { name: '下移矩阵行 结果准确性' }));
    fireEvent.click(screen.getByLabelText('矩阵行 结果准确性 操作'));
    fireEvent.click(screen.getByRole('menuitem', { name: '停用矩阵行 结果准确性' }));
    fireEvent.change(screen.getByLabelText('矩阵列 1 标题'), {
      target: { value: '需要改进' },
    });
    const columnValue = screen.getByLabelText('矩阵列 1 提交值');
    fireEvent.change(columnValue, { target: { value: 'needs-improvement' } });
    fireEvent.blur(columnValue);
    fireEvent.click(screen.getByLabelText('矩阵列 需要改进 操作'));
    fireEvent.click(screen.getByRole('menuitem', { name: '下移矩阵列 需要改进' }));

    const document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    const matrix = document.ui.nodes.find((node) => node.widget === 'matrix-single');
    const property = matrix?.schemaPath?.split('/').at(-1);
    const schema = property ? document.schema.properties?.[property] : undefined;
    expect(matrix?.matrix?.rows.map(({ id }) => id)).toEqual(['speed', 'accuracy', 'usability']);
    expect(matrix?.matrix?.rows.find(({ id }) => id === 'accuracy')?.disabled).toBe(true);
    expect(Object.keys(schema?.properties ?? {})).toEqual(['accuracy', 'speed', 'usability']);
    expect(schema?.required).toEqual(['speed', 'accuracy', 'usability']);
    expect(matrix?.matrix?.columns.map(({ value }) => value)).toEqual([
      'expected',
      'needs-improvement',
      'excellent',
    ]);
    expect(Object.values(schema?.properties ?? {})[0]?.enum).toEqual([
      'expected',
      'needs-improvement',
      'excellent',
    ]);
    expect(compileForm(document).ok).toBe(true);
  });

  it('authors both presets and keeps visual row and column edits aligned with Schema', () => {
    const { container } = render(<DesignerHarness />);
    fireEvent.click(screen.getByRole('button', { name: '添加单选矩阵字段' }));

    expect(
      container.querySelector('.a3s-form-design-widget .table-container > table.table'),
    ).toBeTruthy();
    expect(screen.getByLabelText('矩阵行')).toBeTruthy();
    expect(screen.getByLabelText('矩阵列')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '添加矩阵列' }));
    expect(screen.getByLabelText('矩阵列 4 标题')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('矩阵行'), {
      target: { value: '响应速度\n结果质量\n使用成本\n恢复能力' },
    });
    fireEvent.change(screen.getByLabelText('矩阵列'), {
      target: { value: '较差\n一般\n很好\n极佳' },
    });

    let document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    let matrix = document.ui.nodes.find((node) => node.widget === 'matrix-single');
    expect(matrix?.matrix?.rows.map(({ label }) => label)).toEqual([
      '响应速度',
      '结果质量',
      '使用成本',
      '恢复能力',
    ]);
    expect(matrix?.matrix?.columns.map(({ label }) => label)).toEqual([
      '较差',
      '一般',
      '很好',
      '极佳',
    ]);
    const binding = matrix?.schemaPath?.split('/').at(-1);
    const matrixSchema = binding ? document.schema.properties?.[binding] : undefined;
    expect(Object.keys(matrixSchema?.properties ?? {})).toHaveLength(4);
    expect(Object.values(matrixSchema?.properties ?? {})[0]?.enum).toHaveLength(4);

    fireEvent.change(screen.getByLabelText('矩阵行'), { target: { value: '\n' } });
    fireEvent.change(screen.getByLabelText('矩阵列'), { target: { value: '\n' } });

    fireEvent.change(screen.getByLabelText('字段组件'), {
      target: { value: 'matrix-multiple' },
    });
    document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    matrix = document.ui.nodes.find((node) => node.id === matrix?.id);
    const property = matrix?.schemaPath?.split('/').at(-1);
    const firstRow = property
      ? Object.values(document.schema.properties?.[property]?.properties ?? {})[0]
      : undefined;
    expect(matrix?.widget).toBe('matrix-multiple');
    expect(firstRow).toEqual(
      expect.objectContaining({ type: 'array', minItems: 1, maxItems: 2, uniqueItems: true }),
    );
    fireEvent.click(screen.getByRole('tab', { name: '校验' }));
    const rowsRequired = screen.getByLabelText('每行必选');
    fireEvent.click(rowsRequired);
    fireEvent.click(rowsRequired);

    const minimum = screen.getByLabelText('每行最少选择数');
    const maximum = screen.getByLabelText('每行最多选择数');
    fireEvent.change(minimum, { target: { value: '' } });
    fireEvent.change(minimum, { target: { value: '1' } });
    fireEvent.change(maximum, { target: { value: '' } });
    fireEvent.change(maximum, { target: { value: '2' } });

    fireEvent.click(screen.getByRole('tab', { name: '属性' }));
    fireEvent.change(screen.getByLabelText('矩阵列'), {
      target: { value: '较差\n很好' },
    });
    fireEvent.change(screen.getByLabelText('字段组件'), { target: { value: 'text' } });
    document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    matrix = document.ui.nodes.find((node) => node.id === matrix?.id);
    expect(matrix?.matrix).toBeUndefined();

    fireEvent.change(screen.getByLabelText('字段组件'), {
      target: { value: 'matrix-multiple' },
    });
    document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    matrix = document.ui.nodes.find((node) => node.id === matrix?.id);
    expect(matrix?.matrix?.columns).toHaveLength(3);
  });

  it('preserves numeric and boolean column types while editing imported matrices', () => {
    const numeric = matrixDocument('matrix-single');
    if (!numeric.ui.nodes[1].matrix) throw new Error('Missing numeric matrix definition.');
    numeric.ui.nodes[1].matrix.columns = [
      { label: '低', value: 1 },
      { label: '中', value: 2 },
    ];
    const numericSchemas = numeric.schema.properties?.answers?.properties;
    if (!numericSchemas) throw new Error('Missing numeric row schemas.');
    for (const schema of Object.values(numericSchemas)) {
      schema.type = 'number';
      schema.enum = [1, 2];
    }

    const numericRender = render(<DesignerHarness initialDocument={numeric} />);
    fireEvent.change(screen.getByLabelText('矩阵列'), {
      target: { value: '低\n中\n高' },
    });
    let document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    let matrix = document.ui.nodes.find((node) => node.id === 'answers');
    expect(matrix?.matrix?.columns.map(({ value }) => value)).toEqual([1, 2, 3]);
    expect(compileForm(document).ok).toBe(true);
    numericRender.unmount();

    const boolean = matrixDocument('matrix-single');
    if (!boolean.ui.nodes[1].matrix) throw new Error('Missing boolean matrix definition.');
    boolean.ui.nodes[1].matrix.columns = [
      { label: '否', value: false },
      { label: '是', value: true },
    ];
    const booleanSchemas = boolean.schema.properties?.answers?.properties;
    if (!booleanSchemas) throw new Error('Missing boolean row schemas.');
    for (const schema of Object.values(booleanSchemas)) {
      schema.type = 'boolean';
      schema.enum = [false, true];
    }

    render(<DesignerHarness initialDocument={boolean} />);
    expect(screen.getByText('2 列 · 布尔值最多 2 列')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('矩阵列'), {
      target: { value: '否\n是\n不确定' },
    });
    document = JSON.parse(
      screen.getByTestId('designer-document').textContent ?? '{}',
    ) as FormDocument;
    matrix = document.ui.nodes.find((node) => node.id === 'answers');
    expect(matrix?.matrix?.columns.map(({ value }) => value)).toEqual([false, true]);
    expect(compileForm(document).ok).toBe(true);
  });
});
