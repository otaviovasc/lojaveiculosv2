#!/usr/bin/env node
// Replays failed Uazapi webhook provider events against the staging API.
// Failed events keep their full payload and are re-claimable, so re-POSTing
// the payload to the webhook route reprocesses them through the current code.
//
// Usage:
//   node tools/db/replay-failed-uazapi-webhooks.mjs --connection <uuid> [--since "2026-09-09 15:00:00+00"] [--apply]
// Default mode is a dry run. Secrets are never printed.
import { createDecipheriv } from "node:crypto";
import { execSync } from "node:child_process";
import postgres from "postgres";

const args = process.argv.slice(2);
function argValue(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}
const connectionId = argValue("--connection");
const since = argValue("--since") ?? "2026-09-09 00:00:00+00";
const apply = args.includes("--apply");
const apiBase =
  argValue("--api") ?? "https://lojaveiculosv2-api-staging.up.railway.app";

if (!connectionId) {
  console.error("Missing --connection <uuid>");
  process.exit(1);
}

function railwayVariable(service, key) {
  const out = execSync(
    `railway variables --service ${service} --kv 2>/dev/null`,
  )
    .toString()
    .split("\n")
    .find((line) => line.startsWith(`${key}=`));
  if (!out) throw new Error(`Railway variable ${key} not found for ${service}`);
  return out.slice(key.length + 1);
}

function openWebhookSecret(sealed, scope, encryptionKey) {
  const [prefix, iv, tag, ciphertext, extra] = sealed.split(".");
  if (prefix !== "crm:v1" || !iv || !tag || !ciphertext || extra) {
    throw new Error("Sealed credential format is invalid.");
  }
  const encoded = encryptionKey.startsWith("v1:")
    ? encryptionKey.slice(3)
    : encryptionKey;
  const key = Buffer.from(encoded, "base64url");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAAD(
    Buffer.from(JSON.stringify({ ...scope, version: 1 }), "utf8"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

const databaseUrl = railwayVariable(
  "lojaveiculosv2-postgres",
  "DATABASE_PUBLIC_URL",
);
const encryptionKey = railwayVariable(
  "lojaveiculosv2-api",
  "CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY",
);

const sql = postgres(databaseUrl);

const [connection] = await sql`
  select store_id, tenant_id, metadata
  from crm_channel_connections
  where id = ${connectionId}
  limit 1`;
if (!connection) {
  console.error("Connection not found.");
  process.exit(1);
}
const stored = connection.metadata?.credentialsRef?.stored ?? {};
if (!stored.webhookSecret) {
  console.error("Connection has no webhook secret configured.");
  process.exit(1);
}
const token = openWebhookSecret(
  stored.webhookSecret,
  {
    purpose: "uazapi.webhook-secret",
    storeId: connection.store_id,
    tenantId: connection.tenant_id,
  },
  encryptionKey,
);

const events = await sql`
  select id, created_at
  from provider_events
  where connection_id = ${connectionId}
    and provider = 'uazapi'
    and status = 'failed'
    and created_at > ${since}
  order by created_at asc`;
console.log(
  `${events.length} failed event(s) since ${since}. Mode: ${apply ? "APPLY" : "dry-run"}.`,
);
if (!apply) {
  await sql.end();
  process.exit(0);
}

let processed = 0;
let failed = 0;
for (const event of events) {
  const [row] = await sql`
    select payload from provider_events where id = ${event.id} limit 1`;
  const response = await fetch(
    `${apiBase}/api/v1/crm/whatsapp/webhooks/uazapi/${connectionId}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crm-webhook-token": token,
      },
      body: JSON.stringify(row.payload),
    },
  );
  const body = await response.json().catch(() => ({}));
  const ok = response.ok;
  if (ok) processed += 1;
  else failed += 1;
  console.log(
    `${ok ? "ok" : "FAIL"} ${response.status} event=${event.id} status=${body.status ?? "?"}${ok ? "" : ` error=${body.error?.message ?? body.message ?? "unknown"}`}`,
  );
}
console.log(`Done. processed=${processed} failed=${failed}`);
await sql.end();
