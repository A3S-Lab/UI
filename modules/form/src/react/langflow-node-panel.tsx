import { useCallback, useMemo, useState } from 'react';
import { compileForm, type FormDocument, type FormHostAdapter, type JsonObject } from '../core';
import {
  type CreateLangflowNodeFormOptions,
  createLangflowNodeDefaultValue,
  createLangflowNodeForm,
  type LangflowFieldDefinition,
  type LangflowNodeDefinition,
  WORKFLOW_CONFIGURATION_WIDGET_KEYS,
} from '../integrations/langflow';
import { DesignerIcon, type DesignerIconName } from './designer-icons';
import type { FormWidgetRegistry } from './native-widget';
import type { FormNodeRegistry } from './node-registry';
import { type FormNodeAccessoryContext, FormRenderer } from './renderer';
import {
  createWorkflowConfigurationWidgetRegistry,
  type WorkflowConfigurationWidgetCallbacks,
  WorkflowFieldAccessory,
} from './workflow-configuration-widgets';

export interface LangflowNodeConfigurationPanelProps {
  node: LangflowNodeDefinition;
  value: JsonObject;
  onChange: (value: JsonObject) => void;
  onApply?: (value: JsonObject, document: FormDocument) => void | Promise<void>;
  onReset?: (value: JsonObject) => void;
  onRequestConnection?: WorkflowConfigurationWidgetCallbacks['onRequestConnection'];
  onRefreshField?: WorkflowConfigurationWidgetCallbacks['onRefreshField'];
  onCopyField?: WorkflowConfigurationWidgetCallbacks['onCopyField'];
  onDataDisplayAction?: WorkflowConfigurationWidgetCallbacks['onDataDisplayAction'];
  buildConfig?: Readonly<Record<string, LangflowFieldDefinition>>;
  fieldVisibility?: Readonly<Record<string, boolean>>;
  compatibility?: readonly string[];
  hostAdapter?: FormHostAdapter;
  nodeRegistry?: FormNodeRegistry;
  widgetRegistry?: FormWidgetRegistry;
  locale?: string;
  readOnly?: boolean;
  className?: string;
  presentation?: 'catalog' | 'task';
}

function panelCopy(locale: string | undefined) {
  const chinese = locale?.toLocaleLowerCase().startsWith('zh') === true;
  return chinese
    ? {
        reset: '恢复默认值',
        confirmReset: '再次点击确认恢复',
        reference: '查看文档',
        accepts: '输入',
        returns: '输出',
        shown: '个配置项',
        advanced: '个高级项',
        conditional: '个按条件显示',
        developerDetails: '开发信息',
        nodeType: '节点类型',
        runtimeBinding: '运行绑定',
        compileTitle: '无法生成这个节点的配置界面。',
        compileHelp: '请检查节点定义或联系接入系统维护者。',
      }
    : {
        reset: 'Reset',
        confirmReset: 'Click again to reset',
        reference: 'Reference',
        accepts: 'Accepts',
        returns: 'Returns',
        shown: 'shown',
        advanced: 'advanced',
        conditional: 'conditional',
        developerDetails: 'Developer details',
        nodeType: 'Node type',
        runtimeBinding: 'Runtime binding',
        compileTitle: 'This node configuration could not be compiled.',
        compileHelp: 'Check the node definition or contact the host maintainer.',
      };
}

function uniqueTypes(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function panelInputTypes(node: LangflowNodeDefinition): string[] {
  return uniqueTypes([
    ...node.input_types,
    ...node.fields.flatMap((field) => field.input_types ?? []),
  ]);
}

function panelOutputTypes(node: LangflowNodeDefinition): string[] {
  return uniqueTypes([...node.output_types, ...node.outputs.flatMap((output) => output.types)]);
}

function panelNodeIcon(node: LangflowNodeDefinition): DesignerIconName {
  const category = node.category.toLocaleLowerCase('en');
  if (category.includes('agent') || category.includes('model') || category.includes('llm')) {
    return 'sparkles';
  }
  if (category.includes('file') || category.includes('knowledge')) return 'file';
  if (category.includes('data') || category.includes('cassandra')) return 'grid';
  if (category.includes('flow') || category.includes('input')) return 'layout';
  if (category.includes('tool') || category.includes('utilit')) return 'calculator';
  if (category.includes('embedding') || category.includes('search')) return 'search';
  if (category.includes('processing')) return 'settings';
  return 'components';
}

export function LangflowNodeConfigurationPanel(props: LangflowNodeConfigurationPanelProps) {
  const copy = panelCopy(props.locale);
  const taskPresentation = props.presentation === 'task';
  const [resetPending, setResetPending] = useState(false);
  const formOptions = useMemo<CreateLangflowNodeFormOptions>(
    () => ({
      locale: props.locale,
      presentation: props.presentation,
      buildConfig: props.buildConfig,
      fieldVisibility: props.fieldVisibility,
      compatibility: props.compatibility,
    }),
    [
      props.buildConfig,
      props.compatibility,
      props.fieldVisibility,
      props.locale,
      props.presentation,
    ],
  );
  const document = useMemo(
    () => createLangflowNodeForm(props.node, formOptions),
    [formOptions, props.node],
  );
  const compilation = useMemo(
    () =>
      compileForm(document, {
        capabilities: {
          widgets: [
            ...new Set([
              ...WORKFLOW_CONFIGURATION_WIDGET_KEYS,
              ...Object.keys(props.widgetRegistry ?? {}),
            ]),
          ],
        },
      }),
    [document, props.widgetRegistry],
  );
  const workflowCallbacks = useMemo<WorkflowConfigurationWidgetCallbacks>(
    () => ({
      onRequestConnection: props.onRequestConnection,
      onRefreshField: props.onRefreshField,
      onCopyField: props.onCopyField,
      onDataDisplayAction: props.onDataDisplayAction,
    }),
    [props.onCopyField, props.onDataDisplayAction, props.onRefreshField, props.onRequestConnection],
  );
  const builtInWidgets = useMemo(
    () => createWorkflowConfigurationWidgetRegistry(workflowCallbacks),
    [workflowCallbacks],
  );
  const widgets = useMemo(
    () => ({ ...builtInWidgets, ...props.widgetRegistry }),
    [builtInWidgets, props.widgetRegistry],
  );
  const defaults = useMemo(
    () => createLangflowNodeDefaultValue(props.node, formOptions),
    [formOptions, props.node],
  );
  const inputTypes = panelInputTypes(props.node);
  const outputTypes = panelOutputTypes(props.node);
  const activeFields = props.buildConfig ? Object.values(props.buildConfig) : props.node.fields;
  const isVisible = (field: LangflowFieldDefinition) =>
    props.fieldVisibility?.[field.name] ?? field.show !== false;
  const visibleCount = activeFields.filter(isVisible).length;
  const advancedCount = activeFields.filter((field) => field.advanced && isVisible(field)).length;
  const conditionalCount = activeFields.length - visibleCount;
  const runtimeBinding =
    'runtimeBinding' in props.node && typeof props.node.runtimeBinding === 'string'
      ? props.node.runtimeBinding
      : undefined;
  const renderNodeAccessory = useCallback(
    ({ node, valuePath, value, disabled }: FormNodeAccessoryContext) => (
      <WorkflowFieldAccessory
        node={node}
        valuePath={valuePath}
        value={value}
        disabled={disabled}
        callbacks={workflowCallbacks}
      />
    ),
    [workflowCallbacks],
  );

  if (!compilation.ok || !compilation.plan || !compilation.document) {
    return (
      <section className="a3s-form-workflow-node-panel" role="alert">
        <strong>{copy.compileTitle}</strong>
        <p>
          {taskPresentation
            ? copy.compileHelp
            : (compilation.diagnostics[0]?.message ?? copy.compileHelp)}
        </p>
      </section>
    );
  }

  const compiledDocument = compilation.document;
  return (
    <section
      className={['a3s-form-workflow-node-panel', props.className].filter(Boolean).join(' ')}
      data-node-type={props.node.type}
      data-read-only={props.readOnly || undefined}
    >
      <header className="a3s-form-workflow-node-panel-header">
        <div className="a3s-form-workflow-node-identity">
          <span
            className="a3s-form-workflow-node-icon"
            data-source-icon={props.node.icon || undefined}
            title={props.node.icon || props.node.categoryLabel}
          >
            <DesignerIcon name={panelNodeIcon(props.node)} size={18} />
          </span>
          <span>
            <span className="a3s-form-workflow-node-title-line">
              <h2>{props.node.display_name}</h2>
              {props.node.beta && (
                <span className="badge" data-variant="secondary">
                  Beta
                </span>
              )}
              {props.node.legacy && (
                <span className="badge" data-variant="outline">
                  Legacy
                </span>
              )}
            </span>
            <p>{props.node.description}</p>
          </span>
        </div>
        <div className="a3s-form-workflow-node-header-actions">
          <button
            type="button"
            className="btn"
            data-size="sm"
            data-variant="ghost"
            disabled={props.readOnly}
            onBlur={() => setResetPending(false)}
            onClick={() => {
              if (taskPresentation && !resetPending) {
                setResetPending(true);
                return;
              }
              const next = structuredClone(defaults);
              props.onChange(next);
              props.onReset?.(next);
              setResetPending(false);
            }}
          >
            <DesignerIcon name="undo" size={14} />
            {resetPending ? copy.confirmReset : copy.reset}
          </button>
          {props.node.documentation && (
            <a
              className="btn"
              data-size="sm"
              data-variant="ghost"
              href={props.node.documentation}
              target="_blank"
              rel="noreferrer"
            >
              <DesignerIcon name="link" size={14} />
              {copy.reference}
            </a>
          )}
        </div>
      </header>

      {!taskPresentation && (
        <div className="a3s-form-workflow-node-contract">
          <span className="badge" data-variant="outline">
            {props.node.categoryLabel}
          </span>
          {runtimeBinding && <code>{runtimeBinding}</code>}
          <span>
            {visibleCount} {copy.shown}
          </span>
          {advancedCount > 0 && (
            <span>
              {advancedCount} {copy.advanced}
            </span>
          )}
          {conditionalCount > 0 && (
            <span>
              {conditionalCount} {copy.conditional}
            </span>
          )}
        </div>
      )}

      {!taskPresentation && (inputTypes.length > 0 || outputTypes.length > 0) && (
        <div className="a3s-form-workflow-node-ports">
          <div>
            <span>{copy.accepts}</span>
            <div className="item-group">
              {(inputTypes.length > 0 ? inputTypes : ['No typed inputs']).map((type) => (
                <code className="badge" data-variant="outline" key={type}>
                  {type}
                </code>
              ))}
            </div>
          </div>
          <div>
            <span>{copy.returns}</span>
            <div className="item-group">
              {(outputTypes.length > 0 ? outputTypes : ['No typed outputs']).map((type) => (
                <code className="badge" data-variant="secondary" key={type}>
                  {type}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="a3s-form-workflow-node-form">
        <FormRenderer
          plan={compilation.plan}
          value={props.value}
          onChange={props.onChange}
          onAction={async (actionId, value) => {
            if (actionId === 'apply') await props.onApply?.(value, compiledDocument);
          }}
          hostAdapter={props.hostAdapter}
          locale={props.locale}
          readOnly={props.readOnly}
          nodeRegistry={props.nodeRegistry}
          renderNodeAccessory={renderNodeAccessory}
          widgetRegistry={widgets}
        />
      </div>

      {taskPresentation && (
        <details className="a3s-form-workflow-node-developer-details">
          <summary>{copy.developerDetails}</summary>
          <dl>
            <div>
              <dt>{copy.nodeType}</dt>
              <dd>
                <code>{props.node.type}</code>
              </dd>
            </div>
            {runtimeBinding && (
              <div>
                <dt>{copy.runtimeBinding}</dt>
                <dd>
                  <code>{runtimeBinding}</code>
                </dd>
              </div>
            )}
          </dl>
        </details>
      )}
    </section>
  );
}
