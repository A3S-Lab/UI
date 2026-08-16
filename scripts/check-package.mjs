import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const manifest = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8"),
);

if (manifest.name !== "@a3s-lab/ui") {
  throw new Error(`Unexpected package name: ${manifest.name}`);
}

const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) {
  throw new Error("npm_execpath is required to validate the package.");
}

const { stdout } = await execFileAsync(
  process.execPath,
  [npmCliPath, "pack", "--dry-run", "--ignore-scripts", "--json"],
  { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
);
const [pack] = JSON.parse(stdout);
if (!pack || pack.name !== manifest.name || pack.version !== manifest.version) {
  throw new Error("npm pack metadata does not match package.json.");
}

const packedFiles = new Set(pack.files.map(({ path: filePath }) => filePath));
const requiredFiles = [
  "LICENSE.md",
  "README.md",
  "package.json",
  "dist/a3s-ui.css",
  "dist/a3s-ui.cdn.css",
  "dist/components/code-editor.css",
  "dist/js/runtime.js",
  "dist/js/all.js",
  "dist/js/app-shell.js",
  "dist/js/app-shell.min.js",
  "dist/js/bulk-action-bar.js",
  "dist/js/bulk-action-bar.min.js",
  "dist/js/code-editor.js",
  "dist/js/code-editor.min.js",
  "dist/js/device-simulator.js",
  "dist/js/device-simulator.min.js",
  "dist/js/file-explorer.js",
  "dist/js/file-explorer.min.js",
  "dist/js/tree.js",
  "dist/js/task-workspace.js",
  "dist/js/task-workspace.min.js",
  "dist/ai/components.json",
  "dist/ai/manifest.js",
  "dist/ai/manifest.d.ts",
  "dist/ai/runtime.js",
  "dist/ai/runtime.d.ts",
  "dist/ai/a3s-test.acl",
  "dist/ai/a3s-test/selectors.js",
  "dist/ai/a3s-test/selectors.d.ts",
  "dist/frameworks/react.js",
  "dist/frameworks/react.d.ts",
  "dist/frameworks/vue.js",
  "dist/frameworks/vue.d.ts",
];

for (const requiredFile of requiredFiles) {
  if (!packedFiles.has(requiredFile)) {
    throw new Error(`Published tarball is missing ${requiredFile}.`);
  }
}

for (const duplicateFrameworkFile of [
  "dist/ai/frameworks/react.js",
  "dist/ai/frameworks/react.d.ts",
  "dist/ai/frameworks/vue.js",
  "dist/ai/frameworks/vue.d.ts",
]) {
  if (packedFiles.has(duplicateFrameworkFile)) {
    throw new Error(
      `Duplicate framework adapter must not be published: ${duplicateFrameworkFile}`,
    );
  }
}

const componentManifest = JSON.parse(
  await readFile(
    path.join(projectRoot, "dist", "ai", "components.json"),
    "utf8",
  ),
);
if (
  componentManifest.name !== manifest.name ||
  componentManifest.version !== 2 ||
  componentManifest.components.length !== 114
) {
  throw new Error("AI component manifest metadata or coverage is invalid.");
}
const manifestSlugs = componentManifest.components.map(({ slug }) => slug);
if (new Set(manifestSlugs).size !== manifestSlugs.length) {
  throw new Error("AI component manifest contains duplicate component slugs.");
}
for (const component of componentManifest.components) {
  if (
    !component.selector ||
    !component.test?.selector ||
    !component.framework?.tag ||
    !Array.isArray(component.actions) ||
    !Array.isArray(component.states) ||
    component.states.length === 0 ||
    component.actions.some((action) => !component.test.actions?.[action]) ||
    component.actions.some(
      (action) => !component.test.actionTargets?.[action]?.selector,
    ) ||
    component.states.some((state) => !component.test.states?.[state])
  ) {
    throw new Error(`Incomplete AI contract for ${component.slug}.`);
  }
}

for (const filePath of packedFiles) {
  const allowed =
    filePath === "LICENSE.md" ||
    filePath === "README.md" ||
    filePath === "package.json" ||
    filePath.startsWith("dist/") ||
    filePath.startsWith("templates/");
  if (!allowed) {
    throw new Error(`Unexpected published file: ${filePath}`);
  }
}

function collectExportTargets(value, targets = []) {
  if (typeof value === "string") targets.push(value);
  else if (value && typeof value === "object") {
    for (const nested of Object.values(value))
      collectExportTargets(nested, targets);
  }
  return targets;
}

for (const target of new Set(collectExportTargets(manifest.exports))) {
  const relativeTarget = target.replace(/^\.\//, "");
  if (relativeTarget.includes("*")) {
    const [prefix, suffix] = relativeTarget.split("*");
    const matches = [...packedFiles].filter(
      (filePath) => filePath.startsWith(prefix) && filePath.endsWith(suffix),
    );
    if (matches.length === 0) {
      throw new Error(`Export pattern has no published files: ${target}`);
    }
    continue;
  }

  const targetPath = path.join(projectRoot, relativeTarget);
  if (!(await stat(targetPath)).isFile()) {
    throw new Error(`Export target is not a file: ${target}`);
  }
  if (!packedFiles.has(relativeTarget)) {
    throw new Error(`Export target is not included in the tarball: ${target}`);
  }
}

console.log(
  `Validated ${pack.name}@${pack.version}: ${pack.entryCount} files, ${pack.size} bytes packed, ${pack.unpackedSize} bytes unpacked.`,
);
