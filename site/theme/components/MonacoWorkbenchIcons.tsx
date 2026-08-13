import type { ReactNode, SVGProps } from "react";

type IconName =
  | "branch"
  | "check"
  | "chevron"
  | "close"
  | "command"
  | "explorer"
  | "file"
  | "panel"
  | "problems"
  | "search"
  | "source-control";

type WorkbenchIconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

const paths: Record<IconName, ReactNode> = {
  branch: (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M6 7v10M8 15c5 0 8-2 8-5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  command: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="m8 10 2 2-2 2M13 15h3" />
    </>
  ),
  explorer: (
    <>
      <path d="M4 4h6l2 3h8v13H4z" />
      <path d="M4 9h16" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 14h18" />
    </>
  ),
  problems: (
    <>
      <path d="M12 3 2.8 20h18.4z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  "source-control": (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M6 7v10M8 15c5 0 8-2 8-5" />
    </>
  ),
};

export function WorkbenchIcon({ name, ...props }: WorkbenchIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
