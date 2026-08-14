(() => {
  const states = new WeakMap();

  const linkId = (link) => {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#")) return "";
    try {
      return decodeURIComponent(href.slice(1));
    } catch (_) {
      return href.slice(1);
    }
  };

  const getLinks = (root) =>
    Array.from(root.querySelectorAll("a[href^='#']")).filter(
      (link) => link.closest(".table-of-contents") === root,
    );

  const observe = (root, state) => {
    state.observer?.disconnect();
    state.observer = null;
    if (typeof IntersectionObserver !== "function") return;
    const headings = state.links
      .map((link) => document.getElementById(linkId(link)))
      .filter(Boolean);
    if (!headings.length) return;
    state.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          );
        if (visible[0])
          root.setCurrent(visible[0].target.id, { source: "scroll" });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 1] },
    );
    headings.forEach((heading) => state.observer.observe(heading));
  };

  const refreshTableOfContents = (root) => {
    const state = states.get(root);
    if (!state) return;
    state.links = getLinks(root);
    const current =
      (state.links.some((link) => linkId(link) === state.current)
        ? state.current
        : "") ||
      linkId(
        state.links.find(
          (link) => link.getAttribute("aria-current") === "location",
        ),
      ) ||
      location.hash.slice(1) ||
      linkId(state.links[0]);
    observe(root, state);
    if (current) root.setCurrent(current, { emit: false, source: "refresh" });
  };

  const initTableOfContents = (root) => {
    if (root.dataset.tableOfContentsInitialized) return;
    const state = { current: "", links: getLinks(root), observer: null };
    states.set(root, state);

    root.getState = () => ({
      current: state.current,
      ids: state.links.map(linkId).filter(Boolean),
    });
    root.setCurrent = (value, options = {}) => {
      const id =
        value instanceof Element
          ? value.id
          : String(value || "").replace(/^#/, "");
      if (!id || !state.links.some((link) => linkId(link) === id)) return false;
      const previous = state.current;
      state.current = id;
      state.links.forEach((link) => {
        if (linkId(link) === id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      root.dataset.state = "current";
      if (previous !== id && options.emit !== false) {
        root.dispatchEvent(
          new CustomEvent("a3s:table-of-contents-change", {
            bubbles: true,
            detail: { current: id, previous, source: options.source || "api" },
          }),
        );
      }
      return true;
    };
    root.refresh = () => refreshTableOfContents(root);

    const handleClick = (event) => {
      const link = event.target.closest("a[href^='#']");
      if (link && root.contains(link))
        root.setCurrent(linkId(link), { source: "user" });
    };
    const handleHashChange = () => {
      if (location.hash) root.setCurrent(location.hash, { source: "hash" });
    };
    root.addEventListener("click", handleClick);
    window.addEventListener("hashchange", handleHashChange);
    root._destroy = () => {
      state.observer?.disconnect();
      root.removeEventListener("click", handleClick);
      window.removeEventListener("hashchange", handleHashChange);
      states.delete(root);
      delete root.getState;
      delete root.refresh;
      delete root.setCurrent;
    };

    root.dataset.tableOfContentsInitialized = "true";
    root.dataset.state = "ready";
    refreshTableOfContents(root);
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("table-of-contents", {
      selector: ".table-of-contents:not([data-table-of-contents-initialized])",
      init: initTableOfContents,
      refresh: refreshTableOfContents,
    });
  }
})();
