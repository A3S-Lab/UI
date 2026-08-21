import { type CSSProperties, type FocusEvent, type KeyboardEvent, useState } from 'react';
import { formatFormMessage, type JsonValue } from '../core';
import type { FormWidgetProps } from './native-widget';

function stringProperty(value: JsonValue | undefined, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function numberProperty(
  value: JsonValue | undefined,
  fallback: number,
  bounds?: { minimum?: number; maximum?: number },
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  let result = value;
  if (bounds?.minimum !== undefined) result = Math.max(bounds.minimum, result);
  if (bounds?.maximum !== undefined) result = Math.min(bounds.maximum, result);
  return result;
}

export function dateTimeInputValue(value: JsonValue | undefined): string {
  if (typeof value !== 'string') return '';
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:\d{2})?$/.exec(
    value,
  );
  if (!match) return '';
  if (!match[2]) return match[1];
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? '' : instant.toISOString().replace(/\.\d{3}Z$/, '');
}

export function dateTimeFormValue(value: string): string {
  if (!value) return '';
  return `${value.length === 16 ? `${value}:00` : value}Z`;
}

export function timeInputValue(value: JsonValue | undefined): string {
  if (typeof value !== 'string') return '';
  const match = /^((?:[01]\d|2[0-3])):([0-5]\d)(:[0-5]\d(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/.exec(
    value,
  );
  if (!match) return '';
  const seconds = match[3] ?? '';
  const zone = match[4];
  if (!zone || zone === 'Z') return `${match[1]}:${match[2]}${seconds}`;
  const offsetMatch = /^([+-])(\d{2}):(\d{2})$/.exec(zone);
  if (!offsetMatch) return '';
  const offset =
    (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3])) * (offsetMatch[1] === '+' ? 1 : -1);
  const utcMinutes = (Number(match[1]) * 60 + Number(match[2]) - offset + 1440) % 1440;
  return `${String(Math.floor(utcMinutes / 60)).padStart(2, '0')}:${String(
    utcMinutes % 60,
  ).padStart(2, '0')}${seconds}`;
}

export function timeFormValue(value: string): string {
  if (!value) return '';
  return `${value.length === 5 ? `${value}:00` : value}Z`;
}

function TemporalWidget({ mode, ...props }: FormWidgetProps & { mode: 'date-time' | 'time' }) {
  const {
    id,
    node,
    value,
    disabled,
    invalid,
    required,
    describedBy,
    messages,
    onChange,
    onBlur,
    onFocus,
  } = props;
  const isDateTime = mode === 'date-time';
  return (
    <div className="a3s-form-temporal input-group">
      <input
        id={id}
        className="input"
        type={isDateTime ? 'datetime-local' : 'time'}
        step="1"
        disabled={disabled}
        required={required}
        aria-label={node.label ?? node.id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={isDateTime ? dateTimeInputValue(value) : timeInputValue(value)}
        onChange={(event) =>
          onChange(
            isDateTime ? dateTimeFormValue(event.target.value) : timeFormValue(event.target.value),
          )
        }
        onBlur={onBlur}
        onFocus={onFocus}
      />
      <abbr data-align="end" title={messages.temporalUtcLabel}>
        UTC
      </abbr>
    </div>
  );
}

export function DateTimeWidget(props: FormWidgetProps) {
  return <TemporalWidget {...props} mode="date-time" />;
}

export function TimeWidget(props: FormWidgetProps) {
  return <TemporalWidget {...props} mode="time" />;
}

export function MultiSelectWidget({
  id,
  labelledBy,
  node,
  value,
  disabled,
  invalid,
  required,
  describedBy,
  options,
  schema,
  messages,
  onChange,
  onBlur,
  onFocus,
}: FormWidgetProps) {
  const selected = Array.isArray(value) ? value : [];
  const maximum = schema?.maxItems;
  const requirementId = required ? `${id}-requirement` : undefined;
  const toggle = (option: FormWidgetProps['options'][number], checked: boolean) => {
    if (checked) {
      if (maximum !== undefined && selected.length >= maximum) return;
      onChange([...selected, option.value]);
    } else onChange(selected.filter((item) => !Object.is(item, option.value)));
  };
  return (
    <fieldset
      className="a3s-form-multi-select fieldset"
      aria-label={labelledBy ? undefined : (node.label ?? node.id)}
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-describedby={[describedBy, requirementId].filter(Boolean).join(' ') || undefined}
      data-required={required || undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.();
      }}
      onFocus={onFocus}
    >
      {requirementId && (
        <span className="a3s-form-visually-hidden" id={requirementId}>
          {messages.validationRequired}
        </span>
      )}
      <div className="a3s-form-multi-select-options" data-slot="checkbox-group">
        {options.length === 0 && (
          <span className="a3s-form-multi-select-empty">{messages.dataSourceEmpty}</span>
        )}
        {options.map((option, index) => {
          const checked = selected.some((item) => Object.is(item, option.value));
          const atMaximum = maximum !== undefined && selected.length >= maximum;
          return (
            <div
              className="field"
              data-orientation="horizontal"
              data-disabled={disabled || option.disabled || (!checked && atMaximum) || undefined}
              data-invalid={invalid || undefined}
              key={`${option.label}-${String(option.value)}`}
              data-selected={checked || undefined}
            >
              <input
                id={index === 0 ? id : `${id}-${index + 1}`}
                className="input"
                type="checkbox"
                value={String(option.value)}
                checked={checked}
                disabled={disabled || option.disabled || (!checked && atMaximum)}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
                onChange={(event) => toggle(option, event.target.checked)}
              />
              <label htmlFor={index === 0 ? id : `${id}-${index + 1}`}>{option.label}</label>
            </div>
          );
        })}
      </div>
      <span className="a3s-form-multi-select-summary" aria-live="polite">
        {formatFormMessage(messages, 'multiSelectSummary', { count: selected.length })}
      </span>
    </fieldset>
  );
}

export function TagsWidget({
  id,
  labelledBy,
  node,
  value,
  disabled,
  invalid,
  required,
  describedBy,
  messages,
  schema,
  onChange,
  onBlur,
  onFocus,
}: FormWidgetProps) {
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState('');
  const feedbackId = `${id}-tag-feedback`;
  const requirementId = required ? `${id}-requirement` : undefined;
  const tags = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
  const commit = () => {
    const tag = draft.trim();
    if (!tag) return;
    if (tags.includes(tag)) {
      setFeedback(formatFormMessage(messages, 'tagsDuplicate', { tag }));
      return;
    }
    if (schema?.maxItems !== undefined && tags.length >= schema.maxItems) {
      setFeedback(messages.repeaterMaximumReached);
      return;
    }
    onChange([...tags, tag]);
    setDraft('');
    setFeedback('');
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    commit();
  };
  const handleBlur = (event: FocusEvent<HTMLFieldSetElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.();
  };
  return (
    <fieldset
      className="a3s-form-tags fieldset"
      aria-label={labelledBy ? undefined : (node.label ?? node.id)}
      aria-labelledby={labelledBy}
      aria-describedby={[describedBy, requirementId].filter(Boolean).join(' ') || undefined}
      aria-invalid={invalid || undefined}
      data-invalid={invalid || undefined}
      data-required={required || undefined}
      onBlur={handleBlur}
      onFocus={onFocus}
    >
      {requirementId && (
        <span className="a3s-form-visually-hidden" id={requirementId}>
          {messages.validationRequired}
        </span>
      )}
      {tags.length > 0 && (
        <div className="a3s-form-tag-list">
          {tags.map((tag) => (
            <span className="a3s-form-tag badge" data-variant="secondary" key={tag}>
              <span>{tag}</span>
              <button
                type="button"
                className="btn"
                data-size="icon-xs"
                data-variant="ghost"
                disabled={
                  disabled || (schema?.minItems !== undefined && tags.length <= schema.minItems)
                }
                aria-label={formatFormMessage(messages, 'tagsRemoveLabel', { tag })}
                onClick={() => onChange(tags.filter((item) => item !== tag))}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14">
                  <path
                    d="m7 7 10 10M17 7 7 17"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="a3s-form-tag-entry input-group">
        <input
          id={id}
          className="input"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, feedbackId].filter(Boolean).join(' ') || undefined}
          aria-label={formatFormMessage(messages, 'tagsInputAriaLabel', {
            label: node.label ?? node.id,
          })}
          placeholder={node.placeholder ?? messages.tagsInputPlaceholder}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setFeedback('');
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="btn"
          data-size="sm"
          data-variant="ghost"
          data-align="end"
          disabled={disabled || !draft.trim()}
          onClick={commit}
        >
          {messages.tagsAdd}
        </button>
      </div>
      <span className="a3s-form-tag-feedback" id={feedbackId} role="status" aria-live="polite">
        {feedback}
      </span>
    </fieldset>
  );
}

export function CurrencyWidget({
  id,
  node,
  value,
  disabled,
  invalid,
  required,
  describedBy,
  schema,
  onChange,
  onBlur,
  onFocus,
}: FormWidgetProps) {
  const configuredCurrency = stringProperty(node.customProps?.currency, 'CNY').toUpperCase();
  const currency = /^[A-Z]{3}$/.test(configuredCurrency) ? configuredCurrency : 'CNY';
  const step = numberProperty(node.customProps?.step, 0.01, { minimum: Number.EPSILON });
  return (
    <div className="a3s-form-currency input-group">
      <span className="a3s-form-currency-code" id={`${id}-currency`} data-align="start">
        {currency}
      </span>
      <input
        id={id}
        className="input"
        type="number"
        inputMode="decimal"
        step={step}
        min={schema?.minimum}
        max={schema?.maximum}
        disabled={disabled}
        required={required}
        aria-label={node.label ?? node.id}
        aria-invalid={invalid || undefined}
        aria-describedby={[describedBy, `${id}-currency`].filter(Boolean).join(' ')}
        placeholder={node.placeholder}
        value={typeof value === 'number' ? value : ''}
        onChange={(event) =>
          onChange(event.target.value === '' ? null : event.target.valueAsNumber)
        }
        onBlur={onBlur}
        onFocus={onFocus}
      />
    </div>
  );
}

export function RatingWidget({
  id,
  labelledBy,
  node,
  value,
  disabled,
  invalid,
  required,
  describedBy,
  options,
  schema,
  messages,
  onChange,
  onBlur,
  onFocus,
}: FormWidgetProps) {
  const minimum = Math.ceil(numberProperty(schema?.minimum, 1, { minimum: 1, maximum: 10 }));
  const maximum = Math.max(
    minimum,
    Math.floor(numberProperty(schema?.maximum, 5, { minimum, maximum: 10 })),
  );
  const ratings: FormWidgetProps['options'] =
    options.length > 0
      ? options
      : Array.from({ length: maximum - minimum + 1 }, (_, index) => ({
          label: String(minimum + index),
          value: minimum + index,
        }));
  const scaleMaximum = options.length > 0 ? ratings.length : maximum;
  const selectedRating = ratings.find((option) => Object.is(option.value, value));
  return (
    <div
      className="a3s-form-rating field"
      data-orientation="horizontal"
      role="radiogroup"
      data-slot="radio-group"
      aria-label={labelledBy ? undefined : (node.label ?? node.id)}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-required={required || undefined}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.();
      }}
      onFocus={onFocus}
    >
      {ratings.map((option, index) => (
        <label key={`${option.label}-${String(option.value)}`}>
          <input
            id={index === 0 ? id : `${id}-${index + 1}`}
            className="input"
            type="radio"
            name={id}
            value={String(option.value)}
            checked={Object.is(value, option.value)}
            disabled={disabled || option.disabled}
            required={required}
            aria-label={formatFormMessage(messages, 'ratingOptionLabel', {
              value: option.label,
              max: scaleMaximum,
            })}
            onChange={() => onChange(option.value)}
          />
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9L12 2.8Z" />
          </svg>
        </label>
      ))}
      <output aria-live="polite">
        {selectedRating ? `${selectedRating.label} / ${scaleMaximum}` : `— / ${scaleMaximum}`}
      </output>
    </div>
  );
}

export function SliderWidget({
  id,
  node,
  value,
  disabled,
  invalid,
  required,
  describedBy,
  messages,
  locale,
  schema,
  onChange,
  onBlur,
  onFocus,
}: FormWidgetProps) {
  const minimum = numberProperty(schema?.minimum, 0);
  const maximum = numberProperty(schema?.maximum, 100);
  const step = numberProperty(node.customProps?.step, 1, { minimum: Number.EPSILON });
  const current = typeof value === 'number' ? value : minimum;
  const span = Math.max(Number.EPSILON, maximum - minimum);
  const progress = `${Math.min(100, Math.max(0, ((current - minimum) / span) * 100))}%`;
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  return (
    <div
      className="a3s-form-slider"
      style={{ '--a3s-form-slider-progress': progress } as CSSProperties}
    >
      <input
        id={id}
        className="input"
        type="range"
        min={minimum}
        max={Math.max(minimum, maximum)}
        step={step}
        value={current}
        disabled={disabled}
        required={required}
        aria-label={node.label ?? node.id}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-valuetext={formatFormMessage(messages, 'sliderValueLabel', {
          label: node.label ?? node.id,
          value: current,
        })}
        style={{ '--slider-value': progress } as CSSProperties}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      <output htmlFor={id}>{current}</output>
      <div className="a3s-form-slider-scale" aria-hidden="true">
        <span>{numberFormat.format(minimum)}</span>
        <span>{numberFormat.format(maximum)}</span>
      </div>
    </div>
  );
}

export function CalculatedWidget({
  id,
  node,
  value,
  invalid,
  describedBy,
  messages,
  locale,
}: FormWidgetProps) {
  const display =
    value === undefined || value === null || value === ''
      ? messages.calculatedEmpty
      : typeof value === 'number'
        ? new Intl.NumberFormat(locale).format(value)
        : typeof value === 'string'
          ? value
          : JSON.stringify(value);
  return (
    <output
      id={id}
      className="a3s-form-calculated"
      aria-label={node.label ?? node.id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    >
      {display}
    </output>
  );
}
