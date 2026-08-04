import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const suiteRoot = path.join(projectRoot, 'tests', 'e2e');
const siteRoot = path.join(projectRoot, 'site');

function parseArguments(argv) {
  const options = { checkOnly: false, suites: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--check-only') {
      options.checkOnly = true;
      continue;
    }
    if (argument === '--a3s-test') options.a3sTest = argv[++index];
    else if (argument === '--browser-driver')
      options.browserDriver = argv[++index];
    else if (argument === '--browser-executable')
      options.browserExecutable = argv[++index];
    else if (argument === '--max-parallel-scenarios')
      options.maxParallel = argv[++index];
    else if (argument === '--suite') options.suites.push(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        AGENT_BROWSER_COLOR_SCHEME:
          process.env.AGENT_BROWSER_COLOR_SCHEME ?? 'light',
      },
      stdio: 'inherit',
      windowsHide: true,
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `${command} exited with ${code ?? `signal ${signal ?? 'unknown'}`}`,
          ),
        );
      }
    });
  });
}

async function waitForPreview(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview process may still be binding the port.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Documentation preview did not become ready at ${url}`);
}

const options = parseArguments(process.argv.slice(2));
const a3sTest = options.a3sTest ?? process.env.A3S_TEST_BIN ?? 'a3s-test';
const browserDriver =
  options.browserDriver ?? process.env.A3S_TEST_BROWSER_DRIVER ?? 'a3s';
const browserExecutable =
  options.browserExecutable ?? process.env.A3S_TEST_BROWSER_EXECUTABLE;
const maxParallel =
  options.maxParallel ?? process.env.A3S_TEST_MAX_PARALLEL ?? '2';
const allSuites = (await readdir(suiteRoot))
  .filter((file) => file.endsWith('.acl'))
  .sort()
  .map((file) => path.join('tests', 'e2e', file));
const requestedSuites = new Set(
  options.suites.map((suite) => path.basename(suite, '.acl')),
);
const suites =
  requestedSuites.size === 0
    ? allSuites
    : allSuites.filter((suite) =>
        requestedSuites.has(path.basename(suite, '.acl')),
      );
if (requestedSuites.size > 0 && suites.length !== requestedSuites.size) {
  const availableSuites = allSuites
    .map((suite) => path.basename(suite, '.acl'))
    .join(', ');
  throw new Error(`Unknown A3S Test suite. Available suites: ${availableSuites}`);
}
const documentedComponents = (
  await readdir(path.join(siteRoot, 'docs', 'next', 'en', 'components'))
)
  .filter((file) => file.endsWith('.mdx') && file !== 'index.mdx')
  .map((file) => path.basename(file, '.mdx'))
  .sort();
const coveredScenarios = new Set();
const scenarioCounts = new Map();
for (const suite of allSuites) {
  const source = await readFile(path.join(projectRoot, suite), 'utf8');
  for (const match of source.matchAll(/\bscenario\s+"([^"]+)"/g)) {
    coveredScenarios.add(match[1]);
    scenarioCounts.set(match[1], (scenarioCounts.get(match[1]) ?? 0) + 1);
  }
}
const missingComponents = documentedComponents.filter(
  (component) => !coveredScenarios.has(component),
);
if (missingComponents.length > 0) {
  throw new Error(
    `Missing component-specific A3S Test scenarios: ${missingComponents.join(', ')}`,
  );
}
const duplicateComponents = documentedComponents.filter(
  (component) => scenarioCounts.get(component) !== 1,
);
if (duplicateComponents.length > 0) {
  throw new Error(
    `Component-specific A3S Test scenarios must be unique: ${duplicateComponents.join(', ')}`,
  );
}

for (const suite of allSuites) {
  await run(a3sTest, ['check', suite, '--json']);
}

if (options.checkOnly) {
  console.log(
    `Validated ${suites.length} A3S Test suites covering ${documentedComponents.length} component pages.`,
  );
  process.exit(0);
}

const preview = spawn(
  process.execPath,
  [
    path.join('node_modules', '@rspress', 'core', 'bin', 'rspress.js'),
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4178',
  ],
  {
    cwd: siteRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  },
);

const stopPreview = () => {
  if (!preview.killed) preview.kill();
};

process.once('SIGINT', stopPreview);
process.once('SIGTERM', stopPreview);

try {
  await waitForPreview('http://127.0.0.1:4178/UI/');
  for (const suite of suites) {
    const runArguments = [
      'run',
      suite,
      '--browser-driver',
      browserDriver,
      '--command-timeout-ms',
      '30000',
      '--idle-timeout-ms',
      '60000',
      '--cleanup-timeout-ms',
      '15000',
      '--infrastructure-retries',
      '0',
      '--max-parallel-scenarios',
      maxParallel,
      '--json',
    ];
    if (browserExecutable) {
      runArguments.push('--browser-executable', browserExecutable);
    }
    await run(a3sTest, runArguments);
  }
} finally {
  stopPreview();
}
