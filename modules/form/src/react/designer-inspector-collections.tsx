import { useEffect, useId, useState } from 'react';
import {
  type JsonPrimitive,
  MATRIX_LIMITS,
  type UiMatrixColumn,
  type UiMatrixRow,
  type UiMatrixValue,
  type UiNode,
  type UiOption,
} from '../core';
import { DesignerIcon } from './designer-icons';
import { SelectControl } from './select-control';

export function OptionEditor({
  options,
  onChange,
  onBulkChange,
}: {
  options: readonly UiOption[];
  onChange: (options: UiOption[]) => void;
  onBulkChange: (text: string) => void;
}) {
  const nextValue = nextPrimitiveValue(
    options.map(({ value }) => value).filter((value): value is UiMatrixValue => value !== null),
    'option',
  );
  return (
    <section className="a3s-form-collection-editor" aria-label="选项配置">
      <CollectionHeading title="选项" meta={`${options.length} 项 · 值保持稳定`} />
      <div className="a3s-form-collection-list item-group">
        {options.length === 0 ? (
          <p className="a3s-form-collection-empty">暂无静态选项，可逐项添加或使用批量编辑。</p>
        ) : (
          options.map((option, index) => (
            <CollectionItem
              key={`${typeof option.value}-${String(option.value)}`}
              label={option.label}
              index={index}
              count={options.length}
              disabled={Boolean(option.disabled)}
              disableLabel="选项"
              disableRemove={options.length === 1}
              onMove={(offset) => onChange(moveItem(options, index, offset))}
              onToggle={() =>
                onChange(replaceItem(options, index, withAvailability(option, !option.disabled)))
              }
              onRemove={() => onChange(options.filter((_, itemIndex) => itemIndex !== index))}
            >
              <input
                className="input"
                aria-label={`选项 ${index + 1} 标签`}
                value={option.label}
                onChange={(event) =>
                  onChange(replaceItem(options, index, { ...option, label: event.target.value }))
                }
              />
              <CollectionValueDetails label="提交值" value={option.value}>
                <PrimitiveValueEditor
                  label={`选项 ${index + 1} 提交值`}
                  value={option.value}
                  values={options.map(({ value }) => value)}
                  onChange={(value) => onChange(replaceItem(options, index, { ...option, value }))}
                />
              </CollectionValueDetails>
            </CollectionItem>
          ))
        )}
      </div>
      <button
        type="button"
        className="a3s-form-collection-add btn"
        data-variant="secondary"
        disabled={nextValue === undefined}
        onClick={() => {
          if (nextValue === undefined) return;
          onChange([...options, { label: `新选项 ${options.length + 1}`, value: nextValue }]);
        }}
      >
        添加选项
      </button>
      <BulkEditor
        label="选项"
        value={options.map(({ label }) => label).join('\n')}
        onChange={onBulkChange}
      />
    </section>
  );
}

export function MatrixDefinitionEditor({
  rows,
  columns,
  onRowsChange,
  onColumnsChange,
  onBulkRowsChange,
  onBulkColumnsChange,
}: {
  rows: readonly UiMatrixRow[];
  columns: readonly UiMatrixColumn[];
  onRowsChange: (rows: UiMatrixRow[]) => void;
  onColumnsChange: (columns: UiMatrixColumn[]) => void;
  onBulkRowsChange: (text: string) => void;
  onBulkColumnsChange: (text: string) => void;
}) {
  const nextRowId = nextMatrixRowId(rows);
  const nextColumnValue = nextPrimitiveValue(
    columns.map(({ value }) => value),
    'column',
  );
  const canAddRow =
    rows.length < MATRIX_LIMITS.maxRows &&
    (rows.length + 1) * columns.length <= MATRIX_LIMITS.maxCells;
  const canAddColumn =
    nextColumnValue !== undefined &&
    columns.length < MATRIX_LIMITS.maxColumns &&
    rows.length * (columns.length + 1) <= MATRIX_LIMITS.maxCells;

  return (
    <div className="a3s-form-matrix-definition-editor">
      <section className="a3s-form-collection-editor" aria-label="矩阵行配置">
        <CollectionHeading title="矩阵行" meta={`${rows.length} 行 · ID 保持稳定`} />
        <div className="a3s-form-collection-list item-group">
          {rows.map((row, index) => (
            <CollectionItem
              key={row.id}
              label={row.label}
              index={index}
              count={rows.length}
              disabled={Boolean(row.disabled)}
              disableLabel="矩阵行"
              disableRemove={rows.length === 1}
              onMove={(offset) => onRowsChange(moveItem(rows, index, offset))}
              onToggle={() =>
                onRowsChange(replaceItem(rows, index, withAvailability(row, !row.disabled)))
              }
              onRemove={() => onRowsChange(rows.filter((_, itemIndex) => itemIndex !== index))}
            >
              <input
                className="input"
                aria-label={`矩阵行 ${index + 1} 标题`}
                value={row.label}
                onChange={(event) =>
                  onRowsChange(replaceItem(rows, index, { ...row, label: event.target.value }))
                }
              />
              <CollectionValueDetails label="行 ID" value={row.id}>
                <IdentifierEditor
                  label={`矩阵行 ${index + 1} 行 ID`}
                  value={row.id}
                  values={rows.map(({ id }) => id)}
                  onChange={(id) => onRowsChange(replaceItem(rows, index, { ...row, id }))}
                />
              </CollectionValueDetails>
            </CollectionItem>
          ))}
        </div>
        <button
          type="button"
          className="a3s-form-collection-add btn"
          data-variant="secondary"
          disabled={!canAddRow}
          onClick={() =>
            onRowsChange([...rows, { id: nextRowId, label: `新矩阵行 ${rows.length + 1}` }])
          }
        >
          添加矩阵行
        </button>
      </section>

      <section className="a3s-form-collection-editor" aria-label="矩阵列配置">
        <CollectionHeading
          title="矩阵列"
          meta={
            typeof columns[0]?.value === 'boolean'
              ? `${columns.length} 列 · 布尔值最多 2 列`
              : `${columns.length} 列 · 值保持稳定`
          }
        />
        <div className="a3s-form-collection-list item-group">
          {columns.map((column, index) => (
            <CollectionItem
              key={`${typeof column.value}-${String(column.value)}`}
              label={column.label}
              index={index}
              count={columns.length}
              disabled={Boolean(column.disabled)}
              disableLabel="矩阵列"
              disableRemove={columns.length === 1}
              onMove={(offset) => onColumnsChange(moveItem(columns, index, offset))}
              onToggle={() =>
                onColumnsChange(
                  replaceItem(columns, index, withAvailability(column, !column.disabled)),
                )
              }
              onRemove={() =>
                onColumnsChange(columns.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <input
                className="input"
                aria-label={`矩阵列 ${index + 1} 标题`}
                value={column.label}
                onChange={(event) =>
                  onColumnsChange(
                    replaceItem(columns, index, { ...column, label: event.target.value }),
                  )
                }
              />
              <CollectionValueDetails label="提交值" value={column.value}>
                <PrimitiveValueEditor
                  label={`矩阵列 ${index + 1} 提交值`}
                  value={column.value}
                  values={columns.map(({ value }) => value)}
                  onChange={(value) =>
                    onColumnsChange(
                      replaceItem(columns, index, {
                        ...column,
                        value: value as UiMatrixValue,
                      }),
                    )
                  }
                />
              </CollectionValueDetails>
            </CollectionItem>
          ))}
        </div>
        <button
          type="button"
          className="a3s-form-collection-add btn"
          data-variant="secondary"
          disabled={!canAddColumn}
          onClick={() => {
            if (nextColumnValue === undefined) return;
            onColumnsChange([
              ...columns,
              { label: `新矩阵列 ${columns.length + 1}`, value: nextColumnValue },
            ]);
          }}
        >
          添加矩阵列
        </button>
      </section>

      <details className="a3s-form-bulk-editor">
        <summary>批量编辑</summary>
        <div className="a3s-form-bulk-editor-fields">
          <BulkField
            label="矩阵行"
            value={rows.map(({ label }) => label).join('\n')}
            onChange={onBulkRowsChange}
          />
          <BulkField
            label="矩阵列"
            value={columns.map(({ label }) => label).join('\n')}
            onChange={onBulkColumnsChange}
          />
        </div>
      </details>
    </div>
  );
}

export function LayoutItemEditor({
  layout,
  items,
  onAdd,
  onSelect,
  onUpdate,
  onMove,
  onDuplicate,
  onRemove,
}: {
  layout: 'tabs' | 'collapse' | 'wizard';
  items: readonly UiNode[];
  onAdd: () => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, changes: Partial<UiNode>) => void;
  onMove: (id: string, offset: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const noun = layout === 'wizard' ? '步骤' : layout === 'tabs' ? '标签页' : '折叠面板';
  const regionLabel = layout === 'wizard' ? '向导步骤配置' : `${noun}配置`;
  const reviewCount = items.filter((item) => item.pageRole === 'review').length;
  return (
    <section className="a3s-form-collection-editor" aria-label={regionLabel}>
      <CollectionHeading
        title={noun}
        meta={
          layout === 'wizard'
            ? `${items.length} 项 · ${reviewCount > 0 ? '含确认步骤' : '无确认步骤'}`
            : `${items.length} 项`
        }
      />
      <div className="a3s-form-collection-list item-group">
        {items.map((item, index) => (
          <CollectionItem
            key={item.id}
            label={item.label ?? ''}
            index={index}
            count={items.length}
            disabled={false}
            disableLabel={noun}
            disableRemove={items.length <= 1}
            disableDuplicate={item.pageRole === 'review'}
            disableMoveUp={item.pageRole === 'review' || items[index - 1]?.pageRole === 'review'}
            disableMoveDown={item.pageRole === 'review' || items[index + 1]?.pageRole === 'review'}
            showAvailability={false}
            onEdit={() => onSelect(item.id)}
            onMove={(offset) => onMove(item.id, offset)}
            onDuplicate={() => onDuplicate(item.id)}
            onRemove={() => onRemove(item.id)}
          >
            <input
              className="input"
              aria-label={`${noun} ${index + 1} 名称`}
              value={item.label ?? ''}
              onChange={(event) => onUpdate(item.id, { label: event.target.value })}
            />
            {layout === 'wizard' && (
              <SelectControl
                aria-label={`${noun} ${index + 1} 类型`}
                value={item.pageRole ?? 'form'}
                onChange={(event) =>
                  onUpdate(item.id, { pageRole: event.target.value as UiNode['pageRole'] })
                }
              >
                <option value="form">填写步骤</option>
                <option value="review">确认步骤</option>
              </SelectControl>
            )}
          </CollectionItem>
        ))}
      </div>
      <button
        type="button"
        className="a3s-form-collection-add btn"
        data-variant="secondary"
        onClick={onAdd}
      >
        添加{noun}
      </button>
    </section>
  );
}

function CollectionHeading({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="a3s-form-collection-heading">
      <strong>{title}</strong>
      <span>{meta}</span>
    </div>
  );
}

function CollectionItem({
  label,
  index,
  count,
  disabled,
  disableLabel,
  disableRemove = false,
  disableDuplicate = false,
  disableMoveUp = false,
  disableMoveDown = false,
  showAvailability = true,
  onEdit,
  onMove,
  onToggle,
  onDuplicate,
  onRemove,
  children,
}: {
  label: string;
  index: number;
  count: number;
  disabled: boolean;
  disableLabel: string;
  disableRemove?: boolean;
  disableDuplicate?: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
  showAvailability?: boolean;
  onEdit?: () => void;
  onMove: (offset: -1 | 1) => void;
  onToggle?: () => void;
  onDuplicate?: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const safeLabel = label || `未命名${disableLabel}`;
  return (
    <article className="a3s-form-collection-item item" data-disabled={disabled || undefined}>
      <div className="a3s-form-collection-content">{children}</div>
      <details className="a3s-form-collection-actions a3s-form-disclosure">
        <summary
          className="btn"
          data-size="icon-xs"
          data-variant="ghost"
          aria-label={`${disableLabel} ${safeLabel} 操作`}
          title="更多操作"
        >
          <DesignerIcon name="more" size={14} />
        </summary>
        <div
          className="a3s-form-collection-menu item-group"
          role="menu"
          aria-label={`${disableLabel} ${safeLabel} 操作菜单`}
        >
          {onEdit && (
            <button
              type="button"
              className="btn"
              data-size="xs"
              data-variant="ghost"
              role="menuitem"
              onClick={(event) => runMenuAction(event, onEdit)}
            >
              <DesignerIcon name="edit" size={13} />
              编辑内容
            </button>
          )}
          <button
            type="button"
            className="btn"
            data-size="xs"
            data-variant="ghost"
            role="menuitem"
            aria-label={`上移${disableLabel} ${safeLabel}`}
            disabled={index === 0 || disableMoveUp}
            onClick={(event) => runMenuAction(event, () => onMove(-1))}
          >
            <DesignerIcon name="arrow-up" size={13} />
            上移
          </button>
          <button
            type="button"
            className="btn"
            data-size="xs"
            data-variant="ghost"
            role="menuitem"
            aria-label={`下移${disableLabel} ${safeLabel}`}
            disabled={index === count - 1 || disableMoveDown}
            onClick={(event) => runMenuAction(event, () => onMove(1))}
          >
            <DesignerIcon name="arrow-down" size={13} />
            下移
          </button>
          {showAvailability && onToggle && (
            <button
              type="button"
              className="btn"
              data-size="xs"
              data-variant="ghost"
              role="menuitem"
              aria-label={`${disabled ? '启用' : '停用'}${disableLabel} ${safeLabel}`}
              onClick={(event) => runMenuAction(event, onToggle)}
            >
              <DesignerIcon name={disabled ? 'eye' : 'eye-off'} size={13} />
              {disabled ? '启用' : '停用'}
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              className="btn"
              data-size="xs"
              data-variant="ghost"
              role="menuitem"
              aria-label={`复制${disableLabel} ${safeLabel}`}
              disabled={disableDuplicate}
              onClick={(event) => runMenuAction(event, onDuplicate)}
            >
              <DesignerIcon name="copy" size={13} />
              复制
            </button>
          )}
          <button
            type="button"
            className="btn"
            data-size="xs"
            data-variant="destructive"
            role="menuitem"
            aria-label={`删除${disableLabel} ${safeLabel}`}
            disabled={disableRemove}
            onClick={(event) => runMenuAction(event, onRemove)}
          >
            <DesignerIcon name="trash" size={13} />
            删除
          </button>
        </div>
      </details>
    </article>
  );
}

function runMenuAction(event: React.MouseEvent<HTMLButtonElement>, action: () => void) {
  event.currentTarget.closest('details')?.removeAttribute('open');
  action();
}

function CollectionValueDetails({
  label,
  value,
  children,
}: {
  label: string;
  value: string | number | boolean | null;
  children: React.ReactNode;
}) {
  return (
    <details className="a3s-form-collection-value a3s-form-disclosure">
      <summary>
        <span>{label}</span>
        <code>{formatPrimitive(value)}</code>
        <DesignerIcon name="chevron-down" size={11} />
      </summary>
      <div>{children}</div>
    </details>
  );
}

function StableToken({ label, value }: { label: string; value: string | number | boolean | null }) {
  return (
    <span className="a3s-form-stable-token">
      {label}
      <code>{formatPrimitive(value)}</code>
    </span>
  );
}

function PrimitiveValueEditor({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: JsonPrimitive;
  values: readonly JsonPrimitive[];
  onChange: (value: JsonPrimitive) => void;
}) {
  const errorId = `a3s-form-option-value-${useId().replaceAll(':', '')}`;
  const [draft, setDraft] = useState(() => formatPrimitive(value));
  const [error, setError] = useState('');
  const valueType = value === null ? 'null' : typeof value;

  useEffect(() => {
    setDraft(formatPrimitive(value));
    setError('');
  }, [value]);

  const commit = (nextDraft: string) => {
    const parsed = parsePrimitiveDraft(nextDraft, value);
    if (!parsed.ok) {
      setError(parsed.error);
      return false;
    }
    const currentKey = JSON.stringify(value);
    const nextKey = JSON.stringify(parsed.value);
    const duplicate = values.some(
      (candidate) =>
        JSON.stringify(candidate) === nextKey && JSON.stringify(candidate) !== currentKey,
    );
    if (duplicate) {
      setError('提交值必须唯一。');
      return false;
    }
    setDraft(formatPrimitive(parsed.value));
    setError('');
    if (!Object.is(parsed.value, value)) onChange(parsed.value);
    return true;
  };

  if (value === null) {
    return <StableToken label="提交值 · null" value={value} />;
  }

  return (
    <div
      className="a3s-form-primitive-editor field"
      data-orientation="horizontal"
      data-invalid={error || undefined}
    >
      <span>提交值 · {valueType}</span>
      {typeof value === 'boolean' ? (
        <select
          className="select"
          aria-label={label}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          value={draft}
          onChange={(event) => {
            const nextDraft = event.target.value;
            setDraft(nextDraft);
            commit(nextDraft);
          }}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          className="input"
          type={typeof value === 'number' ? 'number' : 'text'}
          inputMode={typeof value === 'number' ? 'decimal' : undefined}
          step={typeof value === 'number' ? 'any' : undefined}
          aria-label={label}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError('');
          }}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (commit(draft)) event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(formatPrimitive(value));
              setError('');
              event.currentTarget.blur();
            }
          }}
        />
      )}
      {error && (
        <small id={errorId} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

function IdentifierEditor({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  const errorId = `a3s-form-row-id-${useId().replaceAll(':', '')}`;
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(value);
    setError('');
  }, [value]);

  const commit = () => {
    if (draft.trim() === '') {
      setError('行 ID 不能为空。');
      return false;
    }
    if (draft !== draft.trim()) {
      setError('行 ID 首尾不能有空格。');
      return false;
    }
    if (draft.includes('.') || draft === '*') {
      setError('行 ID 不能包含句点或使用 *。');
      return false;
    }
    if (draft !== value && values.includes(draft)) {
      setError('行 ID 必须唯一。');
      return false;
    }
    setError('');
    if (draft !== value) onChange(draft);
    return true;
  };

  return (
    <label
      className="a3s-form-identifier-editor field"
      data-orientation="horizontal"
      data-invalid={error || undefined}
    >
      <span>行 ID</span>
      <input
        className="input"
        aria-label={label}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError('');
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (commit()) event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setDraft(value);
            setError('');
            event.currentTarget.blur();
          }
        }}
      />
      {error && (
        <small id={errorId} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}

function parsePrimitiveDraft(
  draft: string,
  current: JsonPrimitive,
): { ok: true; value: JsonPrimitive } | { ok: false; error: string } {
  if (current === null) return { ok: true, value: null };
  if (typeof current === 'string') return { ok: true, value: draft };
  if (typeof current === 'boolean') return { ok: true, value: draft === 'true' };
  if (draft.trim() === '') return { ok: false, error: '提交值不能为空。' };
  const value = Number(draft);
  if (!Number.isFinite(value)) return { ok: false, error: '请输入有效数字。' };
  return { ok: true, value };
}

function BulkEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <details className="a3s-form-bulk-editor">
      <summary>批量编辑</summary>
      <BulkField label={label} value={value} onChange={onChange} />
    </details>
  );
}

function BulkField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <label className="a3s-form-bulk-field">
      <span>{label}标题，每行一项</span>
      <textarea
        className="textarea"
        aria-label={label === '选项' ? '字段选项' : label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function moveItem<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function replaceItem<T>(items: readonly T[], index: number, item: T): T[] {
  return items.map((candidate, itemIndex) => (itemIndex === index ? item : candidate));
}

function withAvailability<T extends { disabled?: boolean }>(item: T, disabled: boolean): T {
  const next = { ...item };
  if (disabled) next.disabled = true;
  else delete next.disabled;
  return next;
}

function nextMatrixRowId(rows: readonly UiMatrixRow[]): string {
  const ids = new Set(rows.map(({ id }) => id));
  let suffix = rows.length + 1;
  while (ids.has(`row-${suffix}`)) suffix += 1;
  return `row-${suffix}`;
}

function nextPrimitiveValue(
  values: readonly UiMatrixValue[],
  prefix: 'option' | 'column',
): UiMatrixValue | undefined {
  const used = new Set(values.map((value) => JSON.stringify(value)));
  const valueType = typeof values[0];
  if (valueType === 'boolean') {
    return [false, true].find((value) => !used.has(JSON.stringify(value)));
  }
  if (valueType === 'number') {
    let value = values.length + 1;
    while (used.has(JSON.stringify(value))) value += 1;
    return value;
  }
  let suffix = values.length + 1;
  let value = `${prefix}-${suffix}`;
  while (used.has(JSON.stringify(value))) {
    suffix += 1;
    value = `${prefix}-${suffix}`;
  }
  return value;
}

function formatPrimitive(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
