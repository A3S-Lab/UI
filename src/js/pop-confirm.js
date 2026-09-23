(() => {
  const states = new WeakMap();

  const getElements = (root) => ({
    cancel: root.querySelector(":scope > [data-popover] [data-pop-confirm-cancel]"),
    confirm: root.querySelector(":scope > [data-popover] [data-pop-confirm-confirm]"),
    content: root.querySelector(":scope > [data-popover]"),
    message: root.querySelector(":scope > [data-popover] [data-pop-confirm-message]"),
    trigger: root.querySelector(":scope > button"),
  });

  const refreshPopConfirm = (root) => {
    const state = states.get(root);
    if (!state) return false;

    const elements = getElements(root);
    if (!elements.trigger || !elements.content || !elements.confirm || !elements.cancel) {
      const missing = [];
      if (!elements.trigger) missing.push("trigger");
      if (!elements.content) missing.push("content");
      if (!elements.confirm) missing.push("confirm");
      if (!elements.cancel) missing.push("cancel");
      console.error(
        `PopConfirm refresh failed. Missing element(s): ${missing.join(", ")}`,
        root,
      );
      return false;
    }

    Object.assign(state, elements);
    const open = state.content.getAttribute("aria-hidden") !== "true";
    state.trigger.setAttribute("aria-expanded", String(open));
    if (!state.content.id) state.content.id = `${state.trigger.id || "pop-confirm"}-popover`;
    state.trigger.setAttribute("aria-controls", state.content.id);
    state.trigger.setAttribute("aria-haspopup", "dialog");
    if (state.content.getAttribute("role") !== "alertdialog") {
      state.content.setAttribute("role", "alertdialog");
    }
    return true;
  };

  const focusAutofocusElement = (state) => {
    const element =
      state.content.querySelector("[autofocus]") ||
      state.cancel ||
      state.confirm;
    if (!(element instanceof HTMLElement)) return;

    window.cancelAnimationFrame(state.focusFrame);
    let remainingAttempts = 8;
    const focus = () => {
      state.focusFrame = 0;
      if (
        state.trigger.getAttribute("aria-expanded") !== "true" ||
        state.content.getAttribute("aria-hidden") === "true"
      ) {
        return;
      }
      void state.content.offsetHeight;
      element.focus({ preventScroll: true });
      if (document.activeElement !== element && remainingAttempts > 0) {
        remainingAttempts -= 1;
        state.focusFrame = window.requestAnimationFrame(focus);
      }
    };
    focus();
  };

  const initPopConfirm = (root) => {
    if (root.dataset.popConfirmInitialized) return;

    const state = {
      cancel: null,
      confirm: null,
      content: null,
      focusFrame: 0,
      message: null,
      trigger: null,
    };
    states.set(root, state);
    root.refresh = () => refreshPopConfirm(root);

    if (!root.refresh()) {
      states.delete(root);
      delete root.refresh;
      return;
    }

    const emit = (name) => {
      root.dispatchEvent(
        new CustomEvent(name, { cancelable: name.endsWith("before-confirm"), detail: { source: root } }),
      );
    };

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

    const confirmAction = () => {
      if (!root.refresh()) return;
      const before = new CustomEvent("a3s:pop-confirm-before-confirm", {
        cancelable: true,
        detail: { source: root },
      });
      if (!root.dispatchEvent(before)) return;
      root.dispatchEvent(
        new CustomEvent("a3s:pop-confirm-confirm", { detail: { source: root } }),
      );
      root.close(false);
    };

    const cancelAction = (focusOnTrigger = true) => {
      if (state.trigger.getAttribute("aria-expanded") !== "true") return;
      emit("a3s:pop-confirm-cancel");
      root.close(focusOnTrigger);
    };

    const handleRootClick = (event) => {
      if (state.trigger.contains(event.target)) {
        root.toggle();
        return;
      }
      const confirm = event.target.closest("[data-pop-confirm-confirm]");
      if (confirm && state.content.contains(confirm)) {
        event.preventDefault();
        confirmAction();
        return;
      }
      const cancel = event.target.closest("[data-pop-confirm-cancel]");
      if (cancel && state.content.contains(cancel)) {
        event.preventDefault();
        cancelAction();
      }
    };
    const handleKeydown = (event) => {
      if (event.key !== "Escape" || state.trigger.getAttribute("aria-expanded") !== "true") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      cancelAction();
    };
    const handleDocumentClick = (event) => {
      if (!root.contains(event.target)) cancelAction(false);
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

    root.dataset.popConfirmInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("pop-confirm", {
      selector: ".pop-confirm:not([data-pop-confirm-initialized])",
      init: initPopConfirm,
      refresh: refreshPopConfirm,
    });
  }
})();
