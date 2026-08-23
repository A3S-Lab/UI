import {
  removeBase,
  useLang,
  useLocation,
  useNav,
  usePage,
  usePages,
  useSite,
  useVersion,
} from "@rspress/core/runtime";
import type { NavItem } from "@rspress/core";
import { Link } from "@rspress/core/theme";
import {
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
  NavMenuItemWithLink,
  SvgDown,
} from "@rspress/core/dist/theme/components/Nav/NavMenu.js";
import { useLangsMenu } from "@rspress/core/dist/theme/components/Nav/hooks.js";
import "@rspress/core/dist/theme/components/Nav/index.css";
import "@rspress/core/dist/theme/components/NavHamburger/index.css";
import { useEffect, useMemo, useRef } from "react";

function labelSocialLinks(root: ParentNode, language: string) {
  root
    .querySelectorAll<HTMLAnchorElement>(
      '.rp-social-links__item[href="https://github.com/A3S-Lab/UI"]',
    )
    .forEach((link) => {
      link.setAttribute(
        "aria-label",
        language === "zh" ? "在 GitHub 上查看 A3S UI" : "View A3S UI on GitHub",
      );
    });
}

function versionHref(
  pathname: string,
  currentVersion: string,
  targetVersion: string,
  defaultVersion: string,
  cleanUrls: boolean,
  language: string,
  availableRoutes: ReadonlySet<string>,
) {
  const parts = removeBase(pathname).split("/").filter(Boolean);

  if (currentVersion !== defaultVersion && parts[0] === currentVersion) {
    parts.shift();
  }
  if (targetVersion !== defaultVersion) {
    parts.unshift(targetVersion);
  }
  if (parts.length === 1 && targetVersion !== defaultVersion) {
    parts.push(cleanUrls ? "index" : "index.html");
  }
  const requestedHref = parts.length === 0 ? "/" : `/${parts.join("/")}`;
  const normalizeRoute = (route: string) =>
    route.replace(/\.html$/u, "").replace(/\/index$/u, "/");
  if (availableRoutes.has(normalizeRoute(requestedHref))) {
    return requestedHref;
  }

  const rootParts = [
    targetVersion === defaultVersion ? "" : targetVersion,
    language === "zh" ? "" : language,
  ].filter(Boolean);
  const fallbackParts = normalizeRoute(requestedHref)
    .split("/")
    .filter(Boolean);

  while (fallbackParts.length > rootParts.length) {
    fallbackParts.pop();
    const ancestor = `/${fallbackParts.join("/")}/`;
    if (availableRoutes.has(ancestor)) return ancestor;
  }

  return rootParts.length === 0 ? "/" : `/${rootParts.join("/")}/`;
}

type ProgressiveMenuProps = {
  activeMatcher?: (item: NavItem) => boolean;
  items: NavItem[];
  label?: string;
};

function ProgressiveMenuLink({
  activeMatcher,
  depth = 0,
  item,
}: {
  activeMatcher?: (item: NavItem) => boolean;
  depth?: number;
  item: NavItem;
}) {
  if ("items" in item && item.items.length > 0) {
    const active = activeMatcher?.(item) ?? false;
    return (
      <>
        {"link" in item && item.link ? (
          <li
            className={
              active
                ? "a3s-progressive-menu__option is-active"
                : "a3s-progressive-menu__option"
            }
            style={{ paddingInlineStart: `${8 + depth * 10}px` }}
          >
            <Link
              aria-current={active ? "page" : undefined}
              className="a3s-progressive-menu__link"
              href={item.link}
              hrefLang={item.lang}
              lang={item.lang}
              rel={item.rel}
            >
              {item.text}
            </Link>
          </li>
        ) : null}
        {item.items.map((child, index) => (
          <ProgressiveMenuLink
            activeMatcher={activeMatcher}
            depth={depth + 1}
            item={child}
            key={`${child.text ?? "item"}-${index}`}
          />
        ))}
      </>
    );
  }

  if (!("link" in item)) return null;
  const active = activeMatcher?.(item) ?? false;
  const content = item.link ? (
    <Link
      aria-current={active ? "page" : undefined}
      className="a3s-progressive-menu__link"
      download={"download" in item ? item.download : undefined}
      href={item.link}
      hrefLang={item.lang}
      lang={item.lang}
      rel={item.rel}
    >
      {item.text}
    </Link>
  ) : (
    <span aria-current="page" className="a3s-progressive-menu__link">
      {item.text}
    </span>
  );

  return (
    <li
      className={
        active
          ? "a3s-progressive-menu__option is-active"
          : "a3s-progressive-menu__option"
      }
      style={{ paddingInlineStart: `${8 + depth * 10}px` }}
    >
      {content}
    </li>
  );
}

function ProgressiveMenu({
  activeMatcher,
  items,
  label,
}: ProgressiveMenuProps) {
  if (items.length === 0) return null;

  return (
    <li className="rp-nav-menu__item a3s-progressive-menu">
      <details>
        <summary className="rp-nav-menu__item__container">
          <span>{label}</span>
          <SvgDown aria-hidden="true" className="rp-nav-menu__item__icon" />
        </summary>
        <ul className="a3s-progressive-menu__popover">
          {items.map((item, index) => (
            <ProgressiveMenuLink
              activeMatcher={activeMatcher}
              item={item}
              key={`${item.text ?? "item"}-${index}`}
            />
          ))}
        </ul>
      </details>
    </li>
  );
}

function ProgressiveNavMenu({
  menuItems,
  position,
}: {
  menuItems: NavItem[];
  position: "left" | "right";
}) {
  const items = useMemo(
    () => menuItems.filter((item) => (item.position ?? "right") === position),
    [menuItems, position],
  );
  if (items.length === 0) return null;

  return (
    <ul className={`rp-nav-menu rp-nav-menu--${position}`}>
      {items.map((item, index) =>
        "items" in item && item.items.length > 0 ? (
          <ProgressiveMenu
            items={item.items}
            key={`${item.text ?? "menu"}-${index}`}
            label={item.text}
          />
        ) : "link" in item ? (
          <NavMenuItemWithLink
            key={`${item.text}-${item.link}`}
            menuItem={item}
          />
        ) : null,
      )}
    </ul>
  );
}

function NavLanguages() {
  const { activeValue, items } = useLangsMenu();
  return items.length > 1 ? (
    <ProgressiveMenu
      activeMatcher={(item) => item.text === activeValue}
      items={items}
      label={activeValue}
    />
  ) : null;
}

function useVersionMenuItems() {
  const { pathname } = useLocation();
  const { page } = usePage();
  const { pages } = usePages();
  const { site } = useSite();
  const language = useLang();
  const currentVersion = useVersion();
  const defaultVersion = site.multiVersion.default ?? "";
  const versions = site.multiVersion.versions ?? [];
  const availableRoutes = useMemo(
    () => new Set(pages.map((candidate) => candidate.routePath)),
    [pages],
  );
  const items: NavItem[] = versions.map((version) => ({
    text: version,
    link: versionHref(
      page.pageType === "404" ? "/" : pathname,
      currentVersion,
      version,
      defaultVersion,
      site.route?.cleanUrls ?? false,
      language,
      availableRoutes,
    ),
  }));

  return { currentVersion, items };
}

function NavVersions() {
  const { currentVersion, items } = useVersionMenuItems();

  return items.length > 1 ? (
    <ProgressiveMenu
      activeMatcher={(item) => item.text === currentVersion}
      items={items}
      label={currentVersion}
    />
  ) : null;
}

function isVisibleControl(element: HTMLElement, screen: HTMLElement) {
  const clippedGroup = element.closest<HTMLElement>(
    ".rp-nav-screen-menu-item__group, .rp-nav-screen-langs-group, .rp-nav-screen-versions-group",
  );
  if (clippedGroup && clippedGroup.getBoundingClientRect().height < 2) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const bounds = element.getBoundingClientRect();
  return (
    screen.contains(element) &&
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

function ResponsiveNavigationItems({ items }: { items: NavItem[] }) {
  return (
    <ul className="a3s-responsive-navigation__list">
      {items.map((item, index) => {
        const key = `${item.text ?? "item"}-${index}`;
        if ("items" in item && item.items.length > 0) {
          return (
            <li key={key}>
              <details
                className="a3s-responsive-navigation__group"
                suppressHydrationWarning
              >
                <summary role="button">
                  <span>{item.text}</span>
                  <SvgDown aria-hidden="true" />
                </summary>
                <ResponsiveNavigationItems items={item.items} />
              </details>
            </li>
          );
        }

        if (!("link" in item)) return null;
        return (
          <li key={key}>
            {item.link ? (
              <Link
                className="a3s-responsive-navigation__link"
                download={"download" in item ? item.download : undefined}
                href={item.link}
                hrefLang={item.lang}
                lang={item.lang}
                rel={item.rel}
              >
                {item.text}
              </Link>
            ) : (
              <span
                aria-current="page"
                className="a3s-responsive-navigation__link is-current"
              >
                {item.text}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ResponsivePreferenceMenu({
  activeValue,
  items,
  kind,
  label,
}: {
  activeValue: string;
  items: NavItem[];
  kind: "language" | "version";
  label: string;
}) {
  return (
    <details
      className="a3s-responsive-navigation__preference"
      data-preference={kind}
      suppressHydrationWarning
    >
      <summary role="button">
        <span>{label}</span>
        <strong>{activeValue}</strong>
        <SvgDown aria-hidden="true" />
      </summary>
      <ResponsiveNavigationItems items={items} />
    </details>
  );
}

function NavHamburger({ menuItems }: { menuItems: NavItem[] }) {
  const language = useLang();
  const { pathname } = useLocation();
  const { activeValue: activeLanguage, items: languageItems } = useLangsMenu();
  const { currentVersion, items: versionItems } = useVersionMenuItems();
  const navigation = useRef<HTMLDetailsElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const routeRef = useRef(pathname);
  const openLabel =
    language === "zh" ? "打开主导航" : "Open primary navigation";
  const closeLabel =
    language === "zh" ? "关闭主导航" : "Close primary navigation";
  const navigationLabel = language === "zh" ? "站点导航" : "Site navigation";

  useEffect(() => {
    if (routeRef.current === pathname) return;
    routeRef.current = pathname;
    if (navigation.current) navigation.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const root = navigation.current;
    const screen = surface.current;
    const trigger = root?.querySelector<HTMLElement>(":scope > summary");
    if (!root || !screen || !trigger) return;

    labelSocialLinks(screen, language);
    const focusableControls = () =>
      Array.from(
        screen.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), summary, [tabindex="0"]',
        ),
      ).filter((element) => isVisibleControl(element, screen));

    const synchronize = () => {
      trigger.setAttribute("aria-expanded", String(root.open));
      trigger.setAttribute("aria-label", root.open ? closeLabel : openLabel);
      screen.setAttribute("aria-hidden", String(!root.open));
      screen.toggleAttribute("inert", !root.open);
      if (root.open) {
        window.requestAnimationFrame(() => focusableControls()[0]?.focus());
      }
    };
    const close = (restoreFocus = true) => {
      if (!root.open) return;
      root.open = false;
      if (restoreFocus) trigger.focus();
    };
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target === screen || target.closest("a[href]")) close(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !root.open) return;

      const focusable = focusableControls();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const desktopQuery = window.matchMedia("(min-width: 1281px)");
    const closeAtDesktop = () => {
      if (desktopQuery.matches) close(false);
    };
    const disclosureCleanups = Array.from(
      screen.querySelectorAll<HTMLDetailsElement>("details"),
    ).map((disclosure, index) => {
      const summary = disclosure.querySelector<HTMLElement>(":scope > summary");
      const panel = summary?.nextElementSibling;
      if (!summary || !(panel instanceof HTMLElement)) return () => {};

      panel.id ||= `a3s-responsive-navigation-disclosure-${index}`;
      summary.setAttribute("aria-controls", panel.id);
      const synchronizeDisclosure = () =>
        summary.setAttribute("aria-expanded", String(disclosure.open));
      disclosure.addEventListener("toggle", synchronizeDisclosure);
      synchronizeDisclosure();
      return () =>
        disclosure.removeEventListener("toggle", synchronizeDisclosure);
    });

    root.addEventListener("toggle", synchronize);
    screen.addEventListener("click", handleClick);
    screen.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", closeAtDesktop);
    synchronize();

    return () => {
      root.removeEventListener("toggle", synchronize);
      screen.removeEventListener("click", handleClick);
      screen.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", closeAtDesktop);
      disclosureCleanups.forEach((cleanup) => cleanup());
      screen.removeAttribute("inert");
    };
  }, [closeLabel, language, openLabel]);

  return (
    <details
      className="a3s-responsive-navigation"
      ref={navigation}
      suppressHydrationWarning
    >
      <summary
        aria-controls="a3s-ui-mobile-navigation"
        aria-label={openLabel}
        className="rp-nav-hamburger rp-nav-hamburger__sm rp-nav-hamburger__md"
        role="button"
      >
        <SvgWrapper icon={IconSmallMenu} />
      </summary>
      <div
        aria-label={navigationLabel}
        aria-modal="true"
        className="rp-nav-screen rp-nav-screen--open a3s-responsive-navigation__surface"
        id="a3s-ui-mobile-navigation"
        ref={surface}
        role="dialog"
      >
        <div className="rp-nav-screen__container a3s-responsive-navigation__container">
          <nav aria-label={navigationLabel}>
            <ResponsiveNavigationItems items={menuItems} />
          </nav>
          <div className="rp-nav-screen-divider" />
          <div className="a3s-responsive-navigation__appearance">
            <span>{language === "zh" ? "主题" : "Theme"}</span>
            <SwitchAppearance />
          </div>
          <ResponsivePreferenceMenu
            activeValue={activeLanguage ?? language}
            items={languageItems}
            kind="language"
            label={language === "zh" ? "语言" : "Language"}
          />
          <ResponsivePreferenceMenu
            activeValue={currentVersion}
            items={versionItems}
            kind="version"
            label={language === "zh" ? "版本" : "Versions"}
          />
          <div className="rp-nav-screen-divider" />
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
  const language = useLang();

  useEffect(() => {
    labelSocialLinks(document, language);
  }, [language]);

  useEffect(() => {
    const mobileSearch = document.querySelector<HTMLElement>(
      ".rp-search-button--mobile",
    );
    if (!mobileSearch) return;

    mobileSearch.setAttribute(
      "aria-label",
      language === "zh" ? "搜索文档" : "Search documentation",
    );
    mobileSearch.setAttribute("role", "button");
    mobileSearch.tabIndex = 0;

    const activateWithKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      mobileSearch.click();
    };
    mobileSearch.addEventListener("keydown", activateWithKeyboard);
    return () =>
      mobileSearch.removeEventListener("keydown", activateWithKeyboard);
  }, [language]);

  useEffect(() => {
    const stopClosedSearchEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !(event.target instanceof HTMLElement)) {
        return;
      }
      if (event.target.closest(".rp-search-panel__modal")) return;

      const interactive = event.target.closest(
        'a[href], button, input, select, textarea, summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
      );
      if (interactive) event.stopPropagation();
    };

    document.body.addEventListener("keydown", stopClosedSearchEnter);
    return () =>
      document.body.removeEventListener("keydown", stopClosedSearchEnter);
  }, []);

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
        <ProgressiveNavMenu menuItems={navList} position="right" />
        <div className="rp-nav__others">
          <NavMenuDivider />
          <NavLanguages />
          <NavVersions />
          <SwitchAppearance />
          <SocialLinks />
        </div>
        <NavHamburger menuItems={navList} />
        {afterNavMenu}
      </div>
    </header>
  );
}
