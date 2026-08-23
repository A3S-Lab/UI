import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const moduleRoot = resolve(import.meta.dirname, '..');
const projectRoot = resolve(moduleRoot, '../..');
const distRoot = resolve(projectRoot, 'dist/form');
const packageManifest = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'));
const removedIntegrationName = ['lang', 'flow'].join('');
const staticImportPattern = /\b(?:import|export)\s*(?:[\w*\s{},]+?\s+from\s*)?["']([^"']+)["']/g;

const removedExports = ['./form/a3s-flow', './form/workflow', './form/a3s-flow.css'];
for (const packageExport of removedExports) {
  if (packageManifest.exports?.[packageExport] !== undefined) {
    throw new Error(`Removed package export is still published: ${packageExport}.`);
  }
}

function isInsideDist(path) {
  return path === distRoot || path.startsWith(`${distRoot}${sep}`);
}

async function staticImportClosure(entryName) {
  const entryPath = resolve(distRoot, entryName);
  const pending = [entryPath];
  const sources = new Map();

  while (pending.length > 0) {
    const filePath = pending.pop();
    if (!filePath || sources.has(filePath)) continue;
    if (!isInsideDist(filePath)) {
      throw new Error(`Package entry ${entryName} imports outside dist: ${filePath}`);
    }

    const source = await readFile(filePath, 'utf8');
    sources.set(filePath, source);
    staticImportPattern.lastIndex = 0;
    for (const match of source.matchAll(staticImportPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) continue;
      pending.push(resolve(dirname(filePath), specifier));
    }
  }

  const text = [...sources.values()].join('\n');
  return {
    files: [...sources.keys()].map((filePath) => relative(distRoot, filePath)).sort(),
    rawBytes: Buffer.byteLength(text),
    gzipBytes: gzipSync(text).byteLength,
    text,
  };
}

const entrypoints = {
  'react.js': {
    rawBudget: 2_300_000,
    gzipBudget: 700_000,
  },
  'react-hooks.js': {
    rawBudget: 1_600_000,
    gzipBudget: 600_000,
  },
  'vue-hooks.js': {
    rawBudget: 1_600_000,
    gzipBudget: 600_000,
  },
};

const results = new Map();
for (const [entryName, policy] of Object.entries(entrypoints)) {
  const closure = await staticImportClosure(entryName);
  results.set(entryName, closure);
  if (closure.text.toLocaleLowerCase('en').includes(removedIntegrationName)) {
    throw new Error(`${entryName} still contains the removed workflow compatibility layer.`);
  }
  if (
    (policy.rawBudget && closure.rawBytes > policy.rawBudget) ||
    (policy.gzipBudget && closure.gzipBytes > policy.gzipBudget)
  ) {
    throw new Error(
      `${entryName} exceeds its static import budget: ${closure.rawBytes} bytes raw / ${closure.gzipBytes} bytes gzip; limits are ${policy.rawBudget} / ${policy.gzipBudget}.`,
    );
  }
}

const leanSummary = ['react.js', 'react-hooks.js', 'vue-hooks.js']
  .map((entryName) => {
    const result = results.get(entryName);
    return `${entryName} ${result.rawBytes} bytes raw / ${result.gzipBytes} bytes gzip`;
  })
  .join('; ');
console.log(
  `Package entry points verified without the removed Workflow component exports: ${leanSummary}.`,
);
