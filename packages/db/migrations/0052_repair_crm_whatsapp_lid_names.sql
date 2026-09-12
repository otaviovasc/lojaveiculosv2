UPDATE "crm_whatsapp_sessions" AS session
SET
  "buyer_name" = lead."buyer_name",
  "revision" = session."revision" + 1,
  "updated_at" = now()
FROM "leads" AS lead
WHERE session."lead_id" = lead."id"
  AND session."tenant_id" = lead."tenant_id"
  AND session."store_id" = lead."store_id"
  AND lead."buyer_name" IS NOT NULL
  AND session."buyer_name" ~* '@lid'
  AND session."buyer_name" IS DISTINCT FROM lead."buyer_name";

UPDATE "crm_whatsapp_messages" AS message
SET
  "sender_origin" = 'human_whatsapp',
  "sender_type" = 'HUMAN',
  "updated_at" = now()
WHERE message."channel" = 'WHATSAPP'
  AND message."direction" = 'OUTBOUND'
  AND message."sender_origin" = 'unknown'
  AND message."metadata" ->> 'provider' = 'zapi'
  AND COALESCE(message."metadata" -> 'interactive' ->> 'kind', '') <> 'reaction';
