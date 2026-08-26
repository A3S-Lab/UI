type MdxAttributeValueExpression = {
  type: "mdxJsxAttributeValueExpression";
  value: string;
};

type MdxAttribute = {
  name?: string;
  type: string;
  value?: MdxAttributeValueExpression | null | string;
};

type MdxNode = {
  attributes?: MdxAttribute[];
  children?: MdxNode[];
  depth?: number;
  lang?: string | null;
  name?: string;
  type: string;
  value?: string;
};

type VFileLike = {
  path?: string;
};

type FrameworkSnippets = {
  html?: string;
  react?: string;
  vue?: string;
};

type FrameworkInstalls = FrameworkSnippets;

type NodeRange = {
  end: number;
  start: number;
};

const frameworkNames = ["html", "react", "vue"] as const;
const htmlExampleMarkers: Record<
  string,
  { attributes?: string[]; classes?: string[] }
> = {
  button: { classes: ["btn"] },
  checkbox: {
    attributes: ['type="checkbox"'],
    classes: ["input"],
  },
  "native-select": { classes: ["native-select"] },
  "radio-group": { attributes: ['type="radio"'] },
  slider: { attributes: ['type="range"'] },
  spinner: { classes: ["animate-spin"] },
  "scroll-area": { classes: ["scrollbar"] },
  switch: { attributes: ['role="switch"'] },
  "theme-switcher": { attributes: ["data-a3s-theme-toggle"] },
  tooltip: { attributes: ["data-tooltip"] },
};

function normalizedPath(filePath: string) {
  return filePath.replaceAll("\\", "/");
}

function guideContext(filePath: string) {
  const match = normalizedPath(filePath).match(
    /\/(components|harness)\/([^/]+)\.mdx$/,
  );
  if (!match || match[2] === "index") return undefined;
  return { group: match[1], slug: match[2] };
}

function usesFrameworkAdapters(filePath: string) {
  return /\/next\/(?:en|zh)\/(?:components|harness)\/[^/]+\.mdx$/u.test(
    normalizedPath(filePath),
  );
}

function textContent(node: MdxNode): string {
  if (typeof node.value === "string") return node.value;
  return node.children?.map(textContent).join("") ?? "";
}

function isSectionHeading(node: MdxNode) {
  return node.type === "heading" && node.depth === 2;
}

function isUnavailableGuide(tree: MdxNode) {
  const content = textContent(tree);
  return (
    /not part of this\s+published\s+package contract/u.test(content) ||
    /not part of this stable documentation snapshot/u.test(content) ||
    /不属于该历史版本的公开契约/u.test(content) ||
    /不属于此稳定版文档快照/u.test(content)
  );
}

function sectionRange(children: MdxNode[], label: string) {
  const start = children.findIndex(
    (node) => isSectionHeading(node) && textContent(node).trim() === label,
  );
  if (start < 0) return undefined;

  let end = start + 1;
  while (end < children.length && !isSectionHeading(children[end])) end += 1;
  return { end, start } satisfies NodeRange;
}

function findCode(
  node: MdxNode,
  languages: readonly string[],
): string | undefined {
  if (
    node.type === "code" &&
    typeof node.value === "string" &&
    languages.includes(node.lang ?? "")
  ) {
    return node.value.trim();
  }

  for (const child of node.children ?? []) {
    const code = findCode(child, languages);
    if (code) return code;
  }
  return undefined;
}

function collectCode(
  node: MdxNode,
  languages: readonly string[],
  values: string[] = [],
) {
  if (
    node.type === "code" &&
    typeof node.value === "string" &&
    languages.includes(node.lang ?? "")
  ) {
    values.push(node.value.trim());
  }
  for (const child of node.children ?? []) {
    collectCode(child, languages, values);
  }
  return values;
}

function htmlClasses(code: string) {
  const classes = new Set<string>();
  for (const match of code.matchAll(/\bclass=(?:"([^"]*)"|'([^']*)')/gu)) {
    for (const className of (match[1] ?? match[2] ?? "").split(/\s+/u)) {
      if (className) classes.add(className);
    }
  }
  return classes;
}

function htmlExampleScore(code: string, slug: string) {
  const marker = htmlExampleMarkers[slug] ?? { classes: [slug] };
  const classes = htmlClasses(code);
  const classMatches = (marker.classes ?? []).filter((className) =>
    classes.has(className),
  ).length;
  const attributeMatches = (marker.attributes ?? []).filter((attribute) =>
    code.includes(attribute),
  ).length;
  const requiredCount =
    (marker.classes?.length ?? 0) + (marker.attributes?.length ?? 0);
  const matchedCount = classMatches + attributeMatches;
  const isScriptOnly = /^\s*<script\b[\s\S]*<\/script>\s*$/u.test(code);

  if (requiredCount > 0 && matchedCount === requiredCount) {
    return 1000 - Math.min(code.length, 900) / 1000;
  }
  if (matchedCount > 0) return 100 + matchedCount;
  return isScriptOnly ? -100 : 0;
}

function componentHtmlCode(node: MdxNode, slug: string) {
  return collectCode(node, ["html"])
    .map((code, index) => ({
      code,
      index,
      score: htmlExampleScore(code, slug),
    }))
    .sort(
      (left, right) => right.score - left.score || left.index - right.index,
    )[0]?.code;
}

function codeInRange(
  children: MdxNode[],
  range: NodeRange | undefined,
  languages: readonly string[],
) {
  if (!range) return undefined;
  for (const node of children.slice(range.start + 1, range.end)) {
    const code = findCode(node, languages);
    if (code) return code;
  }
  return undefined;
}

function expressionString(value: MdxAttribute["value"]) {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value.value !== "string") return undefined;

  const expression = value.value.trim();
  if (expression.startsWith("`") && expression.endsWith("`")) {
    return expression.slice(1, -1).replaceAll("\\`", "`").trim();
  }
  if (
    (expression.startsWith('"') && expression.endsWith('"')) ||
    (expression.startsWith("'") && expression.endsWith("'"))
  ) {
    try {
      return JSON.parse(expression).trim();
    } catch {
      return expression.slice(1, -1).trim();
    }
  }
  return expression;
}

function frameworkTabs(children: MdxNode[]) {
  const index = children.findIndex(
    (node) => {
      if (node.type !== "mdxJsxFlowElement") return false;
      if (node.name === "FrameworkTabs") return true;
      return (
        node.name === "Preview" &&
        node.attributes?.some((attribute) => attribute.name === "frameworkHtml") ===
          true
      );
    },
  );
  if (index < 0) return undefined;

  const node = children[index];
  const inlinePreview = node.name === "Preview";
  const frameworkAttribute = (framework: (typeof frameworkNames)[number]) =>
    inlinePreview
      ? `framework${framework.charAt(0).toUpperCase()}${framework.slice(1)}`
      : framework;
  const snippets = Object.fromEntries(
    frameworkNames.map((framework) => {
      const attribute = node.attributes?.find(
        (candidate) => candidate.name === frameworkAttribute(framework),
      );
      return [framework, expressionString(attribute?.value)];
    }),
  ) as FrameworkSnippets;
  const installs = Object.fromEntries(
    frameworkNames.map((framework) => {
      const attribute = node.attributes?.find(
        (candidate) =>
          candidate.name === `${frameworkAttribute(framework)}Install`,
      );
      return [framework, expressionString(attribute?.value)];
    }),
  ) as FrameworkInstalls;

  if (inlinePreview) {
    return {
      index,
      inline: true,
      installs,
      snippets,
    };
  }

  let headingIndex = index - 1;
  while (headingIndex >= 0 && !isSectionHeading(children[headingIndex])) {
    headingIndex -= 1;
  }
  if (headingIndex < 0) {
    return {
      index,
      installs,
      range: { end: index + 1, start: index },
      snippets,
    };
  }

  let end = index + 1;
  while (end < children.length && !isSectionHeading(children[end])) end += 1;
  return {
    index,
    installs,
    range: { end, start: headingIndex },
    snippets,
  };
}

function stringAttribute(name: string, value: string): MdxAttribute {
  return {
    name,
    type: "mdxJsxAttribute",
    value,
  };
}

function booleanAttribute(name: string): MdxAttribute {
  return {
    name,
    type: "mdxJsxAttribute",
    value: null,
  };
}

function attachFrameworkIntegration(
  preview: MdxNode,
  snippets: Required<FrameworkSnippets>,
  installs: FrameworkInstalls,
  hasController = false,
  integrationHook?: string,
  semanticFrameworks = false,
): void {
  const attributes = preview.attributes ?? [];
  attributes.push(
    ...frameworkNames.map((framework) => {
      const attributeName = `framework${
        framework.charAt(0).toUpperCase() + framework.slice(1)
      }`;
      return stringAttribute(attributeName, snippets[framework]);
    }),
    ...frameworkNames.flatMap((framework) => {
      const install = installs[framework];
      if (!install) return [];
      const attributeName = `framework${
        framework.charAt(0).toUpperCase() + framework.slice(1)
      }Install`;
      return [stringAttribute(attributeName, install)];
    }),
    ...(hasController ? [booleanAttribute("hasController")] : []),
    ...(integrationHook
      ? [stringAttribute("integrationHook", integrationHook)]
      : []),
    ...(semanticFrameworks ? [booleanAttribute("semanticFrameworks")] : []),
  );
  preview.attributes = attributes;
}

function sharedFrameworkHook(snippets: Required<FrameworkSnippets>) {
  const hookPattern = /\b(use[A-Z][A-Za-z0-9]*)\b/gu;
  const reactHooks = Array.from(
    snippets.react.matchAll(hookPattern),
    (match) => match[1],
  );
  const vueHooks = new Set(
    Array.from(snippets.vue.matchAll(hookPattern), (match) => match[1]),
  );
  return reactHooks.find((hook) => vueHooks.has(hook));
}

function removeRanges(children: MdxNode[], ranges: NodeRange[]) {
  ranges
    .sort((left, right) => right.start - left.start)
    .forEach((range) => children.splice(range.start, range.end - range.start));
}

/**
 * Gives the first preview in every versioned component guide and current
 * Harness layout guide a shared framework-integration source panel. The
 * authored examples remain the source of truth while duplicate framework
 * chapters are normalized into the preview's HTML/React/Vue tab set at build
 * time.
 * Historical versions use semantic framework examples because their packages
 * predate the generated React and Vue adapters.
 */
export function componentPreviewIntegrationPlugin() {
  return (tree: MdxNode, file: VFileLike) => {
    const context = file.path ? guideContext(file.path) : undefined;
    if (!file.path || !context || !tree.children) return;
    if (isUnavailableGuide(tree)) return;

    const { group, slug } = context;
    const componentName = slug
      .split("-")
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join("");
    const hookName = `use${componentName}`;
    const useAdapters = usesFrameworkAdapters(file.path);
    const authoredTabs = frameworkTabs(tree.children);
    const reactRange = sectionRange(tree.children, "React");
    const vueRange = sectionRange(tree.children, "Vue");
    const snippets: FrameworkSnippets = authoredTabs?.snippets ?? {
      html: componentHtmlCode({ children: tree.children, type: "root" }, slug),
      react: codeInRange(tree.children, reactRange, ["tsx", "jsx"]),
      vue: codeInRange(tree.children, vueRange, ["vue"]),
    };

    const missing = frameworkNames.filter((framework) => !snippets[framework]);
    if (missing.length > 0) {
      throw new Error(
        `${normalizedPath(file.path)} is missing ${missing.join(", ")} framework quick-start content.`,
      );
    }

    const completeSnippets = snippets as Required<FrameworkSnippets>;
    const integrationHook = useAdapters
      ? completeSnippets.react.includes(hookName) &&
        completeSnippets.vue.includes(hookName)
        ? hookName
        : group === "harness"
          ? sharedFrameworkHook(completeSnippets)
          : undefined
      : undefined;
    const hasController = Boolean(integrationHook);
    const ranges = authoredTabs?.inline
      ? []
      : authoredTabs
      ? [
          group === "harness"
            ? {
                end: authoredTabs.index + 1,
                start: authoredTabs.index,
              }
            : authoredTabs.range,
        ]
      : [reactRange, vueRange].filter(
          (range): range is NodeRange => range !== undefined,
        );

    removeRanges(tree.children, ranges);
    const firstPreview = tree.children.find(
      (node) => node.type === "mdxJsxFlowElement" && node.name === "Preview",
    );
    if (!firstPreview) {
      throw new Error(
        `${normalizedPath(file.path)} requires a root-level Preview for its framework integration.`,
      );
    }
    if (
      firstPreview.attributes?.some(
        (attribute) => attribute.name === "frameworkHtml",
      )
    ) {
      return;
    }

    attachFrameworkIntegration(
      firstPreview,
      completeSnippets,
      authoredTabs?.installs ?? {},
      hasController,
      integrationHook,
      !useAdapters,
    );
  };
}
