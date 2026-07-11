export type Rgb = {
  r: number;
  g: number;
  b: number;
};

const HEX_PREFIX = "#";
const DARK_READABLE_TEXT = HEX_PREFIX + "151515";
const LIGHT_READABLE_TEXT = HEX_PREFIX + "ffffff";
const LIGHT_SURFACE: Rgb = { r: 255, g: 255, b: 255 };
const DARK_SURFACE: Rgb = { r: 21, g: 21, b: 21 };
const MINIMUM_TEXT_CONTRAST = 4.5;

export function getTextColorForBackground(hexColor: string): string {
  const rgb = parseHexColor(hexColor);
  if (!rgb) return "var(--color-text)";

  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 128 ? DARK_READABLE_TEXT : LIGHT_READABLE_TEXT;
}

export function getContrastColorForText(hexColor: string): string {
  const rgb = parseHexColor(hexColor);
  if (!rgb) return "var(--color-text)";

  const background = isDarkThemeActive() ? DARK_SURFACE : LIGHT_SURFACE;
  const mixTarget = isDarkThemeActive() ? LIGHT_SURFACE : DARK_SURFACE;

  return rgbToHex(shiftUntilContrastPasses(rgb, background, mixTarget));
}

function isDarkThemeActive(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.dataset.theme === "dark"
  );
}

export function parseHexColor(hexColor: string | null | undefined): Rgb | null {
  if (!hexColor) return null;
  const trimmed = hexColor.trim();
  if (!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(trimmed)) return null;

  const clean = trimmed.replace(HEX_PREFIX, "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : clean;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function shiftUntilContrastPasses(
  rgb: Rgb,
  background: Rgb,
  mixTarget: Rgb,
): Rgb {
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mixColor(rgb, mixTarget, step / 20);
    if (contrastRatio(candidate, background) >= MINIMUM_TEXT_CONTRAST) {
      return candidate;
    }
  }

  return mixTarget;
}

function mixColor(rgb: Rgb, target: Rgb, weight: number): Rgb {
  return {
    r: Math.round(rgb.r + (target.r - rgb.r) * weight),
    g: Math.round(rgb.g + (target.g - rgb.g) * weight),
    b: Math.round(rgb.b + (target.b - rgb.b) * weight),
  };
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );

  return (lighter + 0.05) / (darker + 0.05);
}

export function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function rgbToHex(rgb: Rgb): string {
  return (
    HEX_PREFIX + toHexChannel(rgb.r) + toHexChannel(rgb.g) + toHexChannel(rgb.b)
  );
}

function toHexChannel(channel: number): string {
  return channel.toString(16).padStart(2, "0");
}
