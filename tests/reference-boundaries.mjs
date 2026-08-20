import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { components } from "../src/ai/manifest/index.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const locales = ["zh", "en"];
const publicTextRoots = [
  "README.md",
  "site/docs",
  "site/pages",
  "site/theme",
  "site/rspress.config.ts",
];
const publicTextExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mdx",
  ".svg",
  ".ts",
  ".tsx",
]);
const prohibitedPublicNames = [
  /\bcodex\b/iu,
  /\bworkbuddy\b/iu,
  /\bkunagent\b/iu,
  /\blobe\s*ui\b/iu,
  /\blobehub\b/iu,
];
const officialLogoSha256 =
  "72b94cf69a95dc6153f865c4f8742c0f67079caa876f35f8b2b5f970ea795a2d";

function pascal(value) {
  return value
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

async function read(relativePath) {
  return readFile(path.join(projectRoot, relativePath), "utf8");
}

async function listTextFiles(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const entries = await readdir(absolutePath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      if (["doc_build", "node_modules"].includes(entry.name)) continue;
      files.push(...(await listTextFiles(child)));
    } else if (publicTextExtensions.has(path.extname(entry.name))) {
      files.push(child);
    }
  }
  return files;
}

function documentsFramework(source, framework) {
  const tabProp = framework.toLowerCase();
  const frameworkTabs = new RegExp(
    `<FrameworkTabs\\b[\\s\\S]*?\\b${tabProp}=\\{`,
    "u",
  );
  if (framework === "HTML") {
    return /^```html$/mu.test(source) || frameworkTabs.test(source);
  }
  return (
    new RegExp(`^## ${framework}$`, "mu").test(source) ||
    frameworkTabs.test(source)
  );
}

function collectMetadataLinks(value, links = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectMetadataLinks(entry, links));
    return links;
  }
  if (!value || typeof value !== "object") return links;
  if (typeof value.link === "string") links.add(value.link);
  Object.values(value).forEach((entry) => collectMetadataLinks(entry, links));
  return links;
}

function collectMetadataGroups(value) {
  assert.ok(Array.isArray(value), "Sidebar metadata must be an array.");
  return value.filter(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      entry.type === "custom-link" &&
      typeof entry.label === "string" &&
      Array.isArray(entry.items),
  );
}

function groupLinkOrder(groups) {
  return groups.map((group) => group.items.map((item) => item.link));
}

function assertUniqueLinks(links, scope) {
  assert.equal(
    new Set(links).size,
    links.length,
    `${scope} must not contain duplicate links.`,
  );
}

const sidebarMetadata = {};
for (const locale of locales) {
  sidebarMetadata[locale] = {
    components: JSON.parse(
      await read(`site/docs/next/${locale}/components/_meta.json`),
    ),
    harness: JSON.parse(
      await read(`site/docs/next/${locale}/harness/_meta.json`),
    ),
    root: JSON.parse(await read(`site/docs/next/${locale}/_meta.json`)),
  };
}

const componentGroupsByLocale = Object.fromEntries(
  locales.map((locale) => [
    locale,
    collectMetadataGroups(sidebarMetadata[locale].components),
  ]),
);
const harnessGroupsByLocale = Object.fromEntries(
  locales.map((locale) => [
    locale,
    collectMetadataGroups(sidebarMetadata[locale].harness),
  ]),
);
assert.deepEqual(
  componentGroupsByLocale.zh.map((group) => group.label),
  [
    "操作与输入",
    "选择与筛选",
    "导航与定位",
    "应用结构",
    "浮层与菜单",
    "反馈与状态",
    "内容与媒体",
    "数据展示",
  ],
);
assert.deepEqual(
  componentGroupsByLocale.en.map((group) => group.label),
  [
    "Actions and input",
    "Selection and filtering",
    "Navigation and wayfinding",
    "Application structure",
    "Overlays and menus",
    "Feedback and status",
    "Content and media",
    "Data display",
  ],
);
assert.deepEqual(
  harnessGroupsByLocale.zh.map((group) => group.label),
  [
    "工作区框架",
    "任务与输入",
    "会话与消息",
    "文件与知识",
    "执行与授权",
    "审阅与证据",
    "开发与预览",
  ],
);
assert.deepEqual(
  harnessGroupsByLocale.en.map((group) => group.label),
  [
    "Workspace framework",
    "Task and input",
    "Conversation and messages",
    "Files and knowledge",
    "Execution and approval",
    "Review and evidence",
    "Development and preview",
  ],
);
assert.deepEqual(
  groupLinkOrder(componentGroupsByLocale.zh),
  groupLinkOrder(componentGroupsByLocale.en),
  "Chinese and English general-component group order must match.",
);
assert.deepEqual(
  groupLinkOrder(harnessGroupsByLocale.zh),
  groupLinkOrder(harnessGroupsByLocale.en),
  "Chinese and English Harness group order must match.",
);
for (const locale of locales) {
  const allGroups = [
    ...componentGroupsByLocale[locale],
    ...harnessGroupsByLocale[locale],
  ];
  assert.ok(
    allGroups.every((group) => group.collapsed === true),
    `${locale} sidebar groups must default to collapsed.`,
  );
}

const generalComponentLinks = componentGroupsByLocale.en.flatMap((group) =>
  group.items.map((item) => item.link),
);
const harnessLinks = harnessGroupsByLocale.en.flatMap((group) =>
  group.items.map((item) => item.link),
);
const harnessComponentLinks = harnessLinks.filter((link) =>
  link.startsWith("components/"),
);
const harnessLayoutLinks = harnessLinks.filter((link) =>
  link.startsWith("harness/"),
);
const semanticCatalogLinks = [
  ...generalComponentLinks,
  ...harnessComponentLinks,
];

assert.equal(generalComponentLinks.length, 86);
assert.equal(harnessComponentLinks.length, 30);
assert.deepEqual(harnessLayoutLinks, [
  "harness/dock-workspace",
  "harness/grid-view",
  "harness/split-view",
  "harness/pane-view",
]);

for (const locale of locales) {
  for (const link of harnessLayoutLinks) {
    const relativePath = `site/docs/next/${locale}/${link}.mdx`;
    const source = await read(relativePath);
    for (const marker of [
      "<FrameworkTabs",
      'htmlInstall="npm install @a3s-lab/ui dockview@8.1.0"',
      "dockview-react@8.1.0",
      "dockview-vue@8.1.0",
      '<script type="module">',
    ]) {
      assert.ok(
        source.includes(marker),
        `${relativePath} must keep installation and runnable examples inside the HTML/React/Vue tabs: ${marker}`,
      );
    }
  }
}

assert.equal(semanticCatalogLinks.length, 116);
assertUniqueLinks(semanticCatalogLinks, "Semantic component navigation");
assertUniqueLinks(
  [...generalComponentLinks, ...harnessLinks],
  "General-component and Harness navigation",
);
assert.deepEqual(
  [...semanticCatalogLinks].sort(),
  components.map((component) => `components/${component.slug}`).sort(),
  "The two component menus must cover the complete manifest exactly once.",
);

for (const [locale, expectedLabel] of [
  ["zh", "通用组件"],
  ["en", "General components"],
]) {
  const componentDirectory = sidebarMetadata[locale].root.find(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      entry.type === "dir" &&
      entry.name === "components",
  );
  assert.equal(componentDirectory?.label, expectedLabel);
  assert.equal(
    sidebarMetadata[locale].root.some(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        entry.type === "dir" &&
        entry.name === "patterns",
    ),
    false,
    `${locale} root metadata must not expose the retired Patterns chapter.`,
  );
}

for (const component of components) {
  const componentName = pascal(component.slug);
  const hookName = `use${componentName}`;
  const hasBehavior =
    component.events.length > 0 || component.methods.length > 0;
  for (const locale of locales) {
    const relativePath = `site/docs/next/${locale}/components/${component.slug}.mdx`;
    const source = await read(relativePath);
    assert.ok(
      documentsFramework(source, "HTML"),
      `${relativePath} must document HTML.`,
    );
    assert.ok(
      documentsFramework(source, "React"),
      `${relativePath} must document React.`,
    );
    assert.ok(
      documentsFramework(source, "Vue"),
      `${relativePath} must document Vue.`,
    );
    assert.match(
      source,
      new RegExp(`import \\{[^}]*\\b${componentName}\\b`, "u"),
      `${relativePath} must import its framework adapter.`,
    );
    if (hasBehavior) {
      const hookMatches = source.match(new RegExp(`\\b${hookName}\\b`, "gu"));
      assert.ok(
        hookMatches && hookMatches.length >= 4,
        `${relativePath} must use ${hookName} in both framework examples and explanations.`,
      );
    }
  }
}

for (const locale of locales) {
  const generalCatalog = await read(
    `site/docs/next/${locale}/components/index.mdx`,
  );
  const harnessCatalog = await read(
    `site/docs/next/${locale}/harness/index.mdx`,
  );
  const catalogLinks = collectMetadataLinks([
    sidebarMetadata[locale].components,
    sidebarMetadata[locale].harness,
  ]);
  assert.ok(
    generalCatalog.includes("<ComponentCatalog />"),
    `${locale} component index must render the searchable catalog.`,
  );
  for (const component of components) {
    assert.ok(
      catalogLinks.has(`components/${component.slug}`),
      `${locale} metadata must include the ${component.slug} component.`,
    );
    if (component.category === "harness") {
      assert.ok(
        harnessCatalog.includes(`](/components/${component.slug})`),
        `${locale} Harness index must link the ${component.slug} component.`,
      );
    }
  }
}

const boundaryPages = {
  "foundations/runtime-configuration.mdx": [
    "useA3SLocale",
    "useA3STheme",
    "useA3SMotion",
    "data-theme",
    "dir",
  ],
};
for (const [page, markers] of Object.entries(boundaryPages)) {
  for (const locale of locales) {
    const relativePath = `site/docs/next/${locale}/${page}`;
    const source = await read(relativePath);
    for (const marker of markers) {
      assert.ok(
        source.includes(marker),
        `${relativePath} must include ${marker}.`,
      );
    }
  }
}

const rspressConfig = await read("site/rspress.config.ts");
assert.match(rspressConfig, /icon:\s*"\/logo\.png"/u);
assert.match(rspressConfig, /logo:\s*"\/logo\.png"/u);
assert.match(
  rspressConfig,
  /rel:\s*"icon",\s*type:\s*"image\/png",\s*href:\s*`\$\{base\}logo\.png`/u,
);
assert.match(
  rspressConfig,
  /rel:\s*"apple-touch-icon",\s*href:\s*`\$\{base\}logo\.png`/u,
);
const logo = await readFile(
  path.join(projectRoot, "site/docs/public/logo.png"),
);
assert.equal(
  createHash("sha256").update(logo).digest("hex"),
  officialLogoSha256,
  "The docs logo must remain byte-identical to the official A3S OS asset.",
);
const socialCard = await read("site/docs/public/social-card.svg");
assert.match(socialCard, /<image href="logo\.png"/u);
for (const retiredAsset of [
  "site/docs/public/assets/favicon.svg",
  "site/docs/public/assets/apple-touch-icon.png",
  "site/docs/public/assets/social.png",
]) {
  await assert.rejects(
    readFile(path.join(projectRoot, retiredAsset)),
    `${retiredAsset} must not remain as a competing identity asset.`,
  );
}

for (const locale of locales) {
  const page = await read(`site/pages/playground.${locale}.mdx`);
  assert.match(page, /pageType:\s*custom/u);
  assert.match(page, /sidebar:\s*false/u);
  assert.match(page, /outline:\s*false/u);
  assert.match(page, /search:\s*false/u);
  const componentMeta = await read(
    `site/docs/next/${locale}/components/_meta.json`,
  );
  assert.doesNotMatch(componentMeta, /playground/iu);
  for (const version of ["next", "v0.3.0", "v0.2.0", "v0.1.0"]) {
    await assert.rejects(
      readFile(
        path.join(
          projectRoot,
          "site",
          "docs",
          version,
          locale,
          "patterns",
          "_meta.json",
        ),
      ),
      `${version}/${locale} must not retain the retired Patterns chapter.`,
    );
  }
}

const publicFiles = [];
for (const root of publicTextRoots) {
  if (path.extname(root)) publicFiles.push(root);
  else publicFiles.push(...(await listTextFiles(root)));
}
for (const relativePath of publicFiles) {
  const source = await read(relativePath);
  for (const prohibitedName of prohibitedPublicNames) {
    assert.doesNotMatch(
      source,
      prohibitedName,
      `${relativePath} contains a prohibited public reference name.`,
    );
  }
  assert.doesNotMatch(
    source,
    /a3s-ui-mark|A3S UI design system mark/iu,
    `${relativePath} references a retired identity asset.`,
  );
}

console.log(
  `Validated ${components.length} bilingual framework guides, documentation boundaries, official identity, and standalone Playground ownership.`,
);
