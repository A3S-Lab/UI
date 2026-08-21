import { useId } from 'react';
import type { FormDocument, JsonPrimitive, JsonSchema, JsonValue, UiNode, UiOption } from '../core';
import { Control } from './designer-inspector-controls';
import {
  dateTimeFormValue,
  dateTimeInputValue,
  timeFormValue,
  timeInputValue,
} from './extended-widgets';
import { SelectControl } from './select-control';

const UNSUPPORTED_DEFAULT_WIDGETS = new Set([
  'password',
  'matrix-single',
  'matrix-multiple',
  'file',
  'signature',
  'a3s.file-upload',
  'a3s.signature',
]);

export function DefaultValueControl({
  schema,
  widget,
  options,
  onChange,
}: {
  schema?: JsonSchema;
  widget?: string;
  options: readonly UiOption[];
  onChange: (value: JsonValue | undefined) => void;
}) {
  if (!schema?.type || UNSUPPORTED_DEFAULT_WIDGETS.has(widget ?? '')) return null;

  if (schema.type === 'boolean') {
    return (
      <Control label="默认状态">
        <SelectControl
          aria-label="默认状态"
          value={typeof schema.default === 'boolean' ? String(schema.default) : ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? undefined : event.target.value === 'true')
          }
        >
          <option value="">不预设</option>
          <option value="true">开启</option>
          <option value="false">关闭</option>
        </SelectControl>
      </Control>
    );
  }

  if (schema.type === 'array') {
    if (widget !== 'multi-select' || options.length === 0) return null;
    const defaults = Array.isArray(schema.default) ? schema.default.filter(isPrimitive) : [];
    const selected = new Set(defaults.map(encodePrimitive));
    return (
      <fieldset className="a3s-form-default-options fieldset" aria-label="默认选择">
        <legend>默认选择</legend>
        <p>不选择时保持空数组。</p>
        <div className="item-group">
          {options.map((option) => {
            const key = encodePrimitive(option.value);
            return (
              <label
                className="a3s-form-default-option item field"
                data-size="xs"
                data-variant="outline"
                key={key}
              >
                <input
                  className="input"
                  type="checkbox"
                  aria-label={`默认选择：${option.label}`}
                  checked={selected.has(key)}
                  disabled={option.disabled && !selected.has(key)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...defaults, option.value]
                      : defaults.filter((value) => encodePrimitive(value) !== key);
                    onChange(next.length > 0 ? next : undefined);
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (options.length > 0) {
    const current = isPrimitive(schema.default) ? encodePrimitive(schema.default) : '';
    return (
      <Control label="默认选项">
        <SelectControl
          aria-label="默认选项"
          value={current}
          onChange={(event) =>
            onChange(event.target.value === '' ? undefined : decodePrimitive(event.target.value))
          }
        >
          <option value="">不预设</option>
          {options.map((option) => (
            <option
              value={encodePrimitive(option.value)}
              disabled={option.disabled}
              key={encodePrimitive(option.value)}
            >
              {option.label}
            </option>
          ))}
        </SelectControl>
      </Control>
    );
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return (
      <Control label="默认值" hint="可留空">
        <input
          aria-label="默认值"
          type="number"
          step={schema.type === 'integer' ? 1 : 'any'}
          value={typeof schema.default === 'number' ? schema.default : ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? undefined : Number(event.target.value))
          }
        />
      </Control>
    );
  }

  if (schema.type !== 'string') return null;
  if (schema.format === 'date-time' || schema.format === 'time') {
    return (
      <TemporalDefaultValueControl
        mode={schema.format}
        value={typeof schema.default === 'string' ? schema.default : ''}
        onChange={onChange}
      />
    );
  }
  if (widget === 'textarea') {
    return (
      <Control label="默认值" hint="可留空">
        <textarea
          aria-label="默认值"
          value={typeof schema.default === 'string' ? schema.default : ''}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      </Control>
    );
  }
  const inputType =
    schema.format === 'email'
      ? 'email'
      : schema.format === 'uri'
        ? 'url'
        : schema.format === 'date'
          ? 'date'
          : widget === 'tel'
            ? 'tel'
            : 'text';
  return (
    <Control label="默认值" hint="可留空">
      <input
        aria-label="默认值"
        type={inputType}
        value={typeof schema.default === 'string' ? schema.default : ''}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
    </Control>
  );
}

function TemporalDefaultValueControl({
  mode,
  value,
  onChange,
}: {
  mode: 'date-time' | 'time';
  value: string;
  onChange: (value: JsonValue | undefined) => void;
}) {
  const id = `a3s-form-temporal-default-${useId().replaceAll(':', '')}`;
  const dateTime = mode === 'date-time';
  return (
    <div className="a3s-form-control field">
      <label htmlFor={id}>
        <span>默认值</span>
        <small>UTC</small>
      </label>
      <div className="a3s-form-temporal input-group">
        <input
          id={id}
          className="input"
          aria-label="默认值"
          type={dateTime ? 'datetime-local' : 'time'}
          step="1"
          value={dateTime ? dateTimeInputValue(value) : timeInputValue(value)}
          onChange={(event) => {
            const next = dateTime
              ? dateTimeFormValue(event.target.value)
              : timeFormValue(event.target.value);
            onChange(next || undefined);
          }}
        />
        <abbr data-align="end" title="协调世界时">
          UTC
        </abbr>
      </div>
    </div>
  );
}

export function DataSourceControl({
  document,
  node,
  schema,
  onUpdateNode,
}: {
  document: FormDocument;
  node: UiNode;
  schema?: JsonSchema;
  onUpdateNode: (changes: Partial<UiNode>) => void;
}) {
  const definitions = document.dataSources ?? [];
  if (definitions.length === 0) return null;
  const definition = definitions.find(({ id }) => id === node.dataSource);
  return (
    <div className="a3s-form-data-source-setting">
      <Control label="选项来源" hint={node.dataSource ? '宿主数据源' : '表单内维护'}>
        <SelectControl
          aria-label="选项来源"
          value={node.dataSource ?? ''}
          onChange={(event) => {
            const dataSource = event.target.value || undefined;
            onUpdateNode(
              dataSource
                ? { dataSource, options: undefined }
                : {
                    dataSource: undefined,
                    options:
                      node.options ??
                      ((schema?.type === 'array' ? schema.items?.enum : schema?.enum) ?? [])
                        .filter(isPrimitive)
                        .map((value) => ({ label: String(value), value })),
                  },
            );
          }}
        >
          <option value="">静态选项</option>
          {definitions.map((source) => (
            <option value={source.id} key={source.id}>
              {source.id}
            </option>
          ))}
        </SelectControl>
      </Control>
      {definition && (
        <article
          className="a3s-form-data-source-profile item"
          data-size="xs"
          data-variant="outline"
        >
          <section>
            <h4>{definition.id}</h4>
            <p>{definition.registryKey}</p>
          </section>
          <aside>
            <span className="badge" data-variant="outline">
              {definition.trigger === 'focus' ? '聚焦加载' : '自动加载'}
            </span>
            {definition.searchable && (
              <span className="badge" data-variant="secondary">
                可搜索
              </span>
            )}
          </aside>
        </article>
      )}
    </div>
  );
}

function isPrimitive(value: JsonValue | undefined): value is JsonPrimitive {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function encodePrimitive(value: JsonPrimitive): string {
  return JSON.stringify(value);
}

function decodePrimitive(value: string): JsonPrimitive {
  return JSON.parse(value) as JsonPrimitive;
}
