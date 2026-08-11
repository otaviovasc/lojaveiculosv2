import postgres from "postgres";
import { assertSafeLocalDatabaseOperation } from "../db/local-database-safety.mjs";
import { loadLocalEnv } from "../storage/storageScriptEnv.mjs";
import { assertSeedIdentity } from "./local-seed-smoke-identity.mjs";
import { assertSeedInfrastructure } from "./local-seed-smoke-infrastructure.mjs";
import { assert, seedIds } from "./local-seed-smoke-support.mjs";
import { assertSeedWorkflows } from "./local-seed-smoke-workflows.mjs";

const localDatabaseUrl =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";

loadLocalEnv();
assertSafeLocalDatabaseOperation("qa:seed:local", ["DATABASE_URL"]);

const db = postgres(process.env.DATABASE_URL ?? localDatabaseUrl, { max: 1 });

async function assertPrimaryZapiEntitlement() {
  const [entitlement] = await db`
    select source, status
    from store_entitlements
    where tenant_id = ${seedIds.primaryTenant}
      and store_id = ${seedIds.primaryStore}
      and feature_key = 'crm_zapi'
      and source = 'local_seed_override'
      and status = 'active'
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
  `;
  assert(
    entitlement,
    "Primary Z-API test store must have an effective local crm_zapi entitlement.",
  );
  return entitlement;
}

try {
  const summary = {
    identity: await assertSeedIdentity(db),
    workflows: await assertSeedWorkflows(db),
    infrastructure: await assertSeedInfrastructure(db),
    zapiEntitlement: await assertPrimaryZapiEntitlement(),
  };
  console.info(JSON.stringify(summary, null, 2));
} finally {
  await db.end({ timeout: 5 });
}
