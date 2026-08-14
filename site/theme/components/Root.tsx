import { useContext, useEffect, type ReactNode } from "react";
import { ThemeContext, useLocation, withBase } from "@rspress/core/runtime";

type RootProps = {
  children: ReactNode;
};

function ensureScript(
  selector: string,
  source: string,
  attributes: Record<string, string>,
) {
  const existing = document.querySelector<HTMLScriptElement>(selector);
  if (existing) return existing;

  const script = document.createElement("script");
  script.src = source;
  Object.entries(attributes).forEach(([name, value]) => {
    script.setAttribute(name, value);
  });
  document.head.append(script);
  return script;
}

export function Root({ children }: RootProps) {
  const location = useLocation();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const initializeRuntime = () => {
      window.a3sUI?.start();
      window.a3sUI?.initAll();
      document.documentElement.removeAttribute("data-a3s-defer-init");

      ensureScript(
        "script[data-a3s-ui-ai-runtime]",
        withBase("/assets/a3s-ui.ai.js"),
        { "data-a3s-ui-ai-runtime": "true", type: "module" },
      );
    };

    const runtimeScript = ensureScript(
      "script[data-a3s-ui-runtime]",
      withBase("/assets/a3s-ui.min.js"),
      { "data-a3s-ui-runtime": "true" },
    );

    if (window.a3sUI) initializeRuntime();
    else
      runtimeScript.addEventListener("load", initializeRuntime, { once: true });

    return () => runtimeScript.removeEventListener("load", initializeRuntime);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.a3sUI?.start();
      window.a3sUI?.initAll();
      window.a3sAI?.scan(document);
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem("themeMode", theme);
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }

    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#101118" : "#f8f9fb");
  }, [theme]);

  useEffect(() => {
    const sidebarQuery = window.matchMedia("(max-width: 768px)");
    const outlineQuery = window.matchMedia("(max-width: 1279px)");
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "summary",
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    const synchronizePanel = (
      panel: HTMLElement | null,
      trigger: HTMLElement | null,
      hidden: boolean,
      id: string,
    ) => {
      if (!panel) return;

      const wasHidden = panel.inert;
      panel.id ||= id;
      panel.inert = hidden;
      if (hidden) panel.setAttribute("aria-hidden", "true");
      else panel.removeAttribute("aria-hidden");

      if (trigger) {
        trigger.setAttribute("aria-controls", panel.id);
        trigger.setAttribute("aria-expanded", String(!hidden));
      }

      if (hidden && !wasHidden && panel.contains(document.activeElement)) {
        trigger?.focus();
      } else if (!hidden && wasHidden && trigger === document.activeElement) {
        requestAnimationFrame(() => {
          panel.querySelector<HTMLElement>(focusableSelector)?.focus();
        });
      }
    };

    const synchronizeSidebarGroups = () => {
      document
        .querySelectorAll<HTMLElement>(".rp-sidebar-group")
        .forEach((group, index) => {
          const panel = group.nextElementSibling;
          if (!(panel instanceof HTMLElement)) return;

          const hidden = panel.style.gridTemplateRows === "0fr";
          panel.id ||= `rspress-sidebar-group-${index}-panel`;
          panel.inert = hidden;
          if (hidden) panel.setAttribute("aria-hidden", "true");
          else panel.removeAttribute("aria-hidden");

          if (!group.matches("a[href]")) {
            group.setAttribute("role", "button");
            group.tabIndex = 0;
          }
          group.setAttribute("aria-controls", panel.id);
          group.setAttribute("aria-expanded", String(!hidden));

          if (hidden && panel.contains(document.activeElement)) group.focus();
        });
    };

    const synchronizeDocumentationControls = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const isChinese = document.documentElement.lang.startsWith("zh");

      synchronizeSidebarGroups();

      document
        .querySelectorAll<HTMLElement>(".rp-switch-appearance")
        .forEach((toggle) => {
          toggle.setAttribute("role", "button");
          toggle.tabIndex = 0;
          toggle.setAttribute(
            "aria-label",
            isDark
              ? isChinese
                ? "切换到浅色主题"
                : "Switch to light theme"
              : isChinese
                ? "切换到深色主题"
                : "Switch to dark theme",
          );
        });

      document
        .querySelectorAll<HTMLElement>(".rp-search-button--mobile")
        .forEach((searchButton) => {
          searchButton.setAttribute("role", "button");
          searchButton.setAttribute("aria-haspopup", "dialog");
          searchButton.setAttribute(
            "aria-label",
            isChinese ? "搜索文档" : "Search documentation",
          );
          searchButton.tabIndex = 0;
        });

      const sidebar = document.querySelector<HTMLElement>(
        ".rp-doc-layout__sidebar",
      );
      synchronizePanel(
        sidebar,
        document.querySelector<HTMLElement>(".rp-sidebar-menu__left"),
        sidebarQuery.matches &&
          !sidebar?.classList.contains("rp-doc-layout__sidebar--open"),
        "rspress-documentation-sidebar",
      );

      const outline = document.querySelector<HTMLElement>(
        ".rp-doc-layout__outline",
      );
      synchronizePanel(
        outline,
        document.querySelector<HTMLElement>(".rp-sidebar-menu__right"),
        outlineQuery.matches &&
          !outline?.classList.contains("rp-doc-layout__outline--open"),
        "rspress-documentation-outline",
      );
    };

    const handleDocumentationKeyboard = (event: KeyboardEvent) => {
      if (!(event.target instanceof HTMLElement)) return;

      const sidebarGroup = event.target.closest<HTMLElement>(
        '.rp-sidebar-group[role="button"]',
      );
      if (
        sidebarGroup &&
        (event.key === "Enter" || event.key === " ") &&
        !event.isComposing
      ) {
        event.preventDefault();
        event.stopPropagation();
        sidebarGroup.click();
        return;
      }

      const keyboardControl = event.target.closest<HTMLElement>(
        ".rp-switch-appearance, .rp-search-button--mobile",
      );
      if (keyboardControl && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        event.stopPropagation();
        keyboardControl.click();
        return;
      }

      if (event.key === "Escape") {
        const openOutline = document.querySelector<HTMLElement>(
          ".rp-doc-layout__outline--open",
        );
        const openSidebar = document.querySelector<HTMLElement>(
          ".rp-doc-layout__sidebar--open",
        );

        if (openOutline) {
          event.preventDefault();
          event.stopPropagation();
          document
            .querySelector<HTMLElement>(".rp-sidebar-menu__right")
            ?.click();
          return;
        }

        if (openSidebar) {
          event.preventDefault();
          event.stopPropagation();
          document
            .querySelector<HTMLElement>(".rp-sidebar-menu__mask")
            ?.click();
          return;
        }
      }

      if (
        event.key !== "Enter" ||
        event.isComposing ||
        event.defaultPrevented ||
        event.target.closest(".rp-search-panel")
      ) {
        return;
      }

      const interactive = event.target.closest(
        [
          "a[href]",
          "button",
          "input",
          "select",
          "textarea",
          "summary",
          '[role="button"]',
          '[role="link"]',
          '[role="menuitem"]',
          '[role="tab"]',
        ].join(", "),
      );
      if (interactive) event.stopPropagation();
    };

    synchronizeDocumentationControls();
    const observer = new MutationObserver(synchronizeDocumentationControls);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "lang"],
    });
    [
      document.querySelector("#__rspress_modal_container"),
      document.querySelector(".rp-nav"),
      document.querySelector(".rp-doc-layout__container"),
    ].forEach((target) => {
      if (!target) return;
      observer.observe(target, {
        attributes: true,
        attributeFilter: ["class", "style"],
        childList: true,
        subtree: true,
      });
    });

    sidebarQuery.addEventListener("change", synchronizeDocumentationControls);
    outlineQuery.addEventListener("change", synchronizeDocumentationControls);
    document.body.addEventListener("keydown", handleDocumentationKeyboard);

    return () => {
      observer.disconnect();
      sidebarQuery.removeEventListener(
        "change",
        synchronizeDocumentationControls,
      );
      outlineQuery.removeEventListener(
        "change",
        synchronizeDocumentationControls,
      );
      document.body.removeEventListener("keydown", handleDocumentationKeyboard);
    };
  }, [location.pathname]);

  return <>{children}</>;
}
