import { useLang, useVersion, withBase } from "@rspress/core/runtime";
import "./NotFoundLayout.css";

type Locale = "en" | "zh";

const content = {
  en: {
    title: "This page is no longer here.",
    description:
      "The address may have changed, or the page may belong to another documentation version. Use search above or continue from one of the destinations below.",
    home: "Back to home",
    components: "Browse components",
    continueLabel: "Continue browsing",
    destinations: [
      {
        description: "Find components by product task and interface role.",
        label: "Component catalog",
        route: "components/index",
      },
      {
        description: "Open the building blocks for development workspaces.",
        label: "Harness",
        route: "harness/index",
      },
      {
        description:
          "Try complete interface compositions in a separate workspace.",
        label: "Playground",
        route: "playground",
      },
    ],
  },
  zh: {
    title: "这个页面已经不在这里了。",
    description:
      "地址可能已经调整，页面也可能属于其他文档版本。你可以使用上方搜索，或从下面的常用入口继续。",
    home: "返回首页",
    components: "浏览组件",
    continueLabel: "继续浏览",
    destinations: [
      {
        description: "按产品任务和界面职责查找组件。",
        label: "组件目录",
        route: "components/index",
      },
      {
        description: "查看用于开发工作区的构建模块。",
        label: "Harness",
        route: "harness/index",
      },
      {
        description: "在独立工作区体验完整界面组合。",
        label: "Playground",
        route: "playground",
      },
    ],
  },
} as const;

function routePrefix(locale: Locale, version: string) {
  return [version === "next" ? "" : version, locale === "zh" ? "" : locale]
    .filter(Boolean)
    .join("/");
}

function routeHref(route: string, locale: Locale, version: string) {
  const prefix = routePrefix(locale, version);
  const versionedRoute =
    route === "playground" ? route : [prefix, route].filter(Boolean).join("/");
  const localizedRoute =
    route === "playground" && locale === "en" ? `en/${route}` : versionedRoute;
  return withBase(`/${localizedRoute}.html`);
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 10h11m-4-4 4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NotFoundLayout() {
  const currentLanguage = useLang();
  const version = useVersion();
  const locale: Locale = currentLanguage === "en" ? "en" : "zh";
  const copy = content[locale];
  const prefix = routePrefix(locale, version);
  const homeHref = withBase(`/${prefix}${prefix ? "/" : ""}`);

  return (
    <main className="a3s-not-found" aria-labelledby="a3s-not-found-title">
      <div className="a3s-not-found__code" aria-hidden="true">
        404
      </div>
      <section className="a3s-not-found__content">
        <h1 id="a3s-not-found-title">{copy.title}</h1>
        <p>{copy.description}</p>
        <div className="a3s-not-found__actions">
          <a className="a3s-not-found__primary" href={homeHref}>
            {copy.home}
          </a>
          <a
            className="a3s-not-found__secondary"
            href={routeHref("components/index", locale, version)}
          >
            {copy.components}
          </a>
        </div>
        <nav
          className="a3s-not-found__destinations"
          aria-label={copy.continueLabel}
        >
          {copy.destinations.map((destination) => (
            <a
              key={destination.route}
              href={routeHref(destination.route, locale, version)}
            >
              <strong>{destination.label}</strong>
              <span>{destination.description}</span>
              <ArrowIcon />
            </a>
          ))}
        </nav>
      </section>
    </main>
  );
}
