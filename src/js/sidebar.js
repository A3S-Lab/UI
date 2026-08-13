(() => {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const initSidebar = (sidebarComponent) => {
    if (sidebarComponent.dataset.sidebarInitialized && typeof sidebarComponent.toggle === 'function') return;

    const initialOpen = sidebarComponent.dataset.initialOpen !== 'false';
    const initialMobileOpen = sidebarComponent.dataset.initialMobileOpen === 'true';
    const breakpoint = parseInt(sidebarComponent.dataset.breakpoint) || 768;
    const breakpointQuery = breakpoint > 0
      ? window.matchMedia(`(min-width: ${breakpoint}px)`)
      : null;
    const isDesktop = () => !breakpointQuery || breakpointQuery.matches;

    let desktopOpen = initialOpen;
    let mobileOpen = initialMobileOpen;
    let open = isDesktop() ? desktopOpen : mobileOpen;
    let focusFrame = 0;
    let restoreTarget = null;

    const focusNavigation = () => {
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(() => {
        if (!open || isDesktop()) return;
        const target = sidebarComponent
          .querySelector('nav')
          ?.querySelector(focusableSelector);
        target?.focus({ preventScroll: true });
      });
    };

    const updateState = ({ focus = false, restore = false } = {}) => {
      const activeElement = document.activeElement;
      if (!open && activeElement instanceof HTMLElement && sidebarComponent.contains(activeElement)) {
        activeElement.blur();
      }
      sidebarComponent.setAttribute('aria-hidden', String(!open));
      if (open) {
        sidebarComponent.removeAttribute('inert');
      } else {
        sidebarComponent.setAttribute('inert', '');
      }
      if (focus) focusNavigation();
      if (!open && restore && restoreTarget?.isConnected) {
        const target = restoreTarget;
        requestAnimationFrame(() => target.focus({ preventScroll: true }));
      }
      if (!open) restoreTarget = null;
    };

    const setState = (state, { focus = false, restore = false } = {}) => {
      const nextOpen = Boolean(state);
      if (isDesktop()) desktopOpen = nextOpen;
      else mobileOpen = nextOpen;
      if (nextOpen && !open && !isDesktop()) {
        const activeElement = document.activeElement;
        restoreTarget = activeElement instanceof HTMLElement
          && !sidebarComponent.contains(activeElement)
          ? activeElement
          : null;
      }
      open = nextOpen;
      updateState({ focus: focus && !isDesktop(), restore });
    };

    sidebarComponent.open = () => setState(true, { focus: true });
    sidebarComponent.close = () => setState(false, { restore: true });
    sidebarComponent.toggle = () => {
      if (open) setState(false, { restore: true });
      else setState(true, { focus: true });
    };

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const nav = sidebarComponent.querySelector('nav');
      const isMobile = !isDesktop();

      if (isMobile && target.closest('a, button') && !target.closest('[data-keep-mobile-sidebar-open]')) {
        setState(false);
        return;
      }

      if (target === sidebarComponent || (nav && !nav.contains(target))) {
        setState(false, { restore: true });
      }
    };

    const handleKeydown = (event) => {
      if (event.key !== 'Escape' || !open || isDesktop()) return;
      event.preventDefault();
      setState(false, { restore: true });
    };

    const handleBreakpointChange = () => {
      cancelAnimationFrame(focusFrame);
      open = isDesktop() ? desktopOpen : mobileOpen;
      if (isDesktop()) restoreTarget = null;
      updateState({ focus: open && !isDesktop() });
    };

    sidebarComponent.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    breakpointQuery?.addEventListener('change', handleBreakpointChange);

    sidebarComponent._destroy = () => {
      cancelAnimationFrame(focusFrame);
      sidebarComponent.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
      breakpointQuery?.removeEventListener('change', handleBreakpointChange);
      delete sidebarComponent.open;
      delete sidebarComponent.close;
      delete sidebarComponent.toggle;
    };

    updateState();
    sidebarComponent.dataset.sidebarInitialized = 'true';
    sidebarComponent.dispatchEvent(new CustomEvent('basecoat:initialized'));
  };

  if (window.basecoat) {
    window.basecoat.register('sidebar', '.sidebar', initSidebar);
  }
})();
