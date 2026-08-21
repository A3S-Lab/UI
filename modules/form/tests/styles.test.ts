import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);

describe('A3S UI style integration', () => {
  it('consumes the precompiled A3S UI bundle', () => {
    const uiStyles = require.resolve('@a3s-lab/ui/cdn.css');
    const uiPackage = require('@a3s-lab/ui/package.json') as { version: string };
    const bundledCss = readFileSync(uiStyles, 'utf8');
    const integratedStyles = readFileSync(
      resolve(import.meta.dirname, '../src/a3s-ui.css'),
      'utf8',
    );

    expect(uiPackage.version).toBe('0.3.0');
    expect(integratedStyles.startsWith('@import "@a3s-lab/ui/cdn.css";')).toBe(true);
    expect(bundledCss).toContain('--a3s-control-height: 2.25rem');
    expect(bundledCss).toContain('.app-shell');
    expect(bundledCss).toContain('.workspace-header');
    expect(bundledCss).toContain('.settings-layout');
    expect(bundledCss).toContain('.property-list');
    expect(bundledCss).not.toContain('@apply');
  });
});
