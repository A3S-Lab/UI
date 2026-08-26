type MdastNode = {
  type: string;
  name?: string;
  attributes?: MdastAttribute[];
  children?: MdastNode[];
};

type MdastAttribute = {
  type: string;
  name?: string;
  value?: unknown;
};

const intrinsicAttributeAliases: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  colspan: "colSpan",
  rowspan: "rowSpan",
  autocomplete: "autoComplete",
  inputmode: "inputMode",
  enterkeyhint: "enterKeyHint",
  minlength: "minLength",
  maxlength: "maxLength",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
};

const phrasingContentElements = new Set([
  "abbr",
  "b",
  "bdi",
  "bdo",
  "button",
  "cite",
  "code",
  "data",
  "dfn",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "kbd",
  "label",
  "legend",
  "mark",
  "meter",
  "option",
  "output",
  "p",
  "pre",
  "progress",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "time",
  "u",
  "var",
]);

function normalizePhrasingContent(node: MdastNode) {
  if (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    node.name &&
    phrasingContentElements.has(node.name)
  ) {
    node.children = node.children?.flatMap((child) =>
      child.type === "paragraph" ? (child.children ?? []) : [child],
    );
  }

  node.children?.forEach(normalizePhrasingContent);
}

function normalizeIntrinsicAttributes(node: MdastNode) {
  if (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    node.name &&
    /^[a-z]/.test(node.name)
  ) {
    node.attributes?.forEach((attribute) => {
      if (attribute.type !== "mdxJsxAttribute" || !attribute.name) return;
      attribute.name =
        intrinsicAttributeAliases[attribute.name] ?? attribute.name;
    });
  }

  node.children?.forEach(normalizeIntrinsicAttributes);
}

/**
 * MDX treats indented text inside flow JSX as Markdown and wraps it in a
 * paragraph. That produces parser-breaking markup such as `<p><p>…</p></p>`
 * and invalid block children inside controls. Preserve the authored inline
 * nodes while removing only the synthetic paragraph wrapper from HTML
 * elements whose content model is phrasing-only.
 */
export function normalizeMdxHtmlPlugin() {
  return (tree: MdastNode) => {
    normalizePhrasingContent(tree);
    normalizeIntrinsicAttributes(tree);
  };
}
