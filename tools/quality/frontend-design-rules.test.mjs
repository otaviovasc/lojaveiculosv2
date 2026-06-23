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
});
