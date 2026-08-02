import { execFile } from 'node:child_process';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDirectory, '..');
const projectRoot = path.resolve(siteRoot, '..');
const publicAssets = path.join(siteRoot, 'docs', 'public', 'assets');
const tailwindExecutable = path.join(
  siteRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss',
);
const runtimeSource = path.join(projectRoot, 'dist', 'js', 'all.min.js');
const compiledStyles = path.join(publicAssets, 'a3s-ui.css');

await mkdir(publicAssets, { recursive: true });

try {
  await access(runtimeSource);
} catch {
  throw new Error(
    'Package assets are missing. Run `npm run build` from the A3S UI repository root first.',
  );
}

await execFileAsync(
  tailwindExecutable,
  [
    '-i',
    path.join(siteRoot, 'styles', 'a3s-docs.css'),
    '-o',
    compiledStyles,
    '--minify',
  ],
  { cwd: siteRoot },
);

// Rspress registers its reset layer in the stylesheet loaded after this one.
// Reserve that layer first so the package's component and utility layers keep
// their intended precedence inside documentation previews.
const styles = await readFile(compiledStyles, 'utf8');
await writeFile(compiledStyles, `@layer rp-base;${styles}`, 'utf8');

await copyFile(runtimeSource, path.join(publicAssets, 'all.min.js'));
