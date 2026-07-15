import { describe, expect, it } from "vitest";
import { findClassContrastViolations } from "./contrast-classes.mjs";
import { findCssStateContrastViolations } from "./contrast-css-states.mjs";
import {
  buildContrastThemes,
  findSemanticContrastViolations,
} from "./contrast-tokens.mjs";
import { safeTokens } from "./contrast-test-fixtures.mjs";

describe("contrast guard", () => {
  it("accepts semantic foreground pairs in light and dark themes", () => {
    const themes = buildContrastThemes(safeTokens);
    expect(findSemanticContrastViolations(themes)).toEqual([]);
  });

  it("rejects a low-contrast semantic token pair", () => {
    const themes = buildContrastThemes(
      safeTokens.replace(
        "--color-success-contrast: #151515",
        "--color-success-contrast: #ffffff",
      ),
    );
    expect(findSemanticContrastViolations(themes)).toEqual(
      expect.arrayContaining([expect.stringContaining("--color-success")]),
    );
  });

  it("checks contextual module accent foreground pairs", () => {
    const themes = buildContrastThemes(
      safeTokens,
      "",
      `[data-active-module="inventory"] {
        --color-accent: #10b981;
        --color-accent-contrast: #ffffff;
      }`,
    );

    expect(findSemanticContrastViolations(themes)).toEqual([
      expect.stringContaining("light:inventory"),
      expect.stringContaining("dark:inventory"),
    ]);
  });

  it("checks inherited text against hover and selected Tailwind backgrounds", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findClassContrastViolations(
      "Control.tsx",
      '<button className="bg-primary text-primary-foreground hover:bg-accent-strong data-[selected=true]:bg-accent-strong">Open</button>',
      themes,
    );
    expect(failures).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "hover:bg-accent-strong + text-primary-foreground",
        ),
        expect.stringContaining(
          "data-[selected=true]:bg-accent-strong + text-primary-foreground",
        ),
      ]),
    );
  });

  it("accepts paired foreground utilities for interaction states", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findClassContrastViolations(
      "Control.tsx",
      '<button className="bg-primary text-primary-foreground hover:bg-accent-strong hover:text-accent-strong-foreground data-[selected=true]:bg-accent-strong data-[selected=true]:text-accent-strong-foreground">Open</button>',
      themes,
    );
    expect(failures).toEqual([]);
  });

  it("requires dynamic accent foreground tokens even when defaults pass", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findClassContrastViolations(
      "Control.tsx",
      '<button className="bg-accent text-inverse hover:bg-accent-strong">Open</button>',
      themes,
    );
    expect(failures).toEqual([
      expect.stringContaining("tenant accent colors are dynamic"),
      expect.stringContaining("text-accent-strong-foreground"),
    ]);
  });

  it("does not confuse text sizing utilities with foreground colors", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findClassContrastViolations(
      "Control.tsx",
      '<button className="bg-accent text-accent-foreground text-xs hover:bg-accent-strong hover:text-accent-strong-foreground">Open</button>',
      themes,
    );
    expect(failures).toEqual([]);
  });

  it("checks CSS hover states using the base selector foreground", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findCssStateContrastViolations(
      "control.css",
      ".control { color: var(--color-accent); } .control:hover { background: var(--color-accent); }",
      themes,
    );
    expect(failures).toEqual([expect.stringContaining(".control:hover")]);
  });

  it("accepts explicit CSS state foreground pairs", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findCssStateContrastViolations(
      "control.css",
      '.control[aria-selected="true"] { background: var(--color-accent); color: var(--color-accent-foreground); }',
      themes,
    );
    expect(failures).toEqual([]);
  });

  it("requires dynamic accent foreground tokens in CSS states", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findCssStateContrastViolations(
      "control.css",
      ".control.is-selected { background: var(--color-accent); color: var(--color-inverse); }",
      themes,
    );
    expect(failures).toEqual([
      expect.stringContaining("tenant accent colors are dynamic"),
    ]);
  });

  it("requires dynamic accent foreground tokens in base CSS", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findCssStateContrastViolations(
      "control.css",
      ".control { background: var(--color-accent); color: var(--color-inverse); }",
      themes,
    );
    expect(failures).toEqual([
      expect.stringContaining("tenant accent colors are dynamic"),
    ]);
  });

  it("checks descendant text overrides inside a selected CSS surface", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findCssStateContrastViolations(
      "folders.css",
      ".folder--active { background: var(--color-accent-soft); color: var(--color-accent-soft-foreground); } .folder-label strong { color: var(--color-text); }",
      themes,
    );
    expect(failures).toEqual([
      expect.stringContaining(".folder-label strong inside .folder--active"),
    ]);
  });

  it("accepts selected CSS surfaces with explicit descendant foregrounds", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findCssStateContrastViolations(
      "folders.css",
      ".folder--active { background: var(--color-accent-soft); color: var(--color-accent-soft-foreground); } .folder-label strong { color: var(--color-text); } .folder--active .folder-label strong { color: var(--color-accent-soft-foreground); }",
      themes,
    );
    expect(failures).toEqual([]);
  });

  it("checks the intersection of selected and hover CSS states", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findCssStateContrastViolations(
      "folders.css",
      ".folder { color: var(--color-text); } .folder:hover { background: var(--color-app-elevated); } .folder--active { background: var(--color-accent-soft); color: var(--color-accent-soft-foreground); }",
      themes,
    );
    expect(failures).toEqual([
      expect.stringContaining(".folder--active combined with .folder:hover"),
    ]);
  });

  it("accepts an explicit readable selected-hover CSS state", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findCssStateContrastViolations(
      "folders.css",
      ".folder { color: var(--color-text); } .folder:hover { background: var(--color-app-elevated); } .folder--active { background: var(--color-accent-soft); color: var(--color-accent-soft-foreground); } .folder--active:hover { background: var(--color-accent-soft); color: var(--color-accent-soft-foreground); }",
      themes,
    );
    expect(failures).toEqual([]);
  });

  it("respects important selected foregrounds in combined CSS states", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findCssStateContrastViolations(
      "filters.css",
      ".filter:hover { color: var(--color-primary); } .filter--active { background: var(--color-accent-soft); color: var(--color-accent-strong) !important; }",
      themes,
    );
    expect(failures).toEqual([]);
  });

  it("composites translucent state backgrounds over the base surface", () => {
    const themes = buildContrastThemes(safeTokens);
    const failures = findClassContrastViolations(
      "Control.tsx",
      '<button className="bg-panel text-accent hover:bg-accent/10">Open</button>',
      themes,
    );
    expect(failures).toEqual([expect.stringContaining("hover:bg-accent/10")]);
  });
});
