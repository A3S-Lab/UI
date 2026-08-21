import type { SVGProps } from 'react';

export type ProductIconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'book'
  | 'check'
  | 'clock'
  | 'close'
  | 'database'
  | 'download'
  | 'file'
  | 'folder'
  | 'form'
  | 'layers'
  | 'panel-left-close'
  | 'panel-left-open'
  | 'plus'
  | 'save'
  | 'search'
  | 'sparkles'
  | 'template'
  | 'upload';

export interface ProductIconProps extends SVGProps<SVGSVGElement> {
  name: ProductIconName;
  size?: number;
}

export function ProductIcon({ name, size = 18, ...props }: ProductIconProps) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} {...props}>
      {name === 'arrow-left' && (
        <path
          d="m14.5 5-7 7 7 7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      )}
      {name === 'arrow-right' && (
        <path
          d="m9.5 5 7 7-7 7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      )}
      {name === 'book' && (
        <path
          d="M5.5 4.5h9A2.5 2.5 0 0 1 17 7v12H7a2.5 2.5 0 0 1-2.5-2.5v-11a1 1 0 0 1 1-1Zm0 11.5H17M8 8h6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      )}
      {name === 'check' && (
        <path
          d="m6 12.5 3.6 3.6L18 7.7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.9"
        />
      )}
      {name === 'clock' && (
        <>
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 7.5V12l3.2 2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </>
      )}
      {name === 'close' && (
        <path
          d="m7 7 10 10M17 7 7 17"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      )}
      {name === 'database' && (
        <>
          <ellipse cx="12" cy="6" rx="7.5" ry="3" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6m-15 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </>
      )}
      {name === 'download' && (
        <path
          d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      )}
      {name === 'file' && (
        <path
          d="M7 3.5h6l4 4V20H7V3.5Zm6 0v4h4M9.5 12h5M9.5 15.5h5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      )}
      {name === 'folder' && (
        <path
          d="M3.5 7.5h6l2-2h9v13h-17v-11Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      )}
      {name === 'form' && (
        <>
          <rect
            height="17"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.6"
            width="15"
            x="4.5"
            y="3.5"
          />
          <path
            d="M8 8h8M8 12h5M8 16h7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </>
      )}
      {name === 'layers' && (
        <path
          d="m12 3.5 8 4.2-8 4.2-8-4.2 8-4.2Zm-8 8.2 8 4.2 8-4.2M4 15.8l8 4.2 8-4.2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      )}
      {name === 'panel-left-close' && (
        <>
          <rect
            x="3.5"
            y="4"
            width="17"
            height="16"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M9 4v16m6.5-11-3 3 3 3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </>
      )}
      {name === 'panel-left-open' && (
        <>
          <rect
            x="3.5"
            y="4"
            width="17"
            height="16"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M9 4v16m3.5-11 3 3-3 3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </>
      )}
      {name === 'plus' && (
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      )}
      {name === 'save' && (
        <path
          d="M5 4h12l2 2v14H5V4Zm3 0v6h8V4m-8 16v-6h8v6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      )}
      {name === 'search' && (
        <>
          <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.7" />
          <path d="m15 15 4.5 4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        </>
      )}
      {name === 'sparkles' && (
        <path
          d="M12 2.8c.4 4 2.4 6 6.2 6.5-3.8.4-5.8 2.5-6.2 6.4-.4-3.9-2.4-6-6.2-6.4C9.6 8.8 11.6 6.8 12 2.8ZM18.5 15.5c.2 1.8 1.1 2.7 2.7 3-1.6.2-2.5 1.1-2.7 2.8-.2-1.7-1.1-2.6-2.7-2.8 1.6-.3 2.5-1.2 2.7-3Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      )}
      {name === 'template' && (
        <path
          d="M4 5.5h16v13H4v-13Zm5 0v13M9 10h11M4 14h5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      )}
      {name === 'upload' && (
        <path
          d="M12 16V5m0 0L7.5 9.5M12 5l4.5 4.5M5 19h14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      )}
    </svg>
  );
}
