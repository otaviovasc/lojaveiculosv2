export async function installCrmWhatsappSessionIdentityParity(sql) {
  await sql.begin(async (transaction) => {
    await transaction.unsafe(`
      DROP INDEX IF EXISTS "crm_whatsapp_sessions_connection_phone_unique";
      DROP INDEX IF EXISTS "crm_whatsapp_sessions_connection_channel_external_unique";
      CREATE UNIQUE INDEX "crm_whatsapp_sessions_connection_phone_unique"
        ON "crm_whatsapp_sessions" ("connection_id", "buyer_phone")
        WHERE "buyer_phone" <> '';
      CREATE UNIQUE INDEX "crm_whatsapp_sessions_connection_channel_external_unique"
        ON "crm_whatsapp_sessions" ("connection_id", "channel_external_id")
        WHERE "channel_external_id" IS NOT NULL;
    `);
  });
  console.log("CRM messaging session identity indexes are normalized.");
}
