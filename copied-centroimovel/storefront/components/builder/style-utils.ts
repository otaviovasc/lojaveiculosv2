import type { ComponentStyleProps, GradientConfig } from "@centroimovel/types";
import type { CSSProperties } from "react";

function legacyGradientCss(
  gradient?: GradientConfig | null,
): string | undefined {
  if (!gradient?.stops?.length) return undefined;
  const stops = gradient.stops
    .map((s) => `${s.color} ${s.position}%`)
    .join(", ");
  if (gradient.type === "radial") {
    return `radial-gradient(${stops})`;
  }
  return `linear-gradient(${gradient.angle ?? 180}deg, ${stops})`;
}

export const PADDING_MAP: Record<string, string> = {
  none: "0",
  sm: "1rem",
  md: "2rem",
  lg: "3rem",
  xl: "4rem",
  "2xl": "6rem",
  full: "0",
};

export const MARGIN_MAP: Record<string, string> = {
  none: "0",
  sm: "1rem",
  md: "2rem",
  lg: "3rem",
  xl: "4rem",
  "2xl": "6rem",
};

export const SHADOW_MAP: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0,0,0,0.05)",
  md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
  lg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
  xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
  "2xl": "0 25px 50px -12px rgba(0,0,0,0.25)",
};

export const BORDER_RADIUS_MAP: Record<string, string> = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
  full: "9999px",
};

const FONT_SIZE_MAP: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.25rem",
  "2xl": "1.5rem",
  "3xl": "1.875rem",
  "4xl": "2.25rem",
  "5xl": "3rem",
};

function combinedBoxShadow(style: ComponentStyleProps): string | undefined {
  const shadowValue = style.shadow ? SHADOW_MAP[style.shadow] : undefined;
  const glowValue =
    style.glowColor && style.glowIntensity
      ? `0 0 ${style.glowIntensity}px ${style.glowColor}`
      : undefined;
  if (shadowValue && glowValue) return `${shadowValue}, ${glowValue}`;
  return shadowValue || glowValue;
}

/**
 * Full-bleed shell: backgrounds, typography, spacing, size — rectangular (no rounding on the bg).
 */
export function getSectionShellStyle(
  style?: ComponentStyleProps,
): CSSProperties {
  if (!style) return {};

  return {
    ...(style.textColor && { color: style.textColor }),
    ...(style.backgroundColor && { backgroundColor: style.backgroundColor }),
    ...(style.textAlign && { textAlign: style.textAlign }),
    ...(style.fontFamily && { fontFamily: `"${style.fontFamily}", serif` }),
    ...(style.fontSize && {
      fontSize: FONT_SIZE_MAP[style.fontSize] ?? style.fontSize,
    }),
    ...(style.padding && { padding: PADDING_MAP[style.padding] }),
    ...(style.margin && {
      marginTop: MARGIN_MAP[style.margin],
      marginBottom: MARGIN_MAP[style.margin],
    }),
    ...(style.background?.type === "solid" && {
      backgroundColor: style.background.solidColor,
    }),
    ...(style.gradient &&
      !style.background && {
        background: legacyGradientCss(style.gradient),
      }),
    ...(style.backgroundImageUrl &&
      !style.background &&
      !style.gradient && {
        backgroundImage: `url(${style.backgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }),
    ...(style.minHeight && { minHeight: style.minHeight }),
    ...(style.maxHeight && { maxHeight: style.maxHeight }),
  };
}

/**
 * Card chrome applied to the inner wrapper: radius, shadow, border — not the full-bleed background.
 */
export function getSectionInnerChromeStyle(
  style?: ComponentStyleProps,
): CSSProperties {
  if (!style) return {};

  const shadow = combinedBoxShadow(style);

  return {
    ...(shadow && { boxShadow: shadow }),
    ...(style.borderRadius && {
      borderRadius: BORDER_RADIUS_MAP[style.borderRadius],
    }),
    ...(style.borderWidth && {
      borderWidth: `${style.borderWidth}px`,
      borderStyle: "solid" as const,
    }),
    ...(style.borderColor && { borderColor: style.borderColor }),
  };
}

/** Shell + inner chrome merged (single-node layouts). */
export function getBaseSectionStyle(
  style?: ComponentStyleProps,
): CSSProperties {
  if (!style) return {};
  return {
    ...getSectionShellStyle(style),
    ...getSectionInnerChromeStyle(style),
  };
}

export function getBorderRadiusValue(
  value?: keyof typeof BORDER_RADIUS_MAP | string,
): string | undefined {
  if (!value) return undefined;
  return BORDER_RADIUS_MAP[value] ?? value;
}

export function formatCssFontStack(
  fontName: string | undefined | null,
  fallback = "system-ui, sans-serif",
): string {
  if (!fontName || fontName === "inherit") return fallback;
  return `"${fontName}", ${fallback}`;
}
