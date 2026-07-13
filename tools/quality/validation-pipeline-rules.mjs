import { requiredCiActions } from "./ci-workflow-rules.mjs";

const qualityTestCommand =
  "pnpm --filter @lojaveiculosv2/web exec vitest run --expect.requireAssertions tools/quality/*.test.mjs --root ../..";
const seedDocumentTestCommand =
  "pnpm --filter @lojaveiculosv2/web exec vitest run --expect.requireAssertions tools/storage/seed-product-document-pdf.test.mjs --root ../..";

export function findValidationPipelineViolations(input) {
  const {
    fileModes = {},
    fileSources,
    lintStaged,
    qualityCheckFiles,
    scripts,
  } = input;
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
  expectScript("prepare", "husky");
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
  expectScript("test:coverage", "pnpm -r test:coverage");
  expectScript("test:seed-document-pdf", seedDocumentTestCommand);
  expectScript(
    "test:dashboard-animation",
    "pnpm --filter @lojaveiculosv2/web exec vitest run src/features/analytics/dashboardHomeAnimation.test.ts",
  );
  expectScript(
    "test:smoke:api",
    "pnpm --filter @lojaveiculosv2/api exec vitest run src/infrastructure/http/productionSmoke.test.ts",
  );
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
  expectLintStaged();
  expectHook(
    ".husky/pre-commit",
    ["pnpm exec lint-staged", "pnpm run validate:commit"],
    ["pnpm run validate", "pnpm run validate:push"],
  );
  expectHook(
    ".husky/pre-push",
    ["pnpm run validate:push"],
    ["pnpm run validate"],
  );
  expectWorkflowEntries(
    ".github/workflows/ci.yml",
    "uses",
    requiredCiActions.map(({ name, ref }) => `${name}@${ref}`),
  );
  expectWorkflowEntries(".github/workflows/ci.yml", "run", [
    "pnpm run validate:ci",
    "pnpm run test:smoke:api",
  ]);
  expectWorkflowOrder(".github/workflows/ci.yml", "uses", [
    `${requiredCiActions[1].name}@${requiredCiActions[1].ref}`,
    `${requiredCiActions[2].name}@${requiredCiActions[2].ref}`,
  ]);
  expectWorkflowOrder(".github/workflows/ci.yml", "run", [
    "pnpm run validate:ci",
    "pnpm run test:smoke:api",
  ]);

  return failures;

  function expectScript(script, expected) {
    if (scripts[script] !== expected) {
      failures.push(`${script} must be ${JSON.stringify(expected)}`);
    }
  }

  function expectLintStaged() {
    if (
      lintStaged === null ||
      Array.isArray(lintStaged) ||
      typeof lintStaged !== "object" ||
      !Object.hasOwn(lintStaged, "*")
    ) {
      failures.push("lint-staged must define the catch-all * file pattern");
      return;
    }

    const catchAll = lintStaged["*"];
    const commands = (Array.isArray(catchAll) ? catchAll : [catchAll]).filter(
      (value) => typeof value === "string",
    );
    if (!commands.includes("prettier --ignore-unknown --write")) {
      failures.push(
        "lint-staged * must run prettier --ignore-unknown --write on every staged file",
      );
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

  function expectHook(file, required, forbidden) {
    const commands = executableHookCommands(fileSources[file]);
    if ((fileModes[file] & 0o111) === 0) {
      failures.push(`${file} must be executable`);
    }
    for (const command of required) {
      if (!commands.includes(command)) {
        failures.push(`${file} must execute ${command}`);
      }
    }
    const commandSegments = commands.flatMap(commandParts);
    for (const command of forbidden) {
      if (commandSegments.includes(command)) {
        failures.push(`${file} must not execute ${command}`);
      }
    }
  }

  function expectWorkflowEntries(file, key, required) {
    const entries = workflowEntries(fileSources[file], key);
    for (const value of required) {
      if (!entries.includes(value)) {
        failures.push(`${file} must execute ${key}: ${value}`);
      }
    }
  }

  function expectWorkflowOrder(file, key, orderedValues) {
    const entries = workflowEntries(fileSources[file], key);
    let priorIndex = -1;
    for (const value of orderedValues) {
      const index = entries.indexOf(value, priorIndex + 1);
      if (index <= priorIndex) {
        failures.push(
          `${file} must place ${key}: ${value} after ${orderedValues[0]}`,
        );
        return;
      }
      priorIndex = index;
    }
  }
}

function executableHookCommands(source) {
  return String(source ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.replace(/\s+#.*$/, "").trim());
}

function workflowEntries(source, key) {
  const lines = String(source ?? "").split(/\r?\n/);
  const matcher = new RegExp(`^\\s*(?:-\\s*)?${key}:\\s*([^#]+?)(?:\\s+#.*)?$`);
  return lines.flatMap((line) => {
    const match = matcher.exec(line);
    if (!match) return [];
    const value = unquoteYamlScalar(match[1].trim());
    return key === "run" ? commandParts(value) : [value];
  });
}

function unquoteYamlScalar(value) {
  const quote = value[0];
  return quote && quote === value.at(-1) && (quote === '"' || quote === "'")
    ? value.slice(1, -1)
    : value;
}

function commandParts(command) {
  return String(command ?? "")
    .split("&&")
    .map((part) => part.trim())
    .filter(Boolean);
}
