import { createRequire } from "node:module";
import { assertSeedArtifacts } from "./local-seed-smoke-artifacts.mjs";
import { verifySandboxProviders } from "./local-seed-smoke-providers.mjs";
import { assert, assertCount, seedIds } from "./local-seed-smoke-support.mjs";

const requireFromApi = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);

export async function assertSeedInfrastructure(db) {
  const providerFixtures = await assertProviderTruth(db);
  const providerSandboxes = await verifySandboxProviders();
  const artifacts = await assertSeedArtifacts(db);
  const redis = await assertRedis();
  return { artifacts, providerFixtures, providerSandboxes, redis };
}

async function assertProviderTruth(db) {
  const [zapi] = await db`
    select state, broker,
      metadata->>'officialOperation' as "officialOperation",
      external_connection_id as "externalConnectionId",
      external_instance_id as "externalInstanceId"
    from crm_channel_connections where id = ${seedIds.zapiConnection}
  `;
  assert(
    zapi?.broker === "direct",
    "Seed ZAPI connection must use the canonical direct broker.",
  );
  assert(zapi.state === "sandbox", "ZAPI fixture must remain sandbox-only.");
  assert(
    zapi.officialOperation === "false",
    "ZAPI seed must not claim an official operation.",
  );
  assert(
    !zapi.externalConnectionId && !zapi.externalInstanceId,
    "ZAPI provider evidence must come from rehearsal.",
  );

  const [unsafe] = await db`
    select
      (select count(*)::int from payments where raw->>'fixture' in ('local_seed', 'true')
        and (status = 'paid' or paid_at is not null)) as payments,
      (select count(*)::int from integration_jobs where metadata->>'fixture' = 'true'
        and status in ('queued', 'running', 'succeeded')) as integrations,
      (select count(*)::int from vehicle_provider_listings
        where metadata->>'fixture' = 'true' and external_id is not null) as listings,
      (select count(*)::int from fiscal_documents where metadata->>'fixture' = 'true'
        and (status = 'issued' or issued_at is not null or access_key is not null
          or provider_document_id is not null)) as fiscal,
      (select count(*)::int from crm_messages
        where metadata->>'source' = 'local_seed' and (
          (direction = 'inbound' and status <> 'delivered')
          or (direction = 'outbound' and status <> 'pending')
          or provider_message_id is not null)) as messages,
      (select count(*)::int from crm_scheduled_messages
        where metadata->>'source' = 'local_seed' and status = 'pending'
          and scheduled_at <= now()) as "dueMessages",
      (select count(*)::int from automation_runs where execution_enabled = true
        and tenant_id = ${seedIds.primaryTenant}) as automation
  `;
  for (const [key, value] of Object.entries(unsafe)) {
    assertCount(
      { value },
      "value",
      0,
      `Synthetic provider/execution state: ${key}`,
    );
  }
  return { unsafe, zapi: { broker: zapi.broker, state: zapi.state } };
}

async function assertRedis() {
  const { createClient } = requireFromApi("redis");
  const client = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:63790",
  });
  client.on("error", () => undefined);
  try {
    await client.connect();
    assert(
      (await client.ping()) === "PONG",
      "Redis sandbox did not answer PING.",
    );
    return { checked: true, pong: true };
  } finally {
    if (client.isOpen) await client.quit();
  }
}
