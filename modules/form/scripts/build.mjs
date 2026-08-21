import { chmod, copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const moduleRoot = resolve(import.meta.dirname, '..');
const projectRoot = resolve(moduleRoot, '../..');
const distributionRoot = resolve(projectRoot, 'dist');
const outputRoot = resolve(distributionRoot, 'form');

if (dirname(outputRoot) !== distributionRoot || basename(outputRoot) !== 'form') {
  throw new Error(`Refusing to clean unexpected output path: ${outputRoot}`);
}
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const sourceRoot = resolve(moduleRoot, 'src');
const external = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'react-hook-form',
  'vue',
];
const shared = {
  bundle: true,
  format: 'esm',
  logLevel: 'info',
  sourcemap: 'external',
  target: ['es2022'],
};

await build({
  ...shared,
  entryPoints: [
    resolve(sourceRoot, 'a3s-flow.ts'),
    resolve(sourceRoot, 'cloud.ts'),
    resolve(sourceRoot, 'core.ts'),
    resolve(sourceRoot, 'index.ts'),
    resolve(sourceRoot, 'react.tsx'),
    resolve(sourceRoot, 'react-hooks.tsx'),
    resolve(sourceRoot, 'vue.ts'),
    resolve(sourceRoot, 'vue-hooks.ts'),
    resolve(sourceRoot, 'web-component.tsx'),
    resolve(sourceRoot, 'workflow.ts'),
    resolve(sourceRoot, 'workers/compiler.worker.ts'),
  ],
  entryNames: '[dir]/[name]',
  chunkNames: 'chunks/[name]-[hash]',
  assetNames: 'assets/[name]-[hash]',
  external,
  outbase: sourceRoot,
  outdir: outputRoot,
  platform: 'browser',
  splitting: true,
});

await build({
  ...shared,
  entryPoints: [
    resolve(sourceRoot, 'styles.css'),
    resolve(sourceRoot, 'a3s-flow.css'),
    resolve(sourceRoot, 'a3s-ui.css'),
  ],
  entryNames: '[dir]/[name]',
  minify: true,
  outbase: sourceRoot,
  outdir: outputRoot,
  platform: 'browser',
});

await build({
  ...shared,
  banner: { js: '#!/usr/bin/env node' },
  entryNames: '[name]',
  entryPoints: [resolve(sourceRoot, 'cli.ts')],
  outdir: outputRoot,
  platform: 'node',
});

await chmod(resolve(outputRoot, 'cli.js'), 0o755);
await mkdir(resolve(outputRoot, 'wasm'), { recursive: true });
await copyFile(resolve(sourceRoot, 'wasm/sha256.wasm'), resolve(outputRoot, 'wasm/sha256.wasm'));
await copyFile(
  resolve(sourceRoot, 'wasm/form-core.wasm'),
  resolve(outputRoot, 'wasm/form-core.wasm'),
);
await cp(resolve(moduleRoot, 'docs'), resolve(outputRoot, 'docs'), { recursive: true });
await cp(resolve(moduleRoot, 'skills/a3s-form'), resolve(outputRoot, 'skills/a3s-form'), {
  recursive: true,
});

console.log(`Built A3S UI Form artifacts in ${outputRoot}`);
