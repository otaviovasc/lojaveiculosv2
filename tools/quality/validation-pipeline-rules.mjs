import { requiredCiActions } from "./ci-workflow-rules.mjs";

const qualityTestCommand =
  "pnpm --filter @lojaveiculosv2/web exec vitest run --expect.requireAssertions tools/quality/*.test.mjs --root ../..";
const seedDocumentTestCommand =
  "pnpm --filter @lojaveiculosv2/web exec vitest run --expect.requireAssertions tools/storage/seed-product-document-pdf.test.mjs --root ../..";

export function findValidationPipelineViolations(input) {
  const { fileSources, qualityCheckFiles, scripts } = input;
  const failures = [];
  const coreGuardrails = commandParts(scripts["validate:core-guardrails"]);
  const checkScripts = Object.keys(scripts)
    .filter((script) => script.startsWith("check:"))
    .sort();
  const qualityCheckCommands = new Map();

  for (const script of checkScripts) {
    if (!coreGuardrails.includes(`pnpm run ${script}`)) {
      failures.push(`${script} is not included in validate:core-guardrails`);
    }
    const match = /^node (tools\/quality\/check-[a-z0-9-]+\.mjs)$/.exec(
      scripts[script],
    );
    if (match) qualityCheckCommands.set(match[1], script);
  }

  for (const file of qualityCheckFiles) {
    if (!qualityCheckCommands.has(file)) {
      failures.push(`${file} is not exposed by a package.json check:* script`);
    }
  }
  for (const [file, script] of qualityCheckCommands) {
    if (!qualityCheckFiles.includes(file)) {
      failures.push(`${script} points at missing quality script ${file}`);
    }
  }

  expectScript("validate", "pnpm run validate:push");
  expectScript(
    "validate:ci",
    "pnpm run validate:push && pnpm run test:coverage && pnpm run build:deployables",
  );
  expectScript(
    "build:deployables",
    "pnpm --filter @lojaveiculosv2/web build && pnpm run verify:web-bundle && pnpm --filter @lojaveiculosv2/api build",
  );
  expectScript(
    "verify:web-bundle",
    "node tools/quality/verify-web-bundle-artifacts.mjs",
  );
  expectScript("typecheck", "pnpm -r typecheck");
  expectScript("lint", "pnpm -r lint");
  expectScript("test", "pnpm -r test");
  expectScript("check:format", "prettier --check .");
  expectScript("test:quality-tools", qualityTestCommand);
  expectScript("test:seed-document-pdf", seedDocumentTestCommand);
  expectScript(
    "test:dashboard-animation",
    "pnpm --filter @lojaveiculosv2/web exec vitest run src/features/analytics/dashboardHomeAnimation.test.ts",
  );
  expectScript(
    "test:smoke:api",
    "pnpm --filter @lojaveiculosv2/api exec vitest run src/infrastructure/http/productionSmoke.test.ts",
  );
  expectRunnableCoverage();
  expectCommandParts("validate:commit", [
    "pnpm run validate:core-guardrails",
    "pnpm run test:quality-tools",
    "pnpm run test:seed-document-pdf",
  ]);
  expectCommandParts("validate:push", [
    "pnpm run validate:core-guardrails",
    "pnpm run typecheck",
    "pnpm run lint",
    "pnpm run test",
    "pnpm run test:quality-tools",
    "pnpm run test:seed-document-pdf",
  ]);
  expectIncludes(
    ".husky/pre-commit",
    ["pnpm exec lint-staged", "pnpm run validate:commit"],
    ["pnpm run validate\n", "pnpm run validate:push"],
  );
  expectIncludes(
    ".husky/pre-push",
    ["pnpm run validate:push"],
    ["pnpm run validate\n"],
  );
  expectIncludes(
    ".github/workflows/ci.yml",
    [
      ...requiredCiActions.map(({ name, ref }) => `uses: ${name}@${ref}`),
      "pnpm run validate:ci",
      "pnpm run test:smoke:api",
    ],
    [],
  );
  expectOrder(".github/workflows/ci.yml", [
    `uses: ${requiredCiActions[1].name}@${requiredCiActions[1].ref}`,
    `uses: ${requiredCiActions[2].name}@${requiredCiActions[2].ref}`,
  ]);
  expectOrder(".github/workflows/ci.yml", [
    "pnpm run validate:ci",
    "pnpm run test:smoke:api",
  ]);

  return failures;

  function expectScript(script, expected) {
    if (scripts[script] !== expected) {
      failures.push(`${script} must be ${JSON.stringify(expected)}`);
    }
  }

  function expectRunnableCoverage() {
    const command = scripts["test:coverage"];
    if (typeof command !== "string" || command.trim() === "") {
      failures.push("test:coverage must expose a real command");
      return;
    }
    if (
      /--if-present\b|--passWithNoTests\b/.test(command) ||
      /^\s*(?:echo\b|exit\s+0\b|true\s*$)/.test(command)
    ) {
      failures.push("test:coverage must not silently skip coverage");
    }
  }

  function expectCommandParts(script, expectedParts) {
    const expected = expectedParts.join(" && ");
    if (commandParts(scripts[script]).join(" && ") !== expected) {
      failures.push(`${script} must be ${JSON.stringify(expected)}`);
    }
  }

  function expectIncludes(file, required, forbidden) {
    const source = fileSources[file] ?? "";
    for (const text of required) {
      if (!source.includes(text)) failures.push(`${file} must include ${text}`);
    }
    for (const text of forbidden) {
      if (source.includes(text)) {
        failures.push(`${file} must not include ${text}`);
      }
    }
  }

  function expectOrder(file, orderedTexts) {
    const source = fileSources[file] ?? "";
    let priorIndex = -1;
    for (const text of orderedTexts) {
      const index = source.indexOf(text);
      if (index <= priorIndex) {
        failures.push(`${file} must place ${text} after ${orderedTexts[0]}`);
        return;
      }
      priorIndex = index;
    }
  }
}

function commandParts(command) {
  return String(command ?? "")
    .split("&&")
    .map((part) => part.trim())
    .filter(Boolean);
}
