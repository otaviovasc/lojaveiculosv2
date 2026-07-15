import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findCssViolations } from "./radius-padding-css.mjs";
import { buildRadiusScale } from "./radius-padding-values.mjs";

const root = new URL("../../", import.meta.url).pathname;
const radiusScale = buildRadiusScale(
  readFileSync(join(root, "apps/web/src/styles/tokens.css"), "utf8"),
);

describe("radius/padding CSS rules", () => {
  it("detects a mismatched direct-child surface", () => {
    const source = `
      .tabs {
        border-radius: var(--radius-md);
        padding: 0.375rem;
      }

      .tabs > button {
        border-radius: var(--radius-sm);
      }
    `;

    expect(
      findCssViolations(join(root, "Fixture.css"), source, radiusScale, root),
    ).toEqual([
      "Fixture.css:5: .tabs > button radius 6px inside .tabs; expected inner radius 2px.",
    ]);
  });

  it("accepts a direct-child surface with matching geometry", () => {
    const source = `
      .tabs {
        border-radius: var(--radius-lg);
        padding: 0.375rem;
      }

      .tabs > button {
        border-radius: var(--radius-sm);
      }
    `;

    expect(
      findCssViolations(join(root, "Fixture.css"), source, radiusScale, root),
    ).toEqual([]);
  });

  it("keeps settings tabs inside the direct-child guardrail", () => {
    const source = readFileSync(
      join(root, "apps/web/src/styles/settings.css"),
      "utf8",
    );

    expect(source).toContain(".settings-tabs > button {");
    expect(source).toContain(".settings-tabs > button.is-active {");
    expect(source).not.toMatch(/\.settings-tabs\s+button/);
  });
});
