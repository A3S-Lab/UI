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
  'v0.2.0/index.html',
  'v0.2.0/en/index.html',
  'v0.1.0/index.html',
  'v0.1.0/en/index.html',
  'installation.html',
  'en/installation.html',
  'v0.2.0/installation.html',
  'v0.2.0/en/installation.html',
  'v0.1.0/installation.html',
  'v0.1.0/en/installation.html',
  'components/index.html',
  'en/components/index.html',
  'v0.2.0/components/index.html',
  'v0.2.0/en/components/index.html',
  'v0.1.0/components/index.html',
  'v0.1.0/en/components/index.html',
  'components/field.html',
  'en/components/field.html',
  'v0.2.0/components/field.html',
  'v0.2.0/en/components/field.html',
  'v0.1.0/components/field.html',
  'v0.1.0/en/components/field.html',
  'components/radio-group.html',
  'en/components/radio-group.html',
  'v0.2.0/components/radio-group.html',
  'v0.2.0/en/components/radio-group.html',
  'v0.1.0/components/radio-group.html',
  'v0.1.0/en/components/radio-group.html',
  'components/button-group.html',
  'en/components/button-group.html',
  'v0.2.0/components/button-group.html',
  'v0.2.0/en/components/button-group.html',
  'v0.1.0/components/button-group.html',
  'v0.1.0/en/components/button-group.html',
  'components/input-group.html',
  'en/components/input-group.html',
  'v0.2.0/components/input-group.html',
  'v0.2.0/en/components/input-group.html',
  'v0.1.0/components/input-group.html',
  'v0.1.0/en/components/input-group.html',
  'components/tree.html',
  'en/components/tree.html',
  'v0.2.0/components/tree.html',
  'v0.2.0/en/components/tree.html',
  'v0.1.0/components/tree.html',
  'v0.1.0/en/components/tree.html',
  'components/slider.html',
  'en/components/slider.html',
  'v0.2.0/components/slider.html',
  'v0.2.0/en/components/slider.html',
  'v0.1.0/components/slider.html',
  'v0.1.0/en/components/slider.html',
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
      'A3S 产品界面系统',
      '复杂界面，',
      '也该有清晰语法。',
      '复制安装命令',
      'npm install @a3s-lab/ui',
      '从一个控件，到整个工作台。',
      '公开组件组合',
      'data-a3s-customizer',
      'data-mobile-expanded="false"',
      'aria-live="polite"',
      'aria-pressed="true"',
      'v0.2.0',
      'v0.1.0',
    ],
  },
  {
    file: 'en/index.html',
    markers: [
      'lang="en"',
      'A3S PRODUCT INTERFACE SYSTEM',
      'Complex UI.',
      'Clear grammar.',
      'Copy install command',
      'npm install @a3s-lab/ui',
      'From one control to a complete workspace.',
      'PUBLIC COMPONENT COMPOSITION',
      'data-a3s-customizer',
      'aria-live="polite"',
      'v0.2.0',
    ],
  },
  {
    file: 'v0.2.0/index.html',
    markers: [
      'lang="zh"',
      'A3S 产品界面系统',
      '复杂界面，',
      'npm install @a3s-lab/ui@0.2.0',
      'v0.2.0',
    ],
  },
  {
    file: 'v0.2.0/en/index.html',
    markers: [
      'lang="en"',
      'A3S PRODUCT INTERFACE SYSTEM',
      'Complex UI.',
      'npm install @a3s-lab/ui@0.2.0',
      'v0.2.0',
    ],
  },
  {
    file: 'v0.1.0/index.html',
    markers: [
      'lang="zh"',
      'A3S 产品界面系统',
      '复杂界面，',
      'npm install @a3s-lab/ui@0.1.0',
      'v0.1.0',
    ],
  },
  {
    file: 'v0.1.0/en/index.html',
    markers: [
      'lang="en"',
      'A3S PRODUCT INTERFACE SYSTEM',
      'Complex UI.',
      'npm install @a3s-lab/ui@0.1.0',
      'v0.1.0',
    ],
  },
];

const componentExpectations = ['', 'v0.2.0/', 'v0.1.0/'].flatMap(
  (versionPrefix) => [
    {
      file: `${versionPrefix}components/field.html`,
      markers: [
        'lang="zh"',
        'data-slider-demo="field"',
        '价格范围',
        '最高预算：',
        'aria-valuetext="US$800"',
        '单选按钮',
        '订阅方案',
        '字段组',
        '卡片式选项',
        '交互式组件预览',
        '实时预览',
      ],
    },
    {
      file: `${versionPrefix}en/components/field.html`,
      markers: [
        'lang="en"',
        'data-slider-demo="field"',
        'Price range',
        'Maximum budget:',
        'aria-valuetext="$800"',
        'Interactive component preview',
        'Live preview',
      ],
    },
    {
      file: `${versionPrefix}components/radio-group.html`,
      markers: [
        'lang="zh"',
        '单选组',
        'aria-label="视图密度"',
        '>宽松<',
        '卡片式选项',
        '订阅方案',
        '通知方式',
      ],
    },
    {
      file: `${versionPrefix}en/components/radio-group.html`,
      markers: [
        'lang="en"',
        'Radio Group',
        'aria-label="View density"',
        '>Comfortable<',
        'Choice Card',
        'Subscription Plan',
        'Notification Preferences',
      ],
    },
    {
      file: `${versionPrefix}components/button-group.html`,
      markers: [
        'lang="zh"',
        '按钮组负责连接子控件的边界与交互状态',
        'aria-label="搜索"',
        'placeholder="搜索…"',
        '拆分按钮',
      ],
    },
    {
      file: `${versionPrefix}en/components/button-group.html`,
      markers: [
        'lang="en"',
        'aria-label="Search"',
        'placeholder="Search..."',
        'Split',
      ],
    },
    {
      file: `${versionPrefix}components/input-group.html`,
      markers: [
        'lang="zh"',
        '12 条结果',
        '行内起始',
        '块级末端',
        'placeholder="输入密码"',
      ],
    },
    {
      file: `${versionPrefix}en/components/input-group.html`,
      markers: [
        'lang="en"',
        '12 results',
        'Inline start',
        'Block end',
        'placeholder="Enter password"',
      ],
    },
    {
      file: `${versionPrefix}components/slider.html`,
      markers: [
        'lang="zh"',
        'data-slider-demo="standalone"',
        'data-slider-demo="labeled"',
        'aria-label="音量"',
        '>温度<',
        'dir="rtl"',
      ],
    },
    {
      file: `${versionPrefix}en/components/slider.html`,
      markers: [
        'lang="en"',
        'data-slider-demo="standalone"',
        'data-slider-demo="labeled"',
        'aria-label="Volume"',
        '>Temperature<',
        'dir="rtl"',
      ],
    },
  ],
);

const nextTreeExpectations = [
  {
    file: 'components/tree.html',
    markers: [
      'lang="zh"',
      '树形控件',
      'role="tree"',
      'aria-label="项目文件"',
      'data-tree-row',
      'data-tree-label',
      'a3s:tree-toggle',
    ],
  },
  {
    file: 'en/components/tree.html',
    markers: [
      'lang="en"',
      '>Tree<',
      'role="tree"',
      'aria-label="Project files"',
      'data-tree-row',
      'data-tree-label',
      'a3s:tree-toggle',
    ],
  },
  {
    file: 'v0.2.0/components/tree.html',
    markers: ['v0.2.0 不包含此组件', '不属于该历史版本的公开契约'],
  },
  {
    file: 'v0.2.0/en/components/tree.html',
    markers: ['Not available in v0.2.0', 'not part of this published package contract'],
  },
  {
    file: 'v0.1.0/components/tree.html',
    markers: ['v0.1.0 不包含此组件', '不属于该历史版本的公开契约'],
  },
  {
    file: 'v0.1.0/en/components/tree.html',
    markers: ['Not available in v0.1.0', 'not part of this published package contract'],
  },
];

const switchExpectations = [
  {
    file: 'components/app-shell.html',
    links: [
      '/UI/en/components/app-shell.html',
      '/UI/v0.2.0/components/app-shell',
      '/UI/v0.1.0/components/app-shell',
    ],
  },
  {
    file: 'en/components/app-shell.html',
    links: [
      '/UI/components/app-shell.html',
      '/UI/v0.2.0/en/components/app-shell',
      '/UI/v0.1.0/en/components/app-shell',
    ],
  },
  {
    file: 'v0.2.0/components/app-shell.html',
    links: [
      '/UI/components/app-shell',
      '/UI/v0.2.0/en/components/app-shell.html',
      '/UI/v0.1.0/components/app-shell',
    ],
  },
  {
    file: 'v0.2.0/en/components/app-shell.html',
    links: [
      '/UI/en/components/app-shell',
      '/UI/v0.2.0/components/app-shell.html',
      '/UI/v0.1.0/en/components/app-shell',
    ],
  },
  {
    file: 'v0.1.0/components/app-shell.html',
    links: [
      '/UI/components/app-shell',
      '/UI/v0.2.0/components/app-shell',
      '/UI/v0.1.0/en/components/app-shell.html',
    ],
  },
  {
    file: 'v0.1.0/en/components/app-shell.html',
    links: [
      '/UI/en/components/app-shell',
      '/UI/v0.2.0/en/components/app-shell',
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

for (const { file, markers } of [
  ...homepageExpectations,
  ...componentExpectations,
  ...nextTreeExpectations,
]) {
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
const chineseTerminologyLeaks = [];
const disallowedChineseTerms = [
  '收音机',
  '无线电组',
  '无线电图标',
  '无线电输入',
  '现场组',
  '间歇范围输入',
  '微调器',
  '旋转器',
  '选择卡',
];
const htmlFiles = await collectHtmlFiles(outputRoot);
const referencePattern = /(?:href|src)="([^"]+)"/g;

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  const relativeHtmlFile = path.relative(outputRoot, htmlFile);
  const visibleText = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  if (/basecoat/i.test(visibleText)) {
    publicBrandingLeaks.push(relativeHtmlFile);
  }
  if (!relativeHtmlFile.split(path.sep).includes('en')) {
    for (const term of disallowedChineseTerms) {
      if (visibleText.includes(term)) {
        chineseTerminologyLeaks.push(`${relativeHtmlFile} -> ${term}`);
      }
    }
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

if (chineseTerminologyLeaks.length > 0) {
  throw new Error(
    `Chinese terminology check failed:\n${chineseTerminologyLeaks
      .map((leak) => `  - ${leak}`)
      .join('\n')}`,
  );
}

console.log(
  `Verified ${requiredFiles.length} required files, ${styleExpectations.length} CSS invariants, Chinese terminology, public branding, and references across ${htmlFiles.length} HTML pages.`,
);
