import type { ReactNode, SVGProps } from "react";

export type PlaygroundIconName =
  | "automation"
  | "catalog"
  | "channels"
  | "check"
  | "code"
  | "design"
  | "file"
  | "folder"
  | "inspect"
  | "play"
  | "refresh"
  | "search"
  | "settings"
  | "workflow"
  | "write";

const paths: Record<PlaygroundIconName, ReactNode> = {
  automation: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 1.5" />
    </>
  ),
  catalog: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  channels: (
    <>
      <path d="M7 17.5 4 20v-5.2A7 7 0 0 1 7 2h5a7 7 0 0 1 6.7 9" />
      <path d="M13 12h5a3 3 0 0 1 3 3v5l-2.2-1.7H15a3 3 0 0 1-3-3V15a3 3 0 0 1 1-3Z" />
    </>
  ),
  check: <path d="m5 12.5 4 4L19 6.5" />,
  code: (
    <>
      <path d="m8 7-5 5 5 5" />
      <path d="m16 7 5 5-5 5" />
      <path d="m14 4-4 16" />
    </>
  ),
  design: (
    <>
      <path d="M4 17.5V20h2.5L18.8 7.7l-2.5-2.5L4 17.5Z" />
      <path d="m14.8 6.7 2.5 2.5" />
      <path d="M4 4h6M4 8h3" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v5h5" />
    </>
  ),
  folder: <path d="M3 6h7l2 2h9v11H3Z" />,
  inspect: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M14 4v16M14 9h6" />
    </>
  ),
  play: <path d="m9 6 9 6-9 6Z" />,
  refresh: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M18.5 16a8 8 0 1 1 .7-7" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  workflow: (
    <>
      <rect x="3" y="4" width="7" height="5" rx="1" />
      <rect x="14" y="15" width="7" height="5" rx="1" />
      <path d="M10 6.5h4a3 3 0 0 1 3 3V15M7 9v5a3 3 0 0 0 3 3h4" />
    </>
  ),
  write: (
    <>
      <path d="M5 4h14v16H5Z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
};

export function PlaygroundIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: PlaygroundIconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
