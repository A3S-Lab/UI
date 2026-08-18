import { Link } from "@rspress/core/theme";
import type { ProductPlaygroundLocale } from "./product-playground-data";
import { ProductPlaygroundIcon } from "./ProductPlaygroundIcon";

export function ProductProjectBreadcrumb({
  current,
  locale,
  projectHref,
  projectsHref,
}: {
  current?: string;
  locale: ProductPlaygroundLocale;
  projectHref: string;
  projectsHref: string;
}) {
  const zh = locale === "zh";
  return (
    <nav
      aria-label={zh ? "项目路径" : "Project path"}
      className="product-project-breadcrumb"
    >
      <Link href={projectsHref}>
        <ProductPlaygroundIcon name="folder" />
        <span>{zh ? "项目" : "Projects"}</span>
      </Link>
      <span aria-hidden="true">/</span>
      {current ? (
        <>
          <Link href={projectHref}>
            {zh ? "A3S UI 体验优化" : "A3S UI experience"}
          </Link>
          <span aria-hidden="true">/</span>
          <h1>{current}</h1>
        </>
      ) : (
        <h1>{zh ? "A3S UI 体验优化" : "A3S UI experience"}</h1>
      )}
    </nav>
  );
}

export function ProductProjectPresence({
  locale,
}: {
  locale: ProductPlaygroundLocale;
}) {
  const zh = locale === "zh";
  return (
    <div className="product-project-presence">
      <span data-collaborating>
        <i aria-hidden="true" />
        {zh ? "协同中" : "Collaborating"}
      </span>
      <span aria-label={zh ? "3 位项目成员" : "3 project members"}>
        <ProductPlaygroundIcon name="assistant" />3
      </span>
    </div>
  );
}
