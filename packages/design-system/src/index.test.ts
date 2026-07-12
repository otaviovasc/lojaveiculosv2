import { describe, expect, it } from "vitest";
import {
  colorTokens,
  colors,
  designTokens,
  fontTokens,
  fonts,
  layoutTokens,
  radiusTokens,
  shadowTokens,
} from "./index.js";

describe("design token contract", () => {
  it.each([
    ["colors", colorTokens],
    ["fonts", fontTokens],
    ["layout", layoutTokens],
    ["radii", radiusTokens],
    ["shadows", shadowTokens],
  ])("maps every %s token to a CSS custom property", (_name, tokens) => {
    for (const value of Object.values(tokens)) {
      expect(value).toMatch(/^var\(--[a-z0-9-]+\)$/);
    }
  });

  it("keeps compatibility exports wired to the canonical token objects", () => {
    expect(colors).toBe(colorTokens);
    expect(fonts).toBe(fontTokens);
    expect(designTokens).toEqual({
      colors: colorTokens,
      fonts: fontTokens,
      layout: layoutTokens,
      radii: radiusTokens,
      shadows: shadowTokens,
    });
  });
});
