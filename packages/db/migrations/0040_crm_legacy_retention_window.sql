-- One rolling-deploy window only: legacy Z-API/OLX rows remain readable while
-- canonical ingress is adopted. Retention covers both copies until this view
-- reports zero after the legacy writers and readers have been removed.
CREATE OR REPLACE VIEW "crm_retention_legacy_coverage" AS
WITH supported_sessions AS (
  SELECT session."id", session."tenant_id", session."store_id"
  FROM "crm_whatsapp_sessions" session
  INNER JOIN "crm_connections" connection
    ON connection."id" = session."connection_id"
   AND connection."tenant_id" = session."tenant_id"
   AND connection."store_id" = session."store_id"
  WHERE (connection."provider" = 'zapi' AND session."channel" = 'WHATSAPP')
     OR (connection."provider" = 'olx_chat' AND session."channel" = 'OLX_CHAT')
)
SELECT session."tenant_id", session."store_id",
  (
    count(DISTINCT session."id") FILTER (WHERE cycle."id" IS NULL) +
    count(DISTINCT message."id") FILTER (WHERE canonical_message."id" IS NULL)
  )::integer AS "unreconciled_rows"
FROM supported_sessions session
LEFT JOIN "conversation_cycles" cycle
  ON cycle."id" = session."id"
 AND cycle."tenant_id" = session."tenant_id"
 AND cycle."store_id" = session."store_id"
LEFT JOIN "crm_whatsapp_messages" message
  ON message."session_id" = session."id"
 AND message."tenant_id" = session."tenant_id"
 AND message."store_id" = session."store_id"
LEFT JOIN "canonical_messages" canonical_message
  ON canonical_message."id" = message."id"
 AND canonical_message."tenant_id" = message."tenant_id"
 AND canonical_message."store_id" = message."store_id"
GROUP BY session."tenant_id", session."store_id";

COMMENT ON VIEW "crm_retention_legacy_coverage" IS
  'Removal guard for the single rolling-deploy CRM legacy retention window; remove only after all scopes remain at zero.';

CREATE INDEX IF NOT EXISTS "crm_whatsapp_sessions_legacy_retention_idx"
  ON "crm_whatsapp_sessions" ("tenant_id", "store_id", "connection_id", "updated_at", "id")
  WHERE "status" IN ('COMPLETED', 'EXPIRED')
    AND "channel" IN ('WHATSAPP', 'OLX_CHAT');

CREATE INDEX IF NOT EXISTS "crm_whatsapp_messages_legacy_retention_idx"
  ON "crm_whatsapp_messages" ("tenant_id", "store_id", "session_id", "provider_timestamp", "created_at", "id");
