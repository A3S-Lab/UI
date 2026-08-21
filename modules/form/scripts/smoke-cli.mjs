import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const moduleRoot = resolve(import.meta.dirname, '..');
const projectRoot = resolve(moduleRoot, '../..');
const cli = resolve(projectRoot, 'dist/form/cli.js');
const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'a3s-form-cli-'));

function run(arguments_, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [cli, ...arguments_], {
    cwd: moduleRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== expectedStatus) {
    throw new Error(
      `CLI ${arguments_.join(' ')} exited ${result.status}; expected ${expectedStatus}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
  }
  return result;
}

try {
  const source = resolve(temporaryRoot, 'source.json');
  const plan = resolve(temporaryRoot, 'plan.json');
  const patch = resolve(temporaryRoot, 'change.patch.json');
  const candidate = resolve(temporaryRoot, 'candidate.json');
  const invalid = resolve(temporaryRoot, 'invalid.json');

  run(['sample', '--output', source, '--pretty']);
  const sourceDocument = JSON.parse(await readFile(source, 'utf8'));
  if (sourceDocument.kind !== 'a3s.form' || !sourceDocument.digest)
    throw new Error('sample did not emit a sealed FormDocument.');

  const validation = JSON.parse(run(['validate', source]).stdout);
  if (
    !validation.ok ||
    validation.compilerRevision !== 'a3s-form-core@0.1.0' ||
    validation.digest !== sourceDocument.digest
  )
    throw new Error('validate returned an unexpected result.');

  run(['compile', source, '--output', plan]);
  const compiledPlan = JSON.parse(await readFile(plan, 'utf8'));
  if (compiledPlan.apiVersion !== 'a3s.dev/form-plan/v1alpha1')
    throw new Error('compile did not emit a FormPlan.');

  const digest = JSON.parse(run(['digest', source]).stdout);
  if (!digest.ok || digest.compilerRevision !== 'a3s-form-core@0.1.0' || digest.revision !== 0)
    throw new Error('digest returned an unexpected result.');

  await writeFile(
    patch,
    JSON.stringify({
      apiVersion: 'a3s.dev/form-patch/v1alpha1',
      baseRevision: sourceDocument.revision,
      preconditions: [{ path: '/metadata/title', equals: '未命名表单' }],
      operations: [{ op: 'set', path: '/metadata/title', value: 'CLI 验收表单' }],
    }),
    'utf8',
  );
  run(['patch', source, patch, '--output', candidate]);
  const candidateDocument = JSON.parse(await readFile(candidate, 'utf8'));
  if (candidateDocument.revision !== 1 || candidateDocument.metadata.title !== 'CLI 验收表单')
    throw new Error('patch did not emit the expected next revision.');
  run(['validate', candidate]);

  await writeFile(invalid, '{}', 'utf8');
  run(['validate', invalid], 1);
  run(['unknown-command'], 2);
  console.log('A3S Form CLI smoke test passed.');
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
