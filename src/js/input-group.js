(() => {
  const primaryControlSelector =
    ":scope > input, :scope > textarea, :scope > select, :scope > [data-control]";
  const interactiveSelector = [
    "a[href]",
    "button",
    "input",
    "label",
    "select",
    "textarea",
    "summary",
    "[contenteditable]:not([contenteditable=false])",
    "[role=button]",
    "[role=checkbox]",
    "[role=combobox]",
    "[role=dialog]",
    "[role=link]",
    "[role=listbox]",
    "[role=menu]",
    "[role=menuitem]",
    "[role=menuitemcheckbox]",
    "[role=menuitemradio]",
    "[role=option]",
    "[role=radio]",
    "[role=slider]",
    "[role=switch]",
    "[role=tab]",
    "[tabindex]",
    "[popover]",
    "[data-popover]",
    ".popover",
    ".dropdown-menu",
  ].join(", ");

  const primaryControl = (root) => root.querySelector(primaryControlSelector);

  const hasTextSelection = () => {
    const selection = window.getSelection();
    return Boolean(
      selection && selection.type === "Range" && !selection.isCollapsed,
    );
  };

  const isUnavailable = (root, control) =>
    root.hasAttribute("data-disabled") ||
    root.getAttribute("aria-disabled") === "true" ||
    ("disabled" in control && control.disabled) ||
    control.getAttribute("aria-disabled") === "true";

  const initInputGroup = (root) => {
    if (root.dataset.inputGroupInitialized === "true") return;

    const handleClick = (event) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const control = primaryControl(root);
      if (!(control instanceof HTMLElement) || control.contains(target)) return;
      if (target.closest(interactiveSelector)) return;
      if (isUnavailable(root, control)) return;
      if (hasTextSelection()) return;

      control.focus({ preventScroll: true });
    };

    root.addEventListener("click", handleClick);
    root._destroy = () => {
      root.removeEventListener("click", handleClick);
      delete root._destroy;
    };

    root.dataset.inputGroupInitialized = "true";
    root.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register("input-group", {
      selector: ".input-group:not([data-input-group-initialized])",
      init: initInputGroup,
    });
  }
})();
