import { countTargetWhatsappConversations } from "./target-crm-whatsapp.mjs";
import { countTargetCrmChannelConnections } from "./crm-whatsapp-mapping.mjs";

export async function collectParity(tx, storeId, ids) {
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
    "payments",
    "store_entitlements",
    "subscription_items",
    "subscriptions",
    "billing_customers",
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
  const connectionIds = [
    ...new Set(ids?.crmChannelConnections?.values() ?? []),
  ];
  const [connections] = connectionIds.length
    ? await tx.unsafe(
        `SELECT count(*)::int AS count
           FROM crm_channel_connections
          WHERE store_id=$1 AND id=ANY($2::uuid[])`,
        [storeId, connectionIds],
      )
    : [{ count: 0 }];
  counts.crm_channel_connections = connections.count;
  const canonicalCounts = connectionIds.length
    ? await collectCanonicalWhatsappParity(tx, storeId, connectionIds)
    : {
        crm_conversation_attendances: 0,
        crm_conversation_cycles: 0,
        crm_conversation_threads: 0,
        crm_messages: 0,
        crm_messages_with_media: 0,
      };
  Object.assign(counts, canonicalCounts);
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

async function collectCanonicalWhatsappParity(tx, storeId, connectionIds) {
  const [row] = await tx.unsafe(
    `SELECT
       (SELECT count(*)::int FROM crm_conversation_threads
         WHERE store_id=$1 AND provider_connection_id=ANY($2::uuid[]))
         AS crm_conversation_threads,
       (SELECT count(*)::int FROM crm_conversation_cycles AS cycle
          JOIN crm_conversation_threads AS thread ON thread.id=cycle.thread_id
         WHERE cycle.store_id=$1
           AND thread.provider_connection_id=ANY($2::uuid[]))
         AS crm_conversation_cycles,
       (SELECT count(*)::int FROM crm_conversation_attendances AS attendance
          JOIN crm_conversation_threads AS thread
            ON thread.id=attendance.thread_id
         WHERE attendance.store_id=$1
           AND thread.provider_connection_id=ANY($2::uuid[]))
         AS crm_conversation_attendances,
       (SELECT count(*)::int FROM crm_messages
         WHERE store_id=$1 AND provider_connection_id=ANY($2::uuid[]))
         AS crm_messages,
       (SELECT count(*) FILTER (WHERE media_url IS NOT NULL)::int
          FROM crm_messages
         WHERE store_id=$1 AND provider_connection_id=ANY($2::uuid[]))
         AS crm_messages_with_media`,
    [storeId, connectionIds],
  );
  return row;
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
      crm_channel_connections: countTargetCrmChannelConnections(data.whatsapp),
      crm_conversation_threads: countTargetWhatsappConversations(data.whatsapp),
      crm_conversation_cycles: countTargetWhatsappConversations(data.whatsapp),
      crm_conversation_attendances: countTargetWhatsappConversations(
        data.whatsapp,
      ),
      crm_messages: data.whatsapp.messages.length,
      crm_messages_with_media: data.whatsapp.messages.filter(
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
