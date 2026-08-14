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

for (const component of components) {
  const componentName = pascal(component.slug);
  const hookName = `use${componentName}`;
  const hasBehavior =
    component.events.length > 0 || component.methods.length > 0;
  for (const locale of locales) {
    const relativePath = `site/docs/next/${locale}/components/${component.slug}.mdx`;
    const source = await read(relativePath);
    assert.match(
      source,
      /^## React$/mu,
      `${relativePath} must document React.`,
    );
    assert.match(source, /^## Vue$/mu, `${relativePath} must document Vue.`);
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
  for (const component of components) {
    const catalog =
      component.category === "harness" ? harnessCatalog : generalCatalog;
    assert.ok(
      catalog.includes(`](/components/${component.slug})`),
      `${locale} catalog must link the ${component.slug} component.`,
    );
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
  "patterns/composition-recipes.mdx": [
    "aria-busy",
    "data-editor-command",
    "safe-area-inset-bottom",
  ],
  "patterns/host-integrations.mdx": [
    "data-icon-slot",
    "data-markdown-renderer",
    "data-host-integration",
  ],
  "patterns/landmarks-and-mobile.mdx": [
    "/logo.png",
    "safe-area-inset-bottom",
    "useTaskWorkspace",
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

const hostIntegrationEnglish = await read(
  "site/docs/next/en/patterns/host-integrations.mdx",
);
const hostIntegrationChinese = await read(
  "site/docs/next/zh/patterns/host-integrations.mdx",
);
assert.ok(
  hostIntegrationEnglish.includes("A3S UI owns") &&
    hostIntegrationEnglish.includes("Host owns"),
  "The English host-integration guide must state both ownership sides.",
);
assert.ok(
  hostIntegrationChinese.includes("A3S UI 拥有") &&
    hostIntegrationChinese.includes("宿主拥有"),
  "The Chinese host-integration guide must state both ownership sides.",
);

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
  const patternMeta = await read(
    `site/docs/next/${locale}/patterns/_meta.json`,
  );
  assert.doesNotMatch(componentMeta, /playground/iu);
  assert.doesNotMatch(patternMeta, /playground/iu);
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
  `Validated ${components.length} bilingual framework guides, four product-boundary guides, official identity, and standalone Playground ownership.`,
);
