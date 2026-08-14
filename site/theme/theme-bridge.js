(() => {
  'use strict';

  const root = document.documentElement;
  root.setAttribute('data-a3s-defer-init', '');
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const isMode = (value) => value === 'dark' || value === 'light';
  const isAccent = (value) =>
    ['blue', 'violet', 'emerald', 'amber', 'rose'].includes(value);
  const isRadius = (value) => ['sharp', 'balanced', 'rounded'].includes(value);
  const isDensity = (value) => ['compact', 'comfortable'].includes(value);

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

  const synchronizeRspressPreference = (value) => {
    writeStorage('rspress-theme-appearance', value);
    try {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'rspress-theme-appearance',
          newValue: value,
        }),
      );
    } catch {
      // The DOM theme is already applied when synthetic StorageEvent support is unavailable.
    }
  };

  const resolveRspressMode = (value) => {
    if (isMode(value)) return value;
    return value === 'auto' ? (colorScheme.matches ? 'dark' : 'light') : null;
  };

  const updateThemeColor = (mode) => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', mode === 'dark' ? '#101118' : '#f8f9fb');
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

  const applyCustomization = () => {
    const accent = readStorage('a3s-ui-accent');
    const radius = readStorage('a3s-ui-radius');
    const density = readStorage('a3s-ui-density');
    root.dataset.a3sAccent = isAccent(accent) ? accent : 'blue';
    root.dataset.a3sRadius = isRadius(radius) ? radius : 'balanced';
    root.dataset.a3sDensity = isDensity(density) ? density : 'compact';
  };

  const rspressPreference = readStorage('rspress-theme-appearance');
  const runtimePreference = readStorage('themeMode');
  const initialMode =
    resolveRspressMode(rspressPreference) ??
    (isMode(runtimePreference) ? runtimePreference : null) ??
    (colorScheme.matches ? 'dark' : 'light');

  applyCustomization();
  applyTheme(
    initialMode,
    !resolveRspressMode(rspressPreference) && isMode(runtimePreference),
  );
  let activeMode = initialMode;

  document.addEventListener('a3s:themechange', (event) => {
    const mode = event.detail?.mode;
    const preference = event.detail?.preference;
    if (preference === 'system') {
      synchronizeRspressPreference('auto');
    } else if (isMode(preference)) {
      synchronizeRspressPreference(preference);
    }
    if (isMode(mode)) {
      activeMode = mode;
      applyTheme(mode);
    }
  });

  document.addEventListener('a3s:stylechange', applyCustomization);

  new MutationObserver(() => {
    const mode =
      root.classList.contains('dark') || root.classList.contains('rp-dark')
        ? 'dark'
        : 'light';
    applyTheme(mode);
    if (mode !== activeMode) {
      activeMode = mode;
      document.dispatchEvent(
        new CustomEvent('a3s:themechange', { detail: { mode } }),
      );
    }
  }).observe(root, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('storage', (event) => {
    if (event.key === 'themeMode' && isMode(event.newValue)) {
      applyTheme(event.newValue, true);
      return;
    }

    if (event.key === 'rspress-theme-appearance') {
      const mode = resolveRspressMode(event.newValue);
      if (mode) applyTheme(mode);
      return;
    }

    if (
      event.key === 'a3s-ui-accent' ||
      event.key === 'a3s-ui-radius' ||
      event.key === 'a3s-ui-density'
    ) {
      applyCustomization();
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
