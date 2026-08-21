import { createReadStream, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const publicRoot = resolve(projectRoot, 'playground-dist');
const runtimeRoot = resolve(projectRoot, '.a3s-form');
const pidFile = resolve(runtimeRoot, 'playground.pid');
const host = process.env.A3S_FORM_HOST ?? '127.0.0.1';
const port = Number(process.env.A3S_FORM_PORT ?? 4176);
if (!Number.isInteger(port) || port < 1 || port > 65_535)
  throw new Error('A3S_FORM_PORT must be a valid TCP port.');
await access(resolve(publicRoot, 'index.html'));

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

const server = createServer(async (request, response) => {
  try {
    if (request.url === '/.well-known/a3s-health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ ok: true, service: 'a3s-form-playground' }));
      return;
    }
    const pathname = decodeURIComponent(
      new URL(request.url ?? '/', `http://${request.headers.host ?? host}`).pathname,
    );
    const candidate = resolve(publicRoot, `.${pathname}`);
    if (candidate !== publicRoot && !candidate.startsWith(`${publicRoot}${sep}`)) {
      response.writeHead(400);
      response.end('Bad Request');
      return;
    }
    let file = candidate;
    try {
      const details = await stat(file);
      if (details.isDirectory()) file = resolve(file, 'index.html');
    } catch {
      file = resolve(publicRoot, 'index.html');
    }
    const details = await stat(file);
    response.writeHead(200, {
      'content-length': details.size,
      'content-type': contentTypes.get(extname(file)) ?? 'application/octet-stream',
      'cache-control': file.endsWith('index.html') ? 'no-store' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(500);
    response.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  mkdirSync(runtimeRoot, { recursive: true });
  writeFileSync(pidFile, `${process.pid}\n`, 'ascii');
  console.log(`A3S Form Playground: http://${host}:${port}`);
});

function removeOwnPidFile() {
  try {
    if (Number(readFileSync(pidFile, 'ascii').trim()) === process.pid) unlinkSync(pidFile);
  } catch {
    // The PID file may already have been removed by the stop script.
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () =>
    server.close(() => {
      removeOwnPidFile();
      process.exit(0);
    }),
  );
}
process.on('exit', removeOwnPidFile);
