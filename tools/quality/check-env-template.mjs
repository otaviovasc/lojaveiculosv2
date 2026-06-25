import { readFileSync } from "node:fs";

const env = readFileSync(
  new URL("../../.env.example", import.meta.url),
  "utf8",
);
const secretPattern = /(sk_live|sk_test|eyJ|postgres:\/\/[^$]|-----BEGIN)/i;
const sensitiveAssignmentNames = [];

for (const line of env.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;

  const match = /^([A-Z0-9_]+)=(.*)$/.exec(trimmed);
  if (!match) continue;

  const [, name, rawValue] = match;
  const value = rawValue.trim();
  if (!value || value.startsWith("${{")) continue;
  if (name.endsWith("_URL")) continue;
  if (
    !/(^|_)(SECRET|API_KEY|ACCESS_KEY|PRIVATE_KEY|TOKEN|PASSWORD)(_|$)/.test(
      name,
    )
  ) {
    continue;
  }

  sensitiveAssignmentNames.push(name);
}

if (secretPattern.test(env) || sensitiveAssignmentNames.length > 0) {
  console.error(
    ".env.example appears to contain a real secret or concrete DB URL.",
  );
  if (sensitiveAssignmentNames.length > 0) {
    console.error(
      `Non-empty sensitive example variables: ${sensitiveAssignmentNames.join(", ")}`,
    );
  }
  process.exit(1);
}
