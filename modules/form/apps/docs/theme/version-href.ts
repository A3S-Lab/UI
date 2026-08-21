export interface ResolveVersionHrefOptions {
  href: string;
  pathname: string;
  base: string;
  currentVersion: string;
  defaultVersion: string;
  versions: readonly string[];
  currentLang: string;
  defaultLang: string;
  routePaths: ReadonlySet<string>;
}

function normalizeRoutePath(rawPath: string, base: string): string | null {
  if (!rawPath.startsWith('/')) return null;

  const pathWithoutQuery = rawPath.split(/[?#]/u, 1)[0] ?? '/';
  const normalizedBase = base === '/' ? '/' : `/${base.split('/').filter(Boolean).join('/')}/`;
  let routePath = pathWithoutQuery;

  if (normalizedBase !== '/' && routePath.startsWith(normalizedBase)) {
    routePath = `/${routePath.slice(normalizedBase.length)}`;
  }

  routePath = routePath.replace(/\/index\.html$/u, '/').replace(/\.html$/u, '');
  if (!routePath.startsWith('/')) routePath = `/${routePath}`;
  if (routePath.length > 1 && routePath.endsWith('/')) routePath = routePath.slice(0, -1);
  return routePath || '/';
}

function routeForVersion(
  currentRoute: string,
  currentVersion: string,
  targetVersion: string,
  defaultVersion: string,
): string {
  const parts = currentRoute.split('/').filter(Boolean);
  const versionParts: string[] = [];

  if (targetVersion !== defaultVersion) {
    versionParts.push(targetVersion);
    if (currentVersion !== defaultVersion) parts.shift();
  } else if (currentVersion !== defaultVersion) {
    parts.shift();
  }

  return `/${[...versionParts, ...parts].join('/')}`;
}

function versionHome(
  targetVersion: string,
  defaultVersion: string,
  currentLang: string,
  defaultLang: string,
): string {
  const parts: string[] = [];
  if (targetVersion !== defaultVersion) parts.push(targetVersion);
  if (currentLang && currentLang !== defaultLang) parts.push(currentLang);
  return parts.length > 0 ? `/${parts.join('/')}/` : '/';
}

export function resolveVersionHref({
  href,
  pathname,
  base,
  currentVersion,
  defaultVersion,
  versions,
  currentLang,
  defaultLang,
  routePaths,
}: ResolveVersionHrefOptions): string {
  const hrefRoute = normalizeRoutePath(href, base);
  const currentRoute = normalizeRoutePath(pathname, base);
  if (!hrefRoute || !currentRoute) return href;

  const normalizedRoutes = new Set(
    [...routePaths]
      .map((routePath) => normalizeRoutePath(routePath, base))
      .filter((routePath): routePath is string => routePath !== null),
  );

  for (const targetVersion of versions) {
    if (targetVersion === currentVersion) continue;
    const targetRoute = routeForVersion(
      currentRoute,
      currentVersion,
      targetVersion,
      defaultVersion,
    );
    if (hrefRoute !== targetRoute) continue;
    if (normalizedRoutes.has(targetRoute)) return href;
    return versionHome(targetVersion, defaultVersion, currentLang, defaultLang);
  }

  return href;
}
