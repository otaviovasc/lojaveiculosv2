import { spawnSync } from "node:child_process";
import { assertSafeLocalDatabaseOperation } from "./local-database-safety.mjs";

try {
  assertSafeLocalDatabaseOperation("db:reset:local");

  console.log("Resetting local product and audit databases...");
  run("docker", ["compose", "down", "-v"]);
  run("docker", [
    "compose",
    "up",
    "-d",
    "--wait",
    "lojaveiculosv2-postgres",
    "lojaveiculosv2-audit-postgres",
  ]);
  run(pnpmCommand(), ["run", "db:push:local"]);
  run(pnpmCommand(), ["run", "db:seed:local"]);
  console.log("Local databases reset and seeded.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    env: { ...process.env, COMPOSE_DISABLE_ENV_FILE: "1" },
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}
