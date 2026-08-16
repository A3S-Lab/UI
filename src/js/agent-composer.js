(() => {
  const states = new WeakMap();

  const ownsElement = (root, element) =>
    element?.closest?.(".agent-composer") === root;

  const getElements = (root) => ({
    actions: Array.from(root.querySelectorAll("[data-composer-action]")).filter(
      (element) => ownsElement(root, element),
    ),
    editor:
      Array.from(root.querySelectorAll("[data-composer-editor]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    input:
      Array.from(root.querySelectorAll("[data-composer-input]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    status:
      Array.from(root.querySelectorAll("[data-composer-status]")).find(
        (element) => ownsElement(root, element),
      ) || null,
    suggestions:
      Array.from(root.querySelectorAll("[data-composer-suggestions]")).find(
        (element) => ownsElement(root, element),
      ) || null,
  });

  const resourceValues = (root) =>
    Array.from(
      root.querySelectorAll(
        "[data-composer-resources] > li, [data-composer-context] > li",
      ),
    )
      .filter((element) => ownsElement(root, element))
      .map((element) => ({
        id: element.dataset.resourceId || element.dataset.value || "",
        kind: element.dataset.resourceKind || "resource",
        label:
          element.querySelector("[data-resource-label]")?.textContent?.trim() ||
          element.textContent?.trim() ||
          "",
      }));

  const readDraft = (input) => {
    if (!input) return "";
    if (typeof input.getMarkdown === "function") return input.getMarkdown();
    if ("value" in input) return String(input.value || "");
    return input.dataset.markdown ?? input.textContent ?? "";
  };

  const writeDraft = (input, value) => {
    if (!input) return;
    if (typeof input.setMarkdown === "function") {
      input.setMarkdown(value);
      return;
    }
    if ("value" in input) input.value = value;
    else {
      input.textContent = value;
      input.dataset.markdown = value;
    }
  };

  const cloneSnapshot = (root, state) =>
    Object.freeze({
      draft: readDraft(state.input),
      error: state.error,
      resources: resourceValues(root),
      state: state.name,
      suggestionsOpen: Boolean(state.suggestions && !state.suggestions.hidden),
    });

  const synchronize = (root, state) => {
    if (root.dataset.state !== state.name) root.dataset.state = state.name;
    if (["loading", "stopping", "submitting"].includes(state.name)) {
      root.setAttribute("aria-busy", "true");
    } else {
      root.removeAttribute("aria-busy");
    }
    if (state.name === "disabled") root.setAttribute("aria-disabled", "true");
    else if (root.getAttribute("aria-disabled") === "true") {
      root.removeAttribute("aria-disabled");
    }
    if (
      state.status &&
      state.message !== undefined &&
      state.status.textContent !== state.message
    ) {
      state.status.textContent = state.message;
    }
  };

  const emitDraftChange = (root, state, options = {}) => {
    const draft = readDraft(state.input);
    if (draft === state.draft && !options.force) return draft;
    const previous = state.draft;
    state.draft = draft;
    root.dispatchEvent(
      new CustomEvent("a3s:composer-draft-change", {
        bubbles: true,
        detail: {
          draft,
          previous,
          source: options.source || "user",
        },
      }),
    );
    return draft;
  };

  const setSuggestions = (root, state, open, options = {}) => {
    if (!state.suggestions) return false;
    state.suggestions.hidden = !open;
    state.suggestions.setAttribute("aria-hidden", String(!open));
    if (state.input) {
      state.input.setAttribute("aria-expanded", String(open));
      if (open) {
        state.suggestions.id ||= `a3s-composer-suggestions-${state.id}`;
        state.input.setAttribute("aria-controls", state.suggestions.id);
      } else {
        state.input.removeAttribute("aria-activedescendant");
      }
    }
    root.toggleAttribute("data-suggestions-open", open);
    root.dispatchEvent(
      new CustomEvent("a3s:composer-trigger-change", {
        bubbles: true,
        detail: {
          open,
          source: options.source || "api",
          trigger: options.trigger || null,
        },
      }),
    );
    return true;
  };

  const runAction = (root, state, action, options = {}) => {
    const value = String(action || "");
    if (!value) return false;
    const detail = {
      action: value,
      draft: readDraft(state.input),
      originalEvent: options.originalEvent || null,
      queueId: options.element?.dataset.queueId || null,
      resources: resourceValues(root),
      source: options.source || "api",
      state: state.name,
    };
    const allowed = root.dispatchEvent(
      new CustomEvent("a3s:composer-before-action", {
        bubbles: true,
        cancelable: true,
        detail,
      }),
    );
    if (!allowed) return false;

    if (value === "open-suggestions") {
      setSuggestions(root, state, true, options);
    } else if (value === "close-suggestions") {
      setSuggestions(root, state, false, options);
    } else if (value === "clear-draft") {
      root.clearDraft({ source: options.source || "action" });
    }

    root.dispatchEvent(
      new CustomEvent(
        options.element?.closest?.("[data-composer-queue]")
          ? "a3s:composer-queue-action"
          : "a3s:composer-action",
        { bubbles: true, detail },
      ),
    );
    return true;
  };

  let composerId = 0;
  const initAgentComposer = (root) => {
    if (root.dataset.agentComposerInitialized) return;
    const elements = getElements(root);
    const state = {
      ...elements,
      draft: readDraft(elements.input),
      error: null,
      id: ++composerId,
      message: elements.status?.textContent || "",
      name: root.dataset.state || "ready",
    };
    states.set(root, state);

    const refresh = () => {
      const next = getElements(root);
      Object.assign(state, next);
      state.draft = readDraft(state.input);
      synchronize(root, state);
      return cloneSnapshot(root, state);
    };

    const handleInput = (event) => {
      if (!state.input || event.target !== state.input) return;
      emitDraftChange(root, state, { source: "user" });
    };

    const handleSubmit = (event) => {
      if (event.target !== root) return;
      const detail = {
        draft: readDraft(state.input),
        originalEvent: event,
        resources: resourceValues(root),
        state: state.name,
      };
      const allowed = root.dispatchEvent(
        new CustomEvent("a3s:composer-before-submit", {
          bubbles: true,
          cancelable: true,
          detail,
        }),
      );
      if (!allowed) {
        event.preventDefault();
        return;
      }
      root.dispatchEvent(
        new CustomEvent("a3s:composer-submit", {
          bubbles: true,
          detail,
        }),
      );
    };

    const handleClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest("[data-composer-action]");
      if (!action || !ownsElement(root, action)) return;
      const value = action.dataset.composerAction;
      if (!value) return;
      if (action.tagName === "A") event.preventDefault();
      runAction(root, state, value, {
        element: action,
        originalEvent: event,
        source: "user",
      });
    };

    const observer = new MutationObserver((mutations) => {
      if (
        mutations.some(
          (mutation) =>
            mutation.type === "childList" ||
            mutation.attributeName === "data-state",
        )
      ) {
        const nextName = root.dataset.state;
        if (nextName && nextName !== state.name) state.name = nextName;
        refresh();
      }
    });
    observer.observe(root, {
      attributeFilter: ["data-state"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.addEventListener("submit", handleSubmit);

    root.clearDraft = (options = {}) => root.setDraft("", options);
    root.closeSuggestions = (options = {}) =>
      setSuggestions(root, state, false, options);
    root.focusInput = (options = {}) => {
      state.input?.focus?.({ preventScroll: options.preventScroll !== false });
      return document.activeElement === state.input;
    };
    root.getDraft = () => readDraft(state.input);
    root.getState = () => cloneSnapshot(root, state);
    root.openSuggestions = (trigger, options = {}) =>
      setSuggestions(root, state, true, { ...options, trigger });
    root.refresh = refresh;
    root.runAction = (action, options = {}) =>
      runAction(root, state, action, options);
    root.setDraft = (value, options = {}) => {
      const next = String(value ?? "");
      const previous = readDraft(state.input);
      writeDraft(state.input, next);
      state.draft = next;
      if (options.emit !== false && next !== previous) {
        root.dispatchEvent(
          new CustomEvent("a3s:composer-draft-change", {
            bubbles: true,
            detail: {
              draft: next,
              previous,
              source: options.source || "api",
            },
          }),
        );
      }
      return next;
    };
    root.setError = (message, options = {}) => {
      state.error = message ? String(message) : null;
      return root.setState(state.error ? "error" : options.state || "ready", {
        ...options,
        message: state.error || options.message || "",
      });
    };
    root.setState = (name, options = {}) => {
      const previous = state.name;
      state.name = String(name || "ready");
      if (options.message !== undefined)
        state.message = String(options.message);
      if (state.name !== "error" && options.preserveError !== true)
        state.error = null;
      synchronize(root, state);
      const snapshot = cloneSnapshot(root, state);
      if (previous !== state.name || options.force) {
        root.dispatchEvent(
          new CustomEvent("a3s:composer-state-change", {
            bubbles: true,
            detail: {
              current: state.name,
              previous,
              snapshot,
              source: options.source || "api",
            },
          }),
        );
      }
      return snapshot;
    };
    root._destroy = () => {
      observer.disconnect();
      root.removeEventListener("click", handleClick);
      root.removeEventListener("input", handleInput);
      root.removeEventListener("submit", handleSubmit);
      states.delete(root);
      [
        "clearDraft",
        "closeSuggestions",
        "focusInput",
        "getDraft",
        "getState",
        "openSuggestions",
        "refresh",
        "runAction",
        "setDraft",
        "setError",
        "setState",
      ].forEach((method) => delete root[method]);
    };

    synchronize(root, state);
    root.dataset.agentComposerInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("agent-composer", {
      selector: ".agent-composer:not([data-agent-composer-initialized])",
      init: initAgentComposer,
      refresh: (root) => root.refresh?.(),
    });
  }
})();
