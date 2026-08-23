import {
  type FormEvent,
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type CompiledNode,
  DataSourceCoordinator,
  evaluateFormValue,
  type FieldError,
  type FormHostAdapter,
  type FormLocaleCatalogOverride,
  type FormLocaleMessages,
  type FormPlan,
  type FormWizardCheckpoint,
  type FormWizardCheckpointChange,
  fieldState,
  formatFormMessage,
  IncrementalComputedRuleEvaluator,
  type JsonObject,
  type JsonValue,
  readFormValue,
  resolveFormLocaleCatalog,
  resolveValuePathTemplate,
  type UiNode,
  updateFormValue,
  validateFormValueAsync,
} from '../core';
import { DataSourceSearch, DataSourceStatus, useFormDataSource } from './data-source';
import { DesignerIcon } from './designer-icons';
import { nodeForValuePath, useFormErrorFocus } from './error-focus';
import { FieldHelp } from './field-help';
import { type FormWidgetRegistry, NativeWidget } from './native-widget';
import type { FormNodeRegistry } from './node-registry';
import { RepeaterField } from './repeater';
import { subscribedNodePropsEqual } from './subscriptions';
import { ValidationStatus } from './validation-status';
import {
  BOOLEAN_FIELD_WIDGETS,
  COMPOSITE_FIELD_WIDGETS,
  MATRIX_FIELD_WIDGETS,
  NESTED_ERROR_FIELD_WIDGETS,
} from './widget-contract';
import {
  type FormWizardController,
  useFormWizardController,
  WizardContainer,
  wizardReviewItems,
} from './wizard';
import { useWizardPageValidation } from './wizard-validation';

export type { FormWidget, FormWidgetProps, FormWidgetRegistry } from './native-widget';
export { NativeWidget } from './native-widget';

export interface FormRendererProps {
  plan: FormPlan;
  value: JsonObject;
  onChange: (value: JsonObject) => void;
  onAction?: (actionId: string, value: JsonObject) => void | Promise<void>;
  errors?: FieldError[];
  hostAdapter?: FormHostAdapter;
  widgetRegistry?: FormWidgetRegistry;
  nodeRegistry?: FormNodeRegistry;
  renderNodeAccessory?: (context: FormNodeAccessoryContext) => ReactNode;
  readOnly?: boolean;
  locale?: string;
  localeCatalog?: FormLocaleCatalogOverride;
  wizardCheckpoints?: Readonly<Record<string, FormWizardCheckpoint>>;
  onWizardCheckpointChange?: (change: FormWizardCheckpointChange) => void;
  className?: string;
}

export interface FormNodeAccessoryContext {
  node: CompiledNode;
  valuePath: string;
  value: JsonValue | undefined;
  disabled: boolean;
}

function formItemStyle(width: number | undefined, extra?: React.CSSProperties) {
  return {
    '--a3s-form-item-column': `span ${width ?? 12}`,
    ...extra,
  } as React.CSSProperties;
}

function nodeValuePath(
  node: FormPlan['nodes'][number] | undefined,
  rowIndices: readonly number[] | undefined,
): string | undefined {
  if (node?.valuePathTemplate?.includes('*')) {
    return resolveValuePathTemplate(node.valuePathTemplate, rowIndices);
  }
  return node?.valuePath;
}

function nodeInputId(prefix: string, nodeId: string, rowKeys: readonly string[] | undefined) {
  return `${prefix}-${nodeId}${rowKeys?.length ? `-${rowKeys.join('-')}` : ''}`;
}

function isRequiredField(plan: FormPlan, node: UiNode): boolean {
  const tokens = node.schemaPath
    ?.split('/')
    .slice(1)
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
  if (!tokens || tokens.length < 2 || tokens.at(-2) !== 'properties') return false;
  let parent: unknown = plan.schema;
  for (const token of tokens.slice(0, -2)) {
    if (!parent || typeof parent !== 'object' || !(token in parent)) return false;
    parent = (parent as Record<string, unknown>)[token];
  }
  if (!parent || typeof parent !== 'object') return false;
  const required = (parent as { required?: unknown }).required;
  return Array.isArray(required) && required.includes(tokens.at(-1));
}

function presentedFieldWidget(node: UiNode): string {
  const configured = node.customProps?.controlWidget;
  if (typeof configured === 'string' && configured.length > 0) return configured;
  return node.widget ?? 'text';
}

const DATA_GRID_READ_ONLY_WIDGETS = new Set(['hidden', 'calculated', ...MATRIX_FIELD_WIDGETS]);

function errorsForValuePath(
  errorMap: ReadonlyMap<string, readonly FieldError[]>,
  path: string,
  includeDescendants: boolean,
): FieldError[] {
  if (!includeDescendants) return [...(errorMap.get(path) ?? [])];
  const errors: FieldError[] = [];
  for (const [candidate, items] of errorMap) {
    if (candidate === path || candidate.startsWith(`${path}.`)) errors.push(...items);
  }
  return errors;
}

function errorMapFor(errors: readonly FieldError[]): Map<string, FieldError[]> {
  const map = new Map<string, FieldError[]>();
  for (const error of errors) map.set(error.path, [...(map.get(error.path) ?? []), error]);
  return map;
}

function dataGridCellText(
  value: JsonValue | undefined,
  node: UiNode | undefined,
  messages: Readonly<FormLocaleMessages>,
): string {
  if (value === undefined || value === null || value === '') return messages.dataGridEmptyValue;
  if (Array.isArray(value)) {
    if (value.length === 0) return messages.dataGridEmptyValue;
    return value.map((item) => dataGridCellText(item, node, messages)).join(', ');
  }
  const option = node?.options?.find((candidate) => Object.is(candidate.value, value));
  if (option) return option.label;
  if (typeof value === 'boolean') {
    return value ? messages.wizardReviewBooleanTrue : messages.wizardReviewBooleanFalse;
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

interface NodeViewProps extends FormRendererProps {
  dataSourceCoordinator: DataSourceCoordinator;
  getValue: () => JsonObject;
  messages: Readonly<FormLocaleMessages>;
  nodeId: string;
  errorMap: Map<string, FieldError[]>;
  prefix: string;
  onFieldBlur: (nodeId: string, path: string) => void;
  validatingPaths: ReadonlySet<string>;
  wizardController: FormWizardController;
  wizardPageErrors: readonly FieldError[];
  validatingWizardPageId?: string;
  onWizardNext: (wizardId: string, pageId: string, nextPageId: string) => void;
  onWizardGoTo: (wizardId: string, pageId: string) => void;
  onWizardPrevious: (wizardId: string) => void;
  rowIndices?: readonly number[];
  rowKeys?: readonly string[];
  suppressHeading?: boolean;
}

function NodeView(props: NodeViewProps): ReactNode {
  const node = props.plan.nodeById[props.nodeId];
  const extension = node?.widget ? props.nodeRegistry?.[node.widget] : undefined;
  if ((node?.kind === 'field' || node?.kind === 'repeater') && !extension) {
    return <SubscribedNodeView {...props} />;
  }
  return <NodeViewContent {...props} />;
}

function NodeViewContent(props: NodeViewProps): ReactNode {
  const {
    plan,
    nodeId,
    value,
    onChange,
    widgetRegistry = {},
    nodeRegistry = {},
    errorMap,
    prefix,
  } = props;
  const node = plan.nodeById[nodeId];
  const [activeLayoutChild, setActiveLayoutChild] = useState<string>();
  const state = fieldState(plan, nodeId, value, props.rowIndices);
  const valuePath = nodeValuePath(node, props.rowIndices);
  const validating = valuePath ? props.validatingPaths.has(valuePath) : false;
  const dataSource = useFormDataSource({
    coordinator: props.dataSourceCoordinator,
    getValue: props.getValue,
    hostAdapter: props.hostAdapter,
    locale: props.locale ?? plan.metadata.locale ?? 'zh-CN',
    node,
    plan,
    rowIndices: props.rowIndices,
    value,
    valuePath,
    visible: state.visible,
  });
  const options = dataSource.options;
  if (!node || !state.visible) return null;
  const extension = node.widget ? nodeRegistry[node.widget] : undefined;
  if (extension) {
    const CustomNode = extension.render;
    const current = valuePath ? readFormValue(value, valuePath) : undefined;
    const errors = valuePath ? errorsForValuePath(errorMap, valuePath, true) : [];
    const inputId = nodeInputId(prefix, node.id, props.rowKeys);
    const locale = props.locale ?? plan.metadata.locale ?? 'zh-CN';
    const children = (node.children ?? []).length ? (
      <div className="a3s-form-custom-children">
        {(node.children ?? []).map((child) => (
          <NodeView key={child} {...props} nodeId={child} />
        ))}
      </div>
    ) : undefined;
    return (
      <div
        className={`a3s-form-custom-node field${errors.length ? ' is-invalid' : ''}`}
        data-node-type={node.widget}
        data-a3s-form-path={valuePath}
        data-invalid={errors.length > 0 || undefined}
        data-validating={validating || undefined}
        aria-busy={
          validating || dataSource.status === 'loading' || dataSource.loadingMore || undefined
        }
        style={formItemStyle(node.width)}
      >
        <DataSourceSearch
          label={node.label ?? node.id}
          messages={props.messages}
          state={dataSource}
        />
        <CustomNode
          id={inputId}
          node={node}
          plan={plan}
          locale={locale}
          valuePath={valuePath}
          rowIndices={props.rowIndices ?? []}
          value={current}
          formValue={value}
          messages={props.messages}
          required={isRequiredField(plan, node)}
          disabled={Boolean(
            props.readOnly ||
              !state.enabled ||
              dataSource.status === 'blocked' ||
              dataSource.status === 'loading',
          )}
          invalid={errors.length > 0}
          errors={errors}
          options={options}
          dataSource={dataSource}
          onChange={(next) => {
            if (valuePath) onChange(updateFormValue(props.getValue(), valuePath, next));
          }}
          onFormChange={onChange}
          onBlur={
            state.enabled && valuePath ? () => props.onFieldBlur(node.id, valuePath) : undefined
          }
          onFocus={dataSource.activate}
        >
          {children}
        </CustomNode>
        <DataSourceStatus
          label={node.label ?? node.id}
          messages={props.messages}
          state={dataSource}
        />
        {errors.map((error) => (
          <div className="a3s-form-error" role="alert" key={`${error.code}-${error.message}`}>
            {error.message}
          </div>
        ))}
        {validating && <ValidationStatus label={node.label ?? node.id} messages={props.messages} />}
      </div>
    );
  }
  if (node.kind === 'content') {
    if (node.presentation === 'divider')
      return (
        <div
          className="a3s-form-content a3s-form-divider field-separator"
          style={formItemStyle(node.width)}
        >
          <hr />
          {node.content && <span>{node.content}</span>}
        </div>
      );
    if (node.presentation === 'spacer')
      return (
        <div
          className="a3s-form-content a3s-form-spacer"
          style={formItemStyle(node.width, { height: node.gap ?? 24 })}
          aria-hidden="true"
        />
      );
    return (
      <div className="a3s-form-content" style={formItemStyle(node.width)}>
        {node.content}
      </div>
    );
  }
  if (node.kind !== 'field' && node.kind !== 'repeater') {
    const Tag = node.kind === 'section' ? 'section' : 'div';
    const layoutStyle = {
      '--a3s-form-gap': `${node.gap ?? 16}px`,
      '--a3s-form-item-column': `span ${node.width ?? 12}`,
    } as React.CSSProperties;
    if (node.layout === 'wizard') {
      const runtime = props.wizardController.states[node.id];
      if (!runtime) return null;
      const activePageId = runtime.activePage?.id;
      const nextPageId = runtime.pages[runtime.activeIndex + 1]?.id;
      return (
        <WizardContainer
          state={runtime}
          messages={props.messages}
          prefix={prefix}
          validating={props.validatingWizardPageId === activePageId}
          pageErrors={props.wizardPageErrors}
          reviewItems={wizardReviewItems(plan, value, runtime, props.messages)}
          renderPage={(pageId) => <NodeView {...props} nodeId={pageId} suppressHeading />}
          onNext={() => {
            if (activePageId && nextPageId) props.onWizardNext(node.id, activePageId, nextPageId);
          }}
          onPrevious={() => props.onWizardPrevious(node.id)}
          onGoTo={(pageId) => props.onWizardGoTo(node.id, pageId)}
          onEditReviewItem={(pageId) => props.onWizardGoTo(node.id, pageId)}
        />
      );
    }
    if (node.layout === 'tabs') {
      const tabs = (node.children ?? [])
        .map((child) => plan.nodeById[child])
        .filter((child) => child !== undefined);
      const active = tabs.some((tab) => tab.id === activeLayoutChild)
        ? activeLayoutChild
        : tabs[0]?.id;
      return (
        <section
          className="a3s-form-layout a3s-form-tabs tabs"
          aria-labelledby={node.label ? `${prefix}-${node.id}-title` : undefined}
          style={layoutStyle}
        >
          {!props.suppressHeading && node.label && (
            <header>
              <h2 id={`${prefix}-${node.id}-title`}>{node.label}</h2>
              {node.description && <p>{node.description}</p>}
            </header>
          )}
          <div
            className="a3s-form-tablist"
            role="tablist"
            aria-label={node.label}
            aria-orientation="horizontal"
          >
            {tabs.map((tab) => (
              <button
                type="button"
                role="tab"
                id={`${prefix}-${node.id}-tab-${tab.id}`}
                aria-selected={tab.id === active}
                aria-controls={`${prefix}-${node.id}-panel`}
                tabIndex={tab.id === active ? 0 : -1}
                key={tab.id}
                onKeyDown={(event) => handleLayoutTabKey(event, tabs, tab.id, setActiveLayoutChild)}
                onClick={() => setActiveLayoutChild(tab.id)}
              >
                {tab.label ?? tab.id}
              </button>
            ))}
          </div>
          {active && (
            <div
              className="a3s-form-tabpanel"
              id={`${prefix}-${node.id}-panel`}
              role="tabpanel"
              aria-labelledby={`${prefix}-${node.id}-tab-${active}`}
            >
              <NodeView {...props} nodeId={active} suppressHeading />
            </div>
          )}
        </section>
      );
    }
    if (node.layout === 'collapse') {
      return (
        <section
          className="a3s-form-layout a3s-form-collapse accordion"
          aria-labelledby={node.label ? `${prefix}-${node.id}-title` : undefined}
          style={layoutStyle}
        >
          {!props.suppressHeading && node.label && (
            <header>
              <h2 id={`${prefix}-${node.id}-title`}>{node.label}</h2>
              {node.description && <p>{node.description}</p>}
            </header>
          )}
          {(node.children ?? []).map((child) => {
            const panel = plan.nodeById[child];
            return (
              <details key={child} open={node.customProps?.defaultOpen !== false}>
                <summary>
                  <span>{panel?.label ?? child}</span>
                  <DesignerIcon name="chevron-down" size={16} />
                </summary>
                <NodeView {...props} nodeId={child} suppressHeading />
              </details>
            );
          })}
        </section>
      );
    }
    return (
      <Tag
        className={`a3s-form-layout a3s-form-${node.kind} a3s-form-${node.layout ?? 'flow'}${node.layout === 'card' ? ' card' : ''}`}
        aria-labelledby={node.label ? `${prefix}-${node.id}-title` : undefined}
        style={layoutStyle}
      >
        {!props.suppressHeading && node.label && (
          <header>
            <h2 id={`${prefix}-${node.id}-title`}>{node.label}</h2>
            {node.description && <p>{node.description}</p>}
          </header>
        )}
        <div
          className="a3s-form-grid"
          style={
            {
              '--a3s-form-columns': node.columns ?? 12,
              '--a3s-form-gap': `${node.gap ?? 16}px`,
            } as React.CSSProperties
          }
        >
          {(node.children ?? []).map((child) => (
            <NodeView key={child} {...props} nodeId={child} suppressHeading={false} />
          ))}
        </div>
      </Tag>
    );
  }
  if (!valuePath) return null;
  const current = readFormValue(value, valuePath);
  const presentedWidget = presentedFieldWidget(node);
  const matrixField = MATRIX_FIELD_WIDGETS.has(presentedWidget);
  const dataGridField = node.kind === 'repeater' && node.layout === 'data-grid';
  const nestedErrorField = NESTED_ERROR_FIELD_WIDGETS.has(presentedWidget);
  const errors = errorsForValuePath(
    errorMap,
    valuePath,
    matrixField || dataGridField || nestedErrorField,
  );
  const inputId = nodeInputId(prefix, node.id, props.rowKeys);
  const required = isRequiredField(plan, node);
  const describedBy = [
    node.description ? `${inputId}-help` : undefined,
    ...(!matrixField && !dataGridField
      ? errors.map((_, index) => `${inputId}-error-${index + 1}`)
      : []),
  ]
    .filter(Boolean)
    .join(' ');
  const Widget = widgetRegistry[node.widget ?? 'text'] ?? NativeWidget;
  const compositeField = COMPOSITE_FIELD_WIDGETS.has(presentedWidget);
  const booleanField = BOOLEAN_FIELD_WIDGETS.has(presentedWidget);
  if (node.kind === 'field' && node.widget === 'hidden') {
    const hiddenValue =
      current === undefined || current === null
        ? ''
        : typeof current === 'object'
          ? JSON.stringify(current)
          : String(current);
    return (
      <input
        id={inputId}
        type="hidden"
        name={valuePath}
        value={hiddenValue}
        readOnly
        data-a3s-form-path={valuePath}
      />
    );
  }
  if (node.kind === 'repeater') {
    const items = Array.isArray(current) ? current : [];
    const disabled = Boolean(props.readOnly || !state.enabled);
    return (
      <RepeaterField
        id={inputId}
        node={node}
        items={items}
        valuePath={valuePath}
        required={required}
        disabled={disabled}
        validating={validating}
        describedBy={describedBy || undefined}
        errors={errors}
        messages={props.messages}
        locale={props.locale ?? plan.metadata.locale}
        style={formItemStyle(node.width)}
        headerActions={props.renderNodeAccessory?.({ node, valuePath, value: current, disabled })}
        onBlur={() => {
          if (state.enabled) props.onFieldBlur(node.id, valuePath);
        }}
        onChange={(next) => onChange(updateFormValue(props.getValue(), valuePath, next))}
        identifyItem={(item, index) =>
          props.hostAdapter?.identifyRepeaterItem?.({
            plan,
            node,
            item,
            index,
            valuePath,
          })
        }
        columns={(node.children ?? []).map((childId) => {
          const child = plan.nodeById[childId];
          const repeaterTemplate = node.valuePathTemplate ?? node.valuePath;
          const childTemplate = child?.valuePathTemplate ?? child?.valuePath;
          const columnPrefix = repeaterTemplate ? `${repeaterTemplate}.*.` : undefined;
          const path =
            columnPrefix && childTemplate?.startsWith(columnPrefix)
              ? childTemplate.slice(columnPrefix.length)
              : undefined;
          return {
            id: childId,
            label: child?.label ?? childId,
            width: child?.width ?? 12,
            path,
            schema: child?.schema,
            pasteable: Boolean(
              path &&
                child?.kind === 'field' &&
                !DATA_GRID_READ_ONLY_WIDGETS.has(child.widget ?? ''),
            ),
          };
        })}
        renderCell={(child, index, key) => (
          <NodeView
            key={child}
            {...props}
            nodeId={child}
            readOnly={Boolean(props.readOnly || !state.enabled)}
            rowIndices={[...(props.rowIndices ?? []), index]}
            rowKeys={[...(props.rowKeys ?? []), key]}
          />
        )}
        getCellValue={(childId, index) => {
          const child = plan.nodeById[childId];
          const path = nodeValuePath(child, [...(props.rowIndices ?? []), index]);
          return path ? readFormValue(value, path) : undefined;
        }}
        formatCellValue={(childId, index) => {
          const child = plan.nodeById[childId];
          const path = nodeValuePath(child, [...(props.rowIndices ?? []), index]);
          return dataGridCellText(
            path ? readFormValue(value, path) : undefined,
            child,
            props.messages,
          );
        }}
        renderDialogCell={(child, index, key, item, onItemChange, dialogErrors) => {
          const draftItems = [...items];
          if (index >= draftItems.length) draftItems.push(item);
          else draftItems[index] = item;
          const draftValue = updateFormValue(props.getValue(), valuePath, draftItems);
          const draftErrorMap = errorMapFor(dialogErrors);
          return (
            <NodeView
              key={child}
              {...props}
              nodeId={child}
              value={draftValue}
              getValue={() => draftValue}
              onChange={(nextValue) => {
                const evaluation = evaluateFormValue(plan, nextValue, {
                  locale: props.locale ?? plan.metadata.locale,
                  localeCatalog: props.localeCatalog,
                });
                const nextItems = readFormValue(evaluation.value, valuePath);
                onItemChange(Array.isArray(nextItems) ? (nextItems[index] ?? item) : item);
              }}
              readOnly={Boolean(props.readOnly || !state.enabled)}
              errorMap={draftErrorMap}
              onFieldBlur={() => undefined}
              validatingPaths={new Set()}
              rowIndices={[...(props.rowIndices ?? []), index]}
              rowKeys={[...(props.rowKeys ?? []), key]}
            />
          );
        }}
        validateDialogItem={(item, index) => {
          const draftItems = [...items];
          if (index >= draftItems.length) draftItems.push(item);
          else draftItems[index] = item;
          const evaluation = evaluateFormValue(
            plan,
            updateFormValue(props.getValue(), valuePath, draftItems),
            {
              locale: props.locale ?? plan.metadata.locale,
              localeCatalog: props.localeCatalog,
            },
          );
          const rowPath = `${valuePath}.${index}`;
          const evaluatedItems = readFormValue(evaluation.value, valuePath);
          return {
            item: Array.isArray(evaluatedItems) ? (evaluatedItems[index] ?? item) : item,
            errors: evaluation.errors.filter(
              (error) => error.path === rowPath || error.path.startsWith(`${rowPath}.`),
            ),
          };
        }}
        validateItems={(nextItems) => {
          const evaluation = evaluateFormValue(
            plan,
            updateFormValue(props.getValue(), valuePath, nextItems),
            {
              locale: props.locale ?? plan.metadata.locale,
              localeCatalog: props.localeCatalog,
            },
          );
          const evaluatedItems = readFormValue(evaluation.value, valuePath);
          return {
            items: Array.isArray(evaluatedItems) ? evaluatedItems : nextItems,
            errors: evaluation.errors.filter(
              (error) => error.path === valuePath || error.path.startsWith(`${valuePath}.`),
            ),
          };
        }}
        validationStatus={
          validating ? (
            <ValidationStatus label={node.label ?? node.id} messages={props.messages} />
          ) : undefined
        }
      />
    );
  }
  return (
    <div
      className={`a3s-form-field field${booleanField ? ' is-boolean' : ''}${errors.length ? ' is-invalid' : ''}`}
      data-orientation={booleanField ? 'horizontal' : undefined}
      data-disabled={
        props.readOnly ||
        !state.enabled ||
        dataSource.status === 'blocked' ||
        dataSource.status === 'loading' ||
        undefined
      }
      data-invalid={errors.length > 0 || undefined}
      data-validating={validating || undefined}
      data-a3s-form-path={valuePath}
      aria-busy={
        validating || dataSource.status === 'loading' || dataSource.loadingMore || undefined
      }
      style={formItemStyle(node.width)}
    >
      {!booleanField &&
        (compositeField ? (
          <div
            id={`${inputId}-label`}
            className={`a3s-form-field-label${required ? ' is-required' : ''}`}
          >
            {node.label ?? node.id}
          </div>
        ) : (
          <label
            id={`${inputId}-label`}
            htmlFor={inputId}
            className={required ? 'is-required' : undefined}
          >
            {node.label ?? node.id}
          </label>
        ))}
      {node.description && !booleanField && (
        <FieldHelp
          id={`${inputId}-help`}
          label={node.label ?? node.id}
          description={node.description}
        />
      )}
      <DataSourceSearch
        label={node.label ?? node.id}
        messages={props.messages}
        state={dataSource}
      />
      <Widget
        id={inputId}
        labelledBy={compositeField ? `${inputId}-label` : undefined}
        node={node}
        valuePath={valuePath}
        schema={node.schema}
        value={current}
        disabled={Boolean(
          props.readOnly ||
            !state.enabled ||
            dataSource.status === 'blocked' ||
            dataSource.status === 'loading',
        )}
        invalid={errors.length > 0}
        required={required}
        describedBy={describedBy || undefined}
        errors={errors}
        options={options}
        dataSource={dataSource}
        messages={props.messages}
        locale={props.locale ?? plan.metadata.locale ?? 'zh-CN'}
        onChange={(next) => onChange(updateFormValue(props.getValue(), valuePath, next))}
        onBlur={state.enabled ? () => props.onFieldBlur(node.id, valuePath) : undefined}
        onFocus={dataSource.activate}
      />
      <DataSourceStatus
        label={node.label ?? node.id}
        messages={props.messages}
        state={dataSource}
      />
      {!matrixField &&
        !nestedErrorField &&
        errors.map((error, index) => (
          <div
            className="a3s-form-error"
            id={`${inputId}-error-${index + 1}`}
            role="alert"
            key={`${error.code}-${error.message}`}
          >
            {error.message}
          </div>
        ))}
      {validating && <ValidationStatus label={node.label ?? node.id} messages={props.messages} />}
    </div>
  );
}

const SubscribedNodeView = memo(NodeViewContent, subscribedNodePropsEqual);

function handleLayoutTabKey(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  tabs: readonly { id: string }[],
  currentId: string,
  onChange: (id: string) => void,
) {
  const current = tabs.findIndex((tab) => tab.id === currentId);
  if (current < 0) return;
  let nextIndex: number | undefined;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = tabs.length - 1;
  if (event.key === 'ArrowRight') nextIndex = (current + 1) % tabs.length;
  if (event.key === 'ArrowLeft') nextIndex = (current - 1 + tabs.length) % tabs.length;
  if (nextIndex === undefined) return;
  event.preventDefault();
  onChange(tabs[nextIndex].id);
  const buttons =
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  buttons?.[nextIndex]?.focus();
}

export function FormRenderer(props: FormRendererProps) {
  const generatedId = useId().replaceAll(':', '');
  const prefix = `a3sf-${generatedId}`;
  const formRef = useRef<HTMLFormElement>(null);
  const actionController = useRef<AbortController | null>(null);
  const formValidationController = useRef<AbortController | null>(null);
  const fieldValidationControllers = useRef(new Map<string, AbortController>());
  const dataSourceCoordinator = useMemo(
    () => new DataSourceCoordinator(),
    [props.hostAdapter?.resolveDataSource],
  );
  const validationBoundary = useRef({
    hostAdapter: props.hostAdapter,
    plan: props.plan,
    value: props.value,
  });
  const [submittedErrors, setSubmittedErrors] = useState<FieldError[]>([]);
  const [fieldAsyncErrors, setFieldAsyncErrors] = useState<Record<string, FieldError[]>>({});
  const [formAsyncErrors, setFormAsyncErrors] = useState<FieldError[]>([]);
  const [validatingPaths, setValidatingPaths] = useState<ReadonlySet<string>>(() => new Set());
  const [validatingForm, setValidatingForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<string>();
  const [actionError, setActionError] = useState('');
  const locale = props.locale ?? props.plan.metadata.locale ?? 'zh-CN';
  const localeCatalog = useMemo(
    () => resolveFormLocaleCatalog(locale, props.localeCatalog),
    [locale, props.localeCatalog],
  );
  const messages = localeCatalog.messages;
  const computedRuleEvaluator = useMemo(() => new IncrementalComputedRuleEvaluator(), []);
  const computed = useMemo(
    () => computedRuleEvaluator.evaluate(props.plan, props.value),
    [computedRuleEvaluator, props.plan, props.value],
  );
  const runtimeValue = computed.value;
  const runtimeValueRef = useRef(runtimeValue);
  runtimeValueRef.current = runtimeValue;
  const getValue = useCallback(() => runtimeValueRef.current, []);
  const wizardController = useFormWizardController({
    plan: props.plan,
    value: runtimeValue,
    checkpoints: props.wizardCheckpoints,
    onCheckpointChange: props.onWizardCheckpointChange,
  });

  const abortFieldValidations = useCallback(() => {
    for (const controller of fieldValidationControllers.current.values()) controller.abort();
    fieldValidationControllers.current.clear();
  }, []);

  const clearFieldValidations = useCallback(() => {
    abortFieldValidations();
    setValidatingPaths(new Set());
    setFieldAsyncErrors({});
  }, [abortFieldValidations]);

  const focusError = useFormErrorFocus({
    formRef,
    plan: props.plan,
    prefix,
    revealValuePath: wizardController.revealValuePath,
  });

  const isWizardNavigationBlocked = useCallback(
    () => Boolean(pendingAction || formValidationController.current),
    [pendingAction],
  );
  const {
    pageErrors: wizardPageErrors,
    validatingPageId: validatingWizardPageId,
    isActive: isWizardPageValidationActive,
    reset: resetWizardPageValidation,
    goTo: goToWizardPage,
    goPrevious: goToPreviousWizardPage,
    validateAndAdvance: validateWizardPage,
  } = useWizardPageValidation({
    plan: props.plan,
    getValue,
    locale,
    localeCatalog: props.localeCatalog,
    hostAdapter: props.hostAdapter,
    readOnly: props.readOnly,
    wizardController,
    isBlocked: isWizardNavigationBlocked,
    clearFieldValidations,
    focusError,
  });

  const asyncErrors = useMemo(
    () => [
      ...Object.keys(fieldAsyncErrors)
        .sort()
        .flatMap((path) => fieldAsyncErrors[path]),
      ...formAsyncErrors,
    ],
    [fieldAsyncErrors, formAsyncErrors],
  );
  const errors = useMemo(() => {
    const hostErrors = props.errors ?? submittedErrors;
    const unique = new Map<string, FieldError>();
    for (const error of [...computed.errors, ...hostErrors, ...asyncErrors, ...wizardPageErrors]) {
      unique.set(`${error.path}\u0000${error.code}\u0000${error.message}`, error);
    }
    return [...unique.values()];
  }, [asyncErrors, computed.errors, props.errors, submittedErrors, wizardPageErrors]);
  const errorMap = useMemo(() => {
    const map = new Map<string, FieldError[]>();
    for (const error of errors) map.set(error.path, [...(map.get(error.path) ?? []), error]);
    return map;
  }, [errors]);
  const defaultAction =
    props.plan.actions.find((item) => item.tone === 'primary') ?? props.plan.actions[0];

  const cancelAsyncValidations = useCallback(() => {
    clearFieldValidations();
    formValidationController.current?.abort();
    formValidationController.current = null;
    resetWizardPageValidation();
    setValidatingForm(false);
    setFormAsyncErrors([]);
  }, [clearFieldValidations, resetWizardPageValidation]);

  useEffect(() => {
    const previous = validationBoundary.current;
    if (
      previous.hostAdapter === props.hostAdapter &&
      previous.plan === props.plan &&
      previous.value === props.value
    ) {
      return;
    }
    validationBoundary.current = {
      hostAdapter: props.hostAdapter,
      plan: props.plan,
      value: props.value,
    };
    cancelAsyncValidations();
    if (props.errors === undefined && submittedErrors.length > 0) {
      const evaluation = evaluateFormValue(props.plan, props.value, {
        locale,
        localeCatalog: props.localeCatalog,
      });
      setSubmittedErrors(evaluation.errors);
    }
  });

  useEffect(
    () => () => {
      actionController.current?.abort();
      formValidationController.current?.abort();
      abortFieldValidations();
    },
    [abortFieldValidations],
  );

  useEffect(() => () => dataSourceCoordinator.clear(), [dataSourceCoordinator]);

  const changeValueImplementation = useRef<(next: JsonObject) => void>(() => undefined);
  const changeValue = useCallback(
    (next: JsonObject) => changeValueImplementation.current(next),
    [],
  );
  changeValueImplementation.current = (next: JsonObject) => {
    cancelAsyncValidations();
    const evaluation = evaluateFormValue(props.plan, next, {
      locale,
      localeCatalog: props.localeCatalog,
    });
    runtimeValueRef.current = evaluation.value;
    props.onChange(evaluation.value);
    if (props.errors === undefined && submittedErrors.length > 0) {
      setSubmittedErrors(evaluation.errors);
    }
  };

  const validateField = async (nodeId: string, path: string) => {
    const validator = props.hostAdapter?.validateValue;
    if (
      !validator ||
      props.readOnly ||
      formValidationController.current ||
      isWizardPageValidationActive() ||
      pendingAction
    )
      return;

    fieldValidationControllers.current.get(path)?.abort();
    const controller = new AbortController();
    fieldValidationControllers.current.set(path, controller);
    setFieldAsyncErrors((current) => {
      if (!(path in current)) return current;
      const next = { ...current };
      delete next[path];
      return next;
    });
    setValidatingPaths((current) => new Set(current).add(path));

    const result = await validateFormValueAsync(
      props.plan,
      runtimeValue,
      validator,
      {
        scope: { kind: 'field', nodeId, path },
        trigger: 'blur',
        locale: props.locale ?? props.plan.metadata.locale,
        localeCatalog: props.localeCatalog,
      },
      controller.signal,
    );
    if (controller.signal.aborted || fieldValidationControllers.current.get(path) !== controller) {
      return;
    }
    fieldValidationControllers.current.delete(path);
    setValidatingPaths((current) => {
      if (!current.has(path)) return current;
      const next = new Set(current);
      next.delete(path);
      return next;
    });
    setFieldAsyncErrors((current) => {
      if (result.asyncErrors.length === 0) {
        if (!(path in current)) return current;
        const next = { ...current };
        delete next[path];
        return next;
      }
      return { ...current, [path]: result.asyncErrors };
    });
  };
  const validateFieldImplementation = useRef(validateField);
  validateFieldImplementation.current = validateField;
  const onFieldBlur = useCallback(
    (nodeId: string, path: string) => void validateFieldImplementation.current(nodeId, path),
    [],
  );

  const invoke = async (actionId: string, requiresValidation: boolean) => {
    if (pendingAction || formValidationController.current || isWizardPageValidationActive()) return;
    const definition = props.plan.actions.find((item) => item.id === actionId);
    if (!definition) return;
    setActionError('');
    let evaluation = evaluateFormValue(props.plan, getValue(), {
      locale,
      localeCatalog: props.localeCatalog,
    });
    if (requiresValidation) {
      const nextErrors = evaluation.errors;
      setSubmittedErrors(nextErrors);
      if (nextErrors.length > 0) {
        focusError(nextErrors[0].path);
        return;
      }
      if (props.hostAdapter?.validateValue) {
        clearFieldValidations();
        setFormAsyncErrors([]);
        const controller = new AbortController();
        formValidationController.current = controller;
        setValidatingForm(true);
        const asyncEvaluation = await validateFormValueAsync(
          props.plan,
          evaluation.value,
          props.hostAdapter.validateValue,
          {
            scope: { kind: 'form' },
            trigger: 'submit',
            locale: props.locale ?? props.plan.metadata.locale,
            localeCatalog: props.localeCatalog,
          },
          controller.signal,
        );
        if (controller.signal.aborted || formValidationController.current !== controller) {
          return;
        }
        formValidationController.current = null;
        setValidatingForm(false);
        setFormAsyncErrors(asyncEvaluation.asyncErrors);
        if (asyncEvaluation.status !== 'valid') {
          const firstError = asyncEvaluation.errors[0];
          if (firstError) focusError(firstError.path);
          return;
        }
        evaluation = asyncEvaluation;
      }
    }
    setPendingAction(actionId);
    const controller = new AbortController();
    actionController.current = controller;
    try {
      if (props.onAction) await props.onAction(actionId, evaluation.value);
      else if (props.hostAdapter?.invokeAction) {
        await props.hostAdapter.invokeAction(
          { definition, value: evaluation.value, plan: props.plan },
          controller.signal,
        );
      }
    } catch {
      if (!controller.signal.aborted) setActionError(messages.actionFailed);
    } finally {
      if (!controller.signal.aborted) setPendingAction(undefined);
      if (actionController.current === controller) actionController.current = null;
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const wizardId = wizardController.firstIncompleteWizardId;
    if (wizardId) {
      const state = wizardController.states[wizardId];
      const pageId = state?.activePage?.id;
      const nextPageId = state?.pages[state.activeIndex + 1]?.id;
      if (pageId && nextPageId) {
        void validateWizardPage(wizardId, pageId, nextPageId);
        return;
      }
    }
    if (defaultAction) {
      void invoke(
        defaultAction.id,
        defaultAction.tone === 'primary' || defaultAction.tone === undefined,
      );
    }
  };

  return (
    <form
      ref={formRef}
      className={`a3s-form-renderer ${props.className ?? ''}`}
      onSubmit={submit}
      noValidate
      aria-busy={Boolean(pendingAction || validatingForm || validatingWizardPageId)}
      lang={locale}
    >
      <NodeView
        {...props}
        value={runtimeValue}
        onChange={changeValue}
        dataSourceCoordinator={dataSourceCoordinator}
        getValue={getValue}
        messages={messages}
        nodeId={props.plan.root}
        errorMap={errorMap}
        prefix={prefix}
        onFieldBlur={onFieldBlur}
        validatingPaths={validatingPaths}
        wizardController={wizardController}
        wizardPageErrors={wizardPageErrors}
        validatingWizardPageId={validatingWizardPageId}
        onWizardNext={(wizardId, pageId, nextPageId) => {
          void validateWizardPage(wizardId, pageId, nextPageId);
        }}
        onWizardGoTo={goToWizardPage}
        onWizardPrevious={goToPreviousWizardPage}
      />
      {errors.length > 0 && (
        <section
          className="a3s-form-error-summary"
          role="alert"
          aria-label={messages.errorSummaryLabel}
        >
          <strong>
            {formatFormMessage(messages, 'errorSummaryTitle', {
              count: errors.length,
              fieldLabel: errors.length === 1 ? 'field' : 'fields',
            })}
          </strong>
          <ul>
            {errors.map((error) => {
              const node = nodeForValuePath(props.plan, error.path);
              return (
                <li key={`${error.path}-${error.code}-${error.message}`}>
                  {node ? (
                    <button
                      type="button"
                      className="btn"
                      data-size="xs"
                      data-variant="link"
                      onClick={() => focusError(error.path)}
                    >
                      {node.label ?? node.id}
                      {messages.errorSummarySeparator}
                      {error.message}
                    </button>
                  ) : (
                    error.message
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {actionError && (
        <div className="a3s-form-action-error" role="alert">
          {actionError}
        </div>
      )}
      {props.plan.actions.length > 0 && wizardController.allAtEnd && (
        <footer className="a3s-form-actions">
          {props.plan.actions.map((action) => {
            const primary =
              action.tone === 'primary' ||
              (action.tone === undefined && action.id === defaultAction?.id);
            const danger = action.tone === 'danger';
            const variant = danger ? 'destructive' : primary ? 'primary' : 'secondary';
            return (
              <button
                key={action.id}
                type={primary ? 'submit' : 'button'}
                className={`btn ${danger ? 'a3s-form-danger' : primary ? 'a3s-form-primary' : 'a3s-form-secondary'}`}
                data-variant={variant}
                onClick={(event) => {
                  if (primary) event.preventDefault();
                  void invoke(action.id, primary);
                }}
                disabled={Boolean(
                  props.readOnly || pendingAction || validatingForm || validatingWizardPageId,
                )}
              >
                {pendingAction === action.id
                  ? messages.actionButtonPending
                  : validatingForm && primary
                    ? messages.formValidationButtonPending
                    : action.label}
              </button>
            );
          })}
        </footer>
      )}
      {pendingAction && (
        <span className="a3s-form-action-progress" role="status" aria-live="polite">
          {messages.actionPending}
        </span>
      )}
      {validatingForm && (
        <span
          className="a3s-form-action-progress"
          role="status"
          aria-label={messages.formValidationPendingLabel}
          aria-live="polite"
        >
          {messages.formValidationPending}
        </span>
      )}
    </form>
  );
}
