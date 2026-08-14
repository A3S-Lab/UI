type MdastNode = {
  type: string;
  name?: string;
  children?: MdastNode[];
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
    (node.type === "mdxJsxFlowElement" ||
      node.type === "mdxJsxTextElement") &&
    node.name &&
    phrasingContentElements.has(node.name)
  ) {
    node.children = node.children?.flatMap((child) =>
      child.type === "paragraph" ? (child.children ?? []) : [child],
    );
  }

  node.children?.forEach(normalizePhrasingContent);
}

/**
 * MDX treats indented text inside flow JSX as Markdown and wraps it in a
 * paragraph. That produces parser-breaking markup such as `<p><p>…</p></p>`
 * and invalid block children inside controls. Preserve the authored inline
 * nodes while removing only the synthetic paragraph wrapper from HTML
 * elements whose content model is phrasing-only.
 */
export function normalizeMdxHtmlPlugin() {
  return (tree: MdastNode) => normalizePhrasingContent(tree);
}
