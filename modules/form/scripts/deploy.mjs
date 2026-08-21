import { spawn, spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { resolve } from 'node:path';

const moduleRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(moduleRoot, '../..');
const runtimeRoot = resolve(moduleRoot, '.a3s-form');
const serverRuntime = process.env.A3S_FORM_RUNTIME?.trim() || process.execPath;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let port = 4176;
let startServer = true;

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === '--no-start') startServer = false;
  else if (argument === '--port') {
    port = Number(process.argv[index + 1]);
    index += 1;
  } else throw new Error(`Unknown argument: ${argument}`);
}
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('The port must be an integer between 1 and 65535.');
}

function run(label, command, arguments_) {
  process.stdout.write(`\n==> ${label}\n`);
  const result = spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 'unknown'}.`);
  }
}

async function healthy() {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/.well-known/a3s-health`, {
      signal: AbortSignal.timeout(2_000),
    });
    const payload = await response.json();
    return response.ok && payload.ok === true && payload.service === 'a3s-form-playground';
  } catch {
    return false;
  }
}

async function portInUse() {
  return new Promise((resolvePort) => {
    const socket = connect({ host: '127.0.0.1', port });
    const finish = (inUse) => {
      socket.destroy();
      resolvePort(inUse);
    };
    socket.setTimeout(1_000);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

run('Install locked dependencies', npmCommand, ['ci']);
run('Build the A3S Form package surface', npmCommand, ['run', 'form:build']);
run('Build the A3S Form Playground', npmCommand, ['run', 'form:playground:build']);

if (!startServer) {
  process.stdout.write(`\nBuild complete: ${resolve(moduleRoot, 'playground-dist')}\n`);
  process.exit(0);
}
if (await healthy()) {
  process.stdout.write(`\nA3S Form is already running: http://127.0.0.1:${port}\n`);
  process.exit(0);
}
if (await portInUse()) {
  throw new Error(`Port ${port} is already in use. Choose another port with --port.`);
}

mkdirSync(runtimeRoot, { recursive: true });
const output = openSync(resolve(runtimeRoot, 'playground.out.log'), 'w');
const errorOutput = openSync(resolve(runtimeRoot, 'playground.err.log'), 'w');
const child = spawn(serverRuntime, [resolve(moduleRoot, 'scripts/serve-playground.mjs')], {
  cwd: moduleRoot,
  detached: true,
  env: { ...process.env, A3S_FORM_HOST: '127.0.0.1', A3S_FORM_PORT: String(port) },
  stdio: ['ignore', output, errorOutput],
  windowsHide: true,
});
let serverError;
child.once('error', (error) => {
  serverError = error;
});
closeSync(output);
closeSync(errorOutput);
child.unref();
writeFileSync(resolve(runtimeRoot, 'playground.pid'), `${child.pid}\n`, 'ascii');

let ready = false;
for (let attempt = 0; attempt < 30; attempt += 1) {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  if (serverError) break;
  if (await healthy()) {
    ready = true;
    break;
  }
}
if (!ready) {
  child.kill();
  if (serverError) throw serverError;
  throw new Error(
    `The Playground did not start. Review ${resolve(runtimeRoot, 'playground.err.log')}.`,
  );
}

process.stdout.write(`\nPlayground ready: http://127.0.0.1:${port}\n`);
process.stdout.write('The local service is running as a detached process.\n');
process.stdout.write('Use modules/form/scripts/stop.sh or stop.ps1 to stop it.\n');
