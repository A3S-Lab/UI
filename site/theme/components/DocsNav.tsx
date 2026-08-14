import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  removeBase,
  useLang,
  useLocation,
  useNav,
  usePages,
  useSite,
  useVersion,
  withBase,
} from "@rspress/core/runtime";
import {
  IconArrowDown,
  IconSmallMenu,
  NavTitle,
  Search,
  SocialLinks,
  SvgWrapper,
  SwitchAppearance,
  type NavProps,
} from "@rspress/core/theme-original";
import {
  NavMenu,
  NavMenuDivider,
} from "@rspress/core/dist/theme/components/Nav/NavMenu.js";
import {
  findPageByRoutePath,
  resolveLanguageRoutePath,
  resolveVersionRoutePath,
  type VersionedPage,
} from "../../version-routing";
import "@rspress/core/dist/theme/components/Nav/index.css";
import "./DocsNav.css";

type NavigationItem = ReturnType<typeof useNav>[number];

function versionLabel(version: string, isChinese: boolean) {
  if (version === "next") return isChinese ? "开发版" : "Next";
  return version;
}

function routeWithBase(routePath: string) {
  const normalized = routePath.startsWith("/") ? routePath : `/${routePath}`;
  const staticRoute =
    normalized === "/" ||
    normalized.endsWith("/") ||
    normalized.endsWith(".html")
      ? normalized
      : `${normalized}.html`;
  return withBase(staticRoute);
}

function DocsSwitchers({ compact = false }: { compact?: boolean }) {
  const currentLang = useLang();
  const currentVersion = useVersion();
  const location = useLocation();
  const { pages } = usePages();
  const { site } = useSite();
  const isChinese = currentLang === site.lang;
  const currentPage = findPageByRoutePath(
    pages as VersionedPage[],
    removeBase(location.pathname),
  );
  const locales = Object.values(site.locales ?? {});
  const versions = site.multiVersion.versions ?? [];

  if (!currentPage) return null;

  const defaults = {
    defaultLang: site.lang,
    defaultVersion: site.multiVersion.default,
  };
  const currentLocale = locales.find((locale) => locale.lang === currentLang);
  const suffix = `${location.search}${location.hash}`;

  return (
    <div className="docs-switchers" data-compact={compact || undefined}>
      <details className="docs-switcher" data-switcher="language">
        <summary
          aria-label={
            isChinese ? "切换文档语言" : "Switch documentation language"
          }
        >
          <span>{currentLocale?.label ?? currentLang}</span>
          <SvgWrapper icon={IconArrowDown} />
        </summary>
        <div className="docs-switcher__menu">
          {locales.map((locale) => {
            const routePath = resolveLanguageRoutePath(
              pages as VersionedPage[],
              currentPage,
              locale.lang,
              defaults,
            );
            const isCurrent = locale.lang === currentLang;
            return (
              <a
                key={locale.lang}
                href={`${routeWithBase(routePath)}${suffix}`}
                hrefLang={locale.lang}
                lang={locale.lang}
                rel="alternate"
                aria-current={isCurrent ? "page" : undefined}
              >
                {locale.label}
              </a>
            );
          })}
        </div>
      </details>

      <details className="docs-switcher" data-switcher="version">
        <summary
          aria-label={
            isChinese ? "切换文档版本" : "Switch documentation version"
          }
        >
          <span>{versionLabel(currentVersion, isChinese)}</span>
          <SvgWrapper icon={IconArrowDown} />
        </summary>
        <div className="docs-switcher__menu">
          {versions.map((version) => {
            const routePath = resolveVersionRoutePath(
              pages as VersionedPage[],
              currentPage,
              version,
              defaults,
            );
            const isCurrent = version === currentVersion;
            return (
              <a
                key={version}
                href={`${routeWithBase(routePath)}${suffix}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {versionLabel(version, isChinese)}
              </a>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function navigationHref(href: string) {
  if (/^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("#")) return href;
  if (!href.startsWith("/")) return href;
  return routeWithBase(href);
}

function MobileNavigationLink({
  item,
  href,
}: {
  item: NavigationItem;
  href: string;
}) {
  const target =
    "target" in item && typeof item.target === "string"
      ? item.target
      : undefined;

  return (
    <a href={href} target={target}>
      {item.text}
    </a>
  );
}

function MobileNavigation({ items }: { items: NavigationItem[] }) {
  const currentLang = useLang();
  const { site } = useSite();
  const isChinese = currentLang === site.lang;
  const panelId = useId();
  const [open, setOpen] = useState(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key !== "Escape") return;
    const details = event.currentTarget;
    if (!details.open) return;
    details.open = false;
    setOpen(false);
    details.querySelector<HTMLElement>("summary")?.focus();
  };

  return (
    <details
      className="docs-mobile-navigation"
      open={open}
      onKeyDown={handleKeyDown}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        role="button"
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={
          open
            ? isChinese
              ? "关闭主导航"
              : "Close navigation"
            : isChinese
              ? "打开主导航"
              : "Open navigation"
        }
      >
        <SvgWrapper icon={IconSmallMenu} />
      </summary>
      <div
        id={panelId}
        className="docs-mobile-navigation__panel"
        aria-hidden={!open}
      >
        <nav aria-label={isChinese ? "主导航" : "Primary navigation"}>
          {items.map((item, index) => {
            if ("items" in item && Array.isArray(item.items)) {
              return (
                <section key={`${item.text}-${index}`}>
                  <strong>{item.text}</strong>
                  {item.items.map((child, childIndex) =>
                    "link" in child && typeof child.link === "string" ? (
                      <MobileNavigationLink
                        key={`${child.text}-${childIndex}`}
                        item={child as NavigationItem}
                        href={navigationHref(child.link)}
                      />
                    ) : null,
                  )}
                </section>
              );
            }

            return "link" in item && typeof item.link === "string" ? (
              <MobileNavigationLink
                key={`${item.text}-${index}`}
                item={item}
                href={navigationHref(item.link)}
              />
            ) : null;
          })}
        </nav>
        <DocsSwitchers compact />
        <div className="docs-mobile-navigation__utilities">
          <SwitchAppearance />
          <SocialLinks />
        </div>
      </div>
    </details>
  );
}

export function Nav({
  beforeNavTitle,
  afterNavTitle,
  beforeNavMenu,
  afterNavMenu,
  navTitle,
}: NavProps) {
  const navList = useNav();

  return (
    <header className="rp-nav">
      <div className="rp-nav__left">
        {beforeNavTitle}
        {navTitle ?? <NavTitle />}
        <NavMenu menuItems={navList} position="left" />
        {afterNavTitle}
      </div>
      <div className="rp-nav__right">
        {beforeNavMenu}
        <Search />
        <NavMenu menuItems={navList} position="right" />
        <div className="rp-nav__others">
          <NavMenuDivider />
          <DocsSwitchers />
          <SwitchAppearance />
          <SocialLinks />
        </div>
        <MobileNavigation items={navList} />
        {afterNavMenu as ReactNode}
      </div>
    </header>
  );
}
