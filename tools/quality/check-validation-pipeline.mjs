import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const scripts = packageJson.scripts ?? {};
const failures = [];

const coreGuardrails = commandParts(scripts["validate:core-guardrails"]);
const commitGate = commandParts(scripts["validate:commit"]);
const pushGate = commandParts(scripts["validate:push"]);
const checkScripts = Object.keys(scripts)
  .filter((script) => script.startsWith("check:"))
  .sort();

for (const script of checkScripts) {
  if (!coreGuardrails.includes(`pnpm run ${script}`)) {
    failures.push(`${script} is not included in validate:core-guardrails`);
  }
}

expectScript("validate", "pnpm run validate:push");
expectScript("validate:ci", "pnpm run validate:push");
expectCommandParts("validate:commit", commitGate, [
  "pnpm run validate:core-guardrails",
  "pnpm run test:frontend-design",
]);
expectCommandParts("validate:push", pushGate, [
  "pnpm run validate:core-guardrails",
  "pnpm run typecheck",
  "pnpm run lint",
  "pnpm run test",
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
  ["pnpm run validate:ci", "pnpm run test:smoke:api"],
  [],
);

if (failures.length > 0) {
  console.error("Validation pipeline violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

function expectScript(script, expected) {
  if (scripts[script] === expected) return;
  failures.push(`${script} must be ${JSON.stringify(expected)}`);
}

function expectCommandParts(script, actualParts, expectedParts) {
  const actual = actualParts.join(" && ");
  const expected = expectedParts.join(" && ");
  if (actual === expected) return;
  failures.push(`${script} must be ${JSON.stringify(expected)}`);
}

function expectIncludes(file, required, forbidden) {
  const source = readFileSync(join(root, file), "utf8");
  for (const text of required) {
    if (!source.includes(text)) failures.push(`${file} must include ${text}`);
  }
  for (const text of forbidden) {
    if (source.includes(text))
      failures.push(`${file} must not include ${text}`);
  }
}

function commandParts(command) {
  return String(command ?? "")
    .split("&&")
    .map((part) => part.trim())
    .filter(Boolean);
}
