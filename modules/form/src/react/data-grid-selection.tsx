import { useState } from 'react';
import { type FormLocaleMessages, formatFormMessage } from '../core';

export function DataGridSelectionBar(props: {
  messages: Readonly<FormLocaleMessages>;
  selectionKey: string;
  selectedCount: number;
  visibleSelectedCount: number;
  minimum: number;
  canDelete: boolean;
  canFill: boolean;
  fillColumnsAvailable: boolean;
  disabled: boolean;
  onDelete: () => void;
  onFill: (trigger: HTMLButtonElement) => void;
}) {
  const [confirmedSelectionKey, setConfirmedSelectionKey] = useState<string>();
  const confirmDelete = confirmedSelectionKey === props.selectionKey;
  const selectedRowsWord =
    props.selectedCount === 1
      ? props.messages.dataGridRowSingular
      : props.messages.dataGridRowPlural;
  const minimumRowsWord =
    props.minimum === 1 ? props.messages.dataGridRowSingular : props.messages.dataGridRowPlural;

  return (
    <div className="a3s-form-data-grid-selection" role="status" aria-live="polite">
      <span>
        {confirmDelete
          ? formatFormMessage(props.messages, 'dataGridDeleteConfirmation', {
              count: props.selectedCount,
              rows: selectedRowsWord,
            })
          : formatFormMessage(props.messages, 'dataGridSelectionSummary', {
              count: props.selectedCount,
              rows: selectedRowsWord,
            })}
        {!props.canDelete && (
          <small>
            {formatFormMessage(props.messages, 'dataGridSelectionMinimum', {
              minimum: props.minimum,
              rows: minimumRowsWord,
            })}
          </small>
        )}
      </span>
      <span>
        {confirmDelete ? (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setConfirmedSelectionKey(undefined)}
            >
              {props.messages.dataGridEditorCancel}
            </button>
            <button
              type="button"
              className="btn a3s-form-danger"
              data-variant="destructive"
              onClick={props.onDelete}
            >
              {formatFormMessage(props.messages, 'dataGridDeleteCount', {
                count: props.selectedCount,
                rows: selectedRowsWord,
              })}
            </button>
          </>
        ) : (
          <>
            {props.canFill && (
              <button
                type="button"
                className="btn a3s-form-secondary"
                data-variant="secondary"
                disabled={
                  props.disabled || !props.fillColumnsAvailable || props.visibleSelectedCount < 2
                }
                title={
                  !props.fillColumnsAvailable
                    ? props.messages.dataGridFillNoColumns
                    : props.visibleSelectedCount < 2
                      ? props.messages.dataGridFillMinimum
                      : undefined
                }
                onClick={(event) => props.onFill(event.currentTarget)}
              >
                {props.messages.dataGridFillDown}
              </button>
            )}
            <button
              type="button"
              className="btn a3s-form-danger"
              data-variant="destructive"
              disabled={props.disabled || !props.canDelete}
              onClick={() => setConfirmedSelectionKey(props.selectionKey)}
            >
              {props.messages.dataGridDeleteSelected}
            </button>
          </>
        )}
      </span>
    </div>
  );
}
