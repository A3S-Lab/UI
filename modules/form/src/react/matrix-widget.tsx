import type { FocusEvent } from 'react';
import { formatFormMessage, type JsonObject, type JsonValue } from '../core';
import type { FormWidgetProps } from './native-widget';

function matrixValue(value: JsonValue | undefined): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function rowValuePath(base: string | undefined, rowId: string): string | undefined {
  return base ? `${base}.${rowId}` : undefined;
}

function describedBy(...ids: Array<string | undefined>): string | undefined {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}

export function MatrixWidget(props: FormWidgetProps) {
  const {
    id,
    labelledBy,
    node,
    schema,
    value,
    valuePath,
    disabled,
    invalid,
    describedBy: fieldDescription,
    errors = [],
    messages,
    onChange,
    onBlur,
    onFocus,
  } = props;
  const definition = node.matrix;
  const multiple = node.widget === 'matrix-multiple';
  const current = matrixValue(value);
  const handleBlur = (event: FocusEvent<HTMLFieldSetElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.();
  };

  if (!definition || definition.rows.length === 0 || definition.columns.length === 0) {
    return (
      <fieldset
        className="a3s-form-matrix fieldset is-empty"
        aria-label={labelledBy ? undefined : (node.label ?? node.id)}
        aria-labelledby={labelledBy}
        aria-describedby={fieldDescription}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onBlur={handleBlur}
        onFocus={onFocus}
      >
        <p className="a3s-form-matrix-empty">{messages.matrixEmpty}</p>
      </fieldset>
    );
  }

  const fieldErrors = errors.filter((error) => error.path === valuePath);
  return (
    <fieldset
      className={`a3s-form-matrix fieldset is-${multiple ? 'multiple' : 'single'}`}
      aria-label={labelledBy ? undefined : (node.label ?? node.id)}
      aria-labelledby={labelledBy}
      aria-describedby={fieldDescription}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      onBlur={handleBlur}
      onFocus={onFocus}
    >
      <div className="a3s-form-matrix-scroll table-container">
        <table className="table" aria-label={node.label ?? node.id}>
          <thead>
            <tr>
              <th className="a3s-form-matrix-corner" scope="col">
                <span aria-hidden="true">—</span>
              </th>
              {definition.columns.map((column) => (
                <th scope="col" key={`${typeof column.value}-${String(column.value)}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {definition.rows.map((row, rowIndex) => {
              const path = rowValuePath(valuePath, row.id);
              const rowSchema = schema?.properties?.[row.id];
              const rowRequired = Boolean(schema?.required?.includes(row.id));
              const rowErrors = errors.filter((error) => error.path === path);
              const controlledRowValue = current[row.id];
              const selected: JsonValue[] =
                multiple && Array.isArray(controlledRowValue) ? controlledRowValue : [];
              const maximum = multiple ? rowSchema?.maxItems : undefined;
              const atMaximum = maximum !== undefined && selected.length >= maximum;
              const rowLabelId = `${id}-row-${rowIndex + 1}-label`;
              const rowDescriptionId = row.description
                ? `${id}-row-${rowIndex + 1}-description`
                : undefined;
              const rowSummaryId = multiple ? `${id}-row-${rowIndex + 1}-summary` : undefined;
              const rowErrorIds = rowErrors.map(
                (_, errorIndex) => `${id}-row-${rowIndex + 1}-error-${errorIndex + 1}`,
              );
              return (
                <tr
                  key={row.id}
                  data-disabled={row.disabled || undefined}
                  data-invalid={rowErrors.length > 0 || undefined}
                  data-a3s-form-path={path}
                >
                  <th scope="row" id={rowLabelId}>
                    <span className="a3s-form-matrix-row-label">
                      {row.label}
                      {rowRequired && (
                        <em title={messages.matrixRowRequired}>
                          <span aria-hidden="true">*</span>
                          <span className="a3s-form-matrix-required-text">
                            {messages.matrixRowRequired}
                          </span>
                        </em>
                      )}
                    </span>
                    {row.description && <small id={rowDescriptionId}>{row.description}</small>}
                    {multiple && (
                      <span className="a3s-form-matrix-row-summary" id={rowSummaryId}>
                        {formatFormMessage(messages, 'matrixSelectionSummary', {
                          count: selected.length,
                        })}
                        {maximum !== undefined && (
                          <>
                            {' · '}
                            {formatFormMessage(messages, 'matrixSelectionLimit', { maximum })}
                          </>
                        )}
                      </span>
                    )}
                    {rowErrors.map((error, errorIndex) => (
                      <span
                        className="a3s-form-matrix-row-error"
                        id={rowErrorIds[errorIndex]}
                        role="alert"
                        key={`${error.code}-${error.message}`}
                      >
                        {error.message}
                      </span>
                    ))}
                  </th>
                  {definition.columns.map((column, columnIndex) => {
                    const checked = multiple
                      ? selected.some((item) => Object.is(item, column.value))
                      : Object.is(current[row.id], column.value);
                    const inputDisabled = Boolean(
                      disabled ||
                        row.disabled ||
                        column.disabled ||
                        (multiple && !checked && atMaximum),
                    );
                    const inputId = `${id}-row-${rowIndex + 1}-column-${columnIndex + 1}`;
                    const inputDescription = describedBy(
                      fieldDescription,
                      rowDescriptionId,
                      rowSummaryId,
                      ...rowErrorIds,
                    );
                    return (
                      <td
                        data-column-label={column.label}
                        data-selected={checked || undefined}
                        key={`${typeof column.value}-${String(column.value)}`}
                      >
                        <label htmlFor={inputId}>
                          <input
                            id={inputId}
                            className="input"
                            type={multiple ? 'checkbox' : 'radio'}
                            name={multiple ? undefined : `${id}-${row.id}`}
                            value={String(column.value)}
                            checked={checked}
                            disabled={inputDisabled}
                            required={!multiple && rowRequired}
                            aria-label={`${row.label}：${column.label}`}
                            aria-describedby={inputDescription}
                            aria-invalid={rowErrors.length > 0 || undefined}
                            onChange={(event) => {
                              if (inputDisabled) return;
                              if (!multiple) {
                                onChange({ ...current, [row.id]: column.value });
                                return;
                              }
                              const next = event.target.checked
                                ? [...selected, column.value]
                                : selected.filter((item) => !Object.is(item, column.value));
                              onChange({ ...current, [row.id]: next });
                            }}
                          />
                          <span aria-hidden="true" />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {fieldErrors.map((error) => (
        <div
          className="a3s-form-matrix-error"
          role="alert"
          key={`${error.path}-${error.code}-${error.message}`}
        >
          {error.message}
        </div>
      ))}
    </fieldset>
  );
}
