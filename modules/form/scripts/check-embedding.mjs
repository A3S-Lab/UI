import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import postcss from 'postcss';

const moduleRoot = resolve(import.meta.dirname, '..');
const projectRoot = resolve(moduleRoot, '../..');
const stylesheetPath = resolve(projectRoot, 'dist/form/styles.css');
const stylesheet = await readFile(stylesheetPath, 'utf8');
const a3sUiStylesheetPath = resolve(projectRoot, 'dist/form/a3s-ui.css');
const a3sUiStylesheet = await readFile(a3sUiStylesheetPath, 'utf8');
const packageManifest = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'));
const uiPackage = packageManifest;
const uiFoundation = await readFile(resolve(projectRoot, 'dist/styles/a3s-foundation.css'), 'utf8');
const { size } = await stat(stylesheetPath);
const gzipSize = gzipSync(stylesheet).byteLength;

const budgets = {
  raw: 185_000,
  gzip: 26_000,
};

const a3sUiVersion = packageManifest.version;
const sharedTokens = [
  '--a3s-bg',
  '--a3s-panel',
  '--a3s-panel-soft',
  '--a3s-ink',
  '--a3s-muted',
  '--a3s-line',
  '--a3s-action',
  '--a3s-blue',
  '--a3s-green',
  '--a3s-red',
  '--a3s-radius',
];

if (uiPackage.version !== a3sUiVersion) {
  throw new Error(`Expected A3S UI ${a3sUiVersion}, found ${uiPackage.version}.`);
}

if (packageManifest.exports?.['./form/a3s-ui.css'] !== './dist/form/a3s-ui.css') {
  throw new Error('Package export ./form/a3s-ui.css must resolve to ./dist/form/a3s-ui.css.');
}

const fullStylesheetContracts = [
  '.btn',
  '.field',
  '.input',
  '.table-container',
  '.a3s-form-renderer',
];
const missingFullStylesheetContracts = fullStylesheetContracts.filter(
  (selector) => !a3sUiStylesheet.includes(selector),
);
if (missingFullStylesheetContracts.length > 0 || /@import\s/i.test(a3sUiStylesheet)) {
  throw new Error(
    `The built A3S UI stylesheet is incomplete: ${missingFullStylesheetContracts.join(', ') || 'unresolved @import'}.`,
  );
}

const missingTokens = sharedTokens.filter(
  (token) => !uiFoundation.includes(`${token}:`) || !stylesheet.includes(`var(${token},`),
);
if (missingTokens.length > 0) {
  throw new Error(
    `Embedding CSS drifted from A3S UI ${a3sUiVersion}: ${missingTokens.join(', ')}.`,
  );
}

function splitTopLevelSelectors(selector) {
  const selectors = [];
  let start = 0;
  let parentheses = 0;
  let brackets = 0;
  let quote;
  let escaped = false;

  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(') parentheses += 1;
    else if (character === ')') parentheses -= 1;
    else if (character === '[') brackets += 1;
    else if (character === ']') brackets -= 1;
    else if (character === ',' && parentheses === 0 && brackets === 0) {
      selectors.push(selector.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(selector.slice(start).trim());
  return selectors;
}

function isInsideKeyframes(rule) {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return true;
    parent = parent.parent;
  }
  return false;
}

const violations = [];
const root = postcss.parse(stylesheet, { from: stylesheetPath });
let ruleOrder = 0;
const responsiveOrder = new Map();
const baseOrder = new Map();
const responsiveSelectors = new Map([
  ['.a3s-form-grid>*', '.a3s-form-grid > *'],
  ['.a3s-form-repeater-row-grid>*', '.a3s-form-repeater-row-grid > *'],
]);
root.walkRules((rule) => {
  ruleOrder += 1;
  if (isInsideKeyframes(rule)) return;
  for (const selector of splitTopLevelSelectors(rule.selector)) {
    if (!selector.startsWith('.a3s-form-')) violations.push(selector);
    const responsiveSelector = selector.replaceAll(/\s+/g, '');
    if (!responsiveSelectors.has(responsiveSelector)) continue;
    const container = rule.parent;
    if (
      container?.type === 'atrule' &&
      container.name === 'container' &&
      container.params.includes('a3s-form-renderer')
    ) {
      responsiveOrder.set(responsiveSelector, ruleOrder);
    } else {
      baseOrder.set(responsiveSelector, ruleOrder);
    }
  }
});

if (/\/\*!\s*tailwindcss\b/i.test(stylesheet)) violations.push('Tailwind preflight banner');

if (violations.length > 0) {
  throw new Error(
    `Embedding CSS contains host-global selectors: ${[...new Set(violations)].slice(0, 8).join(', ')}. Keep every rule in the a3s-form-* namespace.`,
  );
}

const staleResponsiveRules = [...responsiveSelectors.keys()].filter(
  (selector) =>
    !responsiveOrder.has(selector) ||
    !baseOrder.has(selector) ||
    (responsiveOrder.get(selector) ?? -1) <= (baseOrder.get(selector) ?? -1),
);
if (staleResponsiveRules.length > 0) {
  throw new Error(
    `Embedding CSS places compact renderer overrides before their base rules: ${staleResponsiveRules.map((selector) => responsiveSelectors.get(selector)).join(', ')}. Keep the container-query overrides later in the cascade.`,
  );
}

if (size > budgets.raw || gzipSize > budgets.gzip) {
  throw new Error(
    `Embedding CSS exceeds its budget: ${size} bytes raw / ${gzipSize} bytes gzip; limits are ${budgets.raw} / ${budgets.gzip}.`,
  );
}

console.log(
  `Embedding CSS verified against A3S UI ${a3sUiVersion}: ${size} bytes raw, ${gzipSize} bytes gzip, no host-global reset.`,
);
