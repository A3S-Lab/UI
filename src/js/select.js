(() => {
  const states = new WeakMap();
  let instanceSequence = 0;

  const getElements = (root) => {
    const trigger = root.querySelector(':scope > button');
    const selectedLabel = trigger?.querySelector(':scope > span') || null;
    const popover = root.querySelector(':scope > [data-popover]');
    const listbox = popover ? popover.querySelector('[role="listbox"]') : null;
    const input = root.querySelector(':scope > input[type="hidden"]');
    return { trigger, selectedLabel, popover, listbox, input };
  };

  const getValue = (option) => option.dataset.value ?? option.textContent.trim();
  const getLabel = (option) => option.dataset.label || option.textContent.trim();
  const getFormat = (root) => root.dataset.format === 'object' ? 'object' : 'value';
  const isDisabled = (option) => option.getAttribute('aria-disabled') === 'true';
  const toSelected = (option) => ({ value: getValue(option), label: getLabel(option) });
  const normalizeTypeahead = (value) => String(value || '')
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .toLocaleLowerCase();

  const getOptions = (listbox) => {
    const allOptions = Array.from(listbox.querySelectorAll('[role="option"]'));
    return {
      allOptions,
      options: allOptions.filter(option => !isDisabled(option)),
    };
  };

  const ensureSemanticIds = (root, state) => {
    if (!state.instanceId) {
      instanceSequence += 1;
      state.instanceId = root.id || `a3s-select-${instanceSequence}`;
    }

    if (!state.trigger.id) state.trigger.id = `${state.instanceId}-trigger`;
    if (!state.listbox.id) state.listbox.id = `${state.instanceId}-listbox`;

    state.trigger.setAttribute('role', 'combobox');
    state.trigger.setAttribute('aria-haspopup', 'listbox');
    state.trigger.setAttribute('aria-autocomplete', 'none');
    state.trigger.setAttribute('aria-controls', state.listbox.id);
    if (!state.listbox.hasAttribute('aria-labelledby')) {
      state.listbox.setAttribute('aria-labelledby', state.trigger.id);
    }

    state.allOptions.forEach((option, index) => {
      if (!option.id) option.id = `${state.instanceId}-option-${index + 1}`;
    });
  };

  const clearTypeahead = (state) => {
    window.clearTimeout(state.typeaheadTimer);
    state.typeahead = '';
    state.typeaheadTimer = 0;
  };

  const parseStoredValues = (storedValue, { isMultiple, format }) => {
    if (isMultiple) {
      try {
        const parsed = JSON.parse(storedValue || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed
          .map(item => format === 'object' && item && typeof item === 'object' ? item.value : item)
          .filter(value => value != null)
          .map(String);
      } catch (_) {
        return [];
      }
    }

    if (format === 'object') {
      try {
        const parsed = JSON.parse(storedValue || 'null');
        return parsed && typeof parsed === 'object' && parsed.value != null ? String(parsed.value) : '';
      } catch (_) {
        return '';
      }
    }

    return storedValue || '';
  };

  const serializeSelection = (state, selected) => {
    if (state.format === 'object') {
      return JSON.stringify(state.isMultiple ? selected : (selected[0] || null));
    }

    const value = selected.map(item => item.value);
    return state.isMultiple ? JSON.stringify(value) : (value[0] || '');
  };

  const showPlaceholder = (state) => {
    state.selectedLabel.textContent = state.placeholder || '';
    state.selectedLabel.classList.toggle('text-muted-foreground', Boolean(state.placeholder));
    state.input.value = state.isMultiple ? serializeSelection(state, []) : '';
  };

  const scrollOptionIntoListbox = (state, option) => {
    const optionRect = option.getBoundingClientRect();
    const listboxRect = state.listbox.getBoundingClientRect();

    if (optionRect.top < listboxRect.top) {
      state.listbox.scrollTop -= listboxRect.top - optionRect.top;
    } else if (optionRect.bottom > listboxRect.bottom) {
      state.listbox.scrollTop += optionRect.bottom - listboxRect.bottom;
    }
  };

  const setActiveOption = (state, index) => {
    if (state.activeIndex > -1 && state.options[state.activeIndex]) {
      state.options[state.activeIndex].classList.remove('active');
    }

    state.activeIndex = index;

    if (state.activeIndex > -1) {
      const activeOption = state.options[state.activeIndex];
      activeOption.classList.add('active');
      if (activeOption.id) {
        state.trigger.setAttribute('aria-activedescendant', activeOption.id);
      } else {
        state.trigger.removeAttribute('aria-activedescendant');
      }
    } else {
      state.trigger.removeAttribute('aria-activedescendant');
    }
  };

  const updateValue = (root, optionOrOptions, triggerEvent = true) => {
    const state = states.get(root);
    let value;
    let selectedDetail;

    if (state.isMultiple) {
      const selected = Array.isArray(optionOrOptions) ? optionOrOptions : [];
      state.selectedOptions.clear();
      selected.forEach(option => state.selectedOptions.add(option));

      const selectedInOrder = state.options.filter(option => state.selectedOptions.has(option));
      selectedDetail = selectedInOrder.map(toSelected);
      if (selectedInOrder.length === 0) {
        state.selectedLabel.textContent = state.placeholder;
        state.selectedLabel.classList.add('text-muted-foreground');
      } else {
        state.selectedLabel.textContent = selectedDetail.map(item => item.label).join(', ');
        state.selectedLabel.classList.remove('text-muted-foreground');
      }

      value = selectedDetail.map(item => item.value);
      state.input.value = serializeSelection(state, selectedDetail);
    } else {
      const option = optionOrOptions;
      if (!option) {
        state.options.forEach(option => option.removeAttribute('aria-selected'));
        showPlaceholder(state);
        selectedDetail = null;
        value = '';
      } else {
        if (option.dataset.label) {
          state.selectedLabel.textContent = option.dataset.label;
        } else {
          state.selectedLabel.innerHTML = option.innerHTML;
        }
        state.selectedLabel.classList.remove('text-muted-foreground');
        selectedDetail = toSelected(option);
        value = selectedDetail.value;
        state.input.value = serializeSelection(state, [selectedDetail]);
      }
    }

    state.options.forEach(option => {
      const isSelected = state.isMultiple ? state.selectedOptions.has(option) : optionOrOptions && option === optionOrOptions;
      if (isSelected) {
        option.setAttribute('aria-selected', 'true');
      } else {
        option.removeAttribute('aria-selected');
      }
    });

    if (triggerEvent) {
      root.dispatchEvent(new CustomEvent('change', {
        detail: { value, selected: selectedDetail },
        bubbles: true,
      }));
    }
  };

  const closePopover = (state, focusOnTrigger = true) => {
    if (state.popover.getAttribute('aria-hidden') === 'true') return;
    clearTypeahead(state);
    if (focusOnTrigger) state.trigger.focus();
    state.popover.setAttribute('aria-hidden', 'true');
    state.trigger.setAttribute('aria-expanded', 'false');
    setActiveOption(state, -1);
  };

  const refreshSelect = (root) => {
    const state = states.get(root);
    if (!state) return;

    const elements = getElements(root);
    if (!elements.trigger || !elements.selectedLabel || !elements.popover || !elements.listbox || !elements.input) {
      const missing = [];
      if (!elements.trigger) missing.push('trigger');
      if (!elements.selectedLabel) missing.push('selected label');
      if (!elements.popover) missing.push('popover');
      if (!elements.listbox) missing.push('listbox');
      if (!elements.input) missing.push('input');
      console.error(`Select component refresh failed. Missing element(s): ${missing.join(', ')}`, root);
      return;
    }

    const previousValue = elements.input.value;
    Object.assign(state, elements, getOptions(elements.listbox));
    ensureSemanticIds(root, state);
    state.visibleOptions = [...state.options];
    state.isMultiple = state.listbox.getAttribute('aria-multiselectable') === 'true';
    state.format = getFormat(root);
    state.placeholder = root.dataset.placeholder || '';
    state.closeOnSelect = root.dataset.closeOnSelect === 'true';

    if (state.isMultiple) {
      if (!state.selectedOptions) state.selectedOptions = new Set();
      const values = parseStoredValues(previousValue, state);
      const selected = values.length
        ? values.map(value => state.options.find(option => getValue(option) === value)).filter(Boolean)
        : state.options.filter(option => option.getAttribute('aria-selected') === 'true');
      updateValue(root, selected, false);
    } else {
      const value = parseStoredValues(previousValue, state);
      const selected = value === '' && state.placeholder
        ? null
        : state.options.find(option => getValue(option) === value)
        || state.options.find(option => option.getAttribute('aria-selected') === 'true');
      state.options.forEach(option => option.removeAttribute('aria-selected'));
      updateValue(root, selected || null, false);
    }

    const selectedOption = state.listbox.querySelector('[role="option"][aria-selected="true"]');
    setActiveOption(state, selectedOption ? state.options.indexOf(selectedOption) : -1);
  };

  const toggleMultipleValue = (root, option) => {
    const state = states.get(root);
    if (state.selectedOptions.has(option)) {
      state.selectedOptions.delete(option);
    } else {
      state.selectedOptions.add(option);
    }
    updateValue(root, state.options.filter(opt => state.selectedOptions.has(opt)));
  };

  const selectValue = (root, value) => {
    const state = states.get(root);
    if (state.isMultiple) {
      const option = state.options.find(opt => getValue(opt) === value && !state.selectedOptions.has(opt));
      if (!option) return;
      state.selectedOptions.add(option);
      updateValue(root, state.options.filter(opt => state.selectedOptions.has(opt)));
    } else {
      const option = state.options.find(opt => getValue(opt) === value);
      if (!option) return;
      if (state.placeholder && getValue(option) === '') {
        updateValue(root, null);
        closePopover(state);
        return;
      }
      if (root.value !== value) updateValue(root, option);
      closePopover(state);
    }
  };

  const deselectValue = (root, value) => {
    const state = states.get(root);
    if (!state.isMultiple) return;
    const option = state.options.find(opt => getValue(opt) === value && state.selectedOptions.has(opt));
    if (!option) return;
    state.selectedOptions.delete(option);
    updateValue(root, state.options.filter(opt => state.selectedOptions.has(opt)));
  };

  const handleKeyNavigation = (event, root) => {
    const state = states.get(root);
    const isPopoverOpen = state.popover.getAttribute('aria-hidden') === 'false';

    if (
      !event.isComposing &&
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      if (!isPopoverOpen) root.open();

      window.clearTimeout(state.typeaheadTimer);
      const typedCharacter = normalizeTypeahead(event.key);
      if (!typedCharacter) return;
      state.typeahead += typedCharacter;
      state.typeaheadTimer = window.setTimeout(() => {
        state.typeahead = '';
        state.typeaheadTimer = 0;
      }, 650);

      const repeatedCharacter = Array.from(state.typeahead).every(
        character => character === state.typeahead[0],
      );
      const query = repeatedCharacter ? state.typeahead[0] : state.typeahead;
      const activeOption = state.options[state.activeIndex];
      const activeVisibleIndex = activeOption
        ? state.visibleOptions.indexOf(activeOption)
        : -1;
      const startIndex = repeatedCharacter
        ? (activeVisibleIndex + 1) % Math.max(state.visibleOptions.length, 1)
        : Math.max(activeVisibleIndex, 0);
      const orderedOptions = [
        ...state.visibleOptions.slice(startIndex),
        ...state.visibleOptions.slice(0, startIndex),
      ];
      const match = orderedOptions.find(option =>
        normalizeTypeahead(getLabel(option)).startsWith(query),
      );
      if (match) {
        setActiveOption(state, state.options.indexOf(match));
        scrollOptionIntoListbox(state, match);
      }
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End', 'Escape'].includes(event.key)) return;

    if (!isPopoverOpen) {
      if (event.key === 'Escape') return;
      event.preventDefault();
      root.open();
      if (state.visibleOptions.length === 0) return;

      const currentVisibleIndex = state.activeIndex > -1
        ? state.visibleOptions.indexOf(state.options[state.activeIndex])
        : -1;
      let nextVisibleIndex = currentVisibleIndex;
      if (event.key === 'ArrowDown') {
        nextVisibleIndex = Math.min(currentVisibleIndex + 1, state.visibleOptions.length - 1);
      }
      if (event.key === 'ArrowUp') {
        nextVisibleIndex = currentVisibleIndex > 0
          ? currentVisibleIndex - 1
          : state.visibleOptions.length - 1;
      }
      if (event.key === 'Home') nextVisibleIndex = 0;
      if (event.key === 'End') nextVisibleIndex = state.visibleOptions.length - 1;
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        const option = state.visibleOptions[nextVisibleIndex];
        setActiveOption(state, state.options.indexOf(option));
        scrollOptionIntoListbox(state, option);
      }
      return;
    }

    event.preventDefault();

    if (event.key === 'Escape') {
      root.close();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      if (state.activeIndex > -1) {
        const option = state.options[state.activeIndex];
        if (state.isMultiple) {
          toggleMultipleValue(root, option);
          if (state.closeOnSelect) root.close();
        } else {
          if (state.placeholder && getValue(option) === '') {
            updateValue(root, null);
          } else if (root.value !== getValue(option)) {
            updateValue(root, option);
          }
          root.close();
        }
      }
      return;
    }

    if (state.visibleOptions.length === 0) return;

    const currentVisibleIndex = state.activeIndex > -1 ? state.visibleOptions.indexOf(state.options[state.activeIndex]) : -1;
    let nextVisibleIndex = currentVisibleIndex;

    if (event.key === 'ArrowDown' && currentVisibleIndex < state.visibleOptions.length - 1) nextVisibleIndex = currentVisibleIndex + 1;
    if (event.key === 'ArrowUp') nextVisibleIndex = currentVisibleIndex > 0 ? currentVisibleIndex - 1 : 0;
    if (event.key === 'Home') nextVisibleIndex = 0;
    if (event.key === 'End') nextVisibleIndex = state.visibleOptions.length - 1;

    if (nextVisibleIndex !== currentVisibleIndex) {
      const newActiveOption = state.visibleOptions[nextVisibleIndex];
      setActiveOption(state, state.options.indexOf(newActiveOption));
      scrollOptionIntoListbox(state, newActiveOption);
    }
  };

  const initSelect = (root) => {
    if (root.dataset.selectInitialized) return;

    const state = {
      activeIndex: -1,
      allOptions: [],
      format: 'value',
      instanceId: '',
      options: [],
      selectedOptions: null,
      typeahead: '',
      typeaheadTimer: 0,
      visibleOptions: [],
    };
    states.set(root, state);
    root.refresh = () => refreshSelect(root);

    refreshSelect(root);
    if (!state.trigger || !state.selectedLabel || !state.popover || !state.listbox || !state.input) {
      states.delete(root);
      delete root.refresh;
      return;
    }

    root.open = () => {
      if (
        state.trigger.disabled ||
        state.trigger.getAttribute('aria-disabled') === 'true' ||
        root.getAttribute('aria-disabled') === 'true'
      ) {
        return false;
      }
      document.dispatchEvent(new CustomEvent('basecoat:popover', { detail: { source: root } }));
      root.refresh();
      state.popover.setAttribute('aria-hidden', 'false');
      state.popover.hidden = false;
      state.trigger.setAttribute('aria-expanded', 'true');

      const selectedOption = state.listbox.querySelector('[role="option"][aria-selected="true"]');
      if (selectedOption) {
        setActiveOption(state, state.options.indexOf(selectedOption));
        scrollOptionIntoListbox(state, selectedOption);
      }
      return true;
    };
    root.close = (focusOnTrigger = true) => closePopover(state, focusOnTrigger);
    root.togglePopover = () => state.trigger.getAttribute('aria-expanded') === 'true' ? root.close() : root.open();

    const handleTriggerKeydown = (event) => handleKeyNavigation(event, root);
    const handleTriggerClick = root.togglePopover;
    const handleListboxMousemove = (event) => {
      const option = event.target.closest('[role="option"]');
      if (option && state.visibleOptions.includes(option)) {
        const index = state.options.indexOf(option);
        if (index !== state.activeIndex) setActiveOption(state, index);
      }
    };
    const handleListboxMouseleave = () => {
      const selectedOption = state.listbox.querySelector('[role="option"][aria-selected="true"]');
      setActiveOption(state, selectedOption ? state.options.indexOf(selectedOption) : -1);
    };
    const handleListboxClick = (event) => {
      const clickedOption = event.target.closest('[role="option"]');
      if (!clickedOption) return;

      const option = state.options.find(opt => opt === clickedOption);
      if (!option) return;

      if (state.isMultiple) {
        toggleMultipleValue(root, option);
        if (state.closeOnSelect) {
          root.close();
        } else {
          setActiveOption(state, state.options.indexOf(option));
          state.trigger.focus();
        }
      } else {
        if (state.placeholder && getValue(option) === '') {
          updateValue(root, null);
        } else if (root.value !== getValue(option)) {
          updateValue(root, option);
        }
        root.close();
      }
    };
    const handleDocumentClick = (event) => {
      if (!root.contains(event.target)) root.close(false);
    };
    const handleDocumentPopover = (event) => {
      if (event.detail.source !== root) root.close(false);
    };

    state.trigger.addEventListener('keydown', handleTriggerKeydown);
    state.trigger.addEventListener('click', handleTriggerClick);
    state.listbox.addEventListener('mousemove', handleListboxMousemove);
    state.listbox.addEventListener('mouseleave', handleListboxMouseleave);
    state.listbox.addEventListener('click', handleListboxClick);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('basecoat:popover', handleDocumentPopover);

    root._destroy = () => {
      clearTypeahead(state);
      state.trigger.removeEventListener('keydown', handleTriggerKeydown);
      state.trigger.removeEventListener('click', handleTriggerClick);
      state.listbox.removeEventListener('mousemove', handleListboxMousemove);
      state.listbox.removeEventListener('mouseleave', handleListboxMouseleave);
      state.listbox.removeEventListener('click', handleListboxClick);
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('basecoat:popover', handleDocumentPopover);
      states.delete(root);
      delete root.refresh;
      delete root.open;
      delete root.close;
      delete root.togglePopover;
      delete root.select;
      delete root.selectByValue;
      delete root.deselect;
      delete root.toggle;
      delete root.selectAll;
      delete root.selectNone;
    };

    Object.defineProperty(root, 'value', {
      configurable: true,
      get: () => state.isMultiple ? state.options.filter(option => state.selectedOptions.has(option)).map(getValue) : parseStoredValues(state.input.value, state),
      set: (value) => {
        if (state.isMultiple) {
          const values = Array.isArray(value) ? value : (value != null ? [value] : []);
          updateValue(root, values.map(v => state.options.find(option => getValue(option) === v)).filter(Boolean));
        } else {
          if (value == null || value === '') {
            updateValue(root, null);
            root.close();
            return;
          }
          const option = state.options.find(opt => getValue(opt) === value);
          if (option) {
            updateValue(root, option);
            root.close();
          }
        }
      },
    });

    Object.defineProperty(root, 'selected', {
      configurable: true,
      get: () => {
        if (state.isMultiple) return state.options.filter(option => state.selectedOptions.has(option)).map(toSelected);
        const value = root.value;
        const option = state.options.find(opt => getValue(opt) === value);
        return option ? toSelected(option) : null;
      },
    });

    root.select = (value) => selectValue(root, value);
    root.selectByValue = root.select;
    if (state.isMultiple) {
      root.deselect = (value) => deselectValue(root, value);
      root.toggle = (value) => {
        const option = state.options.find(opt => getValue(opt) === value);
        if (option) toggleMultipleValue(root, option);
      };
      root.selectAll = () => updateValue(root, state.options);
      root.selectNone = () => updateValue(root, []);
    }

    state.popover.setAttribute('aria-hidden', 'true');
    state.popover.hidden = false;
    state.trigger.setAttribute('aria-expanded', 'false');
    setActiveOption(state, -1);
    root.dataset.selectInitialized = 'true';
    root.dispatchEvent(new CustomEvent('basecoat:initialized'));
  };

  if (window.basecoat) {
    window.basecoat.register('select', {
      selector: 'div.select:not([data-select-initialized])',
      init: initSelect,
      refresh: refreshSelect,
    });
  }
})();
