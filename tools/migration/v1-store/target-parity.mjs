import { countTargetWhatsappSessions } from "./target-crm-whatsapp.mjs";

export async function collectParity(tx, storeId, ids) {
  const tables = [
    "users",
    "fiscal_documents",
    "payments",
    "store_entitlements",
    "subscription_items",
    "subscriptions",
    "billing_customers",
    "crm_whatsapp_sessions",
    "crm_whatsapp_messages",
  ];
  const counts = {};
  for (const table of tables) {
    const scope =
      table === "store_entitlements"
        ? "store_id=$1 AND metadata->>'migrationSelected'='true'"
        : ["billing_customers", "subscriptions", "users"].includes(table)
          ? "tenant_id=(SELECT tenant_id FROM stores WHERE id=$1)"
          : "store_id=$1";
    const [row] = await tx.unsafe(
      `SELECT count(*)::int AS count FROM ${table} WHERE ${scope}`,
      [storeId],
    );
    counts[table] = row.count;
  }
  Object.assign(counts, await collectMigrationProjectionCounts(tx, storeId));
  const [connections] = await tx.unsafe(
    `SELECT count(*)::int AS count
       FROM crm_connections
      WHERE store_id=$1
        AND metadata->'legacyRepasses'->>'sourceTable'='connections'`,
    [storeId],
  );
  counts.crm_connections = connections.count;
  const [documents] = await tx.unsafe(
    `SELECT count(*) FILTER (
              WHERE metadata->'legacyV1'->>'sourceTable'='Document'
            )::int AS legacy,
            count(*) FILTER (
              WHERE metadata->'legacyV1'->>'sourceTable'='Entry.attachment'
            )::int AS attachments
       FROM documents
      WHERE store_id=$1 AND is_deleted=false AND deleted_at IS NULL`,
    [storeId],
  );
  counts.documents = documents.legacy;
  counts.documents_attachments = documents.attachments;
  const [whatsappMedia] = await tx.unsafe(
    `SELECT count(*) FILTER (WHERE media_url IS NOT NULL)::int AS count
       FROM crm_whatsapp_messages WHERE store_id=$1`,
    [storeId],
  );
  counts.crm_whatsapp_media_messages = whatsappMedia.count;
  return counts;
}

async function collectMigrationProjectionCounts(tx, storeId) {
  const scopes = {
    finance_entries:
      "metadata->'legacyV1'->>'sourceTable'='Entry' AND " +
      "COALESCE((metadata->'migrationReconciliation'->>'removedFromSource')::boolean, false)=false",
    lead_activities:
      "metadata->'legacyV1'->>'sourceTable' IN ('LeadInteraction', 'LeadTask')",
    leads:
      "is_deleted=false AND deleted_at IS NULL AND " +
      "(metadata->'legacyV1'->>'sourceTable'='Lead' OR " +
      "COALESCE((metadata->'migration'->>'generatedForWhatsappCoverage')::boolean, false)=true)",
    sale_payments:
      "metadata->'legacyV1'->>'sourceTable'='SalePayment' AND " +
      "COALESCE((metadata->'migrationReconciliation'->>'removedFromSource')::boolean, false)=false",
    sales:
      "is_deleted=false AND deleted_at IS NULL AND " +
      "buyer_snapshot->'legacyV1'->>'sourceTable'='Sale.buyer'",
    vehicle_listings:
      "is_deleted=false AND deleted_at IS NULL AND " +
      "metadata->'legacyV1'->>'sourceTable'='Veiculo'",
    vehicle_media:
      "is_deleted=false AND deleted_at IS NULL AND " +
      "metadata->'legacyV1'->>'sourceTable'='FotosVeiculo'",
  };
  const counts = {};
  for (const [table, scope] of Object.entries(scopes)) {
    const [row] = await tx.unsafe(
      `SELECT count(*)::int AS count FROM ${table}
        WHERE store_id=$1 AND ${scope}`,
      [storeId],
    );
    counts[table] = row.count;
  }
  return counts;
}

export function assertParity(data, parity, modules) {
  const expected = { users: data.accesses.length };
  if (data.billing)
    Object.assign(expected, {
      billing_customers: 1,
      payments: data.billing.payments.length,
      store_entitlements: data.billing.entitlements.length,
      subscription_items: data.billing.products.length,
      subscriptions: 1,
    });
  if (modules.has("vehicles"))
    Object.assign(expected, {
      vehicle_listings: data.vehicles.length,
      vehicle_media: data.photos.length,
    });
  if (modules.has("leads"))
    Object.assign(expected, {
      leads: data.leads.length + (data.whatsapp?.generatedLeadCount ?? 0),
      lead_activities: data.interactions.length + data.tasks.length,
    });
  if (modules.has("sales"))
    Object.assign(expected, {
      sales: data.sales.length,
      sale_payments: data.salePayments.length,
      finance_entries: data.entries.length,
    });
  if (modules.has("documents"))
    Object.assign(expected, {
      documents: data.documents.length,
      fiscal_documents:
        data.spedyFiscal?.fiscalDocuments.length ?? data.fiscalDocuments.length,
    });
  if (modules.has("attachments"))
    expected.documents_attachments = data.entries.filter(
      (entry) => entry.attachmentUrl || entry.attachmentR2Key,
    ).length;
  if (modules.has("whatsapp"))
    Object.assign(expected, {
      crm_connections: data.whatsapp.connections.length,
      crm_whatsapp_sessions: countTargetWhatsappSessions(data.whatsapp),
      crm_whatsapp_messages: data.whatsapp.messages.length,
      crm_whatsapp_media_messages: data.whatsapp.messages.filter(
        (message) => message.media_url,
      ).length,
    });
  const mismatches = Object.entries(expected).filter(
    ([table, count]) => parity[table] !== count,
  );
  if (mismatches.length)
    throw new Error(
      `Parity failed: ${mismatches.map(([table, count]) => `${table} expected=${count} actual=${parity[table]}`).join(", ")}`,
    );
}
