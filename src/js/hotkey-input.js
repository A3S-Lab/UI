(() => {
  const states = new WeakMap();
  const modifierOrder = ["Control", "Alt", "Shift", "Meta"];
  const modifierKeys = new Set(modifierOrder);

  const getElements = (root) => ({
    clear: root.querySelector("[data-hotkey-clear]"),
    input: root.querySelector("input"),
    preview: root.querySelector("[data-hotkey-preview]"),
  });

  const normalizeKey = (key) => {
    if (key === " ") return "Space";
    if (key === "Esc") return "Escape";
    if (key.length === 1) return key.toUpperCase();
    return key;
  };

  const parseValue = (value) => {
    const parts = String(value || "")
      .split("+")
      .map((part) => part.trim())
      .filter(Boolean);
    const modifiers = modifierOrder.filter((modifier) => parts.includes(modifier));
    const key = parts.find((part) => !modifierKeys.has(part));
    return [...modifiers, ...(key ? [normalizeKey(key)] : [])];
  };

  const eventValue = (event) => {
    const parts = [];
    if (event.ctrlKey) parts.push("Control");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");
    if (event.metaKey) parts.push("Meta");
    const key = normalizeKey(event.key);
    if (!modifierKeys.has(key)) parts.push(key);
    return parts;
  };

  const keyLabel = (key) => {
    const apple = /Mac|iPhone|iPad/.test(navigator.platform || "");
    const labels = apple
      ? { Alt: "⌥", Control: "⌃", Meta: "⌘", Shift: "⇧" }
      : { Alt: "Alt", Control: "Ctrl", Meta: "Meta", Shift: "Shift" };
    return labels[key] || key;
  };

  const synchronize = (root, state) => {
    root.dataset.state = state.recording ? "recording" : "ready";
    root.dataset.hotkeyValue = state.value;
    if (state.input) {
      state.input.value = state.value;
      state.input.readOnly = true;
      state.input.setAttribute(
        "aria-keyshortcuts",
        state.value.replaceAll("Control", "Ctrl").replaceAll("+", "+"),
      );
    }
    if (state.preview) {
      state.preview.replaceChildren(
        ...parseValue(state.value).map((key) => {
          const element = document.createElement("kbd");
          element.className = "kbd";
          element.textContent = keyLabel(key);
          return element;
        }),
      );
      state.preview.hidden = !state.value;
    }
    if (state.clear) state.clear.hidden = !state.value;
  };

  const refreshHotkeyInput = (root) => {
    const state = states.get(root);
    if (!state) return;
    Object.assign(state, getElements(root));
    synchronize(root, state);
  };

  const initHotkeyInput = (root) => {
    if (root.dataset.hotkeyInputInitialized) return;
    const elements = getElements(root);
    if (!elements.input) return;
    const state = {
      ...elements,
      previousValue: root.dataset.hotkeyValue || elements.input.value || "",
      recording: false,
      value: root.dataset.hotkeyValue || elements.input.value || "",
    };
    states.set(root, state);

    root.getValue = () => state.value;
    root.setValue = (value, options = {}) => {
      const nextValue = parseValue(value).join("+");
      if (nextValue === state.value && !options.force) return true;
      const detail = {
        previousValue: state.value,
        source: options.source || "api",
        value: nextValue,
      };
      const before = new CustomEvent("a3s:hotkey-before-change", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (!root.dispatchEvent(before)) return false;
      state.previousValue = state.value;
      state.value = nextValue;
      synchronize(root, state);
      root.dispatchEvent(
        new CustomEvent("a3s:hotkey-change", { bubbles: true, detail }),
      );
      return true;
    };
    root.clear = (options = {}) => root.setValue("", options);
    root.start = (options = {}) => {
      if (
        state.input.disabled ||
        root.hasAttribute("data-disabled") ||
        root.getAttribute("aria-disabled") === "true"
      )
        return false;
      if (state.recording) return true;
      state.previousValue = state.value;
      state.recording = true;
      synchronize(root, state);
      if (options.focus !== false) state.input.focus({ preventScroll: true });
      root.dispatchEvent(
        new CustomEvent("a3s:hotkey-recording-change", {
          bubbles: true,
          detail: { recording: true, source: options.source || "api" },
        }),
      );
      return true;
    };
    root.stop = (options = {}) => {
      if (!state.recording) return true;
      state.recording = false;
      if (options.restore) state.value = state.previousValue;
      synchronize(root, state);
      root.dispatchEvent(
        new CustomEvent("a3s:hotkey-recording-change", {
          bubbles: true,
          detail: { recording: false, source: options.source || "api" },
        }),
      );
      return true;
    };
    root.refresh = () => refreshHotkeyInput(root);

    const handleFocus = () => root.start({ focus: false, source: "focus" });
    const handleBlur = () => root.stop({ source: "blur" });
    const handleKeydown = (event) => {
      if (event.target !== state.input || event.isComposing) return;
      if (event.key === "Tab") {
        root.stop({ source: "keyboard" });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        root.stop({ restore: true, source: "keyboard" });
        state.input.blur();
        return;
      }
      if (["Backspace", "Delete"].includes(event.key) && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        root.clear({ source: "keyboard" });
        return;
      }
      const parts = eventValue(event);
      if (parts.length === 0 || modifierKeys.has(normalizeKey(event.key))) return;
      event.preventDefault();
      root.setValue(parts.join("+"), { source: "keyboard" });
    };
    const handleClick = (event) => {
      if (event.target.closest("[data-hotkey-clear]")) {
        event.preventDefault();
        root.clear({ source: "user" });
        state.input.focus({ preventScroll: true });
      }
    };
    state.input.addEventListener("focus", handleFocus);
    state.input.addEventListener("blur", handleBlur);
    state.input.addEventListener("keydown", handleKeydown);
    root.addEventListener("click", handleClick);
    root._destroy = () => {
      state.input.removeEventListener("focus", handleFocus);
      state.input.removeEventListener("blur", handleBlur);
      state.input.removeEventListener("keydown", handleKeydown);
      root.removeEventListener("click", handleClick);
      states.delete(root);
      delete root.clear;
      delete root.getValue;
      delete root.refresh;
      delete root.setValue;
      delete root.start;
      delete root.stop;
    };

    root.dataset.hotkeyInputInitialized = "true";
    synchronize(root, state);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("hotkey-input", {
      selector: ".hotkey-input:not([data-hotkey-input-initialized])",
      init: initHotkeyInput,
      refresh: refreshHotkeyInput,
    });
  }
})();
