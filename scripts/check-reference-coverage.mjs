import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { components } from "../src/ai/manifest/index.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const coveragePath = path.join(projectRoot, "LOBEUI_COVERAGE.md");
const source = await readFile(coveragePath, "utf8");
const strict = process.argv.includes("--strict");

const expectedReference = {
  packageName: "@lobehub/ui",
  version: "5.29.3",
  revision: "f1d2a7e7b342f76ffc64602e32f3cb47ae96e0aa",
};
const expectedCounts = new Map([
  ["Components", 75],
  ["Awesome", 10],
  ["Base UI", 16],
  ["Brand", 9],
  ["Chat", 11],
  ["Color", 2],
  ["Hooks and providers", 1],
  ["Icons", 24],
  ["MDX", 7],
  ["Mobile", 4],
  ["StoryBook", 1],
]);
const validDecisions = new Set([
  "Direct",
  "Adapt",
  "Compose",
  "Foundation",
  "Brand substitute",
  "Host integration",
]);
const componentSlugs = new Set(components.map(({ slug }) => slug));
const evidenceKinds = new Set([
  "brand",
  "component",
  "composition",
  "foundation",
  "integration",
  "route",
]);
const expectedEvidenceKind = new Map([
  ["Direct", "component"],
  ["Adapt", "component"],
  ["Compose", "composition"],
  ["Foundation", "foundation"],
  ["Brand substitute", "brand"],
  ["Host integration", "integration"],
]);

function hasFrameworkGuide(guide, framework) {
  const heading = new RegExp(`^## ${framework}$`, "mu");
  const tabProp = framework.toLowerCase();
  const frameworkTabs = new RegExp(
    `<FrameworkTabs\\b[\\s\\S]*?\\b${tabProp}=\\{`,
    "u",
  );
  return heading.test(guide) || frameworkTabs.test(guide);
}

const expectedMetadata = `\`${expectedReference.packageName}\` v${expectedReference.version} at revision \`${expectedReference.revision}\``;
if (!source.includes(expectedMetadata)) {
  throw new Error(
    `Coverage metadata must pin ${expectedReference.packageName} v${expectedReference.version} at ${expectedReference.revision}.`,
  );
}

const rows = [];
let section = null;
for (const [index, line] of source.split(/\r?\n/u).entries()) {
  const heading = /^## (.+)$/u.exec(line)?.[1];
  if (heading) {
    section = expectedCounts.has(heading) ? heading : null;
    continue;
  }
  if (!section || !line.startsWith("| `src/")) continue;

  const cells = line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
  if (cells.length !== 4) {
    throw new Error(
      `${path.basename(coveragePath)}:${index + 1} must contain exactly four coverage columns.`,
    );
  }

  const sourcePath = /^`([^`]+)`$/u.exec(cells[0])?.[1];
  if (!sourcePath?.endsWith("/index.mdx")) {
    throw new Error(
      `${path.basename(coveragePath)}:${index + 1} has an invalid reference source.`,
    );
  }

  rows.push({
    line: index + 1,
    section,
    sourcePath,
    decision: cells[1],
    target: cells[2],
    state: cells[3],
  });
}

const expectedTotal = [...expectedCounts.values()].reduce(
  (total, count) => total + count,
  0,
);
if (rows.length !== expectedTotal) {
  throw new Error(
    `Expected ${expectedTotal} reference rows, found ${rows.length}.`,
  );
}

const sourcePaths = rows.map(({ sourcePath }) => sourcePath);
const uniqueSourcePaths = new Set(sourcePaths);
if (uniqueSourcePaths.size !== sourcePaths.length) {
  const duplicates = [...uniqueSourcePaths].filter(
    (sourcePath) =>
      sourcePaths.indexOf(sourcePath) !== sourcePaths.lastIndexOf(sourcePath),
  );
  throw new Error(`Duplicate reference rows: ${duplicates.join(", ")}.`);
}

for (const [expectedSection, expectedCount] of expectedCounts) {
  const actualCount = rows.filter(
    ({ section: rowSection }) => rowSection === expectedSection,
  ).length;
  if (actualCount !== expectedCount) {
    throw new Error(
      `${expectedSection} must contain ${expectedCount} rows; found ${actualCount}.`,
    );
  }
}

const invalidRows = [];
for (const row of rows) {
  if (!validDecisions.has(row.decision)) {
    invalidRows.push(
      `${row.sourcePath}: unsupported decision \`${row.decision}\``,
    );
  }
  if (!row.target || /\b(?:tbd|unmapped|none)\b/iu.test(row.target)) {
    invalidRows.push(`${row.sourcePath}: target is not mapped`);
  }
  if (!row.state || /\b(?:tbd|unmapped|none)\b/iu.test(row.state)) {
    invalidRows.push(`${row.sourcePath}: current state is not explicit`);
  }
}
if (invalidRows.length > 0) {
  throw new Error(`Invalid coverage rows:\n- ${invalidRows.join("\n- ")}`);
}

if (strict) {
  const evidenceErrors = [];
  for (const row of rows) {
    const evidence = /^Verified — ([a-z]+): ((?:`[^`]+`)(?:, `[^`]+`)*)$/u.exec(
      row.state,
    );
    if (!evidence) {
      evidenceErrors.push(
        `${row.sourcePath}: expected a verified evidence kind and target, found \`${row.state}\``,
      );
      continue;
    }

    const [, kind, evidenceList] = evidence;
    if (!evidenceKinds.has(kind)) {
      evidenceErrors.push(`${row.sourcePath}: unknown evidence kind ${kind}`);
      continue;
    }
    const expectedKind = expectedEvidenceKind.get(row.decision);
    const isStandalonePlayground =
      row.sourcePath === "src/storybook/StoryBook/index.mdx" &&
      kind === "route";
    if (kind !== expectedKind && !isStandalonePlayground) {
      evidenceErrors.push(
        `${row.sourcePath}: ${row.decision} requires ${expectedKind} evidence, found ${kind}`,
      );
      continue;
    }

    const evidenceTargets = [...evidenceList.matchAll(/`([^`]+)`/gu)].map(
      ([, target]) => target,
    );
    if (kind === "component") {
      for (const slug of evidenceTargets) {
        if (!componentSlugs.has(slug)) {
          evidenceErrors.push(
            `${row.sourcePath}: component evidence \`${slug}\` is not in the manifest`,
          );
          continue;
        }
        for (const locale of ["zh", "en"]) {
          const guidePath = path.join(
            projectRoot,
            "site",
            "docs",
            "next",
            locale,
            "components",
            `${slug}.mdx`,
          );
          try {
            const guide = await readFile(guidePath, "utf8");
            if (
              !hasFrameworkGuide(guide, "React") ||
              !hasFrameworkGuide(guide, "Vue")
            ) {
              evidenceErrors.push(
                `${row.sourcePath}: ${locale}/${slug} lacks aligned framework guides`,
              );
            }
          } catch {
            evidenceErrors.push(
              `${row.sourcePath}: missing component guide ${locale}/${slug}`,
            );
          }
        }
      }
      continue;
    }

    if (kind === "route") {
      for (const target of evidenceTargets) {
        if (!target.startsWith("site/pages/") || !target.endsWith(".mdx")) {
          evidenceErrors.push(
            `${row.sourcePath}: route evidence must point to a site/pages MDX source`,
          );
          continue;
        }
        try {
          await readFile(path.join(projectRoot, target), "utf8");
        } catch {
          evidenceErrors.push(
            `${row.sourcePath}: missing route evidence \`${target}\``,
          );
        }
      }
      continue;
    }

    for (const target of evidenceTargets) {
      if (
        !/^(?:components|foundations)\/[a-z0-9-]+\.mdx$/u.test(target)
      ) {
        evidenceErrors.push(
          `${row.sourcePath}: ${kind} evidence has an invalid bilingual guide path \`${target}\``,
        );
        continue;
      }
      for (const locale of ["zh", "en"]) {
        try {
          await readFile(
            path.join(projectRoot, "site", "docs", "next", locale, target),
            "utf8",
          );
        } catch {
          evidenceErrors.push(
            `${row.sourcePath}: missing ${kind} guide ${locale}/${target}`,
          );
        }
      }
    }
  }
  if (evidenceErrors.length > 0) {
    throw new Error(
      `Strict reference coverage evidence is invalid for ${evidenceErrors.length} checks:\n- ${evidenceErrors.join("\n- ")}`,
    );
  }
}

console.log(
  `Validated ${rows.length} unique reference mappings across ${expectedCounts.size} sections${strict ? " with strict completion evidence" : ""}.`,
);
