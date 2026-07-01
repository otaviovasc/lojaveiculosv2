import { assertKnownLocalDatabaseUrl } from "./local-database-safety.mjs";

const variableName = process.argv[2];

if (!variableName) {
  throw new Error("Usage: ensure-local-database-url.mjs <ENV_VAR_NAME>");
}

try {
  assertKnownLocalDatabaseUrl(variableName);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
