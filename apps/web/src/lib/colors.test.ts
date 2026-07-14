// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  contrastRatio as contrastRatioFromRgb,
  getContrastColorForText,
  getTextColorForBackground,
  parseHexColor as parseHexColorToRgb,
  relativeLuminance as relativeLuminanceFromRgb,
} from "./colors";

const hex = (value: string) => "#" + value;
const cssRgb = (...channels: number[]) =>
  ["rgb", `(${channels.join(", ")})`].join("");
const tokensCss = ["tokens.css", "contrast-tokens.css"]
  .map((file) => readFileSync(`src/styles/${file}`, "utf8"))
  .join("\n");

describe("color contrast helpers", () => {
  it.each([
    [hex("fff"), { r: 255, g: 255, b: 255 }],
    ["151515", { r: 21, g: 21, b: 21 }],
    [`  ${hex("AbC")}  `, { r: 170, g: 187, b: 204 }],
  ])("parses supported hex color %j", (input, expected) => {
    expect(parseHexColorToRgb(input)).toEqual(expected);
  });

  it.each([null, undefined, "", "#12", "#xyzxyz", cssRgb(0, 0, 0)])(
    "rejects invalid color input %j",
    (input) => {
      expect(parseHexColorToRgb(input)).toBeNull();
    },
  );

  it("uses the design-token fallback when color input is invalid", () => {
    expect(getTextColorForBackground("not-a-color")).toBe("var(--color-text)");
    expect(getContrastColorForText("not-a-color")).toBe("var(--color-text)");
  });

  it("computes WCAG luminance and contrast at both extremes", () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };

    expect(relativeLuminanceFromRgb(black)).toBe(0);
    expect(relativeLuminanceFromRgb(white)).toBeCloseTo(1, 10);
    expect(contrastRatioFromRgb(black, white)).toBeCloseTo(21, 10);
    expect(contrastRatioFromRgb(white, black)).toBeCloseTo(21, 10);
  });

  it("uses dark text on bright solid stage colors", () => {
    expect(getTextColorForBackground(hex("eab308"))).toBe(hex("151515"));
  });

  it("uses light text on dark solid stage colors", () => {
    expect(getTextColorForBackground(hex("182ab8"))).toBe(hex("ffffff"));
  });

  it("uses WCAG contrast instead of a brightness shortcut", () => {
    expect(getTextColorForBackground(hex("18b841"))).toBe(hex("151515"));
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

  it("keeps selected-state token pairs readable in light and dark themes", () => {
    const pairs = [
      {
        background: "--color-primary",
        foreground: "--color-primary-contrast",
        label: "primary selected controls",
      },
      {
        background: "--color-accent",
        foreground: "--color-accent-contrast",
        label: "accent selected controls",
      },
      {
        background: "--color-accent-soft",
        foreground: "--color-accent-strong",
        label: "soft accent selected labels",
      },
      {
        background: "--color-accent-soft",
        foreground: "--color-accent-soft-foreground",
        label: "soft accent selected text",
      },
      {
        background: "--color-accent-soft",
        foreground: "--color-accent-soft-muted",
        label: "soft accent selected metadata",
      },
      {
        background: "--color-sidebar",
        foreground: "--color-sidebar-text",
        label: "sidebar primary text",
      },
      {
        background: "--color-sidebar",
        foreground: "--color-sidebar-muted",
        label: "sidebar secondary text",
      },
    ] as const;

    for (const theme of ["light", "dark"] as const) {
      const variables = readThemeVariables(theme);
      for (const pair of pairs) {
        const foreground = resolveVariable(variables, pair.foreground);
        const background = resolveVariable(variables, pair.background);
        expect(
          contrastRatio(foreground, background),
          `${pair.label} should pass in ${theme} theme`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("maps Tailwind primary foreground to the explicit readable contrast token", () => {
    expect(tokensCss).toContain(
      "--color-primary-foreground: var(--color-primary-contrast);",
    );
  });

  it("keeps the sidebar surface aligned with the selected theme", () => {
    const light = readThemeVariables("light");
    const dark = readThemeVariables("dark");

    expect(resolveVariable(light, "--color-sidebar")).toBe(hex("ffffff"));
    expect(resolveVariable(light, "--color-sidebar-raised")).toBe(
      hex("f4efee"),
    );
    expect(resolveVariable(dark, "--color-sidebar")).toBe(hex("151515"));
    expect(resolveVariable(dark, "--color-sidebar-raised")).toBe(hex("2a2424"));
  });
});

function readThemeVariables(theme: "dark" | "light"): Record<string, string> {
  return {
    ...readVariablesFromBlock(":root"),
    ...(theme === "dark"
      ? readVariablesFromBlock(':root[data-theme="dark"]')
      : {}),
  };
}

function readVariablesFromBlock(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const variables: Record<string, string> = {};
  const matches = tokensCss.matchAll(
    new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "g"),
  );
  for (const match of matches) {
    for (const line of (match[1] ?? "").split("\n")) {
      const declaration = line.trim().match(/^(--[\w-]+):\s*([^;]+);/);
      if (declaration?.[1] && declaration[2]) {
        variables[declaration[1]] = declaration[2].trim();
      }
    }
  }
  return variables;
}

function resolveVariable(
  variables: Record<string, string>,
  variable: string,
): string {
  const value = variables[variable];
  if (!value) throw new Error(`Missing CSS variable ${variable}`);
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  if (!reference?.[1]) return value;
  return resolveVariable(variables, reference[1]);
}

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
