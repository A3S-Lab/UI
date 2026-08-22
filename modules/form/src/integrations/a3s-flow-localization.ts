import type { A3SFlowCoreNodeDefinition } from './a3s-flow-core';
import type { A3SFlowDagNodeManifest } from './a3s-flow-node-manifest';
import type { WorkflowNodeFieldDefinition, WorkflowNodeTableColumn } from './workflow-node-form';

interface LocalizedFieldCopy {
  label: string;
  help: string;
  group: string;
  placeholder?: string;
  options?: Readonly<Record<string, string>>;
  columns?: Readonly<Record<string, { label: string; help: string }>>;
}

interface LocalizedNodeCopy {
  title: string;
  description: string;
  category: string;
  fields: Readonly<Record<string, LocalizedFieldCopy>>;
  ports: Readonly<Record<string, string>>;
}

const CHINESE_NODE_COPY: Readonly<Record<string, LocalizedNodeCopy>> = {
  'flow.start': {
    title: '工作流开始',
    description: '设置工作流标识、输入规则和执行入口。',
    category: '流程控制',
    fields: {
      workflow_name: {
        label: '工作流标识',
        help: '用于识别这类工作流。已有运行记录后不要修改。',
        group: '基本信息',
        placeholder: 'invoice.approve',
      },
      workflow_version: {
        label: '工作流版本',
        help: '逻辑发生不兼容变化时使用新版本；已有运行继续使用原版本。',
        group: '基本信息',
        placeholder: '0.1.0',
      },
      runtime_kind: {
        label: '执行运行时',
        help: '选择负责运行工作流逻辑的运行时。',
        group: '执行入口',
      },
      entrypoint: {
        label: '运行入口',
        help: 'TypeScript 文件路径或嵌入式运行时键。',
        group: '执行入口',
        placeholder: 'workflows/main.ts',
      },
      export_name: {
        label: '工作流函数',
        help: '运行入口导出的工作流函数名。',
        group: '执行入口',
        placeholder: 'main',
      },
      input_schema: {
        label: '输入数据规则',
        help: '定义启动工作流时可以接收哪些字段。',
        group: '输入数据',
      },
      run_id_expression: {
        label: '运行 ID（可选）',
        help: '从稳定输入生成运行 ID，用于避免重复启动；留空时由接入系统创建。',
        group: '避免重复启动',
      },
    },
    ports: { next: '继续', input: '工作流输入' },
  },
  'flow.condition': {
    title: '条件分支',
    description: '按工作流数据判断条件，并选择下一条路径。',
    category: '流程控制',
    fields: {
      input: {
        label: '待判断数据',
        help: '要用于判断的当前值，也可以从上游节点连接。',
        group: '判断条件',
      },
      expression: {
        label: '判断条件',
        help: '根据工作流输入或已保存的步骤结果进行判断，不会执行外部操作。',
        group: '判断条件',
      },
      matched_label: {
        label: '条件成立分支名称',
        help: '只修改画布上的显示文字，不会改变稳定端口 ID。',
        group: '分支名称',
      },
      otherwise_label: {
        label: '条件不成立分支名称',
        help: '只修改画布上的显示文字，不会改变稳定端口 ID。',
        group: '分支名称',
      },
    },
    ports: { in: '执行判断', value: '待判断数据', matched: '条件成立', otherwise: '条件不成立' },
  },
  'flow.step': {
    title: '执行步骤',
    description: '执行一个已注册任务，按配置重试，并保存执行结果。',
    category: '任务执行',
    fields: {
      step_name: {
        label: '步骤处理器',
        help: '这个步骤要执行的已注册任务。',
        group: '执行内容',
        placeholder: 'tool.execute',
      },
      input: {
        label: '步骤输入',
        help: '选择发送给步骤处理器的工作流数据。',
        group: '执行内容',
      },
      max_attempts: {
        label: '最多尝试次数',
        help: '包含首次执行。例如填 3，最多执行三次。',
        group: '失败与重试',
      },
      retry_delay_ms: {
        label: '重试间隔（毫秒）',
        help: '两次尝试之间等待的时间；填 0 表示立即重试。',
        group: '失败与重试',
      },
      on_exhausted: {
        label: '全部尝试失败后',
        help: '终止整个运行，或从失败分支继续处理。',
        group: '失败与重试',
        options: {
          fail_run: '终止并标记失败',
          continue_workflow: '从失败分支继续',
        },
      },
    },
    ports: {
      in: '执行',
      input: '步骤输入',
      success: '完成',
      result: '步骤结果',
      failed: '失败分支',
      error: '失败详情',
    },
  },
  'flow.batch': {
    title: '批量执行步骤',
    description: '按列表顺序执行一组步骤，并收集每个步骤的结果。',
    category: '任务执行',
    fields: {
      steps: {
        label: '要执行的步骤',
        help: '步骤按当前顺序执行。每个成员都需要一个不会随意变化的唯一标识。',
        group: '批次步骤',
        columns: {
          step_key: { label: '成员标识', help: '批次内唯一，已有运行后不要修改。' },
          step_name: { label: '步骤处理器', help: '这个成员要执行的已注册任务。' },
          input_mapping: { label: '步骤输入', help: '发送给这个步骤处理器的数据。' },
          max_attempts: { label: '最多尝试次数', help: '包含首次执行。' },
          retry_delay_ms: { label: '重试间隔（毫秒）', help: '两次尝试之间等待的时间。' },
          on_exhausted: { label: '全部尝试失败后', help: '终止运行或从失败分支继续。' },
        },
      },
    },
    ports: {
      in: '执行批次',
      input: '批次输入',
      done: '批次完成',
      results: '步骤结果',
      recoverable_failure: '失败分支',
      errors: '失败详情',
    },
  },
  'flow.wait': {
    title: '等待至',
    description: '暂停工作流，直到指定的 UTC 时间。',
    category: '等待与回调',
    fields: {
      resume_at: {
        label: '恢复时间（UTC）',
        help: '填写以 Z 结尾的 UTC 时间，或选择一个能得到该时间的工作流字段。',
        group: '恢复时间',
      },
    },
    ports: { in: '开始等待', resume_at: '恢复时间', resumed: '继续' },
  },
  'flow.hook': {
    title: '等待外部回调',
    description: '等待审批、Webhook 或外部事件后继续工作流。',
    category: '等待与回调',
    fields: {
      kind: {
        label: '回调类型',
        help: '选择由审批、Webhook 还是接入系统事件恢复工作流。',
        group: '回调请求',
        options: { human_approval: '人工审批', webhook: 'Webhook', host_event: '接入系统事件' },
      },
      subject: {
        label: '请求标题',
        help: '显示在审批队列和审计记录中的简短标题。',
        group: '回调请求',
      },
      token_expression: {
        label: '回调令牌',
        help: '从稳定工作流数据生成唯一令牌，不能使用所有运行共用的固定文本。',
        group: '回调令牌',
      },
      callback_method: {
        label: 'HTTP 方法',
        help: '接入系统记录的回调请求方法。',
        group: 'Webhook 接入',
      },
      callback_path: {
        label: '回调路径',
        help: '由接入系统提供的路由；A3S Flow 不会自行托管这个地址。',
        group: 'Webhook 接入',
      },
      metadata: {
        label: '附加元数据',
        help: '与回调一起保存的标签和业务数据。',
        group: '附加元数据',
      },
    },
    ports: {
      in: '创建回调',
      token: '回调令牌',
      metadata: '回调元数据',
      received: '收到回调',
      payload: '回调数据',
      disposed: '已关闭',
    },
  },
  'flow.complete': {
    title: '完成工作流',
    description: '成功结束工作流，并保存最终结果。',
    category: '流程控制',
    fields: {
      output_expression: {
        label: '最终输出',
        help: '选择要保存为成功结果的工作流数据。',
        group: '最终输出',
      },
    },
    ports: { in: '完成', output: '最终结果' },
  },
  'flow.fail': {
    title: '标记工作流失败',
    description: '结束工作流，并记录最终失败原因。',
    category: '流程控制',
    fields: {
      error_expression: {
        label: '失败原因',
        help: '使用固定文本和工作流数据生成最终错误信息。',
        group: '失败详情',
      },
    },
    ports: { in: '标记失败', error: '失败原因' },
  },
  'flow.cancel': {
    title: '取消工作流',
    description: '结束当前运行，并执行接入系统要求的取消清理。',
    category: '运行结果',
    fields: {},
    ports: { in: '取消' },
  },
  'flow.timeout': {
    title: '标记工作流超时',
    description: '结束当前运行，并记录 UTC 截止时间和超时原因。',
    category: '运行结果',
    fields: {
      deadline: {
        label: '截止时间（UTC）',
        help: '导致当前运行超时的 UTC 截止时间。',
        group: '超时详情',
      },
      reason: {
        label: '超时原因',
        help: '补充说明这次超时决定的上下文。',
        group: '超时详情',
      },
    },
    ports: { in: '标记超时', deadline: '截止时间' },
  },
  'flow.continue-as-new': {
    title: '作为新运行继续',
    description: '结束当前历史段，并使用同一工作流定义启动后续运行。',
    category: '运行控制',
    fields: {
      input: {
        label: '后续运行输入',
        help: '作为后续运行初始输入的 JSON 数据。',
        group: '后续运行',
      },
    },
    ports: { in: '继续', successor: '后续运行' },
  },
  'flow.progress': {
    title: '记录运行进度',
    description: '保存可观察的执行进度，然后继续工作流重放。',
    category: '运行控制',
    fields: {
      progress_id: {
        label: '进度 ID',
        help: '重放时保持稳定的进度标识，建议使用当前图节点 ID。',
        group: '进度标识',
      },
      completed: {
        label: '已完成数量',
        help: '使用固定值或工作流字段表示已完成的单位数。',
        group: '进度数值',
      },
      total: {
        label: '总数量',
        help: '可选的总单位数。',
        group: '进度数值',
      },
      message: {
        label: '进度说明',
        help: '向运行观察者展示的可选说明。',
        group: '进度详情',
      },
      details: {
        label: '进度详情',
        help: '由运行检查接口公开的可选 JSON 数据。',
        group: '进度详情',
      },
    },
    ports: { in: '记录进度', recorded: '已记录' },
  },
  'flow.child-operation': {
    title: '关联子操作',
    description: '保存由外部系统管理的子操作稳定引用。',
    category: '子任务',
    fields: {
      reference_id: {
        label: '引用 ID',
        help: '不会随重放变化的引用标识。',
        group: '子操作标识',
      },
      kind: {
        label: '操作类型',
        help: '由接入系统定义的操作分类。',
        group: '子操作标识',
      },
      operation_id: {
        label: '操作 ID',
        help: '外部系统分配的操作标识。',
        group: '子操作标识',
      },
      flow_run_id: {
        label: 'Flow 运行 ID',
        help: '可选的关联 Flow 运行。',
        group: '关联信息',
      },
      metadata: {
        label: '附加元数据',
        help: '由接入系统维护的可选 JSON 元数据。',
        group: '关联信息',
      },
    },
    ports: { in: '关联', linked: '已关联', child: '子操作' },
  },
  'flow.child-workflow': {
    title: '启动子工作流',
    description: '使用父运行内稳定的标识启动或等待一个子工作流。',
    category: '子任务',
    fields: {
      child_id: {
        label: '子工作流 ID',
        help: '父运行内保持稳定的标识，建议使用当前图节点 ID。',
        group: '子工作流',
      },
      spec: {
        label: '工作流定义',
        help: '固定的工作流名称、版本、运行时和可选构建路由。',
        group: '子工作流',
      },
      input: {
        label: '子工作流输入',
        help: '作为子工作流初始输入的 JSON 数据。',
        group: '子工作流',
      },
      cancellation_policy: {
        label: '取消策略',
        help: '随父运行请求取消子工作流，或让子工作流继续运行。',
        group: '高级设置',
        options: {
          request_cancellation: '请求取消子工作流',
          abandon: '保留子工作流运行',
        },
      },
    },
    ports: { in: '启动', completed: '已完成', outcome: '运行结果' },
  },
  'flow.child-workflows': {
    title: '批量启动子工作流',
    description: '按确定顺序启动一组有数量上限的子工作流。',
    category: '子任务',
    fields: {
      children: {
        label: '子工作流列表',
        help: '按当前顺序启动的子工作流定义，单个批次最多包含 64 个成员。',
        group: '子工作流批次',
      },
    },
    ports: { in: '启动批次', completed: '批次完成', outcomes: '运行结果' },
  },
  'flow.signal': {
    title: '等待信号',
    description: '暂停工作流，直到收到下一条名称匹配的已声明信号。',
    category: '等待与回调',
    fields: {
      wait_id: {
        label: '等待 ID',
        help: '重放时保持稳定的等待标识，建议使用当前图节点 ID。',
        group: '等待信号',
      },
      signal_name: {
        label: '信号名称',
        help: '这个等待节点接受的已声明信号契约。',
        group: '等待信号',
        placeholder: 'order.approved',
      },
    },
    ports: { in: '开始等待', received: '已收到', payload: '信号数据' },
  },
  iteration: {
    title: '迭代',
    description: '对确定集合中的每个成员执行一次容器作用域。',
    category: '容器',
    fields: {
      start_node_id: {
        label: '起始节点 ID',
        help: '容器作用域内迭代起始节点的稳定标识。',
        group: '容器结构',
      },
      items: {
        label: '迭代集合',
        help: '进入迭代作用域前求值的集合。',
        group: '迭代输入',
      },
    },
    ports: { in: '进入迭代', done: '迭代完成', results: '迭代结果', item: '当前成员' },
  },
  'iteration-start': {
    title: '迭代起点',
    description: '迭代容器作用域内部使用的起始节点。',
    category: '容器',
    fields: {},
    ports: { next: '继续', item: '当前成员' },
  },
  loop: {
    title: '循环',
    description: '在确定条件保持成立时重复执行容器作用域。',
    category: '容器',
    fields: {
      start_node_id: {
        label: '起始节点 ID',
        help: '容器作用域内循环起始节点的稳定标识。',
        group: '容器结构',
      },
      condition: {
        label: '继续条件',
        help: '进入下一次循环作用域前检查的条件。',
        group: '循环条件',
      },
      max_iterations: {
        label: '最大循环次数',
        help: '由接入系统设置的循环编译安全上限。',
        group: '循环条件',
      },
    },
    ports: { in: '进入循环', done: '循环完成', result: '循环结果' },
  },
  'loop-start': {
    title: '循环起点',
    description: '循环容器作用域内部使用的起始节点。',
    category: '容器',
    fields: {},
    ports: { next: '继续' },
  },
};

export function isA3SFlowChineseLocale(locale: string | undefined): boolean {
  return locale?.toLocaleLowerCase().startsWith('zh') === true;
}

function localizeOptions(
  options: unknown[] | undefined,
  labels: Readonly<Record<string, string>> | undefined,
): unknown[] | undefined {
  if (!options || !labels) return options ? structuredClone(options) : undefined;
  return options.map((option) => {
    if (typeof option === 'string') return option;
    if (!option || typeof option !== 'object' || Array.isArray(option)) return option;
    const value = 'value' in option ? String(option.value) : '';
    const label = labels[value];
    return label ? { ...option, label } : structuredClone(option);
  });
}

function localizeTableColumns(
  tableSchema: WorkflowNodeFieldDefinition['table_schema'],
  copy: LocalizedFieldCopy,
): WorkflowNodeFieldDefinition['table_schema'] {
  if (!Array.isArray(tableSchema) || !copy.columns) {
    return tableSchema ? structuredClone(tableSchema) : undefined;
  }
  return tableSchema.map((column) => {
    const localized = copy.columns?.[column.name];
    return localized
      ? ({
          ...column,
          display_name: localized.label,
          description: localized.help,
        } satisfies WorkflowNodeTableColumn)
      : structuredClone(column);
  });
}

function localizeField(field: WorkflowNodeFieldDefinition, copy: LocalizedFieldCopy | undefined) {
  if (!copy) return structuredClone(field);
  return {
    ...field,
    display_name: copy.label,
    info: copy.help,
    placeholder: copy.placeholder ?? field.placeholder,
    ui_group_label: copy.group,
    options: localizeOptions(field.options, copy.options),
    table_schema: localizeTableColumns(field.table_schema, copy),
  } satisfies WorkflowNodeFieldDefinition;
}

export function localizeA3SFlowCoreNode(
  definition: A3SFlowCoreNodeDefinition,
  locale?: string,
): A3SFlowCoreNodeDefinition {
  return localizeNodeCopy(definition, locale);
}

export function localizeA3SFlowDagManifest(
  manifest: A3SFlowDagNodeManifest,
  locale?: string,
): A3SFlowDagNodeManifest {
  return localizeNodeCopy(manifest, locale);
}

function localizeNodeCopy<T extends A3SFlowCoreNodeDefinition | A3SFlowDagNodeManifest>(
  definition: T,
  locale?: string,
): T {
  if (!isA3SFlowChineseLocale(locale)) return definition;
  const copy = CHINESE_NODE_COPY[definition.type];
  if (!copy) return definition;
  return {
    ...definition,
    display_name: copy.title,
    description: copy.description,
    categoryLabel: copy.category,
    fields: definition.fields.map((field) => localizeField(field, copy.fields[field.name])),
    outputs: definition.outputs.map((item) => ({
      ...item,
      display_name: copy.ports[item.name] ?? item.display_name,
    })),
    ports: {
      inputs: definition.ports.inputs.map((port) => ({
        ...port,
        label: copy.ports[port.id] ?? port.label,
      })),
      outputs: definition.ports.outputs.map((port) => ({
        ...port,
        label: copy.ports[port.id] ?? port.label,
      })),
    },
  } as T;
}
