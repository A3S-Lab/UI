(() => {
  const states = new WeakMap();

  const getElements = (root) => ({
    content: root.querySelector(":scope > [data-popover]"),
    trigger: root.querySelector(":scope > button"),
  });

  const refreshPopover = (root) => {
    const state = states.get(root);
    if (!state) return false;

    const elements = getElements(root);
    if (!elements.trigger || !elements.content) {
      const missing = [];
      if (!elements.trigger) missing.push("trigger");
      if (!elements.content) missing.push("content");
      console.error(
        `Popover refresh failed. Missing element(s): ${missing.join(", ")}`,
        root,
      );
      return false;
    }

    Object.assign(state, elements);
    state.trigger.setAttribute(
      "aria-expanded",
      String(state.content.getAttribute("aria-hidden") !== "true"),
    );
    return true;
  };

  const focusAutofocusElement = (state) => {
    const element = state.content.querySelector("[autofocus]");
    if (!(element instanceof HTMLElement)) return;

    window.cancelAnimationFrame(state.focusFrame);
    let remainingAttempts = 2;
    const focus = () => {
      state.focusFrame = 0;
      if (
        state.trigger.getAttribute("aria-expanded") !== "true" ||
        state.content.getAttribute("aria-hidden") === "true"
      ) {
        return;
      }
      element.focus({ preventScroll: true });
      if (document.activeElement !== element && remainingAttempts > 0) {
        remainingAttempts -= 1;
        state.focusFrame = window.requestAnimationFrame(focus);
      }
    };
    state.focusFrame = window.requestAnimationFrame(focus);
  };

  const initPopover = (root) => {
    if (root.dataset.popoverInitialized) return;

    const state = { content: null, focusFrame: 0, trigger: null };
    states.set(root, state);
    root.refresh = () => refreshPopover(root);

    if (!root.refresh()) {
      states.delete(root);
      delete root.refresh;
      return;
    }

    root.close = (focusOnTrigger = true) => {
      if (state.trigger.getAttribute("aria-expanded") === "false") return false;
      window.cancelAnimationFrame(state.focusFrame);
      state.focusFrame = 0;
      state.trigger.setAttribute("aria-expanded", "false");
      state.content.setAttribute("aria-hidden", "true");
      if (
        focusOnTrigger &&
        state.trigger.isConnected &&
        !state.trigger.disabled
      ) {
        state.trigger.focus({ preventScroll: true });
      }
      return true;
    };

    root.open = (focus = true) => {
      if (!root.refresh()) return false;
      if (state.trigger.getAttribute("aria-expanded") === "true") return true;

      document.dispatchEvent(
        new CustomEvent("basecoat:popover", { detail: { source: root } }),
      );
      state.trigger.setAttribute("aria-expanded", "true");
      state.content.setAttribute("aria-hidden", "false");
      if (focus) focusAutofocusElement(state);
      return true;
    };

    root.toggle = (focus = true) =>
      state.trigger.getAttribute("aria-expanded") === "true"
        ? root.close()
        : root.open(focus);

    const handleRootClick = (event) => {
      if (state.trigger.contains(event.target)) root.toggle();
    };
    const handleKeydown = (event) => {
      if (
        event.key === "Escape" &&
        state.trigger.getAttribute("aria-expanded") === "true"
      ) {
        root.close();
      }
    };
    const handleDocumentClick = (event) => {
      if (!root.contains(event.target)) root.close(false);
    };
    const handleDocumentPopover = (event) => {
      if (event.detail.source !== root) root.close(false);
    };

    root.addEventListener("click", handleRootClick);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("basecoat:popover", handleDocumentPopover);

    root._destroy = () => {
      window.cancelAnimationFrame(state.focusFrame);
      root.removeEventListener("click", handleRootClick);
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("basecoat:popover", handleDocumentPopover);
      states.delete(root);
      delete root.refresh;
      delete root.open;
      delete root.close;
      delete root.toggle;
    };

    root.dataset.popoverInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("popover", {
      selector: ".popover:not([data-popover-initialized])",
      init: initPopover,
      refresh: refreshPopover,
    });
  }
})();
