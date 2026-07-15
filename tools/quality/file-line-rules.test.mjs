import { describe, expect, it } from "vitest";
import {
  defaultMaxLines,
  findFileLineViolations,
  frontendAdditionalLines,
  frontendMaxLines,
} from "./file-line-rules.mjs";

const reason = "legacy-web-550-migration";

describe("file line rules", () => {
  it("adds 300 lines for frontend files while keeping the repo default at 250", () => {
    const failures = findFileLineViolations(
      [
        { lines: 550, path: "apps/web/src/Allowed.tsx" },
        { lines: 551, path: "apps/web/src/Oversized.tsx" },
        { lines: 250, path: "apps/api/src/Allowed.ts" },
        { lines: 251, path: "apps/api/src/Oversized.ts" },
      ],
      debt({}),
    );

    expect(defaultMaxLines).toBe(250);
    expect(frontendAdditionalLines).toBe(300);
    expect(frontendMaxLines).toBe(550);
    expect(failures).toEqual([
      "apps/web/src/Oversized.tsx: 551 > 550.",
      "apps/api/src/Oversized.ts: 251 > 250.",
    ]);
  });

  it("allows existing debt only at its exact ceiling", () => {
    expect(
      findFileLineViolations(
        [{ lines: 600, path: "apps/web/src/Legacy.tsx" }],
        debt({ "apps/web/src/Legacy.tsx": entry(600) }),
      ),
    ).toEqual([]);
  });

  it("requires the debt ceiling to shrink with the file", () => {
    expect(
      findFileLineViolations(
        [{ lines: 599, path: "apps/web/src/Legacy.tsx" }],
        debt({ "apps/web/src/Legacy.tsx": entry(600) }),
      ),
    ).toContain(
      "apps/web/src/Legacy.tsx: debt ceiling 600 exceeds current line count 599; lower the ceiling to prevent regrowth.",
    );
  });

  it("rejects stale, missing, and undocumented exceptions", () => {
    const policy = debt({
      "apps/web/src/Reduced.tsx": entry(600),
      "apps/web/src/Removed.tsx": { maxLines: 600, reason: "missing" },
    });
    const failures = findFileLineViolations(
      [{ lines: 540, path: "apps/web/src/Reduced.tsx" }],
      policy,
    );

    expect(failures).toContain(
      "apps/web/src/Reduced.tsx: stale debt exception; file is now 540 lines.",
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
      "apps/web/src/Legacy.tsx": entry(600),
    });
    policy.reasons.unused = "No exception references this reason.";

    const failures = findFileLineViolations(
      [
        { lines: 300, path: "apps/api/src/Legacy.ts" },
        { lines: 600, path: "apps/web/src/Legacy.tsx" },
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
      [{ lines: 600, path: "apps/web/src/Legacy.tsx" }],
      debt({ "apps/web/src/Legacy.tsx": null }),
    );

    expect(failures).toContain(
      "apps/web/src/Legacy.tsx: debt ceiling must be an integer greater than 550.",
    );
    expect(failures).toContain(
      "apps/web/src/Legacy.tsx: debt exception must reference a documented reason.",
    );
  });
});

function debt(files) {
  return {
    files,
    reasons:
      Object.keys(files).length === 0
        ? {}
        : {
            [reason]:
              "Pre-existing frontend file over 550 lines; split into cohesive modules.",
          },
  };
}

function entry(maxLines) {
  return { maxLines, reason };
}
