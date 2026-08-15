import {
  access,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);
const runsRoot = resolve(repositoryRoot, ".a3s-test/runs");
const generatedRoot = resolve(
  repositoryRoot,
  ".a3s-test/generated/documentation-visual-audit",
);
const manifestPath = resolve(generatedRoot, "routes.json");
const coveragePath = resolve(generatedRoot, "coverage.json");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const generatedAt = new Date(manifest.generatedAt).getTime();
const runEntries = await readdir(runsRoot, { withFileTypes: true });
const runDirectories = runEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(runsRoot, entry.name));

async function evidenceForPage(page) {
  const candidates = [];

  for (const runDirectory of runDirectories) {
    const scenarioDirectory = resolve(runDirectory, page.id);
    if (!(await exists(scenarioDirectory))) continue;
    const scenarioStat = await stat(scenarioDirectory);
    if (scenarioStat.mtimeMs < generatedAt) continue;

    const present = [];
    const missing = [];
    for (const evidencePath of page.expectedEvidence) {
      if (await exists(resolve(scenarioDirectory, evidencePath))) {
        present.push(evidencePath);
      } else {
        missing.push(evidencePath);
      }
    }
    candidates.push({
      complete: missing.length === 0,
      missing,
      modifiedAt: scenarioStat.mtime.toISOString(),
      present,
      scenarioDirectory: scenarioDirectory.slice(repositoryRoot.length + 1),
    });
  }

  candidates.sort((left, right) =>
    right.modifiedAt.localeCompare(left.modifiedAt),
  );
  const evidence =
    candidates.find((candidate) => candidate.complete) ?? candidates[0];
  return {
    id: page.id,
    route: page.route,
    status: evidence?.complete ? "complete" : evidence ? "partial" : "missing",
    evidence: evidence ?? null,
  };
}

const pages = [];
for (const page of manifest.pages) {
  pages.push(await evidenceForPage(page));
}

const summary = pages.reduce(
  (counts, page) => {
    counts[page.status] += 1;
    return counts;
  },
  { complete: 0, missing: 0, partial: 0 },
);
const coverage = {
  generatedAt: new Date().toISOString(),
  manifestGeneratedAt: manifest.generatedAt,
  pageCount: manifest.pageCount,
  summary,
  pages,
};

await mkdir(generatedRoot, { recursive: true });
await writeFile(coveragePath, `${JSON.stringify(coverage, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({ coveragePath, pageCount: manifest.pageCount, summary }),
);
