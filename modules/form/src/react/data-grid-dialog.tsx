import { type CSSProperties, type RefObject, useEffect, useRef } from 'react';
import type { FieldError, FormLocaleMessages, JsonValue } from '../core';
import { RepeaterIcon } from './repeater-controls';
import type { RepeaterFieldProps } from './repeater-props';

export interface DialogEditorState {
  mode: 'add' | 'edit';
  key: string;
  item: JsonValue;
  source?: JsonValue;
  errors: readonly FieldError[];
  conflict: boolean;
  position: number;
}

export function useNativeDataGridDialog(dialogRef: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    try {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } catch {
      dialog.setAttribute('open', '');
    }
  }, [dialogRef]);
}

export function DataGridDialog(props: {
  id: string;
  title: string;
  editor: DialogEditorState;
  editorIndex: number;
  columns: RepeaterFieldProps['columns'];
  messages: Readonly<FormLocaleMessages>;
  disabled: boolean;
  atMaximum: boolean;
  renderCell: RepeaterFieldProps['renderDialogCell'];
  onItemChange: (item: JsonValue) => void;
  onRequestClose: () => void;
  onSave: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useNativeDataGridDialog(dialogRef);

  useEffect(() => {
    if (props.editor.errors.length === 0 && !props.editor.conflict) return;
    queueMicrotask(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(
        '[data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] select, .a3s-form-data-grid-dialog-alert',
      );
      target?.focus();
    });
  }, [props.editor.conflict, props.editor.errors]);

  return (
    <dialog
      ref={dialogRef}
      className="a3s-form-data-grid-dialog"
      aria-labelledby={`${props.id}-editor-title`}
      aria-describedby={`${props.id}-editor-description`}
      onCancel={(event) => {
        event.preventDefault();
        props.onRequestClose();
      }}
      onClose={props.onRequestClose}
    >
      <div className="a3s-form-data-grid-dialog-shell">
        <header>
          <span>
            <h3 className="a3s-form-data-grid-dialog-title" id={`${props.id}-editor-title`}>
              {props.title}
            </h3>
            <p
              className="a3s-form-data-grid-dialog-description"
              id={`${props.id}-editor-description`}
            >
              {props.messages.dataGridEditorDescription}
            </p>
          </span>
          <button
            type="button"
            className="btn"
            aria-label={props.messages.dataGridEditorClose}
            onClick={props.onRequestClose}
          >
            <RepeaterIcon name="close" />
          </button>
        </header>
        <div
          className="a3s-form-data-grid-dialog-fields a3s-form-grid"
          style={{ '--a3s-form-columns': 12, '--a3s-form-gap': '14px' } as CSSProperties}
        >
          {props.columns.map((column) =>
            props.renderCell(
              column.id,
              props.editorIndex,
              props.editor.key,
              props.editor.item,
              props.onItemChange,
              props.editor.errors,
            ),
          )}
        </div>
        {(props.editor.errors.length > 0 || props.editor.conflict) && (
          <div
            className="a3s-form-data-grid-dialog-alert a3s-form-error"
            role="alert"
            tabIndex={-1}
          >
            {props.editor.conflict
              ? props.messages.dataGridEditorConflict
              : props.messages.dataGridEditorInvalid}
          </div>
        )}
        {props.editor.mode === 'add' && props.atMaximum && (
          <div className="a3s-form-data-grid-dialog-alert a3s-form-error" role="alert">
            {props.messages.repeaterMaximumReached}
          </div>
        )}
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
            disabled={props.disabled || (props.editor.mode === 'add' && props.atMaximum)}
            onClick={props.onSave}
          >
            {props.messages.dataGridEditorSave}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
