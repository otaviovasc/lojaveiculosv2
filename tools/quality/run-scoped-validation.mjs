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
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  createValidationFingerprint,
  hasFreshValidationStep,
  recordValidationStep,
} from "./validation-cache.mjs";

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
const FRONTEND_WEB_BUNDLE_PREFIXES = ["tools/quality/web-bundle"];
const FRONTEND_WEB_BUNDLE_FILES = new Set([
  "tools/quality/web-bundle-policy.json",
  "tools/quality/web-bundle-artifact-rules.mjs",
  "tools/quality/web-bundle-artifact-rules.test.mjs",
  "tools/quality/web-bundle-config-rules.mjs",
  "tools/quality/web-bundle-config-rules.test.mjs",
  "tools/quality/check-web-bundle.mjs",
  "tools/quality/verify-web-bundle-artifacts.mjs",
  "tools/quality/run-scoped-validation.mjs",
]);

const files = forceFull ? null : changedFiles(tier);
const scoped =
  files !== null &&
  files.length > 0 &&
  files.every(
    (file) =>
      FRONTEND_ONLY_PREFIXES.some((prefix) => file.startsWith(prefix)) ||
      FRONTEND_WEB_BUNDLE_PREFIXES.some((prefix) => file.startsWith(prefix)) ||
      FRONTEND_WEB_BUNDLE_FILES.has(file),
  );

if (scoped) {
  console.log(
    `run-scoped-validation: frontend-only diff (${files.length} file(s)); running web-scoped ${tier} tier.`,
  );
} else {
  console.log(`run-scoped-validation: running full ${tier} tier.`);
}

const validationFingerprint = createValidationFingerprint({
  scope: scoped ? "web" : "full",
});

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
        "test:quality-tools",
        "test:seed-document-pdf",
      ]
    : [
        "validate:core-guardrails",
        "typecheck",
        "lint",
        "test:quality-tools",
        "test:seed-document-pdf",
      ],
  release: scoped
    ? [
        "validate:core-guardrails",
        "typecheck:web",
        "lint:web",
        "test:quality-tools",
        "test:seed-document-pdf",
        "build:web",
      ]
    : [
        "validate:core-guardrails",
        "typecheck",
        "lint",
        "test:quality-tools",
        "test:seed-document-pdf",
        "build:deployables",
      ],
}[tier];

for (const step of steps) {
  if (hasFreshValidationStep(validationFingerprint, step)) {
    console.log(`\n↷ pnpm run ${step} (unchanged snapshot; cached pass)`);
    continue;
  }
  console.log(`\n▶ pnpm run ${step}`);
  const result = spawnSync("pnpm", ["run", step], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  recordValidationStep(validationFingerprint, step);
}

runRelatedWorkspaceTests({ files, forceFull, tier, validationFingerprint });

function runRelatedWorkspaceTests({
  files: changedPaths,
  forceFull: isForceFull,
  tier: currentTier,
  validationFingerprint: fingerprint,
}) {
  if (isForceFull || !changedPaths) {
    console.log(`\n▶ pnpm -r test (full test suite triggered)`);
    const result = spawnSync("pnpm", ["-r", "test"], { stdio: "inherit" });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
    return;
  }

  const workspaces = discoverWorkspaces();
  let ranAny = false;

  for (const ws of workspaces) {
    const wsFiles = changedPaths
      .filter((f) => f.startsWith(`${ws.dir}/`))
      .map((f) => relative(ws.dir, f));

    if (wsFiles.length === 0) continue;

    const stepName = `test:related:${ws.name}`;
    if (hasFreshValidationStep(fingerprint, stepName)) {
      console.log(`\n↷ ${stepName} (unchanged snapshot; cached pass)`);
      ranAny = true;
      continue;
    }

    console.log(
      `\n▶ Running related tests for ${ws.name} (${wsFiles.length} changed file(s))`,
    );
    ranAny = true;
    const result = spawnSync(
      "pnpm",
      ["--filter", ws.name, "exec", "vitest", "related", "--run", ...wsFiles],
      { stdio: "inherit" },
    );
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
    recordValidationStep(fingerprint, stepName);
  }

  if (!ranAny) {
    console.log(
      `\n↷ No workspace code changes detected; skipping related tests.`,
    );
  }
}

function discoverWorkspaces() {
  const workspaces = [];
  for (const group of ["apps", "packages"]) {
    if (!existsSync(group)) continue;
    for (const entry of readdirSync(group)) {
      const dir = join(group, entry);
      const pkgJsonPath = join(dir, "package.json");
      if (existsSync(pkgJsonPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
          if (pkg.name) {
            workspaces.push({ dir, name: pkg.name });
          }
        } catch {}
      }
    }
  }
  return workspaces;
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
