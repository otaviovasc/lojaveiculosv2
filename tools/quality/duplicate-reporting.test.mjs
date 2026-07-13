import { describe, expect, it } from "vitest";
import { reportDuplicateCloneWindows } from "./duplicate-reporting.mjs";

describe("duplicate clone reporting", () => {
  it("ignores a nested function window that overlaps its parent", () => {
    const failures = [];
    reportDuplicateCloneWindows(
      [
        window({ endLine: 40, line: 20, name: "Parent" }),
        window({ endLine: 35, line: 25, name: "nested" }),
      ],
      failures,
    );

    expect(failures).toEqual([]);
  });

  it("reports independent matching windows", () => {
    const failures = [];
    reportDuplicateCloneWindows(
      [
        window({ endLine: 20, line: 10, name: "first" }),
        window({ endLine: 60, line: 50, name: "second" }),
      ],
      failures,
    );

    expect(failures).toHaveLength(1);
  });
});

function window({ endLine, line, name }) {
  return {
    endLine,
    file: "file.ts",
    key: "same clone",
    line,
    name,
    owner: `file.ts:${name}`,
  };
}
