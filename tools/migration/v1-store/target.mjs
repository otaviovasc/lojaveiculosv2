import postgres from "postgres";
import { deterministicUuid, targetId } from "./common.mjs";
import {
  countDocumentsNeedingUpload,
  createArtifactUploader,
} from "./document-artifacts.mjs";
import { log, withTimer } from "./log.mjs";
import { seedFoundation } from "./target-foundation.mjs";
import { seedCrm, seedInventory } from "./target-inventory-crm.mjs";
import {
  seedDocumentsAndFiscal,
  seedSalesAndFinance,
} from "./target-commerce.mjs";
import { seedFinanceAttachments } from "./target-attachments.mjs";

class DryRunRollback extends Error {}

export const MIGRATION_MODULES = [
  "vehicles",
  "leads",
  "sales",
  "documents",
  "attachments",
];

export async function migrateToV2(data, config) {
  enforceTargetSafety(config);
  const modules = config.modules ?? new Set(MIGRATION_MODULES);
  const targetUrl = new URL(config.targetUrl);
  const isLocal = ["127.0.0.1", "localhost", "::1"].includes(
    targetUrl.hostname,
  );
  const sql = postgres(config.targetUrl, {
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
    await sql.begin(async (tx) => {
      await tx`INSERT INTO migration_runs (id, dump_label, metadata, started_at, status, created_at, updated_at)
        VALUES (${ids.run}, ${config.dumpLabel}, ${tx.json({ legacyStoreId: config.legacyStoreId, modules: [...modules], source: "v1-directory-archive" })}, now(), 'running', now(), now())
        ON CONFLICT (id) DO UPDATE SET status='running', metadata=excluded.metadata, started_at=now(), completed_at=null, updated_at=now()`;
      log(`Migration run id: ${ids.run}`);
      await withTimer(
        "Foundation (tenant, store, users, entitlements, billing)",
        () => seedFoundation(tx, data, config, ids),
      );
      if (modules.has("vehicles"))
        await withTimer("Inventory (vehicles, media, checklists)", () =>
          seedInventory(tx, data, config, ids),
        );
      if (modules.has("leads"))
        await withTimer("CRM (leads, activities, interests)", () =>
          seedCrm(tx, data, config, ids),
        );
      if (modules.has("sales"))
        await withTimer("Sales & finance", () =>
          seedSalesAndFinance(tx, data, config, ids),
        );
      if (modules.has("documents"))
        await withTimer("Documents & fiscal", () =>
          seedDocumentsAndFiscal(tx, data, config, ids, uploader),
        );
      if (modules.has("attachments"))
        await withTimer("Finance attachments", () =>
          seedFinanceAttachments(tx, data, config, ids),
        );
      const parity = await withTimer("Parity check", () =>
        collectParity(tx, ids.store),
      );
      assertParity(data, parity, modules);
      await tx`UPDATE migration_runs SET status='succeeded', completed_at=now(), metadata=metadata || ${tx.json({ parity, preservedStoreConfiguration: { customModels: data.customModels, saleSources: data.saleSources, settings: data.settings } })}, updated_at=now() WHERE id=${ids.run}`;
      if (!config.apply)
        throw new DryRunRollback("Dry run completed and rolled back.");
    });
    return { applied: true, ids };
  } catch (error) {
    if (error instanceof DryRunRollback) return { applied: false, ids };
    throw error;
  } finally {
    uploader?.destroy();
    await sql.end();
  }
}

function createIds(config) {
  return {
    run: deterministicUuid(
      "migration-run",
      config.dumpLabel,
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
  if (!config.entitlements.length)
    throw new Error("TARGET_ENTITLEMENTS must be an explicit non-empty list.");
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
  for (const kind of ["consignment_contract", "warranty_certificate"])
    if (!labels.has(kind))
      throw new Error(`V2 document_kind is missing ${kind}; run db:push.`);
}

async function collectParity(tx, storeId) {
  const tables = [
    "users",
    "vehicle_listings",
    "vehicle_media",
    "leads",
    "lead_activities",
    "sales",
    "sale_payments",
    "finance_entries",
    "fiscal_documents",
  ];
  const counts = {};
  for (const table of tables) {
    const scope =
      table === "users"
        ? "tenant_id=(SELECT tenant_id FROM stores WHERE id=$1)"
        : "store_id=$1";
    const [row] = await tx.unsafe(
      `SELECT count(*)::int AS count FROM ${table} WHERE ${scope}`,
      [storeId],
    );
    counts[table] = row.count;
  }
  const [documents] = await tx.unsafe(
    `SELECT count(*) FILTER (WHERE kind <> 'invoice')::int AS legacy,
            count(*) FILTER (WHERE kind = 'invoice')::int AS attachments
     FROM documents WHERE store_id=$1`,
    [storeId],
  );
  counts.documents = documents.legacy;
  counts.documents_attachments = documents.attachments;
  return counts;
}

function assertParity(data, parity, modules) {
  const expected = {};
  if (modules.has("vehicles")) {
    expected.vehicle_listings = data.vehicles.length;
    expected.vehicle_media = data.photos.length;
  }
  if (modules.has("leads")) {
    expected.leads = data.leads.length;
    expected.lead_activities = data.interactions.length + data.tasks.length;
  }
  if (modules.has("sales")) {
    expected.sales = data.sales.length;
    expected.sale_payments = data.salePayments.length;
    expected.finance_entries = data.entries.length;
  }
  if (modules.has("documents")) {
    expected.documents = data.documents.length;
    expected.fiscal_documents = data.fiscalDocuments.length;
  }
  if (modules.has("attachments")) {
    expected.documents_attachments = data.entries.filter(
      (entry) => entry.attachmentUrl || entry.attachmentR2Key,
    ).length;
  }
  // Foundation (users) always runs.
  expected.users = data.accesses.length;
  const mismatches = Object.entries(expected).filter(
    ([table, count]) => parity[table] !== count,
  );
  if (mismatches.length)
    throw new Error(
      `Parity failed: ${mismatches.map(([table, count]) => `${table} expected=${count} actual=${parity[table]}`).join(", ")}`,
    );
}
