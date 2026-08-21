import { resolve } from 'node:path';
import { defineConfig } from '@rspress/core';
import versions from './versions.json';

const defaultVersion = versions.find((version) => version.default)?.id;

if (!defaultVersion) throw new Error('apps/docs/versions.json must declare one default version.');

const zhNav = {
  'v0.1.0': [
    { text: '使用指南', link: '/guide/' },
    { text: '开发路线', link: '/roadmap' },
    { text: '在线 Playground', link: 'https://a3s-lab.github.io/UI/form/playground/' },
  ],
  next: [
    { text: '开发指南', link: '/next/guide/' },
    { text: '开发路线', link: '/next/roadmap' },
    { text: '在线 Playground', link: 'https://a3s-lab.github.io/UI/form/playground/' },
  ],
};

const enNav = {
  'v0.1.0': [
    { text: 'Guide', link: '/en/guide/' },
    { text: 'Roadmap', link: '/en/roadmap' },
    { text: 'Playground', link: 'https://a3s-lab.github.io/UI/form/playground/' },
  ],
  next: [
    { text: 'Development guide', link: '/next/en/guide/' },
    { text: 'Roadmap', link: '/next/en/roadmap' },
    { text: 'Playground', link: 'https://a3s-lab.github.io/UI/form/playground/' },
  ],
};

const zhSidebar = {
  '/': [
    { text: '概览', link: '/' },
    { text: '版本说明', link: '/versions' },
    {
      text: '使用指南',
      link: '/guide/',
      collapsed: false,
      items: [
        { text: '快速开始', link: '/guide/' },
        { text: '内置字段', link: '/guide/fields' },
        { text: '矩阵字段', link: '/guide/matrix-fields' },
        { text: '数据表格', link: '/guide/data-grids' },
        { text: 'Playground', link: '/guide/playground' },
        { text: '自定义表单节点', link: '/guide/custom-nodes' },
        { text: 'WASM 加速', link: '/guide/wasm' },
      ],
    },
    { text: '架构设计', link: '/architecture' },
    { text: '开发路线', link: '/roadmap' },
  ],
  '/next/': [
    { text: '开发版概览', link: '/next/' },
    { text: '版本说明', link: '/next/versions' },
    { text: '开发路线', link: '/next/roadmap' },
    { text: '开发基线', link: '/next/guide/' },
    { text: 'React 与 Vue Hooks', link: '/next/guide/framework-hooks' },
    {
      text: 'A3S Flow 节点',
      link: '/next/guide/workflow-node-embedding',
      collapsed: false,
      items: [
        { text: '节点总览', link: '/next/guide/workflow-node-embedding' },
        { text: '工作流开始', link: '/next/guide/a3s-flow/start' },
        { text: '条件分支', link: '/next/guide/a3s-flow/condition' },
        { text: '执行步骤', link: '/next/guide/a3s-flow/step' },
        { text: '批量执行步骤', link: '/next/guide/a3s-flow/batch' },
        { text: '等待至', link: '/next/guide/a3s-flow/wait' },
        { text: '等待外部回调', link: '/next/guide/a3s-flow/hook' },
        { text: '完成工作流', link: '/next/guide/a3s-flow/complete' },
        { text: '标记工作流失败', link: '/next/guide/a3s-flow/fail' },
      ],
    },
    { text: '内置字段组件', link: '/next/guide/fields' },
    { text: '布局与辅助内容', link: '/next/guide/layouts' },
    { text: '文件上传', link: '/next/guide/file-upload' },
    { text: '签名', link: '/next/guide/signature' },
    { text: '矩阵字段', link: '/next/guide/matrix-fields' },
    { text: '重复字段组', link: '/next/guide/repeatable-field-groups' },
    { text: '数据表格', link: '/next/guide/data-grids' },
    { text: '多步向导', link: '/next/guide/wizards' },
    { text: 'Schema Profile 1', link: '/next/guide/schema-profile-1' },
    { text: '计算规则', link: '/next/guide/computed-rules' },
    { text: 'Native value evaluation', link: '/next/guide/value-evaluation' },
    { text: '异步校验', link: '/next/guide/async-validation' },
    { text: '动态数据源', link: '/next/guide/data-sources' },
    { text: '本地化与性能', link: '/next/guide/localization-performance' },
    { text: '迁移清单', link: '/next/guide/migration' },
    { text: 'Langflow compatibility', link: '/next/guide/langflow-compatibility' },
  ],
};

const enSidebar = {
  '/en/': [
    { text: 'Overview', link: '/en/' },
    { text: 'Versions', link: '/en/versions' },
    {
      text: 'Guide',
      link: '/en/guide/',
      collapsed: false,
      items: [
        { text: 'Quick start', link: '/en/guide/' },
        { text: 'Built-in fields', link: '/en/guide/fields' },
        { text: 'Matrix fields', link: '/en/guide/matrix-fields' },
        { text: 'Data grids', link: '/en/guide/data-grids' },
        { text: 'Playground', link: '/en/guide/playground' },
        { text: 'Custom form nodes', link: '/en/guide/custom-nodes' },
        { text: 'WASM acceleration', link: '/en/guide/wasm' },
      ],
    },
    { text: 'Architecture', link: '/en/architecture' },
    { text: 'Roadmap', link: '/en/roadmap' },
  ],
  '/next/en/': [
    { text: 'Development overview', link: '/next/en/' },
    { text: 'Versions', link: '/next/en/versions' },
    { text: 'Roadmap', link: '/next/en/roadmap' },
    { text: 'Development baseline', link: '/next/en/guide/' },
    { text: 'React and Vue hooks', link: '/next/en/guide/framework-hooks' },
    {
      text: 'A3S Flow nodes',
      link: '/next/en/guide/workflow-node-embedding',
      collapsed: false,
      items: [
        { text: 'Node overview', link: '/next/en/guide/workflow-node-embedding' },
        { text: 'Workflow Start', link: '/next/en/guide/a3s-flow/start' },
        { text: 'Condition', link: '/next/en/guide/a3s-flow/condition' },
        { text: 'Run Step', link: '/next/en/guide/a3s-flow/step' },
        { text: 'Run Step Batch', link: '/next/en/guide/a3s-flow/batch' },
        { text: 'Wait Until', link: '/next/en/guide/a3s-flow/wait' },
        { text: 'Wait for Callback', link: '/next/en/guide/a3s-flow/hook' },
        { text: 'Complete', link: '/next/en/guide/a3s-flow/complete' },
        { text: 'Fail Workflow', link: '/next/en/guide/a3s-flow/fail' },
      ],
    },
    { text: 'Built-in fields', link: '/next/en/guide/fields' },
    { text: 'Layouts and content', link: '/next/en/guide/layouts' },
    { text: 'File upload', link: '/next/en/guide/file-upload' },
    { text: 'Signature', link: '/next/en/guide/signature' },
    { text: 'Matrix fields', link: '/next/en/guide/matrix-fields' },
    { text: 'Repeatable groups', link: '/next/en/guide/repeatable-field-groups' },
    { text: 'Data grids', link: '/next/en/guide/data-grids' },
    { text: 'Wizards', link: '/next/en/guide/wizards' },
    { text: 'Schema Profile 1', link: '/next/en/guide/schema-profile-1' },
    { text: 'Computed rules', link: '/next/en/guide/computed-rules' },
    { text: 'Native value evaluation', link: '/next/en/guide/value-evaluation' },
    { text: 'Async validation', link: '/next/en/guide/async-validation' },
    { text: 'Dynamic data sources', link: '/next/en/guide/data-sources' },
    { text: 'Localization and performance', link: '/next/en/guide/localization-performance' },
    { text: 'Migration checklist', link: '/next/en/guide/migration' },
    { text: 'Langflow compatibility', link: '/next/en/guide/langflow-compatibility' },
  ],
};

export default defineConfig({
  root: resolve(import.meta.dirname, 'docs'),
  outDir: resolve(import.meta.dirname, 'doc_build'),
  base: process.env.DOCS_BASE ?? '/UI/form/',
  lang: 'zh',
  locales: [
    {
      lang: 'zh',
      label: '中文',
      title: 'A3S Form',
      description: 'A3S Form 产品与开发文档',
    },
    {
      lang: 'en',
      label: 'English',
      title: 'A3S Form',
      description: 'A3S Form product and development documentation',
    },
  ],
  title: 'A3S Form',
  description: 'A3S Form 产品与开发文档',
  logoText: 'A3S Form',
  themeDir: resolve(import.meta.dirname, 'theme'),
  globalStyles: resolve(import.meta.dirname, 'styles.css'),
  multiVersion: {
    default: defaultVersion,
    versions: versions.map((version) => version.id),
  },
  i18nSource: {
    languagesText: { zh: '语言', en: 'Language' },
    versionsText: { zh: '版本', en: 'Version' },
    editLinkText: { zh: '在 GitHub 上编辑此页', en: 'Edit this page on GitHub' },
    lastUpdatedText: { zh: '最后更新于', en: 'Last updated' },
    outlineTitle: { zh: '本页内容', en: 'On this page' },
    prevPageText: { zh: '上一页', en: 'Previous page' },
    nextPageText: { zh: '下一页', en: 'Next page' },
    searchPlaceholderText: { zh: '搜索文档', en: 'Search documentation' },
  },
  themeConfig: {
    darkMode: false,
    search: true,
    lastUpdated: true,
    localeRedirect: 'never',
    locales: [
      {
        lang: 'zh',
        label: '中文',
        nav: zhNav,
        sidebar: zhSidebar,
      },
      {
        lang: 'en',
        label: 'English',
        nav: enNav,
        sidebar: enSidebar,
      },
    ],
    editLink: {
      docRepoBaseUrl: 'https://github.com/A3S-Lab/UI/tree/main/modules/form/apps/docs/docs',
    },
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/A3S-Lab/UI',
      },
    ],
    footer: {
      message: 'A3S Form',
    },
  },
});
