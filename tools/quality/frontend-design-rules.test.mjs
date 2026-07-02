import { describe, expect, it } from "vitest";
import { findFrontendDesignViolations } from "./frontend-design-rules.mjs";

describe("frontend design rules", () => {
  it("rejects colored Tailwind shadows that create glow effects", () => {
    const violations = findFrontendDesignViolations(
      "Example.tsx",
      '<button className="shadow-blue-500/40 hover:shadow-emerald-400">Save</button>',
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("colored shadow / glow found");
    expect(violations[0]).toContain("shadow-blue-500/40");
    expect(violations[0]).toContain("shadow-emerald-400");
  });

  it("allows neutral shadow utilities and token-backed arbitrary shadows", () => {
    const violations = findFrontendDesignViolations(
      "Example.tsx",
      '<section className="shadow-sm shadow-lg hover:shadow-xl shadow-slate-200/40 shadow-black/10 shadow-[var(--shadow-panel)]" />',
    );

    expect(violations).toEqual([]);
  });

  it("rejects arbitrary text sizes in JSX/TSX", () => {
    const violations = findFrontendDesignViolations(
      "Example.tsx",
      '<span className="text-[12px]">Hello</span>',
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("arbitrary Tailwind text size class");
  });

  it("allows standard Tailwind text sizes in JSX/TSX", () => {
    const violations = findFrontendDesignViolations(
      "Example.tsx",
      '<span className="text-xs text-sm text-base text-lg">Hello</span>',
    );
    expect(violations).toHaveLength(0);
  });

  it("allows hardcoded colors in custom CSS files", () => {
    const violations = findFrontendDesignViolations(
      "custom.css",
      ".btn { color: #e11f26; }",
    );
    expect(violations).toHaveLength(0);
  });

  it("allows variables and tokens in custom CSS files", () => {
    const violations = findFrontendDesignViolations(
      "custom.css",
      ".btn { color: var(--color-accent); }",
    );
    expect(violations).toHaveLength(0);
  });

  it("rejects raw font-sizes in custom CSS files", () => {
    const violations = findFrontendDesignViolations(
      "custom.css",
      ".text { font-size: 14px; }",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("hardcoded font-size");
  });

  it("allows token-backed variables in CSS font-sizes", () => {
    const violations = findFrontendDesignViolations(
      "custom.css",
      ".text { font-size: var(--font-size-sm); }",
    );
    expect(violations).toHaveLength(0);
  });

  it("allows clamp functions with theme variables in CSS font-sizes", () => {
    const violations = findFrontendDesignViolations(
      "custom.css",
      ".text { font-size: clamp(var(--font-size-xl), 2vw, var(--font-size-3xl)); }",
    );
    expect(violations).toHaveLength(0);
  });

  it("rejects clamp functions with raw units in CSS font-sizes", () => {
    const violations = findFrontendDesignViolations(
      "custom.css",
      ".text { font-size: clamp(1.55rem, 2vw, 2.25rem); }",
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("hardcoded font-size");
  });

  it("exempts tokens.css and publicSite.css from raw values check", () => {
    const violationsTokens = findFrontendDesignViolations(
      "tokens.css",
      ":root { --color-app: #f4efee; --font-size-xs: 0.625rem; font-size: 10px; }",
    );
    expect(violationsTokens).toHaveLength(0);

    const violationsPublic = findFrontendDesignViolations(
      "publicSite.css",
      ".public-storefront { --color-app: #f4efee; font-size: 15px; }",
    );
    expect(violationsPublic).toHaveLength(0);
  });

  it("validates brand colors inside tokens.css and publicSite.css", () => {
    const violationsTokensVal = findFrontendDesignViolations(
      "tokens.css",
      ":root { --color-app: #f4efee; --color-test: #ff0000; }",
    );
    expect(violationsTokensVal).toHaveLength(1);
    expect(violationsTokensVal[0]).toContain(
      "is outside the approved brand palette",
    );

    const violationsTokensOk = findFrontendDesignViolations(
      "tokens.css",
      ":root { --color-app: #f4efee; --color-brand: #e11f26; }",
    );
    expect(violationsTokensOk).toHaveLength(0);
  });
});
