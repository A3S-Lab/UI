import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const outputRoot = path.join(siteRoot, 'doc_build');
const base = '/UI/';

const requiredFiles = [
  'index.html',
  'en/index.html',
  'v0.1.0/index.html',
  'v0.1.0/en/index.html',
  'installation.html',
  'en/installation.html',
  'v0.1.0/installation.html',
  'v0.1.0/en/installation.html',
  'components/index.html',
  'en/components/index.html',
  'v0.1.0/components/index.html',
  'v0.1.0/en/components/index.html',
  'components/app-shell.html',
  'components/split-pane.html',
  'foundations/color.html',
  'patterns/resource-workbench.html',
  'llms.txt',
  'llms-full.txt',
  'en/llms.txt',
  'en/llms-full.txt',
  'a3s-ui-mark.svg',
  'social-card.svg',
  'assets/a3s-ui.css',
  'assets/all.min.js',
];

const homepageExpectations = [
  {
    file: 'index.html',
    markers: [
      'lang="zh"',
      'A3S 产品设计系统',
      '让每个界面',
      '复制安装命令',
      'aria-live="polite"',
      'aria-pressed="true"',
      'v0.1.0',
    ],
  },
  {
    file: 'en/index.html',
    markers: [
      'lang="en"',
      'A3S PRODUCT DESIGN SYSTEM',
      'Interfaces that feel',
      'Copy install command',
      'aria-live="polite"',
    ],
  },
  {
    file: 'v0.1.0/index.html',
    markers: ['lang="zh"', 'A3S 产品设计系统', 'v0.1.0'],
  },
  {
    file: 'v0.1.0/en/index.html',
    markers: ['lang="en"', 'A3S PRODUCT DESIGN SYSTEM', 'v0.1.0'],
  },
];

const switchExpectations = [
  {
    file: 'components/app-shell.html',
    links: [
      '/UI/en/components/app-shell.html',
      '/UI/v0.1.0/components/app-shell',
    ],
  },
  {
    file: 'en/components/app-shell.html',
    links: [
      '/UI/components/app-shell.html',
      '/UI/v0.1.0/en/components/app-shell',
    ],
  },
  {
    file: 'v0.1.0/components/app-shell.html',
    links: [
      '/UI/components/app-shell',
      '/UI/v0.1.0/en/components/app-shell.html',
    ],
  },
  {
    file: 'v0.1.0/en/components/app-shell.html',
    links: [
      '/UI/en/components/app-shell',
      '/UI/v0.1.0/components/app-shell.html',
    ],
  },
];

async function collectHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(absolutePath)));
    } else if (entry.name.endsWith('.html')) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function resolvesToBuiltFile(relativeReference) {
  const decodedReference = decodeURIComponent(relativeReference);
  const candidates =
    decodedReference === '' || decodedReference.endsWith('/')
      ? [path.join(decodedReference, 'index.html')]
      : [
          decodedReference,
          `${decodedReference}.html`,
          path.join(decodedReference, 'index.html'),
        ];

  for (const candidate of candidates) {
    const outputPath = path.resolve(outputRoot, candidate);
    if (
      outputPath !== outputRoot &&
      !outputPath.startsWith(`${outputRoot}${path.sep}`)
    ) {
      continue;
    }

    try {
      if ((await stat(outputPath)).isFile()) return true;
    } catch {
      // Try the next supported Rspress output form.
    }
  }

  return false;
}

for (const file of requiredFiles) {
  await access(path.join(outputRoot, file));
}

for (const { file, markers } of homepageExpectations) {
  const html = await readFile(path.join(outputRoot, file), 'utf8');
  for (const marker of markers) {
    if (!html.includes(marker)) {
      throw new Error(`${file} is missing expected marker: ${marker}`);
    }
  }
}

for (const { file, links } of switchExpectations) {
  const html = await readFile(path.join(outputRoot, file), 'utf8');
  for (const link of links) {
    if (!html.includes(`href="${link}"`)) {
      throw new Error(`${file} is missing language/version link: ${link}`);
    }
  }
}

const compiledStyles = await readFile(
  path.join(outputRoot, 'assets', 'a3s-ui.css'),
  'utf8',
);
const styleExpectations = [
  {
    label: 'Rspress reset layer is registered before Tailwind layers',
    matches: compiledStyles.startsWith('@layer rp-base;'),
  },
  {
    label: 'light primary action token is present',
    matches: compiledStyles.includes('--primary:#285fd2'),
  },
  {
    label: 'dark primary action token is present',
    matches: compiledStyles.includes('--primary:#8eafff'),
  },
  {
    label: 'primary button contract is present',
    matches: compiledStyles.includes(
      '.btn:not([data-variant]),.btn[data-variant=primary]{background-color:var(--color-primary);color:var(--color-primary-foreground)}',
    ),
  },
];

for (const expectation of styleExpectations) {
  if (!expectation.matches) {
    throw new Error(`Built CSS invariant failed: ${expectation.label}`);
  }
}

const brokenReferences = [];
const htmlFiles = await collectHtmlFiles(outputRoot);
const referencePattern = /(?:href|src)="([^"]+)"/g;

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  const htmlWithGeneratedSelfLinksOmitted = html
    .replace(
      /<li class="rp-hover-group__item rp-hover-group__item--active"[^>]*>[\s\S]*?<\/li>/g,
      (item) => item.replace(/href="[^"]+"/, 'href="#current-version"'),
    )
    .replace(
      /<a[^>]*class="[^"]*rp-nav-screen-versions-group__item--active[^"]*"[^>]*>/g,
      (item) => item.replace(/href="[^"]+"/, 'href="#current-version"'),
    );

  for (const [, rawReference] of htmlWithGeneratedSelfLinksOmitted.matchAll(
    referencePattern,
  )) {
    if (
      rawReference.startsWith('#') ||
      rawReference.startsWith('data:') ||
      rawReference.startsWith('mailto:') ||
      rawReference.startsWith('tel:') ||
      /^[a-z]+:\/\//i.test(rawReference)
    ) {
      continue;
    }

    if (rawReference.startsWith('/') && !rawReference.startsWith(base)) {
      brokenReferences.push(
        `${path.relative(outputRoot, htmlFile)} -> ${rawReference} (outside ${base})`,
      );
      continue;
    }

    if (!rawReference.startsWith(base)) continue;

    const withoutBase = rawReference
      .slice(base.length)
      .split(/[?#]/, 1)[0]
      .replace(/\/+/g, '/');
    if (!(await resolvesToBuiltFile(withoutBase))) {
      brokenReferences.push(
        `${path.relative(outputRoot, htmlFile)} -> ${rawReference}`,
      );
    }
  }
}

if (brokenReferences.length > 0) {
  throw new Error(
    `Built-site reference check failed:\n${brokenReferences
      .map((reference) => `  - ${reference}`)
      .join('\n')}`,
  );
}

console.log(
  `Verified ${requiredFiles.length} required files, ${styleExpectations.length} CSS invariants, and references across ${htmlFiles.length} HTML pages.`,
);
