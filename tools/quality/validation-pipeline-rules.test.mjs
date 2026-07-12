import { describe, expect, it } from "vitest";
import { requiredCiActions } from "./ci-workflow-rules.mjs";
import { findValidationPipelineViolations } from "./validation-pipeline-rules.mjs";

describe("validation pipeline rules", () => {
  it("accepts the canonical hooks, CI, scripts, and checker wiring", () => {
    expect(findValidationPipelineViolations(validPipeline())).toEqual([]);
  });

  it("rejects an unwired or missing quality checker", () => {
    const input = validPipeline();
    input.scripts["validate:core-guardrails"] = "pnpm run check:other";
    input.qualityCheckFiles.push("tools/quality/check-orphan.mjs");

    const failures = findValidationPipelineViolations(input);
    expect(failures).toEqual(
      expect.arrayContaining([
        "check:sample is not included in validate:core-guardrails",
        "tools/quality/check-orphan.mjs is not exposed by a package.json check:* script",
      ]),
    );
  });

  it("rejects weakened recursive, coverage, and deployable build commands", () => {
    const input = validPipeline();
    input.scripts.typecheck = "pnpm -r --if-present typecheck";
    input.scripts["check:format"] = "prettier --write .";
    input.scripts["test:coverage"] = "pnpm -r --if-present test:coverage";
    input.scripts["test:dashboard-animation"] =
      "pnpm --filter @lojaveiculosv2/web test -- dashboardHomeAnimation";
    input.scripts["test:smoke:api"] =
      "pnpm --filter @lojaveiculosv2/api test -- productionSmoke";
    input.scripts["build:deployables"] = "echo skipped";
    input.scripts["verify:web-bundle"] = "echo stale-dist";

    const failures = findValidationPipelineViolations(input);
    expect(failures).toEqual(
      expect.arrayContaining([
        'typecheck must be "pnpm -r typecheck"',
        'check:format must be "prettier --check ."',
        "test:coverage must not silently skip coverage",
        'test:dashboard-animation must be "pnpm --filter @lojaveiculosv2/web exec vitest run src/features/analytics/dashboardHomeAnimation.test.ts"',
        'test:smoke:api must be "pnpm --filter @lojaveiculosv2/api exec vitest run src/infrastructure/http/productionSmoke.test.ts"',
        'build:deployables must be "pnpm --filter @lojaveiculosv2/web build && pnpm run verify:web-bundle && pnpm --filter @lojaveiculosv2/api build"',
        'verify:web-bundle must be "node tools/quality/verify-web-bundle-artifacts.mjs"',
      ]),
    );
  });

  it("rejects hook drift and CI stage reordering", () => {
    const input = validPipeline();
    input.fileSources[".husky/pre-commit"] = "pnpm run validate:push\n";
    input.fileSources[".github/workflows/ci.yml"] =
      workflowActions() + "\npnpm run test:smoke:api\npnpm run validate:ci\n";

    const failures = findValidationPipelineViolations(input);
    expect(failures).toEqual(
      expect.arrayContaining([
        ".husky/pre-commit must include pnpm exec lint-staged",
        ".husky/pre-commit must include pnpm run validate:commit",
        ".husky/pre-commit must not include pnpm run validate:push",
        ".github/workflows/ci.yml must place pnpm run test:smoke:api after pnpm run validate:ci",
      ]),
    );
  });
});

function validPipeline() {
  return {
    fileSources: {
      ".github/workflows/ci.yml": `${workflowActions()}\npnpm run validate:ci\npnpm run test:smoke:api\n`,
      ".husky/pre-commit": "pnpm exec lint-staged\npnpm run validate:commit\n",
      ".husky/pre-push": "pnpm run validate:push\n",
    },
    qualityCheckFiles: ["tools/quality/check-sample.mjs"],
    scripts: {
      "build:deployables":
        "pnpm --filter @lojaveiculosv2/web build && pnpm run verify:web-bundle && pnpm --filter @lojaveiculosv2/api build",
      "check:sample": "node tools/quality/check-sample.mjs",
      "check:format": "prettier --check .",
      lint: "pnpm -r lint",
      test: "pnpm -r test",
      "test:coverage": "pnpm -r test:coverage",
      "test:dashboard-animation":
        "pnpm --filter @lojaveiculosv2/web exec vitest run src/features/analytics/dashboardHomeAnimation.test.ts",
      "test:quality-tools":
        "pnpm --filter @lojaveiculosv2/web exec vitest run --expect.requireAssertions tools/quality/*.test.mjs --root ../..",
      "test:seed-document-pdf":
        "pnpm --filter @lojaveiculosv2/web exec vitest run --expect.requireAssertions tools/storage/seed-product-document-pdf.test.mjs --root ../..",
      "test:smoke:api":
        "pnpm --filter @lojaveiculosv2/api exec vitest run src/infrastructure/http/productionSmoke.test.ts",
      typecheck: "pnpm -r typecheck",
      validate: "pnpm run validate:push",
      "validate:ci":
        "pnpm run validate:push && pnpm run test:coverage && pnpm run build:deployables",
      "validate:commit":
        "pnpm run validate:core-guardrails && pnpm run test:quality-tools && pnpm run test:seed-document-pdf",
      "validate:core-guardrails":
        "pnpm run check:format && pnpm run check:sample",
      "validate:push":
        "pnpm run validate:core-guardrails && pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run test:quality-tools && pnpm run test:seed-document-pdf",
      "verify:web-bundle": "node tools/quality/verify-web-bundle-artifacts.mjs",
    },
  };
}

function workflowActions() {
  return requiredCiActions
    .map(({ name, ref }) => `uses: ${name}@${ref}`)
    .join("\n");
}
