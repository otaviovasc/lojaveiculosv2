import { spawnSync } from "node:child_process";
import {
  assertSeedR2WritesAllowed,
  loadLocalEnv,
} from "../storage/storageScriptEnv.mjs";
import { assertSafeLocalDatabaseOperation } from "./local-database-safety.mjs";

export function resetLocalDatabases({
  assertSafe = assertSafeLocalDatabaseOperation,
  assertSeedWrites = assertSeedR2WritesAllowed,
  environment = process.env,
  execute = run,
  loadEnvironment = loadLocalEnv,
  packageManager = pnpmCommand(),
} = {}) {
  loadEnvironment();
  assertSafe("db:reset:local");
  if (environment.R2_BUCKET_NAME) {
    assertSeedWrites({
      allowedBucket: environment.R2_SEED_WRITE_BUCKET,
      apply: true,
      bucketName: environment.R2_BUCKET_NAME,
    });
  }

  console.log("Resetting local product and audit databases...");
  execute("docker", ["compose", "down", "-v"]);
  execute("docker", [
    "compose",
    "up",
    "-d",
    "--wait",
    "lojaveiculosv2-postgres",
    "lojaveiculosv2-audit-postgres",
    "lojaveiculosv2-redis",
  ]);
  execute(packageManager, ["run", "db:push:local"]);
  execute(packageManager, ["run", "db:seed:local"]);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    env: { ...process.env, COMPOSE_DISABLE_ENV_FILE: "1" },
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}
