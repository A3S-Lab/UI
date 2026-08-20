import type {
  ProductPlaygroundLocale,
  ProductResourceView,
} from "./product-playground-data";
import type { ProductTaskDraft } from "./product-composer-data";
import { ProductConnectionSurface } from "./ProductConnectionSurface";
import { ProductFileManagerSurface } from "./ProductFileManagerSurface";
import { ProductInspirationSurface } from "./ProductInspirationSurface";
import { ProductKnowledgeLibrarySurface } from "./ProductKnowledgeLibrarySurface";
import { ProductMailSurface } from "./ProductMailSurface";

const resourceTitles: Record<
  ProductResourceView,
  {
    description: Record<ProductPlaygroundLocale, string>;
    title: Record<ProductPlaygroundLocale, string>;
  }
> = {
  files: {
    title: { en: "My files", zh: "我的文件" },
    description: {
      en: "Review task artifacts, then sync approved files through cloud storage.",
      zh: "快速查看任务成果，上传到云端网盘开启跨端同步。",
    },
  },
  mail: {
    title: { en: "Mail", zh: "我的邮箱" },
    description: {
      en: "Connect a mailbox before using messages as task context.",
      zh: "连接邮箱后，可将邮件作为任务上下文。",
    },
  },
  documents: {
    title: { en: "Documents", zh: "协作文档" },
    description: {
      en: "Connect a document provider and reuse approved sources.",
      zh: "连接文档服务并复用已授权资料。",
    },
  },
  knowledge: {
    title: { en: "Knowledge", zh: "知识库" },
    description: {
      en: "Keep durable sources separate from transient task output.",
      zh: "将长期资料与临时任务产物分开管理。",
    },
  },
  inspiration: {
    title: { en: "Inspiration", zh: "灵感" },
    description: {
      en: "Capture useful fragments and turn them into structured work.",
      zh: "收集可用片段，并将它们转为结构化任务。",
    },
  },
};

export function ProductResourcesSurface({
  locale,
  onStartTask,
  resource,
  startHref,
}: {
  locale: ProductPlaygroundLocale;
  onStartTask: (draft: Omit<ProductTaskDraft, "revision">) => void;
  resource: ProductResourceView;
  startHref: string;
}) {
  const copy = resourceTitles[resource];

  if (resource === "inspiration") {
    return (
      <ProductInspirationSurface locale={locale} onStartTask={onStartTask} />
    );
  }

  if (resource === "mail") {
    return (
      <ProductMailSurface
        locale={locale}
        onStartTask={onStartTask}
        startHref={startHref}
      />
    );
  }

  if (resource === "files") {
    return (
      <ProductFileManagerSurface locale={locale} onStartTask={onStartTask} />
    );
  }

  if (resource === "knowledge") {
    return (
      <ProductKnowledgeLibrarySurface
        locale={locale}
        onStartTask={onStartTask}
      />
    );
  }

  return (
    <section
      className="product-resources"
      data-product-surface="resources"
      data-resource={resource}
    >
      <header>
        <h1>{copy.title[locale]}</h1>
        <p>{copy.description[locale]}</p>
      </header>
      <ProductConnectionSurface
        locale={locale}
        onUseInTask={() =>
          onStartTask({
            prompt:
              locale === "zh"
                ? "基于已授权的协作文档，梳理关键信息、待确认事项和下一步行动。"
                : "Review the authorized collaborative documents and summarize key information, open questions, and next actions.",
            resources: [
              {
                id: "connector:documents",
                kind: "connector",
                label: locale === "zh" ? "协作文档" : "Collaborative documents",
                meta:
                  locale === "zh"
                    ? "已授权连接器"
                    : "Authorized connector",
              },
            ],
            workspace: "ui",
          })
        }
        resource={resource}
      />
    </section>
  );
}
