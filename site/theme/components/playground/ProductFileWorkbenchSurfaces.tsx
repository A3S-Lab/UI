import type { ProductFileEntry } from "./product-file-manager-data";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductCodeWorkbench } from "./ProductCodeWorkbench";
import { ProductOfficeWorkbench } from "./ProductOfficeWorkbench";

export type ProductFileSurfaceProps = {
  dirty: boolean;
  entry: ProductFileEntry;
  locale: ProductPlaygroundLocale;
  mode: "edit" | "preview";
  onChange: (message?: string) => void;
  onSaved: (message?: string) => void;
  onStatus: (message: string) => void;
  saveRevision: number;
};

export function ProductFileWorkbenchSurface(props: ProductFileSurfaceProps) {
  if (
    props.entry.workbench === "document" ||
    props.entry.workbench === "spreadsheet" ||
    props.entry.workbench === "presentation" ||
    props.entry.workbench === "pdf"
  ) {
    return <ProductOfficeWorkbench {...props} />;
  }
  return <ProductCodeWorkbench {...props} />;
}
