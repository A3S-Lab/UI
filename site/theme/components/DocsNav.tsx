import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
      <details
        className="docs-switcher"
        data-switcher="language"
        name="docs-preference-switcher"
      >
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

      <details
        className="docs-switcher"
        data-switcher="version"
        name="docs-preference-switcher"
      >
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

function DesktopUtilityNavigation({ items }: { items: NavigationItem[] }) {
  const location = useLocation();
  const menuItems = items.filter((item) => {
    const position = "position" in item ? item.position : undefined;
    return (position ?? "right") === "right";
  });

  if (menuItems.length === 0) return null;

  return (
    <ul className="rp-nav-menu rp-nav-menu--right docs-desktop-utilities">
      {menuItems.map((item, index) => {
        if ("items" in item && Array.isArray(item.items)) {
          return (
            <li className="rp-nav-menu__item" key={`${item.text}-${index}`}>
              <details
                className="docs-desktop-navigation"
                key={`${item.text}-${location.pathname}`}
                name="docs-desktop-navigation"
              >
                <summary className="rp-nav-menu__item__container">
                  <span>{item.text}</span>
                  <SvgWrapper icon={IconArrowDown} />
                </summary>
                <div className="docs-desktop-navigation__panel">
                  {item.items.map((child, childIndex) =>
                    "link" in child && typeof child.link === "string" ? (
                      <MobileNavigationLink
                        key={`${child.text}-${childIndex}`}
                        item={child as NavigationItem}
                        href={navigationHref(child.link)}
                        onNavigate={() => undefined}
                      />
                    ) : null,
                  )}
                </div>
              </details>
            </li>
          );
        }

        return "link" in item && typeof item.link === "string" ? (
          <li className="rp-nav-menu__item" key={`${item.text}-${index}`}>
            <MobileNavigationLink
              item={item}
              href={navigationHref(item.link)}
              onNavigate={() => undefined}
            />
          </li>
        ) : null;
      })}
    </ul>
  );
}

function MobileNavigationLink({
  item,
  href,
  onNavigate,
}: {
  item: NavigationItem;
  href: string;
  onNavigate: () => void;
}) {
  const target =
    "target" in item && typeof item.target === "string"
      ? item.target
      : undefined;

  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noreferrer" : undefined}
      onClick={onNavigate}
    >
      {item.text}
    </a>
  );
}

function CloseNavigationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MobileNavigation({ items }: { items: NavigationItem[] }) {
  const currentLang = useLang();
  const location = useLocation();
  const { site } = useSite();
  const isChinese = currentLang === site.lang;
  const panelId = useId();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  const closeNavigation = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setOpen(false);
  }, []);

  const openNavigation = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setOpen(true);
  };

  useEffect(() => {
    closeNavigation();
  }, [closeNavigation, location.pathname]);

  return (
    <>
      <button
        type="button"
        className="docs-mobile-navigation__trigger"
        aria-controls={panelId}
        aria-expanded={open}
        aria-label={isChinese ? "打开主导航" : "Open navigation"}
        onClick={openNavigation}
      >
        <SvgWrapper icon={IconSmallMenu} />
      </button>
      <dialog
        ref={dialogRef}
        id={panelId}
        className="docs-mobile-navigation"
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          closeNavigation();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeNavigation();
        }}
        onClose={() => setOpen(false)}
      >
        <div className="docs-mobile-navigation__panel">
          <header>
            <strong id={titleId}>
              {isChinese ? "浏览与设置" : "Browse and settings"}
            </strong>
            <button
              type="button"
              aria-label={isChinese ? "关闭主导航" : "Close navigation"}
              onClick={closeNavigation}
            >
              <CloseNavigationIcon />
            </button>
          </header>
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
                          onNavigate={closeNavigation}
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
                  onNavigate={closeNavigation}
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
      </dialog>
    </>
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
        {afterNavTitle}
      </div>
      <div className="rp-nav__right">
        {beforeNavMenu}
        <Search />
        <NavMenu menuItems={navList} position="left" />
        <DesktopUtilityNavigation items={navList} />
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
