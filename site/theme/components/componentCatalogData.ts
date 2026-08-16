import enComponentMetadata from "../../docs/next/en/components/_meta.json";
import enHarnessMetadata from "../../docs/next/en/harness/_meta.json";
import zhComponentMetadata from "../../docs/next/zh/components/_meta.json";
import zhHarnessMetadata from "../../docs/next/zh/harness/_meta.json";

export type CatalogLanguage = "en" | "zh";

type MetadataItem = {
  label: string;
  link: string;
};

type MetadataGroup = {
  items: MetadataItem[];
  label: string;
  type: "custom-link";
};

type LocalizedCatalogItem = {
  filterKey: string;
  filterLabel: string;
  groupLabel: string;
  label: string;
  link: string;
};

export type CatalogRecord = LocalizedCatalogItem & {
  alternateGroupLabel: string;
  alternateLabel: string;
  searchText: string;
  slug: string;
};

export type CatalogGroup = {
  description: string;
  key: string;
  label: string;
  records: CatalogRecord[];
};

const metadataByLanguage = {
  en: {
    components: enComponentMetadata,
    harness: enHarnessMetadata,
  },
  zh: {
    components: zhComponentMetadata,
    harness: zhHarnessMetadata,
  },
} as const;

const descriptionsByLanguage = {
  en: [
    "Create, edit, and submit through actions, fields, and text entry.",
    "Choose, filter, and search while preserving native state wherever possible.",
    "Move through pages, hierarchy, and related content without losing context.",
    "Structure application shells, toolbars, panes, and durable work regions.",
    "Handle layered, positioned, or focus-protected interaction.",
    "Explain loading, outcomes, exceptions, and the path to recovery.",
    "Present structured content, media, code, and data collections.",
    "Provide cross-page scrolling and appearance foundations.",
  ],
  zh: [
    "通过操作、字段和文本输入完成创建、编辑与提交。",
    "完成选择、筛选与搜索，并尽量保留浏览器原生状态。",
    "在页面、层级和相关内容之间移动，同时保留当前位置。",
    "组织应用外壳、工具栏、窗格与长期存在的工作区域。",
    "承载需要分层、定位或焦点保护的交互。",
    "解释加载、结果、异常，以及下一步恢复方式。",
    "呈现结构化内容、媒体、代码和数据集合。",
    "提供跨页面的滚动与外观基础能力。",
  ],
} as const;

function isMetadataItem(value: unknown): value is MetadataItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.label === "string" && typeof item.link === "string";
}

function metadataGroups(value: unknown): MetadataGroup[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const group = entry as Record<string, unknown>;
    if (
      group.type !== "custom-link" ||
      typeof group.label !== "string" ||
      !Array.isArray(group.items)
    ) {
      return [];
    }

    const items = group.items.filter(isMetadataItem);
    return items.length > 0
      ? [
          {
            items,
            label: group.label,
            type: "custom-link" as const,
          },
        ]
      : [];
  });
}

function localizedItems(language: CatalogLanguage) {
  const metadata = metadataByLanguage[language];
  const componentItems = metadataGroups(metadata.components).flatMap(
    (group, groupIndex) =>
      group.items.map((item) => ({
        filterKey: `components-${groupIndex}`,
        filterLabel: group.label,
        groupLabel: group.label,
        label: item.label,
        link: item.link,
      })),
  );
  const harnessItems = metadataGroups(metadata.harness).flatMap((group) =>
    group.items
      .filter((item) => item.link.startsWith("components/"))
      .map((item) => ({
        filterKey: "harness",
        filterLabel: "Harness",
        groupLabel: group.label,
        label: item.label,
        link: item.link,
      })),
  );

  return [...componentItems, ...harnessItems];
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[\s/_-]+/g, " ")
    .trim();
}

export function catalogRecords(language: CatalogLanguage): CatalogRecord[] {
  const alternateLanguage = language === "zh" ? "en" : "zh";
  const alternateItems = new Map(
    localizedItems(alternateLanguage).map((item) => [item.link, item]),
  );

  return localizedItems(language).map((item) => {
    const alternate = alternateItems.get(item.link);
    const slug = item.link.split("/").at(-1) ?? item.link;
    const alternateLabel = alternate?.label ?? slug;
    const alternateGroupLabel = alternate?.groupLabel ?? item.groupLabel;
    const searchText = normalizeSearchValue(
      [
        item.label,
        alternateLabel,
        slug,
        item.groupLabel,
        alternateGroupLabel,
        item.filterLabel,
      ].join(" "),
    );

    return {
      ...item,
      alternateGroupLabel,
      alternateLabel,
      searchText,
      slug,
    };
  });
}

export function catalogGroups(
  language: CatalogLanguage,
  records = catalogRecords(language),
): CatalogGroup[] {
  const groups = new Map<string, CatalogGroup>();

  records.forEach((record) => {
    const current = groups.get(record.filterKey);
    if (current) {
      current.records.push(record);
      return;
    }

    const componentIndex = Number.parseInt(
      record.filterKey.replace("components-", ""),
      10,
    );
    const description =
      record.filterKey === "harness"
        ? language === "zh"
          ? "覆盖任务、对话、执行、审阅、证据与开发工具。"
          : "Cover tasks, conversation, execution, review, evidence, and developer tooling."
        : (descriptionsByLanguage[language][componentIndex] ?? "");

    groups.set(record.filterKey, {
      description,
      key: record.filterKey,
      label: record.filterLabel,
      records: [record],
    });
  });

  return [...groups.values()];
}

export function findCatalogRecord(language: CatalogLanguage, slug: string) {
  return catalogRecords(language).find((record) => record.slug === slug);
}

export function normalizeCatalogQuery(value: string) {
  return normalizeSearchValue(value);
}
