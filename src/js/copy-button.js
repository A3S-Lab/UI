(() => {
  const states = new WeakMap();

  const resolveSource = (root, source) => {
    if (source instanceof Element) {
      return source instanceof HTMLInputElement ||
        source instanceof HTMLTextAreaElement
        ? source.value
        : source.textContent || "";
    }
    if (typeof source === "string") return source;
    if (root.dataset.copyText !== undefined) return root.dataset.copyText;
    const selector = root.dataset.copyTarget;
    if (selector) {
      try {
        const target = document.querySelector(selector);
        if (target) return resolveSource(root, target);
      } catch (_) {}
    }
    return "";
  };

  const fallbackCopy = (value) => {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("The browser rejected the copy request.");
  };

  const writeClipboard = async (value) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch (clipboardError) {
        try {
          fallbackCopy(value);
          return;
        } catch (_) {
          throw clipboardError;
        }
      }
    }
    fallbackCopy(value);
  };

  const setState = (root, state, value, message) => {
    state.value = value;
    root.dataset.state = value;
    root.setAttribute("aria-busy", value === "copying" ? "true" : "false");
    if (state.feedback) {
      const label =
        message ??
        root.dataset[
          value === "copied"
            ? "copySuccess"
            : value === "error"
              ? "copyError"
              : "copyReady"
        ];
      if (label !== undefined) state.feedback.textContent = label;
    }
  };

  const refreshCopyButton = (root) => {
    const state = states.get(root);
    if (!state) return;
    state.feedback = root.querySelector("[data-copy-feedback]");
    state.label = root.querySelector("[data-copy-label]");
  };

  const initCopyButton = (root) => {
    if (root.dataset.copyButtonInitialized) return;
    const state = {
      feedback: root.querySelector("[data-copy-feedback]"),
      label: root.querySelector("[data-copy-label]"),
      resetTimer: 0,
      source: undefined,
      value: "ready",
    };
    states.set(root, state);

    root.getState = () => ({
      source: resolveSource(root, state.source),
      state: state.value,
    });
    root.setSource = (source) => {
      state.source = source;
      if (typeof source === "string") root.dataset.copyText = source;
      else delete root.dataset.copyText;
      setState(root, state, "ready");
    };
    root.copy = async (source, options = {}) => {
      if (root.disabled || root.getAttribute("aria-disabled") === "true") {
        return false;
      }
      const value = resolveSource(root, source ?? state.source);
      const before = new CustomEvent("a3s:copy-before", {
        bubbles: true,
        cancelable: true,
        detail: { source: options.source || "api", value },
      });
      if (!root.dispatchEvent(before)) return false;

      if (state.resetTimer) clearTimeout(state.resetTimer);
      setState(root, state, "copying");
      try {
        await writeClipboard(value);
        setState(root, state, "copied", options.successMessage);
        root.dispatchEvent(
          new CustomEvent("a3s:copy-success", {
            bubbles: true,
            detail: { source: options.source || "api", value },
          }),
        );
        const resetAfter = Math.max(
          0,
          Number(options.resetAfter ?? root.dataset.copyReset) || 3000,
        );
        state.resetTimer = window.setTimeout(
          () => setState(root, state, "ready"),
          resetAfter,
        );
        return true;
      } catch (error) {
        setState(root, state, "error", options.errorMessage);
        root.dispatchEvent(
          new CustomEvent("a3s:copy-error", {
            bubbles: true,
            detail: { error, source: options.source || "api", value },
          }),
        );
        return false;
      }
    };
    root.refresh = () => refreshCopyButton(root);

    const handleClick = (event) => {
      event.preventDefault();
      root.copy(undefined, { source: "user" });
    };
    root.addEventListener("click", handleClick);
    root._destroy = () => {
      if (state.resetTimer) clearTimeout(state.resetTimer);
      root.removeEventListener("click", handleClick);
      states.delete(root);
      delete root.copy;
      delete root.getState;
      delete root.refresh;
      delete root.setSource;
    };

    setState(root, state, "ready");
    root.dataset.copyButtonInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("copy-button", {
      selector: ".copy-button:not([data-copy-button-initialized])",
      init: initCopyButton,
      refresh: refreshCopyButton,
    });
  }
})();
