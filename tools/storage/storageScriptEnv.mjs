import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function loadLocalEnv(startDirectory = process.cwd()) {
  let current = startDirectory;

  for (let depth = 0; depth < 5; depth += 1) {
    const envPath = join(current, ".env");
    if (existsSync(envPath)) {
      loadEnvFile(envPath);
      return;
    }

    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.startsWith("${{")) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function assertSeedR2WritesAllowed({
  apply,
  bucketName,
  allowedBucket = process.env.R2_SEED_WRITE_BUCKET,
}) {
  if (!apply) return;

  if (!bucketName || !allowedBucket || allowedBucket !== bucketName) {
    throw new Error(
      "R2 seed writes are disabled. Set R2_SEED_WRITE_BUCKET to the exact name of the dedicated test bucket.",
    );
  }
}

function loadEnvFile(path) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) continue;
    process.env[parsed.key] = parsed.value;
  }
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const separator = trimmed.indexOf("=");
  if (separator === -1) return null;

  const key = trimmed.slice(0, separator).trim();
  const value = trimmed
    .slice(separator + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  return key ? { key, value } : null;
}
