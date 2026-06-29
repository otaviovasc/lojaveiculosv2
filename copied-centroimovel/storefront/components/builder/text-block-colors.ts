import type { ComponentStyleProps } from "@centroimovel/types";

function parseRgbFromHex(hex: string): [number, number, number] | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const n = parseInt(normalized, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance for sRGB hex. */
export function relativeLuminance(hex: string): number {
  const rgb = parseRgbFromHex(hex);
  if (!rgb) return 0.5;
  const r = channelToLinear(rgb[0]);
  const g = channelToLinear(rgb[1]);
  const b = channelToLinear(rgb[2]);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function solidBackgroundHexFromStyle(
  style?: ComponentStyleProps,
): string | undefined {
  if (!style) return undefined;
  if (style.background?.type === "solid" && style.background.solidColor) {
    return style.background.solidColor;
  }
  if (style.backgroundColor) return style.backgroundColor;
  return undefined;
}

/**
 * When the author did not set `textColor`, pick readable body text against the
 * block's own solid background (if any). If the section is transparent, use a
 * dark default suitable for typical light storefront pages.
 */
export function defaultTextColorForTextBlock(
  style?: ComponentStyleProps,
): string {
  const bg = solidBackgroundHexFromStyle(style);
  if (!bg) return "#111827";
  const L = relativeLuminance(bg);
  return L > 0.45 ? "#111827" : "#F9FAFB";
}
