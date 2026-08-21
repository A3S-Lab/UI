import type { FormHostAdapter } from '../core';
import type { A3SFlowCoreNodeDefinition } from '../integrations/a3s-flow-core';
import {
  isA3SFlowChineseLocale,
  localizeA3SFlowCoreNode,
} from '../integrations/a3s-flow-localization';
import type { A3SFlowDagNodeManifest } from '../integrations/a3s-flow-node-manifest';
import { validateA3SFlowNodeConfiguration } from '../integrations/a3s-flow-validation';

const CHINESE_VALIDATION_MESSAGES: Readonly<Record<string, string>> = {
  'flow.expression.invalid_contract': '需要有效的工作流取值规则。',
  'flow.expression.invalid_api_version': '取值规则版本不受支持。',
  'flow.expression.unexpected_property': '取值规则包含不支持的字段。',
  'flow.expression.invalid_expression': '取值规则无效，请检查字段路径和运算方式。',
  'flow.retry.invalid_max_attempts': '最多尝试次数必须是 1 到 100 之间的整数。',
  'flow.retry.invalid_delay': '重试间隔必须是 0 到 86400000 之间的整数毫秒。',
  'flow.retry.invalid_on_exhausted': '请选择全部尝试失败后的处理方式。',
  'flow.port.unknown': '配置包含当前节点不存在的输出连接。',
  'flow.port.unavailable': '当前失败处理方式不支持已连接的失败分支。',
  'flow.start.non_unique_run_id': '运行 ID 必须来自至少一个工作流字段。',
  'flow.batch.empty': '至少添加一个批次步骤。',
  'flow.batch.invalid_member': '批次步骤配置无效。',
  'flow.batch.invalid_step_key': '成员标识不能为空。',
  'flow.batch.duplicate_step_key': '成员标识不能重复。',
  'flow.batch.invalid_step_name': '步骤处理器不能为空。',
  'flow.wait.invalid_resume_at': '固定恢复时间必须是以 Z 结尾的有效 UTC 时间。',
  'flow.wait.non_deterministic_resume_at': '恢复时间必须来自至少一个工作流字段。',
  'flow.hook.literal_token': '回调令牌必须来自工作流字段，不能使用共享固定值。',
};

export interface A3SFlowPanelHostAdapterOptions {
  connectedOutputPortIds?: readonly string[];
  definition?: A3SFlowCoreNodeDefinition;
  hostAdapter?: FormHostAdapter;
  locale?: string;
}

export function createA3SFlowPanelHostAdapter({
  connectedOutputPortIds,
  definition,
  hostAdapter,
  locale,
}: A3SFlowPanelHostAdapterOptions): FormHostAdapter {
  return {
    ...hostAdapter,
    validateValue: async (request, signal) => {
      if (definition && request.scope.kind === 'form') {
        const semantic = validateA3SFlowNodeConfiguration(definition, request.value, {
          connectedOutputPortIds,
        });
        if (!semantic.ok) {
          return {
            issues: semantic.errors.map((error) => ({
              path: error.path,
              code: error.code,
              message: isA3SFlowChineseLocale(locale)
                ? (CHINESE_VALIDATION_MESSAGES[error.code] ?? error.message)
                : error.message,
            })),
          };
        }
      }
      return hostAdapter?.validateValue
        ? hostAdapter.validateValue(request, signal)
        : { issues: [] };
    },
  };
}

export function localizeA3SFlowDagNodeManifest(
  manifest: A3SFlowDagNodeManifest,
  definition: A3SFlowCoreNodeDefinition | undefined,
  locale?: string,
): A3SFlowDagNodeManifest {
  if (!definition) return manifest;
  const localized = localizeA3SFlowCoreNode(definition, locale);
  if (localized === definition) return manifest;
  return {
    ...manifest,
    display_name: localized.display_name,
    description: localized.description,
    categoryLabel: localized.categoryLabel,
    fields: localized.fields,
    outputs: localized.outputs,
    ports: localized.ports,
  };
}
