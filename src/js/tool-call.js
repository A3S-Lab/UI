(() => {
  const states = new WeakMap();
  const runningStates = new Set(["preparing", "running"]);
  const problemStates = new Set([
    "denied",
    "failed",
    "interrupted",
    "timed-out",
    "error",
    "cancelled",
  ]);

  const getElements = (root) => ({
    duration: root.querySelector("[data-tool-duration]"),
    error: root.querySelector("[data-tool-error]"),
    output: root.querySelector("[data-tool-output]"),
    progress: root.querySelector("[data-tool-progress]"),
    status: root.querySelector("[data-tool-status]"),
  });

  const snapshot = (root, state) =>
    Object.freeze({
      duration: state.duration?.textContent?.trim() || "",
      open: root.open,
      output: state.output?.textContent || "",
      progress: state.progressValue,
      state: state.name,
    });

  const synchronize = (root, state) => {
    if (root.dataset.state !== state.name) root.dataset.state = state.name;
    root.setAttribute("aria-busy", String(runningStates.has(state.name)));
    if (state.progress) {
      if (state.progressValue === null) {
        state.progress.removeAttribute("value");
        state.progress.removeAttribute("aria-valuenow");
      } else {
        state.progress.value = state.progressValue;
        state.progress.setAttribute("aria-valuenow", String(state.progressValue));
      }
    }
    if (state.error) state.error.hidden = !problemStates.has(state.name);
  };

  const emitState = (root, state, previous, options = {}) => {
    const detail = {
      current: state.name,
      previous,
      snapshot: snapshot(root, state),
      source: options.source || "api",
    };
    root.dispatchEvent(
      new CustomEvent("a3s:tool-state-change", { bubbles: true, detail }),
    );
    return detail.snapshot;
  };

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const runAction = (root, state, action, options = {}) => {
    const value = String(action || "");
    if (!value) return false;
    const detail = {
      action: value,
      originalEvent: options.originalEvent || null,
      snapshot: snapshot(root, state),
      source: options.source || "api",
    };
    if (
      !root.dispatchEvent(
        new CustomEvent("a3s:tool-before-action", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      )
    ) {
      return false;
    }

    if (value === "toggle") root.toggle();
    if (value === "open") root.openCall();
    if (value === "close") root.close();
    if (value === "copy-output") {
      copyText(state.output?.textContent || "").then(
        () => root.dispatchEvent(new CustomEvent("a3s:tool-copy-success", { bubbles: true })),
        (error) =>
          root.dispatchEvent(
            new CustomEvent("a3s:tool-copy-error", {
              bubbles: true,
              detail: { error },
            }),
          ),
      );
    }
    root.dispatchEvent(
      new CustomEvent("a3s:tool-action", { bubbles: true, detail }),
    );
    return true;
  };

  const initToolCall = (root) => {
    if (root.dataset.toolCallInitialized) return;
    const elements = getElements(root);
    const state = {
      ...elements,
      name: root.dataset.state || "preparing",
      progressValue:
        elements.progress?.hasAttribute("value") &&
        Number.isFinite(Number(elements.progress.value))
          ? Number(elements.progress.value)
          : null,
    };
    states.set(root, state);

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest("[data-tool-action]");
      if (!action || action.closest(".tool-call") !== root) return;
      if (action.tagName === "A") event.preventDefault();
      runAction(root, state, action.dataset.toolAction, {
        originalEvent: event,
        source: "user",
      });
    };
    root.addEventListener("click", handleClick);

    root.appendOutput = (chunk, options = {}) => {
      const value = String(chunk ?? "");
      const previous = state.output?.textContent || "";
      if (state.output) state.output.textContent = previous + value;
      if (options.state) root.setState(options.state, options);
      const detail = {
        chunk: value,
        output: state.output?.textContent || "",
        previous,
        source: options.source || "api",
      };
      root.dispatchEvent(
        new CustomEvent("a3s:tool-output-change", { bubbles: true, detail }),
      );
      return detail.output;
    };
    root.close = () => {
      root.open = false;
      return root.open;
    };
    root.getState = () => snapshot(root, state);
    root.openCall = () => {
      root.open = true;
      return root.open;
    };
    root.refresh = () => {
      Object.assign(state, getElements(root));
      const next = root.dataset.state;
      if (next) state.name = next;
      synchronize(root, state);
      return snapshot(root, state);
    };
    root.runAction = (action, options = {}) =>
      runAction(root, state, action, options);
    root.setOutput = (output, options = {}) => {
      const previous = state.output?.textContent || "";
      const value = String(output ?? "");
      if (state.output) state.output.textContent = value;
      if (options.state) root.setState(options.state, options);
      root.dispatchEvent(
        new CustomEvent("a3s:tool-output-change", {
          bubbles: true,
          detail: {
            chunk: value,
            output: value,
            previous,
            source: options.source || "api",
          },
        }),
      );
      return value;
    };
    root.setProgress = (value, options = {}) => {
      const number = Number(value);
      state.progressValue = Number.isFinite(number)
        ? Math.min(100, Math.max(0, number))
        : null;
      if (options.state) state.name = options.state;
      synchronize(root, state);
      return state.progressValue;
    };
    root.setState = (name, options = {}) => {
      const previous = state.name;
      state.name = String(name || "preparing");
      if (options.label !== undefined && state.status) {
        state.status.textContent = String(options.label);
      }
      if (options.duration !== undefined && state.duration) {
        state.duration.textContent = String(options.duration);
      }
      if (options.error !== undefined && state.error) {
        state.error.textContent = String(options.error || "");
      }
      synchronize(root, state);
      return previous === state.name && !options.force
        ? snapshot(root, state)
        : emitState(root, state, previous, options);
    };
    root.toggle = (force) => {
      root.open = force === undefined ? !root.open : Boolean(force);
      return root.open;
    };
    root._destroy = () => {
      root.removeEventListener("click", handleClick);
      states.delete(root);
      [
        "appendOutput",
        "close",
        "getState",
        "openCall",
        "refresh",
        "runAction",
        "setOutput",
        "setProgress",
        "setState",
        "toggle",
      ].forEach((method) => delete root[method]);
    };

    synchronize(root, state);
    root.dataset.toolCallInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("tool-call", {
      selector: ".tool-call:not([data-tool-call-initialized])",
      init: initToolCall,
      refresh: (root) => root.refresh?.(),
    });
  }
})();
