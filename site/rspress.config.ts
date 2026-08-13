import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { defineConfig, type UserConfig } from '@rspress/core';

const base = process.env.DOCS_BASE ?? '/UI/';
const siteOrigin = process.env.DOCS_ORIGIN ?? 'https://a3s-lab.github.io';
const themeBridgeScript = readFileSync(
  path.join(__dirname, 'theme/theme-bridge.js'),
  'utf8',
).replace(/<\/script/gi, '<\\/script');

const config: UserConfig = {
  root: path.join(__dirname, 'docs'),
  base,
  siteOrigin,
  title: 'A3S UI',
  description:
    'The framework-agnostic design system for A3S products, agent workspaces, operational consoles, and document tools.',
  lang: 'zh',
  icon: '/a3s-ui-mark.svg',
  logo: '/a3s-ui-mark.svg',
  logoText: 'A3S UI',
  outDir: 'doc_build',
  llms: true,
  route: {
    localeRedirect: 'never',
  },
  multiVersion: {
    default: 'next',
    versions: ['next', 'v0.3.0', 'v0.2.0', 'v0.1.0'],
  },
  locales: [
    {
      lang: 'zh',
      label: '简体中文',
      title: 'A3S UI',
      description:
        '面向 A3S 产品、智能体工作区、运维控制台与文档工具的框架无关设计系统。',
    },
    {
      lang: 'en',
      label: 'English',
      title: 'A3S UI',
      description:
        'The framework-agnostic design system for A3S products, agent workspaces, operational consoles, and document tools.',
    },
  ],
  markdown: {
    globalComponents: [
      path.join(__dirname, 'theme/mdx/A3SAssetImage.tsx'),
      path.join(__dirname, 'theme/mdx/Callout.tsx'),
      path.join(__dirname, 'theme/mdx/ChartDemo.tsx'),
      path.join(__dirname, 'theme/mdx/MonacoWorkbenchDemo.tsx'),
      path.join(__dirname, 'theme/mdx/CodeGroup.tsx'),
      path.join(__dirname, 'theme/mdx/Preview.tsx'),
      path.join(__dirname, 'theme/mdx/SliderDemo.tsx'),
      path.join(__dirname, 'theme/mdx/Step.tsx'),
      path.join(__dirname, 'theme/mdx/Steps.tsx'),
    ],
  },
  head: [
    `<script>${themeBridgeScript}</script>`,
    ['meta', { name: 'theme-color', content: '#f7f7f8' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'A3S UI' }],
    [
      'meta',
      {
        property: 'og:image',
        content: `${siteOrigin}${base}social-card.svg`,
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['link', { rel: 'stylesheet', href: `${base}assets/a3s-cascade.css` }],
    ['link', { rel: 'stylesheet', href: `${base}assets/a3s-ui.css` }],
    [
      'link',
      {
        rel: 'preload',
        as: 'script',
        href: `${base}assets/a3s-ui.min.js`,
      },
    ],
    (route) => [
      'link',
      {
        rel: 'canonical',
        href: `${siteOrigin}${base.replace(/\/$/, '')}${route.routePath}`,
      },
    ],
  ],
  themeConfig: {
    search: true,
    enableContentAnimation: true,
    editLink: {
      docRepoBaseUrl: 'https://github.com/A3S-Lab/UI/tree/main/site/docs',
    },
    lastUpdated: true,
    llmsUI: {
      placement: 'outline',
      viewOptions: ['markdownLink', 'chatgpt', 'claude'],
    },
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/A3S-Lab/UI',
      },
    ],
  },
};

export default defineConfig(config);
