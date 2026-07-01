import { spawnSync } from "node:child_process";
import {
  assertSafeLocalDatabaseOperation,
  localDatabasePsqlTargets,
} from "./local-database-safety.mjs";

const targets = localDatabasePsqlTargets();

const truncatePublicTablesSql = `
DO $$
DECLARE
  table_list text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO table_list
    FROM pg_tables
   WHERE schemaname = 'public';

  IF table_list IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
  END IF;
END
$$;
`;

try {
  assertSafeLocalDatabaseOperation(
    "db:clean:local",
    targets.map((target) => target.variableName),
  );

  for (const target of targets) {
    console.log(`Cleaning local ${target.database} database...`);
    run("docker", [
      "compose",
      "exec",
      "-T",
      target.service,
      "psql",
      "-U",
      target.user,
      "-d",
      target.database,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      truncatePublicTablesSql,
    ]);
  }

  console.log("Local databases cleaned.");
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
