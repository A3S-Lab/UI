import type { NormalizedSidebarGroup, SidebarData } from "@rspress/core";
import { useActiveMatcher, useSidebarDynamic } from "@rspress/core/runtime";
import {
  IconArrowRight,
  SvgWrapper,
  Tag,
  renderInlineMarkdown,
} from "@rspress/core/theme";
import { SidebarDivider } from "@rspress/core/dist/theme/components/Sidebar/SidebarDivider.js";
import { SidebarItem } from "@rspress/core/dist/theme/components/Sidebar/SidebarItem.js";
import { SidebarSectionHeader } from "@rspress/core/dist/theme/components/Sidebar/SidebarSectionHeader.js";
import {
  isSidebarDivider,
  isSidebarGroup,
  isSidebarSectionHeader,
} from "@rspress/core/dist/theme/components/Sidebar/utils.js";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import "./DocsSidebar.css";

type SidebarEntry = SidebarData[number];

type SidebarListProps = {
  sidebarData: SidebarData;
  setSidebarData: Dispatch<SetStateAction<SidebarData>>;
};

function containsActiveRoute(
  item: SidebarEntry,
  activeMatcher: (link: string) => boolean,
): boolean {
  if ("link" in item && item.link && activeMatcher(item.link)) return true;
  if (!isSidebarGroup(item)) return false;
  return item.items.some((child) => containsActiveRoute(child, activeMatcher));
}

function groupClassName(depth: number, active: boolean) {
  return [
    "rp-sidebar-item",
    "rp-sidebar-group",
    depth > 0 ? "rp-sidebar-item--group-item" : "",
    active ? "rp-sidebar-item--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function GroupLabel({
  active,
  collapsible,
  depth,
  item,
}: {
  active: boolean;
  collapsible: boolean;
  depth: number;
  item: NormalizedSidebarGroup;
}) {
  const className = groupClassName(depth, active);
  const style = {
    paddingInlineStart: depth === 0 ? "12px" : `calc(12px * ${depth} + 12px)`,
  };
  const content = (
    <>
      <span className="rp-sidebar-item__left">
        {item.icon ? (
          <SvgWrapper icon={item.icon} className="rp-sidebar-item__icon" />
        ) : null}
        <span className="rp-doc" {...renderInlineMarkdown(item.text)} />
      </span>
      <span className="rp-sidebar-item__right">
        <Tag tag={item.tag} />
        {collapsible ? (
          <span aria-hidden="true" className="a3s-docs-sidebar__chevron">
            <SvgWrapper icon={IconArrowRight} />
          </span>
        ) : null}
      </span>
    </>
  );

  return collapsible ? (
    <summary className={className} data-depth={depth} style={style}>
      {content}
    </summary>
  ) : (
    <div className={className} data-depth={depth} style={style}>
      {content}
    </div>
  );
}

function SidebarEntries({
  depth,
  entries,
  path,
}: {
  depth: number;
  entries: SidebarData;
  path: string;
}) {
  return entries.map((item, index) => {
    const itemPath = `${path}-${index}`;

    if (isSidebarDivider(item)) {
      return (
        <SidebarDivider
          depth={depth}
          dividerType={item.dividerType}
          key={itemPath}
        />
      );
    }

    if (isSidebarSectionHeader(item)) {
      return (
        <SidebarSectionHeader
          icon={item.icon}
          key={itemPath}
          sectionHeaderText={item.sectionHeaderText}
          tag={item.tag}
        />
      );
    }

    if (isSidebarGroup(item)) {
      return (
        <NativeSidebarGroup
          depth={depth}
          item={item}
          key={itemPath}
          path={itemPath}
        />
      );
    }

    return (
      <SidebarItem
        className={depth > 0 ? "rp-sidebar-item--group-item" : undefined}
        depth={depth}
        item={item}
        key={itemPath}
      />
    );
  });
}

function NativeSidebarGroup({
  depth,
  item,
  path,
}: {
  depth: number;
  item: NormalizedSidebarGroup;
  path: string;
}) {
  const activeMatcher = useActiveMatcher();
  const disclosure = useRef<HTMLDetailsElement>(null);
  const active = Boolean(item.link && activeMatcher(item.link));
  const containsActive = containsActiveRoute(item, activeMatcher);
  const collapsible = item.collapsible !== false;
  const [open, setOpen] = useState(!item.collapsed || containsActive);
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = true;
    setOpen(Boolean(disclosure.current?.open || containsActive));
    return () => {
      hydrated.current = false;
    };
  }, []);

  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  const children = (
    <div className="a3s-docs-sidebar__panel">
      <SidebarEntries depth={depth + 1} entries={item.items} path={path} />
    </div>
  );

  if (!collapsible) {
    return (
      <div className="a3s-docs-sidebar__static-group">
        <GroupLabel
          active={active}
          collapsible={false}
          depth={depth}
          item={item}
        />
        {children}
      </div>
    );
  }

  return (
    <details
      className="a3s-docs-sidebar__group"
      data-sidebar-group={path}
      data-sidebar-group-label={item.text}
      onToggle={(event) => {
        if (hydrated.current) setOpen(event.currentTarget.open);
      }}
      open={open}
      ref={disclosure}
      suppressHydrationWarning
    >
      <GroupLabel active={active} collapsible depth={depth} item={item} />
      {children}
    </details>
  );
}

export function SidebarList({ sidebarData }: SidebarListProps) {
  return <SidebarEntries depth={0} entries={sidebarData} path="sidebar" />;
}

export function Sidebar() {
  const [sidebarData, setSidebarData] = useSidebarDynamic();

  return (
    <Fragment>
      <SidebarList setSidebarData={setSidebarData} sidebarData={sidebarData} />
    </Fragment>
  );
}
