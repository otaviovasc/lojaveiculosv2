import { describe, expect, it } from "vitest";
import { findFileLineViolations } from "./file-line-rules.mjs";

const reason = "legacy-web-250-migration";

describe("file line rules", () => {
  it("blocks new oversized files and growth above a debt ceiling", () => {
    const failures = findFileLineViolations(
      [
        { lines: 251, path: "apps/web/src/New.tsx" },
        { lines: 301, path: "apps/web/src/Legacy.tsx" },
      ],
      debt({ "apps/web/src/Legacy.tsx": entry(300) }),
    );

    expect(failures).toContain("apps/web/src/New.tsx: 251 > 250.");
    expect(failures).toContain(
      "apps/web/src/Legacy.tsx: 301 exceeds debt ceiling 300.",
    );
  });

  it("allows existing debt only at its exact ceiling", () => {
    expect(
      findFileLineViolations(
        [{ lines: 300, path: "apps/web/src/Legacy.tsx" }],
        debt({ "apps/web/src/Legacy.tsx": entry(300) }),
      ),
    ).toEqual([]);
  });

  it("requires the debt ceiling to shrink with the file", () => {
    expect(
      findFileLineViolations(
        [{ lines: 299, path: "apps/web/src/Legacy.tsx" }],
        debt({ "apps/web/src/Legacy.tsx": entry(300) }),
      ),
    ).toContain(
      "apps/web/src/Legacy.tsx: debt ceiling 300 exceeds current line count 299; lower the ceiling to prevent regrowth.",
    );
  });

  it("rejects stale, missing, and undocumented exceptions", () => {
    const policy = debt({
      "apps/web/src/Reduced.tsx": entry(300),
      "apps/web/src/Removed.tsx": { maxLines: 300, reason: "missing" },
    });
    const failures = findFileLineViolations(
      [{ lines: 240, path: "apps/web/src/Reduced.tsx" }],
      policy,
    );

    expect(failures).toContain(
      "apps/web/src/Reduced.tsx: stale debt exception; file is now 240 lines.",
    );
    expect(failures).toContain(
      "apps/web/src/Removed.tsx: debt exception must reference a documented reason.",
    );
    expect(failures).toContain(
      "apps/web/src/Removed.tsx: stale debt exception for a missing file.",
    );
  });

  it("limits migration debt to frontend files and rejects unused reasons", () => {
    const policy = debt({
      "apps/api/src/Legacy.ts": entry(300),
      "apps/web/src/Legacy.tsx": entry(300),
    });
    policy.reasons.unused = "No exception references this reason.";

    const failures = findFileLineViolations(
      [
        { lines: 300, path: "apps/api/src/Legacy.ts" },
        { lines: 300, path: "apps/web/src/Legacy.tsx" },
      ],
      policy,
    );

    expect(failures).toContain(
      "apps/api/src/Legacy.ts: debt exceptions are limited to apps/web/.",
    );
    expect(failures).toContain("unused: stale unreferenced debt reason.");
  });

  it("reports malformed exceptions instead of throwing", () => {
    const failures = findFileLineViolations(
      [{ lines: 300, path: "apps/web/src/Legacy.tsx" }],
      debt({ "apps/web/src/Legacy.tsx": null }),
    );

    expect(failures).toContain(
      "apps/web/src/Legacy.tsx: debt ceiling must be an integer greater than 250.",
    );
    expect(failures).toContain(
      "apps/web/src/Legacy.tsx: debt exception must reference a documented reason.",
    );
  });
});

function debt(files) {
  return {
    files,
    reasons: {
      [reason]:
        "Pre-existing frontend file over 250 lines; split into cohesive modules.",
    },
  };
}

function entry(maxLines) {
  return { maxLines, reason };
}
