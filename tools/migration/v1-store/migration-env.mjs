import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const MIGRATION_ENV_KEYS = new Set([
  "FISCAL_CREDENTIAL_ENCRYPTION_KEY",
  "R2_ACCESS_KEY_ID",
  "R2_BUCKET_NAME",
  "R2_ENDPOINT",
  "R2_REGION",
  "R2_SECRET_ACCESS_KEY",
  "SPEDY_API_URL",
  "SPEDY_OWNER_API_KEY",
  "SPEDY_WEBHOOK_URL",
]);

export function loadMigrationEnv(
  startDirectory = process.cwd(),
  targetEnv = process.env,
) {
  let current = startDirectory;
  for (let depth = 0; depth < 5; depth += 1) {
    const envPath = join(current, ".env");
    if (existsSync(envPath)) {
      loadAllowedValues(envPath, targetEnv);
      return;
    }
    const parent = dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

function loadAllowedValues(envPath, targetEnv) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!MIGRATION_ENV_KEYS.has(key) || targetEnv[key] !== undefined) continue;
    targetEnv[key] = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}
