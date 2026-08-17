import type {
  ProductPlaygroundLocale,
  ProductPlaygroundView,
  ProductResourceView,
} from "./theme/components/playground/product-playground-data";

export type ProductApplicationRouteState = {
  resource: ProductResourceView;
  view: ProductPlaygroundView;
};

const viewRoutePaths: Record<
  Exclude<ProductPlaygroundView, "resources">,
  string
> = {
  assistant: "/app/assistant",
  automation: "/app/automations",
  catalog: "/app/capabilities",
  projects: "/app/projects",
  session: "/sessions/fix-session-recovery",
  start: "/app",
  workbench: "/sessions/fix-session-recovery/workspace",
};

const resourceRoutePaths: Record<ProductResourceView, string> = {
  documents: "/app/resources/documents",
  files: "/app/resources/files",
  inspiration: "/app/resources/inspiration",
  knowledge: "/app/resources/knowledge",
  mail: "/app/resources/mail",
};

export const productApplicationRoutePaths = [
  ...Object.values(viewRoutePaths),
  ...Object.values(resourceRoutePaths),
] as const;

function normalizeProductPath(pathname: string) {
  const withoutDocument = pathname
    .replace(/\/index\.html$/u, "")
    .replace(/\.html$/u, "")
    .replace(/\/$/u, "");
  return withoutDocument.replace(/^\/en(?=\/)/u, "") || "/app";
}

export function getProductApplicationRouteState(
  pathname: string,
): ProductApplicationRouteState {
  const normalizedPath = normalizeProductPath(pathname);

  for (const [resource, routePath] of Object.entries(resourceRoutePaths)) {
    if (normalizedPath === routePath) {
      return {
        resource: resource as ProductResourceView,
        view: "resources",
      };
    }
  }

  for (const [view, routePath] of Object.entries(viewRoutePaths)) {
    if (normalizedPath === routePath) {
      return {
        resource: "files",
        view: view as Exclude<ProductPlaygroundView, "resources">,
      };
    }
  }

  return { resource: "files", view: "start" };
}

export function getProductApplicationRoutePath(
  view: ProductPlaygroundView,
  locale: ProductPlaygroundLocale,
  resource: ProductResourceView = "files",
) {
  const localizedPrefix = locale === "en" ? "/en" : "";
  const routePath =
    view === "resources" ? resourceRoutePaths[resource] : viewRoutePaths[view];
  return `${localizedPrefix}${routePath}.html`;
}
