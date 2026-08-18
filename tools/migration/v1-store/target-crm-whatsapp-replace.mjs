import { log } from "./log.mjs";

const WHATSAPP_THREADS = `
  SELECT id FROM crm_conversation_threads
   WHERE store_id=$1 AND channel='whatsapp'`;
const WHATSAPP_CYCLES = `
  SELECT cycle.id
    FROM crm_conversation_cycles AS cycle
    JOIN crm_conversation_threads AS thread ON thread.id=cycle.thread_id
   WHERE cycle.store_id=$1 AND thread.store_id=$1 AND thread.channel='whatsapp'`;

export const WHATSAPP_HISTORY_TABLES = [
  "crm_webhook_effect_outbox",
  "crm_external_bot_event_outbox",
  "crm_whatsapp_outbound_intents",
  "crm_whatsapp_scheduled_messages",
  "crm_whatsapp_campaign_recipients",
  "crm_whatsapp_campaigns",
  "crm_conversation_thread_tags",
  "crm_conversation_command_receipts",
  "crm_conversation_attendance_events",
  "crm_messages",
  "crm_conversation_attendances",
  "crm_conversation_cycles",
  "crm_conversation_threads",
];

const HISTORY_DELETIONS = [
  threadDelete("crm_webhook_effect_outbox"),
  threadDelete("crm_external_bot_event_outbox"),
  threadDelete("crm_whatsapp_outbound_intents"),
  threadDelete("crm_whatsapp_scheduled_messages"),
  threadDelete("crm_whatsapp_campaign_recipients"),
  storeDelete("crm_whatsapp_campaigns"),
  threadDelete("crm_conversation_thread_tags"),
  threadDelete("crm_conversation_command_receipts"),
  cycleDelete("crm_conversation_attendance_events"),
  threadDelete("crm_messages"),
  cycleDelete("crm_conversation_attendances"),
  cycleDelete("crm_conversation_cycles", "id"),
  {
    query: `DELETE FROM crm_conversation_threads
             WHERE store_id=$1 AND channel='whatsapp'`,
    table: "crm_conversation_threads",
  },
];

export async function replaceStoreWhatsappHistory(tx, storeId) {
  log("  CRM WhatsApp: replacing existing store history...");
  await detachLeadOutcomes(tx, storeId);
  for (const deletion of HISTORY_DELETIONS) {
    const startedAt = Date.now();
    log(`  CRM WhatsApp cleanup: clearing ${deletion.table}...`);
    const deleted = await tx.unsafe(deletion.query, [storeId]);
    log(
      `  CRM WhatsApp cleanup: cleared ${deletion.table} ` +
        `(${deleted.count ?? deleted.length ?? 0} row(s), ${elapsed(startedAt)})`,
    );
  }

  const startedAt = Date.now();
  log("  CRM WhatsApp cleanup: clearing generated coverage leads...");
  const deletedLeads = await tx.unsafe(
    `DELETE FROM leads
      WHERE store_id=$1
        AND metadata->'migration'->>'generatedForWhatsappCoverage'='true'`,
    [storeId],
  );
  log(
    "  CRM WhatsApp cleanup: cleared generated coverage leads " +
      `(${deletedLeads.count ?? deletedLeads.length ?? 0} row(s), ${elapsed(startedAt)})`,
  );
  log("  CRM WhatsApp: existing history replacement complete");
}

async function detachLeadOutcomes(tx, storeId) {
  await tx.unsafe(
    `UPDATE crm_lead_outcomes SET origin_cycle_id=NULL, updated_at=now()
      WHERE store_id=$1 AND origin_cycle_id IN (${WHATSAPP_CYCLES})`,
    [storeId],
  );
}

function threadDelete(table) {
  return {
    query: `DELETE FROM ${table}
             WHERE store_id=$1 AND thread_id IN (${WHATSAPP_THREADS})`,
    table,
  };
}

function cycleDelete(table, column = "cycle_id") {
  return {
    query: `DELETE FROM ${table}
             WHERE store_id=$1 AND ${column} IN (${WHATSAPP_CYCLES})`,
    table,
  };
}

function storeDelete(table) {
  return { query: `DELETE FROM ${table} WHERE store_id=$1`, table };
}

function elapsed(startedAt) {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
}
