(() => {
  const compactQuery = window.matchMedia('(max-width: 56.25rem)');
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  let inspectorId = 0;

  const initTaskWorkspace = (workspace) => {
    if (workspace.dataset.taskWorkspaceInitialized) return;

    const inspector = workspace.querySelector('[data-task-inspector]');
    if (!inspector) return;

    let focusFrame = 0;
    let restoreTarget = null;
    const triggers = () =>
      Array.from(workspace.querySelectorAll('[data-task-inspector-trigger]'));
    const isCompact = () => compactQuery.matches;
    const inspectorOpen = () =>
      workspace.dataset.inspector !== 'hidden' &&
      (!isCompact() || workspace.dataset.inspector === 'open');

    inspector.id ||= `a3s-task-inspector-${++inspectorId}`;

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

    const focusInspector = () => {
      if (!inspectorOpen()) return;
      focusElement(inspector.querySelector(focusableSelector));
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
      const open = inspectorOpen();
      if (!open) {
        if (
          document.activeElement instanceof HTMLElement &&
          inspector.contains(document.activeElement)
        ) {
          document.activeElement.blur();
        }
        inspector.setAttribute('inert', '');
        inspector.setAttribute('aria-hidden', 'true');
      } else {
        inspector.removeAttribute('inert');
        inspector.removeAttribute('aria-hidden');
      }
      triggers().forEach((trigger) => {
        trigger.setAttribute('aria-controls', inspector.id);
        trigger.setAttribute('aria-expanded', String(open));
      });
    };

    const emitChange = (source) => {
      workspace.dispatchEvent(
        new CustomEvent('a3s:task-inspector-change', {
          detail: {
            mode: isCompact() ? 'compact' : 'desktop',
            open: inspectorOpen(),
            source,
          },
        }),
      );
    };

    const openInspector = (trigger, source = 'api') => {
      const activeElement = document.activeElement;
      restoreTarget =
        trigger ??
        (activeElement instanceof HTMLElement && !inspector.contains(activeElement)
          ? activeElement
          : null);
      workspace.dataset.inspector = 'open';
      synchronize();
      if (isCompact()) focusInspector();
      emitChange(source);
    };

    const closeInspector = ({ restore = true, source = 'api' } = {}) => {
      if (isCompact()) workspace.removeAttribute('data-inspector');
      else workspace.dataset.inspector = 'hidden';
      synchronize();
      if (restore) restoreFocus();
      else restoreTarget = null;
      emitChange(source);
    };

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest('[data-task-inspector-trigger]');
      if (trigger && workspace.contains(trigger)) {
        event.preventDefault();
        if (inspectorOpen()) closeInspector({ source: 'trigger' });
        else openInspector(trigger, 'trigger');
        return;
      }

      if (!isCompact() || !inspectorOpen() || inspector.contains(target)) {
        return;
      }
      closeInspector({ source: 'backdrop' });
    };

    const handleKeydown = (event) => {
      if (event.key !== 'Escape' || !isCompact() || !inspectorOpen()) return;
      event.preventDefault();
      closeInspector({ source: 'escape' });
    };

    const handleBreakpointChange = () => {
      restoreTarget = null;
      synchronize();
    };

    const stateObserver = new MutationObserver((mutations) => {
      if (
        mutations.some(
          (mutation) => mutation.attributeName === 'data-inspector',
        )
      ) {
        synchronize();
      }
    });
    stateObserver.observe(workspace, {
      attributeFilter: ['data-inspector'],
      attributes: true,
    });

    workspace.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    compactQuery.addEventListener('change', handleBreakpointChange);

    workspace.openInspector = () => openInspector(triggers()[0]);
    workspace.closeInspector = () => closeInspector();
    workspace.toggleInspector = () => {
      if (inspectorOpen()) closeInspector();
      else openInspector(triggers()[0]);
    };
    workspace.refresh = synchronize;
    workspace._destroy = () => {
      cancelAnimationFrame(focusFrame);
      stateObserver.disconnect();
      workspace.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
      compactQuery.removeEventListener('change', handleBreakpointChange);
      delete workspace.openInspector;
      delete workspace.closeInspector;
      delete workspace.toggleInspector;
      delete workspace.refresh;
    };

    synchronize();
    workspace.dataset.taskWorkspaceInitialized = 'true';
    workspace.dispatchEvent(new CustomEvent('basecoat:initialized'));
  };

  if (window.basecoat) {
    window.basecoat.register('task-workspace', {
      selector: '.task-workspace:not([data-task-workspace-initialized])',
      init: initTaskWorkspace,
      refresh: (workspace) => workspace.refresh?.(),
    });
  }
})();
