(() => {
  const states = new WeakMap();

  const focusableSelector =
    "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";

  const synchronize = (root, state) => {
    root.hidden = !state.open;
    root.dataset.state = state.open ? "open" : "closed";
    root.setAttribute("aria-hidden", state.open ? "false" : "true");
  };

  const initFloatingPanel = (root) => {
    if (root.dataset.floatingPanelInitialized) return;
    const state = {
      open: !root.hidden && root.dataset.state !== "closed",
      trigger: null,
    };
    states.set(root, state);

    root.getState = () => ({
      open: state.open,
      position: root.dataset.position || "floating",
    });
    root.open = (options = {}) => {
      if (state.open) return true;
      const trigger = options.trigger || document.activeElement;
      const before = new CustomEvent("a3s:floating-panel-before-open", {
        bubbles: true,
        cancelable: true,
        detail: { source: options.source || "api", trigger },
      });
      if (!root.dispatchEvent(before)) return false;
      state.trigger = trigger instanceof HTMLElement ? trigger : null;
      state.open = true;
      synchronize(root, state);
      if (options.focus !== false)
        queueMicrotask(() => root.querySelector(focusableSelector)?.focus());
      root.dispatchEvent(
        new CustomEvent("a3s:floating-panel-open", {
          bubbles: true,
          detail: { source: options.source || "api", trigger: state.trigger },
        }),
      );
      return true;
    };
    root.close = (options = {}) => {
      if (!state.open) return true;
      const before = new CustomEvent("a3s:floating-panel-before-close", {
        bubbles: true,
        cancelable: true,
        detail: { source: options.source || "api", trigger: state.trigger },
      });
      if (!root.dispatchEvent(before)) return false;
      state.open = false;
      synchronize(root, state);
      if (options.restoreFocus !== false && state.trigger?.isConnected)
        state.trigger.focus({ preventScroll: true });
      root.dispatchEvent(
        new CustomEvent("a3s:floating-panel-close", {
          bubbles: true,
          detail: { source: options.source || "api" },
        }),
      );
      return true;
    };
    root.toggle = (options = {}) =>
      state.open ? root.close(options) : root.open(options);

    const handleClick = (event) => {
      const action = event.target.closest("[data-floating-panel-action]");
      if (!action || !root.contains(action)) return;
      if (action.dataset.floatingPanelAction === "close")
        root.close({ source: "user" });
    };
    const handleKeydown = (event) => {
      if (event.key !== "Escape" || !state.open || event.defaultPrevented) return;
      if (root.close({ source: "keyboard" })) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    root.addEventListener("click", handleClick);
    root.addEventListener("keydown", handleKeydown);
    root._destroy = () => {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("keydown", handleKeydown);
      states.delete(root);
      delete root.close;
      delete root.getState;
      delete root.open;
      delete root.toggle;
    };

    root.dataset.floatingPanelInitialized = "true";
    synchronize(root, state);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("floating-panel", {
      selector: ".floating-panel:not([data-floating-panel-initialized])",
      init: initFloatingPanel,
    });
  }
})();
