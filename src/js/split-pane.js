(() => {
  const states = new WeakMap();

  const numberAttribute = (element, dataName, ariaName, fallback) => {
    const dataValue = element.dataset[dataName];
    const ariaValue = ariaName ? element.getAttribute(ariaName) : null;
    const parsed = Number(dataValue ?? ariaValue ?? fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const getConfig = (root, separator) => {
    const minimum = numberAttribute(separator, 'min', 'aria-valuemin', 15);
    const maximum = Math.max(minimum, numberAttribute(separator, 'max', 'aria-valuemax', 85));
    const value = clamp(numberAttribute(separator, 'value', 'aria-valuenow', 50), minimum, maximum);
    return {
      minimum,
      maximum,
      value,
      step: Math.max(0.1, numberAttribute(separator, 'step', null, 5)),
      defaultValue: clamp(numberAttribute(separator, 'defaultValue', null, value), minimum, maximum),
      vertical: root.dataset.orientation === 'vertical',
    };
  };

  const initSplitPane = (root) => {
    if (root.dataset.splitPaneInitialized) return;

    const separator = root.querySelector(':scope > [role="separator"]');
    if (!separator) return;

    const state = { separator, config: getConfig(root, separator), dragging: false };
    states.set(root, state);

    const emit = (name, value) => {
      root.dispatchEvent(new CustomEvent(name, { detail: { value, orientation: state.config.vertical ? 'vertical' : 'horizontal' } }));
    };

    const setValue = (next, eventName) => {
      const value = Math.round(clamp(next, state.config.minimum, state.config.maximum) * 10) / 10;
      state.config.value = value;
      root.dataset.value = String(value);
      root.style.setProperty('--split-position', `${value}%`);
      separator.dataset.value = String(value);
      separator.setAttribute('aria-valuenow', String(value));
      separator.setAttribute('aria-valuetext', `${value}%`);
      if (eventName) emit(eventName, value);
      return value;
    };

    const valueFromPointer = (event) => {
      const bounds = root.getBoundingClientRect();
      const size = state.config.vertical ? bounds.height : bounds.width;
      if (!size) return state.config.value;
      const coordinate = state.config.vertical ? event.clientY - bounds.top : event.clientX - bounds.left;
      const rtl = !state.config.vertical && getComputedStyle(root).direction === 'rtl';
      const reverse = root.dataset.direction === 'reverse' || rtl;
      const percent = (coordinate / size) * 100;
      return reverse ? 100 - percent : percent;
    };

    const stopDragging = (event) => {
      if (!state.dragging) return;
      state.dragging = false;
      if (separator.hasPointerCapture?.(event.pointerId)) separator.releasePointerCapture(event.pointerId);
      delete document.documentElement.dataset.splitResizing;
      emit('basecoat:split-change', state.config.value);
    };

    const handlePointerDown = (event) => {
      if (event.button !== 0 || separator.getAttribute('aria-disabled') === 'true') return;
      event.preventDefault();
      state.dragging = true;
      separator.setPointerCapture?.(event.pointerId);
      document.documentElement.dataset.splitResizing = state.config.vertical ? 'vertical' : 'horizontal';
      setValue(valueFromPointer(event), 'basecoat:split-input');
    };

    const handlePointerMove = (event) => {
      if (!state.dragging) return;
      setValue(valueFromPointer(event), 'basecoat:split-input');
    };

    const handleKeyDown = (event) => {
      if (separator.getAttribute('aria-disabled') === 'true') return;
      const reverse = root.dataset.direction === 'reverse';
      let delta = null;
      if (!state.config.vertical && event.key === 'ArrowLeft') delta = -state.config.step;
      if (!state.config.vertical && event.key === 'ArrowRight') delta = state.config.step;
      if (state.config.vertical && event.key === 'ArrowUp') delta = -state.config.step;
      if (state.config.vertical && event.key === 'ArrowDown') delta = state.config.step;
      if (delta !== null && reverse) delta *= -1;

      let next = delta === null ? null : state.config.value + delta;
      if (event.key === 'Home') next = state.config.minimum;
      if (event.key === 'End') next = state.config.maximum;
      if (next === null) return;

      event.preventDefault();
      setValue(next, 'basecoat:split-change');
    };

    const handleDoubleClick = () => {
      if (separator.getAttribute('aria-disabled') === 'true') return;
      setValue(state.config.defaultValue, 'basecoat:split-change');
    };

    separator.tabIndex = separator.getAttribute('aria-disabled') === 'true' ? -1 : Math.max(0, separator.tabIndex);
    separator.setAttribute('aria-orientation', state.config.vertical ? 'horizontal' : 'vertical');
    separator.setAttribute('aria-valuemin', String(state.config.minimum));
    separator.setAttribute('aria-valuemax', String(state.config.maximum));
    setValue(state.config.value);

    separator.addEventListener('pointerdown', handlePointerDown);
    separator.addEventListener('pointermove', handlePointerMove);
    separator.addEventListener('pointerup', stopDragging);
    separator.addEventListener('pointercancel', stopDragging);
    separator.addEventListener('keydown', handleKeyDown);
    separator.addEventListener('dblclick', handleDoubleClick);

    root.refresh = () => {
      state.config = getConfig(root, separator);
      setValue(state.config.value);
    };

    root._destroy = () => {
      separator.removeEventListener('pointerdown', handlePointerDown);
      separator.removeEventListener('pointermove', handlePointerMove);
      separator.removeEventListener('pointerup', stopDragging);
      separator.removeEventListener('pointercancel', stopDragging);
      separator.removeEventListener('keydown', handleKeyDown);
      separator.removeEventListener('dblclick', handleDoubleClick);
      if (state.dragging) delete document.documentElement.dataset.splitResizing;
      states.delete(root);
      delete root.refresh;
    };

    root.dataset.splitPaneInitialized = 'true';
    root.dispatchEvent(new CustomEvent('basecoat:initialized'));
  };

  if (window.basecoat) {
    window.basecoat.register('split-pane', {
      selector: '.split-pane:not([data-split-pane-initialized])',
      init: initSplitPane,
      refresh: (root) => root.refresh?.(),
    });
  }
})();
