import { resolveVersionHref } from '../apps/docs/theme/version-href';

const routes = new Set([
  '/',
  '/en/',
  '/guide/fields',
  '/en/guide/fields',
  '/next/',
  '/next/en/',
  '/next/guide/fields',
  '/next/en/guide/fields',
  '/next/guide/a3s-flow/step',
  '/next/en/guide/a3s-flow/step',
]);

function resolve(href: string, pathname: string, currentLang = 'en') {
  return resolveVersionHref({
    href,
    pathname,
    base: '/Form/',
    currentVersion: pathname.includes('/next/') ? 'next' : 'v0.1.0',
    defaultVersion: 'v0.1.0',
    versions: ['v0.1.0', 'next'],
    currentLang,
    defaultLang: 'zh',
    routePaths: routes,
  });
}

describe('Rspress version links', () => {
  it('keeps the equivalent route when the target version publishes it', () => {
    expect(resolve('/en/guide/fields', '/Form/next/en/guide/fields.html')).toBe('/en/guide/fields');
  });

  it('falls back to the localized version home when the equivalent route is absent', () => {
    expect(resolve('/en/guide/a3s-flow/step', '/Form/next/en/guide/a3s-flow/step.html')).toBe(
      '/en/',
    );
    expect(resolve('/guide/a3s-flow/step', '/Form/next/guide/a3s-flow/step.html', 'zh')).toBe('/');
  });

  it('does not rewrite unrelated internal navigation', () => {
    expect(resolve('/next/en/roadmap', '/Form/next/en/guide/a3s-flow/step.html')).toBe(
      '/next/en/roadmap',
    );
  });
});
