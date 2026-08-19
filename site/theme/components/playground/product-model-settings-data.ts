import type { ProductPlaygroundLocale } from "./product-playground-data";

export type ProductModelCapability = "attachment" | "reasoning" | "tools";

export type ProductModelRecord = {
  capabilities: ProductModelCapability[];
  context: string;
  id: string;
  name: string;
  output: string;
};

export type ProductProviderRecord = {
  apiKey: string;
  baseUrl: string;
  id: string;
  models: ProductModelRecord[];
  name: string;
  readOnly?: boolean;
};

export type ProductModelDraft = {
  attachment: boolean;
  context: string;
  id: string;
  name: string;
  output: string;
  reasoning: boolean;
  tools: boolean;
};

export function createInitialProductProviders(
  locale: ProductPlaygroundLocale,
): ProductProviderRecord[] {
  const zh = locale === "zh";
  return [
    {
      apiKey: "",
      baseUrl: "runtime://catalog",
      id: "runtime",
      models: [
        {
          capabilities: ["reasoning", "tools", "attachment"],
          context: zh ? "运行时提供" : "Host managed",
          id: "current",
          name: zh ? "当前运行时默认模型" : "Current runtime default",
          output: zh ? "运行时提供" : "Host managed",
        },
      ],
      name: zh ? "运行时目录" : "Runtime catalog",
      readOnly: true,
    },
    {
      apiKey: "",
      baseUrl: "http://127.0.0.1:11434/v1",
      id: "local-endpoint",
      models: [],
      name: zh ? "本地端点" : "Local endpoint",
    },
  ];
}

export function createEmptyProductModelDraft(): ProductModelDraft {
  return {
    attachment: false,
    context: "",
    id: "",
    name: "",
    output: "",
    reasoning: true,
    tools: true,
  };
}

export function createProductModelFromDraft(
  draft: ProductModelDraft,
  locale: ProductPlaygroundLocale,
): ProductModelRecord {
  const zh = locale === "zh";
  const capabilities: ProductModelCapability[] = [
    draft.reasoning ? "reasoning" : null,
    draft.tools ? "tools" : null,
    draft.attachment ? "attachment" : null,
  ].filter((value): value is ProductModelCapability => Boolean(value));

  return {
    capabilities,
    context: draft.context.trim() || (zh ? "未设置" : "Not set"),
    id: draft.id.trim(),
    name: draft.name.trim() || draft.id.trim(),
    output: draft.output.trim() || (zh ? "未设置" : "Not set"),
  };
}
