import type { ReactNode } from 'react';
import type { FieldError, FormLocaleMessages } from '../core';
import { RepeaterIcon } from './repeater-controls';

export function DataGridFieldFooter(props: {
  id: string;
  valuePath: string;
  messages: Readonly<FormLocaleMessages>;
  errors: readonly FieldError[];
  disabled: boolean;
  atMaximum: boolean;
  validationStatus?: ReactNode;
  onAdd: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <>
      <div className="a3s-form-repeater-footer">
        <button
          type="button"
          className="a3s-form-secondary btn"
          data-size="sm"
          data-variant="secondary"
          disabled={props.disabled || props.atMaximum}
          title={props.atMaximum ? props.messages.repeaterMaximumReached : undefined}
          onClick={(event) => props.onAdd(event.currentTarget)}
        >
          <RepeaterIcon name="add" />
          <span>{props.messages.dataGridAdd}</span>
        </button>
        {props.atMaximum && (
          <span className="a3s-form-repeater-limit" role="status">
            {props.messages.repeaterMaximumReached}
          </span>
        )}
      </div>
      {props.errors
        .filter((error) => error.path === props.valuePath)
        .map((error, index) => (
          <div
            className="a3s-form-error"
            id={`${props.id}-error-${index + 1}`}
            role="alert"
            key={`${error.code}-${error.message}`}
          >
            {error.message}
          </div>
        ))}
      {props.validationStatus}
    </>
  );
}
