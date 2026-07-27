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
  for (const table of WHATSAPP_HISTORY_TABLES)
    await tx.unsafe(`DELETE FROM ${table} WHERE store_id=$1`, [storeId]);

  await tx.unsafe(
    `DELETE FROM leads
      WHERE store_id=$1
        AND metadata->'migration'->>'generatedForWhatsappCoverage'='true'`,
    [storeId],
  );
}
