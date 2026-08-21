import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteOutputRoot = path.join(projectRoot, "site", "doc_build");
const targetRoot = path.join(siteOutputRoot, "form");
const docsSource = path.join(projectRoot, "modules", "form", "apps", "docs", "doc_build");
const playgroundSource = path.join(projectRoot, "modules", "form", "playground-dist");

if (path.dirname(targetRoot) !== siteOutputRoot || path.basename(targetRoot) !== "form") {
  throw new Error(`Refusing to replace unexpected Form site path: ${targetRoot}`);
}

await access(path.join(docsSource, "index.html"));
await access(path.join(playgroundSource, "index.html"));
await mkdir(siteOutputRoot, { recursive: true });
await rm(targetRoot, { recursive: true, force: true });
await cp(docsSource, targetRoot, { recursive: true });
await cp(playgroundSource, path.join(targetRoot, "playground"), { recursive: true });

console.log("Merged A3S Form documentation and Playground under /UI/form/.");
