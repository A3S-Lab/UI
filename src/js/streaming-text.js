(() => {
  const states = new WeakMap();

  const getElements = (root) => ({
    content: root.querySelector("[data-streaming-content]"),
    status: root.querySelector("[data-streaming-status]"),
  });

  const synchronize = (root, state) => {
    root.dataset.state = state.state;
    root.setAttribute("aria-busy", state.state === "streaming" ? "true" : "false");
    if (state.status && state.message !== undefined)
      state.status.textContent = state.message;
  };

  const refreshStreamingText = (root) => {
    const state = states.get(root);
    if (!state) return;
    Object.assign(state, getElements(root));
    synchronize(root, state);
  };

  const initStreamingText = (root) => {
    if (root.dataset.streamingTextInitialized) return;
    const elements = getElements(root);
    const state = {
      ...elements,
      message: elements.status?.textContent || "",
      state: root.dataset.state || "streaming",
      text: elements.content?.textContent || "",
    };
    states.set(root, state);

    root.getState = () => ({
      message: state.message,
      state: state.state,
      text: state.text,
    });
    root.setText = (value, options = {}) => {
      const previousText = state.text;
      state.text = String(value ?? "");
      state.state = options.state || "streaming";
      if (state.content) state.content.textContent = state.text;
      if (options.message !== undefined) state.message = options.message;
      synchronize(root, state);
      root.dispatchEvent(
        new CustomEvent("a3s:streaming-text-update", {
          bubbles: true,
          detail: {
            chunk: state.text,
            previousText,
            source: options.source || "api",
            text: state.text,
          },
        }),
      );
      return state.text;
    };
    root.append = (chunk, options = {}) => {
      const value = String(chunk ?? "");
      const previousText = state.text;
      state.text += value;
      state.state = options.state || "streaming";
      if (state.content) state.content.textContent = state.text;
      if (options.message !== undefined) state.message = options.message;
      synchronize(root, state);
      root.dispatchEvent(
        new CustomEvent("a3s:streaming-text-update", {
          bubbles: true,
          detail: {
            chunk: value,
            previousText,
            source: options.source || "api",
            text: state.text,
          },
        }),
      );
      return state.text;
    };
    root.complete = (options = {}) => {
      state.state = options.state || "complete";
      if (options.message !== undefined) state.message = options.message;
      synchronize(root, state);
      const detail = {
        error: options.error || null,
        source: options.source || "api",
        state: state.state,
        text: state.text,
      };
      root.dispatchEvent(
        new CustomEvent("a3s:streaming-text-complete", {
          bubbles: true,
          detail,
        }),
      );
      return detail;
    };
    root.refresh = () => refreshStreamingText(root);
    root._destroy = () => {
      states.delete(root);
      delete root.append;
      delete root.complete;
      delete root.getState;
      delete root.refresh;
      delete root.setText;
    };

    root.dataset.streamingTextInitialized = "true";
    synchronize(root, state);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("streaming-text", {
      selector: ".streaming-text:not([data-streaming-text-initialized])",
      init: initStreamingText,
      refresh: refreshStreamingText,
    });
  }
})();
