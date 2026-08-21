import type { ComponentType, InputHTMLAttributes } from 'react';
import type {
  FieldError,
  FormLocaleMessages,
  JsonSchema,
  JsonValue,
  UiNode,
  UiOption,
} from '../core';
import type { FormDataSourceState } from './data-source';
import {
  CalculatedWidget,
  CurrencyWidget,
  DateTimeWidget,
  MultiSelectWidget,
  RatingWidget,
  SliderWidget,
  TagsWidget,
  TimeWidget,
} from './extended-widgets';
import { FieldHelp } from './field-help';
import { MatrixWidget } from './matrix-widget';
import { SelectControl } from './select-control';

export interface FormWidgetProps {
  id: string;
  labelledBy?: string;
  node: UiNode;
  valuePath?: string;
  schema?: JsonSchema;
  value: JsonValue | undefined;
  disabled: boolean;
  invalid: boolean;
  required?: boolean;
  describedBy?: string;
  errors?: readonly FieldError[];
  options: UiOption[];
  dataSource: FormDataSourceState;
  messages: Readonly<FormLocaleMessages>;
  locale: string;
  onChange: (value: JsonValue) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

export type FormWidget = ComponentType<FormWidgetProps>;
export type FormWidgetRegistry = Record<string, FormWidget>;

export function NativeWidget(props: FormWidgetProps) {
  const {
    id,
    node,
    schema,
    value,
    disabled,
    invalid,
    required,
    describedBy,
    options,
    messages,
    onChange,
    onBlur,
    onFocus,
  } = props;
  const common: InputHTMLAttributes<HTMLInputElement> = {
    id,
    className: 'input',
    disabled,
    required,
    'aria-label': node.label ?? node.id,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    placeholder: node.placeholder,
    onBlur,
    onFocus,
  };
  const stringConstraints = {
    minLength: schema?.minLength,
    maxLength: schema?.maxLength,
    pattern: typeof schema?.pattern === 'string' ? schema.pattern : undefined,
  };
  const configuredStep =
    typeof schema?.multipleOf === 'number' &&
    Number.isFinite(schema.multipleOf) &&
    schema.multipleOf > 0
      ? schema.multipleOf
      : undefined;
  switch (node.widget) {
    case 'textarea':
      return (
        <textarea
          id={id}
          className="textarea"
          disabled={disabled}
          required={required}
          aria-label={node.label ?? node.id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder={node.placeholder}
          minLength={stringConstraints.minLength}
          maxLength={stringConstraints.maxLength}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
        />
      );
    case 'number':
      return (
        <input
          {...common}
          type="number"
          min={schema?.minimum}
          max={schema?.maximum}
          step={configuredStep ?? (schema?.type === 'integer' ? 1 : undefined)}
          value={typeof value === 'number' ? value : ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? null : event.target.valueAsNumber)
          }
        />
      );
    case 'date-time':
      return <DateTimeWidget {...props} />;
    case 'time':
      return <TimeWidget {...props} />;
    case 'checkbox':
    case 'switch':
      return (
        <>
          <input
            id={id}
            className="input"
            type="checkbox"
            role={node.widget === 'switch' ? 'switch' : undefined}
            disabled={disabled}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-checked={node.widget === 'switch' ? Boolean(value) : undefined}
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            onBlur={onBlur}
            onFocus={onFocus}
          />
          {node.description ? (
            <section>
              <label htmlFor={id} className={required ? 'is-required' : undefined}>
                {node.label ?? messages.checkboxEnabled}
              </label>
              <FieldHelp
                id={`${id}-help`}
                label={node.label ?? messages.checkboxEnabled}
                description={node.description}
              />
            </section>
          ) : (
            <label htmlFor={id} className={required ? 'is-required' : undefined}>
              {node.label ?? messages.checkboxEnabled}
            </label>
          )}
        </>
      );
    case 'select':
      return (
        <SelectControl
          id={id}
          disabled={disabled}
          required={required}
          aria-label={node.label ?? node.id}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={String(value ?? '')}
          onChange={(event) => {
            const selected = options.find((option) => String(option.value) === event.target.value);
            onChange(selected?.value ?? event.target.value);
          }}
          onBlur={onBlur}
          onFocus={onFocus}
        >
          <option value="">{node.placeholder ?? messages.selectPlaceholder}</option>
          {options.map((option) => (
            <option
              key={`${option.label}-${String(option.value)}`}
              value={String(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </SelectControl>
      );
    case 'multi-select':
      return <MultiSelectWidget {...props} />;
    case 'matrix-single':
    case 'matrix-multiple':
      return <MatrixWidget {...props} />;
    case 'radio':
      return (
        <div
          className="a3s-form-choice-group"
          role="radiogroup"
          data-slot="radio-group"
          aria-label={props.labelledBy ? undefined : (node.label ?? node.id)}
          aria-labelledby={props.labelledBy}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.();
          }}
          onFocus={onFocus}
        >
          {options.map((option, index) => {
            const optionId = index === 0 ? id : `${id}-${index + 1}`;
            return (
              <div
                className="field"
                data-orientation="horizontal"
                data-disabled={disabled || option.disabled || undefined}
                data-invalid={invalid || undefined}
                key={`${option.label}-${String(option.value)}`}
              >
                <input
                  id={optionId}
                  className="input"
                  type="radio"
                  name={id}
                  value={String(option.value)}
                  checked={Object.is(value, option.value)}
                  disabled={disabled || option.disabled}
                  required={required}
                  aria-invalid={invalid || undefined}
                  onChange={() => onChange(option.value)}
                />
                <label htmlFor={optionId}>{option.label}</label>
              </div>
            );
          })}
        </div>
      );
    case 'tags':
      return <TagsWidget {...props} />;
    case 'currency':
      return <CurrencyWidget {...props} />;
    case 'rating':
      return <RatingWidget {...props} />;
    case 'slider':
      return <SliderWidget {...props} />;
    case 'calculated':
      return <CalculatedWidget {...props} />;
    default:
      return (
        <input
          {...common}
          {...stringConstraints}
          type={
            node.widget === 'email' ||
            node.widget === 'password' ||
            node.widget === 'date' ||
            node.widget === 'url' ||
            node.widget === 'tel'
              ? node.widget
              : 'text'
          }
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}
