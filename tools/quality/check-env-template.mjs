import { join } from "node:path";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";

const examplePath = join(repoRoot, ".env.example");
const docsPath = join(repoRoot, "docs/ops/env-vars.md");
const sourceRoots = ["apps", "packages", "tools"].map((path) =>
  join(repoRoot, path),
);
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const secretPattern = /(sk_live|sk_test|eyJ|postgres:\/\/[^$]|-----BEGIN)/i;
const sensitiveNamePattern =
  /(^|_)(SECRET|API_KEY|ACCESS_KEY|PRIVATE_KEY|TOKEN|PASSWORD)(_|$)/;
const failures = [];

const envExample = readText(examplePath);
const envDocs = readText(docsPath);
const exampleKeyResult = parseExampleKeys(envExample);
const docsKeys = new Set(
  [...envDocs.matchAll(/`([A-Z][A-Z0-9_]*)`/g)].map((match) => match[1]),
);
const usedKeys = findUsedEnvKeys();
const sensitiveAssignmentNames = findSensitiveExampleAssignments(envExample);

for (const duplicate of exampleKeyResult.duplicates) {
  failures.push(`.env.example defines ${duplicate} more than once`);
}

for (const key of [...usedKeys].sort()) {
  if (!exampleKeyResult.keys.has(key)) {
    failures.push(`${key} is used in code but missing from .env.example`);
  }
  if (!docsKeys.has(key)) {
    failures.push(
      `${key} is used in code but missing from docs/ops/env-vars.md`,
    );
  }
}

if (secretPattern.test(envExample) || sensitiveAssignmentNames.length > 0) {
  failures.push(
    ".env.example appears to contain a real secret or concrete DB URL",
  );
  for (const name of sensitiveAssignmentNames) {
    failures.push(`.env.example assigns a concrete sensitive value to ${name}`);
  }
}

if (failures.length > 0) {
  console.error("Environment variable guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

function parseExampleKeys(source) {
  const keys = new Set();
  const duplicates = new Set();
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^([A-Z][A-Z0-9_]*)=/.exec(trimmed);
    if (!match) continue;
    if (keys.has(match[1])) duplicates.add(match[1]);
    keys.add(match[1]);
  }
  return { duplicates, keys };
}

function findUsedEnvKeys() {
  const keys = new Set();
  const patterns = [
    /\bprocess\.env\.([A-Z][A-Z0-9_]*)\b/g,
    /\bprocess\.env\[['"`]([A-Z][A-Z0-9_]*)['"`]\]/g,
    /\bimport\.meta\.env\.([A-Z][A-Z0-9_]*)\b/g,
    /\benv\.([A-Z][A-Z0-9_]*)\b/g,
  ];

  for (const file of walkFiles(sourceRoots, { extensions: sourceExtensions })) {
    const rel = repoPath(file);
    if (shouldSkipSource(rel)) continue;
    const source = readText(file);
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) keys.add(match[1]);
    }
  }

  return keys;
}

function shouldSkipSource(rel) {
  return (
    rel.startsWith("tools/quality/") ||
    /\.(test|spec|stories)\.[jt]sx?$/.test(rel) ||
    /(^|\/)(__fixtures__|__mocks__|fixtures|mocks)(\/|$)/.test(rel)
  );
}

function findSensitiveExampleAssignments(source) {
  const names = [];
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^([A-Z0-9_]+)=(.*)$/.exec(trimmed);
    if (!match) continue;

    const [, name, rawValue] = match;
    const value = rawValue.trim();
    if (!value || value.startsWith("${{")) continue;
    if (name.endsWith("_URL") || name.endsWith("_TOKEN_URL")) continue;
    if (!sensitiveNamePattern.test(name)) continue;
    names.push(name);
  }
  return names;
}
