import type {
  ProductCapabilityTab,
  ProductPlaygroundLocale,
} from "./product-playground-data";
import type {
  ProductCapabilityDefinition,
  ProductCapabilityPreference,
} from "./product-capability-state";

export function capabilityKindLabel(
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (tab === "assistants") return zh ? "专家" : "Assistant";
  if (tab === "skills") return zh ? "技能" : "Skill";
  return zh ? "连接器" : "Connector";
}

export function capabilityPermissionLabels(
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (tab === "assistants") {
    return zh
      ? ["读取已附加上下文", "提出工作区变更", "按需请求工具"]
      : [
          "Read attached context",
          "Propose workspace changes",
          "Request tools when needed",
        ];
  }
  if (tab === "skills") {
    return zh
      ? ["读取声明的输入", "执行受控步骤", "写入任务证据"]
      : ["Read declared inputs", "Run bounded steps", "Write task evidence"];
  }
  return zh
    ? ["读取已授权数据", "附加引用记录", "准备需确认的写操作"]
    : [
        "Read authorized data",
        "Attach referenced records",
        "Prepare writes for confirmation",
      ];
}

export function defaultCapabilityPermissions() {
  return [true, true, false];
}

export function capabilitySourceTitle(
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const zh = locale === "zh";
  if (tab === "assistants") return zh ? "运行说明" : "Runtime instructions";
  if (tab === "skills") return zh ? "来源" : "Source";
  return zh ? "连接地址" : "Connection address";
}

export function capabilitySourceLabel(
  definition: ProductCapabilityDefinition,
  preference: ProductCapabilityPreference,
  locale: ProductPlaygroundLocale,
) {
  if (preference.source) return preference.source;
  if (definition.source) return definition.source;
  const zh = locale === "zh";
  if (definition.tab === "assistants")
    return zh ? "工作区配置" : "Workspace configuration";
  if (definition.tab === "skills")
    return zh ? "A3S 内置目录" : "A3S bundled catalog";
  return zh ? "宿主管理的连接" : "Host-managed connection";
}
