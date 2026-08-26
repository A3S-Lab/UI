import { useId, type ReactNode } from "react";
import "./ProductExpertAvatar.css";

type ExpertAvatarPalette = {
  accent: string;
  background: string;
  hair: string;
  shirt: string;
  skin: string;
};

const palettes: readonly ExpertAvatarPalette[] = [
  {
    accent: "#315fdd",
    background: "#e7edff",
    hair: "#22242a",
    shirt: "#315fdd",
    skin: "#f2c7a5",
  },
  {
    accent: "#7655d5",
    background: "#eee9ff",
    hair: "#51382e",
    shirt: "#7655d5",
    skin: "#9d6549",
  },
  {
    accent: "#187a66",
    background: "#def3ed",
    hair: "#17191e",
    shirt: "#187a66",
    skin: "#d89a73",
  },
  {
    accent: "#a95b19",
    background: "#f8eadb",
    hair: "#5a321e",
    shirt: "#b26422",
    skin: "#f0bc91",
  },
  {
    accent: "#b04463",
    background: "#f8e5eb",
    hair: "#2d2024",
    shirt: "#b04463",
    skin: "#704630",
  },
  {
    accent: "#286c9f",
    background: "#e2f0f7",
    hair: "#6d5546",
    shirt: "#286c9f",
    skin: "#e3a979",
  },
  {
    accent: "#66722b",
    background: "#edf0df",
    hair: "#2d2924",
    shirt: "#66722b",
    skin: "#b87550",
  },
  {
    accent: "#735345",
    background: "#efe8e2",
    hair: "#b27a4e",
    shirt: "#735345",
    skin: "#f4cfad",
  },
] as const;

function stableAvatarValue(id: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (const character of id) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function HairBack({ color, style }: { color: string; style: number }) {
  if (style === 1) {
    return (
      <path
        d="M16 28c0-12 7-19 17-19 11 0 17 7 17 19v17c0 5-2 9-5 12l-5-7H22l-6 7c-3-4-4-8-4-13l4-16Z"
        fill={color}
      />
    );
  }
  if (style === 2) {
    return (
      <g fill={color}>
        <circle cx="20" cy="23" r="8" />
        <circle cx="26" cy="16" r="8" />
        <circle cx="35" cy="14" r="9" />
        <circle cx="44" cy="19" r="8" />
        <circle cx="48" cy="28" r="7" />
      </g>
    );
  }
  if (style === 5) {
    return (
      <g fill={color}>
        <circle cx="40" cy="10" r="9" />
        <path d="M17 29c0-13 7-20 17-20 11 0 17 8 17 20v9H16l1-9Z" />
      </g>
    );
  }
  return null;
}

function HairFront({ color, style }: { color: string; style: number }) {
  const styles: readonly ReactNode[] = [
    <path
      d="M17 27c1-13 8-19 18-19 9 0 15 5 17 13-6-4-12-5-17-3-5 2-8 6-17 6l-1 3Z"
      fill={color}
      key="short"
    />,
    <path
      d="M16 27c1-12 7-18 17-18 11 0 17 7 18 18-6-6-12-9-19-8-6 1-10 4-16 8Z"
      fill={color}
      key="bob"
    />,
    <path
      d="M15 28c1-7 5-12 11-15 9-4 20 0 25 10-10-2-17-2-23 2-4 3-8 4-13 3Z"
      fill={color}
      key="curls"
    />,
    <path
      d="M16 27c1-12 8-19 18-19 8 0 14 4 17 11-8-2-14-1-19 2-5 3-10 5-16 6Z"
      fill={color}
      key="side"
    />,
    <path
      d="M17 24c3-10 9-15 18-15 8 0 14 4 17 12-8-3-14-4-19-2-5 1-10 3-16 5Z"
      fill={color}
      key="crop"
    />,
    <path
      d="M16 28c0-13 7-20 18-20 10 0 16 6 18 17-9-5-17-7-24-4-4 2-7 4-12 7Z"
      fill={color}
      key="bun"
    />,
  ];
  return styles[style] ?? styles[0];
}

export function ProductExpertAvatar({
  expertId,
  size = 44,
}: {
  expertId: string;
  size?: number;
}) {
  const clipId = useId().replaceAll(":", "");
  const avatarSeed = stableAvatarValue(expertId, 0);
  const paletteIndex = avatarSeed % palettes.length;
  const palette = palettes[paletteIndex];
  const hairStyle = (avatarSeed >>> 3) % 6;
  const hasGlasses = (avatarSeed >>> 6) % 4 === 0;
  const hasFreckles = (avatarSeed >>> 8) % 5 === 0;
  const hasEarring = (avatarSeed >>> 11) % 3 === 0;
  const gazeOffset = (avatarSeed >>> 13) % 2 === 0 ? 0.5 : -0.5;

  return (
    <svg
      aria-hidden="true"
      className="product-expert-avatar"
      data-avatar-hair={hairStyle}
      data-avatar-variant={`${paletteIndex}-${hairStyle}-${Number(hasGlasses)}${Number(hasFreckles)}${Number(hasEarring)}`}
      data-expert-avatar={expertId}
      focusable="false"
      height={size}
      viewBox="0 0 64 64"
      width={size}
    >
      <defs>
        <clipPath id={clipId}>
          <rect height="64" rx="15" width="64" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect fill={palette.background} height="64" width="64" />
        <circle cx="52" cy="13" fill={palette.accent} opacity="0.13" r="15" />
        <circle cx="10" cy="56" fill={palette.accent} opacity="0.09" r="13" />
        <path d="M8 66c1-13 9-20 24-20s23 7 24 20H8Z" fill={palette.shirt} />
        <path d="m24 48 8 8 8-8-3-4H27l-3 4Z" fill="#fff" opacity="0.9" />
        <HairBack color={palette.hair} style={hairStyle} />
        <rect
          fill={palette.skin}
          height="13"
          rx="5"
          width="13"
          x="25.5"
          y="41"
        />
        <circle cx="18" cy="34" fill={palette.skin} r="4" />
        <circle cx="46" cy="34" fill={palette.skin} r="4" />
        <path
          d="M17 28c0-11 6-18 15-18 10 0 16 7 16 18v8c0 10-7 17-16 17s-15-7-15-17v-8Z"
          fill={palette.skin}
        />
        <HairFront color={palette.hair} style={hairStyle} />
        <path
          d="M22 30.5c2-1.4 4.2-1.5 6.2-.2M35.8 30.3c2-1.3 4.2-1.2 6.2.2"
          fill="none"
          opacity="0.62"
          stroke={palette.hair}
          strokeLinecap="round"
          strokeWidth="1.35"
        />
        <g fill="#20232a">
          <circle cx={25 + gazeOffset} cy="34" r="1.35" />
          <circle cx={39 + gazeOffset} cy="34" r="1.35" />
        </g>
        <path
          d="M32 34v5l2.4.5"
          fill="none"
          opacity="0.46"
          stroke="#704d3a"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.15"
        />
        <path
          d="M27 43c3 2.4 7 2.4 10 0"
          fill="none"
          stroke="#843f46"
          strokeLinecap="round"
          strokeWidth="1.45"
        />
        {hasGlasses ? (
          <g
            fill="none"
            stroke={palette.hair}
            strokeLinecap="round"
            strokeWidth="1.45"
          >
            <rect height="6.5" rx="2.5" width="10" x="20" y="31" />
            <rect height="6.5" rx="2.5" width="10" x="34" y="31" />
            <path d="M30 33.5h4M17 32.5l3 1M44 33.5l3-1" />
          </g>
        ) : null}
        {hasFreckles ? (
          <g fill="#9c654e" opacity="0.45">
            <circle cx="22" cy="39" r="0.55" />
            <circle cx="24.5" cy="40" r="0.55" />
            <circle cx="39.5" cy="40" r="0.55" />
            <circle cx="42" cy="39" r="0.55" />
          </g>
        ) : null}
        {hasEarring ? (
          <circle
            cx="47"
            cy="38"
            fill="none"
            r="1.6"
            stroke={palette.accent}
            strokeWidth="1.2"
          />
        ) : null}
      </g>
      <rect
        fill="none"
        height="63"
        opacity="0.28"
        rx="14.5"
        stroke={palette.accent}
        width="63"
        x="0.5"
        y="0.5"
      />
    </svg>
  );
}
