import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(projectRoot, '../..');
const rspressCli = resolve(repositoryRoot, 'node_modules/@rspress/core/bin/rspress.js');
const versionsPath = resolve(projectRoot, 'apps/docs/versions.json');
const versions = JSON.parse(readFileSync(versionsPath, 'utf8'));
const prohibitedDocumentationPatterns = [
  {
    pattern:
      /我们|本文|本站|让我们|接下来我们|现在我们|可以看到|不难发现|众所周知|如你所见|你会看到|这里将|本节将|本章将/u,
    description: 'self-referential Chinese narration',
  },
  {
    pattern: new RegExp(['di', 'fy'].join(''), 'i'),
    description: 'a prohibited integration name',
  },
];

function listMdxFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listMdxFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.mdx')) files.push(path);
  }
  return files;
}

function listLocalizedSourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listLocalizedSourceFiles(path));
    else if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name === '_meta.json')) {
      files.push(path);
    }
  }
  return files;
}

function relativePosix(from, to) {
  return relative(from, to).split('\\').join('/');
}

const coreNodeChapters = [
  ['start', 'flow.start'],
  ['condition', 'flow.condition'],
  ['step', 'flow.step'],
  ['batch', 'flow.batch'],
  ['wait', 'flow.wait'],
  ['hook', 'flow.hook'],
  ['complete', 'flow.complete'],
  ['fail', 'flow.fail'],
];

if (!Array.isArray(versions) || versions.length === 0) {
  throw new Error('apps/docs/versions.json must contain at least one documentation version.');
}

const versionIds = versions.map((version) => version?.id);
if (versionIds.some((id) => typeof id !== 'string' || id.length === 0)) {
  throw new Error('Every documentation version must have a non-empty id.');
}
if (versionIds.some((id) => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id))) {
  throw new Error('Documentation version ids must be safe path segments.');
}
if (new Set(versionIds).size !== versionIds.length) {
  throw new Error('Documentation version ids must be unique.');
}
if (
  versions.some(
    (version) =>
      typeof version?.label !== 'string' ||
      version.label.length === 0 ||
      !['stable', 'preview'].includes(version?.status),
  )
) {
  throw new Error('Every documentation version must declare a label and stable/preview status.');
}
const defaultVersions = versions.filter((version) => version?.default === true);
if (defaultVersions.length !== 1) {
  throw new Error('Exactly one documentation version must be marked as the default.');
}
if (defaultVersions[0].status !== 'stable') {
  throw new Error('The default documentation version must be stable.');
}
const defaultVersionId = defaultVersions[0].id;
const docsBase = process.env.DOCS_BASE ?? '/UI/form/';

for (const versionId of versionIds) {
  for (const relativePath of ['index.mdx', '_meta.json', 'guide/_meta.json']) {
    for (const localePrefix of ['', 'en']) {
      const sourcePath = resolve(
        projectRoot,
        'apps/docs/docs',
        versionId,
        localePrefix,
        relativePath,
      );
      if (!existsSync(sourcePath)) {
        const locale = localePrefix || 'zh';
        throw new Error(`Documentation version ${versionId} is missing ${locale}/${relativePath}.`);
      }
    }
  }

  const sourceRoot = resolve(projectRoot, 'apps/docs/docs', versionId);
  const englishRoot = resolve(sourceRoot, 'en');
  const localizedFiles = listLocalizedSourceFiles(sourceRoot);
  const defaultLanguageFiles = localizedFiles
    .filter((sourcePath) => !relativePosix(sourceRoot, sourcePath).startsWith('en/'))
    .map((sourcePath) => relativePosix(sourceRoot, sourcePath));
  const englishFiles = listLocalizedSourceFiles(englishRoot).map((sourcePath) =>
    relativePosix(englishRoot, sourcePath),
  );
  const defaultLanguageSet = new Set(defaultLanguageFiles);
  const englishSet = new Set(englishFiles);

  for (const relativePath of defaultLanguageSet) {
    if (!englishSet.has(relativePath)) {
      throw new Error(`English documentation is missing ${versionId}/en/${relativePath}.`);
    }
  }
  for (const relativePath of englishSet) {
    if (!defaultLanguageSet.has(relativePath)) {
      throw new Error(`Chinese documentation is missing ${versionId}/${relativePath}.`);
    }
  }

  for (const sourcePath of listMdxFiles(sourceRoot)) {
    const source = readFileSync(sourcePath, 'utf8');
    for (const { pattern, description } of prohibitedDocumentationPatterns) {
      const match = pattern.exec(source);
      if (!match) continue;
      const line = source.slice(0, match.index).split('\n').length;
      throw new Error(
        `Documentation contains ${description}: ${relative(projectRoot, sourcePath)}:${line}.`,
      );
    }
  }
}

for (const [slug, nodeType] of coreNodeChapters) {
  for (const localePrefix of ['', 'en']) {
    const sourcePath = resolve(
      projectRoot,
      'apps/docs/docs/next',
      localePrefix,
      'guide/a3s-flow',
      `${slug}.mdx`,
    );
    const source = readFileSync(sourcePath, 'utf8');
    if (!source.includes(`<A3SFlowNodeDemo nodeType="${nodeType}" />`)) {
      throw new Error(
        `A3S Flow chapter ${relative(projectRoot, sourcePath)} must render its fixed live node demo.`,
      );
    }
  }
}

const expectedArtifacts = versions.flatMap((version) => {
  const sourceRoot = resolve(projectRoot, 'apps/docs/docs', version.id);
  const outputRoot = resolve(
    projectRoot,
    'apps/docs/doc_build',
    version.id === defaultVersionId ? '' : version.id,
  );
  return listMdxFiles(sourceRoot).map((sourcePath) => {
    const sourceRelativePath = relativePosix(sourceRoot, sourcePath);
    return {
      path: resolve(outputRoot, sourceRelativePath.replace(/\.mdx$/, '.html')),
      lang: sourceRelativePath.startsWith('en/') ? 'en' : 'zh',
    };
  });
});

const child = spawn(process.execPath, [rspressCli, 'build', '-c', 'apps/docs/rspress.config.ts'], {
  cwd: projectRoot,
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let output = '';
let completed = false;
let settleTimer;

function observe(chunk, stream) {
  stream.write(chunk);
  output = `${output}${chunk}`.slice(-128_000);
  if ((output.match(/Total:/g) ?? []).length < 2) return;
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    if (!expectedArtifacts.every((artifact) => existsSync(artifact.path))) return;
    completed = true;
    child.kill();
  }, 750);
}

child.stdout.on('data', (chunk) => observe(chunk, process.stdout));
child.stderr.on('data', (chunk) => observe(chunk, process.stderr));

const timeout = setTimeout(() => {
  child.kill();
  console.error('Rspress build timed out before producing its final artifact summaries.');
}, 120_000);

const exitCode = await new Promise((resolveExit, reject) => {
  child.once('error', reject);
  child.once('close', (code) => resolveExit(code));
});

clearTimeout(timeout);
clearTimeout(settleTimer);

if (!completed && exitCode !== 0) {
  throw new Error(`Rspress build failed with exit code ${exitCode ?? 'unknown'}.`);
}

if (!expectedArtifacts.every((artifact) => existsSync(artifact.path))) {
  throw new Error('Rspress exited without producing the expected documentation artifacts.');
}

for (const artifact of expectedArtifacts) {
  if (!readFileSync(artifact.path, 'utf8').includes(`<html lang="${artifact.lang}">`)) {
    throw new Error(`Documentation artifact uses the wrong locale: ${artifact.path}`);
  }
}

for (const [slug, nodeType] of coreNodeChapters) {
  for (const localePrefix of ['', 'en']) {
    const artifactPath = resolve(
      projectRoot,
      'apps/docs/doc_build/next',
      localePrefix,
      'guide/a3s-flow',
      `${slug}.html`,
    );
    const html = readFileSync(artifactPath, 'utf8');
    if (!html.includes(`data-a3s-flow-node="${nodeType}"`)) {
      throw new Error(`A3S Flow chapter did not render its live node demo: ${artifactPath}`);
    }
  }
}

for (const localePrefix of ['', 'en']) {
  const localizedPrefix = localePrefix ? `${localePrefix}/` : '';
  const artifactPath = resolve(
    projectRoot,
    'apps/docs/doc_build/next',
    localePrefix,
    'guide/a3s-flow/step.html',
  );
  const html = readFileSync(artifactPath, 'utf8');
  const expectedHref = `${docsBase}${localizedPrefix}`;
  const versionAnchorPattern = new RegExp(
    `<a href="${expectedHref.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?:index\\.html)?"[^>]*aria-label="${defaultVersionId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}"`,
    'u',
  );
  if (!versionAnchorPattern.test(html)) {
    throw new Error(
      `Missing-route version selector must fall back to the localized stable home: ${artifactPath}`,
    );
  }
}
