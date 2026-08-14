import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { components as sourceComponents } from '../src/ai/manifest/index.js';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const npmCliPath = process.env.npm_execpath;
if (!npmCliPath) throw new Error('npm_execpath is required.');

const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'a3s-ui-frameworks-'));
const packRoot = path.join(fixtureRoot, 'pack');
await mkdir(packRoot, { recursive: true });
try {
const { stdout: packOutput } = await execFileAsync(
  process.execPath,
  [
    npmCliPath,
    'pack',
    '--ignore-scripts',
    '--json',
    '--pack-destination',
    packRoot,
  ],
  {
    cwd: projectRoot,
    maxBuffer: 20 * 1024 * 1024,
  },
);
const [{ filename }] = JSON.parse(packOutput);
const archive = path.join(packRoot, filename);
await writeFile(
  path.join(fixtureRoot, 'package.json'),
  JSON.stringify({ name: 'a3s-ui-framework-fixture', private: true, type: 'module' }),
);
await execFileAsync(
  process.execPath,
  [
    npmCliPath,
    'install',
    '--ignore-scripts',
    '--no-package-lock',
    archive,
    'react@19.2.8',
    'react-dom@19.2.8',
    '@types/react@19.2.17',
    'vue@3.5.41',
    'typescript@6.0.3',
    'vite@7.3.6',
  ],
  { cwd: fixtureRoot, maxBuffer: 20 * 1024 * 1024 },
);

const fixtureScript = `
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ReactAdapters from '@a3s-lab/ui/react';
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import * as VueAdapters from '@a3s-lab/ui/vue';
import {
  actionSelector,
  componentSelector,
  partSelector,
  readySelector,
  selectors,
  stateSelector,
} from '@a3s-lab/ui/a3s-test/selectors';
import manifest from '@a3s-lab/ui/components.json' with { type: 'json' };

const { AgentComposer, Button, TaskWorkspace } = ReactAdapters;
const {
  AgentComposer: VueComposer,
  Button: VueButton,
  TaskWorkspace: VueWorkspace,
} = VueAdapters;
const pascalName = (slug) =>
  slug.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('');

assert.equal(Object.keys(ReactAdapters.components).length, manifest.components.length);
assert.equal(Object.keys(VueAdapters.components).length, manifest.components.length);
for (const component of manifest.components) {
  const exportName = pascalName(component.slug);
  assert.equal(ReactAdapters[exportName], ReactAdapters.components[component.slug]);
  assert.equal(VueAdapters[exportName], VueAdapters.components[component.slug]);
  assert.equal(ReactAdapters[exportName].a3s.slug, component.slug);
  assert.equal(VueAdapters[exportName].a3s.slug, component.slug);

  const reactProps = component.framework.attributes.value === undefined
    ? {}
    : { onChange() {} };
  const reactRoot = renderToStaticMarkup(
    React.createElement(ReactAdapters[exportName], reactProps),
  );
  const vueRoot = await renderToString(
    createSSRApp({
      render: () => h(VueAdapters[exportName]),
    }),
  );
  for (const markup of [reactRoot, vueRoot]) {
    assert.match(markup, new RegExp('^<' + component.framework.tag + '(?:\\\\s|>)'));
    for (const token of component.framework.className.split(/\\\\s+/).filter(Boolean)) {
      assert.match(markup, new RegExp('class="[^"]*\\\\b' + token + '\\\\b'));
    }
    for (const [name, value] of Object.entries(component.framework.attributes)) {
      if (value === '') {
        assert.match(markup, new RegExp('\\\\s' + name + '(?:=""|(?=\\\\s|>))'));
        continue;
      }
      const escaped = value.replace(/[.*+?^\\\\{\\\\}()|[\\\\]\\\\\\]/g, '\\\\$&');
      assert.match(markup, new RegExp('\\\\s' + name + '="' + escaped + '"'));
    }
  }
}

const reactMarkup = renderToStaticMarkup(
  React.createElement(
    TaskWorkspace,
    { 'aria-label': 'Release task' },
    React.createElement(
      AgentComposer,
      { 'aria-label': 'Message' },
      React.createElement(Button, { type: 'submit' }, 'Send'),
    ),
  ),
);
const vueMarkup = await renderToString(
  createSSRApp({
    render: () =>
      h(VueWorkspace, { 'aria-label': 'Release task' }, () =>
        h(VueComposer, { 'aria-label': 'Message' }, () =>
          h(VueButton, { type: 'submit' }, () => 'Send'),
        ),
      ),
  }),
);
for (const markup of [reactMarkup, vueMarkup]) {
  assert.match(markup, /class="task-workspace"/);
  assert.match(markup, /class="agent-composer"/);
  assert.match(markup, /<button type="submit" class="btn">Send<\\/button>/);
}
assert.equal(manifest.components.length, 83);
assert.equal(Object.keys(selectors).length, manifest.components.length);
assert.equal(componentSelector('task-workspace'), selectors['task-workspace'].root);
assert.equal(readySelector('task-workspace'), selectors['task-workspace'].ready);
assert.equal(partSelector('agent-composer', 'input'), selectors['agent-composer'].parts.input);
assert.equal(actionSelector('agent-composer', 'fill'), selectors['agent-composer'].actions.fill);
assert.equal(stateSelector('task-workspace', 'complete'), selectors['task-workspace'].states.complete);
console.log(JSON.stringify({ reactMarkup, vueMarkup, components: manifest.components.length }));
`;
const fixtureScriptPath = path.join(fixtureRoot, 'verify.mjs');
await writeFile(fixtureScriptPath, fixtureScript);
const { stdout } = await execFileAsync(process.execPath, [fixtureScriptPath], {
  cwd: fixtureRoot,
});
const result = JSON.parse(stdout);
assert.equal(result.components, 83);
assert.match(result.reactMarkup, /task-workspace/);
assert.match(result.vueMarkup, /task-workspace/);

const typeConsumer = `
import React, { createRef } from 'react';
import {
  Button,
  Checkbox,
  Input,
  MessageCitation,
  NativeSelect,
  Textarea,
  type A3SComponentProps,
} from '@a3s-lab/ui/react';
import { TaskWorkspace as VueTaskWorkspace } from '@a3s-lab/ui/vue';
import { actionSelector, selectors } from '@a3s-lab/ui/a3s-test/selectors';

const ref = createRef<HTMLElement>();
const shared: A3SComponentProps = { id: 'root', title: 'Root', 'aria-label': 'Root' };
const nodes = [
  React.createElement(Button, { ...shared, ref, type: 'submit', disabled: true, name: 'send' }),
  React.createElement(Input, { type: 'email', required: true, value: 'dev@example.com', onChange() {} }),
  React.createElement(Checkbox, { type: 'checkbox', checked: true, onChange() {} }),
  React.createElement(NativeSelect, { name: 'environment', multiple: true }),
  React.createElement(Textarea, { rows: 4, readOnly: true }),
  React.createElement(MessageCitation, { href: '#source', target: '_blank' }),
];
void nodes;
void VueTaskWorkspace;
void actionSelector('agent-composer', 'fill');
void selectors['task-workspace'].ready;
`;
await writeFile(path.join(fixtureRoot, 'consumer.ts'), typeConsumer);
await writeFile(
  path.join(fixtureRoot, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      noEmit: true,
      strict: true,
      target: 'ES2022',
    },
    files: ['consumer.ts'],
  }),
);
await execFileAsync(
  process.execPath,
  [path.join(fixtureRoot, 'node_modules', 'typescript', 'bin', 'tsc')],
  { cwd: fixtureRoot, maxBuffer: 20 * 1024 * 1024 },
);

const clientSource = `
import React, { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AppShell as ReactAppShell,
  Tabs as ReactTabs,
  TaskWorkspace as ReactTaskWorkspace,
} from '@a3s-lab/ui/react';
import { createApp, h, ref as createVueRef } from 'vue';
import {
  AppShell as VueAppShell,
  Tabs as VueTabs,
  TaskWorkspace as VueTaskWorkspace,
} from '@a3s-lab/ui/vue';

let reactReadyCalls = 0;
let vueReadyCalls = 0;
const reactRef = createRef();
const vueRef = createVueRef(null);

function reactTabChildren(prefix) {
  return [
    React.createElement('div', { key: 'list', role: 'tablist', 'aria-label': 'Views' },
      React.createElement('button', { id: prefix + '-one-tab', type: 'button', role: 'tab', 'aria-controls': prefix + '-one-panel', 'aria-selected': 'true' }, 'One'),
      React.createElement('button', { id: prefix + '-two-tab', type: 'button', role: 'tab', 'aria-controls': prefix + '-two-panel', 'aria-selected': 'false' }, 'Two'),
    ),
    React.createElement('section', { key: 'one', id: prefix + '-one-panel', role: 'tabpanel', 'aria-labelledby': prefix + '-one-tab' }, 'First panel'),
    React.createElement('section', { key: 'two', id: prefix + '-two-panel', role: 'tabpanel', 'aria-labelledby': prefix + '-two-tab', hidden: true }, 'Second panel'),
  ];
}

function vueTabChildren(prefix) {
  return [
    h('div', { role: 'tablist', 'aria-label': 'Views' }, [
      h('button', { id: prefix + '-one-tab', type: 'button', role: 'tab', 'aria-controls': prefix + '-one-panel', 'aria-selected': 'true' }, 'One'),
      h('button', { id: prefix + '-two-tab', type: 'button', role: 'tab', 'aria-controls': prefix + '-two-panel', 'aria-selected': 'false' }, 'Two'),
    ]),
    h('section', { id: prefix + '-one-panel', role: 'tabpanel', 'aria-labelledby': prefix + '-one-tab' }, 'First panel'),
    h('section', { id: prefix + '-two-panel', role: 'tabpanel', 'aria-labelledby': prefix + '-two-tab', hidden: true }, 'Second panel'),
  ];
}

function reactWorkspace(prefix) {
  return React.createElement(
    ReactAppShell,
    { id: prefix + '-shell', 'aria-label': 'Task application' },
    React.createElement(
      'aside',
      { 'data-app-navigation': true },
      React.createElement(
        'nav',
        { 'aria-label': 'Task navigation' },
        React.createElement('a', { href: '#tasks' }, 'Tasks'),
      ),
    ),
    React.createElement(
      'main',
      { 'data-app-main': true },
      React.createElement(
        'header',
        null,
        React.createElement(
          'button',
          { type: 'button', 'data-app-navigation-trigger': true },
          'Navigation',
        ),
      ),
      React.createElement(
        ReactTaskWorkspace,
        { id: prefix + '-workspace', 'aria-label': 'Release task' },
        React.createElement(
          'header',
          null,
          React.createElement(
            'button',
            { type: 'button', 'data-task-inspector-trigger': true },
            'Files',
          ),
        ),
        React.createElement(
          'div',
          { 'data-task-body': true },
          React.createElement('main', { 'data-task-main': true }, 'Task content'),
          React.createElement(
            'aside',
            { 'data-task-inspector': true, 'aria-label': 'Changed files' },
            React.createElement('button', { type: 'button' }, 'Review file'),
          ),
        ),
      ),
    ),
  );
}

function vueWorkspace(prefix) {
  return h(
    VueAppShell,
    { id: prefix + '-shell', 'aria-label': 'Task application' },
    () => [
      h('aside', { 'data-app-navigation': true }, [
        h('nav', { 'aria-label': 'Task navigation' }, [
          h('a', { href: '#tasks' }, 'Tasks'),
        ]),
      ]),
      h('main', { 'data-app-main': true }, [
        h('header', null, [
          h(
            'button',
            { type: 'button', 'data-app-navigation-trigger': true },
            'Navigation',
          ),
        ]),
        h(
          VueTaskWorkspace,
          { id: prefix + '-workspace', 'aria-label': 'Release task' },
          () => [
            h('header', null, [
              h(
                'button',
                { type: 'button', 'data-task-inspector-trigger': true },
                'Files',
              ),
            ]),
            h('div', { 'data-task-body': true }, [
              h('main', { 'data-task-main': true }, 'Task content'),
              h(
                'aside',
                { 'data-task-inspector': true, 'aria-label': 'Changed files' },
                [h('button', { type: 'button' }, 'Review file')],
              ),
            ]),
          ],
        ),
      ]),
    ],
  );
}

createRoot(document.getElementById('react-root')).render(
  React.createElement(
    React.Fragment,
    null,
    React.createElement(
      ReactTabs,
      {
        ref: reactRef,
        id: 'react-tabs',
        'aria-label': 'React tabs',
        onReady(element) {
          reactReadyCalls += 1;
          element.dataset.frameworkReady = 'react';
        },
      },
      reactTabChildren('react'),
    ),
    reactWorkspace('react'),
  ),
);

createApp({
  setup() {
    return () => h('div', null, [
      h(
        VueTabs,
        {
          ref: vueRef,
          id: 'vue-tabs',
          'aria-label': 'Vue tabs',
          onReady(element) {
            vueReadyCalls += 1;
            element.dataset.frameworkReady = 'vue';
          },
        },
        { default: () => vueTabChildren('vue') },
      ),
      vueWorkspace('vue'),
    ]);
  },
}).mount('#vue-root');

window.frameworkStatus = () => ({
  react: {
    readyCalls: reactReadyCalls,
    refMatches: reactRef.current === document.getElementById('react-tabs'),
  },
  vue: {
    readyCalls: vueReadyCalls,
    refMatches: vueRef.value?.element === document.getElementById('vue-tabs'),
  },
});
`;
await writeFile(
  path.join(fixtureRoot, 'index.html'),
  '<!doctype html><html><body><div id="react-root"></div><div id="vue-root"></div><script type="module" src="/client.mjs"></script></body></html>',
);
await writeFile(path.join(fixtureRoot, 'client.mjs'), clientSource);
const vitePath = path.join(fixtureRoot, 'node_modules', 'vite', 'bin', 'vite.js');
await execFileAsync(process.execPath, [vitePath, 'build'], {
  cwd: fixtureRoot,
  maxBuffer: 20 * 1024 * 1024,
});

const previewPort = await new Promise((resolve, reject) => {
  const server = createServer();
  server.unref();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close();
      reject(new Error('Unable to allocate framework preview port.'));
      return;
    }
    server.close((error) => (error ? reject(error) : resolve(address.port)));
  });
});
const preview = spawn(
  process.execPath,
  [vitePath, 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'],
  { cwd: fixtureRoot, stdio: ['ignore', 'pipe', 'pipe'] },
);
let previewOutput = '';
preview.stdout.on('data', (chunk) => {
  previewOutput += chunk;
});
preview.stderr.on('data', (chunk) => {
  previewOutput += chunk;
});
let browser;
try {
  const previewUrl = `http://127.0.0.1:${previewPort}`;
  const deadline = Date.now() + 30_000;
  while (true) {
    if (preview.exitCode !== null) {
      throw new Error(`Framework preview exited early.\n${previewOutput}`);
    }
    try {
      const response = await fetch(previewUrl);
      if (response.ok) break;
    } catch {
      // The exact preview child may still be binding its port.
    }
    if (Date.now() > deadline) {
      throw new Error(`Framework preview did not become ready.\n${previewOutput}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const diagnostics = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      diagnostics.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`));
  await page.goto(previewUrl);
  await page.waitForFunction(() => {
    const status = window.frameworkStatus?.();
    return status?.react.readyCalls === 1 && status?.vue.readyCalls === 1;
  });

  const status = await page.evaluate(() => window.frameworkStatus());
  assert.deepEqual(status, {
    react: { readyCalls: 1, refMatches: true },
    vue: { readyCalls: 1, refMatches: true },
  });
  for (const prefix of ['react', 'vue']) {
    const root = page.locator(`#${prefix}-tabs`);
    await root.waitFor();
    assert.equal(await root.getAttribute('data-framework-ready'), prefix);
    assert.equal(await root.getAttribute('data-tabs-initialized'), 'true');
    assert.match(await root.getAttribute('data-a3s-components'), /(?:^|\\s)tabs(?:\\s|$)/);
    const secondTab = root.getByRole('tab', { name: 'Two' });
    await secondTab.click();
    assert.equal(await secondTab.getAttribute('aria-selected'), 'true');
    assert.equal(await root.locator(`#${prefix}-two-panel`).isVisible(), true);
    assert.equal(await root.locator(`#${prefix}-one-panel`).isHidden(), true);

    const shell = page.locator(`#${prefix}-shell`);
    const navigation = shell.locator(':scope > [data-app-navigation]');
    const navigationTrigger = shell.locator('[data-app-navigation-trigger]');
    assert.equal(await shell.getAttribute('data-app-shell-initialized'), 'true');
    assert.equal(await navigation.getAttribute('inert'), '');
    assert.equal(await navigation.getAttribute('aria-hidden'), 'true');
    assert.equal(await navigationTrigger.getAttribute('aria-expanded'), 'false');
    await navigationTrigger.click();
    assert.equal(await shell.getAttribute('data-mobile-navigation'), 'open');
    assert.equal(await navigation.getAttribute('inert'), null);
    assert.equal(
      await navigation.locator('a').evaluate(async (element) => {
        if (element === document.activeElement) return true;
        await new Promise(requestAnimationFrame);
        return element === document.activeElement;
      }),
      true,
    );
    await page.keyboard.press('Escape');
    assert.equal(await shell.getAttribute('data-mobile-navigation'), null);
    assert.equal(
      await navigationTrigger.evaluate(async (element) => {
        if (element === document.activeElement) return true;
        await new Promise(requestAnimationFrame);
        return element === document.activeElement;
      }),
      true,
    );

    const workspace = page.locator(`#${prefix}-workspace`);
    const inspector = workspace.locator('[data-task-inspector]');
    const inspectorTrigger = workspace.locator('[data-task-inspector-trigger]');
    assert.equal(
      await workspace.getAttribute('data-task-workspace-initialized'),
      'true',
    );
    assert.equal(await inspector.getAttribute('inert'), '');
    assert.equal(await inspectorTrigger.getAttribute('aria-expanded'), 'false');
    await inspectorTrigger.click();
    assert.equal(await workspace.getAttribute('data-inspector'), 'open');
    assert.equal(await inspector.getAttribute('inert'), null);
    assert.equal(
      await inspector.getByRole('button').evaluate(async (element) => {
        if (element === document.activeElement) return true;
        await new Promise(requestAnimationFrame);
        return element === document.activeElement;
      }),
      true,
    );
    await page.keyboard.press('Escape');
    assert.equal(await workspace.getAttribute('data-inspector'), null);
    assert.equal(
      await inspectorTrigger.evaluate(async (element) => {
        if (element === document.activeElement) return true;
        await new Promise(requestAnimationFrame);
        return element === document.activeElement;
      }),
      true,
    );
  }
  assert.deepEqual(await page.evaluate(() => window.frameworkStatus()), status);
  assert.deepEqual(diagnostics, []);
} finally {
  await browser?.close();
  if (preview.exitCode === null) {
    preview.kill('SIGTERM');
    await new Promise((resolve) => preview.once('exit', resolve));
  }
}

const packageManifest = JSON.parse(
  await readFile(path.join(projectRoot, 'package.json'), 'utf8'),
);
assert.equal(packageManifest.peerDependenciesMeta.react.optional, true);
assert.equal(packageManifest.peerDependenciesMeta.vue.optional, true);
assert.equal(sourceComponents.length, 83);
console.log('Validated all React and Vue exports, roots, selectors, types, client refs, readiness, and controllers from the packed package.');
} finally {
  await rm(fixtureRoot, { force: true, recursive: true });
}
