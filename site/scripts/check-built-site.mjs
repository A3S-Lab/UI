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
  'components/status-bar.html',
  'components/task-pane.html',
  'en/components/status-bar.html',
  'en/components/task-pane.html',
  'foundations/color.html',
  'patterns/resource-workbench.html',
  'llms.txt',
  'llms-full.txt',
  'en/llms.txt',
  'en/llms-full.txt',
  'a3s-ui-mark.svg',
  'social-card.svg',
  'assets/a3s-ui.css',
  'assets/a3s-cascade.css',
  'assets/a3s-ui.min.js',
];

const homepageExpectations = [
  {
    file: 'index.html',
    markers: [
      'lang="zh"',
      'A3S 产品设计系统',
      '让每个界面',
      '复制安装命令',
      '从基础控件到完整工作台。',
      '展开产品预览',
      'data-a3s-customizer',
      'data-mobile-expanded="false"',
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
      'From controls to complete workspaces.',
      'Tune A3S UI to your product.',
      'Show product preview',
      'data-a3s-customizer',
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

const homepageHtml = await readFile(
  path.join(outputRoot, 'index.html'),
  'utf8',
);
const cascadeIndex = homepageHtml.indexOf(
  `href="${base}assets/a3s-cascade.css"`,
);
const componentIndex = homepageHtml.indexOf(`href="${base}assets/a3s-ui.css"`);
const catalogIndex = homepageHtml.indexOf('ui-section ui-catalog');
const customizerIndex = homepageHtml.indexOf('ui-theme-customizer');

if (
  cascadeIndex === -1 ||
  componentIndex === -1 ||
  cascadeIndex > componentIndex
) {
  throw new Error(
    'The cascade-order stylesheet must load before the A3S component stylesheet.',
  );
}

if (
  catalogIndex === -1 ||
  customizerIndex === -1 ||
  catalogIndex > customizerIndex
) {
  throw new Error(
    'The component catalog must appear before the theme customizer on the homepage.',
  );
}

const runtimeScriptMarkup = `<script src="${base}assets/a3s-ui.min.js" defer></script>`;
if (!homepageHtml.includes(runtimeScriptMarkup)) {
  throw new Error(
    'The A3S runtime script must use an explicit closing tag so it cannot swallow later head markup.',
  );
}

if (!homepageHtml.includes("document.addEventListener('a3s:themechange'")) {
  throw new Error('The pre-hydration documentation theme bridge is missing.');
}

const rspressBootstrapMarker =
  "const saved = localStorage.getItem('rspress-theme-appearance')";
const rspressBootstrapIndex = homepageHtml.indexOf(rspressBootstrapMarker);
const rspressBootstrapOpen = homepageHtml.lastIndexOf(
  '<script',
  rspressBootstrapIndex,
);
const rspressBootstrapClose = homepageHtml.indexOf(
  '</script>',
  rspressBootstrapIndex,
);
if (
  rspressBootstrapIndex === -1 ||
  rspressBootstrapOpen === -1 ||
  rspressBootstrapClose === -1
) {
  throw new Error('The Rspress theme bootstrap must remain executable.');
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
    label: 'Office light primary action token is present',
    matches: compiledStyles.includes('--primary:#242424'),
  },
  {
    label: 'Office dark primary action token is present',
    matches: compiledStyles.includes('--primary:#f2f3f5'),
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
const publicBrandingLeaks = [];
const htmlFiles = await collectHtmlFiles(outputRoot);
const referencePattern = /(?:href|src)="([^"]+)"/g;

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  const visibleText = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  if (/basecoat/i.test(visibleText)) {
    publicBrandingLeaks.push(path.relative(outputRoot, htmlFile));
  }
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

if (publicBrandingLeaks.length > 0) {
  throw new Error(
    `Public website branding check failed:\n${publicBrandingLeaks
      .map((file) => `  - ${file}`)
      .join('\n')}`,
  );
}

console.log(
  `Verified ${requiredFiles.length} required files, ${styleExpectations.length} CSS invariants, public branding, and references across ${htmlFiles.length} HTML pages.`,
);
