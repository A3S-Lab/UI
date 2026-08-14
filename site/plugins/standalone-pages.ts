import * as path from "node:path";
import type { RspressPlugin } from "@rspress/shared";

/**
 * Registers product surfaces that share the documentation shell without
 * becoming documentation pages or sidebar entries.
 */
export function standalonePagesPlugin(siteRoot: string): RspressPlugin {
  const pagesRoot = path.join(siteRoot, "pages");

  return {
    name: "a3s-standalone-pages",
    addPages() {
      return [
        {
          routePath: "/playground",
          filepath: path.join(pagesRoot, "playground.zh.mdx"),
        },
        {
          routePath: "/en/playground",
          filepath: path.join(pagesRoot, "playground.en.mdx"),
        },
      ];
    },
  };
}
