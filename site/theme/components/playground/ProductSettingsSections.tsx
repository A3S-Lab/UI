import type { ProductPlaygroundLocale } from "./product-playground-data";
import {
  AccountSettings,
  PersonalizationSettings,
  SystemSettings,
} from "./ProductSettingsGeneralSections";
import {
  AssistantSettings,
  ExecutionSettings,
  MemorySettings,
  ModelSettings,
} from "./ProductSettingsIntelligenceSections";
import type { ProductPlaygroundIconName } from "./ProductPlaygroundIcon";
import {
  DataSettings,
  SecuritySettings,
  ShortcutSettings,
} from "./ProductSettingsPrivacySections";
import { HelpSettings } from "./ProductSettingsSupportSection";
import {
  ChannelSettings,
  IntegrationSettings,
} from "./ProductSettingsConnectivitySections";

export type SettingsSection =
  | "account"
  | "agent"
  | "assistant"
  | "channels"
  | "data"
  | "help"
  | "integrations"
  | "memory"
  | "models"
  | "personalization"
  | "security"
  | "shortcuts"
  | "system";

export const settingsSections: readonly {
  icon: ProductPlaygroundIconName;
  id: SettingsSection;
  label: { en: string; zh: string };
}[] = [
  { id: "system", icon: "settings", label: { en: "System", zh: "系统设置" } },
  {
    id: "account",
    icon: "assistant",
    label: { en: "Account", zh: "账户管理" },
  },
  { id: "agent", icon: "catalog", label: { en: "Execution", zh: "执行设置" } },
  {
    id: "personalization",
    icon: "inspiration",
    label: { en: "Personalization", zh: "个性化" },
  },
  { id: "memory", icon: "knowledge", label: { en: "Memory", zh: "记忆" } },
  { id: "models", icon: "workspace", label: { en: "Models", zh: "模型" } },
  {
    id: "assistant",
    icon: "assistant",
    label: { en: "Assistant", zh: "助理设置" },
  },
  {
    id: "integrations",
    icon: "link",
    label: { en: "Integrations", zh: "集成" },
  },
  {
    id: "channels",
    icon: "send",
    label: { en: "Channels", zh: "渠道" },
  },
  { id: "data", icon: "files", label: { en: "Data", zh: "数据管理" } },
  {
    id: "shortcuts",
    icon: "checklist",
    label: { en: "Shortcuts", zh: "快捷键" },
  },
  { id: "security", icon: "shield", label: { en: "Security", zh: "安全中心" } },
  { id: "help", icon: "report", label: { en: "Help", zh: "帮助与反馈" } },
];

export function ProductSettingsSectionContent({
  locale,
  section,
}: {
  locale: ProductPlaygroundLocale;
  section: SettingsSection;
}) {
  if (section === "system") return <SystemSettings locale={locale} />;
  if (section === "account") return <AccountSettings locale={locale} />;
  if (section === "agent") return <ExecutionSettings locale={locale} />;
  if (section === "personalization")
    return <PersonalizationSettings locale={locale} />;
  if (section === "memory") return <MemorySettings locale={locale} />;
  if (section === "models") return <ModelSettings locale={locale} />;
  if (section === "assistant") return <AssistantSettings locale={locale} />;
  if (section === "integrations")
    return <IntegrationSettings locale={locale} />;
  if (section === "channels") return <ChannelSettings locale={locale} />;
  if (section === "data") return <DataSettings locale={locale} />;
  if (section === "shortcuts") return <ShortcutSettings locale={locale} />;
  if (section === "security") return <SecuritySettings locale={locale} />;
  return <HelpSettings locale={locale} />;
}
