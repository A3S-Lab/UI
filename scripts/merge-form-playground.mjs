import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteOutputRoot = path.join(projectRoot, "site", "doc_build");
const playgroundRoot = path.join(siteOutputRoot, "playground");
const targetRoot = path.join(playgroundRoot, "forms");
const playgroundSource = path.join(projectRoot, "modules", "form", "playground-dist");

if (path.dirname(targetRoot) !== playgroundRoot || path.basename(targetRoot) !== "forms") {
  throw new Error(`Refusing to replace unexpected Form Playground path: ${targetRoot}`);
}

await access(path.join(playgroundSource, "index.html"));
await mkdir(playgroundRoot, { recursive: true });
await rm(targetRoot, { recursive: true, force: true });
await cp(playgroundSource, targetRoot, { recursive: true });

console.log("Merged the Form Playground into the A3S UI Playground route family.");
