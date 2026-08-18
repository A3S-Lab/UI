import type { ReactNode, SVGProps } from "react";

export type ProductPlaygroundIconName =
  | "arrow"
  | "back"
  | "assistant"
  | "automation"
  | "brain"
  | "calendar"
  | "catalog"
  | "chart"
  | "check"
  | "checklist"
  | "chevron"
  | "close"
  | "code"
  | "coffee"
  | "collapse"
  | "copy"
  | "database"
  | "document"
  | "download"
  | "edit"
  | "eye"
  | "files"
  | "filter"
  | "finance"
  | "folder"
  | "forward"
  | "gift"
  | "grid"
  | "help"
  | "inspiration"
  | "knowledge"
  | "link"
  | "list"
  | "logout"
  | "mail"
  | "menu"
  | "microphone"
  | "moon"
  | "more"
  | "notification"
  | "palette"
  | "pause"
  | "pin"
  | "plus"
  | "presentation"
  | "product"
  | "project"
  | "refresh"
  | "report"
  | "search"
  | "send"
  | "share"
  | "sort"
  | "settings"
  | "shield"
  | "stop"
  | "sun"
  | "task-add"
  | "trash"
  | "upload"
  | "update"
  | "up"
  | "version"
  | "video"
  | "warning"
  | "workspace";

const paths: Record<ProductPlaygroundIconName, ReactNode> = {
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  back: <path d="M19 12H5m5 5-5-5 5-5" />,
  assistant: (
    <>
      <path d="M8 7.5V6a4 4 0 0 1 8 0v1.5" />
      <rect x="5" y="7.5" width="14" height="13" rx="4" />
      <path d="M9 12h.01M15 12h.01M9 16h6" />
    </>
  ),
  automation: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M9 2h6M12 6V3m5.2 4.8 1.6-1.6M12 10v3l2 1.5" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.5a3.5 3.5 0 0 0-1 6.8A3.5 3.5 0 0 0 9.5 20H12V4.5Z" />
      <path d="M14.5 4.5A3.5 3.5 0 0 1 18 8v.5a3.5 3.5 0 0 1 1 6.8 3.5 3.5 0 0 1-4.5 4.7H12V4.5ZM8 9.5h4m-4 5h4m4-5h-4m4 5h-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M7.5 3v5M16.5 3v5M3.5 10h17" />
    </>
  ),
  catalog: (
    <>
      <path d="M4 7h6v6H4zM14 4h6v6h-6zM14 14h6v6h-6z" />
      <path d="M10 10h4M10 10v7h4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      <path d="m4 7 5-4 6 6 5-4" />
    </>
  ),
  check: <path d="m5 12.5 4 4L19 6.5" />,
  checklist: (
    <>
      <path d="m4 6 1.5 1.5L8 5M11 6h9M4 12l1.5 1.5L8 11M11 12h9M4 18l1.5 1.5L8 17M11 18h9" />
    </>
  ),
  chevron: <path d="m8 10 4 4 4-4" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  code: <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M14 4l-4 16" />,
  coffee: (
    <>
      <path d="M4 9h13v5.5A4.5 4.5 0 0 1 12.5 19h-4A4.5 4.5 0 0 1 4 14.5Z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M7 4v2M11 3v3M15 4v2M3 21h16" />
    </>
  ),
  collapse: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v5h5M9 12h6M9 16h6" />
    </>
  ),
  download: <path d="M12 3v12m-5-5 5 5 5-5M4 20h16" />,
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  files: (
    <>
      <path d="M5 4h5l2 2h7v14H5Z" />
      <path d="M8 10h8M8 14h8" />
    </>
  ),
  filter: <path d="M4 5h16l-6 7v6l-4 2v-8Z" />,
  finance: (
    <>
      <path d="M4 7.5h15a2 2 0 0 1 2 2V19H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3.5" />
      <path d="M15 12h6v4h-6a2 2 0 0 1 0-4Z" />
    </>
  ),
  folder: <path d="M3 6h7l2 2h9v11H3Z" />,
  forward: <path d="M5 12h14m-5-5 5 5-5 5" />,
  gift: (
    <>
      <path d="M3 9h18v4H3ZM5 13h14v8H5ZM12 9v12" />
      <path d="M12 9H8.5A2.5 2.5 0 1 1 11 6.5ZM12 9h3.5A2.5 2.5 0 1 0 13 6.5Z" />
    </>
  ),
  grid: <path d="M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h6v6h-6Z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 1 1 3.1 2.3c-.9.4-.9 1-.9 1.7M12 17h.01" />
    </>
  ),
  inspiration: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M8.2 15.5A6.5 6.5 0 1 1 15.8 15.5c-1 .7-1.3 1.2-1.3 2h-5c0-.8-.3-1.3-1.3-2Z" />
    </>
  ),
  knowledge: (
    <>
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23Z" />
      <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23Z" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  logout: (
    <>
      <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  microphone: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V21M9 21h6" />
    </>
  ),
  moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  notification: (
    <>
      <path d="M6 17h12l-1.4-2.2V10a4.6 4.6 0 0 0-9.2 0v4.8Z" />
      <path d="M10 20h4" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18h1.4a2 2 0 0 0 1.5-3.3l-.5-.6a1.5 1.5 0 0 1 1.1-2.5H18a3 3 0 0 0 3-3A8.6 8.6 0 0 0 12 3Z" />
      <path d="M7.5 10h.01M9.5 6.5h.01M14.5 6.5h.01M17 10h.01" />
    </>
  ),
  pause: <path d="M8 5v14M16 5v14" />,
  pin: (
    <>
      <path d="m9 4 6 6M7 9l8 8M14 3l7 7-4 1-5 5-1 4-7-7 4-1 5-5Z" />
      <path d="m4 20 5-5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  presentation: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21l4-4 4 4M8 8h8M8 12h5" />
    </>
  ),
  product: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" />
    </>
  ),
  project: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="17.5" cy="6" r="2.5" />
      <circle cx="17.5" cy="18" r="2.5" />
      <path d="m8.2 10.8 7-3.6m-7 6 7 3.6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 8.2A7 7 0 0 1 18.8 7L20 9M4 15l1.2 2A7 7 0 0 0 18 15.8" />
    </>
  ),
  report: (
    <>
      <path d="M5 3h14v18H5Z" />
      <path d="M8 8h8M8 12h5M8 16h7" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.5 4.5" />
    </>
  ),
  send: (
    <>
      <path d="m4 12 16-8-5.5 16-3-6.5Z" />
      <path d="M11.5 13.5 20 4" />
    </>
  ),
  share: (
    <>
      <path d="M15 5h4v4" />
      <path d="m19 5-7.5 7.5" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </>
  ),
  sort: <path d="M8 6h12M8 12h8M8 18h4M4 4v16m0 0-2-2m2 2 2-2" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.5 2.7 8.2 7 10 4.3-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  "task-add": (
    <>
      <path d="M6.5 18.5 3 21l.8-4.8A8.5 8.5 0 1 1 6.5 18.5Z" />
      <path d="M12 8v6M9 11h6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />
    </>
  ),
  upload: <path d="M12 21V9m-5 5 5-5 5 5M4 4h16" />,
  update: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 8.2A7 7 0 0 1 18.8 7L20 9M4 15l1.2 2A7 7 0 0 0 18 15.8" />
    </>
  ),
  up: <path d="M12 19V5m-5 5 5-5 5 5" />,
  version: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 8h8M8 12h5M8 16h3" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="5" width="14" height="14" rx="3" />
      <path d="m17 10 4-2v8l-4-2ZM9 9l4 3-4 3Z" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2.8 20h18.4Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  workspace: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M8 4v16M8 9h13" />
    </>
  ),
};

export function ProductPlaygroundIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: ProductPlaygroundIconName }) {
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
