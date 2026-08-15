type MdxNode = {
  attributes?: unknown[];
  children?: MdxNode[];
  name?: string;
  type: string;
};

type VFileLike = {
  path?: string;
};

function isComponentGuide(filePath: string) {
  const normalizedPath = filePath.replaceAll("\\", "/");
  const match = normalizedPath.match(/\/components\/([^/]+)\.mdx$/);
  return Boolean(match && match[1] !== "index");
}

function componentIntroNode(): MdxNode {
  return {
    attributes: [],
    children: [],
    name: "ComponentIntro",
    type: "mdxJsxFlowElement",
  };
}

/**
 * Gives every versioned component guide the same quick-start surface without
 * duplicating authored MDX across hundreds of localized pages.
 */
export function componentIntroPlugin() {
  return (tree: MdxNode, file: VFileLike) => {
    if (!file.path || !isComponentGuide(file.path) || !tree.children) return;
    if (
      tree.children.some(
        (node) =>
          node.type === "mdxJsxFlowElement" && node.name === "ComponentIntro",
      )
    ) {
      return;
    }

    const firstHeadingIndex = tree.children.findIndex(
      (node) => node.type === "heading",
    );
    const firstContentIndex = Math.max(firstHeadingIndex + 1, 0);
    const firstContentNode = tree.children[firstContentIndex];
    const insertionIndex =
      firstContentNode?.type === "paragraph"
        ? firstContentIndex + 1
        : firstContentIndex;

    tree.children.splice(insertionIndex, 0, componentIntroNode());
  };
}
