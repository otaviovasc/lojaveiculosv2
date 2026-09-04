import type { CSSProperties } from "react";
import { getReadableColorOnBackground } from "../../../lib/colors";
import { readableTextColorForBackground } from "../publicStorefrontTheme";
import { fontStack } from "../storefrontFonts";
import type {
  StorefrontDensity,
  StorefrontMotionStyle,
  StorefrontRadius,
  StorefrontTokens,
  StorefrontTypeScale,
} from "./types";

const hex = (value: string) => `#${value}`;

export type StorefrontTokenVars = CSSProperties &
  Record<`--sf-${string}`, string>;

/* Brand token values mirrored so the dark chrome never depends on the
   light-surface cascade (tokens.css: --color-text / publicSite.css off-white). */
const CHROME_DARK_BG = hex("151515");
const CHROME_DARK_INK = hex("f4efee");

const radiusVars: Record<StorefrontRadius, string> = {
  pill: "1.5rem",
  rounded: "0.75rem",
  sharp: "0.25rem",
};

const sectionPadVars: Record<StorefrontDensity, string> = {
  airy: "6rem",
  default: "4rem",
  dense: "2.5rem",
};

const cardGapVars: Record<StorefrontDensity, string> = {
  airy: "2rem",
  default: "1.5rem",
  dense: "1rem",
};

const motionProfiles: Record<
  StorefrontMotionStyle,
  { hero: string; micro: string; section: string }
> = {
  dynamic: { hero: "600ms", micro: "120ms", section: "240ms" },
  none: { hero: "0ms", micro: "0ms", section: "0ms" },
  subtle: { hero: "0ms", micro: "120ms", section: "180ms" },
};

const headlineSizeVars: Record<StorefrontTypeScale, string> = {
  compact: "clamp(1.875rem, 1.5rem + 1.6vw, 2.75rem)",
  standard: "clamp(2.25rem, 1.75rem + 2.2vw, 3.5rem)",
  display: "clamp(2.75rem, 1.9rem + 3.8vw, 5rem)",
};

export function resolveTokenVars(
  tokens: StorefrontTokens,
): StorefrontTokenVars {
  const chrome = resolveChromeColors(tokens);
  const motion = motionProfiles[tokens.motion.style];
  return {
    "--sf-accent": tokens.color.accent,
    "--sf-accent-readable": getReadableColorOnBackground(
      tokens.color.accent,
      tokens.color.surface,
    ),
    "--sf-accent-soft": `color-mix(in oklab, ${tokens.color.accent} 12%, transparent)`,
    "--sf-accent-strong": tokens.color.accentStrong,
    "--sf-body-font": fontStack(tokens.type.bodyFont),
    "--sf-card-gap": cardGapVars[tokens.shape.density],
    "--sf-chrome-bg": chrome.bg,
    "--sf-chrome-glass": `color-mix(in oklab, ${chrome.bg} 60%, transparent)`,
    "--sf-chrome-ink": chrome.ink,
    "--sf-chrome-ink-muted": `color-mix(in oklab, ${chrome.ink} 74%, transparent)`,
    "--sf-chrome-line": `color-mix(in oklab, ${chrome.ink} 14%, transparent)`,
    "--sf-heading-font": fontStack(tokens.type.headingFont),
    "--sf-headline-size": headlineSizeVars[tokens.type.scale],
    "--sf-ink": tokens.color.ink,
    "--sf-ink-muted": tokens.color.inkMuted,
    "--sf-inverse": readableTextColorForBackground(tokens.color.accent),
    "--sf-motion-hero": motion.hero,
    "--sf-motion-micro": motion.micro,
    "--sf-motion-section": motion.section,
    "--sf-radius": radiusVars[tokens.shape.radius],
    "--sf-section-pad": sectionPadVars[tokens.shape.density],
    "--sf-surface": tokens.color.surface,
    "--sf-surface-raised": tokens.color.surfaceRaised,
  };
}

function resolveChromeColors(tokens: StorefrontTokens) {
  if (tokens.color.chrome === "brand") {
    return {
      bg: tokens.color.accentStrong,
      ink: readableTextColorForBackground(tokens.color.accentStrong),
    };
  }
  if (tokens.color.chrome === "light") {
    return { bg: tokens.color.surfaceRaised, ink: tokens.color.ink };
  }
  return { bg: CHROME_DARK_BG, ink: CHROME_DARK_INK };
}
