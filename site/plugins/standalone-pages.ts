import * as path from "node:path";
import type { RspressPlugin } from "@rspress/shared";
import { productApplicationRoutePaths } from "../product-application-routes";

/** Registers standalone playground and product routes outside the docs tree. */
export function standalonePagesPlugin(siteRoot: string): RspressPlugin {
  const pagesRoot = path.join(siteRoot, "pages");

  return {
    name: "a3s-standalone-pages",
    addPages() {
      const productPages = productApplicationRoutePaths.flatMap((routePath) => [
        {
          routePath,
          filepath: path.join(pagesRoot, "app.zh.mdx"),
        },
        {
          routePath: `/en${routePath}`,
          filepath: path.join(pagesRoot, "app.en.mdx"),
        },
      ]);

      return [
        {
          routePath: "/playground",
          filepath: path.join(pagesRoot, "playground.zh.mdx"),
        },
        {
          routePath: "/en/playground",
          filepath: path.join(pagesRoot, "playground.en.mdx"),
        },
        ...productPages,
      ];
    },
  };
}
