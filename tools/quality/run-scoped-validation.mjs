#!/usr/bin/env node
// Scoped validation runner.
//
// Runs the full validation tier by default. When every changed file is
// frontend-only (apps/web/** or packages/design-system/**), the expensive
// backend-wide steps (recursive typecheck/lint/test, coverage, API build)
// are replaced by their @lojaveiculosv2/web equivalents, since backend code
// cannot be affected by the diff.
//
// Usage: node tools/quality/run-scoped-validation.mjs <commit|push|release> [--full]
// Force the full tier with --full or VALIDATION_SCOPE=full.

import { execFileSync, spawnSync } from "node:child_process";

const tier = process.argv[2];
if (!["commit", "push", "release"].includes(tier)) {
  console.error(
    "run-scoped-validation: expected tier argument commit|push|release",
  );
  process.exit(2);
}

const forceFull =
  process.argv.includes("--full") || process.env.VALIDATION_SCOPE === "full";

const FRONTEND_ONLY_PREFIXES = ["apps/web/", "packages/design-system/"];

const files = forceFull ? null : changedFiles(tier);
const scoped =
  files !== null &&
  files.length > 0 &&
  files.every((file) =>
    FRONTEND_ONLY_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );

if (scoped) {
  console.log(
    `run-scoped-validation: frontend-only diff (${files.length} file(s)); running web-scoped ${tier} tier.`,
  );
} else {
  console.log(`run-scoped-validation: running full ${tier} tier.`);
}

const steps = {
  commit: scoped
    ? ["validate:core-guardrails"]
    : [
        "validate:core-guardrails",
        "test:quality-tools",
        "test:seed-document-pdf",
      ],
  push: scoped
    ? [
        "validate:core-guardrails",
        "typecheck:web",
        "lint:web",
        "test:web",
        "test:quality-tools",
        "test:seed-document-pdf",
      ]
    : [
        "validate:core-guardrails",
        "typecheck",
        "lint",
        "test",
        "test:quality-tools",
        "test:seed-document-pdf",
      ],
  release: scoped
    ? [
        "validate:core-guardrails",
        "typecheck:web",
        "lint:web",
        "test:web",
        "test:quality-tools",
        "test:seed-document-pdf",
        "test:coverage:web",
        "build:web",
      ]
    : [
        "validate:core-guardrails",
        "typecheck",
        "lint",
        "test",
        "test:quality-tools",
        "test:seed-document-pdf",
        "test:coverage",
        "build:deployables",
      ],
}[tier];

for (const step of steps) {
  console.log(`\n▶ pnpm run ${step}`);
  const result = spawnSync("pnpm", ["run", step], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function changedFiles(currentTier) {
  try {
    if (currentTier === "commit") {
      return splitLines(git(["diff", "--cached", "--name-only"]));
    }
    for (const base of ["origin/staging", "origin/main"]) {
      const mergeBase = tryGit(["merge-base", base, "HEAD"]);
      if (mergeBase) {
        return splitLines(git(["diff", "--name-only", `${mergeBase}..HEAD`]));
      }
    }
    return null;
  } catch {
    return null;
  }
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function splitLines(output) {
  return output ? output.split("\n").filter(Boolean) : [];
}
