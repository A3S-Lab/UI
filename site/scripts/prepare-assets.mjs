import { execFile } from 'node:child_process';
import { access, copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDirectory, '..');
const projectRoot = path.resolve(siteRoot, '..');
const publicAssets = path.join(siteRoot, 'docs', 'public', 'assets');
const require = createRequire(import.meta.url);
const tailwindPackage = require.resolve('@tailwindcss/cli/package.json');
const tailwindExecutable = path.join(
  path.dirname(tailwindPackage),
  'dist',
  'index.mjs',
);
const runtimeSource = path.join(projectRoot, 'dist', 'js', 'all.min.js');

await mkdir(publicAssets, { recursive: true });

try {
  await access(runtimeSource);
} catch {
  throw new Error(
    'Package assets are missing. Run `npm run build` from the A3S UI repository root first.',
  );
}

await execFileAsync(
  process.execPath,
  [
    tailwindExecutable,
    '-i',
    path.join(siteRoot, 'styles', 'a3s-docs.css'),
    '-o',
    path.join(publicAssets, 'a3s-ui.css'),
    '--minify',
  ],
  { cwd: siteRoot },
);

await copyFile(runtimeSource, path.join(publicAssets, 'all.min.js'));
