import { describe, expect, it } from "vitest";
import { findFeatureOverlayViolations } from "./feature-overlay-rules.mjs";

describe("feature overlay rules", () => {
  it("allows shared dialog compositions", () => {
    expect(
      findFeatureOverlayViolations(
        "Feature.tsx",
        '<FeatureDialog isOpen title="Edit">Body</FeatureDialog>',
      ),
    ).toEqual([]);
  });

  it("rejects raw dialog roles and native dialog elements", () => {
    const source = `
      <>
        <div role="dialog" aria-modal="true" />
        <dialog open>Body</dialog>
      </>
    `;

    expect(findFeatureOverlayViolations("Feature.tsx", source)).toEqual([
      { kind: "raw dialog element", line: 3 },
      { kind: "raw dialog element", line: 4 },
    ]);
  });

  it("rejects raw fixed full-screen overlays without matching comments", () => {
    const source = `
      // <div className="fixed inset-0" />
      <div className={cx("fixed", active && "inset-0", "z-50")} />
    `;

    expect(findFeatureOverlayViolations("Feature.tsx", source)).toEqual([
      { kind: "raw fixed overlay", line: 3 },
    ]);
  });

  it("rejects responsive and split-inset fullscreen overlays", () => {
    const source = `
      <>
        <div className="md:fixed inset-x-0 inset-y-0 md:z-50" />
        <div className={cx("fixed", "top-0 right-0 bottom-0 left-0", "z-[200]")} />
        <div className={("fixed left-0 top-0 h-screen w-screen z-40" as string)} />
      </>
    `;

    expect(findFeatureOverlayViolations("Feature.tsx", source)).toEqual([
      { kind: "raw fixed overlay", line: 3 },
      { kind: "raw fixed overlay", line: 4 },
      { kind: "raw fixed overlay", line: 5 },
    ]);
  });
});
