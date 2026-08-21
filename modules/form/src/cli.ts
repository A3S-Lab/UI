import { readFile, writeFile } from 'node:fs/promises';
import {
  applyFormPatch,
  compileForm,
  createFormDocument,
  diffFormDocuments,
  type FormPatch,
} from './core';

interface CliOptions {
  pretty: boolean;
  output?: string;
}

class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const usage = `a3s-form <command> [files] [options]

Commands:
  validate <form.json>       Validate and normalize a FormDocument
  compile <form.json>        Emit the deterministic FormPlan
  digest <form.json>         Emit revision and canonical SHA-256 digest
  diff <before> <after>      Emit a revision-bound FormPatch
  patch <form> <patch>       Apply a typed FormPatch atomically
  sample                     Emit a minimal valid FormDocument

Options:
  --pretty                   Pretty-print JSON
  --output <file>            Write JSON to a file instead of stdout
  -                          Read a JSON input from stdin`;

function parseOptions(arguments_: string[]): { positional: string[]; options: CliOptions } {
  const positional: string[] = [];
  const options: CliOptions = { pretty: false };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--pretty') options.pretty = true;
    else if (argument === '--output') {
      const path = arguments_[index + 1];
      if (!path) throw new CliError('usage', '--output requires a file path.');
      options.output = path;
      index += 1;
    } else if (argument.startsWith('--'))
      throw new CliError('usage', `Unknown option: ${argument}`);
    else positional.push(argument);
  }
  return { positional, options };
}

async function readJson(path: string): Promise<unknown> {
  let content: string;
  try {
    if (path === '-') {
      const chunks: string[] = [];
      process.stdin.setEncoding('utf8');
      for await (const chunk of process.stdin) chunks.push(chunk);
      content = chunks.join('');
    } else content = await readFile(path, 'utf8');
  } catch (error) {
    throw new CliError(
      'read_failed',
      `Cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new CliError(
      'invalid_json',
      `${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function emit(value: unknown, options: CliOptions): Promise<void> {
  const json = `${JSON.stringify(value, null, options.pretty ? 2 : undefined)}\n`;
  if (options.output) await writeFile(options.output, json, 'utf8');
  else process.stdout.write(json);
}

function requireFiles(command: string, files: string[], count: number): void {
  if (files.length !== count)
    throw new CliError('usage', `${command} expects ${count} input file${count === 1 ? '' : 's'}.`);
}

export async function runCli(arguments_: string[]): Promise<number> {
  const { positional, options } = parseOptions(arguments_);
  const [command, ...files] = positional;
  if (!command || command === 'help') {
    await emit({ ok: true, usage }, options);
    return 0;
  }
  if (command === 'sample') {
    requireFiles(command, files, 0);
    await emit(createFormDocument(), options);
    return 0;
  }
  if (command === 'validate' || command === 'compile' || command === 'digest') {
    requireFiles(command, files, 1);
    const result = compileForm(await readJson(files[0]));
    if (!result.ok || !result.document || !result.plan) {
      await emit(
        {
          ok: false,
          compilerRevision: result.compilerRevision,
          diagnostics: result.diagnostics,
        },
        options,
      );
      return 1;
    }
    if (command === 'validate') {
      await emit(
        {
          ok: true,
          compilerRevision: result.compilerRevision,
          revision: result.document.revision,
          digest: result.document.digest,
          diagnostics: result.diagnostics,
        },
        options,
      );
    } else if (command === 'compile') await emit(result.plan, options);
    else
      await emit(
        {
          ok: true,
          compilerRevision: result.compilerRevision,
          revision: result.document.revision,
          digest: result.document.digest,
        },
        options,
      );
    return 0;
  }
  if (command === 'diff') {
    requireFiles(command, files, 2);
    const before = await readJson(files[0]);
    const after = await readJson(files[1]);
    const beforeResult = compileForm(before);
    const afterResult = compileForm(after);
    if (!beforeResult.ok || !beforeResult.document || !afterResult.ok || !afterResult.document) {
      await emit(
        {
          ok: false,
          compilerRevision: beforeResult.compilerRevision,
          diagnostics: [
            ...beforeResult.diagnostics.map((item) => ({ ...item, input: 'before' })),
            ...afterResult.diagnostics.map((item) => ({ ...item, input: 'after' })),
          ],
        },
        options,
      );
      return 1;
    }
    await emit(diffFormDocuments(beforeResult.document, afterResult.document), options);
    return 0;
  }
  if (command === 'patch') {
    requireFiles(command, files, 2);
    const documentResult = compileForm(await readJson(files[0]));
    if (!documentResult.ok || !documentResult.document) {
      await emit(
        {
          ok: false,
          compilerRevision: documentResult.compilerRevision,
          diagnostics: documentResult.diagnostics,
        },
        options,
      );
      return 1;
    }
    const result = applyFormPatch(documentResult.document, (await readJson(files[1])) as FormPatch);
    await emit(result.ok ? result.document : result, options);
    return result.ok ? 0 : 1;
  }
  throw new CliError('usage', `Unknown command: ${command}`);
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runCli(process.argv.slice(2));
  } catch (error) {
    const failure =
      error instanceof CliError
        ? error
        : new CliError('unexpected', error instanceof Error ? error.message : String(error));
    process.stderr.write(
      `${JSON.stringify({ ok: false, error: { code: failure.code, message: failure.message }, usage })}\n`,
    );
    process.exitCode = 2;
  }
}

void main();
