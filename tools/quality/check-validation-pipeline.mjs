import { readdirSync, readFileSync } from "node:fs";
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
const qualityCheckFiles = readdirSync(join(root, "tools/quality"))
  .filter((file) => /^check-[a-z0-9-]+\.mjs$/.test(file))
  .map((file) => `tools/quality/${file}`)
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
expectScript("validate:ci", "pnpm run validate:push");
expectCommandParts("validate:commit", commitGate, [
  "pnpm run validate:core-guardrails",
  "pnpm run test:frontend-design",
  "pnpm run test:seed-document-pdf",
]);
expectCommandParts("validate:push", pushGate, [
  "pnpm run validate:core-guardrails",
  "pnpm run typecheck",
  "pnpm run lint",
  "pnpm run test",
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
    "uses: actions/checkout@v7",
    "uses: pnpm/action-setup@v6",
    "uses: actions/setup-node@v6",
    "pnpm run validate:ci",
    "pnpm --filter @lojaveiculosv2/web build",
    "pnpm run test:smoke:api",
  ],
  [],
);
expectOrder(".github/workflows/ci.yml", [
  "uses: pnpm/action-setup@v6",
  "uses: actions/setup-node@v6",
]);

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

function expectOrder(file, orderedTexts) {
  const source = readFileSync(join(root, file), "utf8");
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

function commandParts(command) {
  return String(command ?? "")
    .split("&&")
    .map((part) => part.trim())
    .filter(Boolean);
}
