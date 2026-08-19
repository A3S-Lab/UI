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

const canonicalViewRoutePaths: Record<
  Exclude<ProductPlaygroundView, "resources">,
  string
> = {
  assistant: "/playground/assistant",
  automation: "/playground/automations",
  catalog: "/playground/capabilities",
  "created-session": "/playground/sessions/current",
  marketplace: "/playground/extensions",
  memory: "/playground/memory",
  project: "/playground/projects/a3s-ui-experience",
  "project-session":
    "/playground/projects/a3s-ui-experience/sessions/release-readiness",
  projects: "/playground/projects",
  session: "/playground/sessions/fix-session-recovery",
  start: "/playground",
};

const canonicalResourceRoutePaths: Record<ProductResourceView, string> = {
  documents: "/playground/resources/documents",
  files: "/playground/resources/files",
  inspiration: "/playground/resources/inspiration",
  knowledge: "/playground/resources/knowledge",
  mail: "/playground/resources/mail",
};

const legacyViewRoutePaths: Partial<
  Record<Exclude<ProductPlaygroundView, "resources">, readonly string[]>
> = {
  assistant: ["/app/assistant"],
  automation: ["/app/automations"],
  catalog: ["/app/capabilities"],
  "created-session": ["/sessions/current"],
  marketplace: ["/app/extensions", "/app/plugins"],
  memory: ["/app/memory"],
  project: ["/app/projects/a3s-ui-experience"],
  "project-session": [
    "/app/projects/a3s-ui-experience/sessions/release-readiness",
  ],
  projects: ["/app/projects"],
  session: [
    "/sessions/fix-session-recovery",
    "/sessions/fix-session-recovery/workspace",
  ],
  start: ["/app"],
};

const legacyResourceRoutePaths: Record<ProductResourceView, readonly string[]> =
  {
    documents: ["/app/resources/documents"],
    files: ["/app/resources/files"],
    inspiration: ["/app/resources/inspiration"],
    knowledge: ["/app/resources/knowledge"],
    mail: ["/app/resources/mail"],
  };

const canonicalProductRoutePaths = [
  ...Object.values(canonicalViewRoutePaths),
  ...Object.values(canonicalResourceRoutePaths),
];

const legacyProductRoutePaths = [
  ...Object.values(legacyViewRoutePaths).flatMap((paths) => paths ?? []),
  ...Object.values(legacyResourceRoutePaths).flatMap((paths) => paths),
];

// The standalone page plugin registers the root Playground separately so the
// canonical root does not appear twice in the generated route table.
export const productApplicationRoutePaths = [
  ...canonicalProductRoutePaths.filter((path) => path !== "/playground"),
  ...legacyProductRoutePaths,
] as const;

function normalizeProductPath(pathname: string) {
  const withoutDocument = pathname
    .replace(/\/index\.html$/u, "")
    .replace(/\.html$/u, "")
    .replace(/\/$/u, "");
  return withoutDocument.replace(/^\/en(?=\/)/u, "") || "/playground";
}

function localizedPath(path: string, locale: ProductPlaygroundLocale) {
  return `${locale === "en" ? "/en" : ""}${path}.html`;
}

export function getProductApplicationRouteState(
  pathname: string,
): ProductApplicationRouteState {
  const normalizedPath = normalizeProductPath(pathname);

  for (const [resource, routePath] of Object.entries(
    canonicalResourceRoutePaths,
  )) {
    if (
      normalizedPath === routePath ||
      legacyResourceRoutePaths[resource as ProductResourceView].includes(
        normalizedPath,
      )
    ) {
      return {
        resource: resource as ProductResourceView,
        view: "resources",
      };
    }
  }

  for (const [view, routePath] of Object.entries(canonicalViewRoutePaths)) {
    if (
      normalizedPath === routePath ||
      legacyViewRoutePaths[
        view as Exclude<ProductPlaygroundView, "resources">
      ]?.includes(normalizedPath)
    ) {
      return {
        resource: "files",
        view: view as Exclude<ProductPlaygroundView, "resources">,
      };
    }
  }

  return { resource: "files", view: "start" };
}

export function isLegacyProductApplicationRoute(pathname: string) {
  return legacyProductRoutePaths.includes(normalizeProductPath(pathname));
}

export function getProductApplicationRoutePath(
  view: ProductPlaygroundView,
  locale: ProductPlaygroundLocale,
  resource: ProductResourceView = "files",
) {
  const routePath =
    view === "resources"
      ? canonicalResourceRoutePaths[resource]
      : canonicalViewRoutePaths[view];
  return localizedPath(routePath, locale);
}

export function getCanonicalProductApplicationRoutePath(
  pathname: string,
  locale: ProductPlaygroundLocale,
) {
  const state = getProductApplicationRouteState(pathname);
  return getProductApplicationRoutePath(state.view, locale, state.resource);
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
