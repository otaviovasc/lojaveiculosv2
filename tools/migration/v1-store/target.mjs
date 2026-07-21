import postgres from "postgres";
import { deterministicUuid, targetId } from "./common.mjs";
import { log, withTimer } from "./log.mjs";
import { seedFoundation } from "./target-foundation.mjs";
import { seedCrm, seedInventory } from "./target-inventory-crm.mjs";
import {
  seedDocumentsAndFiscal,
  seedSalesAndFinance,
} from "./target-commerce.mjs";
import { seedFinanceAttachments } from "./target-attachments.mjs";

class DryRunRollback extends Error {}

export async function migrateToV2(data, config) {
  enforceTargetSafety(config);
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
  log(`Connecting to ${targetUrl.hostname}:${targetUrl.port}...`);
  try {
    await assertTargetSchema(sql);
    log("Target schema OK");
    await sql.begin(async (tx) => {
      await tx`INSERT INTO migration_runs (id, dump_label, metadata, started_at, status, created_at, updated_at)
        VALUES (${ids.run}, ${config.dumpLabel}, ${tx.json({ legacyStoreId: config.legacyStoreId, source: "v1-directory-archive" })}, now(), 'running', now(), now())
        ON CONFLICT (id) DO UPDATE SET status='running', metadata=excluded.metadata, started_at=now(), completed_at=null, updated_at=now()`;
      log(`Migration run id: ${ids.run}`);
      await withTimer(
        "Foundation (tenant, store, users, entitlements, billing)",
        () => seedFoundation(tx, data, config, ids),
      );
      await withTimer("Inventory (vehicles, media, checklists)", () =>
        seedInventory(tx, data, config, ids),
      );
      await withTimer("CRM (leads, activities, interests)", () =>
        seedCrm(tx, data, config, ids),
      );
      await withTimer("Sales & finance", () =>
        seedSalesAndFinance(tx, data, config, ids),
      );
      await withTimer("Documents & fiscal", () =>
        seedDocumentsAndFiscal(tx, data, config, ids),
      );
      await withTimer("Finance attachments", () =>
        seedFinanceAttachments(tx, data, config, ids),
      );
      const parity = await withTimer("Parity check", () =>
        collectParity(tx, ids.store),
      );
      assertParity(data, parity);
      await tx`UPDATE migration_runs SET status='succeeded', completed_at=now(), metadata=metadata || ${tx.json({ parity, preservedStoreConfiguration: { customModels: data.customModels, saleSources: data.saleSources, settings: data.settings } })}, updated_at=now() WHERE id=${ids.run}`;
      if (!config.apply)
        throw new DryRunRollback("Dry run completed and rolled back.");
    });
    return { applied: true, ids };
  } catch (error) {
    if (error instanceof DryRunRollback) return { applied: false, ids };
    throw error;
  } finally {
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
    "documents",
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
  return counts;
}

function assertParity(data, parity) {
  const expected = {
    users: data.accesses.length,
    vehicle_listings: data.vehicles.length,
    vehicle_media: data.photos.length,
    leads: data.leads.length,
    lead_activities: data.interactions.length + data.tasks.length,
    sales: data.sales.length,
    sale_payments: data.salePayments.length,
    finance_entries: data.entries.length,
    documents:
      data.documents.length +
      data.entries.filter(
        (entry) => entry.attachmentUrl || entry.attachmentR2Key,
      ).length,
    fiscal_documents: data.fiscalDocuments.length,
  };
  const mismatches = Object.entries(expected).filter(
    ([table, count]) => parity[table] !== count,
  );
  if (mismatches.length)
    throw new Error(
      `Parity failed: ${mismatches.map(([table, count]) => `${table} expected=${count} actual=${parity[table]}`).join(", ")}`,
    );
}
