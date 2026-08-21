import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  html: {
    template: './index.html',
  },
  output: {
    assetPrefix: process.env.A3S_FORM_BASE ?? '/UI/form/playground/',
    cleanDistPath: true,
    distPath: {
      root: '../../playground-dist',
    },
  },
  plugins: [pluginReact()],
  root: import.meta.dirname,
  source: {
    entry: {
      index: './src/main.tsx',
    },
  },
});
