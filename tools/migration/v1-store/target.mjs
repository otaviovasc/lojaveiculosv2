import postgres from "postgres";
import { deterministicUuid, targetId } from "./common.mjs";
import {
  countDocumentsNeedingUpload,
  createArtifactUploader,
} from "./document-artifacts.mjs";
import { log } from "./log.mjs";
import { prepareLegacyBillingMigration } from "./billing-mapping.mjs";
import { validateMigrationData } from "./preflight.mjs";
import { prepareSpedyFiscalMigration } from "./spedy-fiscal.mjs";
import { createMigrationFingerprint } from "./target-checkpoints.mjs";
import {
  runAppliedMigration,
  runDryRunMigration,
} from "./target-execution.mjs";

export const MIGRATION_MODULES = [
  "vehicles",
  "leads",
  "sales",
  "documents",
  "attachments",
  "whatsapp",
];

export async function migrateToV2(data, config) {
  enforceTargetSafety(config);
  const modules = config.modules ?? new Set(MIGRATION_MODULES);
  validateMigrationData(data, config, modules);
  data.billing = prepareLegacyBillingMigration(data);
  const targetUrl = new URL(config.targetUrl);
  const isLocal = ["127.0.0.1", "localhost", "::1"].includes(
    targetUrl.hostname,
  );
  const sql = postgres(config.targetUrl, {
    connect_timeout: 15,
    max: 1,
    prepare: false,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  const ids = createIds(config);
  hydrateIds(data, config, ids);
  const uploader = modules.has("documents") ? createArtifactUploader() : null;
  if (modules.has("documents") && config.apply && !uploader) {
    const needingUpload = countDocumentsNeedingUpload(data);
    if (needingUpload > 0)
      throw new Error(
        `${needingUpload} V1 document(s) must be rendered or copied into V2 storage during migration. ` +
          "Set R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_ENDPOINT (or run without the documents module).",
      );
  }
  if (modules.has("documents") && !config.apply && !uploader)
    log(
      "R2 credentials not found; dry run will skip rendering and file copies.",
    );
  log(`Connecting to ${targetUrl.hostname}:${targetUrl.port}...`);
  try {
    await assertTargetSchema(sql);
    log("Target schema OK");
    const fingerprint = createMigrationFingerprint(data, config, modules);
    data.spedyFiscal = await prepareSpedyFiscalMigration(data, config);
    const input = {
      config,
      data,
      fingerprint,
      ids,
      modules,
      sql,
      uploader,
    };
    if (config.apply) await runAppliedMigration(input);
    else await runDryRunMigration(input);
    return { applied: config.apply, ids };
  } finally {
    uploader?.destroy();
    await sql.end({ timeout: 5 });
  }
}

function createIds(config) {
  return {
    run: deterministicUuid(
      "migration-run",
      config.resumeKey ?? config.dumpLabel,
      config.legacyStoreId,
    ),
    tenant: targetId(config.legacyStoreId, "Tenant", config.legacyStoreId),
    store: targetId(config.legacyStoreId, "Loja", config.legacyStoreId),
    ownerUser: null,
    users: new Map(),
    listings: new Map(),
    units: new Map(),
    stages: new Map(),
    leads: new Map(),
    sales: new Map(),
    salePayments: new Map(),
    entries: new Map(),
    recipients: new Map(),
    fiscal: new Map(),
    crmConnections: new Map(),
  };
}

// Target ids are deterministic, so every id map can be rebuilt from the V1
// data alone. This lets a skipped module's rows (migrated in an earlier run)
// still be linked correctly by the modules that do run.
function hydrateIds(data, config, ids) {
  const storeId = config.legacyStoreId;
  for (const access of data.accesses)
    ids.users.set(
      access.clerkUserId,
      targetId(storeId, "UserProfile", access.clerkUserId),
    );
  for (const vehicle of data.vehicles) {
    ids.listings.set(
      vehicle.id,
      targetId(storeId, "Veiculo:listing", vehicle.id),
    );
    ids.units.set(vehicle.id, targetId(storeId, "Veiculo:unit", vehicle.id));
  }
  for (const column of data.columns)
    ids.stages.set(column.id, targetId(storeId, "LeadColumn", column.id));
  for (const lead of data.leads)
    ids.leads.set(lead.id, targetId(storeId, "Lead", lead.id));
  for (const sale of data.sales)
    ids.sales.set(sale.id, targetId(storeId, "Sale", sale.id));
  for (const payment of data.salePayments)
    ids.salePayments.set(
      payment.id,
      targetId(storeId, "SalePayment", payment.id),
    );
  for (const entry of data.entries)
    ids.entries.set(entry.id, targetId(storeId, "Entry", entry.id));
  for (const recipient of data.recipients)
    ids.recipients.set(
      recipient.id,
      targetId(storeId, "ServiceRecipient", recipient.id),
    );
  for (const fiscal of data.fiscalDocuments)
    ids.fiscal.set(fiscal.id, targetId(storeId, "FiscalDocument", fiscal.id));
}

function enforceTargetSafety(config) {
  const url = new URL(config.targetUrl);
  const local = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  if (!local && !config.allowRemoteTarget)
    throw new Error(
      "Remote target blocked. Set ALLOW_REMOTE_TARGET=true deliberately.",
    );
  if (config.apply && config.confirmStoreSlug !== config.storeSlug) {
    throw new Error(
      "CONFIRM_STORE_SLUG must exactly match STORE_SLUG when APPLY=true.",
    );
  }
}

async function assertTargetSchema(sql) {
  const [column] =
    await sql`SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='clerk_user_id'`;
  if (!column || column.is_nullable !== "YES")
    throw new Error(
      "V2 schema is not ready: run db:push after the pending-user schema change.",
    );
  const kinds =
    await sql`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid=pg_enum.enumtypid WHERE typname='document_kind'`;
  const labels = new Set(kinds.map((row) => row.enumlabel));
  for (const kind of [
    "buyer_acknowledgment",
    "consignment_contract",
    "warranty_certificate",
  ])
    if (!labels.has(kind))
      throw new Error(`V2 document_kind is missing ${kind}; run db:push.`);
}
