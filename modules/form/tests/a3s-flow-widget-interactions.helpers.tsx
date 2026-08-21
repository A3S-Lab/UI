import { screen } from '@testing-library/react';
import { useState } from 'react';
import { A3S_FLOW_EXPRESSION_API_VERSION, createA3SFlowExpression } from '../src/a3s-flow';
import {
  type FieldError,
  type FormExpression,
  type JsonObject,
  type JsonValue,
  resolveFormLocaleCatalog,
} from '../src/core';
import { A3SFlowBatchWidget } from '../src/react/a3s-flow-batch-widget';
import {
  A3SFlowExpressionWidget,
  FlowExpressionEditor,
} from '../src/react/a3s-flow-expression-widget';
import { A3SFlowSchemaWidget } from '../src/react/a3s-flow-schema-widget';
import type { FormDataSourceState } from '../src/react/data-source';
import type { FormWidgetProps } from '../src/react/native-widget';

export const idleDataSource: FormDataSourceState = {
  options: [],
  status: 'static',
  query: '',
  searchable: false,
  hasMore: false,
  loadingMore: false,
  pageError: false,
  activate: () => undefined,
  setQuery: () => undefined,
  retry: () => undefined,
  loadMore: () => undefined,
};

export function ExpressionHarness({
  id,
  initialValue,
  locale = 'en',
  purpose,
  disabled,
  invalid,
  labelledBy,
  describedBy,
  onBlur,
  onFocus,
}: {
  id: string;
  initialValue?: JsonValue;
  locale?: string;
  purpose?: string;
  disabled?: boolean;
  invalid?: boolean;
  labelledBy?: string;
  describedBy?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}) {
  const [value, setValue] = useState<JsonValue | undefined>(initialValue);
  return (
    <div>
      <FlowExpressionEditor
        id={`${id}-control`}
        value={value}
        onChange={setValue}
        locale={locale}
        purpose={purpose}
        disabled={disabled}
        invalid={invalid}
        labelledBy={labelledBy}
        describedBy={describedBy}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      <output data-testid={`${id}-value`}>{JSON.stringify(value)}</output>
    </div>
  );
}

export function WidgetHarness({
  id,
  widget,
  initialValue,
  locale = 'en',
  disabled = false,
  invalid = false,
  labelledBy,
  describedBy,
  customProps,
  valuePath,
  errors,
  replacementValue,
  onBlur,
  onFocus,
}: {
  id: string;
  widget: 'batch' | 'expression' | 'schema';
  initialValue?: JsonValue;
  locale?: string;
  disabled?: boolean;
  invalid?: boolean;
  labelledBy?: string;
  describedBy?: string;
  customProps?: JsonObject;
  valuePath?: string;
  errors?: readonly FieldError[];
  replacementValue?: JsonValue;
  onBlur?: () => void;
  onFocus?: () => void;
}) {
  const [value, setValue] = useState<JsonValue | undefined>(initialValue);
  const props: FormWidgetProps = {
    id: `${id}-control`,
    node: { id, kind: 'field', customProps },
    valuePath,
    value,
    disabled,
    invalid,
    labelledBy,
    describedBy,
    errors,
    options: [],
    dataSource: idleDataSource,
    messages: resolveFormLocaleCatalog(locale).messages,
    locale,
    onChange: setValue,
    onBlur,
    onFocus,
  };
  const Widget =
    widget === 'batch'
      ? A3SFlowBatchWidget
      : widget === 'schema'
        ? A3SFlowSchemaWidget
        : A3SFlowExpressionWidget;
  return (
    <div>
      <Widget {...props} />
      {replacementValue !== undefined && (
        <button type="button" onClick={() => setValue(replacementValue)}>
          Replace {id}
        </button>
      )}
      <output data-testid={`${id}-value`}>{JSON.stringify(value)}</output>
    </div>
  );
}

export function renderedValue(testId: string): JsonValue | undefined {
  const source = screen.getByTestId(testId).textContent;
  return source ? (JSON.parse(source) as JsonValue) : undefined;
}

export function expressionValue(expression: FormExpression): JsonObject {
  return {
    apiVersion: A3S_FLOW_EXPRESSION_API_VERSION,
    expression: expression as unknown as JsonValue,
  };
}

export function batchMember(stepKey: string, overrides: JsonObject = {}): JsonObject {
  return {
    step_key: stepKey,
    step_name: `task.${stepKey}`,
    input_mapping: createA3SFlowExpression({ op: 'field', path: 'input' }),
    max_attempts: 3,
    retry_delay_ms: 0,
    on_exhausted: 'fail_run',
    ...overrides,
  };
}
