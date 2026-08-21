import type { CompiledNode, FormLocaleMessages, JsonObject, JsonSchema, JsonValue } from '../core';
import { formatFormMessage } from '../core';

export function RepeaterIcon({
  name,
}: {
  name: 'add' | 'up' | 'down' | 'remove' | 'edit' | 'close';
}) {
  return (
    <svg
      className="a3s-form-repeater-icon"
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
    >
      {name === 'add' && <path d="M8 3.25v9.5M3.25 8h9.5" />}
      {name === 'up' && <path d="m4.25 9.75 3.75-3.5 3.75 3.5" />}
      {name === 'down' && <path d="m4.25 6.25 3.75 3.5 3.75-3.5" />}
      {name === 'edit' && (
        <path d="m3.5 11.75.5-2.6 6.9-6.9 2.35 2.35-6.9 6.9-2.85.25Zm6.3-8.4 2.35 2.35" />
      )}
      {name === 'close' && <path d="m4.25 4.25 7.5 7.5m0-7.5-7.5 7.5" />}
      {name === 'remove' && (
        <path d="M3.75 4.75h8.5M6 4.75V3.5h4v1.25m1.25 0-.5 8H5.25l-.5-8M6.75 7v3.5M9.25 7v3.5" />
      )}
    </svg>
  );
}

export function generatedItemKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function defaultValue(schema: JsonSchema | undefined): JsonValue {
  if (schema?.default !== undefined) return structuredClone(schema.default);
  if (schema?.type === 'object') {
    const value: JsonObject = {};
    for (const [property, child] of Object.entries(schema.properties ?? {})) {
      if (child.default !== undefined) value[property] = structuredClone(child.default);
    }
    return value;
  }
  if (schema?.type === 'array') return [];
  if (schema?.type === 'boolean') return false;
  if (schema?.type === 'number') return schema.minimum ?? 0;
  if (schema?.type === 'integer') return Math.ceil(schema.minimum ?? 0);
  if (schema?.type === 'null') return null;
  return '';
}

export function createRepeaterItem(node: CompiledNode): JsonValue {
  const item = defaultValue(node.schema?.items);
  if (
    node.itemKey &&
    item &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    typeof item[node.itemKey] !== 'string'
  ) {
    item[node.itemKey] = generatedItemKey();
  }
  return item;
}

export function RowActions({
  index,
  count,
  minimum,
  label,
  messages,
  disabled,
  editPath,
  onEdit,
  onMove,
  onRemove,
  removeLabel,
  position = index,
  reorderDisabled,
  reorderDisabledTitle,
}: {
  index: number;
  count: number;
  minimum: number;
  label: string;
  messages: Readonly<FormLocaleMessages>;
  disabled?: boolean;
  editPath?: string;
  onEdit?: (trigger: HTMLButtonElement) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  removeLabel?: string;
  position?: number;
  reorderDisabled?: boolean;
  reorderDisabledTitle?: string;
}) {
  const itemNumber = position + 1;
  return (
    <span className="a3s-form-repeater-row-actions">
      {onEdit && (
        <button
          type="button"
          className="btn"
          data-size="sm"
          data-variant="ghost"
          disabled={disabled}
          data-a3s-form-grid-edit={editPath}
          aria-label={formatFormMessage(messages, 'dataGridEditRowLabel', {
            index: itemNumber,
            label,
          })}
          onClick={(event) => onEdit(event.currentTarget)}
        >
          <RepeaterIcon name="edit" />
        </button>
      )}
      <button
        type="button"
        className="btn"
        data-size="sm"
        data-variant="ghost"
        disabled={disabled || reorderDisabled || index === 0}
        title={reorderDisabled ? reorderDisabledTitle : undefined}
        aria-label={formatFormMessage(messages, 'repeaterMoveUpLabel', {
          index: itemNumber,
          label,
        })}
        onClick={() => onMove(-1)}
      >
        <RepeaterIcon name="up" />
      </button>
      <button
        type="button"
        className="btn"
        data-size="sm"
        data-variant="ghost"
        disabled={disabled || reorderDisabled || index === count - 1}
        title={reorderDisabled ? reorderDisabledTitle : undefined}
        aria-label={formatFormMessage(messages, 'repeaterMoveDownLabel', {
          index: itemNumber,
          label,
        })}
        onClick={() => onMove(1)}
      >
        <RepeaterIcon name="down" />
      </button>
      <button
        type="button"
        className="btn"
        data-size="sm"
        data-variant="ghost"
        disabled={disabled || count <= minimum}
        title={count <= minimum ? messages.repeaterMinimumReached : undefined}
        aria-label={
          removeLabel ??
          formatFormMessage(messages, 'repeaterRemoveLabel', { index: itemNumber, label })
        }
        onClick={onRemove}
      >
        <RepeaterIcon name="remove" />
      </button>
    </span>
  );
}
