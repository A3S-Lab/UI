import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  globals: true,
  plugins: [pluginReact()],
  testEnvironment: 'happy-dom',
  setupFiles: ['./tests/setup.ts'],
  coverage: {
    provider: 'v8',
    include: [
      'src/core/**',
      'src/react/**',
      'src/adapters/**',
      'src/integrations/**',
      'src/react-hooks.tsx',
      'src/workers/compiler-client.ts',
      'src/vue.ts',
      'src/vue-hooks.ts',
      'src/web-component.tsx',
    ],
    exclude: ['src/core/types.ts', 'src/core/compiler-reference.ts'],
    thresholds: {
      lines: 95,
      functions: 95,
      statements: 95,
      branches: 95,
      'src/core/**': {
        perFile: true,
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 95,
      },
    },
  },
});
