DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "crm_channel_connections"
    WHERE "broker" = 'direct'
      AND "channel" = 'whatsapp'
      AND "provider" = 'zapi'
      AND "state" <> 'archived'
    GROUP BY "tenant_id", "store_id", "channel", "provider"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create the Z-API singleton index while duplicate current connections exist; reconcile them first';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "crm_channel_connections_zapi_store_current_unique"
ON "crm_channel_connections" ("tenant_id", "store_id", "channel", "provider")
WHERE "broker" = 'direct'
  AND "channel" = 'whatsapp'
  AND "provider" = 'zapi'
  AND "state" <> 'archived';
