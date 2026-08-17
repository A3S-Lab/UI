import type {
  ProductCapabilityTab,
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
  "created-session": "/sessions/current",
  project: "/app/projects/a3s-ui-experience",
  "project-session":
    "/app/projects/a3s-ui-experience/sessions/release-readiness",
  projects: "/app/projects",
  session: "/sessions/fix-session-recovery",
  start: "/app",
};

const legacySessionRoutePaths = [
  "/sessions/fix-session-recovery/workspace",
] as const;

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
  ...legacySessionRoutePaths,
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

  if (
    legacySessionRoutePaths.some((routePath) => routePath === normalizedPath)
  ) {
    return { resource: "files", view: "session" };
  }

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

export function getProductCapabilityTab(search: string): ProductCapabilityTab {
  const capability = new URLSearchParams(search).get("capability");
  return capability === "skills" || capability === "connectors"
    ? capability
    : "assistants";
}

export function getProductCapabilityRoutePath(
  tab: ProductCapabilityTab,
  locale: ProductPlaygroundLocale,
) {
  const routePath = getProductApplicationRoutePath("catalog", locale);
  return `${routePath}?capability=${tab}`;
}
