// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { getContrastColorForText, getTextColorForBackground } from "./colors";

const hex = (value: string) => "#" + value;

describe("color contrast helpers", () => {
  it("uses dark text on bright solid stage colors", () => {
    expect(getTextColorForBackground(hex("eab308"))).toBe(hex("151515"));
  });

  it("uses light text on dark solid stage colors", () => {
    expect(getTextColorForBackground(hex("182ab8"))).toBe(hex("ffffff"));
  });

  it("darkens light-mode status text until it reaches readable contrast", () => {
    document.documentElement.dataset.theme = "light";

    const yellowText = getContrastColorForText(hex("eab308"));
    const orangeText = getContrastColorForText(hex("f97316"));

    expect(contrastRatio(yellowText, hex("ffffff"))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(orangeText, hex("ffffff"))).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("keeps readable dark-mode status text light enough for dark surfaces", () => {
    document.documentElement.dataset.theme = "dark";

    const blueText = getContrastColorForText(hex("182ab8"));

    expect(contrastRatio(blueText, hex("151515"))).toBeGreaterThanOrEqual(4.5);
  });
});

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(parseHexColor(foreground));
  const backgroundLuminance = relativeLuminance(parseHexColor(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function parseHexColor(hexColor: string): [number, number, number] {
  const clean = hexColor.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}
