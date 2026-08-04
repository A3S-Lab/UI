import { useContext, useEffect, type ReactNode } from 'react';
import { ThemeContext, useLocation, useVersion } from '@rspress/core/runtime';

type RootProps = {
  children: ReactNode;
};

export function Root({ children }: RootProps) {
  const location = useLocation();
  const currentVersion = useVersion();
  const { theme, setTheme } = useContext(ThemeContext);

  useEffect(() => {
    const domTheme = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
    let storedTheme: string | null = null;

    try {
      storedTheme = localStorage.getItem('themeMode');
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }

    const reconciledTheme =
      (storedTheme === 'dark' || storedTheme === 'light') &&
      storedTheme === domTheme
        ? storedTheme
        : theme;

    if (reconciledTheme !== theme) {
      setTheme?.(reconciledTheme);
    } else {
      try {
        localStorage.setItem('themeMode', theme);
      } catch {
        // Storage can be unavailable in privacy-restricted browsing contexts.
      }
    }

    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        reconciledTheme === 'dark' ? '#101118' : '#f7f7f8',
      );

    const handleBasecoatThemeChange = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: unknown }>).detail?.mode;
      if ((mode === 'dark' || mode === 'light') && mode !== theme) {
        setTheme?.(mode);
      }
    };

    document.addEventListener(
      'basecoat:themechange',
      handleBasecoatThemeChange,
    );
    return () => {
      document.removeEventListener(
        'basecoat:themechange',
        handleBasecoatThemeChange,
      );
    };
  }, [setTheme, theme]);

  useEffect(() => {
    const syncThemeToggle = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const isChinese = document.documentElement.lang.startsWith('zh');

      document
        .querySelectorAll<HTMLElement>('.rp-switch-appearance')
        .forEach((toggle) => {
          toggle.setAttribute('role', 'button');
          toggle.tabIndex = 0;
          toggle.setAttribute(
            'aria-label',
            isDark
              ? isChinese
                ? '切换到浅色主题'
                : 'Switch to light theme'
              : isChinese
                ? '切换到深色主题'
                : 'Switch to dark theme',
          );
        });
    };

    const stopInactiveSearchShortcut = (event: KeyboardEvent) => {
      if (!(event.target instanceof HTMLElement)) return;

      const themeToggle = event.target.closest<HTMLElement>(
        '.rp-switch-appearance',
      );
      if (themeToggle && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        event.stopPropagation();
        themeToggle.click();
        return;
      }

      if (
        event.key !== 'Enter' ||
        event.isComposing ||
        event.defaultPrevented
      ) {
        return;
      }

      // Rspress 2.0.19 listens for Enter on document even when search is
      // closed. Let interactive controls handle Enter normally, then stop the
      // event before that inactive search listener can read an empty result.
      if (event.target.closest('.rp-search-panel')) return;

      const interactive = event.target.closest(
        [
          'a[href]',
          'button',
          'input',
          'select',
          'textarea',
          'summary',
          '[role="button"]',
          '[role="link"]',
          '[role="menuitem"]',
          '[role="tab"]',
        ].join(', '),
      );

      if (interactive) event.stopPropagation();
    };

    syncThemeToggle();
    const themeObserver = new MutationObserver(syncThemeToggle);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'lang'],
    });
    const modalContainer = document.querySelector('#__rspress_modal_container');
    if (modalContainer) {
      themeObserver.observe(modalContainer, {
        childList: true,
        subtree: true,
      });
    }
    const navigation = document.querySelector('.rp-nav');
    if (navigation) {
      themeObserver.observe(navigation, {
        childList: true,
        subtree: true,
      });
    }

    document.body.addEventListener('keydown', stopInactiveSearchShortcut);
    return () => {
      themeObserver.disconnect();
      document.body.removeEventListener('keydown', stopInactiveSearchShortcut);
    };
  }, []);

  useEffect(() => {
    // Rspress 2.0.19 drops the first path segment from the active default-
    // version link. Other version links are correct; normalize only the
    // current item so desktop and mobile menus always point to this page.
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const candidates = document.querySelectorAll<HTMLAnchorElement>(
      [
        '.rp-hover-group__item--active a[aria-label]',
        '.rp-nav-screen-versions-group__item--active',
      ].join(', '),
    );

    candidates.forEach((link) => {
      const label = link.getAttribute('aria-label') ?? link.textContent?.trim();
      if (label !== currentVersion) return;
      link.href = currentHref;
      link.setAttribute('aria-current', 'page');
    });
  }, [currentVersion, location.pathname, location.search, location.hash]);

  return <>{children}</>;
}
