type PositionPoint = {
  offset?: number;
};

type PositionedNode = {
  type: string;
  name?: string;
  attributes?: MdxAttribute[];
  children?: PositionedNode[];
  position?: {
    start: PositionPoint;
    end: PositionPoint;
  };
};

type MdxAttribute = {
  type: "mdxJsxAttribute";
  name: string;
  value: string;
};

type VFileLike = {
  value: unknown;
};

function sourceForPreview(node: PositionedNode, documentSource: string) {
  const children = node.children ?? [];
  const firstChild = children[0];
  const lastChild = children.at(-1);
  const start = firstChild?.position?.start.offset;
  const end = lastChild?.position?.end.offset;

  if (typeof start !== "number" || typeof end !== "number") return "";
  return documentSource.slice(start, end).trim();
}

function attachPreviewSource(node: PositionedNode, documentSource: string) {
  if (node.type !== "mdxJsxFlowElement" || node.name !== "Preview") return;

  const attributes = node.attributes ?? [];
  if (attributes.some((attribute) => attribute.name === "source")) return;

  const source = sourceForPreview(node, documentSource);
  if (!source) return;

  attributes.push({
    type: "mdxJsxAttribute",
    name: "source",
    value: source,
  });
  node.attributes = attributes;
}

function visitPreviewNodes(node: PositionedNode, documentSource: string) {
  attachPreviewSource(node, documentSource);
  node.children?.forEach((child) => visitPreviewNodes(child, documentSource));
}

/**
 * Captures authored Preview markup before MDX compilation so the runtime can
 * hand the exact public HTML to Rspress' native Shiki code block.
 */
export function previewSourcePlugin() {
  return (tree: PositionedNode, file: VFileLike) => {
    const documentSource = String(file.value ?? "");
    visitPreviewNodes(tree, documentSource);
  };
}
