import { describe, expect, it } from "vitest";
import { resolveTokenVars } from "./resolveTokens";
import type { StorefrontTokens } from "./types";

const hex = (value: string) => `#${value}`;

function createTokens(
  overrides: {
    color?: Partial<StorefrontTokens["color"]>;
    motion?: StorefrontTokens["motion"]["style"];
    shape?: Partial<StorefrontTokens["shape"]>;
    type?: Partial<StorefrontTokens["type"]>;
  } = {},
): StorefrontTokens {
  return {
    brand: {
      displayLine: null,
      displayName: null,
      faviconUrl: null,
      logoUrl: null,
      photoUrl: null,
    },
    color: {
      accent: hex("C9A84C"),
      accentStrong: hex("1A1A1A"),
      chrome: "dark",
      ink: hex("151515"),
      inkMuted: hex("4a4444"),
      surface: hex("F8F5F0"),
      surfaceRaised: hex("fff4ee"),
      ...overrides.color,
    },
    motion: { style: overrides.motion ?? "subtle" },
    shape: {
      density: overrides.shape?.density ?? "default",
      radius: overrides.shape?.radius ?? "rounded",
    },
    type: {
      bodyFont: "Inter",
      headingFont: "Bricolage Grotesque",
      scale: "standard",
      ...overrides.type,
    },
  };
}

describe("resolveTokenVars", () => {
  it("maps color tokens to --sf-* custom properties", () => {
    const vars = resolveTokenVars(createTokens());

    expect(vars["--sf-accent"]).toBe(hex("C9A84C"));
    expect(vars["--sf-accent-soft"]).toBe(
      `color-mix(in oklab, ${hex("C9A84C")} 12%, transparent)`,
    );
    expect(vars["--sf-accent-strong"]).toBe(hex("1A1A1A"));
    expect(vars["--sf-surface"]).toBe(hex("F8F5F0"));
    expect(vars["--sf-surface-raised"]).toBe(hex("fff4ee"));
    expect(vars["--sf-ink"]).toBe(hex("151515"));
    expect(vars["--sf-ink-muted"]).toBe(hex("4a4444"));
    expect(vars["--sf-inverse"]).toBe("var(--public-accent-foreground-dark)");
  });

  it("derives the dark chrome from fixed brand dark values", () => {
    const vars = resolveTokenVars(createTokens({ color: { chrome: "dark" } }));

    expect(vars["--sf-chrome-bg"]).toBe(hex("151515"));
    expect(vars["--sf-chrome-ink"]).toBe(hex("f4efee"));
    expect(vars["--sf-chrome-ink-muted"]).toBe(
      `color-mix(in oklab, ${hex("f4efee")} 74%, transparent)`,
    );
  });

  it("derives the light chrome from the surface and ink tokens", () => {
    const vars = resolveTokenVars(createTokens({ color: { chrome: "light" } }));

    expect(vars["--sf-chrome-bg"]).toBe(hex("fff4ee"));
    expect(vars["--sf-chrome-ink"]).toBe(hex("151515"));
  });

  it("derives the brand chrome from the strong accent with readable ink", () => {
    const vars = resolveTokenVars(
      createTokens({ color: { accentStrong: hex("1A1A1A"), chrome: "brand" } }),
    );

    expect(vars["--sf-chrome-bg"]).toBe(hex("1A1A1A"));
    expect(vars["--sf-chrome-ink"]).toBe(
      "var(--public-accent-foreground-light)",
    );
  });

  it("resolves font stacks for heading and body", () => {
    const vars = resolveTokenVars(createTokens());

    expect(vars["--sf-heading-font"]).toContain('"Bricolage Grotesque"');
    expect(vars["--sf-body-font"]).toContain('"Inter"');
  });

  it("maps shape tokens to radius, section padding, and card gap", () => {
    const airy = resolveTokenVars(
      createTokens({ shape: { density: "airy", radius: "pill" } }),
    );
    expect(airy["--sf-radius"]).toBe("1.5rem");
    expect(airy["--sf-section-pad"]).toBe("6rem");
    expect(airy["--sf-card-gap"]).toBe("2rem");

    const dense = resolveTokenVars(
      createTokens({ shape: { density: "dense", radius: "sharp" } }),
    );
    expect(dense["--sf-radius"]).toBe("0.25rem");
    expect(dense["--sf-section-pad"]).toBe("2.5rem");
    expect(dense["--sf-card-gap"]).toBe("1rem");
  });

  it("maps the type scale to the hero headline size", () => {
    const compact = resolveTokenVars(
      createTokens({ type: { scale: "compact" } }),
    );
    const display = resolveTokenVars(
      createTokens({ type: { scale: "display" } }),
    );

    expect(compact["--sf-headline-size"]).toContain("clamp");
    expect(display["--sf-headline-size"]).toContain("clamp");
    expect(display["--sf-headline-size"]).not.toBe(
      compact["--sf-headline-size"],
    );
  });

  it("maps motion styles to micro/section/hero profiles", () => {
    const subtle = resolveTokenVars(createTokens({ motion: "subtle" }));
    expect(subtle["--sf-motion-micro"]).toBe("120ms");
    expect(subtle["--sf-motion-section"]).toBe("180ms");
    expect(subtle["--sf-motion-hero"]).toBe("0ms");

    const dynamic = resolveTokenVars(createTokens({ motion: "dynamic" }));
    expect(dynamic["--sf-motion-micro"]).toBe("120ms");
    expect(dynamic["--sf-motion-section"]).toBe("240ms");
    expect(dynamic["--sf-motion-hero"]).toBe("600ms");

    const none = resolveTokenVars(createTokens({ motion: "none" }));
    expect(none["--sf-motion-micro"]).toBe("0ms");
    expect(none["--sf-motion-section"]).toBe("0ms");
    expect(none["--sf-motion-hero"]).toBe("0ms");
  });
});
