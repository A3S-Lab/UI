(() => {
  const states = new WeakMap();

  const ownsElement = (root, element) =>
    element.closest(".bulk-action-bar") === root;

  const getElements = (root) => ({
    actions: Array.from(
      root.querySelectorAll(
        "[data-bulk-actions] button, [data-bulk-actions] a[href]",
      ),
    ).filter((action) => ownsElement(root, action)),
    counts: Array.from(root.querySelectorAll("[data-selected-count]")).filter(
      (output) => ownsElement(root, output),
    ),
    summaries: Array.from(root.querySelectorAll("[data-bulk-summary]")).filter(
      (summary) => ownsElement(root, summary),
    ),
  });

  const actionValue = (action) =>
    action.dataset.bulkAction ||
    (action.matches("[data-bulk-clear]") ? "clear" : "");

  const isClearAction = (action) =>
    action.matches("[data-bulk-clear]") || actionValue(action) === "clear";

  const cloneSelection = (selection) => ({
    count: selection.count,
    values: [...selection.values],
  });

  const normalizeSelection = (selection) => {
    if (typeof selection === "number") {
      return { count: Math.max(0, selection), values: [] };
    }
    if (selection && !Array.isArray(selection) && "count" in selection) {
      const values = Array.from(selection.values || [], String);
      return {
        count: Math.max(0, Number(selection.count) || values.length),
        values,
      };
    }
    const values = Array.from(selection || [], String);
    return { count: values.length, values };
  };

  const selectionsEqual = (left, right) =>
    left.count === right.count &&
    left.values.length === right.values.length &&
    left.values.every((value, index) => value === right.values[index]);

  const focusReturnTarget = (root) => {
    const explicitSelector = root.dataset.bulkFocusReturn;
    if (explicitSelector) {
      try {
        const explicit = document.querySelector(explicitSelector);
        if (explicit instanceof HTMLElement) return explicit;
      } catch {
        // An invalid host selector must not break selection updates.
      }
    }

    const owner = root.closest(".data-grid");
    if (owner) {
      // `querySelector()` follows document order for a selector list, not the
      // order of selectors in that list. Keep the fallback priority explicit:
      // return to the selection owner before the collection heading or grid
      // viewport so the next keyboard action remains selection-related.
      const ownerTargets = [
        owner.querySelector("[data-grid-select-all]"),
        owner.querySelector(
          "[data-grid-identity] h1, [data-grid-identity] h2, [data-grid-identity] h3",
        ),
        owner.querySelector("[data-grid-viewport]"),
      ];
      const ownerTarget = ownerTargets.find(
        (candidate) => candidate instanceof HTMLElement,
      );
      if (ownerTarget instanceof HTMLElement) return ownerTarget;
    }

    const siblingTarget = root.parentElement?.querySelector(
      "[data-bulk-focus-target], [data-collection-focus-target], [tabindex]:not([tabindex='-1'])",
    );
    return siblingTarget instanceof HTMLElement ? siblingTarget : null;
  };

  const restoreFocus = (root, shouldRestore, previousActiveElement = null) => {
    if (!shouldRestore || !root.hidden) return;
    const target = focusReturnTarget(root);
    if (!target) return;
    const focusOrigin = previousActiveElement || document.activeElement;
    if (!focusOrigin || !root.contains(focusOrigin)) return;
    queueMicrotask(() => {
      const activeElement = document.activeElement;
      // Setting `hidden` on a focused region synchronously moves focus to the
      // document body in browsers. Treat that browser fallback as a continued
      // focus context, but never steal focus back from a host that deliberately
      // moved it to another live control during the same turn.
      const browserFallback =
        activeElement === document.body ||
        activeElement === document.documentElement ||
        activeElement === null;
      const focusStillInBar = activeElement && root.contains(activeElement);
      if (!focusStillInBar && !browserFallback) return;
      if (
        !(target instanceof HTMLElement) ||
        !target.isConnected ||
        target.hidden ||
        target.closest('[hidden], [aria-hidden="true"], [inert]')
      ) {
        return;
      }
      const before = document.activeElement;
      target.focus({ preventScroll: true });
      if (document.activeElement !== target || before === target) return;
      root.dispatchEvent(
        new CustomEvent("a3s:bulk-focus-restored", {
          bubbles: true,
          detail: { target },
        }),
      );
    });
  };

  const synchronizeSelection = (root, state, options = {}) => {
    const empty = state.selection.count === 0;
    state.counts.forEach((output) => {
      output.textContent = String(state.selection.count);
    });
    root.hidden = empty && !state.pending;
    root.toggleAttribute("data-selected", !empty);
    root.toggleAttribute("data-selection-cleared", empty && Boolean(state.pending));
    if (empty && state.pending) root.dataset.selection = "cleared";
    else if (empty) root.dataset.selection = "none";
    else root.dataset.selection = "selected";
    if (state.pending) root.dataset.state = "loading";
    else root.dataset.state = empty ? "empty" : "selected";
    restoreFocus(
      root,
      options.restoreFocus === true,
      options.previousActiveElement || null,
    );
  };

  const restoreDisabledState = (state) => {
    state.actions.forEach((action) => {
      const disabled = state.disabledStates.get(action);
      if (!disabled) return;
      if (action instanceof HTMLButtonElement)
        action.disabled = disabled.disabled;
      if (disabled.ariaDisabled === null)
        action.removeAttribute("aria-disabled");
      else action.setAttribute("aria-disabled", disabled.ariaDisabled);
      action.removeAttribute("data-pending");
      state.disabledStates.delete(action);
    });
  };

  const refreshBulkActionBar = (root) => {
    const state = states.get(root);
    if (!state) return;
    if (state.pending) restoreDisabledState(state);
    Object.assign(state, getElements(root));
    synchronizeSelection(root, state);
    if (state.pending)
      root.setPending(state.pending.action, true, state.pending.options);
  };

  const initBulkActionBar = (root) => {
    if (root.dataset.bulkActionBarInitialized) return;
    const elements = getElements(root);
    const initialCount = Math.max(
      0,
      Number(elements.counts[0]?.textContent?.trim()) || 0,
    );
    const state = {
      ...elements,
      disabledStates: new WeakMap(),
      pending: null,
      selection: { count: initialCount, values: [] },
    };
    states.set(root, state);

    root.getSelection = () => cloneSelection(state.selection);
    root.setSelection = (selection, options = {}) => {
      const previous = state.selection;
      const current = normalizeSelection(selection);
      if (selectionsEqual(previous, current) && !options.force) return true;
      state.selection = current;
      synchronizeSelection(root, state, {
        restoreFocus: options.restoreFocus === true,
        previousActiveElement: options.previousActiveElement || null,
      });
      if (options.emit !== false) {
        root.dispatchEvent(
          new CustomEvent("a3s:bulk-selection-change", {
            bubbles: true,
            detail: {
              current: cloneSelection(current),
              previous: cloneSelection(previous),
              source: options.source || "api",
            },
          }),
        );
      }
      return true;
    };
    root.clear = (options = {}) => {
      const previousActiveElement = document.activeElement;
      const focusWasInside = root.contains(previousActiveElement);
      const keepPending = Boolean(state.pending) && options.keepPending !== false;
      const result = root.setSelection([], {
        ...options,
        source: options.source || "api",
        restoreFocus: focusWasInside && !keepPending,
        previousActiveElement,
      });
      if (keepPending) {
        root.dataset.selection = "cleared";
        root.dataset.selectionCleared = "true";
      } else {
        delete root.dataset.selectionCleared;
      }
      return result;
    };
    root.setSummary = (message, options = {}) => {
      state.summaries.forEach((summary) => {
        summary.textContent = String(message || "");
        summary.hidden = !message;
      });
      if (options.result) root.dataset.result = options.result;
      else if (options.clearResult !== false) delete root.dataset.result;
    };
    root.setPending = (value, pending = true, options = {}) => {
      let action = value;
      let nextPending = pending;
      let nextOptions = options;
      if (typeof value === "boolean") {
        action = "";
        nextPending = value;
        nextOptions = pending && typeof pending === "object" ? pending : {};
      } else if (pending && typeof pending === "object") {
        nextPending = true;
        nextOptions = pending;
      }
      if (!nextPending) {
        const previousActiveElement = document.activeElement;
        const focusWasInside = root.contains(previousActiveElement);
        restoreDisabledState(state);
        state.pending = null;
        root.removeAttribute("aria-busy");
        delete root.dataset.pendingSelectionCount;
        delete root.dataset.selectionCleared;
        root.dataset.state = state.selection.count > 0 ? "selected" : "empty";
        root.hidden = state.selection.count === 0;
        restoreFocus(root, focusWasInside, previousActiveElement);
        return;
      }

      restoreDisabledState(state);
      state.pending = {
        action: String(action || ""),
        options: {
          allowClear: nextOptions.allowClear !== false,
          ...nextOptions,
        },
        selection: cloneSelection(state.selection),
      };
      root.dataset.pendingSelectionCount = String(state.pending.selection.count);
      root.setAttribute("aria-busy", "true");
      root.dataset.state = "loading";
      delete root.dataset.result;
      state.actions.forEach((item) => {
        state.disabledStates.set(item, {
          ariaDisabled: item.getAttribute("aria-disabled"),
          disabled: item instanceof HTMLButtonElement ? item.disabled : false,
        });
        const isPendingAction = actionValue(item) === state.pending.action;
        if (isPendingAction) item.dataset.pending = "true";
        const keepClearAvailable =
          isClearAction(item) && state.pending.options.allowClear !== false;
        if (keepClearAvailable) return;
        if (item instanceof HTMLButtonElement) item.disabled = true;
        else item.setAttribute("aria-disabled", "true");
      });
      if (nextOptions.message !== undefined) {
        root.setSummary(nextOptions.message, { clearResult: false });
      }
    };
    root.complete = (result = {}) => {
      const action = result.action || state.pending?.action || "";
      const actionSelection =
        state.pending?.selection || cloneSelection(state.selection);
      root.setPending(action, false);
      if (result.message !== undefined) {
        root.setSummary(result.message, {
          clearResult: false,
          result: result.status || "success",
        });
      } else if (result.status) {
        root.dataset.result = result.status;
      }
      if (result.clearSelection) {
        root.clear({
          emit: result.emitSelection !== false,
          source: "complete",
          keepPending: false,
        });
      }
      const detail = {
        action,
        error: result.error || null,
        message: result.message,
        processedCount: result.processedCount,
        selection: cloneSelection(actionSelection),
        source: result.source || "api",
        status: result.status || "success",
      };
      root.dispatchEvent(
        new CustomEvent("a3s:bulk-action-complete", {
          bubbles: true,
          detail,
        }),
      );
      return detail;
    };
    root.refresh = () => refreshBulkActionBar(root);

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest(
        "[data-bulk-actions] button, [data-bulk-actions] a[href]",
      );
      if (!action || !ownsElement(root, action)) return;
      if (action.matches(":disabled, [aria-disabled=true]")) {
        event.preventDefault();
        return;
      }
      const value = actionValue(action);
      if (!value) return;
      const detail = {
        action: value,
        item: action,
        originalEvent: event,
        selection: cloneSelection(state.selection),
        source: "user",
      };
      const beforeEvent = new CustomEvent("a3s:bulk-before-action", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (!root.dispatchEvent(beforeEvent)) {
        event.preventDefault();
        return;
      }

      if (value === "clear") {
        const grid = root.closest(".data-grid");
        if (grid && typeof grid.clearSelection === "function") {
          event.stopPropagation();
          const accepted = grid.clearSelection({
            originalEvent: event,
            source: "bulk-action-bar",
          });
          if (!accepted) return;
        } else {
          root.clear({ source: "user" });
        }
      }
      root.dispatchEvent(
        new CustomEvent("a3s:bulk-action", { bubbles: true, detail }),
      );
    };

    root.addEventListener("click", handleClick);
    root._destroy = () => {
      restoreDisabledState(state);
      root.removeEventListener("click", handleClick);
      states.delete(root);
      delete root.clear;
      delete root.complete;
      delete root.getSelection;
      delete root.refresh;
      delete root.setPending;
      delete root.setSelection;
      delete root.setSummary;
    };

    synchronizeSelection(root, state);
    root.dataset.bulkActionBarInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("bulk-action-bar", {
      selector: ".bulk-action-bar:not([data-bulk-action-bar-initialized])",
      init: initBulkActionBar,
      refresh: refreshBulkActionBar,
    });
  }
})();
