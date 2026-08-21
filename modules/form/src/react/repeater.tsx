import { formatFormMessage } from '../core';
import { DataGridField } from './data-grid';
import { createRepeaterItem, RepeaterIcon, RowActions } from './repeater-controls';
import type { RepeaterFieldProps } from './repeater-props';
import { useStableRepeaterRows } from './repeater-state';

export function RepeaterField(props: RepeaterFieldProps) {
  const rows = useStableRepeaterRows(props.items, (item, index) => {
    try {
      const hostIdentity = props.identifyItem?.(item, index);
      if (hostIdentity) return hostIdentity;
    } catch {
      // The identity hook is advisory; runtime-owned keys remain available.
    }
    if (!props.node.itemKey || !item || typeof item !== 'object' || Array.isArray(item)) {
      return undefined;
    }
    const identity = item[props.node.itemKey];
    return typeof identity === 'string' ? identity : undefined;
  });
  const minimum = props.node.schema?.minItems ?? 0;
  const maximum = props.node.schema?.maxItems;
  const objectRows = props.node.schema?.items?.type === 'object';
  const dataGrid = objectRows && props.node.layout === 'data-grid';
  const atMaximum = maximum !== undefined && props.items.length >= maximum;
  const label = props.node.label ?? props.node.id;
  const itemPlaceholder = repeaterCopy(props.node.customProps?.itemPlaceholder, '列表项');
  const addLabel = repeaterCopy(props.node.customProps?.addLabel, props.messages.repeaterAdd);
  const emptyLabel = repeaterCopy(props.node.customProps?.emptyLabel, props.messages.repeaterEmpty);

  if (dataGrid) return <DataGridField {...props} rows={rows} />;

  return (
    <fieldset
      className={`a3s-form-field a3s-form-repeater fieldset${objectRows ? ' is-object' : ''}${props.errors.length ? ' is-invalid' : ''}`}
      style={props.style}
      disabled={props.disabled}
      aria-describedby={props.describedBy}
      aria-busy={props.validating || undefined}
      data-validating={props.validating || undefined}
      data-a3s-form-path={props.valuePath}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) props.onBlur();
      }}
    >
      <legend className={props.required ? 'is-required' : undefined}>{label}</legend>
      {props.node.description && (
        <div className="a3s-form-help" id={`${props.id}-help`}>
          {props.node.description}
        </div>
      )}
      {props.headerActions}
      {props.items.length === 0 && (
        <p className="a3s-form-repeater-empty" role="status">
          {emptyLabel}
        </p>
      )}
      {objectRows ? (
        <div className="a3s-form-repeater-rows">
          {rows.rows.map((row) => (
            <fieldset className="a3s-form-repeater-row" data-row-key={row.key} key={row.key}>
              <legend>
                <span>
                  {formatFormMessage(props.messages, 'repeaterItemLabel', {
                    index: row.index + 1,
                    label,
                  })}
                </span>
                <RowActions
                  index={row.index}
                  count={props.items.length}
                  minimum={minimum}
                  label={label}
                  messages={props.messages}
                  disabled={props.disabled}
                  onMove={(offset) => props.onChange(rows.move(row.index, offset))}
                  onRemove={() => props.onChange(rows.remove(row.index))}
                />
              </legend>
              <div className="a3s-form-repeater-row-grid">
                {props.columns.length > 0
                  ? props.columns.map((column) => props.renderCell(column.id, row.index, row.key))
                  : props.messages.repeaterTemplateEmpty}
              </div>
            </fieldset>
          ))}
        </div>
      ) : (
        <div className="a3s-form-repeat-list">
          {rows.rows.map((row) => (
            <div className="a3s-form-repeat-row" key={row.key}>
              <input
                className="input"
                aria-label={`${props.node.label ?? props.node.id} ${row.index + 1}`}
                placeholder={itemPlaceholder}
                value={String(row.value ?? '')}
                disabled={props.disabled}
                onChange={(event) => props.onChange(rows.update(row.index, event.target.value))}
              />
              <RowActions
                index={row.index}
                count={props.items.length}
                minimum={minimum}
                label={label}
                messages={props.messages}
                disabled={props.disabled}
                removeLabel={props.messages.repeaterRemove}
                onMove={(offset) => props.onChange(rows.move(row.index, offset))}
                onRemove={() => props.onChange(rows.remove(row.index))}
              />
            </div>
          ))}
        </div>
      )}
      <div className="a3s-form-repeater-footer">
        <button
          type="button"
          className="a3s-form-secondary btn"
          data-size="sm"
          data-variant="secondary"
          disabled={props.disabled || atMaximum}
          title={atMaximum ? props.messages.repeaterMaximumReached : undefined}
          onClick={() => props.onChange(rows.insert(createRepeaterItem(props.node)))}
        >
          <RepeaterIcon name="add" />
          <span>{addLabel}</span>
        </button>
        {atMaximum && (
          <span className="a3s-form-repeater-limit" role="status">
            {props.messages.repeaterMaximumReached}
          </span>
        )}
      </div>
      {props.errors.map((error, index) => (
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
    </fieldset>
  );
}

function repeaterCopy(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}
