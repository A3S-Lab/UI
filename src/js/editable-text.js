(() => {
  const states = new WeakMap();

  const getElements = (root) => ({
    display: root.querySelector("[data-editable-display]"),
    form: root.querySelector("[data-editable-form]"),
    input: root.querySelector("input, textarea"),
  });

  const synchronize = (root, state) => {
    root.dataset.state = state.mode;
    const editing = ["editing", "saving", "error"].includes(state.mode);
    state.display?.setAttribute("aria-hidden", editing ? "true" : "false");
    state.form?.setAttribute("aria-hidden", editing ? "false" : "true");
    if (state.input) state.input.disabled = state.mode === "saving";
  };

  const refreshEditableText = (root) => {
    const state = states.get(root);
    if (!state) return;
    Object.assign(state, getElements(root));
    synchronize(root, state);
  };

  const initEditableText = (root) => {
    if (root.dataset.editableTextInitialized) return;
    const elements = getElements(root);
    if (!elements.input) return;
    const state = {
      ...elements,
      initialValue: elements.input.value,
      mode: "display",
      value: elements.input.value,
    };
    states.set(root, state);

    root.getState = () => ({ mode: state.mode, value: state.value });
    root.setValue = (value, options = {}) => {
      state.value = String(value ?? "");
      state.input.value = state.value;
      if (state.display) {
        const valueNode = state.display.querySelector("[data-editable-value]");
        (valueNode || state.display).textContent = state.value;
      }
      if (options.commit !== false) state.initialValue = state.value;
      if (options.emit) {
        root.dispatchEvent(
          new CustomEvent("a3s:editable-text-change", {
            bubbles: true,
            detail: { source: options.source || "api", value: state.value },
          }),
        );
      }
      return state.value;
    };
    root.beginEdit = (options = {}) => {
      if (
        root.hasAttribute("data-disabled") ||
        root.getAttribute("aria-disabled") === "true"
      ) {
        return false;
      }
      state.initialValue = state.value;
      state.mode = "editing";
      synchronize(root, state);
      queueMicrotask(() => {
        state.input.focus({ preventScroll: options.preventScroll === true });
        if (options.select !== false && typeof state.input.select === "function")
          state.input.select();
      });
      root.dispatchEvent(
        new CustomEvent("a3s:editable-text-edit", {
          bubbles: true,
          detail: { source: options.source || "api", value: state.value },
        }),
      );
      return true;
    };
    root.cancel = (options = {}) => {
      state.input.value = state.initialValue;
      state.value = state.initialValue;
      state.mode = "display";
      synchronize(root, state);
      root.dispatchEvent(
        new CustomEvent("a3s:editable-text-cancel", {
          bubbles: true,
          detail: { source: options.source || "api", value: state.value },
        }),
      );
      if (options.focus !== false)
        state.display
          ?.querySelector("[data-editable-action='edit']")
          ?.focus({ preventScroll: true });
      return true;
    };
    root.commit = (value = state.input.value, options = {}) => {
      const nextValue = String(value ?? "");
      const detail = {
        previousValue: state.initialValue,
        source: options.source || "api",
        value: nextValue,
      };
      const before = new CustomEvent("a3s:editable-text-before-commit", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (!root.dispatchEvent(before)) return false;
      root.setValue(nextValue);
      state.mode = options.saving ? "saving" : "display";
      synchronize(root, state);
      root.dispatchEvent(
        new CustomEvent("a3s:editable-text-change", {
          bubbles: true,
          detail,
        }),
      );
      if (state.mode === "display" && options.focus !== false)
        state.display
          ?.querySelector("[data-editable-action='edit']")
          ?.focus({ preventScroll: true });
      return true;
    };
    root.refresh = () => refreshEditableText(root);

    const handleClick = (event) => {
      const action = event.target.closest("[data-editable-action]");
      if (!action || !root.contains(action)) return;
      const value = action.dataset.editableAction;
      if (value === "edit") root.beginEdit({ source: "user" });
      if (value === "save") root.commit(state.input.value, { source: "user" });
      if (value === "cancel") root.cancel({ source: "user" });
    };
    const handleInput = () => {
      state.value = state.input.value;
    };
    const handleKeydown = (event) => {
      if (event.target !== state.input) return;
      if (event.key === "Escape") {
        event.preventDefault();
        root.cancel({ source: "keyboard" });
      }
      if (
        event.key === "Enter" &&
        !(state.input instanceof HTMLTextAreaElement) &&
        !event.isComposing
      ) {
        event.preventDefault();
        root.commit(state.input.value, { source: "keyboard" });
      }
    };
    const handleSubmit = (event) => {
      if (event.target !== state.form) return;
      event.preventDefault();
      root.commit(state.input.value, { source: "submit" });
    };
    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.addEventListener("keydown", handleKeydown);
    state.form?.addEventListener("submit", handleSubmit);
    root._destroy = () => {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("input", handleInput);
      root.removeEventListener("keydown", handleKeydown);
      state.form?.removeEventListener("submit", handleSubmit);
      states.delete(root);
      delete root.beginEdit;
      delete root.cancel;
      delete root.commit;
      delete root.getState;
      delete root.refresh;
      delete root.setValue;
    };

    root.dataset.editableTextInitialized = "true";
    synchronize(root, state);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("editable-text", {
      selector: ".editable-text:not([data-editable-text-initialized])",
      init: initEditableText,
      refresh: refreshEditableText,
    });
  }
})();
