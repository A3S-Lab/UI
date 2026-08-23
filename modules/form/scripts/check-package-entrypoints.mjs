import { access, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const moduleRoot = resolve(import.meta.dirname, '..');
const projectRoot = resolve(moduleRoot, '../..');
const distRoot = resolve(projectRoot, 'dist/form');
const packageManifest = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'));
const staticImportPattern = /\b(?:import|export)\s*(?:[\w*\s{},]+?\s+from\s*)?["']([^"']+)["']/g;

for (const retiredExport of ['./form/a3s-flow', './form/workflow', './form/a3s-flow.css']) {
  if (packageManifest.exports?.[retiredExport] !== undefined) {
    throw new Error(`Retired package export is still present: ${retiredExport}`);
  }
}

for (const retiredArtifact of ['a3s-flow.js', 'a3s-flow.d.ts', 'workflow.js', 'workflow.d.ts']) {
  try {
    await access(resolve(distRoot, retiredArtifact));
    throw new Error(`Retired Form artifact is still present: ${retiredArtifact}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Retired Form artifact')) throw error;
  }
}

function isInsideDist(filePath) {
  return filePath === distRoot || filePath.startsWith(`${distRoot}${sep}`);
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
      if (specifier.startsWith('.')) pending.push(resolve(dirname(filePath), specifier));
    }
  }

  const text = [...sources.values()].join('\n');
  return {
    files: [...sources.keys()].map((filePath) => relative(distRoot, filePath)).sort(),
    rawBytes: Buffer.byteLength(text),
    gzipBytes: gzipSync(text).byteLength,
  };
}

const entrypoints = {
  // The default and Core entries intentionally embed the synchronous semantic WASM core.
  'index.js': { rawBudget: 1_600_000, gzipBudget: 550_000 },
  'core.js': { rawBudget: 1_600_000, gzipBudget: 550_000 },
  'react.js': { rawBudget: 2_100_000, gzipBudget: 650_000 },
  'react-hooks.js': { rawBudget: 1_600_000, gzipBudget: 600_000 },
  'vue.js': { rawBudget: 2_100_000, gzipBudget: 650_000 },
  'vue-hooks.js': { rawBudget: 1_600_000, gzipBudget: 600_000 },
};

const summaries = [];
for (const [entryName, policy] of Object.entries(entrypoints)) {
  const closure = await staticImportClosure(entryName);
  if (closure.rawBytes > policy.rawBudget || closure.gzipBytes > policy.gzipBudget) {
    throw new Error(
      `${entryName} exceeds its static import budget: ${closure.rawBytes} bytes raw / ${closure.gzipBytes} bytes gzip; limits are ${policy.rawBudget} / ${policy.gzipBudget}.`,
    );
  }
  summaries.push(`${entryName} ${closure.rawBytes} bytes raw / ${closure.gzipBytes} bytes gzip`);
}

console.log(`Form package entry points verified: ${summaries.join('; ')}.`);
