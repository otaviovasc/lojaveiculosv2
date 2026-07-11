import { basename } from "node:path";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";

const scannedExtensions = new Set([
  ".css",
  ".env.example",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const sensitiveNamePattern =
  /(^|_)(SECRET|API_KEY|ACCESS_KEY|PRIVATE_KEY|PASSWORD|TOKEN)(_|$)/;
const allowMarker = "secret-scan-allow";
const allowMarkerPattern = /secret-scan-allow:\s+\S(?:.*\S)?/;
const tokenRules = [
  {
    label: "private key block",
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/,
  },
  {
    label: "OpenAI-style secret key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
  },
  {
    label: "live/test provider secret key",
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{24,}\b/,
  },
  {
    label: "GitHub token",
    pattern:
      /\b(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{20,}_[A-Za-z0-9_]{20,})\b/,
  },
  {
    label: "AWS access key id",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  },
  {
    label: "JWT",
    pattern:
      /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  },
];
const failures = [];

runParserRegressionChecks();

for (const file of walkFiles(repoRoot)) {
  const rel = repoPath(file);
  if (!shouldScan(rel)) continue;

  const source = readText(file);
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes(allowMarker)) {
      if (!allowMarkerPattern.test(line)) {
        failures.push(
          `${rel}:${index + 1}: ${allowMarker} requires a short reason`,
        );
      }
      return;
    }

    for (const rule of tokenRules) {
      if (rule.pattern.test(line)) {
        failures.push(`${rel}:${index + 1}: possible ${rule.label}`);
      }
    }

    const assignment = parseAssignment(line);
    if (assignment && suspiciousAssignment(rel, assignment)) {
      failures.push(
        `${rel}:${index + 1}: concrete value assigned to sensitive key ${assignment.name}`,
      );
    }
  });
}

if (failures.length > 0) {
  console.error("Secret scanning guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    `Remove the secret, replace it with an empty placeholder, or use ${allowMarker}: <reason> for a documented false positive.`,
  );
  process.exit(1);
}

console.log("Secret scanning guardrails passed.");

function shouldScan(rel) {
  if (rel === "tools/quality/check-secret-patterns.mjs") return false;
  if (/(\.test\.|\.spec\.|__fixtures__|__mocks__|fixtures|mocks)/.test(rel)) {
    return false;
  }
  if (/^\.env(?!\.example$)/.test(basename(rel))) return false;
  const extension = extensionOf(rel);
  if (scannedExtensions.has(extension)) return true;
  return basename(rel) === ".env.example";
}

function extensionOf(path) {
  if (path === ".env.example" || path.endsWith("/.env.example")) {
    return ".env.example";
  }
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

function parseAssignment(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const match =
    /^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*[:=]\s*["']?([^"',#\s][^"',#]*)/.exec(
      trimmed,
    );
  if (!match) return null;
  return { name: match[1], value: match[2].trim() };
}

function suspiciousAssignment(rel, assignment) {
  if (!/(\.env\.example|\.ya?ml|\.toml|\.json)$/.test(rel)) return false;
  if (assignment.name.endsWith("_TOKEN_URL")) return false;
  if (!sensitiveNamePattern.test(assignment.name)) return false;
  return concreteSensitiveValue(assignment.value);
}

function concreteSensitiveValue(value) {
  if (!value) return false;
  if (/^\$\{\{[^}]+}}$/.test(value)) return false;
  if (/^(changeme|example|fake|placeholder|test|todo)$/i.test(value)) {
    return false;
  }
  if (/^[A-Za-z0-9_]+_dev$/.test(value)) return false;
  if (
    /^(http|https|redis|postgres):\/\/(localhost|127\.0\.0\.1)(?:[:/]|$)/i.test(
      value,
    )
  ) {
    return false;
  }
  return value.length >= 12;
}

function runParserRegressionChecks() {
  assert(
    tokenRules.some((rule) => rule.pattern.test("sk-proj-" + "a".repeat(36))),
    "OpenAI-style keys should be blocked",
  );
  assert(
    !tokenRules.some((rule) => rule.pattern.test("sk_test_fake")),
    "short fake test keys should pass",
  );
  assert(
    suspiciousAssignment(".env.example", {
      name: "SERVICE_API_KEY",
      value: "realistic-secret-value",
    }),
    "sensitive concrete example values should be blocked",
  );
  assert(
    !suspiciousAssignment(".env.example", {
      name: "SERVICE_API_KEY",
      value: "",
    }),
    "empty sensitive placeholders should pass",
  );
}

function assert(condition, label) {
  if (condition) return;
  console.error(`Secret scanner self-test failed: ${label}`);
  process.exit(1);
}
