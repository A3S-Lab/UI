(() => {
  const initPopover = (popoverComponent) => {
    if (popoverComponent.dataset.popoverInitialized) return;

    const trigger = popoverComponent.querySelector(":scope > button");
    const content = popoverComponent.querySelector(":scope > [data-popover]");
    let focusFrame = 0;

    if (!trigger || !content) {
      const missing = [];
      if (!trigger) missing.push("trigger");
      if (!content) missing.push("content");
      console.error(
        `Popover initialisation failed. Missing element(s): ${missing.join(", ")}`,
        popoverComponent,
      );
      return;
    }

    const closePopover = (focusOnTrigger = true) => {
      if (trigger.getAttribute("aria-expanded") === "false") return;
      window.cancelAnimationFrame(focusFrame);
      focusFrame = 0;
      trigger.setAttribute("aria-expanded", "false");
      content.setAttribute("aria-hidden", "true");
      if (focusOnTrigger && trigger.isConnected && !trigger.disabled) {
        trigger.focus({ preventScroll: true });
      }
    };

    const openPopover = () => {
      document.dispatchEvent(
        new CustomEvent("basecoat:popover", {
          detail: { source: popoverComponent },
        }),
      );

      trigger.setAttribute("aria-expanded", "true");
      content.setAttribute("aria-hidden", "false");

      const elementToFocus = content.querySelector("[autofocus]");
      if (elementToFocus instanceof HTMLElement) {
        window.cancelAnimationFrame(focusFrame);
        let remainingFocusAttempts = 2;
        const focusAutofocusElement = () => {
          focusFrame = 0;
          if (
            trigger.getAttribute("aria-expanded") === "true" &&
            content.getAttribute("aria-hidden") === "false"
          ) {
            elementToFocus.focus({ preventScroll: true });
            if (
              document.activeElement !== elementToFocus &&
              remainingFocusAttempts > 0
            ) {
              remainingFocusAttempts -= 1;
              focusFrame = window.requestAnimationFrame(focusAutofocusElement);
            }
          }
        };
        focusFrame = window.requestAnimationFrame(focusAutofocusElement);
      }
    };

    const handleTriggerClick = () => {
      const isExpanded = trigger.getAttribute("aria-expanded") === "true";
      if (isExpanded) {
        closePopover();
      } else {
        openPopover();
      }
    };

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        closePopover();
      }
    };

    const handleDocumentClick = (event) => {
      if (!popoverComponent.contains(event.target)) {
        closePopover(false);
      }
    };

    const handleDocumentPopover = (event) => {
      if (event.detail.source !== popoverComponent) {
        closePopover(false);
      }
    };

    trigger.addEventListener("click", handleTriggerClick);
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("basecoat:popover", handleDocumentPopover);

    popoverComponent._destroy = () => {
      window.cancelAnimationFrame(focusFrame);
      trigger.removeEventListener("click", handleTriggerClick);
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("basecoat:popover", handleDocumentPopover);
    };

    popoverComponent.dataset.popoverInitialized = true;
    popoverComponent.dispatchEvent(new CustomEvent("basecoat:initialized"));
  };

  if (window.basecoat) {
    window.basecoat.register(
      "popover",
      ".popover:not([data-popover-initialized])",
      initPopover,
    );
  }
})();
