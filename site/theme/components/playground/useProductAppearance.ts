import { useCallback, useEffect, useState } from "react";

export type ProductAppearance = "dark" | "light" | "system";
export type ProductColorMode = Exclude<ProductAppearance, "system">;

function readStoredAppearance(): ProductAppearance {
  try {
    const value = window.localStorage.getItem("rspress-theme-appearance");
    if (value === "dark" || value === "light") return value;
    if (value === "auto") return "system";
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
  }
  return "system";
}

function readColorMode(): ProductColorMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function resolveAppearance(appearance: ProductAppearance): ProductColorMode {
  if (appearance !== "system") return appearance;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useProductAppearance() {
  const [appearance, setAppearance] = useState<ProductAppearance>("system");
  const [mode, setMode] = useState<ProductColorMode>(readColorMode);

  useEffect(() => {
    const root = document.documentElement;
    const synchronize = () => {
      setAppearance(readStoredAppearance());
      setMode(readColorMode());
    };
    const observer = new MutationObserver(synchronize);

    synchronize();
    observer.observe(root, { attributeFilter: ["class"], attributes: true });
    document.addEventListener("a3s:themechange", synchronize);
    window.addEventListener("storage", synchronize);

    return () => {
      observer.disconnect();
      document.removeEventListener("a3s:themechange", synchronize);
      window.removeEventListener("storage", synchronize);
    };
  }, []);

  const chooseAppearance = useCallback((next: ProductAppearance) => {
    const nextMode = resolveAppearance(next);
    const storedPreference = next === "system" ? "auto" : next;
    try {
      window.localStorage.setItem("rspress-theme-appearance", storedPreference);
      window.localStorage.setItem("themeMode", nextMode);
    } catch {
      // The document event still updates the active page when storage is blocked.
    }

    const root = document.documentElement;
    const isDark = nextMode === "dark";
    root.classList.toggle("dark", isDark);
    root.classList.toggle("rp-dark", isDark);
    root.style.colorScheme = nextMode;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDark ? "#0d0d0f" : "#ffffff");

    try {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "rspress-theme-appearance",
          newValue: storedPreference,
        }),
      );
    } catch {
      // The root classes above are sufficient when synthetic storage events fail.
    }

    setAppearance(next);
    setMode(nextMode);
    document.dispatchEvent(
      new CustomEvent("a3s:themechange", {
        detail: { mode: nextMode, preference: next },
      }),
    );
  }, []);

  const toggleMode = useCallback(() => {
    chooseAppearance(mode === "dark" ? "light" : "dark");
  }, [chooseAppearance, mode]);

  return { appearance, chooseAppearance, mode, toggleMode };
}
