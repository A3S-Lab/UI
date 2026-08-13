(() => {
  const clamp = (value, minimum, maximum) =>
    Math.min(Math.max(value, minimum), maximum);

  const formatNumber = (value) => {
    const rounded = Math.abs(value) < 0.0001 ? 0 : Number(value.toFixed(4));
    return String(rounded);
  };

  function parseNumber(value, fallback) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getThumbOffset(element, ratio) {
    const thumbSize = getComputedStyle(element)
      .getPropertyValue('--slider-thumb-size')
      .trim();
    const match = thumbSize.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z]+)$/i);

    if (!match) return '0px';

    const size = Number.parseFloat(match[1]);
    const unit = match[2];
    return `${formatNumber(size * (0.5 - ratio))}${unit}`;
  }

  function updateRange(element) {
    const min = parseNumber(element.min, 0);
    const max = parseNumber(element.max, 100);
    const value = parseNumber(element.value, min);
    const ratio = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;
    const percent = ratio * 100;

    element.style.setProperty('--slider-value', `${formatNumber(percent)}%`);
    element.style.setProperty(
      '--slider-fill-offset',
      getThumbOffset(element, ratio),
    );
  }

  function initRange(element) {
    if (element.dataset.rangeInitialized) return;

    updateRange(element);
    const handleInput = () => updateRange(element);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => updateRange(element));
    element.addEventListener('input', handleInput);
    resizeObserver?.observe(element);
    element._destroy = () => {
      element.removeEventListener('input', handleInput);
      resizeObserver?.disconnect();
    };
    element.dataset.rangeInitialized = 'true';
  }

  if (window.basecoat) {
    window.basecoat.register(
      'range',
      'input[type="range"]:not([data-range-initialized])',
      initRange,
    );
  }
})();
