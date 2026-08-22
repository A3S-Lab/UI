import { useLang } from '@rspress/core/runtime';
import { useMemo, useState } from 'react';
import type { A3S_FLOW_CORE_NODE_TYPES } from '../../../../modules/form/src/a3s-flow';
import {
  createA3SFlowExpression,
  createA3SFlowNodeDefaultValue,
  localizeA3SFlowCoreNode,
  requireA3SFlowCoreNode,
} from '../../../../modules/form/src/a3s-flow';
import type { JsonObject } from '../../../../modules/form/src/core';
import { A3SFlowNodeConfigurationPanel, A3SFlowNodePreview } from '../../../../modules/form/src/react';
import '../../../../modules/form/src/styles.css';
import '../../../../modules/form/src/a3s-flow.css';

export type DocumentedA3SFlowNodeType = (typeof A3S_FLOW_CORE_NODE_TYPES)[number];

interface A3SFlowNodeDemoProps {
  nodeType: DocumentedA3SFlowNodeType;
}

function createExampleValue(nodeType: DocumentedA3SFlowNodeType): JsonObject {
  const defaults = createA3SFlowNodeDefaultValue(requireA3SFlowCoreNode(nodeType));

  switch (nodeType) {
    case 'flow.start':
      return {
        ...defaults,
        workflow_name: 'records.review',
        entrypoint: 'workflows/records-review.ts',
        input_schema: {
          type: 'object',
          properties: {
            requestId: { type: 'string' },
            recordId: { type: 'string' },
          },
          required: ['requestId', 'recordId'],
          additionalProperties: false,
        },
        run_id_expression: createA3SFlowExpression({ op: 'field', path: 'input.requestId' }),
      };
    case 'flow.step':
      return {
        ...defaults,
        step_name: 'records.sync',
        input: createA3SFlowExpression({ op: 'field', path: 'input.record' }),
        max_attempts: 4,
        retry_delay_ms: 1_500,
        on_exhausted: 'continue_workflow',
      };
    case 'flow.batch':
      return {
        steps: [
          {
            step_key: 'load-record',
            step_name: 'records.load',
            input_mapping: createA3SFlowExpression({ op: 'field', path: 'input.recordId' }),
            max_attempts: 3,
            retry_delay_ms: 500,
            on_exhausted: 'fail_run',
          },
          {
            step_key: 'write-audit',
            step_name: 'audit.write',
            input_mapping: createA3SFlowExpression({ op: 'field', path: 'input.requestId' }),
            max_attempts: 2,
            retry_delay_ms: 1_000,
            on_exhausted: 'continue_workflow',
          },
        ],
      };
    case 'flow.condition':
      return {
        ...defaults,
        input: { approved: true },
        matched_label: 'Approved',
        otherwise_label: 'Needs review',
      };
    case 'flow.wait':
      return {
        resume_at: createA3SFlowExpression({ op: 'field', path: 'input.resumeAt' }),
      };
    case 'flow.hook':
      return {
        ...defaults,
        subject: 'Review record change',
        metadata: {
          labels: { queue: 'record-review' },
          data: { source: 'workflow' },
        },
      };
    case 'flow.complete':
      return {
        output_expression: createA3SFlowExpression({ op: 'field', path: 'input.result' }),
      };
    case 'flow.fail':
      return defaults;
  }
}

export function A3SFlowNodeDemo({ nodeType }: A3SFlowNodeDemoProps) {
  const isEnglish = useLang() === 'en';
  const locale = isEnglish ? 'en-US' : 'zh-CN';
  const node = requireA3SFlowCoreNode(nodeType);
  const localizedNode = useMemo(() => localizeA3SFlowCoreNode(node, locale), [locale, node]);
  const [value, setValue] = useState<JsonObject>(() => createExampleValue(nodeType));
  const [status, setStatus] = useState(
    isEnglish
      ? 'Changes update the preview and JSON below.'
      : '修改配置后，节点预览和下方 JSON 会同步更新。',
  );

  return (
    <section
      className="a3s-doc-workflow-demo a3s-doc-flow-node-demo"
      data-a3s-flow-node={node.type}
      aria-label={`${localizedNode.display_name}${isEnglish ? ' live configuration' : '配置示例'}`}
    >
      <header className="a3s-doc-workflow-demo-header">
        <div>
          <strong>{localizedNode.display_name}</strong>
          <span>
            {localizedNode.categoryLabel} · {localizedNode.description}
          </span>
        </div>
      </header>

      <p
        className="a3s-doc-workflow-demo-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {status}
      </p>

      <div className="a3s-doc-workflow-demo-panel a3s-doc-flow-demo-panel">
        <A3SFlowNodePreview node={node} value={value} locale={locale} />
        <A3SFlowNodeConfigurationPanel
          node={node}
          value={value}
          onChange={setValue}
          locale={locale}
          onApply={() =>
            setStatus(
              isEnglish
                ? `${localizedNode.display_name} configuration applied.`
                : `已应用「${localizedNode.display_name}」配置。`,
            )
          }
          onReset={() =>
            setStatus(
              isEnglish
                ? `${localizedNode.display_name} reset to defaults.`
                : `已恢复「${localizedNode.display_name}」默认配置。`,
            )
          }
          onRequestConnection={() =>
            setStatus(
              isEnglish
                ? 'The host must provide a connection picker for this input.'
                : '这个输入需要由宿主提供连接选择器。',
            )
          }
        />
      </div>

      <details className="a3s-doc-flow-node-demo__value">
        <summary>{isEnglish ? 'Current configuration (JSON)' : '当前配置（JSON）'}</summary>
        <pre>
          <code>{JSON.stringify(value, null, 2)}</code>
        </pre>
      </details>
    </section>
  );
}
