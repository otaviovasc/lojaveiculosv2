import postgres from "postgres";
import { assertSafeLocalDatabaseOperation } from "../db/local-database-safety.mjs";
import { loadLocalEnv } from "../storage/storageScriptEnv.mjs";
import { assertSeedIdentity } from "./local-seed-smoke-identity.mjs";
import { assertSeedInfrastructure } from "./local-seed-smoke-infrastructure.mjs";
import { assertSeedWorkflows } from "./local-seed-smoke-workflows.mjs";

const localDatabaseUrl =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";

loadLocalEnv();
assertSafeLocalDatabaseOperation("qa:seed:local", ["DATABASE_URL"]);

const db = postgres(process.env.DATABASE_URL ?? localDatabaseUrl, { max: 1 });

try {
  const summary = {
    identity: await assertSeedIdentity(db),
    workflows: await assertSeedWorkflows(db),
    infrastructure: await assertSeedInfrastructure(db),
  };
  console.info(JSON.stringify(summary, null, 2));
} finally {
  await db.end({ timeout: 5 });
}
