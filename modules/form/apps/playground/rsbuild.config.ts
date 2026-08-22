import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  html: {
    template: './index.html',
  },
  output: {
    assetPrefix: process.env.A3S_UI_FORM_PLAYGROUND_BASE ?? '/UI/playground/forms/',
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
