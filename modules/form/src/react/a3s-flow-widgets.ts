import { WORKFLOW_CONFIGURATION_WIDGETS } from '../integrations/workflow-node-form';
import { A3SFlowBatchWidget } from './a3s-flow-batch-widget';
import { A3SFlowExpressionWidget } from './a3s-flow-expression-widget';
import { A3SFlowSchemaWidget } from './a3s-flow-schema-widget';
import type { FormWidgetRegistry } from './native-widget';

export const a3sFlowWidgetRegistry: FormWidgetRegistry = {
  [WORKFLOW_CONFIGURATION_WIDGETS.flowBatch]: A3SFlowBatchWidget,
  [WORKFLOW_CONFIGURATION_WIDGETS.flowExpression]: A3SFlowExpressionWidget,
  [WORKFLOW_CONFIGURATION_WIDGETS.flowSchema]: A3SFlowSchemaWidget,
};
