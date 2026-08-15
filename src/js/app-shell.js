(() => {
  const compactQuery = window.matchMedia('(max-width: 48rem)');
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const defaultLabels = () =>
    document.documentElement.lang.toLowerCase().startsWith('zh')
      ? {
          close: '关闭导航',
          collapse: '折叠导航',
          expand: '展开导航',
          open: '打开导航',
        }
      : {
          close: 'Close navigation',
          collapse: 'Collapse navigation',
          expand: 'Expand navigation',
          open: 'Open navigation',
        };

  const triggerLabel = (trigger, state) => {
    const labels = defaultLabels();
    return trigger.dataset[`appNavigation${state[0].toUpperCase()}${state.slice(1)}Label`] ?? labels[state];
  };

  const initAppShell = (shell) => {
    if (shell.dataset.appShellInitialized) return;

    const navigation = shell.querySelector(':scope > [data-app-navigation]');
    if (!navigation) return;
    const main = shell.querySelector(':scope > [data-app-main]');

    let focusFrame = 0;
    let restoreTarget = null;
    const triggers = () =>
      Array.from(shell.querySelectorAll('[data-app-navigation-trigger]'));
    const isCompact = () => compactQuery.matches;
    const navigationState = () => shell.dataset.navigation || 'expanded';
    const mobileOpen = () =>
      isCompact() && shell.dataset.mobileNavigation === 'open';

    if (!shell.dataset.navigation) shell.dataset.navigation = 'expanded';

    const focusElement = (target) => {
      cancelAnimationFrame(focusFrame);
      focusFrame = 0;
      if (!target) return;
      target.focus({ preventScroll: true });
      if (document.activeElement === target) return;
      focusFrame = requestAnimationFrame(() => {
        target.focus({ preventScroll: true });
      });
    };

    const focusNavigation = () => {
      if (!mobileOpen()) return;
      focusElement(navigation.querySelector(focusableSelector));
    };

    const restoreFocus = () => {
      const target =
        restoreTarget?.isConnected && !restoreTarget.disabled
          ? restoreTarget
          : triggers()[0];
      restoreTarget = null;
      if (!target) return;
      focusElement(target);
    };

    const synchronize = () => {
      const compact = isCompact();
      const hidden = navigationState() === 'hidden';
      const open = compact && !hidden && shell.dataset.mobileNavigation === 'open';
      const unavailable = hidden || (compact && !open);

      if (unavailable) {
        if (
          document.activeElement instanceof HTMLElement &&
          navigation.contains(document.activeElement)
        ) {
          document.activeElement.blur();
        }
        navigation.setAttribute('inert', '');
        navigation.setAttribute('aria-hidden', 'true');
      } else {
        navigation.removeAttribute('inert');
        navigation.removeAttribute('aria-hidden');
      }

      if (open) {
        main?.setAttribute('inert', '');
        main?.setAttribute('aria-hidden', 'true');
      } else {
        main?.removeAttribute('inert');
        main?.removeAttribute('aria-hidden');
      }

      triggers().forEach((trigger) => {
        const expanded = compact ? open : navigationState() === 'expanded';
        const labelState = compact
          ? open
            ? 'close'
            : 'open'
          : expanded
            ? 'collapse'
            : 'expand';
        trigger.setAttribute('aria-expanded', String(expanded));
        trigger.setAttribute('aria-label', triggerLabel(trigger, labelState));
      });
    };

    const emitChange = (source) => {
      shell.dispatchEvent(
        new CustomEvent('a3s:app-navigation-change', {
          detail: {
            mobileOpen: mobileOpen(),
            mode: isCompact() ? 'compact' : 'desktop',
            navigation: navigationState(),
            source,
          },
        }),
      );
    };

    const openMobile = (trigger) => {
      if (navigationState() === 'hidden') return;
      const activeElement = document.activeElement;
      restoreTarget =
        trigger ??
        (activeElement instanceof HTMLElement && !navigation.contains(activeElement)
          ? activeElement
          : null);
      shell.dataset.mobileNavigation = 'open';
      synchronize();
      focusNavigation();
      emitChange('trigger');
    };

    const closeMobile = ({ restore = true, source = 'api' } = {}) => {
      shell.removeAttribute('data-mobile-navigation');
      synchronize();
      if (restore) restoreFocus();
      else restoreTarget = null;
      emitChange(source);
    };

    const setDesktopState = (state, source = 'api') => {
      shell.dataset.navigation = state;
      synchronize();
      emitChange(source);
    };

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest('[data-app-navigation-trigger]');
      if (trigger && shell.contains(trigger)) {
        event.preventDefault();
        if (isCompact()) {
          if (mobileOpen()) closeMobile({ source: 'trigger' });
          else openMobile(trigger);
        } else {
          setDesktopState(
            navigationState() === 'expanded' ? 'collapsed' : 'expanded',
            'trigger',
          );
        }
        return;
      }

      if (!mobileOpen()) return;
      if (navigation.contains(target)) {
        if (
          target.closest('a[href], [data-app-navigation-dismiss]') &&
          !target.closest('[data-app-navigation-keep-open]')
        ) {
          closeMobile({ restore: false, source: 'navigation' });
        }
        return;
      }
      closeMobile({ source: 'backdrop' });
    };

    const handleKeydown = (event) => {
      if (!mobileOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobile({ source: 'escape' });
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        navigation.querySelectorAll(focusableSelector),
      ).filter((element) => !element.closest('[inert]'));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!navigation.contains(document.activeElement)) {
        event.preventDefault();
        focusElement(event.shiftKey ? last : first);
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        focusElement(last);
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    const handleBreakpointChange = () => {
      shell.removeAttribute('data-mobile-navigation');
      restoreTarget = null;
      synchronize();
    };

    const stateObserver = new MutationObserver((mutations) => {
      if (
        mutations.some((mutation) =>
          ['data-mobile-navigation', 'data-navigation'].includes(
            mutation.attributeName,
          ),
        )
      ) {
        synchronize();
      }
    });
    stateObserver.observe(shell, {
      attributeFilter: ['data-mobile-navigation', 'data-navigation'],
      attributes: true,
    });

    shell.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    compactQuery.addEventListener('change', handleBreakpointChange);

    shell.expandNavigation = () => setDesktopState('expanded');
    shell.collapseNavigation = () => setDesktopState('collapsed');
    shell.hideNavigation = () => setDesktopState('hidden');
    shell.openNavigation = () =>
      isCompact() ? openMobile(triggers()[0]) : setDesktopState('expanded');
    shell.closeNavigation = () =>
      isCompact() ? closeMobile() : setDesktopState('collapsed');
    shell.toggleNavigation = () => {
      if (isCompact()) {
        if (mobileOpen()) closeMobile();
        else openMobile(triggers()[0]);
      } else {
        setDesktopState(
          navigationState() === 'expanded' ? 'collapsed' : 'expanded',
        );
      }
    };
    shell.refresh = synchronize;
    shell._destroy = () => {
      cancelAnimationFrame(focusFrame);
      stateObserver.disconnect();
      shell.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
      compactQuery.removeEventListener('change', handleBreakpointChange);
      delete shell.expandNavigation;
      delete shell.collapseNavigation;
      delete shell.hideNavigation;
      delete shell.openNavigation;
      delete shell.closeNavigation;
      delete shell.toggleNavigation;
      delete shell.refresh;
    };

    synchronize();
    shell.dataset.appShellInitialized = 'true';
    shell.dispatchEvent(new CustomEvent('basecoat:initialized'));
  };

  if (window.basecoat) {
    window.basecoat.register('app-shell', {
      selector: '.app-shell:not([data-app-shell-initialized])',
      init: initAppShell,
      refresh: (shell) => shell.refresh?.(),
    });
  }
})();
