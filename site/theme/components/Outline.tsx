import type { Header } from "@rspress/core";
import { useI18n, useLang, useLocation, useSite } from "@rspress/core/runtime";
import {
  EditLink,
  IconArrowRight,
  IconScrollToTop,
  Link,
  LlmsCopyRow,
  LlmsOpenRow,
  ReadPercent,
  SvgWrapper,
  parseInlineMarkdownText,
  renderInlineMarkdown,
  useActiveAnchor,
  useDynamicToc,
  useReadPercent,
} from "@rspress/core/theme-original";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import "@rspress/core/dist/theme/components/Outline/index.css";
import "@rspress/core/dist/theme/components/Toc/TocItem.css";
import "./Outline.css";

type OutlineGroup = {
  heading: Header;
  children: Header[];
};

type OutlineLinkProps = {
  active: boolean;
  header: Header;
  nested?: boolean;
};

function OutlineLink({ active, header, nested = false }: OutlineLinkProps) {
  const depth = nested ? Math.max(0, header.depth - 3) : 0;

  return (
    <Link
      href={`#${header.id}`}
      title={parseInlineMarkdownText(header.text)}
      className={`rp-toc-item a3s-outline__link${
        active ? " rp-toc-item--active" : ""
      }`}
      style={{ paddingInlineStart: depth * 12 }}
      data-depth={header.depth - 2}
      data-outline-anchor={header.id}
    >
      <span
        className="rp-toc-item__text rp-doc"
        {...renderInlineMarkdown(header.text)}
      />
    </Link>
  );
}

function ScrollToTopAction() {
  const t = useI18n();
  const [, scrollTop] = useReadPercent();

  if (scrollTop < 100) return null;

  return (
    <button
      type="button"
      className="rp-outline__action-row rp-scroll-to-top"
      onClick={() => {
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
        });
      }}
    >
      <SvgWrapper icon={IconScrollToTop} width="16" height="16" />
      <span>{t("scrollToTopText")}</span>
    </button>
  );
}

function groupHeaders(headers: Header[]) {
  const groups: OutlineGroup[] = [];
  const ungrouped: Header[] = [];
  let currentGroup: OutlineGroup | undefined;

  headers.forEach((header) => {
    if (header.depth === 2) {
      currentGroup = { heading: header, children: [] };
      groups.push(currentGroup);
      return;
    }

    if (currentGroup) currentGroup.children.push(header);
    else ungrouped.push(header);
  });

  return { groups, ungrouped };
}

export function Outline() {
  const t = useI18n();
  const lang = useLang();
  const location = useLocation();
  const {
    site: {
      themeConfig: { enableScrollToTop = true, llmsUI },
    },
  } = useSite();
  const headers = useDynamicToc();
  const { activeAnchorId } = useActiveAnchor(headers);
  const { groups, ungrouped } = useMemo(() => groupHeaders(headers), [headers]);
  const activeGroupId = useMemo(
    () =>
      groups.find(
        ({ heading, children }) =>
          heading.id === activeAnchorId ||
          children.some((header) => header.id === activeAnchorId),
      )?.heading.id ?? groups[0]?.heading.id,
    [activeAnchorId, groups],
  );
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(
    activeGroupId ?? null,
  );
  const tocRef = useRef<HTMLElement>(null);
  const placement =
    typeof llmsUI === "object" ? (llmsUI?.placement ?? "title") : "title";
  const isChinese = lang.startsWith("zh");

  useEffect(() => {
    setExpandedGroupId(activeGroupId ?? null);
  }, [activeGroupId, location.pathname]);

  useEffect(() => {
    if (!activeAnchorId || !tocRef.current) return;

    const activeLink = Array.from(
      tocRef.current.querySelectorAll<HTMLElement>("[data-outline-anchor]"),
    ).find((link) => link.dataset.outlineAnchor === activeAnchorId);
    if (!activeLink) return;

    const container = tocRef.current;
    const linkTop = activeLink.offsetTop;
    const linkBottom = linkTop + activeLink.offsetHeight;
    const visibleTop = container.scrollTop;
    const visibleBottom = visibleTop + container.clientHeight;

    if (linkTop < visibleTop || linkBottom > visibleBottom) {
      container.scrollTop = Math.max(
        0,
        linkTop - (container.clientHeight - activeLink.offsetHeight) / 2,
      );
    }
  }, [activeAnchorId, expandedGroupId]);

  return (
    <div className="rp-outline">
      <div className="rp-outline__title">
        {t("outlineTitle")}
        <ReadPercent size={14} strokeWidth={2} />
      </div>
      <nav
        ref={tocRef}
        className="rp-outline__toc rp-scrollbar"
        aria-label={t("outlineTitle")}
      >
        {ungrouped.map((header, index) => (
          <OutlineLink
            key={`${header.depth}_${header.id}_${index}`}
            header={header}
            active={activeAnchorId === header.id}
          />
        ))}
        {groups.map(({ heading, children }, index) => {
          const expanded = expandedGroupId === heading.id;
          const panelId = `a3s-outline-group-${index}-panel`;
          const title = parseInlineMarkdownText(heading.text);
          const action = expanded
            ? isChinese
              ? `收起“${title}”章节`
              : `Collapse ${title} section`
            : isChinese
              ? `展开“${title}”章节`
              : `Expand ${title} section`;

          return (
            <div
              className="a3s-outline-group"
              data-expanded={String(expanded)}
              key={`${heading.depth}_${heading.id}_${index}`}
            >
              <div className="a3s-outline-group__header">
                <OutlineLink
                  header={heading}
                  active={activeAnchorId === heading.id}
                />
                {children.length > 0 ? (
                  <button
                    type="button"
                    className="a3s-outline-group__toggle"
                    aria-label={action}
                    aria-controls={panelId}
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedGroupId((current) =>
                        current === heading.id ? null : heading.id,
                      )
                    }
                  >
                    <SvgWrapper icon={IconArrowRight} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              {children.length > 0 ? (
                <div
                  id={panelId}
                  className="a3s-outline-group__panel"
                  aria-hidden={!expanded}
                  inert={!expanded}
                  hidden={!expanded}
                >
                  {children.map((header, childIndex) => (
                    <OutlineLink
                      key={`${header.depth}_${header.id}_${childIndex}`}
                      header={header}
                      active={activeAnchorId === header.id}
                      nested
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      <div className="rp-outline__divider" />
      <div className="rp-outline__bottom">
        <EditLink isOutline />
        {import.meta.env.ENABLE_LLMS_UI && placement === "outline" ? (
          <Fragment>
            <LlmsCopyRow />
            <LlmsOpenRow />
          </Fragment>
        ) : null}
        {enableScrollToTop ? <ScrollToTopAction /> : null}
      </div>
    </div>
  );
}
