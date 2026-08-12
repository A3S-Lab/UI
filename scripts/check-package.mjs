import { execFile } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const manifest = JSON.parse(
  await readFile(path.join(projectRoot, 'package.json'), 'utf8'),
);

if (manifest.name !== '@a3s-lab/ui') {
  throw new Error(`Unexpected package name: ${manifest.name}`);
}

const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) {
  throw new Error('npm_execpath is required to validate the package.');
}

const { stdout } = await execFileAsync(
  process.execPath,
  [npmCliPath, 'pack', '--dry-run', '--ignore-scripts', '--json'],
  { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
);
const [pack] = JSON.parse(stdout);
if (!pack || pack.name !== manifest.name || pack.version !== manifest.version) {
  throw new Error('npm pack metadata does not match package.json.');
}

const packedFiles = new Set(pack.files.map(({ path: filePath }) => filePath));
const requiredFiles = [
  'LICENSE.md',
  'README.md',
  'package.json',
  'dist/a3s-ui.css',
  'dist/a3s-ui.cdn.css',
  'dist/js/runtime.js',
  'dist/js/all.js',
  'dist/js/tree.js',
];

for (const requiredFile of requiredFiles) {
  if (!packedFiles.has(requiredFile)) {
    throw new Error(`Published tarball is missing ${requiredFile}.`);
  }
}

for (const filePath of packedFiles) {
  const allowed =
    filePath === 'LICENSE.md' ||
    filePath === 'README.md' ||
    filePath === 'package.json' ||
    filePath.startsWith('dist/') ||
    filePath.startsWith('templates/');
  if (!allowed) {
    throw new Error(`Unexpected published file: ${filePath}`);
  }
}

function collectExportTargets(value, targets = []) {
  if (typeof value === 'string') targets.push(value);
  else if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) collectExportTargets(nested, targets);
  }
  return targets;
}

for (const target of new Set(collectExportTargets(manifest.exports))) {
  const relativeTarget = target.replace(/^\.\//, '');
  if (relativeTarget.includes('*')) {
    const [prefix, suffix] = relativeTarget.split('*');
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
