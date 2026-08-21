import { useEffect, useMemo, useRef, useState } from 'react';
import { canonicalize, type FormLocaleMessages, formatFormMessage, type JsonValue } from '../core';
import {
  type DataGridPasteError,
  dataGridCellValue,
  fillDataGridColumn,
  parseDataGridPaste,
  type RuntimeDataGridColumn,
} from './data-grid-bulk';
import { useNativeDataGridDialog } from './data-grid-dialog';
import { createRepeaterItem, RepeaterIcon } from './repeater-controls';
import type { RepeaterFieldProps } from './repeater-props';

const PREVIEW_ROW_LIMIT = 4;

function keyedPreviewRows(rows: readonly string[][]) {
  const occurrences = new Map<string, number>();
  return rows.map((row) => {
    const signature = canonicalize(row);
    const occurrence = (occurrences.get(signature) ?? 0) + 1;
    occurrences.set(signature, occurrence);
    return { key: `${signature}\u0000${occurrence}`, row };
  });
}

type PasteErrorMessage =
  | 'dataGridPasteEmpty'
  | 'dataGridPasteSize'
  | 'dataGridPasteRows'
  | 'dataGridPasteUnclosedQuote'
  | 'dataGridPasteQuoteTrailing'
  | 'dataGridPasteNoColumns'
  | 'dataGridPasteTooManyColumns'
  | 'dataGridPasteInvalidNumber'
  | 'dataGridPasteInvalidInteger'
  | 'dataGridPasteInvalidBoolean'
  | 'dataGridPasteInvalidJson'
  | 'dataGridPasteInvalidObject'
  | 'dataGridPasteInvalidArray'
  | 'dataGridPasteInvalidNull'
  | 'dataGridPasteEnum'
  | 'dataGridPasteCapacity';

const PASTE_ERROR_MESSAGES: Readonly<Record<DataGridPasteError['code'], PasteErrorMessage>> = {
  empty: 'dataGridPasteEmpty',
  size: 'dataGridPasteSize',
  rows: 'dataGridPasteRows',
  unclosed_quote: 'dataGridPasteUnclosedQuote',
  quote_trailing: 'dataGridPasteQuoteTrailing',
  no_columns: 'dataGridPasteNoColumns',
  too_many_columns: 'dataGridPasteTooManyColumns',
  invalid_number: 'dataGridPasteInvalidNumber',
  invalid_integer: 'dataGridPasteInvalidInteger',
  invalid_boolean: 'dataGridPasteInvalidBoolean',
  invalid_json: 'dataGridPasteInvalidJson',
  invalid_object: 'dataGridPasteInvalidObject',
  invalid_array: 'dataGridPasteInvalidArray',
  invalid_null: 'dataGridPasteInvalidNull',
  enum: 'dataGridPasteEnum',
  capacity: 'dataGridPasteCapacity',
};

function pasteErrorMessage(
  messages: Readonly<FormLocaleMessages>,
  error: DataGridPasteError,
): string {
  const message = messages[PASTE_ERROR_MESSAGES[error.code]];
  if (error.row !== undefined && error.column !== undefined) {
    return formatFormMessage(messages, 'dataGridPasteErrorCell', {
      row: error.row,
      column: error.column,
      message,
    });
  }
  if (error.row !== undefined) {
    return formatFormMessage(messages, 'dataGridPasteErrorRow', {
      row: error.row,
      message,
    });
  }
  return message;
}

function DialogHeader(props: {
  id: string;
  title: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <header>
      <span>
        <h3 className="a3s-form-data-grid-dialog-title" id={`${props.id}-title`}>
          {props.title}
        </h3>
        <p className="a3s-form-data-grid-dialog-description" id={`${props.id}-description`}>
          {props.description}
        </p>
      </span>
      <button type="button" className="btn" aria-label={props.closeLabel} onClick={props.onClose}>
        <RepeaterIcon name="close" />
      </button>
    </header>
  );
}

export function DataGridPasteDialog(props: {
  id: string;
  label: string;
  columns: readonly RuntimeDataGridColumn[];
  messages: Readonly<FormLocaleMessages>;
  disabled: boolean;
  items: JsonValue[];
  maximum?: number;
  node: RepeaterFieldProps['node'];
  validateItems: RepeaterFieldProps['validateItems'];
  onRequestClose: () => void;
  onApply: (items: JsonValue[]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [validationError, setValidationError] = useState<string>();
  const pasteColumns = props.columns.filter((column) => column.pasteable && column.path);
  const remainingRows =
    props.maximum === undefined ? undefined : Math.max(0, props.maximum - props.items.length);
  const result = useMemo(
    () =>
      parseDataGridPaste(text, props.columns, () => createRepeaterItem(props.node), {
        remainingRows,
      }),
    [props.columns, props.node, remainingRows, text],
  );
  const hasInput = text.length > 0;
  useNativeDataGridDialog(dialogRef);

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  const apply = () => {
    if (!result.ok || props.disabled) return;
    const validation = props.validateItems([...props.items, ...result.items]);
    if (validation.errors.length > 0) {
      setValidationError(validation.errors[0].message);
      queueMicrotask(() =>
        dialogRef.current?.querySelector<HTMLElement>('[role="alert"]')?.focus(),
      );
      return;
    }
    props.onApply(validation.items);
  };

  return (
    <dialog
      ref={dialogRef}
      className="a3s-form-data-grid-dialog is-bulk is-paste"
      aria-labelledby={`${props.id}-paste-title`}
      aria-describedby={`${props.id}-paste-description`}
      onCancel={(event) => {
        event.preventDefault();
        props.onRequestClose();
      }}
      onClose={props.onRequestClose}
    >
      <div className="a3s-form-data-grid-dialog-shell">
        <DialogHeader
          id={`${props.id}-paste`}
          title={formatFormMessage(props.messages, 'dataGridPasteTitle', { label: props.label })}
          description={props.messages.dataGridPasteDescription}
          closeLabel={props.messages.dataGridPasteClose}
          onClose={props.onRequestClose}
        />
        <div className="a3s-form-data-grid-bulk-body">
          <section
            className="a3s-form-data-grid-paste-columns"
            aria-labelledby={`${props.id}-paste-columns`}
          >
            <div>
              <h4 id={`${props.id}-paste-columns`}>{props.messages.dataGridPasteColumns}</h4>
              <p>{props.messages.dataGridPasteColumnOrder}</p>
            </div>
            <ol>
              {pasteColumns.map((column) => (
                <li key={column.id}>
                  <span>{column.label}</span>
                  <code>{column.schema?.type ?? 'string'}</code>
                </li>
              ))}
            </ol>
          </section>
          <label className="a3s-form-data-grid-paste-input">
            <span>{props.messages.dataGridPasteInputLabel}</span>
            <textarea
              className="textarea"
              ref={inputRef}
              spellCheck={false}
              value={text}
              placeholder={props.messages.dataGridPastePlaceholder}
              onChange={(event) => {
                setText(event.target.value);
                setValidationError(undefined);
              }}
            />
          </label>
          {!hasInput ? (
            <p className="a3s-form-data-grid-bulk-hint">{props.messages.dataGridPasteHint}</p>
          ) : result.ok ? (
            <section
              className="a3s-form-data-grid-paste-preview"
              aria-labelledby={`${props.id}-paste-preview`}
            >
              <div>
                <h4 id={`${props.id}-paste-preview`}>{props.messages.dataGridPastePreview}</h4>
                <span role="status" aria-live="polite">
                  {formatFormMessage(props.messages, 'dataGridPastePreviewSummary', {
                    rows: result.items.length,
                    cells: result.cellCount,
                  })}
                </span>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      {pasteColumns.map((column) => (
                        <th scope="col" key={column.id}>
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {keyedPreviewRows(result.cells.slice(0, PREVIEW_ROW_LIMIT)).map(
                      ({ key, row }) => (
                        <tr key={key}>
                          {pasteColumns.map((column, columnIndex) => (
                            <td key={column.id}>
                              {row[columnIndex] || (
                                <span>{props.messages.dataGridPastePreviewEmpty}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <div
              className="a3s-form-data-grid-dialog-alert a3s-form-error"
              role="alert"
              tabIndex={-1}
            >
              {pasteErrorMessage(props.messages, result.error)}
            </div>
          )}
          {validationError && (
            <div
              className="a3s-form-data-grid-dialog-alert a3s-form-error"
              role="alert"
              tabIndex={-1}
            >
              {formatFormMessage(props.messages, 'dataGridPasteValidation', {
                message: validationError,
              })}
            </div>
          )}
        </div>
        <footer>
          <button
            type="button"
            className="btn a3s-form-secondary"
            data-variant="secondary"
            onClick={props.onRequestClose}
          >
            {props.messages.dataGridEditorCancel}
          </button>
          <button
            type="button"
            className="btn a3s-form-primary"
            data-variant="primary"
            disabled={props.disabled || !result.ok}
            onClick={apply}
          >
            {props.messages.dataGridPasteApply}
          </button>
        </footer>
      </div>
    </dialog>
  );
}

export interface DataGridFillSnapshot {
  rows: readonly { key: string; value: JsonValue }[];
}

function fillValueText(value: JsonValue | undefined, messages: Readonly<FormLocaleMessages>) {
  if (value === undefined || value === null || value === '') return messages.dataGridEmptyValue;
  return typeof value === 'object' ? canonicalize(value) : String(value);
}

export function DataGridFillDialog(props: {
  id: string;
  label: string;
  columns: readonly RuntimeDataGridColumn[];
  messages: Readonly<FormLocaleMessages>;
  disabled: boolean;
  items: JsonValue[];
  rows: readonly { key: string; index: number; value: JsonValue }[];
  snapshot: DataGridFillSnapshot;
  validateItems: RepeaterFieldProps['validateItems'];
  onRequestClose: () => void;
  onApply: (items: JsonValue[]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const fillColumns = props.columns.filter((column) => column.pasteable && column.path);
  const [selectedColumnId, setSelectedColumnId] = useState(fillColumns[0]?.id ?? '');
  const columnId = fillColumns.some((candidate) => candidate.id === selectedColumnId)
    ? selectedColumnId
    : (fillColumns[0]?.id ?? '');
  const [conflict, setConflict] = useState(false);
  const [validationError, setValidationError] = useState<string>();
  const column = fillColumns.find((candidate) => candidate.id === columnId);
  const source = props.snapshot.rows[0];
  const sourceValue = source && column ? dataGridCellValue(source.value, column) : undefined;
  const alertMessage = conflict
    ? props.messages.dataGridFillConflict
    : validationError
      ? formatFormMessage(props.messages, 'dataGridFillValidation', {
          message: validationError,
        })
      : undefined;
  useNativeDataGridDialog(dialogRef);

  useEffect(() => {
    queueMicrotask(() => selectRef.current?.focus());
  }, []);

  const apply = () => {
    if (!column || props.disabled || !source) return;
    const currentRows = new Map(props.rows.map((row) => [row.key, row]));
    const changed = props.snapshot.rows.some((snapshotRow) => {
      const current = currentRows.get(snapshotRow.key);
      return !current || canonicalize(current.value) !== canonicalize(snapshotRow.value);
    });
    if (changed) {
      setConflict(true);
      setValidationError(undefined);
      queueMicrotask(() =>
        dialogRef.current?.querySelector<HTMLElement>('[role="alert"]')?.focus(),
      );
      return;
    }
    type CurrentRow = (typeof props.rows)[number];
    const sourceRow = currentRows.get(source.key) as CurrentRow;
    const targetIndices = props.snapshot.rows
      .slice(1)
      .map((row) => (currentRows.get(row.key) as CurrentRow).index);
    const nextItems = fillDataGridColumn(props.items, sourceRow.index, targetIndices, column);
    const validation = props.validateItems(nextItems);
    if (validation.errors.length > 0) {
      setConflict(false);
      setValidationError(validation.errors[0].message);
      queueMicrotask(() =>
        dialogRef.current?.querySelector<HTMLElement>('[role="alert"]')?.focus(),
      );
      return;
    }
    props.onApply(validation.items);
  };

  return (
    <dialog
      ref={dialogRef}
      className="a3s-form-data-grid-dialog is-bulk is-fill"
      aria-labelledby={`${props.id}-fill-title`}
      aria-describedby={`${props.id}-fill-description`}
      onCancel={(event) => {
        event.preventDefault();
        props.onRequestClose();
      }}
      onClose={props.onRequestClose}
    >
      <div className="a3s-form-data-grid-dialog-shell">
        <DialogHeader
          id={`${props.id}-fill`}
          title={formatFormMessage(props.messages, 'dataGridFillTitle', { label: props.label })}
          description={props.messages.dataGridFillDescription}
          closeLabel={props.messages.dataGridFillClose}
          onClose={props.onRequestClose}
        />
        <div className="a3s-form-data-grid-bulk-body">
          <label className="a3s-form-data-grid-fill-column">
            <span>{props.messages.dataGridFillColumnLabel}</span>
            <select
              ref={selectRef}
              className="select"
              value={columnId}
              onChange={(event) => {
                setSelectedColumnId(event.target.value);
                setConflict(false);
                setValidationError(undefined);
              }}
            >
              {fillColumns.map((candidate) => (
                <option value={candidate.id} key={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
          <dl className="a3s-form-data-grid-fill-summary">
            <div>
              <dt>{props.messages.dataGridFillSourceLabel}</dt>
              <dd>{fillValueText(sourceValue, props.messages)}</dd>
            </div>
            <div>
              <dt>{props.messages.dataGridFillTargetsLabel}</dt>
              <dd>
                {formatFormMessage(props.messages, 'dataGridFillTargets', {
                  count: Math.max(0, props.snapshot.rows.length - 1),
                })}
              </dd>
            </div>
          </dl>
          {alertMessage && (
            <div
              className="a3s-form-data-grid-dialog-alert a3s-form-error"
              role="alert"
              tabIndex={-1}
            >
              {alertMessage}
            </div>
          )}
        </div>
        <footer>
          <button
            type="button"
            className="btn a3s-form-secondary"
            data-variant="secondary"
            onClick={props.onRequestClose}
          >
            {props.messages.dataGridEditorCancel}
          </button>
          <button
            type="button"
            className="btn a3s-form-primary"
            data-variant="primary"
            disabled={props.disabled || !column || props.snapshot.rows.length < 2}
            onClick={apply}
          >
            {props.messages.dataGridFillApply}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
