import { log } from "./log.mjs";

export const WHATSAPP_HISTORY_TABLES = [
  "crm_whatsapp_scheduled_messages",
  "crm_whatsapp_campaign_recipients",
  "crm_whatsapp_campaigns",
  "crm_whatsapp_session_tags",
  "crm_whatsapp_messages",
  "crm_whatsapp_sessions",
];

export async function replaceStoreWhatsappHistory(tx, storeId) {
  log("  CRM WhatsApp: replacing existing store history...");
  for (const table of WHATSAPP_HISTORY_TABLES) {
    const startedAt = Date.now();
    log(`  CRM WhatsApp cleanup: clearing ${table}...`);
    const deleted = await tx.unsafe(`DELETE FROM ${table} WHERE store_id=$1`, [
      storeId,
    ]);
    log(
      `  CRM WhatsApp cleanup: cleared ${table} ` +
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

function elapsed(startedAt) {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
}
