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
    input.scripts["test:coverage"] = "pnpm -r test";
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
        'test:coverage must be "pnpm -r test:coverage"',
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
      workflowActions() +
      "\nrun: pnpm run test:smoke:api\nrun: pnpm run validate:ci\n";

    const failures = findValidationPipelineViolations(input);
    expect(failures).toEqual(
      expect.arrayContaining([
        ".husky/pre-commit must execute pnpm exec lint-staged",
        ".husky/pre-commit must execute pnpm run validate:commit",
        ".husky/pre-commit must not execute pnpm run validate:push",
        ".github/workflows/ci.yml must place run: pnpm run test:smoke:api after pnpm run validate:ci",
      ]),
    );
  });

  it("rejects commented-out CI commands and actions", () => {
    const input = validPipeline();
    input.fileSources[".github/workflows/ci.yml"] = input.fileSources[
      ".github/workflows/ci.yml"
    ]
      .replace(
        `uses: ${requiredCiActions[1].name}@${requiredCiActions[1].ref}`,
        `# uses: ${requiredCiActions[1].name}@${requiredCiActions[1].ref}`,
      )
      .replace("run: pnpm run validate:ci", "# run: pnpm run validate:ci");

    expect(findValidationPipelineViolations(input)).toEqual(
      expect.arrayContaining([
        `.github/workflows/ci.yml must execute uses: ${requiredCiActions[1].name}@${requiredCiActions[1].ref}`,
        ".github/workflows/ci.yml must execute run: pnpm run validate:ci",
      ]),
    );
  });

  it("rejects disabled hook commands and incomplete hook installation", () => {
    const input = validPipeline();
    input.scripts.prepare = "echo skip-husky";
    input.lintStaged = {
      "*.md": "prettier --ignore-unknown --write",
    };
    input.fileSources[".husky/pre-commit"] =
      "# pnpm exec lint-staged\npnpm run validate:commit\n";
    input.fileModes[".husky/pre-push"] = 0o644;

    const failures = findValidationPipelineViolations(input);
    expect(failures).toEqual(
      expect.arrayContaining([
        'prepare must be "husky"',
        "lint-staged must define the catch-all * file pattern",
        ".husky/pre-commit must execute pnpm exec lint-staged",
        ".husky/pre-push must be executable",
      ]),
    );
  });

  it("requires formatting on the lint-staged catch-all pattern", () => {
    const input = validPipeline();
    input.lintStaged = {
      "*": "eslint --fix",
      "*.md": "prettier --ignore-unknown --write",
    };

    expect(findValidationPipelineViolations(input)).toContain(
      "lint-staged * must run prettier --ignore-unknown --write on every staged file",
    );
  });

  it("accepts inline hook comments without mistaking validate aliases", () => {
    const input = validPipeline();
    input.fileSources[".husky/pre-commit"] =
      "pnpm exec lint-staged # format staged files\npnpm run validate:commit # fast gate\n";

    expect(findValidationPipelineViolations(input)).toEqual([]);
  });
});

function validPipeline() {
  return {
    fileModes: {
      ".husky/pre-commit": 0o755,
      ".husky/pre-push": 0o755,
    },
    fileSources: {
      ".github/workflows/ci.yml": `${workflowActions()}\nrun: pnpm run validate:ci\nrun: pnpm run test:smoke:api\n`,
      ".husky/pre-commit": "pnpm exec lint-staged\npnpm run validate:commit\n",
      ".husky/pre-push": "pnpm run validate:push\n",
    },
    lintStaged: {
      "*": "prettier --ignore-unknown --write",
    },
    qualityCheckFiles: ["tools/quality/check-sample.mjs"],
    scripts: {
      prepare: "husky",
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
