import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);
const buildRoot = resolve(repositoryRoot, "site/doc_build");
const docsRoot = resolve(repositoryRoot, "site/docs");
const pagesRoot = resolve(repositoryRoot, "site/pages");
const outputRoot = resolve(
  repositoryRoot,
  ".a3s-test/generated/documentation-visual-audit",
);
const baseUrl = "http://127.0.0.1:4178/UI/";
const versions = ["next", "v0.3.0", "v0.2.0", "v0.1.0"];
const locales = ["zh", "en"];
const ignoredBuiltRoutes = new Set(["device-preview.html"]);
const viewportDefinitions = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};
const batchSize = Number.parseInt(process.env.A3S_AUDIT_BATCH_SIZE ?? "12", 10);

if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 32) {
  throw new Error("A3S_AUDIT_BATCH_SIZE must be an integer from 1 to 32.");
}

async function collectFiles(directory, include) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(path, include);
      return entry.isFile() && include(entry.name) ? [path] : [];
    }),
  );
  return files.flat();
}

function aclString(value) {
  return JSON.stringify(value);
}

function routeIdentifier(index, route) {
  const slug =
    route
      .replace(/\.html$/, "")
      .replace(/[^A-Za-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "index";
  return `route-${String(index).padStart(4, "0")}-${slug}`;
}

function repositoryPath(path) {
  return relative(repositoryRoot, path).split(sep).join("/");
}

function documentationPage(source, version, locale) {
  const sourceRoot = resolve(docsRoot, version, locale);
  const relativeSource = relative(sourceRoot, source).split(sep).join("/");
  const routePath = relativeSource.replace(/\.mdx?$/, ".html");
  const versionPrefix = version === "next" ? "" : `${version}/`;
  const localePrefix = locale === "en" ? "en/" : "";
  const section = relativeSource.includes("/")
    ? relativeSource.split("/", 1)[0]
    : "root";

  return {
    isSectionIndex: relativeSource.endsWith("/index.mdx"),
    kind: "documentation",
    locale,
    route: `${versionPrefix}${localePrefix}${routePath}`,
    section,
    source: repositoryPath(source),
    version,
  };
}

async function collectAuthoredPages() {
  const documentationPages = (
    await Promise.all(
      versions.flatMap((version) =>
        locales.map(async (locale) => {
          const sourceRoot = resolve(docsRoot, version, locale);
          const sources = await collectFiles(sourceRoot, (name) =>
            /\.mdx?$/.test(name),
          );
          return sources.map((source) =>
            documentationPage(source, version, locale),
          );
        }),
      ),
    )
  ).flat();

  return [
    ...documentationPages,
    {
      kind: "playground",
      locale: "zh",
      route: "playground.html",
      source: repositoryPath(resolve(pagesRoot, "playground.zh.mdx")),
      version: "next",
    },
    {
      kind: "playground",
      locale: "en",
      route: "en/playground.html",
      source: repositoryPath(resolve(pagesRoot, "playground.en.mdx")),
      version: "next",
    },
    {
      kind: "system",
      locale: "zh",
      route: "404.html",
      source: null,
      version: "next",
    },
  ];
}

function viewportCapture({
  direction,
  locale,
  route,
  theme,
  toggleTheme,
  viewport,
}) {
  const { width, height } = viewportDefinitions[viewport];
  const id = direction === "rtl" ? `rtl-${viewport}` : `${theme}-${viewport}`;
  const evidenceDirectory =
    direction === "rtl" ? `rtl/${viewport}` : `${theme}/${viewport}`;
  const themeSelector =
    theme === "dark" ? "html.dark.rp-dark" : "html:not(.dark):not(.rp-dark)";
  const rtlControlLabel =
    locale === "zh" ? "切换为从右到左布局" : "Preview right-to-left layout";
  const rtlControlSelector = `.rp-doc .a3s-preview button[aria-label=${JSON.stringify(
    rtlControlLabel,
  )}]`;

  return `        viewport ${aclString(id)} {
            width = ${width}
            height = ${height}
            scale = 1
        }

        navigate ${aclString(`${id}-open`)} {
            url = ${aclString(new URL(route, baseUrl).href)}
        }

        wait ${aclString(`${id}-loaded`)} {
            load = "networkidle"
        }

        wait ${aclString(`${id}-ready`)} {
            visible = css("html:not([data-a3s-defer-init])")
        }
${
  toggleTheme
    ? `
        click ${aclString(`${id}-toggle-theme`)} {
            target = css(".rp-switch-appearance")
        }
`
    : ""
}
        expect ${aclString(`${id}-theme-ready`)} {
            visible = css(${aclString(themeSelector)})
        }
${
  direction === "rtl"
    ? `
        click ${aclString(`${id}-activate-direction`)} {
            target = css(${aclString(rtlControlSelector)})
        }

        expect ${aclString(`${id}-direction-ready`)} {
            visible = css(".rp-doc .a3s-preview[data-preview-direction=rtl]")
        }

        press ${aclString(`${id}-return-to-top`)} {
            key = "Home"
        }

        snapshot ${aclString(`${id}-top-settled`)} {
            interactive = false
        }
`
    : ""
}

        screenshot ${aclString(`${id}-top`)} {
            path = ${aclString(`${evidenceDirectory}/top.png`)}
        }

        press ${aclString(`${id}-scroll-to-bottom`)} {
            key = "End"
        }

        snapshot ${aclString(`${id}-bottom-settled`)} {
            interactive = false
        }

        press ${aclString(`${id}-confirm-bottom`)} {
            key = "End"
        }

        snapshot ${aclString(`${id}-bottom-confirmed`)} {
            interactive = false
        }

        screenshot ${aclString(`${id}-bottom`)} {
            path = ${aclString(`${evidenceDirectory}/bottom.png`)}
        }`;
}

function profilesForPage(page, requestedTheme) {
  const profiles = [];
  if (requestedTheme !== "dark") {
    profiles.push(
      { direction: "ltr", theme: "light", viewport: "desktop" },
      { direction: "ltr", theme: "light", viewport: "tablet" },
      { direction: "ltr", theme: "light", viewport: "mobile" },
    );
  }
  if (requestedTheme !== "light") {
    profiles.push({ direction: "ltr", theme: "dark", viewport: "desktop" });
  }
  if (
    requestedTheme !== "dark" &&
    page.kind === "documentation" &&
    page.section === "components" &&
    !page.isSectionIndex
  ) {
    profiles.push({ direction: "rtl", theme: "light", viewport: "desktop" });
  }
  return profiles;
}

function expectedEvidence(profiles) {
  return [
    ...profiles.flatMap(({ direction, theme, viewport }) => {
      const directory =
        direction === "rtl" ? `rtl/${viewport}` : `${theme}/${viewport}`;
      return [`${directory}/top.png`, `${directory}/bottom.png`];
    }),
    "evidence/accessibility.json",
    "evidence/console.json",
    "evidence/page-errors.json",
  ];
}

function scenario(page, profiles) {
  const blocks = [];
  let currentTheme = "light";
  for (const profile of profiles) {
    blocks.push(
      viewportCapture({
        ...profile,
        locale: page.locale,
        route: page.route,
        toggleTheme: profile.theme !== currentTheme,
      }),
    );
    currentTheme = profile.theme;
  }

  return `    scenario ${aclString(page.id)} {
        name = ${aclString(`Visual audit: ${page.route}`)}
        surface = "web"
        timeout_ms = 180000

${blocks.join("\n\n")}

        accessibility "accessibility" {
            path = "evidence/accessibility.json"
            interactive = true
        }

        console "console" {
            path = "evidence/console.json"
            clear = false
        }

        page_errors "page-errors" {
            path = "evidence/page-errors.json"
            clear = false
        }
    }`;
}

const builtRoutes = new Set(
  (await collectFiles(buildRoot, (name) => name.endsWith(".html"))).map(
    (path) => relative(buildRoot, path).split(sep).join("/"),
  ),
);
const publicBuiltRoutes = new Set(
  [...builtRoutes].filter((route) => !ignoredBuiltRoutes.has(route)),
);
const authoredPages = await collectAuthoredPages();
const duplicateRoutes = authoredPages
  .map(({ route }) => route)
  .filter((route, index, routes) => routes.indexOf(route) !== index);

if (duplicateRoutes.length > 0) {
  throw new Error(
    `Duplicate authored routes:\n${[...new Set(duplicateRoutes)]
      .map((route) => `- ${route}`)
      .join("\n")}`,
  );
}

const authoredRouteSet = new Set(authoredPages.map(({ route }) => route));
const missingBuiltRoutes = authoredPages.filter(
  ({ route }) => !publicBuiltRoutes.has(route),
);
const unauthoredBuiltRoutes = [...publicBuiltRoutes].filter(
  (route) => !authoredRouteSet.has(route),
);

if (missingBuiltRoutes.length > 0 || unauthoredBuiltRoutes.length > 0) {
  throw new Error(
    [
      missingBuiltRoutes.length > 0
        ? `Built pages are missing:\n${missingBuiltRoutes
            .map(({ route, source }) => `- ${route} (${source ?? "generated"})`)
            .join("\n")}`
        : "",
      unauthoredBuiltRoutes.length > 0
        ? `Built pages are absent from the audit inventory:\n${unauthoredBuiltRoutes
            .map((route) => `- ${route}`)
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

const allPages = authoredPages
  .sort((left, right) => left.route.localeCompare(right.route, "en"))
  .map((page, index) => ({
    ...page,
    id: routeIdentifier(index + 1, page.route),
    index: index + 1,
  }));
const requestedRoute = process.env.A3S_AUDIT_ROUTE;
const requestedLocale = process.env.A3S_AUDIT_LOCALE ?? "all";
const requestedSection = process.env.A3S_AUDIT_SECTION ?? "all";
const requestedVersion = process.env.A3S_AUDIT_VERSION ?? "all";
const requestedTheme = process.env.A3S_AUDIT_THEME ?? "both";

if (!["all", ...locales].includes(requestedLocale)) {
  throw new Error("A3S_AUDIT_LOCALE must be all, en, or zh.");
}

if (!["all", ...versions].includes(requestedVersion)) {
  throw new Error(
    `A3S_AUDIT_VERSION must be all or one of: ${versions.join(", ")}.`,
  );
}

if (!["both", "dark", "light"].includes(requestedTheme)) {
  throw new Error("A3S_AUDIT_THEME must be both, dark, or light.");
}

const pages = allPages.filter((page) => {
  if (requestedRoute && page.route !== requestedRoute) return false;
  if (requestedLocale !== "all" && page.locale !== requestedLocale) {
    return false;
  }
  if (requestedVersion !== "all" && page.version !== requestedVersion) {
    return false;
  }
  if (requestedSection !== "all") {
    if (page.kind !== "documentation" || page.section !== requestedSection) {
      return false;
    }
    if (requestedSection === "components" && page.isSectionIndex) {
      return false;
    }
  }
  return true;
});

if (pages.length === 0) {
  throw new Error(
    `No page matched route=${requestedRoute ?? "*"}, locale=${requestedLocale}, section=${requestedSection}, version=${requestedVersion}.`,
  );
}

const pageProfiles = new Map(
  pages.map((page) => [page.id, profilesForPage(page, requestedTheme)]),
);

await mkdir(outputRoot, { recursive: true });

for (const entry of await readdir(outputRoot, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".acl")) {
    await unlink(resolve(outputRoot, entry.name));
  }
}

const batches = [];
for (let start = 0; start < pages.length; start += batchSize) {
  const batchNumber = batches.length + 1;
  const batchPages = pages.slice(start, start + batchSize);
  const suiteName = `documentation-visual-audit-${String(batchNumber).padStart(3, "0")}`;
  const source = `suite ${aclString(suiteName)} {
    version = 1

${batchPages
  .map((page) => scenario(page, pageProfiles.get(page.id)))
  .join("\n\n")}
}
`;
  const filename = `${suiteName}.acl`;
  await writeFile(resolve(outputRoot, filename), source, "utf8");
  batches.push({
    filename,
    firstRoute: batchPages[0].route,
    lastRoute: batchPages.at(-1).route,
    pageCount: batchPages.length,
  });
}

const generatedAt = new Date().toISOString();
const screenshotCount = pages.reduce(
  (count, page) => count + pageProfiles.get(page.id).length * 2,
  0,
);
await writeFile(
  resolve(outputRoot, "routes.json"),
  `${JSON.stringify(
    {
      baseUrl,
      generatedAt,
      ignoredBuiltRoutes: [...ignoredBuiltRoutes],
      inventoryPageCount: allPages.length,
      pageCount: pages.length,
      screenshotCount,
      filters: {
        locale: requestedLocale,
        route: requestedRoute ?? null,
        section: requestedSection,
        theme: requestedTheme,
        version: requestedVersion,
      },
      viewports: viewportDefinitions,
      pages: pages.map((page) => ({
        ...page,
        expectedEvidence: expectedEvidence(pageProfiles.get(page.id)),
        profiles: pageProfiles.get(page.id),
        url: new URL(page.route, baseUrl).href,
      })),
      batches,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify({
    outputRoot,
    inventoryPageCount: allPages.length,
    pageCount: pages.length,
    batchCount: batches.length,
    screenshotCount,
  }),
);
