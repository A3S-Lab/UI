import { fileURLToPath } from "node:url";

export function stylePackCssPath(stylePack: string): string {
  return fileURLToPath(
    new URL(`../dist/basecoat-${stylePack}.cdn.css`, import.meta.url),
  );
}
