import { useContext, useEffect, type ReactNode } from "react";
import { ThemeContext, useLocation, withBase } from "@rspress/core/runtime";

type RootProps = {
  children: ReactNode;
};

function ensureStylesheet(
  selector: string,
  source: string,
  attributes: Record<string, string>,
) {
  const existing = document.querySelector<HTMLLinkElement>(selector);
  if (existing) return existing;

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = source;
  Object.entries(attributes).forEach(([name, value]) => {
    stylesheet.setAttribute(name, value);
  });
  document.head.append(stylesheet);
  return stylesheet;
}

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
    ensureStylesheet(
      'link[rel="stylesheet"][href$="/assets/a3s-cascade.css"]',
      withBase("/assets/a3s-cascade.css"),
      { "data-a3s-ui-cascade": "true" },
    );
    ensureStylesheet(
      'link[rel="stylesheet"][href$="/assets/a3s-ui.css"]',
      withBase("/assets/a3s-ui.css"),
      { "data-a3s-ui-styles": "true" },
    );

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
      ?.setAttribute("content", theme === "dark" ? "#0d1118" : "#f5f7fb");
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

          if (group.tagName === "SUMMARY") {
            panel.id ||= `rspress-sidebar-group-${index}-panel`;
            panel.inert = false;
            panel.removeAttribute("aria-hidden");
            group.setAttribute("aria-controls", panel.id);
            group.removeAttribute("aria-expanded");
            group.removeAttribute("role");
            group.removeAttribute("tabindex");
            return;
          }

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
        .querySelectorAll<HTMLElement>(".rp-doc .rp-table-scroll-container")
        .forEach((container) => {
          const overflowing = container.scrollWidth > container.clientWidth + 1;
          container.dataset.a3sTableOverflow = String(overflowing);

          const synchronizeScrollPosition = () => {
            const maximum = Math.max(
              0,
              container.scrollWidth - container.clientWidth,
            );
            const offset = Math.min(maximum, Math.abs(container.scrollLeft));
            container.dataset.a3sTableScrollPosition =
              maximum <= 1
                ? "none"
                : offset <= 1
                  ? "start"
                  : maximum - offset <= 1
                    ? "end"
                    : "middle";
          };

          if (!container.hasAttribute("data-a3s-table-scroll-bound")) {
            container.setAttribute("data-a3s-table-scroll-bound", "true");
            container.addEventListener("scroll", synchronizeScrollPosition, {
              passive: true,
            });
          }
          synchronizeScrollPosition();

          if (overflowing) {
            container.setAttribute("role", "region");
            container.setAttribute(
              "aria-label",
              isChinese ? "可横向滚动的表格" : "Horizontally scrollable table",
            );
            container.tabIndex = 0;
            return;
          }

          container.removeAttribute("role");
          container.removeAttribute("aria-label");
          container.removeAttribute("tabindex");
        });

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

      document
        .querySelectorAll<HTMLAnchorElement>(
          '.rp-social-links__item[href*="github.com/A3S-Lab/UI"]',
        )
        .forEach((link) => {
          link.setAttribute(
            "aria-label",
            isChinese ? "在 GitHub 查看 A3S UI" : "View A3S UI on GitHub",
          );
        });

      document
        .querySelectorAll<HTMLButtonElement>(".rp-code-copy-button")
        .forEach((button) => {
          const label = isChinese ? "复制代码" : "Copy code";
          button.setAttribute("aria-label", label);
          button.setAttribute("title", label);
        });

      const sidebar = document.querySelector<HTMLElement>(
        ".rp-doc-layout__sidebar",
      );
      const sidebarTrigger = document.querySelector<HTMLElement>(
        ".rp-sidebar-menu__left",
      );
      const sidebarOpen =
        sidebar?.classList.contains("rp-doc-layout__sidebar--open") ?? false;
      synchronizePanel(
        sidebar,
        sidebarTrigger,
        sidebarQuery.matches && !sidebarOpen,
        "rspress-documentation-sidebar",
      );
      if (sidebarTrigger?.matches("button")) {
        sidebarTrigger.setAttribute(
          "aria-label",
          sidebarOpen
            ? isChinese
              ? "关闭文档导航"
              : "Close documentation navigation"
            : isChinese
              ? "打开文档导航"
              : "Open documentation navigation",
        );
        const visibleLabel = sidebarTrigger.querySelector("span");
        const currentLabel = visibleLabel?.textContent?.trim() ?? "";
        const nextLabel = isChinese ? "菜单" : "Menu";
        if (
          ["菜单", "Menu", "文档导航", "Docs"].includes(currentLabel) &&
          currentLabel !== nextLabel
        ) {
          visibleLabel!.textContent = nextLabel;
        }
      }

      const outline = document.querySelector<HTMLElement>(
        ".rp-doc-layout__outline",
      );
      const outlineTrigger = document.querySelector<HTMLElement>(
        ".rp-sidebar-menu__right",
      );
      const outlineOpen =
        outline?.classList.contains("rp-doc-layout__outline--open") ?? false;
      synchronizePanel(
        outline,
        outlineTrigger,
        outlineQuery.matches && !outlineOpen,
        "rspress-documentation-outline",
      );
      if (outlineTrigger?.matches("button")) {
        outlineTrigger.setAttribute(
          "aria-label",
          outlineOpen
            ? isChinese
              ? "关闭本页目录"
              : "Close page outline"
            : isChinese
              ? "打开本页目录"
              : "Open page outline",
        );
        const visibleLabel = outlineTrigger.querySelector<HTMLElement>(
          ".rp-sidebar-menu__right__text",
        );
        const currentLabel = visibleLabel?.textContent?.trim() ?? "";
        const nextLabel = isChinese ? "目录" : "Outline";
        if (
          ["目录", "本页目录", "Outline", "On this page"].includes(
            currentLabel,
          ) &&
          currentLabel !== nextLabel
        ) {
          visibleLabel!.textContent = nextLabel;
        }
      }
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
    window.addEventListener("resize", synchronizeDocumentationControls);
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
      window.removeEventListener("resize", synchronizeDocumentationControls);
      document.body.removeEventListener("keydown", handleDocumentationKeyboard);
    };
  }, [location.pathname]);

  return <>{children}</>;
}
