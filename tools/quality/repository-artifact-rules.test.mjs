import { expect, test } from "vitest";
import { findTrackedDependencyArtifacts } from "./repository-artifact-rules.mjs";

test("rejects tracked node_modules directories and symlinks at any depth", () => {
  expect(
    findTrackedDependencyArtifacts([
      "node_modules",
      "apps/api/node_modules/provider-package",
      "apps/api/src/index.ts",
    ]),
  ).toEqual(["node_modules", "apps/api/node_modules/provider-package"]);
});

test("does not reject similarly named source paths", () => {
  expect(
    findTrackedDependencyArtifacts([
      "docs/node_modules-policy.md",
      "tools/node_modules-check.mjs",
    ]),
  ).toEqual([]);
});
