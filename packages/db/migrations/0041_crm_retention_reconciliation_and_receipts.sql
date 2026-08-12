-- Canonical ingress creates independent UUIDs. Reconciliation therefore uses
-- the scoped provider connection plus the provider's stable thread/message ids.
CREATE OR REPLACE VIEW "crm_retention_legacy_coverage" AS
WITH supported_sessions AS (
  SELECT
    session."id",
    session."tenant_id",
    session."store_id",
    session."connection_id" AS "provider_connection_id",
    CASE
      WHEN connection."provider" = 'olx_chat'
        THEN COALESCE(session."channel_external_id", session."external_session_id")
      WHEN session."buyer_chat_lid" IS NOT NULL
       AND regexp_replace(session."buyer_chat_lid", '\\D', '', 'g') <> ''
       AND regexp_replace(session."buyer_chat_lid", '\\D', '', 'g') =
           regexp_replace(session."buyer_phone", '\\D', '', 'g')
        THEN 'lid:' || session."buyer_chat_lid"
      WHEN session."buyer_phone" <> ''
        THEN 'phone:' || session."buyer_phone"
      WHEN session."buyer_chat_lid" IS NOT NULL
        THEN 'lid:' || session."buyer_chat_lid"
      ELSE NULL
    END AS "external_thread_id"
  FROM "crm_whatsapp_sessions" session
  INNER JOIN "crm_connections" connection
    ON connection."id" = session."connection_id"
   AND connection."tenant_id" = session."tenant_id"
   AND connection."store_id" = session."store_id"
  WHERE (connection."provider" = 'zapi' AND session."channel" = 'WHATSAPP')
     OR (connection."provider" = 'olx_chat' AND session."channel" = 'OLX_CHAT')
), session_coverage AS (
  SELECT session."tenant_id", session."store_id", session."id",
    thread."id" AS "canonical_thread_id"
  FROM supported_sessions session
  LEFT JOIN "conversation_threads" thread
    ON thread."tenant_id" = session."tenant_id"
   AND thread."store_id" = session."store_id"
   AND thread."provider_connection_id" = session."provider_connection_id"
   AND thread."external_thread_id" = session."external_thread_id"
), message_coverage AS (
  SELECT message."tenant_id", message."store_id", message."id",
    canonical_message."id" AS "canonical_message_id"
  FROM "crm_whatsapp_messages" message
  INNER JOIN supported_sessions session
    ON session."id" = message."session_id"
   AND session."tenant_id" = message."tenant_id"
   AND session."store_id" = message."store_id"
   AND session."provider_connection_id" = message."connection_id"
  LEFT JOIN "canonical_messages" canonical_message
    ON canonical_message."tenant_id" = message."tenant_id"
   AND canonical_message."store_id" = message."store_id"
   AND canonical_message."provider_connection_id" = message."connection_id"
   AND canonical_message."provider_message_id" = COALESCE(message."external_id", message."channel_message_id")
)
SELECT scope."tenant_id", scope."store_id",
  (COALESCE(session_gap."count", 0) + COALESCE(message_gap."count", 0))::integer AS "unreconciled_rows"
FROM (
  SELECT "tenant_id", "store_id" FROM session_coverage
  UNION
  SELECT "tenant_id", "store_id" FROM message_coverage
) scope
LEFT JOIN (
  SELECT "tenant_id", "store_id", count(*)::integer AS "count"
  FROM session_coverage
  WHERE "canonical_thread_id" IS NULL
  GROUP BY "tenant_id", "store_id"
) session_gap USING ("tenant_id", "store_id")
LEFT JOIN (
  SELECT "tenant_id", "store_id", count(*)::integer AS "count"
  FROM message_coverage
  WHERE "canonical_message_id" IS NULL
  GROUP BY "tenant_id", "store_id"
) message_gap USING ("tenant_id", "store_id");

COMMENT ON VIEW "crm_retention_legacy_coverage" IS
  'Removal guard for the single rolling-deploy CRM legacy retention window; reconciles independent UUIDs through provider connection and external ids.';

CREATE INDEX IF NOT EXISTS "provider_events_olx_lead_receipt_retention_idx"
  ON "provider_events" ("tenant_id", "store_id", "created_at", "id")
  WHERE "provider" = 'olx_chat'
    AND "event_type" = 'crm.lead.olx.received'
    AND "status" IN ('received', 'processing', 'failed')
    AND "payload" ? 'sealedReceipt';
