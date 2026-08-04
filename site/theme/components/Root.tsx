import { useContext, useEffect, type ReactNode } from 'react';
import { ThemeContext, useLocation, useVersion } from '@rspress/core/runtime';

type RootProps = {
  children: ReactNode;
};

export function Root({ children }: RootProps) {
  const location = useLocation();
  const currentVersion = useVersion();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    try {
      localStorage.setItem('themeMode', theme);
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }

    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#101118' : '#f7f7f8');
  }, [theme]);

  useEffect(() => {
    const sidebarQuery = window.matchMedia('(max-width: 768px)');
    const outlineQuery = window.matchMedia('(max-width: 1279px)');
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'summary',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const synchronizePanel = (
      panel: HTMLElement | null,
      trigger: HTMLElement | null,
      hidden: boolean,
      id: string,
    ) => {
      if (!panel) return;

      const wasHidden = panel.inert;
      panel.id ||= id;
      panel.inert = hidden;
      if (hidden) panel.setAttribute('aria-hidden', 'true');
      else panel.removeAttribute('aria-hidden');

      if (trigger) {
        trigger.setAttribute('aria-controls', panel.id);
        trigger.setAttribute('aria-expanded', String(!hidden));
      }

      if (hidden && !wasHidden && panel.contains(document.activeElement)) {
        trigger?.focus();
      } else if (!hidden && wasHidden && trigger === document.activeElement) {
        requestAnimationFrame(() => {
          panel.querySelector<HTMLElement>(focusableSelector)?.focus();
        });
      }
    };

    const syncDocumentationControls = () => {
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

      document
        .querySelectorAll<HTMLElement>('.rp-search-button--mobile')
        .forEach((searchButton) => {
          searchButton.setAttribute('role', 'button');
          searchButton.setAttribute('aria-haspopup', 'dialog');
          searchButton.setAttribute(
            'aria-label',
            isChinese ? '搜索文档' : 'Search documentation',
          );
          searchButton.tabIndex = 0;
        });

      const sidebar = document.querySelector<HTMLElement>(
        '.rp-doc-layout__sidebar',
      );
      const sidebarTrigger = document.querySelector<HTMLElement>(
        '.rp-sidebar-menu__left',
      );
      synchronizePanel(
        sidebar,
        sidebarTrigger,
        sidebarQuery.matches &&
          !sidebar?.classList.contains('rp-doc-layout__sidebar--open'),
        'rspress-documentation-sidebar',
      );

      const outline = document.querySelector<HTMLElement>(
        '.rp-doc-layout__outline',
      );
      const outlineTrigger = document.querySelector<HTMLElement>(
        '.rp-sidebar-menu__right',
      );
      synchronizePanel(
        outline,
        outlineTrigger,
        outlineQuery.matches &&
          !outline?.classList.contains('rp-doc-layout__outline--open'),
        'rspress-documentation-outline',
      );
    };

    const handleDocumentationKeyboard = (event: KeyboardEvent) => {
      if (!(event.target instanceof HTMLElement)) return;

      const keyboardControl = event.target.closest<HTMLElement>(
        '.rp-switch-appearance, .rp-search-button--mobile',
      );
      if (keyboardControl && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        event.stopPropagation();
        keyboardControl.click();
        return;
      }

      if (event.key === 'Escape') {
        const openSidebar = document.querySelector<HTMLElement>(
          '.rp-doc-layout__sidebar--open',
        );
        const openOutline = document.querySelector<HTMLElement>(
          '.rp-doc-layout__outline--open',
        );

        if (openOutline) {
          event.preventDefault();
          event.stopPropagation();
          document
            .querySelector<HTMLElement>('.rp-sidebar-menu__right')
            ?.click();
          return;
        }

        if (openSidebar) {
          event.preventDefault();
          event.stopPropagation();
          document
            .querySelector<HTMLElement>('.rp-sidebar-menu__mask')
            ?.click();
          return;
        }
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

    syncDocumentationControls();
    const themeObserver = new MutationObserver(syncDocumentationControls);
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
    const documentationLayout = document.querySelector('.rp-doc-layout');
    if (documentationLayout) {
      themeObserver.observe(documentationLayout, {
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
        subtree: true,
      });
    }

    sidebarQuery.addEventListener('change', syncDocumentationControls);
    outlineQuery.addEventListener('change', syncDocumentationControls);

    document.body.addEventListener('keydown', handleDocumentationKeyboard);
    return () => {
      themeObserver.disconnect();
      sidebarQuery.removeEventListener('change', syncDocumentationControls);
      outlineQuery.removeEventListener('change', syncDocumentationControls);
      document.body.removeEventListener('keydown', handleDocumentationKeyboard);
    };
  }, [location.pathname]);

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
