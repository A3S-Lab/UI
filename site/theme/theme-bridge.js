(() => {
  'use strict';

  const root = document.documentElement;
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const isMode = (value) => value === 'dark' || value === 'light';

  const readStorage = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }
  };

  const resolveRspressMode = (value) => {
    if (isMode(value)) return value;
    return value === 'auto' ? (colorScheme.matches ? 'dark' : 'light') : null;
  };

  const updateThemeColor = (mode) => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', mode === 'dark' ? '#101118' : '#f7f7f8');
  };

  const applyTheme = (mode, syncRspressPreference = false) => {
    const isDark = mode === 'dark';
    root.classList.toggle('dark', isDark);
    root.classList.toggle('rp-dark', isDark);
    root.style.colorScheme = mode;
    writeStorage('themeMode', mode);

    if (syncRspressPreference) {
      writeStorage('rspress-theme-appearance', mode);
    }

    updateThemeColor(mode);
  };

  const rspressPreference = readStorage('rspress-theme-appearance');
  const basecoatPreference = readStorage('themeMode');
  const initialMode =
    resolveRspressMode(rspressPreference) ??
    (isMode(basecoatPreference) ? basecoatPreference : null) ??
    (colorScheme.matches ? 'dark' : 'light');

  applyTheme(
    initialMode,
    !resolveRspressMode(rspressPreference) && isMode(basecoatPreference),
  );

  document.addEventListener('basecoat:themechange', (event) => {
    const mode = event.detail?.mode;
    if (isMode(mode)) applyTheme(mode, true);
  });

  new MutationObserver(() => {
    const mode =
      root.classList.contains('dark') || root.classList.contains('rp-dark')
        ? 'dark'
        : 'light';
    applyTheme(mode);
  }).observe(root, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('storage', (event) => {
    if (event.key === 'themeMode' && isMode(event.newValue)) {
      applyTheme(event.newValue, true);
      return;
    }

    if (event.key === 'rspress-theme-appearance') {
      const mode = resolveRspressMode(event.newValue);
      if (mode) applyTheme(mode);
    }
  });

  colorScheme.addEventListener('change', () => {
    if (readStorage('rspress-theme-appearance') === 'auto') {
      applyTheme(colorScheme.matches ? 'dark' : 'light');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () =>
        updateThemeColor(root.classList.contains('dark') ? 'dark' : 'light'),
      { once: true },
    );
  }
})();
