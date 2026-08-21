import { useLocation, usePage, usePages, useSite, useVersion } from '@rspress/core/runtime';
import { type LinkProps, Link as OriginalLink } from '@rspress/core/theme-original';
import { forwardRef, useMemo } from 'react';
import { resolveVersionHref } from './version-href';

export const Link = forwardRef<HTMLAnchorElement, LinkProps>((props, ref) => {
  const { href = '/', ...rest } = props;
  const { pathname } = useLocation();
  const { page } = usePage();
  const { pages } = usePages();
  const { site } = useSite();
  const currentVersion = useVersion();

  const resolvedHref = useMemo(
    () =>
      resolveVersionHref({
        href,
        pathname,
        base: site.base,
        currentVersion,
        defaultVersion: site.multiVersion.default,
        versions: site.multiVersion.versions,
        currentLang: page.lang,
        defaultLang: site.lang,
        routePaths: new Set(pages.map((entry) => entry.routePath)),
      }),
    [
      currentVersion,
      href,
      page.lang,
      pages,
      pathname,
      site.base,
      site.lang,
      site.multiVersion.default,
      site.multiVersion.versions,
    ],
  );

  return <OriginalLink {...rest} href={resolvedHref} ref={ref} />;
});

Link.displayName = 'Link';
