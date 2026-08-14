import { useEffect, useState, type CSSProperties } from "react";
import { withBase } from "@rspress/core/runtime";

type Locale = "zh" | "en";
type Appearance = "light" | "dark" | "system";
type Accent = "blue" | "violet" | "emerald" | "amber" | "rose";
type Radius = "sharp" | "balanced" | "rounded";
type Density = "compact" | "comfortable";

const accentOptions: Array<{ color: string; id: Accent; label: string }> = [
  { id: "blue", label: "Iris", color: "#5b57d9" },
  { id: "violet", label: "Violet", color: "#6d4aff" },
  { id: "emerald", label: "Emerald", color: "#0c9970" },
  { id: "amber", label: "Amber", color: "#c27216" },
  { id: "rose", label: "Rose", color: "#c84d68" },
];

const copy = {
  zh: {
    title: "把 A3S UI 调成你的产品。",
    description:
      "选择外观、强调色、圆角和界面密度。修改会立即作用于整站与组件预览，并在下次访问时恢复。",
    appearance: "外观",
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
    accent: "强调色",
    radius: "圆角",
    sharp: "方正",
    balanced: "均衡",
    rounded: "圆润",
    density: "密度",
    compact: "紧凑",
    comfortable: "舒适",
    reset: "恢复默认",
    showPreview: "展开产品预览",
    hidePreview: "收起产品预览",
    preview: "实时产品预览",
    workspace: "A3S 工作区",
    project: "智能体运行概览",
    status: "所有系统正常",
    open: "打开控制台",
    inspect: "查看运行",
    activity: "最近活动",
    completed: "部署已完成",
    active: "3 个智能体正在运行",
  },
  en: {
    title: "Tune A3S UI to your product.",
    description:
      "Choose appearance, accent, radius, and interface density. Changes apply to the entire site and every component preview immediately, then persist for your next visit.",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
    accent: "Accent",
    radius: "Radius",
    sharp: "Sharp",
    balanced: "Balanced",
    rounded: "Rounded",
    density: "Density",
    compact: "Compact",
    comfortable: "Comfortable",
    reset: "Reset defaults",
    showPreview: "Show product preview",
    hidePreview: "Hide product preview",
    preview: "LIVE PRODUCT PREVIEW",
    workspace: "A3S Workspace",
    project: "Agent run overview",
    status: "All systems nominal",
    open: "Open console",
    inspect: "Inspect run",
    activity: "Recent activity",
    completed: "Deployment completed",
    active: "3 agents are running",
  },
} as const;

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
  }
}

function isAppearance(
  value: string | null,
): value is Exclude<Appearance, "system"> {
  return value === "light" || value === "dark";
}

function isAccent(value: string | undefined | null): value is Accent {
  return accentOptions.some((option) => option.id === value);
}

function isRadius(value: string | undefined | null): value is Radius {
  return value === "sharp" || value === "balanced" || value === "rounded";
}

function isDensity(value: string | undefined | null): value is Density {
  return value === "compact" || value === "comfortable";
}

function resolvedAppearance(appearance: Appearance) {
  if (appearance !== "system") return appearance;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeCustomizer({ locale }: { locale: Locale }) {
  const labels = copy[locale];
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [accent, setAccent] = useState<Accent>("blue");
  const [radius, setRadius] = useState<Radius>("balanced");
  const [density, setDensity] = useState<Density>("compact");
  const [previewExpanded, setPreviewExpanded] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const preference = readStorage("rspress-theme-appearance");
    setAppearance(
      preference === "auto"
        ? "system"
        : isAppearance(preference)
          ? preference
          : "system",
    );
    setAccent(
      isAccent(root.dataset.a3sAccent) ? root.dataset.a3sAccent : "blue",
    );
    setRadius(
      isRadius(root.dataset.a3sRadius) ? root.dataset.a3sRadius : "balanced",
    );
    setDensity(
      isDensity(root.dataset.a3sDensity) ? root.dataset.a3sDensity : "compact",
    );

    const synchronizeAppearance = () => {
      const stored = readStorage("rspress-theme-appearance");
      setAppearance(
        stored === "auto"
          ? "system"
          : isAppearance(stored)
            ? stored
            : root.classList.contains("dark")
              ? "dark"
              : "light",
      );
    };
    const observer = new MutationObserver(synchronizeAppearance);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("storage", synchronizeAppearance);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", synchronizeAppearance);
    };
  }, []);

  const chooseAppearance = (nextAppearance: Appearance) => {
    const mode = resolvedAppearance(nextAppearance);
    writeStorage(
      "rspress-theme-appearance",
      nextAppearance === "system" ? "auto" : nextAppearance,
    );
    setAppearance(nextAppearance);
    document.dispatchEvent(
      new CustomEvent("a3s:themechange", {
        detail: { mode, preference: nextAppearance },
      }),
    );
  };

  const chooseAccent = (nextAccent: Accent) => {
    document.documentElement.dataset.a3sAccent = nextAccent;
    writeStorage("a3s-ui-accent", nextAccent);
    setAccent(nextAccent);
    document.dispatchEvent(
      new CustomEvent("a3s:stylechange", {
        detail: { accent: nextAccent },
      }),
    );
  };

  const chooseRadius = (nextRadius: Radius) => {
    document.documentElement.dataset.a3sRadius = nextRadius;
    writeStorage("a3s-ui-radius", nextRadius);
    setRadius(nextRadius);
    document.dispatchEvent(
      new CustomEvent("a3s:stylechange", {
        detail: { radius: nextRadius },
      }),
    );
  };

  const chooseDensity = (nextDensity: Density) => {
    document.documentElement.dataset.a3sDensity = nextDensity;
    writeStorage("a3s-ui-density", nextDensity);
    setDensity(nextDensity);
    document.dispatchEvent(
      new CustomEvent("a3s:stylechange", {
        detail: { density: nextDensity },
      }),
    );
  };

  const reset = () => {
    chooseAccent("blue");
    chooseRadius("balanced");
    chooseDensity("compact");
    chooseAppearance("system");
  };

  return (
    <section
      className="ui-theme-customizer"
      aria-labelledby="ui-theme-customizer-title"
      data-a3s-customizer
    >
      <div className="ui-theme-customizer__controls">
        <header>
          <h2 id="ui-theme-customizer-title">{labels.title}</h2>
          <p>{labels.description}</p>
        </header>

        <div className="ui-theme-customizer__fields">
          <fieldset data-customizer-field="appearance">
            <legend>{labels.appearance}</legend>
            <div className="ui-theme-customizer__segments">
              {(["light", "dark", "system"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={appearance === option}
                  onClick={() => chooseAppearance(option)}
                  data-theme-appearance={option}
                >
                  {labels[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset data-customizer-field="accent">
            <legend>{labels.accent}</legend>
            <div className="ui-theme-customizer__swatches">
              {accentOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={accent === option.id}
                  onClick={() => chooseAccent(option.id)}
                  data-theme-accent={option.id}
                  style={{ "--theme-swatch": option.color } as CSSProperties}
                >
                  <span />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset data-customizer-field="radius">
            <legend>{labels.radius}</legend>
            <div className="ui-theme-customizer__segments">
              {(["sharp", "balanced", "rounded"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={radius === option}
                  onClick={() => chooseRadius(option)}
                  data-theme-radius={option}
                >
                  {labels[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset data-customizer-field="density">
            <legend>{labels.density}</legend>
            <div className="ui-theme-customizer__segments">
              {(["compact", "comfortable"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={density === option}
                  onClick={() => chooseDensity(option)}
                  data-theme-density={option}
                >
                  {labels[option]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <button
          type="button"
          className="ui-theme-customizer__reset"
          onClick={reset}
        >
          {labels.reset}
        </button>
        <button
          type="button"
          className="ui-theme-customizer__preview-toggle"
          aria-controls="ui-theme-product-preview"
          aria-expanded={previewExpanded}
          onClick={() => setPreviewExpanded((expanded) => !expanded)}
        >
          {previewExpanded ? labels.hidePreview : labels.showPreview}
        </button>
      </div>

      <aside
        id="ui-theme-product-preview"
        className="ui-theme-customizer__preview"
        data-mobile-expanded={previewExpanded}
        aria-label={labels.preview}
      >
        <div className="ui-theme-customizer__preview-label">
          <span>{labels.preview}</span>
          <i />
        </div>
        <div className="ui-theme-product" aria-hidden="true">
          <header>
            <span className="ui-theme-product__mark">
              <img src={withBase("/logo.png")} alt="" />
            </span>
            <strong>{labels.workspace}</strong>
            <span data-status>{labels.status}</span>
          </header>
          <div className="ui-theme-product__body">
            <nav>
              <span data-preview-nav-item data-current="true">
                <i />
              </span>
              <span data-preview-nav-item>
                <i />
              </span>
              <span data-preview-nav-item>
                <i />
              </span>
            </nav>
            <div data-preview-main>
              <h3>{labels.project}</h3>
              <div className="ui-theme-product__actions">
                <span>{labels.open}</span>
                <span>{labels.inspect}</span>
              </div>
              <section>
                <header>{labels.activity}</header>
                <article>
                  <i data-state="success" />
                  <span>{labels.completed}</span>
                  <small>09:42</small>
                </article>
                <article>
                  <i data-state="active" />
                  <span>{labels.active}</span>
                  <small>LIVE</small>
                </article>
              </section>
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
