(() => {
  const states = new WeakMap();

  const owns = (root, element) => element.closest(".emoji-picker") === root;
  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .toLocaleLowerCase();

  const getElements = (root) => ({
    empty: root.querySelector("[data-emoji-empty]"),
    input: root.querySelector("input[type='search']"),
    options: Array.from(root.querySelectorAll("[data-emoji-value]")).filter(
      (option) => owns(root, option),
    ),
  });

  const synchronize = (root, state) => {
    const query = normalize(state.query);
    let visible = 0;
    state.options.forEach((option) => {
      const haystack = normalize(
        `${option.dataset.emojiValue || option.textContent || ""} ${
          option.dataset.emojiLabel || option.getAttribute("aria-label") || ""
        } ${option.dataset.emojiKeywords || ""}`,
      );
      option.hidden = Boolean(query) && !haystack.includes(query);
      if (!option.hidden) visible += 1;
    });
    const visibleOptions = state.options.filter((option) => !option.hidden);
    const focused = visibleOptions.includes(document.activeElement)
      ? document.activeElement
      : null;
    const rovingTarget =
      focused ||
      visibleOptions.find(
        (option) => option.getAttribute("aria-selected") === "true",
      ) ||
      visibleOptions.find((option) => option.tabIndex === 0) ||
      visibleOptions[0];
    state.options.forEach((option) => {
      option.tabIndex = option === rovingTarget ? 0 : -1;
    });
    if (state.empty) state.empty.hidden = visible > 0;
    root.dataset.state = visible > 0 ? "ready" : "empty";
    return visible;
  };

  const refreshEmojiPicker = (root) => {
    const state = states.get(root);
    if (!state) return;
    Object.assign(state, getElements(root));
    state.options.forEach((option) => {
      option.setAttribute("role", option.getAttribute("role") || "option");
    });
    synchronize(root, state);
  };

  const initEmojiPicker = (root) => {
    if (root.dataset.emojiPickerInitialized) return;
    const state = { ...getElements(root), query: "", value: null };
    state.query = state.input?.value || "";
    states.set(root, state);

    root.getState = () => ({ query: state.query, value: state.value });
    root.setQuery = (query, options = {}) => {
      state.query = String(query ?? "");
      if (state.input && state.input.value !== state.query)
        state.input.value = state.query;
      const visible = synchronize(root, state);
      if (options.emit !== false) {
        root.dispatchEvent(
          new CustomEvent("a3s:emoji-query-change", {
            bubbles: true,
            detail: {
              query: state.query,
              source: options.source || "api",
              visible,
            },
          }),
        );
      }
      return visible;
    };
    root.select = (value, options = {}) => {
      const option =
        value instanceof Element
          ? value
          : state.options.find(
              (item) => item.dataset.emojiValue === String(value),
            );
      if (
        !option ||
        option.hidden ||
        option.matches(":disabled, [aria-disabled='true']")
      )
        return false;
      const emoji =
        option.dataset.emojiValue || option.textContent?.trim() || "";
      const detail = { emoji, option, source: options.source || "api" };
      const before = new CustomEvent("a3s:emoji-before-select", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      if (!root.dispatchEvent(before)) return false;
      state.options.forEach((item) =>
        item.setAttribute("aria-selected", item === option ? "true" : "false"),
      );
      state.value = emoji;
      synchronize(root, state);
      root.dispatchEvent(
        new CustomEvent("a3s:emoji-select", { bubbles: true, detail }),
      );
      return true;
    };
    root.refresh = () => refreshEmojiPicker(root);

    const handleInput = (event) => {
      if (event.target === state.input)
        root.setQuery(state.input.value, { source: "user" });
    };
    const handleClick = (event) => {
      const option = event.target.closest("[data-emoji-value]");
      if (option && owns(root, option)) root.select(option, { source: "user" });
    };
    const handleKeydown = (event) => {
      const option = event.target.closest("[data-emoji-value]");
      if (!option || !owns(root, option)) return;
      const visible = state.options.filter((item) => !item.hidden);
      const index = visible.indexOf(option);
      if (index < 0) return;
      const columns = Math.max(
        1,
        Math.round(
          (option.parentElement?.getBoundingClientRect().width || 44) /
            (option.getBoundingClientRect().width || 44),
        ),
      );
      const rtl = getComputedStyle(root).direction === "rtl";
      let next = index;
      if (event.key === "ArrowRight") next += rtl ? -1 : 1;
      else if (event.key === "ArrowLeft") next += rtl ? 1 : -1;
      else if (event.key === "ArrowDown") next += columns;
      else if (event.key === "ArrowUp") next -= columns;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = visible.length - 1;
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        root.select(option, { source: "keyboard" });
        return;
      } else return;
      event.preventDefault();
      const target = visible[Math.max(0, Math.min(visible.length - 1, next))];
      if (target) {
        state.options.forEach((item) => {
          item.tabIndex = item === target ? 0 : -1;
        });
        target.focus();
      }
    };
    root.addEventListener("input", handleInput);
    root.addEventListener("click", handleClick);
    root.addEventListener("keydown", handleKeydown);
    root._destroy = () => {
      root.removeEventListener("input", handleInput);
      root.removeEventListener("click", handleClick);
      root.removeEventListener("keydown", handleKeydown);
      states.delete(root);
      delete root.getState;
      delete root.refresh;
      delete root.select;
      delete root.setQuery;
    };

    root.dataset.emojiPickerInitialized = "true";
    refreshEmojiPicker(root);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("emoji-picker", {
      selector: ".emoji-picker:not([data-emoji-picker-initialized])",
      init: initEmojiPicker,
      refresh: refreshEmojiPicker,
    });
  }
})();
